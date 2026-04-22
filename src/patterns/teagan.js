import { Teagan } from "@freesewing/teagan";
import { cisMaleAdult42 } from "@freesewing/models";

// library.sleeve is a base block sleeve — teagan.sleeve is the final piece
export default {
  Design: Teagan,
  measurements: cisMaleAdult42,
  parts: {
    "teagan.front": {
      label: "Front",
      panel: "front",
      defaultX: 2,
      defaultY: 1,
      color: "#fef9c3",
      cutCount: 2,
    },
    "teagan.sleeve": {
      label: "Sleeve",
      panel: "front",
      defaultX: 52,
      defaultY: 1,
      color: "#fde047",
      cutCount: 2,
    },
    "teagan.back": {
      label: "Back",
      panel: "back",
      defaultX: 2,
      defaultY: 1,
      color: "#fef08a",
      cutCount: 2,
    },
  },
};
