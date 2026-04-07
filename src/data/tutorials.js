export const tutorials = [
  {
    id: "machine",
    title: "Sewing Machine Basics",
    emoji: "🪡",
    accentClass: "bg-secondary-300",
    bgClass: "bg-primary-100",
    stepClass: "bg-primary-300",
    steps: [
      {
        id: "machine-1",
        title: "Wind the Bobbin",
        description:
          "Place a spool of thread on the pin. Run the thread through the bobbin winding guide and wrap a few times around an empty bobbin. Press the bobbin winder pedal until full.",
        tip: "Wind at medium speed for even tension — too fast causes uneven winding.",
      },
      {
        id: "machine-2",
        title: "Thread the Upper Thread",
        description:
          "Follow the numbered thread path on your machine: spool pin → thread guides → tension discs → take-up lever → needle. Always thread with the presser foot raised.",
        tip: "Raising the presser foot opens the tension discs so the thread seats correctly.",
      },
      {
        id: "machine-3",
        title: "Insert the Bobbin",
        description:
          "Drop the wound bobbin into the bobbin case (or slot, depending on machine type). Thread the bobbin tail through the slot and pull it under the needle plate.",
        tip: "The thread should unwind counter-clockwise when the bobbin is placed correctly.",
      },
      {
        id: "machine-4",
        title: "Set Stitch Length & Tension",
        description:
          "For most fabrics use stitch length 2.5–3 mm. Adjust thread tension so the stitch looks the same on both sides — if knots appear on top, loosen upper tension; if on bottom, tighten it.",
        tip: "Always test on a scrap of the same fabric before sewing your actual pieces.",
      },
      {
        id: "machine-5",
        title: "Start & End a Seam",
        description:
          "Position fabric under the presser foot, lower the foot, then sew 3–4 stitches forward. Press the reverse button and backstitch over those stitches to lock. Sew forward to the end, then backstitch again to finish.",
        tip: "Keep your hands lightly guiding the fabric — don't push or pull, just steer.",
      },
    ],
  },
  {
    id: "stitches",
    title: "Basic Stitch Types",
    emoji: "🧶",
    accentClass: "bg-secondary-300",
    bgClass: "bg-primary-100",
    stepClass: "bg-primary-300",
    steps: [
      {
        id: "stitches-1",
        title: "Straight Stitch",
        description:
          "The most common machine stitch — a single line of even stitches used for seams. Set stitch length to 2.5 mm for medium-weight fabric, shorter for delicate, longer for basting.",
        tip: "Use a seam guide or tape on the needle plate to keep consistent seam allowance.",
      },
      {
        id: "stitches-2",
        title: "Backstitch (Hand)",
        description:
          "Bring needle up, then insert it one stitch-length behind and bring it up one stitch-length ahead. Each stitch goes back to meet the previous one, creating a solid line. Very strong for hand-sewn seams.",
        tip: "Backstitch is great for repairing seams by hand — stronger than a running stitch.",
      },
      {
        id: "stitches-3",
        title: "Running / Basting Stitch",
        description:
          "Weave the needle in and out of the fabric at regular intervals. Long stitches (6–8 mm) are basting — temporary holds before permanent stitching. Short stitches (2–3 mm) are a permanent running stitch.",
        tip: "Use a contrasting thread color for basting so it's easy to spot and remove later.",
      },
      {
        id: "stitches-4",
        title: "Zigzag Stitch",
        description:
          "A machine stitch that moves side to side, used to finish raw edges and prevent fraying. Set width to 3–4 mm and length to 2.5 mm. Stitch along the raw edge so the zigzag just catches the edge.",
        tip: "Zigzag stitch is essential if you don't have a serger/overlocker.",
      },
      {
        id: "stitches-5",
        title: "Slip Stitch (Invisible)",
        description:
          "Used to close openings invisibly from the outside. Fold both edges in, then pick up a tiny bit of each fold alternately, pulling thread gently to close the gap. The thread travels inside the fold and is invisible.",
        tip: "Perfect for closing the turning gap on bag handles, pillow covers, or hemming.",
      },
    ],
  },
  {
    id: "button",
    title: "Sewing a Button",
    emoji: "🔵",
    accentClass: "bg-secondary-300",
    bgClass: "bg-primary-100",
    stepClass: "bg-primary-300",
    steps: [
      {
        id: "button-1",
        title: "Mark the Position",
        description:
          "Mark the button placement with a pin or chalk. For accuracy, first sew the buttonhole, then overlap the placards and mark through the center of the hole.",
        tip: "Always sew the buttonhole first, then use it to determine exact button placement.",
      },
      {
        id: "button-2",
        title: "Prepare the Thread",
        description:
          "Cut ~50 cm of strong thread (buttonhole or doubled regular thread). Thread the needle and knot the end with a double knot. Bring it up from the wrong side at the marked point.",
        tip: "Wax the thread by running it over beeswax or a candle to prevent tangling and add strength.",
      },
      {
        id: "button-3",
        title: "Stitch Through the Holes",
        description:
          'Place a toothpick or pin under the button to create slack (the "shank"). Stitch up through one hole and down through the opposite hole 4–6 times per pair. Repeat for all hole pairs.',
        tip: "Keep the button slightly raised from the fabric while stitching — this allows room for the fabric layers to close.",
      },
      {
        id: "button-4",
        title: "Create the Thread Shank",
        description:
          "Remove the toothpick. Lift the button up so the threads between button and fabric are visible. Wrap the working thread around these threads 5–7 times to form a firm shank.",
        tip: "A proper shank prevents the button from pulling and tearing the fabric over time.",
      },
      {
        id: "button-5",
        title: "Fasten Off",
        description:
          "Pass the needle back through the fabric to the wrong side. Make 2–3 small stitches through the thread loops on the back to lock. Trim thread close to the knot.",
        tip: "For extra security, pass the needle through the knot itself before trimming.",
      },
    ],
  },
  {
    id: "zipper",
    title: "Installing a Zipper",
    emoji: "🤐",
    accentClass: "bg-secondary-300",
    bgClass: "bg-primary-100",
    stepClass: "bg-primary-300",
    video: "/zipper.mov",
    steps: [
      {
        id: "zipper-1",
        title: "Choose the Right Zipper",
        description:
          "Select a zipper 2–3 cm longer than the opening. Coil zippers are flexible and good for curved seams; plastic and metal zippers are sturdier for bags. Match zipper weight to fabric weight.",
        tip: "A slightly longer zipper is easier to install — you can trim or tuck the excess at the bottom.",
      },
      {
        id: "zipper-2",
        title: "Prepare the Seam",
        description:
          "Press under the seam allowance (usually 1.5 cm) on both sides of the opening. If working on a seam, stitch the seam below the zipper opening and baste the zipper portion closed temporarily.",
        tip: "Press crisp folds — a well-pressed edge makes pinning and stitching much more accurate.",
      },
      {
        id: "zipper-3",
        title: "Pin & Baste the Zipper",
        description:
          "Place the zipper face-down on the wrong side of the fabric, aligning the zipper tape edge with the pressed fold. Pin in place, then baste by hand or machine (longest stitch) down each side.",
        tip: "Use wonder clips instead of pins near the zipper teeth — pins can slip and distort placement.",
      },
      {
        id: "zipper-4",
        title: "Attach the Zipper Foot",
        description:
          "Replace the standard presser foot with a zipper foot. The zipper foot has a single toe that lets you stitch right next to the zipper teeth. Adjust to the left or right side as needed.",
        tip: "Test the zipper foot position on a scrap first so the stitching line falls in the right place.",
      },
      {
        id: "zipper-5",
        title: "Topstitch Both Sides",
        description:
          "Working from the right side of the fabric, stitch down one side of the zipper ~3 mm from the fold. Stop at the bottom with the needle down, pivot, stitch across the bottom, pivot again, and stitch up the other side.",
        tip: "Move the zipper pull out of the way as you sew by unzipping partially and nudging it behind the foot.",
      },
      {
        id: "zipper-6",
        title: "Remove Basting & Test",
        description:
          "Use a seam ripper to remove the basting stitches along the zipper opening. Open and close the zipper several times to check for smoothness. Press lightly with a pressing cloth over the zipper tape.",
        tip: "Never press directly on zipper teeth — the heat can melt plastic coils or warp metal teeth.",
      },
    ],
  },
];