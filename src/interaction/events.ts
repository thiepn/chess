import type { CelebrationLevel, FeedbackEvent } from "./types";

export interface ExperienceEventDetail {
  feedback?: FeedbackEvent;
  celebration?: CelebrationLevel;
}

export function emitExperienceEvent(detail: ExperienceEventDetail) {
  window.dispatchEvent(
    new CustomEvent<ExperienceEventDetail>("chess:experience", { detail }),
  );
}
