import type { Color } from "chess.js";

export interface CalculationPosition {
  id: string;
  skillIds: string[];
  title: string;
  prompt: string;
  fen: string;
  playerColor: Color;
  bestMove: string;
  principalVariation: string[];
  explanation: string;
  source: "authored" | "personal-game";
  sourceLabel: string;
  difficulty: number;
  gameId?: string;
  mistakeId?: string;
  moveNumber?: number;
}

export interface CalculationCandidateMove {
  uci: string;
  san: string;
}

export interface CalculationAttemptSummary {
  positionId: string;
  attempts: number;
  successes: number;
  lastAttemptAt: string;
  lastQuality: number;
  lastCandidateScore: number;
  lastReplyScore: number;
  lastContinuationScore: number;
  lastLineDepth: number;
  nextReviewAt: string;
}

export interface CalculationEvidence {
  positionId: string;
  source: CalculationPosition["source"];
  candidateScore: number;
  selectedMoveScore: number;
  replyScore: number;
  continuationScore: number;
  lineDepth: number;
  visualizationUsed: boolean;
}
