import { describe, expect, it } from "vitest";
import { applyEvidence, emptyMastery } from "./mastery";
import type { LearningEvidence } from "./types";

function evidence(
  source: LearningEvidence["source"],
  success: boolean,
): LearningEvidence {
  return {
    skillId: "fundamentals.blunder-check",
    source,
    success,
    quality: success ? 1 : 0,
    difficulty: .5,
    opponentRating: 1500,
    timeControlWeight: .95,
    occurredAt: "2026-10-06T08:00:00Z",
  };
}

describe("transfer source separation", () => {
  it("human games update only the human transfer channel", () => {
    const base = emptyMastery("fundamentals.blunder-check", .5);
    const next = applyEvidence(base, evidence("humanGame", true));

    expect(next.humanGameAttempts).toBe(1);
    expect(next.humanGameExecution).toBeGreaterThan(0);
    expect(next.humanGameRecognition).toBeGreaterThan(0);
    expect(next.aiGameAttempts).toBe(0);
    expect(next.aiGameTransfer).toBe(0);
  });

  it("AI review updates only the AI transfer channel", () => {
    const base = emptyMastery("fundamentals.blunder-check", .5);
    const next = applyEvidence(base, evidence("aiGameReview", true));

    expect(next.aiGameAttempts).toBe(1);
    expect(next.aiGameTransfer).toBeGreaterThan(0);
    expect(next.humanGameAttempts).toBe(0);
    expect(next.humanGameExecution).toBe(0);
  });

  it("missing human-game evidence does not lower otherwise identical mastery", () => {
    const base = {
      ...emptyMastery("fundamentals.blunder-check", .5),
      understanding: 70,
      recognition: 70,
      execution: 70,
      mixedRecognition: 70,
      delayedRetention: 70,
      trainingTransfer: 70,
      aiGameTransfer: 70,
      confidence: 80,
    };

    const noHuman = applyEvidence(
      base,
      evidence("delayedReview", true),
    );
    const withHuman = applyEvidence(
      {
        ...base,
        humanGameAttempts: 1,
        humanGameRecognition: 70,
        humanGameExecution: 70,
      },
      evidence("delayedReview", true),
    );

    expect(
      Math.abs(
        noHuman.effectiveMastery - withHuman.effectiveMastery,
      ),
    ).toBeLessThan(2);
  });
});
