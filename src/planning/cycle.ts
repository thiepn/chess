import type {
  CompetitionPlanSettings,
  TrainingBudgetBucket,
  TrainingPlanSettings,
  UserState,
} from "../domain/types";
import type {
  CompetitionCycleInsight,
  CompetitionCyclePhase,
  LoadManagementInsight,
  PeakReadinessStatus,
  TrainingPlanForecast,
} from "./types";

const DAY = 86_400_000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundToFive(value: number) {
  return Math.round(value / 5) * 5;
}

function normalizedUtcDay(value: Date) {
  const result = new Date(value);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function eventDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? undefined
    : parsed;
}

export function defaultCompetitionPlan(): CompetitionPlanSettings {
  return {
    enabled: false,
    eventDate: "",
    prepWeeks: 6,
    resetDays: 5,
  };
}

export function competitionPlanForState(
  state: UserState,
): CompetitionPlanSettings {
  const stored = state.trainingPlan?.competition;
  const fallback = defaultCompetitionPlan();
  if (!stored) return fallback;

  const prepWeeks =
    stored.prepWeeks === 4 ||
    stored.prepWeeks === 6 ||
    stored.prepWeeks === 8 ||
    stored.prepWeeks === 12
      ? stored.prepWeeks
      : fallback.prepWeeks;
  const resetDays =
    stored.resetDays === 3 ||
    stored.resetDays === 5 ||
    stored.resetDays === 7
      ? stored.resetDays
      : fallback.resetDays;

  return {
    enabled: stored.enabled,
    eventDate: stored.eventDate ?? "",
    prepWeeks,
    resetDays,
    ...(stored.label?.trim()
      ? { label: stored.label.trim() }
      : {}),
  };
}

function phaseFor(
  settings: CompetitionPlanSettings,
  now: Date,
): {
  phase: CompetitionCyclePhase;
  event?: Date;
  start?: Date;
  daysToEvent?: number;
  daysFromEvent?: number;
} {
  if (!settings.enabled) {
    return { phase: "off" };
  }

  const event = eventDate(settings.eventDate);
  if (!event) {
    return { phase: "off" };
  }

  const today = normalizedUtcDay(now);
  const start = new Date(
    event.getTime() -
      settings.prepWeeks * 7 * DAY,
  );
  const dayDelta = Math.round(
    (event.getTime() - today.getTime()) /
      DAY,
  );

  if (today.getTime() < start.getTime()) {
    return {
      phase: "pre-cycle",
      event,
      start,
      daysToEvent: dayDelta,
    };
  }

  if (dayDelta > 35) {
    return {
      phase: "base",
      event,
      start,
      daysToEvent: dayDelta,
    };
  }
  if (dayDelta > 14) {
    return {
      phase: "build",
      event,
      start,
      daysToEvent: dayDelta,
    };
  }
  if (dayDelta > 5) {
    return {
      phase: "sharpen",
      event,
      start,
      daysToEvent: dayDelta,
    };
  }
  if (dayDelta > 0) {
    return {
      phase: "taper",
      event,
      start,
      daysToEvent: dayDelta,
    };
  }
  if (dayDelta === 0) {
    return {
      phase: "event",
      event,
      start,
      daysToEvent: 0,
      daysFromEvent: 0,
    };
  }

  const daysFromEvent = Math.abs(dayDelta);
  if (daysFromEvent <= settings.resetDays) {
    return {
      phase: "reset",
      event,
      start,
      daysFromEvent,
    };
  }

  return {
    phase: "complete",
    event,
    start,
    daysFromEvent,
  };
}

function phaseLabel(phase: CompetitionCyclePhase) {
  const labels: Record<CompetitionCyclePhase, string> = {
    off: "No event cycle",
    "pre-cycle": "Pre-cycle",
    base: "Base block",
    build: "Build block",
    sharpen: "Sharpen block",
    taper: "Taper",
    event: "Event day",
    reset: "Post-event reset",
    complete: "Cycle complete",
  };
  return labels[phase];
}

function baseBucketMultipliers(
  phase: CompetitionCyclePhase,
): Record<TrainingBudgetBucket, number> {
  switch (phase) {
    case "base":
      return {
        retention: 1,
        repair: 1,
        course: 1.08,
        transfer: .96,
        repertoire: 1,
        exploration: 1.02,
      };
    case "build":
      return {
        retention: 1,
        repair: 1.08,
        course: 1,
        transfer: 1.08,
        repertoire: 1.04,
        exploration: .92,
      };
    case "sharpen":
      return {
        retention: 1.04,
        repair: 1.12,
        course: .9,
        transfer: 1.12,
        repertoire: 1.1,
        exploration: .7,
      };
    case "taper":
      return {
        retention: 1.08,
        repair: 1.05,
        course: .72,
        transfer: .9,
        repertoire: 1.1,
        exploration: .55,
      };
    case "event":
      return {
        retention: 1.08,
        repair: 1,
        course: .55,
        transfer: .7,
        repertoire: 1.1,
        exploration: .4,
      };
    case "reset":
      return {
        retention: 1.04,
        repair: .96,
        course: .65,
        transfer: .65,
        repertoire: .85,
        exploration: .55,
      };
    default:
      return {
        retention: 1,
        repair: 1,
        course: 1,
        transfer: 1,
        repertoire: 1,
        exploration: 1,
      };
  }
}

function weeklyLoadMultiplier(
  phase: CompetitionCyclePhase,
) {
  const values: Record<CompetitionCyclePhase, number> = {
    off: 1,
    "pre-cycle": 1,
    base: 1,
    build: 1,
    sharpen: .95,
    taper: .82,
    event: .7,
    reset: .75,
    complete: 1,
  };
  return values[phase];
}

function phaseSessionCap(
  phase: CompetitionCyclePhase,
) {
  const values: Record<CompetitionCyclePhase, number> = {
    off: 60,
    "pre-cycle": 60,
    base: 60,
    build: 60,
    sharpen: 40,
    taper: 25,
    event: 15,
    reset: 20,
    complete: 60,
  };
  return values[phase];
}

function readiness(
  forecast: TrainingPlanForecast,
  load: LoadManagementInsight,
  phase: CompetitionCyclePhase,
) {
  const adherenceScore =
    forecast.adherence.comparableWeeks >= 2
      ? clamp(
          forecast.adherence.averageAdherence,
          0,
          100,
        )
      : 60;
  const consistencyScore =
    forecast.adherence.comparableWeeks >= 2
      ? forecast.adherence.consistency
      : 60;
  const forecastScore =
    forecast.forecast.status === "ahead"
      ? 95
      : forecast.forecast.status === "on-track"
        ? 88
        : forecast.forecast.status === "at-risk"
          ? 55
          : 60;
  const loadScore =
    load.appliedMode === "normal"
      ? 95
      : load.appliedMode === "watch"
        ? 75
        : 50;
  const score = Math.round(
    adherenceScore * .35 +
      consistencyScore * .2 +
      forecastScore * .25 +
      loadScore * .2,
  );
  const confidence = Math.round(
    (
      forecast.adherence.confidence +
      forecast.forecast.confidence
    ) / 2,
  );

  let status: PeakReadinessStatus =
    confidence < 35 ||
    phase === "off" ||
    phase === "pre-cycle"
      ? "insufficient"
      : score >= 85
        ? "ready"
        : score >= 70
          ? "building"
          : "at-risk";

  if (
    (phase === "taper" || phase === "event") &&
    load.appliedMode === "recovery"
  ) {
    status = "at-risk";
  }

  return { score, confidence, status };
}

function reasonFor(
  phase: CompetitionCyclePhase,
  daysToEvent: number | undefined,
  daysFromEvent: number | undefined,
  readinessStatus: PeakReadinessStatus,
  suppressedByRecovery: boolean,
) {
  if (phase === "off") {
    return "No valid competition date is active, so normal P21–P23 planning remains in control.";
  }
  if (phase === "pre-cycle") {
    return `The event cycle has not started yet. Base planning continues until the selected preparation window opens.`;
  }
  if (suppressedByRecovery) {
    return `P23 recovery is active, so P24 shows the ${phaseLabel(phase).toLowerCase()} but suppresses any competition-driven intensity increase.`;
  }
  if (phase === "base") {
    return `${daysToEvent ?? 0} days remain. Build broad capacity and course depth before event-specific work becomes dominant.`;
  }
  if (phase === "build") {
    return `${daysToEvent ?? 0} days remain. Shift more work toward recurring repairs, resistant play and repertoire stability.`;
  }
  if (phase === "sharpen") {
    return `${daysToEvent ?? 0} days remain. Reduce broad new material and prioritize game-like transfer, repair and opening recall.`;
  }
  if (phase === "taper") {
    return `${daysToEvent ?? 0} day(s) remain. Lower volume, keep recall sharp and avoid creating unnecessary new learning debt. Preparation readiness is ${readinessStatus}.`;
  }
  if (phase === "event") {
    return "Event day: keep training minimal and familiar. The planner avoids heavy course or exploratory work.";
  }
  if (phase === "reset") {
    return `${daysFromEvent ?? 0} day(s) after the event. Use a short reset block before normal progression resumes.`;
  }
  return "The configured competition cycle is complete. Normal planning can resume or a new event can be scheduled.";
}

export function buildCompetitionCycle(
  state: UserState,
  plan: TrainingPlanSettings,
  forecast: TrainingPlanForecast,
  load: LoadManagementInsight,
  now = new Date(),
): CompetitionCycleInsight {
  const settings = competitionPlanForState(state);
  const timing = phaseFor(settings, now);
  const rawMultipliers = baseBucketMultipliers(
    timing.phase,
  );
  const suppressedByRecovery =
    load.appliedMode === "recovery" &&
    Object.values(rawMultipliers).some(
      (value) => value > 1,
    );
  const bucketMultipliers =
    load.appliedMode === "recovery"
      ? Object.fromEntries(
          Object.entries(rawMultipliers).map(
            ([key, value]) => [
              key,
              Math.min(1, value),
            ],
          ),
        ) as Record<TrainingBudgetBucket, number>
      : rawMultipliers;
  const loadMultiplier =
    weeklyLoadMultiplier(timing.phase);
  const managedWeeklyMinutes = Math.max(
    roundToFive(plan.weeklyMinutes * .7),
    roundToFive(
      load.managedWeeklyMinutes *
        loadMultiplier,
    ),
  );
  const maxSessionMinutes = Math.min(
    load.maxSessionMinutes,
    phaseSessionCap(timing.phase),
  );
  const peak = readiness(
    forecast,
    load,
    timing.phase,
  );
  const active = ![
    "off",
    "pre-cycle",
    "complete",
  ].includes(timing.phase);

  return {
    enabled: settings.enabled,
    active,
    phase: timing.phase,
    phaseLabel: phaseLabel(timing.phase),
    ...(timing.event
      ? {
          eventDate: timing.event
            .toISOString()
            .slice(0, 10),
        }
      : {}),
    ...(settings.label
      ? { eventLabel: settings.label }
      : {}),
    ...(timing.start
      ? {
          cycleStart: timing.start
            .toISOString()
            .slice(0, 10),
        }
      : {}),
    ...(timing.daysToEvent !== undefined
      ? { daysToEvent: timing.daysToEvent }
      : {}),
    ...(timing.daysFromEvent !== undefined
      ? { daysFromEvent: timing.daysFromEvent }
      : {}),
    readinessScore: peak.score,
    readinessStatus: peak.status,
    readinessConfidence: peak.confidence,
    weeklyLoadMultiplier: loadMultiplier,
    maxSessionMinutes,
    managedWeeklyMinutes,
    bucketMultipliers,
    suppressedByRecovery,
    reason: reasonFor(
      timing.phase,
      timing.daysToEvent,
      timing.daysFromEvent,
      peak.status,
      suppressedByRecovery,
    ),
  };
}
