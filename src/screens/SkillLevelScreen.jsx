import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { SKILL_LEVELS } from "../data/skillLevels";

// First-launch gate. Shown by App.jsx when activeProfile is missing or has no
// skillLevel field. After confirming a level, writes it to the active profile
// (or creates a default-named profile if none exists yet) and navigates home.
export default function SkillLevelScreen({
  activeProfile,
  addProfile,
  updateProfile,
  setActiveProfile,
  navigate,
}) {
  const { t } = useLang();
  const [selected, setSelected] = useState(activeProfile?.skillLevel ?? null);

  function handleContinue() {
    if (!selected) return;
    if (activeProfile) {
      updateProfile(activeProfile.id, { skillLevel: selected });
    } else {
      const created = addProfile(t("skillLevel.defaultProfileName"), {
        skillLevel: selected,
      });
      setActiveProfile(created.id);
    }
    navigate("home");
  }

  return (
    <div className="h-full flex flex-col bg-primary-800">
      <div className="flex-1 overflow-y-auto px-5 pt-10 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <img src="/logo.svg" alt="Fashion Flipper" className="w-7 h-7" />
          <h1 className="text-lg font-bold text-primary-100 tracking-tight">
            Fashion Flipper
          </h1>
        </div>
        <h2 className="text-primary-100 text-2xl font-bold leading-tight mt-4 mb-2">
          {t("skillLevel.title")}
        </h2>
        <p className="text-primary-300 text-xs leading-5 mb-6">
          {t("skillLevel.subtitle")}
        </p>

        <div className="space-y-3">
          {SKILL_LEVELS.map((level) => {
            const isActive = selected === level.id;
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => setSelected(level.id)}
                className={`w-full text-left rounded-3xl border-[3px] px-4 py-4 transition-all active:scale-[0.98] ${level.cardBg} ${
                  isActive ? level.borderActive : "border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${level.thumbBg}`}
                  >
                    <span className={`text-lg font-bold ${level.text}`}>
                      {level.difficulty}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-base ${level.text}`}>
                      {t(`skillLevel.${level.id}`)}
                    </p>
                    <p className="text-primary-700 text-[12px] leading-4 mt-0.5">
                      {t(`skillLevel.${level.id}Desc`)}
                    </p>
                  </div>
                  {isActive && (
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${level.accent}`}
                    >
                      ✓
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pb-6 pt-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected}
          className={`w-full font-semibold text-sm py-3 rounded-2xl shadow-sm transition-all ${
            selected
              ? "bg-secondary-300 text-secondary-900 active:scale-[0.98]"
              : "bg-secondary-300 text-secondary-900 opacity-40 cursor-not-allowed"
          }`}
        >
          {t("skillLevel.continue")}
        </button>
      </div>
    </div>
  );
}
