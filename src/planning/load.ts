import type {
  TrainingBudgetBucket,
  TrainingPlanSettings,
  UserState,
} from "../domain/types";
import type {
  LoadManagementInsight,
  LoadManagementStatus,
  TrainingPlanForecast,
} from "./types";
import { buildTrainingPlanForecast } from "./forecast";

const DAY = 86_400_000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function manualRecoveryActive(
  plan: TrainingPlanSettings,
  now: Date,
) {
  if (!plan.manualRecoveryUntil) return false;
  const until = new Date(plan.manualRecoveryUntil).getTime();
  return Number.isFinite(until) && until > now.getTime();
}

function bucketMultipliers(
  mode: LoadManagementStatus,
): Record<TrainingBudgetBucket, number> {
  if (mode === "recovery") {
    return {
      retention: 1.05,
      repair: 1.05,
      course: .86,
      transfer: .88,
      repertoire: .92,
      exploration: .72,
    };
  }

  if (mode === "watch") {
    return {
      retention: 1.02,
      repair: 1.02,
      course: .95,
      transfer: .96,
      repertoire: .98,
      exploration: .9,
    };
  }

  return {
    retention: 1,
    repair: 1,
    course: 1,
    transfer: 1,
    repertoire: 1,
    exploration: 1,
  };
}

function recommendedStatus(
  forecast: TrainingPlanForecast,
) {
  const weeks = forecast.adherence.weeks;
  const latest = weeks.at(-1);
  const prior = weeks.slice(-4, -1);
  const baselineWeeklyMinutes = mean(
    prior.map((week) => week.completedMinutes),
  );
  const rampRatio =
    latest && baselineWeeklyMinutes > 0
      ? latest.completedMinutes / baselineWeeklyMinutes
      : 1;
  const overloadWeeks = weeks
    .slice(-3)
    .filter(
      (week) =>
        week.completedMinutes >= week.targetMinutes * 1.1,
    ).length;
  const recentActiveDays = latest?.activeDays ?? 0;
  const latestAdherence = latest?.adherence ?? 0;

  let recommendation: LoadManagementStatus = "normal";

  const strongAcuteRamp =
    latestAdherence >= 125 &&
    rampRatio >= 1.25;
  const sustainedOverload =
    overloadWeeks >= 2 &&
    (
      rampRatio >= 1.15 ||
      recentActiveDays >= 6 ||
      forecast.adherence.trend === "declining"
    );

  if (
    planForecast.adherence.comparableWeeks >= 4 &&
    (strongAcuteRamp || sustainedOverload)
  ) {
    recommendation = "recovery";
  } else if (
    planForecast.adherence.comparableWeeks >= 3 &&
    (
      overloadWeeks >= 1 ||
      rampRatio >= 1.2 ||
      recentActiveDays >= 6
    )
  ) {
    recommendation = "watch";
  }

  return {
    recommendation,
    latestWeekMinutes: latest?.completedMinutes ?? 0,
    recentActiveDays,
    baselineWeeklyMinutes: Math.round(baselineWeeklyMinutes),
    rampRatio: round(rampRatio),
    overloadWeeks,
  };
}

export function buildLoadManagement(
  state: UserState,
  plan: TrainingPlanSettings,
  forecast: TrainingPlanForecast | undefined = undefined,
  now = new Date(),
): LoadManagementInsight {
  const planForecast =
    forecast ??
    buildTrainingPlanForecast(
      state,
      plan,
      now,
    );
  const metrics = recommendedStatus(planForecast);
  const automaticEnabled = plan.autoRecovery !== false;
  const manualActive = manualRecoveryActive(plan, now);

  const appliedMode: LoadManagementStatus =
    manualActive
      ? "recovery"
      : automaticEnabled
        ? metrics.recommendation
        : "normal";

  const loadMultiplier =
    appliedMode === "recovery"
      ? .85
      : appliedMode === "watch"
        ? .95
        : 1;

  const nominalFloor = plan.weeklyMinutes * .7;
  const managedWeeklyMinutes = Math.max(
    Math.round(nominalFloor / 5) * 5,
    Math.round(
      planForecast.recalibration.effectiveWeeklyMinutes *
        loadMultiplier /
        5,
    ) * 5,
  );

  const active = appliedMode !== "normal";
  const maxSessionMinutes =
    appliedMode === "recovery"
      ? 25
      : appliedMode === "watch"
        ? 40
        : 60;

  const reason =
    manualActive
      ? "Manual recovery week is active. P23 temporarily reduces weekly load and de-emphasizes new or optional work while preserving retention and repair."
      : !automaticEnabled && metrics.recommendation !== "normal"
        ? `P23 recommends ${metrics.recommendation} load management from recent training history, but automatic recovery is disabled.`
        : metrics.recommendation === "recovery"
          ? `Recent load is elevated: ${metrics.overloadWeeks} of the last 3 full weeks exceeded 110% of target, with a ${metrics.rampRatio}× latest-week ramp versus the prior baseline. P23 applies a temporary recovery load.`
          : metrics.recommendation === "watch"
            ? `Recent training load is elevated but does not yet justify a recovery week. P23 limits optional load growth and keeps sessions shorter while more evidence arrives.`
            : planForecast.adherence.comparableWeeks < 3
              ? "P23 is collecting full-week history before making automatic load-management changes."
              : "Recent training volume is within the sustainable range; no recovery adjustment is needed.";

  return {
    recommendation: metrics.recommendation,
    appliedMode,
    automaticEnabled,
    manualRecoveryActive: manualActive,
    active,
    evidenceWeeks: planForecast.adherence.comparableWeeks,
    confidence: planForecast.adherence.confidence,
    latestWeekMinutes: metrics.latestWeekMinutes,
    recentActiveDays: metrics.recentActiveDays,
    baselineWeeklyMinutes: metrics.baselineWeeklyMinutes,
    rampRatio: metrics.rampRatio,
    overloadWeeks: metrics.overloadWeeks,
    loadMultiplier,
    managedWeeklyMinutes,
    maxSessionMinutes,
    bucketMultipliers: bucketMultipliers(appliedMode),
    reason,
  };
}

export function recoveryUntil(
  now = new Date(),
) {
  return new Date(
    now.getTime() + 7 * DAY,
  ).toISOString();
}
