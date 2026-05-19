/**
 * Normalizes the fabric analyzer output into a typed profile used by
 * checkFeasibility for fabric compatibility checks.
 *
 * Notes:
 * - Fiber content alone is not enough to predict sewing behavior; weave/knit and
 *   weight strongly affect stretch, structure, and drape.
 * - Unknown values should remain explicitly uncertain whenever possible.
 * - Numeric levels are heuristic bands for ranking, not scientific measurements.
 *
 * @param {Object} fabric - Fabric object from analyzeFabric() / mockAnalysis.fabric
 * @param {number} [grainAngleDeg] - Grain angle from garmentLayout (0=horizontal, 90=vertical)
 *
 * @returns {{
 *   isKnit: boolean,
 *   isWoven: boolean,
 *   isBias: boolean,
 *   weightClass: 1|2|3,
 *   hasStretch: boolean,
 *   isDelicate: boolean,
 *   conditionRank: 0|1|2|3|null,
 *   materialPcts: Record<string, number>,
 *   stretchLevel: number,
 *   structureLevel: number,
 *   drapeLevel: number,
 *   weightKnown: boolean,
 *   textureKnown: boolean,
 *   conditionKnown: boolean,
 *   classificationConfidence: { weight: 'high'|'low', texture: 'high'|'low', condition: 'high'|'low' },
 *   hasLowConfidence: boolean,
 * }}
 */
function asEnString(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v.en ?? "";
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function getFabricProfile(fabric, grainAngleDeg = 90) {
  const texture = asEnString(fabric.texture).toLowerCase();
  const weight = asEnString(fabric.weight).toLowerCase();
  const condition = asEnString(fabric.condition).toLowerCase();

  // ── Texture / weave classification ──────────────────────────────────────────
  const isKnit = /knit|jersey|rib\b|fleece|terry|interlock/.test(texture);
  const isWoven =
    /woven|twill|plain|canvas|duck|denim|oxford|poplin|linen|chambray|satin|sateen|muslin|voile|organza|chiffon|charmeuse/.test(
      texture,
    );
  const textureKnown = isKnit || isWoven;

  // ── Grain ───────────────────────────────────────────────────────────────────
  const isBias =
    grainAngleDeg != null && grainAngleDeg !== 0 && grainAngleDeg !== 90;

  // ── Weight class ────────────────────────────────────────────────────────────
  let weightClass;
  let weightKnown;
  if (/light/.test(weight)) {
    weightClass = 1;
    weightKnown = true;
  } else if (/mid|medium/.test(weight)) {
    weightClass = 2;
    weightKnown = true;
  } else if (/heavy/.test(weight)) {
    weightClass = 3;
    weightKnown = true;
  } else {
    weightClass = 2; // neutral fallback for computation only
    weightKnown = false;
  }

  // ── Composition map ─────────────────────────────────────────────────────────
  const materialPcts = {};
  for (const { material, percentage } of fabric.composition ?? []) {
    materialPcts[asEnString(material).toLowerCase()] = percentage ?? 0;
  }

  const elasticPct =
    (materialPcts.elastane ?? 0) +
    (materialPcts.spandex ?? 0) +
    (materialPcts.lycra ?? 0);

  const silkPct = materialPcts.silk ?? 0;
  const rayonPct = (materialPcts.rayon ?? 0) + (materialPcts.viscose ?? 0);

  // ── Stretch ─────────────────────────────────────────────────────────────────
  const hasStretch = isKnit || elasticPct > 0;

  let stretchLevel;
  if (elasticPct >= 10) stretchLevel = 0.95;
  else if (elasticPct >= 5) stretchLevel = 0.85;
  else if (elasticPct >= 2) stretchLevel = 0.6;
  else if (elasticPct > 0) stretchLevel = 0.3;
  else if (/\brib\b/.test(texture)) stretchLevel = 0.85;
  else if (/jersey/.test(texture)) stretchLevel = 0.7;
  else if (/interlock/.test(texture)) stretchLevel = 0.65;
  else if (/fleece|terry/.test(texture)) stretchLevel = 0.4;
  else if (/knit/.test(texture)) stretchLevel = 0.65;
  else if (isBias) stretchLevel = 0.25;
  else stretchLevel = 0.0;

  // ── Delicate fabrics ────────────────────────────────────────────────────────
  const delicateMaterials = ["silk"];
  const delicateTextures = /chiffon|lace|voile|organza|charmeuse/;
  const isDelicate =
    delicateMaterials.some((m) => (materialPcts[m] ?? 0) > 0) ||
    delicateTextures.test(texture);

  // ── Condition rank ──────────────────────────────────────────────────────────
  let conditionRank;
  let conditionKnown;
  if (/\bgood\b|\bexcellent\b|\blike new\b|\bnew\b/.test(condition)) {
    conditionRank = 3;
    conditionKnown = true;
  } else if (/\bfair\b|\bdecent\b|\busable\b/.test(condition)) {
    conditionRank = 2;
    conditionKnown = true;
  } else if (/\bworn\b|\bfaded\b|\bpilled\b|\bfrayed\b/.test(condition)) {
    conditionRank = 1;
    conditionKnown = true;
  } else if (/\bdamaged\b|\btorn\b|\bhole/.test(condition)) {
    conditionRank = 0;
    conditionKnown = true;
  } else {
    conditionRank = null; // unknown, not a sewing state
    conditionKnown = false;
  }

  // ── Structure level (0 = unstructured/drapey, 1 = very rigid) ──────────────
  let structureBase;
  if (/canvas|duck|buckram/.test(texture)) structureBase = 0.9;
  else if (/denim/.test(texture)) structureBase = 0.8;
  else if (/twill|oxford/.test(texture)) structureBase = 0.65;
  else if (/linen/.test(texture)) structureBase = 0.6;
  else if (/poplin/.test(texture)) structureBase = 0.6;
  else if (/chambray/.test(texture)) structureBase = 0.45;
  else if (/muslin/.test(texture)) structureBase = 0.35;
  else if (/plain/.test(texture)) structureBase = 0.45;
  else if (/voile/.test(texture)) structureBase = 0.2;
  else if (/organza/.test(texture)) structureBase = 0.55;
  else if (/chiffon/.test(texture)) structureBase = 0.1;
  else if (/charmeuse/.test(texture)) structureBase = 0.15;
  else if (/satin|sateen/.test(texture)) structureBase = 0.25;
  else if (/jersey/.test(texture)) structureBase = 0.3;
  else if (/interlock/.test(texture)) structureBase = 0.4;
  else if (/\brib\b/.test(texture)) structureBase = 0.35;
  else if (/fleece|terry/.test(texture)) structureBase = 0.45;
  else if (/knit/.test(texture)) structureBase = 0.35;
  else structureBase = 0.5; // unknown texture fallback

  const weightStructureMod =
    weightClass === 1 ? 0.85 : weightClass === 3 ? 1.2 : 1.0;
  const structureLevel = round2(clamp01(structureBase * weightStructureMod));

  // ── Drape level (0 = stiff/holds shape, 1 = very fluid/drapey) ─────────────
  let drapeBase;
  if (/charmeuse/.test(texture) || silkPct >= 50) drapeBase = 0.9;
  else if (/chiffon/.test(texture)) drapeBase = 0.85;
  else if (/voile/.test(texture)) drapeBase = 0.75;
  else if (/organza/.test(texture)) drapeBase = 0.3;
  else if (/satin|sateen/.test(texture)) drapeBase = 0.75;
  else if (/jersey/.test(texture)) drapeBase = 0.65;
  else if (/interlock/.test(texture)) drapeBase = 0.55;
  else if (/\brib\b/.test(texture)) drapeBase = 0.6;
  else if (/fleece|terry/.test(texture)) drapeBase = 0.35;
  else if (/knit/.test(texture)) drapeBase = 0.55;
  else if (/poplin/.test(texture)) drapeBase = 0.45;
  else if (/muslin/.test(texture)) drapeBase = 0.5;
  else if (/chambray/.test(texture)) drapeBase = 0.5;
  else if (/plain/.test(texture)) drapeBase = 0.45;
  else if (/linen/.test(texture)) drapeBase = 0.4;
  else if (/twill|oxford/.test(texture)) drapeBase = 0.35;
  else if (/denim/.test(texture)) drapeBase = 0.2;
  else if (/canvas|duck/.test(texture)) drapeBase = 0.1;
  else drapeBase = 0.45; // unknown texture fallback

  // Composition-based lifts for otherwise generic descriptions
  if (rayonPct >= 50) drapeBase = Math.max(drapeBase, 0.7);
  else if (rayonPct >= 30) drapeBase = Math.max(drapeBase, 0.6);
  if (silkPct >= 30) drapeBase = Math.max(drapeBase, 0.65);

  const weightDrapeMod =
    weightClass === 3 ? 0.85 : weightClass === 1 ? 1.1 : 1.0;
  const drapeLevel = round2(clamp01(drapeBase * weightDrapeMod));

  // ── Classification confidence ───────────────────────────────────────────────
  const classificationConfidence = {
    weight: weightKnown ? "high" : "low",
    texture: textureKnown ? "high" : "low",
    condition: conditionKnown ? "high" : "low",
  };
  const hasLowConfidence = !weightKnown || !textureKnown || !conditionKnown;

  return {
    isKnit,
    isWoven,
    isBias,
    weightClass,
    hasStretch,
    isDelicate,
    conditionRank,
    materialPcts,
    stretchLevel: round2(stretchLevel),
    structureLevel,
    drapeLevel,
    weightKnown,
    textureKnown,
    conditionKnown,
    classificationConfidence,
    hasLowConfidence,
  };
}
