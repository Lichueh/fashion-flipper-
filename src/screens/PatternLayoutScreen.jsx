import { useState, useRef, useEffect, useMemo } from "react";
import { templates } from "../data/templates";
import freesewingPatterns from "../data/freesewingPatterns.json";
import { extractPatternPieces } from "../utils/extractFreeSewingPieces";
import patternMeasurements from "../data/patternMeasurements";
import MeasurementsModal from "../components/MeasurementsModal";

/* ── Layout constants ────────────────────────────────────────────── */
const PANEL_W = 290; // each panel takes the full available width

// TODO: replace DEFAULT_GRAIN_ANGLE with real fabric data from user input
const DEFAULT_GRAIN_ANGLE = 90; // degrees

function grainLabel(angle) {
  if (angle === 90) return "Vertical (Warp)";
  if (angle === 0) return "Horizontal (Weft)";
  return `Bias (${angle}°)`;
}

function isMisaligned(pieceAngle, garmentAngle) {
  const diff = Math.abs((pieceAngle - garmentAngle + 180) % 180);
  return diff > 15;
}

/* ── Effective bounding box of a piece after rotation ────────────── */
function effectiveSize(piece, scale, rotation) {
  const pw = piece.widthCm * scale;
  const ph = piece.heightCm * scale;
  const r = ((rotation % 360) + 360) % 360;
  // For 90/270 swap width and height
  return r === 90 || r === 270 ? { ew: ph, eh: pw } : { ew: pw, eh: ph };
}

/* ── Panel background (grid + optional garment image) ────────────── */
function PanelBackground({
  label,
  panelW,
  panelH,
  imageUrl,
  opacity,
  bboxFraction,
}) {
  const gridId = `grid-${label}`;

  const imgW = bboxFraction ? panelW / bboxFraction.w : panelW;
  const imgH = bboxFraction ? panelH / bboxFraction.h : panelH;
  const imgX = bboxFraction ? -(bboxFraction.x * imgW) : 0;
  const imgY = bboxFraction ? -(bboxFraction.y * imgH) : 0;

  return (
    <svg
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      width={panelW}
      height={panelH}
    >
      <rect
        width={panelW}
        height={panelH}
        className="[fill:theme(colors.primary.200)]"
      />
      <defs>
        <pattern
          id={gridId}
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 28 0 L 0 0 0 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-primary-500 opacity-40"
          />
        </pattern>
      </defs>
      <rect width={panelW} height={panelH} fill={`url(#${gridId})`} />
      {imageUrl && (
        <image
          href={imageUrl}
          x={imgX}
          y={imgY}
          width={imgW}
          height={imgH}
          preserveAspectRatio="none"
          opacity={opacity ?? 0.8}
        />
      )}
      <text
        x={panelW / 2}
        y={panelH - 6}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        className="fill-primary-300"
        fontFamily="monospace"
        letterSpacing="1.5"
      >
        {label}
      </text>
    </svg>
  );
}

/* ── Grain direction arrow ───────────────────────────────────────── */
function GrainArrow({ angle, pw, ph }) {
  const isVertical = Math.abs((angle % 180) - 90) <= 15;
  const len = isVertical ? Math.max(14, ph * 0.4) : Math.max(14, pw * 0.4);
  const arrowStyle = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
    flexDirection: isVertical ? "column" : "row",
  };
  const sym = isVertical ? ["▲", "▼"] : ["◀", "▶"];
  const divClass = isVertical
    ? "border-l border-primary-700"
    : "border-t border-primary-700";
  const divStyle = isVertical
    ? { width: 1, height: len }
    : { height: 1, width: len };
  return (
    <div style={arrowStyle}>
      <span className="text-primary-700" style={{ fontSize: 6, lineHeight: 1 }}>
        {sym[0]}
      </span>
      <div className={divClass} style={divStyle} />
      <span className="text-primary-700" style={{ fontSize: 6, lineHeight: 1 }}>
        {sym[1]}
      </span>
    </div>
  );
}

/* ── Single pattern piece (visual only) ──────────────────────────── */
function PieceShape({ piece, scale }) {
  const pw = piece.widthCm * scale;
  const ph = piece.heightCm * scale;
  const seam = Math.min(3, pw * 0.07, ph * 0.07);
  const isCircular = piece.shape === "circle" || piece.shape === "ring";

  // FreeSewing-sourced pieces: render the extracted SVG seam path directly
  if (piece.shape === "svgpath") {
    return (
      <div style={{ width: pw, height: ph, position: "relative" }}>
        <svg viewBox={piece.viewBox} width={pw} height={ph}>
          <path
            d={piece.svgPath}
            fill={piece.color}
            stroke="#1e3a5f"
            strokeWidth="1"
          />
        </svg>
        <GrainArrow angle={piece.grainAngleDeg} pw={pw} ph={ph} />
        <div
          style={{
            position: "absolute",
            bottom: seam + 1,
            left: 0,
            right: 0,
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div
            className="text-primary-900 font-bold font-mono"
            style={{ fontSize: 6, lineHeight: 1.3 }}
          >
            {piece.label}
          </div>
          {(piece.cutCount ?? 1) > 1 && (
            <div
              className="text-secondary-700 font-bold font-mono"
              style={{ fontSize: 6, lineHeight: 1.3 }}
            >
              Cut ×{piece.cutCount}
            </div>
          )}
          <div
            className="text-primary-600 font-mono"
            style={{ fontSize: 5, lineHeight: 1.2 }}
          >
            {piece.widthCm}×{piece.heightCm}cm
          </div>
        </div>
      </div>
    );
  }

  const outerStyle = {
    width: pw,
    height: ph,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    ...(piece.shape === "rect" && { borderRadius: 1 }),
    ...(piece.shape === "trapezoid" && {
      clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)",
      border: "none",
    }),
    ...(piece.shape === "circle" && { borderRadius: "50%" }),
    ...(piece.shape === "ring" && { borderRadius: "50%" }),
  };
  const outerClass = [
    "bg-primary-50 shadow-sm",
    piece.shape !== "trapezoid" && "border border-primary-900",
    piece.shape === "ring" && "outline outline-1 outline-primary-900",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div style={outerStyle} className={outerClass}>
      {piece.shape === "trapezoid" && (
        <svg
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          width={pw}
          height={ph}
          viewBox={`0 0 ${pw} ${ph}`}
        >
          <polygon
            points={`${pw * 0.08},0 ${pw * 0.92},0 ${pw},${ph} 0,${ph}`}
            className="fill-primary-50 stroke-primary-900"
            strokeWidth="1.5"
          />
          <polygon
            points={`${pw * 0.08 + seam},${seam} ${pw * 0.92 - seam},${seam} ${pw - seam},${ph - seam} ${seam},${ph - seam}`}
            fill="none"
            className="stroke-primary-500"
            strokeWidth="0.7"
            strokeDasharray="3,2"
          />
        </svg>
      )}
      {piece.shape !== "trapezoid" && !isCircular && (
        <div
          className="absolute border border-dashed border-primary-500"
          style={{ inset: seam, borderRadius: 1, pointerEvents: "none" }}
        />
      )}
      <GrainArrow angle={piece.grainAngleDeg} pw={pw} ph={ph} />
      <div
        style={{
          position: "absolute",
          bottom: seam + 1,
          left: 0,
          right: 0,
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div
          className="text-primary-900 font-bold font-mono"
          style={{ fontSize: 6, lineHeight: 1.3 }}
        >
          {piece.label}
        </div>
        {(piece.cutCount ?? 1) > 1 && (
          <div
            className="text-secondary-700 font-bold font-mono"
            style={{ fontSize: 6, lineHeight: 1.3 }}
          >
            Cut ×{piece.cutCount}
          </div>
        )}
        <div
          className="text-primary-600 font-mono"
          style={{ fontSize: 5, lineHeight: 1.2 }}
        >
          {piece.widthCm}×{piece.heightCm}cm
        </div>
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
  const template = templates[templateId];
  const grainAngleDeg =
    measurements?.garmentLayout?.grainAngleDeg ?? DEFAULT_GRAIN_ANGLE;

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

  useEffect(() => {
    if (!uploadedImage) {
      setMaskedImageUrl(null);
      return;
    }
    // No segmentation available → show the raw photo as a dim reference
    if (!segmentation?.regions) {
      setMaskedImageUrl(uploadedImage);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: iw, naturalHeight: ih } = img;
      const anyMask = Object.values(segmentation.regions).find((r) => r?.mask);
      if (!anyMask) {
        // Masks present in object but all null → fall back to raw photo
        setMaskedImageUrl(uploadedImage);
        return;
      }

      const maskLen = anyMask.mask.length;
      const maskW = Math.round(Math.sqrt(maskLen * (iw / ih)));
      const maskH = Math.round(maskLen / maskW);

      const combined = new Uint8Array(maskLen);
      for (const region of Object.values(segmentation.regions)) {
        if (!region?.mask) continue;
        const m = region.mask;
        for (let i = 0; i < maskLen; i++) {
          if (m[i]) combined[i] = 1;
        }
      }

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
          if (!combined[my * maskW + mx]) px[(y * iw + x) * 4 + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setMaskedImageUrl(c.toDataURL("image/png"));
    };
    img.src = uploadedImage;
  }, [uploadedImage, segmentation]);

  /* ── piece state: x, y, rotation, panel per piece ── */
  const [positions, setPositions] = useState(() =>
    Object.fromEntries(
      template.patternPieces.map((p) => [
        p.id,
        {
          x: (p.defaultX / 100) * PANEL_W,
          y: (p.defaultY / 100) * panelPxH,
          rotation: 0,
          panel: p.panel === "back" ? "back" : "front",
        },
      ]),
    ),
  );

  const [dragging, setDragging] = useState(null);
  const [dragOverPanel, setDragOverPanel] = useState(null);
  const [showAiBadge, setShowAiBadge] = useState(true);
  const [showHint, setShowHint] = useState(true);
  const activePieces =
    template.patternSource === "freesewing"
      ? (runtimePieces ??
        freesewingPatterns[templateId] ??
        template.patternPieces)
      : template.patternPieces;
  const frontRef = useRef();
  const backRef = useRef();
  const lastTapRef = useRef({ id: null, time: 0 });
  // tracks current pointer page coords during a drag for cross-panel detection
  const dragPointerPageRef = useRef({ x: 0, y: 0 });

  // For FreeSewing templates, seed positions from the pre-extracted JSON on mount.
  useEffect(() => {
    if (template.patternSource !== "freesewing") return;
    const pieces = freesewingPatterns[templateId] ?? [];
    setPositions(
      Object.fromEntries(
        pieces.map((p) => [
          p.id,
          {
            x: (p.defaultX / 100) * PANEL_W,
            y: (p.defaultY / 100) * panelPxH,
            rotation: 0,
            panel: p.panel === "back" ? "back" : "front",
          },
        ]),
      ),
    );
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
          setPositions(
            Object.fromEntries(
              pieces.map((p) => [
                p.id,
                {
                  x: (p.defaultX / 100) * PANEL_W,
                  y: (p.defaultY / 100) * panelPxH,
                  rotation: 0,
                  panel: p.panel === "back" ? "back" : "front",
                },
              ]),
            ),
          );
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

    dragPointerPageRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging({
      id: piece.id,
      panelRef,
      panelKey,
      startPointerX: px,
      startPointerY: py,
      startPieceX: pos.x,
      startPieceY: pos.y,
    });
  }

  function handlePointerMove(e) {
    if (!dragging) return;
    dragPointerPageRef.current = { x: e.clientX, y: e.clientY };
    const { px, py } = getPointerPos(e, dragging.panelRef);
    const dx = px - dragging.startPointerX;
    const dy = py - dragging.startPointerY;
    const piece = activePieces.find((p) => p.id === dragging.id);
    const pos = positions[piece.id];
    const { ew, eh } = effectiveSize(piece, scale, pos.rotation);
    const newX = Math.max(0, Math.min(PANEL_W - ew, dragging.startPieceX + dx));
    const newY = Math.max(
      0,
      Math.min(panelPxH - eh, dragging.startPieceY + dy),
    );
    setPositions((prev) => ({
      ...prev,
      [dragging.id]: { ...prev[dragging.id], x: newX, y: newY },
    }));
    // Highlight the other panel when the pointer hovers over it
    const otherRef = dragging.panelKey === "front" ? backRef : frontRef;
    const otherKey = dragging.panelKey === "front" ? "back" : "front";
    if (otherRef.current) {
      const rect = otherRef.current.getBoundingClientRect();
      const over =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      setDragOverPanel(over ? otherKey : null);
    }
  }

  function handlePointerUp(e) {
    if (dragging) {
      if (showAiBadge) setShowAiBadge(false);
      // Check if the pointer was released over the other panel
      const otherRef = dragging.panelKey === "front" ? backRef : frontRef;
      const otherKey = dragging.panelKey === "front" ? "back" : "front";
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
          // Move piece to the other panel, clamped to its bounds
          const piece = activePieces.find((p) => p.id === dragging.id);
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
            [dragging.id]: {
              ...prev[dragging.id],
              x: dropX,
              y: dropY,
              panel: otherKey,
            },
          }));
        }
      }
    }
    setDragOverPanel(null);
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

  /* ── Render a single panel ── */
  function renderPanel(panelLabel, panelKey, ref, imageUrl, imgOpacity) {
    const pieces = activePieces.filter(
      (p) => positions[p.id]?.panel === panelKey,
    );
    return (
      <div
        ref={ref}
        className={`border rounded-xl overflow-hidden transition-colors ${
          dragOverPanel === panelKey
            ? "border-secondary-400 ring-2 ring-secondary-400/50"
            : "border-primary-600"
        }`}
        style={{
          position: "relative",
          width: PANEL_W,
          height: panelPxH,
          touchAction: "none",
          flexShrink: 0,
        }}
        onPointerDown={(e) => handlePointerDown(e, ref, panelKey)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <PanelBackground
          label={panelLabel}
          panelW={PANEL_W}
          panelH={panelPxH}
          imageUrl={imageUrl}
          opacity={imgOpacity}
          bboxFraction={bboxFraction}
        />

        {pieces.map((piece) => {
          const pos = positions[piece.id];
          const { ew, eh } = effectiveSize(piece, scale, pos.rotation);
          const misaligned = isMisaligned(
            (piece.grainAngleDeg + pos.rotation) % 360,
            grainAngleDeg,
          );
          return (
            <div
              key={piece.id}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                width: ew,
                height: eh,
                cursor: dragging?.id === piece.id ? "grabbing" : "grab",
                userSelect: "none",
                zIndex: dragging?.id === piece.id ? 10 : 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  transform: `rotate(${pos.rotation}deg)`,
                  transformOrigin: "center center",
                }}
              >
                <PieceShape piece={piece} scale={scale} />
              </div>
              {misaligned && (
                <div
                  className="absolute bg-secondary-500 text-white flex items-center justify-center font-bold"
                  style={{
                    top: -4,
                    right: -4,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    fontSize: 7,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    pointerEvents: "none",
                  }}
                >
                  !
                </div>
              )}
              {pos.rotation !== 0 && (
                <div
                  className="absolute bg-primary-600 text-primary-50 flex items-center justify-center"
                  style={{
                    bottom: -4,
                    left: -4,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    fontSize: 6,
                    fontWeight: 700,
                    pointerEvents: "none",
                  }}
                >
                  {pos.rotation}°
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
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
          <h2 className="font-semibold text-primary-50">Pattern Layout</h2>
          <p className="text-primary-100 text-xs mt-0.5">
            Drag · double-tap rotates · tap →B/→F to flip side
          </p>
        </div>
      </div>

      {/* Garment info strip */}
      <div className="mx-5 mb-3 flex items-center gap-2 bg-primary-700 rounded-xl px-3 py-2 border border-primary-600">
        <span className="text-[11px] text-primary-300">
          Each panel:{" "}
          <span className="font-semibold text-primary-100">
            {panelW} × {panelH} cm
          </span>
        </span>
        <span className="mx-1 text-primary-600">·</span>
        <span className="text-[11px] text-primary-300">
          Grain:{" "}
          <span className="font-semibold text-primary-100">
            {grainLabel(grainAngleDeg)}
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
                ? "Could not load pattern file."
                : "Pattern generation failed."}
            </p>
            <p className="text-xs text-red-600">
              Showing default sizing instead.
            </p>
            <button
              onClick={() => {
                setFsError(null);
                setRuntimePieces(null);
                setFsRetry((n) => n + 1);
              }}
              className="self-start text-xs font-semibold text-red-700 underline"
            >
              Retry
            </button>
          </div>
        )}
        {/* Front then back, stacked vertically */}
        <div className="flex flex-col items-center px-2.5 gap-3 mb-4">
          {renderPanel("FRONT", "front", frontRef, maskedImageUrl, 0.8)}
          {renderPanel("BACK", "back", backRef, maskedImageUrl, 0.35)}
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
            ✨ AI Suggested Layout — drag to adjust, double-tap to rotate
          </div>
        )}

        {showHint && (
          <div className="mx-5 mb-3 bg-primary-700 border border-primary-600 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">💡</span>
            <p className="flex-1 text-[11px] text-primary-100 leading-4">
              <span className="font-semibold">
                To move a piece to the other side:
              </span>{" "}
              drag it into the other panel, or tap{" "}
              <span className="font-semibold bg-primary-600 rounded px-1">
                →B
              </span>{" "}
              /{" "}
              <span className="font-semibold bg-primary-600 rounded px-1">
                →F
              </span>{" "}
              next to its name below.
            </p>
            <button
              onClick={() => setShowHint(false)}
              className="text-primary-400 text-sm leading-none mt-0.5 shrink-0"
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
              Pieces marked <span className="font-bold">!</span> have a
              different grain direction — intentional for the design.
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="mx-5">
          <p className="text-[11px] font-semibold text-primary-100 uppercase tracking-wider mb-2">
            Pattern Pieces
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
                  {piece.label}
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
          <span>📷</span> Try on Garment (AR View)
        </button>
        <button
          onClick={() => navigate("stepGuide")}
          className="w-full bg-secondary-300 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-md shadow-black/20"
        >
          Confirm Layout →
        </button>
      </div>

      {/* Loading overlay for runtime extraction */}
      {fsLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-primary-900/60">
          <div className="bg-primary-700 rounded-2xl px-6 py-5 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-300 border-t-transparent rounded-full animate-spin" />
            <p className="text-primary-100 text-sm font-medium">
              Generating your pattern…
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
