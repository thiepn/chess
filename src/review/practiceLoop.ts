import { Chess } from "chess.js";
import type { ImportedGame, PersonalMistake } from "../games/types";
import { mistakePriority } from "../games/classify";

export interface RecordedReviewAttempt {
  id: string;
  mistakeId: string;
  gameId: string;
  ply: number;
  playedMove: string | null;
  triedMoves: string[];
  succeeded: boolean;
  quality: number;
  hintsUsed: number;
  wrongAttempts: number;
  occurredAt: string;
}

export interface ReviewPracticeCandidate {
  mistake: PersonalMistake;
  score: number;
  due: boolean;
  recentAttempts: number;
  recentSuccesses: number;
  lastQuality: number | null;
}

export function legalReviewMistake(mistake: PersonalMistake, game: ImportedGame): boolean {
  if (mistake.gameId !== game.id || !Number.isInteger(mistake.ply) || mistake.ply < 1) return false;
  const move = game.moves.find((item) => item.ply === mistake.ply);
  if (!move || move.color !== mistake.playerColor ||
      move.beforeFen !== mistake.positionFen ||
      move.uci !== mistake.actualMove ||
      move.san !== mistake.actualSan) return false;
  try {
    const chess = new Chess(mistake.positionFen);
    if (chess.turn() !== mistake.playerColor) return false;
    const best = mistake.bestMove;
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best)) return false;
    const played = chess.move({
      from: best.slice(0, 2), to: best.slice(2, 4),
      promotion: best.slice(4, 5) || "q",
    });
    return Boolean(played) && (!played.promotion || best.endsWith(played.promotion)) &&
      game.moves.filter((m) => m.ply === mistake.ply).length === 1;
  } catch { return false; }
}

export function reviewPracticeQueue(
  games: readonly ImportedGame[],
  mistakes: readonly PersonalMistake[],
  history: readonly RecordedReviewAttempt[] = [],
  now = new Date(),
): ReviewPracticeCandidate[] {
  const gameById = new Map(games.map((g) => [g.id, g]));
  const timestamp = now.getTime();
  if (!Number.isFinite(timestamp)) return [];
  const unique = new Set<string>();
  return mistakes.flatMap((mistake) => {
    const game = gameById.get(mistake.gameId);
    if (unique.has(mistake.id) || !game || !legalReviewMistake(mistake, game)) return [];
    unique.add(mistake.id);
    const past = history
      .filter((a) => a.mistakeId === mistake.id && a.gameId === game.id &&
        a.ply === mistake.ply && Number.isFinite(Date.parse(a.occurredAt)) &&
        Date.parse(a.occurredAt) <= timestamp)
      .slice(-10);
    const successes = past.filter((a) => a.succeeded).length;
    const dueAt = Date.parse(mistake.nextReviewAt);
    const due = !Number.isFinite(dueAt) || dueAt <= timestamp;
    const failures = past.length - successes;
    const base = mistakePriority(mistake, now);
    const score = base * (1 + Math.min(0.65, failures * 0.16)) +
      (due ? 0.2 : 0) + (mistake.resolved ? 0 : 0.1);
    return [{
      mistake, score, due, recentAttempts: past.length, recentSuccesses: successes,
      lastQuality: past.length ? past[past.length - 1].quality : null,
    }];
  }).sort((a, b) => b.score - a.score || a.mistake.id.localeCompare(b.mistake.id));
}

/** Attempt records are appended only for existing source-verified game positions. */
export function recordReviewAttempt(
  history: readonly RecordedReviewAttempt[],
  mistake: PersonalMistake,
  game: ImportedGame,
  input: {
    playedMove: string | null;
    triedMoves: string[];
    succeeded: boolean;
    quality: number;
    hintsUsed: number;
    wrongAttempts: number;
  },
  now: Date,
): RecordedReviewAttempt[] {
  if (!legalReviewMistake(mistake, game)) return [...history];
  const at = now.toISOString();
  const isUci = (s: string) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(s);
  const chess = new Chess(mistake.positionFen);
  const isLegal = (s: string) => {
    if (!isUci(s)) return false;
    try {
      const clone = new Chess(chess.fen());
      return Boolean(clone.move({ from:s.slice(0,2), to:s.slice(2,4), promotion:s.slice(4,5) || "q" }));
    } catch { return false; }
  };
  if (input.playedMove !== null && !isLegal(input.playedMove)) return [...history];
  if (!Array.isArray(input.triedMoves) || input.triedMoves.length > 40 ||
      input.triedMoves.some(s => typeof s !== "string" || !isLegal(s))) return [...history];
  const success = input.succeeded && input.playedMove === mistake.bestMove;
  if (input.succeeded && !success) return [...history];
  if (![input.quality, input.hintsUsed, input.wrongAttempts].every(Number.isFinite) ||
      input.quality < 0 || input.quality > 1 ||
      input.hintsUsed < 0 || input.hintsUsed > 40 ||
      input.wrongAttempts < 0 || input.wrongAttempts > 40 ||
      !Number.isInteger(input.hintsUsed) || !Number.isInteger(input.wrongAttempts)) return [...history];
  const id = `${mistake.id}:${at}:${history.length}`;
  return [...history, {
    id, mistakeId: mistake.id, gameId: game.id, ply: mistake.ply,
    playedMove: input.playedMove, triedMoves: [...input.triedMoves],
    succeeded: success, quality: input.quality, hintsUsed: input.hintsUsed,
    wrongAttempts: input.wrongAttempts, occurredAt: at,
  }].slice(-200);
}
