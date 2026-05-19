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
import { getFabricProfile } from "./fabricProfile.js";
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

  it("fitScore reflects new 40/35/25 composite formula", () => {
    // fabricCompatibilityScore = 1.0 (no fabric),  pieceFitScore = 1.0 (no physical pieces),
    // safeAvailableArea = 3500 * 0.85 = 2975,  reuseScore = 875/2975 ≈ 0.2941
    // compositeScore = 0.40*1 + 0.35*1 + 0.25*(875/2975) ≈ 0.8235
    const results = checkFeasibility(measurements, realTemplates);
    expect(byId(results, "bag").fitScore).toBeCloseTo(0.8235294118);
  });

  it("usedAreaPct is capped at 100 and is a positive number", () => {
    const results = checkFeasibility(measurements, realTemplates);
    const { usedAreaPct } = byId(results, "bag");
    expect(usedAreaPct).toBeGreaterThan(0);
    expect(usedAreaPct).toBeLessThanOrEqual(100);
  });

  it("returns both raw and conservative available area for debugging", () => {
    const results = checkFeasibility(measurements, realTemplates);
    const bag = byId(results, "bag");
    expect(bag.availableAreaCm2).toBe(3500);
    expect(bag.safeAvailableAreaCm2).toBeCloseTo(2975);
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

  it("fitScore is 0 — piece_fit failure returns hardcoded 0", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].fitScore).toBe(0);
  });

  it("fitScore is less than 1 — not all pieces passed", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].fitScore).toBeLessThan(1);
  });

  it("fitScore is 0 even when 2 of 3 pieces fit — early exit sets it to 0", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].fitScore).toBe(0);
  });
});

// ── Test 4: Bucket hat fits conservatively, tote bag doesn't ─────────────────
//
// Mock bag:  1 piece 50×35 (area 1750). Buffer 1925 > 1100 * 0.85 = 935 → area fail.
// Mock hat:  2 pieces — 35×28 (700) + 20×10 (100) = 800. Buffer 880 ≤ 935 → passes.
//   35×28 fits in 35×30 panel  (35 ≤ 35 AND 28 ≤ 30) ✓
//   20×10 fits trivially ✓
// ─────────────────────────────────────────────────────────────────────────────
describe("constrained garment (35×30 cm panel, 1100 cm²) — hat fits, bag doesn't", () => {
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
  const measurements = makeMeasurements(35, 30, 1100);

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

  it("bucket hat fitScore is capped at 0.60 — 'maybe' band applies", () => {
    // safeAvailableArea = 935, totalRequiredWithBuffer = 880,
    // coverageRatio = 935/880 ≈ 1.063 < LIKELY_THRESHOLD (1.25) → band = "maybe"
    // raw compositeScore = 0.40+0.35+0.25*(800/935) ≈ 0.9639, capped at 0.60.
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(byId(results, "hat").fitScore).toBeCloseTo(0.6);
  });

  it("bucket hat feasibilityBand is 'maybe'", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(byId(results, "hat").feasibilityBand).toBe("maybe");
  });

  it("tote bag feasibilityBand is 'unlikely' — area fails", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(byId(results, "bag").feasibilityBand).toBe("unlikely");
  });

  it("feasible is still true for 'maybe' — backwards compat", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(byId(results, "hat").feasible).toBe(true);
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

  it("fitScore is capped at 0.60 — 'maybe' band (coverage 1700/1617 ≈ 1.051 < 1.25)", () => {
    // safeAvailableArea = 1700, totalRequiredWithBuffer = 1617,
    // coverageRatio ≈ 1.051 < LIKELY_THRESHOLD → band = "maybe" → cap at 0.60
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].fitScore).toBeCloseTo(0.6);
  });

  it("feasibilityBand is 'maybe' — passes but coverage is marginal", () => {
    const results = checkFeasibility(measurements, MOCK_TEMPLATES);
    expect(results[0].feasibilityBand).toBe("maybe");
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

// ── Test 6: Feasibility band classification ───────────────────────────────────
//
// "likely"  : coverageRatio ≥ 1.25  — safeArea is comfortably above requirement
// "maybe"   : coverageRatio 1.0–1.25 — passes but only just
// "unlikely": fails Stage 1 (area), Stage 2 (piece_fit), or Stage 3 (fabric)
//
// feasible: true for "likely" and "maybe"; false for "unlikely".
// ─────────────────────────────────────────────────────────────────────────────
describe("feasibility band classification", () => {
  // "likely": safeArea=2975, buffer=962.5, ratio≈3.09 ≥ 1.25
  it("'likely' when safe area is ≥ 125% of buffered requirement", () => {
    const meas = makeMeasurements(80, 60, 3500);
    const results = checkFeasibility(meas, realTemplates);
    expect(byId(results, "bag").feasibilityBand).toBe("likely");
  });

  // "maybe": safeArea=935, buffer=880, ratio≈1.063 < 1.25
  it("'maybe' when safe area passes but coverage ratio is below 1.25", () => {
    const MOCK = {
      hat: {
        id: "hat",
        name: "Mock Hat",
        patternPieces: [
          { widthCm: 35, heightCm: 28, areaCm2: 700 },
          { widthCm: 20, heightCm: 10, areaCm2: 100 },
        ],
      },
    };
    const meas = makeMeasurements(35, 30, 1100);
    const results = checkFeasibility(meas, MOCK);
    expect(results[0].feasibilityBand).toBe("maybe");
  });

  // "unlikely": area stage fails
  it("'unlikely' when safe area fails Stage 1", () => {
    const meas = makeMeasurements(25, 20, 400);
    const results = checkFeasibility(meas, realTemplates);
    expect(results.every((r) => r.feasibilityBand === "unlikely")).toBe(true);
  });

  // "unlikely": piece_fit stage fails
  it("'unlikely' when Stage 2 piece_fit fails", () => {
    const MOCK = {
      bag: {
        id: "bag",
        name: "Mock",
        patternPieces: [{ widthCm: 32, heightCm: 16, areaCm2: 512 }],
      },
    };
    // safeArea=1530, buffer=563.2 → Stage 1 passes; piece too wide → Stage 2 fails
    const meas = makeMeasurements(30, 28, 1800);
    const results = checkFeasibility(meas, MOCK);
    expect(results[0].feasibilityBand).toBe("unlikely");
  });

  // backwards compat: feasible boolean still correct for all three bands
  it("feasible is true for 'likely' and 'maybe', false for 'unlikely'", () => {
    const likelyMeas = makeMeasurements(80, 60, 3500);
    const likelyResults = checkFeasibility(likelyMeas, realTemplates);
    expect(byId(likelyResults, "bag").feasible).toBe(true);

    const MOCK_HAT = {
      hat: {
        id: "hat",
        name: "Mock Hat",
        patternPieces: [
          { widthCm: 35, heightCm: 28, areaCm2: 700 },
          { widthCm: 20, heightCm: 10, areaCm2: 100 },
        ],
      },
    };
    const maybeMeas = makeMeasurements(35, 30, 1100);
    const maybeResults = checkFeasibility(maybeMeas, MOCK_HAT);
    expect(maybeResults[0].feasible).toBe(true);

    const unlikelyMeas = makeMeasurements(25, 20, 400);
    const unlikelyResults = checkFeasibility(unlikelyMeas, realTemplates);
    expect(unlikelyResults.every((r) => r.feasible === false)).toBe(true);
  });
});

// ── Test 7: Fabric compatibility scoring ──────────────────────────────────────
//
// Stage 3 tests with real fabric profiles. Exercises hard-fail (blocker) and
// soft-penalty paths. Uses a large panel so area/fit never interfere.
//
// fabricCompatibilityScore = product of per-issue penalties (0–1).
//   perfect match                              → 1.00
//   lightweight on canInterfaceFix template    → 0.75, needsInterfacing=true
//   knit on woven-only template                → hard fail, score=0
//   worn condition (gap=2) on strict template  → 0.45, still feasible
// ─────────────────────────────────────────────────────────────────────────────
describe("Stage 3 fabric compatibility scoring", () => {
  // Generous panel — area/fit never fail in these tests.
  const bigMeasurements = makeMeasurements(100, 100, 20000);

  /** Minimal fabric object accepted by getFabricProfile(). */
  function makeFabric(texture, weight, condition, materialList) {
    return {
      texture,
      weight,
      condition,
      composition: materialList.map(([material, percentage]) => ({
        material,
        percentage,
      })),
    };
  }

  // Bag: minWeightClass=2, allowKnit=false, minConditionRank=2, canInterfaceFix=true
  const BAG = { bag: realTemplates.bag };

  // Brian (body block): minWeightClass=1, maxWeightClass=2, allowKnit=false,
  //                     minConditionRank=3, canInterfaceFix=false
  const BRIAN = { brian: realTemplates.brian };

  it("perfect fabric match yields fabricCompatibilityScore 1.0", () => {
    const fabric = makeFabric("plain weave", "midweight", "good", [
      ["cotton", 100],
    ]);
    const results = checkFeasibility(bigMeasurements, BAG, fabric);
    expect(byId(results, "bag").fabricCompatibilityScore).toBeCloseTo(1.0);
    expect(byId(results, "bag").feasible).toBe(true);
    expect(byId(results, "bag").needsInterfacing).toBe(false);
  });

  it("lightweight on canInterfaceFix template → score 0.75, needsInterfacing true", () => {
    // Bag needs midweight (class=2); lightweight (class=1) + canInterfaceFix → penalty 0.75.
    const fabric = makeFabric("plain weave", "lightweight", "good", [
      ["cotton", 100],
    ]);
    const results = checkFeasibility(bigMeasurements, BAG, fabric);
    const bag = byId(results, "bag");
    expect(bag.feasible).toBe(true);
    expect(bag.needsInterfacing).toBe(true);
    expect(bag.fabricCompatibilityScore).toBeCloseTo(0.75);
    expect(bag.failReason).toBeNull();
  });

  it("lightweight penalty reduces compositeScore proportionally", () => {
    // fabricCompatibilityScore=0.75, pieceFitScore=1, safeArea=17000,
    // reuseScore=875/17000≈0.0515
    // compositeScore = 0.40*0.75 + 0.35*1 + 0.25*0.0515 ≈ 0.663
    const fabric = makeFabric("plain weave", "lightweight", "good", [
      ["cotton", 100],
    ]);
    const results = checkFeasibility(bigMeasurements, BAG, fabric);
    const bag = byId(results, "bag");
    expect(bag.compositeScore).toBeGreaterThan(0.64);
    expect(bag.compositeScore).toBeLessThan(0.7);
  });

  it("knit on woven-only template is a hard fail", () => {
    // Brian requires woven (allowKnit=false); jersey knit → isBlocker → hard fail.
    const fabric = makeFabric("jersey knit", "lightweight", "good", [
      ["cotton", 100],
    ]);
    const results = checkFeasibility(bigMeasurements, BRIAN, fabric);
    const brian = byId(results, "brian");
    expect(brian.feasible).toBe(false);
    expect(brian.failReason).toBe("fabric");
    expect(brian.fabricCompatibilityScore).toBe(0);
    expect(brian.compositeScore).toBe(0);
  });

  it("worn condition (gap=2) is a soft penalty — still feasible, score 0.45", () => {
    // Brian minConditionRank=3; worn=rank1 → gap=2 → penalty=0.45.
    const fabric = makeFabric("plain weave", "midweight", "worn", [
      ["cotton", 100],
    ]);
    const results = checkFeasibility(bigMeasurements, BRIAN, fabric);
    const brian = byId(results, "brian");
    expect(brian.feasible).toBe(true);
    expect(brian.failReason).toBeNull();
    expect(brian.fabricCompatibilityScore).toBeCloseTo(0.45);
  });

  it("area-fail result has fabricCompatibilityScore null — Stage 3 not reached", () => {
    const smallMeasurements = makeMeasurements(25, 20, 400);
    const fabric = makeFabric("plain weave", "midweight", "good", [
      ["cotton", 100],
    ]);
    const results = checkFeasibility(smallMeasurements, BAG, fabric);
    expect(byId(results, "bag").failReason).toBe("area");
    expect(byId(results, "bag").fabricCompatibilityScore).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 8 — low-confidence / unknown analyzer values
//
//   Unknown condition → conditionRank null, conditionKnown false
//   Unknown weight    → weightClass 2 (fallback), weightKnown false
//   Unknown texture   → isKnit false, isWoven false, textureKnown false
//   Unknown condition through pipeline → soft uncertainty penalty (0.85), not 0
//   All unknowns through pipeline → no crash, numeric scores returned
// ─────────────────────────────────────────────────────────────────────────────
describe("low-confidence / unknown analyzer values", () => {
  const bigMeasurements = makeMeasurements(100, 100, 20000);

  function makeFabric(texture, weight, condition, materialList) {
    return {
      texture,
      weight,
      condition,
      composition: materialList.map(([material, percentage]) => ({
        material,
        percentage,
      })),
    };
  }

  const BAG = { bag: realTemplates.bag };
  const BRIAN = { brian: realTemplates.brian };

  it("unrecognized condition string → conditionRank null, conditionKnown false, hasLowConfidence true", () => {
    const profile = getFabricProfile(
      makeFabric("plain weave", "midweight", "pretty alright", [
        ["cotton", 100],
      ]),
    );
    expect(profile.conditionRank).toBeNull();
    expect(profile.conditionKnown).toBe(false);
    expect(profile.hasLowConfidence).toBe(true);
  });

  it("unrecognized weight string → weightClass 2 (fallback), weightKnown false, hasLowConfidence true", () => {
    const profile = getFabricProfile(
      makeFabric("plain weave", "shirt-weight", "good", [["cotton", 100]]),
    );
    expect(profile.weightClass).toBe(2);
    expect(profile.weightKnown).toBe(false);
    expect(profile.hasLowConfidence).toBe(true);
  });

  it("unrecognized texture string → isKnit false, isWoven false, textureKnown false, hasLowConfidence true", () => {
    const profile = getFabricProfile(
      makeFabric("techno fabric", "midweight", "good", [["polyester", 100]]),
    );
    expect(profile.isKnit).toBe(false);
    expect(profile.isWoven).toBe(false);
    expect(profile.textureKnown).toBe(false);
    expect(profile.hasLowConfidence).toBe(true);
  });

  it("unknown condition through pipeline → soft uncertainty penalty (0.85), not a hard fail", () => {
    // Brian minConditionRank=3; unrecognized condition → null rank → penalty 0.85 (not rank=0 damage).
    const fabric = makeFabric("plain weave", "midweight", "pretty alright", [
      ["cotton", 100],
    ]);
    const results = checkFeasibility(bigMeasurements, BRIAN, fabric);
    const brian = byId(results, "brian");
    expect(brian.feasible).toBe(true);
    expect(brian.failReason).toBeNull();
    expect(brian.fabricCompatibilityScore).toBeCloseTo(0.85);
  });

  it("all-unknown fabric through pipeline → no crash, compositeScore and fabricCompatibilityScore are numbers", () => {
    const fabric = makeFabric(
      "techno fabric",
      "shirt-weight",
      "pretty alright",
      [["polyester", 100]],
    );
    expect(() => checkFeasibility(bigMeasurements, BAG, fabric)).not.toThrow();
    const results = checkFeasibility(bigMeasurements, BAG, fabric);
    const bag = byId(results, "bag");
    expect(bag).toBeDefined();
    expect(typeof bag.compositeScore).toBe("number");
    expect(typeof bag.fabricCompatibilityScore).toBe("number");
  });
});
