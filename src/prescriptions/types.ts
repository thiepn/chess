export type PrescriptionKind =
  | "opening-repair"
  | "mistake-repair"
  | "phase-repair"
  | "condition-plan"
  | "form-reset";

export type PrescriptionActionKind =
  | "focused-practice"
  | "mistake-replay"
  | "opening-recall"
  | "scenario";

export type PrescriptionTargetDimension =
  | "color"
  | "timeControl"
  | "opponent"
  | "opening"
  | "positionType"
  | "phase"
  | "mistake"
  | "form";

export interface PrescriptionTarget {
  dimension: PrescriptionTargetDimension;
  key: string;
  label: string;
  skillId?: string;
}

export interface PrescriptionBaseline {
  capturedAt: string;
  games: number;
  score: number;
  quality?: number;
  resultPerformance?: number;
  recurrenceRate?: number;
}

export type PrescriptionOutcomeStatus =
  | "untested"
  | "collecting"
  | "improved"
  | "unchanged"
  | "worsened";

export interface PrescriptionOutcomeEvaluation {
  status: PrescriptionOutcomeStatus;
  postGames: number;
  postScore?: number;
  delta?: number;
  confidence: number;
  evaluatedAt: string;
}

export interface PrescriptionEffectivenessRow {
  recordId: string;
  prescriptionId: string;
  kind: PrescriptionKind;
  title: string;
  targetLabel: string;
  status: PrescriptionOutcomeStatus;
  baselineScore: number;
  postScore?: number;
  delta?: number;
  postGames: number;
  confidence: number;
  completions: number;
  trainingSuccessRate?: number;
  issuedAt: string;
  completedAt?: string;
}

export interface CoachEffectivenessInsight {
  issued: number;
  started: number;
  completed: number;
  evaluated: number;
  improved: number;
  unchanged: number;
  worsened: number;
  validationRate: number;
  averageDelta: number;
  byKind: Array<{
    kind: PrescriptionKind;
    evaluated: number;
    improved: number;
    averageDelta: number;
  }>;
  history: PrescriptionEffectivenessRow[];
}

export type CoachPolicyStance =
  | "explore"
  | "neutral"
  | "prefer"
  | "deprioritize";

export interface CoachPolicySignal {
  key: string;
  label: string;
  evaluated: number;
  weightedEvidence: number;
  averageDelta: number;
  improvedRate: number;
  score: number;
  multiplier: number;
  confidence: number;
  stance: CoachPolicyStance;
}

export interface CoachPolicyInsight {
  mode: "cold-start" | "learning" | "personalized";
  evaluatedEpisodes: number;
  learningConfidence: number;
  kindSignals: CoachPolicySignal[];
  actionSignals: CoachPolicySignal[];
  preferredKind?: PrescriptionKind;
  preferredAction?: PrescriptionActionKind;
}

export interface PrescriptionPolicyAdjustment {
  multiplier: number;
  confidence: number;
  stance: CoachPolicyStance;
  reason: string;
  chosenActionKind?: PrescriptionActionKind;
  kindSignal?: CoachPolicySignal;
  actionSignal?: CoachPolicySignal;
}

export interface PrescriptionTrackingRecord {
  id: string;
  prescriptionId: string;
  kind: PrescriptionKind;
  title: string;
  target: PrescriptionTarget;
  issuedAt: string;
  baseline: PrescriptionBaseline;
  starts: number;
  completions: number;
  lastStartedAt?: string;
  lastCompletedAt?: string;
  completedActionIds: string[];
  trainingSuccesses: number;
  trainingQualityTotal: number;
  retiredAt?: string;
  retirementReason?: "resolved" | "improved" | "superseded";
}

export interface TrainingPrescriptionAction {
  id: string;
  kind: PrescriptionActionKind;
  label: string;
  skillId?: string;
  mistakeId?: string;
  repertoireId?: string;
  openingNodeId?: string;
  scenarioId?: string;
}

export interface TrainingPrescription {
  id: string;
  kind: PrescriptionKind;
  title: string;
  rationale: string;
  gamePlan: string[];
  priority: number;
  confidence: number;
  evidenceGames: number;
  diagnosticIds: string[];
  composerEligible: boolean;
  target: PrescriptionTarget;
  baseline: PrescriptionBaseline;
  outcome?: PrescriptionOutcomeEvaluation;
  policy?: PrescriptionPolicyAdjustment;
  actions: TrainingPrescriptionAction[];
}
