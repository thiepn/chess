import { Chess } from "chess.js";
import type { ImportedGame, PersonalMistake } from "../games/types";
import { mistakePriority } from "../games/classify";

const DAY_MS = 86_400_000;
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

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
  /** New records bind attempts to the original position, not only its id. */
  positionFen?: string;
  bestMove?: string;
}

export interface ReviewPracticeCandidate {
  mistake: PersonalMistake;
  score: number;
  due: boolean;
  recentAttempts: number;
  recentSuccesses: number;
  lastQuality: number | null;
  reviewReason: string;
}

export function legalReviewMistake(mistake: PersonalMistake, game: ImportedGame): boolean {
  if (mistake.gameId !== game.id || !Number.isInteger(mistake.ply) || mistake.ply < 1) return false;
  const move = game.moves.find(item => item.ply === mistake.ply);
  if (!move || move.color !== mistake.playerColor ||
      move.beforeFen !== mistake.positionFen ||
      move.uci !== mistake.actualMove || move.san !== mistake.actualSan ||
      game.moves.filter(m => m.ply === mistake.ply).length !== 1) return false;
  try {
    return new Chess(mistake.positionFen).turn() === mistake.playerColor &&
      legalChoice(mistake.positionFen,mistake.bestMove);
  } catch { return false; }
}

function legalChoice(positionFen: string, uci: string): boolean {
  if (typeof uci !== "string" || !UCI.test(uci)) return false;
  try {
    const chess = new Chess(positionFen);
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4),
      promotion: uci.slice(4, 5) || "q" });
    return Boolean(move) && (!move.promotion || uci.endsWith(move.promotion));
  } catch { return false; }
}

/** The recorded grade is derived from the move log, not supplied by a caller. */
export function reviewAttemptQuality(succeeded: boolean, hintsUsed: number, wrongAttempts: number): number {
  if (!succeeded) return 0;
  return Math.max(0.2, Math.round(100 - hintsUsed * 20 - wrongAttempts * 12) / 100);
}

type AttemptInput = Pick<RecordedReviewAttempt,
  "playedMove" | "triedMoves" | "succeeded" | "quality" | "hintsUsed" | "wrongAttempts">;

function validateAttempt(mistake: PersonalMistake, input: AttemptInput): boolean {
  if (typeof input.succeeded !== "boolean" ||
      !Array.isArray(input.triedMoves) || input.triedMoves.length > 40 ||
      input.triedMoves.some(m => !legalChoice(mistake.positionFen, m))) return false;
  if (input.playedMove !== null && !legalChoice(mistake.positionFen, input.playedMove)) return false;
  if (input.playedMove !== (input.triedMoves.at(-1) ?? null)) return false;
  if (!Number.isInteger(input.hintsUsed) || input.hintsUsed < 0 || input.hintsUsed > 1 ||
      !Number.isInteger(input.wrongAttempts) || input.wrongAttempts < 0 ||
      input.wrongAttempts > 40 || !Number.isFinite(input.quality) ||
      input.quality < 0 || input.quality > 1) return false;
  if (input.wrongAttempts !== input.triedMoves.filter(m => m !== mistake.bestMove).length) return false;
  const goodMoves = input.triedMoves.filter(m => m === mistake.bestMove);
  return input.succeeded
    ? input.playedMove === mistake.bestMove && goodMoves.length === 1
    : goodMoves.length === 0;
}

/** Reject foreign, stale, fabricated or internally inconsistent stored attempts. */
export function verifiedReviewAttempts(
  mistake: PersonalMistake,
  history: readonly RecordedReviewAttempt[],
  now: Date,
): RecordedReviewAttempt[] {
  const time = now.getTime();
  if (!Number.isFinite(time)) return [];
  return history.filter(a => {
    if (a.mistakeId !== mistake.id || a.gameId !== mistake.gameId ||
        a.ply !== mistake.ply || (a.positionFen && a.positionFen !== mistake.positionFen) ||
        (a.bestMove && a.bestMove !== mistake.bestMove) ||
        !a.id || !Number.isFinite(Date.parse(a.occurredAt)) ||
        Date.parse(a.occurredAt) > time) return false;
    return validateAttempt(mistake, a);
  }).sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) ||
    a.id.localeCompare(b.id));
}

export function reviewPracticeQueue(
  games: readonly ImportedGame[],
  mistakes: readonly PersonalMistake[],
  history: readonly RecordedReviewAttempt[] = [],
  now = new Date(),
): ReviewPracticeCandidate[] {
  const gameById = new Map(games.map((g) => [g.id, g]));
  if (!Number.isFinite(now.getTime())) return [];
  const unique = new Set<string>();
  return mistakes.flatMap((mistake) => {
    const game = gameById.get(mistake.gameId);
    if (unique.has(mistake.id) || !game || !legalReviewMistake(mistake, game)) return [];
    unique.add(mistake.id);
    const past = verifiedReviewAttempts(mistake, history, now).slice(-10);
    const successes = past.filter(a => a.succeeded).length;
    const dueAt = Date.parse(mistake.nextReviewAt);
    const due = !Number.isFinite(dueAt) || dueAt <= now.getTime();
    const failures = past.length - successes;
    const last = past.at(-1);
    const base = mistakePriority(mistake, now);
    const score = base * (1 + Math.min(0.65, failures * 0.16)) +
      (due ? 0.2 : 0) + (mistake.resolved ? 0 : 0.1);
    const reviewReason = !last ? "First practice"
      : !last.succeeded ? "Missed · retry soon"
      : last.hintsUsed || last.wrongAttempts ? "Retry unaided"
      : "Check independent recall";
    return [{mistake, score, due, recentAttempts:past.length,
      recentSuccesses:successes,
      lastQuality:last ? reviewAttemptQuality(last.succeeded, last.hintsUsed, last.wrongAttempts) : null,
      reviewReason}];
  }).sort((a,b) => b.score-a.score || a.mistake.id.localeCompare(b.mistake.id));
}

/** Append a canonical, bounded record only after independently validating the input. */
export function recordReviewAttempt(
  history: readonly RecordedReviewAttempt[],
  mistake: PersonalMistake,
  game: ImportedGame,
  input: AttemptInput,
  now: Date,
): RecordedReviewAttempt[] {
  if (!legalReviewMistake(mistake,game) || !Number.isFinite(now.getTime()) ||
      !validateAttempt(mistake,input)) return [...history];
  const at = now.toISOString();
  return [...history, {
    id: `${mistake.id}:${at}:${history.length}`,
    mistakeId:mistake.id,gameId:game.id,ply:mistake.ply,
    positionFen:mistake.positionFen,bestMove:mistake.bestMove,
    playedMove:input.playedMove,triedMoves:[...input.triedMoves],
    succeeded:input.succeeded,
    quality:reviewAttemptQuality(input.succeeded,input.hintsUsed,input.wrongAttempts),
    hintsUsed:input.hintsUsed,wrongAttempts:input.wrongAttempts,occurredAt:at,
  }].slice(-200);
}

/** Assisted completions never increase the independent recall streak. */
export function scheduleVerifiedReview(
  mistake: PersonalMistake,
  attempts: readonly RecordedReviewAttempt[],
  now: Date,
): PersonalMistake {
  const past = verifiedReviewAttempts(mistake, attempts, now);
  const latest = past.at(-1);
  if (!latest) return mistake;
  let cleanStreak = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    const item = past[i];
    if (!item.succeeded || item.hintsUsed || item.wrongAttempts) break;
    cleanStreak++;
  }
  const clean = cleanStreak > 0;
  const days = !latest.succeeded ? 0.25 : !clean ? 0.5 :
    [1,3,7,14,30][Math.min(cleanStreak,5)-1];
  return {...mistake,
    attempts:Math.max(mistake.attempts + 1,past.length),
    successes:mistake.successes + (latest.succeeded ? 1 : 0),
    lastAttemptAt:latest.occurredAt,
    resolved:cleanStreak >= 2,
    nextReviewAt:new Date(now.getTime() + days * DAY_MS).toISOString(),
  };
}
