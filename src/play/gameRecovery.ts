import { Chess, type Color } from "chess.js";
import type { PlayResult, TimeControlId } from "./types";

export interface RunningClock {
  whiteMs: number;
  blackMs: number;
  active: Color;
  updatedAt: number;
}

export interface CompletedGame {
  outcome: PlayResult["outcome"];
  reason: PlayResult["reason"];
  completedAt: string;
  reviewSent: boolean;
}

export interface GameCheckpoint {
  version: 1;
  initialFen: string;
  moves: string[]; // Exact legal UCI moves; replay reconstructs repetition history.
  clock: RunningClock;
  finished?: CompletedGame;
  /** Intentional save-and-exit freezes the clock until the next resume. */
  suspended?: true;
}

export function initialClock(timeControl: TimeControlId, active: Color, now: number): RunningClock {
  const time = timeControl === "10+0" ? 600_000 : timeControl === "15+10" ? 900_000 : 0;
  return { whiteMs: time, blackMs: time, active, updatedAt: now };
}

export function advanceClock(clock: RunningClock, now: number, timed: boolean): RunningClock {
  if (!timed) return { ...clock, updatedAt: now };
  const elapsed = Math.max(0, Math.floor(now - clock.updatedAt));
  return {
    ...clock,
    whiteMs: clock.active === "w" ? Math.max(0, clock.whiteMs - elapsed) : clock.whiteMs,
    blackMs: clock.active === "b" ? Math.max(0, clock.blackMs - elapsed) : clock.blackMs,
    updatedAt: now,
  };
}

export function completeMoveClock(
  clock: RunningClock, mover: Color, timeControl: TimeControlId, now: number,
): RunningClock | null {
  const current = advanceClock(clock, now, timeControl !== "untimed");
  const remaining = mover === "w" ? current.whiteMs : current.blackMs;
  if (timeControl !== "untimed" && remaining <= 0) return null;
  const increment = timeControl === "15+10" ? 10_000 : 0;
  return {
    ...current,
    whiteMs: mover === "w" ? current.whiteMs + increment : current.whiteMs,
    blackMs: mover === "b" ? current.blackMs + increment : current.blackMs,
    active: mover === "w" ? "b" : "w",
  };
}

export function makeCheckpoint(
  chess: Chess, initialFen: string, clock: RunningClock, finished?: CompletedGame,
  suspended = false,
): GameCheckpoint {
  return {
    version: 1,
    initialFen,
    moves: chess.history({ verbose: true }).map((move) => move.from + move.to + (move.promotion ?? "")),
    clock,
    ...(finished ? { finished } : {}),
    ...(suspended && !finished ? { suspended: true as const } : {}),
  };
}

export function restoreCheckpoint(
  initialFen: string, checkpoint: GameCheckpoint | undefined,
  timeControl: TimeControlId, now: number,
): { chess: Chess; clock: RunningClock; finished?: CompletedGame } {
  const chess = new Chess(initialFen);
  if (!checkpoint) return { chess, clock: initialClock(timeControl, chess.turn(), now) };
  if (checkpoint.version !== 1 || checkpoint.initialFen !== initialFen ||
      !Array.isArray(checkpoint.moves) || checkpoint.moves.length > 700 ||
      (checkpoint.suspended !== undefined && checkpoint.suspended !== true) ||
      (checkpoint.suspended && checkpoint.finished) ||
      !checkpoint.clock || !Number.isFinite(checkpoint.clock.updatedAt) ||
      !Number.isFinite(checkpoint.clock.whiteMs) ||
      !Number.isFinite(checkpoint.clock.blackMs) ||
      checkpoint.clock.whiteMs < 0 || checkpoint.clock.blackMs < 0) {
    throw new Error("This saved game is incompatible or damaged. Preserve the backup before starting another.");
  }
  try {
    for (const uci of checkpoint.moves) {
      if (typeof uci !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
        throw new Error("Malformed move");
      }
      chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || "q" });
    }
  } catch {
    throw new Error("Saved move history is invalid. The original snapshot has not been deleted.");
  }
  if (checkpoint.clock.active !== chess.turn()) {
    throw new Error("Saved clocks do not match the board position.");
  }
  const clock = checkpoint.finished
    ? checkpoint.clock
    : checkpoint.suspended
      ? { ...checkpoint.clock, updatedAt: now }
      : advanceClock(checkpoint.clock, now, timeControl !== "untimed");
  return { chess, clock, finished: checkpoint.finished };
}
