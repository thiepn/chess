import themeMap from "./theme-map.json";
import { seedPuzzles } from "./seed";

const ids = new Set<string>();

for (const skillIds of Object.values(themeMap)) {
  for (const skillId of skillIds) ids.add(skillId);
}

for (const puzzle of seedPuzzles) {
  for (const skillId of puzzle.skillIds) ids.add(skillId);
}

export const puzzleSupportedSkillIds = ids;

export function supportsPuzzlePractice(skillId: string) {
  return puzzleSupportedSkillIds.has(skillId);
}
