import { Chess, type Color } from "chess.js";

const standardStartingFen = new Chess().fen();
import type {
  ImportedGame,
  ImportedGameMove,
  ImportedGameSource,
  TimeControlCategory,
} from "./types";

function rating(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
}

export function classifyTimeControl(value?: string): TimeControlCategory {
  if (!value) return "unknown";
  if (value.includes("/")) return "correspondence";

  const match = value.match(/^(\d+)(?:\+(\d+))?$/);
  if (!match) return "unknown";

  const initial = Number(match[1]);
  const increment = Number(match[2] ?? 0);
  const estimated = initial + increment * 40;

  if (estimated < 180) return "bullet";
  if (estimated < 600) return "blitz";
  if (estimated < 1800) return "rapid";
  return "classical";
}

function stableGameId(pgn: string) {
  let hash = 2166136261;
  const value = pgn.trim().replace(/\s+/g, " ");

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `game-${(hash >>> 0).toString(36)}`;
}

export interface ImportPgnOptions {
  source?: ImportedGameSource;
  externalId?: string;
  externalUrl?: string;
}

export function importPgn(
  pgn: string,
  playerColor: Color,
  importedAt = new Date().toISOString(),
  options: ImportPgnOptions = {},
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
    moveNumber:
      Number(move.before.split(/\s+/)[5]) || Math.floor(index / 2) + 1,
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
  const whiteRating = rating(headers.WhiteElo);
  const blackRating = rating(headers.BlackElo);
  const playerRating = playerColor === "w" ? whiteRating : blackRating;
  const opponentRating = playerColor === "w" ? blackRating : whiteRating;
  const timeControl = headers.TimeControl;
  const eventText = (headers.Event ?? "").toLocaleLowerCase();

  return {
    id: options.externalId
      ? `${options.source ?? "external"}:${options.externalId}`
      : stableGameId(pgn),
    pgn: pgn.trim(),
    source: options.source,
    externalId: options.externalId,
    externalUrl: options.externalUrl,
    importedAt,
    playerColor,
    white: headers.White || "White",
    black: headers.Black || "Black",
    result: headers.Result || "*",
    event: headers.Event,
    site: headers.Site,
    date: headers.Date,
    rated:
      eventText.includes("rated")
        ? true
        : eventText.includes("casual")
          ? false
          : undefined,
    timeControl,
    timeControlCategory: classifyTimeControl(timeControl),
    playerRating,
    opponentRating,
    startingFen,
    moves,
    criticalMomentIds: [],
  };
}

export function playerMoveCount(game: ImportedGame) {
  return game.moves.filter((move) => move.color === game.playerColor).length;
}
