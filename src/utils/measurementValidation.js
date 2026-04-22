/**
 * Shared measurement validation utilities.
 *
 * Used by ProfileEditorScreen and TemplateSelectScreen so that validation
 * rules are defined once.
 *
 * Unit convention:
 *   - All measurements are stored in mm.
 *   - The UI displays / accepts cm.
 *   - Exception: shoulderSlope is in degrees and passes through unchanged.
 */

// ── Readable labels ──────────────────────────────────────────────────────────

export function humanise(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// ── Per-key validation ranges (in cm / degrees) ──────────────────────────────

export const RANGES = {
  shoulderSlope: { min: 0, max: 30, unit: "°" },
  // Circumferences
  chest: { min: 10, max: 300, unit: "cm" },
  waist: { min: 10, max: 300, unit: "cm" },
  waistBack: { min: 10, max: 300, unit: "cm" },
  hips: { min: 10, max: 300, unit: "cm" },
  seat: { min: 10, max: 300, unit: "cm" },
  neck: { min: 10, max: 80, unit: "cm" },
  biceps: { min: 5, max: 100, unit: "cm" },
  elbow: { min: 5, max: 80, unit: "cm" },
  wrist: { min: 5, max: 60, unit: "cm" },
  bust: { min: 10, max: 300, unit: "cm" },
  highBust: { min: 10, max: 300, unit: "cm" },
  underbust: { min: 10, max: 250, unit: "cm" },
  knee: { min: 10, max: 100, unit: "cm" },
  ankleCircumference: { min: 5, max: 80, unit: "cm" },
  // Widths / spans
  seatBack: { min: 10, max: 150, unit: "cm" },
  shoulderToShoulder: { min: 10, max: 80, unit: "cm" },
  bustFront: { min: 5, max: 100, unit: "cm" },
  bustSpan: { min: 2, max: 60, unit: "cm" },
  crossSeamFront: { min: 10, max: 100, unit: "cm" },
  // Lengths
  shoulderToElbow: { min: 10, max: 80, unit: "cm" },
  shoulderToWrist: { min: 20, max: 150, unit: "cm" },
  bustPointToHps: { min: 5, max: 70, unit: "cm" },
  bustPointToUnderbust: { min: 1, max: 30, unit: "cm" },
  inseam: { min: 10, max: 130, unit: "cm" },
  outseam: { min: 20, max: 160, unit: "cm" },
  waistToFloor: { min: 30, max: 160, unit: "cm" },
  waistToKnee: { min: 10, max: 100, unit: "cm" },
  waistToSeat: { min: 5, max: 60, unit: "cm" },
  waistToHips: { min: 1, max: 60, unit: "cm" },
  waistToUnderbust: { min: 1, max: 50, unit: "cm" },
  waistToArmpit: { min: 5, max: 70, unit: "cm" },
  waistToUpperLeg: { min: 5, max: 70, unit: "cm" },
  crotchDepth: { min: 5, max: 70, unit: "cm" },
  crossSeam: { min: 20, max: 150, unit: "cm" },
  hpsToBust: { min: 5, max: 70, unit: "cm" },
  hpsToWaistFront: { min: 10, max: 100, unit: "cm" },
  hpsToWaistBack: { min: 10, max: 100, unit: "cm" },
};

export const DEFAULT_RANGE = { min: 0, max: 300, unit: "cm" };

/**
 * Validate a single field value (in cm string form).
 * Returns an error message string, or null if valid.
 * Empty string is treated as "not filled in" (no error).
 */
export function validateField(key, cmValue) {
  if (cmValue === "" || cmValue === undefined) return null;
  const num = parseFloat(cmValue);
  if (isNaN(num) || num <= 0) return "Must be a positive number";
  const range = RANGES[key] ?? DEFAULT_RANGE;
  if (num < range.min) return `Min ${range.min} ${range.unit}`;
  if (num > range.max) return `Max ${range.max} ${range.unit}`;
  return null;
}

/** mm (stored) → cm display string. shoulderSlope (degrees) passes through. */
export function mmToCm(key, mm) {
  if (key === "shoulderSlope") return String(mm);
  return String(parseFloat((mm / 10).toFixed(2)));
}

/** cm string → mm number for storage. shoulderSlope passes through. */
export function cmToMm(key, cmStr) {
  const num = parseFloat(cmStr);
  if (isNaN(num)) return null;
  if (key === "shoulderSlope") return num;
  return Math.round(num * 10);
}

/** Unit label for a given key ("cm" or "°"). */
export function unitLabel(key) {
  return (RANGES[key] ?? DEFAULT_RANGE).unit;
}
