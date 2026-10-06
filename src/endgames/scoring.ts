import type {
  EndgameEvidence,
  EndgamePosition,
} from "./types";

export interface EndgameScoreInput {
  position: EndgamePosition;
  recognitionCorrect: boolean;
  executionSuccess: boolean;
  outcome: EndgameEvidence["outcome"];
  plies: number;
  hintsUsed: number;
  delayedRetention: boolean;
}

export function scoreEndgameAttempt(
  input: EndgameScoreInput,
) {
  const recognitionScore =
    input.recognitionCorrect ? 1 : 0;
  const executionScore =
    input.executionSuccess ? 1 : 0;
  const efficiency =
    input.executionSuccess
      ? Math.max(
          .35,
          1 -
            Math.max(
              0,
              input.plies -
                input.position.maxPlies * .45,
            ) /
              Math.max(
                1,
                input.position.maxPlies,
              ),
        )
      : 0;
  const hintPenalty = Math.min(
    .24,
    input.hintsUsed * .08,
  );
  const quality = Math.max(
    0,
    Math.min(
      1,
      recognitionScore * .22 +
        executionScore * .68 +
        efficiency * .1 -
        hintPenalty,
    ),
  );

  return {
    success: input.executionSuccess,
    quality:
      Math.round(quality * 1000) /
      1000,
    evidence: {
      positionId: input.position.id,
      techniqueId:
        input.position.techniqueId,
      objectiveType:
        input.position.objectiveType,
      recognitionCorrect:
        input.recognitionCorrect,
      executionSuccess:
        input.executionSuccess,
      outcome: input.outcome,
      plies: input.plies,
      hintsUsed: input.hintsUsed,
      delayedRetention:
        input.delayedRetention,
    } satisfies EndgameEvidence,
  };
}
