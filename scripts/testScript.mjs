import presets, {
  femalePresets,
  malePresets,
} from "../src/data/measurementPresets.js";

// to run node scripts/testScript.mjs
// 1. All presets have measurements in mm (chest should be ~800–1200 for adults)
presets.forEach((p) => {
  const chest = p.measurements.chest;
  console.assert(
    chest > 400 && chest < 2000,
    `${p.id} chest looks wrong: ${chest}`,
  );
});

// 2. No preset has cm-range values (chest > 200 means mm, < 200 means cm was used — bad).
//    Exceptions:
//      shoulderSlope — stored in degrees by FreeSewing (typical range 10–20°), never in mm.
//      waistToUnderbust — can legitimately be < 50 mm on small/male sizes (e.g. 49 mm for size 32).
//    Threshold is 20 mm (< 20 would indicate accidental cm entry for any real body measurement).
const DEGREE_MEASUREMENTS = new Set(["shoulderSlope"]);
presets.forEach((p) => {
  Object.entries(p.measurements).forEach(([k, v]) => {
    if (DEGREE_MEASUREMENTS.has(k)) return; // unit is degrees, not mm — skip range check
    console.assert(v > 20, `${p.id}.${k} = ${v} — looks like cm, not mm`);
  });
});

// 3. Split exports are subsets
console.assert(
  femalePresets.every((p) => p.gender === "female"),
  "femalePresets has wrong gender",
);
console.assert(
  malePresets.every((p) => p.gender === "male"),
  "malePresets has wrong gender",
);

console.log("measurementPresets OK —", presets.length, "presets");
