import type {
  ModelGame,
  ModelGameCheckpointResult,
  ModelGameProgress,
} from "./types";

export function scoreModelGameCheckpoint(
  result: Omit<ModelGameCheckpointResult, "quality">,
) {
  let quality = 0;
  if (result.questionCorrect) quality += .25;
  if (result.moveSolved) quality += .5;
  if (result.firstTry && result.moveSolved) quality += .15;
  if (result.hintsUsed === 0) quality += .1;
  else quality -= Math.min(.16, result.hintsUsed * .08);
  quality -= Math.min(.12, result.wrongMoves * .04);

  if (result.revealed) {
    quality = Math.min(.45, quality);
  }

  return Math.max(0, Math.min(1, quality));
}

export function emptyModelGameProgress(
  gameId: string,
): ModelGameProgress {
  return {
    gameId,
    checkpointAttempts: {},
    checkpointQuality: {},
    completedCheckpointIds: [],
    completions: 0,
    bestScore: 0,
    lastScore: 0,
  };
}

export function recordModelGameCheckpoint(
  previous: ModelGameProgress | undefined,
  gameId: string,
  result: ModelGameCheckpointResult,
  now = new Date(),
): ModelGameProgress {
  const base =
    previous ?? emptyModelGameProgress(gameId);

  return {
    ...base,
    checkpointAttempts: {
      ...base.checkpointAttempts,
      [result.checkpointId]:
        (base.checkpointAttempts[result.checkpointId] ?? 0) + 1,
    },
    checkpointQuality: {
      ...base.checkpointQuality,
      [result.checkpointId]: Math.max(
        base.checkpointQuality[result.checkpointId] ?? 0,
        result.quality,
      ),
    },
    completedCheckpointIds: Array.from(
      new Set([
        ...base.completedCheckpointIds,
        result.checkpointId,
      ]),
    ),
    lastCheckpointAt: now.toISOString(),
  };
}

export function currentModelGameScore(
  progress: ModelGameProgress | undefined,
  game: ModelGame,
) {
  if (!progress || !game.checkpoints.length) return 0;

  const total = game.checkpoints.reduce(
    (sum, checkpoint) =>
      sum +
      (progress.checkpointQuality[checkpoint.id] ?? 0),
    0,
  );

  return Math.round(
    (total / game.checkpoints.length) * 100,
  );
}

export function recordModelGameCompletion(
  previous: ModelGameProgress | undefined,
  game: ModelGame,
  now = new Date(),
): ModelGameProgress {
  const base =
    previous ?? emptyModelGameProgress(game.id);
  const score = currentModelGameScore(base, game);

  return {
    ...base,
    completions: base.completions + 1,
    lastScore: score,
    bestScore: Math.max(base.bestScore, score),
    lastCompletedAt: now.toISOString(),
  };
}

export function nextModelGameCheckpointIndex(
  game: ModelGame,
  progress?: ModelGameProgress,
) {
  if (!progress) return 0;

  const next = game.checkpoints.findIndex(
    (checkpoint) =>
      !progress.completedCheckpointIds.includes(
        checkpoint.id,
      ),
  );

  return next === -1 ? 0 : next;
}
