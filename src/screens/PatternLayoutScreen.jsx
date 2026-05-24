import { useState, useRef, useEffect, useMemo } from "react";
import { templates } from "../data/templates";
import freesewingPatterns from "../data/freesewingPatterns.json";
import { extractPatternPieces } from "../utils/extractFreeSewingPieces";
import patternMeasurements from "../data/patternMeasurements";
import MeasurementsModal from "../components/MeasurementsModal";
import PatternPanel, {
  LAYOUT_OPTIONS,
  effectiveSize,
  isMisaligned,
} from "../components/PatternPanel";
import { generateLayout } from "../utils/generateLayout";
import { useLang } from "../i18n/LanguageContext";

/* ── Layout constants ────────────────────────────────────────────── */
const PANEL_W = 290; // each panel takes the full available width

// TODO: replace DEFAULT_GRAIN_ANGLE with real fabric data from user input
const DEFAULT_GRAIN_ANGLE = 90; // degrees

/**
 * Convert generateLayout output into the positions state map used by
 * PatternLayoutScreen. Pieces not placed by the packer fall back to their
 * defaultX / defaultY percentages.
 */
function _layoutToPositions(
  pieces,
  panelWCm,
  panelHCm,
  segmentation = null,
  bboxFraction = null,
  garmentGrainDeg = 90,
) {
  if (!pieces.length) return {};
  const scale = PANEL_W / panelWCm;
  const panelPxH = Math.round(panelHCm * scale);
  // Thread the segmentation mask into the packer so pieces land on real fabric.
  // Merge bboxFraction (from measurements) into the seg object for the grid builder.
  const seg = segmentation?.garmentMask
    ? {
        ...segmentation,
        bboxFraction: bboxFraction ??
          segmentation.bboxFraction ?? { x: 0, y: 0, w: 1, h: 1 },
      }
    : null;
  const { placements } = generateLayout(
    pieces,
    {
      front: { widthCm: panelWCm, heightCm: panelHCm },
      back: { widthCm: panelWCm, heightCm: panelHCm },
    },
    seg,
    garmentGrainDeg,
  );
  const posMap = {};
  for (const piece of pieces) {
    const p = placements[piece.id];
    if (p) {
      posMap[piece.id] = {
        x: p.xCm * scale,
        y: p.yCm * scale,
        rotation: p.rotationDeg,
        panel: p.panelKey,
      };
    } else {
      // Fallback: piece couldn't be placed by the packer (too large)
      posMap[piece.id] = {
        x: (piece.defaultX / 100) * PANEL_W,
        y: (piece.defaultY / 100) * panelPxH,
        rotation: 0,
        panel: piece.panel === "back" ? "back" : "front",
      };
    }
  }
  return posMap;
}

// Pattern-reference screen for ar-tutorial templates (scrunchie etc.). Shows
// the template's reference SVG full-width plus the materials list, with a
// single CTA to launch the AR camera tutorial. No drag-arrange UI.
function ArTutorialReferenceView({ template, navigate, t, tl, from }) {
  const backScreen = from === "home" ? "home" : "templateSelect";

  // Open the reference SVG in a new window at 1:1 cm size and trigger print.
  // We fetch the SVG text so we can rewrite width/height into real cm — if we
  // just <img>ed it the browser would scale it to fit the page and cut/sew
  // dimensions on paper would be wrong.
  async function handlePrint() {
    const size = template.patternPrintSize;
    if (!template.patternReferenceSvg || !size) return;
    try {
      const res = await fetch(template.patternReferenceSvg);
      const svgText = await res.text();
      const svgSized = svgText.replace(
        /<svg([^>]*)>/i,
        `<svg$1 width="${size.widthCm}cm" height="${size.heightCm}cm" preserveAspectRatio="xMidYMid meet">`,
      );
      const w = window.open("", "_blank", "width=900,height=1000");
      if (!w) return;
      w.document.open();
      w.document.write(`<!doctype html><html><head>
<meta charset="utf-8" />
<title>${tl(template.name)} — ${t("patternReference.printTitle")}</title>
<style>
  @page { size: A4; margin: 1cm; }
  body { margin: 0; padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1c1917; }
  h1 { margin: 0 0 4px 0; font-size: 14pt; }
  .meta { color: #57534e; font-size: 10pt; margin: 0 0 14px 0; }
  .warn { color: #b45309; font-size: 9pt; margin: 0 0 14px 0; }
  svg { display: block; }
  @media print { body { padding: 0; } .noprint { display: none; } }
  .actions { margin: 16px 0 0 0; }
  button { font: inherit; padding: 8px 14px; border-radius: 999px; border: 1px solid #d6d3d1; background: #fff; cursor: pointer; }
  button.primary { background: #1c1917; color: #fff; border-color: #1c1917; }
</style>
</head><body>
<h1>${tl(template.name)}</h1>
<p class="meta">${size.widthCm} × ${size.heightCm} cm</p>
<p class="warn">${t("patternReference.printScaleNote")}</p>
${svgSized}
<div class="actions noprint">
  <button class="primary" onclick="window.print()">${t("patternReference.printNow")}</button>
</div>
<script>window.addEventListener('load', () => setTimeout(() => window.print(), 350));</script>
</body></html>`);
      w.document.close();
    } catch (e) {
      console.error("[patternPrint] failed:", e);
    }
  }

  return (
    <div className="h-full flex flex-col bg-primary-800">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-3 flex-shrink-0">
        <button
          onClick={() => navigate(backScreen)}
          className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3"
          aria-label={t("common.back")}
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-primary-100 truncate">
            {tl(template.name)}
          </h2>
          <p className="text-primary-300 text-[11px] truncate">
            {tl(template.style)}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        {/* Pattern reference SVG */}
        {template.patternReferenceSvg && (
          <div className="bg-primary-100 rounded-3xl p-5 border border-primary-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider">
                {t("patternReference.title")}
              </p>
              {template.patternPrintSize && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="text-[11px] font-semibold text-secondary-700 bg-secondary-100 border border-secondary-200 px-2.5 py-1 rounded-full active:scale-95 transition-transform"
                >
                  🖨 {t("patternReference.print")}
                </button>
              )}
            </div>
            <div className="flex justify-center">
              <img
                src={template.patternReferenceSvg}
                alt={tl(template.name)}
                className="w-full max-w-xs"
              />
            </div>
            <div className="flex justify-center gap-4 mt-3 text-[11px] text-primary-700">
              <span className="flex items-center gap-1.5">
                <svg width="22" height="6" aria-hidden="true">
                  <line
                    x1="0"
                    y1="3"
                    x2="22"
                    y2="3"
                    stroke="#231815"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                </svg>
                {t("patternReference.lineLegendCut")}
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="22" height="6" aria-hidden="true">
                  <line
                    x1="0"
                    y1="3"
                    x2="22"
                    y2="3"
                    stroke="#e60012"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                </svg>
                {t("patternReference.lineLegendSew")}
              </span>
            </div>
            <p className="text-primary-700 text-[11px] leading-4 mt-2 text-center">
              {template.patternPrintSize
                ? t("patternReference.svgHintWithSize", {
                    w: template.patternPrintSize.widthCm,
                    h: template.patternPrintSize.heightCm,
                  })
                : t("patternReference.svgHint")}
            </p>
          </div>
        )}

        {/* Materials */}
        {template.materials?.length > 0 && (
          <div className="bg-primary-100 rounded-3xl p-4 border border-primary-200">
            <p className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-2">
              {t("patternReference.materials")}
            </p>
            <ul className="space-y-1.5">
              {template.materials.map((m, i) => (
                <li
                  key={i}
                  className="text-primary-900 text-sm flex items-start gap-2"
                >
                  <span className="text-secondary-400 mt-0.5">•</span>
                  <span>{tl(m)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-6 pt-2 flex-shrink-0">
        <button
          onClick={() =>
            navigate("arTutorial", { template: template.id, from: backScreen })
          }
          className="w-full bg-secondary-300 text-secondary-900 font-bold text-base py-3.5 rounded-2xl shadow-sm active:scale-[0.98] transition-transform"
        >
          {t("patternReference.startArTutorial")}
        </button>
      </div>
    </div>
  );
}

export default function PatternLayoutScreen({
  navigate,
  template: templateId,
  measurements,
  segmentation,
  uploadedImage,
  activeProfile,
  sessionProfileOverride,
  setSessionProfileOverride,
  profiles = [],
  updateProfile,
  from = "templateSelect",
}) {
  const { t, tl } = useLang();
  const template = templates[templateId];

  // ar-tutorial templates (e.g. the scrunchie) don't drag-arrange pieces —
  // they just need to show the reference SVG before launching the camera
  // tutorial. Short-circuit the whole drag UI in that case.
  if (template?.patternSource === "ar-tutorial") {
    return (
      <ArTutorialReferenceView
        template={template}
        navigate={navigate}
        t={t}
        tl={tl}
        from={from}
      />
    );
  }

  const grainAngleDeg =
    measurements?.garmentLayout?.grainAngleDeg ?? DEFAULT_GRAIN_ANGLE;

  function grainLabelI18n(angle) {
    if (angle === 90) return t("patternLayout.grainVertical");
    if (angle === 0) return t("patternLayout.grainHorizontal");
    return t("patternLayout.grainBias", { angle });
  }

  // ── Measurements modal (auto-opens when arriving from home with no profile) ──
  const effectiveProfile = sessionProfileOverride ?? activeProfile ?? null;
  const requiredKeys =
    patternMeasurements[templateId]?.requiredMeasurements ?? [];
  const missingKeys = effectiveProfile
    ? requiredKeys.filter((k) => effectiveProfile.measurements?.[k] == null)
    : requiredKeys;

  const [showMeasModal, setShowMeasModal] = useState(false);

  // ── Runtime FreeSewing extraction state ─────────────────────────────────
  const [fsLoading, setFsLoading] = useState(false);
  const [fsError, setFsError] = useState(null); // null | 'load' | 'extract'
  const [runtimePieces, setRuntimePieces] = useState(null);
  const [fsRetry, setFsRetry] = useState(0);
  const [customPieces, setCustomPieces] = useState(null);

  // Derive panel dimensions from the actual pattern pieces so the layout
  // scales correctly for both small shirts and full-length skirts.
  // Width: widest piece + 30% breathing room. Height: tallest piece + 20%.
  const { w: defaultW, h: defaultH } = useMemo(() => {
    const pieces =
      freesewingPatterns[templateId] ?? template.patternPieces ?? [];
    if (!pieces.length) return { w: 50, h: 70 };
    const maxW = Math.max(...pieces.map((p) => p.widthCm ?? 10));
    const maxH = Math.max(...pieces.map((p) => p.heightCm ?? 5));
    return {
      w: Math.max(30, Math.ceil(maxW * 1.3)),
      h: Math.max(40, Math.ceil(maxH * 1.2)),
    };
  }, [templateId, template]);

  // Auto-open on mount if from home and no profile / missing measurements
  useEffect(() => {
    if (from === "home" && missingKeys.length > 0) {
      setShowMeasModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panelW = measurements?.panels?.frontPanel?.widthCm ?? defaultW;
  const panelH = measurements?.panels?.frontPanel?.heightCm ?? defaultH;
  const bboxFraction = measurements?.bboxFraction ?? null;

  // Panel pixel height is derived from the uploaded image's own aspect ratio
  // so the background photo fills the panel without distortion.
  // Falls back to the cm ratio (then to 1.6) only when no image is available.
  const [imgAspect, setImgAspect] = useState(null); // ih / iw of the photo
  useEffect(() => {
    if (!uploadedImage) return;
    const probe = new Image();
    probe.onload = () => setImgAspect(probe.naturalHeight / probe.naturalWidth);
    probe.src = uploadedImage;
  }, [uploadedImage]);

  const scalePxPerCm = PANEL_W / panelW;

  const panelPxH = Math.round(panelH * scalePxPerCm);

  const scale = panelPxH / panelH;

  /* ── generate masked garment photo ── */
  const [maskedImageUrl, setMaskedImageUrl] = useState(null);
  const [layoutOptionIndex, setLayoutOptionIndex] = useState(0);

  useEffect(() => {
    if (!uploadedImage) {
      setMaskedImageUrl(null);
      return;
    }
    // No segmentation or no garment mask → show raw photo as dim reference
    if (!segmentation?.garmentMask) {
      setMaskedImageUrl(uploadedImage);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const { naturalWidth: iw, naturalHeight: ih } = img;
      const maskLen = segmentation.garmentMask.length;
      const maskW = Math.round(Math.sqrt(maskLen * (iw / ih)));
      const maskH = Math.round(maskLen / maskW);

      const c = document.createElement("canvas");
      c.width = iw;
      c.height = ih;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, iw, ih);
      const imageData = ctx.getImageData(0, 0, iw, ih);
      const px = imageData.data;

      for (let y = 0; y < ih; y++) {
        for (let x = 0; x < iw; x++) {
          const mx = Math.floor((x / iw) * maskW);
          const my = Math.floor((y / ih) * maskH);
          if (!segmentation.garmentMask[my * maskW + mx]) {
            px[(y * iw + x) * 4 + 3] = 0;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setMaskedImageUrl(c.toDataURL("image/png"));
    };
    img.src = uploadedImage;
  }, [uploadedImage, segmentation]);

  /* ── piece state: x, y, rotation, panel per piece ── */
  const [positions, setPositions] = useState(() =>
    _layoutToPositions(
      template.patternPieces,
      panelW,
      panelH,
      segmentation,
      bboxFraction,
      grainAngleDeg,
    ),
  );

  // Stores the most-recently computed suggested layout so the Reset button
  // can restore it after the user moves pieces around.
  const suggestedLayoutRef = useRef(null);

  const [dragging, setDragging] = useState(null);
  const [dragOverPanel, setDragOverPanel] = useState(null);
  const [showAiBadge, setShowAiBadge] = useState(true);
  const [showHint, setShowHint] = useState(true);
  const activeLayoutOption =
    LAYOUT_OPTIONS[layoutOptionIndex] ?? LAYOUT_OPTIONS[0];
  const activePieces =
    template.patternSource === "freesewing"
      ? (runtimePieces ??
        freesewingPatterns[templateId] ??
        template.patternPieces)
      : template.patternSource === "custom"
        ? (customPieces ?? template.patternPieces)
        : template.patternPieces;
  const frontRef = useRef();
  const backRef = useRef();
  const lastTapRef = useRef({ id: null, time: 0 });
  // tracks current pointer page coords during a drag for cross-panel detection
  const dragPointerPageRef = useRef({ x: 0, y: 0 });
  // ref mirror of dragging state so pointermove handlers always see current
  // drag data without waiting for a React re-render
  const draggingRef = useRef(null);
  // tracks the last clamped position written to the DOM during a drag so we
  // can commit it to React state on pointerup without recomputing
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  // ref to the wrapper div of the piece being dragged so we can mutate its
  // style directly without triggering React re-renders
  const dragPieceElRef = useRef(null);

  // For FreeSewing templates, seed positions from the pre-extracted JSON on mount.
  useEffect(() => {
    if (template.patternSource !== "freesewing") return;
    const pieces = freesewingPatterns[templateId] ?? [];
    const posMap = _layoutToPositions(
      pieces,
      panelW,
      panelH,
      segmentation,
      bboxFraction,
      grainAngleDeg,
    );
    suggestedLayoutRef.current = posMap;
    setPositions(posMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // For custom templates (bag, hat), load pieces from the pattern file on mount.
  useEffect(() => {
    if (template.patternSource !== "custom") return;
    import(`../patterns/${templateId}.js`).then((mod) => {
      const { patternPieces } = mod.default ?? mod;
      if (!patternPieces?.length) return;
      setCustomPieces(patternPieces);
      const posMap = _layoutToPositions(
        patternPieces,
        panelW,
        panelH,
        segmentation,
        bboxFraction,
        grainAngleDeg,
      );
      suggestedLayoutRef.current = posMap;
      setPositions(posMap);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // ── Runtime pattern extraction when a profile is active ─────────────────
  useEffect(() => {
    if (template.patternSource !== "freesewing") return;
    if (!effectiveProfile) return;

    let cancelled = false;
    setFsLoading(true);
    setFsError(null);
    setRuntimePieces(null);

    import(`../patterns/${templateId}.js`)
      .then(async (mod) => {
        if (cancelled) return;
        const {
          Design,
          measurements: defaultMeasurements,
          parts,
        } = mod.default ?? mod;
        const mergedMeasurements = {
          ...defaultMeasurements,
          ...effectiveProfile.measurements,
        };
        const pieces = await extractPatternPieces(
          Design,
          mergedMeasurements,
          parts,
        );
        if (!cancelled) {
          setRuntimePieces(pieces);
          const posMap = _layoutToPositions(
            pieces,
            panelW,
            panelH,
            segmentation,
            bboxFraction,
            grainAngleDeg,
          );
          suggestedLayoutRef.current = posMap;
          setPositions(posMap);
          setFsError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setFsError("load");
      })
      .finally(() => {
        if (!cancelled) setFsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, effectiveProfile, fsRetry]);

  function getPointerPos(e, panelRef) {
    const rect = panelRef.current.getBoundingClientRect();
    return { px: e.clientX - rect.left, py: e.clientY - rect.top };
  }

  function findPieceAt(px, py, panelKey) {
    const pieces = activePieces.filter(
      (p) => positions[p.id]?.panel === panelKey,
    );
    for (const piece of [...pieces].reverse()) {
      const pos = positions[piece.id];
      const { ew, eh } = effectiveSize(piece, scale, pos.rotation);
      if (px >= pos.x && px <= pos.x + ew && py >= pos.y && py <= pos.y + eh) {
        return piece;
      }
    }
    return null;
  }

  function handlePointerDown(e, panelRef, panelKey) {
    e.currentTarget.setPointerCapture(e.pointerId);

    const { px, py } = getPointerPos(e, panelRef);
    const piece = findPieceAt(px, py, panelKey);
    if (!piece) return;
    const pos = positions[piece.id];

    // Double-tap detection → rotate
    const now = Date.now();
    const last = lastTapRef.current;
    if (last.id === piece.id && now - last.time < 350) {
      const newRot = (pos.rotation + 90) % 360;
      const { ew: newEw, eh: newEh } = effectiveSize(piece, scale, newRot);
      setPositions((prev) => ({
        ...prev,
        [piece.id]: {
          ...prev[piece.id],
          x: Math.max(0, Math.min(PANEL_W - newEw, pos.x)),
          y: Math.max(0, Math.min(panelPxH - newEh, pos.y)),
          rotation: newRot,
        },
      }));
      lastTapRef.current = { id: null, time: 0 };
      if (showAiBadge) setShowAiBadge(false);
      return;
    }
    lastTapRef.current = { id: piece.id, time: now };

    const rect = panelRef.current.getBoundingClientRect();
    dragPointerPageRef.current = { x: e.clientX, y: e.clientY };
    const dragData = {
      id: piece.id,
      panelRef,
      panelKey,
      offsetX: pos.x - (e.clientX - rect.left),
      offsetY: pos.y - (e.clientY - rect.top),
      startPieceX: pos.x,
      startPieceY: pos.y,
    };
    draggingRef.current = dragData;
    dragPieceElRef.current = panelRef.current.querySelector(
      `[data-piece-id="${piece.id}"]`,
    );
    setDragging(dragData);
  }

  function handlePointerMove(e) {
    const d = draggingRef.current;
    if (!d) return;
    e.preventDefault();
    dragPointerPageRef.current = { x: e.clientX, y: e.clientY };

    const rect = d.panelRef.current.getBoundingClientRect();
    const piece = activePieces.find((p) => p.id === d.id);
    const pos = positions[piece.id];
    const { ew, eh } = effectiveSize(piece, scale, pos.rotation);

    const newX = Math.max(
      0,
      Math.min(PANEL_W - ew, e.clientX - rect.left + d.offsetX),
    );
    const newY = Math.max(
      0,
      Math.min(panelPxH - eh, e.clientY - rect.top + d.offsetY),
    );

    // Mutate the DOM directly — zero React re-renders during the drag
    if (dragPieceElRef.current) {
      dragPieceElRef.current.style.left = newX + "px";
      dragPieceElRef.current.style.top = newY + "px";
    }
    dragOffsetRef.current = { x: newX, y: newY };

    // Highlight the other panel when the pointer hovers over it
    const otherRef = d.panelKey === "front" ? backRef : frontRef;
    const otherKey = d.panelKey === "front" ? "back" : "front";
    if (otherRef.current) {
      const otherRect = otherRef.current.getBoundingClientRect();
      const over =
        e.clientX >= otherRect.left &&
        e.clientX <= otherRect.right &&
        e.clientY >= otherRect.top &&
        e.clientY <= otherRect.bottom;
      setDragOverPanel(over ? otherKey : null);
    }
  }

  function handlePointerUp(e) {
    const d = draggingRef.current;
    if (d) {
      if (showAiBadge) setShowAiBadge(false);
      // Check if the pointer was released over the other panel
      const otherRef = d.panelKey === "front" ? backRef : frontRef;
      const otherKey = d.panelKey === "front" ? "back" : "front";
      let droppedOnOther = false;
      if (otherRef.current) {
        const otherRect = otherRef.current.getBoundingClientRect();
        const cx = e.clientX ?? dragPointerPageRef.current.x;
        const cy = e.clientY ?? dragPointerPageRef.current.y;
        if (
          cx >= otherRect.left &&
          cx <= otherRect.right &&
          cy >= otherRect.top &&
          cy <= otherRect.bottom
        ) {
          droppedOnOther = true;
          // Move piece to the other panel, clamped to its bounds
          const piece = activePieces.find((p) => p.id === d.id);
          const pos = positions[piece.id];
          const { ew, eh } = effectiveSize(piece, scale, pos.rotation);
          const dropX = Math.max(
            0,
            Math.min(PANEL_W - ew, cx - otherRect.left - ew / 2),
          );
          const dropY = Math.max(
            0,
            Math.min(panelPxH - eh, cy - otherRect.top - eh / 2),
          );
          setPositions((prev) => ({
            ...prev,
            [d.id]: {
              ...prev[d.id],
              x: dropX,
              y: dropY,
              panel: otherKey,
            },
          }));
        }
      }
      if (!droppedOnOther) {
        // Commit the final DOM position into React state (single write)
        const { x, y } = dragOffsetRef.current;
        setPositions((prev) => ({
          ...prev,
          [d.id]: { ...prev[d.id], x, y },
        }));
      }
    }
    setDragOverPanel(null);
    dragPieceElRef.current = null;
    draggingRef.current = null;
    setDragging(null);
  }

  /* ── Move a piece to a specific panel (used by legend buttons) ── */
  function movePieceToPanel(pieceId, newPanel) {
    const piece = activePieces.find((p) => p.id === pieceId);
    const pos = positions[pieceId];
    const { ew, eh } = effectiveSize(piece, scale, pos.rotation);
    // Stack below existing pieces in the target panel
    const others = activePieces.filter(
      (p) => p.id !== pieceId && positions[p.id]?.panel === newPanel,
    );
    const maxY = others.reduce((acc, p) => {
      const ppos = positions[p.id];
      const { eh: peh } = effectiveSize(p, scale, ppos.rotation);
      return Math.max(acc, ppos.y + peh + 4);
    }, 4);
    const x = Math.max(0, Math.min(PANEL_W - ew, (PANEL_W - ew) / 2));
    const y = Math.max(0, Math.min(panelPxH - eh, maxY));
    setPositions((prev) => ({
      ...prev,
      [pieceId]: { ...prev[pieceId], x, y, panel: newPanel },
    }));
  }

  /* ── FreeSewing print URL ── */
  function handlePrint() {
    try {
      const measurements = effectiveProfile?.measurements ?? {};
      const stateObject = {
        design: templateId,
        settings: {
          measurements,
          units: "metric",
          metadata: { setName: "Fashion Flipper" },
          embed: false,
        },
        view: "draft",
      };

      const state = JSON.stringify(stateObject);
      const url = `https://freesewing.eu/editor/#s=${encodeURIComponent(state)}`;
      console.log("[FreeSewing Print] URL:", url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      window.open(
        `https://freesewing.eu/editor/from/scratch?design=${templateId}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  return (
    <div className="relative h-full flex flex-col bg-primary-800">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-3">
        <button
          onClick={() => navigate(from)}
          className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3"
        >
          ←
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-primary-50">
            {t("patternLayout.title")}
          </h2>
          <p className="text-primary-100 text-xs mt-0.5">
            {t("patternLayout.subtitle")}
          </p>
        </div>
        {template.patternSource === "freesewing" && (
          <button
            onClick={handlePrint}
            title={t("patternLayout.printTooltip")}
            className="ml-2 h-9 px-3 bg-primary-700 border border-primary-600 rounded-full text-primary-100 text-xs font-semibold shadow-sm active:scale-[0.97] transition-transform whitespace-nowrap"
          >
            {t("patternLayout.printPattern")}
          </button>
        )}
        <button
          onClick={() => {
            if (suggestedLayoutRef.current)
              setPositions({ ...suggestedLayoutRef.current });
          }}
          title={t("patternLayout.resetTooltip")}
          className="ml-2 h-9 px-3 bg-primary-700 border border-primary-600 rounded-full text-primary-100 text-xs font-semibold shadow-sm active:scale-[0.97] transition-transform whitespace-nowrap"
        >
          {t("patternLayout.reset")}
        </button>
      </div>

      {/* Garment info strip */}
      <div className="mx-5 mb-3 flex items-center gap-2 bg-primary-700 rounded-xl px-3 py-2 border border-primary-600">
        <span className="text-[11px] text-primary-300">
          {t("patternLayout.eachPanel")}{" "}
          <span className="font-semibold text-primary-100">
            {panelW} × {panelH} cm
          </span>
        </span>
        <span className="mx-1 text-primary-600">·</span>
        <span className="text-[11px] text-primary-300">
          {t("patternLayout.grain")}{" "}
          <span className="font-semibold text-primary-100">
            {grainLabelI18n(grainAngleDeg)}
          </span>
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Error banner */}
        {fsError && !fsLoading && (
          <div className="mx-5 mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex flex-col gap-2">
            <p className="text-sm font-semibold text-red-800">
              {fsError === "load"
                ? t("patternLayout.couldNotLoad")
                : t("patternLayout.generationFailed")}
            </p>
            <p className="text-xs text-red-600">
              {t("patternLayout.defaultSizing")}
            </p>
            <button
              onClick={() => {
                setFsError(null);
                setRuntimePieces(null);
                setFsRetry((n) => n + 1);
              }}
              className="self-start text-xs font-semibold text-red-700 underline"
            >
              {t("patternLayout.retry")}
            </button>
          </div>
        )}
        {/* Front then back, stacked vertically */}
        <div className="flex flex-col items-center px-2.5 gap-3 mb-4">
          <div className="relative" style={{ width: PANEL_W }}>
            <button
              type="button"
              onClick={() =>
                setLayoutOptionIndex(
                  (index) => (index + 1) % LAYOUT_OPTIONS.length,
                )
              }
              aria-label={`Switch piece style. Current: ${activeLayoutOption.label}`}
              title={`Piece style: ${activeLayoutOption.label}`}
              className="absolute right-1.5 top-1.5 z-20 h-7 w-7 rounded-full bg-primary-800/90 border border-primary-500 text-primary-50 text-xs font-semibold shadow-sm backdrop-blur-sm active:scale-[0.98] transition-transform flex items-center justify-center"
            >
              {activeLayoutOption.buttonLabel}
            </button>
            <PatternPanel
              panelLabel={t("patternLayout.panelFront")}
              panelKey="front"
              panelRef={frontRef}
              panelW={PANEL_W}
              panelH={panelPxH}
              activePieces={activePieces}
              positions={positions}
              scale={scale}
              dragging={dragging}
              grainAngleDeg={grainAngleDeg}
              bboxFraction={bboxFraction}
              dragOverPanel={dragOverPanel}
              imageUrl={maskedImageUrl}
              imgOpacity={0.8}
              pieceAppearance={activeLayoutOption}
              tl={tl}
              onPointerDown={(e) => handlePointerDown(e, frontRef, "front")}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          </div>
          <PatternPanel
            panelLabel={t("patternLayout.panelBack")}
            panelKey="back"
            panelRef={backRef}
            panelW={PANEL_W}
            panelH={panelPxH}
            activePieces={activePieces}
            positions={positions}
            scale={scale}
            dragging={dragging}
            grainAngleDeg={grainAngleDeg}
            bboxFraction={bboxFraction}
            dragOverPanel={dragOverPanel}
            imageUrl={maskedImageUrl}
            imgOpacity={0.35}
            pieceAppearance={activeLayoutOption}
            tl={tl}
            onPointerDown={(e) => handlePointerDown(e, backRef, "back")}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>

        <div className="mx-5 mb-3 flex justify-center">
          <div className="bg-primary-700 border border-primary-600 rounded-full px-3 py-1 text-[11px] text-primary-100">
            Piece style:{" "}
            <span className="font-semibold">{activeLayoutOption.label}</span>
          </div>
        </div>

        {showAiBadge && (
          <div
            className="mx-5 mb-3 bg-primary-600 text-primary-50 font-semibold rounded-full text-center"
            style={{
              fontSize: 11,
              padding: "4px 12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            {t("patternLayout.dragRotateHint")}
          </div>
        )}

        {showHint && (
          <div className="mx-5 mb-3 bg-primary-700 border border-primary-600 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">💡</span>
            <p className="flex-1 text-[11px] text-primary-100 leading-4">
              <span className="font-semibold">
                {t("patternLayout.moveSideTitle")}
              </span>{" "}
              {t("patternLayout.moveSideHint")}
            </p>
            <button
              onClick={() => setShowHint(false)}
              className="text-primary-100 text-sm leading-none mt-0.5 shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Warning note */}
        {activePieces.some((p) => {
          const r = positions[p.id]?.rotation ?? 0;
          return isMisaligned((p.grainAngleDeg + r) % 360, grainAngleDeg);
        }) && (
          <div className="mx-5 mb-3 bg-secondary-100 border border-secondary-200 rounded-xl px-3 py-2 flex items-start gap-2">
            <span className="text-secondary-500 text-sm mt-0.5">⚠</span>
            <p className="text-[11px] text-secondary-800 leading-4">
              {t("patternLayout.grainWarning")}
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="mx-5">
          <p className="text-[11px] font-semibold text-primary-100 uppercase tracking-wider mb-2">
            {t("patternLayout.patternPieces")}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {activePieces.map((piece) => (
              <div
                key={piece.id}
                className="flex items-center gap-2 bg-primary-700 rounded-xl px-2.5 py-1.5 border border-primary-600"
              >
                <div
                  className="bg-primary-50 border border-primary-900 shrink-0"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius:
                      piece.shape === "circle" || piece.shape === "ring"
                        ? "50%"
                        : 1,
                  }}
                />
                <span className="text-[11px] text-primary-200 truncate font-mono">
                  {tl(piece.label)}
                </span>
                <button
                  onClick={() => {
                    const cur = positions[piece.id]?.panel ?? "front";
                    movePieceToPanel(
                      piece.id,
                      cur === "front" ? "back" : "front",
                    );
                  }}
                  className="ml-auto text-[9px] text-primary-200 font-mono bg-primary-600 border border-primary-500 rounded px-1.5 py-0.5 active:bg-primary-500 shrink-0"
                >
                  {positions[piece.id]?.panel === "back" ? "→F" : "→B"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5 pt-2 border-t border-primary-700 bg-primary-800 space-y-2">
        <button
          onClick={() => navigate("arPattern")}
          className="w-full bg-primary-700 border border-primary-500 text-primary-100 py-3 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span>📷</span> {t("patternLayout.tryArView")}
        </button>
        <button
          onClick={() => navigate("stepGuide")}
          className="w-full bg-secondary-300 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-md shadow-black/20"
        >
          {t("patternLayout.confirmLayout")}
        </button>
      </div>

      {/* Loading overlay for runtime extraction */}
      {fsLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-primary-900/60">
          <div className="bg-primary-700 rounded-2xl px-6 py-5 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-300 border-t-transparent rounded-full animate-spin" />
            <p className="text-primary-100 text-sm font-medium">
              {t("patternLayout.generating")}
            </p>
          </div>
        </div>
      )}

      {/* ── Measurements modal (auto-shows from home with no profile) ──── */}
      <MeasurementsModal
        open={showMeasModal}
        onClose={() => setShowMeasModal(false)}
        templateId={templateId}
        profiles={profiles}
        activeProfile={activeProfile}
        sessionProfileOverride={sessionProfileOverride}
        setSessionProfileOverride={setSessionProfileOverride}
        updateProfile={updateProfile}
      />
    </div>
  );
}
