// AR tutorial step definitions. Each entry maps a template id to a list of
// guided AR steps consumed by ArTutorialScreen. Step textual content lives
// in src/patterns/<id>.js so StepGuideScreen can fall back to text-only
// when camera is unavailable.

export const arTutorials = {
  sewingMachine: {
    requiresCalibration: false,
    fallbackPxPerCm: 5.6,
    backTarget: "learn",
    steps: [
      {
        id: "machine-1",
        title: "Wind the Bobbin",
        instruction:
          "Run thread from the spool through the winder guide and wrap around an empty bobbin.",
        tip: "Wind at medium speed for even tension — too fast causes uneven winding.",
        durationMin: 3,
        overlayType: "numbered-callouts",
        overlay: {
          connectArrows: true,
          points: [
            { xNorm: 0.18, yNorm: 0.32, label: "Spool" },
            { xNorm: 0.5, yNorm: 0.24, label: "Winder Guide" },
            { xNorm: 0.82, yNorm: 0.32, label: "Empty Bobbin" },
          ],
        },
      },
      {
        id: "machine-2",
        title: "Thread the Upper Thread",
        instruction:
          "Follow the numbered path with presser foot raised: spool → guide → tension → take-up lever → needle.",
        tip: "Raising the presser foot opens the tension discs so the thread seats correctly.",
        durationMin: 4,
        overlayType: "numbered-callouts",
        overlay: {
          connectArrows: true,
          points: [
            { xNorm: 0.18, yNorm: 0.2, label: "Spool" },
            { xNorm: 0.34, yNorm: 0.32, label: "Thread Guide" },
            { xNorm: 0.5, yNorm: 0.55, label: "Tension Discs" },
            { xNorm: 0.55, yNorm: 0.3, label: "Take-up Lever" },
            { xNorm: 0.58, yNorm: 0.78, label: "Needle" },
          ],
        },
      },
      {
        id: "machine-3",
        title: "Insert the Bobbin",
        instruction:
          "Drop the wound bobbin into the slot and pull the thread under the needle plate. Counter-clockwise.",
        tip: "The thread should unwind counter-clockwise when placed correctly.",
        durationMin: 2,
        overlayType: "numbered-callouts",
        overlay: {
          connectArrows: false,
          points: [
            {
              xNorm: 0.5,
              yNorm: 0.7,
              label: "Bobbin Slot",
              value: "↺ counter-clockwise",
            },
          ],
        },
      },
      {
        id: "machine-4",
        title: "Set Stitch Length & Tension",
        instruction:
          "Stitch length 2.5–3 mm, tension 3–5 for most fabrics. Adjust if knots show on either side.",
        tip: "Always test on a scrap of the same fabric before sewing your actual pieces.",
        durationMin: 3,
        overlayType: "numbered-callouts",
        overlay: {
          connectArrows: false,
          points: [
            {
              xNorm: 0.32,
              yNorm: 0.42,
              label: "Stitch Length",
              value: "2.5–3 mm",
            },
            {
              xNorm: 0.66,
              yNorm: 0.42,
              label: "Tension",
              value: "3–5",
            },
          ],
        },
      },
      {
        id: "machine-5",
        title: "Start & End a Seam",
        instruction:
          "Forward 3–4 stitches, backstitch to lock, sew to end, backstitch again to finish.",
        tip: "Keep your hands lightly guiding the fabric — don't push or pull, just steer.",
        durationMin: 5,
        overlayType: "numbered-callouts",
        overlay: {
          connectArrows: true,
          points: [
            {
              xNorm: 0.5,
              yNorm: 0.5,
              label: "Start: 3–4 stitches",
              value: "↓",
            },
            { xNorm: 0.5, yNorm: 0.6, label: "Backstitch (lock)", value: "↑" },
            { xNorm: 0.5, yNorm: 0.75, label: "Sew to end", value: "↓↓" },
            { xNorm: 0.5, yNorm: 0.85, label: "Backstitch (finish)", value: "↑" },
          ],
        },
      },
    ],
  },

  noSewTote: {
    requiresCalibration: false,
    fallbackPxPerCm: 5.6,
    doneTarget: "result",
    steps: [
      {
        id: "cut-sleeves",
        title: "Cut neckline and both sleeves",
        instruction:
          "Cut the neckline along the U-curve and each sleeve along the J-curve.",
        tip: "Cut both sleeves the same way so the armholes match.",
        durationMin: 5,
        overlayType: "cut-line-pair",
        overlay: {
          sleeves: {
            left: { xNorm: 0.22, yTopNorm: 0.18, lengthCm: 24 },
            right: { xNorm: 0.78, yTopNorm: 0.18, lengthCm: 24 },
          },
          // depthCm chosen to roughly match the J's straight-section length
          // (0.7 × sleeve lengthCm = 16.8) so the neckline bottom and the J
          // hooks start at the same y level.
          neckline: { yTopNorm: 0.16, widthCm: 22, depthCm: 17 },
        },
      },
      {
        id: "cut-fringe",
        title: "Cut fringe along the bottom hem",
        instruction:
          "Cut 12 vertical strips, each ~8 cm deep and ~2.5 cm wide.",
        tip: "Use the marks as a guide. Don't cut all the way through.",
        durationMin: 8,
        overlayType: "fringe-marks",
        overlay: {
          count: 12,
          spacingCm: 2.5,
          depthCm: 8,
          hemYNorm: 0.78,
        },
      },
      {
        id: "tie-knots",
        title: "Tie pairs of strips into knots",
        instruction:
          "Tie each strip to its neighbor with a tight double knot. The knots will close the bottom of your bag.",
        tip: "Place phone on a stand and use two hands. Tap a pair to mark it done.",
        durationMin: 7,
        overlayType: "knot-pairs",
        overlay: {
          inheritFrom: "cut-fringe",
          showNumbers: true,
          handsOffMode: true,
        },
      },
    ],
  },
};
