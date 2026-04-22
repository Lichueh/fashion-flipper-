import { Wahid } from "@freesewing/wahid";
import { cisMaleAdult42 } from "@freesewing/models";

// brian.back and brian.front are base blocks — skipped
export default {
  Design: Wahid,
  measurements: cisMaleAdult42,
  parts: {
    "wahid.front": {
      label: "Front",
      panel: "front",
      defaultX: 2,
      defaultY: 1,
      color: "#fef3c7",
      cutCount: 2,
    },
    "wahid.frontFacing": {
      label: "Front Facing",
      panel: "front",
      defaultX: 52,
      defaultY: 1,
      color: "#fcd34d",
      cutCount: 2,
    },
    "wahid.frontLining": {
      label: "Front Lining",
      panel: "front",
      defaultX: 2,
      defaultY: 55,
      color: "#fde68a",
      cutCount: 2,
    },
    "wahid.pocketWelt": {
      label: "Pocket Welt",
      panel: "front",
      defaultX: 52,
      defaultY: 55,
      color: "#fbbf24",
      cutCount: 2,
    },
    "wahid.back": {
      label: "Back",
      panel: "back",
      defaultX: 2,
      defaultY: 1,
      color: "#fde68a",
      cutCount: 2,
    },
    "wahid.pocketBag": {
      label: "Pocket Bag",
      panel: "back",
      defaultX: 52,
      defaultY: 1,
      color: "#fef3c7",
      cutCount: 2,
    },
    "wahid.pocketFacing": {
      label: "Pocket Facing",
      panel: "back",
      defaultX: 2,
      defaultY: 55,
      color: "#fcd34d",
      cutCount: 2,
    },
    "wahid.pocketInterfacing": {
      label: "Pocket Interfacing",
      panel: "back",
      defaultX: 52,
      defaultY: 55,
      color: "#fef9c3",
      cutCount: 2,
    },
  },
};
