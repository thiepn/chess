import type {
  PrescriptionOutcomeStatus,
  TrainingPrescriptionAction,
} from "../prescriptions/types";

export type CoachEvidenceState =
  | "cold-start"
  | "building"
  | "grounded";

export type CoachBehaviorState =
  | "not-tested"
  | "waiting"
  | "helping"
  | "unclear"
  | "worsening";

export interface CoachDecision {
  id: string;
  title: string;
  why: string;
  confidence: number;
  evidenceLabel: string;
  nextGameCue?: string;
  prescriptionId?: string;
  action?: TrainingPrescriptionAction;
  outcomeStatus?: PrescriptionOutcomeStatus;
}

export interface CoachBehaviorCheck {
  state: CoachBehaviorState;
  label: string;
  detail: string;
  target?: string;
  postGames: number;
  delta?: number;
}

export interface CoachBrief {
  evidenceState: CoachEvidenceState;
  headline: string;
  summary: string;
  confidence: number;
  confidenceLabel: string;
  humanGames: number;
  decisions: CoachDecision[];
  behaviorCheck: CoachBehaviorCheck;
}
