import { getFabricProfile } from "./fabricProfile.js";
import {
  FABRIC_REQUIREMENTS,
  NATURAL_FIBERS,
} from "../data/fabricRequirements.js";
import patternAreasBySize, {
  ANCHOR_CHEST,
} from "../data/patternAreasBySize.js";

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
 *   compositeScore: number,
 *   fitScore: number,         // alias of compositeScore for backwards compat
 *   usedAreaPct: number,
 *   needsInterfacing: boolean,
 *   fabricNote: string|null,
 *   failReason: 'area' | 'piece_fit' | 'fabric' | null
 * }>}
 */
export function checkFeasibility(measurements, templates, fabric = null) {
  // Collect only the panels that were actually detected.
  const availablePanels = Object.values(measurements.panels).filter(Boolean);

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
        ? pieces.reduce((sum, p) => sum + p.areaCm2, 0)
        : (fallbackArea ?? 0);
    const totalRequiredWithBuffer = totalRequiredArea * 1.1;
    const usedAreaPct = Math.min(
      (totalRequiredArea / measurements.totalAreaCm2) * 100,
      100,
    );

    if (measurements.totalAreaCm2 < totalRequiredWithBuffer) {
      return {
        ...template,
        feasible: false,
        compositeScore: 0,
        fitScore: 0,
        usedAreaPct,
        needsInterfacing: false,
        fabricNote: null,
        failReason: "area",
      };
    }

    // ── Stage 2: bounding-box fit check ─────────────────────────────────────
    // Skipped when pieces are loaded dynamically (totalPieces === 0);
    // the fallback area check above is sufficient for those patterns.
    let piecesFit = totalPieces === 0 ? 0 : 0;
    for (const piece of pieces) {
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

    const pieceFitScore = totalPieces > 0 ? piecesFit / totalPieces : 1;
    if (totalPieces > 0 && piecesFit < totalPieces) {
      return {
        ...template,
        feasible: false,
        compositeScore: 0,
        fitScore: 0,
        usedAreaPct,
        needsInterfacing: false,
        fabricNote: null,
        failReason: "piece_fit",
      };
    }

    // ── Stage 3: fabric compatibility ────────────────────────────────────────
    // Skipped entirely when fabric = null (pre-analysis state).
    let needsInterfacing = false;
    let fabricNote = null;
    let fabricFail = false;

    if (fabricProfile) {
      const req = FABRIC_REQUIREMENTS[template.id];

      if (req) {
        const issues = _collectFabricIssues(fabricProfile, req);

        if (issues.length > 0) {
          // Weight-only issue on a canInterfaceFix template → soft warning, not a fail.
          const isWeightOnly =
            issues.length === 1 && issues[0].type === "weight";

          if (req.canInterfaceFix && isWeightOnly) {
            needsInterfacing = true;
            fabricNote = issues[0].note;
          } else {
            fabricFail = true;
            fabricNote = issues[0].note; // first/most important issue
          }
        }
      }
    }

    if (fabricFail) {
      return {
        ...template,
        feasible: false,
        compositeScore: 0,
        fitScore: 0,
        usedAreaPct,
        needsInterfacing: false,
        fabricNote,
        failReason: "fabric",
      };
    }

    // ── Composite score ──────────────────────────────────────────────────────
    // 50 % piece-fit ratio + 50 % fabric-utilization (maximize reuse).
    const reuseScore = Math.min(usedAreaPct / 100, 1);
    let compositeScore = 0.5 * pieceFitScore + 0.5 * reuseScore;

    // Cap interfacing-fixable patterns so they sort below clean-feasible ones.
    if (needsInterfacing) {
      compositeScore = Math.min(compositeScore, 0.45);
    }

    return {
      ...template,
      feasible: true,
      compositeScore,
      fitScore: compositeScore, // backwards-compat alias
      usedAreaPct,
      needsInterfacing,
      fabricNote,
      failReason: null,
    };
  });
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Runs the fabric issue pipeline in priority order.
 * Returns an array of { type, note } objects for each failed check.
 */
function _collectFabricIssues(profile, req) {
  const issues = [];

  // 1. Weight range
  if (profile.weightClass < req.minWeightClass) {
    const labels = ["", "lightweight", "midweight", "heavyweight"];
    issues.push({
      type: "weight",
      note: `Fabric is too lightweight — ${labels[req.minWeightClass]} or heavier needed${req.canInterfaceFix ? "; add interfacing or double-layer for structure" : ""}`,
    });
  }
  if (req.maxWeightClass !== null && profile.weightClass > req.maxWeightClass) {
    issues.push({
      type: "weight",
      note: "Fabric is too heavy/stiff for this pattern",
    });
  }

  // 2. Knit check
  if (!req.allowKnit && profile.isKnit) {
    issues.push({
      type: "knit",
      note: "Knit fabric won't hold seam structure for this pattern",
    });
  }

  // 3. Stretch requirement
  if (req.requiresStretch && !profile.hasStretch) {
    issues.push({
      type: "stretch",
      note: "This pattern requires stretch fabric — woven fabric will sew up stiff and unwearable",
    });
  }

  // 4. Bias grain
  if (!req.allowBias && profile.isBias) {
    issues.push({
      type: "bias",
      note: "Bias-cut grain causes distortion and sagging for this pattern",
    });
  }

  // 5. Condition
  if (profile.conditionRank < req.minConditionRank) {
    const labels = ["damaged", "worn", "fair", "good"];
    issues.push({
      type: "condition",
      note: `Fabric condition too poor — ${labels[req.minConditionRank]} or better required`,
    });
  }

  // 6. rejectFibers — format: "material>threshold" or "material<threshold"
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
      issues.push({
        type: "fiber",
        note: `High ${_capitalize(material)} content (${pct}%) — fabric won't press or sew well for this pattern`,
      });
    }
  }

  // 7. preferredFibers — format: "natural>=50"
  for (const rule of req.preferredFibers) {
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
      issues.push({
        type: "fiber",
        note: `Needs ≥${threshold}% natural fiber for proper drape — current blend has ${Math.round(actualPct)}%`,
      });
    }
  }

  return issues;
}

function _capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
