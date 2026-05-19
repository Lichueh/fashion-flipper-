import { getFabricProfile } from "./fabricProfile.js";
import {
  FABRIC_REQUIREMENTS,
  NATURAL_FIBERS,
} from "../data/fabricRequirements.js";
import { FABRIC_ISSUE_NOTES } from "../i18n/translations.js";
import patternAreasBySize, {
  ANCHOR_CHEST,
} from "../data/patternAreasBySize.js";

// Exported so callers that re-score outside checkFeasibility() (e.g. profileFeasibility
// in TemplateSelectScreen) can stay in sync without duplicating magic numbers.
export const AREA_SAFETY_FACTOR = 0.85;
export const LIKELY_THRESHOLD = 1.25;
export const REQUIRED_BUFFER = 1.1;

/**
 * Determines which upcycling templates are achievable from a segmented garment.
 *
 * Stage 1 – area check: total required area (+ 10 % seam allowance) vs available area.
 * Stage 2 – bounding-box fit: each pattern piece must fit (in either orientation)
 *            within at least one measured panel's bounding box.
 * Stage 3 – fabric compatibility (skipped when fabric = null).
 *
 * @param {Object} measurements
 * @param {number} measurements.totalAreaCm2
 * @param {{ frontPanel, sleeveLeft, sleeveRight }} measurements.panels
 *   Each panel is { widthCm, heightCm, areaCm2 } | null
 *
 * @param {Object} templates  - keyed template map from src/data/templates.js
 * @param {Object|null} fabric - Fabric object from analyzeFabric(); null skips fabric checks.
 *
 * @returns {Array<template & {
 *   feasible: boolean,
 *   feasibilityBand: 'likely' | 'maybe' | 'unlikely',
 *   compositeScore: number,
 *   fitScore: number,              // alias of compositeScore for backwards compat
 *   usedAreaPct: number,
 *   availableAreaCm2: number,
 *   safeAvailableAreaCm2: number,
 *   needsInterfacing: boolean,
 *   fabricNote: string|null,
 *   fabricCompatibilityScore: number|null,
 *                                  // 0–1 fabric suitability score; null when not evaluated
 *                                  // (area or piece-fit failed before Stage 3 ran)
 *   failReason: 'area' | 'piece_fit' | 'fabric' | null
 * }>}
 */
export function checkFeasibility(measurements, templates, fabric = null) {
  // Collect only the panels that were actually detected.
  const availablePanels = Object.values(measurements.panels).filter(Boolean);
  const availableAreaCm2 = measurements.totalAreaCm2;
  const safeAvailableAreaCm2 = _getSafeAvailableAreaCm2(measurements);

  // Derive fabric profile once — null fabric means skip all fabric checks.
  const fabricProfile = fabric ? getFabricProfile(fabric) : null;

  return Object.values(templates).map((template) => {
    const pieces = template.patternPieces;
    const totalPieces = pieces.length;

    // ── Stage 1: area check ──────────────────────────────────────────────────
    // For patterns whose pieces are loaded dynamically (patternPieces: []),
    // fall back to the pre-computed anchor area from patternAreasBySize.
    const anchorAreaData = patternAreasBySize[template.id];
    const fallbackArea = anchorAreaData
      ? Math.max(...Object.values(anchorAreaData))
      : null;
    const totalRequiredArea =
      totalPieces > 0
        ? pieces.reduce((sum, p) => sum + p.areaCm2 * (p.cutCount ?? 1), 0)
        : (fallbackArea ?? 0);
    // Intentionally conservative: the requirement buffer models sewing overhead,
    // while the safety factor discounts measured area for real-world usable yield.
    const totalRequiredWithBuffer = totalRequiredArea * REQUIRED_BUFFER;
    const usedAreaPct = Math.min(
      (totalRequiredArea / safeAvailableAreaCm2) * 100,
      100,
    );

    // ── Feasibility band ────────────────────────────────────────────────────
    // coverageRatio > 1 means Stage 1 passes; the LIKELY_THRESHOLD distinguishes
    // a comfortable surplus from a marginal pass.
    const coverageRatio = safeAvailableAreaCm2 / totalRequiredWithBuffer;

    if (safeAvailableAreaCm2 < totalRequiredWithBuffer) {
      return {
        ...template,
        feasible: false,
        feasibilityBand: "unlikely",
        compositeScore: 0,
        fitScore: 0,
        usedAreaPct,
        availableAreaCm2,
        safeAvailableAreaCm2,
        needsInterfacing: false,
        fabricNote: null,
        fabricCompatibilityScore: null,
        failReason: "area",
      };
    }

    // ── Stage 2: bounding-box fit check ─────────────────────────────────────
    // Skipped when pieces are loaded dynamically (totalPieces === 0);
    // the fallback area check above is sufficient for those patterns.
    // Expand each piece by cutCount so every physical cut is checked.
    const physicalPieces =
      totalPieces === 0
        ? []
        : pieces.flatMap((p) =>
            Array.from({ length: p.cutCount ?? 1 }, () => p),
          );
    const totalPhysical = physicalPieces.length;
    let piecesFit = 0;
    for (const piece of physicalPieces) {
      const pw = piece.widthCm;
      const ph = piece.heightCm;
      const fits = availablePanels.some((panel) => {
        const panW = panel.widthCm;
        const panH = panel.heightCm;
        // Try natural orientation, then rotated 90°.
        return (pw <= panW && ph <= panH) || (ph <= panW && pw <= panH);
      });
      if (fits) piecesFit++;
    }

    const pieceFitScore = totalPhysical > 0 ? piecesFit / totalPhysical : 1;
    if (totalPhysical > 0 && piecesFit < totalPhysical) {
      return {
        ...template,
        feasible: false,
        feasibilityBand: "unlikely",
        compositeScore: 0,
        fitScore: 0,
        usedAreaPct,
        availableAreaCm2,
        safeAvailableAreaCm2,
        needsInterfacing: false,
        fabricNote: null,
        fabricCompatibilityScore: null,
        failReason: "piece_fit",
      };
    }

    // ── Stage 3: fabric compatibility ────────────────────────────────────────
    // Skipped entirely when fabric = null (pre-analysis state).
    let needsInterfacing = false;
    let fabricNote = null;
    let fabricFail = false;
    // Product of per-issue penalties; 1.0 when no fabric or no issues.
    let fabricCompatibilityScore = 1.0;

    if (fabricProfile) {
      const req = FABRIC_REQUIREMENTS[template.id];

      if (req) {
        const issues = _collectFabricIssues(fabricProfile, req);

        if (issues.length > 0) {
          // Prefer the structured, localized req.reason as the UI message.
          // Fall back to the internal issue note only when req.reason is absent.
          fabricNote = req.reason ?? issues[0].note;

          const hasBlocker = issues.some((i) => i.isBlocker);
          if (hasBlocker) {
            // Hard fail: knit/woven mismatch or stretch requirement unmet.
            fabricFail = true;
            fabricCompatibilityScore = 0;
          } else {
            // Soft penalties: multiply per-issue penalty factors together.
            fabricCompatibilityScore = issues.reduce(
              (score, i) => score * i.penalty,
              1.0,
            );
            needsInterfacing = issues.some((i) => i.needsInterfacing);
          }
        }
      }
    }

    if (fabricFail) {
      return {
        ...template,
        feasible: false,
        feasibilityBand: "unlikely",
        compositeScore: 0,
        fitScore: 0,
        usedAreaPct,
        availableAreaCm2,
        safeAvailableAreaCm2,
        needsInterfacing: false,
        fabricNote,
        fabricCompatibilityScore: 0,
        hasLowConfidence: fabricProfile?.hasLowConfidence ?? false,
        failReason: "fabric",
      };
    }

    // ── Composite score ──────────────────────────────────────────────────────
    // 40 % fabric compatibility + 35 % piece-fit ratio + 25 % fabric reuse.
    // Fabric suitability is the primary ranking signal; reuse is secondary.
    // When fabric = null, fabricCompatibilityScore = 1.0 (neutral — no penalty).
    const reuseScore = Math.min(usedAreaPct / 100, 1);
    let compositeScore =
      0.4 * fabricCompatibilityScore + 0.35 * pieceFitScore + 0.25 * reuseScore;

    const feasibilityBand =
      coverageRatio >= LIKELY_THRESHOLD ? "likely" : "maybe";

    // "maybe" templates sort below "likely" — cap their score.
    if (feasibilityBand === "maybe") {
      compositeScore = Math.min(compositeScore, 0.6);
    }

    return {
      ...template,
      feasible: true,
      feasibilityBand,
      compositeScore,
      fitScore: compositeScore, // backwards-compat alias
      usedAreaPct,
      availableAreaCm2,
      safeAvailableAreaCm2,
      needsInterfacing,
      fabricNote,
      fabricCompatibilityScore,
      hasLowConfidence: fabricProfile?.hasLowConfidence ?? false,
      failReason: null,
    };
  });
}

/**
 * Re-applies the Stage 1 area check for a single checkFeasibility result using a
 * profile-interpolated pattern area instead of the template's default piece area.
 *
 * All fabric-derived fields (fabricCompatibilityScore, needsInterfacing, fabricNote)
 * are preserved from the original — the fabric hasn't changed, only the pattern size.
 * Stage 2 (bounding-box fit) is not re-run; fitting by area implies piece fit.
 *
 * Returns the original object unchanged when:
 *   - failReason is "fabric" or "piece_fit" — those are not fixable by area
 *   - interpolatedArea is null — no size data for this template
 *
 * @param {Object} original          - Single result object from checkFeasibility()
 * @param {number|null} interpolatedArea - Profile-adjusted pattern area in cm²
 * @param {number} totalAreaCm2      - Total garment area from measurements
 * @returns {Object} Updated result (same reference if unchanged)
 */
export function rescoreByArea(original, interpolatedArea, totalAreaCm2) {
  if (
    original.failReason === "fabric" ||
    original.failReason === "piece_fit" ||
    interpolatedArea === null
  ) {
    return original;
  }

  const bufferedRequired = interpolatedArea * REQUIRED_BUFFER;
  const feasible = bufferedRequired <= totalAreaCm2;
  const safeArea = totalAreaCm2 * AREA_SAFETY_FACTOR;
  const coverageRatio = safeArea / bufferedRequired;
  const usedAreaPct = Math.min(
    Math.round((interpolatedArea / totalAreaCm2) * 100),
    100,
  );

  if (!feasible) {
    return {
      ...original,
      feasible: false,
      feasibilityBand: "unlikely",
      compositeScore: 0,
      fitScore: 0,
      usedAreaPct,
      failReason: "area",
    };
  }

  // Preserve Stage 3 fabric result. pieceFitScore = 1 (area fit implies piece fit).
  const fabricScore = original.fabricCompatibilityScore ?? 1.0;
  const reuseScore = Math.min(usedAreaPct / 100, 1);
  let compositeScore = 0.4 * fabricScore + 0.35 * 1 + 0.25 * reuseScore;

  const feasibilityBand =
    coverageRatio >= LIKELY_THRESHOLD ? "likely" : "maybe";
  if (feasibilityBand === "maybe") {
    compositeScore = Math.min(compositeScore, 0.6);
  }

  return {
    ...original,
    feasible: true,
    feasibilityBand,
    compositeScore,
    fitScore: compositeScore,
    usedAreaPct,
    // Write fabricScore back explicitly — original may have null here when the
    // template previously failed the area check (Stage 3 never ran then).
    // fabricScore already defaults to 1.0 in that case, same neutral assumption
    // as when fabric=null is passed to checkFeasibility.
    fabricCompatibilityScore: fabricScore,
    failReason: null,
  };
}

function _getSafeAvailableAreaCm2(measurements) {
  const availableAreaCm2 = measurements?.totalAreaCm2 ?? 0;
  return availableAreaCm2 * AREA_SAFETY_FACTOR;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Runs the fabric issue pipeline in priority order.
 * Returns an array of { type, note } objects for each failed check.
 */
/**
 * Evaluates fabric issues for a given profile and requirement set.
 *
 * Each issue carries:
 *   type            – category string used by the caller
 *   note            – localized { en, nb, zh } message for the UI
 *   isBlocker       – true = hard fail (feasible → false); currently only knit/stretch
 *   penalty         – multiplicative factor (0–1) applied to fabricCompatibilityScore
 *                     when isBlocker is false
 *   needsInterfacing – true when adding interfacing resolves the issue
 */
function _collectFabricIssues(profile, req) {
  const issues = [];

  // Lookup tables for interpolated label values.
  const weightLabelMap = {
    1: FABRIC_ISSUE_NOTES.weightLabels.lightweight,
    2: FABRIC_ISSUE_NOTES.weightLabels.midweight,
    3: FABRIC_ISSUE_NOTES.weightLabels.heavyweight,
  };
  const conditionLabelMap = [
    FABRIC_ISSUE_NOTES.conditionLabels.damaged,
    FABRIC_ISSUE_NOTES.conditionLabels.worn,
    FABRIC_ISSUE_NOTES.conditionLabels.fair,
    FABRIC_ISSUE_NOTES.conditionLabels.good,
  ];
  const noHint = { en: "", nb: "", zh: "" };

  // 1. Weight range — soft penalty.
  //    canInterfaceFix templates get a milder penalty because the issue is recoverable.
  if (profile.weightClass < req.minWeightClass) {
    const gap = req.minWeightClass - profile.weightClass;
    issues.push({
      type: "weight",
      note: _interpolate(FABRIC_ISSUE_NOTES.weightTooLight, {
        required: weightLabelMap[req.minWeightClass] ?? noHint,
        interfacingHint: req.canInterfaceFix
          ? FABRIC_ISSUE_NOTES.interfacingHint
          : noHint,
      }),
      isBlocker: false,
      penalty: req.canInterfaceFix
        ? gap === 1
          ? 0.75
          : 0.5
        : gap === 1
          ? 0.55
          : 0.3,
      needsInterfacing: req.canInterfaceFix,
    });
  }
  if (req.maxWeightClass !== null && profile.weightClass > req.maxWeightClass) {
    const gap = profile.weightClass - req.maxWeightClass;
    issues.push({
      type: "weight",
      note: FABRIC_ISSUE_NOTES.weightTooHeavy,
      isBlocker: false,
      penalty: gap === 1 ? 0.55 : 0.3,
      needsInterfacing: false,
    });
  }

  // 2. Knit check — TRUE BLOCKER.
  //    Knit fabric cannot hold the seam structure of a stable-woven pattern.
  if (!req.allowKnit && profile.isKnit) {
    issues.push({
      type: "knit",
      note: FABRIC_ISSUE_NOTES.knitNotAllowed,
      isBlocker: true,
      penalty: 0,
      needsInterfacing: false,
    });
  }

  // 3. Stretch requirement — TRUE BLOCKER.
  //    The garment simply will not fit the body without stretch.
  if (req.requiresStretch && !profile.hasStretch) {
    issues.push({
      type: "stretch",
      note: FABRIC_ISSUE_NOTES.stretchRequired,
      isBlocker: true,
      penalty: 0,
      needsInterfacing: false,
    });
  }

  // 4. Bias grain — soft penalty.
  if (!req.allowBias && profile.isBias) {
    issues.push({
      type: "bias",
      note: FABRIC_ISSUE_NOTES.biasNotAllowed,
      isBlocker: false,
      penalty: 0.7,
      needsInterfacing: false,
    });
  }

  // 5. Condition — two cases:
  //   • null (unrecognized input): apply a fixed uncertainty penalty (0.85).
  //     Unknown ≠ damaged — we simply couldn't assess the condition.
  //     JS would otherwise coerce null to 0 in the numeric comparison below,
  //     making the fabric look damaged (rank 0) — which is incorrect.
  //   • known rank below threshold: gap-proportional soft penalty.
  if (profile.conditionRank === null) {
    if (req.minConditionRank > 0) {
      issues.push({
        type: "condition",
        note: FABRIC_ISSUE_NOTES.conditionUnknown,
        isBlocker: false,
        penalty: 0.85,
        needsInterfacing: false,
      });
    }
  } else if (profile.conditionRank < req.minConditionRank) {
    const gap = req.minConditionRank - profile.conditionRank;
    issues.push({
      type: "condition",
      note: _interpolate(FABRIC_ISSUE_NOTES.conditionTooLow, {
        required: conditionLabelMap[req.minConditionRank] ?? noHint,
      }),
      isBlocker: false,
      penalty: gap === 1 ? 0.7 : gap === 2 ? 0.45 : 0.25,
      needsInterfacing: false,
    });
  }

  // 6. rejectFibers — soft penalty, proportional to how far over the reject threshold.
  for (const rule of req.rejectFibers) {
    const match = rule.match(/^(\w+)([<>]=?)(\d+)$/);
    if (!match) continue;
    const [, material, op, threshStr] = match;
    const pct = profile.materialPcts[material.toLowerCase()] ?? 0;
    const threshold = Number(threshStr);
    const triggered =
      op === ">"
        ? pct > threshold
        : op === ">="
          ? pct >= threshold
          : op === "<"
            ? pct < threshold
            : op === "<="
              ? pct <= threshold
              : false;
    if (triggered) {
      const excess = Math.abs(pct - threshold);
      issues.push({
        type: "fiber",
        note: _interpolate(FABRIC_ISSUE_NOTES.fiberTooHigh, {
          material: _capitalize(material),
          pct,
        }),
        isBlocker: false,
        // penalty decays with excess; floor at 0.30.
        penalty: Math.max(0.3, 1 - excess / 40),
        needsInterfacing: false,
      });
    }
  }

  // 7. requiredFibers — soft penalty, proportional to shortfall below required minimum.
  // @deprecated: req.preferredFibers is accepted for backward compatibility;
  //              new entries in fabricRequirements.js should use requiredFibers.
  const requiredFiberRules = req.requiredFibers ?? req.preferredFibers ?? [];
  for (const rule of requiredFiberRules) {
    const match = rule.match(/^(natural|[a-z]+)([<>]=?)(\d+)$/);
    if (!match) continue;
    const [, group, op, threshStr] = match;
    const threshold = Number(threshStr);
    let actualPct;
    if (group === "natural") {
      actualPct = Object.entries(profile.materialPcts).reduce(
        (sum, [mat, pct]) => sum + (NATURAL_FIBERS.has(mat) ? pct : 0),
        0,
      );
    } else {
      actualPct = profile.materialPcts[group] ?? 0;
    }
    const triggered =
      op === ">="
        ? actualPct < threshold
        : op === ">"
          ? actualPct <= threshold
          : op === "<="
            ? actualPct > threshold
            : op === "<"
              ? actualPct >= threshold
              : false;
    if (triggered) {
      const shortfall = Math.abs(threshold - actualPct);
      issues.push({
        type: "fiber",
        note: _interpolate(FABRIC_ISSUE_NOTES.naturalFiberInsufficient, {
          threshold,
          actual: Math.round(actualPct),
        }),
        isBlocker: false,
        // penalty decays with shortfall; floor at 0.30.
        penalty: Math.max(0.3, 1 - shortfall / 50),
        needsInterfacing: false,
      });
    }
  }

  return issues;
}

function _capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Substitutes {key} placeholders in a { en, nb, zh } template object.
 * Values in `vars` can be scalars (applied as-is to all locales) or
 * { en, nb, zh } objects (locale-specific substitution).
 */
function _interpolate(tmpl, vars) {
  return Object.fromEntries(
    ["en", "nb", "zh"].map((locale) => [
      locale,
      (tmpl[locale] ?? "").replace(/\{(\w+)\}/g, (_, k) => {
        const v = vars[k];
        if (v == null) return `{${k}}`;
        if (typeof v === "object") return v[locale] ?? v.en ?? String(v);
        return String(v);
      }),
    ]),
  );
}

// ── Profile-aware area estimation ────────────────────────────────────────────

/**
 * Infer whether a chest measurement is closer to female or male anchor sizes.
 * Returns 'female' | 'male'.
 */
export function inferGender(chest_mm) {
  const femaleEntries = Object.entries(ANCHOR_CHEST).filter(([k]) =>
    k.startsWith("cisFemale"),
  );
  const maleEntries = Object.entries(ANCHOR_CHEST).filter(([k]) =>
    k.startsWith("cisMale"),
  );

  const closestFemale = Math.min(
    ...femaleEntries.map(([, v]) => Math.abs(v - chest_mm)),
  );
  const closestMale = Math.min(
    ...maleEntries.map(([, v]) => Math.abs(v - chest_mm)),
  );

  return closestFemale <= closestMale ? "female" : "male";
}

/**
 * Interpolate total pattern piece area (cm²) for a given template and chest
 * measurement, using the nearest anchor size data for the inferred gender.
 * Returns null if the template has no anchor data.
 */
export function interpolatePatternArea(templateId, chest_mm) {
  const templateData = patternAreasBySize[templateId];
  if (!templateData) return null;

  const gender = inferGender(chest_mm);
  const prefix = gender === "female" ? "cisFemale" : "cisMale";

  // Get anchor entries for this gender, sorted by chest ascending, excluding nulls.
  const anchors = Object.entries(ANCHOR_CHEST)
    .filter(([k]) => k.startsWith(prefix))
    .map(([k, chestMm]) => ({ key: k, chestMm, area: templateData[k] ?? null }))
    .filter((a) => a.area !== null)
    .sort((a, b) => a.chestMm - b.chestMm);

  if (anchors.length === 0) return null;

  // Clamp below lower bound
  if (chest_mm <= anchors[0].chestMm) return anchors[0].area;

  // Clamp above upper bound
  if (chest_mm >= anchors[anchors.length - 1].chestMm)
    return anchors[anchors.length - 1].area;

  // Find bracketing pair and linear-interpolate
  for (let i = 0; i < anchors.length - 1; i++) {
    const lo = anchors[i];
    const hi = anchors[i + 1];
    if (chest_mm >= lo.chestMm && chest_mm <= hi.chestMm) {
      const t = (chest_mm - lo.chestMm) / (hi.chestMm - lo.chestMm);
      return lo.area + t * (hi.area - lo.area);
    }
  }

  return null;
}
