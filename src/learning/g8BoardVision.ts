import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import type { BoardArrow, BoardHighlight } from "./types";

export interface G8Attacker {
  square: Square;
  color: Color;
  piece: PieceSymbol;
}
export interface G8LegalMove {
  to: Square;
  san: string;
  promotion?: string;
}
export interface G8SquareFacts {
  square: Square;
  occupant: { color: Color; piece: PieceSymbol } | null;
  sideToMove: Color;
  whiteAttackers: readonly G8Attacker[];
  blackAttackers: readonly G8Attacker[];
  legalMoves: readonly G8LegalMove[];
  arrows: readonly BoardArrow[];
  highlights: readonly BoardHighlight[];
}
export interface G8AttackedPiece {
  square: Square;
  color: Color;
  piece: PieceSymbol;
  attackers: number;
  defenders: number;
}
export interface G8BoardVision {
  sideToMove: Color;
  attackedWhite: readonly G8AttackedPiece[];
  attackedBlack: readonly G8AttackedPiece[];
}

const SQUARE = /^[a-h][1-8]$/;
const FILES = "abcdefgh";
const RANKS = "87654321";
const BOARD_SQUARES: readonly Square[] =
  [...RANKS].flatMap(rank => [...FILES].map(file => `${file}${rank}` as Square));

function getAttackers(chess: Chess, square: Square, color: Color): G8Attacker[] {
  return chess.attackers(square, color).map(origin => {
    const piece = chess.get(origin);
    if (!piece || piece.color !== color)
      throw Error("Inconsistent Chess.js attacker");
    return { square: origin, piece: piece.type, color };
  });
}

/**
 * Native Chess.js square geometry. Attacks include pinned pieces and attacks
 * on friendly pieces; they are NOT necessarily legal captures. Legal moves
 * are provided only for a piece on the actual side to move.
 */
export function g8InspectSquare(fen: string, square: Square): G8SquareFacts | null {
  if (!SQUARE.test(square)) return null;
  try {
    const board = new Chess(fen);
    const occupant = board.get(square);
    const whiteAttackers = getAttackers(board, square, "w");
    const blackAttackers = getAttackers(board, square, "b");
    const legalMoves = occupant && occupant.color === board.turn()
      ? board.moves({ square, verbose: true }).map(move => ({
        to: move.to,
        san: move.san,
        ...(move.promotion ? { promotion: move.promotion } : {}),
      })) : [];
    return {
      square,
      occupant: occupant ? { color: occupant.color, piece: occupant.type } : null,
      sideToMove: board.turn(),
      whiteAttackers,
      blackAttackers,
      legalMoves,
      arrows: [
        ...whiteAttackers.map(piece => ({
          from: piece.square, to: square, tone: "good" as const,
        })),
        ...blackAttackers.map(piece => ({
          from: piece.square, to: square, tone: "danger" as const,
        })),
      ],
      highlights: [
        { square, tone: "focus" },
        ...whiteAttackers.map(piece => ({ square: piece.square, tone: "good" as const })),
        ...blackAttackers.map(piece => ({ square: piece.square, tone: "danger" as const })),
      ],
    };
  } catch {
    return null;
  }
}

/** Show attacked *occupied* pieces, not invented rankings or loss claims. */
export function g8BoardVision(fen: string): G8BoardVision | null {
  try {
    const board = new Chess(fen);
    const attackedWhite: G8AttackedPiece[] = [];
    const attackedBlack: G8AttackedPiece[] = [];
    for (const square of BOARD_SQUARES) {
      const occupant = board.get(square);
      if (!occupant) continue;
      const enemy: Color = occupant.color === "w" ? "b" : "w";
      const attackers = board.attackers(square, enemy).length;
      if (!attackers) continue;
      const defenders = board.attackers(square, occupant.color).length;
      (occupant.color === "w" ? attackedWhite : attackedBlack).push({
        square, color: occupant.color, piece: occupant.type, attackers, defenders,
      });
    }
    return { sideToMove: board.turn(), attackedWhite, attackedBlack };
  } catch {
    return null;
  }
}
