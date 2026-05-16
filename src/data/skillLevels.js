// 縫紉技能等級對照表。
// difficulty (1/2/3) 與 skill id (beginner/intermediate/advanced) 一對一對應。
// 色票集中在這裡，TemplateSelectScreen / HomeScreen / SkillLevelScreen / ProfileEditor 共用。

export const SKILL_LEVELS = [
  {
    id: "beginner",
    difficulty: 1,
    cardBg: "bg-green-50",
    thumbBg: "bg-green-100",
    border: "border-green-300",
    borderActive: "border-green-500",
    accent: "bg-green-500",
    text: "text-green-800",
  },
  {
    id: "intermediate",
    difficulty: 2,
    cardBg: "bg-orange-50",
    thumbBg: "bg-orange-100",
    border: "border-orange-300",
    borderActive: "border-orange-500",
    accent: "bg-orange-500",
    text: "text-orange-800",
  },
  {
    id: "advanced",
    difficulty: 3,
    cardBg: "bg-blue-50",
    thumbBg: "bg-blue-100",
    border: "border-blue-300",
    borderActive: "border-blue-500",
    accent: "bg-blue-500",
    text: "text-blue-800",
  },
];

export function levelByDifficulty(difficulty) {
  return (
    SKILL_LEVELS.find((l) => l.difficulty === difficulty) ?? SKILL_LEVELS[0]
  );
}

export function levelById(id) {
  return SKILL_LEVELS.find((l) => l.id === id) ?? SKILL_LEVELS[0];
}
