import { Diana } from "@freesewing/diana";
import { cisFemaleAdult42 } from "@freesewing/models";

// brian.back, brian.front, library.sleeve are base blocks — skipped
export default {
  Design: Diana,
  measurements: cisFemaleAdult42,
  parts: {
    "diana.front": {
      label: "Front",
      panel: "front",
      defaultX: 2,
      defaultY: 1,
      color: "#f3e8ff",
      cutCount: 2,
    },
    "diana.sleeve": {
      label: "Sleeve",
      panel: "front",
      defaultX: 52,
      defaultY: 1,
      color: "#d8b4fe",
      cutCount: 2,
    },
    "diana.back": {
      label: "Back",
      panel: "back",
      defaultX: 2,
      defaultY: 1,
      color: "#e9d5ff",
      cutCount: 2,
    },
  },
};
