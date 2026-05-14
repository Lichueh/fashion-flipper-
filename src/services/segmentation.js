/**
 * Garment segmentation service — calls /api/segment (Vercel serverless),
 * which proxies to fal.ai BiRefNet (primary) or rembg (fallback).
 *
 * @typedef {Object} SegmentationResult
 * @property {'tshirt'|'dress'|'pants'|'unknown'} garmentCategory
 * @property {Uint8Array} garmentMask   - flat binary mask (1 = garment, 0 = bg)
 * @property {number}     totalPixelArea
 * @property {number}     maskWidth
 * @property {number}     maskHeight
 * @property {number}     confidence    - garment pixels / total pixels (0–1)
 * @property {boolean}    lowConfidence - true when confidence < 0.15
 * @property {Object}     rawLabels     - always {} (no semantic labels from BiRefNet)
 *
 * On any error: { error: true, message: string, lowConfidence: true }
 */

/**
 * Segment the garment visible in a browser File or Blob.
 * Sends the image to /api/segment as FormData and returns a SegmentationResult.
 *
 * @param {File|Blob} imageFile
 * @returns {Promise<SegmentationResult>}
 */
export async function segmentGarment(imageFile) {
  try {
    const formData = new FormData();
    formData.append("image", imageFile);

    const res = await fetch("/api/segment", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        error: true,
        message: data.message ?? `HTTP ${res.status}`,
        lowConfidence: true,
      };
    }

    const {
      garmentMask: maskArray,
      totalPixelArea,
      maskWidth,
      maskHeight,
    } = data;

    // API returns a plain Array from JSON — restore typed array for callers.
    const garmentMask = new Uint8Array(maskArray);

    // Confidence: fraction of image pixels covered by the garment mask.
    const confidence =
      maskWidth * maskHeight > 0
        ? totalPixelArea / (maskWidth * maskHeight)
        : 0;
    const lowConfidence = confidence < 0.15;

    // BiRefNet is a binary background-removal model with no semantic labels.
    // garmentCategory is derived from the mask bounding-box aspect ratio as a
    // geometric heuristic, replacing SegFormer's per-label pixel counts.
    let garmentCategory = "tshirt";
    if (maskHeight > 1.4 * maskWidth) garmentCategory = "dress";
    else if (maskWidth > maskHeight) garmentCategory = "pants";

    return {
      garmentCategory,
      garmentMask,
      totalPixelArea,
      maskWidth,
      maskHeight,
      confidence,
      lowConfidence,
      rawLabels: {},
    };
  } catch (err) {
    return {
      error: true,
      message: err?.message ?? String(err),
      lowConfidence: true,
    };
  }
}
