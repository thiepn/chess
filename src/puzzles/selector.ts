import type {
  PuzzleAttemptSummary,
  PuzzleRecord,
  PuzzleSelectionCriteria,
} from "./types";

const DAY = 86_400_000;

export function targetPuzzleRating(
  mastery: number,
  activityDifficulty: number,
): number {
  return Math.round(
    Math.min(2200, Math.max(650, 650 + mastery * 11 + activityDifficulty * 45)),
  );
}

function historyPenalty(
  puzzle: PuzzleRecord,
  history: Record<string, PuzzleAttemptSummary>,
  now: Date,
) {
  const attempt = history[puzzle.id];
  if (!attempt) return 0;

  const ageDays =
    (now.getTime() - new Date(attempt.lastAttemptAt).getTime()) / DAY;

  if (ageDays < 1) return .95;
  if (ageDays < 7) return .65;
  if (ageDays < 21) return .35;

  // Old failures are worth resurfacing after spacing.
  return attempt.successes < attempt.attempts ? -.08 : .12;
}

export function puzzleSelectionScore(
  puzzle: PuzzleRecord,
  criteria: PuzzleSelectionCriteria,
  now = new Date(),
): number {
  const target =
    criteria.targetRating ??
    targetPuzzleRating(
      criteria.mastery,
      criteria.activityDifficulty,
    );
  const distance = Math.abs(puzzle.rating - target);
  const difficultyFit = Math.max(0, 1 - distance / 700);
  const popularity = Math.max(0, Math.min(1, (puzzle.popularity + 100) / 200));
  const playConfidence = Math.min(1, Math.log10(Math.max(10, puzzle.plays)) / 4);
  const exactSkill = puzzle.skillIds[0] === criteria.skillId ? .08 : 0;
  const history = criteria.history ?? {};

  return (
    difficultyFit * .56 +
    popularity * .22 +
    playConfidence * .14 +
    exactSkill -
    historyPenalty(puzzle, history, now)
  );
}

export function selectPuzzle(
  puzzles: PuzzleRecord[],
  criteria: PuzzleSelectionCriteria,
  now = new Date(),
): PuzzleRecord | null {
  if (!puzzles.length) return null;

  const relevant = puzzles.filter((puzzle) =>
    puzzle.skillIds.includes(criteria.skillId),
  );
  const pool = relevant.length ? relevant : puzzles;

  return [...pool].sort(
    (a, b) =>
      puzzleSelectionScore(b, criteria, now) -
      puzzleSelectionScore(a, criteria, now),
  )[0] ?? null;
}
