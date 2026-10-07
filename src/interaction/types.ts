export type MotionPreference = "system" | "full" | "reduced";
export type AppTheme = "graphite" | "obsidian" | "warm-graphite";
export type BoardTheme = "tournament" | "walnut" | "slate";
export type PieceStyle = "classic" | "club" | "minimal";

export interface ExperienceSettings {
  motion: MotionPreference;
  sound: boolean;
  haptics: boolean;
  celebrations: boolean;
  appTheme: AppTheme;
  boardTheme: BoardTheme;
  pieceStyle: PieceStyle;
}

export type FeedbackEvent =
  | "select"
  | "move"
  | "capture"
  | "castle"
  | "promotion"
  | "reveal"
  | "check"
  | "success"
  | "error"
  | "complete"
  | "mate"
  | "navigate";

export type CelebrationLevel = "small" | "medium" | "large";

export const defaultExperienceSettings: ExperienceSettings = {
  motion: "system",
  sound: false,
  haptics: true,
  celebrations: true,
  appTheme: "graphite",
  boardTheme: "tournament",
  pieceStyle: "classic",
};
