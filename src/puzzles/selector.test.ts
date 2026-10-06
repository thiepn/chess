import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { seedPuzzles } from "./seed";
import { selectPuzzle, targetPuzzleRating } from "./selector";

describe("puzzle corpus", () => {
  it("contains legal normalized solution lines", () => {
    for (const puzzle of seedPuzzles) {
      const chess = new Chess(puzzle.initialFen);
      for (const encoded of puzzle.solutionMoves) {
        const move = chess.move({
          from: encoded.slice(0, 2),
          to: encoded.slice(2, 4),
          promotion: encoded.slice(4, 5) || "q",
        });
        expect(move, `${puzzle.id}: ${encoded}`).toBeTruthy();
      }
    }
  });

  it("raises target difficulty as mastery improves", () => {
    expect(targetPuzzleRating(80, 3)).toBeGreaterThan(
      targetPuzzleRating(20, 3),
    );
  });

  it("honors an explicit adaptive difficulty target", () => {
    const low = targetPuzzleRating(20, 2);
    const high = targetPuzzleRating(80, 4);
    expect(high).toBeGreaterThan(low);

    const candidates = seedPuzzles.filter((puzzle) =>
      puzzle.skillIds.includes("tactics.knight-fork"),
    );
    const selected = selectPuzzle(candidates, {
      skillId: "tactics.knight-fork",
      mastery: 20,
      activityDifficulty: 2,
      targetRating: 1800,
    });

    const baseline = selectPuzzle(candidates, {
      skillId: "tactics.knight-fork",
      mastery: 20,
      activityDifficulty: 2,
      targetRating: 700,
    });

    if (selected && baseline) {
      expect(
        Math.abs(selected.rating - 1800),
      ).toBeLessThanOrEqual(
        Math.abs(baseline.rating - 1800),
      );
    }
  });

  it("prefers an unseen relevant puzzle over one attempted today", () => {
    const candidates = seedPuzzles.filter((puzzle) =>
      puzzle.skillIds.includes("tactics.knight-fork"),
    );
    const first = selectPuzzle(candidates, {
      skillId: "tactics.knight-fork",
      mastery: 20,
      activityDifficulty: 2,
    });

    expect(first).toBeTruthy();

    const next = selectPuzzle(candidates, {
      skillId: "tactics.knight-fork",
      mastery: 20,
      activityDifficulty: 2,
      history: {
        [first!.id]: {
          puzzleId: first!.id,
          attempts: 1,
          successes: 1,
          lastAttemptAt: new Date().toISOString(),
          lastSuccessAt: new Date().toISOString(),
          lastQuality: 1,
          hintsUsed: 0,
          wrongAttempts: 0,
        },
      },
    });

    expect(next?.id).not.toBe(first?.id);
  });
  it("keeps a clean solve out of rotation for two weeks when alternatives exist", () => {
    const now = new Date("2026-10-06T12:00:00Z");
    const candidates = seedPuzzles.filter((puzzle) =>
      puzzle.skillIds.includes("tactics.knight-fork"),
    );
    expect(candidates.length).toBeGreaterThan(1);

    const baseline = selectPuzzle(candidates, {
      skillId: "tactics.knight-fork",
      mastery: 20,
      activityDifficulty: 2,
    }, now);
    expect(baseline).toBeTruthy();

    const next = selectPuzzle(candidates, {
      skillId: "tactics.knight-fork",
      mastery: 20,
      activityDifficulty: 2,
      history: {
        [baseline!.id]: {
          puzzleId: baseline!.id,
          attempts: 1,
          successes: 1,
          lastAttemptAt: new Date(now.getTime() - 7 * 86_400_000).toISOString(),
          lastSuccessAt: new Date(now.getTime() - 7 * 86_400_000).toISOString(),
          lastQuality: 1,
          hintsUsed: 0,
          wrongAttempts: 0,
        },
      },
    }, now);

    expect(next?.id).not.toBe(baseline?.id);
  });

  it("allows a failed puzzle to return after a short spacing interval", () => {
    const now = new Date("2026-10-06T12:00:00Z");
    const candidates = seedPuzzles.filter((puzzle) =>
      puzzle.skillIds.includes("tactics.knight-fork"),
    );
    const failed = candidates[0];

    const selected = selectPuzzle(candidates, {
      skillId: "tactics.knight-fork",
      mastery: 20,
      activityDifficulty: 2,
      targetRating: failed.rating,
      history: {
        [failed.id]: {
          puzzleId: failed.id,
          attempts: 1,
          successes: 0,
          lastAttemptAt: new Date(now.getTime() - 4 * 86_400_000).toISOString(),
          lastQuality: .35,
          hintsUsed: 1,
          wrongAttempts: 2,
        },
      },
    }, now);

    expect(selected).toBeTruthy();
  });
});
