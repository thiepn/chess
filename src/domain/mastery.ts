import type { ChessSkill, LearningEvidence, SkillMastery, UserWeakness } from "./types";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

export const evidenceWeight: Record<LearningEvidence["source"], number> = {
  lesson: .2,
  guided: .3,
  themedPuzzle: .45,
  mixedPuzzle: .6,
  calculation: .75,
  endgameTechnique: .82,
  openingRecall: .68,
  modelGame: .5,
  delayedReview: .7,
  trainingPosition: .8,
  engineGame: .85,
  realGame: .92,
  humanGame: 1,
  aiGameReview: .72,
  diagnostic: .52,
  checkpoint: .78,
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
    humanGameRecognition: 0,
    humanGameExecution: 0,
    humanGameAttempts: 0,
    aiGameTransfer: 0,
    aiGameAttempts: 0,
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
  const humanAttempts = mastery.humanGameAttempts ?? 0;
  const humanRecognition =
    mastery.humanGameRecognition ?? mastery.realGameRecognition ?? 0;
  const humanExecution =
    mastery.humanGameExecution ?? mastery.realGameExecution ?? 0;
  const aiTransfer = mastery.aiGameTransfer ?? mastery.trainingTransfer ?? 0;

  const weighted = [
    [mastery.understanding, .08],
    [mastery.recognition, .12],
    [mastery.execution, .13],
    [mastery.mixedRecognition, .16],
    [mastery.delayedRetention, .16],
    [mastery.trainingTransfer, .1],
    [aiTransfer, .05],
    ...(humanAttempts > 0
      ? [
          [humanRecognition, humanAttempts >= 5 ? .08 : .05],
          [humanExecution, humanAttempts >= 5 ? .12 : .05],
        ]
      : []),
  ] as Array<[number, number]>;

  const totalWeight = weighted.reduce(
    (sum, [, weight]) => sum + weight,
    0,
  );
  const raw =
    weighted.reduce(
      (sum, [value, weight]) => sum + value * weight,
      0,
    ) / Math.max(.01, totalWeight);

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
  if (evidence.source === "openingRecall") {
    next.recognition = updateDimension(
      next.recognition,
      target,
      weight * .82,
    );
    next.execution = updateDimension(
      next.execution,
      target,
      weight,
    );
    next.delayedRetention = updateDimension(
      next.delayedRetention,
      target,
      weight * .72,
    );
  }
  if (evidence.source === "modelGame") {
    next.understanding = updateDimension(
      next.understanding,
      target,
      weight * .75,
    );
    next.recognition = updateDimension(
      next.recognition,
      target,
      weight,
    );
    next.mixedRecognition = updateDimension(
      next.mixedRecognition,
      target,
      weight * .55,
    );
  }
  if (evidence.source === "calculation") {
    next.mixedRecognition = updateDimension(
      next.mixedRecognition,
      target,
      weight * .72,
    );
    next.execution = updateDimension(
      next.execution,
      target,
      weight,
    );
    next.trainingTransfer = updateDimension(
      next.trainingTransfer,
      target,
      weight * .78,
    );
  }
  if (evidence.source === "endgameTechnique") {
    next.recognition = updateDimension(
      next.recognition,
      target,
      weight * .58,
    );
    next.execution = updateDimension(
      next.execution,
      target,
      weight,
    );
    next.trainingTransfer = updateDimension(
      next.trainingTransfer,
      target,
      weight * .92,
    );
    if (evidence.retentionEvidence) {
      next.delayedRetention = updateDimension(
        next.delayedRetention,
        target,
        weight * .8,
      );
    }
  }
  if (evidence.source === "delayedReview") {
    next.delayedRetention = updateDimension(next.delayedRetention, target, weight);
  }
  if (evidence.source === "trainingPosition" || evidence.source === "engineGame") {
    next.trainingTransfer = updateDimension(next.trainingTransfer, target, weight);
    next.execution = updateDimension(next.execution, target, weight * .5);
  }
  if (evidence.source === "diagnostic") {
    next.recognition = updateDimension(next.recognition, target, weight);
    next.execution = updateDimension(next.execution, target, weight * .8);
  }
  if (evidence.source === "checkpoint") {
    next.mixedRecognition = updateDimension(next.mixedRecognition, target, weight);
    next.execution = updateDimension(next.execution, target, weight * .8);

    const priorSeenAt = previous.lastSeenAt
      ? new Date(previous.lastSeenAt).getTime()
      : null;
    const elapsedDays =
      priorSeenAt === null
        ? 0
        : (new Date(evidence.occurredAt).getTime() - priorSeenAt) / 86_400_000;

    if (elapsedDays >= 1) {
      next.delayedRetention = updateDimension(
        next.delayedRetention,
        target,
        weight * .72,
      );
    }
  }
  if (evidence.source === "realGame") {
    next.realGameAttempts += 1;
    next.realGameRecognition = updateDimension(
      next.realGameRecognition,
      target,
      weight,
    );
    next.realGameExecution = updateDimension(
      next.realGameExecution,
      target,
      weight,
    );
  }
  if (evidence.source === "humanGame") {
    next.humanGameAttempts = (next.humanGameAttempts ?? 0) + 1;
    const contextWeight =
      weight *
      clamp(.75 + (evidence.timeControlWeight ?? .75) * .25, .65, 1.08) *
      clamp(
        evidence.opponentRating
          ? .85 + Math.min(2500, Math.max(400, evidence.opponentRating)) / 10000
          : 1,
        .85,
        1.08,
      );
    next.humanGameRecognition = updateDimension(
      next.humanGameRecognition ?? 0,
      target,
      contextWeight,
    );
    next.humanGameExecution = updateDimension(
      next.humanGameExecution ?? 0,
      target,
      contextWeight,
    );
  }
  if (evidence.source === "aiGameReview") {
    next.aiGameAttempts = (next.aiGameAttempts ?? 0) + 1;
    next.aiGameTransfer = updateDimension(
      next.aiGameTransfer ?? 0,
      target,
      weight,
    );
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
