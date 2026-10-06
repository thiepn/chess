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
  allocations: TrainingBudgetAllocation[];
}

export interface TrainingGoalDefinition {
  id: TrainingGoalId;
  label: string;
  description: string;
  shares: Record<TrainingBudgetBucket, number>;
}
