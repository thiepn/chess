import { calibratedPuzzleRating } from "./practiceQuality";
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
    Math.min(
      2200,
      Math.max(
        650,
        650 +
          mastery * 11 +
          activityDifficulty * 45,
      ),
    ),
  );
}

function attemptAgeDays(
  attempt: PuzzleAttemptSummary,
  now: Date,
) {
  return (
    now.getTime() -
    new Date(attempt.lastAttemptAt).getTime()
  ) / DAY;
}

function attemptWasWeak(
  attempt: PuzzleAttemptSummary,
) {
  return (
    attempt.lastQuality < .72 ||
    attempt.successes < attempt.attempts
  );
}

function coolingDown(
  puzzle: PuzzleRecord,
  history: Record<string, PuzzleAttemptSummary>,
  now: Date,
) {
  const attempt = history[puzzle.id];
  if (!attempt) return false;

  const scheduled=attempt.nextReviewAt?Date.parse(attempt.nextReviewAt):NaN;
  if(Number.isFinite(scheduled))return now.getTime()<scheduled;
  const ageDays = attemptAgeDays(attempt, now);
  return ageDays <
    (attemptWasWeak(attempt) ? 2 : 14);
}

function historyPenalty(
  puzzle: PuzzleRecord,
  history: Record<string, PuzzleAttemptSummary>,
  now: Date,
) {
  const attempt = history[puzzle.id];
  if (!attempt) return 0;

  const ageDays = attemptAgeDays(attempt, now);
  const weak = attemptWasWeak(attempt);
  if(attempt.nextReviewAt && Number.isFinite(Date.parse(attempt.nextReviewAt)) &&
    now.getTime()>=Date.parse(attempt.nextReviewAt))return weak?-.3:.04;

  if (weak) {
    if (ageDays < 2) return .92;
    if (ageDays < 7) return .12;
    if (ageDays < 21) return -.08;
    return -.13;
  }

  if (ageDays < 1) return .98;
  if (ageDays < 7) return .72;
  if (ageDays < 14) return .42;
  if (ageDays < 30) return .16;
  return .05;
}

function dailyVariation(
  puzzleId: string,
  now: Date,
) {
  const day = now.toISOString().slice(0, 10);
  const value = `${puzzleId}:${day}`;
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 1000) / 1000;
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
  const distance = Math.abs(
    puzzle.rating - target,
  );
  const difficultyFit = Math.max(
    0,
    1 - distance / 700,
  );
  const popularity = Math.max(
    0,
    Math.min(
      1,
      (puzzle.popularity + 100) / 200,
    ),
  );
  const playConfidence = Math.min(
    1,
    Math.log10(Math.max(10, puzzle.plays)) / 4,
  );
  const exactSkill =
    puzzle.skillIds[0] === criteria.skillId
      ? .08
      : 0;
  const history = criteria.history ?? {};

  return (
    difficultyFit * .54 +
    popularity * .21 +
    playConfidence * .13 +
    exactSkill +
    dailyVariation(puzzle.id, now) * .04 -
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
    criteria.mixed || puzzle.skillIds.includes(criteria.skillId),
  );
  const pool = relevant.length
    ? relevant
    : puzzles;
  const history = criteria.history ?? {};
  const rested = pool.filter(
    (puzzle) =>
      !coolingDown(puzzle, history, now),
  );
  const candidates = rested.length
    ? rested
    : pool;
  // Mixed recognition prioritizes unseen positions over mere replay; missed
  // source-bound puzzles remain eligible for their scheduled spaced reviews.
  const newCandidates = criteria.mixed ? candidates.filter(p => !history[p.id]) : [];
  const selectionPool = newCandidates.length ? newCandidates : candidates;

  const target=calibratedPuzzleRating(
    criteria.targetRating ?? targetPuzzleRating(criteria.mastery,criteria.activityDifficulty),
    history,pool);
  const adjusted={...criteria,targetRating:target};
  const themes=["defensiveMove","quietMove","fork","pin","skewer","mate",
    "discoveredAttack","deflection","clearance","intermezzo","backRankMate"];
  const exposure=new Map<string,number>();
  if(criteria.mixed)for(const p of pool)if(history[p.id])
    for(const motif of p.themes)if(themes.includes(motif))
      exposure.set(motif,(exposure.get(motif)??0)+1);
  const score=(p:PuzzleRecord)=>{
    const base=puzzleSelectionScore(p,adjusted,now);
    if(!criteria.mixed)return base;
    const motif=p.themes.find(x=>themes.includes(x));
    return base+(motif?.length ? .14/(1+(exposure.get(motif)??0)) : 0);
  };
  return [...selectionPool].sort((a,b)=>score(b)-score(a) ||
    a.id.localeCompare(b.id))[0]??null;
}
