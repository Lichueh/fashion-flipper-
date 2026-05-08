/**
 * Garment segmentation service using Transformers.js (in-browser, no backend).
 *
 * Uses Xenova/segformer_b2_clothes — a SegFormer model fine-tuned on the ATR
 * dataset — to classify every pixel of the input image into clothing labels.
 *
 * @typedef {Object} SegmentationResult
 * @property {'tshirt'|'dress'|'pants'|'unknown'} garmentCategory
 * @property {number}  totalPixelArea - Sum of all garment pixels across labels.
 * @property {number}  confidence     - totalPixelArea / imagePixels (0–1).
 * @property {boolean} lowConfidence  - true when confidence is below 0.15.
 * @property {Object}  rawLabels      - label → pixelArea map, for debugging.
 *
 * On any error: { error: true, message: string, lowConfidence: true }
 */

import { pipeline } from "@huggingface/transformers";

// Loaded once per page session and reused on every subsequent call.
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

// Labels the model can return that represent actual garment fabric.
// Skirt counts toward pants since both represent lower-body fabric area.
const ALL_GARMENT_LABELS = [
  "upper-clothes",
  "dress",
  "coat",
  "pants",
  "skirt",
  "left-arm",
  "right-arm",
];

/**
 * Segment the garment visible in a browser File.
 *
 * @param {File} imageFile - A browser File object from <input type="file">.
 * @returns {Promise<SegmentationResult>}
 */
export async function segmentGarment(imageFile) {
  try {
    const pipe = await getSegmentationPipeline();

    // Short-lived object URL so Transformers.js can fetch the image bytes.
    const objectUrl = URL.createObjectURL(imageFile);
    let segments;
    try {
      segments = await pipe(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }

    // Count active pixels per label. mask.data is Uint8ClampedArray: 0 = out, 255 = in.
    const labelMap = {};
    let imagePixels = 0;
    for (const { label, mask } of segments) {
      if (imagePixels === 0) imagePixels = mask.data.length;
      let area = 0;
      for (let i = 0; i < mask.data.length; i++) {
        if (mask.data[i] > 0) area++;
      }
      labelMap[label.toLowerCase()] = area;
    }

    const px = (lbl) => labelMap[lbl] ?? 0;

    const totalPixelArea = ALL_GARMENT_LABELS.reduce(
      (sum, lbl) => sum + px(lbl),
      0,
    );
    const confidence = imagePixels > 0 ? totalPixelArea / imagePixels : 0;
    const lowConfidence = confidence < 0.15;

    // Dominant label group determines garment category.
    const tshirtPx = px("upper-clothes") + px("coat");
    const dressPx = px("dress");
    const pantsPx = px("pants") + px("skirt");
    const maxPx = Math.max(tshirtPx, dressPx, pantsPx);

    let garmentCategory = "unknown";
    if (maxPx > 0) {
      if (maxPx === dressPx) garmentCategory = "dress";
      else if (maxPx === pantsPx) garmentCategory = "pants";
      else garmentCategory = "tshirt";
    }

    // After the labelMap loop, build a combined garment mask for rendering
    let garmentMask = null;
    let maskWidth = 0;
    let maskHeight = 0;

    for (const lbl of ALL_GARMENT_LABELS) {
      const seg = segments.find((s) => s.label.toLowerCase() === lbl);
      const src = seg?.mask?.data;
      if (!src) continue;
      if (!garmentMask) {
        garmentMask = new Uint8Array(src.length);
        // mask.width / mask.height are set by Transformers.js on the mask object
        maskWidth = seg.mask.width;
        maskHeight = seg.mask.height;
      }
      for (let i = 0; i < src.length; i++) {
        if (src[i] > 0) garmentMask[i] = 1;
      }
    }

    return {
      garmentCategory,
      totalPixelArea,
      confidence,
      lowConfidence,
      rawLabels: labelMap,
      garmentMask,
      maskWidth, 
      maskHeight,
    };
  } catch (err) {
    return {
      error: true,
      message: err?.message ?? String(err),
      lowConfidence: true,
    };
  }
}
