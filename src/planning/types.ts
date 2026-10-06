import type {
  SessionMode,
  TrainingBudgetBucket,
  TrainingGoalId,
  TrainingPlanSettings,
} from "../domain/types";

export type WeeklyPaceStatus =
  | "ahead"
  | "on-track"
  | "behind"
  | "complete";

export interface TrainingBudgetAllocation {
  bucket: TrainingBudgetBucket;
  label: string;
  share: number;
  targetMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  completion: number;
  pressure: number;
}

export interface TrainingHorizonInsight {
  plan: TrainingPlanSettings;
  goalLabel: string;
  goalDescription: string;
  weekStart: string;
  weekEnd: string;
  completedMinutes: number;
  remainingMinutes: number;
  expectedMinutes: number;
  paceStatus: WeeklyPaceStatus;
  activeDays: number;
  remainingSessions: number;
  nextFocus: TrainingBudgetBucket;
  nextFocusLabel: string;
  recommendedSessionMode: SessionMode;
  recommendedSessionMinutes: number;
  horizonTargetMinutes: number;
  effectiveWeeklyMinutes: number;
  managedWeeklyMinutes: number;
  allocations: TrainingBudgetAllocation[];
}

export interface TrainingGoalDefinition {
  id: TrainingGoalId;
  label: string;
  description: string;
  shares: Record<TrainingBudgetBucket, number>;
}


export type AdherenceTrend =
  | "improving"
  | "stable"
  | "declining"
  | "insufficient";

export type ForecastStatus =
  | "insufficient"
  | "ahead"
  | "on-track"
  | "at-risk";

export interface TrainingWeekAdherence {
  weekStart: string;
  weekEnd: string;
  targetMinutes: number;
  completedMinutes: number;
  adherence: number;
  activeDays: number;
}

export interface TrainingAdherenceInsight {
  comparableWeeks: number;
  averageAdherence: number;
  weightedWeeklyMinutes: number;
  consistency: number;
  trend: AdherenceTrend;
  confidence: number;
  weeks: TrainingWeekAdherence[];
}

export interface HorizonForecast {
  status: ForecastStatus;
  planStart: string;
  planEnd: string;
  nominalTargetMinutes: number;
  completedSinceStart: number;
  projectedTotalMinutes: number;
  projectedCompletion: number;
  projectedShortfallMinutes: number;
  sustainableWeeklyMinutes: number;
  predictedWeeksToTarget?: number;
  confidence: number;
}

export interface HorizonRecalibration {
  enabled: boolean;
  active: boolean;
  nominalWeeklyMinutes: number;
  effectiveWeeklyMinutes: number;
  multiplier: number;
  evidenceWeeks: number;
  confidence: number;
  reason: string;
}

export interface TrainingPlanForecast {
  adherence: TrainingAdherenceInsight;
  forecast: HorizonForecast;
  recalibration: HorizonRecalibration;
}


export type LoadManagementStatus =
  | "normal"
  | "watch"
  | "recovery";

export interface LoadManagementInsight {
  recommendation: LoadManagementStatus;
  appliedMode: LoadManagementStatus;
  automaticEnabled: boolean;
  manualRecoveryActive: boolean;
  active: boolean;
  evidenceWeeks: number;
  confidence: number;
  latestWeekMinutes: number;
  recentActiveDays: number;
  baselineWeeklyMinutes: number;
  rampRatio: number;
  overloadWeeks: number;
  loadMultiplier: number;
  managedWeeklyMinutes: number;
  maxSessionMinutes: number;
  bucketMultipliers: Record<TrainingBudgetBucket, number>;
  reason: string;
}
