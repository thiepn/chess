import { sameUciMove } from "../learning/uci";
import type {
  CalculationCandidateMove,
  CalculationEvidence,
} from "./types";

export interface CalculationScoreInput {
  positionId: string;
  source: "authored" | "personal-game";
  candidates: CalculationCandidateMove[];
  selectedMove: string;
  bestMove: string;
  predictedReply?: string;
  bestReply?: string;
  predictedContinuation?: string;
  bestContinuation?: string;
  visualizationUsed: boolean;
}

export interface CalculationScore {
  success: boolean;
  quality: number;
  wrongAttempts: number;
  evidence: CalculationEvidence;
}

export function scoreCalculationAttempt(
  input: CalculationScoreInput,
): CalculationScore {
  const generatedBest =
    input.candidates.some((candidate) =>
      sameUciMove(
        candidate.uci,
        input.bestMove,
      ),
    );
  const candidateScore = generatedBest
    ? 1
    : input.candidates.length >= 2
      ? .35
      : .15;
  const selectedMoveScore = sameUciMove(
    input.selectedMove,
    input.bestMove,
  )
    ? 1
    : 0;
  const replyScore = sameUciMove(
    input.predictedReply,
    input.bestReply,
  )
    ? 1
    : 0;
  const continuationScore = sameUciMove(
    input.predictedContinuation,
    input.bestContinuation,
  )
    ? 1
    : 0;

  let lineDepth = 0;
  if (selectedMoveScore) {
    lineDepth = 1;
    if (replyScore) {
      lineDepth = 2;
      if (continuationScore) {
        lineDepth = 3;
      }
    }
  }

  const quality =
    candidateScore * .25 +
    selectedMoveScore * .3 +
    replyScore * .2 +
    continuationScore * .25;

  return {
    success:
      selectedMoveScore === 1 &&
      lineDepth >= 2 &&
      quality >= .65,
    quality:
      Math.round(quality * 1000) /
      1000,
    wrongAttempts:
      (selectedMoveScore ? 0 : 1) +
      (replyScore ? 0 : 1) +
      (continuationScore ? 0 : 1),
    evidence: {
      positionId: input.positionId,
      source: input.source,
      candidateScore,
      selectedMoveScore,
      replyScore,
      continuationScore,
      lineDepth,
      visualizationUsed:
        input.visualizationUsed,
    },
  };
}
