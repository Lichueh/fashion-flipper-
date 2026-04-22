import { Brian } from "@freesewing/brian";
import { cisMaleAdult42 } from "@freesewing/models";

export default {
  Design: Brian,
  measurements: cisMaleAdult42,
  parts: {
    "brian.back": {
      label: "Back",
      panel: "back",
      defaultX: 2,
      defaultY: 1,
      color: "#dbeafe",
      cutCount: 2,
    },
    "brian.front": {
      label: "Front",
      panel: "front",
      defaultX: 2,
      defaultY: 1,
      color: "#bfdbfe",
      cutCount: 2,
    },
    "library.sleeve": {
      label: "Sleeve",
      panel: "front",
      defaultX: 52,
      defaultY: 1,
      color: "#93c5fd",
      cutCount: 2,
    },
  },
};
