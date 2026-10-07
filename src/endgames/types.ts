import type { Color } from "chess.js";

export type EndgameObjectiveType =
  | "convert"
  | "hold";

export type EndgameTechniqueId =
  | "queen-box"
  | "rook-box"
  | "opposition"
  | "key-squares"
  | "pawn-race"
  | "passed-pawn"
  | "rook-activity"
  | "lucena"
  | "philidor"
  | "simplify"
  | "active-defense"
  | "checking-distance"
  | "opposite-bishop-blockade"
  | "minor-piece-activity"
  | "two-weaknesses";

export interface EndgameRecognitionOption {
  id: string;
  label: string;
  explanation: string;
}

export interface EndgamePosition {
  id: string;
  skillId: string;
  title: string;
  subtitle: string;
  fen: string;
  playerColor: Color;
  objectiveType: EndgameObjectiveType;
  objective: string;
  successOutcomes: Array<"win" | "draw">;
  maxPlies: number;
  survivalPlies?: number;
  difficulty: number;
  techniqueId: EndgameTechniqueId;
  recognitionPrompt: string;
  recognitionOptions: EndgameRecognitionOption[];
  recognitionAnswer: string;
  processCues: string[];
  successNote: string;
  failureNote: string;
}

export interface EndgameEvidence {
  positionId: string;
  techniqueId: EndgameTechniqueId;
  objectiveType: EndgameObjectiveType;
  recognitionCorrect: boolean;
  executionSuccess: boolean;
  outcome:
    | "win"
    | "draw"
    | "loss"
    | "resigned"
    | "survived"
    | "limit";
  plies: number;
  hintsUsed: number;
  delayedRetention: boolean;
}

export interface EndgameAttemptSummary {
  positionId: string;
  attempts: number;
  successes: number;
  recognitionAttempts: number;
  recognitionCorrects: number;
  conversionAttempts: number;
  conversionSuccesses: number;
  defenseAttempts: number;
  defenseHolds: number;
  lastAttemptAt: string;
  lastSuccessAt?: string;
  lastQuality: number;
  lastPlies: number;
  nextReviewAt: string;
}
