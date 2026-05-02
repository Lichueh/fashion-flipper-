// Three AR overlay components rendered inside the rigid-body translate
// layer of ArTutorialScreen. Each is positioned in container-local coords
// (relative to the translated wrapper). Drag interactions update local
// offsets owned by the parent screen.

const ACCENT = "#FFCC00";
const ACCENT_RGBA = "rgba(255,204,0,0.95)";

function chipStyle({ filled = false } = {}) {
  return filled
    ? {
        background: "white",
        color: "#1a1a1a",
        fontSize: 12,
        fontWeight: 700,
        padding: "4px 10px",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        fontFamily: "monospace",
        whiteSpace: "nowrap",
      }
    : {
        // No backdrop-filter — combining backdrop-filter inside a CSS
        // transform parent triggers iOS Safari layer flicker during pinch.
        background: "rgba(0,0,0,0.78)",
        color: "white",
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 11,
        border: "1px solid rgba(255,255,255,0.25)",
        whiteSpace: "nowrap",
      };
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic numbered-callout overlay — used for sewing-machine AR tutorial
// where the user aligns numbered points on the screen with parts of their
// own machine. Optional dashed arrows connect consecutive points.
// ─────────────────────────────────────────────────────────────────────────────
export function NumberedCalloutOverlay({
  dimensions,
  overlay,
  dragOffset,
  onDrag,
}) {
  const dx = dragOffset?.dx ?? 0;
  const dy = dragOffset?.dy ?? 0;

  const points = overlay.points.map((p, i) => ({
    ...p,
    idx: i + 1,
    x: p.xNorm * dimensions.w + dx,
    y: p.yNorm * dimensions.h + dy,
  }));

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const grabLeft = Math.min(...xs) - 60;
  const grabRight = Math.max(...xs) + 60;
  const grabTop = Math.min(...ys) - 30;
  const grabBottom = Math.max(...ys) + 80;

  function handleClusterDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    const startCx = e.clientX;
    const startCy = e.clientY;
    const startDx = dx;
    const startDy = dy;
    function onMove(ev) {
      onDrag({
        dx: startDx + (ev.clientX - startCx),
        dy: startDy + (ev.clientY - startCy),
      });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <>
      <style>{`
        @keyframes calloutPulse {
          0%, 100% { box-shadow: 0 0 0 0 ${ACCENT_RGBA}, 0 2px 6px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 0 8px rgba(255,204,0,0), 0 2px 6px rgba(0,0,0,0.5); }
        }
      `}</style>

      {/* Drag-grab area beneath everything */}
      <div
        onPointerDown={handleClusterDrag}
        style={{
          position: "absolute",
          left: grabLeft,
          top: grabTop,
          width: grabRight - grabLeft,
          height: grabBottom - grabTop,
          cursor: "grab",
          touchAction: "none",
          background: "transparent",
        }}
      />

      {/* Connecting arrows between consecutive callouts */}
      {overlay.connectArrows && points.length > 1 && (
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "visible",
          }}
          viewBox={`0 0 ${dimensions.w} ${dimensions.h}`}
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="callout-arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 9 3, 0 6" fill={ACCENT_RGBA} />
            </marker>
          </defs>
          {points.slice(0, -1).map((p, i) => {
            const next = points[i + 1];
            // Trim line endpoints so they don't disappear under the circles
            const dxL = next.x - p.x;
            const dyL = next.y - p.y;
            const len = Math.sqrt(dxL * dxL + dyL * dyL);
            const inset = 22;
            const ux = dxL / len;
            const uy = dyL / len;
            return (
              <line
                key={i}
                x1={p.x + ux * inset}
                y1={p.y + uy * inset}
                x2={next.x - ux * inset}
                y2={next.y - uy * inset}
                stroke={ACCENT_RGBA}
                strokeWidth="2"
                strokeDasharray="6,4"
                markerEnd="url(#callout-arrowhead)"
              />
            );
          })}
        </svg>
      )}

      {/* Numbered circles + label chips */}
      {points.map((p) => (
        <div
          key={p.idx}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: ACCENT_RGBA,
              color: "#1a1a1a",
              border: "3px solid white",
              fontSize: 15,
              fontWeight: 800,
              fontFamily: "monospace",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
              animation: "calloutPulse 2.4s ease-in-out infinite",
            }}
          >
            {p.idx}
          </div>
          <div
            style={{
              position: "absolute",
              top: 42,
              left: "50%",
              transform: "translateX(-50%)",
              ...chipStyle({ filled: true }),
              fontSize: 11,
              padding: "4px 9px",
            }}
          >
            {p.label}
            {p.value && (
              <span
                style={{
                  marginLeft: 6,
                  paddingLeft: 6,
                  borderLeft: "1px solid rgba(0,0,0,0.2)",
                  color: "#475840",
                  fontWeight: 700,
                }}
              >
                {p.value}
              </span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Cut neckline (U) + both sleeves (J / mirror-J)
// ─────────────────────────────────────────────────────────────────────────────
export function CutSleeveOverlay({
  dimensions,
  pxPerCm,
  overlay,
  dragOffset, // { dxLeft?, dyU?, dxAll?, dyAll? } — all optional
  onDrag,
}) {
  const { sleeves, neckline } = overlay;

  // Whole-cluster translation (drag empty space between cuts)
  const dxAll = dragOffset?.dxAll ?? 0;
  const dyAll = dragOffset?.dyAll ?? 0;

  // Sleeve geometry
  const lengthPx = sleeves.left.lengthCm * pxPerCm;
  const yTop = sleeves.left.yTopNorm * dimensions.h + dyAll;
  const yBot = yTop + lengthPx;
  const hookPx = lengthPx * 0.28; // horizontal hook length at the bottom of the J

  const dxL = dragOffset?.dxLeft ?? 0;
  const xL = sleeves.left.xNorm * dimensions.w + dxL + dxAll;
  const xR = sleeves.right.xNorm * dimensions.w - dxL + dxAll;

  // Neckline geometry (centered between the two sleeve x's)
  const dyU = dragOffset?.dyU ?? 0;
  const neckCenter = (xL + xR) / 2;
  const neckHalfWidth = (neckline.widthCm * pxPerCm) / 2;
  const xNL = neckCenter - neckHalfWidth;
  const xNR = neckCenter + neckHalfWidth;
  const yNT = neckline.yTopNorm * dimensions.h + dyU + dyAll;
  const yNB = yNT + neckline.depthCm * pxPerCm;

  // SVG paths — both J hooks curve OUTWARD at the bottom (away from center)
  const leftJPath = `M ${xL} ${yTop} L ${xL} ${yTop + lengthPx * 0.7} Q ${xL} ${yBot} ${xL - hookPx} ${yBot}`;
  const rightJPath = `M ${xR} ${yTop} L ${xR} ${yTop + lengthPx * 0.7} Q ${xR} ${yBot} ${xR + hookPx} ${yBot}`;
  // Wide U with a flat bottom: vertical sides, rounded corners, flat between.
  const uCornerR = Math.min((xNR - xNL) * 0.3, (yNB - yNT) * 0.4);
  const uPath = `M ${xNL} ${yNT} L ${xNL} ${yNB - uCornerR} Q ${xNL} ${yNB} ${xNL + uCornerR} ${yNB} L ${xNR - uCornerR} ${yNB} Q ${xNR} ${yNB} ${xNR} ${yNB - uCornerR} L ${xNR} ${yNT}`;

  function handleSleeveDrag(e, side) {
    e.preventDefault();
    e.stopPropagation();
    const startCx = e.clientX;
    const startDx = dxL;

    function onMove(ev) {
      const delta = ev.clientX - startCx;
      const next = side === "left" ? startDx + delta : startDx - delta;
      // Clamp so neither J crosses center
      const center = dimensions.w / 2;
      const minGap = 60;
      const leftMaxDelta = center - minGap - sleeves.left.xNorm * dimensions.w;
      const rightMaxDelta =
        sleeves.right.xNorm * dimensions.w - (center + minGap);
      const clamped = Math.max(
        -sleeves.left.xNorm * dimensions.w + 10,
        Math.min(Math.min(leftMaxDelta, rightMaxDelta), next),
      );
      onDrag({ ...dragOffset, dxLeft: clamped });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function handleNeckDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    const startCy = e.clientY;
    const startDy = dyU;

    function onMove(ev) {
      onDrag({ ...dragOffset, dyU: startDy + (ev.clientY - startCy) });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  // Translate the whole 3-cut assembly when user grabs empty space.
  function handleClusterDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    const startCx = e.clientX;
    const startCy = e.clientY;
    const startDx = dxAll;
    const startDy = dyAll;

    function onMove(ev) {
      onDrag({
        ...dragOffset,
        dxAll: startDx + (ev.clientX - startCx),
        dyAll: startDy + (ev.clientY - startCy),
      });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  // SVG ids must be unique enough to not collide with multiple step renders
  const id = `cut-${Math.round(yTop)}`;
  const idL = `${id}-l`;
  const idR = `${id}-r`;
  const idU = `${id}-u`;

  // Drag-grab bounding box covering all 3 cuts. Rendered first so handle
  // divs (later in DOM) take pointer-event priority on overlap.
  const grabLeft = Math.min(xL - hookPx, xNL) - 12;
  const grabRight = Math.max(xR + hookPx, xNR) + 12;
  const grabTop = Math.min(yTop, yNT) - 12;
  const grabBottom = Math.max(yBot, yNB) + 12;

  return (
    <>
      <div
        onPointerDown={handleClusterDrag}
        style={{
          position: "absolute",
          left: grabLeft,
          top: grabTop,
          width: grabRight - grabLeft,
          height: grabBottom - grabTop,
          cursor: "grab",
          touchAction: "none",
          background: "transparent",
        }}
      />

      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "visible",
        }}
        viewBox={`0 0 ${dimensions.w} ${dimensions.h}`}
        preserveAspectRatio="none"
      >
        <path
          id={idL}
          d={leftJPath}
          stroke={ACCENT_RGBA}
          strokeWidth="2.5"
          strokeDasharray="9,5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          id={idR}
          d={rightJPath}
          stroke={ACCENT_RGBA}
          strokeWidth="2.5"
          strokeDasharray="9,5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          id={idU}
          d={uPath}
          stroke={ACCENT_RGBA}
          strokeWidth="2.5"
          strokeDasharray="9,5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Animated scissors walking each path */}
        {[idL, idR, idU].map((pid) => (
          <text
            key={pid}
            fontSize="16"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}
          >
            ✂
            <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
              <mpath href={`#${pid}`} />
            </animateMotion>
          </text>
        ))}
      </svg>

      {/* Sleeve drag handles — top + at the start of the hook */}
      {[
        { x: xL, y: yTop, side: "left" },
        { x: xL, y: yTop + lengthPx * 0.7, side: "left" },
        { x: xR, y: yTop, side: "right" },
        { x: xR, y: yTop + lengthPx * 0.7, side: "right" },
      ].map((h, i) => (
        <div
          key={i}
          onPointerDown={(e) => handleSleeveDrag(e, h.side)}
          style={{
            position: "absolute",
            left: h.x - 9,
            top: h.y - 9,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "white",
            border: `2px solid ${ACCENT_RGBA}`,
            boxShadow: "0 0 6px rgba(0,0,0,0.6)",
            cursor: "ew-resize",
            touchAction: "none",
          }}
        />
      ))}

      {/* Neckline drag handle at the deepest point of the U */}
      <div
        onPointerDown={handleNeckDrag}
        style={{
          position: "absolute",
          left: neckCenter - 9,
          top: yNB - 9,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "white",
          border: `2px solid ${ACCENT_RGBA}`,
          boxShadow: "0 0 6px rgba(0,0,0,0.6)",
          cursor: "ns-resize",
          touchAction: "none",
        }}
      />

      {/* Sleeve length chips */}
      <div
        style={{
          position: "absolute",
          left: xL - 30,
          top: yTop + lengthPx * 0.45,
          transform: "translate(-100%, -50%)",
          ...chipStyle(),
          pointerEvents: "none",
        }}
      >
        {sleeves.left.lengthCm} cm
      </div>
      <div
        style={{
          position: "absolute",
          left: xR + 30,
          top: yTop + lengthPx * 0.45,
          transform: "translate(0, -50%)",
          ...chipStyle(),
          pointerEvents: "none",
        }}
      >
        {sleeves.right.lengthCm} cm
      </div>

      {/* Neckline label */}
      <div
        style={{
          position: "absolute",
          left: neckCenter,
          top: yNT - 8,
          transform: "translate(-50%, -100%)",
          ...chipStyle({ filled: true }),
          pointerEvents: "none",
        }}
      >
        Neckline · {neckline.widthCm}×{neckline.depthCm} cm
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Fringe tick marks across the hem
// ─────────────────────────────────────────────────────────────────────────────
export function FringeMarksOverlay({
  dimensions,
  pxPerCm,
  overlay,
  dragOffset, // { dx, dy }
  onDrag,
}) {
  const { count, spacingCm, depthCm, hemYNorm } = overlay;
  const spacingPx = spacingCm * pxPerCm;
  const depthPx = depthCm * pxPerCm;
  const totalWidth = (count - 1) * spacingPx;

  const baseX = dimensions.w / 2 + (dragOffset?.dx ?? 0);
  const baseY = hemYNorm * dimensions.h + (dragOffset?.dy ?? 0);
  const startX = baseX - totalWidth / 2;

  const overflow = totalWidth > 0.9 * dimensions.w;

  function handlePointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const startCx = e.clientX;
    const startCy = e.clientY;
    const startDx = dragOffset?.dx ?? 0;
    const startDy = dragOffset?.dy ?? 0;

    function onMove(ev) {
      onDrag({
        dx: startDx + (ev.clientX - startCx),
        dy: startDy + (ev.clientY - startCy),
      });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <>
      {/* Drag-grab area covering the cluster */}
      <div
        onPointerDown={handlePointerDown}
        style={{
          position: "absolute",
          left: startX - 10,
          top: baseY - 16,
          width: totalWidth + 20,
          height: depthPx + 32,
          cursor: "grab",
          touchAction: "none",
          background: "transparent",
        }}
      />

      {/* Horizontal hem baseline (dotted) */}
      <div
        style={{
          position: "absolute",
          left: startX - 12,
          top: baseY - 1,
          width: totalWidth + 24,
          height: 2,
          borderTop: `2px dotted ${ACCENT_RGBA}`,
          pointerEvents: "none",
        }}
      />

      {/* 12 vertical ticks */}
      {Array.from({ length: count }, (_, i) => {
        const x = startX + i * spacingPx;
        return (
          <div key={i} style={{ position: "absolute", pointerEvents: "none" }}>
            <div
              style={{
                position: "absolute",
                left: x - 1,
                top: baseY,
                width: 2,
                height: depthPx,
                borderLeft: `2px dashed ${ACCENT_RGBA}`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x,
                top: baseY + depthPx + 4,
                transform: "translate(-50%, 0)",
                fontSize: 9,
                color: "white",
                fontFamily: "monospace",
                fontWeight: 600,
                textShadow: "0 1px 2px rgba(0,0,0,0.7)",
              }}
            >
              {i + 1}
            </div>
          </div>
        );
      })}

      {/* Depth dimension marker on leftmost tick */}
      <div
        style={{
          position: "absolute",
          left: startX - 28,
          top: baseY,
          height: depthPx,
          width: 18,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 8,
            top: 0,
            bottom: 0,
            borderLeft: "1px solid rgba(255,255,255,0.6)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 4,
            top: 0,
            width: 8,
            borderTop: "1px solid rgba(255,255,255,0.6)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 4,
            bottom: 0,
            width: 8,
            borderTop: "1px solid rgba(255,255,255,0.6)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -22,
            top: depthPx / 2,
            transform: "translate(-50%, -50%) rotate(-90deg)",
            ...chipStyle(),
          }}
        >
          {depthCm} cm
        </div>
      </div>

      {/* Width chip centered on baseline */}
      <div
        style={{
          position: "absolute",
          left: baseX,
          top: baseY - 14,
          transform: "translate(-50%, -100%)",
          ...chipStyle({ filled: true }),
          pointerEvents: "none",
        }}
      >
        {count} cuts · {spacingCm} cm apart
      </div>

      {/* Overflow warning */}
      {overflow && (
        <div
          style={{
            position: "absolute",
            left: dimensions.w / 2,
            top: baseY + depthPx + 28,
            transform: "translateX(-50%)",
            background: "rgba(255,80,80,0.85)",
            color: "white",
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 12,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          Move phone back so all {count} marks fit
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Knot pair brackets (inherits step 2 geometry)
// ─────────────────────────────────────────────────────────────────────────────
export function KnotPairsOverlay({
  dimensions,
  pxPerCm,
  overlay, // current step's overlay
  inheritedOverlay, // step 2 fringe params
  inheritedDragOffset, // user's step 2 drag offset (so pairs line up with their cuts)
  onTranslateInherited, // updates step 2's offset so pairs realign with cuts
  completedPairs,
  onTogglePair,
}) {
  const fringe = inheritedOverlay;
  const spacingPx = fringe.spacingCm * pxPerCm;
  const depthPx = fringe.depthCm * pxPerCm;
  const totalWidth = (fringe.count - 1) * spacingPx;

  const baseX =
    dimensions.w / 2 + (inheritedDragOffset?.dx ?? 0);
  const baseY =
    fringe.hemYNorm * dimensions.h + (inheritedDragOffset?.dy ?? 0);
  const startX = baseX - totalWidth / 2;

  const numPairs = Math.floor(fringe.count / 2);
  // Find the next undone pair index for pulse animation
  const nextPair = (() => {
    for (let i = 0; i < numPairs; i++) if (!completedPairs.has(i)) return i;
    return -1;
  })();

  function handleClusterDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    const startCx = e.clientX;
    const startCy = e.clientY;
    const startDx = inheritedDragOffset?.dx ?? 0;
    const startDy = inheritedDragOffset?.dy ?? 0;

    function onMove(ev) {
      onTranslateInherited?.({
        dx: startDx + (ev.clientX - startCx),
        dy: startDy + (ev.clientY - startCy),
      });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <>
      <style>{`
        @keyframes pairPulse {
          0%, 100% { transform: translate(-50%, -100%) scale(1); }
          50%      { transform: translate(-50%, -100%) scale(1.12); }
        }
      `}</style>

      {/* Drag-grab area covering the cluster (excluding the chip row at top
          where the bracket buttons live) */}
      {onTranslateInherited && (
        <div
          onPointerDown={handleClusterDrag}
          style={{
            position: "absolute",
            left: startX - 10,
            top: baseY,
            width: totalWidth + 20,
            height: depthPx,
            cursor: "grab",
            touchAction: "none",
            background: "transparent",
          }}
        />
      )}

      {/* Greyed-out tick reference */}
      <div
        style={{
          position: "absolute",
          left: startX - 12,
          top: baseY - 1,
          width: totalWidth + 24,
          height: 2,
          borderTop: "2px dotted rgba(255,255,255,0.3)",
          pointerEvents: "none",
        }}
      />
      {Array.from({ length: fringe.count }, (_, i) => {
        const x = startX + i * spacingPx;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - 1,
              top: baseY,
              width: 2,
              height: depthPx,
              borderLeft: "2px dashed rgba(255,255,255,0.3)",
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Bracket arcs + numbered chips for each pair */}
      {Array.from({ length: numPairs }, (_, k) => {
        const x1 = startX + 2 * k * spacingPx;
        const x2 = startX + (2 * k + 1) * spacingPx;
        const midX = (x1 + x2) / 2;
        const done = completedPairs.has(k);
        const isNext = k === nextPair;

        return (
          <div key={k}>
            {/* SVG bracket arc */}
            <svg
              style={{
                position: "absolute",
                left: x1 - 4,
                top: baseY - 28,
                width: x2 - x1 + 8,
                height: 22,
                pointerEvents: "none",
              }}
              viewBox={`0 0 ${x2 - x1 + 8} 22`}
            >
              <path
                d={`M 4,22 Q ${(x2 - x1 + 8) / 2},2 ${x2 - x1 + 4},22`}
                stroke={done ? "#4ade80" : ACCENT_RGBA}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>

            {/* Numbered chip */}
            <button
              onClick={() => onTogglePair(k)}
              style={{
                position: "absolute",
                left: midX,
                top: baseY - 26,
                transform: "translate(-50%, -100%)",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: done ? "#4ade80" : "white",
                border: `2px solid ${done ? "#16a34a" : ACCENT_RGBA}`,
                color: done ? "white" : "#1a1a1a",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "monospace",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                touchAction: "none",
                animation: isNext ? "pairPulse 1.4s ease-in-out infinite" : "none",
              }}
            >
              {done ? "✓" : k + 1}
            </button>
          </div>
        );
      })}
    </>
  );
}
