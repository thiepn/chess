import type { ImportedGame } from "../games/types";
import { matchesTarget } from "../prescriptions/outcomes";
import type {
  CoachEffectivenessInsight, PrescriptionTrackingRecord,
  PrescriptionEffectivenessRow,
} from "../prescriptions/types";
import type { G10LearningFeedback } from "./learningFeedback";
import { playedDay, type PersonalLearningRoute } from "./personalLearningRoute";

export type G12NextAction =
  | "recall-original" | "practice-different-game" | "review-later-game"
  | "await-independent-position" | "await-human-games";

export interface G12PostTrainingFollowThrough {
  recordId: string;
  prescriptionId: string;
  title: string;
  completedAt: string;
  completions: number;
  completedActions: number;
  /** Original prescription evaluator, not G12's own efficacy score. */
  outcome: {
    status: PrescriptionEffectivenessRow["status"];
    postGames: number;
    trainingSuccessRate: number | null;
  } | null;
  originalRecall: { cleanUnaided: number; assisted: number; missed: number };
  independentRecall: { cleanPositions: number; attemptedPositions: number } | null;
  next: G12NextAction;
  /** Exact current-owner analyzed Lichess game, not an invented training task. */
  laterGameId: string | null;
  explanation: string;
}

function validTimestamp(value: string | undefined, now: number): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now ? time : null;
}

function relatesToSkill(record: PrescriptionTrackingRecord, skillId: string) {
  return record.target.skillId === skillId ||
    (record.target.dimension === "mistake" && record.target.key === skillId);
}

function matchingLaterGame(
  games: readonly ImportedGame[],
  record: PrescriptionTrackingRecord,
  completedAt: number,
  now: number,
): string | null {
  const candidates = games.filter(game => {
    if (game.source !== "lichess" || !game.id || !game.practicalMetrics ||
        !game.reviewStory || !game.analyzedAt) return false;
    const imported = validTimestamp(game.importedAt, now);
    const analyzed = validTimestamp(game.analyzedAt, now);
    if (imported === null || analyzed === null || imported <= completedAt)
      return false;
    // Import time alone is not evidence the human game was played after repair.
    const actualPlayDay = playedDay(game);
    const completionDay = Date.parse(new Date(completedAt).toISOString().slice(0, 10) + "T00:00:00Z");
    if (actualPlayDay === null || actualPlayDay <= completionDay)
      return false;
    if (record.target.dimension === "phase" &&
        !game.reviewStory.phases.some(phase => phase.phase === record.target.key))
      return false;
    return matchesTarget(game, record.target);
  }).sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  return candidates[0]?.id ?? null;
}

/**
 * One completed owner-scoped original prescription -> original recall ->
 * independent real-game transfer -> reviewed human-game evidence. No writes,
 * new scores, alternative graders, or post-game effectiveness inference.
 */
export function g12PostTrainingFollowThrough(
  route: PersonalLearningRoute,
  feedback: G10LearningFeedback,
  records: readonly PrescriptionTrackingRecord[],
  effectiveness: CoachEffectivenessInsight,
  games: readonly ImportedGame[],
  now = new Date(),
): G12PostTrainingFollowThrough | null {
  const skillId = route.handoff.skillId;
  const currentTime = now.getTime();
  if (!skillId || !Number.isFinite(currentTime)) return null;

  const completed = records
    .filter(record => record.id && record.completions > 0 &&
      relatesToSkill(record, skillId) &&
      validTimestamp(record.lastCompletedAt, currentTime) !== null)
    .sort((a, b) =>
      Date.parse(b.lastCompletedAt!) - Date.parse(a.lastCompletedAt!) ||
      b.issuedAt.localeCompare(a.issuedAt));
  const record = completed[0];
  if (!record) return null;
  const completedAt = Date.parse(record.lastCompletedAt!);
  const evaluation = effectiveness.history.find(row =>
    row.recordId === record.id && row.prescriptionId === record.prescriptionId &&
    row.completions > 0);
  const outcome = evaluation ? {
    status: evaluation.status,
    postGames: evaluation.postGames,
    trainingSuccessRate: typeof evaluation.trainingSuccessRate === "number" &&
      Number.isFinite(evaluation.trainingSuccessRate)
      ? evaluation.trainingSuccessRate : null,
  } : null;

  const independentRecall = feedback.transferAcrossGames ? {
    cleanPositions: feedback.transferAcrossGames.cleanUnaidedPositions,
    attemptedPositions: feedback.transferAcrossGames.attemptedPositions,
  } : null;
  const originalNeeded = Boolean(route.handoff.mistakeId &&
    feedback.original.clean === 0);
  const independentNeeded = Boolean(route.independentPosition &&
    (!feedback.differentGame || feedback.differentGame.clean === 0));
  const laterGameId = matchingLaterGame(games, record, completedAt, currentTime);

  const next: G12NextAction =
    originalNeeded ? "recall-original" :
    independentNeeded ? "practice-different-game" :
    (!independentRecall || independentRecall.cleanPositions === 0)
      ? "await-independent-position" :
    laterGameId ? "review-later-game" : "await-human-games";

  const explanation = next === "recall-original"
    ? "Repeat the verified original game position without assistance."
    : next === "practice-different-game"
      ? "Test the same skill in a different verified human-game position."
      : next === "await-independent-position"
        ? "No clean recall in a separate verified game position is recorded yet."
        : next === "review-later-game"
          ? "Review an analyzed human game imported after the completed repair."
          : "Independent recall is recorded; later analyzed human-game evidence is still needed.";

  return {
    recordId: record.id,
    prescriptionId: record.prescriptionId,
    title: record.title,
    completedAt: record.lastCompletedAt!,
    completions: record.completions,
    completedActions: new Set(record.completedActionIds ?? []).size,
    outcome,
    originalRecall: {
      cleanUnaided: feedback.original.clean,
      assisted: feedback.original.assisted,
      missed: feedback.original.missed,
    },
    independentRecall,
    next,
    laterGameId,
    explanation,
  };
}
