import { Chess } from "chess.js";
import type {
  EngineMoveReview,
  GamePhase,
  GamePhaseSummary,
  GameReviewStory,
  GameStoryMoment,
  ImportedGame,
  PersonalMistake,
} from "./types";
import { classifyReview } from "./classify";

function phaseForReview(review: EngineMoveReview): GamePhase {
  const chess = new Chess(review.move.beforeFen);
  const pieces = chess.board().flat().filter(Boolean);
  const nonPawnNonKing = pieces.filter(
    (piece) => piece?.type !== "p" && piece?.type !== "k",
  ).length;
  const queens = pieces.filter((piece) => piece?.type === "q").length;

  if (nonPawnNonKing <= 4 || (queens === 0 && pieces.length <= 14)) {
    return "endgame";
  }

  const fullMoveNumber =
    Number(review.move.beforeFen.split(/\s+/)[5]) || review.move.moveNumber;

  if (fullMoveNumber <= 10 && pieces.length >= 24) {
    return "opening";
  }

  return "middlegame";
}

function sanFor(fen: string, uci: string) {
  if (!uci || uci === "(none)") return "—";

  try {
    const chess = new Chess(fen);
    return (
      chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4, 5) || "q",
      })?.san ?? uci
    );
  } catch {
    return uci;
  }
}

function phaseHeadline(phase: GamePhase, average: number, critical: number) {
  if (critical === 0 && average <= 35) {
    return phase === "opening"
      ? "A stable start"
      : phase === "middlegame"
        ? "You kept control"
        : "Technically steady";
  }

  if (average >= 140) {
    return phase === "opening"
      ? "The game became difficult early"
      : phase === "middlegame"
        ? "This is where the game swung"
        : "The finish needed more precision";
  }

  return phase === "opening"
    ? "Playable, with one lesson"
    : phase === "middlegame"
      ? "Competitive but uneven"
      : "A learnable ending";
}

function phaseSummaryText(phase: GamePhase, average: number, critical: number) {
  const label =
    phase === "opening"
      ? "opening"
      : phase === "middlegame"
        ? "middlegame"
        : "endgame";

  if (critical === 0) {
    return `Your ${label} contained no high-value mistake worth adding to the training bank.`;
  }

  return `${critical} meaningful ${critical === 1 ? "moment" : "moments"} stood out, with an average loss of ${(average / 100).toFixed(1)} pawns across your analyzed moves in this phase.`;
}

function buildPhaseSummaries(
  reviews: EngineMoveReview[],
  mistakes: PersonalMistake[],
): GamePhaseSummary[] {
  const phases: GamePhase[] = ["opening", "middlegame", "endgame"];

  return phases
    .map((phase) => {
      const phaseReviews = reviews.filter((review) => phaseForReview(review) === phase);
      if (!phaseReviews.length) return null;

      const average =
        phaseReviews.reduce((sum, review) => sum + review.centipawnLoss, 0) /
        phaseReviews.length;
      const phaseMistakes = mistakes.filter((mistake) => {
        const review = reviews.find((item) => item.ply === mistake.ply);
        return review ? phaseForReview(review) === phase : false;
      });

      return {
        phase,
        startPly: Math.min(...phaseReviews.map((review) => review.ply)),
        endPly: Math.max(...phaseReviews.map((review) => review.ply)),
        headline: phaseHeadline(phase, average, phaseMistakes.length),
        summary: phaseSummaryText(phase, average, phaseMistakes.length),
        averageCentipawnLoss: Math.round(average),
        criticalCount: phaseMistakes.length,
      } satisfies GamePhaseSummary;
    })
    .filter((value): value is GamePhaseSummary => Boolean(value));
}

function criticalMoment(
  review: EngineMoveReview,
  mistake: PersonalMistake,
): GameStoryMoment {
  return {
    id: `story:${review.gameId}:${review.ply}`,
    mistakeId: mistake.id,
    ply: review.ply,
    moveNumber: review.move.moveNumber,
    phase: phaseForReview(review),
    kind: "critical",
    severity: mistake.severity,
    positionFen: review.move.beforeFen,
    actualMove: review.move.uci,
    actualSan: review.move.san,
    bestMove: review.before.bestMove,
    bestSan: sanFor(review.move.beforeFen, review.before.bestMove),
    principalVariation: review.before.pv.slice(0, 6),
    evaluationBefore: review.before.scoreCp,
    evaluationAfter: -review.after.scoreCp,
    centipawnLoss: review.centipawnLoss,
    skillIds: mistake.skillIds,
    title:
      mistake.severity === "blunder"
        ? "The game changed here"
        : mistake.severity === "mistake"
          ? "A costly decision"
          : "A useful correction",
    summary: mistake.explanation,
    errorType: mistake.errorType,
    errorReason: mistake.errorReason,
    moveTimeSeconds: mistake.moveTimeSeconds,
  };
}

function positiveMoment(review: EngineMoveReview): GameStoryMoment {
  const classification = classifyReview(review);
  return {
    id: `story:${review.gameId}:${review.ply}:positive`,
    ply: review.ply,
    moveNumber: review.move.moveNumber,
    phase: phaseForReview(review),
    kind: classification ? "turning-point" : "strong",
    positionFen: review.move.beforeFen,
    actualMove: review.move.uci,
    actualSan: review.move.san,
    bestMove: review.before.bestMove,
    bestSan: sanFor(review.move.beforeFen, review.before.bestMove),
    principalVariation: review.before.pv.slice(0, 6),
    evaluationBefore: review.before.scoreCp,
    evaluationAfter: -review.after.scoreCp,
    centipawnLoss: review.centipawnLoss,
    skillIds: [],
    title:
      review.centipawnLoss <= 15
        ? "A strong practical decision"
        : "You stayed close to the position",
    summary:
      review.centipawnLoss <= 15
        ? "Your move stayed very close to the engine's preferred continuation. Keep the thought process that produced it."
        : "This was not a training-bank mistake, but your move preserved most of the position's value.",
    moveTimeSeconds: review.move.moveTimeSeconds,
  };
}

function selectMoments(
  reviews: EngineMoveReview[],
  mistakes: PersonalMistake[],
): GameStoryMoment[] {
  const mistakeByPly = new Map(mistakes.map((mistake) => [mistake.ply, mistake]));
  const critical = reviews
    .filter((review) => mistakeByPly.has(review.ply))
    .sort((a, b) => b.centipawnLoss - a.centipawnLoss)
    .map((review) => criticalMoment(review, mistakeByPly.get(review.ply)!));

  const selected = critical.slice(0, 5);
  if (selected.length >= 3) {
    return selected.sort((a, b) => a.ply - b.ply);
  }

  const used = new Set(selected.map((moment) => moment.ply));
  const phases: GamePhase[] = ["opening", "middlegame", "endgame"];

  for (const phase of phases) {
    if (selected.length >= 3) break;

    const candidate = reviews
      .filter(
        (review) =>
          !used.has(review.ply) &&
          phaseForReview(review) === phase &&
          review.centipawnLoss <= 55,
      )
      .sort((a, b) => a.centipawnLoss - b.centipawnLoss)[0];

    if (candidate) {
      selected.push(positiveMoment(candidate));
      used.add(candidate.ply);
    }
  }

  if (selected.length < 3) {
    for (const review of [...reviews].sort(
      (a, b) => a.centipawnLoss - b.centipawnLoss,
    )) {
      if (selected.length >= 3) break;
      if (used.has(review.ply)) continue;
      selected.push(positiveMoment(review));
      used.add(review.ply);
    }
  }

  return selected.sort((a, b) => a.ply - b.ply).slice(0, 5);
}

export function buildGameReviewStory(
  game: ImportedGame,
  reviews: EngineMoveReview[],
  mistakes: PersonalMistake[],
  generatedAt = new Date(),
): GameReviewStory {
  const totalLoss = reviews.reduce(
    (sum, review) => sum + review.centipawnLoss,
    0,
  );
  const averageLoss = reviews.length ? totalLoss / reviews.length : 0;
  const blunders = mistakes.filter((mistake) => mistake.severity === "blunder").length;
  const costly = mistakes.filter((mistake) => mistake.centipawnLoss >= 120).length;

  const verdict: GameReviewStory["verdict"] =
    blunders >= 2 || averageLoss >= 140
      ? "costly"
      : costly >= 2 || averageLoss >= 85
        ? "uneven"
        : mistakes.length || averageLoss >= 45
          ? "competitive"
          : "clean";

  const headline =
    verdict === "clean"
      ? "A controlled game with few training-worthy errors."
      : verdict === "competitive"
        ? "Mostly sound, with a small number of clear lessons."
        : verdict === "uneven"
          ? "You were competitive, but a few decisions carried too much weight."
          : "A handful of moments decided far more than the rest of the game.";

  const priorityCounts = new Map<string, number>();
  for (const mistake of mistakes) {
    for (const skillId of mistake.skillIds) {
      priorityCounts.set(
        skillId,
        (priorityCounts.get(skillId) ?? 0) +
          (mistake.severity === "blunder" ? 3 : mistake.severity === "mistake" ? 2 : 1),
      );
    }
  }

  const prioritySkillId = [...priorityCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    headline,
    summary:
      mistakes.length === 0
        ? "No move crossed the threshold for the personal mistake bank. The review highlights strong decisions instead of inventing problems."
        : `${mistakes.length} position${mistakes.length === 1 ? "" : "s"} deserved future training. The review below focuses on those moments and the best decisions around them instead of showing every engine fluctuation.`,
    verdict,
    phases: buildPhaseSummaries(reviews, mistakes),
    moments: selectMoments(reviews, mistakes),
    prioritySkillId,
    generatedAt: generatedAt.toISOString(),
  };
}
