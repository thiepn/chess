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
  /** Authored study lines are legal examples, not engine-certified scoring references. */
  assessmentStatus?: "instructional-only";
  /** Source-authored, *unscored* position defense — no evaluation authority. */
  openingTransitionStudy?: {
    nodeId: string;
    repertoireId: string;
    theme: string;
    structure: string;
    breakPlan: string;
    counterplan: string;
    prevention: string;
    tradeDecision: string;
    transferQuestion: string;
    provenance: string;
    exercises: { prompt: string; answer: string; repair: string }[];
  };
  prophylaxisStudy?: {
    theme: string;
    focus: string;
    threat: string;
    prevention: string;
    counterplay: string;
    misconception: string;
    situationalDetail: string;
    transferQuestion: string;
    assessmentNote: string;
    exercises: { prompt: string; answer: string; repair: string }[];
  };
  strategicImbalanceStudy?: {
    theme: string;
    focus: string;
    positionIssue: string;
    planContrast: string;
    defenderPlan: string;
    misconception: string;
    transferQuestion: string;
    context: string;
    modelLine: string;
    alternativeLine: string;
    exercises: { prompt: string; answer: string; repair: string }[];
  };
  /** Optional learner-facing defensive alternatives, all source-lines legally replayed. */
  defensiveStudy?: {
    keyQuestion: string;
    defenderIdea: string;
    continuation: string;
    misconception: string;
    reflection: string;
    variations: { label: string; moves: string[]; explanation: string }[];
  };
  /** Explanations of the legal authored reply and the next move; never engine-unique claims. */
  replyReason?: string;
  continuationReason?: string;
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
