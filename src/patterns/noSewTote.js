// Text fallback for the No-Sew Tote tutorial. Loaded by StepGuideScreen
// when ArTutorialScreen's camera path is unavailable (permission denied,
// desktop without camera). AR step geometry lives in src/data/arTutorials.js.

export default {
  patternPieces: [],
  steps: [
    {
      title: "Cut neckline and both sleeves",
      description:
        "Lay the T-shirt flat. Make three cuts: (1) a U-shaped scoop across the neckline (about 16 cm wide × 6 cm deep) to widen the bag's opening; (2) a J-shaped curve along each sleeve, starting from the shoulder, going down ~24 cm, then hooking inward at the underarm to remove the sleeve.",
      tip: "Cut both sleeves the same length so the armholes match. Mark the curves with chalk first if you're nervous about cutting freehand.",
    },
    {
      title: "Cut fringe along the bottom hem",
      description:
        "Cut 12 vertical strips along the bottom hem. Each strip should be about 2.5 cm wide and 8 cm deep. Cut through both front and back layers together so the fringe lines up.",
      tip: "Don't cut past the 8 cm mark — you need the unbroken fabric above to hold the bag's shape.",
    },
    {
      title: "Tie pairs of strips into knots",
      description:
        "Take each pair of adjacent strips (front + back together as one unit), then tie each pair to its neighbor with a tight double knot. The 12 strips form 6 knots that seal the bottom of the bag.",
      tip: "Pull each knot snug to close any gaps. Place your phone on a flat surface so both hands are free for tying.",
    },
  ],
};
