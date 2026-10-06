import { describe, expect, it } from "vitest";
import type {
  TrainingLedgerEntry,
  TrainingPlanSettings,
  UserState,
} from "../domain/types";
import { buildTrainingHorizon } from "./periodization";
import {
  buildTrainingAdherence,
  buildTrainingPlanForecast,
} from "./forecast";

const NOW = new Date("2026-10-06T12:00:00Z");

function plan(
  overrides: Partial<TrainingPlanSettings> = {},
): TrainingPlanSettings {
  return {
    goal: "balanced-growth",
    weeklyMinutes: 150,
    horizonWeeks: 8,
    sessionsPerWeek: 5,
    autoRecalibrate: true,
    updatedAt: "2026-08-24T00:00:00Z",
    ...overrides,
  };
}

function entry(
  id: string,
  occurredAt: string,
  minutes: number,
): TrainingLedgerEntry {
  return {
    id,
    occurredAt,
    skillId: "tactics.pin",
    domain: "tactics",
    source: "curriculum",
    activityType: "themedPuzzle",
    bucket: "course",
    minutes,
  };
}

function weeklyEntries(
  values: Array<[string, number]>,
) {
  return values.map(([date, minutes], index) =>
    entry(
      `week-${index}`,
      `${date}T10:00:00Z`,
      minutes,
    ),
  );
}

function state(
  trainingPlan: TrainingPlanSettings,
  trainingLedger: TrainingLedgerEntry[],
): UserState {
  return {
    mastery: {},
    weaknesses: [],
    recentDomainMinutes: {},
    trainingPlan,
    trainingLedger,
  };
}

describe("P22 plan adherence and forecasting", () => {
  it("uses only full comparable weeks after the structural plan started", () => {
    const currentPlan = plan({
      updatedAt: "2026-09-21T12:00:00Z",
    });
    const s = state(
      currentPlan,
      weeklyEntries([
        ["2026-09-22", 60],
        ["2026-09-28", 90],
        ["2026-10-06", 120],
      ]),
    );

    const adherence = buildTrainingAdherence(
      s,
      currentPlan,
      NOW,
    );

    expect(adherence.comparableWeeks).toBe(1);
    expect(adherence.weeks[0].weekStart).toContain("2026-09-28");
    expect(adherence.weeks[0].completedMinutes).toBe(90);
  });

  it("does not recalibrate until at least three comparable full weeks exist", () => {
    const currentPlan = plan({
      updatedAt: "2026-09-21T00:00:00Z",
    });
    const s = state(
      currentPlan,
      weeklyEntries([
        ["2026-09-22", 45],
        ["2026-09-29", 50],
      ]),
    );

    const result = buildTrainingPlanForecast(
      s,
      currentPlan,
      NOW,
    );

    expect(result.adherence.comparableWeeks).toBe(2);
    expect(result.recalibration.active).toBe(false);
    expect(result.recalibration.effectiveWeeklyMinutes).toBe(150);
  });

  it("reduces only the effective weekly load after sustained low adherence", () => {
    const currentPlan = plan();
    const s = state(
      currentPlan,
      weeklyEntries([
        ["2026-08-25", 55],
        ["2026-09-01", 60],
        ["2026-09-08", 65],
        ["2026-09-15", 60],
        ["2026-09-22", 58],
        ["2026-09-29", 62],
      ]),
    );

    const result = buildTrainingPlanForecast(
      s,
      currentPlan,
      NOW,
    );

    expect(result.adherence.comparableWeeks).toBe(6);
    expect(result.adherence.averageAdherence).toBeLessThan(55);
    expect(result.recalibration.active).toBe(true);
    expect(result.recalibration.nominalWeeklyMinutes).toBe(150);
    expect(result.recalibration.effectiveWeeklyMinutes).toBe(120);
    expect(result.recalibration.multiplier).toBe(.8);
    expect(result.forecast.status).toBe("at-risk");
  });

  it("preserves the nominal target when recent adherence is recovering strongly", () => {
    const currentPlan = plan({
      updatedAt: "2026-09-07T00:00:00Z",
    });
    const s = state(
      currentPlan,
      weeklyEntries([
        ["2026-09-08", 60],
        ["2026-09-15", 70],
        ["2026-09-22", 135],
        ["2026-09-29", 145],
      ]),
    );

    const result = buildTrainingPlanForecast(
      s,
      currentPlan,
      NOW,
    );

    expect(result.adherence.trend).toBe("improving");
    expect(result.recalibration.active).toBe(false);
    expect(result.recalibration.effectiveWeeklyMinutes).toBe(150);
  });

  it("never auto-increases workload above the chosen nominal target", () => {
    const currentPlan = plan();
    const s = state(
      currentPlan,
      weeklyEntries([
        ["2026-08-25", 200],
        ["2026-09-01", 210],
        ["2026-09-08", 190],
        ["2026-09-15", 205],
        ["2026-09-22", 215],
        ["2026-09-29", 200],
      ]),
    );

    const result = buildTrainingPlanForecast(
      s,
      currentPlan,
      NOW,
    );

    expect(result.recalibration.active).toBe(false);
    expect(result.recalibration.effectiveWeeklyMinutes).toBe(150);
    expect(result.forecast.status).toBe("ahead");
  });

  it("respects an explicit opt-out from automatic recalibration", () => {
    const currentPlan = plan({
      autoRecalibrate: false,
    });
    const s = state(
      currentPlan,
      weeklyEntries([
        ["2026-08-25", 40],
        ["2026-09-01", 45],
        ["2026-09-08", 40],
        ["2026-09-15", 45],
        ["2026-09-22", 40],
        ["2026-09-29", 45],
      ]),
    );

    const result = buildTrainingPlanForecast(
      s,
      currentPlan,
      NOW,
    );

    expect(result.recalibration.enabled).toBe(false);
    expect(result.recalibration.active).toBe(false);
    expect(result.recalibration.effectiveWeeklyMinutes).toBe(150);
  });

  it("feeds the recalibrated effective load back into P21 allocation", () => {
    const currentPlan = plan();
    const s = state(
      currentPlan,
      weeklyEntries([
        ["2026-08-25", 55],
        ["2026-09-01", 60],
        ["2026-09-08", 65],
        ["2026-09-15", 60],
        ["2026-09-22", 58],
        ["2026-09-29", 62],
      ]),
    );

    const horizon = buildTrainingHorizon(
      s,
      NOW,
    );

    expect(horizon.plan.weeklyMinutes).toBe(150);
    expect(horizon.effectiveWeeklyMinutes).toBe(120);
    expect(
      horizon.allocations.reduce(
        (sum, item) => sum + item.targetMinutes,
        0,
      ),
    ).toBeCloseTo(120, -1);
  });
});
