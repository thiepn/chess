import { Chess, type Color } from "chess.js";

const standardStartingFen = new Chess().fen();
import type { ImportedGame, ImportedGameMove } from "./types";

function stableGameId(pgn: string) {
  let hash = 2166136261;
  const value = pgn.trim().replace(/\s+/g, " ");

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `game-${(hash >>> 0).toString(36)}`;
}

export function importPgn(
  pgn: string,
  playerColor: Color,
  importedAt = new Date().toISOString(),
): ImportedGame {
  const chess = new Chess();
  chess.loadPgn(pgn.trim(), { strict: false });

  const headers = chess.getHeaders();
  const history = chess.history({ verbose: true });

  if (!history.length) {
    throw new Error("The PGN does not contain any moves.");
  }

  const moves: ImportedGameMove[] = history.map((move, index) => ({
    ply: index + 1,
    moveNumber: Math.floor(index / 2) + 1,
    color: move.color,
    san: move.san,
    uci: `${move.from}${move.to}${move.promotion ?? ""}`,
    from: move.from,
    to: move.to,
    piece: move.piece,
    captured: move.captured,
    beforeFen: move.before,
    afterFen: move.after,
  }));

  const headerFen = headers.FEN;
  const startingFen =
    headerFen && headerFen !== standardStartingFen ? headerFen : undefined;

  return {
    id: stableGameId(pgn),
    pgn: pgn.trim(),
    importedAt,
    playerColor,
    white: headers.White || "White",
    black: headers.Black || "Black",
    result: headers.Result || "*",
    event: headers.Event,
    site: headers.Site,
    date: headers.Date,
    startingFen,
    moves,
    criticalMomentIds: [],
  };
}

export function playerMoveCount(game: ImportedGame) {
  return game.moves.filter((move) => move.color === game.playerColor).length;
}
