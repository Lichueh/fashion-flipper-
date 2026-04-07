export const mockAnalysis = {
  fabric: {
    type: 'Cotton Fabric',
    composition: [
      { material: 'Cotton', percentage: 85 },
      { material: 'Polyester', percentage: 15 },
    ],
    color: 'Deep Blue',
    condition: 'Good (slight fading)',
    weight: 'Medium weight',
    texture: 'Plain weave',
  },
  recommendations: [
    {
      id: 'bag',
      name: 'Tote Bag',
      matchScore: 90,
      reason: 'Medium thickness with good durability — ideal for a structured everyday bag',
    },
    {
      id: 'hat',
      name: 'Bucket Hat',
      matchScore: 75,
      reason: 'Deep color and breathable cotton make it great for a casual summer hat',
    },
  ],
  tags: ['Natural Fiber', 'Machine Washable', 'Dye-friendly'],
  garmentLayout: {
    widthCm: 50,    // one panel width (~50cm)
    heightCm: 70,   // body length shoulder to hem
    grainAngleDeg: 90,
    grainSpacingPx: 20,
  },
}
