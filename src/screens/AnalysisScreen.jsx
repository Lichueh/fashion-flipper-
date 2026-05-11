import { useState, useEffect, useRef } from "react";
import { mockAnalysis } from "../data/mockAnalysis";
import { useAnalysisPipeline } from "../hooks/useAnalysisPipeline";
import { useLang } from "../i18n/LanguageContext";

export default function AnalysisScreen({
  navigate,
  uploadedImage,
  uploadedFile,
  lengthGarment,
  hasLayers,
  scaleCmPerImagePx,
  imageWidth,
}) {
  const { t, tl } = useLang();
  const {
    status,
    progress: pipelineProgress,
    needsManualInput,
    needsScaleInput,
    segmentation,
    measurements,
    feasibleTemplates,
    fabric,
    run,
    submitGarmentLength,
    retry,
  } = useAnalysisPipeline();

  // Kick off the pipeline as soon as the file is available.
  // lengthGarment is passed directly so the hook can skip the
  // awaiting_scale pause and proceed straight to measurement.
  const hasRun = useRef(false);

  useEffect(() => {
    if (!uploadedFile || hasRun.current) return;
    hasRun.current = true;
    const rulerScale =
      scaleCmPerImagePx > 0 && imageWidth > 0
        ? { scaleCmPerImagePx, imageWidth }
        : null;
    run(uploadedFile, lengthGarment, hasLayers, rulerScale);
  }, [uploadedFile]);

  const [phase, setPhase] = useState("scanning");

  useEffect(() => {
    if (status === "done" || status === "error") {
      setPhase("result");
    }
  }, [status]);

  // ─── SCANNING PHASE ─────────────────────────────────────────────
  if (phase === "scanning") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-primary-900 px-6">
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
          {t("analysis.analyzingFabric")}
        </p>
        <p className="text-primary-200 text-sm text-center leading-6 mb-6">
          {t("analysis.analyzingBody")}
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
  const grainAngle = mockAnalysis.garmentLayout.grainAngleDeg;
  const grainText =
    grainAngle === 90
      ? t("analysis.grainVertical")
      : grainAngle === 0
        ? t("analysis.grainHorizontal")
        : t("analysis.grainBias", { deg: grainAngle });

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
            {t("analysis.title")}
          </h2>
        </div>
        <span className="bg-secondary-300 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          {t("analysis.complete")}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-0 pb-4 space-y-4">
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
                {t("analysis.detectedMaterial")}
              </p>
              <p className="text-xl font-bold text-primary-900">
                {tl(fabric.type)}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(fabric.tags ?? mockAnalysis.tags).map((tag, i) => (
                  <span
                    key={i}
                    className="bg-primary-200 text-primary-800 text-[11px] px-2 py-0.5 rounded-full font-medium"
                  >
                    {tl(tag)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fabric details */}
        <div className="bg-primary-100 rounded-3xl p-4 border border-primary-200 fade-in">
          <p className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-3">
            {t("analysis.fabricProperties")}
          </p>
          <div className="space-y-2.5">
            {[
              {
                label: t("analysis.composition"),
                value: fabric.composition
                  .map((c) => `${tl(c.material)} ${c.percentage}%`)
                  .join(" · "),
              },
              { label: t("analysis.color"), value: tl(fabric.color) },
              { label: t("analysis.condition"), value: tl(fabric.condition) },
              { label: t("analysis.weight"), value: tl(fabric.weight) },
              { label: t("analysis.weave"), value: tl(fabric.texture) },
              { label: t("analysis.grainDirection"), value: grainText },
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
      </div>

      {/* Pinned CTA */}
      <div className="px-5 pb-6 pt-3 bg-primary-800">
        <button
          onClick={() =>
            navigate("templateSelect", {
              measurements,
              segmentation,
              feasibleTemplates,
              fabric,
            })
          }
          className="w-full bg-secondary-300 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-md shadow-black/20"
        >
          {t("analysis.chooseDirection")}
        </button>
      </div>
    </div>
  );
}
