import { describe, expect, it } from "vitest";
import type { UserState } from "../domain/types";
import type { ImportedGame } from "../games/types";
import {
  applyCoachPolicy,
  buildCoachPolicyInsight,
} from "./policy";
import type {
  PrescriptionKind,
  PrescriptionTrackingRecord,
  TrainingPrescription,
} from "./types";

function game(
  id: string,
  importedAt: string,
  quality: number,
): ImportedGame {
  return {
    id,
    pgn: "test",
    source: "lichess",
    externalId: id,
    importedAt,
    analyzedAt: importedAt,
    playerColor: "w",
    white: "User",
    black: "Opponent",
    result: "1-0",
    rated: true,
    timeControl: "600+5",
    timeControlCategory: "rapid",
    playerRating: 1400,
    opponentRating: 1420,
    moves: [],
    criticalMomentIds: [],
    practicalMetrics: {
      averageCentipawnLoss: Math.max(10, 100 - quality),
      criticalErrorRate: Math.max(0, 90 - quality) / 2,
      blunderRate: quality < 50 ? 8 : 1,
      qualityScore: quality,
      resultScore: 70,
      skillValidations: [],
    },
  };
}

function record(
  id: string,
  kind: PrescriptionKind,
  actionId: string,
  baselineScore: number,
): PrescriptionTrackingRecord {
  return {
    id,
    prescriptionId: `prescription:${id}`,
    kind,
    title: id,
    target: {
      dimension: "form",
      key: "recent",
      label: "Recent human-game form",
      skillId: "practical.resilience",
    },
    issuedAt: "2026-09-30T08:00:00Z",
    baseline: {
      capturedAt: "2026-09-30T08:00:00Z",
      games: 4,
      score: baselineScore,
      quality: baselineScore,
    },
    starts: 1,
    completions: 1,
    lastStartedAt: "2026-09-30T09:00:00Z",
    lastCompletedAt: "2026-09-30T09:10:00Z",
    completedActionIds: [actionId],
    trainingSuccesses: 1,
    trainingQualityTotal: .9,
    retiredAt: "2026-10-01T08:00:00Z",
    retirementReason: "resolved",
  };
}

function state(
  history: PrescriptionTrackingRecord[],
  quality = 82,
): UserState {
  return {
    mastery: {},
    weaknesses: [],
    recentDomainMinutes: {},
    games: [
      game("g1", "2026-10-01T10:00:00Z", quality),
      game("g2", "2026-10-02T10:00:00Z", quality + 1),
      game("g3", "2026-10-03T10:00:00Z", quality + 2),
    ],
    prescriptionHistory: history,
  };
}

function prescription(): TrainingPrescription {
  return {
    id: "prescription:form:reset",
    kind: "form-reset",
    title: "Reset the practical process",
    rationale: "Recent human-game quality is declining.",
    gamePlan: ["Threat", "Candidates", "Blunder check"],
    priority: .7,
    confidence: 75,
    evidenceGames: 5,
    diagnosticIds: ["form:declining"],
    composerEligible: true,
    target: {
      dimension: "form",
      key: "recent",
      label: "Recent human-game form",
      skillId: "practical.resilience",
    },
    baseline: {
      capturedAt: "2026-10-04T08:00:00Z",
      games: 5,
      score: 55,
      quality: 55,
    },
    actions: [
      {
        id: "focus:practical.resilience",
        kind: "focused-practice",
        label: "Focused resilience practice",
        skillId: "practical.resilience",
      },
      {
        id: "replay:m1",
        kind: "mistake-replay",
        label: "Replay exact mistake",
        skillId: "practical.resilience",
        mistakeId: "m1",
      },
    ],
  };
}

describe("P20 coach policy learning", () => {
  it("keeps a single validated episode neutral instead of overfitting", () => {
    const insight = buildCoachPolicyInsight(
      state([
        record(
          "one",
          "form-reset",
          "replay:m1",
          45,
        ),
      ]),
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(insight.mode).toBe("cold-start");
    expect(insight.evaluatedEpisodes).toBe(1);
    expect(insight.kindSignals[0].stance).toBe("explore");
    expect(insight.kindSignals[0].multiplier).toBe(1);
    expect(insight.preferredKind).toBeUndefined();
  });

  it("learns a modest preference only after repeated validated transfer", () => {
    const insight = buildCoachPolicyInsight(
      state([
        record(
          "one",
          "form-reset",
          "replay:m1",
          45,
        ),
        record(
          "two",
          "form-reset",
          "replay:m2",
          46,
        ),
        record(
          "three",
          "form-reset",
          "replay:m3",
          44,
        ),
      ]),
      new Date("2026-10-06T12:00:00Z"),
    );

    const kind = insight.kindSignals.find(
      (item) => item.key === "form-reset",
    );
    const action = insight.actionSignals.find(
      (item) => item.key === "mistake-replay",
    );

    expect(insight.mode).toBe("learning");
    expect(kind?.stance).toBe("prefer");
    expect(kind?.multiplier).toBeGreaterThan(1);
    expect(kind?.multiplier).toBeLessThanOrEqual(1.12);
    expect(action?.stance).toBe("prefer");
    expect(insight.preferredKind).toBe("form-reset");
    expect(insight.preferredAction).toBe("mistake-replay");
  });

  it("reorders actions toward validated transfer without removing alternatives", () => {
    const learnedState = state([
      record(
        "one",
        "form-reset",
        "replay:m1",
        45,
      ),
      record(
        "two",
        "form-reset",
        "replay:m2",
        46,
      ),
      record(
        "three",
        "form-reset",
        "replay:m3",
        44,
      ),
    ]);

    const adjusted = applyCoachPolicy(
      learnedState,
      prescription(),
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(adjusted.actions).toHaveLength(2);
    expect(adjusted.actions[0].kind).toBe("mistake-replay");
    expect(adjusted.actions[1].kind).toBe("focused-practice");
    expect(adjusted.policy?.stance).toBe("prefer");
    expect(adjusted.policy?.multiplier).toBeGreaterThan(1);
  });

  it("deprioritizes repeatedly ineffective action families but keeps them available", () => {
    const poorState = state(
      [
        record(
          "one",
          "form-reset",
          "replay:m1",
          85,
        ),
        record(
          "two",
          "form-reset",
          "replay:m2",
          84,
        ),
        record(
          "three",
          "form-reset",
          "replay:m3",
          86,
        ),
      ],
      40,
    );

    const adjusted = applyCoachPolicy(
      poorState,
      prescription(),
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(adjusted.actions).toHaveLength(2);
    expect(adjusted.actions[0].kind).toBe("focused-practice");
    expect(adjusted.actions[1].kind).toBe("mistake-replay");
    expect(adjusted.policy?.multiplier).toBeLessThan(1);
  });
});
