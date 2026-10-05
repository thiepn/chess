import { describe, expect, it } from "vitest";
import { skillById } from "../domain/curriculum";
import { applyEvidence, emptyMastery } from "../domain/mastery";
import type { LearningEvidence, UserState } from "../domain/types";
import { initialUserState } from "../data/demo";
import {
  appendEvidenceAnalytics,
  ensureAnalyticsState,
} from "./record";
import { buildProgressIntelligence } from "./engine";

function blankState(): UserState {
  return {
    ...initialUserState,
    mastery: {},
    weaknesses: [],
    recentDomainMinutes: {},
    mistakes: [],
    assessments: [],
    stageCertifications: {},
    analytics: undefined,
  };
}

describe("longitudinal analytics", () => {
  it("creates a compact baseline for existing mastery", () => {
    const state = blankState();
    state.mastery["rules.pieces"] = {
      ...emptyMastery("rules.pieces", .2),
      attempts: 4,
      successes: 3,
      effectiveMastery: 48,
      delayedRetention: 31,
      trainingTransfer: 22,
      confidence: 40,
      lastSeenAt: "2026-09-01T10:00:00Z",
    };

    const migrated = ensureAnalyticsState(
      state,
      new Date("2026-10-01T10:00:00Z"),
    );

    expect(migrated.analytics?.events).toHaveLength(1);
    expect(migrated.analytics?.events[0].kind).toBe("baseline");
    expect(migrated.analytics?.events[0].masteryAfter).toBe(48);
  });

  it("records evidence with before and after state", () => {
    const skill = skillById["rules.pieces"];
    const before = emptyMastery(skill.id, skill.difficulty / 5);
    const evidence: LearningEvidence = {
      skillId: skill.id,
      source: "guided",
      success: true,
      quality: 1,
      difficulty: skill.difficulty / 5,
      occurredAt: "2026-10-01T10:00:00Z",
    };
    const after = applyEvidence(before, evidence);
    const analytics = appendEvidenceAnalytics(
      undefined,
      before,
      after,
      evidence,
      "curriculum",
    );

    expect(analytics.events).toHaveLength(1);
    expect(analytics.events[0].masteryBefore).toBe(0);
    expect(analytics.events[0].masteryAfter).toBeGreaterThan(0);
    expect(analytics.events[0].intervention).toBe("curriculum");
  });

  it("derives calibration and intervention effectiveness from real evidence", () => {
    let state = blankState();
    state = ensureAnalyticsState(
      state,
      new Date("2026-09-01T10:00:00Z"),
    );

    const skillIds = [
      "rules.pieces",
      "rules.mate",
      "fundamentals.hanging",
      "openings.king-safety",
      "tactics.pin",
      "calculation.candidates",
    ];

    for (let index = 0; index < skillIds.length; index += 1) {
      const skill = skillById[skillIds[index]];
      const before =
        state.mastery[skill.id] ??
        emptyMastery(skill.id, skill.difficulty / 5);
      const evidence: LearningEvidence = {
        skillId: skill.id,
        source: "checkpoint",
        success: true,
        quality: 1,
        difficulty: skill.difficulty / 5,
        occurredAt: `2026-09-${String(10 + index).padStart(2, "0")}T10:00:00Z`,
      };
      const after = applyEvidence(before, evidence);

      state = {
        ...state,
        mastery: {
          ...state.mastery,
          [skill.id]: after,
        },
        analytics: appendEvidenceAnalytics(
          state.analytics,
          before,
          after,
          evidence,
          "checkpoint",
        ),
      };
    }

    for (let index = 0; index < 4; index += 1) {
      const skill = skillById["openings.development"];
      const before =
        state.mastery[skill.id] ??
        emptyMastery(skill.id, skill.difficulty / 5);
      const evidence: LearningEvidence = {
        skillId: skill.id,
        source: "guided",
        success: true,
        quality: 1,
        difficulty: skill.difficulty / 5,
        occurredAt: `2026-09-${20 + index}T10:00:00Z`,
      };
      const after = applyEvidence(before, evidence);

      state = {
        ...state,
        mastery: {
          ...state.mastery,
          [skill.id]: after,
        },
        analytics: appendEvidenceAnalytics(
          state.analytics,
          before,
          after,
          evidence,
          "curriculum",
        ),
      };
    }

    const intelligence = buildProgressIntelligence(
      state,
      new Date("2026-10-01T10:00:00Z"),
    );

    expect(intelligence.evidenceCount).toBe(10);
    expect(intelligence.calibration.sampleCount).toBe(6);
    expect(intelligence.calibration.label).toBe("underconfident");
    expect(
      intelligence.interventions.some(
        (item) =>
          item.intervention === "curriculum" &&
          item.attempts === 4,
      ),
    ).toBe(true);
    expect(
      intelligence.interventions.some(
        (item) => item.intervention === "checkpoint",
      ),
    ).toBe(false);
    expect(intelligence.trend).toHaveLength(8);
  });

  it("separates repaired from unresolved personal mistakes", () => {
    const state = ensureAnalyticsState(blankState());
    state.mistakes = [
      {
        id: "m1",
        gameId: "g1",
        ply: 1,
        moveNumber: 1,
        playerColor: "w",
        positionFen: "4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1",
        actualMove: "e2e3",
        actualSan: "Qe3",
        bestMove: "e2e7",
        principalVariation: ["e2e7"],
        evaluationBefore: 0,
        evaluationAfter: -200,
        centipawnLoss: 200,
        severity: "mistake",
        skillIds: ["fundamentals.blunder-check"],
        explanation: "Check the reply.",
        createdAt: "2026-09-01T10:00:00Z",
        nextReviewAt: "2026-09-02T10:00:00Z",
        attempts: 2,
        successes: 2,
        resolved: true,
      },
      {
        id: "m2",
        gameId: "g2",
        ply: 3,
        moveNumber: 2,
        playerColor: "w",
        positionFen: "4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1",
        actualMove: "e2e3",
        actualSan: "Qe3",
        bestMove: "e2e7",
        principalVariation: ["e2e7"],
        evaluationBefore: 0,
        evaluationAfter: -300,
        centipawnLoss: 300,
        severity: "blunder",
        skillIds: ["fundamentals.hanging"],
        explanation: "The queen hangs.",
        createdAt: "2026-09-10T10:00:00Z",
        nextReviewAt: "2026-09-11T10:00:00Z",
        attempts: 0,
        successes: 0,
        resolved: false,
      },
    ];

    const intelligence = buildProgressIntelligence(state);
    expect(intelligence.resolvedMistakeCount).toBe(1);
    expect(intelligence.unresolvedMistakeCount).toBe(1);
  });
});
