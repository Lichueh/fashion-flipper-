/**
 * Normalizes the fabric analyzer output into a typed profile used by
 * checkFeasibility for fabric compatibility checks.
 *
 * @param {Object} fabric - Fabric object from analyzeFabric() / mockAnalysis.fabric
 *   fabric.composition  - Array<{ material: string, percentage: number }>
 *   fabric.weight       - e.g. "lightweight", "Medium weight", "heavyweight"
 *   fabric.texture      - e.g. "Plain weave", "jersey knit", "twill"
 *   fabric.condition    - e.g. "Good", "Good (slight fading)", "worn"
 * @param {number} [grainAngleDeg] - Grain angle from garmentLayout (0=horizontal, 90=vertical)
 *
 * @returns {{
 *   isKnit: boolean,
 *   isWoven: boolean,
 *   isBias: boolean,
 *   weightClass: 1|2|3,
 *   hasStretch: boolean,
 *   isDelicate: boolean,
 *   conditionRank: 0|1|2|3,
 *   materialPcts: Record<string, number>,
 * }}
 */
export function getFabricProfile(fabric, grainAngleDeg = 90) {
  const texture = (fabric.texture ?? "").toLowerCase();
  const weight = (fabric.weight ?? "").toLowerCase();
  const condition = (fabric.condition ?? "").toLowerCase();

  // ── Texture / weave classification ──────────────────────────────────────────
  const isKnit = /knit|jersey|rib\b|fleece|terry|interlock/.test(texture);
  const isWoven =
    /woven|twill|plain|canvas|denim|oxford|poplin|linen|chambray|satin|sateen|muslin/.test(
      texture,
    );

  // ── Grain ────────────────────────────────────────────────────────────────────
  // Bias = neither straight warp (90°) nor straight weft (0°).
  // Default 90 (vertical warp) when not provided — most garments are cut on grain.
  const isBias =
    grainAngleDeg != null && grainAngleDeg !== 0 && grainAngleDeg !== 90;

  // ── Weight class ─────────────────────────────────────────────────────────────
  // Handles: "lightweight", "light weight", "light", "midweight", "medium weight",
  //          "medium", "heavyweight", "heavy weight", "heavy"
  let weightClass;
  if (/light/.test(weight)) {
    weightClass = 1;
  } else if (/mid|medium/.test(weight)) {
    weightClass = 2;
  } else if (/heavy/.test(weight)) {
    weightClass = 3;
  } else {
    // Unknown weight — default to midweight
    weightClass = 2;
  }

  // ── Composition map ──────────────────────────────────────────────────────────
  // e.g. { cotton: 85, polyester: 15 }
  const materialPcts = {};
  for (const { material, percentage } of fabric.composition ?? []) {
    materialPcts[material.toLowerCase()] = percentage ?? 0;
  }

  // ── Stretch ──────────────────────────────────────────────────────────────────
  const hasStretch =
    isKnit ||
    (materialPcts["elastane"] ?? 0) > 0 ||
    (materialPcts["spandex"] ?? 0) > 0 ||
    (materialPcts["lycra"] ?? 0) > 0;

  // ── Delicate fabrics ─────────────────────────────────────────────────────────
  const delicateMaterials = [
    "silk",
    "chiffon",
    "lace",
    "voile",
    "organza",
    "charmeuse",
  ];
  const isDelicate = delicateMaterials.some((m) => (materialPcts[m] ?? 0) > 0);

  // ── Condition rank ───────────────────────────────────────────────────────────
  // Fuzzy: takes the first keyword that appears in the (possibly verbose) string.
  // "Good (slight fading)" → rank 3, "worn through" → rank 1, etc.
  let conditionRank;
  if (/\bgood\b|\bexcellent\b|\blike new\b|\bnew\b/.test(condition)) {
    conditionRank = 3;
  } else if (/\bfair\b|\bdecent\b|\busable\b/.test(condition)) {
    conditionRank = 2;
  } else if (/\bworn\b|\bfaded\b|\bpilled\b|\bfrayed\b/.test(condition)) {
    conditionRank = 1;
  } else if (/\bdamaged\b|\btorn\b|\bhole/.test(condition)) {
    conditionRank = 0;
  } else {
    // Unrecognized — default to fair
    conditionRank = 2;
  }

  return {
    isKnit,
    isWoven,
    isBias,
    weightClass,
    hasStretch,
    isDelicate,
    conditionRank,
    materialPcts,
  };
}
