import { useState, useEffect, useMemo } from "react";
import { templates } from "../data/templates";
import { mockAnalysis } from "../data/mockAnalysis";
import { generatePreview } from "../services/previewGeneration";
import patternMeasurements, {
  MEASUREMENT_GROUPS,
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
import { interpolatePatternArea } from "../services/feasibility";

export default function TemplateSelectScreen({
  navigate,
  feasibleTemplates,
  fabric,
  measurements,
  activeProfile,
  sessionProfileOverride,
  setSessionProfileOverride,
  profiles = [],
  updateProfile,
}) {
  // Build a feasibility lookup so we can sort feasible templates first.
  const feasibilityById = useMemo(
    () => Object.fromEntries((feasibleTemplates ?? []).map((r) => [r.id, r])),
    [feasibleTemplates],
  );

  const profileFeasibility = useMemo(() => {
    const ep = sessionProfileOverride ?? activeProfile ?? null;

    // No profile or no garment measurement → use original results unchanged
    if (!ep || !measurements?.totalAreaCm2) return feasibilityById;

    const chest_mm = ep.measurements?.chest;
    if (!chest_mm) return feasibilityById;

    // Re-score each template with profile-adjusted piece area
    const rescored = { ...feasibilityById };
    for (const [id, original] of Object.entries(feasibilityById)) {
      // Fabric incompatibility cannot be fixed by area re-scoring — keep original
      if (
        original.failReason === "fabric" ||
        original.failReason === "piece_fit"
      )
        continue;

      const interpolatedArea = interpolatePatternArea(id, chest_mm);
      if (interpolatedArea === null) continue; // no data → keep original

      const feasible = interpolatedArea * 1.1 <= measurements.totalAreaCm2;
      const usedAreaPct = Math.round(
        (interpolatedArea / measurements.totalAreaCm2) * 100,
      );

      // Compute a proper compositeScore so re-scored feasible items sort correctly.
      // Stage 2 (bounding-box fit) not re-run — assumes pieces fit if area fits.
      const reuseScore = Math.min(usedAreaPct / 100, 1);
      const compositeScore = feasible ? 0.5 * 1 + 0.5 * reuseScore : 0;

      rescored[id] = {
        ...original,
        feasible,
        usedAreaPct,
        compositeScore,
        fitScore: compositeScore,
        failReason: feasible ? null : "area",
      };
    }
    return rescored;
  }, [feasibilityById, activeProfile, sessionProfileOverride, measurements]);

  const items = useMemo(() => {
    const sorted = Object.values(templates)
      .slice()
      .sort((a, b) => {
        const fa = profileFeasibility[a.id];
        const fb = profileFeasibility[b.id];

        // Four-tier: feasible(0) → needs-interfacing(0.5) → no-data/accessories(1) → infeasible(2)
        const tierA = !fa
          ? 1
          : !fa.feasible
            ? 2
            : fa.needsInterfacing
              ? 0.5
              : 0;
        const tierB = !fb
          ? 1
          : !fb.feasible
            ? 2
            : fb.needsInterfacing
              ? 0.5
              : 0;

        if (tierA !== tierB) return tierA - tierB;
        return (
          (fb.compositeScore ?? fb.fitScore ?? 0) -
          (fa.compositeScore ?? fa.fitScore ?? 0)
        );
      });
    console.log(
      "[TemplateSelect] sorted order:",
      sorted.map((t) => {
        const f = profileFeasibility[t.id];
        const tier = !f ? 1 : !f.feasible ? 2 : f.needsInterfacing ? 0.5 : 0;
        return `${t.id}(tier=${tier},score=${(f?.compositeScore ?? 0).toFixed(2)},feasible=${f?.feasible})`;
      }),
    );
    return sorted;
  }, [profileFeasibility]);

  const [previews, setPreviews] = useState({});
  const [showAllGenders, setShowAllGenders] = useState(false);

  // Derive profile gender — non-binary and no-profile both mean show all
  const profileGender = useMemo(() => {
    const ep = sessionProfileOverride ?? activeProfile ?? null;
    return ep?.gender ?? null; // "female" | "male" | "nonbinary" | null
  }, [sessionProfileOverride, activeProfile]);

  // Apply gender filter on top of the sorted items
  const visibleItems = useMemo(() => {
    // No filtering when toggled off, no profile, or profile is non-binary
    if (showAllGenders || !profileGender || profileGender === "nonbinary") {
      return items;
    }
    return items.filter(
      (t) => t.forGender === "any" || t.forGender === profileGender,
    );
  }, [items, showAllGenders, profileGender]);

  // ── Measurements modal state ────────────────────────────────────────────
  // modalTemplate: the template object the user tapped; null = modal closed
  const [modalTemplate, setModalTemplate] = useState(null);
  // Extra fields entered in the modal: key → cm string
  const [modalFields, setModalFields] = useState({});
  const [modalErrors, setModalErrors] = useState({});
  const [saveToProfile, setSaveToProfile] = useState(true);
  // Whether the profile-switcher dropdown is open
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  // Preset picker inside the modal
  const [showModalPresetPicker, setShowModalPresetPicker] = useState(false);
  const [modalSelectedPresetId, setModalSelectedPresetId] = useState(null);

  // Derived: which profile is in effect for the modal
  function effectiveProfile() {
    return sessionProfileOverride ?? activeProfile ?? null;
  }

  // Missing keys for the currently selected template + effective profile
  function missingKeys(template, profile) {
    if (!template) return [];
    const required =
      patternMeasurements[template.id]?.requiredMeasurements ?? [];
    if (!profile) return required;
    return required.filter((k) => profile.measurements?.[k] == null);
  }

  // Tap a template card
  function handleCardTap(template) {
    const ep = effectiveProfile();
    const missing = missingKeys(template, ep);

    if (ep && missing.length === 0) {
      // All good — navigate immediately
      navigate("patternLayout", { template: template.id });
      return;
    }

    // Need the modal — pre-fill fields from the effective profile's missing keys
    const prefill = {};
    if (ep) {
      for (const k of missing) {
        prefill[k] = "";
      }
    }
    setModalTemplate(template);
    setModalFields(prefill);
    setModalErrors({});
    setSaveToProfile(true);
    setShowProfilePicker(false);
    setShowModalPresetPicker(false);
    setModalSelectedPresetId(null);
  }

  // Re-diff when the session profile changes inside the modal
  function handleProfileSwitch(profile) {
    setSessionProfileOverride(profile);
    setShowProfilePicker(false);
    if (!modalTemplate) return;
    const missing = missingKeys(modalTemplate, profile);
    const prefill = {};
    for (const k of missing) {
      prefill[k] = modalFields[k] ?? "";
    }
    setModalFields(prefill);
    setModalErrors({});
  }

  // Apply a size preset to all currently-shown modal fields
  function applyModalPreset(preset) {
    if (!modalTemplate) return;
    const required =
      patternMeasurements[modalTemplate.id]?.requiredMeasurements ?? [];
    const ep = effectiveProfile();
    // Fill every missing key that we're showing in the modal
    const missing = missingKeys(modalTemplate, ep);
    setModalFields((prev) => {
      const next = { ...prev };
      for (const k of missing) {
        const mm = preset.measurements[k];
        if (mm != null) next[k] = mmToCm(k, mm);
      }
      return next;
    });
    setModalErrors({});
    setModalSelectedPresetId(preset.id);
    setShowModalPresetPicker(false);
  }

  function handleModalFieldChange(key, value) {
    setModalFields((prev) => ({ ...prev, [key]: value }));
    if (modalErrors[key]) setModalErrors((prev) => ({ ...prev, [key]: null }));
  }

  function handleModalFieldBlur(key, value) {
    const err = validateField(key, value);
    setModalErrors((prev) => ({ ...prev, [key]: err }));
  }

  // All modal fields that have been entered and are valid
  function validModalMeasurements() {
    const result = {};
    for (const [k, v] of Object.entries(modalFields)) {
      if (v === "" || v === undefined) continue;
      const err = validateField(k, v);
      if (!err) {
        const mm = cmToMm(k, v);
        if (mm != null) result[k] = mm;
      }
    }
    return result;
  }

  // Keys still empty / invalid after the user has filled things in the modal
  function stillMissingAfterModal() {
    const ep = effectiveProfile();
    return missingKeys(modalTemplate, ep).filter((k) => {
      const v = modalFields[k];
      return !v || !!validateField(k, v);
    });
  }

  function handleModalConfirm() {
    // Validate all modal fields first
    const newErrors = {};
    let anyError = false;
    for (const [k, v] of Object.entries(modalFields)) {
      if (!v) continue;
      const err = validateField(k, v);
      if (err) {
        newErrors[k] = err;
        anyError = true;
      }
    }
    if (anyError) {
      setModalErrors(newErrors);
      return;
    }

    const ep = effectiveProfile();
    const newMm = validModalMeasurements();

    // Optionally persist entered values back to profile
    if (saveToProfile && ep && Object.keys(newMm).length > 0) {
      updateProfile(ep.id, {
        measurements: { ...(ep.measurements ?? {}), ...newMm },
      });
    }

    navigate("patternLayout", { template: modalTemplate.id });
    setModalTemplate(null);
  }

  // Group missing keys by category for the modal form
  function groupedMissingKeys() {
    if (!modalTemplate) return {};
    const ep = effectiveProfile();
    const missing = missingKeys(modalTemplate, ep);
    const grouped = {};
    for (const k of missing) {
      const group = measurementGroup[k] ?? "Other";
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(k);
    }
    return grouped;
  }

  useEffect(() => {
    if (!fabric) return;
    let cancelled = false;
    // Generate previews one at a time to avoid rate-limiting the preview API
    (async () => {
      for (const template of items) {
        if (cancelled) break;
        const dataUrl = await generatePreview(fabric, template);
        if (dataUrl && !cancelled) {
          setPreviews((prev) => ({ ...prev, [template.id]: dataUrl }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fabric]);

  // Build a lookup for match scores and feasibility: prefer feasibleTemplates (pipeline), fall back to mockAnalysis.
  // Overlay profileFeasibility so badge rendering reflects profile-adjusted scores.
  const scoreSource = feasibleTemplates ?? mockAnalysis.recommendations;
  const recById = Object.fromEntries(
    scoreSource.map((rec) => [rec.id, profileFeasibility[rec.id] ?? rec]),
  );
  const scoreById = Object.fromEntries(
    Object.entries(recById).map(([id, rec]) => [
      id,
      rec.feasible !== undefined
        ? Math.round((rec.compositeScore ?? rec.fitScore ?? 0) * 100)
        : rec.matchScore,
    ]),
  );

  return (
    <div className="relative h-full flex flex-col bg-primary-800">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-2">
        <button
          onClick={() => navigate("analysis")}
          className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3"
        >
          ←
        </button>
        <div>
          <h2 className="font-semibold text-primary-100">
            Choose Upcycling Template
          </h2>
          <p className="text-[11px] text-primary-100 mt-0.5">
            Recommended based on AI analysis
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4 space-y-4">
        <p className="text-sm text-primary-100 leading-5">
          These templates suit your fabric. After selecting, AI will provide
          step-by-step guidance
        </p>

        {profileFeasibility !== feasibilityById && (
          <div className="mx-0 mb-1 px-3 py-2 bg-primary-700 border border-primary-600 rounded-xl flex items-center gap-2">
            <span className="text-sm">📐</span>
            <p className="text-xs text-primary-100">
              Results adjusted for your measurements
            </p>
          </div>
        )}

        {/* Gender filter toggle — only shown when profile has a binary gender */}
        {profileGender && profileGender !== "nonbinary" && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-primary-300">
              Showing{" "}
              {showAllGenders ? "all patterns" : `${profileGender} patterns`}
            </span>
            <button
              onClick={() => setShowAllGenders((v) => !v)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                showAllGenders
                  ? "bg-primary-600 border-primary-500 text-primary-100"
                  : "bg-secondary-200 border-secondary-300 text-secondary-900"
              }`}
            >
              {showAllGenders ? "Showing all" : "Show all patterns"}
            </button>
          </div>
        )}

        {visibleItems.map((template, idx) => {
          const rec = recById[template.id];
          const isFeasible = rec?.feasible ?? true;
          const needsInterfacing = rec?.needsInterfacing ?? false;
          const isCleanTop = idx === 0 && isFeasible && !needsInterfacing;
          const matchScore = scoreById[template.id] ?? template.matchScore;
          const failReason = !isFeasible
            ? rec?.failReason === "area"
              ? "Not enough fabric area for this pattern"
              : rec?.failReason === "piece_fit"
                ? "Some pieces are too large to fit on your garment"
                : rec?.failReason === "fabric"
                  ? (rec.fabricNote ??
                    "Fabric type is not compatible with this pattern")
                  : rec?.failReason
                    ? "Not feasible with this garment"
                    : "Not enough fabric area for this pattern"
            : null;
          return (
            <div
              key={template.id}
              onClick={() => handleCardTap(template)}
              className={`bg-primary-100 rounded-3xl overflow-hidden border-2 cursor-pointer active:scale-[0.98] transition-transform ${
                isCleanTop
                  ? "border-secondary-300"
                  : !isFeasible
                    ? "border-red-200 opacity-60"
                    : needsInterfacing
                      ? "border-amber-300"
                      : "border-primary-200"
              }`}
            >
              {/* Card header */}
              <div
                className={`px-5 pt-5 pb-4 ${isCleanTop ? "bg-primary-50" : ""}`}
              >
                {isCleanTop && (
                  <span className="inline-block bg-secondary-200 text-secondary-800 text-[11px] font-bold px-2.5 py-1 rounded-full mb-3">
                    ✨ AI Top Recommendation
                  </span>
                )}
                {needsInterfacing && (
                  <span className="inline-block bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-full mb-3">
                    ⚠️ Needs interfacing
                  </span>
                )}
                {!isFeasible && (
                  <span className="inline-block bg-red-100 text-red-700 text-[11px] font-bold px-2.5 py-1 rounded-full mb-3">
                    ✕ Not feasible
                  </span>
                )}
                {failReason && (
                  <p className="text-red-600 text-[11px] leading-4 mb-3">
                    {failReason}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden ${template.accentColor}`}
                  >
                    {previews[template.id] ? (
                      <img
                        src={previews[template.id]}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : template.resultImage ? (
                      <img
                        src={template.resultImage}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl flex items-center justify-center w-full h-full">
                        {template.emoji}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-primary-900 text-lg">
                        {template.name}
                      </h3>
                      <span
                        className={`text-sm font-bold ${matchScore >= 85 ? "text-primary-800" : "text-secondary-600"}`}
                      >
                        {matchScore}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-primary-500">
                      <span>⏱ {template.time}</span>
                      <span>
                        {"★".repeat(template.difficulty)}
                        {"☆".repeat(
                          template.maxDifficulty - template.difficulty,
                        )}{" "}
                        {template.difficultyLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match bar */}
              <div className="px-5">
                <div className="h-1.5 bg-primary-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      !isFeasible
                        ? "bg-red-400"
                        : needsInterfacing
                          ? "bg-amber-400"
                          : "bg-primary-500"
                    }`}
                    style={{ width: `${matchScore}%` }}
                  />
                </div>
              </div>

              {/* Fabric usage */}
              {rec?.usedAreaPct != null && (
                <div className="px-5 pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-primary-500">
                      Fabric used
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        !isFeasible
                          ? "text-red-500"
                          : rec.usedAreaPct > 90
                            ? "text-amber-600"
                            : "text-primary-700"
                      }`}
                    >
                      {Math.min(Math.round(rec.usedAreaPct), 100)}%
                    </span>
                  </div>
                  <div className="h-1 bg-primary-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        !isFeasible
                          ? "bg-red-300"
                          : rec.usedAreaPct > 90
                            ? "bg-amber-400"
                            : "bg-primary-400"
                      }`}
                      style={{
                        width: `${Math.min(Math.round(rec.usedAreaPct), 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Description & meta */}
              <div className="px-5 pt-3 pb-4">
                <p className="text-primary-700 text-sm leading-5 mb-3">
                  {template.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-primary-500">
                    <span>{template.steps.length} steps</span>
                    <span>·</span>
                    <span>{template.materials.length} materials</span>
                  </div>
                  <span className="text-primary-700 text-sm font-semibold">
                    Start Making →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Measurements modal ───────────────────────────────────────────── */}
      {modalTemplate && (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalTemplate(null);
            setShowProfilePicker(false);
            setShowModalPresetPicker(false);
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
                {stillMissingAfterModal().length === 0 && effectiveProfile()
                  ? "Measurements look good"
                  : "Measurements needed"}
              </h3>
              <p className="text-xs text-primary-500 mt-0.5">
                {modalTemplate.name}
              </p>
            </div>

            {/* Profile switcher chip + preset picker */}
            <div className="px-5 pb-3 flex-shrink-0 relative flex items-center gap-2 flex-wrap">
              {/* Profile chip */}
              <button
                onClick={() => {
                  setShowProfilePicker((v) => !v);
                  setShowModalPresetPicker(false);
                }}
                className="flex items-center gap-2 bg-primary-100 border border-primary-200 rounded-full px-3 py-1.5 text-sm font-medium text-primary-800"
              >
                <span className="text-base">👤</span>
                <span>{effectiveProfile()?.name ?? "No profile"}</span>
                <span className="text-primary-400 text-xs">▾</span>
              </button>

              {/* Size preset chip */}
              {Object.keys(groupedMissingKeys()).length > 0 && (
                <button
                  onClick={() => {
                    setShowModalPresetPicker((v) => !v);
                    setShowProfilePicker(false);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border ${
                    modalSelectedPresetId
                      ? "bg-green-50 border-green-300 text-green-800"
                      : "bg-primary-100 border-primary-200 text-primary-800"
                  }`}
                >
                  <span className="text-base">📐</span>
                  <span>
                    {modalSelectedPresetId
                      ? (measurementPresets.find(
                          (p) => p.id === modalSelectedPresetId,
                        )?.label ?? "Size preset")
                      : "Start from size"}
                  </span>
                  <span className="text-primary-400 text-xs">▾</span>
                </button>
              )}

              {/* Profile dropdown */}
              {showProfilePicker && (
                <div className="absolute left-5 top-full mt-1 bg-white border border-primary-200 rounded-2xl shadow-lg z-20 min-w-[200px] overflow-hidden">
                  <button
                    onClick={() => handleProfileSwitch(null)}
                    className={`w-full text-left px-4 py-3 text-sm ${
                      !effectiveProfile()
                        ? "font-bold text-primary-900 bg-primary-50"
                        : "text-primary-700"
                    }`}
                  >
                    No profile
                  </button>
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProfileSwitch(p)}
                      className={`w-full text-left px-4 py-3 text-sm border-t border-primary-100 ${
                        effectiveProfile()?.id === p.id
                          ? "font-bold text-primary-900 bg-primary-50"
                          : "text-primary-700"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Preset dropdown */}
              {showModalPresetPicker && (
                <div className="absolute left-5 top-full mt-1 bg-white border border-primary-200 rounded-2xl shadow-lg z-20 min-w-[220px] max-h-72 overflow-y-auto">
                  <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-primary-400 uppercase tracking-wide">
                    Women's
                  </p>
                  {femalePresets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyModalPreset(p)}
                      className={`w-full text-left px-4 py-2.5 text-sm ${
                        modalSelectedPresetId === p.id
                          ? "font-bold text-green-800 bg-green-50"
                          : "text-primary-700"
                      }`}
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
                      onClick={() => applyModalPreset(p)}
                      className={`w-full text-left px-4 py-2.5 text-sm ${
                        modalSelectedPresetId === p.id
                          ? "font-bold text-green-800 bg-green-50"
                          : "text-primary-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Missing fields (scrollable) */}
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
                              value={modalFields[k] ?? ""}
                              onChange={(e) =>
                                handleModalFieldChange(k, e.target.value)
                              }
                              onBlur={(e) =>
                                handleModalFieldBlur(k, e.target.value)
                              }
                              placeholder="0.0"
                              className={`flex-1 h-9 px-3 rounded-xl border text-sm bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                modalErrors[k]
                                  ? "border-red-400"
                                  : "border-primary-200"
                              }`}
                            />
                            <span className="text-xs text-primary-500 w-7 text-right">
                              {unitLabel(k)}
                            </span>
                          </div>
                          {modalErrors[k] && (
                            <p className="text-red-500 text-[11px] mt-0.5">
                              {modalErrors[k]}
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
            {effectiveProfile() && Object.keys(modalFields).length > 0 && (
              <div className="px-5 py-3 flex items-center gap-3 border-t border-primary-100 flex-shrink-0">
                <button
                  onClick={() => setSaveToProfile((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                    saveToProfile ? "bg-green-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${
                      saveToProfile ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm text-primary-700">
                  Save to "{effectiveProfile().name}"
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-5 pt-3 pb-5 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setModalTemplate(null)}
                className="flex-1 h-11 rounded-2xl border border-primary-200 text-primary-700 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleModalConfirm}
                className="flex-1 h-11 rounded-2xl bg-green-700 text-white text-sm font-semibold disabled:opacity-50"
                disabled={Object.values(modalErrors).some(Boolean)}
              >
                {stillMissingAfterModal().length === 0
                  ? "Generate pattern"
                  : "Continue anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
