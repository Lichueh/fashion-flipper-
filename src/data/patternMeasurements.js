/**
 * Static map of FreeSewing patternId → required measurements + garment category.
 *
 * Measurement keys were extracted at build time via `Design.patternConfig.measurements`
 * (a static property on each FreeSewing v4 Design class) and encoded here to avoid
 * any runtime instantiation overhead.
 *
 * Garment categories
 *   top       – shirts, bodices, vests, any upper-body garment
 *   bottom    – trousers, skirts, shorts
 *   accessory – bags, hats, non-wearable items
 *   block     – slopers / base blocks (bent, brian, bella)
 *
 * ─── Measurement group assignment ───────────────────────────────────────────
 * The four UI groups and their canonical keys are defined below in
 * MEASUREMENT_GROUPS. Keys not present in the original four groups are assigned
 * as follows (each decision documented):
 *
 *   waistToArmpit      → Torso Length   (vertical torso distance; same axis as hpsToWaistBack)
 *   waistBack          → Lower Body     (horizontal back-waist circumference; a waist variant)
 *   seatBack           → Lower Body     (horizontal back-seat circumference; a seat variant)
 *   knee               → Lower Body     (knee circumference; leg measurement)
 *   crossSeam          → Lower Body     (total crotch-seam length; trouser-specific inseam variant)
 *   crossSeamFront     → Lower Body     (front crotch-seam length; sub-measurement of crossSeam)
 *   waistToUpperLeg    → Lower Body     (waist-to-thigh length; leg measurement)
 *   bustPointToUnderbust → Bust Measurements (bust-point-to-underbust distance; bust geometry)
 */

// ── UI groups (ordered for display) ─────────────────────────────────────────

export const MEASUREMENT_GROUPS = {
  "Upper Body": [
    "chest",
    "shoulderToShoulder",
    "shoulderSlope",
    "neck",
    "biceps",
    "elbow",
    "wrist",
    "shoulderToElbow",
    "shoulderToWrist",
  ],
  "Torso Length": [
    "hpsToBust",
    "hpsToWaistFront",
    "hpsToWaistBack",
    "waistToArmpit", // assigned here — see note above
    "waistToHips",
    "waistToSeat",
    "waistToUnderbust",
  ],
  "Lower Body": [
    "waist",
    "waistBack", // assigned here — see note above
    "hips",
    "seat",
    "seatBack", // assigned here — see note above
    "inseam",
    "outseam",
    "waistToFloor",
    "waistToKnee",
    "waistToUpperLeg", // assigned here — see note above
    "knee", // assigned here — see note above
    "crotchDepth",
    "crossSeam", // assigned here — see note above
    "crossSeamFront", // assigned here — see note above
    "ankleCircumference",
  ],
  "Bust Measurements": [
    "bust",
    "highBust",
    "bustFront",
    "underbust",
    "bustPointToHps",
    "bustPointToUnderbust", // assigned here — see note above
    "bustSpan",
  ],
};

// ── Flat reverse-lookup: measurementKey → groupLabel ────────────────────────

export const measurementGroup = Object.fromEntries(
  Object.entries(MEASUREMENT_GROUPS).flatMap(([group, keys]) =>
    keys.map((key) => [key, group]),
  ),
);

// ── Per-pattern data ─────────────────────────────────────────────────────────

const patternMeasurements = {
  // ── Tops ──────────────────────────────────────────────────────────────────

  aaron: {
    category: "top",
    requiredMeasurements: [
      "biceps",
      "chest",
      "hpsToBust",
      "hpsToWaistBack",
      "neck",
      "shoulderToShoulder",
      "shoulderSlope",
      "waistToArmpit",
      "waistToHips",
      "hips",
    ],
  },

  diana: {
    category: "top",
    requiredMeasurements: [
      "biceps",
      "chest",
      "hpsToBust",
      "hpsToWaistBack",
      "neck",
      "shoulderToShoulder",
      "shoulderSlope",
      "waistToArmpit",
      "waistToHips",
      "hips",
      "waist",
      "shoulderToWrist",
      "wrist",
    ],
  },

  simon: {
    category: "top",
    requiredMeasurements: [
      "biceps",
      "chest",
      "hpsToBust",
      "hpsToWaistBack",
      "neck",
      "shoulderToShoulder",
      "shoulderSlope",
      "waistToArmpit",
      "waistToHips",
      "waist",
      "hips",
      "shoulderToWrist",
      "wrist",
    ],
  },

  simone: {
    category: "top",
    requiredMeasurements: [
      "biceps",
      "chest",
      "hpsToBust",
      "hpsToWaistBack",
      "neck",
      "shoulderToShoulder",
      "shoulderSlope",
      "waistToArmpit",
      "waistToHips",
      "waist",
      "hips",
      "highBust",
      "bustSpan",
      "shoulderToWrist",
      "wrist",
    ],
  },

  teagan: {
    category: "top",
    requiredMeasurements: [
      "biceps",
      "chest",
      "hpsToBust",
      "hpsToWaistBack",
      "neck",
      "shoulderToShoulder",
      "shoulderSlope",
      "waistToArmpit",
      "waistToHips",
      "hips",
      "waist",
      "shoulderToWrist",
      "wrist",
    ],
  },

  wahid: {
    category: "top",
    requiredMeasurements: [
      "biceps",
      "chest",
      "hpsToBust",
      "hpsToWaistBack",
      "neck",
      "shoulderToShoulder",
      "shoulderSlope",
      "waistToArmpit",
      "waistToHips",
      "hips",
      "waist",
    ],
  },

  // ── Bottoms ───────────────────────────────────────────────────────────────

  charlie: {
    category: "bottom",
    requiredMeasurements: [
      "crossSeam",
      "crossSeamFront",
      "knee",
      "seat",
      "seatBack",
      "waist",
      "waistBack",
      "waistToFloor",
      "waistToKnee",
      "waistToHips",
      "waistToSeat",
      "waistToUpperLeg",
    ],
  },

  penelope: {
    category: "bottom",
    requiredMeasurements: [
      "waist",
      "seat",
      "waistToHips",
      "waistToSeat",
      "waistToKnee",
    ],
  },

  sophie: {
    category: "bottom",
    requiredMeasurements: [
      "bustSpan",
      "hpsToBust",
      "hpsToWaistBack",
      "bustPointToUnderbust",
      "bustFront",
      "shoulderToShoulder",
      "shoulderSlope",
      "underbust",
      "waist",
      "hips",
      "seat",
      "waistToUnderbust",
      "waistToHips",
      "waistToSeat",
      "waistToKnee",
    ],
  },

  waralee: {
    category: "bottom",
    requiredMeasurements: ["seat", "inseam", "crotchDepth", "waistToHips"],
  },

  // ── Blocks ────────────────────────────────────────────────────────────────

  bella: {
    category: "block",
    requiredMeasurements: [
      "highBust",
      "chest",
      "underbust",
      "waist",
      "waistBack",
      "bustSpan",
      "neck",
      "hpsToBust",
      "hpsToWaistFront",
      "hpsToWaistBack",
      "shoulderToShoulder",
      "shoulderSlope",
    ],
  },

  bent: {
    category: "block",
    requiredMeasurements: [
      "biceps",
      "chest",
      "hpsToBust",
      "hpsToWaistBack",
      "neck",
      "shoulderToShoulder",
      "shoulderSlope",
      "waistToArmpit",
      "waistToHips",
      "shoulderToElbow",
      "shoulderToWrist",
      "wrist",
    ],
  },

  brian: {
    category: "block",
    requiredMeasurements: [
      "biceps",
      "chest",
      "hpsToBust",
      "hpsToWaistBack",
      "neck",
      "shoulderToShoulder",
      "shoulderSlope",
      "waistToArmpit",
      "waistToHips",
      "shoulderToWrist",
      "wrist",
    ],
  },

  // ── Accessories (no body measurements needed) ─────────────────────────────

  bag: {
    category: "accessory",
    requiredMeasurements: [],
  },

  hat: {
    category: "accessory",
    requiredMeasurements: [],
  },

  hortensia: {
    category: "accessory",
    requiredMeasurements: [],
  },
};

export default patternMeasurements;
