import type { TrainingSession } from "./types";

/** Only the currently authenticated Chess owner may reuse an active plan. */
export interface ActiveTrainingPlan {
  owner: string;
  session: TrainingSession;
}

/**
 * Recommendations may adapt when mastery changes, but the actual session a
 * learner already entered must retain its sequence until it is exited.
 * This is transient UI continuity, not a second persisted training engine.
 */
export function resolveActiveTrainingSession(
  recommended: TrainingSession,
  locked: ActiveTrainingPlan | null,
  owner: string,
  activeIndex: number | null,
): TrainingSession {
  return activeIndex !== null && locked?.owner === owner
    ? locked.session
    : recommended;
}

/** Selecting a fresh session captures its original complete activity order. */
export function captureTrainingSession(
  recommended: TrainingSession,
  owner: string,
): ActiveTrainingPlan {
  return { owner, session: recommended };
}
