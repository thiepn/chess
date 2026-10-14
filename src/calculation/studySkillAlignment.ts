import type { CalculationPosition } from "./types";

/**
 * G0 content routing only. These already-authored studies are unscored:
 * their legal reference lines do not certify an engine-unique best move.
 * Never change a historical source identity, personal-game position or graded item.
 */
type StudyKind =
  | "pawnStructureStudy" | "pieceCoordinationStudy" | "kingAttackStudy"
  | "defensiveTechniqueStudy" | "strategicImbalanceStudy" | "prophylaxisStudy"
  | "openingTransitionStudy" | "endgameDecisionStudy";

const kinds: ReadonlyArray<{ prefix: string; kind: StudyKind }> = [
  { prefix: "p103", kind: "pawnStructureStudy" },
  { prefix: "p104", kind: "pieceCoordinationStudy" },
  { prefix: "p105", kind: "kingAttackStudy" },
  { prefix: "p106", kind: "defensiveTechniqueStudy" },
  { prefix: "p109", kind: "strategicImbalanceStudy" },
  { prefix: "p110", kind: "prophylaxisStudy" },
  { prefix: "p111", kind: "openingTransitionStudy" },
  { prefix: "p112", kind: "endgameDecisionStudy" },
];

export function sourceStudyKind(position: CalculationPosition): StudyKind | null {
  if (position.assessmentStatus !== "instructional-only") return null;
  const pair = kinds.find(({ prefix }) => position.id.startsWith(`calc:${prefix}-`));
  if (!pair) return null;
  const data = position as unknown as Record<string, unknown>;
  const study = data[pair.kind];
  return study && typeof study === "object" ? pair.kind : null;
}

export function sourceStudyTheme(position: CalculationPosition): string {
  const kind = sourceStudyKind(position);
  if (!kind) return "";
  const study = (position as unknown as Record<string, unknown>)[kind] as Record<string, unknown>;
  const text = study.theme ?? study.family;
  return typeof text === "string" ? text : "";
}

export function alignSourceStudySkills(position: CalculationPosition): CalculationPosition {
  const kind = sourceStudyKind(position);
  if (!kind) return position;
  const theme = sourceStudyTheme(position).toLowerCase();
  const add: string[] = [];
  switch (kind) {
    case "pawnStructureStudy":
      add.push("pawns.weaknesses");
      if (theme.includes("isolated queen")) add.push("pawns.iqp");
      if (theme.includes("hanging")) add.push("pawns.hanging");
      if (theme.includes("minority")) add.push("pawns.minority");
      if (theme.includes("break") || theme.includes("lever")) add.push("pawns.breaks");
      if (theme.includes("passed")) add.push("pawns.passed");
      break;
    case "pieceCoordinationStudy":
      add.push("strategy.coordination");
      if (theme.includes("knight") && theme.includes("bishop")) add.push("strategy.bishop-vs-knight");
      if (theme.includes("outpost") || theme.includes("blockade")) add.push("strategy.outposts");
      if (theme.includes("least active") || theme.includes("improving")) add.push("strategy.worst-piece");
      if (theme.includes("exchange")) add.push("strategy.exchanges");
      break;
    case "kingAttackStudy":
      add.push("attack.king-safety");
      if (theme.includes("file") || theme.includes("diagonal")) add.push("attack.open-lines");
      if (theme.includes("block") || theme.includes("shelter") || theme.includes("interposition")) add.push("attack.defenders");
      break;
    case "defensiveTechniqueStudy":
      add.push("defense.counterplay");
      if (theme.includes("trade") || theme.includes("exchange")) add.push("defense.exchange-attackers");
      if (theme.includes("flight") || theme.includes("shield") || theme.includes("fortress")) add.push("defense.prophylaxis");
      break;
    case "strategicImbalanceStudy":
      add.push("strategy.imbalances");
      if (theme.includes("bishop") && theme.includes("knight")) add.push("strategy.bishop-vs-knight");
      if (theme.includes("weak") || theme.includes("pawn")) add.push("pawns.weaknesses");
      if (theme.includes("space")) add.push("strategy.restriction");
      break;
    case "prophylaxisStudy":
      add.push("defense.prophylaxis");
      if (theme.includes("restriction") || theme.includes("weak-square")) add.push("strategy.restriction");
      if (theme.includes("counterattack") || theme.includes("counterplay")) add.push("defense.counterplay");
      break;
    case "openingTransitionStudy":
      add.push("strategy.repertoire-middlegames");
      if (theme.includes("break") || theme.includes("advance")) add.push("pawns.breaks");
      break;
    case "endgameDecisionStudy":
      if (theme.includes("rook")) add.push("endgames.rook-activity");
      if (theme.includes("opposition")) add.push("endgames.opposition");
      if (theme.includes("race") || theme.includes("passer")) add.push("endgames.pawn-races");
      if (theme.includes("exchange") || theme.includes("simplif")) add.push("conversion.simplify");
      if (theme.includes("bishop")) add.push("endgames.opposite-bishops");
      break;
  }
  if (!add.length) return position;
  const skillIds = [...new Set([...position.skillIds, ...add])];
  return skillIds.length === position.skillIds.length ? position : { ...position, skillIds };
}
