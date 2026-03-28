import { useState } from 'react'
import BottomNav from '../components/BottomNav'

const posts = [
  { id: 1, user: 'Mei',   avatar: '🧑‍🦰', item: 'Linen Tote Bag',       emoji: '👜', bg: 'from-amber-100 to-yellow-50',  likes: 142, comments: 18, tag: 'Tote Bag',   image: '/bag-final.png' },
  { id: 2, user: 'Jason', avatar: '👨‍🦱', item: 'Vintage Bucket Hat',   emoji: '🧢', bg: 'from-blue-100 to-sky-50',      likes: 89,  comments: 12, tag: 'Bucket Hat' },
  { id: 3, user: 'Lily',  avatar: '👩‍🦳', item: 'Plaid Shopping Bag',   emoji: '🛍', bg: 'from-green-100 to-emerald-50', likes: 234, comments: 31, tag: 'Shopping Bag' },
  { id: 4, user: 'Jake',  avatar: '🧑',   item: 'Denim Bucket Hat',     emoji: '🧢', bg: 'from-indigo-100 to-blue-50',   likes: 67,  comments: 8,  tag: 'Bucket Hat', image: '/hat-result.png' },
  { id: 5, user: 'Emily', avatar: '👩',   item: 'Floral Tote Bag',      emoji: '👜', bg: 'from-pink-100 to-rose-50',     likes: 189, comments: 25, tag: 'Tote Bag' },
  { id: 6, user: 'Wang',  avatar: '👴',   item: 'Plaid Tote Bag',       emoji: '👜', bg: 'from-stone-200 to-stone-100',  likes: 45,  comments: 6,  tag: 'Tote Bag' },
  { id: 7, user: 'Amy',   avatar: '👩‍🦱', item: 'Denim Bucket Hat',     emoji: '🧢', bg: 'from-violet-100 to-purple-50', likes: 112, comments: 14, tag: 'Bucket Hat' },
  { id: 8, user: 'Jian',  avatar: '🧑‍🦲', item: 'Striped Shopping Bag', emoji: '🛍', bg: 'from-teal-100 to-cyan-50',    likes: 78,  comments: 9,  tag: 'Shopping Bag' },
]

const tabs = [
  { id: 'featured',  label: 'Featured' },
  { id: 'latest',    label: 'Latest' },
  { id: 'following', label: 'Following' },
]

export default function CommunityScreen({ navigate }) {
  const [tab, setTab] = useState('featured')
  const [liked, setLiked] = useState({})

  const toggleLike = (id, e) => {
    e.stopPropagation()
    setLiked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="h-full flex flex-col bg-[#f5f4f0]">
      {/* Header */}
      <div className="px-5 pt-8 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zinc-800">Community Works</h2>
          <button className="w-9 h-9 bg-white rounded-full border border-stone-200 flex items-center justify-center text-base shadow-sm">
            🔍
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-stone-200/70 rounded-xl p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                tab === t.id
                  ? 'bg-white text-zinc-800 shadow-sm'
                  : 'text-zinc-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {tab === 'following' ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <span className="text-5xl mb-3">🌱</span>
            <p className="text-zinc-500 text-sm font-medium">No users followed yet</p>
            <p className="text-zinc-400 text-xs mt-1">Go to Featured to discover works you like</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            {posts.map(post => (
              <div
                key={post.id}
                className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm active:scale-[0.97] transition-transform cursor-pointer"
              >
                {/* Image */}
                <div className={`h-36 relative overflow-hidden ${!post.image ? `bg-gradient-to-br ${post.bg} flex items-center justify-center` : ''}`}>
                  {post.image
                    ? <img src={post.image} alt={post.item} className="w-full h-full object-cover" />
                    : <span className="text-5xl">{post.emoji}</span>
                  }
                  <div className="absolute top-2 right-2 bg-white/70 backdrop-blur-sm rounded-full px-2 py-0.5">
                    <span className="text-[10px] text-zinc-600 font-medium">#{post.tag}</span>
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="font-semibold text-zinc-800 text-xs truncate mb-1.5">{post.item}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{post.avatar}</span>
                      <span className="text-[11px] text-zinc-400">{post.user}</span>
                    </div>
                    <button
                      onClick={(e) => toggleLike(post.id, e)}
                      className="flex items-center gap-1"
                    >
                      <span className="text-sm">{liked[post.id] ? '❤️' : '🤍'}</span>
                      <span className="text-[11px] text-zinc-400">
                        {post.likes + (liked[post.id] ? 1 : 0)}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav current="community" navigate={navigate} />
    </div>
  )
}
