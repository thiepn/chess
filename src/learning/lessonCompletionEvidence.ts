import type { LessonScript, LessonStepResult } from "./types";

/**
 * Lesson completion is different from demonstrated mastery: assisted or
 * corrected moves can complete the lesson without granting mastery credit.
 * Before any outcome is saved, every original assessed step must have its
 * own successful result under its own support authority.
 */
export function hasCompleteLessonEvidence(
  lesson: LessonScript,
  results: readonly LessonStepResult[],
): boolean {
  const assessed = lesson.steps.filter(step => step.type !== "explain");
  if (!assessed.length || results.length !== assessed.length) return false;
  const byId = new Map(results.map(result => [result.stepId, result]));
  if (byId.size !== results.length) return false;
  return assessed.every(step => {
    const result = byId.get(step.id);
    return result?.correct === true && result.support === step.support &&
      Number.isInteger(result.hintsUsed) && result.hintsUsed >= 0 &&
      Number.isInteger(result.wrongAttempts) && result.wrongAttempts >= 0;
  });
}

/**
 * Publish each accepted answer to the live lesson's in-memory evidence before
 * React can batch its corresponding display-state update. Existing historical
 * step IDs remain the only authority; never append duplicate result IDs.
 */
export function withLatestLessonEvidence(
  prior: readonly LessonStepResult[],
  item: LessonStepResult,
): LessonStepResult[] {
  return [...prior.filter(result => result.stepId !== item.stepId), item];
}

/**
 * Outcome hint/mistake totals must derive from the exact evidence submitted
 * for mastery, not from potentially uncommitted React state counters.
 */
export function lessonEvidenceTotals(results: readonly LessonStepResult[]) {
  return results.reduce((totals, result) => ({
    hintsUsed: totals.hintsUsed + result.hintsUsed,
    wrongAttempts: totals.wrongAttempts + result.wrongAttempts,
  }), { hintsUsed: 0, wrongAttempts: 0 });
}
