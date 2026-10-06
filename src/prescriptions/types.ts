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
  actions: TrainingPrescriptionAction[];
}
