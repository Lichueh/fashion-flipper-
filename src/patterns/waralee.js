import { Waralee } from "@freesewing/waralee";
import { cisFemaleAdult42 } from "@freesewing/models";

// waralee.pantsProto is an internal prototype piece — skipped
export default {
  Design: Waralee,
  measurements: cisFemaleAdult42,
  parts: {
    "waralee.pants": {
      label: "Pants",
      panel: "front",
      defaultX: 2,
      defaultY: 1,
      color: "#ecfccb",
      cutCount: 2,
    },
    "waralee.cutout": {
      label: "Cutout",
      panel: "front",
      defaultX: 52,
      defaultY: 1,
      color: "#d9f99d",
      cutCount: 0, // tracing guide, not a cut piece
    },
    "waralee.pocket": {
      label: "Pocket",
      panel: "front",
      defaultX: 2,
      defaultY: 55,
      color: "#bef264",
      cutCount: 0, // tracing guide, not a cut piece
    },
    "waralee.mini": {
      label: "Mini Version",
      panel: "front",
      defaultX: 52,
      defaultY: 55,
      color: "#a3e635",
      cutCount: 1,
    },
    "waralee.waistbandFront": {
      label: "Front Waistband",
      panel: "front",
      defaultX: 2,
      defaultY: 75,
      color: "#d9f99d",
      cutCount: 1,
    },
    "waralee.strapFront": {
      label: "Front Strap",
      panel: "front",
      defaultX: 52,
      defaultY: 75,
      color: "#ecfccb",
      cutCount: 1,
    },
    "waralee.backPocket": {
      label: "Back Pocket",
      panel: "back",
      defaultX: 2,
      defaultY: 1,
      color: "#ecfccb",
      cutCount: 2,
    },
    "waralee.waistbandBack": {
      label: "Back Waistband",
      panel: "back",
      defaultX: 52,
      defaultY: 1,
      color: "#d9f99d",
      cutCount: 1,
    },
    "waralee.strapBack": {
      label: "Back Strap",
      panel: "back",
      defaultX: 2,
      defaultY: 55,
      color: "#bef264",
      cutCount: 1,
    },
  },
};
