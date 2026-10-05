import { Chess, type Color } from "chess.js";
import type { WorkspaceMove } from "./types";

export const standardFen = new Chess().fen();

export interface WorkspaceLine {
  baseFen: string;
  moves: WorkspaceMove[];
  orientation: Color;
}

export function loadFenLine(fen: string, orientation?: Color): WorkspaceLine {
  const chess = new Chess(fen.trim());
  return {
    baseFen: chess.fen(),
    moves: [],
    orientation: orientation ?? chess.turn(),
  };
}

export function loadPgnLine(
  pgn: string,
  orientation: Color = "w",
): WorkspaceLine {
  const chess = new Chess();
  chess.loadPgn(pgn.trim(), { strict: false });
  const history = chess.history({ verbose: true });
  if (!history.length) throw new Error("The PGN does not contain any moves.");

  return {
    baseFen: history[0].before,
    orientation,
    moves: history.map((move, index) => ({
      ply: index + 1,
      moveNumber:
        Number(move.before.split(/\s+/)[5]) || Math.floor(index / 2) + 1,
      color: move.color,
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion ?? ""}`,
      beforeFen: move.before,
      afterFen: move.after,
    })),
  };
}

export function fenAtCursor(line: WorkspaceLine, cursor: number) {
  if (cursor <= 0) return line.baseFen;
  return line.moves[Math.min(cursor, line.moves.length) - 1]?.afterFen ?? line.baseFen;
}

export function appendWorkspaceMove(
  line: WorkspaceLine,
  cursor: number,
  from: string,
  to: string,
  promotion = "q",
): WorkspaceLine {
  const baseMoves = line.moves.slice(0, cursor);
  const fen = fenAtCursor({ ...line, moves: baseMoves }, baseMoves.length);
  const chess = new Chess(fen);
  const move = chess.move({ from, to, promotion });
  if (!move) throw new Error("Illegal move.");

  return {
    ...line,
    moves: [
      ...baseMoves,
      {
        ply: baseMoves.length + 1,
        moveNumber:
          Number(move.before.split(/\s+/)[5]) ||
          Math.floor(baseMoves.length / 2) + 1,
        color: move.color,
        san: move.san,
        uci: `${move.from}${move.to}${move.promotion ?? ""}`,
        beforeFen: move.before,
        afterFen: chess.fen(),
      },
    ],
  };
}

export function lineToPgn(line: WorkspaceLine) {
  const chess = new Chess(line.baseFen);
  if (line.baseFen !== standardFen) {
    chess.setHeader("SetUp", "1");
    chess.setHeader("FEN", line.baseFen);
  }

  for (const move of line.moves) {
    chess.move({
      from: move.uci.slice(0, 2),
      to: move.uci.slice(2, 4),
      promotion: move.uci.slice(4, 5) || "q",
    });
  }

  return chess.pgn({ maxWidth: 80, newline: "\n" });
}

export function pvToSan(fen: string, pv: string[]) {
  const chess = new Chess(fen);
  const sans: string[] = [];

  for (const uci of pv) {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4, 5) || "q",
      });
      if (!move) break;
      sans.push(move.san);
    } catch {
      break;
    }
  }

  return sans;
}
