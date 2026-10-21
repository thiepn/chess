import type { ImportedGame, PersonalMistake } from "../games/types";
import { lessonPositionKey } from "../learning/lessonPositionKey";
import { legalReviewMistake, verifiedReviewAttempts, type RecordedReviewAttempt } from "../review/practiceLoop";
import { playedDay, recordedGameIdentity, type PersonalLearningRoute } from "./personalLearningRoute";
import type { G12PostTrainingFollowThrough } from "./postTrainingFollowThrough";

export type G13NextAction = "review-original" | "practice-independent" |
  "await-original" | "await-independent" | "review-later-game" | "await-later-game";
export interface G13RepairEvidenceResult {
  original: { attempted: number; clean: number };
  independent: { positions: number; attempted: number; clean: number };
  firstIndependentCleanAt: string | null;
  next: G13NextAction;
  practiceMistakeId: string | null;
  laterGameId: string | null;
  explanation: string;
}

function boundedTime(input: string | undefined, latest: number): number | null {
  if (!input) return null;
  const value = Date.parse(input);
  return Number.isFinite(value) && value <= latest ? value : null;
}
function clean(a: RecordedReviewAttempt): boolean {
  return a.succeeded && a.hintsUsed === 0 && a.wrongAttempts === 0;
}
function sinceRepair(m: PersonalMistake, attempts: readonly RecordedReviewAttempt[],
  completed: number, now: Date): RecordedReviewAttempt[] {
  const valid = verifiedReviewAttempts(m, attempts, now)
    .filter(a => Date.parse(a.occurredAt) > completed);
  return [...new Map(valid.map(a => [a.id, a])).values()];
}

/** Read-only chronological handoff. No alternative Review grader, mastery, or stored state. */
export function g13RepairEvidence(
  repair: G12PostTrainingFollowThrough, route: PersonalLearningRoute,
  games: readonly ImportedGame[], mistakes: readonly PersonalMistake[],
  attempts: readonly RecordedReviewAttempt[], now = new Date(),
): G13RepairEvidenceResult | null {
  const time = now.getTime(), completed = boundedTime(repair.completedAt, time);
  const skill = route.handoff.skillId;
  if (completed === null || !skill || !repair.recordId) return null;
  const byId = new Map<string, ImportedGame>();
  const repeatedIds = new Set<string>();
  for (const game of games) {
    if (!game.id || game.source === "training" || !game.reviewStory ||
        boundedTime(game.analyzedAt, time) === null) continue;
    if (byId.has(game.id)) { byId.delete(game.id); repeatedIds.add(game.id); }
    else if (!repeatedIds.has(game.id)) byId.set(game.id, game);
  }
  const validMistakes = mistakes.filter(m => {
    const game = byId.get(m.gameId);
    return Boolean(game && legalReviewMistake(m, game));
  });
  const source = validMistakes.find(m => m.id === route.handoff.mistakeId &&
    m.skillIds.includes(skill));
  const sourceGame = source ? byId.get(source.gameId) : undefined;
  const original = source ? sinceRepair(source, attempts, completed, now) : [];
  const originalClean = original.filter(clean).length;
  const positions: { mistake: PersonalMistake; game: ImportedGame;
    attempts: RecordedReviewAttempt[] }[] = [];
  if (source && sourceGame && route.handoff.recurring) {
    const seenGames = new Set([recordedGameIdentity(sourceGame)]);
    const seenPositions = new Set([lessonPositionKey(source.positionFen)]);
    for (const mistake of validMistakes) {
      const game = byId.get(mistake.gameId);
      if (!game || mistake.id === source.id || !mistake.skillIds.includes(skill)) continue;
      const identity = recordedGameIdentity(game);
      let position: string;
      try { position = lessonPositionKey(mistake.positionFen); }
      catch { continue; }
      if (seenGames.has(identity) || seenPositions.has(position)) continue;
      seenGames.add(identity);
      seenPositions.add(position);
      positions.push({mistake,game,
        attempts: sinceRepair(mistake, attempts, completed, now)});
    }
  }
  const cleanAttempts = positions.flatMap(p => p.attempts.filter(clean))
    .sort((a,b) => Date.parse(a.occurredAt)-Date.parse(b.occurredAt));
  const attempted = positions.filter(p => p.attempts.length > 0).length;
  const cleanPositions = positions.filter(p => p.attempts.some(clean)).length;
  const toPractice = positions.filter(p => !p.attempts.some(clean))
    .sort((a,b) => a.attempts.length - b.attempts.length ||
      b.game.importedAt.localeCompare(a.game.importedAt) ||
      a.mistake.id.localeCompare(b.mistake.id))[0];
  // The G12 candidate has already passed the original prescription target
  // matcher. But imported-after does not mean played-after the Review recall.
  const candidate = games.find(g => g.id === repair.laterGameId &&
    byId.get(g.id) === g && g.source === "lichess" && Boolean(g.practicalMetrics));
  const firstCleanAt = cleanAttempts[0]?.occurredAt ?? null;
  const cleanDay = firstCleanAt ? Date.parse(firstCleanAt.slice(0,10)+"T00:00:00Z") : null;
  const played = candidate ? playedDay(candidate) : null;
  const imported = boundedTime(candidate?.importedAt, time);
  const laterGameId = cleanDay !== null && played !== null &&
    played > cleanDay && played <= time && imported !== null && imported >= played
    ? candidate!.id : null;
  const next: G13NextAction =
    !source ? "await-original" :
    !originalClean ? "review-original" :
    !cleanPositions && toPractice ? "practice-independent" :
    !cleanPositions ? "await-independent" :
    laterGameId ? "review-later-game" : "await-later-game";
  const explanation: Record<G13NextAction,string> = {
    "await-original":"The original verified game mistake is unavailable for Review.",
    "review-original":"Recall the original position unaided after the completed repair.",
    "practice-independent":"Try the skill in another verified human-game position.",
    "await-independent":"No distinct verified game position is available for Review.",
    "review-later-game":"Review the analyzed human game played after independent recall.",
    "await-later-game":"Independent recall is recorded after repair; a later played and analyzed human game is still needed.",
  };
  return {
    original:{attempted:original.length,clean:originalClean},
    independent:{positions:positions.length,attempted,clean:cleanPositions},
    firstIndependentCleanAt:firstCleanAt,
    next,practiceMistakeId:next==="practice-independent" ? toPractice!.mistake.id : null,
    laterGameId,explanation:explanation[next],
  };
}
