/**
 * Web Worker for garment segmentation.
 *
 * Runs Transformers.js / WASM inference on a separate OS thread so the main
 * thread (and its CSS animations) are never blocked.
 *
 * Protocol:
 *   Main → Worker:  { id: number, arrayBuffer: ArrayBuffer, mimeType: string }
 *                   (arrayBuffer is transferred, zero-copy)
 *   Worker → Main:  { id: number, ok: true,  result: SegmentationResult }
 *                 | { id: number, ok: false, error: string }
 */

import {
  segmentGarment,
  getSegmentationPipeline,
} from "../services/segmentation.js";

// Start loading the ONNX model immediately when the worker is created,
// so it's ready (or nearly ready) by the time the user taps Analyze.
getSegmentationPipeline();

self.onmessage = async ({ data: { id, arrayBuffer, mimeType } }) => {
  try {
    const blob = new Blob([arrayBuffer], { type: mimeType || "image/jpeg" });
    const result = await segmentGarment(blob);
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err?.message ?? String(err) });
  }
};
