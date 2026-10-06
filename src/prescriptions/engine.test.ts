import { describe, expect, it } from "vitest";
import { buildCandidatePool } from "../domain/composer";
import type { UserState } from "../domain/types";
import type {
  ImportedGame,
  PersonalMistake,
} from "../games/types";
import type {
  RealGameDiagnostics,
} from "../analytics/types";
import { buildTrainingPrescriptions } from "./engine";

function practicalGame(
  id: string,
  color: "w" | "b",
  quality: number,
  openingName = "Caro-Kann Defense: Classical Variation",
): ImportedGame {
  return {
    id,
    pgn: "test",
    source: "lichess",
    externalId: id,
    importedAt: `2026-10-0${id.replace(/\D/g, "") || "1"}T10:00:00Z`,
    analyzedAt: "2026-10-06T10:00:00Z",
    playerColor: color,
    white: color === "w" ? "User" : "Opponent",
    black: color === "b" ? "User" : "Opponent",
    result: color === "w" ? "1-0" : "0-1",
    openingName,
    eco: "B10",
    rated: true,
    timeControl: "600+5",
    timeControlCategory: "rapid",
    playerRating: 1400,
    opponentRating: 1420,
    moves: [],
    criticalMomentIds: [],
    practicalMetrics: {
      averageCentipawnLoss: Math.max(10, 105 - quality),
      criticalErrorRate: Math.max(0, 90 - quality) / 2,
      blunderRate: quality < 50 ? 8 : 1,
      qualityScore: quality,
      resultScore: 70,
      skillValidations: [],
    },
  };
}

function emptyDiagnostics(): RealGameDiagnostics {
  return {
    sampleCount: 0,
    baselineQuality: 0,
    baselineResultPerformance: 0,
    baselinePracticalScore: 0,
    colors: [],
    timeControls: [],
    opponents: [],
    openings: [],
    positionTypes: [],
    phases: [],
    mistakeFamilies: [],
    recentForm: {
      recentGames: 0,
      previousGames: 0,
      recentQuality: 0,
      previousQuality: 0,
      qualityDelta: 0,
      recentResultPerformance: 0,
      previousResultPerformance: 0,
      resultDelta: 0,
      direction: "insufficient",
    },
    diagnostics: [],
  };
}

function mistake(
  id: string,
  gameId: string,
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
    evaluationAfter: -220,
    centipawnLoss: 220,
    severity: "mistake",
    skillIds: ["fundamentals.blunder-check"],
    explanation: "test",
    createdAt: "2026-10-06T10:00:00Z",
    nextReviewAt: "2026-10-06T10:00:00Z",
    attempts: 0,
    successes: 0,
    resolved: false,
  };
}

describe("P18 prescriptions", () => {
  it("turns a recurring human mistake into replay plus focused practice", () => {
    const diagnostics = emptyDiagnostics();
    diagnostics.sampleCount = 4;
    diagnostics.mistakeFamilies = [
      {
        skillId: "fundamentals.blunder-check",
        label: "Final blunder check",
        games: 3,
        occurrences: 4,
        averageImpact: 70,
        recurrenceRate: 75,
      },
    ];
    diagnostics.diagnostics = [
      {
        id: "mistake:fundamentals.blunder-check",
        severity: "priority",
        headline: "Final blunder check keeps recurring against humans",
        detail: "Recurring practical error.",
        dimension: "form",
        cohortKey: "fundamentals.blunder-check",
        games: 3,
        confidence: 50,
      },
    ];

    const state: UserState = {
      mastery: {},
      weaknesses: [],
      recentDomainMinutes: {},
      mistakes: [mistake("m1", "g1")],
    };

    const prescriptions = buildTrainingPrescriptions(
      state,
      diagnostics,
    );

    expect(prescriptions[0].kind).toBe("mistake-repair");
    expect(prescriptions[0].composerEligible).toBe(true);
    expect(
      prescriptions[0].actions.map((item) => item.kind),
    ).toEqual(
      expect.arrayContaining([
        "mistake-replay",
        "focused-practice",
      ]),
    );
  });

  it("maps a weak Black Caro-Kann cohort to real repertoire repair", () => {
    const diagnostics = emptyDiagnostics();
    diagnostics.sampleCount = 6;
    diagnostics.openings = [
      {
        dimension: "opening",
        key: "header:caro-kann defense",
        label: "Caro-Kann Defense",
        games: 3,
        quality: 48,
        resultPerformance: 35,
        averageCentipawnLoss: 75,
        criticalErrorRate: 20,
        blunderRate: 8,
        practicalScore: 47,
        deltaVsBaseline: -15,
        confidence: 50,
      },
    ];
    diagnostics.diagnostics = [
      {
        id: "cohort:opening:header:caro-kann defense:weak",
        severity: "priority",
        headline: "Caro-Kann Defense are underperforming",
        detail: "Three games are below baseline.",
        dimension: "opening",
        cohortKey: "header:caro-kann defense",
        games: 3,
        confidence: 50,
      },
    ];

    const state: UserState = {
      mastery: {},
      weaknesses: [],
      recentDomainMinutes: {},
      games: [
        practicalGame("1", "b", 45),
        practicalGame("2", "b", 48),
        practicalGame("3", "b", 50),
      ],
    };

    const [prescription] = buildTrainingPrescriptions(
      state,
      diagnostics,
    );
    const opening = prescription.actions.find(
      (item) => item.kind === "opening-recall",
    );
    const scenario = prescription.actions.find(
      (item) => item.kind === "scenario",
    );

    expect(prescription.kind).toBe("opening-repair");
    expect(opening?.repertoireId).toBe("black-caro");
    expect(opening?.openingNodeId).toBe("black-caro-e4");
    expect(scenario?.scenarioId).toBe("opening-caro");
  });

  it("injects at most a high-confidence prescription source into the candidate pool", () => {
    const state: UserState = {
      mastery: {},
      weaknesses: [],
      recentDomainMinutes: {},
      games: [
        practicalGame("1", "w", 88, "Italian Game: Classical Variation"),
        practicalGame("2", "w", 86, "Italian Game: Classical Variation"),
        practicalGame("3", "w", 84, "Italian Game: Classical Variation"),
        practicalGame("4", "b", 35),
        practicalGame("5", "b", 38),
        practicalGame("6", "b", 40),
      ],
    };

    const pool = buildCandidatePool(
      state,
      new Date("2026-10-06T12:00:00Z"),
    );
    const prescribed = pool.filter(
      (item) => item.source === "prescription",
    );

    expect(prescribed.length).toBeGreaterThan(0);
    expect(
      prescribed.every((item) => Boolean(item.prescriptionId)),
    ).toBe(true);
  });

  it("does not invent a plan from an insufficient human sample", () => {
    const state: UserState = {
      mastery: {},
      weaknesses: [],
      recentDomainMinutes: {},
      games: [
        practicalGame("1", "b", 35),
        practicalGame("2", "b", 38),
      ],
    };

    expect(buildTrainingPrescriptions(state)).toEqual([]);
  });
});
