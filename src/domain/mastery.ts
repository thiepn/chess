import type { ChessSkill, LearningEvidence, SkillMastery, UserWeakness } from "./types";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

export const evidenceWeight: Record<LearningEvidence["source"], number> = {
  lesson: .2,
  guided: .3,
  themedPuzzle: .45,
  mixedPuzzle: .6,
  delayedReview: .7,
  trainingPosition: .8,
  engineGame: .85,
  realGame: 1,
};

export function emptyMastery(skillId: string, difficulty = .5): SkillMastery {
  return {
    skillId,
    understanding: 0,
    recognition: 0,
    execution: 0,
    mixedRecognition: 0,
    delayedRetention: 0,
    trainingTransfer: 0,
    realGameRecognition: 0,
    realGameExecution: 0,
    effectiveMastery: 0,
    confidence: 0,
    attempts: 0,
    successes: 0,
    realGameAttempts: 0,
    stabilityDays: 1,
    difficulty,
  };
}

function evidenceTarget(evidence: LearningEvidence) {
  const successValue = evidence.success ? 100 : 0;
  return clamp(successValue * clamp(evidence.quality, 0, 1));
}

function updateDimension(current: number, target: number, weight: number) {
  const alpha = Math.min(.42, .08 + weight * .28);
  return clamp(current + (target - current) * alpha);
}

export function calculateEffectiveMastery(mastery: SkillMastery): number {
  const hasTransferEvidence = mastery.realGameAttempts >= 5;
  const weights = hasTransferEvidence
    ? {
        understanding: .05,
        recognition: .08,
        execution: .1,
        mixedRecognition: .12,
        delayedRetention: .15,
        trainingTransfer: .15,
        realGameRecognition: .15,
        realGameExecution: .2,
      }
    : {
        understanding: .1,
        recognition: .15,
        execution: .15,
        mixedRecognition: .2,
        delayedRetention: .15,
        trainingTransfer: .1,
        realGameRecognition: .05,
        realGameExecution: .1,
      };

  const raw = Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + mastery[key as keyof typeof weights] * weight,
    0,
  );

  const confidenceGate = .55 + .45 * (mastery.confidence / 100);
  return clamp(raw * confidenceGate);
}

export function applyEvidence(
  previous: SkillMastery,
  evidence: LearningEvidence,
): SkillMastery {
  const baseWeight = evidenceWeight[evidence.source];
  const difficultyFactor = clamp(.75 + evidence.difficulty * .35, .65, 1.2);
  const hintFactor = clamp(1 - (evidence.hintsUsed ?? 0) * .18, .35, 1);
  const weight = baseWeight * difficultyFactor * hintFactor;
  const target = evidenceTarget(evidence);
  const next = { ...previous };

  if (evidence.source === "lesson") {
    next.understanding = updateDimension(next.understanding, target, weight);
  }
  if (evidence.source === "guided" || evidence.source === "themedPuzzle") {
    next.recognition = updateDimension(next.recognition, target, weight);
    next.execution = updateDimension(next.execution, target, weight * .75);
  }
  if (evidence.source === "mixedPuzzle") {
    next.mixedRecognition = updateDimension(next.mixedRecognition, target, weight);
    next.execution = updateDimension(next.execution, target, weight * .7);
  }
  if (evidence.source === "delayedReview") {
    next.delayedRetention = updateDimension(next.delayedRetention, target, weight);
  }
  if (evidence.source === "trainingPosition" || evidence.source === "engineGame") {
    next.trainingTransfer = updateDimension(next.trainingTransfer, target, weight);
    next.execution = updateDimension(next.execution, target, weight * .5);
  }
  if (evidence.source === "realGame") {
    next.realGameAttempts += 1;
    next.realGameRecognition = updateDimension(next.realGameRecognition, target, weight);
    next.realGameExecution = updateDimension(next.realGameExecution, target, weight);
  }

  next.attempts += 1;
  if (evidence.success) next.successes += 1;
  next.confidence = clamp(next.confidence + 3 + weight * 5);
  next.lastSeenAt = evidence.occurredAt;
  if (evidence.success) next.lastSuccessAt = evidence.occurredAt;

  const stabilityMultiplier = evidence.success ? 1.25 + baseWeight * .8 : .45;
  next.stabilityDays = clamp(next.stabilityDays * stabilityMultiplier, .5, 180);
  next.nextReviewAt = new Date(
    new Date(evidence.occurredAt).getTime() + next.stabilityDays * 86_400_000,
  ).toISOString();
  next.effectiveMastery = calculateEffectiveMastery(next);

  return next;
}

export function retentionProbability(
  mastery: SkillMastery,
  now = new Date(),
): number {
  if (!mastery.lastSuccessAt) return 0;
  const elapsedDays =
    (now.getTime() - new Date(mastery.lastSuccessAt).getTime()) / 86_400_000;
  return Math.exp(-Math.max(0, elapsedDays) / Math.max(.5, mastery.stabilityDays));
}

const severityWeight: Record<UserWeakness["severity"], number> = {
  critical: 1,
  high: .82,
  normal: .58,
  low: .34,
  background: .16,
};

export function weaknessPriority(
  weakness: UserWeakness,
  skill: ChessSkill,
  mastery?: SkillMastery,
): number {
  const masteryGap = 1 - (mastery?.effectiveMastery ?? 0) / 100;
  const evidenceConfidence = .45 + .55 * weakness.confidence;
  return (
    masteryGap *
    skill.importance *
    severityWeight[weakness.severity] *
    (.4 + .6 * weakness.frequency) *
    (.4 + .6 * weakness.recency) *
    (.35 + .65 * weakness.gameImpact) *
    (.45 + .55 * weakness.recurrence) *
    evidenceConfidence
  );
}
