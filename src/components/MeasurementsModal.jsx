import { useState, useEffect } from "react";
import { templates } from "../data/templates";
import patternMeasurements, {
  measurementGroup,
} from "../data/patternMeasurements";
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

export default function MeasurementsModal({
  open,
  onClose,
  templateId,
  profiles,
  activeProfile,
  sessionProfileOverride,
  setSessionProfileOverride,
  updateProfile,
}) {
  const template = templates[templateId];
  const effectiveProfile = sessionProfileOverride ?? activeProfile ?? null;
  const requiredKeys =
    patternMeasurements[templateId]?.requiredMeasurements ?? [];
  const missingKeys = effectiveProfile
    ? requiredKeys.filter((k) => effectiveProfile.measurements?.[k] == null)
    : requiredKeys;

  const [measFields, setMeasFields] = useState({});
  const [measErrors, setMeasErrors] = useState({});
  const [measSaveToProfile, setMeasSaveToProfile] = useState(true);
  const [showMeasPresetPicker, setShowMeasPresetPicker] = useState(false);
  const [measPresetId, setMeasPresetId] = useState(null);
  const [showMeasProfilePicker, setShowMeasProfilePicker] = useState(false);

  // Reset fields whenever modal opens
  useEffect(() => {
    if (open) {
      setMeasFields({});
      setMeasErrors({});
    }
  }, [open]);

  if (!open) return null;

  function applyMeasPreset(preset) {
    setMeasFields((prev) => {
      const next = { ...prev };
      for (const k of missingKeys) {
        const mm = preset.measurements[k];
        if (mm != null) next[k] = mmToCm(k, mm);
      }
      return next;
    });
    setMeasErrors({});
    setMeasPresetId(preset.id);
    setShowMeasPresetPicker(false);
  }

  function handleMeasProfileSwitch(profile) {
    setSessionProfileOverride?.(profile);
    setShowMeasProfilePicker(false);
    setMeasFields({});
    setMeasErrors({});
  }

  function groupedMissingKeys() {
    const ep = sessionProfileOverride ?? activeProfile ?? null;
    const missing = ep
      ? requiredKeys.filter((k) => ep.measurements?.[k] == null)
      : requiredKeys;
    const grouped = {};
    for (const k of missing) {
      const group = measurementGroup[k] ?? "Other";
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(k);
    }
    return grouped;
  }

  function measStillMissing() {
    const grouped = groupedMissingKeys();
    const allKeys = Object.values(grouped).flat();
    return allKeys.filter((k) => {
      const v = measFields[k];
      return !v || !!validateField(k, v);
    });
  }

  function handleMeasConfirm() {
    const newErrors = {};
    let anyError = false;
    for (const [k, v] of Object.entries(measFields)) {
      if (!v) continue;
      const err = validateField(k, v);
      if (err) {
        newErrors[k] = err;
        anyError = true;
      }
    }
    if (anyError) {
      setMeasErrors(newErrors);
      return;
    }

    const ep = sessionProfileOverride ?? activeProfile ?? null;
    if (measSaveToProfile && ep) {
      const newMm = {};
      for (const [k, v] of Object.entries(measFields)) {
        if (!v) continue;
        const mm = cmToMm(k, v);
        if (mm != null) newMm[k] = mm;
      }
      if (Object.keys(newMm).length > 0) {
        updateProfile?.(ep.id, {
          measurements: { ...(ep.measurements ?? {}), ...newMm },
        });
      }
    }
    onClose();
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-t-3xl flex flex-col max-h-[90%]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 flex-shrink-0">
          <h3 className="font-bold text-primary-900 text-base">
            {measStillMissing().length === 0
              ? "Measurements look good"
              : "Measurements needed"}
          </h3>
          <p className="text-xs text-primary-500 mt-0.5">{template?.name}</p>
        </div>

        {/* Profile + preset chips */}
        <div className="px-5 pb-3 flex-shrink-0 relative flex items-center gap-2 flex-wrap">
          {/* Profile chip */}
          <button
            onClick={() => {
              setShowMeasProfilePicker((v) => !v);
              setShowMeasPresetPicker(false);
            }}
            className="flex items-center gap-2 bg-primary-100 border border-primary-200 rounded-full px-3 py-1.5 text-sm font-medium text-primary-800"
          >
            <span>👤</span>
            <span>
              {(sessionProfileOverride ?? activeProfile)?.name ?? "No profile"}
            </span>
            <span className="text-primary-400 text-xs">▾</span>
          </button>

          {/* Preset chip — only when there are fields to fill */}
          {Object.keys(groupedMissingKeys()).length > 0 && (
            <button
              onClick={() => {
                setShowMeasPresetPicker((v) => !v);
                setShowMeasProfilePicker(false);
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border ${
                measPresetId
                  ? "bg-green-50 border-green-300 text-green-800"
                  : "bg-primary-100 border-primary-200 text-primary-800"
              }`}
            >
              <span>📐</span>
              <span>
                {measPresetId
                  ? (measurementPresets.find((p) => p.id === measPresetId)
                      ?.label ?? "Size preset")
                  : "Start from size"}
              </span>
              <span className="text-primary-400 text-xs">▾</span>
            </button>
          )}

          {/* Profile dropdown */}
          {showMeasProfilePicker && (
            <div className="absolute left-5 top-full mt-1 bg-white border border-primary-200 rounded-2xl shadow-lg z-20 min-w-[200px] overflow-hidden">
              <button
                onClick={() => handleMeasProfileSwitch(null)}
                className={`w-full text-left px-4 py-3 text-sm ${!(sessionProfileOverride ?? activeProfile) ? "font-bold text-primary-900 bg-primary-50" : "text-primary-700"}`}
              >
                No profile
              </button>
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleMeasProfileSwitch(p)}
                  className={`w-full text-left px-4 py-3 text-sm border-t border-primary-100 ${(sessionProfileOverride ?? activeProfile)?.id === p.id ? "font-bold text-primary-900 bg-primary-50" : "text-primary-700"}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Preset dropdown */}
          {showMeasPresetPicker && (
            <div className="absolute left-5 top-full mt-1 bg-white border border-primary-200 rounded-2xl shadow-lg z-20 min-w-[220px] max-h-72 overflow-y-auto">
              <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-primary-400 uppercase tracking-wide">
                Women's
              </p>
              {femalePresets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyMeasPreset(p)}
                  className={`w-full text-left px-4 py-2.5 text-sm ${measPresetId === p.id ? "font-bold text-green-800 bg-green-50" : "text-primary-700"}`}
                >
                  {p.label}
                </button>
              ))}
              <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-primary-400 uppercase tracking-wide border-t border-primary-100">
                Men's
              </p>
              {malePresets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyMeasPreset(p)}
                  className={`w-full text-left px-4 py-2.5 text-sm ${measPresetId === p.id ? "font-bold text-green-800 bg-green-50" : "text-primary-700"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Missing measurement fields (scrollable) */}
        {Object.keys(groupedMissingKeys()).length > 0 && (
          <div
            className="flex-1 overflow-y-auto px-5 pb-2"
            style={{ maxHeight: "60vh" }}
          >
            {Object.entries(groupedMissingKeys()).map(([group, keys]) => (
              <div key={group} className="mb-4">
                <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wide mb-2">
                  {group}
                </p>
                <div className="space-y-2">
                  {keys.map((k) => (
                    <div key={k}>
                      <label className="text-xs font-medium text-primary-700 mb-1 block">
                        {humanise(k)}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.1"
                          value={measFields[k] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMeasFields((prev) => ({ ...prev, [k]: v }));
                            if (measErrors[k])
                              setMeasErrors((prev) => ({
                                ...prev,
                                [k]: null,
                              }));
                          }}
                          onBlur={(e) => {
                            const err = validateField(k, e.target.value);
                            setMeasErrors((prev) => ({
                              ...prev,
                              [k]: err,
                            }));
                          }}
                          placeholder="0.0"
                          className={`flex-1 h-9 px-3 rounded-xl border text-sm bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 ${measErrors[k] ? "border-red-400" : "border-primary-200"}`}
                        />
                        <span className="text-xs text-primary-500 w-7 text-right">
                          {unitLabel(k)}
                        </span>
                      </div>
                      {measErrors[k] && (
                        <p className="text-red-500 text-[11px] mt-0.5">
                          {measErrors[k]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Save-to-profile toggle */}
        {(sessionProfileOverride ?? activeProfile) &&
          Object.keys(groupedMissingKeys()).length > 0 && (
            <div className="px-5 py-3 flex items-center gap-3 border-t border-primary-100 flex-shrink-0">
              <button
                onClick={() => setMeasSaveToProfile((v) => !v)}
                className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${measSaveToProfile ? "bg-green-600" : "bg-gray-300"}`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${measSaveToProfile ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
              <span className="text-sm text-primary-700">
                Save to "{(sessionProfileOverride ?? activeProfile).name}"
              </span>
            </div>
          )}

        {/* Buttons */}
        <div className="px-5 pt-3 pb-5 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-2xl border border-primary-200 text-primary-700 text-sm font-semibold"
          >
            Skip
          </button>
          <button
            onClick={handleMeasConfirm}
            className="flex-1 h-11 rounded-2xl bg-green-700 text-white text-sm font-semibold disabled:opacity-50"
            disabled={Object.values(measErrors).some(Boolean)}
          >
            {measStillMissing().length === 0 ? "Confirm" : "Continue anyway"}
          </button>
        </div>
      </div>
    </div>
  );
}
