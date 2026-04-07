import { useState, useEffect } from 'react'
import { mockAnalysis } from '../data/mockAnalysis'

export default function AnalysisScreen({ navigate, uploadedImage }) {
  const [phase, setPhase] = useState('scanning')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100 }
        return p + 2
      })
    }, 50)
    const timer = setTimeout(() => setPhase('result'), 2800)
    return () => { clearTimeout(timer); clearInterval(interval) }
  }, [])

  // ─── SCANNING PHASE ─────────────────────────────────────────────
  if (phase === 'scanning') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-primary-900 px-6">
        <div className="relative w-60 h-60 rounded-3xl overflow-hidden mb-8">
          {uploadedImage ? (
            <img src={uploadedImage} alt="analyzing" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary-800 flex items-center justify-center text-7xl">👗</div>
          )}
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(168,191,153,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(168,191,153,0.1) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div
            className="scan-line bg-secondary-300"
            style={{ boxShadow: '0 0 14px 2px rgba(201,185,122,0.7)' }}
          />
          {[
            'top-2 left-2 border-t-2 border-l-2',
            'top-2 right-2 border-t-2 border-r-2',
            'bottom-2 left-2 border-b-2 border-l-2',
            'bottom-2 right-2 border-b-2 border-r-2',
          ].map((cls, i) => (
            <div key={i} className={`absolute w-4 h-4 border-secondary-300 ${cls}`} />
          ))}
        </div>

        <p className="text-primary-200 font-mono text-xs tracking-[0.2em] mb-1.5 uppercase">
          Analyzing Fabric
        </p>
        <p className="text-primary-400 text-sm text-center leading-6 mb-6">
          AI is identifying fabric material, color, and condition…
        </p>
        <div className="w-48 h-1 bg-primary-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-secondary-300 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-primary-300 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  // ─── RESULTS PHASE ───────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-primary-800">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-4">
        <button
          onClick={() => navigate('upload')}
          className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3"
        >
          ←
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-primary-100">AI Analysis Results</h2>
        </div>
        <span className="bg-secondary-300 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          ✓ Analysis Complete
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
        {/* Fabric type card */}
        <div className="bg-primary-100 rounded-3xl p-4 border border-primary-200 fade-in">
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-primary-200">
              {uploadedImage ? (
                <img src={uploadedImage} alt="cloth" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-200 flex items-center justify-center text-3xl">👗</div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-primary-500 mb-0.5 font-medium uppercase tracking-wider">Detected Material</p>
              <p className="text-xl font-bold text-primary-900">{mockAnalysis.fabric.type}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {mockAnalysis.tags.map(tag => (
                  <span key={tag} className="bg-primary-200 text-primary-800 text-[11px] px-2 py-0.5 rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fabric details */}
        <div className="bg-primary-100 rounded-3xl p-4 border border-primary-200 fade-in">
          <p className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-3">Fabric Properties</p>
          <div className="space-y-2.5">
            {[
              { label: 'Composition', value: mockAnalysis.fabric.composition.map(c => `${c.material} ${c.percentage}%`).join(' · ') },
              { label: 'Color',       value: mockAnalysis.fabric.color },
              { label: 'Condition',   value: mockAnalysis.fabric.condition },
              { label: 'Weight',      value: mockAnalysis.fabric.weight },
              { label: 'Weave',       value: mockAnalysis.fabric.texture },
              { label: 'Color', value: mockAnalysis.fabric.color },
              { label: 'Condition', value: mockAnalysis.fabric.condition },
              { label: 'Weight', value: mockAnalysis.fabric.weight },
              { label: 'Weave', value: mockAnalysis.fabric.texture },
              { label: 'Grain Direction', value:
                  mockAnalysis.garmentLayout.grainAngleDeg === 90 ? 'Vertical (Warp)' :
                  mockAnalysis.garmentLayout.grainAngleDeg === 0  ? 'Horizontal (Weft)' :
                  `Bias (${mockAnalysis.garmentLayout.grainAngleDeg}°)` },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-primary-500 text-sm">{item.label}</span>
                <span className="text-primary-900 text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="fade-in">
          <p className="text-[11px] font-semibold text-primary-400 uppercase tracking-wider mb-3 px-1">AI Upcycling Recommendations</p>
          {mockAnalysis.recommendations.map((rec, idx) => (
            <div key={rec.id} className="bg-primary-100 rounded-3xl p-4 mb-3 border border-primary-200">
              {idx === 0 && (
                <span className="inline-block bg-secondary-200 text-secondary-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-2">
                  ✨ Top Pick
                </span>
              )}
              <div className="flex justify-between items-center mb-1.5">
                <p className="font-semibold text-primary-900">{rec.name}</p>
                <span className={`text-sm font-bold ${rec.matchScore >= 85 ? 'text-primary-700' : 'text-secondary-600'}`}>
                  {rec.matchScore}%
                </span>
              </div>
              <div className="h-2 bg-primary-200 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${rec.matchScore >= 85 ? 'bg-primary-500' : 'bg-secondary-300'}`}
                  style={{ width: `${rec.matchScore}%` }}
                />
              </div>
              <p className="text-primary-600 text-xs leading-4">{rec.reason}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('templateSelect')}
          className="w-full bg-secondary-300 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-md shadow-black/20"
        >
          Choose Direction →
        </button>
      </div>
    </div>
  )
}