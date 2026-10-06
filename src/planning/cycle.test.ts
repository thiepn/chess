import { describe, expect, it } from "vitest";
import type {
  TrainingPlanSettings,
  UserState,
} from "../domain/types";
import type {
  LoadManagementInsight,
  TrainingPlanForecast,
} from "./types";
import {
  buildCompetitionCycle,
  defaultCompetitionPlan,
} from "./cycle";
import {
  buildTrainingHorizon,
  periodizationAdjustment,
} from "./periodization";

function plan(
  eventDate = "2026-11-10",
  overrides: Partial<TrainingPlanSettings> = {},
): TrainingPlanSettings {
  return {
    goal: "competition-prep",
    weeklyMinutes: 150,
    horizonWeeks: 8,
    sessionsPerWeek: 5,
    autoRecalibrate: true,
    autoRecovery: true,
    updatedAt: "2026-10-01T00:00:00Z",
    competition: {
      enabled: true,
      eventDate,
      prepWeeks: 8,
      resetDays: 5,
    },
    ...overrides,
  };
}

function state(
  trainingPlan: TrainingPlanSettings,
): UserState {
  return {
    mastery: {},
    weaknesses: [],
    recentDomainMinutes: {},
    trainingPlan,
    trainingLedger: [],
  };
}

function forecast(): TrainingPlanForecast {
  return {
    adherence: {
      comparableWeeks: 4,
      averageAdherence: 92,
      weightedWeeklyMinutes: 138,
      consistency: 88,
      trend: "stable",
      confidence: 80,
      weeks: [],
    },
    forecast: {
      status: "on-track",
      planStart: "2026-09-01T00:00:00Z",
      planEnd: "2026-11-01T00:00:00Z",
      nominalTargetMinutes: 1200,
      completedSinceStart: 700,
      projectedTotalMinutes: 1140,
      projectedCompletion: 95,
      projectedShortfallMinutes: 60,
      sustainableWeeklyMinutes: 138,
      confidence: 80,
    },
    recalibration: {
      enabled: true,
      active: false,
      nominalWeeklyMinutes: 150,
      effectiveWeeklyMinutes: 150,
      multiplier: 1,
      evidenceWeeks: 4,
      confidence: 80,
      reason: "test",
    },
  };
}

function load(
  mode: LoadManagementInsight["appliedMode"] = "normal",
): LoadManagementInsight {
  return {
    recommendation: mode,
    appliedMode: mode,
    automaticEnabled: true,
    manualRecoveryActive: mode === "recovery",
    active: mode !== "normal",
    evidenceWeeks: 4,
    confidence: 80,
    latestWeekMinutes: 150,
    recentActiveDays: 5,
    baselineWeeklyMinutes: 145,
    rampRatio: 1.03,
    overloadWeeks: 0,
    loadMultiplier:
      mode === "recovery" ? .85 : mode === "watch" ? .95 : 1,
    managedWeeklyMinutes:
      mode === "recovery" ? 130 : mode === "watch" ? 145 : 150,
    maxSessionMinutes:
      mode === "recovery" ? 25 : mode === "watch" ? 40 : 60,
    bucketMultipliers: {
      retention: mode === "recovery" ? 1.05 : 1,
      repair: mode === "recovery" ? 1.05 : 1,
      course: mode === "recovery" ? .86 : 1,
      transfer: mode === "recovery" ? .88 : 1,
      repertoire: mode === "recovery" ? .92 : 1,
      exploration: mode === "recovery" ? .72 : 1,
    },
    reason: "test",
  };
}

describe("P24 competition cycles", () => {
  it("stays off without an enabled event", () => {
    const p = {
      ...plan(),
      competition: defaultCompetitionPlan(),
    };
    const result = buildCompetitionCycle(
      state(p),
      p,
      forecast(),
      load(),
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(result.phase).toBe("off");
    expect(result.active).toBe(false);
    expect(result.weeklyLoadMultiplier).toBe(1);
  });

  it.each([
    ["2026-09-20T12:00:00Z", "base"],
    ["2026-10-10T12:00:00Z", "build"],
    ["2026-10-30T12:00:00Z", "sharpen"],
    ["2026-11-06T12:00:00Z", "taper"],
    ["2026-11-10T12:00:00Z", "event"],
    ["2026-11-13T12:00:00Z", "reset"],
    ["2026-11-20T12:00:00Z", "complete"],
  ] as const)(
    "selects the %s cycle date as %s",
    (date, phase) => {
      const p = plan();
      const result = buildCompetitionCycle(
        state(p),
        p,
        forecast(),
        load(),
        new Date(date),
      );

      expect(result.phase).toBe(phase);
    },
  );

  it("moves toward transfer, repair and repertoire during sharpening", () => {
    const p = plan();
    const result = buildCompetitionCycle(
      state(p),
      p,
      forecast(),
      load(),
      new Date("2026-10-30T12:00:00Z"),
    );

    expect(result.phase).toBe("sharpen");
    expect(result.bucketMultipliers.transfer).toBeGreaterThan(1);
    expect(result.bucketMultipliers.repair).toBeGreaterThan(1);
    expect(result.bucketMultipliers.repertoire).toBeGreaterThan(1);
    expect(result.bucketMultipliers.course).toBeLessThan(1);
    expect(result.bucketMultipliers.exploration).toBeLessThan(1);
  });

  it("tapers volume and session length without falling below the global 70 percent floor", () => {
    const p = plan();
    const result = buildCompetitionCycle(
      state(p),
      p,
      forecast(),
      load(),
      new Date("2026-11-06T12:00:00Z"),
    );

    expect(result.phase).toBe("taper");
    expect(result.weeklyLoadMultiplier).toBe(.82);
    expect(result.managedWeeklyMinutes).toBe(125);
    expect(result.maxSessionMinutes).toBe(25);
    expect(result.managedWeeklyMinutes).toBeGreaterThanOrEqual(105);
  });

  it("makes event day minimal and post-event reset deliberately light", () => {
    const p = plan();
    const event = buildCompetitionCycle(
      state(p),
      p,
      forecast(),
      load(),
      new Date("2026-11-10T12:00:00Z"),
    );
    const reset = buildCompetitionCycle(
      state(p),
      p,
      forecast(),
      load(),
      new Date("2026-11-13T12:00:00Z"),
    );

    expect(event.maxSessionMinutes).toBe(15);
    expect(event.managedWeeklyMinutes).toBe(105);
    expect(reset.maxSessionMinutes).toBe(20);
    expect(reset.bucketMultipliers.transfer).toBeLessThan(1);
  });

  it("lets P23 recovery suppress competition-driven intensity increases", () => {
    const p = plan();
    const result = buildCompetitionCycle(
      state(p),
      p,
      forecast(),
      load("recovery"),
      new Date("2026-10-30T12:00:00Z"),
    );

    expect(result.phase).toBe("sharpen");
    expect(result.suppressedByRecovery).toBe(true);
    expect(
      Math.max(...Object.values(result.bucketMultipliers)),
    ).toBeLessThanOrEqual(1);
    expect(result.maxSessionMinutes).toBe(25);
  });

  it("marks taper preparation at risk when P23 recovery is active", () => {
    const p = plan();
    const result = buildCompetitionCycle(
      state(p),
      p,
      forecast(),
      load("recovery"),
      new Date("2026-11-06T12:00:00Z"),
    );

    expect(result.readinessStatus).toBe("at-risk");
  });

  it("feeds taper limits and cycle pressure into the actual P21 session horizon", () => {
    const p = plan("2026-10-10", {
      updatedAt: "2026-10-05T00:00:00Z",
    });
    const s = state(p);
    const horizon = buildTrainingHorizon(
      s,
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(horizon.competitionCycle.phase).toBe("taper");
    expect(horizon.recommendedSessionMinutes).toBeLessThanOrEqual(25);
    expect(horizon.managedWeeklyMinutes).toBe(125);
  });

  it("keeps urgent repair protected while reducing exploratory work in a taper", () => {
    const p = plan("2026-10-10", {
      updatedAt: "2026-10-05T00:00:00Z",
    });
    const s = state(p);

    const repair = periodizationAdjustment(
      s,
      {
        id: "weakness:tactics.pin",
        source: "weakness",
        skillIds: ["tactics.pin"],
        activityType: "themedPuzzle",
        estimatedMinutes: 5,
        priority: .8,
        difficulty: 2,
        novelty: .2,
        urgency: .7,
        reason: "repair",
      },
      new Date("2026-10-06T12:00:00Z"),
    );
    const exploration = periodizationAdjustment(
      s,
      {
        id: "library:tactics.pin",
        source: "library",
        skillIds: ["tactics.pin"],
        activityType: "savedStudy",
        estimatedMinutes: 5,
        priority: .6,
        difficulty: 2,
        novelty: .8,
        urgency: .1,
        reason: "explore",
      },
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(repair.multiplier).toBeGreaterThanOrEqual(.94);
    expect(exploration.multiplier).toBeLessThan(repair.multiplier);
    expect(exploration.reason).toContain("P24 taper block");
  });
});
