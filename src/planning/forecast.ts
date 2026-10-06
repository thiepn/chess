import type {
  TrainingLedgerEntry,
  TrainingPlanSettings,
  UserState,
} from "../domain/types";
import type {
  AdherenceTrend,
  HorizonForecast,
  HorizonRecalibration,
  TrainingAdherenceInsight,
  TrainingPlanForecast,
  TrainingWeekAdherence,
} from "./types";

const DAY = 86_400_000;
const MAX_HISTORY_WEEKS = 6;
const MIN_RECALIBRATION_WEEKS = 3;

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.max(min, Math.min(max, value));
}

function round(
  value: number,
  digits = 1,
) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mondayStart(now: Date) {
  const start = new Date(now);
  const day = start.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + offset);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function firstFullWeekAfter(date: Date) {
  const week = mondayStart(date);
  if (date.getTime() === week.getTime()) {
    return week;
  }
  return new Date(week.getTime() + 7 * DAY);
}

function sumMinutes(
  ledger: TrainingLedgerEntry[],
  start: Date,
  end: Date,
) {
  return ledger
    .filter((entry) => {
      const time = new Date(entry.occurredAt).getTime();
      return (
        time >= start.getTime() &&
        time < end.getTime()
      );
    })
    .reduce(
      (sum, entry) => sum + entry.minutes,
      0,
    );
}

function activeDays(
  ledger: TrainingLedgerEntry[],
  start: Date,
  end: Date,
) {
  return new Set(
    ledger
      .filter((entry) => {
        const time =
          new Date(entry.occurredAt).getTime();
        return (
          time >= start.getTime() &&
          time < end.getTime()
        );
      })
      .map((entry) =>
        entry.occurredAt.slice(0, 10),
      ),
  ).size;
}

function comparableWeeks(
  state: UserState,
  plan: TrainingPlanSettings,
  now: Date,
): TrainingWeekAdherence[] {
  const ledger = state.trainingLedger ?? [];
  const currentWeek = mondayStart(now);
  const firstComparable = firstFullWeekAfter(
    new Date(plan.updatedAt),
  );
  const weeks: TrainingWeekAdherence[] = [];

  for (
    let offset = MAX_HISTORY_WEEKS;
    offset >= 1;
    offset -= 1
  ) {
    const start = new Date(
      currentWeek.getTime() - offset * 7 * DAY,
    );
    if (
      start.getTime() <
      firstComparable.getTime()
    ) {
      continue;
    }

    const end = new Date(
      start.getTime() + 7 * DAY,
    );
    const completedMinutes = sumMinutes(
      ledger,
      start,
      end,
    );

    weeks.push({
      weekStart: start.toISOString(),
      weekEnd: new Date(
        end.getTime() - 1,
      ).toISOString(),
      targetMinutes: plan.weeklyMinutes,
      completedMinutes,
      adherence: Math.round(
        clamp(
          completedMinutes /
            Math.max(1, plan.weeklyMinutes),
          0,
          1.5,
        ) * 100,
      ),
      activeDays: activeDays(
        ledger,
        start,
        end,
      ),
    });
  }

  return weeks;
}

function weightedAverage(
  values: number[],
) {
  if (!values.length) return 0;

  let total = 0;
  let weightTotal = 0;

  values.forEach((value, index) => {
    const distance =
      values.length - 1 - index;
    const weight = .82 ** distance;
    total += value * weight;
    weightTotal += weight;
  });

  return weightTotal
    ? total / weightTotal
    : 0;
}

function adherenceTrend(
  weeks: TrainingWeekAdherence[],
): AdherenceTrend {
  if (weeks.length < 4) return "insufficient";

  const recent = weeks
    .slice(-2)
    .map((week) => week.adherence);
  const prior = weeks
    .slice(-4, -2)
    .map((week) => week.adherence);
  const delta =
    weightedAverage(recent) -
    weightedAverage(prior);

  if (delta >= 12) return "improving";
  if (delta <= -12) return "declining";
  return "stable";
}

function consistencyScore(
  weeks: TrainingWeekAdherence[],
) {
  if (weeks.length < 2) return 0;

  const average =
    weeks.reduce(
      (sum, week) =>
        sum + week.completedMinutes,
      0,
    ) / weeks.length;

  if (average <= 0) return 0;

  const meanDeviation =
    weeks.reduce(
      (sum, week) =>
        sum +
        Math.abs(
          week.completedMinutes - average,
        ),
      0,
    ) / weeks.length;

  return Math.round(
    clamp(
      100 -
        meanDeviation /
          Math.max(1, average) *
          100,
      0,
      100,
    ),
  );
}

export function buildTrainingAdherence(
  state: UserState,
  plan: TrainingPlanSettings,
  now = new Date(),
): TrainingAdherenceInsight {
  const weeks = comparableWeeks(
    state,
    plan,
    now,
  );
  const weightedWeeklyMinutes =
    weightedAverage(
      weeks.map(
        (week) => week.completedMinutes,
      ),
    );
  const averageAdherence =
    plan.weeklyMinutes
      ? weightedWeeklyMinutes /
        plan.weeklyMinutes *
        100
      : 0;
  const consistency =
    consistencyScore(weeks);
  const confidence = Math.round(
    Math.min(
      100,
      weeks.length / 5 * 100,
    ) *
      (.72 + consistency / 100 * .28),
  );

  return {
    comparableWeeks: weeks.length,
    averageAdherence: Math.round(
      averageAdherence,
    ),
    weightedWeeklyMinutes: Math.round(
      weightedWeeklyMinutes,
    ),
    consistency,
    trend: adherenceTrend(weeks),
    confidence,
    weeks,
  };
}

function recentAdherence(
  adherence: TrainingAdherenceInsight,
) {
  const recent =
    adherence.weeks.slice(-2);
  if (!recent.length) return 0;
  return (
    recent.reduce(
      (sum, week) =>
        sum + week.adherence,
      0,
    ) / recent.length
  );
}

export function buildHorizonRecalibration(
  plan: TrainingPlanSettings,
  adherence: TrainingAdherenceInsight,
): HorizonRecalibration {
  const enabled =
    plan.autoRecalibrate !== false;
  const nominal = plan.weeklyMinutes;
  const recent = recentAdherence(
    adherence,
  );

  if (!enabled) {
    return {
      enabled,
      active: false,
      nominalWeeklyMinutes: nominal,
      effectiveWeeklyMinutes: nominal,
      multiplier: 1,
      evidenceWeeks:
        adherence.comparableWeeks,
      confidence: adherence.confidence,
      reason:
        "Automatic recalibration is disabled; the nominal weekly target remains unchanged.",
    };
  }

  if (
    adherence.comparableWeeks <
    MIN_RECALIBRATION_WEEKS
  ) {
    return {
      enabled,
      active: false,
      nominalWeeklyMinutes: nominal,
      effectiveWeeklyMinutes: nominal,
      multiplier: 1,
      evidenceWeeks:
        adherence.comparableWeeks,
      confidence: adherence.confidence,
      reason:
        `Collect ${MIN_RECALIBRATION_WEEKS} full comparable weeks before adapting the effective load.`,
    };
  }

  if (
    adherence.trend === "improving" &&
    recent >= 85
  ) {
    return {
      enabled,
      active: false,
      nominalWeeklyMinutes: nominal,
      effectiveWeeklyMinutes: nominal,
      multiplier: 1,
      evidenceWeeks:
        adherence.comparableWeeks,
      confidence: adherence.confidence,
      reason:
        "Recent adherence is recovering, so P22 preserves the nominal weekly target.",
    };
  }

  const ratio =
    adherence.averageAdherence / 100;
  const multiplier =
    ratio < .55
      ? .8
      : ratio < .72
        ? .88
        : ratio < .85
          ? .94
          : 1;
  const effectiveWeeklyMinutes =
    multiplier < 1
      ? Math.max(
          30,
          Math.round(
            nominal * multiplier / 5,
          ) * 5,
        )
      : nominal;
  const active =
    effectiveWeeklyMinutes < nominal;

  return {
    enabled,
    active,
    nominalWeeklyMinutes: nominal,
    effectiveWeeklyMinutes,
    multiplier: round(
      effectiveWeeklyMinutes /
        Math.max(1, nominal),
      2,
    ),
    evidenceWeeks:
      adherence.comparableWeeks,
    confidence: adherence.confidence,
    reason: active
      ? `Across ${adherence.comparableWeeks} full weeks, sustainable completion is about ${adherence.weightedWeeklyMinutes} min/week (${adherence.averageAdherence}% adherence). P22 lowers only the effective allocation load; your ${nominal}-minute goal stays unchanged.`
      : "Observed adherence is high enough to keep the effective weekly load equal to the nominal target.",
  };
}

export function buildHorizonForecast(
  state: UserState,
  plan: TrainingPlanSettings,
  adherence: TrainingAdherenceInsight,
  recalibration: HorizonRecalibration,
  now = new Date(),
): HorizonForecast {
  const planStart =
    new Date(plan.updatedAt);
  const planEnd = new Date(
    planStart.getTime() +
      plan.horizonWeeks * 7 * DAY,
  );
  const ledger =
    state.trainingLedger ?? [];
  const completedSinceStart =
    sumMinutes(
      ledger,
      planStart,
      now,
    );
  const elapsedWeeks = Math.max(
    0,
    (now.getTime() -
      planStart.getTime()) /
      (7 * DAY),
  );
  const remainingWeeks = Math.max(
    0,
    (planEnd.getTime() -
      now.getTime()) /
      (7 * DAY),
  );
  const nominalTargetMinutes =
    plan.weeklyMinutes *
    plan.horizonWeeks;

  const sustainableWeeklyMinutes =
    adherence.comparableWeeks >= 2
      ? adherence.weightedWeeklyMinutes
      : recalibration.effectiveWeeklyMinutes;
  const projectedTotalMinutes =
    completedSinceStart +
    sustainableWeeklyMinutes *
      remainingWeeks;
  const projectedCompletion =
    nominalTargetMinutes
      ? projectedTotalMinutes /
        nominalTargetMinutes *
        100
      : 100;
  const projectedShortfallMinutes =
    Math.max(
      0,
      nominalTargetMinutes -
        projectedTotalMinutes,
    );
  const remainingTarget =
    Math.max(
      0,
      nominalTargetMinutes -
        completedSinceStart,
    );
  const predictedWeeksToTarget =
    sustainableWeeklyMinutes > 0
      ? round(
          elapsedWeeks +
            remainingTarget /
              sustainableWeeklyMinutes,
          1,
        )
      : undefined;

  const status: HorizonForecast["status"] =
    adherence.comparableWeeks < 2
      ? "insufficient"
      : projectedCompletion >= 108
        ? "ahead"
        : projectedCompletion >= 90
          ? "on-track"
          : "at-risk";

  return {
    status,
    planStart: planStart.toISOString(),
    planEnd: planEnd.toISOString(),
    nominalTargetMinutes,
    completedSinceStart,
    projectedTotalMinutes: Math.round(
      projectedTotalMinutes,
    ),
    projectedCompletion: Math.round(
      projectedCompletion,
    ),
    projectedShortfallMinutes: Math.round(
      projectedShortfallMinutes,
    ),
    sustainableWeeklyMinutes: Math.round(
      sustainableWeeklyMinutes,
    ),
    ...(predictedWeeksToTarget !== undefined
      ? { predictedWeeksToTarget }
      : {}),
    confidence: adherence.confidence,
  };
}

export function buildTrainingPlanForecast(
  state: UserState,
  plan: TrainingPlanSettings,
  now = new Date(),
): TrainingPlanForecast {
  const adherence =
    buildTrainingAdherence(
      state,
      plan,
      now,
    );
  const recalibration =
    buildHorizonRecalibration(
      plan,
      adherence,
    );
  const forecast =
    buildHorizonForecast(
      state,
      plan,
      adherence,
      recalibration,
      now,
    );

  return {
    adherence,
    forecast,
    recalibration,
  };
}
