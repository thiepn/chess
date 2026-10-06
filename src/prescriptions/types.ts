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
  actions: TrainingPrescriptionAction[];
}
