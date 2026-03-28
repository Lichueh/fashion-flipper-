export const templates = {
  bag: {
    id: 'bag',
    name: 'Tote Bag',
    emoji: '👜',
    difficulty: 1,
    maxDifficulty: 3,
    difficultyLabel: 'Beginner',
    time: 'About 1.5 hrs',
    matchScore: 90,
    description: 'A simple, practical everyday tote — perfect for shopping or commuting',
    accentColor: 'bg-amber-50',
    materials: [
      'Old garment (main fabric)',
      'Matching thread',
      'Scissors',
      'Ruler',
      'Needle or sewing machine',
      'Iron (optional)',
    ],
    steps: [
      {
        image: '/bag-step1.png',
        title: 'Cut the Fabric',
        description:
          'Wash and lay the garment flat. Cut two 35×40 cm rectangles for the bag body and one 8×60 cm strip for the handles. Mark the outlines on the fabric reverse side with chalk before cutting.',
        tip: 'Leave a 1.5 cm seam allowance on all sides and draw guidelines with chalk to keep cuts straight',
        duration: '15 min',
      },
      {
        image: '/bag-step2.png',
        title: 'Make the Handles',
        description:
          'Fold the long strip in half lengthwise. Fold each side inward by 1 cm, then fold in half again to form a ~2 cm wide strap. Stitch along both edges to secure. Cut into two 30 cm pieces.',
        tip: 'Press the folds flat with an iron before stitching to keep everything aligned',
        duration: '15 min',
      },
      {
        image: '/bag-step3.png',
        title: 'Sew the Bag Body',
        description:
          'Place the two body pieces right sides together. Stitch three sides (both side seams + bottom), leaving the top open. Clip small notches at the corners — this helps the corners turn out sharp when flipped.',
        tip: 'Use pins every 5 cm to prevent the fabric layers from shifting while sewing',
        duration: '20 min',
      },
      {
        image: '/bag-step4.png',
        title: 'Turn Right-Side Out & Shape',
        description:
          'Turn the bag right-side out through the top opening. Use a blunt tool (e.g., chopstick) to push the corners out fully. Press with an iron to flatten and shape the bag.',
        tip: 'Take your time shaping before moving on — a well-pressed bag looks much more polished',
        duration: '10 min',
      },
      {
        image: '/bag-step5.png',
        title: 'Attach Handles & Finish Top Edge',
        description:
          'Position the handles 8 cm from each side edge and pin in place. Fold the top edge inward by 2 cm and stitch all the way around to close and finish the opening. Reinforce the handle attachment points with an "X" stitch for extra strength.',
        tip: 'Measure handle placement symmetrically on both sides before sewing',
        duration: '20 min',
      },
    ],
  },
  hat: {
    id: 'hat',
    name: 'Bucket Hat',
    emoji: '🧢',
    difficulty: 2,
    maxDifficulty: 3,
    difficultyLabel: 'Beginner+',
    time: 'About 2–3 hrs',
    matchScore: 75,
    description: 'A casual, vintage-style bucket hat — sun protection with personality',
    accentColor: 'bg-sky-50',
    materials: [
      'Old garment (main fabric)',
      'Matching thread',
      'Fabric scissors',
      'Bucket hat pattern (for head circumference 56–58 cm)',
      'Needle or sewing machine',
      'Pins',
      'Iron',
    ],
    steps: [
      {
        title: 'Prepare the Pattern',
        description:
          'Measure your head circumference (typically 56–58 cm for adults). Draw or download a bucket hat pattern with 1 cm seam allowance: 6 crown side panels (trapezoid), 1 crown top circle, and 1 brim ring. Search "bucket hat pattern PDF" to find a free printable.',
        tip: 'Trace the pattern onto cardboard for a sturdier template that\'s easier to hold in place while cutting',
        duration: '20 min',
      },
      {
        title: 'Cut the Fabric',
        description:
          'Trace the pattern pieces onto the fabric with a disappearing-ink marker and cut out: 6 crown side panels, 1 crown top circle, 2 brim rings (one for each side — use a contrasting fabric for a reversible look).',
        tip: 'Align side panels along the straight grain of the fabric to prevent the hat from distorting',
        duration: '25 min',
      },
      {
        title: 'Sew the Crown',
        description:
          'Sew the 6 side panels together in pairs (right sides facing), then join all pairs to form a cylindrical crown. Finally sew the circular top piece onto the crown, using pins every 3–4 cm around the curve.',
        tip: 'Clip notches into the curved seam allowance after sewing so the seam lies flat when turned',
        duration: '30 min',
      },
      {
        title: 'Make the Brim',
        description:
          'Place the two brim rings right sides together and sew around the outer curved edge. Clip notches every 1 cm around the curve, then turn right-side out and press flat. Leave the inner circle unsewn for now.',
        tip: 'Clip notches to within 0.2 cm of the seam — not too close, or the seam may fray',
        duration: '25 min',
      },
      {
        title: 'Attach Brim to Crown',
        description:
          'Align the open inner circle of the brim with the bottom edge of the crown (right sides facing). Pin every 3–4 cm around the full circumference, then stitch all the way around.',
        tip: 'Do a quick hand-baste stitch first to check the fit before machine sewing',
        duration: '20 min',
      },
      {
        title: 'Topstitch & Finish',
        description:
          'Press the seam allowance toward the crown. From the right side of the crown, topstitch ~0.2 cm from the seam to secure the seam allowance and add a clean finish. Optionally, topstitch around the outer brim edge for extra stiffness and style.',
        tip: 'Slow down your machine speed on curves and gently guide the fabric for even stitching',
        duration: '15 min',
      },
    ],
  },
}
