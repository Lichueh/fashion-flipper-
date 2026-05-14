import { useState, useCallback, useRef } from "react";
import SegmentationWorkerClass from "../workers/segmentation.worker.js?worker";
import { computeMeasurements } from "../services/measurements.js";
import { checkFeasibility } from "../services/feasibility.js";
import { analyzeFabric } from "../services/fabricAnalysis.js";
import { templates } from "../data/templates.js";
import { mockAnalysis } from "../data/mockAnalysis.js";
import freesewingPatterns from "../data/freesewingPatterns.json";

// Merge FreeSewing piece data into templates so checkFeasibility sees real areas.
// Templates with patternSource: "freesewing" have patternPieces: [] in templates.js;
// the actual pieces live in freesewingPatterns.json.
const templatesWithPieces = Object.fromEntries(
  Object.entries(templates).map(([id, t]) => [
    id,
    t.patternSource === "freesewing" && freesewingPatterns[id]
      ? { ...t, patternPieces: freesewingPatterns[id] }
      : t,
  ]),
);

/**
 * Orchestrates the full analysis pipeline for a garment image.
 *
 * Status flow:
 *   idle → segmenting → awaiting_scale → measuring → checking → done
 *                    ↘ (low confidence / seg error) → done (needsManualInput: true)
 *                                                   → error (unexpected throw)
 *
 * @returns {{
 *   status: 'idle'|'segmenting'|'awaiting_scale'|'measuring'|'checking'|'done'|'error',
 *   progress: number,
 *   segmentation: Object|null,
 *   measurements: Object|null,
 *   feasibleTemplates: Array|null,
 *   fabric: Object,
 *   fabricFailed: boolean,
 *   segmentationFailed: boolean,
 *   needsManualInput: boolean,
 *   needsScaleInput: boolean,
 *   error: string|null,
 *   run: (imageFile: File) => Promise<void>,
 *   submitGarmentLength: (cm: number) => Promise<void>,
 *   setManualFabric: (fabricData: Object) => void,
 *   retry: () => void,
 * }}
 */
// ── Worker singleton ──────────────────────────────────────────────────────────
// Lives at module level so it survives re-renders and is shared across hook
// instances. The worker (and its ONNX WASM) is created only once per page.
let _segWorker = null;
const _segPending = new Map(); // id → { resolve, reject }
let _segIdSeq = 0;

function _getSegWorker() {
  if (_segWorker) return _segWorker;
  _segWorker = new SegmentationWorkerClass();
  _segWorker.onmessage = ({ data }) => {
    const job = _segPending.get(data.id);
    if (!job) return;
    _segPending.delete(data.id);
    if (data.ok) job.resolve(data.result);
    else job.reject(new Error(data.error));
  };
  _segWorker.onerror = (e) => {
    for (const j of _segPending.values())
      j.reject(new Error(e.message ?? "Worker error"));
    _segPending.clear();
    _segWorker = null; // allow recreation on next call
  };
  return _segWorker;
}

async function _runSegmentationInWorker(imageFile) {
  const id = ++_segIdSeq;
  const arrayBuffer = await imageFile.arrayBuffer();
  return new Promise((resolve, reject) => {
    _segPending.set(id, { resolve, reject });
    _getSegWorker().postMessage(
      { id, arrayBuffer, mimeType: imageFile.type },
      [arrayBuffer], // transfer (zero-copy)
    );
  });
}

// Eagerly create the worker (and trigger model download) as soon as this
// module is imported — i.e. when the app first loads, not when Analyze is tapped.
_getSegWorker();

// ─────────────────────────────────────────────────────────────────────────────
export function useAnalysisPipeline() {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [segmentation, setSegmentation] = useState(null);
  const [measurements, setMeasurements] = useState(null);
  const [feasibleTemplates, setFeasibleTemplates] = useState(null);
  const [fabric, setFabric] = useState(mockAnalysis.fabric);
  const [needsManualInput, setNeedsManualInput] = useState(false);
  const [needsScaleInput, setNeedsScaleInput] = useState(false);
  const [fabricFailed, setFabricFailed] = useState(false);
  const [segmentationFailed, setSegmentationFailed] = useState(false);
  const [error, setError] = useState(null);

  // Holds segResult + mask dimensions between the segmenting and measuring stages
  // so submitLongestSide() can resume without re-running segmentation.
  const _pendingRef = useRef(null);
  // Mirrors the fabric state so _measureAndCheck (a plain function, not a hook)
  // can read the latest value without a stale closure.
  const fabricRef = useRef(mockAnalysis.fabric);
  // Snapshot of the last successful _pendingRef so setManualFabric can replay
  // measure + feasibility without re-segmenting.
  const lastSegResultRef = useRef(null);
  // Set by retry() so the next run() bypasses any sessionStorage cache in
  // analyzeFabric and forces a fresh API call.
  const _forceAnalysisRef = useRef(false);

  const reset = () => {
    setStatus("idle");
    setProgress(0);
    setSegmentation(null);
    setMeasurements(null);
    setFeasibleTemplates(null);
    setFabric(mockAnalysis.fabric);
    fabricRef.current = mockAnalysis.fabric;
    setNeedsManualInput(false);
    setNeedsScaleInput(false);
    setFabricFailed(false);
    setSegmentationFailed(false);
    setError(null);
    _pendingRef.current = null;
    lastSegResultRef.current = null;
  };

  // ── Stages 2 + 3: measure then feasibility-check ───────────────────────────
  // Shared by run() (when lengthGarment provided upfront), submitGarmentLength(),
  // and setManualFabric(). Pass fabricOverride to use a specific fabric object
  // instead of fabricRef.current (used by setManualFabric).
  const _measureAndCheck = (lengthGarment, fabricOverride) => {
    const pending = _pendingRef.current;
    if (!pending) return;

    setNeedsScaleInput(false);
    setStatus("measuring");
    setProgress(60);

    // Ruler-calibration path: convert cm/(natural-image px) → cm/(mask px).
    // Mask is a downscaled, aspect-preserved view of the natural image, so the
    // ratio of widths is the same scaling factor in both axes.
    const scaleCmPerMaskPxOverride =
      pending.scaleCmPerImagePx > 0 && pending.imageWidth > 0
        ? pending.scaleCmPerImagePx * (pending.imageWidth / pending.maskW)
        : null;

    const measResult = computeMeasurements(
      pending.segResult,
      pending.maskW,
      pending.maskH,
      lengthGarment,
      pending.hasLayers,
      scaleCmPerMaskPxOverride,
    );

    if (!measResult) {
      setNeedsManualInput(true);
      setProgress(100);
      setStatus("done");
      return;
    }

    setMeasurements(measResult);
    setProgress(75);

    setStatus("checking");
    setProgress(85);

    const feasibility = checkFeasibility(
      measResult,
      templatesWithPieces,
      fabricOverride ?? fabricRef.current,
    );
    setFeasibleTemplates(feasibility);
    setProgress(100);
    setStatus("done");
  };

  // ── Stage 1 + optional auto-continue ────────────────────────────────────────
  const run = useCallback(
    async (
      imageFile,
      lengthGarment,
      hasLayers = true,
      rulerScale = null, // { scaleCmPerImagePx, imageWidth } | null
    ) => {
      reset();

      try {
        setStatus("segmenting");
        setProgress(10);

        // Downscale for segmentation (≤800 px longest side) to cut decode/transfer
        // overhead. SegFormer only needs the outline, not full camera resolution.
        // fabricAnalysis receives the original file for maximum quality.
        // Both chains run fully in parallel.
        //
        // retry() sets _forceAnalysisRef so that if a previous fabric call was
        // cached in sessionStorage, the cache is bypassed and a fresh response
        // is fetched instead.
        const force = _forceAnalysisRef.current;
        _forceAnalysisRef.current = false;
        const [fabricResult, segResult] = await Promise.all([
          analyzeFabric(imageFile, { force }),
          _downscaleForSegmentation(imageFile, 800).then((sf) =>
            _runSegmentationInWorker(sf),
          ),
        ]);

        if (fabricResult) {
          setFabric(fabricResult);
          fabricRef.current = fabricResult;
        } else {
          // fabricResult === null: the fabric API failed or returned no usable data.
          // fabricRef.current keeps mockAnalysis.fabric so checkFeasibility never
          // receives undefined. The UI should check fabricFailed to offer a manual
          // fabric-entry fallback.
          setFabricFailed(true);
        }

        if (segResult.error || segResult.lowConfidence) {
          if (segResult.error) setSegmentationFailed(true);
          setNeedsManualInput(true);
          setSegmentation(segResult.error ? null : segResult);
          setProgress(100);
          setStatus("done");
          return;
        }

        setSegmentation(segResult);
        setProgress(40);

        // Resolve mask dimensions — provided directly by the worker.
        const maskW = segResult.maskWidth;
        const maskH = segResult.maskHeight;

        // Persist segResult + mask dims so submitGarmentLength can resume.
        _pendingRef.current = {
          segResult,
          maskW,
          maskH,
          hasLayers,
          scaleCmPerImagePx: rulerScale?.scaleCmPerImagePx ?? null,
          imageWidth: rulerScale?.imageWidth ?? null,
          lengthGarment: lengthGarment ?? null,
        };
        // Keep a permanent snapshot so setManualFabric can replay measure +
        // feasibility without re-segmenting even after a state reset.
        lastSegResultRef.current = _pendingRef.current;

        // A ruler-derived scale stands on its own — no need for lengthGarment.
        if (lengthGarment > 0 || rulerScale?.scaleCmPerImagePx > 0) {
          _measureAndCheck(lengthGarment);
        } else {
          setNeedsScaleInput(true);
          setStatus("awaiting_scale");
          setProgress(50);
        }
      } catch (err) {
        setError(err?.message ?? String(err));
        setStatus("error");
      }
    },
    [],
  );

  // ── Called when the user submits garment height measurement later ──────────────
  const submitGarmentLength = useCallback((lengthGarment) => {
    try {
      _measureAndCheck(lengthGarment);
    } catch (err) {
      setError(err?.message ?? String(err));
      setStatus("error");
    }
  }, []);

  // ── Called when the user provides fabric data manually after a fabric API failure ──
  const setManualFabric = useCallback((fabricData) => {
    setFabricFailed(false);
    fabricRef.current = fabricData;
    setFabric(fabricData);
    // Re-run only the measure + feasibility stages with the supplied fabric.
    // Skips analyzeFabric and segmentation entirely.
    if (lastSegResultRef.current) {
      _pendingRef.current = lastSegResultRef.current;
      _measureAndCheck(lastSegResultRef.current.lengthGarment, fabricData);
    }
  }, []);

  const retry = useCallback(() => {
    // Signal the next run() to bypass any sessionStorage cache in analyzeFabric
    // so a previously-failed (and possibly cached) response isn't reused.
    _forceAnalysisRef.current = true;
    reset();
  }, []);

  return {
    status,
    progress,
    segmentation,
    measurements,
    feasibleTemplates,
    fabric,
    fabricFailed,
    segmentationFailed,
    needsManualInput,
    needsScaleInput,
    error,
    run,
    submitGarmentLength,
    setManualFabric,
    retry,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Downscale an image file so its longest side is ≤ maxPx, preserving aspect
 * ratio. If the image is already smaller it is returned as-is (no canvas work).
 * Returns a File/Blob suitable for transfer to the segmentation worker.
 */
function _downscaleForSegmentation(file, maxPx = 800) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w <= maxPx && h <= maxPx) {
        // Already small enough — skip re-encoding.
        resolve(file);
        return;
      }
      const scale = maxPx / Math.max(w, h);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fall back to original on error
    };
    img.src = url;
  });
}
