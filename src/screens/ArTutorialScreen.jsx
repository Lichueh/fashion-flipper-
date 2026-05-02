import { useState, useRef, useEffect } from "react";
import useDeviceOrientation from "../hooks/useDeviceOrientation";
import usePinchScale from "../hooks/usePinchScale";
import { arTutorials } from "../data/arTutorials";
import {
  CutSleeveOverlay,
  FringeMarksOverlay,
  KnotPairsOverlay,
  NumberedCalloutOverlay,
} from "../components/ArOverlays";

const PX_PER_DEG = 6;
const DEFAULT_FALLBACK_PX_PER_CM = 5.6;

export default function ArTutorialScreen({
  navigate,
  template,
  calibPxPerCm,
  from = "templateSelect",
}) {
  const tutorial = arTutorials[template];
  const backTarget = tutorial?.backTarget ?? from;

  const [phase, setPhase] = useState("loading"); // loading | ready | denied
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [anchorOrient, setAnchorOrient] = useState(null);
  const [overlayOffsets, setOverlayOffsets] = useState({}); // { [stepId]: {...} }
  const [completedPairs, setCompletedPairs] = useState(new Set());
  const [dimensions, setDimensions] = useState({ w: 390, h: 700 });

  const videoRef = useRef();
  const containerRef = useRef();
  const streamRef = useRef();

  const { orientation, permission: orientPerm, requestPermission: requestOrient } =
    useDeviceOrientation();
  const { scale, reset: resetScale } = usePinchScale(containerRef, {
    enabled: phase === "ready",
  });

  // Reset scale when stepping forward / back so each step starts at 1×.
  useEffect(() => {
    resetScale();
  }, [currentStepIdx, resetScale]);

  const pxPerCm =
    calibPxPerCm ??
    tutorial?.fallbackPxPerCm ??
    DEFAULT_FALLBACK_PX_PER_CM;
  const isApproximate = calibPxPerCm == null;

  // Camera startup — adapted from ArMeasureScreen.jsx:50–80
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

  // Track container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setDimensions({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-snapshot anchor on each step entry (each step framed independently).
  // Step 3 is hands-off — phone is on the table, gyro tracking is meaningless,
  // so freeze the anchor to disable compensation.
  // Gated on orientPerm === "granted" so we don't snapshot {0,0,0} before
  // iOS permission resolves and then drift on the first real reading.
  useEffect(() => {
    if (phase !== "ready") return;
    const step = tutorial?.steps[currentStepIdx];
    if (step?.overlay?.handsOffMode) {
      setAnchorOrient(null);
      return;
    }
    if (orientPerm !== "granted") {
      setAnchorOrient(null);
      return;
    }
    setAnchorOrient({ ...orientation });
    // orientation deliberately excluded from deps — we want one snapshot per
    // step entry, not continuous re-anchoring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIdx, phase, orientPerm]);

  // Fail-safe: invalid template id
  if (!tutorial) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          background: "#1a1a1a",
        }}
      >
        <p style={{ color: "white", marginBottom: 16 }}>
          No AR tutorial defined for "{template}".
        </p>
        <button
          onClick={() => navigate(backTarget)}
          style={{
            background: "#475840",
            color: "#f0f2ec",
            border: "none",
            padding: "12px 28px",
            borderRadius: 24,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Back to Templates
        </button>
      </div>
    );
  }

  const step = tutorial.steps[currentStepIdx];
  const isFirst = currentStepIdx === 0;
  const isLast = currentStepIdx === tutorial.steps.length - 1;

  // Rigid-body offset — adapted from CameraPatternScreen rigid wrapper logic.
  let offX = 0;
  let offY = 0;
  if (anchorOrient && orientPerm === "granted") {
    const dGamma = (orientation.gamma ?? 0) - (anchorOrient.gamma ?? 0);
    const dBeta = (orientation.beta ?? 0) - (anchorOrient.beta ?? 0);
    offX = -dGamma * PX_PER_DEG;
    offY = dBeta * PX_PER_DEG;
  }

  function setStepOffset(stepId, offset) {
    setOverlayOffsets((prev) => ({ ...prev, [stepId]: offset }));
  }

  function handleNext() {
    if (orientPerm === "needs-request") requestOrient();
    if (isLast) {
      const doneTarget = tutorial?.doneTarget ?? backTarget;
      navigate(doneTarget, doneTarget === "result" ? { template } : {});
    } else {
      setCurrentStepIdx((i) => i + 1);
    }
  }

  function handlePrev() {
    if (isFirst) {
      navigate(backTarget);
    } else {
      setCurrentStepIdx((i) => i - 1);
    }
  }

  function togglePair(k) {
    setCompletedPairs((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function markAllPairsDone() {
    const fringe =
      tutorial.steps.find((s) => s.id === step.overlay?.inheritFrom)?.overlay;
    const numPairs = fringe ? Math.floor(fringe.count / 2) : 0;
    setCompletedPairs(new Set(Array.from({ length: numPairs }, (_, i) => i)));
  }

  // Find inherited overlay (step 3 → step 2)
  const inheritedStep = step.overlay?.inheritFrom
    ? tutorial.steps.find((s) => s.id === step.overlay.inheritFrom)
    : null;
  const inheritedOffset = inheritedStep
    ? overlayOffsets[inheritedStep.id]
    : null;

  // Step 3 next-button gating: at least 1 pair OR all pairs done is fine
  const canAdvanceStep3 =
    step.overlay?.handsOffMode ? completedPairs.size >= 1 : true;

  // Permission denied splash — adapted from ArMeasureScreen.jsx:520–571
  if (phase === "denied") {
    return (
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
          Allow camera access to see the AR cutting guide on your garment.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
          <button
            onClick={() => navigate(backTarget)}
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
          {backTarget === "templateSelect" && (
            <button
              onClick={() => navigate("stepGuide", { template })}
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                padding: "10px 22px",
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.25)",
                cursor: "pointer",
              }}
            >
              📖 View text steps instead
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#1a1a1a",
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

      {phase === "ready" && (
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

      {/* AR-anchored overlay layer */}
      {phase === "ready" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translate3d(${offX}px, ${offY}px, 0) scale3d(${scale}, ${scale}, 1)`,
            transformOrigin: "center center",
            backfaceVisibility: "hidden",
          }}
        >
          {step.overlayType === "cut-line-pair" && (
            <CutSleeveOverlay
              dimensions={dimensions}
              pxPerCm={pxPerCm}
              overlay={step.overlay}
              dragOffset={overlayOffsets[step.id]}
              onDrag={(o) => setStepOffset(step.id, o)}
            />
          )}
          {step.overlayType === "fringe-marks" && (
            <FringeMarksOverlay
              dimensions={dimensions}
              pxPerCm={pxPerCm}
              overlay={step.overlay}
              dragOffset={overlayOffsets[step.id]}
              onDrag={(o) => setStepOffset(step.id, o)}
            />
          )}
          {step.overlayType === "numbered-callouts" && (
            <NumberedCalloutOverlay
              dimensions={dimensions}
              overlay={step.overlay}
              dragOffset={overlayOffsets[step.id]}
              onDrag={(o) => setStepOffset(step.id, o)}
            />
          )}
          {step.overlayType === "knot-pairs" && inheritedStep && (
            <KnotPairsOverlay
              dimensions={dimensions}
              pxPerCm={pxPerCm}
              overlay={step.overlay}
              inheritedOverlay={inheritedStep.overlay}
              inheritedDragOffset={inheritedOffset}
              onTranslateInherited={(o) =>
                setStepOffset(inheritedStep.id, o)
              }
              completedPairs={completedPairs}
              onTogglePair={togglePair}
            />
          )}
        </div>
      )}

      {/* Top header */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "12px 16px 14px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate(backTarget)}
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
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "white", fontWeight: 700, fontSize: 14, margin: 0 }}>
            Step {currentStepIdx + 1} of {tutorial.steps.length} ·{" "}
            {step.title}
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
            {step.instruction}
          </p>
        </div>
        {isApproximate && phase === "ready" && (
          <button
            onClick={() => navigate("arMeasure")}
            style={{
              background: "rgba(255,200,100,0.2)",
              border: "1px solid rgba(255,200,100,0.5)",
              borderRadius: 10,
              padding: "3px 8px",
              color: "#ffc864",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "monospace",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Approximate sizing — tap to calibrate"
          >
            ⚠ Approx
          </button>
        )}
        {scale !== 1 && phase === "ready" && (
          <button
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

      {/* Hands-off banner for step 3 */}
      {step.overlay?.handsOffMode && phase === "ready" && (
        <div
          style={{
            position: "absolute",
            top: 76,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(40,51,38,0.85)",
            backdropFilter: "blur(6px)",
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            padding: "8px 16px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.2)",
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 10,
            maxWidth: "90%",
          }}
        >
          🖐 🖐 Set phone on a flat surface — both hands free for tying
        </div>
      )}

      {/* Tip footer */}
      {phase === "ready" && step.tip && (
        <div
          style={{
            position: "absolute",
            bottom: 110,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            color: "rgba(255,255,255,0.9)",
            fontSize: 11,
            fontWeight: 500,
            padding: "6px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.15)",
            maxWidth: "85%",
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          💡 {step.tip}
        </div>
      )}

      {/* Bottom controls */}
      {phase === "ready" && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px 20px 24px",
            background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            zIndex: 10,
          }}
        >
          <button
            onClick={handlePrev}
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 20px",
              borderRadius: 22,
              cursor: "pointer",
              minWidth: 90,
            }}
          >
            {isFirst ? "← Cancel" : "← Previous"}
          </button>

          {/* Step 3 escape hatch */}
          {step.overlay?.handsOffMode && completedPairs.size === 0 && (
            <button
              onClick={markAllPairsDone}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                fontSize: 11,
                fontWeight: 500,
                padding: "6px 10px",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Mark all done
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={!canAdvanceStep3}
            style={{
              background: canAdvanceStep3 ? "#FFCC00" : "rgba(255,255,255,0.1)",
              border: "none",
              color: canAdvanceStep3 ? "#1a1a1a" : "rgba(255,255,255,0.3)",
              fontSize: 14,
              fontWeight: 700,
              padding: "10px 24px",
              borderRadius: 22,
              cursor: canAdvanceStep3 ? "pointer" : "not-allowed",
              minWidth: 90,
              boxShadow: canAdvanceStep3
                ? "0 4px 12px rgba(255,204,0,0.3)"
                : "none",
            }}
          >
            {isLast ? "Done →" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}
