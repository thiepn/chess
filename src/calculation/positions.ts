import { legalCalculationBranch } from "./branchFeedback";
import type {
  ChessSkill,
  TrainingActivity,
  UserState,
} from "../domain/types";
import type {
  CalculationPosition,
} from "./types";

// P94 lessons remain a static asset; the existing runner verifies lines.
let p94Positions: CalculationPosition[] = [];
if (typeof window !== "undefined") {
  fetch(`${import.meta.env.BASE_URL}data/calculation/p94-candidates-v1.json`)
    .then(r => r.json())
    .then(({ positions }: {positions: CalculationPosition[]}) => {
      p94Positions = positions.filter(p => p.id.startsWith("calc:p94-") &&
        legalCalculationBranch(p));
    }).catch(() => {});
}

const authoredPositions: CalculationPosition[] = [
  {
    id: "calc:fork-candidates",
    skillIds: [
      "calculation.candidates",
      "calculation.forcing-lines",
      "calculation.visualization",
      "tactics.combinations",
    ],
    title: "Checks before comfort",
    prompt:
      "Generate candidate moves before calculating. One forcing move creates two problems at once.",
    fen: "2q1k3/8/8/5N2/8/8/8/4K3 w - - 0 1",
    playerColor: "w",
    bestMove: "f5d6",
    principalVariation: [
      "f5d6",
      "e8d8",
      "d6c8",
    ],
    explanation:
      "Nd6+ forks the king and queen. After ...Kd8 Nxc8, Black may recapture the knight with the king, reaching bare kings and a draw. The lesson is a tactical saving resource, not a winning material advantage.",
    source: "authored",
    sourceLabel: "Calculation course",
    difficulty: 4,
  },
  {
    id: "calc:quiet-development",
    skillIds: [
      "calculation.quiet",
      "calculation.reply",
      "calculation.visualization",
    ],
    title: "Calculate a quiet improvement",
    prompt:
      "Forcing moves do not decide the position. Generate useful quiet candidates and calculate the opponent's most active reply.",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    playerColor: "w",
    bestMove: "g1f3",
    principalVariation: [
      "g1f3",
      "b8c6",
      "b1c3",
    ],
    explanation:
      "Nf3 develops, pressures e5 and leaves Black free to develop naturally. Calculation still matters when the best move is quiet: you compare resulting positions rather than hunt for tactics that are not there.",
    source: "authored",
    sourceLabel: "Calculation course",
    difficulty: 3,
  },
  {
    id: "calc:move-order",
    skillIds: [
      "calculation.move-order",
      "calculation.reply",
      "calculation.evaluation",
    ],
    title: "Move order before execution",
    prompt:
      "A free pawn is available, but calculate the reply and your next useful move before taking it.",
    fen: "4k3/8/8/8/8/3p4/4Q3/4K3 w - - 0 1",
    playerColor: "w",
    bestMove: "e2d3",
    principalVariation: [
      "e2d3",
      "e8f7",
      "d3d7",
    ],
    explanation:
      "Qxd3 wins the pawn cleanly. After ...Kf7, Qd7+ keeps the queen active with tempo. The point is to calculate beyond the first attractive capture.",
    source: "authored",
    sourceLabel: "Calculation course",
    difficulty: 3,
  },
  {
    id:"calc:rook-cutoff",
    skillIds:["calculation.forcing-lines","calculation.reply","endgames.rook-checks"],
    title:"Cut off the king before chasing",
    prompt:"Calculate a rook infiltration, the king's safest reply and a follow-up check before touching the board.",
    fen:"4k3/8/8/8/8/8/2R5/4K3 w - - 0 1",
    playerColor:"w",bestMove:"c2c8",principalVariation:["c2c8","e8f7","c8c7"],
    explanation:"Rc8+ cuts the black king off on the eighth rank. After ...Kf7, Rc7+ keeps the rook active on the seventh. This demonstrates repeated forcing activity, not a forced mate against a bare king.",
    replyReason:"The king must respond to Rc8+; ...Kf7 leaves the checking rank without approaching the rook.",
    continuationReason:"Rc7+ uses the seventh rank and preserves checking distance.",
    source:"authored",sourceLabel:"Original P90 calculation study",difficulty:3,
  },
  {
    id:"calc:king-tempo",
    skillIds:["calculation.evaluation","calculation.visualization","endgames.opposition"],
    title:"Visualize king opposition",
    prompt:"Calculate the king approach, the opponent's retreat and the exact follow-up king square with the pawn still fixed.",
    fen:"4k3/8/8/8/4K3/4P3/8/8 w - - 0 1",
    playerColor:"w",bestMove:"e4e5",principalVariation:["e4e5","e8d7","e5f6"],
    explanation:"Ke5 improves the attacking king while preserving the e3 pawn. After ...Kd7, Kf6 advances onto a useful square; calculate the defender's reply rather than pushing the pawn reflexively. This line is an instructional continuation, not a tablebase win claim.",
    replyReason:"...Kd7 heads toward the pawn's file instead of retreating passively.",
    continuationReason:"Kf6 improves king activity without sacrificing the supporting pawn.",
    source:"authored",sourceLabel:"Original P90 calculation study",difficulty:4,
  },
  {
    id:"calc:promotion-check",
    skillIds:["calculation.branching","calculation.forcing-lines","endgames.pawn-races"],
    title:"Promotion with tempo",
    prompt:"Calculate the promotion, king reply and a second forcing queen move. Count checks rather than pawn pushes alone.",
    fen:"4k3/1P6/8/8/8/8/8/4K3 w - - 0 1",
    playerColor:"w",bestMove:"b7b8q",principalVariation:["b7b8q","e8f7","b8b7"],
    explanation:"b8=Q+ promotes with check, forcing ...Kf7. Qb7+ keeps the initiative. A promotion sequence needs legal king replies, not merely a race to the last rank.",
    replyReason:"...Kf7 leaves the eighth rank without stepping onto the promoted queen's attack.",
    continuationReason:"Qb7+ is a second check from the seventh rank.",
    source:"authored",sourceLabel:"Original P90 calculation study",difficulty:3,
  },
  {
    id:"calc:simplify-rooks",
    skillIds:["calculation.move-order","calculation.evaluation","conversion.simplify"],
    title:"Calculate what remains after an exchange",
    prompt:"Identify the forcing rook exchange and then choose a purposeful king move in the simplified result.",
    fen:"4k3/8/8/8/2r5/8/2R5/4K3 w - - 0 1",
    playerColor:"w",bestMove:"c2c4",principalVariation:["c2c4","e8f7","e1d2"],
    explanation:"Rxc4 removes the attacking rook. After ...Kf7, Kd2 activates the white king in the bare-king ending. Exchange evaluation includes checking the draw, not claiming a victory from equal trades.",
    replyReason:"...Kf7 is a legal waiting king move once rooks disappear.",
    continuationReason:"Kd2 is legal king activation in a drawn bare-king position.",
    source:"authored",sourceLabel:"Original P90 calculation study",difficulty:4,
  },
  // P63: The former advanced-combination reference was unsound:
  // 1.Re8+ Qxe8 2.Bxh7+? Kxh7 loses the rook and bishop without compensation.
  // Keep it out of scored instruction until a vetted replacement is authored.
  {
    id: "calc:defensive-countercheck",
    skillIds: [
      "tactics.defensive-resources",
      "calculation.branching",
    ],
    title: "Defend with a countercheck",
    prompt:
      "Do not accept a passive defense. Search checks first and calculate whether the attacker can neutralize the forcing resource.",
    fen: "6k1/5ppp/8/8/8/8/4rPPP/3R2K1 w - - 0 1",
    playerColor: "w",
    bestMove: "d1d8",
    principalVariation: [
      "d1d8",
      "e2e8",
      "d8e8",
    ],
    explanation:
      "Rd8+ changes the move order. Black must answer the check, and after ...Re8 Rxe8+ the dangerous rook disappears. Defensive calculation is strongest when it forces the attacker to respond.",
    source: "authored",
    sourceLabel: "Advanced calculation course",
    difficulty: 5,
  }
];

function dueScore(
  state: UserState,
  positionId: string,
  now: Date,
) {
  const history =
    state.calculationHistory?.[
      positionId
    ];
  if (!history) return 3;

  const due =
    new Date(history.nextReviewAt) <=
    now;
  return (
    (due ? 2 : 0) +
    (1 - history.lastQuality) +
    Math.max(
      0,
      1 - history.successes / 3,
    )
  );
}

function personalPositions(
  state: UserState,
): CalculationPosition[] {
  return (state.mistakes ?? [])
    .filter(
      (mistake) =>
        mistake.principalVariation
          .length >= 3 &&
        (mistake.skillIds.some(
          (skillId) =>
            skillId.startsWith(
              "calculation.",
            ),
        ) ||
          mistake.centipawnLoss >=
            120),
    )
    .map((mistake) => ({
      id: `calc:mistake:${mistake.id}`,
      skillIds:
        mistake.skillIds.filter(
          (skillId) =>
            skillId.startsWith(
              "calculation.",
            ),
        ).length > 0
          ? mistake.skillIds.filter(
              (skillId) =>
                skillId.startsWith(
                  "calculation.",
                ),
            )
          : [
              "calculation.candidates",
              "calculation.reply",
            ],
      title: "Calculate your game again",
      prompt:
        "This exact position came from one of your games. Generate candidates without looking at the move you played.",
      fen: mistake.positionFen,
      playerColor:
        mistake.playerColor,
      bestMove: mistake.bestMove,
      principalVariation:
        mistake.principalVariation.slice(
          0,
          5,
        ),
      explanation:
        mistake.explanation,
      source: "personal-game",
      sourceLabel: `Your game · move ${mistake.moveNumber}`,
      difficulty:
        mistake.severity === "blunder"
          ? 5
          : mistake.severity ===
              "mistake"
            ? 4
            : 3,
      gameId: mistake.gameId,
      mistakeId: mistake.id,
      moveNumber:
        mistake.moveNumber,
    }));
}

export function calculationCatalog(
  state: UserState,
) {
  return [
    ...personalPositions(state),
    ...p94Positions,
    ...authoredPositions,
  ];
}

export function calculationPositionFor(
  state: UserState,
  skillId: string,
  now = new Date(),
) {
  const personal =
    personalPositions(state)
      .filter(
        (position) =>
          position.skillIds.includes(
            skillId,
          ),
      )
      .sort(
        (a, b) =>
          dueScore(
            state,
            b.id,
            now,
          ) -
          dueScore(
            state,
            a.id,
            now,
          ),
      );

  if (personal[0]) {
    return personal[0];
  }

  const authored =
    [...p94Positions, ...authoredPositions]
      .filter(
        (position) =>
          position.skillIds.includes(
            skillId,
          ),
      )
      .sort(
        (a, b) =>
          dueScore(
            state,
            b.id,
            now,
          ) -
          dueScore(
            state,
            a.id,
            now,
          ),
      );

  return (
    authored[0] ??
    authoredPositions[0]
  );
}

export function resolveCalculationPosition(
  state: UserState,
  activity: TrainingActivity,
  skill: ChessSkill,
  now = new Date(),
) {
  const catalog =
    calculationCatalog(state);
  const exact =
    activity.calculationPositionId
      ? catalog.find(
          (position) =>
            position.id ===
            activity.calculationPositionId,
        )
      : undefined;

  return (
    exact ??
    calculationPositionFor(
      state,
      skill.id,
      now,
    )
  );
}

// Use the same 3-ply legal-line authority as the interactive calculation runner.
export function calculationCatalogIssues() {
  return [...authoredPositions, ...p94Positions]
    .filter(position => !legalCalculationBranch(position))
    .map(position => `${position.id}: invalid calculation line`);
}

export { authoredPositions };
