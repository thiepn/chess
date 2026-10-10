import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  advanceClock, completeMoveClock, initialClock, makeCheckpoint, restoreCheckpoint,
  type GameCheckpoint,
} from "./gameRecovery";

describe("P62 deterministic game restoration", () => {
  it("replays legal moves without losing turn, castling rights or notation", () => {
    const chess = new Chess();
    for (const san of ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O"]) chess.move(san);
    const snapshot = makeCheckpoint(chess, new Chess().fen(), initialClock("untimed", chess.turn(), 1_000));
    const reloaded = restoreCheckpoint(new Chess().fen(), snapshot, "untimed", 1_300);
    expect(reloaded.chess.fen()).toBe(chess.fen());
    expect(reloaded.chess.history()).toEqual(chess.history());
    expect(reloaded.chess.turn()).toBe("b");
  });

  it("preserves threefold repetition rights through replay", () => {
    const chess = new Chess();
    for (const san of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]) chess.move(san);
    const snapshot = makeCheckpoint(chess, new Chess().fen(), initialClock("untimed", "w", 0));
    expect(restoreCheckpoint(new Chess().fen(), snapshot, "untimed", 1).chess.isThreefoldRepetition()).toBe(true);
  });

  it("restores underpromotion without coercing it to queen", () => {
    const fen = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
    const chess = new Chess(fen);
    chess.move({ from: "a7", to: "a8", promotion: "n" });
    const snapshot = makeCheckpoint(chess, fen, initialClock("untimed", "b", 1));
    const restored = restoreCheckpoint(fen, snapshot, "untimed", 4);
    expect(restored.chess.fen()).toBe(chess.fen());
    expect(restored.chess.get("a8")?.type).toBe("n");
  });

  it("rejects illegal or corrupt moves without silently replacing the saved game", () => {
    const initialFen = new Chess().fen();
    const invalid: GameCheckpoint = {
      version: 1, initialFen, moves: ["e2e5"],
      clock: initialClock("10+0", "w", 0),
    };
    expect(() => restoreCheckpoint(initialFen, invalid, "10+0", 10)).toThrow(/invalid/);
    expect(invalid.moves).toEqual(["e2e5"]);
  });

  it("rejects a checkpoint saved for another starting position", () => {
    const snap = makeCheckpoint(new Chess(), new Chess().fen(), initialClock("untimed", "w", 100));
    expect(() => restoreCheckpoint("4k3/8/8/8/8/8/8/4K3 w - - 0 1", snap, "untimed", 120))
      .toThrow(/incompatible/);
  });

  it("restores a ticking clock after background suspension and prevents negative time", () => {
    const fen = new Chess().fen();
    const snap = makeCheckpoint(new Chess(), fen, initialClock("10+0", "w", 1_000));
    expect(restoreCheckpoint(fen, snap, "10+0", 17_500).clock.whiteMs).toBe(583_500);
    expect(restoreCheckpoint(fen, snap, "10+0", 750_000).clock.whiteMs).toBe(0);
  });

  it("applies Fischer increment only after a legal, in-time move", () => {
    const start = initialClock("15+10", "w", 100);
    const afterWhite = completeMoveClock(start, "w", "15+10", 2_100);
    expect(afterWhite).toMatchObject({ whiteMs: 908_000, blackMs: 900_000, active: "b" });
    expect(completeMoveClock({ ...start, whiteMs: 1_000 }, "w", "15+10", 1_101)).toBeNull();
  });

  it("does not count timer callbacks or negative system-time deltas as extra game time", () => {
    const start = initialClock("10+0", "b", 100);
    const once = advanceClock(start, 1_100, true);
    const twice = advanceClock(once, 1_100, true);
    expect(twice.blackMs).toBe(599_000);
    expect(advanceClock(twice, 500, true).blackMs).toBe(599_000);
  });

  it("does not drain untimed clock on long gaps", () => {
    const start = initialClock("untimed", "w", 0);
    expect(advanceClock(start, 10_000_000, false).whiteMs).toBe(0);
    expect(completeMoveClock(start, "w", "untimed", 5_000)?.active).toBe("b");
  });

  it("preserves terminal result metadata on recovery", () => {
    const chess = new Chess();
    chess.move("e4");
    const snap = makeCheckpoint(chess, new Chess().fen(), initialClock("untimed", "b", 100), {
      outcome: "resigned", reason: "resignation", completedAt: "2026-10-08T12:00:00.000Z", reviewSent: false,
    });
    expect(restoreCheckpoint(new Chess().fen(), snap, "untimed", 100_000).finished?.reason).toBe("resignation");
  });
});


describe("P84 explicit saved-session suspension", () => {
  it("freezes a deliberately saved 10+0 clock through hours offline, then resumes ticking", () => {
    const chess = new Chess();
    chess.move("e4");
    const starting = initialClock("10+0", "w", 1_000);
    const atSave = completeMoveClock(starting, "w", "10+0", 3_500)!;
    const saved = makeCheckpoint(chess, new Chess().fen(), atSave, undefined, true);
    expect(saved.suspended).toBe(true);
    const later = restoreCheckpoint(new Chess().fen(), saved, "10+0", 3_600_000);
    expect(later.chess.history()).toEqual(["e4"]);
    expect(later.clock).toMatchObject({ whiteMs: 597_500, blackMs: 600_000, active: "b", updatedAt: 3_600_000 });
    const running = makeCheckpoint(later.chess, new Chess().fen(), later.clock);
    expect(running.suspended).toBeUndefined();
    expect(restoreCheckpoint(new Chess().fen(), running, "10+0", 3_602_000).clock.blackMs).toBe(598_000);
  });

  it("never grants free clock time to unexpected tab closure or ordinary backgrounding", () => {
    const fen = new Chess().fen();
    const running = makeCheckpoint(new Chess(), fen, initialClock("15+10", "w", 100));
    expect(restoreCheckpoint(fen, running, "15+10", 60_100).clock.whiteMs).toBe(840_000);
  });

  it("rejects forged suspended flags and impossible finished-plus-paused state", () => {
    const fen = new Chess().fen();
    const base = makeCheckpoint(new Chess(), fen, initialClock("10+0", "w", 50));
    expect(() => restoreCheckpoint(fen, { ...base, suspended: "yes" as never }, "10+0", 500))
      .toThrow(/incompatible|damaged/);
    const finished = {
      outcome: "draw" as const, reason: "stalemate" as const,
      completedAt: "2026-10-10T12:00:00.000Z", reviewSent: false,
    };
    expect(() => restoreCheckpoint(fen, { ...base, suspended: true, finished }, "10+0", 500))
      .toThrow(/incompatible|damaged/);
    expect(base.suspended).toBeUndefined();
  });
});
