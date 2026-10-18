import type { TrainingSession } from "./types";

/**
 * Session storage carries only an ordered list of canonical activity IDs,
 * never executable exercises, scoring decisions or owner-owned game data.
 */
export interface StoredAdaptiveSequence {
  owner: string;
  path: string;
  activeIndex: number;
  activityIds: string[];
}

export interface ResumedAdaptiveSequence {
  session: TrainingSession;
  activeIndex: number;
}

/**
 * Rebuild the selected training order using only activities re-derived from
 * the CURRENT owner's composer. A reordered, unavailable or manipulated
 * entry may never silently change the exercise at the visible route.
 */
export function resumeAdaptiveSequence(
  stored: StoredAdaptiveSequence,
  recommended: TrainingSession,
  owner: string,
  path: string,
): ResumedAdaptiveSequence | null {
  const ids = stored.activityIds;
  if (stored.owner !== owner || stored.path !== path ||
      !path.startsWith("/train/session/") ||
      !Array.isArray(ids) || ids.length === 0 || ids.length > 64 ||
      !Number.isInteger(stored.activeIndex) ||
      stored.activeIndex < 0 || stored.activeIndex >= ids.length ||
      ids.some(id => typeof id !== "string" || !id || id.length > 256) ||
      new Set(ids).size !== ids.length) return null;

  let routeId: string;
  try {
    routeId = decodeURIComponent(path.slice("/train/session/".length));
  } catch {
    return null;
  }
  if (ids[stored.activeIndex] !== routeId) return null;

  const current = new Map(recommended.activities.map(item => [item.id, item]));
  if (current.size !== recommended.activities.length) return null;
  const activities = ids.map(id => current.get(id));
  if (activities.some(item => !item)) return null;

  const valid = activities as TrainingSession["activities"];
  return {
    activeIndex: stored.activeIndex,
    session: {
      ...recommended,
      activities: valid,
      plannedMinutes: valid.reduce((total, item) => total + item.estimatedMinutes, 0),
    },
  };
}
