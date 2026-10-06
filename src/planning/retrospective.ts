import { skillById } from "../domain/curriculum";
import type {
  CompetitionPlanSettings,
  UserState,
} from "../domain/types";
import type { ImportedGame } from "../games/types";
import type {
  EventPerformanceSummary,
  EventRepairPriority,
  EventRetrospectiveInsight,
  EventTranslationStatus,
} from "./types";

const DAY = 86_400_000;
const FOLLOW_UP_DAYS = 14;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizedDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value.replace(/\./g, "-");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return undefined;
  }
  if (normalized.includes("?")) {
    return undefined;
  }
  const date = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

function gamePlayedAt(game: ImportedGame) {
  if (game.date) {
    return parseDate(game.date);
  }
  return parseDate(
    game.importedAt.slice(0, 10),
  );
}

function humanOrImportedGame(game: ImportedGame) {
  return game.source !== "training";
}

function gamesBetween(
  games: ImportedGame[],
  start: Date,
  endExclusive: Date,
) {
  return games.filter((game) => {
    if (!humanOrImportedGame(game)) return false;
    const playedAt = gamePlayedAt(game);
    if (!playedAt) return false;
    return (
      playedAt.getTime() >= start.getTime() &&
      playedAt.getTime() < endExclusive.getTime()
    );
  });
}

function summary(
  games: ImportedGame[],
): EventPerformanceSummary {
  const analyzed = games.filter(
    (game) => game.practicalMetrics,
  );
  return {
    games: games.length,
    analyzedGames: analyzed.length,
    quality: Math.round(
      average(
        analyzed.map(
          (game) =>
            game.practicalMetrics?.qualityScore ?? 0,
        ),
      ),
    ),
    resultPerformance: Math.round(
      average(
        analyzed.map(
          (game) =>
            game.practicalMetrics?.resultScore ?? 0,
        ),
      ),
    ),
    averageCentipawnLoss: Math.round(
      average(
        analyzed.map(
          (game) =>
            game.practicalMetrics
              ?.averageCentipawnLoss ?? 0,
        ),
      ),
    ),
    criticalErrorRate: Math.round(
      average(
        analyzed.map(
          (game) =>
            game.practicalMetrics
              ?.criticalErrorRate ?? 0,
        ),
      ) * 10,
    ) / 10,
    blunderRate: Math.round(
      average(
        analyzed.map(
          (game) =>
            game.practicalMetrics?.blunderRate ?? 0,
        ),
      ) * 10,
    ) / 10,
  };
}

function translationStatus(
  event: EventPerformanceSummary,
  preparation: EventPerformanceSummary,
): EventTranslationStatus {
  if (
    event.analyzedGames < 2 ||
    preparation.analyzedGames < 3
  ) {
    return "insufficient";
  }

  const qualityDelta =
    event.quality - preparation.quality;
  const errorDelta =
    event.criticalErrorRate -
    preparation.criticalErrorRate;

  if (qualityDelta >= 6 && errorDelta <= 1) {
    return "improved";
  }
  if (qualityDelta <= -6 || errorDelta >= 4) {
    return "regressed";
  }
  return "stable";
}

function repairPriorities(
  state: UserState,
  eventGameIds: string[],
): EventRepairPriority[] {
  const eventIds = new Set(eventGameIds);
  const grouped = new Map<
    string,
    {
      occurrences: number;
      gameIds: Set<string>;
      impact: number;
    }
  >();

  for (const mistake of state.mistakes ?? []) {
    if (!eventIds.has(mistake.gameId)) continue;

    for (const skillId of mistake.skillIds) {
      const current = grouped.get(skillId) ?? {
        occurrences: 0,
        gameIds: new Set<string>(),
        impact: 0,
      };
      current.occurrences += 1;
      current.gameIds.add(mistake.gameId);
      current.impact += mistake.centipawnLoss;
      grouped.set(skillId, current);
    }
  }

  return [...grouped.entries()]
    .map(([skillId, item]) => ({
      skillId,
      label:
        skillById[skillId]?.title ??
        skillId.replaceAll(".", " "),
      occurrences: item.occurrences,
      games: item.gameIds.size,
      averageImpact: Math.round(
        item.impact /
          Math.max(1, item.occurrences),
      ),
    }))
    .sort(
      (a, b) =>
        b.games - a.games ||
        b.occurrences - a.occurrences ||
        b.averageImpact - a.averageImpact,
    )
    .slice(0, 5);
}

function strengthSkills(
  eventGames: ImportedGame[],
  repair: EventRepairPriority[],
) {
  const repairIds = new Set(
    repair.map((item) => item.skillId),
  );
  const grouped = new Map<
    string,
    { occurrences: number; loss: number }
  >();

  for (const game of eventGames) {
    for (
      const validation of
      game.practicalMetrics?.skillValidations ?? []
    ) {
      if (repairIds.has(validation.skillId)) {
        continue;
      }
      const current = grouped.get(
        validation.skillId,
      ) ?? {
        occurrences: 0,
        loss: 0,
      };
      current.occurrences +=
        validation.occurrences;
      current.loss +=
        validation.averageCentipawnLoss *
        validation.occurrences;
      grouped.set(validation.skillId, current);
    }
  }

  return [...grouped.entries()]
    .map(([skillId, item]) => ({
      skillId,
      occurrences: item.occurrences,
      averageLoss:
        item.loss /
        Math.max(1, item.occurrences),
    }))
    .filter(
      (item) =>
        item.occurrences >= 2 &&
        item.averageLoss <= 45,
    )
    .sort(
      (a, b) =>
        b.occurrences - a.occurrences ||
        a.averageLoss - b.averageLoss,
    )
    .slice(0, 3)
    .map((item) => item.skillId);
}

function emptySummary(): EventPerformanceSummary {
  return {
    games: 0,
    analyzedGames: 0,
    quality: 0,
    resultPerformance: 0,
    averageCentipawnLoss: 0,
    criticalErrorRate: 0,
    blunderRate: 0,
  };
}

export function buildEventRetrospective(
  state: UserState,
  plan: CompetitionPlanSettings,
  now = new Date(),
): EventRetrospectiveInsight {
  if (!plan.enabled) {
    return {
      available: false,
      eventGameIds: [],
      preparationGameIds: [],
      event: emptySummary(),
      preparation: emptySummary(),
      translationStatus: "insufficient",
      qualityDelta: 0,
      resultDelta: 0,
      errorRateDelta: 0,
      repairPriorities: [],
      strengthSkillIds: [],
      followUpActive: false,
      priorityMultiplier: 1,
      reason:
        "Enable a competition cycle to create an event retrospective.",
    };
  }

  const eventStart = parseDate(plan.eventDate);
  if (!eventStart) {
    return {
      available: false,
      eventGameIds: [],
      preparationGameIds: [],
      event: emptySummary(),
      preparation: emptySummary(),
      translationStatus: "insufficient",
      qualityDelta: 0,
      resultDelta: 0,
      errorRateDelta: 0,
      repairPriorities: [],
      strengthSkillIds: [],
      followUpActive: false,
      priorityMultiplier: 1,
      reason:
        "Set a valid event date before P25 can match event games.",
    };
  }

  const eventDays = plan.eventDays ?? 1;
  const eventEndExclusive = new Date(
    eventStart.getTime() + eventDays * DAY,
  );
  const cycleStart = new Date(
    eventStart.getTime() -
      plan.prepWeeks * 7 * DAY,
  );
  const eventGames = gamesBetween(
    state.games ?? [],
    eventStart,
    eventEndExclusive,
  );
  const preparationGames = gamesBetween(
    state.games ?? [],
    cycleStart,
    eventStart,
  ).slice(-12);

  const event = summary(eventGames);
  const preparation = summary(preparationGames);
  const repair = repairPriorities(
    state,
    eventGames.map((game) => game.id),
  );
  const strengths = strengthSkills(
    eventGames,
    repair,
  );
  const status = translationStatus(
    event,
    preparation,
  );
  const eventEnd = new Date(
    eventEndExclusive.getTime() - DAY,
  );
  const followUpUntil = new Date(
    eventEnd.getTime() +
      FOLLOW_UP_DAYS * DAY,
  );
  const today = normalizedDay(now);
  const followUpActive =
    today.getTime() > eventEnd.getTime() &&
    today.getTime() <=
      followUpUntil.getTime() &&
    repair.length > 0;
  const note = (
    state.competitionRetrospectives ?? []
  ).find(
    (item) =>
      item.eventDate === plan.eventDate,
  );

  const reason =
    event.games === 0
      ? "No imported games fall inside the configured event window yet."
      : event.analyzedGames === 0
        ? `${event.games} event game(s) are matched, but analysis is still required before P25 can evaluate transfer.`
        : status === "insufficient"
          ? `P25 matched ${event.analyzedGames} analyzed event game(s). At least 2 event games and 3 preparation games are required for a before→event transfer conclusion.`
          : status === "improved"
            ? "Event play transferred better than the preparation-game baseline. Preserve the strongest stable behaviors and repair only recurring event-specific leaks."
            : status === "regressed"
              ? "Event performance fell below the preparation baseline. Prioritize recurring event mistakes during the post-event learning window."
              : "Event performance was broadly consistent with the preparation baseline. Use recurring event mistakes to decide the next cycle's targeted improvements.";

  return {
    available: event.games > 0,
    eventDate: plan.eventDate,
    eventEndDate:
      eventEnd.toISOString().slice(0, 10),
    ...(plan.label
      ? { eventLabel: plan.label }
      : {}),
    eventGameIds: eventGames.map(
      (game) => game.id,
    ),
    preparationGameIds:
      preparationGames.map(
        (game) => game.id,
      ),
    event,
    preparation,
    translationStatus: status,
    qualityDelta:
      event.quality - preparation.quality,
    resultDelta:
      event.resultPerformance -
      preparation.resultPerformance,
    errorRateDelta:
      Math.round(
        (
          event.criticalErrorRate -
          preparation.criticalErrorRate
        ) * 10,
      ) / 10,
    repairPriorities: repair,
    strengthSkillIds: strengths,
    followUpActive,
    ...(followUpActive
      ? {
          followUpUntil:
            followUpUntil
              .toISOString()
              .slice(0, 10),
        }
      : {}),
    priorityMultiplier:
      followUpActive ? 1.14 : 1,
    ...(note
      ? {
          note: {
            ...(note.whatWorked
              ? {
                  whatWorked:
                    note.whatWorked,
                }
              : {}),
            ...(note.whatFailed
              ? {
                  whatFailed:
                    note.whatFailed,
                }
              : {}),
            ...(note.nextCycleFocus
              ? {
                  nextCycleFocus:
                    note.nextCycleFocus,
                }
              : {}),
            updatedAt: note.updatedAt,
          },
        }
      : {}),
    reason,
  };
}
