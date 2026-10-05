import type { OpeningDeviation } from "../openings/types";
import type { PersonalMistake } from "./types";

export function mergeReanalyzedMistakes(
  existing: PersonalMistake[],
  refreshed: PersonalMistake[],
  gameId: string,
) {
  const priorById = new Map(
    existing
      .filter((item) => item.gameId === gameId)
      .map((item) => [item.id, item]),
  );

  const merged = refreshed.map((mistake) => {
    const prior = priorById.get(mistake.id);
    return prior
      ? {
          ...mistake,
          attempts: prior.attempts,
          successes: prior.successes,
          lastAttemptAt: prior.lastAttemptAt,
          nextReviewAt: prior.nextReviewAt,
          resolved: prior.resolved,
        }
      : mistake;
  });

  return [
    ...existing.filter((item) => item.gameId !== gameId),
    ...merged,
  ];
}

export function mergeReanalyzedDeviations(
  existing: OpeningDeviation[],
  refreshed: OpeningDeviation[],
  gameId: string,
) {
  const priorById = new Map(
    existing
      .filter((item) => item.gameId === gameId)
      .map((item) => [item.id, item]),
  );

  return [
    ...existing.filter((item) => item.gameId !== gameId),
    ...refreshed.map((deviation) => ({
      ...deviation,
      resolved: priorById.get(deviation.id)?.resolved ?? deviation.resolved,
    })),
  ];
}
