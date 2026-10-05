import type {
  ChessSkill,
  CurriculumStageId,
  DomainId,
  SkillMastery,
} from "./types";

export interface CurriculumStage {
  id: CurriculumStageId;
  order: number;
  title: string;
  shortTitle: string;
  promise: string;
  description: string;
  targetRating: string;
}

export const curriculumStages: CurriculumStage[] = [
  {
    id: "learn",
    order: 0,
    title: "Learn to play",
    shortTitle: "Learn",
    promise: "Know the board and finish a legal game.",
    description:
      "Board language, movement, check, mate, castling, promotion and draw rules.",
    targetRating: "New player",
  },
  {
    id: "safety",
    order: 1,
    title: "Stop losing pieces",
    shortTitle: "Safety",
    promise: "Make moves that survive the opponent's reply.",
    description:
      "Material, attacks, defenders, exchanges, hanging pieces and threat checks.",
    targetRating: "Beginner",
  },
  {
    id: "build",
    order: 2,
    title: "Build good positions",
    shortTitle: "Build",
    promise: "Reach playable middlegames without memorizing theory.",
    description:
      "Center control, development, king safety, tempi and piece activity.",
    targetRating: "600–900",
  },
  {
    id: "tactics",
    order: 3,
    title: "See tactical patterns",
    shortTitle: "Tactics",
    promise: "Recognize the patterns that decide material and mates.",
    description:
      "Forks, pins, skewers, discovered attacks, deflection and related motifs.",
    targetRating: "700–1100",
  },
  {
    id: "thinking",
    order: 4,
    title: "Think before you move",
    shortTitle: "Thinking",
    promise: "Calculate against resistance and form useful plans.",
    description:
      "Candidate moves, replies, forcing lines, quiet moves, files, outposts and pawn play.",
    targetRating: "900–1300",
  },
  {
    id: "fight",
    order: 5,
    title: "Attack and defend",
    shortTitle: "Fight",
    promise: "Create threats without ignoring the opponent's resources.",
    description:
      "King attacks, open lines, defenders, sacrifices, prophylaxis and counterplay.",
    targetRating: "1000–1400",
  },
  {
    id: "finish",
    order: 6,
    title: "Finish games",
    shortTitle: "Finish",
    promise: "Convert advantages and handle essential endings.",
    description:
      "Basic mates, pawn endings, rook endings, passed pawns and simplification.",
    targetRating: "900–1500",
  },
  {
    id: "practical",
    order: 7,
    title: "Play practical chess",
    shortTitle: "Practical",
    promise: "Join the parts into a repeatable game process.",
    description:
      "Time use, plans, phase transitions, final move checks and recovery after mistakes.",
    targetRating: "1200–1600",
  },
];

const ratingByStage: Record<CurriculumStageId, number> = {
  learn: 0,
  safety: 400,
  build: 650,
  tactics: 750,
  thinking: 950,
  fight: 1050,
  finish: 950,
  practical: 1200,
};

const skill = (
  id: string,
  stage: CurriculumStageId,
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
  stage,
  domain,
  title,
  description,
  importance,
  difficulty,
  curriculumPriority: importance * (1.1 - difficulty * 0.08),
  prerequisites,
  relatedSkills: [],
  trainingModes,
  recommendedRating: ratingByStage[stage],
  tags,
});

const hard = (skillId: string) => ({ skillId, strength: "hard" as const });
const soft = (skillId: string) => ({ skillId, strength: "soft" as const });
const helpful = (skillId: string) => ({ skillId, strength: "helpful" as const });

export const skills: ChessSkill[] = [
  // Stage 0 — Learn to play
  skill("rules.board", "learn", "rules", "The board", "Read ranks, files, coordinates and orientation.", 1, 1, [], ["conceptLesson", "boardVision"], ["beginner", "board"]),
  skill("rules.pieces", "learn", "rules", "How the pieces move", "Move every piece legally and understand blocked paths.", 1, 1, [hard("rules.board")], ["conceptLesson", "guidedDemo"], ["beginner", "rules"]),
  skill("rules.capture", "learn", "rules", "Captures", "Understand how pieces capture and what changes after an exchange.", .98, 1, [hard("rules.pieces")], ["guidedDemo", "microReview"], ["beginner", "rules"]),
  skill("rules.check", "learn", "rules", "Check", "Recognize when the king is attacked.", 1, 1, [hard("rules.pieces")], ["conceptLesson", "guidedDemo", "mixedPuzzle"], ["beginner", "king"]),
  skill("rules.check-responses", "learn", "rules", "Respond to check", "Escape check by moving, capturing or blocking when legal.", 1, 2, [hard("rules.check")], ["guidedDemo", "mixedPuzzle"], ["beginner", "king"]),
  skill("rules.mate", "learn", "rules", "Checkmate", "Recognize and deliver basic checkmate.", 1, 2, [hard("rules.check-responses")], ["conceptLesson", "guidedDemo", "themedPuzzle"], ["beginner", "mate"]),
  skill("rules.castling", "learn", "rules", "Castling", "Know when castling is legal and why it helps king safety.", .94, 2, [hard("rules.check")], ["conceptLesson", "guidedDemo"], ["beginner", "king-safety"]),
  skill("rules.promotion", "learn", "rules", "Promotion", "Promote a pawn and choose the right piece.", .92, 2, [hard("rules.pieces")], ["guidedDemo", "themedPuzzle"], ["beginner", "pawn"]),
  skill("rules.draws", "learn", "rules", "Draws", "Understand stalemate, repetition, insufficient material and the fifty-move rule.", .82, 2, [soft("rules.mate")], ["conceptLesson", "microReview"], ["beginner", "draw"]),

  // Stage 1 — Stop losing pieces
  skill("fundamentals.values", "safety", "fundamentals", "Piece values", "Compare material before choosing exchanges.", 1, 1, [hard("rules.capture")], ["conceptLesson", "microReview"], ["beginner", "material"]),
  skill("fundamentals.attacked", "safety", "fundamentals", "Attacked pieces", "Notice which pieces the opponent can capture next.", 1, 2, [hard("rules.pieces")], ["guidedDemo", "mixedPuzzle"], ["beginner", "safety"]),
  skill("fundamentals.defended", "safety", "fundamentals", "Defenders", "Count meaningful defenders before relying on a piece or square.", .97, 2, [hard("fundamentals.attacked")], ["guidedDemo", "mixedPuzzle"], ["beginner", "safety"]),
  skill("fundamentals.hanging", "safety", "fundamentals", "Stop hanging pieces", "Detect loose or insufficiently protected pieces before material is lost.", 1, 2, [hard("fundamentals.attacked")], ["guidedDemo", "mixedPuzzle", "engineGame"], ["beginner", "safety"]),
  skill("fundamentals.trades", "safety", "fundamentals", "Good and bad trades", "Judge exchanges by material, activity and what remains afterward.", .94, 2, [hard("fundamentals.values"), soft("fundamentals.defended")], ["conceptLesson", "mixedPuzzle"], ["beginner", "material"]),
  skill("fundamentals.blunder-check", "safety", "fundamentals", "Final blunder check", "Before moving, verify opponent checks, captures and threats.", 1, 2, [soft("fundamentals.hanging")], ["conceptLesson", "engineGame", "gameReview"], ["beginner", "thinking"]),
  skill("defense.threats", "safety", "defense", "Threat recognition", "Identify the opponent's immediate forcing idea before starting your own plan.", .98, 3, [soft("fundamentals.blunder-check")], ["guidedDemo", "mixedPuzzle", "defenseChallenge"], ["defense", "thinking"]),

  // Stage 2 — Build good positions
  skill("openings.principles", "build", "openings", "Opening principles", "Develop, influence the center and secure the king.", .98, 2, [soft("fundamentals.values")], ["conceptLesson", "openingPosition"], ["beginner", "opening"]),
  skill("openings.development", "build", "openings", "Develop with purpose", "Bring minor pieces to useful squares instead of moving the same piece repeatedly.", .96, 2, [hard("openings.principles")], ["guidedDemo", "openingPosition"], ["opening", "development"]),
  skill("openings.center", "build", "openings", "Fight for the center", "Use pawns and pieces to contest central squares without overextending.", .95, 2, [soft("openings.principles")], ["conceptLesson", "openingPosition"], ["opening", "center"]),
  skill("openings.king-safety", "build", "openings", "Secure the king", "Castle or otherwise make the king safe before starting adventures.", .98, 2, [soft("rules.castling"), soft("openings.development")], ["guidedDemo", "openingPosition"], ["opening", "king-safety"]),
  skill("openings.queen-timing", "build", "openings", "Queen timing", "Avoid early queen moves that donate tempi unless concrete tactics justify them.", .88, 2, [soft("openings.development")], ["conceptLesson", "openingPosition"], ["opening", "tempo"]),
  skill("openings.tempo", "build", "openings", "Use tempi well", "Make opening moves that improve the position while creating useful threats.", .9, 3, [soft("openings.development")], ["guidedDemo", "openingPosition"], ["opening", "tempo"]),
  skill("strategy.piece-activity", "build", "strategy", "Active pieces", "Prefer squares where pieces influence more useful territory.", .92, 3, [soft("openings.development")], ["conceptLesson", "mixedPuzzle"], ["strategy", "activity"]),
  skill("strategy.worst-piece", "build", "strategy", "Improve the worst piece", "Find a useful quiet move when no tactic exists.", .88, 4, [soft("strategy.piece-activity")], ["conceptLesson", "mixedPuzzle", "engineGame"], ["strategy", "planning"]),

  // Stage 3 — Tactical vision
  skill("tactics.double-attack", "tactics", "tactics", "Double attacks", "Attack two targets with one move.", .98, 2, [soft("fundamentals.attacked")], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic", "fork"]),
  skill("tactics.knight-fork", "tactics", "tactics", "Knight forks", "Recognize and create double attacks with a knight.", .96, 2, [soft("tactics.double-attack")], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic", "fork"]),
  skill("tactics.pin", "tactics", "tactics", "Pins", "Exploit pieces that cannot move without exposing something more valuable.", .96, 3, [soft("fundamentals.attacked")], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic", "pin"]),
  skill("tactics.skewer", "tactics", "tactics", "Skewers", "Attack a valuable piece and win what stands behind it.", .9, 3, [helpful("tactics.pin")], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic", "skewer"]),
  skill("tactics.discovered", "tactics", "tactics", "Discovered attacks", "Move one piece to reveal an attack from another.", .91, 3, [soft("tactics.double-attack")], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic", "discovered-attack"]),
  skill("tactics.removing-defender", "tactics", "tactics", "Remove the defender", "Capture or distract the piece holding a target together.", .94, 3, [soft("fundamentals.defended")], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic", "defender"]),
  skill("tactics.deflection", "tactics", "tactics", "Deflection", "Force a defender away from a critical duty.", .87, 4, [soft("tactics.removing-defender")], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic", "deflection"]),
  skill("tactics.decoy", "tactics", "tactics", "Decoy", "Lure a piece onto a square where another tactic becomes possible.", .83, 4, [helpful("tactics.deflection")], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic", "attraction"]),
  skill("tactics.back-rank", "tactics", "tactics", "Back-rank tactics", "Exploit a king trapped behind its own pawns.", .92, 3, [hard("rules.mate")], ["guidedDemo", "themedPuzzle", "mixedPuzzle"], ["tactic", "mate"]),
  skill("tactics.overload", "tactics", "tactics", "Overloaded defenders", "Recognize a defender that cannot perform two jobs at once.", .84, 4, [soft("fundamentals.defended")], ["conceptLesson", "themedPuzzle"], ["tactic", "overload"]),
  skill("tactics.clearance", "tactics", "tactics", "Clearance", "Vacate a square or line so another piece can use it.", .8, 4, [helpful("tactics.discovered")], ["guidedDemo", "themedPuzzle"], ["tactic", "clearance"]),

  // Stage 4 — Calculation and plans
  skill("calculation.candidates", "thinking", "calculation", "Candidate moves", "Generate checks, captures, threats and useful quiet candidates.", .98, 3, [soft("fundamentals.blunder-check")], ["conceptLesson", "calculation"], ["thinking"]),
  skill("calculation.reply", "thinking", "calculation", "Opponent's best reply", "Calculate against resistance rather than hope.", .98, 4, [hard("calculation.candidates")], ["calculation"], ["thinking"]),
  skill("calculation.forcing-lines", "thinking", "calculation", "Forcing lines", "Calculate forcing sequences until the position becomes quiet enough to evaluate.", .94, 4, [soft("calculation.reply")], ["conceptLesson", "calculation"], ["thinking", "forcing"]),
  skill("calculation.move-order", "thinking", "calculation", "Move order", "Compare sequences where the same ideas occur in a different order.", .88, 4, [soft("calculation.forcing-lines")], ["calculation"], ["thinking", "move-order"]),
  skill("calculation.visualization", "thinking", "calculation", "Visualize the resulting position", "Track piece locations accurately several moves ahead.", .9, 4, [soft("calculation.reply")], ["guidedDemo", "calculation"], ["thinking", "visualization"]),
  skill("calculation.quiet", "thinking", "calculation", "Quiet candidates", "After forcing moves are checked, find improvements that do not attack immediately.", .84, 4, [soft("calculation.candidates"), helpful("strategy.worst-piece")], ["conceptLesson", "calculation"], ["thinking", "quiet"]),
  skill("strategy.open-files", "thinking", "strategy", "Open files", "Use rooks on files where pawns no longer block access.", .88, 3, [soft("strategy.piece-activity")], ["conceptLesson", "mixedPuzzle"], ["strategy", "rook"]),
  skill("strategy.outposts", "thinking", "strategy", "Outposts", "Place pieces on stable squares that enemy pawns cannot chase away.", .86, 4, [soft("strategy.piece-activity")], ["conceptLesson", "mixedPuzzle"], ["strategy", "knight"]),
  skill("pawns.breaks", "thinking", "pawns", "Pawn breaks", "Change the structure with a pawn move that opens lines or creates targets.", .88, 4, [soft("openings.center")], ["conceptLesson", "mixedPuzzle"], ["pawn", "strategy"]),
  skill("pawns.weaknesses", "thinking", "pawns", "Pawn weaknesses", "Recognize isolated, backward and fixed pawns as long-term targets.", .84, 4, [soft("pawns.breaks")], ["conceptLesson", "mixedPuzzle"], ["pawn", "strategy"]),

  // Stage 5 — Attack and defense
  skill("attack.king-safety", "fight", "attack", "Attack an exposed king", "Compare king shelter and piece access before committing to an attack.", .94, 4, [soft("openings.king-safety"), soft("calculation.candidates")], ["conceptLesson", "mixedPuzzle"], ["attack", "king"]),
  skill("attack.open-lines", "fight", "attack", "Open lines toward the king", "Use pawn breaks, captures and sacrifices to create files and diagonals.", .9, 4, [soft("attack.king-safety"), helpful("pawns.breaks")], ["guidedDemo", "mixedPuzzle"], ["attack", "lines"]),
  skill("attack.defenders", "fight", "attack", "Count king defenders", "Attack where your pieces can outnumber the defenders around the king.", .88, 4, [soft("attack.king-safety"), soft("tactics.removing-defender")], ["conceptLesson", "mixedPuzzle"], ["attack", "defender"]),
  skill("attack.mating-net", "fight", "attack", "Build a mating net", "Restrict flight squares before looking for the final check.", .92, 4, [hard("rules.mate"), soft("attack.king-safety")], ["guidedDemo", "themedPuzzle"], ["attack", "mate"]),
  skill("attack.sacrifice", "fight", "attack", "Sound sacrifices", "Sacrifice only when concrete compensation survives the opponent's best defense.", .82, 5, [hard("calculation.reply"), soft("attack.open-lines")], ["conceptLesson", "mixedPuzzle"], ["attack", "sacrifice"]),
  skill("defense.prophylaxis", "fight", "defense", "Prophylaxis", "Improve your position by preventing the opponent's easiest plan.", .87, 4, [hard("defense.threats"), helpful("strategy.worst-piece")], ["conceptLesson", "defenseChallenge"], ["defense", "strategy"]),
  skill("defense.exchange-attackers", "fight", "defense", "Trade attackers", "Reduce danger by exchanging the pieces that make the attack work.", .9, 3, [soft("defense.threats"), soft("fundamentals.trades")], ["guidedDemo", "defenseChallenge"], ["defense"]),
  skill("defense.counterplay", "fight", "defense", "Create counterplay", "When passive defense fails, create threats that force the attacker to respond.", .84, 5, [soft("defense.prophylaxis"), hard("calculation.reply")], ["conceptLesson", "defenseChallenge"], ["defense", "practical"]),

  // Stage 6 — Finish games
  skill("endgames.queen-mate", "finish", "endgames", "Queen mate", "Convert king and queen versus king reliably.", .98, 2, [hard("rules.mate")], ["guidedDemo", "endgameDrill"], ["endgame", "essential"]),
  skill("endgames.rook-mate", "finish", "endgames", "Rook mate", "Convert king and rook versus king reliably.", .98, 3, [hard("rules.mate")], ["guidedDemo", "endgameDrill"], ["endgame", "essential"]),
  skill("endgames.opposition", "finish", "endgames", "Opposition", "Use king geometry to win or hold pawn endings.", .94, 3, [hard("rules.pieces")], ["conceptLesson", "endgameDrill"], ["endgame", "pawn"]),
  skill("endgames.key-squares", "finish", "endgames", "Key squares", "Know which king squares guarantee a pawn's promotion.", .9, 3, [soft("endgames.opposition")], ["guidedDemo", "endgameDrill"], ["endgame", "pawn"]),
  skill("endgames.pawn-races", "finish", "endgames", "Pawn races", "Calculate promotion races with tempo and checking ideas.", .9, 4, [soft("rules.promotion")], ["calculation", "endgameDrill"], ["endgame", "pawn"]),
  skill("pawns.passed", "finish", "pawns", "Passed pawns", "Create, support and stop passed pawns.", .9, 4, [helpful("endgames.opposition")], ["conceptLesson", "endgameDrill"], ["pawn", "endgame"]),
  skill("endgames.rook-activity", "finish", "endgames", "Active rook endings", "Keep the rook active behind or beside passed pawns.", .91, 4, [soft("strategy.open-files")], ["conceptLesson", "endgameDrill"], ["endgame", "rook"]),
  skill("endgames.lucena", "finish", "endgames", "Lucena position", "Build a bridge to convert the standard winning rook ending.", .78, 5, [hard("endgames.rook-activity")], ["guidedDemo", "endgameDrill"], ["endgame", "rook"]),
  skill("endgames.philidor", "finish", "endgames", "Philidor defense", "Hold the standard defensive rook ending from the correct setup.", .78, 5, [hard("endgames.rook-activity")], ["guidedDemo", "endgameDrill"], ["endgame", "rook", "defense"]),
  skill("conversion.simplify", "finish", "conversion", "Simplify when winning", "Reduce counterplay without throwing away the advantage.", .92, 4, [soft("fundamentals.values"), soft("fundamentals.trades")], ["conceptLesson", "conversionChallenge"], ["conversion"]),

  // Stage 7 — Practical chess
  skill("practical.time", "practical", "practical", "Clock discipline", "Spend time on critical positions and avoid preventable time trouble.", .82, 4, [], ["engineGame", "gameReview"], ["practical"]),
  skill("practical.plan", "practical", "practical", "Choose a plan", "Turn the position's features into one useful next objective.", .9, 4, [soft("strategy.worst-piece"), soft("calculation.quiet")], ["conceptLesson", "engineGame"], ["practical", "planning"]),
  skill("practical.transition", "practical", "practical", "Handle phase transitions", "Notice when opening principles, middlegame plans or endgame rules should take over.", .84, 4, [soft("openings.principles"), soft("endgames.opposition")], ["conceptLesson", "gameReview"], ["practical"]),
  skill("practical.post-move-check", "practical", "practical", "Check the position after every move", "Re-evaluate checks, captures and threats after the board changes.", .96, 3, [hard("fundamentals.blunder-check"), soft("defense.threats")], ["conceptLesson", "engineGame", "gameReview"], ["practical", "thinking"]),
  skill("practical.resilience", "practical", "practical", "Recover after a mistake", "Stop one error from becoming three by reassessing the new position objectively.", .82, 4, [soft("practical.post-move-check")], ["conceptLesson", "engineGame", "gameReview"], ["practical", "psychology"]),
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

export function stageForSkill(skillId: string) {
  const stageId = skillById[skillId]?.stage;
  return curriculumStages.find((stage) => stage.id === stageId);
}

export function prerequisiteReadiness(
  candidate: ChessSkill,
  mastery: Record<string, SkillMastery>,
): number {
  if (!candidate.prerequisites.length) return 1;

  let readiness = 1;
  for (const relation of candidate.prerequisites) {
    const score = mastery[relation.skillId]?.effectiveMastery ?? 0;
    const target =
      relation.strength === "hard" ? 60 : relation.strength === "soft" ? 45 : 25;
    if (relation.strength === "hard" && score < 35) return 0;
    readiness *= Math.min(1, Math.max(.2, score / target));
  }
  return readiness;
}

export function isSkillUnlocked(
  candidate: ChessSkill,
  mastery: Record<string, SkillMastery>,
) {
  return prerequisiteReadiness(candidate, mastery) > .55;
}

export function readyCurriculumSkills(
  mastery: Record<string, SkillMastery>,
): ChessSkill[] {
  return skills
    .filter((candidate) => (mastery[candidate.id]?.effectiveMastery ?? 0) < 75)
    .filter((candidate) => isSkillUnlocked(candidate, mastery))
    .sort((a, b) => {
      const stageA = curriculumStages.find((stage) => stage.id === a.stage)?.order ?? 99;
      const stageB = curriculumStages.find((stage) => stage.id === b.stage)?.order ?? 99;
      if (stageA !== stageB) return stageA - stageB;
      return b.curriculumPriority - a.curriculumPriority;
    });
}
