import { describe, expect, it } from "vitest";
import type {
  TrainingCandidate,
  TrainingLedgerEntry,
  TrainingPlanSettings,
  UserState,
} from "../domain/types";
import {
  buildTrainingHorizon,
  periodizationAdjustment,
} from "./periodization";
import {
  buildLoadManagement,
  recoveryUntil,
} from "./load";

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
    autoRecovery: true,
    updatedAt: "2026-08-24T00:00:00Z",
    ...overrides,
  };
}

function entry(
  id: string,
  date: string,
  minutes: number,
): TrainingLedgerEntry {
  return {
    id,
    occurredAt: `${date}T10:00:00Z`,
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
    entry(`w-${index}`, date, minutes),
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

function candidate(
  source: TrainingCandidate["source"],
): TrainingCandidate {
  return {
    id: `${source}:tactics.pin`,
    source,
    skillIds: ["tactics.pin"],
    activityType: "themedPuzzle",
    estimatedMinutes: 5,
    priority: .8,
    difficulty: 2,
    novelty: .2,
    urgency: .6,
    reason: "test",
  };
}

describe("P23 load management", () => {
  it("does not confuse low adherence with overload", () => {
    const p = plan();
    const s = state(
      p,
      weeklyEntries([
        ["2026-08-25", 65],
        ["2026-09-01", 70],
        ["2026-09-08", 60],
        ["2026-09-15", 72],
        ["2026-09-22", 68],
        ["2026-09-29", 74],
      ]),
    );

    const load = buildLoadManagement(
      s,
      p,
      undefined,
      NOW,
    );

    expect(load.recommendation).toBe("normal");
    expect(load.appliedMode).toBe("normal");
  });

  it("enters recovery after sustained target overshoot and a high recent ramp", () => {
    const p = plan();
    const s = state(
      p,
      weeklyEntries([
        ["2026-08-25", 145],
        ["2026-09-01", 150],
        ["2026-09-08", 170],
        ["2026-09-15", 175],
        ["2026-09-22", 190],
        ["2026-09-29", 220],
      ]),
    );

    const load = buildLoadManagement(
      s,
      p,
      undefined,
      NOW,
    );

    expect(load.recommendation).toBe("recovery");
    expect(load.appliedMode).toBe("recovery");
    expect(load.overloadWeeks).toBeGreaterThanOrEqual(2);
    expect(load.managedWeeklyMinutes).toBeLessThan(
      load.latestWeekMinutes,
    );
    expect(load.bucketMultipliers.retention).toBeGreaterThan(1);
    expect(load.bucketMultipliers.exploration).toBeLessThan(1);
  });

  it("uses watch mode for an isolated load spike before full recovery is justified", () => {
    const p = plan({
      updatedAt: "2026-09-07T00:00:00Z",
    });
    const s = state(
      p,
      weeklyEntries([
        ["2026-09-08", 150],
        ["2026-09-15", 150],
        ["2026-09-22", 150],
        ["2026-09-29", 185],
      ]),
    );

    const load = buildLoadManagement(
      s,
      p,
      undefined,
      NOW,
    );

    expect(load.recommendation).toBe("watch");
    expect(load.appliedMode).toBe("watch");
    expect(load.maxSessionMinutes).toBe(40);
  });

  it("allows a manual seven-day recovery week with no overload history", () => {
    const p = plan({
      manualRecoveryUntil: recoveryUntil(NOW),
    });
    const s = state(p, []);

    const load = buildLoadManagement(
      s,
      p,
      undefined,
      NOW,
    );

    expect(load.manualRecoveryActive).toBe(true);
    expect(load.appliedMode).toBe("recovery");
    expect(load.maxSessionMinutes).toBe(25);
  });

  it("reports a recovery recommendation without applying it when automation is disabled", () => {
    const p = plan({
      autoRecovery: false,
    });
    const s = state(
      p,
      weeklyEntries([
        ["2026-08-25", 145],
        ["2026-09-01", 150],
        ["2026-09-08", 170],
        ["2026-09-15", 175],
        ["2026-09-22", 190],
        ["2026-09-29", 220],
      ]),
    );

    const load = buildLoadManagement(
      s,
      p,
      undefined,
      NOW,
    );

    expect(load.recommendation).toBe("recovery");
    expect(load.appliedMode).toBe("normal");
    expect(load.active).toBe(false);
    expect(load.managedWeeklyMinutes).toBe(150);
  });

  it("never lets combined P22 and P23 automation reduce below 70 percent of nominal", () => {
    const p = plan({
      manualRecoveryUntil: recoveryUntil(NOW),
    });
    const s = state(
      p,
      weeklyEntries([
        ["2026-08-25", 50],
        ["2026-09-01", 55],
        ["2026-09-08", 50],
        ["2026-09-15", 55],
        ["2026-09-22", 50],
        ["2026-09-29", 55],
      ]),
    );

    const load = buildLoadManagement(
      s,
      p,
      undefined,
      NOW,
    );

    expect(load.managedWeeklyMinutes).toBe(105);
  });

  it("caps generated session advice during recovery", () => {
    const p = plan({
      updatedAt: "2026-10-05T00:00:00Z",
      manualRecoveryUntil: recoveryUntil(NOW),
    });
    const s = state(p, []);

    const horizon = buildTrainingHorizon(
      s,
      NOW,
    );

    expect(horizon.loadManagement.appliedMode).toBe("recovery");
    expect(horizon.recommendedSessionMinutes).toBeLessThanOrEqual(25);
    expect(horizon.managedWeeklyMinutes).toBe(130);
  });

  it("protects urgent repair while reducing optional exploration during recovery", () => {
    const p = plan({
      manualRecoveryUntil: recoveryUntil(NOW),
    });
    const s = state(p, []);

    const repair = periodizationAdjustment(
      s,
      candidate("weakness"),
      NOW,
    );
    const optional = periodizationAdjustment(
      s,
      candidate("library"),
      NOW,
    );

    expect(repair.multiplier).toBeGreaterThanOrEqual(.94);
    expect(optional.multiplier).toBeLessThan(repair.multiplier);
    expect(optional.reason).toContain("P23 recovery mode");
  });
});
