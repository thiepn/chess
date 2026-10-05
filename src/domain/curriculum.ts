import type { ChessSkill, DomainId, SkillMastery } from "./types";

const skill = (
  id: string,
  domain: DomainId,
  title: string,
  description: string,
  importance: number,
  difficulty: number,
  prerequisites: ChessSkill["prerequisites"] = [],
  trainingModes: ChessSkill["trainingModes"] = ["conceptLesson", "mixedPuzzle"],
  tags: string[] = [],
): ChessSkill => ({
  id,
  domain,
  title,
  description,
  importance,
  difficulty,
  curriculumPriority: importance * (1.1 - difficulty * 0.08),
  prerequisites,
  relatedSkills: [],
  trainingModes,
  tags,
});

export const skills: ChessSkill[] = [
  skill("rules.board", "rules", "The board", "Ranks, files, coordinates and orientation.", 1, 1, [], ["conceptLesson", "boardVision"], ["beginner"]),
  skill("rules.pieces", "rules", "How the pieces move", "Legal movement, captures and blocked paths.", 1, 1, [{ skillId: "rules.board", strength: "hard" }], ["conceptLesson", "guidedDemo"], ["beginner"]),
  skill("rules.check", "rules", "Check", "Recognize check and legal ways to respond.", 1, 1, [{ skillId: "rules.pieces", strength: "hard" }], ["conceptLesson", "guidedDemo", "mixedPuzzle"], ["beginner"]),
  skill("rules.mate", "rules", "Checkmate", "Recognize and deliver basic checkmate.", 1, 2, [{ skillId: "rules.check", strength: "hard" }], ["conceptLesson", "guidedDemo", "themedPuzzle"], ["beginner"]),
  skill("fundamentals.values", "fundamentals", "Piece values", "Reason about material and exchanges.", 1, 1, [{ skillId: "rules.pieces", strength: "hard" }], ["conceptLesson", "microReview"], ["beginner"]),
  skill("fundamentals.attacked", "fundamentals", "Attacked and defended", "See which pieces are attacked, defended or loose.", 1, 2, [{ skillId: "rules.pieces", strength: "hard" }], ["guidedDemo", "mixedPuzzle"], ["beginner", "safety"]),
  skill("fundamentals.hanging", "fundamentals", "Stop hanging pieces", "Detect undefended pieces before material is lost.", 1, 2, [{ skillId: "fundamentals.attacked", strength: "hard" }], ["guidedDemo", "mixedPuzzle", "engineGame"], ["beginner", "safety"]),
  skill("fundamentals.blunder-check", "fundamentals", "Final blunder check", "Before moving, verify opponent checks, captures and threats.", 1, 2, [{ skillId: "fundamentals.hanging", strength: "soft" }], ["conceptLesson", "engineGame", "gameReview"], ["beginner", "thinking"]),
  skill("openings.principles", "openings", "Opening principles", "Develop, control the center and secure the king.", .96, 2, [{ skillId: "fundamentals.values", strength: "soft" }], ["conceptLesson", "openingPosition"], ["beginner"]),
  skill("tactics.double-attack", "tactics", "Double attacks", "Attack two targets with one move.", .96, 2, [{ skillId: "fundamentals.attacked", strength: "soft" }], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic"]),
  skill("tactics.knight-fork", "tactics", "Knight forks", "Recognize and create double attacks with a knight.", .95, 2, [{ skillId: "tactics.double-attack", strength: "soft" }], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic", "fork"]),
  skill("tactics.pin", "tactics", "Pins", "Exploit pieces that cannot move without exposing something more valuable.", .93, 3, [{ skillId: "fundamentals.attacked", strength: "soft" }], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic", "pin"]),
  skill("tactics.skewer", "tactics", "Skewers", "Attack a valuable piece and win what stands behind it.", .86, 3, [{ skillId: "tactics.pin", strength: "helpful" }], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic", "skewer"]),
  skill("calculation.candidates", "calculation", "Candidate moves", "Generate checks, captures, threats and useful quiet candidates.", .92, 3, [{ skillId: "fundamentals.blunder-check", strength: "soft" }], ["conceptLesson", "calculation"], ["thinking"]),
  skill("calculation.reply", "calculation", "Opponent's best reply", "Calculate against resistance rather than hope.", .94, 4, [{ skillId: "calculation.candidates", strength: "hard" }], ["calculation"], ["thinking"]),
  skill("endgames.queen-mate", "endgames", "Queen mate", "Convert king and queen versus king reliably.", .95, 2, [{ skillId: "rules.mate", strength: "hard" }], ["guidedDemo", "endgameDrill"], ["endgame", "essential"]),
  skill("endgames.rook-mate", "endgames", "Rook mate", "Convert king and rook versus king reliably.", .95, 3, [{ skillId: "rules.mate", strength: "hard" }], ["guidedDemo", "endgameDrill"], ["endgame", "essential"]),
  skill("endgames.opposition", "endgames", "Opposition", "Use king geometry to win or hold pawn endings.", .9, 3, [{ skillId: "rules.pieces", strength: "hard" }], ["conceptLesson", "endgameDrill"], ["endgame", "pawn"]),
  skill("strategy.worst-piece", "strategy", "Improve the worst piece", "Find useful quiet moves when no tactic exists.", .86, 4, [{ skillId: "openings.principles", strength: "soft" }], ["conceptLesson", "mixedPuzzle", "engineGame"], ["strategy"]),
  skill("pawns.passed", "pawns", "Passed pawns", "Create, support and stop passed pawns.", .84, 4, [{ skillId: "endgames.opposition", strength: "helpful" }], ["conceptLesson", "endgameDrill"], ["pawn"]),
  skill("defense.threats", "defense", "Threat recognition", "Identify the opponent's immediate and hidden threats.", .94, 3, [{ skillId: "fundamentals.blunder-check", strength: "soft" }], ["mixedPuzzle", "defenseChallenge"], ["defense"]),
  skill("conversion.simplify", "conversion", "Simplify when winning", "Reduce counterplay without throwing away the advantage.", .86, 4, [{ skillId: "fundamentals.values", strength: "soft" }], ["conceptLesson", "conversionChallenge"], ["conversion"]),
  skill("practical.time", "practical", "Clock discipline", "Spend time on critical positions and avoid preventable time trouble.", .78, 4, [], ["engineGame", "gameReview"], ["practical"]),
];

export const skillById = Object.fromEntries(skills.map((item) => [item.id, item]));

export const domainLabels: Record<DomainId, string> = {
  rules: "Rules & Board",
  fundamentals: "Fundamentals",
  tactics: "Tactical Vision",
  calculation: "Calculation",
  openings: "Opening Play",
  strategy: "Positional Chess",
  pawns: "Pawn Play",
  endgames: "Endgames",
  attack: "Attack",
  defense: "Defense",
  conversion: "Conversion",
  practical: "Practical Chess",
};

export function prerequisiteReadiness(
  candidate: ChessSkill,
  mastery: Record<string, SkillMastery>,
): number {
  if (!candidate.prerequisites.length) return 1;

  let readiness = 1;
  for (const relation of candidate.prerequisites) {
    const score = mastery[relation.skillId]?.effectiveMastery ?? 0;
    const target = relation.strength === "hard" ? 60 : relation.strength === "soft" ? 45 : 25;
    if (relation.strength === "hard" && score < 35) return 0;
    readiness *= Math.min(1, Math.max(.2, score / target));
  }
  return readiness;
}

export function readyCurriculumSkills(
  mastery: Record<string, SkillMastery>,
): ChessSkill[] {
  return skills
    .filter((candidate) => (mastery[candidate.id]?.effectiveMastery ?? 0) < 75)
    .filter((candidate) => prerequisiteReadiness(candidate, mastery) > .55)
    .sort((a, b) => b.curriculumPriority - a.curriculumPriority);
}
