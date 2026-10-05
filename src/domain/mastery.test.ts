import { describe, expect, it } from "vitest";
import { applyEvidence, emptyMastery } from "./mastery";

describe("mastery evidence timing", () => {
  it("does not count an immediate checkpoint as delayed retention", () => {
    const previous = {
      ...emptyMastery("tactics.pin"),
      lastSeenAt: "2026-10-05T10:00:00Z",
      delayedRetention: 20,
    };

    const next = applyEvidence(previous, {
      skillId: "tactics.pin",
      source: "checkpoint",
      success: true,
      quality: 1,
      difficulty: .6,
      occurredAt: "2026-10-05T12:00:00Z",
    });

    expect(next.delayedRetention).toBe(20);
  });

  it("credits checkpoint retention after at least one day of spacing", () => {
    const previous = {
      ...emptyMastery("tactics.pin"),
      lastSeenAt: "2026-10-03T10:00:00Z",
      delayedRetention: 20,
    };

    const next = applyEvidence(previous, {
      skillId: "tactics.pin",
      source: "checkpoint",
      success: true,
      quality: 1,
      difficulty: .6,
      occurredAt: "2026-10-05T12:00:00Z",
    });

    expect(next.delayedRetention).toBeGreaterThan(20);
  });
});
