import type {
  EngineMoveReview,
  ImportedGame,
  MistakeSeverity,
  PracticalGameMetrics,
  TimeControlCategory,
} from "./types";
import { classifyStrongReview } from "./classify";

const severityWeight: Record<MistakeSeverity, number> = {
  inaccuracy: .35,
  mistake: .7,
  blunder: 1,
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function timeControlWeight(
  category: TimeControlCategory | undefined,
) {
  if (category === "bullet") return .55;
  if (category === "blitz") return .78;
  if (category === "rapid") return .95;
  if (category === "classical") return 1;
  if (category === "correspondence") return .82;
  return .75;
}

export function gameResultScore(game: ImportedGame) {
  const won =
    (game.playerColor === "w" && game.result === "1-0") ||
    (game.playerColor === "b" && game.result === "0-1");
  const draw = game.result === "1/2-1/2";
  return won ? 100 : draw ? 55 : 10;
}

export function buildPracticalGameMetrics(
  game: ImportedGame,
  reviews: EngineMoveReview[],
  mistakes: Array<{
    severity: MistakeSeverity;
    skillIds: string[];
  }>,
): PracticalGameMetrics {
  const averageCentipawnLoss = reviews.length
    ? reviews.reduce((sum, review) => sum + review.centipawnLoss, 0) /
      reviews.length
    : 0;

  const criticalErrorRate = reviews.length
    ? mistakes.length / reviews.length
    : 0;
  const blunderRate = reviews.length
    ? mistakes.filter((mistake) => mistake.severity === "blunder").length /
      reviews.length
    : 0;

  const weightedErrorRate = reviews.length
    ? mistakes.reduce(
        (sum, mistake) => sum + severityWeight[mistake.severity],
        0,
      ) / reviews.length
    : 0;

  const qualityScore = clamp(
    100 -
      averageCentipawnLoss * .42 -
      weightedErrorRate * 95 -
      blunderRate * 65,
  );

  const validationMap = new Map<
    string,
    { occurrences: number; lossTotal: number }
  >();

  for (const review of reviews) {
    for (const skillId of classifyStrongReview(review)) {
      const current = validationMap.get(skillId) ?? {
        occurrences: 0,
        lossTotal: 0,
      };
      current.occurrences += 1;
      current.lossTotal += review.centipawnLoss;
      validationMap.set(skillId, current);
    }
  }

  const skillValidations = [...validationMap.entries()]
    .map(([skillId, item]) => ({
      skillId,
      occurrences: item.occurrences,
      averageCentipawnLoss: Math.round(
        item.lossTotal / Math.max(1, item.occurrences),
      ),
    }))
    .filter((item) => item.occurrences >= 2)
    .sort(
      (a, b) =>
        b.occurrences - a.occurrences ||
        a.averageCentipawnLoss - b.averageCentipawnLoss,
    )
    .slice(0, 5);

  return {
    averageCentipawnLoss: Math.round(averageCentipawnLoss),
    criticalErrorRate: Math.round(criticalErrorRate * 1000) / 10,
    blunderRate: Math.round(blunderRate * 1000) / 10,
    qualityScore: Math.round(qualityScore),
    resultScore: gameResultScore(game),
    skillValidations,
  };
}
