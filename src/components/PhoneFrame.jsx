import { useLang, SUPPORTED_LANGS } from "../i18n/LanguageContext";

function LanguageSwitcher({ position = "absolute" }) {
  const { lang, setLang, t } = useLang();
  return (
    <div
      className="flex items-center gap-1 bg-white rounded-full border border-stone-400 shadow-md px-1.5 py-1"
      style={{
        position,
        top: position === "absolute" ? 8 : undefined,
        right: position === "absolute" ? 8 : undefined,
        zIndex: 60,
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
        <div className="absolute top-4 right-4 z-50">
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
            <div className="absolute inset-0 overflow-hidden" style={{ paddingTop: 30 }}>
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: full screen */}
      <div className="sm:hidden fixed inset-0 bg-[#f5f4f0] overflow-hidden">
        <LanguageSwitcher />
        {children}
      </div>
    </>
  )
}
