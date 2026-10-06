import { describe, expect, it } from "vitest";
import { initialUserState } from "../data/demo";
import type { UserState } from "../domain/types";
import type { PersonalMistake } from "../games/types";
import {
  authoredPositions,
  calculationCatalogIssues,
  calculationPositionFor,
} from "./positions";

function mistake(): PersonalMistake {
  return {
    id: "calc-game-1",
    gameId: "game-1",
    gameSource: "lichess",
    ply: 24,
    moveNumber: 12,
    playerColor: "w",
    positionFen:
      "2q1k3/8/8/5N2/8/8/8/4K3 w - - 0 1",
    actualMove: "f5h4",
    actualSan: "Nh4",
    bestMove: "f5d6",
    principalVariation: [
      "f5d6",
      "e8d8",
      "d6c8",
    ],
    evaluationBefore: 220,
    evaluationAfter: -30,
    centipawnLoss: 250,
    severity: "blunder",
    skillIds: [
      "calculation.candidates",
      "calculation.reply",
    ],
    explanation:
      "The forcing fork was missed.",
    createdAt: "2026-10-05T12:00:00Z",
    nextReviewAt: "2026-10-06T12:00:00Z",
    attempts: 0,
    successes: 0,
    resolved: false,
  };
}

describe("P29 calculation positions", () => {
  it("keeps every authored reference line legal", () => {
    expect(calculationCatalogIssues()).toEqual([]);
  });

  it("covers all six calculation curriculum skills", () => {
    const covered = new Set(
      authoredPositions.flatMap(
        (position) => position.skillIds,
      ),
    );

    for (const skillId of [
      "calculation.candidates",
      "calculation.reply",
      "calculation.forcing-lines",
      "calculation.move-order",
      "calculation.visualization",
      "calculation.quiet",
    ]) {
      expect(
        covered.has(skillId),
        skillId,
      ).toBe(true);
    }
  });

  it("prefers a relevant personal-game position over authored fallback", () => {
    const state: UserState = {
      ...initialUserState,
      mistakes: [mistake()],
      calculationHistory: {},
    };

    const position = calculationPositionFor(
      state,
      "calculation.candidates",
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(position.source).toBe("personal-game");
    expect(position.mistakeId).toBe("calc-game-1");
  });

  it("uses authored fallback when no matching personal position exists", () => {
    const state: UserState = {
      ...initialUserState,
      mistakes: [],
      calculationHistory: {},
    };

    const position = calculationPositionFor(
      state,
      "calculation.move-order",
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(position.source).toBe("authored");
    expect(position.skillIds).toContain(
      "calculation.move-order",
    );
  });
});
