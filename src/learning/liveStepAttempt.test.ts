import { describe, expect, it } from "vitest";
import {
  countStepMistake, createLiveStepAttempt, finishStepAttempt, takeStepHint,
} from "./liveStepAttempt";

describe("real-time lesson attempt accounting", () => {
  it("does not award first-try credit when a hint and answer arrive before rerender", () => {
    const attempt = createLiveStepAttempt();
    expect(takeStepHint(attempt, 3)).toBe(1);
    expect(finishStepAttempt(attempt, "g2-tactical-1", "transfer")).toMatchObject({
      firstTry: false, hintsUsed: 1, wrongAttempts: 0, support: "transfer",
    });
  });

  it("charges wrong taps synchronously before a correct choice or board move", () => {
    const attempt = createLiveStepAttempt();
    expect(countStepMistake(attempt)).toBe(1);
    expect(countStepMistake(attempt)).toBe(2);
    expect(finishStepAttempt(attempt, "recognition", "retrieval")).toMatchObject({
      firstTry: false, hintsUsed: 0, wrongAttempts: 2,
    });
  });

  it("prevents duplicate answers and ignores stale events after success", () => {
    const attempt = createLiveStepAttempt();
    const result = finishStepAttempt(attempt, "transfer", "transfer");
    expect(result?.firstTry).toBe(true);
    expect(finishStepAttempt(attempt, "transfer", "transfer")).toBeNull();
    expect(countStepMistake(attempt)).toBeNull();
    expect(takeStepHint(attempt, 3)).toBeNull();
    expect(attempt).toMatchObject({ hintsUsed: 0, wrongAttempts: 0, completed: true });
  });

  it("does not reveal more hints than the authored step permits", () => {
    const attempt = createLiveStepAttempt();
    expect(takeStepHint(attempt, 2)).toBe(1);
    expect(takeStepHint(attempt, 2)).toBe(2);
    expect(takeStepHint(attempt, 2)).toBeNull();
    expect(attempt.hintsUsed).toBe(2);
    expect(finishStepAttempt(attempt, "guided", "guided")?.firstTry).toBe(false);
  });

  it("preserves a wrong attempt across UI reset but starts each new step clean", () => {
    const attempted = createLiveStepAttempt();
    countStepMistake(attempted);
    // Resetting the board after a wrong move is not a new scored step.
    expect(finishStepAttempt(attempted, "g1-practice-4", "transfer")?.firstTry).toBe(false);
    const next = createLiveStepAttempt();
    expect(finishStepAttempt(next, "g1-practice-5", "retrieval")).toMatchObject({
      firstTry: true, hintsUsed: 0, wrongAttempts: 0,
    });
  });
});
