import type { Color } from "chess.js";
import type { ImportedGame } from "../games/types";

export type PlayMode =
  | "standard"
  | "opening"
  | "conversion"
  | "defense"
  | "endgame"
  | "replay";

export type AiProfileId =
  | "gentle"
  | "developing"
  | "club"
  | "strong"
  | "adaptive";

export interface AiProfile {
  id: AiProfileId;
  name: string;
  description: string;
  skillLevel: number;
  depth: number;
  accent: string;
}

export interface TrainingScenario {
  id: string;
  mode: Exclude<PlayMode, "standard">;
  title: string;
  subtitle: string;
  description: string;
  fen: string;
  playerColor: Color;
  skillId: string;
  objective: string;
  successResults: Array<"win" | "draw" | "loss">;
  sourceLabel: string;
  prescriptionId?: string;
  prescriptionActionId?: string;
}

export interface PlaySetup {
  mode: PlayMode;
  playerColor: Color;
  aiProfileId: AiProfileId;
  scenarioId?: string;
}

export interface PlayResult {
  outcome: "win" | "draw" | "loss" | "resigned";
  reason:
    | "checkmate"
    | "stalemate"
    | "draw"
    | "insufficient"
    | "threefold"
    | "fifty-move"
    | "resignation";
  pgn: string;
  importedGame: ImportedGame;
  scenarioId?: string;
  scenarioSuccess?: boolean;
  aiProfileId: AiProfileId;
  trainingSkillId?: string;
  prescriptionId?: string;
  prescriptionActionId?: string;
  completedAt: string;
}
