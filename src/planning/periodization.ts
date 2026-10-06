import type {
  DomainId,
  PeriodizationAdjustment,
  SessionMode,
  TrainingActivity,
  TrainingBudgetBucket,
  TrainingCandidate,
  TrainingGoalId,
  TrainingLedgerEntry,
  TrainingPlanSettings,
  UserState,
} from "../domain/types";
import type {
  TrainingBudgetAllocation,
  TrainingGoalDefinition,
  TrainingHorizonInsight,
} from "./types";

const DAY = 86_400_000;
const LEDGER_RETENTION_DAYS = 180;
const MAX_LEDGER_ENTRIES = 800;

export const trainingBucketLabels: Record<
  TrainingBudgetBucket,
  string
> = {
  retention: "Retention",
  repair: "Repair",
  course: "Course",
  transfer: "Transfer",
  repertoire: "Repertoire",
  exploration: "Exploration",
};

export const trainingGoals: Record<
  TrainingGoalId,
  TrainingGoalDefinition
> = {
  "balanced-growth": {
    id: "balanced-growth",
    label: "Balanced growth",
    description:
      "Build the course, retain old skills and keep real-game transfer moving together.",
    shares: {
      retention: .2,
      repair: .22,
      course: .25,
      transfer: .15,
      repertoire: .1,
      exploration: .08,
    },
  },
  "course-progress": {
    id: "course-progress",
    label: "Course progress",
    description:
      "Push stage advancement while preserving enough review and repair to avoid fragile progress.",
    shares: {
      retention: .18,
      repair: .17,
      course: .4,
      transfer: .1,
      repertoire: .08,
      exploration: .07,
    },
  },
  "human-transfer": {
    id: "human-transfer",
    label: "Human-game transfer",
    description:
      "Spend more of the week converting known chess into reliable decisions against real resistance.",
    shares: {
      retention: .16,
      repair: .26,
      course: .14,
      transfer: .28,
      repertoire: .1,
      exploration: .06,
    },
  },
  "competition-prep": {
    id: "competition-prep",
    label: "Competition prep",
    description:
      "Prioritize current leaks, resistant practice and repertoire readiness over broad new material.",
    shares: {
      retention: .14,
      repair: .3,
      course: .1,
      transfer: .28,
      repertoire: .14,
      exploration: .04,
    },
  },
};

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function mondayStart(now: Date) {
  const start = new Date(now);
  const day = start.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + offset);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function endOfWeek(start: Date) {
  return new Date(start.getTime() + 7 * DAY - 1);
}

export function defaultTrainingPlan(
  now = new Date(),
): TrainingPlanSettings {
  return {
    goal: "balanced-growth",
    weeklyMinutes: 150,
    horizonWeeks: 8,
    sessionsPerWeek: 5,
    updatedAt: now.toISOString(),
  };
}

export function trainingPlanForState(
  state: UserState,
  now = new Date(),
): TrainingPlanSettings {
  const fallback = defaultTrainingPlan(now);
  const stored = state.trainingPlan;

  if (!stored) return fallback;

  const horizonWeeks =
    stored.horizonWeeks === 4 ||
    stored.horizonWeeks === 8 ||
    stored.horizonWeeks === 12
      ? stored.horizonWeeks
      : fallback.horizonWeeks;

  return {
    goal:
      stored.goal in trainingGoals
        ? stored.goal
        : fallback.goal,
    weeklyMinutes: Math.round(
      clamp(stored.weeklyMinutes, 30, 600),
    ),
    horizonWeeks,
    sessionsPerWeek: Math.round(
      clamp(stored.sessionsPerWeek, 2, 7),
    ),
    updatedAt: stored.updatedAt || now.toISOString(),
  };
}

export function trainingBucketForCandidate(
  item: Pick<
    TrainingCandidate,
    "source" | "activityType"
  >,
): TrainingBudgetBucket {
  if (
    item.source === "review" ||
    item.source === "calibration"
  ) {
    return "retention";
  }

  if (
    item.source === "weakness" ||
    item.source === "game" ||
    item.source === "prescription"
  ) {
    return "repair";
  }

  if (
    item.activityType === "engineGame" ||
    item.activityType === "conversionChallenge" ||
    item.activityType === "defenseChallenge"
  ) {
    return "transfer";
  }

  if (item.source === "repertoire") {
    return "repertoire";
  }

  if (
    item.source === "curriculum" ||
    item.source === "assessment"
  ) {
    return "course";
  }

  return "exploration";
}

function weeklyLedger(
  state: UserState,
  now: Date,
) {
  const start = mondayStart(now);
  const end = endOfWeek(start);

  return (state.trainingLedger ?? []).filter(
    (entry) => {
      const time = new Date(entry.occurredAt).getTime();
      return (
        time >= start.getTime() &&
        time <= end.getTime()
      );
    },
  );
}

function elapsedWeekFraction(
  now: Date,
  start: Date,
) {
  return clamp(
    (now.getTime() - start.getTime()) /
      (7 * DAY),
    0,
    1,
  );
}

function recommendedMode(
  minutes: number,
): SessionMode {
  if (minutes <= 15) return "quick";
  if (minutes <= 40) return "standard";
  return "deep";
}

function allocationFor(
  bucket: TrainingBudgetBucket,
  share: number,
  weeklyMinutes: number,
  completedMinutes: number,
): TrainingBudgetAllocation {
  const targetMinutes = Math.round(
    weeklyMinutes * share,
  );
  const remainingMinutes = Math.max(
    0,
    targetMinutes - completedMinutes,
  );
  const completion = targetMinutes
    ? completedMinutes / targetMinutes
    : 1;
  const pressure = targetMinutes
    ? clamp(
        remainingMinutes / targetMinutes,
        0,
        1,
      )
    : 0;

  return {
    bucket,
    label: trainingBucketLabels[bucket],
    share,
    targetMinutes,
    completedMinutes,
    remainingMinutes,
    completion: Math.round(completion * 100),
    pressure: round(pressure),
  };
}

export function buildTrainingHorizon(
  state: UserState,
  now = new Date(),
): TrainingHorizonInsight {
  const plan = trainingPlanForState(state, now);
  const goal = trainingGoals[plan.goal];
  const start = mondayStart(now);
  const end = endOfWeek(start);
  const ledger = weeklyLedger(state, now);
  const completedMinutes = ledger.reduce(
    (sum, entry) => sum + entry.minutes,
    0,
  );
  const byBucket = new Map<
    TrainingBudgetBucket,
    number
  >();

  for (const entry of ledger) {
    byBucket.set(
      entry.bucket,
      (byBucket.get(entry.bucket) ?? 0) +
        entry.minutes,
    );
  }

  const buckets = Object.keys(
    goal.shares,
  ) as TrainingBudgetBucket[];
  const allocations = buckets
    .map((bucket) =>
      allocationFor(
        bucket,
        goal.shares[bucket],
        plan.weeklyMinutes,
        byBucket.get(bucket) ?? 0,
      ),
    )
    .sort(
      (a, b) =>
        b.pressure * b.share -
        a.pressure * a.share,
    );

  const planStart = new Date(plan.updatedAt);
  const paceStart = new Date(
    Math.max(
      start.getTime(),
      Math.min(now.getTime(), planStart.getTime()),
    ),
  );
  const paceWindow =
    end.getTime() - paceStart.getTime();
  const elapsed =
    paceWindow > 0
      ? clamp(
          (now.getTime() - paceStart.getTime()) /
            paceWindow,
          0,
          1,
        )
      : elapsedWeekFraction(now, start);
  const expectedMinutes = Math.round(
    plan.weeklyMinutes * elapsed,
  );
  const remainingMinutes = Math.max(
    0,
    plan.weeklyMinutes - completedMinutes,
  );
  const activeDays = new Set(
    ledger.map((entry) =>
      entry.occurredAt.slice(0, 10),
    ),
  ).size;
  const remainingSessions = Math.max(
    1,
    plan.sessionsPerWeek - activeDays,
  );
  const recommendedSessionMinutes =
    remainingMinutes > 0
      ? Math.round(
          clamp(
            remainingMinutes / remainingSessions,
            10,
            60,
          ),
        )
      : 10;
  const paceStatus: TrainingHorizonInsight["paceStatus"] =
    completedMinutes >= plan.weeklyMinutes
      ? "complete"
      : expectedMinutes > 20 &&
          completedMinutes < expectedMinutes * .72
        ? "behind"
        : completedMinutes >
            Math.max(20, expectedMinutes * 1.28)
          ? "ahead"
          : "on-track";
  const next = allocations[0];

  return {
    plan,
    goalLabel: goal.label,
    goalDescription: goal.description,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    completedMinutes,
    remainingMinutes,
    expectedMinutes,
    paceStatus,
    activeDays,
    remainingSessions,
    nextFocus: next?.bucket ?? "course",
    nextFocusLabel: next?.label ?? "Course",
    recommendedSessionMode: recommendedMode(
      recommendedSessionMinutes,
    ),
    recommendedSessionMinutes,
    horizonTargetMinutes:
      plan.weeklyMinutes * plan.horizonWeeks,
    allocations,
  };
}

export function periodizationAdjustment(
  state: UserState,
  item: TrainingCandidate,
  now = new Date(),
): PeriodizationAdjustment {
  const horizon = buildTrainingHorizon(
    state,
    now,
  );
  const bucket =
    trainingBucketForCandidate(item);
  const allocation =
    horizon.allocations.find(
      (entry) => entry.bucket === bucket,
    );
  const protectedSource = [
    "review",
    "weakness",
    "game",
    "assessment",
    "prescription",
  ].includes(item.source);
  const gap =
    allocation?.pressure ?? 0;
  let multiplier =
    .86 + gap * .28;

  if (bucket === horizon.nextFocus) {
    multiplier += .08;
  }

  if (
    allocation &&
    allocation.completedMinutes >
      allocation.targetMinutes * 1.18
  ) {
    multiplier -= .1;
  }

  if (
    horizon.completedMinutes >=
      horizon.plan.weeklyMinutes
  ) {
    multiplier *= protectedSource ? .95 : .72;
  }

  if (protectedSource) {
    multiplier = Math.max(.94, multiplier);
  }

  multiplier = clamp(multiplier, .72, 1.24);

  const reason =
    bucket === horizon.nextFocus
      ? `${allocation?.label ?? trainingBucketLabels[bucket]} is the largest remaining weekly gap.`
      : allocation &&
          allocation.completedMinutes >=
            allocation.targetMinutes
        ? `${allocation.label} has reached its weekly allocation, so other needs get more room.`
        : `${allocation?.label ?? trainingBucketLabels[bucket]} still has ${allocation?.remainingMinutes ?? 0} planned minute(s) this week.`;

  return {
    bucket,
    multiplier: round(multiplier),
    targetMinutes:
      allocation?.targetMinutes ?? 0,
    completedMinutes:
      allocation?.completedMinutes ?? 0,
    remainingMinutes:
      allocation?.remainingMinutes ?? 0,
    reason,
  };
}

export function appendTrainingLedger(
  ledger: TrainingLedgerEntry[] | undefined,
  activity: TrainingActivity,
  domain: DomainId,
  occurredAt: string,
) {
  const bucket =
    trainingBucketForCandidate(activity);
  const entry: TrainingLedgerEntry = {
    id: `training:${occurredAt}:${activity.id}`,
    occurredAt,
    skillId: activity.skillIds[0],
    domain,
    source: activity.source,
    activityType: activity.activityType,
    bucket,
    minutes: Math.max(
      1,
      Math.round(activity.estimatedMinutes),
    ),
  };
  const cutoff =
    new Date(occurredAt).getTime() -
    LEDGER_RETENTION_DAYS * DAY;

  return [...(ledger ?? []), entry]
    .filter(
      (item) =>
        new Date(item.occurredAt).getTime() >=
        cutoff,
    )
    .slice(-MAX_LEDGER_ENTRIES);
}

export function recentDomainMinutes(
  state: UserState,
  domain: DomainId,
  now = new Date(),
  days = 7,
) {
  if (!(state.trainingLedger?.length)) {
    return state.recentDomainMinutes[domain] ?? 0;
  }

  const cutoff =
    now.getTime() - days * DAY;

  return state.trainingLedger
    .filter(
      (entry) =>
        entry.domain === domain &&
        new Date(entry.occurredAt).getTime() >=
          cutoff,
    )
    .reduce(
      (sum, entry) => sum + entry.minutes,
      0,
    );
}
