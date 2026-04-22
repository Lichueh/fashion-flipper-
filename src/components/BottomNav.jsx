const navItems = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "upload", label: "Upcycle", icon: ScissorsIcon },
  { id: "learn", label: "Learn", icon: BookIcon },
  { id: "community", label: "Community", icon: LeafIcon },
];

function HomeIcon({ active }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "#15803d" : "none"}
      stroke={active ? "#15803d" : "#9ca3af"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function ScissorsIcon({ active }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#15803d" : "#9ca3af"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function BookIcon({ active }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#15803d" : "#9ca3af"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="13" y2="11" />
    </svg>
  );
}

function LeafIcon({ active }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#15803d" : "#9ca3af"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 8C8 10 5.9 16.17 3.82 19.34c.35.23.73.45 1.18.66C7 21 10 21 12 19c2-2 4-5 4-5s2 2 2 5c0 0 2-4 1-9-1-5-2-7-2-7z" />
    </svg>
  );
}

function PersonIcon({ active }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#15803d" : "#9ca3af"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function profileInitials(name) {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function BottomNav({ current, navigate, activeProfile }) {
  const isProfilesActive = current === "profiles";
  const initials = activeProfile ? profileInitials(activeProfile.name) : null;

  return (
    <div
      className="border-t border-stone-200 bg-white/90 backdrop-blur-sm flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      {navItems.map(({ id, label, icon: Icon }) => {
        const active = current === id;
        return (
          <button
            key={id}
            onClick={() => navigate(id)}
            className="flex-1 flex flex-col items-center pt-2 pb-2.5 gap-0.5"
          >
            <Icon active={active} />
            <span
              className={`text-[10px] font-medium ${active ? "text-green-700" : "text-gray-400"}`}
            >
              {label}
            </span>
          </button>
        );
      })}

      {/* Profile button */}
      <button
        onClick={() => navigate("profiles")}
        className="flex-1 flex flex-col items-center pt-2 pb-2.5 gap-0.5"
      >
        <div className="relative">
          <PersonIcon active={isProfilesActive} />
          {initials && (
            <span
              className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-green-700 text-white text-[8px] font-bold flex items-center justify-center leading-none"
              style={{ lineHeight: 1 }}
            >
              {initials}
            </span>
          )}
        </div>
        <span
          className={`text-[10px] font-medium ${isProfilesActive ? "text-green-700" : "text-gray-400"}`}
        >
          Profiles
        </span>
      </button>
    </div>
  );
}
