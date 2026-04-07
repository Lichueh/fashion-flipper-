import { useState } from 'react'
import { templates } from '../data/templates'

export default function StepGuideScreen({ navigate, template: templateId }) {
  const template = templates[templateId] || templates.bag
  const [stepIdx, setStepIdx] = useState(-1)

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
    <div className="h-full flex flex-col bg-primary-800">
      {/* Header — stays on dark shell */}
      <div className="px-5 pt-8 pb-3">
        <div className="flex items-center mb-3">
          <button
            onClick={() => navigate('patternLayout')}
            className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3 flex-shrink-0"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{template.emoji}</span>
              <h2 className="font-semibold text-primary-100 truncate">{template.name}</h2>
            </div>
          </div>
          <span className="text-xs text-primary-100 flex-shrink-0 ml-2">
            {stepIdx === -1 ? 'Materials List' : `Step ${stepIdx + 1}/${totalSteps}`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-primary-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-secondary-300 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Content — light green inset cards on dark bg */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {stepIdx === -1 ? (
          /* Materials list */
          <div className="fade-in pt-2">
            <h3 className="font-bold text-primary-100 text-lg mb-1">Required Materials</h3>
            <p className="text-primary-100 text-sm mb-4 leading-5">Gather all materials before you begin</p>
            <div className="space-y-2.5">
              {template.materials.map((mat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-primary-100 rounded-2xl px-4 py-3 border border-primary-200"
                >
                  <div className="w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center text-primary-100 font-bold text-xs flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-primary-900 text-sm">{mat}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Step content */
          <div key={stepIdx} className="fade-in pt-2">
            {/* Step number + title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-secondary-300 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0">
                {stepIdx + 1}
              </div>
              <h3 className="font-bold text-primary-100 text-lg leading-tight">{currentStep.title}</h3>
            </div>

            {/* Step illustration */}
            <div className="rounded-3xl overflow-hidden mb-4 border border-primary-700 aspect-square">
              {currentStep.image
                ? <img src={currentStep.image} alt={currentStep.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-primary-700 flex flex-col items-center justify-center">
                    <span className="text-6xl mb-2">{template.emoji}</span>
                    <p className="text-primary-100 text-xs">Step {stepIdx + 1} Illustration</p>
                  </div>
              }
            </div>

            {/* Description card */}
            <div className="bg-primary-100 rounded-3xl p-4 mb-3 border border-primary-200">
              <p className="text-primary-800 text-sm leading-6">{currentStep.description}</p>
            </div>

            {/* Tip — secondary/terracotta tint for warm callout */}
            <div className="bg-secondary-100 border border-secondary-200 rounded-2xl p-3.5 mb-3 flex gap-3">
              <span className="text-xl flex-shrink-0">💡</span>
              <div>
                <p className="text-secondary-800 text-xs font-semibold mb-0.5">Tips</p>
                <p className="text-secondary-700 text-xs leading-5">{currentStep.tip}</p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-1.5 text-primary-100 text-xs px-1">
              <span>⏱</span>
              <span>Estimated Time: {currentStep.duration}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav — back on dark shell, border as separator */}
      <div className="px-5 pb-5 pt-3 border-t border-primary-700 flex gap-3">
        {stepIdx > -1 && (
          <button
            onClick={goPrev}
            className="flex-1 py-3.5 rounded-2xl bg-primary-700 border border-primary-600 text-primary-100 font-semibold text-sm active:scale-95 transition-transform"
          >
            ← Previous
          </button>
        )}
        <button
          onClick={goNext}
          className="flex-1 py-3.5 rounded-2xl bg-secondary-300 text-white font-bold text-sm active:scale-[0.97] transition-transform shadow-md shadow-black/20"
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