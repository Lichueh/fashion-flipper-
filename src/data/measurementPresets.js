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
    label: { en: "Women's 28", nb: "Dame 28", zh: "女款 28" },
    gender: "female",
    measurements: cisFemaleAdult28,
  },
  {
    id: "cisFemaleAdult30",
    label: { en: "Women's 30", nb: "Dame 30", zh: "女款 30" },
    gender: "female",
    measurements: cisFemaleAdult30,
  },
  {
    id: "cisFemaleAdult32",
    label: { en: "Women's 32", nb: "Dame 32", zh: "女款 32" },
    gender: "female",
    measurements: cisFemaleAdult32,
  },
  {
    id: "cisFemaleAdult34",
    label: { en: "Women's 34", nb: "Dame 34", zh: "女款 34" },
    gender: "female",
    measurements: cisFemaleAdult34,
  },
  {
    id: "cisFemaleAdult36",
    label: { en: "Women's 36", nb: "Dame 36", zh: "女款 36" },
    gender: "female",
    measurements: cisFemaleAdult36,
  },
  {
    id: "cisFemaleAdult38",
    label: { en: "Women's 38", nb: "Dame 38", zh: "女款 38" },
    gender: "female",
    measurements: cisFemaleAdult38,
  },
  {
    id: "cisFemaleAdult40",
    label: { en: "Women's 40", nb: "Dame 40", zh: "女款 40" },
    gender: "female",
    measurements: cisFemaleAdult40,
  },
  {
    id: "cisFemaleAdult42",
    label: { en: "Women's 42", nb: "Dame 42", zh: "女款 42" },
    gender: "female",
    measurements: cisFemaleAdult42,
  },
  {
    id: "cisFemaleAdult44",
    label: { en: "Women's 44", nb: "Dame 44", zh: "女款 44" },
    gender: "female",
    measurements: cisFemaleAdult44,
  },
  {
    id: "cisFemaleAdult46",
    label: { en: "Women's 46", nb: "Dame 46", zh: "女款 46" },
    gender: "female",
    measurements: cisFemaleAdult46,
  },

  // ── Men's sizes ───────────────────────────────────────────────────────────
  {
    id: "cisMaleAdult32",
    label: { en: "Men's 32", nb: "Herre 32", zh: "男款 32" },
    gender: "male",
    measurements: cisMaleAdult32,
  },
  {
    id: "cisMaleAdult34",
    label: { en: "Men's 34", nb: "Herre 34", zh: "男款 34" },
    gender: "male",
    measurements: cisMaleAdult34,
  },
  {
    id: "cisMaleAdult36",
    label: { en: "Men's 36", nb: "Herre 36", zh: "男款 36" },
    gender: "male",
    measurements: cisMaleAdult36,
  },
  {
    id: "cisMaleAdult38",
    label: { en: "Men's 38", nb: "Herre 38", zh: "男款 38" },
    gender: "male",
    measurements: cisMaleAdult38,
  },
  {
    id: "cisMaleAdult40",
    label: { en: "Men's 40", nb: "Herre 40", zh: "男款 40" },
    gender: "male",
    measurements: cisMaleAdult40,
  },
  {
    id: "cisMaleAdult42",
    label: { en: "Men's 42", nb: "Herre 42", zh: "男款 42" },
    gender: "male",
    measurements: cisMaleAdult42,
  },
  {
    id: "cisMaleAdult44",
    label: { en: "Men's 44", nb: "Herre 44", zh: "男款 44" },
    gender: "male",
    measurements: cisMaleAdult44,
  },
  {
    id: "cisMaleAdult46",
    label: { en: "Men's 46", nb: "Herre 46", zh: "男款 46" },
    gender: "male",
    measurements: cisMaleAdult46,
  },
  {
    id: "cisMaleAdult48",
    label: { en: "Men's 48", nb: "Herre 48", zh: "男款 48" },
    gender: "male",
    measurements: cisMaleAdult48,
  },
  {
    id: "cisMaleAdult50",
    label: { en: "Men's 50", nb: "Herre 50", zh: "男款 50" },
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
