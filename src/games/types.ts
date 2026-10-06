import type { Color } from "chess.js";

export type MistakeSeverity = "inaccuracy" | "mistake" | "blunder";
export type GamePhase = "opening" | "middlegame" | "endgame";
export type StoryMomentKind = "critical" | "turning-point" | "strong";
export type ReviewErrorType =
  | "tactical-miss"
  | "calculation-failure"
  | "strategic-plan"
  | "time-management"
  | "execution-error"
  | "opening-deviation";

export type ReviewThoughtTag =
  | "candidate-search"
  | "calculation"
  | "threat-awareness"
  | "plan"
  | "time-pressure"
  | "opening-memory"
  | "execution"
  | "unsure";

export interface GameReviewReflection {
  momentId: string;
  gameId: string;
  ply: number;
  thoughtTag?: ReviewThoughtTag;
  thoughtNote?: string;
  retryMove?: string;
  retrySuccess?: boolean;
  hintUsed?: boolean;
  bestRevealed?: boolean;
  continuationRevealed?: boolean;
  retained?: boolean;
  relatedPracticeStarted?: boolean;
  updatedAt: string;
}

export interface ImportedGameMove {
  ply: number;
  moveNumber: number;
  color: Color;
  san: string;
  uci: string;
  from: string;
  to: string;
  piece: string;
  captured?: string;
  beforeFen: string;
  afterFen: string;
  clockSecondsAfterMove?: number;
  moveTimeSeconds?: number;
}

export interface GamePhaseSummary {
  phase: GamePhase;
  startPly: number;
  endPly: number;
  headline: string;
  summary: string;
  averageCentipawnLoss: number;
  criticalCount: number;
}

export interface GameStoryMoment {
  id: string;
  mistakeId?: string;
  ply: number;
  moveNumber: number;
  phase: GamePhase;
  kind: StoryMomentKind;
  severity?: MistakeSeverity;
  positionFen: string;
  actualMove: string;
  actualSan: string;
  bestMove: string;
  bestSan: string;
  principalVariation: string[];
  evaluationBefore: number;
  evaluationAfter: number;
  centipawnLoss: number;
  skillIds: string[];
  title: string;
  summary: string;
  errorType?: ReviewErrorType;
  errorReason?: string;
  moveTimeSeconds?: number;
}

export interface GameReviewStory {
  headline: string;
  summary: string;
  verdict: "clean" | "competitive" | "uneven" | "costly";
  phases: GamePhaseSummary[];
  moments: GameStoryMoment[];
  prioritySkillId?: string;
  generatedAt: string;
}

export type ImportedGameSource = "manual" | "lichess" | "training";
export type TimeControlCategory =
  | "bullet"
  | "blitz"
  | "rapid"
  | "classical"
  | "correspondence"
  | "unknown";

export interface GameSkillValidation {
  skillId: string;
  occurrences: number;
  averageCentipawnLoss: number;
}

export interface PracticalGameMetrics {
  averageCentipawnLoss: number;
  criticalErrorRate: number;
  blunderRate: number;
  qualityScore: number;
  resultScore: number;
  skillValidations: GameSkillValidation[];
}

export interface ImportedGame {
  id: string;
  pgn: string;
  source?: ImportedGameSource;
  externalId?: string;
  externalUrl?: string;
  importedAt: string;
  analyzedAt?: string;
  playerColor: Color;
  white: string;
  black: string;
  result: string;
  event?: string;
  site?: string;
  date?: string;
  openingName?: string;
  eco?: string;
  rated?: boolean;
  timeControl?: string;
  timeControlCategory?: TimeControlCategory;
  playerRating?: number;
  opponentRating?: number;
  practicalMetrics?: PracticalGameMetrics;
  startingFen?: string;
  moves: ImportedGameMove[];
  criticalMomentIds: string[];
  analysisEngine?: string;
  reviewStory?: GameReviewStory;
}

export interface EngineEvaluation {
  scoreCp: number;
  mate?: number;
  bestMove: string;
  pv: string[];
  depth: number;
}

export interface EngineMoveReview {
  gameId: string;
  gameSource?: ImportedGameSource;
  ply: number;
  move: ImportedGameMove;
  before: EngineEvaluation;
  after: EngineEvaluation;
  centipawnLoss: number;
}

export interface PersonalMistake {
  id: string;
  gameId: string;
  gameSource?: ImportedGameSource;
  ply: number;
  moveNumber: number;
  playerColor: Color;
  positionFen: string;
  actualMove: string;
  actualSan: string;
  bestMove: string;
  principalVariation: string[];
  evaluationBefore: number;
  evaluationAfter: number;
  centipawnLoss: number;
  severity: MistakeSeverity;
  skillIds: string[];
  explanation: string;
  errorType?: ReviewErrorType;
  errorReason?: string;
  moveTimeSeconds?: number;
  createdAt: string;
  nextReviewAt: string;
  attempts: number;
  successes: number;
  lastAttemptAt?: string;
  resolved: boolean;
}

export interface GameAnalysisProgress {
  completed: number;
  total: number;
  phase: "loading-engine" | "analyzing" | "classifying" | "complete";
}
