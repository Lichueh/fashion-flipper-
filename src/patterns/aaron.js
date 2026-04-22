import { Aaron } from "@freesewing/aaron";
import { cisMaleAdult42 } from "@freesewing/models";

/**
 * FreeSewing config for the Aaron A-shirt.
 * Used by PatternLayoutScreen via dynamic import — do not import this file statically.
 *
 * To add a new pattern, copy this file, swap the Design + measurements imports,
 * and update the `parts` map. See the "Adding a new pattern" section in the README.
 */
export default {
  Design: Aaron,
  measurements: cisMaleAdult42,

  /**
   * Map of FreeSewing part key → display config for PatternLayoutScreen.
   * Keys not listed here are silently skipped (e.g. internal base blocks).
   *
   * defaultX / defaultY are percentages of the panel width/height (0–100).
   */
  parts: {
    "aaron.front": {
      label: "Front Body",
      panel: "front",
      defaultX: 2,
      defaultY: 1,
      color: "#d1fae5",
      cutCount: 2, // drafted as half; cut twice (or on fold)
    },
    "aaron.back": {
      label: "Back Body",
      panel: "back",
      defaultX: 2,
      defaultY: 1,
      color: "#a7f3d0",
      cutCount: 2, // drafted as half; cut twice (or on fold)
    },
    "aaron.armBinding": {
      label: "Arm Binding",
      panel: "front",
      defaultX: 62,
      defaultY: 1,
      color: "#6ee7b7",
      cutCount: 1,
    },
    "aaron.neckBinding": {
      label: "Neck Binding",
      panel: "front",
      defaultX: 74,
      defaultY: 1,
      color: "#34d399",
      cutCount: 1,
    },
  },
};
