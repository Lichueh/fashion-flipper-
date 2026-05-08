/**
 * Converts a segmentation result into physical measurements using a
 * user-supplied longest-side measurement as the pixel→cm scale reference.
 *
 * The scale factor is derived by dividing the user's stated longest side (cm)
 * by the height of the garment's bounding box in pixels.
 *
 * @param {Object} segResult         - Return value of segmentGarment().
 * @param {number} maskWidth         - Width of the mask grid in pixels.
 * @param {number} maskHeight        - Height of the mask grid in pixels.
 * @param {number} lengthGarment      - User-measured height of the garment (top to bottom), cm.
 * @param {boolean} [hasLayers=true] - When true, totalAreaCm2 is doubled to account
 *                                     for the unseen back panel.
 *
 * @returns {{
 *   totalAreaCm2:  number,
 *   scaleCmPerPx:  number,
 *   panels: {
 *     frontPanel: { widthCm: number, heightCm: number, areaCm2: number } | null,
 *     sleeveLeft:  null,
 *     sleeveRight: null,
 *   },
 *   bboxFraction: { x: number, y: number, w: number, h: number },
 * } | null} null when garmentMask is absent or has zero height.
 */
export function computeMeasurements(
  segResult,
  maskWidth,
  maskHeight,
  lengthGarment,
  hasLayers = true,
) {
  if (!segResult?.garmentMask) return null;

  const bbox = _boundingBox(segResult.garmentMask, maskWidth, maskHeight);
  if (!bbox || bbox.heightPx === 0) return null;

  // Derive scale from the user's stated garment height vs the bounding box height
  const scaleCmPerPx = lengthGarment / bbox.heightPx;

  const widthCm = _round1(bbox.widthPx * scaleCmPerPx);
  const heightCm = _round1(bbox.heightPx * scaleCmPerPx);
  // Pixel area → cm² using scale²
  const areaCm2 = Math.round(
    segResult.totalPixelArea * scaleCmPerPx * scaleCmPerPx,
  );

  const visibleAreaCm2 = areaCm2;
  const totalAreaCm2 = visibleAreaCm2 * (hasLayers ? 2 : 1);

  const bboxFraction = {
    x: bbox.minCol / maskWidth,
    y: bbox.minRow / maskHeight,
    w: bbox.widthPx / maskWidth,
    h: bbox.heightPx / maskHeight,
  };

  return {
    totalAreaCm2,
    scaleCmPerPx: _round4(scaleCmPerPx),
    panels: {
      // sleeveLeft/sleeveRight kept as null — panel breakdown no longer computed
      frontPanel: { widthCm, heightCm, areaCm2: visibleAreaCm2 },
      sleeveLeft: null,
      sleeveRight: null,
    },
    bboxFraction,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

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
  if (maxRow === -1) return null;
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
