import { useState, useEffect } from "react";
import { mockAnalysis } from "../data/mockAnalysis";
import { useAnalysisPipeline } from "../hooks/useAnalysisPipeline";

export default function AnalysisScreen({
  navigate,
  uploadedImage,
  uploadedFile,
  longestSideCm,
}) {
  const {
    status,
    progress: pipelineProgress,
    needsManualInput,
    needsScaleInput,
    segmentation,
    measurements,
    feasibleTemplates,
    run,
    submitLongestSide,
    retry,
  } = useAnalysisPipeline();

  // Kick off the pipeline as soon as the file is available.
  // longestSideCm is passed directly so the hook can skip the
  // awaiting_scale pause and proceed straight to measurement.
  useEffect(() => {
    if (uploadedFile) run(uploadedFile, longestSideCm);
  }, [uploadedFile]);

  const [phase, setPhase] = useState("scanning");

  // Transition to results when pipeline finishes (not on a timer)
  useEffect(() => {
    if (status === "done" || status === "error") {
      setPhase("result");
    }
  }, [status]);

  // ─── SCANNING PHASE ─────────────────────────────────────────────
  if (phase === "scanning") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-primary-900 px-6">
        {/* DEV: remove before shipping */}
        <div
          style={{
            width: "100%",
            background: "#1e1e1e",
            color: "#d4d4d4",
            padding: "10px 12px",
            marginBottom: 12,
            borderRadius: 8,
            fontFamily: "monospace",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) run(f);
              }}
              style={{ color: "#d4d4d4", fontSize: 12 }}
            />
            <span style={{ fontWeight: "bold", fontSize: 13 }}>{status}</span>
            <button
              onClick={retry}
              style={{
                marginLeft: "auto",
                padding: "2px 10px",
                fontSize: 12,
                cursor: "pointer",
                borderRadius: 4,
                border: "1px solid #555",
                background: "#333",
                color: "#eee",
              }}
            >
              Retry
            </button>
          </div>
          <pre
            style={{
              fontSize: 11,
              overflow: "auto",
              maxHeight: 400,
              margin: 0,
            }}
          >
            {JSON.stringify(
              {
                status,
                progress: pipelineProgress,
                needsManualInput,
                needsScaleInput,
                feasibleTemplates,
              },
              null,
              2,
            )}
          </pre>
        </div>
        {/* END DEV */}
        <div className="relative w-60 h-60 rounded-3xl overflow-hidden mb-8">
          {uploadedImage ? (
            <img
              src={uploadedImage}
              alt="analyzing"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary-800 flex items-center justify-center text-7xl">
              👗
            </div>
          )}
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(168,191,153,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(168,191,153,0.1) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          <div
            className="scan-line bg-secondary-300"
            style={{ boxShadow: "0 0 14px 2px rgba(201,185,122,0.7)" }}
          />
          {[
            "top-2 left-2 border-t-2 border-l-2",
            "top-2 right-2 border-t-2 border-r-2",
            "bottom-2 left-2 border-b-2 border-l-2",
            "bottom-2 right-2 border-b-2 border-r-2",
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-4 h-4 border-secondary-300 ${cls}`}
            />
          ))}
        </div>

        <p className="text-primary-200 font-mono text-xs tracking-[0.2em] mb-1.5 uppercase">
          Analyzing Fabric
        </p>
        <p className="text-primary-200 text-sm text-center leading-6 mb-6">
          AI is identifying fabric material, color, and condition…
        </p>
        <div className="w-48 h-1 bg-primary-800 rounded-full overflow-hidden mb-4">
          <div
            className="w-[95%] h-full bg-secondary-300 rounded-full origin-left will-change-transform"
            style={{
              animation:
                "progressGrow 30s cubic-bezier(0.15, 0.8, 0.3, 1) forwards",
            }}
          />
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-primary-300 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── RESULTS PHASE ───────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-primary-800">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-4">
        <button
          onClick={() => navigate("upload")}
          className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3"
        >
          ←
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-primary-100">
            AI Analysis Results
          </h2>
        </div>
        <span className="bg-secondary-300 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          ✓ Analysis Complete
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
        {/* Fabric type card */}
        <div className="bg-primary-100 rounded-3xl p-4 border border-primary-200 fade-in">
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-primary-200">
              {uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt="cloth"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary-200 flex items-center justify-center text-3xl">
                  👗
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-primary-500 mb-0.5 font-medium uppercase tracking-wider">
                Detected Material
              </p>
              <p className="text-xl font-bold text-primary-900">
                {mockAnalysis.fabric.type}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {mockAnalysis.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-primary-200 text-primary-800 text-[11px] px-2 py-0.5 rounded-full font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fabric details */}
        <div className="bg-primary-100 rounded-3xl p-4 border border-primary-200 fade-in">
          <p className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-3">
            Fabric Properties
          </p>
          <div className="space-y-2.5">
            {[
              {
                label: "Composition",
                value: mockAnalysis.fabric.composition
                  .map((c) => `${c.material} ${c.percentage}%`)
                  .join(" · "),
              },
              { label: "Color", value: mockAnalysis.fabric.color },
              { label: "Condition", value: mockAnalysis.fabric.condition },
              { label: "Weight", value: mockAnalysis.fabric.weight },
              { label: "Weave", value: mockAnalysis.fabric.texture },
              { label: "Color", value: mockAnalysis.fabric.color },
              { label: "Condition", value: mockAnalysis.fabric.condition },
              { label: "Weight", value: mockAnalysis.fabric.weight },
              { label: "Weave", value: mockAnalysis.fabric.texture },
              {
                label: "Grain Direction",
                value:
                  mockAnalysis.garmentLayout.grainAngleDeg === 90
                    ? "Vertical (Warp)"
                    : mockAnalysis.garmentLayout.grainAngleDeg === 0
                      ? "Horizontal (Weft)"
                      : `Bias (${mockAnalysis.garmentLayout.grainAngleDeg}°)`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center"
              >
                <span className="text-primary-500 text-sm">{item.label}</span>
                <span className="text-primary-900 text-sm font-medium">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="fade-in">
          <p className="text-[11px] font-semibold text-primary-100 uppercase tracking-wider mb-3 px-1">
            AI Upcycling Recommendations
          </p>
          {(feasibleTemplates ?? mockAnalysis.recommendations).map(
            (rec, idx) => {
              // rec comes from feasibleTemplates (pipeline) or mockAnalysis (fallback)
              const isFeasible = rec.feasible ?? true;
              const score =
                rec.feasible !== undefined
                  ? Math.round((rec.fitScore ?? 0) * 100)
                  : rec.matchScore;
              const name = rec.name;
              const reason =
                rec.feasible !== undefined
                  ? isFeasible
                    ? `Fits your garment — uses ${Math.round(rec.usedAreaPct)}% of available fabric`
                    : rec.failReason === "area"
                      ? "Not enough fabric area for this pattern"
                      : "Some pieces are too large to fit on your garment panels"
                  : rec.reason;

              return (
                <div
                  key={rec.id}
                  className={`bg-primary-100 rounded-3xl p-4 mb-3 border ${isFeasible ? "border-primary-200" : "border-secondary-200 opacity-70"}`}
                >
                  {idx === 0 && isFeasible && (
                    <span className="inline-block bg-secondary-200 text-secondary-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-2">
                      ✨ Top Pick
                    </span>
                  )}
                  {!isFeasible && (
                    <span className="inline-block bg-red-100 text-red-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-2">
                      ✕ Not feasible
                    </span>
                  )}
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="font-semibold text-primary-900">{name}</p>
                    <span
                      className={`text-sm font-bold ${isFeasible ? "text-primary-700" : "text-red-500"}`}
                    >
                      {score}%
                    </span>
                  </div>
                  <div className="h-2 bg-primary-200 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isFeasible ? "bg-primary-500" : "bg-red-400"}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <p className="text-primary-600 text-xs leading-4">{reason}</p>
                </div>
              );
            },
          )}
        </div>

        <button
          onClick={() =>
            navigate("templateSelect", { measurements, segmentation })
          }
          className="w-full bg-secondary-300 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-md shadow-black/20"
        >
          Choose Direction →
        </button>
      </div>
    </div>
  );
}
