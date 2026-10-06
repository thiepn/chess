import type { Color } from "chess.js";

export interface ModelGameQuestionOption {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
}

export interface ModelGameCheckpoint {
  id: string;
  ply: number;
  skillId: string;
  title: string;
  prompt: string;
  options: ModelGameQuestionOption[];
  hints: string[];
  explanation: string;
  plan: string;
  turningPoint?: string;
}

export interface ModelGame {
  id: string;
  title: string;
  players: string;
  event: string;
  year: number;
  result: string;
  orientation: Color;
  summary: string;
  whyStudy: string;
  pgn: string;
  tags: string[];
  skillIds: string[];
  repertoireId?: string;
  checkpoints: ModelGameCheckpoint[];
}

export interface ModelGameCheckpointPosition {
  checkpoint: ModelGameCheckpoint;
  beforeFen: string;
  afterFen: string;
  expectedMove: string;
  targetSan: string;
}

export interface ModelGameCheckpointResult {
  checkpointId: string;
  skillId: string;
  questionCorrect: boolean;
  moveSolved: boolean;
  firstTry: boolean;
  revealed: boolean;
  hintsUsed: number;
  wrongMoves: number;
  quality: number;
}

export interface ModelGameProgress {
  gameId: string;
  checkpointAttempts: Record<string, number>;
  checkpointQuality: Record<string, number>;
  completedCheckpointIds: string[];
  completions: number;
  bestScore: number;
  lastScore: number;
  lastCheckpointAt?: string;
  lastCompletedAt?: string;
}
