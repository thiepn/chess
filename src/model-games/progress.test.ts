import { describe, expect, it } from "vitest";
import { modelGames } from "./games";
import {
  currentModelGameScore,
  emptyModelGameProgress,
  nextModelGameCheckpointIndex,
  recordModelGameCheckpoint,
  recordModelGameCompletion,
  scoreModelGameCheckpoint,
} from "./progress";

describe("P33 model game progress", () => {
  it("rewards independent plan recognition and first-try move recall", () => {
    const perfect = scoreModelGameCheckpoint({
      checkpointId: "x",
      skillId: "practical.plan",
      questionCorrect: true,
      moveSolved: true,
      firstTry: true,
      revealed: false,
      hintsUsed: 0,
      wrongMoves: 0,
    });
    const assisted = scoreModelGameCheckpoint({
      checkpointId: "x",
      skillId: "practical.plan",
      questionCorrect: false,
      moveSolved: true,
      firstTry: false,
      revealed: false,
      hintsUsed: 2,
      wrongMoves: 1,
    });

    expect(perfect).toBe(1);
    expect(assisted).toBeLessThan(perfect);
  });

  it("caps reveal-only evidence so passive study cannot look mastered", () => {
    const revealed = scoreModelGameCheckpoint({
      checkpointId: "x",
      skillId: "practical.plan",
      questionCorrect: true,
      moveSolved: false,
      firstTry: false,
      revealed: true,
      hintsUsed: 0,
      wrongMoves: 0,
    });

    expect(revealed).toBeLessThanOrEqual(.45);
  });

  it("persists checkpoint progress and resumes at the next unfinished decision", () => {
    const game = modelGames[0];
    const first = game.checkpoints[0];
    const quality = .82;
    const progress = recordModelGameCheckpoint(
      undefined,
      game.id,
      {
        checkpointId: first.id,
        skillId: first.skillId,
        questionCorrect: true,
        moveSolved: true,
        firstTry: false,
        revealed: false,
        hintsUsed: 1,
        wrongMoves: 0,
        quality,
      },
      new Date("2026-10-07T00:00:00Z"),
    );

    expect(progress.completedCheckpointIds).toContain(first.id);
    expect(progress.checkpointQuality[first.id]).toBe(quality);
    expect(nextModelGameCheckpointIndex(game, progress)).toBe(1);
  });

  it("uses best checkpoint evidence for the model-game score", () => {
    const game = modelGames[0];
    let progress = emptyModelGameProgress(game.id);

    for (const checkpoint of game.checkpoints) {
      progress = recordModelGameCheckpoint(
        progress,
        game.id,
        {
          checkpointId: checkpoint.id,
          skillId: checkpoint.skillId,
          questionCorrect: true,
          moveSolved: true,
          firstTry: true,
          revealed: false,
          hintsUsed: 0,
          wrongMoves: 0,
          quality: 1,
        },
      );
    }

    expect(currentModelGameScore(progress, game)).toBe(100);
    const completed = recordModelGameCompletion(progress, game);
    expect(completed.bestScore).toBe(100);
    expect(completed.completions).toBe(1);
  });
});
