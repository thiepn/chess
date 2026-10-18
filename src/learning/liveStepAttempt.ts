import type { LessonStepResult, LessonSupport } from "./types";

/**
 * Lesson scoring must account for browser events synchronously: React state
 * may not yet reflect an earlier hint, wrong answer, or correct move when
 * the learner taps again before the next render.
 */
export interface LiveStepAttempt {
  hintsUsed: number;
  wrongAttempts: number;
  completed: boolean;
}

export function createLiveStepAttempt(): LiveStepAttempt {
  return { hintsUsed: 0, wrongAttempts: 0, completed: false };
}

export function takeStepHint(attempt: LiveStepAttempt, available: number): number | null {
  if (attempt.completed || attempt.hintsUsed >= available || available <= 0) return null;
  attempt.hintsUsed += 1;
  return attempt.hintsUsed;
}

export function countStepMistake(attempt: LiveStepAttempt): number | null {
  if (attempt.completed) return null;
  attempt.wrongAttempts += 1;
  return attempt.wrongAttempts;
}

export function finishStepAttempt(
  attempt: LiveStepAttempt,
  stepId: string,
  support: LessonSupport,
): LessonStepResult | null {
  if (attempt.completed) return null;
  attempt.completed = true;
  return {
    stepId,
    support,
    correct: true,
    firstTry: attempt.hintsUsed === 0 && attempt.wrongAttempts === 0,
    hintsUsed: attempt.hintsUsed,
    wrongAttempts: attempt.wrongAttempts,
  };
}
