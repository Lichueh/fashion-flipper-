/**
 * Measurement presets sourced from @freesewing/models.
 *
 * All values are in mm — exactly as exported by @freesewing/models.
 * Do NOT convert here. The mm ↔ cm conversion happens only in
 * ProfileEditorScreen when reading/writing measurement fields.
 */

import {
  cisFemaleAdult28,
  cisFemaleAdult30,
  cisFemaleAdult32,
  cisFemaleAdult34,
  cisFemaleAdult36,
  cisFemaleAdult38,
  cisFemaleAdult40,
  cisFemaleAdult42,
  cisFemaleAdult44,
  cisFemaleAdult46,
  cisMaleAdult32,
  cisMaleAdult34,
  cisMaleAdult36,
  cisMaleAdult38,
  cisMaleAdult40,
  cisMaleAdult42,
  cisMaleAdult44,
  cisMaleAdult46,
  cisMaleAdult48,
  cisMaleAdult50,
} from "@freesewing/models";

/** @type {Array<{ id: string, label: string, gender: 'male' | 'female', measurements: Record<string, number> }>} */
const measurementPresets = [
  // ── Women's sizes ─────────────────────────────────────────────────────────
  {
    id: "cisFemaleAdult28",
    label: "Women's 28",
    gender: "female",
    measurements: cisFemaleAdult28,
  },
  {
    id: "cisFemaleAdult30",
    label: "Women's 30",
    gender: "female",
    measurements: cisFemaleAdult30,
  },
  {
    id: "cisFemaleAdult32",
    label: "Women's 32",
    gender: "female",
    measurements: cisFemaleAdult32,
  },
  {
    id: "cisFemaleAdult34",
    label: "Women's 34",
    gender: "female",
    measurements: cisFemaleAdult34,
  },
  {
    id: "cisFemaleAdult36",
    label: "Women's 36",
    gender: "female",
    measurements: cisFemaleAdult36,
  },
  {
    id: "cisFemaleAdult38",
    label: "Women's 38",
    gender: "female",
    measurements: cisFemaleAdult38,
  },
  {
    id: "cisFemaleAdult40",
    label: "Women's 40",
    gender: "female",
    measurements: cisFemaleAdult40,
  },
  {
    id: "cisFemaleAdult42",
    label: "Women's 42",
    gender: "female",
    measurements: cisFemaleAdult42,
  },
  {
    id: "cisFemaleAdult44",
    label: "Women's 44",
    gender: "female",
    measurements: cisFemaleAdult44,
  },
  {
    id: "cisFemaleAdult46",
    label: "Women's 46",
    gender: "female",
    measurements: cisFemaleAdult46,
  },

  // ── Men's sizes ───────────────────────────────────────────────────────────
  {
    id: "cisMaleAdult32",
    label: "Men's 32",
    gender: "male",
    measurements: cisMaleAdult32,
  },
  {
    id: "cisMaleAdult34",
    label: "Men's 34",
    gender: "male",
    measurements: cisMaleAdult34,
  },
  {
    id: "cisMaleAdult36",
    label: "Men's 36",
    gender: "male",
    measurements: cisMaleAdult36,
  },
  {
    id: "cisMaleAdult38",
    label: "Men's 38",
    gender: "male",
    measurements: cisMaleAdult38,
  },
  {
    id: "cisMaleAdult40",
    label: "Men's 40",
    gender: "male",
    measurements: cisMaleAdult40,
  },
  {
    id: "cisMaleAdult42",
    label: "Men's 42",
    gender: "male",
    measurements: cisMaleAdult42,
  },
  {
    id: "cisMaleAdult44",
    label: "Men's 44",
    gender: "male",
    measurements: cisMaleAdult44,
  },
  {
    id: "cisMaleAdult46",
    label: "Men's 46",
    gender: "male",
    measurements: cisMaleAdult46,
  },
  {
    id: "cisMaleAdult48",
    label: "Men's 48",
    gender: "male",
    measurements: cisMaleAdult48,
  },
  {
    id: "cisMaleAdult50",
    label: "Men's 50",
    gender: "male",
    measurements: cisMaleAdult50,
  },
];

export default measurementPresets;

export const femalePresets = measurementPresets.filter(
  (p) => p.gender === "female",
);
export const malePresets = measurementPresets.filter(
  (p) => p.gender === "male",
);
