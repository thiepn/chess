import { describe, expect, it } from "vitest";
import { trainingPolicyFor } from "./policy";
import { skillById } from "../domain/curriculum";
import { emptyMastery } from "../domain/mastery";
import type { LearningAnalyticsEvent } from "../analytics/types";
import type { UserState } from "../domain/types";

function stateWithEvents(
  success: boolean,
  count: number,
): UserState {
  const skillId = "tactics.pin";
  const skill = skillById[skillId];
  const mastery = {
    ...emptyMastery(skillId, skill.difficulty / 5),
    attempts: 16,
    understanding: 76,
    recognition: 70,
    execution: 62,
    mixedRecognition: 58,
    effectiveMastery: 58,
    confidence: 64,
    trainingTransfer: 45,
    lastSuccessAt: "2026-10-09T10:00:00Z",
    stabilityDays: success ? 9 : 2,
  };

  const events: LearningAnalyticsEvent[] = Array.from(
    { length: count },
    (_, index) => ({
      id: `event-${index}`,
      kind: "evidence",
      skillId,
      stageId: skill.stage,
      domain: skill.domain,
      occurredAt: `2026-10-0${index + 1}T10:00:00Z`,
      evidenceSource: "mixedPuzzle",
      intervention: "review",
      success,
      quality: success ? 1 : 0,
      masteryBefore: 54,
      masteryAfter: success ? 58 : 51,
      retentionBefore: 45,
      retentionAfter: success ? 51 : 40,
      transferBefore: 30,
      transferAfter: 30,
      confidenceBefore: 55,
      confidenceAfter: 60,
      stabilityBefore: 3,
      stabilityAfter: success ? 5 : 1.5,
    }),
  );

  return {
    mastery: { [skillId]: mastery },
    weaknesses: [],
    recentDomainMinutes: {},
    analytics: {
      version: 1,
      startedAt: "2026-10-01T10:00:00Z",
      events,
    },
  };
}

describe("adaptive difficulty", () => {
  const skill = skillById["tactics.pin"];
  const now = new Date("2026-10-10T12:00:00Z");

  it("moves into recovery after repeated failures", () => {
    const policy = trainingPolicyFor(
      stateWithEvents(false, 4),
      skill,
      "review",
      now,
    );
    expect(policy.challenge).toBe("recovery");
    expect(policy.targetSuccessLow).toBeGreaterThanOrEqual(70);
  });

  it("moves into stretch after repeated clean success", () => {
    const state = stateWithEvents(true, 5);
    state.mastery[skill.id].effectiveMastery = 70;
    state.mastery[skill.id].confidence = 72;
    const policy = trainingPolicyFor(
      state,
      skill,
      "review",
      now,
    );
    expect(policy.challenge).toBe("stretch");
    expect(policy.targetSuccessHigh).toBeLessThanOrEqual(70);
  });

  it("sets a lower puzzle target for recovery than stretch", () => {
    const recovery = trainingPolicyFor(
      stateWithEvents(false, 4),
      skill,
      "review",
      now,
    );
    const stretchState = stateWithEvents(true, 5);
    stretchState.mastery[skill.id].effectiveMastery = 70;
    stretchState.mastery[skill.id].confidence = 72;
    const stretch = trainingPolicyFor(
      stretchState,
      skill,
      "review",
      now,
    );
    expect(stretch.targetPuzzleRating).toBeGreaterThan(
      recovery.targetPuzzleRating ?? 0,
    );
  });
});
