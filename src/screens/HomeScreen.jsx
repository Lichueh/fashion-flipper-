import BottomNav from '../components/BottomNav'

const communityPreviews = [
  { id: 1, user: 'Mei',   emoji: '👜', bg: 'from-amber-100 to-yellow-50',  item: 'Linen Tote',       likes: 142 },
  { id: 2, user: 'Jason', emoji: '🧢', bg: 'from-blue-100 to-sky-50',     item: 'Vintage Bucket Hat', likes: 89  },
  { id: 3, user: 'Lily',  emoji: '🛍', bg: 'from-green-100 to-emerald-50', item: 'Plaid Shopper',    likes: 234 },
  { id: 4, user: 'Leo',   emoji: '🧢', bg: 'from-violet-100 to-purple-50', item: 'Denim Hat',        likes: 67  },
]

export default function HomeScreen({ navigate }) {
  return (
    <div className="h-full flex flex-col bg-[#f5f4f0]">
      <div className="flex-1 overflow-y-auto pb-1">
        {/* Header */}
        <div className="px-5 pt-8 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧵</span>
                <h1 className="text-2xl font-bold text-zinc-800 tracking-tight">Fashion Flipper</h1>
              </div>
              <p className="text-zinc-400 text-xs mt-0.5">Give old clothes a new life</p>
            </div>
            <button className="w-9 h-9 bg-white rounded-full border border-stone-200 flex items-center justify-center text-base shadow-sm">
              🔔
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="mx-5 mb-5 bg-green-800 rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 text-[100px] opacity-[0.12] leading-none select-none">
            👗
          </div>
          <span className="inline-block bg-green-700 text-green-200 text-[10px] font-semibold px-2.5 py-1 rounded-full mb-3 tracking-widest uppercase">
            AI-Guided Upcycling
          </span>
          <h2 className="text-white text-xl font-bold leading-snug mb-1">
            Snap a photo, turn your<br />old clothes into something new
          </h2>
          <p className="text-green-300 text-xs mb-4 leading-5">
            AI identifies your fabric and recommends the best upcycling option
          </p>
          <button
            onClick={() => navigate('upload')}
            className="bg-white text-green-800 font-bold text-sm px-5 py-2.5 rounded-full active:scale-95 transition-transform shadow-sm"
          >
            Start Upcycling ✂️
          </button>
        </div>

        {/* Stats */}
        <div className="mx-5 grid grid-cols-3 gap-2.5 mb-5">
          {[
            { value: '1,234', label: 'Community Works' },
            { value: '2',     label: 'Templates' },
            { value: '-82%',  label: 'Waste Reduced' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 text-center border border-stone-100 shadow-sm">
              <p className="text-base font-bold text-zinc-800">{s.value}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Community preview */}
        <div className="mb-5">
          <div className="flex justify-between items-center px-5 mb-3">
            <h3 className="font-semibold text-zinc-800 text-sm">Community Picks</h3>
            <button
              onClick={() => navigate('community')}
              className="text-green-700 text-xs font-medium"
            >
              See all →
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 px-5">
            {communityPreviews.map(p => (
              <div key={p.id} className="flex-shrink-0 w-28">
                <div className={`bg-gradient-to-br ${p.bg} rounded-2xl h-28 flex items-center justify-center mb-2 border border-white/60`}>
                  <span className="text-5xl">{p.emoji}</span>
                </div>
                <p className="text-xs font-medium text-zinc-700 truncate">{p.item}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">@{p.user} · ❤️ {p.likes}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Templates */}
        <div className="mx-5 mb-6">
          <h3 className="font-semibold text-zinc-800 text-sm mb-3">Available Templates</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { emoji: '👜', name: 'Tote Bag',    diff: 'Beginner',  time: '1.5 hrs', bg: 'bg-amber-50', border: 'border-amber-100' },
              { emoji: '🧢', name: 'Bucket Hat',  diff: 'Beginner+', time: '2–3 hrs', bg: 'bg-sky-50',   border: 'border-sky-100'  },
            ].map(t => (
              <div
                key={t.name}
                onClick={() => navigate('upload')}
                className={`${t.bg} border ${t.border} rounded-2xl p-4 cursor-pointer active:scale-95 transition-transform`}
              >
                <span className="text-4xl">{t.emoji}</span>
                <p className="font-semibold text-zinc-800 mt-2 text-sm">{t.name}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{t.diff} · ⏱ {t.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav current="home" navigate={navigate} />
    </div>
  )
}
