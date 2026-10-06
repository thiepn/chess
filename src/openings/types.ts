import type { Color } from "chess.js";

export interface OpeningConcept {
  title: string;
  body: string;
}

export interface OpeningNode {
  id: string;
  parentId?: string;
  name: string;
  eco?: string;
  fen: string;
  ply: number;
  moveFromParent?: string;
  sanFromParent?: string;
  sideToMove: Color;
  purpose?: string;
  concepts: OpeningConcept[];
  plans: string[];
  commonMistakes: string[];
  keySquares: string[];
  children: string[];
  preferredChildId?: string;
  priority: "core" | "common" | "optional";
}

export interface OpeningRepertoire {
  id: string;
  name: string;
  color: Color;
  versus: string;
  summary: string;
  rootNodeId: string;
  nodeIds: string[];
}

export interface OpeningProgress {
  nodeId: string;
  attempts: number;
  successes: number;
  streak: number;
  lastAttemptAt?: string;
  nextReviewAt: string;
  lastQuality: number;
}

export interface OpeningDeviation {
  id: string;
  gameId: string;
  repertoireId: string;
  nodeId: string;
  ply: number;
  expectedMoves: string[];
  playedMove: string;
  occurredAt: string;
  resolved: boolean;
}

export interface GameOpeningIdentity {
  key: string;
  label: string;
  eco?: string;
  repertoireId?: string;
  matchedPlies?: number;
  source: "header" | "repertoire" | "position" | "fallback";
}

export interface OpeningExplorerMove {
  uci: string;
  san: string;
  games?: number;
  white?: number;
  draws?: number;
  black?: number;
  source: "repertoire" | "lichess";
  repertoireNodeId?: string;
}

export interface OpeningExplorerPosition {
  fen: string;
  opening?: {
    eco?: string;
    name?: string;
  };
  moves: OpeningExplorerMove[];
  source: "repertoire" | "lichess";
}
