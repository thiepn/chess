import { describe, expect, it } from "vitest";
import { initialUserState } from "../data/demo";
import { composeSession } from "../domain/composer";
import type {
  TrainingActivity,
  TrainingCandidate,
  TrainingLedgerEntry,
  UserState,
} from "../domain/types";
import {
  appendTrainingLedger,
  buildTrainingHorizon,
  defaultTrainingPlan,
  periodizationAdjustment,
  recentDomainMinutes,
  trainingBucketForCandidate,
} from "./periodization";

const NOW = new Date("2026-10-06T12:00:00Z");

function state(
  ledger: TrainingLedgerEntry[] = [],
): UserState {
  return {
    mastery: {},
    weaknesses: [],
    recentDomainMinutes: {},
    trainingPlan: {
      goal: "balanced-growth",
      weeklyMinutes: 150,
      horizonWeeks: 8,
      sessionsPerWeek: 5,
      updatedAt: "2026-10-05T08:00:00Z",
    },
    trainingLedger: ledger,
  };
}

function entry(
  id: string,
  bucket: TrainingLedgerEntry["bucket"],
  minutes: number,
  occurredAt = "2026-10-06T08:00:00Z",
): TrainingLedgerEntry {
  return {
    id,
    occurredAt,
    skillId: "tactics.pin",
    domain: "tactics",
    source:
      bucket === "retention"
        ? "review"
        : bucket === "repair"
          ? "weakness"
          : bucket === "course"
            ? "curriculum"
            : bucket === "repertoire"
              ? "repertoire"
              : bucket === "transfer"
                ? "curriculum"
                : "library",
    activityType:
      bucket === "transfer"
        ? "engineGame"
        : bucket === "repertoire"
          ? "openingRecall"
          : "themedPuzzle",
    bucket,
    minutes,
  };
}

function candidate(
  source: TrainingCandidate["source"],
  activityType: TrainingCandidate["activityType"] = "themedPuzzle",
): TrainingCandidate {
  return {
    id: `${source}:tactics.pin`,
    source,
    skillIds: ["tactics.pin"],
    activityType,
    estimatedMinutes: 5,
    priority: .8,
    difficulty: 2,
    novelty: .2,
    urgency: .6,
    reason: "test",
  };
}

describe("P21 training horizons", () => {
  it("uses a conservative balanced default plan", () => {
    const plan = defaultTrainingPlan(NOW);

    expect(plan.goal).toBe("balanced-growth");
    expect(plan.weeklyMinutes).toBe(150);
    expect(plan.horizonWeeks).toBe(8);
    expect(plan.sessionsPerWeek).toBe(5);
  });

  it("turns a goal into a weekly minute allocation", () => {
    const s = state();
    s.trainingPlan = {
      ...s.trainingPlan!,
      goal: "course-progress",
    };

    const horizon = buildTrainingHorizon(s, NOW);
    const course = horizon.allocations.find(
      (item) => item.bucket === "course",
    );

    expect(course?.targetMinutes).toBe(60);
    expect(horizon.completedMinutes).toBe(0);
    expect(horizon.nextFocus).toBe("course");
    expect(horizon.horizonTargetMinutes).toBe(1200);
  });

  it("uses actual completed work and ignores old ledger entries", () => {
    const horizon = buildTrainingHorizon(
      state([
        entry("r1", "repair", 20),
        entry("r2", "retention", 15),
        entry(
          "old",
          "course",
          90,
          "2026-09-20T08:00:00Z",
        ),
      ]),
      NOW,
    );

    expect(horizon.completedMinutes).toBe(35);
    expect(
      horizon.allocations.find(
        (item) => item.bucket === "repair",
      )?.completedMinutes,
    ).toBe(20);
    expect(
      horizon.allocations.find(
        (item) => item.bucket === "course",
      )?.completedMinutes,
    ).toBe(0);
  });

  it("boosts an under-served weekly bucket and cools a completed one", () => {
    const s = state([
      entry("r1", "repair", 40),
      entry("r2", "repair", 10),
    ]);

    const repair = periodizationAdjustment(
      s,
      candidate("weakness"),
      NOW,
    );
    const course = periodizationAdjustment(
      s,
      candidate("curriculum"),
      NOW,
    );

    expect(trainingBucketForCandidate(candidate("weakness"))).toBe("repair");
    expect(course.multiplier).toBeGreaterThan(
      repair.multiplier,
    );
    expect(course.remainingMinutes).toBeGreaterThan(0);
  });

  it("does not suppress protected repair work after the weekly budget is full", () => {
    const s = state([
      entry("1", "retention", 30),
      entry("2", "repair", 40),
      entry("3", "course", 40),
      entry("4", "transfer", 25),
      entry("5", "repertoire", 15),
      entry("6", "exploration", 10),
    ]);

    const protectedRepair =
      periodizationAdjustment(
        s,
        candidate("prescription"),
        NOW,
      );
    const exploration =
      periodizationAdjustment(
        s,
        candidate("library"),
        NOW,
      );

    expect(protectedRepair.multiplier).toBeGreaterThanOrEqual(.94);
    expect(exploration.multiplier).toBeLessThan(
      protectedRepair.multiplier,
    );
  });

  it("records completed activities and replaces legacy fatigue minutes with ledger data", () => {
    const activity: TrainingActivity = {
      ...candidate("curriculum"),
      title: "Pin",
      subtitle: "Course",
    };
    const ledger = appendTrainingLedger(
      undefined,
      activity,
      "tactics",
      "2026-10-06T10:00:00Z",
    );
    const s = state(ledger);

    expect(ledger).toHaveLength(1);
    expect(ledger[0].bucket).toBe("course");
    expect(ledger[0].minutes).toBe(5);
    expect(recentDomainMinutes(s, "tactics", NOW)).toBe(5);
  });

  it("annotates composed sessions with weekly focus and periodization reasons", () => {
    const session = composeSession(
      {
        ...initialUserState,
        trainingPlan: {
          goal: "human-transfer",
          weeklyMinutes: 150,
          horizonWeeks: 8,
          sessionsPerWeek: 5,
          updatedAt: "2026-10-05T08:00:00Z",
        },
        trainingLedger: [],
      },
      "standard",
      NOW,
    );

    expect(session.weeklyFocus).toBeDefined();
    expect(session.activities.length).toBeGreaterThan(0);
    expect(
      session.activities.every(
        (item) => Boolean(item.periodization),
      ),
    ).toBe(true);
  });
});
