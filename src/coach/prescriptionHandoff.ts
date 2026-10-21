import type { TrainingActivity } from "../domain/types";
import type {
  CoachEffectivenessInsight, TrainingPrescription,
  PrescriptionEffectivenessRow,
} from "../prescriptions/types";
import type { G10LearningFeedback } from "./learningFeedback";
import type { PersonalLearningRoute } from "./personalLearningRoute";

export interface G11CoachFollowUp {
  prescriptionId: string;
  title: string;
  targetLabel: string;
  /** Only original existing composer activities qualify as training-ready. */
  planActivityId: string | null;
  action: "open-training" | "independent-practice" | "original-recall" | "observe";
  /** Existing prescription evaluator is authoritative; never infer from raw counts. */
  outcome: {
    status: PrescriptionEffectivenessRow["status"];
    postGames: number;
    completions: number;
    delta: number | null;
  } | null;
  explanation: string;
}

function matchesOriginalIssue(
  p: TrainingPrescription,
  skillId: string,
  originalId: string | null,
  independentId: string | null,
): boolean {
  return p.target.skillId === skillId ||
    p.actions.some(action =>
      action.skillId === skillId ||
      Boolean(action.mistakeId && (
        action.mistakeId === originalId || action.mistakeId === independentId
      )),
    );
}

function sourceOutcome(
  prescriptionId: string,
  effectiveness: CoachEffectivenessInsight,
): G11CoachFollowUp["outcome"] {
  const row = effectiveness.history.find(item =>
    item.prescriptionId === prescriptionId);
  if (!row) return null;
  return {
    status: row.status,
    postGames: row.postGames,
    completions: row.completions,
    delta: Number.isFinite(row.delta) ? row.delta! : null,
  };
}

/**
 * Read-only handoff to the original composer and original prescription
 * effectiveness evaluator. Never creates another schedule or grade.
 */
export function g11CoachFollowUp(
  route: PersonalLearningRoute,
  feedback: G10LearningFeedback,
  prescriptions: readonly TrainingPrescription[],
  effectiveness: CoachEffectivenessInsight,
  scheduled: readonly TrainingActivity[],
): G11CoachFollowUp | null {
  const skillId = route.handoff.skillId;
  if (!skillId) return null;
  const eligible = prescriptions.filter(p =>
    p.id && p.composerEligible &&
    matchesOriginalIssue(p, skillId,
      route.handoff.mistakeId,
      route.independentPosition?.mistakeId ?? null));
  if (!eligible.length) return null;

  // Reuse existing ranked prescription priority, not a G11 priority engine.
  const prescription = eligible[0];
  const plan = scheduled.find(a =>
    a.prescriptionId === prescription.id &&
    a.source === "prescription" &&
    prescription.actions.some(action => action.id === a.prescriptionActionId),
  );
  const outcome = sourceOutcome(prescription.id, effectiveness);
  const needsOriginal = feedback.next === "original";
  const needsTransfer = feedback.next === "different-game";
  const ready = Boolean(plan);

  const action: G11CoachFollowUp["action"] =
    needsOriginal ? "original-recall" :
    needsTransfer ? "independent-practice" :
    ready ? "open-training" : "observe";

  const explanation =
    needsOriginal ? "Recall your original game position before repeating the repair." :
    needsTransfer ? "Try the verified different-game position before judging transfer." :
    ready ? "This repair has an activity in your current training plan." :
    "The current plan has no activity for this repair.";

  return {
    prescriptionId: prescription.id,
    title: prescription.title,
    targetLabel: prescription.target.label,
    planActivityId: plan?.id ?? null,
    action,
    outcome,
    explanation,
  };
}
