import { useState, useEffect, useRef } from "react";
import { mockAnalysis } from "../data/mockAnalysis";
import { useAnalysisPipeline } from "../hooks/useAnalysisPipeline";
import { useLang } from "../i18n/LanguageContext";
import ManualFabricForm from "../components/ManualFabricForm";
import { useAuth } from "../context/AuthContext";
import useFabrics from "../hooks/useFabrics";
import { supabase } from "../utils/supabase";

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
  const { user } = useAuth();
  const { addFabric } = useFabrics(user?.id, { fetch: false });
  const [savedToCloset, setSavedToCloset] = useState(false);
  const savingRef = useRef(false);
  const {
    status,
    progress: pipelineProgress,
    needsManualInput,
    needsScaleInput,
    segmentation,
    measurements,
    feasibleTemplates,
    fabric,
    fabricFailed,
    segmentationFailed,
    run,
    submitGarmentLength,
    setManualFabric,
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
  const [isEditingFabric, setIsEditingFabric] = useState(false);

  useEffect(() => {
    if (status === "done" || status === "error") {
      const failed = status === "error" || fabricFailed || segmentationFailed;
      setPhase(failed ? "failed" : "result");
    }
  }, [status, fabricFailed, segmentationFailed]);

  const handleRetry = () => {
    retry();
    setPhase("scanning");
    const rulerScale =
      scaleCmPerImagePx > 0 && imageWidth > 0
        ? { scaleCmPerImagePx, imageWidth }
        : null;
    run(uploadedFile, lengthGarment, hasLayers, rulerScale);
  };

  const handleFabricEdited = () => {
    setIsEditingFabric(false);
  };

  // Computed early so it's available to the editing-phase early return below.
  const displayFabric = fabric ?? mockAnalysis.fabric;

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

  // ─── FAILED PHASE ────────────────────────────────────────────────
  if (phase === "failed") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-primary-900 px-6">
        <div className="w-20 h-20 rounded-full bg-primary-800 border border-primary-600 flex items-center justify-center text-4xl mb-6">
          ⚠️
        </div>
        <div className="space-y-3 text-center mb-8">
          {segmentationFailed && (
            <p className="text-primary-100 font-medium text-base">
              {t("analysis.failedSegTitle")}
            </p>
          )}
          {fabricFailed && (
            <p className="text-primary-100 font-medium text-base">
              {t("analysis.failedFabricTitle")}
            </p>
          )}
        </div>
        <div className="w-full space-y-3">
          <button
            onClick={handleRetry}
            className="w-full bg-secondary-300 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-md shadow-black/20"
          >
            {t("analysis.tryAgain")}
          </button>
          {!segmentationFailed && (
            <button
              onClick={() => setPhase("manualFabric")}
              className="w-full bg-primary-700 text-primary-100 py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform border border-primary-600"
            >
              {t("analysis.enterFabricManually")}
            </button>
          )}
          {fabricFailed && !segmentationFailed && (
            <button
              onClick={() => setManualFabric(null)}
              className="w-full bg-transparent text-primary-100 py-3 rounded-2xl font-medium active:scale-[0.98] transition-transform"
            >
              {t("analysis.continueAnyway")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── MANUAL FABRIC PHASE ─────────────────────────────────────────
  if (phase === "manualFabric") {
    return (
      <ManualFabricForm
        setManualFabric={setManualFabric}
        onCancel={() => setPhase("failed")}
      />
    );
  }

  // ─── EDITING FABRIC PHASE ────────────────────────────────────────
  if (phase === "result" && isEditingFabric) {
    return (
      <ManualFabricForm
        initialFabric={displayFabric}
        setManualFabric={(updatedFabric) => {
          setManualFabric(updatedFabric);
          handleFabricEdited();
        }}
        onCancel={() => handleFabricEdited()}
      />
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
          <h2 className="font-medium text-s text-primary-100">
            {t("analysis.title")}
          </h2>
        </div>
        <span className="bg-secondary-300 text-white text-xs font-medium px-2.5 py-1 rounded-full">
          {t("analysis.complete")}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-0 pb-4 space-y-4">
        {/* Dimensions warning banner */}
        {needsManualInput && (
          <div className="bg-primary-700 border border-primary-600 rounded-2xl px-4 py-3 flex items-start gap-2.5">
            <span className="text-secondary-300 flex-shrink-0 mt-0.5 text-sm">
              ⚠
            </span>
            <p className="text-primary-200 text-xs leading-relaxed">
              {t("analysis.dimensionsWarning")}
            </p>
          </div>
        )}

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
              <p className="text-xs text-primary-700 mb-0.5 font-medium uppercase tracking-wider">
                {t("analysis.detectedMaterial")}
              </p>
              <p className="text-xl font-bold text-primary-800">
                {tl(displayFabric.type)}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {displayFabric.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-primary-200 text-primary-700 text-xs px-2 py-0.5 rounded-full font-medium"
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-primary-700 uppercase tracking-wider">
              {t("analysis.fabricProperties")}
            </p>
            <button
              onClick={() => setIsEditingFabric(true)}
              className="text-xs font-medium text-secondary-300 hover:text-secondary-400 active:opacity-70 transition-colors"
            >
              ✎ {t("common.edit") || "Edit"}
            </button>
          </div>
          <div className="space-y-2.5">
            {[
              {
                label: t("analysis.composition"),
                value: displayFabric.composition
                  .map((c) => `${tl(c.material)} ${c.percentage}%`)
                  .join(" · "),
              },
              { label: t("analysis.color"), value: tl(displayFabric.color) },
              {
                label: t("analysis.condition"),
                value: tl(displayFabric.condition),
              },
              { label: t("analysis.weight"), value: tl(displayFabric.weight) },
              { label: t("analysis.weave"), value: tl(displayFabric.texture) },
              { label: t("analysis.grainDirection"), value: grainText },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center"
              >
                <span className="text-primary-700 text-sm">{item.label}</span>
                <span className="text-primary-800 text-sm font-medium">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Garment dimensions */}
        <div className="bg-primary-100 rounded-3xl p-4 border border-primary-200 fade-in">
          <p className="text-xs font-medium text-primary-700 uppercase tracking-wider mb-3">
            {t("templateSelect.yourGarment")}
          </p>

          {measurements?.panels?.frontPanel != null ? (
            <div className="flex gap-4 flex-wrap">
              <div>
                <p className="text-xs text-primary-700">
                  {t("templateSelect.widthLabel")}
                </p>
                <p className="text-sm font-medium text-primary-800">
                  {measurements.panels.frontPanel.widthCm} cm
                </p>
              </div>
              <div>
                <p className="text-xs text-primary-700">
                  {t("templateSelect.heightLabel")}
                </p>
                <p className="text-sm font-medium text-primary-800">
                  {measurements.panels.frontPanel.heightCm} cm
                </p>
              </div>
              <div>
                <p className="text-xs text-primary-700">
                  {t("templateSelect.usableFabricOneSide")}
                </p>
                <p className="text-sm font-medium text-primary-800">
                  {measurements.panels.frontPanel.areaCm2} cm²
                </p>
              </div>
              <div>
                <p className="text-xs text-primary-700">
                  {t("templateSelect.totalFabricBothSides")}
                </p>
                <p className="text-sm font-medium text-primary-800">
                  {measurements.totalAreaCm2} cm²
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-primary-700">
              {t("templateSelect.measurementsUnavailable")}
            </p>
          )}
        </div>
      </div>

      {/* Pinned CTA */}
      <div className="px-5 pb-6 pt-3 bg-primary-800 space-y-3">
        <button
          onClick={() =>
            navigate("templateSelect", {
              measurements,
              segmentation,
              feasibleTemplates,
              fabric: displayFabric,
            })
          }
          className="w-full bg-secondary-300 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-md shadow-black/20"
        >
          {t("analysis.chooseDirection")}
        </button>
        <button
          onClick={async () => {
            if (savingRef.current) return;
            savingRef.current = true;
            setSavedToCloset(true);

            let imageUrl = null;

            if (uploadedFile && user?.id) {
              const ext = uploadedFile.name.split(".").pop() || "jpg";
              const path = `${user.id}/${Date.now()}.${ext}`;
              const { data: uploadData, error: uploadError } =
                await supabase.storage
                  .from("fabric-images")
                  .upload(path, uploadedFile, { upsert: false });
              if (!uploadError) {
                const { data: urlData } = supabase.storage
                  .from("fabric-images")
                  .getPublicUrl(uploadData.path);
                imageUrl = urlData.publicUrl;
              }
            }

            const fiberContent =
              displayFabric.composition
                ?.map(
                  (c) =>
                    `${c.percentage}% ${typeof c.material === "string" ? c.material : (c.material?.en ?? "")}`,
                )
                .join(", ") ?? null;
            const noteParts = [
              displayFabric.weight?.en ??
                (typeof displayFabric.weight === "string"
                  ? displayFabric.weight
                  : null),
              displayFabric.texture?.en ??
                (typeof displayFabric.texture === "string"
                  ? displayFabric.texture
                  : null),
              displayFabric.condition?.en ??
                (typeof displayFabric.condition === "string"
                  ? displayFabric.condition
                  : null),
            ].filter(Boolean);
            addFabric({
              name: displayFabric.type?.en ?? "Analysed Fabric",
              source_type: "owned",
              color:
                displayFabric.color?.en ??
                (typeof displayFabric.color === "string"
                  ? displayFabric.color
                  : null),
              fiber_content: fiberContent || null,
              length_cm: null,
              width_cm: null,
              notes: noteParts.length > 0 ? noteParts.join(" · ") : null,
              image_url: imageUrl,
            });
          }}
          disabled={savedToCloset}
          className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] ${
            savedToCloset
              ? "bg-primary-700 text-primary-100 cursor-default"
              : "bg-primary-700 border border-primary-600 text-primary-100 active:bg-primary-600"
          }`}
        >
          {savedToCloset
            ? t("analysis.savedToCloset")
            : `${t("analysis.saveToCloset")}`}
        </button>
      </div>
    </div>
  );
}
