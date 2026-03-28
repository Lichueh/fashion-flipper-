import { useState } from 'react'
import { templates } from '../data/templates'

export default function ResultScreen({ navigate, template: templateId, uploadedImage }) {
  const template = templates[templateId] || templates.bag
  const [showBefore, setShowBefore] = useState(false)
  const [shared, setShared] = useState(false)

  const gradients = {
    bag: 'from-amber-100 via-yellow-50 to-amber-50',
    hat: 'from-sky-100 via-blue-50 to-cyan-50',
  }

  return (
    <div className="h-full flex flex-col bg-[#f5f4f0]">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-4">
        <button
          onClick={() => navigate('home')}
          className="w-9 h-9 bg-white rounded-full border border-stone-200 flex items-center justify-center text-zinc-600 shadow-sm mr-3"
        >
          ←
        </button>
        <h2 className="font-semibold text-zinc-800">Upcycling Results</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
        {/* Celebration */}
        <div className="text-center py-2">
          <p className="text-4xl mb-2">🎉</p>
          <h3 className="text-xl font-bold text-zinc-800">Upcycling Complete!</h3>
          <p className="text-zinc-400 text-sm mt-1">Here is the AI-generated upcycling preview</p>
        </div>

        {/* Before / After card */}
        <div className="bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm">
          {/* Toggle */}
          <div className="flex border-b border-stone-100">
            <button
              onClick={() => setShowBefore(false)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                !showBefore
                  ? 'text-green-700 border-b-2 border-green-600'
                  : 'text-zinc-400'
              }`}
            >
              ✨ After (AI Preview)
            </button>
            <button
              onClick={() => setShowBefore(true)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                showBefore
                  ? 'text-zinc-700 border-b-2 border-zinc-600'
                  : 'text-zinc-400'
              }`}
            >
              Original Clothing
            </button>
          </div>

          {/* Image */}
          <div className={`relative overflow-hidden ${templateId === 'bag' ? 'aspect-[2/3]' : 'h-64'}`}>
            {showBefore ? (
              uploadedImage ? (
                <img src={uploadedImage} alt="before" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-stone-200 flex items-center justify-center text-6xl">👗</div>
              )
            ) : (
              <div className="relative w-full h-full">
                {templateId === 'bag'
                  ? <img src="/bag-final.png" alt="Upcycled Bag" className="w-full h-full object-cover" />
                  : <div className={`w-full h-full bg-gradient-to-br ${gradients[templateId] || gradients.bag} flex flex-col items-center justify-center`}>
                      <span className="text-9xl drop-shadow-sm">{template.emoji}</span>
                    </div>
                }
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <span className="bg-black/20 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium">
                    AI-Generated Preview
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card footer */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-800 text-sm">{template.name}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Transformed from your old clothing</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-400">Carbon Emissions Reduced</p>
              <p className="text-green-600 font-bold text-sm">-82%</p>
            </div>
          </div>
        </div>

        {/* Environmental impact */}
        <div className="bg-green-800 rounded-3xl p-5 text-white">
          <p className="text-green-300 text-xs font-semibold mb-3 flex items-center gap-1.5">
            🌍 Your Environmental Impact
          </p>
          <div className="flex justify-around">
            {[
              { value: '1 item', label: 'Clothing Regenerated' },
              { value: '0.3kg', label: 'Waste Reduced' },
              { value: '2.4L', label: 'Water Saved' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-green-400 text-[11px] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShared(true)}
            className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.97] ${
              shared
                ? 'bg-green-100 text-green-700 border-2 border-green-200'
                : 'bg-green-700 text-white shadow-md shadow-green-700/20'
            }`}
          >
            {shared ? '✓ Shared to Community' : 'Share to Community 🌿'}
          </button>
          <button
            onClick={() => navigate('community')}
            className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 border-stone-200 bg-white text-zinc-600 active:scale-[0.97] transition-transform"
          >
            Browse Community
          </button>
        </div>

        {/* Restart */}
        <button
          onClick={() => navigate('home')}
          className="w-full py-3 text-zinc-400 text-sm font-medium active:text-zinc-600 transition-colors"
        >
          Back to Home →
        </button>
      </div>
    </div>
  )
}
