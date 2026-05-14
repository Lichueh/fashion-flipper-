import { useState, useEffect, useRef } from "react";
import { mockAnalysis } from "../data/mockAnalysis";
import { useAnalysisPipeline } from "../hooks/useAnalysisPipeline";
import { useLang } from "../i18n/LanguageContext";

// ── Fabric spell-check helpers ───────────────────────────────────────────────
const KNOWN_FABRICS = [
  "Acrylic",
  "Canvas",
  "Cashmere",
  "Chiffon",
  "Corduroy",
  "Cotton",
  "Crepe",
  "Denim",
  "Flannel",
  "Fleece",
  "Georgette",
  "Jersey",
  "Lace",
  "Leather",
  "Linen",
  "Lycra",
  "Mohair",
  "Nylon",
  "Organza",
  "Polyester",
  "Poplin",
  "Rayon",
  "Satin",
  "Silk",
  "Spandex",
  "Suede",
  "Taffeta",
  "Tulle",
  "Tweed",
  "Twill",
  "Velvet",
  "Viscose",
  "Wool",
];

function _levenshtein(a, b) {
  const m = a.length,
    n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

/** Returns the closest known fabric name, or null if already known / too different. */
function _closestFabric(input) {
  const lower = input.toLowerCase();
  if (KNOWN_FABRICS.some((f) => f.toLowerCase() === lower)) return null;
  let best = null,
    bestDist = Infinity;
  for (const f of KNOWN_FABRICS) {
    const dist = _levenshtein(lower, f.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      best = f;
    }
  }
  return bestDist <= Math.max(2, Math.floor(input.length * 0.4)) ? best : null;
}

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
  const [manualFabricInput, setManualFabricInput] = useState("");
  const [fabricSuggestion, setFabricSuggestion] = useState(null);

  useEffect(() => {
    if (status === "done" || status === "error") {
      setPhase(fabricFailed || segmentationFailed ? "failed" : "result");
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
            <p className="text-primary-100 font-semibold text-base">
              {t("analysis.failedSegTitle")}
            </p>
          )}
          {fabricFailed && (
            <p className="text-primary-100 font-semibold text-base">
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
    const buildAndSetFabric = (input) => {
      const parts = input.split(",").map((p) => p.trim());
      const composition = parts.map((part) => {
        const percentMatch = part.match(/(\d+(?:\.\d+)?)\s*%/);
        const percentage = percentMatch ? parseFloat(percentMatch[1]) : null;
        const material = percentMatch
          ? part.replace(percentMatch[0], "").trim()
          : part.trim();
        const finalPercentage =
          percentage ??
          (parts.length === 1 ? 100 : Math.round(100 / parts.length));
        const name = material || "Fabric";
        return {
          material: { en: name, nb: name, zh: name },
          percentage: finalPercentage,
        };
      });
      const firstPart = parts[0];
      const firstPercent = firstPart.match(/(\d+(?:\.\d+)?)\s*%/);
      const fabricType =
        (firstPercent
          ? firstPart.replace(firstPercent[0], "").trim()
          : firstPart.trim()) || "Custom";
      setManualFabric({
        type: { en: fabricType, nb: fabricType, zh: fabricType },
        color: { en: "Unknown", nb: "Ukjent", zh: "未知" },
        composition,
        weight: { en: "Unknown", nb: "Ukjent", zh: "未知" },
        texture: { en: "Unknown", nb: "Ukjent", zh: "未知" },
        condition: { en: "Unknown", nb: "Ukjent", zh: "未知" },
        tags: [],
      });
    };

    const handleConfirmFabric = () => {
      const trimmed = manualFabricInput.trim();
      if (!trimmed) {
        setManualFabric(null);
        return;
      }
      // Check each material name against the known-fabrics list before parsing.
      const parts = trimmed.split(",").map((p) => p.trim());
      const pairs = parts.reduce((acc, part) => {
        const percentMatch = part.match(/(\d+(?:\.\d+)?)\s*%/);
        const materialRaw = percentMatch
          ? part.replace(percentMatch[0], "").trim()
          : part.trim();
        if (!materialRaw) return acc;
        const suggestion = _closestFabric(materialRaw);
        if (suggestion) acc.push({ original: materialRaw, suggestion });
        return acc;
      }, []);
      if (pairs.length > 0) {
        let corrected = trimmed;
        for (const { original, suggestion } of pairs)
          corrected = corrected.replace(new RegExp(original, "gi"), suggestion);
        setFabricSuggestion({ pairs, correctedInput: corrected });
        return;
      }
      buildAndSetFabric(trimmed);
    };
    return (
      <div className="h-full flex flex-col bg-primary-900 px-6 pt-16 pb-8">
        <button
          onClick={() => {
            setFabricSuggestion(null);
            setPhase("failed");
          }}
          className="self-start w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mb-8"
        >
          ←
        </button>
        <h2 className="text-primary-100 text-2xl font-bold mb-2">
          {t("analysis.manualFabricTitle")}
        </h2>
        <p className="text-primary-100 text-sm mb-8">
          {t("analysis.manualFabricSubtitle")}
        </p>
        <input
          type="text"
          value={manualFabricInput}
          onChange={(e) => {
            setManualFabricInput(e.target.value);
            if (fabricSuggestion) setFabricSuggestion(null);
          }}
          placeholder={t("analysis.manualFabricPlaceholder")}
          className="w-full bg-primary-800 border border-primary-600 rounded-2xl px-4 py-3 text-primary-100 placeholder-primary-500 text-sm mb-6 outline-none focus:border-secondary-300"
        />
        <div className="space-y-3 mt-auto">
          {fabricSuggestion ? (
            <div className="bg-primary-800 border border-primary-600 rounded-2xl px-4 py-3 space-y-3">
              {fabricSuggestion.pairs.length === 1 ? (
                <p className="text-primary-200 text-sm leading-relaxed">
                  {t("analysis.fabricSuggestionSingle", {
                    name: fabricSuggestion.pairs[0].original,
                    suggestion: fabricSuggestion.pairs[0].suggestion,
                  })}
                </p>
              ) : (
                <>
                  <p className="text-primary-200 text-sm">
                    {t("analysis.fabricSuggestionMultiple")}
                  </p>
                  <ul className="space-y-1">
                    {fabricSuggestion.pairs.map(({ original, suggestion }) => (
                      <li key={original} className="text-xs">
                        <span className="text-primary-100">{original}</span>
                        <span className="text-primary-500"> → </span>
                        <span className="text-secondary-300 font-medium">
                          {suggestion}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const corrected = fabricSuggestion.correctedInput;
                    setManualFabricInput(corrected);
                    setFabricSuggestion(null);
                    buildAndSetFabric(corrected);
                  }}
                  className="flex-1 bg-secondary-300 text-white py-2.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform"
                >
                  {t("analysis.fabricUseSuggestion")}
                </button>
                <button
                  onClick={() => {
                    setFabricSuggestion(null);
                    buildAndSetFabric(manualFabricInput.trim());
                  }}
                  className="flex-1 bg-primary-700 text-primary-200 py-2.5 rounded-xl text-sm font-medium border border-primary-600 active:scale-[0.98] transition-transform"
                >
                  {t("analysis.fabricKeepOriginal")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleConfirmFabric}
              className="w-full bg-secondary-300 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-md shadow-black/20"
            >
              {t("analysis.manualFabricConfirm")}
            </button>
          )}
          <button
            onClick={() => setManualFabric(null)}
            className="w-full bg-transparent text-primary-100 py-3 rounded-2xl font-medium active:scale-[0.98] transition-transform"
          >
            {t("analysis.manualFabricSkip")}
          </button>
        </div>
      </div>
    );
  }

  // ─── RESULTS PHASE ───────────────────────────────────────────────
  // Fall back to mock fabric when setManualFabric(null) was called
  // ("Continue anyway" / "Skip fabric info" paths).
  const displayFabric = fabric ?? mockAnalysis.fabric;
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
              <p className="text-[11px] text-primary-500 mb-0.5 font-medium uppercase tracking-wider">
                {t("analysis.detectedMaterial")}
              </p>
              <p className="text-xl font-bold text-primary-900">
                {tl(displayFabric.type)}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {displayFabric.tags.map((tag, i) => (
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
              fabric: displayFabric,
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
