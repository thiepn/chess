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

  it("credits dedicated calculation evidence to execution and transfer", () => {
    const previous = {
      ...emptyMastery("calculation.candidates"),
      understanding: 60,
      recognition: 58,
      mixedRecognition: 40,
      execution: 35,
      trainingTransfer: 20,
    };

    const next = applyEvidence(previous, {
      skillId: "calculation.candidates",
      source: "calculation",
      success: true,
      quality: .9,
      difficulty: .8,
      occurredAt: "2026-10-05T12:00:00Z",
    });

    expect(next.execution).toBeGreaterThan(previous.execution);
    expect(next.mixedRecognition).toBeGreaterThan(previous.mixedRecognition);
    expect(next.trainingTransfer).toBeGreaterThan(previous.trainingTransfer);
  });
});
