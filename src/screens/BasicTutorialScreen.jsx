import { useState } from 'react'
import { tutorials } from '../data/tutorials'
import BottomNav from '../components/BottomNav'

export default function BasicTutorialScreen({ navigate }) {
  // checked: Set of step ids
  const [checked, setChecked] = useState(new Set())
  // expanded: which tutorial category is open (null = none)
  const [expanded, setExpanded] = useState(null)

  function toggleStep(id) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleCategory(id) {
    setExpanded(prev => prev === id ? null : id)
  }

  const totalSteps = tutorials.reduce((s, t) => s + t.steps.length, 0)
  const doneCount  = checked.size
  const pct        = Math.round((doneCount / totalSteps) * 100)

  return (
    <div className="h-full flex flex-col bg-[#f5f4f0]">
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-xl font-bold text-zinc-800">Sewing Basics</h1>
        <p className="text-zinc-400 text-xs mt-0.5">Master the fundamentals before you start</p>

        {/* Overall progress */}
        <div className="mt-3 bg-white rounded-2xl px-4 py-3 border border-stone-100 shadow-sm">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-zinc-500">Overall Progress</span>
            <span className="text-xs font-bold text-green-700">{doneCount} / {totalSteps} steps</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {doneCount === totalSteps && (
            <p className="text-[11px] text-green-700 font-semibold mt-1.5 text-center">
              🎉 You've completed all basics!
            </p>
          )}
        </div>
      </div>

      {/* Tutorial category list */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
        {tutorials.map(tutorial => {
          const doneCat  = tutorial.steps.filter(s => checked.has(s.id)).length
          const totalCat = tutorial.steps.length
          const allDone  = doneCat === totalCat
          const isOpen   = expanded === tutorial.id
          const catPct   = Math.round((doneCat / totalCat) * 100)

          return (
            <div
              key={tutorial.id}
              className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden"
            >
              {/* Category header — tap to expand */}
              <button
                onClick={() => toggleCategory(tutorial.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-stone-50 transition-colors"
              >
                {/* Emoji badge */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: tutorial.bgColor }}
                >
                  {tutorial.emoji}
                </div>

                {/* Title + progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-800 text-sm">{tutorial.title}</span>
                    {allDone && (
                      <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">
                        ✓ Done
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${catPct}%`, backgroundColor: tutorial.accentColor }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 flex-shrink-0">
                      {doneCat}/{totalCat}
                    </span>
                  </div>
                </div>

                {/* Chevron */}
                <span
                  className="text-zinc-300 text-sm transition-transform duration-200 flex-shrink-0"
                  style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  ›
                </span>
              </button>

              {/* Steps list — shown when expanded */}
              {isOpen && (
                <div className="border-t border-stone-100">
                  {/* Video player (if tutorial has a video) */}
                  {tutorial.video && (
                    <div className="px-4 pt-3 pb-2">
                      <video
                        src={tutorial.video}
                        controls
                        playsInline
                        className="w-full rounded-xl overflow-hidden bg-black"
                        style={{ maxHeight: 200 }}
                      />
                    </div>
                  )}
                  {tutorial.steps.map((step, idx) => {
                    const isDone = checked.has(step.id)
                    return (
                      <button
                        key={step.id}
                        onClick={() => toggleStep(step.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${
                          isDone ? 'bg-stone-50' : 'bg-white'
                        } ${idx < tutorial.steps.length - 1 ? 'border-b border-stone-50' : ''}`}
                      >
                        {/* Step number / checkmark */}
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200"
                          style={{
                            backgroundColor: isDone ? tutorial.accentColor : '#f3f4f6',
                            border: isDone ? 'none' : '1.5px solid #e5e7eb',
                          }}
                        >
                          {isDone ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <span className="text-[9px] font-bold text-zinc-400">{idx + 1}</span>
                          )}
                        </div>

                        {/* Step content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-snug ${isDone ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                            {step.title}
                          </p>
                          {!isDone && (
                            <>
                              <p className="text-zinc-500 text-xs leading-[1.55] mt-1">
                                {step.description}
                              </p>
                              {step.tip && (
                                <div className="flex items-start gap-1.5 mt-2 bg-amber-50 rounded-lg px-2.5 py-2">
                                  <span className="text-amber-500 text-xs mt-0.5 flex-shrink-0">💡</span>
                                  <p className="text-amber-700 text-[11px] leading-[1.5]">{step.tip}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <BottomNav current="learn" navigate={navigate} />
    </div>
  )
}
