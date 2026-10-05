import { describe, expect, it } from "vitest";
import {
  mergeReanalyzedDeviations,
  mergeReanalyzedMistakes,
} from "./refresh";
import type { PersonalMistake } from "./types";

const baseMistake: PersonalMistake = {
  id: "g1:7",
  gameId: "g1",
  ply: 7,
  moveNumber: 4,
  playerColor: "w",
  positionFen: "4k3/8/8/8/8/8/4Q3/4K3 w - - 0 4",
  actualMove: "e2e7",
  actualSan: "Qe7+",
  bestMove: "e2b5",
  principalVariation: ["e2b5"],
  evaluationBefore: 20,
  evaluationAfter: -250,
  centipawnLoss: 270,
  severity: "blunder",
  skillIds: ["fundamentals.blunder-check"],
  explanation: "Check the opponent's reply.",
  createdAt: "2026-10-05T10:00:00Z",
  nextReviewAt: "2026-10-20T10:00:00Z",
  attempts: 3,
  successes: 2,
  lastAttemptAt: "2026-10-06T10:00:00Z",
  resolved: true,
};

describe("reanalyzed game state merging", () => {
  it("keeps spaced-repair history while refreshing engine fields", () => {
    const refreshed = {
      ...baseMistake,
      centipawnLoss: 310,
      attempts: 0,
      successes: 0,
      resolved: false,
      nextReviewAt: "2026-10-05T12:00:00Z",
    };

    const [result] = mergeReanalyzedMistakes(
      [baseMistake],
      [refreshed],
      "g1",
    );

    expect(result.centipawnLoss).toBe(310);
    expect(result.attempts).toBe(3);
    expect(result.successes).toBe(2);
    expect(result.resolved).toBe(true);
    expect(result.nextReviewAt).toBe("2026-10-20T10:00:00Z");
  });

  it("keeps resolved opening deviations resolved", () => {
    const existing = [{
      id: "g1:opening:1",
      gameId: "g1",
      repertoireId: "white-e4-simple",
      nodeId: "white-start",
      ply: 1,
      expectedMoves: ["e2e4"],
      playedMove: "d2d4",
      occurredAt: "2026-10-05T10:00:00Z",
      resolved: true,
    }];

    const refreshed = [{ ...existing[0], resolved: false }];
    const [result] = mergeReanalyzedDeviations(existing, refreshed, "g1");

    expect(result.resolved).toBe(true);
  });
});
