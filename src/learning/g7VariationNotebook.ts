import { Chess } from "chess.js";
import {
  beginG6Exploration, g6CurrentFen, g6PositionState,
  MAX_G6_PLIES, type G6Exploration,
} from "./g6ContinuationLab";

export type G7Slot = "A" | "B";

export interface G7VariationNotebook {
  anchorFen: string;
  A: G6Exploration | null;
  B: G6Exploration | null;
}

export interface G7LineFacts {
  moves: readonly string[];
  plies: number;
  positionFen: string;
  turn: "White" | "Black";
  check: boolean;
  status: string;
  whitePieces: number;
  blackPieces: number;
}

export interface G7VariationComparison {
  A: G7LineFacts;
  B: G7LineFacts;
  commonPlies: number;
  firstDifferentPly: number;
}

function verifiedLine(line: G6Exploration, anchorFen: string): boolean {
  if (line.anchorFen !== anchorFen || line.moves.length > MAX_G6_PLIES) return false;
  return g6PositionState(line).description !== "Exploration unavailable";
}

/** The only anchor is the real, source-validated G5/G6 reply board. */
export function g7BeginNotebook(anchorFen: string): G7VariationNotebook | null {
  const line = beginG6Exploration(anchorFen);
  return line ? { anchorFen: line.anchorFen, A: null, B: null } : null;
}

/**
 * Capture a learner's currently legal G6 continuation. No PGN shadow writer,
 * scheduler, grader, engine evaluation, persistence or additional source.
 */
export function g7SaveVariation(
  notebook: G7VariationNotebook,
  slot: G7Slot,
  line: G6Exploration,
): G7VariationNotebook | null {
  if (!verifiedLine(line, notebook.anchorFen) || line.moves.length === 0) return null;
  const other = notebook[slot === "A" ? "B" : "A"];
  // Meaningful comparison needs two different histories, not duplicate labels.
  if (other && other.moves.length === line.moves.length &&
      other.moves.every((item, i) =>
        item.fen === line.moves[i].fen && item.san === line.moves[i].san))
    return null;
  return {
    ...notebook,
    [slot]: {
      anchorFen: notebook.anchorFen,
      moves: line.moves.map(move => ({ ...move })),
    },
  };
}

/** Restore a candidate into the existing G6 exploration, preserving its owner. */
export function g7LoadVariation(
  notebook: G7VariationNotebook,
  slot: G7Slot,
  expectedAnchor: string,
): G6Exploration | null {
  if (notebook.anchorFen !== expectedAnchor) return null;
  const candidate = notebook[slot];
  if (!candidate || !verifiedLine(candidate, expectedAnchor)) return null;
  return {
    anchorFen: expectedAnchor,
    moves: candidate.moves.map(move => ({ ...move })),
  };
}

function facts(line: G6Exploration, anchorFen: string): G7LineFacts | null {
  if (!verifiedLine(line, anchorFen)) return null;
  try {
    const board = new Chess(g6CurrentFen(line));
    let whitePieces = 0;
    let blackPieces = 0;
    for (const rank of board.board()) {
      for (const piece of rank) {
        if (piece?.color === "w") whitePieces++;
        else if (piece?.color === "b") blackPieces++;
      }
    }
    const status = g6PositionState(line);
    return {
      moves: line.moves.map(item => item.san),
      plies: line.moves.length,
      positionFen: board.fen(),
      turn: status.sideToMove,
      check: status.inCheck,
      status: status.description,
      whitePieces,
      blackPieces,
    };
  } catch {
    return null;
  }
}

/**
 * Differences are observable facts only. A longer line, a capture, or fewer
 * pieces on a board is not treated as a chess advantage or a best-move proof.
 */
export function g7CompareVariations(
  notebook: G7VariationNotebook,
): G7VariationComparison | null {
  if (!notebook.A || !notebook.B) return null;
  const A = facts(notebook.A, notebook.anchorFen);
  const B = facts(notebook.B, notebook.anchorFen);
  if (!A || !B) return null;
  let commonPlies = 0;
  while (commonPlies < Math.min(notebook.A.moves.length, notebook.B.moves.length) &&
    notebook.A.moves[commonPlies].fen === notebook.B.moves[commonPlies].fen &&
    notebook.A.moves[commonPlies].san === notebook.B.moves[commonPlies].san) {
    commonPlies++;
  }
  return { A, B, commonPlies, firstDifferentPly: commonPlies + 1 };
}
