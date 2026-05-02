import { useState } from "react";
import { tutorials } from "../data/tutorials";
import BottomNav from "../components/BottomNav";

export default function BasicTutorialScreen({ navigate, activeProfile }) {
  const [checked, setChecked] = useState(new Set());
  const [expanded, setExpanded] = useState(null);

  function toggleStep(id) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleCategory(id) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  const totalSteps = tutorials.reduce((s, t) => s + t.steps.length, 0);
  const doneCount = checked.size;
  const pct = Math.round((doneCount / totalSteps) * 100);

  return (
    <div className="h-full flex flex-col bg-primary-800">
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-xl font-bold text-primary-50">Sewing Basics</h1>
        <p className="text-primary-100 text-xs mt-0.5">
          Master the fundamentals before you start
        </p>

        {/* Overall progress */}
        <div className="mt-3 bg-primary-700 rounded-2xl px-4 py-3 border border-primary-600 shadow-sm">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-primary-100">
              Overall Progress
            </span>
            <span className="text-xs font-bold text-secondary-200">
              {doneCount} / {totalSteps} steps
            </span>
          </div>
          <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary-300 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {doneCount === totalSteps && (
            <p className="text-[11px] text-secondary-300 font-semibold mt-1.5 text-center">
              🎉 You've completed all basics!
            </p>
          )}
        </div>
      </div>

      {/* Tutorial category list */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
        {tutorials.map((tutorial) => {
          const doneCat = tutorial.steps.filter((s) =>
            checked.has(s.id),
          ).length;
          const totalCat = tutorial.steps.length;
          const allDone = doneCat === totalCat;
          const isOpen = expanded === tutorial.id;
          const catPct = Math.round((doneCat / totalCat) * 100);

          return (
            <div
              key={tutorial.id}
              className="bg-primary-700 rounded-2xl border border-primary-500 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(tutorial.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-primary-600 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${tutorial.bgClass}`}
                >
                  {tutorial.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary-50 text-sm">
                      {tutorial.title}
                    </span>
                    {allDone && (
                      <span className="text-[10px] bg-secondary-100 text-secondary-700 font-bold px-1.5 py-0.5 rounded-full">
                        ✓ Done
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-primary-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${tutorial.accentClass}`}
                        style={{ width: `${catPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-primary-100 flex-shrink-0">
                      {doneCat}/{totalCat}
                    </span>
                  </div>
                </div>

                <span
                  className="text-primary-100 text-sm transition-transform duration-200 flex-shrink-0"
                  style={{
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  ›
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-primary-600">
                  {tutorial.id === "machine" && (
                    <button
                      onClick={() =>
                        navigate("arTutorial", {
                          template: "sewingMachine",
                          from: "learn",
                        })
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 bg-secondary-300 active:bg-secondary-400 transition-colors text-left"
                    >
                      <span className="text-xl">🪡</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">
                          Try AR-Guided Walkthrough
                        </p>
                        <p className="text-white/85 text-[11px]">
                          Numbered callouts overlaid on your camera view
                        </p>
                      </div>
                      <span className="text-white text-base">→</span>
                    </button>
                  )}
                  {tutorial.video && (
                    <div className="px-4 pt-3 pb-2">
                      <video
                        src={tutorial.video}
                        controls
                        playsInline
                        className="w-full rounded-xl overflow-hidden bg-primary-900"
                        style={{ maxHeight: 200 }}
                      />
                    </div>
                  )}
                  {tutorial.steps.map((step, idx) => {
                    const isDone = checked.has(step.id);
                    return (
                      <button
                        key={step.id}
                        onClick={() => toggleStep(step.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors border-primary-500 ${
                          isDone ? "bg-primary-600" : "bg-primary-700"
                        } ${idx < tutorial.steps.length - 1 ? "border-primary-500" : ""}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200 ${
                            isDone
                              ? `${tutorial.accentClass} border-none`
                              : `bg-transparent border border-primary-500`
                          }`}
                        >
                          {isDone ? (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                            >
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="white"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <span className="text-[9px] font-bold text-primary-100">
                              {idx + 1}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-semibold leading-snug ${isDone ? "text-primary-500 line-through" : "text-primary-50"}`}
                          >
                            {step.title}
                          </p>
                          {!isDone && (
                            <>
                              <p className="text-primary-200 text-xs leading-[1.55] mt-1">
                                {step.description}
                              </p>
                              {step.tip && (
                                <div className="flex items-start gap-1.5 mt-2 bg-warning-50 rounded-lg px-2.5 py-2">
                                  <span className="text-warning-500 text-xs mt-0.5 flex-shrink-0">
                                    💡
                                  </span>
                                  <p className="text-warning-900 text-[11px] leading-[1.5]">
                                    {step.tip}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BottomNav
        current="learn"
        navigate={navigate}
        activeProfile={activeProfile}
      />
    </div>
  );
}
