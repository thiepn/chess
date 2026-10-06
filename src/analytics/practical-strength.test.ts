import { describe, expect, it } from "vitest";
import { buildProgressIntelligence } from "./engine";
import { emptyMastery } from "../domain/mastery";
import type { ImportedGame } from "../games/types";
import type { UserState } from "../domain/types";

function humanGame(
  id: string,
  quality: number,
  result: string,
  opponentRating: number,
): ImportedGame {
  return {
    id,
    pgn: "test",
    source: "lichess",
    externalId: id,
    importedAt: "2026-10-06T08:00:00Z",
    analyzedAt: "2026-10-06T08:05:00Z",
    playerColor: "w",
    white: "User",
    black: "Opponent",
    result,
    moves: [],
    criticalMomentIds: [],
    playerRating: 1400,
    opponentRating,
    timeControl: "600+5",
    timeControlCategory: "rapid",
    practicalMetrics: {
      averageCentipawnLoss: Math.max(10, 100 - quality),
      criticalErrorRate: Math.max(0, 100 - quality) / 4,
      blunderRate: 0,
      qualityScore: quality,
      resultScore:
        result === "1-0" ? 100 : result === "1/2-1/2" ? 55 : 10,
      skillValidations: [],
    },
  };
}

function trainingGame(id: string): ImportedGame {
  return {
    ...humanGame(id, 95, "1-0", 1800),
    source: "training",
    externalId: undefined,
    opponentRating: undefined,
  };
}

function stateWithGames(games: ImportedGame[]): UserState {
  const mastery = {
    ...emptyMastery("fundamentals.blunder-check", .5),
    attempts: 20,
    successes: 14,
    understanding: 72,
    recognition: 68,
    execution: 66,
    mixedRecognition: 64,
    delayedRetention: 62,
    trainingTransfer: 58,
    aiGameTransfer: 62,
    aiGameAttempts: 8,
    humanGameRecognition: 55,
    humanGameExecution: 52,
    humanGameAttempts: games.filter((game) => game.source === "lichess").length,
    effectiveMastery: 64,
    confidence: 72,
    stabilityDays: 10,
  };

  return {
    mastery: {
      "fundamentals.blunder-check": mastery,
    },
    weaknesses: [],
    recentDomainMinutes: {},
    games,
  };
}

describe("practical strength model", () => {
  it("counts only analyzed Lichess games as human practical evidence", () => {
    const state = stateWithGames([
      humanGame("h1", 72, "1-0", 1450),
      humanGame("h2", 68, "0-1", 1500),
      trainingGame("ai1"),
      trainingGame("ai2"),
    ]);

    const result = buildProgressIntelligence(
      state,
      new Date("2026-10-06T09:00:00Z"),
    );

    expect(result.practicalStrength.humanGames).toBe(2);
    expect(result.practicalStrength.status).toBe("provisional");
    expect(result.practicalStrength.averageOpponentRating).toBe(1475);
  });

  it("raises confidence as analyzed human-game evidence accumulates", () => {
    const few = buildProgressIntelligence(
      stateWithGames([
        humanGame("h1", 70, "1-0", 1450),
      ]),
    );
    const many = buildProgressIntelligence(
      stateWithGames(
        Array.from({ length: 10 }, (_, index) =>
          humanGame(
            `h${index}`,
            70 + (index % 4),
            index % 3 === 0 ? "0-1" : "1-0",
            1450 + index * 10,
          ),
        ),
      ),
    );

    expect(many.practicalStrength.confidence).toBeGreaterThan(
      few.practicalStrength.confidence,
    );
    expect(many.practicalStrength.status).toBe("established");
  });

  it("does not let strong AI games inflate human-game count", () => {
    const result = buildProgressIntelligence(
      stateWithGames([
        trainingGame("ai1"),
        trainingGame("ai2"),
        trainingGame("ai3"),
      ]),
    );

    expect(result.practicalStrength.humanGames).toBe(0);
    expect(result.practicalStrength.confidence).toBe(0);
    expect(result.practicalStrength.status).toBe("provisional");
  });
});
