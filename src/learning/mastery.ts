import type {
  LessonMasterySummary,
  LessonStepResult,
} from "./types";

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function resultQuality(result: LessonStepResult) {
  if (!result.correct) return 0;

  const supportPenalty =
    result.support === "guided"
      ? 0
      : result.firstTry
        ? 0
        : .08;
  return clamp(
    1 -
      result.hintsUsed * .12 -
      result.wrongAttempts * .14 -
      supportPenalty,
    .18,
    1,
  );
}

const supportWeight = {
  guided: .2,
  retrieval: .32,
  transfer: .48,
} as const;

export function summarizeLessonMastery(
  results: LessonStepResult[],
): LessonMasterySummary {
  const assessedSteps = results.length;
  const independent = results.filter(
    (result) => result.support !== "guided",
  );
  const transfer = results.filter(
    (result) => result.support === "transfer",
  );
  const totalWeight = results.reduce(
    (sum, result) =>
      sum + supportWeight[result.support],
    0,
  );
  const masteryQuality =
    totalWeight > 0
      ? results.reduce(
          (sum, result) =>
            sum +
            resultQuality(result) *
              supportWeight[result.support],
          0,
        ) / totalWeight
      : 0;

  const independentFirstTry = independent.filter(
    (result) =>
      result.correct &&
      result.firstTry &&
      result.hintsUsed === 0,
  ).length;
  const transferFirstTry = transfer.filter(
    (result) =>
      result.correct &&
      result.firstTry &&
      result.hintsUsed === 0,
  ).length;

  return {
    completed: assessedSteps > 0,
    assessedSteps,
    independentSteps: independent.length,
    firstTryCorrect: independentFirstTry,
    transferSteps: transfer.length,
    transferFirstTryCorrect: transferFirstTry,
    masteryQuality:
      Math.round(masteryQuality * 1000) / 1000,
    masteryPassed:
      independent.length >= 2 &&
      transfer.length >= 1 &&
      masteryQuality >= .62,
  };
}
