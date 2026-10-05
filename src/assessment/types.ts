import type { CurriculumStageId } from "../domain/types";

export type AssessmentKind = "placement" | "checkpoint";

export interface AssessmentItem {
  id: string;
  skillId: string;
  stageId: CurriculumStageId;
  fen: string;
  acceptedMoves: string[];
  answerSan: string;
}

export interface AssessmentSession {
  id: string;
  kind: AssessmentKind;
  stageId?: CurriculumStageId;
  createdAt: string;
  items: AssessmentItem[];
}

export interface AssessmentItemResult {
  itemId: string;
  skillId: string;
  stageId: CurriculumStageId;
  success: boolean;
  playedMove?: string;
}

export interface AssessmentAttempt {
  id: string;
  sessionId: string;
  kind: AssessmentKind;
  stageId?: CurriculumStageId;
  completedAt: string;
  score: number;
  results: AssessmentItemResult[];
}

export interface PlacementProfile {
  attemptId: string;
  completedAt: string;
  recommendedStageId: CurriculumStageId;
  stageScores: Partial<Record<CurriculumStageId, number>>;
}

export type StageGateStatus =
  | "locked"
  | "learning"
  | "ready"
  | "placed"
  | "remediation"
  | "provisional"
  | "passed";

export interface StageGateMetrics {
  coverage: number;
  mastery: number;
  retention: number;
  transfer: number;
  checkpoint: number;
}

export interface StageGateRequirements {
  coverage: number;
  mastery: number;
  retention: number;
  transfer: number;
  checkpoint: number;
}

export interface StageGateEvaluation {
  stageId: CurriculumStageId;
  status: StageGateStatus;
  metrics: StageGateMetrics;
  requirements: StageGateRequirements;
  blockers: Array<keyof StageGateMetrics>;
  latestAttemptId?: string;
}

export interface StageCertification {
  stageId: CurriculumStageId;
  attemptId: string;
  passedAt: string;
  checkpointScore: number;
  metrics: StageGateMetrics;
  method: "checkpoint";
}
