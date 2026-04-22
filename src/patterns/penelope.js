import { Penelope } from "@freesewing/penelope";
import { cisFemaleAdult42 } from "@freesewing/models";

export default {
  Design: Penelope,
  measurements: cisFemaleAdult42,
  parts: {
    "penelope.front": {
      label: "Front",
      panel: "front",
      defaultX: 2,
      defaultY: 1,
      color: "#ccfbf1",
      cutCount: 2,
    },
    "penelope.back": {
      label: "Back",
      panel: "back",
      defaultX: 2,
      defaultY: 1,
      color: "#99f6e4",
      cutCount: 2,
    },
  },
};
