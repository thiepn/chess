import type { UserState } from "../domain/types";
import { evaluatePrescriptionRecord } from "./outcomes";
import type {
  CoachPolicyInsight,
  CoachPolicySignal,
  CoachPolicyStance,
  PrescriptionActionKind,
  PrescriptionKind,
  PrescriptionOutcomeEvaluation,
  PrescriptionTrackingRecord,
  TrainingPrescription,
  TrainingPrescriptionAction,
} from "./types";

const DAY = 86_400_000;
const PRIOR_WEIGHT = 2.5;
const POLICY_EVIDENCE_TARGET = 6;
const POLICY_CONFIDENCE_TARGET = 8;
const HALF_LIFE_DAYS = 120;

interface PolicyEvidenceRow {
  record: PrescriptionTrackingRecord;
  outcome: PrescriptionOutcomeEvaluation;
  utility: number;
  weight: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function outcomeUtility(
  outcome: PrescriptionOutcomeEvaluation,
) {
  const statusValue =
    outcome.status === "improved"
      ? 1
      : outcome.status === "worsened"
        ? -1
        : 0;
  const deltaValue = clamp(
    (outcome.delta ?? 0) / 20,
    -1,
    1,
  );

  return statusValue * .7 + deltaValue * .3;
}

function recencyWeight(
  record: PrescriptionTrackingRecord,
  now: Date,
) {
  const at =
    record.lastCompletedAt ??
    record.retiredAt ??
    record.issuedAt;
  const ageDays = Math.max(
    0,
    (now.getTime() - new Date(at).getTime()) / DAY,
  );

  return Math.max(
    .15,
    2 ** (-ageDays / HALF_LIFE_DAYS),
  );
}

function evaluatedRows(
  state: UserState,
  now: Date,
): PolicyEvidenceRow[] {
  return (state.prescriptionHistory ?? [])
    .map((record) => {
      const outcome = evaluatePrescriptionRecord(
        state,
        record,
        now,
      );
      if (
        outcome.status !== "improved" &&
        outcome.status !== "unchanged" &&
        outcome.status !== "worsened"
      ) {
        return null;
      }

      return {
        record,
        outcome,
        utility: outcomeUtility(outcome),
        weight:
          (outcome.confidence / 100) *
          recencyWeight(record, now),
      };
    })
    .filter(
      (row): row is PolicyEvidenceRow =>
        Boolean(row),
    );
}

function signal(
  key: string,
  label: string,
  rows: PolicyEvidenceRow[],
): CoachPolicySignal {
  const weightedEvidence = rows.reduce(
    (sum, row) => sum + row.weight,
    0,
  );
  const weightedUtility = rows.reduce(
    (sum, row) => sum + row.utility * row.weight,
    0,
  );
  const weightedDelta = rows.reduce(
    (sum, row) =>
      sum + (row.outcome.delta ?? 0) * row.weight,
    0,
  );
  const score =
    weightedUtility /
    (PRIOR_WEIGHT + weightedEvidence);
  const evaluated = rows.length;
  const multiplier =
    evaluated < 2
      ? 1
      : clamp(1 + score * .34, .88, 1.12);
  const stance: CoachPolicyStance =
    evaluated < 2
      ? "explore"
      : score >= .1
        ? "prefer"
        : score <= -.1
          ? "deprioritize"
          : "neutral";

  return {
    key,
    label,
    evaluated,
    weightedEvidence: round(weightedEvidence, 2),
    averageDelta: weightedEvidence
      ? round(weightedDelta / weightedEvidence)
      : 0,
    improvedRate: evaluated
      ? Math.round(
          rows.filter(
            (row) => row.outcome.status === "improved",
          ).length /
            evaluated *
            100,
        )
      : 0,
    score: round(score, 3),
    multiplier: round(multiplier, 3),
    confidence: Math.round(
      Math.min(
        100,
        weightedEvidence /
          POLICY_EVIDENCE_TARGET *
          100,
      ),
    ),
    stance,
  };
}

function actionKindForId(
  actionId: string,
): PrescriptionActionKind | undefined {
  if (actionId.startsWith("focus:")) {
    return "focused-practice";
  }
  if (actionId.startsWith("replay:")) {
    return "mistake-replay";
  }
  if (actionId.startsWith("opening:")) {
    return "opening-recall";
  }
  if (actionId.startsWith("scenario:")) {
    return "scenario";
  }
  return undefined;
}

function actionLabel(kind: PrescriptionActionKind) {
  const labels: Record<PrescriptionActionKind, string> = {
    "focused-practice": "Focused practice",
    "mistake-replay": "Exact mistake replay",
    "opening-recall": "Opening recall",
    scenario: "Resistant scenario",
  };
  return labels[kind];
}

function kindLabel(kind: PrescriptionKind) {
  const labels: Record<PrescriptionKind, string> = {
    "opening-repair": "Opening repair",
    "mistake-repair": "Mistake repair",
    "phase-repair": "Phase repair",
    "condition-plan": "Condition plan",
    "form-reset": "Form reset",
  };
  return labels[kind];
}

function strongestPreferred<T extends string>(
  signals: CoachPolicySignal[],
) {
  return [...signals]
    .filter(
      (item) =>
        item.stance === "prefer" &&
        item.evaluated >= 2,
    )
    .sort(
      (a, b) =>
        b.multiplier - a.multiplier ||
        b.confidence - a.confidence,
    )[0]?.key as T | undefined;
}

export function buildCoachPolicyInsight(
  state: UserState,
  now = new Date(),
): CoachPolicyInsight {
  const rows = evaluatedRows(state, now);
  const kinds: PrescriptionKind[] = [
    "opening-repair",
    "mistake-repair",
    "phase-repair",
    "condition-plan",
    "form-reset",
  ];
  const actions: PrescriptionActionKind[] = [
    "focused-practice",
    "mistake-replay",
    "opening-recall",
    "scenario",
  ];

  const kindSignals = kinds
    .map((kind) =>
      signal(
        kind,
        kindLabel(kind),
        rows.filter(
          (row) => row.record.kind === kind,
        ),
      ),
    )
    .filter((item) => item.evaluated > 0)
    .sort(
      (a, b) =>
        b.multiplier - a.multiplier ||
        b.confidence - a.confidence,
    );

  const actionSignals = actions
    .map((kind) => {
      const matching: PolicyEvidenceRow[] = [];

      for (const row of rows) {
        const completedKinds = [
          ...new Set(
            row.record.completedActionIds
              .map(actionKindForId)
              .filter(
                (
                  value,
                ): value is PrescriptionActionKind =>
                  Boolean(value),
              ),
          ),
        ];
        if (!completedKinds.includes(kind)) continue;

        matching.push({
          ...row,
          weight:
            row.weight /
            Math.max(1, completedKinds.length),
        });
      }

      return signal(
        kind,
        actionLabel(kind),
        matching,
      );
    })
    .filter((item) => item.evaluated > 0)
    .sort(
      (a, b) =>
        b.multiplier - a.multiplier ||
        b.confidence - a.confidence,
    );

  const weightedEvidence = rows.reduce(
    (sum, row) => sum + row.weight,
    0,
  );
  const mode: CoachPolicyInsight["mode"] =
    rows.length < 2
      ? "cold-start"
      : rows.length < 6
        ? "learning"
        : "personalized";

  return {
    mode,
    evaluatedEpisodes: rows.length,
    learningConfidence: Math.round(
      Math.min(
        100,
        weightedEvidence /
          POLICY_CONFIDENCE_TARGET *
          100,
      ),
    ),
    kindSignals,
    actionSignals,
    preferredKind:
      strongestPreferred<PrescriptionKind>(
        kindSignals,
      ),
    preferredAction:
      strongestPreferred<PrescriptionActionKind>(
        actionSignals,
      ),
  };
}

function actionSignalFor(
  insight: CoachPolicyInsight,
  action: TrainingPrescriptionAction,
) {
  return insight.actionSignals.find(
    (item) => item.key === action.kind,
  );
}

export function rankPrescriptionActions(
  state: UserState,
  prescription: TrainingPrescription,
  now = new Date(),
) {
  const insight = buildCoachPolicyInsight(state, now);

  return prescription.actions
    .map((action, index) => ({
      action,
      index,
      signal: actionSignalFor(insight, action),
    }))
    .sort(
      (a, b) =>
        (b.signal?.multiplier ?? 1) -
          (a.signal?.multiplier ?? 1) ||
        (b.signal?.confidence ?? 0) -
          (a.signal?.confidence ?? 0) ||
        a.index - b.index,
    )
    .map((item) => item.action);
}

export function applyCoachPolicy(
  state: UserState,
  prescription: TrainingPrescription,
  now = new Date(),
): TrainingPrescription {
  const insight = buildCoachPolicyInsight(state, now);
  const actions = rankPrescriptionActions(
    state,
    prescription,
    now,
  );
  const kindSignal = insight.kindSignals.find(
    (item) => item.key === prescription.kind,
  );
  const chosenActionKind = actions[0]?.kind;
  const actionSignal = chosenActionKind
    ? insight.actionSignals.find(
        (item) => item.key === chosenActionKind,
      )
    : undefined;

  const kindShift =
    kindSignal && kindSignal.evaluated >= 2
      ? kindSignal.multiplier - 1
      : 0;
  const actionShift =
    actionSignal && actionSignal.evaluated >= 2
      ? actionSignal.multiplier - 1
      : 0;
  let multiplier = clamp(
    1 + kindShift * .65 + actionShift * .35,
    .9,
    1.1,
  );

  if (prescription.outcome?.status === "worsened") {
    multiplier = Math.max(1, multiplier);
  }

  const stance: CoachPolicyStance =
    insight.mode === "cold-start"
      ? "explore"
      : multiplier >= 1.015
        ? "prefer"
        : multiplier <= .985
          ? "deprioritize"
          : "neutral";

  const reason =
    stance === "explore"
      ? "Policy learning is still collecting validated outcomes, so diagnosis remains the deciding signal."
      : stance === "prefer"
        ? "Past validated prescriptions of this type or action family transferred better, so this plan gets a modest learned boost."
        : stance === "deprioritize"
          ? "Past validated prescriptions of this type or action family transferred poorly, so this plan is kept but receives less automatic priority."
          : "Validated history does not support a strong policy preference yet.";

  return {
    ...prescription,
    priority: prescription.priority * multiplier,
    actions,
    policy: {
      multiplier: round(multiplier, 3),
      confidence: Math.max(
        kindSignal?.confidence ?? 0,
        actionSignal?.confidence ?? 0,
        insight.learningConfidence,
      ),
      stance,
      reason,
      chosenActionKind,
      kindSignal,
      actionSignal,
    },
  };
}
