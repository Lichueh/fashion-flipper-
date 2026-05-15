/* ── Helpers also imported by PatternLayoutScreen ─────────────────── */
export function isMisaligned(pieceAngle, garmentAngle) {
  const diff = Math.abs((pieceAngle - garmentAngle + 180) % 180);
  return diff > 15;
}

/* ── Effective bounding box of a piece after rotation ────────────── */
export function effectiveSize(piece, scale, rotation) {
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
// Fallback that mirrors useLang.tl(): unwraps { en, nb, zh } to en when
// PieceShape is rendered without a tl prop. Stops React from crashing on
// "Objects are not valid as a React child" when a custom pattern (hat / bag
// / noSewTote) ships i18n-shaped piece labels.
function _enLabel(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v.en ?? "";
}

function PieceShape({ piece, scale, tl = _enLabel }) {
  const pw = piece.widthCm * scale;
  const ph = piece.heightCm * scale;
  const seam = Math.min(3, pw * 0.07, ph * 0.07);
  const isCircular = piece.shape === "circle" || piece.shape === "ring";

  // FreeSewing-sourced pieces: render the extracted SVG seam path directly
  if (piece.shape === "svgpath") {
    const annotationStyle = {
      cutonfold: {
        stroke: "#1e3a5f",
        strokeWidth: "1",
        strokeDasharray: "8 4",
        fill: "none",
      },
      grainline: { stroke: "#1e3a5f", strokeWidth: "1", fill: "none" },
      lining: {
        stroke: "#4a90d9",
        strokeWidth: "1",
        strokeDasharray: "4 4",
        fill: "none",
      },
      mark: {
        stroke: "#1e3a5f",
        strokeWidth: "0.8",
        strokeDasharray: "4 2",
        fill: "none",
      },
      help: {
        stroke: "#999999",
        strokeWidth: "0.7",
        strokeDasharray: "2 2",
        fill: "none",
      },
      dotted: {
        stroke: "#1e3a5f",
        strokeWidth: "0.7",
        strokeDasharray: "2 3",
        fill: "none",
      },
      dashed: {
        stroke: "#1e3a5f",
        strokeWidth: "0.8",
        strokeDasharray: "6 3",
        fill: "none",
      },
      various: { stroke: "#999999", strokeWidth: "0.7", fill: "none" },
    };
    return (
      <div style={{ width: pw, height: ph, position: "relative" }}>
        <svg viewBox={piece.viewBox} width={pw} height={ph}>
          <path
            d={piece.svgPath}
            fill={piece.color}
            stroke="#1e3a5f"
            strokeWidth="1"
          />
          {Object.entries(piece.annotationPaths ?? {}).map(([cat, paths]) =>
            paths.map((d, i) => (
              <path
                key={`${cat}-${i}`}
                d={d}
                {...(annotationStyle[cat] ?? annotationStyle.various)}
              />
            )),
          )}
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
            {tl(piece.label)}
          </div>
          {(piece.cutCount ?? 1) > 1 && (
            <div
              className="text-secondary-700 font-bold font-mono"
              style={{ fontSize: 6, lineHeight: 1.3 }}
            >
              Cut ×{piece.cutCount}
            </div>
          )}
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
          {tl(piece.label)}
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

/* ── Pattern panel ────────────────────────────────────────────────── */
export default function PatternPanel({
  panelLabel,
  panelKey,
  panelRef,
  panelW,
  panelH,
  activePieces,
  positions,
  scale,
  dragging,
  grainAngleDeg,
  bboxFraction,
  dragOverPanel,
  imageUrl,
  imgOpacity,
  tl,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  const pieces = activePieces.filter(
    (p) => positions[p.id]?.panel === panelKey,
  );
  return (
    <div
      style={{
        borderRadius: "0.75rem",
        overflow: "hidden",
        width: panelW,
        height: panelH,
        flexShrink: 0,
      }}
    >
      <div
        ref={panelRef}
        className={`border rounded-xl transition-colors ${
          dragOverPanel === panelKey
            ? "border-secondary-400 ring-2 ring-secondary-400/50"
            : "border-primary-600"
        }`}
        style={{
          position: "relative",
          width: panelW,
          height: panelH,
          flexShrink: 0,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <PanelBackground
          label={panelLabel}
          panelW={panelW}
          panelH={panelH}
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
              data-piece-id={piece.id}
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
                willChange: dragging?.id === piece.id ? "transform" : "auto",
                touchAction: "none",
              }}
            >
              <div
                style={{
                  transform: `rotate(${pos.rotation}deg)`,
                  transformOrigin: "center center",
                }}
              >
                <PieceShape piece={piece} scale={scale} tl={tl} />
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
    </div>
  );
}
