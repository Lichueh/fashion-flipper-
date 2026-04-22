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
 *   needsManualInput: boolean,
 *   needsScaleInput: boolean,
 *   error: string|null,
 *   run: (imageFile: File) => Promise<void>,
 *   submitLongestSide: (cm: number) => Promise<void>,
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
  const [error, setError] = useState(null);

  // Holds segResult + mask dimensions between the segmenting and measuring stages
  // so submitLongestSide() can resume without re-running segmentation.
  const _pendingRef = useRef(null);
  // Mirrors the fabric state so _measureAndCheck (a plain function, not a hook)
  // can read the latest value without a stale closure.
  const fabricRef = useRef(mockAnalysis.fabric);

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
    setError(null);
    _pendingRef.current = null;
  };

  // ── Stages 2 + 3: measure then feasibility-check ───────────────────────────
  // Shared by run() (when longestSideCm provided upfront) and submitLongestSide().
  const _measureAndCheck = (longestSideCm) => {
    const pending = _pendingRef.current;
    if (!pending) return;

    setNeedsScaleInput(false);
    setStatus("measuring");
    setProgress(60);

    const measResult = computeMeasurements(
      pending.segResult,
      pending.maskW,
      pending.maskH,
      longestSideCm,
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
      fabricRef.current,
    );
    setFeasibleTemplates(feasibility);
    setProgress(100);
    setStatus("done");
  };

  // ── Stage 1 + optional auto-continue ────────────────────────────────────────
  const run = useCallback(async (imageFile, longestSideCm) => {
    reset();

    try {
      setStatus("segmenting");
      setProgress(10);

      // Downscale for segmentation (≤800 px longest side) to cut decode/transfer
      // overhead. SegFormer only needs the outline, not full camera resolution.
      // fabricAnalysis receives the original file for maximum quality.
      // Both chains run fully in parallel.
      const [fabricResult, segResult] = await Promise.all([
        analyzeFabric(imageFile),
        _downscaleForSegmentation(imageFile, 800).then((sf) =>
          _runSegmentationInWorker(sf),
        ),
      ]);

      if (fabricResult) {
        setFabric(fabricResult);
        fabricRef.current = fabricResult;
      }

      if (segResult.error || segResult.lowConfidence) {
        setNeedsManualInput(true);
        setSegmentation(segResult.error ? null : segResult);
        setProgress(100);
        setStatus("done");
        return;
      }

      setSegmentation(segResult);
      setProgress(40);

      // Resolve mask pixel dimensions from the image's native aspect ratio.
      const { width: imgW, height: imgH } =
        await _loadImageDimensions(imageFile);
      const firstMask = Object.values(segResult.regions).find((r) => r.mask);
      const maskW = firstMask
        ? Math.round(Math.sqrt(firstMask.mask.length * (imgW / imgH)))
        : imgW;
      const maskH = firstMask
        ? Math.round(firstMask.mask.length / maskW)
        : imgH;

      // Persist segResult + mask dims so submitLongestSide can resume.
      _pendingRef.current = { segResult, maskW, maskH };

      if (longestSideCm > 0) {
        // Scale was provided upfront — skip the pause and finish immediately.
        _measureAndCheck(longestSideCm);
      } else {
        setNeedsScaleInput(true);
        setStatus("awaiting_scale");
        setProgress(50);
      }
    } catch (err) {
      setError(err?.message ?? String(err));
      setStatus("error");
    }
  }, []);

  // ── Called when the user submits longest-side measurement later ──────────────
  const submitLongestSide = useCallback((longestSideCm) => {
    try {
      _measureAndCheck(longestSideCm);
    } catch (err) {
      setError(err?.message ?? String(err));
      setStatus("error");
    }
  }, []);

  const retry = useCallback(() => {
    reset();
  }, []);

  return {
    status,
    progress,
    segmentation,
    measurements,
    feasibleTemplates,
    fabric,
    needsManualInput,
    needsScaleInput,
    error,
    run,
    submitLongestSide,
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

function _loadImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = url;
  });
}
