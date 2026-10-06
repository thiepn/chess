import {
  curriculumStages,
  skillById,
  skills,
} from "../domain/curriculum";
import { retentionProbability } from "../domain/mastery";
import { timeControlWeight } from "../games/practical";
import type { CurriculumStageId, UserState } from "../domain/types";
import type {
  AnalyticsIntervention,
  CalibrationInsight,
  InterventionInsight,
  LearningAnalyticsEvent,
  ProgressIntelligence,
  SkillTrendInsight,
  StageVelocityInsight,
  TrendPoint,
} from "./types";

const DAY = 86_400_000;

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function latestEventAtOrBefore(
  events: LearningAnalyticsEvent[],
  skillId: string,
  cutoff: number,
) {
  let latest: LearningAnalyticsEvent | undefined;

  for (const event of events) {
    if (event.skillId !== skillId) continue;
    const time = new Date(event.occurredAt).getTime();
    if (time > cutoff) continue;
    if (!latest || event.occurredAt > latest.occurredAt) latest = event;
  }

  return latest;
}

function analyticsMasteryAt(
  state: UserState,
  cutoff: number,
) {
  const events = state.analytics?.events ?? [];
  const values: number[] = [];

  for (const skill of skills) {
    const event = latestEventAtOrBefore(events, skill.id, cutoff);
    if (event) values.push(event.masteryAfter);
  }

  return values.length ? average(values) : 0;
}

function humanTransferForMastery(
  mastery: UserState["mastery"][string],
) {
  return Math.max(
    mastery.humanGameRecognition ?? 0,
    mastery.humanGameExecution ?? 0,
  );
}

function aiTransferForMastery(
  mastery: UserState["mastery"][string],
) {
  return Math.max(
    mastery.trainingTransfer,
    mastery.aiGameTransfer ?? 0,
  );
}

function humanTransferNow(state: UserState) {
  const values = Object.values(state.mastery)
    .filter((mastery) => (mastery.humanGameAttempts ?? 0) > 0)
    .map(humanTransferForMastery);
  return average(values);
}

function aiTransferNow(state: UserState) {
  const values = Object.values(state.mastery)
    .filter(
      (mastery) =>
        mastery.attempts > 0 &&
        (mastery.trainingTransfer > 0 ||
          (mastery.aiGameAttempts ?? 0) > 0),
    )
    .map(aiTransferForMastery);
  return average(values);
}

function transferNow(state: UserState) {
  const values = Object.values(state.mastery)
    .filter((mastery) => mastery.attempts > 0)
    .map((mastery) =>
      Math.max(
        aiTransferForMastery(mastery),
        humanTransferForMastery(mastery),
        mastery.realGameRecognition,
        mastery.realGameExecution,
      ),
    );

  return average(values);
}

function practicalStrengthInsight(state: UserState) {
  const humanGames = [...(state.games ?? [])]
    .filter(
      (game) =>
        game.source === "lichess" &&
        Boolean(game.practicalMetrics),
    )
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt))
    .slice(0, 20);

  const mastery = currentMastery(state);
  const humanTransfer = humanTransferNow(state);
  const aiTransfer = aiTransferNow(state);

  const weighted = humanGames.map((game) => ({
    game,
    weight:
      timeControlWeight(game.timeControlCategory) *
      (game.rated === false ? .9 : 1),
  }));
  const totalWeight = weighted.reduce(
    (sum, item) => sum + item.weight,
    0,
  );

  const quality = totalWeight
    ? weighted.reduce(
        (sum, item) =>
          sum +
          (item.game.practicalMetrics?.qualityScore ?? 0) *
            item.weight,
        0,
      ) / totalWeight
    : 0;

  const qualityValues = humanGames.map(
    (game) => game.practicalMetrics?.qualityScore ?? 0,
  );
  const qualityMean = average(qualityValues);
  const deviation = qualityValues.length
    ? Math.sqrt(
        average(
          qualityValues.map(
            (value) => (value - qualityMean) ** 2,
          ),
        ),
      )
    : 0;
  const consistency = humanGames.length
    ? Math.max(0, 100 - deviation * 2.2)
    : 0;

  const resultPerformance = humanGames.length
    ? average(
        humanGames.map((game) => {
          const base = game.practicalMetrics?.resultScore ?? 50;
          const ratingAdjustment =
            game.opponentRating && game.playerRating
              ? Math.max(
                  -12,
                  Math.min(
                    12,
                    (game.opponentRating - game.playerRating) * .04,
                  ),
                )
              : 0;
          return Math.max(0, Math.min(100, base + ratingAdjustment));
        }),
      )
    : 0;

  const opponentRatings = humanGames
    .map((game) => game.opponentRating)
    .filter((value): value is number => typeof value === "number");

  const humanScore = humanGames.length
    ? mastery * .3 +
      humanTransfer * .25 +
      quality * .25 +
      consistency * .1 +
      resultPerformance * .1
    : mastery * .65 + aiTransfer * .35;

  const rating = Math.round(
    Math.max(500, Math.min(2000, 500 + humanScore * 15)),
  );

  const humanEvidenceCount = Object.values(state.mastery).reduce(
    (sum, item) => sum + (item.humanGameAttempts ?? 0),
    0,
  );
  const confidence = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        humanGames.length * 7 + Math.min(30, humanEvidenceCount * 1.5),
      ),
    ),
  );

  const grouped = new Map<
    string,
    { games: number; qualityTotal: number }
  >();
  for (const game of humanGames) {
    const category = game.timeControlCategory ?? "unknown";
    const current = grouped.get(category) ?? {
      games: 0,
      qualityTotal: 0,
    };
    current.games += 1;
    current.qualityTotal +=
      game.practicalMetrics?.qualityScore ?? 0;
    grouped.set(category, current);
  }

  return {
    rating,
    confidence,
    status:
      humanGames.length >= 10
        ? ("established" as const)
        : humanGames.length >= 3
          ? ("developing" as const)
          : ("provisional" as const),
    humanGames: humanGames.length,
    quality: Math.round(quality),
    consistency: Math.round(consistency),
    resultPerformance: Math.round(resultPerformance),
    humanTransfer: Math.round(humanTransfer),
    aiTransfer: Math.round(aiTransfer),
    averageOpponentRating: opponentRatings.length
      ? Math.round(average(opponentRatings))
      : undefined,
    timeControls: [...grouped.entries()]
      .map(([category, item]) => ({
        category,
        games: item.games,
        quality: Math.round(
          item.qualityTotal / Math.max(1, item.games),
        ),
      }))
      .sort((a, b) => b.games - a.games),
  };
}

function retentionNow(state: UserState, now: Date) {
  const values = Object.values(state.mastery)
    .filter((mastery) => mastery.attempts > 0)
    .map((mastery) => retentionProbability(mastery, now) * 100);

  return average(values);
}

function currentMastery(state: UserState) {
  const values = Object.values(state.mastery)
    .filter((mastery) => mastery.attempts > 0)
    .map((mastery) => mastery.effectiveMastery);

  return average(values);
}

function calibrationInsight(
  events: LearningAnalyticsEvent[],
): CalibrationInsight {
  const samples = events.filter(
    (event) =>
      event.kind === "evidence" &&
      (event.evidenceSource === "checkpoint" ||
        event.evidenceSource === "diagnostic") &&
      typeof event.success === "boolean",
  );

  if (samples.length < 5) {
    return {
      score: 0,
      sampleCount: samples.length,
      bias: 0,
      label: "insufficient",
    };
  }

  const brier = average(
    samples.map((event) => {
      const predicted = event.masteryBefore / 100;
      const actual = event.success ? 1 : 0;
      return (predicted - actual) ** 2;
    }),
  );

  const bias = average(
    samples.map(
      (event) =>
        event.masteryBefore - (event.success ? 100 : 0),
    ),
  );

  const score = Math.max(0, Math.min(100, 100 * (1 - brier)));

  return {
    score: Math.round(score),
    sampleCount: samples.length,
    bias: Math.round(bias),
    label:
      Math.abs(bias) <= 12
        ? "well-calibrated"
        : bias > 12
          ? "overconfident"
          : "underconfident",
  };
}

function interventionInsights(
  events: LearningAnalyticsEvent[],
  cutoff: number,
): InterventionInsight[] {
  const recent = events.filter(
    (event) =>
      event.kind === "evidence" &&
      new Date(event.occurredAt).getTime() >= cutoff &&
      event.intervention &&
      !["placement", "checkpoint", "game-review"].includes(
        event.intervention,
      ),
  );
  const grouped = new Map<AnalyticsIntervention, LearningAnalyticsEvent[]>();

  for (const event of recent) {
    if (!event.intervention) continue;
    grouped.set(event.intervention, [
      ...(grouped.get(event.intervention) ?? []),
      event,
    ]);
  }

  return [...grouped.entries()]
    .map(([intervention, items]) => {
      const successRate =
        (items.filter((item) => item.success).length / items.length) * 100;
      const masteryGain = average(
        items.map((item) => item.masteryAfter - item.masteryBefore),
      );
      const retentionGain = average(
        items.map((item) => item.retentionAfter - item.retentionBefore),
      );
      const sampleFactor = Math.min(1, items.length / 8);
      const score =
        (successRate * .45 +
          Math.max(0, masteryGain) * 8 * .35 +
          Math.max(0, retentionGain) * 5 * .2) *
        (.55 + .45 * sampleFactor);

      return {
        intervention,
        attempts: items.length,
        successRate: Math.round(successRate),
        averageMasteryGain: round(masteryGain),
        averageRetentionGain: round(retentionGain),
        score: Math.round(Math.max(0, Math.min(100, score))),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function stageVelocityInsights(
  state: UserState,
  now: Date,
): StageVelocityInsight[] {
  const events = state.analytics?.events ?? [];

  return curriculumStages.map((stage) => {
    const stageEvents = events.filter(
      (event) => event.stageId === stage.id,
    );
    const startedAt = stageEvents[0]?.occurredAt;
    const certification = state.stageCertifications?.[stage.id];
    const certifiedAt = certification?.passedAt;
    const start = startedAt
      ? new Date(startedAt).getTime()
      : now.getTime();
    const end = certifiedAt
      ? new Date(certifiedAt).getTime()
      : now.getTime();

    const stageMasteries = skills
      .filter((skill) => skill.stage === stage.id)
      .map((skill) => state.mastery[skill.id])
      .filter(Boolean);

    return {
      stageId: stage.id,
      startedAt,
      certifiedAt,
      days: startedAt
        ? Math.max(0, Math.round((end - start) / DAY))
        : 0,
      evidenceCount: stageEvents.filter(
        (event) => event.kind === "evidence",
      ).length,
      mastery: Math.round(
        average(stageMasteries.map((item) => item.effectiveMastery)),
      ),
      retention: Math.round(
        average(stageMasteries.map((item) => item.delayedRetention)),
      ),
      transfer: Math.round(
        average(
          stageMasteries.map((item) =>
            Math.max(
              aiTransferForMastery(item),
              humanTransferForMastery(item),
              item.realGameRecognition,
              item.realGameExecution,
            ),
          ),
        ),
      ),
    };
  });
}

function skillTrendInsights(
  state: UserState,
  now: Date,
): SkillTrendInsight[] {
  const events = state.analytics?.events ?? [];
  const cutoff = now.getTime() - 30 * DAY;

  return skills
    .map((skill) => {
      const mastery = state.mastery[skill.id];
      if (!mastery?.attempts) return null;

      const previous = latestEventAtOrBefore(
        events,
        skill.id,
        cutoff,
      );
      const recentEvents = events.filter(
        (event) =>
          event.kind === "evidence" &&
          event.skillId === skill.id &&
          new Date(event.occurredAt).getTime() >= cutoff,
      );

      return {
        skillId: skill.id,
        current: Math.round(mastery.effectiveMastery),
        delta30: round(
          mastery.effectiveMastery -
            (previous?.masteryAfter ?? mastery.effectiveMastery),
        ),
        retention: Math.round(
          retentionProbability(mastery, now) * 100,
        ),
        transfer: Math.round(
          Math.max(
            aiTransferForMastery(mastery),
            humanTransferForMastery(mastery),
            mastery.realGameRecognition,
            mastery.realGameExecution,
          ),
        ),
        humanTransfer: Math.round(
          humanTransferForMastery(mastery),
        ),
        aiTransfer: Math.round(
          aiTransferForMastery(mastery),
        ),
        evidenceCount30: recentEvents.length,
      };
    })
    .filter((item): item is SkillTrendInsight => Boolean(item));
}

function trendPoints(
  state: UserState,
  now: Date,
): TrendPoint[] {
  const events = state.analytics?.events ?? [];
  const points: TrendPoint[] = [];

  for (let index = 7; index >= 0; index -= 1) {
    const end = new Date(
      now.getTime() - index * 7 * DAY,
    );
    const cutoff = end.getTime();
    const windowStart = cutoff - 7 * DAY;

    const values = skills
      .map((skill) =>
        latestEventAtOrBefore(events, skill.id, cutoff),
      )
      .filter(Boolean) as LearningAnalyticsEvent[];

    const evidenceCount = events.filter((event) => {
      const time = new Date(event.occurredAt).getTime();
      return (
        event.kind === "evidence" &&
        time > windowStart &&
        time <= cutoff
      );
    }).length;

    points.push({
      label: end.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      at: end.toISOString(),
      mastery: Math.round(
        average(values.map((event) => event.masteryAfter)),
      ),
      retention: Math.round(
        average(values.map((event) => event.retentionAfter)),
      ),
      transfer: Math.round(
        average(values.map((event) => event.transferAfter)),
      ),
      evidenceCount,
    });
  }

  return points;
}

export function buildProgressIntelligence(
  state: UserState,
  now = new Date(),
): ProgressIntelligence {
  const events = state.analytics?.events ?? [];
  const evidenceEvents = events.filter(
    (event) => event.kind === "evidence",
  );
  const cutoff30 = now.getTime() - 30 * DAY;
  const cutoff28 = now.getTime() - 28 * DAY;
  const pastMastery = analyticsMasteryAt(state, cutoff30);
  const mastery = currentMastery(state);
  const skillTrends = skillTrendInsights(state, now);

  const activeDays = new Set(
    evidenceEvents
      .filter(
        (event) =>
          new Date(event.occurredAt).getTime() >= cutoff28,
      )
      .map((event) => event.occurredAt.slice(0, 10)),
  ).size;

  const recurringWeaknesses = [...state.weaknesses]
    .filter(
      (weakness) =>
        weakness.recurrence >= .45 ||
        weakness.frequency >= .45,
    )
    .sort(
      (a, b) =>
        b.recurrence * b.gameImpact -
        a.recurrence * a.gameImpact,
    )
    .slice(0, 5)
    .map((weakness) => weakness.skillId);

  return {
    historyStartedAt: state.analytics?.startedAt,
    evidenceCount: evidenceEvents.length,
    evidenceCount30: evidenceEvents.filter(
      (event) =>
        new Date(event.occurredAt).getTime() >= cutoff30,
    ).length,
    activeDays28: activeDays,
    mastery: Math.round(mastery),
    masteryDelta30: round(
      pastMastery ? mastery - pastMastery : 0,
    ),
    retention: Math.round(retentionNow(state, now)),
    transfer: Math.round(transferNow(state)),
    humanTransfer: Math.round(humanTransferNow(state)),
    aiTransfer: Math.round(aiTransferNow(state)),
    practicalStrength: practicalStrengthInsight(state),
    calibration: calibrationInsight(evidenceEvents),
    trend: trendPoints(state, now),
    interventions: interventionInsights(
      evidenceEvents,
      cutoff30,
    ),
    stages: stageVelocityInsights(state, now),
    improving: [...skillTrends]
      .filter((item) => item.evidenceCount30 > 0)
      .sort((a, b) => b.delta30 - a.delta30)
      .slice(0, 5),
    needsAttention: [...skillTrends]
      .sort((a, b) => {
        const scoreA =
          a.current * .45 +
          a.retention * .35 +
          a.transfer * .2;
        const scoreB =
          b.current * .45 +
          b.retention * .35 +
          b.transfer * .2;
        return scoreA - scoreB;
      })
      .slice(0, 5),
    recurringWeaknesses,
    resolvedMistakeCount: (state.mistakes ?? []).filter(
      (mistake) => mistake.resolved,
    ).length,
    unresolvedMistakeCount: (state.mistakes ?? []).filter(
      (mistake) => !mistake.resolved,
    ).length,
  };
}

export function skillTitle(skillId: string) {
  return skillById[skillId]?.title ?? skillId;
}

export function stageTitle(stageId: CurriculumStageId) {
  return (
    curriculumStages.find((stage) => stage.id === stageId)
      ?.title ?? stageId
  );
}
