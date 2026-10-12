import { describe, expect, it } from "vitest";
import { summarizeLessonMastery } from "./mastery";
import type { LessonStepResult } from "./types";

function result(
  stepId: string,
  support: LessonStepResult["support"],
  overrides: Partial<LessonStepResult> = {},
): LessonStepResult {
  return {
    stepId,
    support,
    correct: true,
    firstTry: true,
    hintsUsed: 0,
    wrongAttempts: 0,
    ...overrides,
  };
}

describe("lesson mastery evidence", () => {
  it("separates completion from independent mastery", () => {
    const weak = summarizeLessonMastery([
      result("guided", "guided", {
        firstTry: false,
        hintsUsed: 3,
        wrongAttempts: 2,
      }),
      result("retrieval", "retrieval", {
        firstTry: false,
        hintsUsed: 3,
        wrongAttempts: 2,
      }),
      result("transfer", "transfer", {
        firstTry: false,
        hintsUsed: 3,
        wrongAttempts: 2,
      }),
    ]);

    expect(weak.completed).toBe(true);
    expect(weak.masteryPassed).toBe(false);
    expect(weak.masteryQuality).toBeLessThan(.62);
  });

  it("rewards independent first-try transfer more than guided success", () => {
    const strong = summarizeLessonMastery([
      result("guided", "guided", {
        hintsUsed: 1,
      }),
      result("retrieval-choice", "retrieval"),
      result("retrieval", "retrieval"),
      result("transfer", "transfer"),
    ]);

    expect(strong.masteryPassed).toBe(true);
    expect(strong.firstTryCorrect).toBe(3);
    expect(strong.transferFirstTryCorrect).toBe(1);
    expect(strong.masteryQuality).toBeGreaterThan(.85);
  });

  it("weights transfer evidence strongly enough that a weak transfer cannot hide behind guided work", () => {
    const weakTransfer = summarizeLessonMastery([
      result("guided-1", "guided"),
      result("guided-2", "guided"),
      result("retrieval-1", "retrieval"),
      result("retrieval-2", "retrieval"),
      result("transfer", "transfer", {
        firstTry: false,
        hintsUsed: 3,
        wrongAttempts: 3,
      }),
    ]);

    const cleanTransfer = summarizeLessonMastery([
      result("guided-1", "guided"),
      result("guided-2", "guided"),
      result("retrieval-1", "retrieval"),
      result("retrieval-2", "retrieval"),
      result("transfer", "transfer"),
    ]);

    expect(cleanTransfer.masteryQuality).toBeGreaterThan(
      weakTransfer.masteryQuality,
    );
    expect(cleanTransfer.masteryPassed).toBe(true);
  });
  it("counts assisted novel-position completion without granting independent mastery", () => {
    const assisted=summarizeLessonMastery([
      result("recognition","retrieval"),
      result("retrieval","retrieval"),
      result("new-position","transfer",{firstTry:false,hintsUsed:1,wrongAttempts:0}),
    ]);
    expect(assisted.completed).toBe(true);
    expect(assisted.transferSteps).toBe(1);
    expect(assisted.transferFirstTryCorrect).toBe(0);
    expect(assisted.masteryPassed).toBe(false);
  });

  it("P92 requires both distinct transfer positions clean on the first attempt", () => {
    const base = [
      result("guided","guided"),
      result("recognition","retrieval"),
      result("independent","retrieval"),
      result("transfer","transfer"),
    ];
    const clean = summarizeLessonMastery([
      ...base,result("transfer-depth","transfer"),
    ]);
    const assisted = summarizeLessonMastery([
      ...base,result("transfer-depth","transfer",{firstTry:false,hintsUsed:1}),
    ]);
    const corrected = summarizeLessonMastery([
      ...base,result("transfer-depth","transfer",{firstTry:false,wrongAttempts:1}),
    ]);
    expect(clean.transferSteps).toBe(2);
    expect(clean.transferFirstTryCorrect).toBe(2);
    expect(clean.masteryPassed).toBe(true);
    for (const score of [assisted, corrected]) {
      expect(score.completed).toBe(true);
      expect(score.transferSteps).toBe(2);
      expect(score.transferFirstTryCorrect).toBe(1);
      expect(score.masteryPassed).toBe(false);
    }
  });

});
