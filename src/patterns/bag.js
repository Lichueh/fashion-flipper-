/**
 * Pattern data for the Tote Bag with chain.
 * Loaded dynamically by PatternLayoutScreen and StepGuideScreen.
 */
export default {
  patternPieces: [
    // FRONT shirt (body y≈75–225px, canvas H≈528)
    {
      id: "body-1",
      label: "Body Panel 1",
      widthCm: 20,
      heightCm: 15,
      areaCm2: 300,
      shape: "rect",
      color: "#fbbf24",
      grainAngleDeg: 90,
      panel: "front",
      defaultX: 15,
      defaultY: 15,
    },
    {
      id: "side",
      label: "Side Panel",
      widthCm: 15,
      heightCm: 5,
      areaCm2: 75,
      shape: "rect",
      color: "#fb923c",
      grainAngleDeg: 90,
      panel: "front",
      defaultX: 20,
      defaultY: 65,
    },
    {
      id: "body-2",
      label: "Body Panel 2",
      widthCm: 20,
      heightCm: 15,
      areaCm2: 300,
      shape: "rect",
      color: "#f59e0b",
      grainAngleDeg: 90,
      panel: "back",
      defaultX: 15,
      defaultY: 15,
    },
    {
      id: "strip-1",
      label: "Strip 1",
      widthCm: 20,
      heightCm: 5,
      areaCm2: 100,
      shape: "rect",
      color: "#f97316",
      grainAngleDeg: 90,
      panel: "back",
      defaultX: 5,
      defaultY: 65,
    },
    {
      id: "strip-2",
      label: "Strip 2",
      widthCm: 20,
      heightCm: 5,
      areaCm2: 100,
      shape: "rect",
      color: "#ea580c",
      grainAngleDeg: 90,
      panel: "back",
      defaultX: 55,
      defaultY: 65,
    },
  ],
  steps: [
    {
      image: "/images/templates/bag-step1.png",
      title: "Cut the Fabric",
      description:
        "Wash and lay the garment flat. Cut two 35×40 cm rectangles for the bag body and one 8×60 cm strip for the handles. Mark the outlines on the fabric reverse side with chalk before cutting.",
      tip: "Leave a 1.5 cm seam allowance on all sides and draw guidelines with chalk to keep cuts straight",
      duration: "15 min",
    },
    {
      image: "/images/templates/bag-step2.png",
      title: "Make the Handles",
      description:
        "Fold the long strip in half lengthwise. Fold each side inward by 1 cm, then fold in half again to form a ~2 cm wide strap. Stitch along both edges to secure. Cut into two 30 cm pieces.",
      tip: "Press the folds flat with an iron before stitching to keep everything aligned",
      duration: "15 min",
    },
    {
      image: "/images/templates/bag-step3.png",
      title: "Sew the Bag Body",
      description:
        "Place the two body pieces right sides together. Stitch three sides (both side seams + bottom), leaving the top open. Clip small notches at the corners — this helps the corners turn out sharp when flipped.",
      tip: "Use pins every 5 cm to prevent the fabric layers from shifting while sewing",
      duration: "20 min",
    },
    {
      image: "/images/templates/bag-step4.png",
      title: "Turn Right-Side Out & Shape",
      description:
        "Turn the bag right-side out through the top opening. Use a blunt tool (e.g., chopstick) to push the corners out fully. Press with an iron to flatten and shape the bag.",
      tip: "Take your time shaping before moving on — a well-pressed bag looks much more polished",
      duration: "10 min",
    },
    {
      image: "/images/templates/bag-step5.png",
      title: "Attach Handles & Finish Top Edge",
      description:
        'Position the handles 8 cm from each side edge and pin in place. Fold the top edge inward by 2 cm and stitch all the way around to close and finish the opening. Reinforce the handle attachment points with an "X" stitch for extra strength.',
      tip: "Measure handle placement symmetrically on both sides before sewing",
      duration: "20 min",
    },
  ],
};
