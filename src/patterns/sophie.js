import { Sophie } from "@freesewing/sophie";
import { cisFemaleAdult38 } from "@freesewing/models";

export default {
  Design: Sophie,
  measurements: cisFemaleAdult38,
  parts: {
    "sophie.frontPanel": {
      label: "Front Panel",
      panel: "front",
      defaultX: 2,
      defaultY: 1,
      color: "#dcfce7",
      cutCount: 2,
    },
    "sophie.backPanel": {
      label: "Back Panel",
      panel: "back",
      defaultX: 2,
      defaultY: 1,
      color: "#bbf7d0",
      cutCount: 2,
    },
  },
};
