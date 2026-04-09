/**
 * Unit tests for checkFeasibility.
 *
 * Tests 1 & 2 use the real templates (imported from data/) so they validate
 * against production data. Tests 3–5 use inline mock templates with dimensions
 * engineered to expose specific branch conditions.
 *
 * Real template totals (for reference):
 *   Tote bag : 5 pieces, 875 cm², buffer 962.5 cm², largest piece 20×15 cm
 *   Bucket hat: 8 pieces, 1446 cm², buffer 1590.6 cm², largest piece 30×30 cm (brim)
 */

import { describe, it, expect } from "vitest";
import { checkFeasibility } from "./feasibility.js";
import { templates as realTemplates } from "../data/templates.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a measurements object with a single front panel and two null sleeve panels. */
function makeMeasurements(panelW, panelH, totalAreaCm2) {
  return {
    totalAreaCm2,
    panels: {
      frontPanel: {
        widthCm: panelW,
        heightCm: panelH,
        areaCm2: panelW * panelH,
      },
      sleeveLeft: null,
      sleeveRight: null,
    },
  };
}

/** Find a result by its template id field. */
function byId(results, id) {
  return results.find((r) => r.id === id);
}

// ── Test 1: Large T-shirt → tote bag feasible ────────────────────────────────
// Bag area check:   875 × 1.1 = 962.5 ≤ 3500  → passes Stage 1
// Bag piece fit:    all pieces ≤ 20×15, easily fit in 80×60  → passes Stage 2
// ─────────────────────────────────────────────────────────────────────────────
describe("large T-shirt (80×60 cm panel, 3500 cm²) — tote bag", () => {
  const measurements = makeMeasurements(80, 60, 3500);

  it("tote bag is feasible", () => {
    const results = checkFeasibility(measurements, realTemplates);
    expect(byId(results, "bag").feasible).toBe(true);
  });

  it("failReason is null", () => {
    const results = checkFeasibility(measurements, realTemplates);
    expect(byId(results, "bag").failReason).toBeNull();
  });

  it("fitScore is 1 — every piece fits the panel", () => {
    const results = checkFeasibility(measurements, realTemplates);
    expect(byId(results, "bag").fitScore).toBe(1);
  });

  it("usedAreaPct is capped at 100 and is a positive number", () => {
    const results = checkFeasibility(measurements, realTemplates);
    const { usedAreaPct } = byId(results, "bag");
    expect(usedAreaPct).toBeGreaterThan(0);
    expect(usedAreaPct).toBeLessThanOrEqual(100);
  });
});

// ── Test 2: Small garment → nothing fits ─────────────────────────────────────
// Bag buffer:  962.5  > 400  → area fail
// Hat buffer: 1590.6  > 400  → area fail
// ─────────────────────────────────────────────────────────────────────────────
describe("small garment (25×20 cm panel, 400 cm²) — all templates fail", () => {
  const measurements = makeMeasurements(25, 20, 400);

  it("every template is infeasible", () => {
    const results = checkFeasibility(measurements, realTemplates);
    expect(results.every((r) => r.feasible === false)).toBe(true);
  });

  it('every template fails with failReason "area"', () => {
    const results = checkFeasibility(measurements, realTemplates);
    expect(results.every((r) => r.failReason === "area")).toBe(true);
  });

  it("every template has fitScore 0 — Stage 2 never runs", () => {
    const results = checkFeasibility(measurements, realTemplates);
    expect(results.every((r) => r.fitScore === 0)).toBe(true);
  });

  it("both known templates appear in the results", () => {
    const results = checkFeasibility(measurements, realTemplates);
    expect(byId(results, "bag")).toBeDefined();
    expect(byId(results, "hat")).toBeDefined();
  });
});

// ── Test 3: Area ok but one piece doesn't fit ─────────────────────────────────
//
// Mock template has 3 pieces: two 20×20 cm and one 32×16 cm.
//   Total area: 400 + 400 + 512 = 1312 cm², buffer: 1443.2 ≤ 1800 → Stage 1 passes.
//
// Fit check against 30×28 cm panel:
//   20×20 → 20 ≤ 30 AND 20 ≤ 28              → FITS ✓
//   32×16 → natural: 32 > 30                  → no
//            rotated: 16 ≤ 30 BUT 32 > 28     → no
//            → DOES NOT FIT ✗
//
// Expected: feasible false, failReason 'piece_fit', fitScore = 2/3.
// ─────────────────────────────────────────────────────────────────────────────
describe("medium garment (30×28 cm panel, 1800 cm²) — area ok, one piece too wide", () => {
  const MOCK_TEMPLATES = {
    bag: {
      id: "bag",
      name: "Mock Bag",
      patternPieces: [
        { widthCm: 20, heightCm: 20, areaCm2: 400 }, // fits ✓
        { widthCm: 20, heightCm: 20, areaCm2: 400 }, // fits ✓
        { widthCm: 32, heightCm: 16, areaCm2: 512 }, // too wide in both orientations ✗
      ],
    },
  };
  const measurements = makeMeasurements(30, 28, 1800);

  it("template is infeasible", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].feasible).toBe(false);
  });

  it('failReason is "piece_fit", not "area"', () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].failReason).toBe("piece_fit");
  });

  it("fitScore is greater than 0 — some pieces passed Stage 2", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].fitScore).toBeGreaterThan(0);
  });

  it("fitScore is less than 1 — not all pieces passed", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].fitScore).toBeLessThan(1);
  });

  it("fitScore is exactly 2/3 — 2 of 3 pieces fit", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].fitScore).toBeCloseTo(2 / 3, 10);
  });
});

// ── Test 4: Bucket hat fits, tote bag doesn't ────────────────────────────────
//
// Mock bag:  1 piece 50×35 (area 1750). Buffer 1925 > 900 → area fail.
// Mock hat:  2 pieces — 35×28 (700) + 20×10 (100) = 800. Buffer 880 ≤ 900 → passes.
//   35×28 fits in 35×30 panel  (35 ≤ 35 AND 28 ≤ 30) ✓
//   20×10 fits trivially ✓
// ─────────────────────────────────────────────────────────────────────────────
describe("constrained garment (35×30 cm panel, 900 cm²) — hat fits, bag doesn't", () => {
  const MOCK_TEMPLATES = {
    bag: {
      id: "bag",
      name: "Mock Tote Bag",
      patternPieces: [
        { widthCm: 50, heightCm: 35, areaCm2: 1750 }, // area alone exceeds budget
      ],
    },
    hat: {
      id: "hat",
      name: "Mock Bucket Hat",
      patternPieces: [
        { widthCm: 35, heightCm: 28, areaCm2: 700 }, // snug but fits ✓
        { widthCm: 20, heightCm: 10, areaCm2: 100 }, // fits ✓
      ],
    },
  };
  const measurements = makeMeasurements(35, 30, 900);

  it("tote bag is infeasible", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(byId(results, "bag").feasible).toBe(false);
  });

  it("tote bag fails at the area stage", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(byId(results, "bag").failReason).toBe("area");
  });

  it("bucket hat is feasible", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(byId(results, "hat").feasible).toBe(true);
  });

  it("bucket hat failReason is null", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(byId(results, "hat").failReason).toBeNull();
  });

  it("bucket hat fitScore is 1", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(byId(results, "hat").fitScore).toBe(1);
  });
});

// ── Test 5: Rotated piece fits ────────────────────────────────────────────────
//
// Panel: 38 cm wide × 40 cm tall.
// Piece: 39×30 cm.
//   Natural orientation: pw=39 > panW=38           → does NOT fit
//   Rotated 90°:         ph=30 ≤ panW=38
//                        pw=39 ≤ panH=40            → FITS ✓
//
// Total area: 300 + 1170 = 1470 cm², buffer 1617 ≤ 2000 → Stage 1 passes.
// Both pieces fit (one naturally, one rotated) → feasible true, fitScore 1.
// ─────────────────────────────────────────────────────────────────────────────
describe("rotated piece fits (38×40 cm panel, 2000 cm²)", () => {
  const MOCK_TEMPLATES = {
    bag: {
      id: "bag",
      name: "Mock Template With Landscape Piece",
      patternPieces: [
        { widthCm: 20, heightCm: 15, areaCm2: 300 }, // fits naturally ✓
        { widthCm: 39, heightCm: 30, areaCm2: 1170 }, // too wide naturally, fits rotated ✓
      ],
    },
  };
  const measurements = makeMeasurements(38, 40, 2000);

  it("template is feasible — rotated piece is accepted", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].feasible).toBe(true);
  });

  it("fitScore is 1 — both pieces fit (one via rotation)", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].fitScore).toBe(1);
  });

  it("failReason is null", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].failReason).toBeNull();
  });

  it("a narrower panel (38×38) would reject the same piece without rotation room", () => {
    // With a 38×38 panel the rotated check is: ph=30 ≤ 38 AND pw=39 ≤ 38 → false.
    const tightMeasurements = makeMeasurements(38, 38, 2000);
    const results = checkFeasibility(tightMeasurements, MOCK_TEMPLATES);
    expect(results[0].feasible).toBe(false);
    expect(results[0].failReason).toBe("piece_fit");
  });
});
