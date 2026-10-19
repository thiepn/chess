import { describe, expect, it } from "vitest";
import type { TrainingSession } from "./types";
import { resumeAdaptiveSequence, indexForAdaptiveRoute } from "./sessionResume";

function session(ids: string[]): TrainingSession {
  return {
    id: "standard-2026-10-19",
    generatedAt: "2026-10-19T00:00:00.000Z",
    mode: "standard",
    plannedMinutes: ids.length * 5,
    activities: ids.map((id, index) => ({
      id, source: "curriculum", skillIds: ["rules.board"],
      activityType: "conceptLesson", estimatedMinutes: 5 + (index % 2),
      priority: 1, difficulty: 1, novelty: 1, urgency: .5,
      reason: "Learn", title: id, subtitle: "Learn",
    })),
  };
}
const owner = "owner-1";
const path = "/train/session/lesson-B";
const stored = {
  owner, path, activeIndex: 1, activityIds: ["lesson-A", "lesson-B", "lesson-C"],
};

describe("reload of an owner-scoped adaptive training sequence", () => {

  it("tracks browser Back/Forward route changes within the locked session", () => {
    const original = session(["lesson-A", "lesson-B", "lesson-C"]);
    expect(indexForAdaptiveRoute(original, "/train/session/lesson-A")).toBe(0);
    expect(indexForAdaptiveRoute(original, "/train/session/lesson-B")).toBe(1);
    expect(indexForAdaptiveRoute(original, "/train/session/lesson-C")).toBe(2);
    expect(indexForAdaptiveRoute(original, "/train/session/lesson-B")).toBe(1);
  });

  it("resolves canonical URL-encoded activity identities", () => {
    const current = session(["lesson-A", "review:game 1:4"]);
    expect(indexForAdaptiveRoute(current, "/train/session/review%3Agame%201%3A4")).toBe(1);
    expect(indexForAdaptiveRoute(current, "/train/session/review:game 1:4")).toBe(1);
  });

  it("rejects malformed or foreign routes instead of reusing the last index", () => {
    const current = session(["lesson-A", "lesson-B"]);
    for (const path of [
      "/train", "/train/session/", "/review", "/train/session/%zz",
      "/train/session/lesson-C", "/train/session/lesson-A/child",
      "/train/session/%2f", "/train/session/%252F/illegal",
    ]) {
      expect(indexForAdaptiveRoute(current, path), path).toBeNull();
    }
  });

  it("reconstructs the selected order from current-owner canonical activities", () => {
    const current = session(["lesson-C", "lesson-A", "lesson-B"]);
    const resumed = resumeAdaptiveSequence(stored, current, owner, path);
    expect(resumed?.activeIndex).toBe(1);
    expect(resumed?.session.activities.map(item => item.id))
      .toEqual(["lesson-A", "lesson-B", "lesson-C"]);
    expect(resumed?.session.activities[1]).toBe(current.activities[2]);
    expect(resumed?.session.plannedMinutes).toBe(
      resumed?.session.activities.reduce((n, item) => n + item.estimatedMinutes, 0),
    );
  });

  it("never imports cached activity content or another owner's session", () => {
    const current = session(["lesson-C", "lesson-A", "lesson-B"]);
    expect(resumeAdaptiveSequence(stored, current, "owner-2", path)).toBeNull();
    expect(resumeAdaptiveSequence(stored, current, owner, "/train/session/lesson-A")).toBeNull();
  });

  it("rejects a stale or injected exercise rather than inventing valid mastery", () => {
    const current = session(["lesson-A", "lesson-B", "lesson-C"]);
    expect(resumeAdaptiveSequence({ ...stored, activityIds: ["lesson-A", "forged", "lesson-C"] },
      current, owner, path)).toBeNull();
    expect(resumeAdaptiveSequence({ ...stored, activityIds: ["lesson-A", "lesson-C"] },
      current, owner, path)).toBeNull();
    expect(resumeAdaptiveSequence({ ...stored, activeIndex: 2 },
      current, owner, path)).toBeNull();
  });

  it("rejects duplicate, oversized and malformed stored sequences", () => {
    const current = session(["lesson-A", "lesson-B", "lesson-C"]);
    expect(resumeAdaptiveSequence({ ...stored, activityIds: ["lesson-B", "lesson-B"] },
      current, owner, path)).toBeNull();
    expect(resumeAdaptiveSequence({ ...stored, activityIds: Array.from({length:65}, (_, i) => String(i)) },
      current, owner, path)).toBeNull();
    expect(resumeAdaptiveSequence({ ...stored, activeIndex: 1.5 },
      current, owner, path)).toBeNull();
    expect(resumeAdaptiveSequence({ ...stored, path: "/train/session/%zz" },
      current, owner, "/train/session/%zz")).toBeNull();
  });

  it("does not restore a removed candidate after mastery or due dates change", () => {
    const current = session(["lesson-A", "lesson-C"]);
    expect(resumeAdaptiveSequence(stored, current, owner, path)).toBeNull();
  });
});
