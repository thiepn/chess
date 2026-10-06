import { describe, expect, it } from "vitest";
import type { UserState } from "../domain/types";
import type {
  ImportedGame,
  PersonalMistake,
} from "../games/types";
import {
  buildCoachEffectiveness,
  evaluatePrescriptionRecord,
  markPrescriptionCompleted,
  markPrescriptionStarted,
  syncPrescriptionHistory,
} from "./outcomes";
import type {
  PrescriptionTrackingRecord,
  TrainingPrescription,
} from "./types";

function game(
  id: string,
  importedAt: string,
  quality: number,
  opening = "Caro-Kann Defense: Classical Variation",
): ImportedGame {
  return {
    id,
    pgn: "test",
    source: "lichess",
    externalId: id,
    importedAt,
    analyzedAt: importedAt,
    playerColor: "b",
    white: "Opponent",
    black: "User",
    result: "0-1",
    openingName: opening,
    eco: "B10",
    rated: true,
    timeControl: "600+5",
    timeControlCategory: "rapid",
    playerRating: 1400,
    opponentRating: 1420,
    moves: [],
    criticalMomentIds: [],
    practicalMetrics: {
      averageCentipawnLoss: Math.max(10, 100 - quality),
      criticalErrorRate: Math.max(0, 90 - quality) / 2,
      blunderRate: quality < 50 ? 8 : 1,
      qualityScore: quality,
      resultScore: 70,
      skillValidations: [],
    },
  };
}

function prescription(): TrainingPrescription {
  return {
    id: "prescription:opening:header:caro-kann defense",
    kind: "opening-repair",
    title: "Repair Caro-Kann Defense",
    rationale: "Three games are below baseline.",
    gamePlan: ["Develop", "Castle", "Check threats"],
    priority: 1,
    confidence: 67,
    evidenceGames: 4,
    diagnosticIds: ["d1"],
    composerEligible: true,
    target: {
      dimension: "opening",
      key: "header:caro-kann defense",
      label: "Caro-Kann Defense",
      skillId: "openings.principles",
    },
    baseline: {
      capturedAt: "2026-10-05T08:00:00Z",
      games: 4,
      score: 45,
      quality: 44,
    },
    actions: [
      {
        id: "opening:black-caro:black-caro-e4",
        kind: "opening-recall",
        label: "Repair from repertoire",
        skillId: "openings.principles",
        repertoireId: "black-caro",
        openingNodeId: "black-caro-e4",
      },
    ],
  };
}

function tracking(
  overrides: Partial<PrescriptionTrackingRecord> = {},
): PrescriptionTrackingRecord {
  return {
    id: "track-1",
    prescriptionId: prescription().id,
    kind: "opening-repair",
    title: "Repair Caro-Kann Defense",
    target: prescription().target,
    issuedAt: "2026-10-05T08:00:00Z",
    baseline: prescription().baseline,
    starts: 1,
    completions: 1,
    lastStartedAt: "2026-10-05T09:00:00Z",
    lastCompletedAt: "2026-10-05T09:10:00Z",
    completedActionIds: [
      "opening:black-caro:black-caro-e4",
    ],
    trainingSuccesses: 1,
    trainingQualityTotal: .9,
    ...overrides,
  };
}

function state(
  games: ImportedGame[] = [],
  mistakes: PersonalMistake[] = [],
  history: PrescriptionTrackingRecord[] = [],
): UserState {
  return {
    mastery: {},
    weaknesses: [],
    recentDomainMinutes: {},
    games,
    mistakes,
    prescriptionHistory: history,
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
    evaluationAfter: -200,
    centipawnLoss: 200,
    severity: "mistake",
    skillIds: ["fundamentals.blunder-check"],
    explanation: "test",
    createdAt: "2026-10-06T12:00:00Z",
    nextReviewAt: "2026-10-06T12:00:00Z",
    attempts: 0,
    successes: 0,
    resolved: false,
  };
}

describe("P19 prescription outcomes", () => {
  it("does not evaluate advice that was never completed", () => {
    const record = tracking({
      completions: 0,
      lastCompletedAt: undefined,
      completedActionIds: [],
    });
    const result = evaluatePrescriptionRecord(
      state([
        game("g1", "2026-10-06T10:00:00Z", 80),
        game("g2", "2026-10-06T11:00:00Z", 82),
        game("g3", "2026-10-06T12:00:00Z", 84),
      ]),
      record,
      new Date("2026-10-06T13:00:00Z"),
    );

    expect(result.status).toBe("untested");
    expect(result.postGames).toBe(0);
  });

  it("requires three matching post-treatment human games", () => {
    const result = evaluatePrescriptionRecord(
      state([
        game("g1", "2026-10-06T10:00:00Z", 80),
        game("g2", "2026-10-06T11:00:00Z", 82),
      ]),
      tracking(),
      new Date("2026-10-06T13:00:00Z"),
    );

    expect(result.status).toBe("collecting");
    expect(result.postGames).toBe(2);
  });

  it("validates an opening prescription when matching games improve", () => {
    const result = evaluatePrescriptionRecord(
      state([
        game("g1", "2026-10-06T10:00:00Z", 80),
        game("g2", "2026-10-06T11:00:00Z", 82),
        game("g3", "2026-10-06T12:00:00Z", 84),
      ]),
      tracking(),
      new Date("2026-10-06T13:00:00Z"),
    );

    expect(result.status).toBe("improved");
    expect(result.postGames).toBe(3);
    expect(result.delta).toBeGreaterThan(20);
  });

  it("measures recurring-mistake repair as reduced post-game recurrence", () => {
    const record = tracking({
      prescriptionId:
        "prescription:mistake:fundamentals.blunder-check",
      kind: "mistake-repair",
      title: "Stop repeating: Final blunder check",
      target: {
        dimension: "mistake",
        key: "fundamentals.blunder-check",
        label: "Final blunder check",
        skillId: "fundamentals.blunder-check",
      },
      baseline: {
        capturedAt: "2026-10-05T08:00:00Z",
        games: 4,
        score: 25,
        recurrenceRate: 75,
      },
    });

    const cleanGames = [
      game("g1", "2026-10-06T10:00:00Z", 68),
      game("g2", "2026-10-06T11:00:00Z", 70),
      game("g3", "2026-10-06T12:00:00Z", 72),
    ];
    const result = evaluatePrescriptionRecord(
      state(cleanGames, []),
      record,
      new Date("2026-10-06T13:00:00Z"),
    );

    expect(result.status).toBe("improved");
    expect(result.postScore).toBe(100);
    expect(result.delta).toBe(75);
  });

  it("creates one open episode and retires it when the plan disappears", () => {
    const p = prescription();
    const initial = state();
    const issued = syncPrescriptionHistory(
      initial,
      [p],
      new Date("2026-10-05T08:00:00Z"),
    );

    expect(issued).toHaveLength(1);

    const unchanged = syncPrescriptionHistory(
      { ...initial, prescriptionHistory: issued },
      [p],
      new Date("2026-10-05T09:00:00Z"),
    );
    expect(unchanged).toBe(issued);

    const retired = syncPrescriptionHistory(
      { ...initial, prescriptionHistory: issued },
      [],
      new Date("2026-10-06T09:00:00Z"),
    );
    expect(retired?.[0].retiredAt).toBe(
      "2026-10-06T09:00:00.000Z",
    );
  });

  it("tracks starts/completions and aggregates coach effectiveness", () => {
    const p = prescription();
    const started = markPrescriptionStarted(
      undefined,
      p,
      p.actions[0].id,
      new Date("2026-10-05T09:00:00Z"),
    );
    const completed = markPrescriptionCompleted(
      started,
      p.id,
      p.actions[0].id,
      true,
      .9,
      new Date("2026-10-05T09:10:00Z"),
    );
    const games = [
      game("g1", "2026-10-06T10:00:00Z", 80),
      game("g2", "2026-10-06T11:00:00Z", 82),
      game("g3", "2026-10-06T12:00:00Z", 84),
    ];
    const insight = buildCoachEffectiveness(
      state(games, [], completed),
      new Date("2026-10-06T13:00:00Z"),
    );

    expect(insight.issued).toBe(1);
    expect(insight.started).toBe(1);
    expect(insight.completed).toBe(1);
    expect(insight.evaluated).toBe(1);
    expect(insight.improved).toBe(1);
    expect(insight.validationRate).toBe(100);
  });
});
