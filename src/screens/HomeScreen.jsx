import BottomNav from "../components/BottomNav";
import { templates } from "../data/templates";
import { communityPosts } from "../data/communityPosts";
import { useLang } from "../i18n/LanguageContext";
import { levelByDifficulty } from "../data/skillLevels";

const communityPreviews = communityPosts.slice(0, 4);

export default function HomeScreen({ navigate, activeProfile }) {
  const { t, tl } = useLang();
  // Recommend only templates matching the user's skill level. If skillLevel is
  // missing (shouldn't happen because of the App.jsx gate, but defensive), fall
  // back to showing everything.
  const profileDifficulty =
    activeProfile?.skillLevel === "beginner"
      ? 1
      : activeProfile?.skillLevel === "intermediate"
        ? 2
        : activeProfile?.skillLevel === "advanced"
          ? 3
          : null;
  const recommendedTemplates =
    profileDifficulty == null
      ? Object.values(templates)
      : Object.values(templates).filter(
          (tpl) => tpl.difficulty === profileDifficulty,
        );
  return (
    <div className="relative h-full flex flex-col bg-primary-800">
      <div className="flex-1 overflow-y-auto pb-1 scrollbar-hide">
        {/* Header */}
        <div className="px-5 pt-8 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <img
                  src="/logo.svg"
                  alt="Fashion Flipper"
                  className="w-8 h-8"
                />
                <h1 className="text-2xl font-bold text-primary-100 tracking-tight">
                  Fashion Flipper
                </h1>
              </div>
              <p className="text-primary-100 text-xs mt-0.5">
                {t("home.tagline")}
              </p>
            </div>
            <button className="w-9 h-9 bg-primary-100 rounded-full border border-primary-200 flex items-center justify-center text-base shadow-sm">
              🔔
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="mx-5 mb-5 bg-primary-100 rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 text-[100px] opacity-[0.12] leading-none select-none">
            👗
          </div>
          <span className="inline-block bg-secondary-100 text-secondary-700 text-[10px] font-semibold px-2.5 py-1 rounded-full mb-3 tracking-widest uppercase">
            {t("home.heroBadge")}
          </span>
          <h2 className="text-primary-900 text-xl font-bold leading-snug mb-1 whitespace-pre-line">
            {t("home.heroTitle")}
          </h2>
          <p className="text-primary-700 text-xs mb-4 leading-5">
            {t("home.heroBody")}
          </p>
          <button
            data-tour="tour-start"
            onClick={() => navigate("upload")}
            className="bg-secondary-300 text-white font-bold text-sm px-5 py-2.5 rounded-full active:scale-95 transition-transform shadow-sm"
          >
            {t("home.startUpcycling")}
          </button>
        </div>

        {/* Stats */}
        <div className="mx-5 grid grid-cols-3 gap-2.5 mb-5">
          {[
            { value: "1,234", label: t("home.stat1Label") },
            {
              value: String(Object.keys(templates).length),
              label: t("home.stat2Label"),
            },
            { value: "-82%", label: t("home.stat3Label") },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-primary-100 rounded-2xl p-3 text-center border border-primary-200 shadow-sm"
            >
              <p className="text-base font-bold text-primary-900">{s.value}</p>
              <p className="text-[10px] text-primary-700 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Community preview */}
        <div className="mb-5">
          <div className="flex justify-between items-center px-5 mb-3">
            <h3 className="font-semibold text-secondary-100 text-sm">
              {t("home.communityPicks")}
            </h3>
            <button
              onClick={() => navigate("community")}
              className="text-secondary-100 text-xs font-medium"
            >
              {t("home.seeAll")}
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 px-5 scrollbar-hide">
            {communityPreviews.map((p) => (
              <div key={p.id} className="flex-shrink-0 w-28">
                <div className="rounded-2xl h-28 mb-2 overflow-hidden border border-white/60">
                  <img
                    src={p.image}
                    alt={tl(p.item)}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs font-medium text-secondary-100 truncate">
                  {tl(p.item)}
                </p>
                <p className="text-[10px] text-secondary-100 mt-0.5">
                  @{p.user} · ❤️ {p.likes}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Templates */}
        <div className="mx-5 mb-6">
          <h3 className="font-semibold text-secondary-100 text-sm mb-3">
            {profileDifficulty != null
              ? t("home.recommendedForLevel", {
                  level: t(`skillLevel.${activeProfile.skillLevel}`),
                })
              : t("home.availableTemplates")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {recommendedTemplates.map((tpl) => {
              const level = levelByDifficulty(tpl.difficulty);
              return (
                <div
                  key={tpl.id}
                  onClick={() =>
                    navigate("patternLayout", {
                      template: tpl.id,
                      from: "home",
                    })
                  }
                  className={`${level.cardBg} border-2 ${level.border} rounded-2xl p-4 cursor-pointer active:scale-95 transition-transform`}
                >
                  <span className="text-4xl">{tpl.emoji}</span>
                  <p className="font-semibold text-secondary-800 mt-2 text-sm">
                    {tl(tpl.name)}
                  </p>
                  <p className={`text-[11px] mt-0.5 font-medium ${level.text}`}>
                    {tl(tpl.difficultyLabel)} · ⏱ {tl(tpl.time)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <BottomNav
        current="home"
        navigate={navigate}
        activeProfile={activeProfile}
      />
    </div>
  );
}
