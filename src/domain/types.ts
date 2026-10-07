import type { PuzzleAttemptSummary } from "../puzzles/types";
import type { GameReviewReflection, ImportedGame, PersonalMistake } from "../games/types";
import type { OpeningDeviation, OpeningProgress, OpeningTrainingMode } from "../openings/types";
import type { SavedStudy } from "../library/types";
import type { ExperienceSettings } from "../interaction/types";
import type {
  AssessmentAttempt,
  PlacementProfile,
  StageCertification,
} from "../assessment/types";
import type { LearningAnalyticsState } from "../analytics/types";
import type { AdaptiveTrainingPolicy } from "../adaptation/types";
import type { LichessConnection } from "../lichess/types";
import type { PrescriptionTrackingRecord } from "../prescriptions/types";
import type { LessonMasterySummary } from "../learning/types";
import type { CalculationAttemptSummary, CalculationEvidence } from "../calculation/types";
import type { EndgameAttemptSummary, EndgameEvidence } from "../endgames/types";
import type { ModelGameProgress } from "../model-games/types";

export type CurriculumStageId =
  | "learn"
  | "safety"
  | "build"
  | "tactics"
  | "thinking"
  | "fight"
  | "finish"
  | "practical"
  | "advanced";

export type DomainId =
  | "rules"
  | "fundamentals"
  | "tactics"
  | "calculation"
  | "openings"
  | "strategy"
  | "pawns"
  | "endgames"
  | "attack"
  | "defense"
  | "conversion"
  | "practical";


export type TrainingGoalId =
  | "balanced-growth"
  | "course-progress"
  | "human-transfer"
  | "competition-prep";

export type TrainingBudgetBucket =
  | "retention"
  | "repair"
  | "course"
  | "transfer"
  | "repertoire"
  | "exploration";

export interface CompetitionPlanSettings {
  enabled: boolean;
  eventDate: string;
  label?: string;
  prepWeeks: 4 | 6 | 8 | 12;
  eventDays?: 1 | 2 | 3 | 5 | 7;
  resetDays: 3 | 5 | 7;
}

export interface CompetitionRetrospectiveNote {
  id: string;
  eventDate: string;
  updatedAt: string;
  whatWorked?: string;
  whatFailed?: string;
  nextCycleFocus?: string;
}

export interface TrainingPlanSettings {
  goal: TrainingGoalId;
  weeklyMinutes: number;
  horizonWeeks: 4 | 8 | 12;
  sessionsPerWeek: number;
  autoRecalibrate?: boolean;
  autoRecovery?: boolean;
  manualRecoveryUntil?: string;
  competition?: CompetitionPlanSettings;
  updatedAt: string;
}

export interface TrainingLedgerEntry {
  id: string;
  occurredAt: string;
  skillId: string;
  domain: DomainId;
  source: CandidateSource;
  activityType: TrainingMode;
  bucket: TrainingBudgetBucket;
  minutes: number;
}

export interface PeriodizationAdjustment {
  bucket: TrainingBudgetBucket;
  multiplier: number;
  targetMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  reason: string;
}

export type RelationStrength = "hard" | "soft" | "helpful";

export type TrainingMode =
  | "microReview"
  | "conceptLesson"
  | "guidedDemo"
  | "themedPuzzle"
  | "mixedPuzzle"
  | "personalMistake"
  | "calculation"
  | "openingRecall"
  | "openingPosition"
  | "endgameDrill"
  | "conversionChallenge"
  | "defenseChallenge"
  | "engineGame"
  | "gameReview"
  | "boardVision"
  | "savedStudy";

export interface SkillRelation {
  skillId: string;
  strength: RelationStrength;
}

export interface ChessSkill {
  id: string;
  stage: CurriculumStageId;
  domain: DomainId;
  title: string;
  description: string;
  difficulty: number;
  importance: number;
  curriculumPriority: number;
  prerequisites: SkillRelation[];
  relatedSkills: string[];
  trainingModes: TrainingMode[];
  recommendedRating?: number;
  tags: string[];
}

export interface SkillMastery {
  skillId: string;
  understanding: number;
  recognition: number;
  execution: number;
  mixedRecognition: number;
  delayedRetention: number;
  trainingTransfer: number;
  realGameRecognition: number;
  realGameExecution: number;
  humanGameRecognition?: number;
  humanGameExecution?: number;
  humanGameAttempts?: number;
  aiGameTransfer?: number;
  aiGameAttempts?: number;
  effectiveMastery: number;
  confidence: number;
  attempts: number;
  successes: number;
  realGameAttempts: number;
  lastSeenAt?: string;
  lastSuccessAt?: string;
  nextReviewAt?: string;
  stabilityDays: number;
  difficulty: number;
}

export type EvidenceSource =
  | "lesson"
  | "guided"
  | "themedPuzzle"
  | "mixedPuzzle"
  | "calculation"
  | "endgameTechnique"
  | "openingRecall"
  | "modelGame"
  | "delayedReview"
  | "trainingPosition"
  | "engineGame"
  | "realGame"
  | "humanGame"
  | "aiGameReview"
  | "diagnostic"
  | "checkpoint";

export interface LearningEvidence {
  skillId: string;
  source: EvidenceSource;
  success: boolean;
  quality: number;
  difficulty: number;
  responseTimeMs?: number;
  hintsUsed?: number;
  gameImpact?: number;
  opponentRating?: number;
  timeControlWeight?: number;
  retentionEvidence?: boolean;
  occurredAt: string;
}

export interface UserWeakness {
  skillId: string;
  severity: "critical" | "high" | "normal" | "low" | "background";
  frequency: number;
  recency: number;
  gameImpact: number;
  recurrence: number;
  confidence: number;
}

export type CandidateSource =
  | "review"
  | "weakness"
  | "game"
  | "curriculum"
  | "repertoire"
  | "library"
  | "assessment"
  | "calibration"
  | "focus"
  | "prescription";

export interface TrainingCandidate {
  id: string;
  source: CandidateSource;
  skillIds: string[];
  activityType: TrainingMode;
  estimatedMinutes: number;
  priority: number;
  difficulty: number;
  novelty: number;
  urgency: number;
  reason: string;
  mistakeId?: string;
  openingNodeId?: string;
  repertoireId?: string;
  openingTrainingMode?: OpeningTrainingMode;
  openingLineNodeId?: string;
  studyId?: string;
  scenarioId?: string;
  prescriptionId?: string;
  prescriptionActionId?: string;
  calculationPositionId?: string;
  endgamePositionId?: string;
  adaptivePolicy?: AdaptiveTrainingPolicy;
  periodization?: PeriodizationAdjustment;
}

export interface TrainingActivity extends TrainingCandidate {
  title: string;
  subtitle: string;
}

export interface TrainingOutcome {
  success: boolean;
  quality: number;
  hintsUsed: number;
  wrongAttempts: number;
  puzzleId?: string;
  puzzleRating?: number;
  puzzleSkillIds?: string[];
  mistakeId?: string;
  studyId?: string;
  lessonEvidence?: LessonMasterySummary;
  calculationPositionId?: string;
  calculationEvidence?: CalculationEvidence;
  endgamePositionId?: string;
  endgameEvidence?: EndgameEvidence;
  openingNodeIds?: string[];
  openingConceptCorrect?: boolean;
  openingLineCompleted?: boolean;
}

export type SessionMode = "quick" | "standard" | "deep";

export interface TrainingSession {
  id: string;
  generatedAt: string;
  plannedMinutes: number;
  mode: SessionMode;
  focus?: DomainId;
  weeklyFocus?: TrainingBudgetBucket;
  activities: TrainingActivity[];
}

export interface UserState {
  mastery: Record<string, SkillMastery>;
  weaknesses: UserWeakness[];
  recentDomainMinutes: Partial<Record<DomainId, number>>;
  puzzleHistory?: Record<string, PuzzleAttemptSummary>;
  games?: ImportedGame[];
  mistakes?: PersonalMistake[];
  openingProgress?: Record<string, OpeningProgress>;
  openingDeviations?: OpeningDeviation[];
  savedStudies?: SavedStudy[];
  experience?: ExperienceSettings;
  assessments?: AssessmentAttempt[];
  placement?: PlacementProfile;
  stageCertifications?: Partial<Record<CurriculumStageId, StageCertification>>;
  analytics?: LearningAnalyticsState;
  lichess?: LichessConnection;
  prescriptionHistory?: PrescriptionTrackingRecord[];
  trainingPlan?: TrainingPlanSettings;
  trainingLedger?: TrainingLedgerEntry[];
  competitionRetrospectives?: CompetitionRetrospectiveNote[];
  calculationHistory?: Record<string, CalculationAttemptSummary>;
  endgameHistory?: Record<string, EndgameAttemptSummary>;
  gameReviewReflections?: Record<string, GameReviewReflection>;
  modelGameProgress?: Record<string, ModelGameProgress>;
  focus?: {
    domain: DomainId;
    until?: string;
  };
}
