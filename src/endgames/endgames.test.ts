import { describe, expect, it } from "vitest";
import { initialUserState } from "../data/demo";
import {
  endgameCatalogIssues,
  endgamePositionFor,
  endgamePositions,
} from "./positions";
import { scoreEndgameAttempt } from "./scoring";

describe("P31 endgame technique corpus", () => {
  it("keeps every authored starting position valid and playable", () => {
    expect(endgameCatalogIssues()).toEqual([]);
  });

  it("covers every finish-stage technique skill with a dedicated play-out", () => {
    const covered = new Set(
      endgamePositions.map((position) => position.skillId),
    );

    for (const skillId of [
      "endgames.queen-mate",
      "endgames.rook-mate",
      "endgames.opposition",
      "endgames.key-squares",
      "endgames.pawn-races",
      "pawns.passed",
      "endgames.rook-activity",
      "endgames.lucena",
      "endgames.philidor",
      "conversion.simplify",
    ]) {
      expect(covered.has(skillId), skillId).toBe(true);
    }
  });

  it("gives defensive positions explicit survival thresholds", () => {
    for (const position of endgamePositions.filter(
      (item) => item.objectiveType === "hold",
    )) {
      expect(position.survivalPlies).toBeGreaterThan(0);
      expect(position.survivalPlies).toBeLessThanOrEqual(
        position.maxPlies,
      );
    }
  });

  it("prioritizes a due or weakly performed position for a repeated skill", () => {
    const state = {
      ...initialUserState,
      endgameHistory: {
        "endgame:philidor": {
          positionId: "endgame:philidor",
          attempts: 2,
          successes: 2,
          recognitionAttempts: 2,
          recognitionCorrects: 2,
          conversionAttempts: 0,
          conversionSuccesses: 0,
          defenseAttempts: 2,
          defenseHolds: 2,
          lastAttemptAt: "2026-10-05T10:00:00Z",
          lastSuccessAt: "2026-10-05T10:00:00Z",
          lastQuality: .95,
          lastPlies: 28,
          nextReviewAt: "2026-11-05T10:00:00Z",
        },
        "endgame:rook-defense": {
          positionId: "endgame:rook-defense",
          attempts: 1,
          successes: 0,
          recognitionAttempts: 1,
          recognitionCorrects: 0,
          conversionAttempts: 0,
          conversionSuccesses: 0,
          defenseAttempts: 1,
          defenseHolds: 0,
          lastAttemptAt: "2026-10-05T10:00:00Z",
          lastQuality: .2,
          lastPlies: 8,
          nextReviewAt: "2026-10-06T10:00:00Z",
        },
      },
    };

    expect(
      endgamePositionFor(
        state,
        "endgames.philidor",
        new Date("2026-10-06T12:00:00Z"),
      )?.id,
    ).toBe("endgame:rook-defense");
  });
});

describe("P31 endgame scoring", () => {
  const position = endgamePositions.find(
    (item) => item.id === "endgame:lucena",
  )!;

  it("requires practical execution even when theory recognition is correct", () => {
    const result = scoreEndgameAttempt({
      position,
      recognitionCorrect: true,
      executionSuccess: false,
      outcome: "loss",
      plies: 12,
      hintsUsed: 0,
      delayedRetention: false,
    });

    expect(result.success).toBe(false);
    expect(result.quality).toBeLessThan(.5);
  });

  it("rewards a clean repeated conversion most strongly", () => {
    const result = scoreEndgameAttempt({
      position,
      recognitionCorrect: true,
      executionSuccess: true,
      outcome: "win",
      plies: 18,
      hintsUsed: 0,
      delayedRetention: true,
    });

    expect(result.success).toBe(true);
    expect(result.quality).toBeGreaterThan(.9);
    expect(result.evidence.delayedRetention).toBe(true);
  });

  it("reduces quality when process cues were needed", () => {
    const clean = scoreEndgameAttempt({
      position,
      recognitionCorrect: true,
      executionSuccess: true,
      outcome: "win",
      plies: 18,
      hintsUsed: 0,
      delayedRetention: false,
    });
    const helped = scoreEndgameAttempt({
      position,
      recognitionCorrect: true,
      executionSuccess: true,
      outcome: "win",
      plies: 18,
      hintsUsed: 2,
      delayedRetention: false,
    });

    expect(clean.quality).toBeGreaterThan(helped.quality);
  });
});
