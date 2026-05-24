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
import { MEASUREMENT_PRESET_LABELS } from "../i18n/translations";

function interpolateLabel(template, params) {
  return Object.fromEntries(
    Object.entries(template).map(([lang, value]) => [
      lang,
      value.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`),
    ]),
  );
}

function presetLabel(gender, size, sizeHint = null, displaySize = size) {
  const base = interpolateLabel(MEASUREMENT_PRESET_LABELS[gender].base, {
    size: String(displaySize),
  });

  if (!sizeHint) return base;

  return {
    en: interpolateLabel(MEASUREMENT_PRESET_LABELS.withHint, {
      base: base.en,
      hint: sizeHint,
    }).en,
    nb: interpolateLabel(MEASUREMENT_PRESET_LABELS.withHint, {
      base: base.nb,
      hint: sizeHint,
    }).nb,
    zh: interpolateLabel(MEASUREMENT_PRESET_LABELS.withHint, {
      base: base.zh,
      hint: sizeHint,
    }).zh,
  };
}

/** @type {Array<{ id: string, label: string, gender: 'male' | 'female', measurements: Record<string, number> }>} */
const measurementPresets = [
  // ── Women's sizes ─────────────────────────────────────────────────────────
  {
    id: "cisFemaleAdult28",
    label: presetLabel("female", 28, "XXS"),
    gender: "female",
    measurements: cisFemaleAdult28,
  },
  {
    id: "cisFemaleAdult30",
    label: presetLabel("female", 30, "XS"),
    gender: "female",
    measurements: cisFemaleAdult30,
  },
  {
    id: "cisFemaleAdult32",
    label: presetLabel("female", 32, "XS"),
    gender: "female",
    measurements: cisFemaleAdult32,
  },
  {
    id: "cisFemaleAdult34",
    label: presetLabel("female", 34, "S"),
    gender: "female",
    measurements: cisFemaleAdult34,
  },
  {
    id: "cisFemaleAdult36",
    label: presetLabel("female", 36, "S"),
    gender: "female",
    measurements: cisFemaleAdult36,
  },
  {
    id: "cisFemaleAdult38",
    label: presetLabel("female", 38, "M"),
    gender: "female",
    measurements: cisFemaleAdult38,
  },
  {
    id: "cisFemaleAdult40",
    label: presetLabel("female", 40, "L"),
    gender: "female",
    measurements: cisFemaleAdult40,
  },
  {
    id: "cisFemaleAdult42",
    label: presetLabel("female", 42, "XL"),
    gender: "female",
    measurements: cisFemaleAdult42,
  },
  {
    id: "cisFemaleAdult44",
    label: presetLabel("female", 44, "XXL"),
    gender: "female",
    measurements: cisFemaleAdult44,
  },
  {
    id: "cisFemaleAdult46",
    label: presetLabel("female", 46, "3XL"),
    gender: "female",
    measurements: cisFemaleAdult46,
  },

  // ── Men's sizes ───────────────────────────────────────────────────────────
  {
    id: "cisMaleAdult32",
    label: presetLabel("male", 32, "XXS"),
    gender: "male",
    measurements: cisMaleAdult32,
  },
  {
    id: "cisMaleAdult34",
    label: presetLabel("male", 34, "XS"),
    gender: "male",
    measurements: cisMaleAdult34,
  },
  {
    id: "cisMaleAdult36",
    label: presetLabel("male", 36, "S"),
    gender: "male",
    measurements: cisMaleAdult36,
  },
  {
    id: "cisMaleAdult38",
    label: presetLabel("male", 38, "M"),
    gender: "male",
    measurements: cisMaleAdult38,
  },
  {
    id: "cisMaleAdult40",
    label: presetLabel("male", 40, "L"),
    gender: "male",
    measurements: cisMaleAdult40,
  },
  {
    id: "cisMaleAdult42",
    label: presetLabel("male", 42, "XL"),
    gender: "male",
    measurements: cisMaleAdult42,
  },
  {
    id: "cisMaleAdult44",
    label: presetLabel("male", 44, "XXL"),
    gender: "male",
    measurements: cisMaleAdult44,
  },
  {
    id: "cisMaleAdult46",
    label: presetLabel("male", 46, "3XL"),
    gender: "male",
    measurements: cisMaleAdult46,
  },
  {
    id: "cisMaleAdult48",
    label: presetLabel("male", 48, "4XL"),
    gender: "male",
    measurements: cisMaleAdult48,
  },
  {
    id: "cisMaleAdult50",
    label: presetLabel("male", 50, "5XL"),
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
