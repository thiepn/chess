import {
  curriculumStages,
  skillById,
  skills,
} from "../domain/curriculum";
import { retentionProbability } from "../domain/mastery";
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

function transferNow(state: UserState) {
  const values = Object.values(state.mastery)
    .filter((mastery) => mastery.attempts > 0)
    .map((mastery) =>
      Math.max(
        mastery.trainingTransfer,
        mastery.realGameRecognition,
        mastery.realGameExecution,
      ),
    );

  return average(values);
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
              item.trainingTransfer,
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
            mastery.trainingTransfer,
            mastery.realGameRecognition,
            mastery.realGameExecution,
          ),
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
