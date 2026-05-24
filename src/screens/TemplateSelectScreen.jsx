import { useState, useEffect, useMemo, useRef } from "react";
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
import { interpolatePatternArea, rescoreByArea } from "../services/feasibility";
import { useLang } from "../i18n/LanguageContext";
import { levelByDifficulty } from "../data/skillLevels";

// Returns a normalized fabric-fit presentation object for a pattern card.
// Never returns null — templates without fabric preference data get an explicit
// "unknownPreference" state, keeping it visually distinct from a real good-fit result.
// TEMP: rawLabel/rawReason fields exist to support dev logging. Can be trimmed before production.
function getFabricFitPresentation(rec, t, tl) {
  const localizedReason = (value, fallback) => {
    if (value == null) return fallback;
    return typeof value === "string" ? value : tl(value);
  };

  const base = {
    score: rec?.fabricCompatibilityScore ?? null,
    rawLabel: rec?.fabricLabel ?? null,
    rawReason: rec?.fabricNote ?? rec?.fabricReason ?? null,
  };

  // 1. Area check failed and we still do not have enough fabric context
  //    to score compatibility for this template.
  if (rec?.failReason === "area" && rec?.fabricCompatibilityScore == null) {
    return {
      ...base,
      state: "notEvaluatedAreaFail",
      label: t("fabricLabel.notChecked"),
      reason: t("fabricReason.notCheckedBecauseAreaFailed"),
    };
  }
  // 2. Fabric itself is the blocker
  if (rec?.failReason === "fabric") {
    return {
      ...base,
      state: "notFeasibleFabric",
      label: rec?.fabricLabel ?? t("fabricLabel.poorFit"),
      reason: localizedReason(
        rec?.fabricNote ?? rec?.fabricReason,
        t("fabricReason.fabricRejected"),
      ),
    };
  }
  // 3. Piece fit failed — fabric was not evaluated
  if (rec?.failReason === "piece_fit") {
    return {
      ...base,
      state: "notFeasiblePieceFit",
      label: t("fabricLabel.notChecked"),
      reason: t("fabricReason.notCheckedBecausePieceFitFailed"),
    };
  }
  // 4. No fabric preference metadata for this template yet
  if (rec?.fabricCompatibilityScore == null) {
    return {
      ...base,
      state: "unknownPreference",
      label: t("fabricLabel.noPreferenceDefined"),
      reason: t("fabricReason.noPreferenceDefined"),
    };
  }
  // 5. Needs interfacing
  if (rec?.needsInterfacing) {
    return {
      ...base,
      state: "interfacing",
      label: rec?.fabricLabel ?? t("fabricLabel.couldWorkWithInterfacing"),
      reason: localizedReason(
        rec?.fabricNote ?? rec?.fabricReason,
        t("fabricReason.interfacingRecommended"),
      ),
    };
  }
  // 6. Good fit
  if (rec.fabricCompatibilityScore >= 0.85) {
    return {
      ...base,
      state: "good",
      label: rec?.fabricLabel ?? t("fabricLabel.goodFit"),
      reason: localizedReason(
        rec?.fabricNote ?? rec?.fabricReason,
        t("fabricReason.goodGeneral"),
      ),
    };
  }
  // 7. Could work but not ideal
  return {
    ...base,
    state: "couldWork",
    label: rec?.fabricLabel ?? t("fabricLabel.couldWork"),
    reason: localizedReason(
      rec?.fabricNote ?? rec?.fabricReason,
      t("fabricReason.couldWorkGeneral"),
    ),
  };
}

// Badge colour classes keyed by presentation state.
function fabricFitBadgeClass(state) {
  switch (state) {
    case "good":
      return "bg-green-100 text-green-800";
    case "interfacing":
      return "bg-amber-100 text-amber-800";
    case "couldWork":
      return "bg-amber-50 text-amber-700";
    case "notFeasibleFabric":
      return "bg-rose-100 text-rose-700";
    default:
      // unknownPreference / notEvaluatedAreaFail / notFeasiblePieceFit — neutral/subtle
      return "bg-primary-100 text-primary-400";
  }
}

export default function TemplateSelectScreen({
  navigate,
  feasibleTemplates,
  fabric,
  measurements,
  uploadedFile,
  activeProfile,
  sessionProfileOverride,
  setSessionProfileOverride,
  profiles = [],
  updateProfile,
}) {
  const { t, tl } = useLang();
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

    // Re-score each template with a profile-adjusted piece area.
    // rescoreByArea() handles the area/band/score logic consistently with
    // checkFeasibility() and preserves fabric fields from the original result.
    const rescored = { ...feasibilityById };
    for (const [id, original] of Object.entries(feasibilityById)) {
      const interpolatedArea = interpolatePatternArea(id, chest_mm);
      const updated = rescoreByArea(
        original,
        interpolatedArea,
        measurements.totalAreaCm2,
      );
      if (updated !== original) rescored[id] = updated;
    }
    return rescored;
  }, [feasibilityById, activeProfile, sessionProfileOverride, measurements]);

  const items = useMemo(() => {
    const sorted = Object.values(templates).sort((a, b) => {
      const fa = profileFeasibility[a.id];
      const fb = profileFeasibility[b.id];

      // Four-tier: feasible(0) → needs-interfacing(0.5) → no-data/accessories(1) → infeasible(2)
      const tierA = !fa ? 1 : !fa.feasible ? 2 : fa.needsInterfacing ? 0.5 : 0;
      const tierB = !fb ? 1 : !fb.feasible ? 2 : fb.needsInterfacing ? 0.5 : 0;

      if (tierA !== tierB) return tierA - tierB;
      return (
        (fb?.compositeScore ?? fb?.fitScore ?? 0) -
        (fa?.compositeScore ?? fa?.fitScore ?? 0)
      );
    });
    return sorted;
  }, [profileFeasibility]);

  // Returns true when a template belongs in the "Less suitable" section:
  //   • no feasibility data (accessories / no area info)
  //   • explicitly infeasible (any failReason)
  //   • feasible but fabricCompatibilityScore is significantly below par
  function isLowerSectionItem(rec) {
    if (!rec) return true;
    if (rec.feasible === false) return true;
    if (
      rec.fabricCompatibilityScore !== null &&
      rec.fabricCompatibilityScore < 0.65
    )
      return true;
    return false;
  }

  const [previews, setPreviews] = useState({});
  const [showAllGenders, setShowAllGenders] = useState(false);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [flippedCards, setFlippedCards] = useState({}); // [IMAGE-LAYOUT-C] per-card toggle state

  // Long-press to zoom preview image
  const [zoomImage, setZoomImage] = useState(null);
  const longPressTimer = useRef(null);
  const longPressed = useRef(false);
  const LONG_PRESS_MS = 400;

  function handleThumbnailPointerDown(src, e) {
    e.stopPropagation();
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setZoomImage(src);
    }, LONG_PRESS_MS);
  }
  function handleThumbnailPointerEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }
  function handleThumbnailClick(e) {
    if (longPressed.current) {
      e.stopPropagation();
      e.preventDefault();
      longPressed.current = false;
    }
  }

  // Derive profile gender — non-binary and no-profile both mean show all
  const profileGender = useMemo(() => {
    const ep = sessionProfileOverride ?? activeProfile ?? null;
    return ep?.gender ?? null; // "female" | "male" | "nonbinary" | null
  }, [sessionProfileOverride, activeProfile]);

  // Skill level filter: show templates up to the user's level.
  // beginner → difficulty 1, intermediate → 1-2, advanced → 1-3.
  // Can be overridden by the "Show all levels" toggle below.
  const profileSkillLevel = useMemo(() => {
    const ep = sessionProfileOverride ?? activeProfile ?? null;
    return ep?.skillLevel ?? null;
  }, [sessionProfileOverride, activeProfile]);
  const profileDifficulty =
    profileSkillLevel === "beginner"
      ? 1
      : profileSkillLevel === "intermediate"
        ? 2
        : profileSkillLevel === "advanced"
          ? 3
          : null;
  const skillFilterMaxDifficulty =
    showAllLevels || profileDifficulty == null || profileDifficulty >= 3
      ? null
      : profileDifficulty;
  const showSkillLevelToggle =
    profileDifficulty != null && profileDifficulty < 3;
  const visibleSkillLevelLabel =
    profileDifficulty === 1
      ? t("skillLevel.beginner")
      : profileDifficulty === 2
        ? `${t("skillLevel.beginner")} + ${t("skillLevel.intermediate")}`
        : t("templateSelect.showingAllLevels");

  // Apply gender + skillLevel filters on top of the sorted items.
  // AI previews are generated only for the top 3 by rank (see useEffect below).
  const visibleItems = useMemo(() => {
    let filtered = items;
    // Gender filter: no filtering when toggled off, no profile, or non-binary
    if (!showAllGenders && profileGender && profileGender !== "nonbinary") {
      filtered = filtered.filter(
        (t) => t.forGender === "any" || t.forGender === profileGender,
      );
    }
    // Skill level filter: include templates at or below the user's level.
    if (skillFilterMaxDifficulty != null) {
      filtered = filtered.filter(
        (t) => t.difficulty <= skillFilterMaxDifficulty,
      );
    }
    return filtered;
  }, [items, showAllGenders, profileGender, skillFilterMaxDifficulty]);

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
      // All good — navigate to patternLayout. Both regular and ar-tutorial
      // templates go through PatternLayoutScreen first; the latter renders a
      // pattern-reference view with a button to launch the AR tutorial.
      navigate("patternLayout", { template: template.id });
      return;
    }

    // Need the modal — pre-fill fields from the effective profile's missing keys.
    // When the profile has no body measurements yet, auto-apply a default size
    // preset so the user sees sensible starting values instead of an empty form.
    // Default: Women's 38 (or Men's 42 when profile gender is explicitly male).
    const prefill = {};
    let defaultPresetId = null;
    if (ep) {
      const hasNoMeasurements = Object.keys(ep.measurements ?? {}).length === 0;
      if (hasNoMeasurements) {
        const presetId =
          ep.gender === "male" ? "cisMaleAdult42" : "cisFemaleAdult38";
        const defaultPreset = measurementPresets.find((p) => p.id === presetId);
        if (defaultPreset) {
          defaultPresetId = presetId;
          for (const k of missing) {
            const mm = defaultPreset.measurements[k];
            prefill[k] = mm != null ? mmToCm(k, mm) : "";
          }
        }
      } else {
        for (const k of missing) {
          prefill[k] = "";
        }
      }
    }
    setModalTemplate(template);
    setModalFields(prefill);
    setModalErrors({});
    setSaveToProfile(true);
    setShowProfilePicker(false);
    setShowModalPresetPicker(false);
    setModalSelectedPresetId(defaultPresetId);
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

  // Track current previews via ref so the loop sees the latest state
  // without needing previews in the effect deps (which would cause restarts)
  const previewsRef = useRef(previews);
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    setPreviews({});
  }, [fabric, uploadedFile]);

  useEffect(() => {
    if (!fabric) return;
    const ac = new AbortController();
    (async () => {
      // Generate AI previews for the top 3 visible patterns (respects gender + skill filters).
      const previewTargets = visibleItems.slice(0, 3);
      for (const template of previewTargets) {
        if (ac.signal.aborted) break;
        // Skip if we already have a preview (from cache, prior HMR, or this run)
        if (previewsRef.current[template.id]) continue;
        const dataUrl = await generatePreview(
          fabric,
          template,
          uploadedFile,
          ac.signal,
        );
        if (dataUrl && !ac.signal.aborted) {
          setPreviews((prev) => ({ ...prev, [template.id]: dataUrl }));
        }
      }
    })();
    return () => ac.abort();
  }, [fabric, visibleItems, uploadedFile]);

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

  // Split the sorted list for section rendering.
  // firstWeakIdx is the index of the first item that belongs in the lower section;
  // -1 means all items are strong (no divider needed).
  const firstWeakIdx = visibleItems.findIndex((t) =>
    isLowerSectionItem(profileFeasibility[t.id]),
  );
  const hasWeakSection = firstWeakIdx !== -1;
  const hasStrongSection = hasWeakSection && firstWeakIdx > 0;

  const LINE_DRAWINGS = (id) => `/images/line_drawings/line_${id}.png`;

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
            {t("templateSelect.title")}
          </h2>
          <p className="text-[11px] text-primary-100 mt-0.5">
            {t("templateSelect.subtitle")}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4 space-y-4">
        {/* Info box */}
        <div className="bg-primary-100 rounded-2xl p-4">
          <p className="text-sm text-primary-800 leading-5 mb-3">
            {t("templateSelect.intro")}
          </p>
          <div className="flex items-center gap-1.5 text-[12px] text-primary-600">
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="20.5" y1="20.5" x2="16.5" y2="16.5" />
            </svg>
            <span>{t("templateSelect.longPressHint")}</span>
          </div>
        </div>

        {/* Gender filter toggle — only shown when profile has a binary gender */}
        {profileGender && profileGender !== "nonbinary" && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-primary-200">
              {showAllGenders
                ? t("templateSelect.showingAll")
                : t("templateSelect.showingFiltered", {
                    gender:
                      profileGender === "female"
                        ? t("templateSelect.genderFemale")
                        : profileGender === "male"
                          ? t("templateSelect.genderMale")
                          : profileGender,
                  })}
            </span>
            <button
              onClick={() => setShowAllGenders((v) => !v)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                showAllGenders
                  ? "bg-primary-600 border-primary-500 text-primary-100"
                  : "bg-secondary-200 border-secondary-300 text-secondary-900"
              }`}
            >
              {showAllGenders
                ? t("templateSelect.showingAll")
                : t("templateSelect.showAll")}
            </button>
          </div>
        )}

        {/* Skill level filter toggle */}
        {showSkillLevelToggle && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-primary-200">
              {showAllLevels
                ? t("templateSelect.showingAllLevels")
                : t("templateSelect.showingForLevel", {
                    level: visibleSkillLevelLabel,
                  })}
            </span>
            <button
              onClick={() => setShowAllLevels((v) => !v)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                showAllLevels
                  ? "bg-primary-600 border-primary-500 text-primary-100"
                  : "bg-secondary-200 border-secondary-300 text-secondary-900"
              }`}
            >
              {showAllLevels
                ? t("templateSelect.showingAllLevels")
                : t("templateSelect.showAllLevels")}
            </button>
          </div>
        )}

        {visibleItems.length === 0 && (
          <div className="bg-primary-100 rounded-3xl px-5 py-6 text-center">
            <p className="text-primary-700 text-sm">
              {t("templateSelect.noLevelMatches", {
                level: visibleSkillLevelLabel,
              })}
            </p>
            <button
              onClick={() => setShowAllLevels(true)}
              className="mt-3 inline-block bg-secondary-300 text-secondary-900 font-semibold text-xs px-4 py-2 rounded-full active:scale-95 transition-transform"
            >
              {t("templateSelect.showAllLevels")}
            </button>
          </div>
        )}

        {/* Section label — only when there are items on both sides of the divider */}
        {hasStrongSection && (
          <p className="text-[11px] font-bold text-primary-200 uppercase tracking-wider px-1">
            {t("templateSelect.sectionRecommended")}
          </p>
        )}

        {visibleItems.flatMap((template, idx) => {
          const showDivider = hasWeakSection && idx === firstWeakIdx;
          const rec = recById[template.id];
          const isFeasible = rec?.feasible ?? true;
          const needsInterfacing = rec?.needsInterfacing ?? false;
          const isCleanTop = idx === 0 && isFeasible && !needsInterfacing;
          const matchScore = scoreById[template.id] ?? template.matchScore;
          const level = levelByDifficulty(template.difficulty);
          // feasibilityBand: from rec if present, else inferred from feasible boolean.
          // Treat missing band on feasible cards as "maybe" (conservative default).
          const feasibilityBand =
            rec?.feasibilityBand ??
            (rec?.feasible === false ? "unlikely" : "maybe");
          const failReason = !isFeasible
            ? rec?.failReason === "area"
              ? t("templateSelect.reasonArea")
              : rec?.failReason === "piece_fit"
                ? t("templateSelect.reasonPieceFit")
                : rec?.failReason === "fabric"
                  ? tl(rec.fabricNote) || t("templateSelect.reasonFabric")
                  : rec?.failReason
                    ? t("templateSelect.reasonGeneric")
                    : t("templateSelect.reasonArea")
            : null;
          const presentation = getFabricFitPresentation(rec, t, tl);
          if (import.meta.env.DEV) {
            // TEMP DEBUG — fabric fit decision path per template. Remove before production.
            const _asEn = (v) =>
              v == null
                ? null
                : typeof v === "object"
                  ? (v.en ?? null)
                  : String(v);
            const materialSummary = fabric
              ? [
                  _asEn(fabric.type),
                  _asEn(fabric.weight),
                  _asEn(fabric.condition),
                ]
                  .filter(Boolean)
                  .join(" / ") || "unknown"
              : "no fabric analyzed";
            console.log("[FabricFitPresentation]", template.id, {
              materialSummary,
              state: presentation.state,
              score: presentation.score,
              rawLabel: presentation.rawLabel,
              rawReason: presentation.rawReason,
              finalLabel:
                presentation.rawLabel == null
                  ? `${presentation.label} [fallback]`
                  : presentation.label,
              finalReason:
                presentation.rawReason == null
                  ? `${presentation.reason} [fallback]`
                  : presentation.reason,
              failReason: rec?.failReason ?? null,
              feasible: rec?.feasible ?? null,
              feasibilityBand: rec?.feasibilityBand ?? null,
              needsInterfacing: rec?.needsInterfacing ?? false,
            });
          }
          // Status borders (top pick / infeasible / needs interfacing) win
          // over the level-tinted default border.
          const borderClass = isCleanTop
            ? "border-secondary-300"
            : !isFeasible
              ? "border-red-200"
              : needsInterfacing
                ? "border-amber-300"
                : level.border;
          // FreeSewing patterns: line drawing by default.
          // Top-3 cards that have an AI preview show it first — tap thumbnail to toggle.
          const isFreeSewing = template.patternSource === "freesewing";
          const lineSrc = isFreeSewing ? LINE_DRAWINGS(template.id) : null;
          const aiSrc = previews[template.id] ?? null;
          // flippedCards[id] true  → showing line drawing (user tapped away from AI)
          // flippedCards[id] false / absent → showing AI preview (when available)
          const showingLine =
            isFreeSewing && (!!flippedCards[template.id] || !aiSrc);
          const activeSrc = isFreeSewing
            ? showingLine
              ? lineSrc
              : aiSrc
            : (aiSrc ?? template.resultImage ?? null);
          const zoomSrc = activeSrc;
          const card = (
            <div
              key={template.id}
              onClick={() => handleCardTap(template)}
              className={`${level.cardBg} rounded-3xl overflow-hidden border-2 cursor-pointer active:scale-[0.98] transition-transform ${borderClass} ${!isFeasible ? "opacity-60" : ""}`}
            >
              {/* Badges + fail reason — full width across top;
                   presentation is always defined so this row always renders */}
              {!!presentation && (
                <div className="px-4 pt-4 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      {isCleanTop && (
                        <span className="inline-block bg-secondary-200 text-secondary-800 text-[11px] font-bold px-2.5 py-1 rounded-full mr-1.5">
                          {t("templateSelect.topRecommendation")}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end flex-shrink-0">
                      <span
                        className={`text-[12.8px] font-bold ${
                          matchScore >= 85
                            ? "text-primary-700"
                            : "text-secondary-600"
                        }`}
                      >
                        {matchScore}% match
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 min-w-0 whitespace-nowrap">
                    {isFeasible && feasibilityBand === "likely" && (
                      <span className="inline-block shrink-0 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-full">
                        {t("templateSelect.feasibilityLikely")}
                      </span>
                    )}

                    {isFeasible && feasibilityBand === "maybe" && (
                      <span className="inline-block shrink-0 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full">
                        {t("templateSelect.feasibilityMaybe")}
                      </span>
                    )}

                    {!isFeasible && (
                      <span className="inline-block shrink-0 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full">
                        {t("templateSelect.notFeasible")}
                      </span>
                    )}

                    <span
                      className={`inline-block shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${fabricFitBadgeClass(presentation.state)}`}
                    >
                      {presentation.label}
                    </span>
                  </div>

                  <p className="text-[10px] text-primary-700 leading-4">
                    {presentation.reason}
                  </p>
                </div>
              )}

              {/* Image-left (~50%) + content-right */}
              <div className="flex gap-3 px-4 pt-3 pb-4 items-stretch">
                <div
                  className={`relative w-1/2 aspect-square rounded-2xl flex-shrink-0 overflow-hidden select-none touch-none ${level.thumbBg}`}
                  onPointerDown={(e) =>
                    zoomSrc && handleThumbnailPointerDown(zoomSrc, e)
                  }
                  onPointerUp={handleThumbnailPointerEnd}
                  onPointerLeave={handleThumbnailPointerEnd}
                  onPointerCancel={handleThumbnailPointerEnd}
                  onClick={(e) => {
                    if (isFreeSewing && aiSrc) {
                      // Tap toggles AI preview ↔ line drawing
                      e.stopPropagation();
                      if (longPressed.current) {
                        longPressed.current = false;
                      } else {
                        setFlippedCards((prev) => ({
                          ...prev,
                          [template.id]: !prev[template.id],
                        }));
                      }
                    } else {
                      handleThumbnailClick(e);
                    }
                  }}
                >
                  {activeSrc ? (
                    <img
                      src={activeSrc}
                      alt={tl(template.name)}
                      className="w-full h-full object-cover pointer-events-none"
                      loading="lazy"
                    />
                  ) : idx < 3 ? (
                    <div className="w-full h-full bg-primary-200 animate-pulse rounded-2xl" />
                  ) : (
                    <div className="w-full h-full bg-primary-100 rounded-2xl flex items-center justify-center">
                      <span className="text-primary-300 text-[10px]">
                        No preview
                      </span>
                    </div>
                  )}
                  {/* Label when AI and line drawing are both available */}
                  {isFreeSewing && aiSrc && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center leading-none py-1 pointer-events-none">
                      {showingLine
                        ? "sketch · tap for AI"
                        : "AI · tap for sketch"}
                    </div>
                  )}
                  {zoomSrc && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 flex items-center justify-center pointer-events-none">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <line x1="20.5" y1="20.5" x2="16.5" y2="16.5" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <h3 className="font-bold text-primary-900 text-base leading-tight break-words">
                    {tl(template.name)}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-primary-500 mt-1">
                    <span>⏱ {tl(template.time)}</span>
                    <span>
                      {"★".repeat(template.difficulty)}
                      {"☆".repeat(
                        template.maxDifficulty - template.difficulty,
                      )}{" "}
                      {tl(template.difficultyLabel)}
                    </span>
                  </div>

                  {/* Fabric usage — only progress bar shown on the card */}
                  {rec?.usedAreaPct != null && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-primary-500">
                          📐 {t("templateSelect.fabricUsed")}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
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
                      <div className="h-1.5 bg-primary-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            !isFeasible
                              ? "bg-red-300"
                              : rec.usedAreaPct > 90
                                ? "bg-amber-400"
                                : "bg-primary-500"
                          }`}
                          style={{
                            width: `${Math.min(Math.round(rec.usedAreaPct), 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end mt-auto pt-2">
                    <span className="text-primary-700 text-[11px] font-semibold flex-shrink-0">
                      {t("templateSelect.startMaking")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
          if (showDivider) {
            return [
              <div
                key="section-divider"
                className="flex items-center gap-3 px-1 pt-2"
              >
                <div className="flex-1 h-px bg-primary-600" />
                <span className="text-[11px] font-bold text-primary-200 uppercase tracking-wider whitespace-nowrap">
                  {t("templateSelect.sectionLessSuitable")}
                </span>
                <div className="flex-1 h-px bg-primary-600" />
              </div>,
              card,
            ];
          }
          return card;
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
                  ? t("templateSelect.modalGoodTitle")
                  : t("templateSelect.modalNeededTitle")}
              </h3>
              <p className="text-xs text-primary-500 mt-0.5">
                {tl(modalTemplate.name)}
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
                <span>{effectiveProfile()?.name ?? t("common.noProfile")}</span>
                <span className="text-primary-200 text-xs">▾</span>
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
                      ? tl(
                          measurementPresets.find(
                            (p) => p.id === modalSelectedPresetId,
                          )?.label,
                        ) || t("common.sizePreset")
                      : t("common.startFromSize")}
                  </span>
                  <span className="text-primary-200 text-xs">▾</span>
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
                    {t("common.noProfile")}
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
                  <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-primary-200 uppercase tracking-wide">
                    {t("common.women")}
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
                      {tl(p.label)}
                    </button>
                  ))}
                  <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-primary-200 uppercase tracking-wide border-t border-primary-100">
                    {t("common.men")}
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
                      {tl(p.label)}
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
                  {t("templateSelect.saveTo", {
                    name: effectiveProfile().name,
                  })}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-5 pt-3 pb-5 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setModalTemplate(null)}
                className="flex-1 h-11 rounded-2xl border border-primary-200 text-primary-700 text-sm font-semibold"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleModalConfirm}
                className="flex-1 h-11 rounded-2xl bg-green-700 text-white text-sm font-semibold disabled:opacity-50"
                disabled={Object.values(modalErrors).some(Boolean)}
              >
                {stillMissingAfterModal().length === 0
                  ? t("templateSelect.generatePattern")
                  : t("templateSelect.continueAnyway")}
              </button>
            </div>
          </div>
        </div>
      )}

      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setZoomImage(null)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <img
            src={zoomImage}
            alt="Preview"
            className="max-w-full max-h-full rounded-3xl shadow-2xl pointer-events-none"
          />
        </div>
      )}
    </div>
  );
}
