/**
 * Determines which upcycling templates are achievable from a segmented garment.
 *
 * Stage 1 – area check: total required area (+ 10 % seam allowance) vs available area.
 * Stage 2 – bounding-box fit: each pattern piece must fit (in either orientation)
 *            within at least one measured panel's bounding box.
 *
 * @param {Object} measurements
 * @param {number} measurements.totalAreaCm2
 * @param {{ frontPanel, sleeveLeft, sleeveRight }} measurements.panels
 *   Each panel is { widthCm, heightCm, areaCm2 } | null
 *
 * @param {Object} templates - keyed template map from src/data/templates.js
 *
 * @returns {Array<template & { feasible: boolean, fitScore: number, usedAreaPct: number,
 *   failReason: 'area' | 'piece_fit' | null }>}
 */
export function checkFeasibility(measurements, templates) {
  // Collect only the panels that were actually detected.
  const availablePanels = Object.values(measurements.panels).filter(Boolean);

  return Object.values(templates).map((template) => {
    const pieces = template.patternPieces;
    const totalPieces = pieces.length;

    // ── Stage 1: area check ────────────────────────────────────────────────
    const totalRequiredArea = pieces.reduce((sum, p) => sum + p.areaCm2, 0);
    const totalRequiredWithBuffer = totalRequiredArea * 1.1;
    const usedAreaPct = Math.min(
      (totalRequiredArea / measurements.totalAreaCm2) * 100,
      100,
    );

    if (measurements.totalAreaCm2 < totalRequiredWithBuffer) {
      return {
        ...template,
        feasible: false,
        fitScore: 0,
        usedAreaPct,
        failReason: "area",
      };
    }

    // ── Stage 2: bounding-box fit check ───────────────────────────────────
    let piecesFit = 0;
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

    const fitScore = totalPieces > 0 ? piecesFit / totalPieces : 0;
    const feasible = piecesFit === totalPieces;

    return {
      ...template,
      feasible,
      fitScore,
      usedAreaPct,
      failReason: feasible ? null : "piece_fit",
    };
  });
}
