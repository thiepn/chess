import { Chess, type Square } from "chess.js";

export const MAX_G6_PLIES = 12;

export interface G6ExploredMove {
  from: Square;
  to: Square;
  promotion?: string;
  san: string;
  fen: string;
}

export interface G6Exploration {
  anchorFen: string;
  moves: readonly G6ExploredMove[];
}

export interface G6MoveInput {
  from: Square;
  to: Square;
  promotion?: string;
  san: string;
  fen: string;
}

/** No separate move authority: every branch is evaluated with native Chess.js. */
export function beginG6Exploration(authoredReplyFen: string): G6Exploration | null {
  try {
    const board = new Chess(authoredReplyFen);
    if (board.turn() !== "w") return null;
    return { anchorFen: board.fen(), moves: [] };
  } catch {
    return null;
  }
}

export function g6CurrentFen(line: G6Exploration): string {
  return line.moves.at(-1)?.fen ?? line.anchorFen;
}

/**
 * Match the same move and full resulting FEN accepted by the mounted
 * ChessBoard. The local line is unscored and cannot create training evidence.
 */
export function g6ExploreMove(
  line: G6Exploration,
  proposed: G6MoveInput,
): G6Exploration | null {
  if (line.moves.length >= MAX_G6_PLIES) return null;
  try {
    const board = new Chess(g6CurrentFen(line));
    if (board.isGameOver()) return null;
    const played = board.move({
      from: proposed.from,
      to: proposed.to,
      promotion: proposed.promotion || "q",
    });
    if (!played || played.san !== proposed.san || board.fen() !== proposed.fen)
      return null;
    return {
      anchorFen: line.anchorFen,
      moves: [...line.moves, {
        from: played.from,
        to: played.to,
        ...(played.promotion ? { promotion: played.promotion } : {}),
        san: played.san,
        fen: board.fen(),
      }],
    };
  } catch {
    return null;
  }
}

/** Rewind to a position in the same source-anchored temporary branch. */
export function g6Rewind(line: G6Exploration, ply: number): G6Exploration | null {
  if (!Number.isInteger(ply) || ply < 0 || ply > line.moves.length) return null;
  return { anchorFen: line.anchorFen, moves: line.moves.slice(0, ply) };
}

export interface G6PositionState {
  sideToMove: "White" | "Black";
  inCheck: boolean;
  terminal: boolean;
  description: string;
}

export function g6PositionState(line: G6Exploration): G6PositionState {
  const board = new Chess(g6CurrentFen(line));
  const sideToMove = board.turn() === "w" ? "White" : "Black";
  const terminal = board.isGameOver() || line.moves.length >= MAX_G6_PLIES;
  const description = board.isCheckmate()
    ? "Checkmate"
    : board.isStalemate()
      ? "Stalemate"
      : board.isGameOver()
        ? "Game over"
        : line.moves.length >= MAX_G6_PLIES
          ? "Exploration limit reached"
          : board.isCheck()
            ? `${sideToMove} to move — check`
            : `${sideToMove} to move`;
  return { sideToMove, inCheck: board.isCheck(), terminal, description };
}
