import { useLang, SUPPORTED_LANGS } from "../i18n/LanguageContext";

function LanguageSwitcher({ position = "fixed" }) {
  const { lang, setLang, t } = useLang();
  const positioned = position !== "static";
  return (
    <div
      className="flex items-center gap-1 bg-white rounded-full border border-stone-400 shadow-md px-1.5 py-1"
      style={{
        position,
        top: positioned ? 8 : undefined,
        right: positioned ? 8 : undefined,
        // position:fixed creates its own stacking context anchored to the
        // viewport (not the PhoneFrame mobile container), so this z-index
        // actually beats the coachmark tour overlay (z-100) globally.
        // Without `fixed` the switcher would be capped inside the mobile
        // wrapper's stacking context and stay underneath the tour.
        zIndex: 200,
      }}
      aria-label={t("languageSwitcher.label")}
    >
      <span className="text-base mr-0.5" aria-hidden="true">
        🌐
      </span>
      {SUPPORTED_LANGS.map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${
            lang === code
              ? "bg-primary-700 text-primary-50 shadow-sm"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          {t(`languageSwitcher.${code}`)}
        </button>
      ))}
    </div>
  );
}

export default function PhoneFrame({ children }) {
  return (
    <>
      {/* Desktop: phone mockup */}
      <div className="hidden sm:flex min-h-screen bg-neutral-300 items-center justify-center relative">
        <div className="absolute top-4 right-4" style={{ zIndex: 200 }}>
          <LanguageSwitcher position="static" />
        </div>
        <div
          className="relative shadow-2xl"
          style={{
            width: 390,
            height: 844,
            background: '#1a1a1a',
            borderRadius: 50,
            padding: 10,
          }}
        >
          {/* Side buttons */}
          <div className="absolute -left-[3px] top-28 w-[3px] h-10 bg-neutral-600 rounded-l" />
          <div className="absolute -left-[3px] top-44 w-[3px] h-14 bg-neutral-600 rounded-l" />
          <div className="absolute -left-[3px] top-60 w-[3px] h-14 bg-neutral-600 rounded-l" />
          <div className="absolute -right-[3px] top-40 w-[3px] h-16 bg-neutral-600 rounded-r" />

          {/* Screen */}
          <div
            className="relative w-full h-full overflow-hidden bg-[#f5f4f0]"
            style={{ borderRadius: 42 }}
          >
            {/* Notch */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a]"
              style={{ width: 120, height: 30, borderRadius: '0 0 20px 20px' }}
            />
            {/* Status bar area */}
            <div className="absolute top-0 left-0 right-0 h-[30px] z-40 flex items-end justify-between px-6 pb-1">
              <span className="text-[10px] font-semibold text-zinc-800">9:41</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-800">●●●</span>
              </div>
            </div>
            {/* App content */}
            <div
              data-tour-frame
              className="absolute inset-0 overflow-hidden"
              style={{ paddingTop: 30 }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: language switcher rendered as a sibling (not a child) of
          the fixed content container. A `position: fixed` parent creates a
          stacking context that traps its descendants' z-index, so the
          switcher must sit outside it to land above the tour overlay. */}
      <div className="sm:hidden">
        <LanguageSwitcher />
      </div>

      {/* Mobile: full screen content container */}
      <div
        data-tour-frame
        className="sm:hidden fixed inset-0 bg-[#f5f4f0] overflow-hidden"
      >
        {children}
      </div>
    </>
  )
}
