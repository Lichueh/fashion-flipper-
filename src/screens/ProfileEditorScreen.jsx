import { useState, useRef } from "react";
import { MEASUREMENT_GROUPS } from "../data/patternMeasurements";
import measurementPresets, {
  femalePresets,
  malePresets,
} from "../data/measurementPresets";
import {
  humanise,
  validateField,
  mmToCm,
  cmToMm,
  unitLabel,
} from "../utils/measurementValidation";
import { useLang } from "../i18n/LanguageContext";

const ALL_KEYS = Object.values(MEASUREMENT_GROUPS).flat();

export default function ProfileEditorScreen({
  profile,
  addProfile,
  updateProfile,
  navigate,
}) {
  const { t, tl } = useLang();
  const isNew = profile === null;

  const createdProfileIdRef = useRef(null);

  function initialFields() {
    if (!profile?.measurements) return {};
    return Object.fromEntries(
      Object.entries(profile.measurements).map(([k, mm]) => [k, mmToCm(k, mm)]),
    );
  }

  const [name, setName] = useState(profile?.name ?? "");
  const [gender, setGender] = useState(profile?.gender ?? null);
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [confirmPreset, setConfirmPreset] = useState(null);
  const [emptyPrompt, setEmptyPrompt] = useState(false);

  const nameInputRef = useRef(null);

  function applyPreset(preset) {
    const newFields = Object.fromEntries(
      Object.entries(preset.measurements).map(([k, mm]) => [k, mmToCm(k, mm)]),
    );
    setFields(newFields);
    setErrors({});
    setSelectedPresetId(preset.id);
    setShowPresetPicker(false);
    setConfirmPreset(null);
  }

  function handlePresetSelect(preset) {
    const hasEdits = Object.values(fields).some((v) => v !== "");
    if (hasEdits && preset.id !== selectedPresetId) {
      setConfirmPreset(preset);
    } else {
      applyPreset(preset);
    }
  }

  function handleFieldChange(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  }

  function handleFieldBlur(key, value) {
    const err = validateField(key, value, t);
    setErrors((prev) => ({ ...prev, [key]: err }));
  }

  const hasValidationErrors = Object.values(errors).some(Boolean);
  const nameBlank = name.trim() === "";
  const saveDisabled = nameBlank || hasValidationErrors;

  const selectedPreset = selectedPresetId
    ? measurementPresets.find((p) => p.id === selectedPresetId)
    : null;

  function handleSave() {
    const newErrors = {};
    let anyError = false;
    for (const key of ALL_KEYS) {
      const val = fields[key];
      if (val === undefined || val === "") continue;
      const err = validateField(key, val, t);
      if (err) {
        newErrors[key] = err;
        anyError = true;
      }
    }
    if (anyError) {
      setErrors(newErrors);
      return;
    }

    const measurements = {};
    for (const key of ALL_KEYS) {
      const val = fields[key];
      if (val === undefined || val === "") continue;
      const mm = cmToMm(key, val);
      if (mm !== null) measurements[key] = mm;
    }

    if (isNew) {
      if (createdProfileIdRef.current === null) {
        const newProfile = addProfile(name.trim());
        createdProfileIdRef.current = newProfile.id;
        updateProfile(newProfile.id, { gender, measurements });
      } else {
        updateProfile(createdProfileIdRef.current, {
          name: name.trim(),
          gender,
          measurements,
        });
      }
    } else {
      updateProfile(profile.id, { name: name.trim(), gender, measurements });
    }

    if (Object.keys(measurements).length === 0) {
      setEmptyPrompt(true);
    } else {
      navigate("profiles");
    }
  }

  function toggleGroup(group) {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  return (
    <div className="relative h-full flex flex-col bg-primary-800">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-4 flex-shrink-0">
        <button
          onClick={() => navigate("profiles")}
          className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3"
        >
          ←
        </button>
        <div>
          <h2 className="font-semibold text-primary-100 text-base">
            {isNew
              ? t("profileEditor.newTitle")
              : t("profileEditor.editTitle", { name: profile.name })}
          </h2>
          <p className="text-[11px] text-primary-300 mt-0.5">
            {t("profileEditor.subtitle")}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
        {/* Name input */}
        <div className="bg-primary-100 rounded-3xl px-4 py-4">
          <label className="block text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-2">
            {t("profileEditor.profileName")}
          </label>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("profileEditor.namePlaceholder")}
            className="w-full bg-primary-50 border border-primary-200 rounded-xl px-3 py-2.5 text-sm text-primary-900 placeholder-primary-400 focus:outline-none focus:border-secondary-400"
          />
          {nameBlank && name !== "" && (
            <p className="text-red-500 text-[11px] mt-1">
              {t("profileEditor.nameBlank")}
            </p>
          )}
        </div>

        {/* Gender */}
        <div className="bg-primary-100 rounded-3xl px-4 py-4">
          <label className="block text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-3">
            {t("profileEditor.gender")}
          </label>
          <div className="flex gap-2">
            {[
              { value: "female", label: t("profileEditor.female") },
              { value: "male", label: t("profileEditor.male") },
              { value: "nonbinary", label: t("profileEditor.nonbinary") },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setGender((g) => (g === value ? null : value))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  gender === value
                    ? "bg-secondary-300 text-secondary-900 border-secondary-400"
                    : "bg-primary-50 text-primary-600 border-primary-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Preset picker */}
        <div className="bg-primary-100 rounded-3xl px-4 py-4">
          <label className="block text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-2">
            {t("profileEditor.startFromPreset")}
          </label>
          <button
            onClick={() => setShowPresetPicker((v) => !v)}
            className="w-full flex items-center justify-between bg-primary-50 border border-primary-200 rounded-xl px-3 py-2.5 text-sm text-primary-900 active:scale-[0.98] transition-transform"
          >
            <span
              className={
                selectedPreset ? "text-primary-900" : "text-primary-400"
              }
            >
              {selectedPreset
                ? tl(selectedPreset.label)
                : t("profileEditor.presetNone")}
            </span>
            <span className="text-primary-400">
              {showPresetPicker ? "▲" : "▼"}
            </span>
          </button>

          {showPresetPicker && (
            <div className="mt-2 bg-white rounded-2xl border border-primary-200 overflow-hidden shadow-md max-h-64 overflow-y-auto">
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">
                  {t("profileEditor.womenSizes")}
                </p>
              </div>
              {femalePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    selectedPresetId === preset.id
                      ? "bg-secondary-100 text-secondary-800 font-medium"
                      : "text-primary-800 hover:bg-primary-50"
                  }`}
                >
                  {tl(preset.label)}
                </button>
              ))}
              <div className="px-3 pt-3 pb-1 border-t border-primary-100">
                <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">
                  {t("profileEditor.menSizes")}
                </p>
              </div>
              {malePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    selectedPresetId === preset.id
                      ? "bg-secondary-100 text-secondary-800 font-medium"
                      : "text-primary-800 hover:bg-primary-50"
                  }`}
                >
                  {tl(preset.label)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Measurement groups */}
        {Object.entries(MEASUREMENT_GROUPS).map(([group, keys]) => (
          <div
            key={group}
            className="bg-primary-100 rounded-3xl overflow-hidden"
          >
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-primary-800">
                {t(`measurementGroups.${group}`)}
              </span>
              <span className="text-primary-400 text-xs">
                {collapsed[group]
                  ? t("profileEditor.showGroup")
                  : t("profileEditor.hideGroup")}
              </span>
            </button>

            {!collapsed[group] && (
              <div className="px-4 pb-4 space-y-3 border-t border-primary-200 pt-3">
                {keys.map((key) => {
                  const unit = unitLabel(key);
                  const presetMm = selectedPreset?.measurements?.[key];
                  const placeholder =
                    presetMm !== undefined ? mmToCm(key, presetMm) : "";
                  const error = errors[key];

                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2">
                        <label className="text-[12px] text-primary-600 flex-1 min-w-0 truncate">
                          {humanise(key, t)}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            value={fields[key] ?? ""}
                            placeholder={placeholder}
                            onChange={(e) =>
                              handleFieldChange(key, e.target.value)
                            }
                            onBlur={(e) => handleFieldBlur(key, e.target.value)}
                            className={`w-20 text-right bg-primary-50 border rounded-lg px-2 py-1.5 text-sm text-primary-900 placeholder-primary-300 focus:outline-none ${
                              error
                                ? "border-red-400 focus:border-red-500"
                                : "border-primary-200 focus:border-secondary-400"
                            }`}
                          />
                          <span className="text-[11px] text-primary-400 w-6">
                            {unit}
                          </span>
                        </div>
                      </div>
                      {error && (
                        <p className="text-red-500 text-[11px] mt-0.5 text-right pr-7">
                          {error}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="px-5 pb-6 pt-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveDisabled}
          className={`w-full font-semibold text-sm py-3 rounded-2xl shadow-sm transition-all ${
            saveDisabled
              ? "bg-secondary-300 text-secondary-900 opacity-40 cursor-not-allowed"
              : "bg-secondary-300 text-secondary-900 active:scale-[0.98]"
          }`}
        >
          {isNew
            ? t("profileEditor.createProfile")
            : t("profileEditor.saveChanges")}
        </button>
        {nameBlank && (
          <p className="text-center text-[11px] text-primary-400 mt-2">
            {t("profileEditor.enterName")}
          </p>
        )}
        {!nameBlank && hasValidationErrors && (
          <p className="text-center text-[11px] text-red-400 mt-2">
            {t("profileEditor.fixFields")}
          </p>
        )}
      </div>

      {/* Confirm preset replacement dialog */}
      {confirmPreset && (
        <div
          className="absolute inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={() => setConfirmPreset(null)}
        >
          <div
            className="bg-white rounded-t-3xl w-full px-6 pt-6 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-primary-900 text-base mb-1">
              {t("profileEditor.replaceTitle")}
            </h3>
            <p className="text-primary-500 text-sm mb-6">
              {t("profileEditor.replaceBody", {
                label: tl(confirmPreset.label),
              })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmPreset(null)}
                className="flex-1 py-2.5 rounded-xl border border-primary-200 text-primary-700 text-sm font-medium"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => applyPreset(confirmPreset)}
                className="flex-1 py-2.5 rounded-xl bg-secondary-300 text-secondary-900 text-sm font-semibold"
              >
                {t("common.replace")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty-profile post-save prompt */}
      {emptyPrompt && (
        <div
          className="absolute inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={() => {
            setEmptyPrompt(false);
            navigate("profiles");
          }}
        >
          <div
            className="bg-white rounded-t-3xl w-full px-6 pt-6 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-primary-900 text-base mb-1">
              {t("profileEditor.emptyTitle")}
            </h3>
            <p className="text-primary-500 text-sm mb-6">
              {t("profileEditor.emptyBody")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEmptyPrompt(false);
                  navigate("profiles");
                }}
                className="flex-1 py-2.5 rounded-xl border border-primary-200 text-primary-700 text-sm font-medium"
              >
                {t("profileEditor.later")}
              </button>
              <button
                onClick={() => setEmptyPrompt(false)}
                className="flex-1 py-2.5 rounded-xl bg-secondary-300 text-secondary-900 text-sm font-semibold"
              >
                {t("profileEditor.addNow")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
