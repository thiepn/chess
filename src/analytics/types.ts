import type {
  CandidateSource,
  CurriculumStageId,
  DomainId,
  EvidenceSource,
} from "../domain/types";

export type AnalyticsIntervention =
  | CandidateSource
  | "manual"
  | "placement"
  | "checkpoint"
  | "play"
  | "game-review";

export interface LearningAnalyticsEvent {
  id: string;
  kind: "baseline" | "evidence";
  skillId: string;
  stageId: CurriculumStageId;
  domain: DomainId;
  occurredAt: string;
  evidenceSource?: EvidenceSource;
  intervention?: AnalyticsIntervention;
  success?: boolean;
  quality?: number;
  masteryBefore: number;
  masteryAfter: number;
  retentionBefore: number;
  retentionAfter: number;
  transferBefore: number;
  transferAfter: number;
  confidenceBefore: number;
  confidenceAfter: number;
  stabilityBefore: number;
  stabilityAfter: number;
}

export interface LearningAnalyticsState {
  version: 1;
  startedAt: string;
  events: LearningAnalyticsEvent[];
}

export interface TrendPoint {
  label: string;
  at: string;
  mastery: number;
  retention: number;
  transfer: number;
  evidenceCount: number;
}

export interface CalibrationInsight {
  score: number;
  sampleCount: number;
  bias: number;
  label: "insufficient" | "well-calibrated" | "overconfident" | "underconfident";
}

export interface InterventionInsight {
  intervention: AnalyticsIntervention;
  attempts: number;
  successRate: number;
  averageMasteryGain: number;
  averageRetentionGain: number;
  score: number;
}

export interface StageVelocityInsight {
  stageId: CurriculumStageId;
  startedAt?: string;
  certifiedAt?: string;
  days: number;
  evidenceCount: number;
  mastery: number;
  retention: number;
  transfer: number;
}

export interface SkillTrendInsight {
  skillId: string;
  current: number;
  delta30: number;
  retention: number;
  transfer: number;
  humanTransfer: number;
  aiTransfer: number;
  evidenceCount30: number;
}

export interface PracticalStrengthInsight {
  rating: number;
  confidence: number;
  status: "provisional" | "developing" | "established";
  humanGames: number;
  quality: number;
  consistency: number;
  resultPerformance: number;
  humanTransfer: number;
  aiTransfer: number;
  averageOpponentRating?: number;
  timeControls: Array<{
    category: string;
    games: number;
    quality: number;
  }>;
}

export interface ProgressIntelligence {
  historyStartedAt?: string;
  evidenceCount: number;
  evidenceCount30: number;
  activeDays28: number;
  mastery: number;
  masteryDelta30: number;
  retention: number;
  transfer: number;
  humanTransfer: number;
  aiTransfer: number;
  practicalStrength: PracticalStrengthInsight;
  calibration: CalibrationInsight;
  trend: TrendPoint[];
  interventions: InterventionInsight[];
  stages: StageVelocityInsight[];
  improving: SkillTrendInsight[];
  needsAttention: SkillTrendInsight[];
  recurringWeaknesses: string[];
  resolvedMistakeCount: number;
  unresolvedMistakeCount: number;
}
