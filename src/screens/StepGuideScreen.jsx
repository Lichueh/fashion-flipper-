import { useState } from 'react'
import { templates } from '../data/templates'

export default function StepGuideScreen({ navigate, template: templateId }) {
  const template = templates[templateId] || templates.bag
  const [stepIdx, setStepIdx] = useState(-1) // -1 = materials list

  const totalSteps = template.steps.length
  const progressPct = stepIdx === -1 ? 0 : Math.round(((stepIdx + 1) / totalSteps) * 100)

  const goNext = () => {
    if (stepIdx === -1) setStepIdx(0)
    else if (stepIdx < totalSteps - 1) setStepIdx(stepIdx + 1)
    else navigate('result')
  }

  const goPrev = () => {
    if (stepIdx <= 0) setStepIdx(-1)
    else setStepIdx(stepIdx - 1)
  }

  const currentStep = stepIdx >= 0 ? template.steps[stepIdx] : null

  return (
    <div className="h-full flex flex-col bg-[#f5f4f0]">
      {/* Header */}
      <div className="px-5 pt-8 pb-3 bg-[#f5f4f0]">
        <div className="flex items-center mb-3">
          <button
            onClick={() => navigate('templateSelect')}
            className="w-9 h-9 bg-white rounded-full border border-stone-200 flex items-center justify-center text-zinc-600 shadow-sm mr-3 flex-shrink-0"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{template.emoji}</span>
              <h2 className="font-semibold text-zinc-800 truncate">{template.name}</h2>
            </div>
          </div>
          <span className="text-xs text-zinc-400 flex-shrink-0 ml-2">
            {stepIdx === -1 ? 'Materials List' : `Step ${stepIdx + 1}/${totalSteps}`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {stepIdx === -1 ? (
          /* Materials list */
          <div className="fade-in pt-2">
            <h3 className="font-bold text-zinc-800 text-lg mb-1">Required Materials</h3>
            <p className="text-zinc-500 text-sm mb-4 leading-5">Gather all materials before you begin</p>
            <div className="space-y-2.5">
              {template.materials.map((mat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-stone-100 shadow-sm"
                >
                  <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-zinc-700 text-sm">{mat}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Step content */
          <div key={stepIdx} className="fade-in pt-2">
            {/* Step number + title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-700 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0">
                {stepIdx + 1}
              </div>
              <h3 className="font-bold text-zinc-800 text-lg leading-tight">{currentStep.title}</h3>
            </div>

            {/* Step illustration */}
            <div className="rounded-3xl overflow-hidden mb-4 border border-stone-200 aspect-square">
              {currentStep.image
                ? <img src={currentStep.image} alt={currentStep.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex flex-col items-center justify-center">
                    <span className="text-6xl mb-2">{template.emoji}</span>
                    <p className="text-stone-400 text-xs">Step {stepIdx + 1} Illustration</p>
                  </div>
              }
            </div>

            {/* Description */}
            <div className="bg-white rounded-3xl p-4 mb-3 border border-stone-100 shadow-sm">
              <p className="text-zinc-700 text-sm leading-6">{currentStep.description}</p>
            </div>

            {/* Tip */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 mb-3 flex gap-3">
              <span className="text-xl flex-shrink-0">💡</span>
              <div>
                <p className="text-amber-700 text-xs font-semibold mb-0.5">Tips</p>
                <p className="text-amber-600 text-xs leading-5">{currentStep.tip}</p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs px-1">
              <span>⏱</span>
              <span>Estimated Time: {currentStep.duration}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="px-5 pb-5 pt-3 border-t border-stone-200 bg-[#f5f4f0] flex gap-3">
        {stepIdx > -1 && (
          <button
            onClick={goPrev}
            className="flex-1 py-3.5 rounded-2xl border-2 border-stone-200 bg-white text-zinc-600 font-semibold text-sm active:scale-95 transition-transform"
          >
            ← Previous
          </button>
        )}
        <button
          onClick={goNext}
          className="flex-1 py-3.5 rounded-2xl bg-green-700 text-white font-bold text-sm active:scale-[0.97] transition-transform shadow-md shadow-green-700/20"
        >
          {stepIdx === -1
            ? 'Start Making →'
            : stepIdx < totalSteps - 1
            ? 'Next →'
            : 'Done! View Results ✨'}
        </button>
      </div>
    </div>
  )
}
