import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfilesScreen({
  profiles,
  activeProfileId,
  addProfile,
  deleteProfile,
  setActiveProfile,
  navigate,
}) {
  const { t, lang } = useLang();
  const localeMap = { en: undefined, nb: "nb-NO", zh: "zh-Hant-TW" };
  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(localeMap[lang], {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }
  const [pendingDelete, setPendingDelete] = useState(null);

  function handleRowClick(e, profileId) {
    if (pendingDelete && pendingDelete !== profileId) {
      setPendingDelete(null);
    }
  }

  function handleDelete(e, id) {
    e.stopPropagation();
    if (pendingDelete === id) {
      deleteProfile(id);
      setPendingDelete(null);
    } else {
      setPendingDelete(id);
    }
  }

  function handleSetActive(e, id) {
    e.stopPropagation();
    setActiveProfile(id);
    setPendingDelete(null);
  }

  const noActiveButHasProfiles =
    profiles.length > 0 && activeProfileId === null;

  return (
    <div
      className="h-full flex flex-col bg-primary-800"
      onClick={() => setPendingDelete(null)}
    >
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-4">
        <button
          onClick={() => navigate("home")}
          className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3"
        >
          ←
        </button>
        <div>
          <h2 className="font-semibold text-primary-100 text-base">
            {t("profiles.title")}
          </h2>
          <p className="text-[11px] text-primary-300 mt-0.5">
            {t("profiles.subtitle")}
          </p>
        </div>
      </div>

      {noActiveButHasProfiles && (
        <div className="mx-5 mb-3 bg-amber-900/40 border border-amber-700/60 rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-amber-300 text-base">⚠️</span>
          <p className="text-amber-200 text-[12px] leading-snug">
            {t("profiles.noActiveBanner")}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-10">
            <div className="text-6xl select-none">📏</div>
            <div className="text-center">
              <p className="text-primary-100 font-semibold text-base">
                {t("profiles.empty")}
              </p>
              <p className="text-primary-300 text-[12px] mt-1 leading-snug whitespace-pre-line">
                {t("profiles.emptyHint")}
              </p>
            </div>
            <button
              onClick={() => navigate("profileEditor", { mode: "new" })}
              className="bg-secondary-300 text-secondary-900 font-semibold text-sm px-6 py-2.5 rounded-full shadow-sm active:scale-95 transition-transform"
            >
              {t("profiles.createFirst")}
            </button>
          </div>
        ) : (
          profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            const awaitingConfirm = pendingDelete === profile.id;
            const measurementCount = Object.keys(
              profile.measurements ?? {},
            ).length;
            const measurementText =
              measurementCount === 0
                ? t("profiles.noMeasurements")
                : measurementCount === 1
                  ? t("profiles.measurementCountOne")
                  : t("profiles.measurementCountMany", {
                      count: measurementCount,
                    });

            return (
              <div
                key={profile.id}
                onClick={(e) => handleRowClick(e, profile.id)}
                className={`bg-primary-100 rounded-3xl px-4 py-4 flex items-center gap-3 border-2 transition-colors ${
                  isActive ? "border-secondary-400" : "border-primary-200"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    isActive
                      ? "bg-secondary-300 text-secondary-900"
                      : "bg-secondary-200 text-secondary-700"
                  }`}
                >
                  {initials(profile.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-primary-900 text-sm truncate">
                      {profile.name}
                    </span>
                    {isActive && (
                      <span className="text-secondary-600 text-s font-bold">
                        ❀
                      </span>
                    )}
                  </div>
                  <p className="text-primary-500 text-[11px] mt-0.5">
                    {measurementText}
                    {" · "}
                    {formatDate(profile.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(null);
                      navigate("profileEditor", {
                        mode: "edit",
                        profileId: profile.id,
                      });
                    }}
                    className="text-[11px] font-medium text-primary-700 bg-primary-200 rounded-full px-3 py-1 active:scale-95 transition-transform"
                  >
                    {t("common.edit")}
                  </button>

                  {!isActive && (
                    <button
                      onClick={(e) => handleSetActive(e, profile.id)}
                      className="text-[11px] font-medium text-secondary-800 bg-secondary-200 rounded-full px-3 py-1 active:scale-95 transition-transform"
                    >
                      {t("profiles.activate")}
                    </button>
                  )}

                  <button
                    onClick={(e) => handleDelete(e, profile.id)}
                    className={`text-[11px] font-medium rounded-full px-3 py-1 active:scale-95 transition-all ${
                      awaitingConfirm
                        ? "bg-red-500 text-white"
                        : "bg-primary-200 text-red-500"
                    }`}
                  >
                    {awaitingConfirm ? t("profiles.confirmDelete") : t("common.delete")}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {profiles.length > 0 && (
        <div className="px-5 pb-6 pt-2">
          <button
            onClick={() => navigate("profileEditor", { mode: "new" })}
            className="w-full bg-secondary-300 text-secondary-900 font-semibold text-sm py-3 rounded-2xl shadow-sm active:scale-[0.98] transition-transform"
          >
            {t("profiles.newProfile")}
          </button>
        </div>
      )}
    </div>
  );
}
