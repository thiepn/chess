import type { AiProfile, TimeControlId } from "./types";
import type { RunningClock } from "./gameRecovery";
import type { Color } from "chess.js";

/** These are search-time ceilings, not Elo ratings or guaranteed human playing strength. */
export function opponentThinkBudgetMs(
  profile: Pick<AiProfile, "skillLevel">,
  timeControl: TimeControlId,
  clock: Pick<RunningClock, "whiteMs" | "blackMs">,
  opponentColor: Color,
): number {
  const level = profile.skillLevel;
  const baseMs = level <= 0 ? 300 : level <= 3 ? 500 : level <= 7 ? 850 : 1400;
  if (timeControl === "untimed") return baseMs;
  const remaining = opponentColor === "w" ? clock.whiteMs : clock.blackMs;
  if (!Number.isFinite(remaining)) return 150;
  // Do not consume large chunks of a low clock simply thinking.
  return Math.max(150, Math.min(baseMs, Math.floor(remaining / 30)));
}
