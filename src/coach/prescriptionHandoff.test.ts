import { describe, expect, it } from "vitest";
import type { TrainingActivity } from "../domain/types";
import type { CoachEffectivenessInsight, TrainingPrescription } from "../prescriptions/types";
import type { PersonalLearningRoute } from "./personalLearningRoute";
import type { G10LearningFeedback } from "./learningFeedback";
import { g11CoachFollowUp } from "./prescriptionHandoff";

const SKILL = "tactics.forks";
const originalMistakeId = "mistake:original";
const alternateMistakeId = "mistake:transfer";

function route(skillId: string | null = SKILL): PersonalLearningRoute {
  return {
    handoff: {
      mistakeId: originalMistakeId, skillId, skillTitle: "Forks",
      evidenceGames: 3, gameCountLabel: "Observed in 3 analyzed human games",
      recurring: true, due: true, observation: "Verified human games", gameMove: 12,
    },
    independentPosition: {
      mistakeId: alternateMistakeId, gameId: "human-game-2",
      moveNumber: 17, recordedAttempts: 1,
    },
    originalRecall: { recordedAttempts: 2, cleanAttempts: 1 },
    later: { analyzedGames: 3, gamesWithVerifiedMistakes: 1 },
  };
}

function feedback(next: G10LearningFeedback["next"]): G10LearningFeedback {
  const recall = {
    attempted: 2, clean: 1, assisted: 1, missed: 0,
    spacedCleanRecalls: false, latestCleanAt: "2026-10-18T08:00:00Z",
  };
  return {
    original: recall, differentGame: recall,
    guided: { observed: 2, successful: 1 },
    independentPractice: { observed: 1, successful: 1 },
    transferAcrossGames: { verifiedPositions: 2, attemptedPositions: 2,
      cleanUnaidedPositions: 1, needsIndependentRetry: 1 },
    afterIndependentRecall: { distinctAnalyzedGames: 3,
      gamesWithVerifiedSkillMistake: 1 },
    next,
  };
}

function prescription(skillId=SKILL, id="prescription:mistake:forks",
  eligible=true): TrainingPrescription {
  return {
    id, kind: "mistake-repair", title: "Repair tactical forks",
    rationale: "Existing analyzed human-game evidence",
    gamePlan: ["Recognize the original danger"],
    priority: .9, confidence: 75, evidenceGames: 3,
    diagnosticIds: ["mistake-family:forks"], composerEligible: eligible,
    target: { dimension: "mistake", key: skillId,
      label: "Tactical forks", skillId },
    baseline: { capturedAt: "2026-10-10T00:00:00Z", games: 3, score: 40 },
    actions: [{ id: "focus:forks", kind: "focused-practice",
      label: "Practice forks", skillId }],
  };
}

function activity(): TrainingActivity {
  return {
    id: "prescription:mistake:forks:focus:forks", source: "prescription",
    skillIds: [SKILL], activityType: "mixedPuzzle",
    estimatedMinutes: 5, priority: 1, difficulty: .5,
    novelty: .2, urgency: .8, reason: "Original prescribed practice",
    title: "Practice forks",
    prescriptionId: "prescription:mistake:forks",
    prescriptionActionId: "focus:forks",
  } as TrainingActivity;
}

function effectiveness(
  status: "improved" | "collecting" | "worsened" = "improved",
): CoachEffectivenessInsight {
  return {
    history: [{
      recordId: "record:forks", prescriptionId: "prescription:mistake:forks",
      kind: "mistake-repair", title: "Repair tactical forks",
      targetLabel: "Tactical forks", status,
      baselineScore: 40, postScore: 58,
      delta: 18, postGames: 3, confidence: 72,
      completions: 1, issuedAt: "2026-10-10T00:00:00Z",
      completedAt: "2026-10-17T00:00:00Z",
    }],
  } as CoachEffectivenessInsight;
}

describe("G11 native prescription and game-review continuity", () => {
  it("opens existing scheduled prescription only after prior original and independent practice", () => {
    const result = g11CoachFollowUp(
      route(), feedback("observe"), [prescription()], effectiveness(),
      [activity()],
    )!;
    expect(result).toMatchObject({
      prescriptionId: "prescription:mistake:forks",
      title: "Repair tactical forks",
      targetLabel: "Tactical forks",
      planActivityId: "prescription:mistake:forks:focus:forks",
      action: "open-training",
      outcome: { status: "improved", postGames: 3,
        completions: 1, delta: 18 },
    });
    expect(result.explanation).toContain("current training plan");
  });

  it("does not skip first recall or different-game transfer to push another training plan", () => {
    expect(g11CoachFollowUp(route(),feedback("original"),
      [prescription()],effectiveness(),[activity()])?.action).toBe("original-recall");
    expect(g11CoachFollowUp(route(),feedback("different-game"),
      [prescription()],effectiveness(),[activity()])?.action).toBe("independent-practice");
  });

  it("does not invent a scheduled training action when the composer has not chosen it", () => {
    const result=g11CoachFollowUp(route(),feedback("observe"),
      [prescription()],effectiveness(),[])!;
    expect(result.action).toBe("observe");
    expect(result.planActivityId).toBeNull();
    expect(result.explanation).toContain("no activity");
  });

  it("refuses unrelated, unqualified or missing canonical skills", () => {
    expect(g11CoachFollowUp(route(null),feedback("observe"),
      [prescription()],effectiveness(),[activity()])).toBeNull();
    expect(g11CoachFollowUp(route(),feedback("observe"),
      [prescription("tactics.pins")],effectiveness(),[activity()])).toBeNull();
    expect(g11CoachFollowUp(route(),feedback("observe"),
      [prescription(SKILL,undefined,false)],effectiveness(),[activity()])).toBeNull();
  });

  it("requires actual matching composer action identity and source", () => {
    const altered = { ...activity(), prescriptionActionId: "forged" };
    const unrelated = { ...activity(), source: "manual" as TrainingActivity["source"] };
    expect(g11CoachFollowUp(route(),feedback("observe"),
      [prescription()],effectiveness(),[altered,unrelated])?.planActivityId).toBeNull();
  });

  it("does not fabricate evaluated effectiveness when the original evaluator has no row", () => {
    const empty = { ...effectiveness(), history: [] };
    const result = g11CoachFollowUp(route(),feedback("observe"),
      [prescription()],empty,[activity()])!;
    expect(result.outcome).toBeNull();
    expect(result.action).toBe("open-training");
  });

  it("keeps original evaluator statuses unchanged including collecting and worsened", () => {
    for (const status of ["collecting","worsened"] as const) {
      const result = g11CoachFollowUp(route(),feedback("observe"),
        [prescription()],effectiveness(status),[activity()])!;
      expect(result.outcome?.status).toBe(status);
    }
  });

  it("can match original source-linked mistake actions without inventing another skill", () => {
    const linked = {
      ...prescription("tactics.pins"),
      actions: [{ id:"review:original", kind:"mistake-replay" as const,
        label:"Original human-game position", mistakeId:originalMistakeId }],
    };
    const result=g11CoachFollowUp(route(),feedback("observe"),
      [linked],effectiveness(),[activity()]);
    expect(result?.prescriptionId).toBe(linked.id);
    expect(result?.planActivityId).toBeNull();
  });
});
