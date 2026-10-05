import { describe, expect, it } from "vitest";
import { trainingPolicyFor } from "./policy";
import { skillById } from "../domain/curriculum";
import { emptyMastery } from "../domain/mastery";
import type { UserState } from "../domain/types";

function stateFor(
  skillId: string,
  overrides: Partial<ReturnType<typeof emptyMastery>> = {},
): UserState {
  const skill = skillById[skillId];
  return {
    mastery: {
      [skillId]: {
        ...emptyMastery(skillId, skill.difficulty / 5),
        ...overrides,
      },
    },
    weaknesses: [],
    recentDomainMinutes: {},
  };
}

describe("adaptive training policy", () => {
  const now = new Date("2026-10-10T12:00:00Z");

  it("teaches new material before transfer", () => {
    const skill = skillById["openings.principles"];
    const state: UserState = {
      mastery: {},
      weaknesses: [],
      recentDomainMinutes: {},
    };
    const policy = trainingPolicyFor(state, skill, "curriculum", now);
    expect(policy.mode).toBe("conceptLesson");
    expect(policy.challenge).toBe("supported");
  });

  it("uses pattern practice for weak recognition", () => {
    const skillId = "tactics.pin";
    const state = stateFor(skillId, {
      attempts: 8,
      understanding: 72,
      recognition: 34,
      execution: 45,
      mixedRecognition: 30,
      effectiveMastery: 41,
      confidence: 55,
      lastSuccessAt: "2026-10-09T10:00:00Z",
      stabilityDays: 4,
    });
    const policy = trainingPolicyFor(
      state,
      skillById[skillId],
      "curriculum",
      now,
    );
    expect(policy.mode).toBe("themedPuzzle");
  });

  it("uses a real scenario when transfer lags", () => {
    const skillId = "endgames.opposition";
    const state = stateFor(skillId, {
      attempts: 14,
      understanding: 82,
      recognition: 78,
      execution: 74,
      mixedRecognition: 72,
      effectiveMastery: 68,
      trainingTransfer: 12,
      realGameRecognition: 8,
      realGameExecution: 5,
      confidence: 72,
      lastSuccessAt: "2026-10-09T10:00:00Z",
      stabilityDays: 8,
    });
    const policy = trainingPolicyFor(
      state,
      skillById[skillId],
      "curriculum",
      now,
    );
    expect(policy.mode).toBe("engineGame");
  });

  it("reduces drilling once a skill is saturated", () => {
    const skillId = "tactics.pin";
    const state = stateFor(skillId, {
      attempts: 40,
      understanding: 94,
      recognition: 92,
      execution: 90,
      mixedRecognition: 90,
      delayedRetention: 88,
      trainingTransfer: 78,
      realGameRecognition: 72,
      realGameExecution: 70,
      effectiveMastery: 90,
      confidence: 90,
      lastSuccessAt: "2026-10-09T10:00:00Z",
      stabilityDays: 30,
    });
    const policy = trainingPolicyFor(
      state,
      skillById[skillId],
      "focus",
      now,
    );
    expect(policy.challenge).toBe("maintenance");
    expect(policy.stopPressure).toBeGreaterThan(.8);
    expect(policy.priorityMultiplier).toBeLessThan(1);
  });
});
