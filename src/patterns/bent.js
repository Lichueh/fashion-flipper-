import { Bent } from "@freesewing/bent";
import { cisMaleAdult42 } from "@freesewing/models";

export default {
  Design: Bent,
  measurements: cisMaleAdult42,
  parts: {
    "brian.back": {
      label: "Back",
      panel: "back",
      defaultX: 2,
      defaultY: 1,
      color: "#fef3c7",
      cutCount: 2,
    },
    "brian.front": {
      label: "Front",
      panel: "front",
      defaultX: 2,
      defaultY: 1,
      color: "#fde68a",
      cutCount: 2,
    },
    "library.topsleeve": {
      label: "Top Sleeve",
      panel: "front",
      defaultX: 52,
      defaultY: 1,
      color: "#fcd34d",
      cutCount: 2,
    },
    "library.undersleeve": {
      label: "Under Sleeve",
      panel: "back",
      defaultX: 52,
      defaultY: 1,
      color: "#fbbf24",
      cutCount: 2,
    },
  },
};
