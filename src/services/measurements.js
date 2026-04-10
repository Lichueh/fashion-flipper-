/**
 * Converts a segmentation result into physical measurements using a
 * user-supplied longest-side measurement as the pixel→cm scale reference.
 *
 * The scale factor is derived by dividing the user's stated longest side (cm)
 * by the longest dimension (width or height) of the frontPanel bounding box
 * in pixels. All other regions use the same scale factor.
 *
 * @param {Object} segResult         - Return value of segmentGarment().
 * @param {number} maskWidth         - Width of the mask grid in pixels.
 * @param {number} maskHeight        - Height of the mask grid in pixels.
 * @param {number} longestSideCm     - User-measured longest side of the garment, cm.
 *
 * @returns {{
 *   totalAreaCm2:  number,
 *   scaleCmPerPx:  number,
 *   panels: {
 *     frontPanel:  { widthCm: number, heightCm: number, areaCm2: number } | null,
 *     sleeveLeft:  { widthCm: number, heightCm: number, areaCm2: number } | null,
 *     sleeveRight: { widthCm: number, heightCm: number, areaCm2: number } | null,
 *   }
 * } | null} null when the front panel mask is absent or has zero width.
 */
export function computeMeasurements(
  segResult,
  maskWidth,
  maskHeight,
  longestSideCm,
) {
  const frontRegion = segResult.regions.frontPanel;
  if (!frontRegion?.mask) return null;

  const frontBbox = _boundingBox(frontRegion.mask, maskWidth, maskHeight);
  if (!frontBbox || frontBbox.heightPx === 0) return null;

  // 1 pixel = this many centimetres
  const scaleCmPerPx = longestSideCm / frontBbox.heightPx;

  function measureRegion(region) {
    if (!region?.mask) return null;
    const bbox = _boundingBox(region.mask, maskWidth, maskHeight);
    if (!bbox) return null;
    return {
      widthCm: _round1(bbox.widthPx * scaleCmPerPx),
      heightCm: _round1(bbox.heightPx * scaleCmPerPx),
      // pixelArea is already counted in segmentation; multiply by scale²
      areaCm2: Math.round(region.pixelArea * scaleCmPerPx * scaleCmPerPx),
    };
  }

  const frontPanel = measureRegion(frontRegion);
  const sleeveLeft = measureRegion(segResult.regions.sleeveLeft);
  const sleeveRight = measureRegion(segResult.regions.sleeveRight);

  const totalAreaCm2 =
    (frontPanel?.areaCm2 ?? 0) +
    (sleeveLeft?.areaCm2 ?? 0) +
    (sleeveRight?.areaCm2 ?? 0);

  const bboxFraction = {
    x: frontBbox.minCol / maskWidth, 
    y: frontBbox.minRow / maskHeight,
    w: frontBbox.widthPx / maskWidth,
    h: frontBbox.heightPx / maskHeight,
  };

  return {
    totalAreaCm2,
    scaleCmPerPx: _round4(scaleCmPerPx),
    panels: { frontPanel, sleeveLeft, sleeveRight },
    bboxFraction,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Compute the tight axis-aligned bounding box of active (value = 1) pixels
 * in a flat row-major binary mask.
 *
 * @param   {Uint8Array} mask
 * @param   {number}     maskW
 * @param   {number}     maskH
 * @returns {{ widthPx: number, heightPx: number, minCol: number, minRow: number } | null}
 */
function _boundingBox(mask, maskW, maskH) {
  let minRow = maskH,
    maxRow = -1,
    minCol = maskW,
    maxCol = -1;
  for (let row = 0; row < maskH; row++) {
    const rowOffset = row * maskW;
    for (let col = 0; col < maskW; col++) {
      if (mask[rowOffset + col]) {
        if (row < minRow) minRow = row;
        if (row > maxRow) maxRow = row;
        if (col < minCol) minCol = col;
        if (col > maxCol) maxCol = col;
      }
    }
  }
  if (maxRow === -1) return null; // no active pixels
  return {
    widthPx: maxCol - minCol + 1,
    heightPx: maxRow - minRow + 1,
    minCol,
    minRow,
  };
}

function _round1(n) {
  return Math.round(n * 10) / 10;
}
function _round4(n) {
  return Math.round(n * 10000) / 10000;
}
