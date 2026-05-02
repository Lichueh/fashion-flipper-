import { useState, useRef, useEffect } from "react";
import useDeviceOrientation from "../hooks/useDeviceOrientation";
import usePinchScale from "../hooks/usePinchScale";

// Fallback px→cm rate when user skips calibration. After calibration the
// real ratio (derived from the reference card edge) replaces this.
const DEFAULT_PX_PER_CM = 5.6;
const MIN_DRAG_PX = 60;
// Small-angle approximation: 1° of phone rotation ≈ this many pixels of
// scene shift on a typical phone screen.
const PX_PER_DEG = 6;
// ISO/IEC 7810 ID-1 long edge — credit card, 健保卡, 身分證 all match.
const REFERENCE_OBJECT_CM = 8.56;

function jitter(amount) {
  return (Math.random() - 0.5) * 2 * amount;
}

function lineGeom(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { cx: (p1.x + p2.x) / 2, cy: (p1.y + p2.y) / 2, len, angle };
}

export default function ArMeasureScreen({ navigate }) {
  // Two-phase flow: first calibrate against a known reference object,
  // then measure the garment using the calibrated scale.
  const [step, setStep] = useState("calibrate"); // calibrate | measure
  const [phase, setPhase] = useState("loading"); // loading | ready | drawing | done | denied
  const [calibPxPerCm, setCalibPxPerCm] = useState(null);
  const [startPt, setStartPt] = useState(null);
  const [endPt, setEndPt] = useState(null);
  const [measurementCm, setMeasurementCm] = useState(null);
  const [anchorOrient, setAnchorOrient] = useState(null);

  const videoRef = useRef();
  const containerRef = useRef();
  const streamRef = useRef();

  const {
    orientation,
    permission: orientPerm,
    requestPermission: requestOrient,
  } = useDeviceOrientation();
  // Async listeners need fresh orientation at pointerup, not stale closure.
  const orientationRef = useRef(orientation);
  orientationRef.current = orientation;
  const { scale, reset: resetScale } = usePinchScale(containerRef, {
    enabled: phase === "done",
  });

  const activePxPerCm = calibPxPerCm ?? DEFAULT_PX_PER_CM;
  const isCalibrating = step === "calibrate";

  useEffect(() => {
    let cancelled = false;
    async function start() {
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
        setPhase("ready");
      } catch {
        if (!cancelled) setPhase("denied");
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function pointerPos(e) {
    const rect = containerRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function isOnInteractive(target) {
    return !!target.closest?.("button");
  }

  function handlePointerDown(e) {
    if (isOnInteractive(e.target)) return;
    if (phase !== "ready" && phase !== "done") return;
    if (orientPerm === "needs-request") requestOrient();
    e.preventDefault();

    const startP = pointerPos(e);
    setStartPt(startP);
    setEndPt(startP);
    setMeasurementCm(null);
    setAnchorOrient(null);
    setPhase("drawing");

    function onMove(ev) {
      setEndPt(pointerPos(ev));
    }
    function onUp(ev) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);

      const p = pointerPos(ev);
      const dx = p.x - startP.x;
      const dy = p.y - startP.y;
      const px = Math.sqrt(dx * dx + dy * dy);
      if (px < MIN_DRAG_PX) {
        setStartPt(null);
        setEndPt(null);
        setPhase("ready");
        return;
      }
      setEndPt(p);
      if (isCalibrating) {
        setMeasurementCm(REFERENCE_OBJECT_CM);
      } else {
        const cm = Math.max(20, Math.min(180, px / activePxPerCm + jitter(0.7)));
        setMeasurementCm(cm);
      }
      setAnchorOrient({ ...orientationRef.current });
      if (typeof navigator.vibrate === "function") navigator.vibrate(15);
      setPhase("done");
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function clearMarks() {
    setStartPt(null);
    setEndPt(null);
    setMeasurementCm(null);
    setAnchorOrient(null);
    resetScale();
    setPhase("ready");
  }

  function continueToMeasure() {
    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const px = Math.sqrt(dx * dx + dy * dy);
    setCalibPxPerCm(px / REFERENCE_OBJECT_CM);
    setStep("measure");
    clearMarks();
  }

  function recalibrate() {
    setStep("calibrate");
    setCalibPxPerCm(null);
    clearMarks();
  }

  function skipCalibration() {
    setStep("measure");
    clearMarks();
  }

  function confirmMeasurement() {
    if (measurementCm == null) return;
    navigate("analysis", {
      longestSideCm: parseFloat(measurementCm.toFixed(1)),
      calibPxPerCm,
    });
  }

  // Live distance during drawing (only meaningful in measure step).
  let liveCm = null;
  if (phase === "drawing" && startPt && endPt) {
    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const px = Math.sqrt(dx * dx + dy * dy);
    liveCm = isCalibrating ? REFERENCE_OBJECT_CM : px / activePxPerCm;
  }

  // Rigid-body rotation compensation in done phase only — applied to the
  // entire AR layer via wrapper transform so coordinates inside stay clean.
  let offX = 0;
  let offY = 0;
  if (phase === "done" && anchorOrient && orientPerm === "granted") {
    const dGamma = (orientation.gamma ?? 0) - (anchorOrient.gamma ?? 0);
    const dBeta = (orientation.beta ?? 0) - (anchorOrient.beta ?? 0);
    offX = -dGamma * PX_PER_DEG;
    offY = dBeta * PX_PER_DEG;
  }

  const showLine = (phase === "drawing" || phase === "done") && startPt && endPt;
  const lp = showLine ? lineGeom(startPt, endPt) : null;
  const isFinal = phase === "done" && measurementCm != null;

  // Color palette — cyan during calibration, yellow during measurement,
  // distinguishing the two flows visually.
  const accent = isCalibrating ? "#00D4FF" : "#FFCC00";
  const accentRgba = isCalibrating
    ? "rgba(0,212,255,0.95)"
    : "rgba(255,204,0,0.95)";

  const stopProp = { onPointerDown: (e) => e.stopPropagation() };

  // Top-bar subtitle
  let subtitle = "";
  if (phase === "loading") subtitle = "Starting camera…";
  else if (isCalibrating) {
    if (phase === "ready")
      subtitle = "Step 1 of 2 · Drag along a credit / ID card long edge";
    else if (phase === "drawing")
      subtitle = "Release when aligned with the card edge";
    else if (phase === "done") subtitle = "Tap Continue to start measuring";
  } else {
    if (phase === "ready") subtitle = "Step 2 of 2 · Drag across the garment";
    else if (phase === "drawing") subtitle = "Release to measure";
    else if (phase === "done") subtitle = "Tap Done to use this measurement";
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#1a1a1a",
        touchAction: "none",
        cursor: phase === "ready" || phase === "done" ? "crosshair" : "default",
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

      {phase !== "denied" && phase !== "loading" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.4))",
            pointerEvents: "none",
          }}
        />
      )}

      {phase === "ready" &&
        [
          { top: 80, left: 30, t: true, l: true },
          { top: 80, right: 30, t: true, r: true },
          { bottom: 130, left: 30, b: true, l: true },
          { bottom: 130, right: 30, b: true, r: true },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: c.top,
              bottom: c.bottom,
              left: c.left,
              right: c.right,
              width: 24,
              height: 24,
              borderTop: c.t ? "2px solid rgba(255,255,255,0.65)" : "none",
              borderBottom: c.b ? "2px solid rgba(255,255,255,0.65)" : "none",
              borderLeft: c.l ? "2px solid rgba(255,255,255,0.65)" : "none",
              borderRight: c.r ? "2px solid rgba(255,255,255,0.65)" : "none",
              pointerEvents: "none",
            }}
          />
        ))}

      {/* AR-anchored layer (line + endpoints + chip).
          Wrapped so gyroscope translate + pinch scale apply uniformly. */}
      {showLine && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translate3d(${offX}px, ${offY}px, 0) scale3d(${scale}, ${scale}, 1)`,
            transformOrigin: "center center",
            pointerEvents: "none",
            backfaceVisibility: "hidden",
          }}
        >
          {lp && (
            <div
              style={{
                position: "absolute",
                left: lp.cx - lp.len / 2,
                top: lp.cy - 1.5,
                width: lp.len,
                height: 3,
                ...(isFinal
                  ? { background: accentRgba }
                  : {
                      background: "transparent",
                      borderTop: `2px dashed ${accentRgba}`,
                      height: 2,
                    }),
                transform: `rotate(${lp.angle}deg)`,
                transformOrigin: "center",
                boxShadow: isFinal ? "0 0 6px rgba(0,0,0,0.5)" : "none",
              }}
            />
          )}

          {[startPt, endPt].map((p, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.x - 9,
                top: p.y - 9,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "white",
                border: `2px solid ${accentRgba}`,
                boxShadow: "0 0 6px rgba(0,0,0,0.6)",
              }}
            />
          ))}

          {lp && (
            <div
              style={{
                position: "absolute",
                left: lp.cx,
                top: lp.cy,
                transform: "translate(-50%, calc(-50% - 24px))",
                ...(isFinal
                  ? {
                      background: "white",
                      color: "#1a1a1a",
                      fontSize: 14,
                      fontWeight: 700,
                      padding: "5px 12px",
                      borderRadius: 14,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
                      fontFamily: "monospace",
                    }
                  : {
                      // No backdrop-filter — flickers inside transform parent
                      // on iOS Safari during pinch.
                      background: "rgba(0,0,0,0.78)",
                      color: "white",
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.25)",
                    }),
                whiteSpace: "nowrap",
              }}
            >
              {isFinal
                ? `${measurementCm.toFixed(2)} cm`
                : `${liveCm?.toFixed(2) ?? "0.00"} cm`}
            </div>
          )}
        </div>
      )}

      {phase === "ready" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            padding: "12px 18px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.2)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            textAlign: "center",
            maxWidth: "85%",
          }}
        >
          {isCalibrating ? (
            <>
              💳 Place a credit / ID card in frame
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.75,
                  marginTop: 3,
                  fontWeight: 500,
                  whiteSpace: "normal",
                }}
              >
                Drag along its long edge ({REFERENCE_OBJECT_CM} cm)
              </div>
            </>
          ) : (
            <>
              ✋ Drag across the garment
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.75,
                  marginTop: 3,
                  fontWeight: 500,
                  whiteSpace: "normal",
                }}
              >
                from one end to the other
              </div>
            </>
          )}
        </div>
      )}

      {phase !== "denied" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "12px 16px 14px",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            pointerEvents: phase === "drawing" ? "none" : "auto",
          }}
        >
          <button
            {...stopProp}
            onClick={() => navigate("upload")}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.25)",
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                margin: 0,
              }}
            >
              {isCalibrating ? "Calibrate" : "Measure Garment"}
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 11,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </p>
          </div>
          {!isCalibrating && calibPxPerCm != null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(0,212,255,0.15)",
                border: "1px solid rgba(0,212,255,0.4)",
                borderRadius: 10,
                padding: "3px 8px",
              }}
            >
              <span
                style={{
                  color: "#00D4FF",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "monospace",
                }}
              >
                ✓ {calibPxPerCm.toFixed(1)} px/cm
              </span>
            </div>
          )}
          {scale !== 1 && phase === "done" && (
            <button
              {...stopProp}
              onClick={resetScale}
              style={{
                background: "rgba(0,212,255,0.2)",
                border: "1px solid rgba(0,212,255,0.5)",
                borderRadius: 10,
                padding: "3px 8px",
                color: "#00D4FF",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "monospace",
                cursor: "pointer",
                flexShrink: 0,
              }}
              title="Tap to reset scale"
            >
              {scale.toFixed(2)}×
            </button>
          )}
        </div>
      )}

      {phase === "denied" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#1a1a1a",
            padding: 32,
          }}
        >
          <span style={{ fontSize: 48, marginBottom: 16 }}>📷</span>
          <p
            style={{
              color: "white",
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
              color: "rgba(255,255,255,0.6)",
              fontSize: 13,
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Allow camera access to measure your garment with AR.
          </p>
          <button
            onClick={() => navigate("upload")}
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
            ← Back
          </button>
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px 20px 24px",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            pointerEvents: phase === "drawing" ? "none" : "auto",
            opacity: phase === "drawing" ? 0.4 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {/* Left button: Skip / Recalibrate / Reset */}
          {isCalibrating && phase === "ready" ? (
            <button
              {...stopProp}
              onClick={skipCalibration}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontWeight: 500,
                padding: "10px 14px",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Skip
            </button>
          ) : !isCalibrating && phase === "ready" ? (
            <button
              {...stopProp}
              onClick={recalibrate}
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "rgba(255,255,255,0.9)",
                fontSize: 12,
                fontWeight: 600,
                padding: "9px 16px",
                borderRadius: 22,
                cursor: "pointer",
              }}
            >
              ↻ Recalibrate
            </button>
          ) : (
            <button
              {...stopProp}
              onClick={clearMarks}
              disabled={phase !== "done"}
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: phase === "done" ? "white" : "rgba(255,255,255,0.3)",
                fontSize: 13,
                fontWeight: 600,
                padding: "10px 20px",
                borderRadius: 22,
                cursor: phase === "done" ? "pointer" : "not-allowed",
                minWidth: 90,
              }}
            >
              Reset
            </button>
          )}

          {/* Right button: Continue / Done */}
          {isCalibrating ? (
            <button
              {...stopProp}
              onClick={continueToMeasure}
              disabled={phase !== "done"}
              style={{
                background:
                  phase === "done" ? accent : "rgba(255,255,255,0.1)",
                border: "none",
                color: phase === "done" ? "#0a2030" : "rgba(255,255,255,0.3)",
                fontSize: 14,
                fontWeight: 700,
                padding: "10px 24px",
                borderRadius: 22,
                cursor: phase === "done" ? "pointer" : "not-allowed",
                minWidth: 110,
                boxShadow:
                  phase === "done" ? `0 4px 12px ${accentRgba}` : "none",
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              {...stopProp}
              onClick={confirmMeasurement}
              disabled={phase !== "done"}
              style={{
                background:
                  phase === "done" ? accent : "rgba(255,255,255,0.1)",
                border: "none",
                color: phase === "done" ? "#1a1a1a" : "rgba(255,255,255,0.3)",
                fontSize: 14,
                fontWeight: 700,
                padding: "10px 24px",
                borderRadius: 22,
                cursor: phase === "done" ? "pointer" : "not-allowed",
                minWidth: 90,
                boxShadow:
                  phase === "done" ? `0 4px 12px ${accentRgba}` : "none",
              }}
            >
              Done →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
