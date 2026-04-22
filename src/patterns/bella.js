import { Bella } from "@freesewing/bella";
import { cisFemaleAdult42 } from "@freesewing/models";

export default {
  Design: Bella,
  measurements: cisFemaleAdult42,
  parts: {
    "bella.back": {
      label: "Back Bodice",
      panel: "back",
      defaultX: 2,
      defaultY: 1,
      color: "#fce7f3",
      cutCount: 2,
    },
    "bella.frontSideDart": {
      label: "Front Bodice",
      panel: "front",
      defaultX: 2,
      defaultY: 1,
      color: "#fbcfe8",
      cutCount: 2,
    },
  },
};
