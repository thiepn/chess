import { skillById } from "../domain/curriculum";
import type {
  LearningEvidence,
  SkillMastery,
  UserState,
} from "../domain/types";
import type {
  AnalyticsIntervention,
  LearningAnalyticsEvent,
  LearningAnalyticsState,
} from "./types";

const MAX_ANALYTICS_EVENTS = 3000;

function transferValue(mastery: SkillMastery) {
  return Math.max(
    mastery.trainingTransfer,
    mastery.realGameRecognition,
    mastery.realGameExecution,
  );
}

export function ensureAnalyticsState(
  state: UserState,
  now = new Date(),
): UserState {
  if (state.analytics) return state;

  const events: LearningAnalyticsEvent[] = Object.values(state.mastery)
    .map((mastery) => {
      const skill = skillById[mastery.skillId];
      if (!skill) return null;

      return {
        id: `baseline:${mastery.skillId}`,
        kind: "baseline" as const,
        skillId: mastery.skillId,
        stageId: skill.stage,
        domain: skill.domain,
        occurredAt: mastery.lastSeenAt ?? now.toISOString(),
        masteryBefore: mastery.effectiveMastery,
        masteryAfter: mastery.effectiveMastery,
        retentionBefore: mastery.delayedRetention,
        retentionAfter: mastery.delayedRetention,
        transferBefore: transferValue(mastery),
        transferAfter: transferValue(mastery),
        confidenceBefore: mastery.confidence,
        confidenceAfter: mastery.confidence,
        stabilityBefore: mastery.stabilityDays,
        stabilityAfter: mastery.stabilityDays,
      };
    })
    .filter((event): event is LearningAnalyticsEvent => Boolean(event))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  const analytics: LearningAnalyticsState = {
    version: 1,
    startedAt:
      events[0]?.occurredAt ??
      now.toISOString(),
    events,
  };

  return { ...state, analytics };
}

export function appendEvidenceAnalytics(
  analytics: LearningAnalyticsState | undefined,
  before: SkillMastery,
  after: SkillMastery,
  evidence: LearningEvidence,
  intervention: AnalyticsIntervention,
): LearningAnalyticsState {
  const skill = skillById[evidence.skillId];
  if (!skill) {
    return (
      analytics ?? {
        version: 1,
        startedAt: evidence.occurredAt,
        events: [],
      }
    );
  }

  const base =
    analytics ?? {
      version: 1 as const,
      startedAt: evidence.occurredAt,
      events: [],
    };

  const event: LearningAnalyticsEvent = {
    id: `evidence:${evidence.occurredAt}:${evidence.skillId}:${before.attempts + 1}`,
    kind: "evidence",
    skillId: evidence.skillId,
    stageId: skill.stage,
    domain: skill.domain,
    occurredAt: evidence.occurredAt,
    evidenceSource: evidence.source,
    intervention,
    success: evidence.success,
    quality: evidence.quality,
    masteryBefore: before.effectiveMastery,
    masteryAfter: after.effectiveMastery,
    retentionBefore: before.delayedRetention,
    retentionAfter: after.delayedRetention,
    transferBefore: transferValue(before),
    transferAfter: transferValue(after),
    confidenceBefore: before.confidence,
    confidenceAfter: after.confidence,
    stabilityBefore: before.stabilityDays,
    stabilityAfter: after.stabilityDays,
  };

  const events = [...base.events, event]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .slice(-MAX_ANALYTICS_EVENTS);

  return {
    ...base,
    events,
  };
}
