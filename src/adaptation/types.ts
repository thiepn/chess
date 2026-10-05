import type { TrainingMode } from "../domain/types";

export type ChallengeBand =
  | "recovery"
  | "supported"
  | "productive"
  | "stretch"
  | "maintenance";

export interface AdaptiveTrainingPolicy {
  mode: TrainingMode;
  challenge: ChallengeBand;
  targetSuccessLow: number;
  targetSuccessHigh: number;
  targetPuzzleRating?: number;
  priorityMultiplier: number;
  policyConfidence: number;
  recentAttempts: number;
  recentSuccessRate?: number;
  stopPressure: number;
  reason: string;
}
