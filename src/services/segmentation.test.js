/**
 * Unit tests for segmentGarment.
 *
 * fetch() is mocked globally — no real HTTP requests are made.
 * The implementation POSTs to /api/segment and derives garmentCategory
 * from the mask bounding-box aspect ratio returned by the server.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { segmentGarment } from "./segmentation.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal File-like object — only the type matters for FormData. */
const fakeFile = new Blob([""], { type: "image/jpeg" });

/**
 * Build a Response-like mock that fetch() will resolve with.
 * @param {object} body   JSON-serialisable response body
 * @param {number} status HTTP status code (default 200)
 */
function mockFetchResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

/**
 * Convenience: set up globalThis.fetch to return a successful mask response.
 * @param {object} overrides Fields to merge into the default payload.
 */
function mockSuccess({
  maskWidth = 100,
  maskHeight = 100,
  totalPixelArea = 50,
  garmentMask = Array(maskWidth * maskHeight).fill(0),
} = {}) {
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue(
      mockFetchResponse({ garmentMask, totalPixelArea, maskWidth, maskHeight }),
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("segmentGarment – garmentCategory inference (aspect ratio)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns "tshirt" for a roughly square mask (100×100)', async () => {
    mockSuccess({ maskWidth: 100, maskHeight: 100, totalPixelArea: 60 });
    const result = await segmentGarment(fakeFile);
    expect(result.garmentCategory).toBe("tshirt");
  });

  it('returns "dress" when height > 1.4 × width (portrait, narrow)', async () => {
    // height 150, width 100 → 150 > 1.4 * 100 = 140 → dress
    mockSuccess({ maskWidth: 100, maskHeight: 150, totalPixelArea: 80 });
    const result = await segmentGarment(fakeFile);
    expect(result.garmentCategory).toBe("dress");
  });

  it('returns "tshirt" when height is exactly 1.4 × width (boundary)', async () => {
    // height 140, width 100 → 140 > 140 is false → tshirt
    mockSuccess({ maskWidth: 100, maskHeight: 140, totalPixelArea: 80 });
    const result = await segmentGarment(fakeFile);
    expect(result.garmentCategory).toBe("tshirt");
  });

  it('returns "pants" when width > height (landscape)', async () => {
    // width 120, height 80 → 120 > 80 → pants
    mockSuccess({ maskWidth: 120, maskHeight: 80, totalPixelArea: 60 });
    const result = await segmentGarment(fakeFile);
    expect(result.garmentCategory).toBe("pants");
  });

  it('returns "tshirt" for square mask (width === height, not landscape)', async () => {
    mockSuccess({ maskWidth: 90, maskHeight: 90, totalPixelArea: 40 });
    const result = await segmentGarment(fakeFile);
    expect(result.garmentCategory).toBe("tshirt");
  });
});

// ---------------------------------------------------------------------------

describe("segmentGarment – lowConfidence threshold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets lowConfidence: false when confidence >= 0.15 (50% coverage)", async () => {
    // 50 garment pixels out of 100 total → confidence 0.50
    mockSuccess({ maskWidth: 10, maskHeight: 10, totalPixelArea: 50 });
    const result = await segmentGarment(fakeFile);
    expect(result.lowConfidence).toBe(false);
    expect(result.confidence).toBeCloseTo(0.5);
  });

  it("sets lowConfidence: false when confidence is exactly 0.15", async () => {
    // 15 / 100 = 0.15 → 0.15 < 0.15 is false
    mockSuccess({ maskWidth: 10, maskHeight: 10, totalPixelArea: 15 });
    const result = await segmentGarment(fakeFile);
    expect(result.lowConfidence).toBe(false);
  });

  it("sets lowConfidence: true when confidence is just below 0.15 (14/100)", async () => {
    mockSuccess({ maskWidth: 10, maskHeight: 10, totalPixelArea: 14 });
    const result = await segmentGarment(fakeFile);
    expect(result.lowConfidence).toBe(true);
  });

  it("sets lowConfidence: true when totalPixelArea is 0", async () => {
    mockSuccess({ maskWidth: 10, maskHeight: 10, totalPixelArea: 0 });
    const result = await segmentGarment(fakeFile);
    expect(result.lowConfidence).toBe(true);
  });

  it("sets confidence to 0 when maskWidth and maskHeight are 0", async () => {
    mockSuccess({ maskWidth: 0, maskHeight: 0, totalPixelArea: 0 });
    const result = await segmentGarment(fakeFile);
    expect(result.confidence).toBe(0);
    expect(result.lowConfidence).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("segmentGarment – return shape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns garmentMask as a Uint8Array", async () => {
    const arr = Array(100).fill(0);
    mockSuccess({
      maskWidth: 10,
      maskHeight: 10,
      totalPixelArea: 50,
      garmentMask: arr,
    });
    const result = await segmentGarment(fakeFile);
    expect(result.garmentMask).toBeInstanceOf(Uint8Array);
    expect(result.garmentMask.length).toBe(100);
  });

  it("returns rawLabels as an empty object (no semantic labels from BiRefNet)", async () => {
    mockSuccess();
    const result = await segmentGarment(fakeFile);
    expect(result.rawLabels).toEqual({});
  });

  it("returns totalPixelArea and mask dimensions from the server response", async () => {
    mockSuccess({ maskWidth: 200, maskHeight: 300, totalPixelArea: 12000 });
    const result = await segmentGarment(fakeFile);
    expect(result.totalPixelArea).toBe(12000);
    expect(result.maskWidth).toBe(200);
    expect(result.maskHeight).toBe(300);
  });

  it("includes confidence in the returned object", async () => {
    mockSuccess({ maskWidth: 10, maskHeight: 10, totalPixelArea: 40 });
    const result = await segmentGarment(fakeFile);
    expect(typeof result.confidence).toBe("number");
    expect(result.confidence).toBeCloseTo(0.4);
  });
});

// ---------------------------------------------------------------------------

describe("segmentGarment – error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error shape when fetch throws a network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network failure"));
    const result = await segmentGarment(fakeFile);
    expect(result.error).toBe(true);
    expect(result.lowConfidence).toBe(true);
    expect(result.message).toContain("network failure");
  });

  it("returns error shape when the server responds with a non-ok status", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        mockFetchResponse(
          { error: true, message: "internal server error" },
          500,
        ),
      );
    const result = await segmentGarment(fakeFile);
    expect(result.error).toBe(true);
    expect(result.lowConfidence).toBe(true);
    expect(typeof result.message).toBe("string");
  });

  it("returns error shape when response body contains data.error flag", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        mockFetchResponse({ error: true, message: "fal.ai timeout" }, 200),
      );
    const result = await segmentGarment(fakeFile);
    expect(result.error).toBe(true);
    expect(result.message).toContain("fal.ai timeout");
  });

  it("uses HTTP status as message when server body has no message field", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(mockFetchResponse({ error: true }, 503));
    const result = await segmentGarment(fakeFile);
    expect(result.error).toBe(true);
    expect(result.message).toContain("503");
  });
});
