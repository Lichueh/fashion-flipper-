import { useState, useEffect } from 'react'
import { mockAnalysis } from '../data/mockAnalysis'

export default function AnalysisScreen({ navigate, uploadedImage }) {
  const [phase, setPhase] = useState('scanning')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          return 100
        }
        return p + 2
      })
    }, 50)
    const timer = setTimeout(() => setPhase('result'), 2800)
    return () => { clearTimeout(timer); clearInterval(interval) }
  }, [])

  if (phase === 'scanning') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-zinc-900 px-6">
        {/* Scanned image */}
        <div className="relative w-60 h-60 rounded-3xl overflow-hidden mb-8">
          {uploadedImage ? (
            <img src={uploadedImage} alt="analyzing" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-7xl">👗</div>
          )}

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(74,222,128,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.08) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />

          {/* Scan line */}
          <div
            className="scan-line bg-green-400"
            style={{ boxShadow: '0 0 14px 2px rgba(74,222,128,0.7)' }}
          />

          {/* Corner marks */}
          {[
            'top-2 left-2 border-t-2 border-l-2',
            'top-2 right-2 border-t-2 border-r-2',
            'bottom-2 left-2 border-b-2 border-l-2',
            'bottom-2 right-2 border-b-2 border-r-2',
          ].map((cls, i) => (
            <div key={i} className={`absolute w-4 h-4 border-green-400 ${cls}`} />
          ))}
        </div>

        <p className="text-green-400 font-mono text-xs tracking-[0.2em] mb-1.5 uppercase">
          Analyzing Fabric
        </p>
        <p className="text-zinc-400 text-sm text-center leading-6 mb-6">
          AI is identifying fabric material, color, and condition…
        </p>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-zinc-700 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-green-400 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#f5f4f0]">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-4">
        <button
          onClick={() => navigate('upload')}
          className="w-9 h-9 bg-white rounded-full border border-stone-200 flex items-center justify-center text-zinc-600 shadow-sm mr-3"
        >
          ←
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-zinc-800">AI Analysis Results</h2>
        </div>
        <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
          ✓ Analysis Complete
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
        {/* Fabric type card */}
        <div className="bg-white rounded-3xl p-4 border border-stone-100 shadow-sm fade-in">
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-stone-100">
              {uploadedImage ? (
                <img src={uploadedImage} alt="cloth" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-stone-100 flex items-center justify-center text-3xl">👗</div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-zinc-400 mb-0.5 font-medium uppercase tracking-wider">Detected Material</p>
              <p className="text-xl font-bold text-zinc-800">{mockAnalysis.fabric.type}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {mockAnalysis.tags.map(tag => (
                  <span key={tag} className="bg-green-50 text-green-700 text-[11px] px-2 py-0.5 rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fabric details */}
        <div className="bg-white rounded-3xl p-4 border border-stone-100 shadow-sm fade-in">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Fabric Properties</p>
          <div className="space-y-2.5">
            {[
              { label: 'Composition', value: mockAnalysis.fabric.composition.map(c => `${c.material} ${c.percentage}%`).join(' · ') },
              { label: 'Color', value: mockAnalysis.fabric.color },
              { label: 'Condition', value: mockAnalysis.fabric.condition },
              { label: 'Weight', value: mockAnalysis.fabric.weight },
              { label: 'Weave', value: mockAnalysis.fabric.texture },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">{item.label}</span>
                <span className="text-zinc-700 text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="fade-in">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1">AI Upcycling Recommendations</p>
          {mockAnalysis.recommendations.map((rec, idx) => (
            <div key={rec.id} className="bg-white rounded-3xl p-4 mb-3 border border-stone-100 shadow-sm">
              {idx === 0 && (
                <span className="inline-block bg-green-100 text-green-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-2">
                  ✨ Top Pick
                </span>
              )}
              <div className="flex justify-between items-center mb-1.5">
                <p className="font-semibold text-zinc-800">{rec.name}</p>
                <span className={`text-sm font-bold ${rec.matchScore >= 85 ? 'text-green-600' : 'text-amber-500'}`}>
                  {rec.matchScore}%
                </span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${rec.matchScore >= 85 ? 'bg-green-400' : 'bg-amber-400'}`}
                  style={{ width: `${rec.matchScore}%` }}
                />
              </div>
              <p className="text-zinc-500 text-xs leading-4">{rec.reason}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('templateSelect')}
          className="w-full bg-green-700 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-md shadow-green-700/20"
        >
          Choose Direction →
        </button>
      </div>
    </div>
  )
}
