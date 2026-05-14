// @vitest-environment happy-dom
/**
 * Unit tests for useAnalysisPipeline.
 *
 * Covers the new state fields and behaviour added in the latest revision:
 *   - fabricFailed / segmentationFailed flags
 *   - setManualFabric() replay (measure + feasibility, no re-segmentation)
 *   - retry() force-bypass of the sessionStorage fabric cache
 *
 * All external dependencies (worker, services) are mocked so the tests run
 * without a real camera or API key.
 */

import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Worker mock ───────────────────────────────────────────────────────────────
// vi.hoisted() runs before any import statement, so the factory result is
// available inside the vi.mock() factory below.
const { createWorker, setWorkerResult } = vi.hoisted(() => {
  let _result = {
    maskWidth: 100,
    maskHeight: 150,
    lowConfidence: false,
    error: false,
  };
  let _instance = null;

  return {
    createWorker: () => {
      _instance = {
        onmessage: null,
        onerror: null,
        // Simulate an async worker response in the next microtask.
        postMessage: vi.fn(({ id }) => {
          const r = _result;
          Promise.resolve().then(() => {
            _instance?.onmessage?.({ data: { id, ok: true, result: r } });
          });
        }),
      };
      return _instance;
    },
    setWorkerResult: (r) => {
      _result = r;
    },
  };
});

// Vite's ?worker import resolves to a class — use a real class so `new` works.
// Returning an object from a constructor makes `new Cls()` equal to that object,
// so the module's `_segWorker.onmessage = handler` assignment lands on the same
// object that `_instance` references inside the factory.
vi.mock("../workers/segmentation.worker.js?worker", () => ({
  default: class MockSegWorker {
    constructor() {
      return createWorker();
    }
  },
}));

// ── Service mocks ─────────────────────────────────────────────────────────────
vi.mock("../services/fabricAnalysis.js", () => ({ analyzeFabric: vi.fn() }));
vi.mock("../services/measurements.js", () => ({
  computeMeasurements: vi.fn(),
}));
vi.mock("../services/feasibility.js", () => ({ checkFeasibility: vi.fn() }));

// ── Imports (must come after vi.mock calls) ───────────────────────────────────
import { analyzeFabric } from "../services/fabricAnalysis.js";
import { computeMeasurements } from "../services/measurements.js";
import { checkFeasibility } from "../services/feasibility.js";
import { useAnalysisPipeline } from "./useAnalysisPipeline.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────
const MOCK_FILE = new File(["x"], "shirt.jpg", { type: "image/jpeg" });
const MOCK_FABRIC = { type: { en: "Cotton" }, color: { en: "Blue" } };
const SEG_OK = {
  maskWidth: 100,
  maskHeight: 150,
  lowConfidence: false,
  error: false,
};
const MOCK_MEAS = {
  totalAreaCm2: 1500,
  panels: { frontPanel: { widthCm: 50, heightCm: 30, areaCm2: 1500 } },
};
const MOCK_FEA = [{ id: "bag", feasible: true, fitScore: 1, failReason: null }];

// ── Per-test setup ────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();

  // Default happy-path service responses.
  analyzeFabric.mockResolvedValue(MOCK_FABRIC);
  setWorkerResult(SEG_OK);
  computeMeasurements.mockReturnValue(MOCK_MEAS);
  checkFeasibility.mockReturnValue(MOCK_FEA);

  // Stub URL methods — happy-dom may not support blob: URLs.
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:mock"),
    revokeObjectURL: vi.fn(),
  });

  // Stub Image so _downscaleForSegmentation always takes the onerror fallback
  // path (blob:mock is not a real image URL), returning the original file.
  vi.stubGlobal(
    "Image",
    class {
      constructor() {
        this.onload = null;
        this.onerror = null;
      }
      set src(_url) {
        Promise.resolve().then(() => this.onerror?.());
      }
    },
  );
});

// ── Helper: run the full pipeline and await completion ────────────────────────
async function runPipeline(result, file = MOCK_FILE, length = 70) {
  await act(async () => {
    await result.current.run(file, length);
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("happy path", () => {
  it("status reaches 'done' with feasibleTemplates", async () => {
    const { result } = renderHook(() => useAnalysisPipeline());
    await runPipeline(result);

    expect(result.current.status).toBe("done");
    expect(result.current.feasibleTemplates).toEqual(MOCK_FEA);
    expect(result.current.fabricFailed).toBe(false);
    expect(result.current.segmentationFailed).toBe(false);
  });
});

// ── fabricFailed ──────────────────────────────────────────────────────────────
describe("fabricFailed", () => {
  it("is true when analyzeFabric returns null", async () => {
    analyzeFabric.mockResolvedValue(null);
    const { result } = renderHook(() => useAnalysisPipeline());
    await runPipeline(result);

    expect(result.current.fabricFailed).toBe(true);
  });

  it("is false when analyzeFabric returns valid data", async () => {
    const { result } = renderHook(() => useAnalysisPipeline());
    await runPipeline(result);

    expect(result.current.fabricFailed).toBe(false);
  });

  it("does not abort the pipeline — status still reaches 'done'", async () => {
    analyzeFabric.mockResolvedValue(null);
    const { result } = renderHook(() => useAnalysisPipeline());
    await runPipeline(result);

    expect(result.current.status).toBe("done");
    expect(result.current.feasibleTemplates).toBeDefined();
  });
});

// ── segmentationFailed ────────────────────────────────────────────────────────
describe("segmentationFailed", () => {
  it("is true when segResult.error is true", async () => {
    setWorkerResult({ error: true });
    const { result } = renderHook(() => useAnalysisPipeline());
    await runPipeline(result);

    expect(result.current.segmentationFailed).toBe(true);
    expect(result.current.needsManualInput).toBe(true);
  });

  it("is false (but needsManualInput is true) when segResult.lowConfidence", async () => {
    setWorkerResult({
      maskWidth: 100,
      maskHeight: 150,
      lowConfidence: true,
      error: false,
    });
    const { result } = renderHook(() => useAnalysisPipeline());
    await runPipeline(result);

    expect(result.current.segmentationFailed).toBe(false);
    expect(result.current.needsManualInput).toBe(true);
  });
});

// ── retry() ───────────────────────────────────────────────────────────────────
describe("retry()", () => {
  it("resets fabricFailed and segmentationFailed to false", async () => {
    analyzeFabric.mockResolvedValue(null);
    setWorkerResult({ error: true });
    const { result } = renderHook(() => useAnalysisPipeline());

    await runPipeline(result);
    expect(result.current.fabricFailed).toBe(true);
    expect(result.current.segmentationFailed).toBe(true);

    act(() => result.current.retry());

    expect(result.current.fabricFailed).toBe(false);
    expect(result.current.segmentationFailed).toBe(false);
  });

  it("causes the next run() to call analyzeFabric with { force: true }", async () => {
    const { result } = renderHook(() => useAnalysisPipeline());

    await runPipeline(result);
    act(() => result.current.retry());
    await runPipeline(result);

    expect(analyzeFabric).toHaveBeenCalledTimes(2);
    expect(analyzeFabric.mock.calls[1][1]).toEqual({ force: true });
  });

  it("the first run() does NOT pass force: true", async () => {
    const { result } = renderHook(() => useAnalysisPipeline());
    await runPipeline(result);

    expect(analyzeFabric.mock.calls[0][1]).toEqual({ force: false });
  });
});

// ── setManualFabric() ─────────────────────────────────────────────────────────
describe("setManualFabric()", () => {
  it("clears fabricFailed", async () => {
    analyzeFabric.mockResolvedValue(null);
    const { result } = renderHook(() => useAnalysisPipeline());
    await runPipeline(result);
    expect(result.current.fabricFailed).toBe(true);

    act(() => result.current.setManualFabric(MOCK_FABRIC));

    expect(result.current.fabricFailed).toBe(false);
  });

  it("updates the fabric state to the supplied data", async () => {
    analyzeFabric.mockResolvedValue(null);
    const { result } = renderHook(() => useAnalysisPipeline());
    await runPipeline(result);

    const customFabric = { type: { en: "Denim" } };
    act(() => result.current.setManualFabric(customFabric));

    expect(result.current.fabric).toEqual(customFabric);
  });

  it("re-runs checkFeasibility with the provided fabricData", async () => {
    analyzeFabric.mockResolvedValue(null);
    const { result } = renderHook(() => useAnalysisPipeline());
    await runPipeline(result); // first checkFeasibility call (with fallback fabric)

    const customFabric = { type: { en: "Linen" } };
    act(() => result.current.setManualFabric(customFabric));

    // Called once in run(), once in setManualFabric()
    expect(checkFeasibility).toHaveBeenCalledTimes(2);
    // Second call must receive customFabric as the third argument
    expect(checkFeasibility.mock.calls[1][2]).toEqual(customFabric);
  });

  it("does not call analyzeFabric again", async () => {
    analyzeFabric.mockResolvedValue(null);
    const { result } = renderHook(() => useAnalysisPipeline());
    await runPipeline(result);

    act(() => result.current.setManualFabric(MOCK_FABRIC));

    expect(analyzeFabric).toHaveBeenCalledTimes(1);
  });

  it("is a no-op before run() has been called", () => {
    const { result } = renderHook(() => useAnalysisPipeline());

    // Should not throw
    act(() => result.current.setManualFabric(MOCK_FABRIC));

    expect(checkFeasibility).not.toHaveBeenCalled();
  });
});
