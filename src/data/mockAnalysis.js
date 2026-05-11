export const mockAnalysis = {
  fabric: {
    type: { en: "Cotton Fabric", nb: "Bomullsstoff", zh: "棉質布料" },
    composition: [
      {
        material: { en: "Cotton", nb: "Bomull", zh: "棉" },
        percentage: 85,
      },
      {
        material: { en: "Polyester", nb: "Polyester", zh: "聚酯纖維" },
        percentage: 15,
      },
    ],
    color: { en: "Deep Blue", nb: "Dyp blå", zh: "深藍" },
    condition: {
      en: "Good (slight fading)",
      nb: "God (litt falming)",
      zh: "良好(輕微褪色)",
    },
    weight: { en: "Medium weight", nb: "Middels vekt", zh: "中等厚度" },
    texture: { en: "Plain weave", nb: "Lerretsbinding", zh: "平織" },
  },
  recommendations: [
    {
      id: "bag",
      name: { en: "Tote Bag", nb: "Bærepose", zh: "托特包" },
      matchScore: 90,
      reason: {
        en: "Medium thickness with good durability — ideal for a structured everyday bag",
        nb: "Middels tykkelse med god slitestyrke — ideell for en strukturert hverdagspose",
        zh: "中等厚度且耐用 — 適合做有型的日常包款",
      },
    },
    {
      id: "hat",
      name: { en: "Bucket Hat", nb: "Bøttehatt", zh: "漁夫帽" },
      matchScore: 75,
      reason: {
        en: "Deep color and breathable cotton make it great for a casual summer hat",
        nb: "Dyp farge og pustende bomull gjør den flott til en avslappet sommerhatt",
        zh: "深色且透氣的棉布,很適合做休閒夏季帽款",
      },
    },
  ],
  tags: [
    { en: "Natural Fiber", nb: "Naturfiber", zh: "天然纖維" },
    { en: "Machine Washable", nb: "Maskinvaskbar", zh: "可機洗" },
    { en: "Dye-friendly", nb: "Egnet for farging", zh: "易染色" },
  ],
  garmentLayout: {
    widthCm: 50,
    heightCm: 70,
    grainAngleDeg: 90,
    grainSpacingPx: 20,
  },
};
