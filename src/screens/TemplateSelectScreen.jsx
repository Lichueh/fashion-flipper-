import { templates } from '../data/templates'

export default function TemplateSelectScreen({ navigate }) {
  const items = Object.values(templates)

  return (
    <div className="h-full flex flex-col bg-[#f5f4f0]">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-2">
        <button
          onClick={() => navigate('analysis')}
          className="w-9 h-9 bg-white rounded-full border border-stone-200 flex items-center justify-center text-zinc-600 shadow-sm mr-3"
        >
          ←
        </button>
        <div>
          <h2 className="font-semibold text-zinc-800">Choose Upcycling Template</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">Recommended based on AI analysis</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4 space-y-4">
        <p className="text-sm text-zinc-500 leading-5">
          These templates suit your fabric. After selecting, AI will provide step-by-step guidance
        </p>

        {items.map((template, idx) => {
          const isRecommended = idx === 0
          return (
            <div
              key={template.id}
              onClick={() => navigate('patternLayout', { template: template.id })}
              className={`bg-white rounded-3xl overflow-hidden border-2 cursor-pointer active:scale-[0.98] transition-transform shadow-sm ${
                isRecommended ? 'border-green-300' : 'border-stone-100'
              }`}
            >
              {/* Card header */}
              <div className={`px-5 pt-5 pb-4 ${isRecommended ? 'bg-green-50/50' : ''}`}>
                {isRecommended && (
                  <span className="inline-block bg-green-100 text-green-700 text-[11px] font-bold px-2.5 py-1 rounded-full mb-3">
                    ✨ AI Top Recommendation
                  </span>
                )}
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 overflow-hidden ${template.accentColor}`}>
                    {template.id === 'bag'
                      ? <img src="/bag-result.png" alt="Tote Bag" className="w-full h-full object-cover" />
                      : <img src="/hat-result.png" alt="Bucket Hat" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-zinc-800 text-lg">{template.name}</h3>
                      <span className={`text-sm font-bold ${template.matchScore >= 85 ? 'text-green-600' : 'text-amber-500'}`}>
                        {template.matchScore}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span>⏱ {template.time}</span>
                      <span>
                        {'★'.repeat(template.difficulty)}{'☆'.repeat(template.maxDifficulty - template.difficulty)}{' '}
                        {template.difficultyLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match bar */}
              <div className="px-5">
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${template.matchScore >= 85 ? 'bg-green-400' : 'bg-amber-400'}`}
                    style={{ width: `${template.matchScore}%` }}
                  />
                </div>
              </div>

              {/* Description & meta */}
              <div className="px-5 pt-3 pb-4">
                <p className="text-zinc-500 text-sm leading-5 mb-3">{template.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-zinc-400">
                    <span>{template.steps.length} steps</span>
                    <span>·</span>
                    <span>{template.materials.length} materials</span>
                  </div>
                  <span className="text-green-700 text-sm font-semibold">
                    Start Making →
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
