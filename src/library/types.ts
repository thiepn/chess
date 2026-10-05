import type { Color } from "chess.js";
import type { BoardArrow, BoardHighlight } from "../learning/types";

export type StudyKind =
  | "position"
  | "game"
  | "opening"
  | "endgame"
  | "tactic"
  | "reference";

export interface StudyTraining {
  enabled: boolean;
  skillId: string;
  targetMove: string;
  targetSan: string;
  attempts: number;
  successes: number;
  streak: number;
  nextReviewAt: string;
  lastAttemptAt?: string;
  lastQuality: number;
}

export interface SavedStudy {
  id: string;
  title: string;
  kind: StudyKind;
  fen: string;
  pgn?: string;
  notes: string;
  tags: string[];
  source: "personal" | "game" | "reference" | "import";
  sourceId?: string;
  orientation: Color;
  arrows: BoardArrow[];
  highlights: BoardHighlight[];
  engine?: {
    evaluationCp: number;
    bestMove: string;
    bestSan: string;
    principalVariation: string[];
    depth: number;
  };
  training?: StudyTraining;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceStudy {
  id: string;
  title: string;
  kind: StudyKind;
  description: string;
  fen?: string;
  pgn?: string;
  tags: string[];
  orientation: Color;
}

export interface WorkspaceMove {
  ply: number;
  moveNumber: number;
  color: Color;
  san: string;
  uci: string;
  beforeFen: string;
  afterFen: string;
}
