import { templates } from "../data/templates";
import { mockAnalysis } from "../data/mockAnalysis";

export default function TemplateSelectScreen({ navigate, feasibleTemplates }) {
  const items = Object.values(templates);

  // Build a lookup for match scores: prefer feasibleTemplates (pipeline), fall back to mockAnalysis
  const scoreSource = feasibleTemplates ?? mockAnalysis.recommendations;
  const scoreById = Object.fromEntries(
    scoreSource.map((rec) => [
      rec.id,
      rec.feasible !== undefined
        ? Math.round((rec.fitScore ?? 0) * 100)
        : rec.matchScore,
    ]),
  );

  return (
    <div className="h-full flex flex-col bg-primary-800">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-2">
        <button
          onClick={() => navigate("analysis")}
          className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3"
        >
          ←
        </button>
        <div>
          <h2 className="font-semibold text-primary-100">
            Choose Upcycling Template
          </h2>
          <p className="text-[11px] text-primary-100 mt-0.5">
            Recommended based on AI analysis
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4 space-y-4">
        <p className="text-sm text-primary-100 leading-5">
          These templates suit your fabric. After selecting, AI will provide
          step-by-step guidance
        </p>

        {items.map((template, idx) => {
          const isRecommended = idx === 0;
          const matchScore = scoreById[template.id] ?? template.matchScore;
          return (
            <div
              key={template.id}
              onClick={() =>
                navigate("patternLayout", { template: template.id })
              }
              className={`bg-primary-100 rounded-3xl overflow-hidden border-2 cursor-pointer active:scale-[0.98] transition-transform ${
                isRecommended ? "border-secondary-300" : "border-primary-200"
              }`}
            >
              {/* Card header */}
              <div
                className={`px-5 pt-5 pb-4 ${isRecommended ? "bg-primary-50" : ""}`}
              >
                {isRecommended && (
                  <span className="inline-block bg-secondary-200 text-secondary-800 text-[11px] font-bold px-2.5 py-1 rounded-full mb-3">
                    ✨ AI Top Recommendation
                  </span>
                )}
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden ${template.accentColor}`}
                  >
                    {template.resultImage ? (
                      <img
                        src={template.resultImage}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl flex items-center justify-center w-full h-full">
                        {template.emoji}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-primary-900 text-lg">
                        {template.name}
                      </h3>
                      <span
                        className={`text-sm font-bold ${matchScore >= 85 ? "text-primary-800" : "text-secondary-600"}`}
                      >
                        {matchScore}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-primary-500">
                      <span>⏱ {template.time}</span>
                      <span>
                        {"★".repeat(template.difficulty)}
                        {"☆".repeat(
                          template.maxDifficulty - template.difficulty,
                        )}{" "}
                        {template.difficultyLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match bar */}
              <div className="px-5">
                <div className="h-1.5 bg-primary-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${matchScore >= 85 ? "bg-primary-500" : "bg-secondary-500"}`}
                    style={{ width: `${matchScore}%` }}
                  />
                </div>
              </div>

              {/* Description & meta */}
              <div className="px-5 pt-3 pb-4">
                <p className="text-primary-700 text-sm leading-5 mb-3">
                  {template.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-primary-500">
                    <span>{template.steps.length} steps</span>
                    <span>·</span>
                    <span>{template.materials.length} materials</span>
                  </div>
                  <span className="text-primary-700 text-sm font-semibold">
                    Start Making →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
