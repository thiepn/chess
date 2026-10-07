import { Chess } from "chess.js";
import type {
  ChessSkill,
  TrainingActivity,
  UserState,
} from "../domain/types";
import type {
  CalculationPosition,
} from "./types";

const authoredPositions: CalculationPosition[] = [
  {
    id: "calc:fork-candidates",
    skillIds: [
      "calculation.candidates",
      "calculation.forcing-lines",
      "calculation.visualization",
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
      "Nd6+ forces the king to respond while the knight also attacks the queen on c8. The calculation stays concrete because every ply has a forcing purpose.",
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
    id: "calc:advanced-combination",
    skillIds: [
      "tactics.combinations",
      "calculation.branching",
      "calculation.evaluation",
    ],
    title: "Calculate through the tactical transformation",
    prompt:
      "Generate more than one forcing candidate, then calculate the branch until the back-rank idea transforms into a second threat.",
    fen: "3q2k1/5ppp/8/8/8/3B4/5PPP/4R1K1 w - - 0 1",
    playerColor: "w",
    bestMove: "e1e8",
    principalVariation: [
      "e1e8",
      "d8e8",
      "d3h7",
    ],
    explanation:
      "Re8+ forces the queen to take on e8. Bxh7+ then carries the initiative into a new tactical geometry. The point is not the first motif; it is tracking how one forcing idea creates the next.",
    source: "authored",
    sourceLabel: "Advanced calculation course",
    difficulty: 5,
  },
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
    authoredPositions
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

export function calculationCatalogIssues() {
  const issues: string[] = [];

  for (const position of authoredPositions) {
    let chess: Chess;
    try {
      chess = new Chess(position.fen);
    } catch {
      issues.push(
        `${position.id}: invalid FEN`,
      );
      continue;
    }

    if (
      position.principalVariation
        .length < 3
    ) {
      issues.push(
        `${position.id}: line shorter than 3 ply`,
      );
    }

    for (
      const [index, encoded] of
      position.principalVariation.entries()
    ) {
      try {
        const move = chess.move({
          from: encoded.slice(0, 2),
          to: encoded.slice(2, 4),
          promotion:
            encoded.slice(4, 5) ||
            "q",
        });
        if (!move) {
          issues.push(
            `${position.id}: illegal PV move ${encoded} at ply ${index + 1}`,
          );
          break;
        }
      } catch {
        issues.push(
          `${position.id}: illegal PV move ${encoded} at ply ${index + 1}`,
        );
        break;
      }
    }

    if (
      position.bestMove !==
      position.principalVariation[0]
    ) {
      issues.push(
        `${position.id}: best move and PV disagree`,
      );
    }
  }

  return issues;
}

export { authoredPositions };
