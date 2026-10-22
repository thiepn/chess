import { describe, expect, it } from "vitest";
import type { TrainingSession } from "./types";
import { captureTrainingSession, resolveActiveTrainingSession } from "./sessionContinuity";

function session(id: string, ids: string[]): TrainingSession {
  return {
    id,
    generatedAt: "2026-10-19T00:00:00.000Z",
    mode: "standard",
    plannedMinutes: ids.length * 5,
    activities: ids.map((item, index) => ({
      id: item, source: "curriculum", skillIds: ["rules.board"],
      activityType: "conceptLesson", estimatedMinutes: 5, priority: 1,
      difficulty: 1, novelty: 1, urgency: .5, reason: "Learn",
      title: item, subtitle: "Learn", 
    })),
  };
}

describe("owner-scoped adaptive session continuity", () => {
  it("keeps the originally accepted next activity despite new mastery rankings", () => {
    const original = session("original", ["lesson-A", "lesson-B", "lesson-C"]);
    const refreshed = session("refreshed", ["lesson-C", "lesson-A", "lesson-D"]);
    const captured = captureTrainingSession(original, "owner-1");
    const active = resolveActiveTrainingSession(refreshed, captured, "owner-1", 1);
    expect(active.activities[1].id).toBe("lesson-B");
    expect(active.activities.map(item => item.id)).toEqual(["lesson-A", "lesson-B", "lesson-C"]);
    expect(refreshed.activities[1].id).toBe("lesson-A");
  });

  it("never reuses a prior profile's training plan after account identity changes", () => {
    const mine = session("mine", ["private-game-review", "practice"]);
    const nextOwner = session("next", ["different-practice"]);
    const captured = captureTrainingSession(mine, "owner-1");
    expect(resolveActiveTrainingSession(nextOwner, captured, "owner-2", 0))
      .toBe(nextOwner);
  });

  it("returns live recommendations after exiting the adaptive runtime", () => {
    const locked = captureTrainingSession(session("before", ["A", "B"]), "owner-1");
    const refreshed = session("after", ["C", "D"]);
    expect(resolveActiveTrainingSession(refreshed, locked, "owner-1", null))
      .toBe(refreshed);
  });

  it("uses current recommendations when a training route resumes without a lock", () => {
    const recommended = session("resume", ["A", "B"]);
    expect(resolveActiveTrainingSession(recommended, null, "owner-1", 1))
      .toBe(recommended);
    expect(captureTrainingSession(recommended, "owner-1").session)
      .toBe(recommended);
  });
});
