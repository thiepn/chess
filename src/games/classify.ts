import { Chess, type Square } from "chess.js";
import type {
  EngineMoveReview,
  MistakeSeverity,
  PersonalMistake,
} from "./types";

const pieceValue: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

function severityForLoss(loss: number): MistakeSeverity | null {
  if (loss >= 250) return "blunder";
  if (loss >= 120) return "mistake";
  if (loss >= 70) return "inaccuracy";
  return null;
}

function materialCount(chess: Chess) {
  return chess
    .board()
    .flat()
    .filter(Boolean).length;
}

function onlyKingsAndPawns(chess: Chess) {
  return chess
    .board()
    .flat()
    .filter(Boolean)
    .every((piece) => piece?.type === "k" || piece?.type === "p");
}

function moveCreatesImmediateHang(review: EngineMoveReview) {
  const after = new Chess(review.move.afterFen);
  const movedPiece = after.get(review.move.to as Square);
  if (!movedPiece || movedPiece.type === "k") return false;

  const captures = after.moves({ verbose: true });
  return captures.some(
    (reply) =>
      reply.to === review.move.to &&
      reply.captured === movedPiece.type &&
      pieceValue[movedPiece.type] >= 3,
  );
}

function bestMoveIsForcing(review: EngineMoveReview) {
  const before = new Chess(review.move.beforeFen);
  const encoded = review.before.bestMove;
  if (!encoded || encoded === "(none)") return { check: false, mate: false, capture: false };

  try {
    const move = before.move({
      from: encoded.slice(0, 2),
      to: encoded.slice(2, 4),
      promotion: encoded.slice(4, 5) || "q",
    });

    return {
      check: before.inCheck(),
      mate: before.isCheckmate(),
      capture: Boolean(move.captured),
    };
  } catch {
    return { check: false, mate: false, capture: false };
  }
}

export function classifyReview(review: EngineMoveReview): {
  severity: MistakeSeverity;
  skillIds: string[];
  explanation: string;
} | null {
  const severity = severityForLoss(review.centipawnLoss);
  if (!severity) return null;

  // Avoid filling the bank with tiny differences when the game is already
  // overwhelmingly decided. Catastrophic moves still qualify.
  if (
    Math.abs(review.before.scoreCp) >= 700 &&
    review.centipawnLoss < 220
  ) {
    return null;
  }

  const before = new Chess(review.move.beforeFen);
  const after = new Chess(review.move.afterFen);
  const forcing = bestMoveIsForcing(review);
  const skillIds: string[] = [];

  if (moveCreatesImmediateHang(review)) {
    skillIds.push("fundamentals.hanging", "fundamentals.blunder-check");
  }

  if (review.move.captured) {
    const capturedValue = pieceValue[review.move.captured] ?? 0;
    const movingValue = pieceValue[review.move.piece] ?? 0;
    if (movingValue > capturedValue && review.centipawnLoss >= 120) {
      skillIds.push("fundamentals.values");
    }
  }

  if (forcing.mate) {
    skillIds.push("rules.mate", "calculation.candidates");
  } else if (forcing.check || forcing.capture) {
    skillIds.push("calculation.candidates");
  }

  if (review.ply <= 20 && review.centipawnLoss < 220 && !skillIds.length) {
    skillIds.push("openings.principles");
  }

  if (onlyKingsAndPawns(before)) {
    skillIds.push("endgames.opposition");
  } else if (materialCount(before) <= 10 && review.before.scoreCp > 180) {
    skillIds.push("conversion.simplify");
  }

  if (review.after.scoreCp > 180 && review.centipawnLoss >= 120) {
    skillIds.push("defense.threats");
  }

  if (!skillIds.length) {
    skillIds.push(
      review.centipawnLoss >= 180
        ? "fundamentals.blunder-check"
        : "calculation.candidates",
    );
  }

  const unique = [...new Set(skillIds)].slice(0, 3);
  const primary = unique[0];

  const explanation =
    primary === "fundamentals.hanging"
      ? "Your move left a valuable piece immediately vulnerable. Rebuild the habit of checking opponent captures before committing."
      : primary === "fundamentals.values"
        ? "The move loses material through an unfavorable exchange. Compare what is given up with what is actually won."
        : primary === "rules.mate"
          ? "There was a forcing mating continuation available. Checks deserve priority in candidate-move generation."
          : primary === "openings.principles"
            ? "This early move gave away substantial value before the position required concrete tactics. Review development, center control and king safety."
            : primary === "endgames.opposition"
              ? "This king-and-pawn position depends on precise king geometry. Treat opposition and entry squares as concrete calculation."
              : primary === "conversion.simplify"
                ? "You had a meaningful advantage but allowed unnecessary counterplay. Winning positions often reward simplification and risk reduction."
                : primary === "defense.threats"
                  ? "The position required defensive threat recognition. Before creating your own plan, identify the opponent's strongest forcing idea."
                  : "The main issue was candidate-move selection. Compare checks, captures, threats and the opponent's best reply before choosing.";

  return { severity, skillIds: unique, explanation };
}

export function buildPersonalMistake(
  review: EngineMoveReview,
  now = new Date(),
): PersonalMistake | null {
  const classification = classifyReview(review);
  if (!classification) return null;

  return {
    id: `${review.gameId}:${review.ply}`,
    gameId: review.gameId,
    ply: review.ply,
    moveNumber: review.move.moveNumber,
    playerColor: review.move.color,
    positionFen: review.move.beforeFen,
    actualMove: review.move.uci,
    actualSan: review.move.san,
    bestMove: review.before.bestMove,
    principalVariation: review.before.pv.slice(0, 8),
    evaluationBefore: review.before.scoreCp,
    evaluationAfter: -review.after.scoreCp,
    centipawnLoss: review.centipawnLoss,
    severity: classification.severity,
    skillIds: classification.skillIds,
    explanation: classification.explanation,
    createdAt: now.toISOString(),
    nextReviewAt: now.toISOString(),
    attempts: 0,
    successes: 0,
    resolved: false,
  };
}

export function mistakePriority(mistake: PersonalMistake, now = new Date()) {
  const severity = {
    blunder: 1,
    mistake: .72,
    inaccuracy: .46,
  }[mistake.severity];

  const due = new Date(mistake.nextReviewAt).getTime() <= now.getTime() ? 1 : .2;
  const unresolved = mistake.resolved ? .28 : 1;
  const recurrence = 1 + Math.min(.4, mistake.attempts * .08);

  return severity * due * unresolved * recurrence;
}
