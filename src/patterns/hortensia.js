import { Hortensia } from "@freesewing/hortensia";
import { cisFemaleAdult42 } from "@freesewing/models";

export default {
  Design: Hortensia,
  measurements: cisFemaleAdult42,
  parts: {
    "hortensia.frontPanel": {
      label: "Front Panel",
      panel: "front",
      defaultX: 2,
      defaultY: 1,
      color: "#ffedd5",
      cutCount: 1,
    },
    "hortensia.sidePanel": {
      label: "Side Panel",
      panel: "front",
      defaultX: 52,
      defaultY: 1,
      color: "#fed7aa",
      cutCount: 2,
    },
    "hortensia.strap": {
      label: "Strap",
      panel: "front",
      defaultX: 2,
      defaultY: 55,
      color: "#fdba74",
      cutCount: 1,
    },
    "hortensia.bottomPanel": {
      label: "Bottom Panel",
      panel: "back",
      defaultX: 2,
      defaultY: 1,
      color: "#ffedd5",
      cutCount: 1,
    },
    "hortensia.zipperPanel": {
      label: "Zipper Panel",
      panel: "back",
      defaultX: 52,
      defaultY: 1,
      color: "#fed7aa",
      cutCount: 2,
    },
    "hortensia.sidePanelReinforcement": {
      label: "Side Reinforcement",
      panel: "back",
      defaultX: 2,
      defaultY: 55,
      color: "#fdba74",
      cutCount: 2,
    },
  },
};
