import { useState, useRef, useEffect } from "react";
import { templates } from "../data/templates";
import { mockAnalysis } from "../data/mockAnalysis";
import useDeviceOrientation from "../hooks/useDeviceOrientation";
import usePinchScale from "../hooks/usePinchScale";

// Small-angle approximation: 1° of phone rotation ≈ this many pixels of
// scene shift. Same constant as ArMeasureScreen — tune both together.
const PX_PER_DEG = 6;

function CameraPiece({ piece, scale, pos, dragging, onPointerDown }) {
  const pw = piece.widthCm * scale;
  const ph = piece.heightCm * scale;
  const seam = Math.min(5, pw * 0.07, ph * 0.07);

  const isCircular = piece.shape === "circle" || piece.shape === "ring";
  const innerPct =
    piece.shape === "ring"
      ? Math.round((piece.innerRadiusCm / piece.outerRadiusCm) * 100)
      : 0;

  const shapeStyle = {
    width: pw,
    height: ph,
    backgroundColor: "rgba(240,242,236,0.18)",
    border: "2px solid rgba(240,242,236,0.9)",
    backdropFilter: "blur(2px)",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    ...(piece.shape === "rect" && { borderRadius: 3 }),
    ...(piece.shape === "trapezoid" && {
      clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)",
      border: "none",
    }),
    ...(piece.shape === "circle" && { borderRadius: "50%" }),
    ...(piece.shape === "ring" && {
      borderRadius: "50%",
      background: `radial-gradient(circle, transparent ${innerPct}%, rgba(240,242,236,0.18) ${innerPct}%, rgba(240,242,236,0.18) 100%)`,
    }),
  };

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        zIndex: dragging ? 20 : 10,
        filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))",
      }}
      onPointerDown={onPointerDown}
    >
      {piece.shape === "trapezoid" && (
        <svg
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          width={pw}
          height={ph}
          viewBox={`0 0 ${pw} ${ph}`}
        >
          <polygon
            points={`${pw * 0.08},0 ${pw * 0.92},0 ${pw},${ph} 0,${ph}`}
            fill="rgba(240,242,236,0.18)"
            stroke="rgba(240,242,236,0.9)"
            strokeWidth="2"
          />
          <polygon
            points={`${pw * 0.08 + seam},${seam} ${pw * 0.92 - seam},${seam} ${pw - seam},${ph - seam} ${seam},${ph - seam}`}
            fill="none"
            stroke="rgba(240,242,236,0.5)"
            strokeWidth="1"
            strokeDasharray="4,3"
          />
        </svg>
      )}

      <div style={shapeStyle}>
        {piece.shape !== "trapezoid" && !isCircular && (
          <div
            style={{
              position: "absolute",
              inset: seam,
              border: "1px dashed rgba(240,242,236,0.5)",
              borderRadius: 2,
              pointerEvents: "none",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 8,
              color: "rgba(240,242,236,0.8)",
              lineHeight: 1,
            }}
          >
            ▲
          </span>
          <div
            style={{
              width: 1,
              height: Math.max(14, ph * 0.35),
              borderLeft: "1px solid rgba(240,242,236,0.6)",
            }}
          />
          <span
            style={{
              fontSize: 8,
              color: "rgba(240,242,236,0.8)",
              lineHeight: 1,
            }}
          >
            ▼
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: seam + 2,
            left: 0,
            right: 0,
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: 8,
              color: "white",
              fontWeight: 700,
              fontFamily: "monospace",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            }}
          >
            {piece.label}
          </div>
          <div
            style={{
              fontSize: 6.5,
              color: "rgba(240,242,236,0.8)",
              fontFamily: "monospace",
              textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            {piece.widthCm}×{piece.heightCm}cm
          </div>
        </div>
      </div>
    </div>
  );
}

function GrainOverlay({ w, h, angle, spacing }) {
  const cssAngle = (90 - angle + 360) % 360;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(
          ${cssAngle}deg,
          transparent 0px, transparent ${spacing - 1}px,
          rgba(144,164,128,0.18) ${spacing - 1}px, rgba(144,164,128,0.18) ${spacing}px
        )`,
      }}
    />
  );
}

const PIECE_SCALE_FALLBACK = 2.4;

export default function CameraPatternScreen({
  navigate,
  template: templateId,
  longestSideCm,
  calibPxPerCm,
}) {
  const template = templates[templateId];
  const { garmentLayout } = mockAnalysis;

  const [phase, setPhase] = useState("loading");
  const [scanPct, setScanPct] = useState(0);
  const [dimensions, setDimensions] = useState({ w: 390, h: 700 });
  const [anchorOrient, setAnchorOrient] = useState(null);

  const videoRef = useRef();
  const containerRef = useRef();
  const streamRef = useRef();

  const {
    orientation,
    permission: orientPerm,
    requestPermission: requestOrient,
  } = useDeviceOrientation();
  const { scale, reset: resetScale } = usePinchScale(containerRef, {
    enabled: phase === "ready",
  });

  const [positions, setPositions] = useState(() =>
    Object.fromEntries(
      template.patternPieces.map((p, i) => [
        p.id,
        { x: 20 + i * 12, y: 60 + i * 8 },
      ]),
    ),
  );
  const [dragging, setDragging] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setPhase("scanning");
      } catch {
        if (!cancelled) setPhase("denied");
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (phase !== "scanning") return;
    setScanPct(0);
    const iv = setInterval(
      () =>
        setScanPct((p) => {
          if (p >= 100) {
            clearInterval(iv);
            return 100;
          }
          return p + 2.5;
        }),
      55,
    );
    const tm = setTimeout(() => setPhase("ready"), 2400);
    return () => {
      clearInterval(iv);
      clearTimeout(tm);
    };
  }, [phase]);

  useEffect(() => {
    if (!containerRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = containerRef.current;
    setDimensions({ w, h });
  }, [phase]);

  // Snapshot orientation once when entering "ready" so all pieces share
  // the same world-space anchor. Subsequent phone rotation translates the
  // whole pattern as a rigid layer, faking spatial anchoring.
  useEffect(() => {
    if (phase === "ready" && !anchorOrient) {
      setAnchorOrient({ ...orientation });
    }
  }, [phase]);

  function handlePointerDown(e, pieceId) {
    e.preventDefault();
    e.stopPropagation();
    if (orientPerm === "needs-request") requestOrient();
    const rect = containerRef.current.getBoundingClientRect();
    const startPx = e.clientX - rect.left;
    const startPy = e.clientY - rect.top;
    const startPieceX = positions[pieceId].x;
    const startPieceY = positions[pieceId].y;
    const piece = template.patternPieces.find((p) => p.id === pieceId);
    setDragging({ id: pieceId });

    function onMove(ev) {
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      const dx = px - startPx;
      const dy = py - startPy;
      const pw = piece.widthCm * pixelsPerCm;
      const ph = piece.heightCm * pixelsPerCm;
      const newX = Math.max(0, Math.min(dimensions.w - pw, startPieceX + dx));
      const newY = Math.max(0, Math.min(dimensions.h - ph, startPieceY + dy));
      setPositions((prev) => ({ ...prev, [pieceId]: { x: newX, y: newY } }));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setDragging(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  // Priority: real calibrated px/cm (from ArMeasure card calibration) →
  // longestSideCm-based fit-to-screen scale → fallback constant.
  // Calibrated mode displays pieces at true physical size when phone is
  // held at the calibration distance.
  const pixelsPerCm = calibPxPerCm
    ? calibPxPerCm
    : longestSideCm
      ? dimensions.w / longestSideCm
      : PIECE_SCALE_FALLBACK;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#283326",
        touchAction: "none",
      }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {phase === "scanning" && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(40,51,38,0.25)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 2,
              background: "rgba(144,164,128,0.85)",
              boxShadow: "0 0 16px 4px rgba(144,164,128,0.6)",
              top: `${scanPct}%`,
              transition: "top 0.05s linear",
              pointerEvents: "none",
            }}
          />
          {[
            "top-4 left-4 border-t-2 border-l-2",
            "top-4 right-4 border-t-2 border-r-2",
            "bottom-4 left-4 border-b-2 border-l-2",
            "bottom-4 right-4 border-b-2 border-r-2",
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-6 h-6 border-primary-300 ${cls}`}
              style={{ pointerEvents: "none" }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              bottom: 100,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(40,51,38,0.6)",
              backdropFilter: "blur(8px)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 20px",
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#90a480",
                display: "inline-block",
                animation: "pulse 1s infinite",
              }}
            />
            Detecting garment &amp; grain direction…
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 80,
              left: 40,
              right: 40,
              height: 3,
              background: "rgba(240,242,236,0.2)",
              borderRadius: 2,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "#90a480",
                borderRadius: 2,
                width: `${scanPct}%`,
                transition: "width 0.05s linear",
              }}
            />
          </div>
        </>
      )}

      {phase === "ready" &&
        (() => {
          // Rigid offset for AR-anchored layer (grain + pieces).
          let offX = 0;
          let offY = 0;
          if (anchorOrient && orientPerm === "granted") {
            const dGamma =
              (orientation.gamma ?? 0) - (anchorOrient.gamma ?? 0);
            const dBeta = (orientation.beta ?? 0) - (anchorOrient.beta ?? 0);
            offX = -dGamma * PX_PER_DEG;
            offY = dBeta * PX_PER_DEG;
          }
          return (
            <>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: `translate3d(${offX}px, ${offY}px, 0) scale3d(${scale}, ${scale}, 1)`,
                  transformOrigin: "center center",
                  backfaceVisibility: "hidden",
                }}
              >
                <GrainOverlay
                  w={dimensions.w}
                  h={dimensions.h}
                  angle={garmentLayout.grainAngleDeg}
                  spacing={22}
                />
                {template.patternPieces.map((piece) => (
                  <CameraPiece
                    key={piece.id}
                    piece={piece}
                    scale={pixelsPerCm}
                    pos={positions[piece.id]}
                    dragging={dragging?.id === piece.id}
                    onPointerDown={(e) => handlePointerDown(e, piece.id)}
                  />
                ))}
              </div>

              <div
                style={{
                  position: "absolute",
                  top: 70,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(40,51,38,0.55)",
                  backdropFilter: "blur(6px)",
                  color: "#dde3d5",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 14px",
                  borderRadius: 16,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                ✓ Grain detected: Vertical (Warp)
                {calibPxPerCm && (
                  <span
                    style={{
                      marginLeft: 8,
                      paddingLeft: 8,
                      borderLeft: "1px solid rgba(255,255,255,0.3)",
                      color: "#00D4FF",
                      fontFamily: "monospace",
                      fontSize: 10,
                    }}
                  >
                    {calibPxPerCm.toFixed(1)} px/cm
                  </span>
                )}
              </div>

              <div
                style={{
                  position: "absolute",
                  bottom: 110,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(40,51,38,0.55)",
                  backdropFilter: "blur(6px)",
                  color: "white",
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "5px 16px",
                  borderRadius: 16,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                Drag pieces onto your garment
              </div>
            </>
          );
        })()}

      {phase === "denied" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#283326",
            padding: 32,
          }}
        >
          <span style={{ fontSize: 48, marginBottom: 16 }}>📷</span>
          <p
            style={{
              color: "#f0f2ec",
              fontWeight: 700,
              fontSize: 16,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Camera Access Required
          </p>
          <p
            style={{
              color: "#90a480",
              fontSize: 13,
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Please allow camera access in your browser settings to use the AR
            Pattern view.
          </p>
          <button
            onClick={() => navigate("patternLayout")}
            style={{
              background: "#475840",
              color: "#f0f2ec",
              fontSize: 14,
              fontWeight: 700,
              padding: "12px 28px",
              borderRadius: 24,
              border: "none",
              cursor: "pointer",
            }}
          >
            ← Back to Layout
          </button>
        </div>
      )}

      {phase !== "denied" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "12px 16px 10px",
            background:
              "linear-gradient(to bottom, rgba(40,51,38,0.55), transparent)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            pointerEvents: phase === "scanning" ? "none" : "auto",
          }}
        >
          <button
            onClick={() => navigate("patternLayout")}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(40,51,38,0.45)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(240,242,236,0.25)",
              color: "white",
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
          <div>
            <p
              style={{
                color: "#f0f2ec",
                fontWeight: 700,
                fontSize: 14,
                margin: 0,
              }}
            >
              AR Pattern View
            </p>
            <p
              style={{
                color: "rgba(240,242,236,0.6)",
                fontSize: 11,
                margin: 0,
              }}
            >
              {template.name} · {template.patternPieces.length} pieces
            </p>
          </div>
          {phase === "ready" && (
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#90a480",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#90a480", fontSize: 11, fontWeight: 600 }}>
                LIVE
              </span>
              {scale !== 1 && (
                <button
                  onClick={resetScale}
                  style={{
                    marginLeft: 6,
                    background: "rgba(0,212,255,0.2)",
                    border: "1px solid rgba(0,212,255,0.5)",
                    borderRadius: 10,
                    padding: "2px 7px",
                    color: "#00D4FF",
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    cursor: "pointer",
                  }}
                  title="Tap to reset scale"
                >
                  {scale.toFixed(2)}×
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {phase === "ready" && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px 20px 28px",
            background:
              "linear-gradient(to top, rgba(40,51,38,0.65), transparent)",
            display: "flex",
            gap: 10,
          }}
        >
          <div
            style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}
          >
            {template.patternPieces.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "rgba(240,242,236,0.15)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(240,242,236,0.35)",
                  borderRadius: 8,
                  padding: "3px 8px",
                  color: "white",
                  fontSize: 9,
                  fontFamily: "monospace",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {p.label.replace(" Panel ", "\n").replace(" Strip", "\n Strip")}
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("stepGuide")}
            style={{
              background: "#475840",
              color: "#f0f2ec",
              fontSize: 13,
              fontWeight: 700,
              padding: "10px 20px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Start Cutting →
          </button>
        </div>
      )}
    </div>
  );
}
