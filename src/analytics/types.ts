import type {
  CoachEffectivenessInsight,
  TrainingPrescription,
} from "../prescriptions/types";
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

export type CohortDimension =
  | "color"
  | "timeControl"
  | "opponent"
  | "opening"
  | "positionType";

export interface HumanGameCohortInsight {
  dimension: CohortDimension;
  key: string;
  label: string;
  games: number;
  quality: number;
  resultPerformance: number;
  averageCentipawnLoss: number;
  criticalErrorRate: number;
  blunderRate: number;
  practicalScore: number;
  deltaVsBaseline: number;
  confidence: number;
}

export interface PhasePerformanceInsight {
  phase: "opening" | "middlegame" | "endgame";
  games: number;
  averageCentipawnLoss: number;
  criticalPerGame: number;
  quality: number;
}

export interface MistakeFamilyInsight {
  skillId: string;
  label: string;
  games: number;
  occurrences: number;
  averageImpact: number;
  recurrenceRate: number;
}

export interface RecentFormInsight {
  recentGames: number;
  previousGames: number;
  recentQuality: number;
  previousQuality: number;
  qualityDelta: number;
  recentResultPerformance: number;
  previousResultPerformance: number;
  resultDelta: number;
  direction: "improving" | "stable" | "declining" | "insufficient";
}

export interface PracticalDiagnostic {
  id: string;
  severity: "watch" | "priority" | "strength";
  headline: string;
  detail: string;
  dimension?: CohortDimension | "phase" | "form";
  cohortKey?: string;
  games: number;
  confidence: number;
}

export interface RealGameDiagnostics {
  sampleCount: number;
  baselineQuality: number;
  baselineResultPerformance: number;
  baselinePracticalScore: number;
  colors: HumanGameCohortInsight[];
  timeControls: HumanGameCohortInsight[];
  opponents: HumanGameCohortInsight[];
  openings: HumanGameCohortInsight[];
  positionTypes: HumanGameCohortInsight[];
  phases: PhasePerformanceInsight[];
  mistakeFamilies: MistakeFamilyInsight[];
  recentForm: RecentFormInsight;
  diagnostics: PracticalDiagnostic[];
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
  realGameDiagnostics: RealGameDiagnostics;
  prescriptions: TrainingPrescription[];
  coachEffectiveness: CoachEffectivenessInsight;
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
