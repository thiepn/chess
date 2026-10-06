import { describe, expect, it } from "vitest";
import type { RealGameDiagnostics } from "../analytics/types";
import type {
  CoachEffectivenessInsight,
  CoachPolicyInsight,
  TrainingPrescription,
} from "../prescriptions/types";
import { buildCoachBrief } from "./brief";

const diagnostics: RealGameDiagnostics = {
  sampleCount: 0,
  baselineQuality: 0,
  baselineResultPerformance: 0,
  baselinePracticalScore: 0,
  colors: [],
  timeControls: [],
  opponents: [],
  openings: [],
  positionTypes: [],
  phases: [],
  mistakeFamilies: [],
  recentForm: {
    recentGames: 0,
    previousGames: 0,
    recentQuality: 0,
    previousQuality: 0,
    qualityDelta: 0,
    recentResultPerformance: 0,
    previousResultPerformance: 0,
    resultDelta: 0,
    direction: "insufficient",
  },
  diagnostics: [],
};

const policy: CoachPolicyInsight = {
  mode: "cold-start",
  evaluatedEpisodes: 0,
  learningConfidence: 0,
  kindSignals: [],
  actionSignals: [],
};

const effectiveness: CoachEffectivenessInsight = {
  issued: 0,
  started: 0,
  completed: 0,
  evaluated: 0,
  improved: 0,
  unchanged: 0,
  worsened: 0,
  validationRate: 0,
  averageDelta: 0,
  byKind: [],
  history: [],
};

const prescription: TrainingPrescription = {
  id: "p1",
  kind: "mistake-repair",
  title: "Repair calculation before exchanges",
  rationale: "The same calculation error appeared repeatedly.",
  gamePlan: ["Before trading, calculate the opponent’s forcing reply."],
  priority: 1,
  confidence: 76,
  evidenceGames: 4,
  diagnosticIds: ["d1"],
  composerEligible: true,
  target: {
    dimension: "mistake",
    key: "calculation",
    label: "Calculation errors",
    skillId: "calculation.reply",
  },
  baseline: {
    capturedAt: "2026-10-01T00:00:00Z",
    games: 4,
    score: 52,
  },
  actions: [
    {
      id: "focus:calculation.reply",
      kind: "focused-practice",
      label: "Practice calculation",
      skillId: "calculation.reply",
    },
  ],
};

describe("P34 coach brief", () => {
  it("says I don't know yet during cold start instead of inventing a diagnosis", () => {
    const brief = buildCoachBrief({
      humanGames: 1,
      evidenceCount: 10,
      diagnostics,
      prescriptions: [],
      effectiveness,
      policy,
    });

    expect(brief.evidenceState).toBe("cold-start");
    expect(brief.headline.toLowerCase()).toContain("don’t know");
    expect(brief.decisions).toHaveLength(1);
    expect(brief.decisions[0].evidenceLabel).toContain("1/3");
  });

  it("surfaces at most three actionable decisions", () => {
    const brief = buildCoachBrief({
      humanGames: 8,
      evidenceCount: 50,
      diagnostics: {
        ...diagnostics,
        sampleCount: 8,
      },
      prescriptions: [
        prescription,
        { ...prescription, id: "p2", title: "Second" },
        { ...prescription, id: "p3", title: "Third" },
        { ...prescription, id: "p4", title: "Fourth" },
      ],
      effectiveness,
      policy: {
        ...policy,
        mode: "personalized",
        learningConfidence: 80,
      },
    });

    expect(brief.evidenceState).toBe("grounded");
    expect(brief.decisions).toHaveLength(3);
    expect(brief.decisions[0].action?.kind).toBe("focused-practice");
  });

  it("keeps later human-game validation separate from training success", () => {
    const brief = buildCoachBrief({
      humanGames: 10,
      evidenceCount: 80,
      diagnostics,
      prescriptions: [prescription],
      effectiveness: {
        ...effectiveness,
        issued: 1,
        started: 1,
        completed: 1,
        history: [
          {
            recordId: "r1",
            prescriptionId: "p1",
            kind: "mistake-repair",
            title: prescription.title,
            targetLabel: "Calculation errors",
            status: "collecting",
            baselineScore: 52,
            postGames: 1,
            confidence: 20,
            completions: 1,
            issuedAt: "2026-10-01T00:00:00Z",
          },
        ],
      },
      policy,
    });

    expect(brief.behaviorCheck.state).toBe("waiting");
    expect(brief.behaviorCheck.detail).toContain("2 more matching human games");
  });

  it("reports improved later games in plain language", () => {
    const brief = buildCoachBrief({
      humanGames: 12,
      evidenceCount: 90,
      diagnostics,
      prescriptions: [prescription],
      effectiveness: {
        ...effectiveness,
        issued: 1,
        started: 1,
        completed: 1,
        evaluated: 1,
        improved: 1,
        validationRate: 100,
        history: [
          {
            recordId: "r1",
            prescriptionId: "p1",
            kind: "mistake-repair",
            title: prescription.title,
            targetLabel: "Calculation errors",
            status: "improved",
            baselineScore: 52,
            postScore: 66,
            delta: 14,
            postGames: 4,
            confidence: 80,
            completions: 1,
            issuedAt: "2026-10-01T00:00:00Z",
          },
        ],
      },
      policy,
    });

    expect(brief.behaviorCheck.state).toBe("helping");
    expect(brief.behaviorCheck.detail).toContain("+14");
  });
});
