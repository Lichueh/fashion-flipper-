/**
 * Per-template fabric requirements used by checkFeasibility() to determine
 * whether a user's fabric is compatible with a given pattern.
 *
 * Every entry has ALL fields explicitly set — no implicit nulls.
 *
 * Field reference:
 *   minWeightClass   {1|2|3}         Minimum fabric weight (1=light, 2=mid, 3=heavy)
 *   maxWeightClass   {1|2|3|null}    Maximum fabric weight; null = no upper limit
 *   allowKnit        {boolean}       Whether knit/jersey fabrics are acceptable
 *   requiresStretch  {boolean}       Pattern only works with stretch fabric (blocks wovens)
 *   allowBias        {boolean}       Whether bias-cut grain is acceptable
 *   minConditionRank {0|1|2|3}       Minimum fabric condition (0=damaged, 3=good)
 *   canInterfaceFix  {boolean}       True when adding interfacing/double-layer resolves a
 *                                    weight issue — pattern stays feasible but score is capped
 *   rejectFibers     {string[]}      Material rules that hard-fail the pattern.
 *                                    Format: "material>threshold" or "material<threshold"
 *                                    e.g. "polyester>60" = fail if polyester exceeds 60 %
 *   preferredFibers  {string[]}      Soft requirements; not meeting them is a hard fail.
 *                                    Format: "natural>=50" = need ≥50 % natural-fiber total
 *                                    Supported natural fibers: cotton, linen, wool, silk,
 *                                    viscose, rayon, tencel, bamboo
 *   reason           {string|null}   Human-readable explanation shown in the UI when the
 *                                    pattern fails a fabric check
 */

export const FABRIC_REQUIREMENTS = {
  // ── Handmade accessories ───────────────────────────────────────────────────

  noSewTote: {
    minWeightClass: 1, // jersey-friendly
    maxWeightClass: 2, // heavy fabric won't drape into a bag shape
    allowKnit: true, // T-shirts are the target material
    requiresStretch: false,
    allowBias: true,
    minConditionRank: 2, // fair — old tee is fine
    canInterfaceFix: false,
    rejectFibers: [],
    preferredFibers: [],
    reason: null,
  },

  bag: {
    minWeightClass: 2,
    maxWeightClass: null,
    allowKnit: false,
    requiresStretch: false,
    allowBias: false,
    minConditionRank: 2, // fair
    canInterfaceFix: true,
    rejectFibers: [],
    preferredFibers: [],
    reason: {
      en: "Tote bag needs structured fabric to hold weight — add interfacing for lighter fabrics",
      nb: "Bærepose trenger strukturert stoff for å bære vekt — legg til mellomfôr for lettere stoffer",
      zh: "托特包需要有結構的布料才能承重 — 較輕的布料請加襯布",
    },
  },

  hat: {
    minWeightClass: 2,
    maxWeightClass: null,
    allowKnit: false,
    requiresStretch: false,
    allowBias: true,
    minConditionRank: 2, // fair
    canInterfaceFix: true,
    rejectFibers: [],
    preferredFibers: [],
    reason: {
      en: "Bucket hat brim needs to hold its shape — add interfacing for lighter fabrics",
      nb: "Bøttehattens brem må holde formen — legg til mellomfôr for lettere stoffer",
      zh: "漁夫帽帽簷需要支撐力 — 較輕的布料請加襯布",
    },
  },

  // ── FreeSewing patterns ────────────────────────────────────────────────────

  aaron: {
    // A-shirt / tank top — works in jersey or lightweight woven
    minWeightClass: 1,
    maxWeightClass: 2,
    allowKnit: true,
    requiresStretch: false,
    allowBias: true,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: [],
    preferredFibers: [],
    reason: null,
  },

  bella: {
    // Fitted bodice block — needs woven with natural-fiber drape
    minWeightClass: 1,
    maxWeightClass: 2,
    allowKnit: false,
    requiresStretch: false,
    allowBias: false,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: [],
    preferredFibers: ["natural>=50"],
    reason: {
      en: "Fitted bodice block requires ≥50% natural fiber for proper drape and ease of sewing",
      nb: "Tilpasset livgrunnform krever minst 50 % naturfiber for riktig fall og lett søm",
      zh: "貼身上身原型需 ≥50% 天然纖維,才有適當垂墜感且好縫",
    },
  },

  bent: {
    // Sleeve block — structured woven required
    minWeightClass: 1,
    maxWeightClass: 2,
    allowKnit: false,
    requiresStretch: false,
    allowBias: false,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: [],
    preferredFibers: [],
    reason: {
      en: "Sleeve block requires stable woven fabric for accurate shaping",
      nb: "Ermegrunnformen krever stabilt vevd stoff for nøyaktig form",
      zh: "袖子原型需穩定梭織布才能塑出準確輪廓",
    },
  },

  brian: {
    // Basic body block — woven, no stretch
    minWeightClass: 1,
    maxWeightClass: 2,
    allowKnit: false,
    requiresStretch: false,
    allowBias: false,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: [],
    preferredFibers: [],
    reason: {
      en: "Body block requires stable woven fabric",
      nb: "Kroppsgrunnformen krever stabilt vevd stoff",
      zh: "身片原型需穩定的梭織布",
    },
  },

  charlie: {
    // Chinos / structured trousers — midweight+ woven
    minWeightClass: 2,
    maxWeightClass: null, // heavyweight canvas/denim is fine
    allowKnit: false,
    requiresStretch: false,
    allowBias: false,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: [],
    preferredFibers: [],
    reason: {
      en: "Structured chinos need midweight or heavier woven fabric",
      nb: "Strukturerte chinos trenger middels eller tyngre vevd stoff",
      zh: "結構感卡其褲需中等以上厚度的梭織布",
    },
  },

  diana: {
    // Wrap dress — knit or lightweight woven, stretch optional
    minWeightClass: 1,
    maxWeightClass: 2,
    allowKnit: true,
    requiresStretch: false,
    allowBias: true,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: [],
    preferredFibers: [],
    reason: null,
  },

  hortensia: {
    // Structured handbag — needs firm fabric, interfacing acceptable
    minWeightClass: 2,
    maxWeightClass: null,
    allowKnit: false,
    requiresStretch: false,
    allowBias: false,
    minConditionRank: 2, // fair
    canInterfaceFix: true,
    rejectFibers: [],
    preferredFibers: [],
    reason: {
      en: "Handbag needs structured fabric to hold shape — add interfacing for lighter fabrics",
      nb: "Håndvesken trenger strukturert stoff for å holde formen — legg til mellomfôr for lettere stoffer",
      zh: "手提包需有結構的布料維持形狀 — 較輕的布料請加襯布",
    },
  },

  penelope: {
    // Pencil skirt — stable woven, not too heavy
    minWeightClass: 1,
    maxWeightClass: 2,
    allowKnit: false,
    requiresStretch: false,
    allowBias: false,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: [],
    preferredFibers: [],
    reason: {
      en: "Pencil skirt requires stable woven fabric — heavyweight will be too stiff",
      nb: "Blyantskjørtet krever stabilt vevd stoff — for tungt vil bli for stivt",
      zh: "鉛筆裙需穩定的梭織布 — 太厚會過硬",
    },
  },

  simon: {
    // Classic button-up shirt — woven, presses well; rejects high-poly blends
    minWeightClass: 1,
    maxWeightClass: 2,
    allowKnit: false,
    requiresStretch: false,
    allowBias: false,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: ["polyester>60"],
    preferredFibers: [],
    reason: {
      en: "Shirt requires woven fabric that presses well — high polyester blends don't hold a crisp seam",
      nb: "Skjorten krever vevd stoff som lar seg stryke godt — blandinger med mye polyester holder ikke skarpe sømmer",
      zh: "襯衫需熨燙效果佳的梭織布 — 高聚酯纖維混紡無法保持挺直的縫線",
    },
  },

  simone: {
    // Shirt with FBA — same requirements as simon
    minWeightClass: 1,
    maxWeightClass: 2,
    allowKnit: false,
    requiresStretch: false,
    allowBias: false,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: ["polyester>60"],
    preferredFibers: [],
    reason: {
      en: "Shirt requires woven fabric that presses well — high polyester blends don't hold a crisp seam",
      nb: "Skjorten krever vevd stoff som lar seg stryke godt — blandinger med mye polyester holder ikke skarpe sømmer",
      zh: "襯衫需熨燙效果佳的梭織布 — 高聚酯纖維混紡無法保持挺直的縫線",
    },
  },

  sophie: {
    // Shorts / skirt variant — woven, not too heavy or too light
    minWeightClass: 1,
    maxWeightClass: 2,
    allowKnit: false,
    requiresStretch: false,
    allowBias: false,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: [],
    preferredFibers: [],
    reason: {
      en: "Shorts pattern requires stable woven fabric — heavyweight will be too stiff",
      nb: "Shortsmønsteret krever stabilt vevd stoff — for tungt vil bli for stivt",
      zh: "短褲版型需穩定的梭織布 — 太厚會過硬",
    },
  },

  teagan: {
    // T-shirt — knit-friendly; stretch not required but preferred
    minWeightClass: 1,
    maxWeightClass: 2,
    allowKnit: true,
    requiresStretch: false,
    allowBias: true,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: [],
    preferredFibers: [],
    reason: null,
  },

  waralee: {
    // Wrap trousers — knit or woven, stretch not required
    minWeightClass: 1,
    maxWeightClass: 2,
    allowKnit: true,
    requiresStretch: false,
    allowBias: true,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: [],
    preferredFibers: [],
    reason: null,
  },

  wahid: {
    // Waistcoat / vest — firm midweight woven
    minWeightClass: 2,
    maxWeightClass: null, // heavier suiting fabric is fine
    allowKnit: false,
    requiresStretch: false,
    allowBias: false,
    minConditionRank: 3, // good
    canInterfaceFix: false,
    rejectFibers: [],
    preferredFibers: [],
    reason: {
      en: "Waistcoat requires firm woven fabric — knits and lightweight fabrics won't hold the structured shape",
      nb: "Vesten krever fast vevd stoff — strikk og lette stoffer holder ikke den strukturerte formen",
      zh: "西裝背心需挺括的梭織布 — 針織與輕薄布料無法撐起結構",
    },
  },
};

// ── Fiber helpers used by checkFeasibility ──────────────────────────────────

/** Materials counted as "natural fiber" for preferredFibers checks. */
export const NATURAL_FIBERS = new Set([
  "cotton",
  "linen",
  "wool",
  "silk",
  "cashmere",
  "hemp",
  "viscose",
  "rayon",
  "tencel",
  "lyocell",
  "bamboo",
  "modal",
]);
