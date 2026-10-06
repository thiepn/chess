export interface PuzzleRecord {
  id: string;
  initialFen: string;
  solutionMoves: string[];
  rating: number;
  ratingDeviation?: number;
  popularity: number;
  plays: number;
  themes: string[];
  skillIds: string[];
  openingTags?: string[];
  source: "lichess" | "seed" | "personal";
  sourceUrl?: string;
}

export interface PuzzleAttemptSummary {
  puzzleId: string;
  attempts: number;
  successes: number;
  lastAttemptAt: string;
  lastSuccessAt?: string;
  lastQuality: number;
  hintsUsed: number;
  wrongAttempts: number;
}

export interface PuzzleManifestShard {
  file: string;
  count: number;
  minRating: number;
  maxRating: number;
}

export interface PuzzleManifest {
  version: number;
  generatedAt: string;
  source: string;
  upstream?: string;
  license: string;
  total: number;
  uniqueTotal?: number;
  scanned?: number;
  accepted?: number;
  rejected?: number;
  filters?: Record<string, string | number | boolean>;
  shards: Record<string, PuzzleManifestShard>;
}

export interface PuzzleSelectionCriteria {
  skillId: string;
  mastery: number;
  activityDifficulty: number;
  targetRating?: number;
  history?: Record<string, PuzzleAttemptSummary>;
}
