import { describe, expect, it } from "vitest";
import type { UserState } from "../domain/types";
import type {
  ImportedGame,
  PersonalMistake,
} from "../games/types";
import { buildRealGameDiagnostics } from "./cohorts";

function game(
  id: string,
  options: {
    quality: number;
    result?: string;
    color?: "w" | "b";
    time?: ImportedGame["timeControlCategory"];
    playerRating?: number;
    opponentRating?: number;
    opening?: string;
    openingPhase?: number;
    middlegamePhase?: number;
    endgamePhase?: number;
    importedAt?: string;
  },
): ImportedGame {
  const {
    quality,
    result = "1-0",
    color = "w",
    time = "rapid",
    playerRating = 1400,
    opponentRating = 1400,
    opening = "Italian Game: Classical Variation",
    openingPhase = 40,
    middlegamePhase = 40,
    endgamePhase,
    importedAt = "2026-10-01T10:00:00Z",
  } = options;

  const phases = [
    {
      phase: "opening" as const,
      startPly: 1,
      endPly: 20,
      headline: "Opening",
      summary: "Opening",
      averageCentipawnLoss: openingPhase,
      criticalCount: openingPhase >= 100 ? 1 : 0,
    },
    {
      phase: "middlegame" as const,
      startPly: 21,
      endPly: endgamePhase === undefined ? 70 : 46,
      headline: "Middlegame",
      summary: "Middlegame",
      averageCentipawnLoss: middlegamePhase,
      criticalCount: middlegamePhase >= 100 ? 1 : 0,
    },
    ...(endgamePhase === undefined
      ? []
      : [
          {
            phase: "endgame" as const,
            startPly: 47,
            endPly: 82,
            headline: "Endgame",
            summary: "Endgame",
            averageCentipawnLoss: endgamePhase,
            criticalCount: endgamePhase >= 100 ? 1 : 0,
          },
        ]),
  ];

  return {
    id,
    pgn: "test",
    source: "lichess",
    externalId: id,
    importedAt,
    analyzedAt: importedAt,
    playerColor: color,
    white: color === "w" ? "User" : "Opponent",
    black: color === "b" ? "User" : "Opponent",
    result,
    openingName: opening,
    eco: "C50",
    rated: true,
    timeControl: "600+5",
    timeControlCategory: time,
    playerRating,
    opponentRating,
    moves: [],
    criticalMomentIds: [],
    practicalMetrics: {
      averageCentipawnLoss: Math.max(10, 105 - quality),
      criticalErrorRate: Math.max(0, 90 - quality) / 2,
      blunderRate: quality < 50 ? 8 : 1,
      qualityScore: quality,
      resultScore:
        result === "1-0"
          ? color === "w"
            ? 100
            : 10
          : result === "0-1"
            ? color === "b"
              ? 100
              : 10
            : 55,
      skillValidations: [],
    },
    reviewStory: {
      headline: "Review",
      summary: "Review",
      verdict: quality >= 70 ? "competitive" : "costly",
      phases,
      moments: [],
      generatedAt: importedAt,
    },
  };
}

function state(
  games: ImportedGame[],
  mistakes: PersonalMistake[] = [],
): UserState {
  return {
    mastery: {},
    weaknesses: [],
    recentDomainMinutes: {},
    games,
    mistakes,
  };
}

function mistake(
  id: string,
  gameId: string,
  skillId = "fundamentals.blunder-check",
): PersonalMistake {
  return {
    id,
    gameId,
    gameSource: "lichess",
    ply: 20,
    moveNumber: 10,
    playerColor: "w",
    positionFen:
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    actualMove: "g1f3",
    actualSan: "Nf3",
    bestMove: "g1f3",
    principalVariation: ["g1f3"],
    evaluationBefore: 0,
    evaluationAfter: -200,
    centipawnLoss: 200,
    severity: "mistake",
    skillIds: [skillId],
    explanation: "test",
    createdAt: "2026-10-01T10:00:00Z",
    nextReviewAt: "2026-10-01T10:00:00Z",
    attempts: 0,
    successes: 0,
    resolved: false,
  };
}

describe("real-game cohort diagnostics", () => {
  it("finds a stable underperforming color cohort only with enough samples", () => {
    const games = [
      game("w1", { quality: 84, color: "w" }),
      game("w2", { quality: 82, color: "w" }),
      game("w3", { quality: 80, color: "w" }),
      game("b1", { quality: 42, color: "b", result: "1-0" }),
      game("b2", { quality: 44, color: "b", result: "1-0" }),
      game("b3", { quality: 40, color: "b", result: "1-0" }),
    ];

    const result = buildRealGameDiagnostics(state(games));
    const black = result.colors.find((item) => item.key === "b");

    expect(black?.games).toBe(3);
    expect(black?.deltaVsBaseline).toBeLessThan(-10);
    expect(
      result.diagnostics.some(
        (item) =>
          item.dimension === "color" &&
          item.cohortKey === "b",
      ),
    ).toBe(true);
  });

  it("does not declare a two-game cohort a stable weakness", () => {
    const games = [
      game("w1", { quality: 82, color: "w" }),
      game("w2", { quality: 80, color: "w" }),
      game("w3", { quality: 78, color: "w" }),
      game("w4", { quality: 79, color: "w" }),
      game("b1", { quality: 30, color: "b", result: "1-0" }),
      game("b2", { quality: 32, color: "b", result: "1-0" }),
    ];

    const result = buildRealGameDiagnostics(state(games));

    expect(
      result.diagnostics.some(
        (item) =>
          item.dimension === "color" &&
          item.cohortKey === "b",
      ),
    ).toBe(false);
  });

  it("separates opponent strength and opening-family cohorts", () => {
    const games = [
      game("s1", {
        quality: 64,
        playerRating: 1400,
        opponentRating: 1600,
        opening: "Caro-Kann Defense: Advance Variation",
      }),
      game("p1", {
        quality: 72,
        playerRating: 1400,
        opponentRating: 1450,
        opening: "Caro-Kann Defense: Classical Variation",
      }),
      game("w1", {
        quality: 78,
        playerRating: 1400,
        opponentRating: 1200,
        opening: "Italian Game: Classical Variation",
      }),
    ];

    const result = buildRealGameDiagnostics(state(games));

    expect(
      result.opponents.map((item) => item.key),
    ).toEqual(
      expect.arrayContaining(["stronger", "peer", "weaker"]),
    );
    expect(
      result.openings.find(
        (item) => item.label === "Caro-Kann Defense",
      )?.games,
    ).toBe(2);
  });

  it("detects improving recent form from two five-game windows", () => {
    const games = Array.from({ length: 10 }, (_, index) =>
      game(`g${index}`, {
        quality: index < 5 ? 48 + index : 76 + (index - 5),
        importedAt: `2026-10-${String(index + 1).padStart(2, "0")}T10:00:00Z`,
      }),
    );

    const result = buildRealGameDiagnostics(state(games));

    expect(result.recentForm.direction).toBe("improving");
    expect(result.recentForm.qualityDelta).toBeGreaterThan(20);
  });

  it("surfaces recurring mistake families from human games", () => {
    const games = [
      game("g1", { quality: 60 }),
      game("g2", { quality: 62 }),
      game("g3", { quality: 58 }),
      game("g4", { quality: 65 }),
    ];
    const mistakes = [
      mistake("m1", "g1"),
      mistake("m2", "g2"),
      mistake("m3", "g3"),
    ];

    const result = buildRealGameDiagnostics(
      state(games, mistakes),
    );
    const family = result.mistakeFamilies[0];

    expect(family.skillId).toBe("fundamentals.blunder-check");
    expect(family.games).toBe(3);
    expect(family.recurrenceRate).toBe(75);
    expect(
      result.diagnostics.some(
        (item) => item.id === "mistake:fundamentals.blunder-check",
      ),
    ).toBe(true);
  });
});
