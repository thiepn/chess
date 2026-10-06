import { describe, expect, it } from "vitest";
import { initialUserState } from "../data/demo";
import { buildCandidatePool } from "../domain/composer";
import type {
  CompetitionPlanSettings,
  UserState,
} from "../domain/types";
import type {
  ImportedGame,
  PersonalMistake,
} from "../games/types";
import {
  buildCompetitionCycle,
  competitionPlanForState,
} from "./cycle";
import { buildTrainingPlanForecast } from "./forecast";
import { buildLoadManagement } from "./load";
import { periodizationAdjustment } from "./periodization";
import { buildEventRetrospective } from "./retrospective";

function game(
  id: string,
  date: string,
  quality: number,
  resultScore: number,
  criticalErrorRate: number,
  averageCentipawnLoss = 45,
): ImportedGame {
  return {
    id,
    pgn: "test",
    source: "manual",
    importedAt: `${date.replaceAll(".", "-")}T12:00:00Z`,
    playerColor: "w",
    white: "User",
    black: "Opponent",
    result:
      resultScore >= 80
        ? "1-0"
        : resultScore >= 50
          ? "1/2-1/2"
          : "0-1",
    date,
    timeControlCategory: "rapid",
    moves: [],
    criticalMomentIds: [],
    practicalMetrics: {
      averageCentipawnLoss,
      criticalErrorRate,
      blunderRate:
        criticalErrorRate / 2,
      qualityScore: quality,
      resultScore,
      skillValidations: [
        {
          skillId: "tactics.skewer",
          occurrences: 3,
          averageCentipawnLoss: 25,
        },
      ],
    },
  };
}

function mistake(
  id: string,
  gameId: string,
  skillId = "tactics.pin",
  centipawnLoss = 180,
): PersonalMistake {
  return {
    id,
    gameId,
    gameSource: "manual",
    ply: 20,
    moveNumber: 10,
    playerColor: "w",
    positionFen:
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    actualMove: "a2a3",
    actualSan: "a3",
    bestMove: "e2e4",
    principalVariation: ["e2e4"],
    evaluationBefore: 20,
    evaluationAfter: -160,
    centipawnLoss,
    severity: "mistake",
    skillIds: [skillId],
    explanation: "Recurring event error",
    createdAt: "2026-10-03T10:00:00Z",
    nextReviewAt: "2026-10-03T10:00:00Z",
    attempts: 0,
    successes: 0,
    resolved: false,
  };
}

function plan(): CompetitionPlanSettings {
  return {
    enabled: true,
    eventDate: "2026-10-01",
    label: "Autumn Open",
    prepWeeks: 6,
    eventDays: 2,
    resetDays: 5,
  };
}

function state(): UserState {
  const preparation = [
    game("prep-1", "2026.09.10", 60, 55, 10, 62),
    game("prep-2", "2026.09.17", 62, 55, 9, 58),
    game("prep-3", "2026.09.24", 61, 55, 11, 60),
  ];
  const eventGames = [
    game("event-1", "2026.10.01", 76, 100, 7, 38),
    game("event-2", "2026.10.02", 74, 55, 8, 42),
  ];

  return {
    ...initialUserState,
    games: [...preparation, ...eventGames],
    mistakes: [
      mistake("m1", "event-1"),
      mistake("m2", "event-2"),
      mistake(
        "m3",
        "event-2",
        "tactics.pin",
        140,
      ),
    ],
    weaknesses: [],
    trainingPlan: {
      goal: "competition-prep",
      weeklyMinutes: 150,
      horizonWeeks: 8,
      sessionsPerWeek: 5,
      autoRecalibrate: true,
      autoRecovery: true,
      competition: plan(),
      updatedAt: "2026-09-01T00:00:00Z",
    },
    competitionRetrospectives: [
      {
        id: "event:2026-10-01",
        eventDate: "2026-10-01",
        updatedAt: "2026-10-04T10:00:00Z",
        whatWorked: "Opening recall stayed stable.",
        whatFailed: "Pins recurred under pressure.",
        nextCycleFocus: "Calculation before commitment.",
      },
    ],
  };
}

describe("P25 event retrospective", () => {
  it("matches a multi-day event separately from preparation games", () => {
    const s = state();
    const result = buildEventRetrospective(
      s,
      plan(),
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(result.eventGameIds).toEqual([
      "event-1",
      "event-2",
    ]);
    expect(result.preparationGameIds).toHaveLength(3);
    expect(result.event.games).toBe(2);
    expect(result.event.analyzedGames).toBe(2);
    expect(result.eventEndDate).toBe("2026-10-02");
  });

  it("requires enough analyzed games before claiming transfer", () => {
    const s = state();
    s.games = s.games?.filter(
      (item) => item.id !== "event-2",
    );

    const result = buildEventRetrospective(
      s,
      plan(),
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(result.translationStatus).toBe(
      "insufficient",
    );
  });

  it("classifies stronger event play against the preparation baseline", () => {
    const result = buildEventRetrospective(
      state(),
      plan(),
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(result.translationStatus).toBe(
      "improved",
    );
    expect(result.qualityDelta).toBeGreaterThan(10);
    expect(result.errorRateDelta).toBeLessThan(0);
    expect(result.resultDelta).toBeGreaterThan(0);
  });

  it("extracts recurring event mistakes and stable skills", () => {
    const result = buildEventRetrospective(
      state(),
      plan(),
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(
      result.repairPriorities[0].skillId,
    ).toBe("tactics.pin");
    expect(result.repairPriorities[0].games).toBe(2);
    expect(
      result.strengthSkillIds,
    ).toContain("tactics.skewer");
  });

  it("activates a bounded 14-day repair loop after the event", () => {
    const active = buildEventRetrospective(
      state(),
      plan(),
      new Date("2026-10-06T12:00:00Z"),
    );
    const expired = buildEventRetrospective(
      state(),
      plan(),
      new Date("2026-10-18T12:00:00Z"),
    );

    expect(active.followUpActive).toBe(true);
    expect(active.priorityMultiplier).toBe(1.14);
    expect(active.followUpUntil).toBe("2026-10-16");
    expect(expired.followUpActive).toBe(false);
    expect(expired.priorityMultiplier).toBe(1);
  });

  it("surfaces persisted human retrospective notes without persisting derived metrics", () => {
    const result = buildEventRetrospective(
      state(),
      plan(),
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(result.note?.whatWorked).toContain(
      "Opening recall",
    );
    expect(result.note?.whatFailed).toContain(
      "Pins",
    );
    expect(result.note?.nextCycleFocus).toContain(
      "Calculation",
    );
  });

  it("boosts the event-proven repair skill in actual periodization", () => {
    const s = state();
    const now = new Date(
      "2026-10-06T12:00:00Z",
    );
    const eventRepair = periodizationAdjustment(
      s,
      {
        id: "game:tactics.pin",
        source: "game",
        skillIds: ["tactics.pin"],
        activityType: "themedPuzzle",
        estimatedMinutes: 5,
        priority: .8,
        difficulty: 3,
        novelty: .2,
        urgency: .8,
        reason: "event repair",
      },
      now,
    );
    const other = periodizationAdjustment(
      s,
      {
        id: "game:tactics.skewer",
        source: "game",
        skillIds: ["tactics.skewer"],
        activityType: "themedPuzzle",
        estimatedMinutes: 5,
        priority: .8,
        difficulty: 3,
        novelty: .2,
        urgency: .8,
        reason: "other",
      },
      now,
    );

    expect(eventRepair.multiplier).toBeGreaterThan(
      other.multiplier,
    );
    expect(eventRepair.reason).toContain(
      "P25 post-event follow-up",
    );
  });

  it("creates explicit P25 repair candidates for the next sessions", () => {
    const pool = buildCandidatePool(
      state(),
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(
      pool.some((item) =>
        item.reason.includes("P25 event repair"),
      ),
    ).toBe(true);
  });

  it("keeps the P24 event phase active throughout a multi-day event", () => {
    const s = state();
    const trainingPlan = s.trainingPlan!;
    const forecast = buildTrainingPlanForecast(
      s,
      trainingPlan,
      new Date("2026-10-02T12:00:00Z"),
    );
    const load = buildLoadManagement(
      s,
      trainingPlan,
      forecast,
      new Date("2026-10-02T12:00:00Z"),
    );
    const cycle = buildCompetitionCycle(
      s,
      trainingPlan,
      forecast,
      load,
      new Date("2026-10-02T12:00:00Z"),
    );

    expect(
      competitionPlanForState(s).eventDays,
    ).toBe(2);
    expect(cycle.phase).toBe("event");
  });
});
