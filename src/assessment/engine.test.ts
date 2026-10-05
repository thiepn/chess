import { describe, expect, it } from "vitest";
import {
  applyAssessmentToState,
  assessmentRemediationSkillIds,
  courseCurriculumFloor,
  buildPlacementAssessment,
  buildStageCheckpoint,
  certificationFromGate,
  completeAssessmentAttempt,
  evaluateStageGate,
  placementProfileFromAttempt,
} from "./engine";
import { curriculumStages, skills } from "../domain/curriculum";
import { emptyMastery } from "../domain/mastery";
import type {
  CurriculumStageId,
  SkillMastery,
  UserState,
} from "../domain/types";
import type { AssessmentItemResult } from "./types";

function baseState(): UserState {
  return {
    mastery: {},
    weaknesses: [],
    recentDomainMinutes: {},
  };
}

function mastery(
  skillId: string,
  options: {
    effective?: number;
    retention?: number;
    transfer?: number;
  } = {},
): SkillMastery {
  return {
    ...emptyMastery(skillId, .5),
    attempts: 6,
    successes: 5,
    effectiveMastery: options.effective ?? 70,
    delayedRetention: options.retention ?? 50,
    trainingTransfer: options.transfer ?? 40,
    confidence: 75,
  };
}

function placementAt(
  stageId: CurriculumStageId,
): UserState["placement"] {
  return {
    attemptId: "placement-1",
    completedAt: "2026-10-05T10:00:00Z",
    recommendedStageId: stageId,
    stageScores: {},
  };
}

describe("course assessment engine", () => {
  it("samples every stage in the placement diagnostic", () => {
    const session = buildPlacementAssessment(
      new Date("2026-10-05T12:00:00Z"),
    );

    expect(session.items).toHaveLength(16);
    for (const stage of curriculumStages) {
      expect(
        session.items.filter((item) => item.stageId === stage.id),
        stage.id,
      ).toHaveLength(2);
    }
  });

  it("places the learner at the first stage that does not clear the sample", () => {
    const session = buildPlacementAssessment(
      new Date("2026-10-05T12:00:00Z"),
    );
    const results: AssessmentItemResult[] = session.items.map((item) => ({
      itemId: item.id,
      skillId: item.skillId,
      stageId: item.stageId,
      success: item.stageId === "learn",
    }));
    const attempt = completeAssessmentAttempt(
      session,
      results,
      new Date("2026-10-05T12:10:00Z"),
    );
    const profile = placementProfileFromAttempt(attempt);

    expect(profile.stageScores.learn).toBe(100);
    expect(profile.stageScores.safety).toBe(0);
    expect(profile.recommendedStageId).toBe("safety");
  });

  it("keeps a passed checkpoint provisional while transfer evidence is missing", () => {
    const stageId: CurriculumStageId = "safety";
    const stageSkills = skills.filter((skill) => skill.stage === stageId);
    const checkpoint = buildStageCheckpoint(
      stageId,
      0,
      new Date("2026-10-05T12:00:00Z"),
    );
    const results = checkpoint.items.map((item) => ({
      itemId: item.id,
      skillId: item.skillId,
      stageId: item.stageId,
      success: true,
    }));
    const attempt = completeAssessmentAttempt(
      checkpoint,
      results,
      new Date("2026-10-05T12:05:00Z"),
    );

    const state: UserState = {
      ...baseState(),
      placement: placementAt("safety"),
      mastery: Object.fromEntries(
        stageSkills.map((skill) => [
          skill.id,
          mastery(skill.id, { transfer: 0 }),
        ]),
      ),
      assessments: [attempt],
    };

    const gate = evaluateStageGate(state, stageId);
    expect(gate.status).toBe("provisional");
    expect(gate.blockers).toContain("transfer");
    expect(gate.metrics.checkpoint).toBe(100);
  });

  it("certifies a stage only when checkpoint breadth retention and transfer all pass", () => {
    const stageId: CurriculumStageId = "safety";
    const stageSkills = skills.filter((skill) => skill.stage === stageId);
    const checkpoint = buildStageCheckpoint(
      stageId,
      0,
      new Date("2026-10-05T12:00:00Z"),
    );
    const results = checkpoint.items.map((item) => ({
      itemId: item.id,
      skillId: item.skillId,
      stageId: item.stageId,
      success: true,
    }));
    const attempt = completeAssessmentAttempt(
      checkpoint,
      results,
      new Date("2026-10-05T12:05:00Z"),
    );
    const state: UserState = {
      ...baseState(),
      placement: placementAt("safety"),
      mastery: Object.fromEntries(
        stageSkills.map((skill) => [skill.id, mastery(skill.id)]),
      ),
      assessments: [attempt],
    };

    const gate = evaluateStageGate(state, stageId);
    const certification = certificationFromGate(gate, attempt);

    expect(gate.status).toBe("passed");
    expect(certification?.stageId).toBe(stageId);
    expect(certification?.checkpointScore).toBe(100);
  });

  it("turns failed checkpoint positions into remediation targets", () => {
    const stageId: CurriculumStageId = "safety";
    const checkpoint = buildStageCheckpoint(
      stageId,
      0,
      new Date("2026-10-05T12:00:00Z"),
    );
    const failedSkill = checkpoint.items[0].skillId;
    const results = checkpoint.items.map((item, index) => ({
      itemId: item.id,
      skillId: item.skillId,
      stageId: item.stageId,
      success: index > 1,
    }));
    const attempt = completeAssessmentAttempt(
      checkpoint,
      results,
      new Date("2026-10-05T12:05:00Z"),
    );

    const state: UserState = {
      ...baseState(),
      placement: placementAt("safety"),
      assessments: [attempt],
    };

    expect(evaluateStageGate(state, stageId).status).toBe("remediation");
    expect(assessmentRemediationSkillIds(state)).toContain(failedSkill);
  });

  it("advances the automatic curriculum floor after certification", () => {
    const state: UserState = {
      ...baseState(),
      placement: placementAt("safety"),
      stageCertifications: {
        safety: {
          stageId: "safety",
          attemptId: "checkpoint-safety",
          passedAt: "2026-10-05T12:00:00Z",
          checkpointScore: 90,
          metrics: {
            coverage: 100,
            mastery: 70,
            retention: 50,
            transfer: 30,
            checkpoint: 90,
          },
          method: "checkpoint",
        },
      },
    };

    expect(courseCurriculumFloor(state)).toBe(2);
  });

  it("does not replace an existing certificate with a failed retake", () => {
    const stageId: CurriculumStageId = "safety";
    const stageSkills = skills.filter((skill) => skill.stage === stageId);
    const session = buildStageCheckpoint(
      stageId,
      0,
      new Date("2026-10-05T12:00:00Z"),
    );
    const results = session.items.map((item) => ({
      itemId: item.id,
      skillId: item.skillId,
      stageId: item.stageId,
      success: false,
    }));
    const prior = {
      stageId,
      attemptId: "old-pass",
      passedAt: "2026-10-01T12:00:00Z",
      checkpointScore: 90,
      metrics: {
        coverage: 100,
        mastery: 70,
        retention: 50,
        transfer: 30,
        checkpoint: 90,
      },
      method: "checkpoint" as const,
    };

    const state: UserState = {
      ...baseState(),
      placement: placementAt("safety"),
      mastery: Object.fromEntries(
        stageSkills.map((skill) => [skill.id, mastery(skill.id)]),
      ),
      stageCertifications: { safety: prior },
    };

    const applied = applyAssessmentToState(
      state,
      session,
      results,
      new Date("2026-10-05T12:05:00Z"),
    );

    expect(applied.certification).toBeNull();
    expect(applied.state.stageCertifications?.safety?.attemptId).toBe("old-pass");
  });

  it("applies placement evidence without certifying skipped stages", () => {
    const state = baseState();
    const session = buildPlacementAssessment(
      new Date("2026-10-05T12:00:00Z"),
    );
    const results = session.items.map((item) => ({
      itemId: item.id,
      skillId: item.skillId,
      stageId: item.stageId,
      success: true,
    }));

    const applied = applyAssessmentToState(
      state,
      session,
      results,
      new Date("2026-10-05T12:10:00Z"),
    );

    expect(applied.state.placement?.recommendedStageId).toBe("practical");
    expect(applied.state.stageCertifications).toBeUndefined();
    expect(
      applied.state.mastery[session.items[0].skillId]?.attempts,
    ).toBe(1);
  });
});
