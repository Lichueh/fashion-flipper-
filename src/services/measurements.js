/**
 * Converts a segmentation result into physical measurements.
 *
 * Two modes for deriving the pixel→cm scale (mask-grid space):
 *   1. lengthGarment-based (default): cm/px = lengthGarment / bboxHeightPx.
 *   2. ruler-override: caller supplies scaleCmPerMaskPx directly (e.g. derived
 *      from a calibration ruler in the photo). When supplied, it wins.
 *
 * @param {Object} segResult         - Return value of segmentGarment().
 * @param {number} maskWidth         - Width of the mask grid in pixels.
 * @param {number} maskHeight        - Height of the mask grid in pixels.
 * @param {number} lengthGarment      - User-measured height of the garment (top to bottom), cm.
 * @param {boolean} [hasLayers=true] - When true, totalAreaCm2 is doubled to account
 *                                     for the unseen back panel.
 * @param {number|null} [scaleCmPerMaskPxOverride=null] - When set, overrides the
 *                                     lengthGarment-derived scale. Units: cm per
 *                                     mask-grid pixel.
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
  scaleCmPerMaskPxOverride = null,
) {
  if (!segResult?.garmentMask) return null;

  const rawBBox = _boundingBox(segResult.garmentMask, maskWidth, maskHeight);
  const rawPixelArea = _countMaskPixels(segResult.garmentMask);

  const processedMask = _dilateMask(
    segResult.garmentMask,
    maskWidth,
    maskHeight,
    3, // radius in px; try 2–5
  );

  const processedPixelArea = _countMaskPixels(processedMask);
  const processedBBox = _boundingBox(processedMask, maskWidth, maskHeight);

  const bbox = _boundingBox(processedMask, maskWidth, maskHeight);
  if (!bbox || bbox.heightPx === 0) return null;

  const bboxArea = bbox.widthPx * bbox.heightPx;
  const fillRatio = processedPixelArea / bboxArea;

  const shapeAnalysis = _analyzeGarmentShape(
    processedMask,
    maskWidth,
    maskHeight,
    bbox,
    fillRatio,
  );

  const correctionFactor = _computeAreaCorrection(
    shapeAnalysis.garmentShape,
    fillRatio,
  );

  const scaleCmPerPx =
    scaleCmPerMaskPxOverride != null && scaleCmPerMaskPxOverride > 0
      ? scaleCmPerMaskPxOverride
      : lengthGarment / bbox.heightPx;

  const widthCm = _round1(bbox.widthPx * scaleCmPerPx);
  const heightCm = _round1(bbox.heightPx * scaleCmPerPx);
  // Pixel area → cm² using scale²
  const visibleAreaCm2 = Math.round(
    processedPixelArea * scaleCmPerPx * scaleCmPerPx * correctionFactor,
  );

  console.log("[maskDebug]", {
    rawPixelArea,
    processedPixelArea,
    pixelGrowthRatio: processedPixelArea / rawPixelArea,

    rawBBoxWidthPx: rawBBox?.widthPx ?? null,
    rawBBoxHeightPx: rawBBox?.heightPx ?? null,
    processedBBoxWidthPx: processedBBox?.widthPx ?? null,
    processedBBoxHeightPx: processedBBox?.heightPx ?? null,

    rawFillRatio: rawBBox
      ? rawPixelArea / (rawBBox.widthPx * rawBBox.heightPx)
      : null,
    processedFillRatio: processedBBox
      ? processedPixelArea / (processedBBox.widthPx * processedBBox.heightPx)
      : null,
  });
  // 🔍 DEBUG
  console.log("[computeMeasurements]", {
    fillRatio,
    shapeAnalysis,
    visibleAreaCm2,
    correctionFactor,
    maskWidth,
    maskHeight,
    lengthGarment,
    bboxWidthPx: bbox.widthPx,
    bboxHeightPx: bbox.heightPx,
    totalPixelArea: _countMaskPixels(processedMask),
    scaleCmPerPx,
    scaleCmPerMaskPxOverride,
    hasLayers,
    widthCm_check: _round1(bbox.widthPx * scaleCmPerPx),
    heightCm_check: _round1(bbox.heightPx * scaleCmPerPx),
    areaCm2_fromMask: Math.round(
      _countMaskPixels(processedMask) * scaleCmPerPx ** 2,
    ),
    areaCm2_fromBbox: Math.round(
      bbox.widthPx * bbox.heightPx * scaleCmPerPx ** 2,
    ),
    areaCm2_direct: Math.round(
      _round1(bbox.widthPx * scaleCmPerPx) *
        _round1(bbox.heightPx * scaleCmPerPx),
    ),
  });

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
    maxCol,

    minRow,
    maxRow,
  };
}

function _dilateMask(mask, maskW, maskH, radius = 3) {
  const out = new Uint8Array(mask.length);

  for (let row = 0; row < maskH; row++) {
    for (let col = 0; col < maskW; col++) {
      let found = false;

      for (let dy = -radius; dy <= radius && !found; dy++) {
        const y = row + dy;
        if (y < 0 || y >= maskH) continue;

        for (let dx = -radius; dx <= radius; dx++) {
          const x = col + dx;
          if (x < 0 || x >= maskW) continue;

          if (mask[y * maskW + x]) {
            found = true;
            break;
          }
        }
      }

      if (found) {
        out[row * maskW + col] = 1;
      }
    }
  }

  return out;
}

function _countMaskPixels(mask) {
  let count = 0;

  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) count++;
  }

  return count;
}

function _analyzeGarmentShape(mask, maskW, maskH, bbox, fillRatio) {
  const rowOccupancies = [];

  for (let row = bbox.minRow; row <= bbox.maxRow; row++) {
    let occupied = 0;

    for (let col = bbox.minCol; col <= bbox.maxCol; col++) {
      if (mask[row * maskW + col]) {
        occupied++;
      }
    }

    rowOccupancies.push(occupied / bbox.widthPx);
  }

  const avg = (arr) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const topOcc = avg(
    rowOccupancies.slice(
      Math.floor(rowOccupancies.length * 0.15),
      Math.floor(rowOccupancies.length * 0.25),
    ),
  );

  const middleOcc = avg(
    rowOccupancies.slice(
      Math.floor(rowOccupancies.length * 0.45),
      Math.floor(rowOccupancies.length * 0.55),
    ),
  );

  const bottomOcc = avg(
    rowOccupancies.slice(
      Math.floor(rowOccupancies.length * 0.75),
      Math.floor(rowOccupancies.length * 0.85),
    ),
  );

  let garmentShape = "unknown";

  // rectangular
  if (
    fillRatio > 0.82 &&
    Math.abs(topOcc - middleOcc) < 0.1 &&
    Math.abs(bottomOcc - middleOcc) < 0.1
  ) {
    garmentShape = "rectangular";
  }

  // trousers
  else if (bottomOcc < middleOcc * 0.75) {
    garmentShape = "trousers";
  }

  // a-line
  else if (bottomOcc > topOcc * 1.2) {
    garmentShape = "a-line";
  }

  // tshirt
  else if (middleOcc > topOcc * 1.15 && bottomOcc < middleOcc) {
    garmentShape = "tshirt-like";
  }

  return {
    garmentShape,
    topOcc: _round4(topOcc),
    middleOcc: _round4(middleOcc),
    bottomOcc: _round4(bottomOcc),
  };
}

function _computeAreaCorrection(shape, fillRatio) {
  // default: no correction
  let correction = 1.0;

  switch (shape) {
    case "rectangular":
      // scarves, towels, rectangular skirts
      if (fillRatio < 0.92) {
        correction = 1.08;
      }
      break;

    case "tshirt-like":
      // sleeves create some natural empty corners
      if (fillRatio < 0.82) {
        correction = 1.06;
      }
      break;

    case "a-line":
      // low fill ratio is expected
      correction = 1.0;
      break;

    case "trousers":
      // leg gap is real empty space
      correction = 1.0;
      break;
  }

  return correction;
}

function _round1(n) {
  return Math.round(n * 10) / 10;
}
function _round4(n) {
  return Math.round(n * 10000) / 10000;
}
