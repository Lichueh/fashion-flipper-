/**
 * Garment segmentation service using Transformers.js (in-browser, no backend).
 *
 * Uses Xenova/segformer_b2_clothes to produce pixel-level masks for the
 * visible regions of a garment in a front-facing photo.
 *
 * @typedef {Object} RegionData
 * @property {number}           pixelArea  - Number of pixels belonging to this region.
 * @property {number}           confidence - pixelArea / totalGarmentPixels (0–1).
 * @property {Uint8Array|null}  mask       - Binary mask (1 = in region, 0 = out), length = width×height, or null.
 *
 * @typedef {Object} SegmentationResult
 * @property {'tshirt'|'dress'|'pants'|'unknown'} garmentCategory
 * @property {boolean}  lowConfidence - true when the dominant region confidence is below 0.15.
 * @property {{ frontPanel: RegionData, sleeveLeft: RegionData, sleeveRight: RegionData, backPanel: RegionData }} regions
 * @property {Object}   rawLabels     - label → pixelArea map from the model output, for debugging.
 *
 * On any error the function returns:
 * { error: true, message: string, lowConfidence: true }
 */

import { pipeline } from "@huggingface/transformers";

// Module-level cache – loaded once per page, reused on every subsequent call.
let _segmentationPipeline = null;

export async function getSegmentationPipeline() {
  if (!_segmentationPipeline) {
    _segmentationPipeline = await pipeline(
      "image-segmentation",
      "Xenova/segformer_b2_clothes",
    );
  }
  return _segmentationPipeline;
}

// ---------------------------------------------------------------------------
// Label → region mapping
// ---------------------------------------------------------------------------
const FRONT_PANEL_LABELS = ["upper-clothes", "dress", "coat"];
const SLEEVE_LEFT_LABELS = ["left-arm"];
const SLEEVE_RIGHT_LABELS = ["right-arm"];
// All labels that count as "garment pixels" for the confidence denominator.
const ALL_GARMENT_LABELS = [
  "upper-clothes",
  "dress",
  "coat",
  "pants",
  "skirt",
  "left-arm",
  "right-arm",
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Segment the garment visible in a browser File and return region masks.
 *
 * @param {File} imageFile - A browser File object from <input type="file">.
 * @returns {Promise<SegmentationResult>}
 */
export async function segmentGarment(imageFile) {
  try {
    const pipe = await getSegmentationPipeline();

    // Create a short-lived object URL so Transformers.js can fetch the image.
    const objectUrl = URL.createObjectURL(imageFile);
    let segments;
    try {
      segments = await pipe(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }

    // Build label → { pixelArea, maskData } from the raw model output.
    const labelMap = {};
    for (const seg of segments) {
      const { label, mask } = seg;
      // mask.data is a Uint8ClampedArray; values are 0 (out) or 255 (in).
      const src = mask.data;
      let area = 0;
      const binary = new Uint8Array(src.length);
      for (let i = 0; i < src.length; i++) {
        if (src[i] > 0) {
          binary[i] = 1;
          area++;
        }
      }
      labelMap[label.toLowerCase()] = { pixelArea: area, maskData: binary };
    }

    // Sum pixels across all garment labels for the confidence denominator.
    let totalGarmentPixels = 0;
    for (const lbl of ALL_GARMENT_LABELS) {
      if (labelMap[lbl]) totalGarmentPixels += labelMap[lbl].pixelArea;
    }

    // Merge one or more model labels into a single RegionData object.
    function mergeRegion(labels) {
      let area = 0;
      let mergedMask = null;
      for (const lbl of labels) {
        const entry = labelMap[lbl];
        if (!entry) continue;
        area += entry.pixelArea;
        if (!mergedMask) {
          mergedMask = new Uint8Array(entry.maskData); // copy
        } else {
          for (let i = 0; i < mergedMask.length; i++) {
            mergedMask[i] = mergedMask[i] | entry.maskData[i];
          }
        }
      }
      const confidence = totalGarmentPixels > 0 ? area / totalGarmentPixels : 0;
      return { pixelArea: area, confidence, mask: mergedMask };
    }

    const frontPanel = mergeRegion(FRONT_PANEL_LABELS);
    const sleeveLeft = mergeRegion(SLEEVE_LEFT_LABELS);
    const sleeveRight = mergeRegion(SLEEVE_RIGHT_LABELS);
    // Back panel is never visible in a front-facing photo.
    const backPanel = { pixelArea: 0, confidence: 0, mask: null };

    // Infer garment category from which label group has the most pixels.
    const px = (lbl) => labelMap[lbl]?.pixelArea ?? 0;
    const tshirtPx = px("upper-clothes") + px("coat");
    const dressPx = px("dress");
    const pantsPx = px("pants");
    const maxPx = Math.max(tshirtPx, dressPx, pantsPx);

    let garmentCategory = "unknown";
    if (maxPx > 0) {
      if (maxPx === tshirtPx) garmentCategory = "tshirt";
      else if (maxPx === dressPx) garmentCategory = "dress";
      else if (maxPx === pantsPx) garmentCategory = "pants";
    }

    // lowConfidence: the dominant region's confidence is below the threshold.
    const dominantConfidence = Math.max(
      frontPanel.confidence,
      sleeveLeft.confidence,
      sleeveRight.confidence,
    );
    const lowConfidence = dominantConfidence < 0.15;

    // Build a compact rawLabels map (label → pixelArea only; masks omitted).
    const rawLabels = {};
    for (const [lbl, val] of Object.entries(labelMap)) {
      rawLabels[lbl] = val.pixelArea;
    }

    return {
      garmentCategory,
      lowConfidence,
      regions: { frontPanel, sleeveLeft, sleeveRight, backPanel },
      rawLabels,
    };
  } catch (err) {
    return {
      error: true,
      message: err?.message ?? String(err),
      lowConfidence: true,
    };
  }
}
