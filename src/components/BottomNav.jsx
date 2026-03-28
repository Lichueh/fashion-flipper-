const navItems = [
  { id: 'home',      label: 'Home',      icon: HomeIcon },
  { id: 'upload',    label: 'Upcycle',   icon: ScissorsIcon },
  { id: 'community', label: 'Community', icon: LeafIcon },
]

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#15803d' : 'none'} stroke={active ? '#15803d' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function ScissorsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#15803d' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}

function LeafIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#15803d' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8C8 10 5.9 16.17 3.82 19.34c.35.23.73.45 1.18.66C7 21 10 21 12 19c2-2 4-5 4-5s2 2 2 5c0 0 2-4 1-9-1-5-2-7-2-7z" />
    </svg>
  )
}

export default function BottomNav({ current, navigate }) {
  return (
    <div
      className="border-t border-stone-200 bg-white/90 backdrop-blur-sm flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      {navItems.map(({ id, label, icon: Icon }) => {
        const active = current === id
        return (
          <button
            key={id}
            onClick={() => navigate(id)}
            className="flex-1 flex flex-col items-center pt-2 pb-2.5 gap-0.5"
          >
            <Icon active={active} />
            <span className={`text-[11px] font-medium ${active ? 'text-green-700' : 'text-gray-400'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
