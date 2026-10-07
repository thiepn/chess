export type MotionPreference = "system" | "full" | "reduced";

export interface ExperienceSettings {
  motion: MotionPreference;
  sound: boolean;
  haptics: boolean;
  celebrations: boolean;
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
};
