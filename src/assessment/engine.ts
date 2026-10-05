import { Chess } from "chess.js";
import {
  curriculumStages,
  skills,
  skillById,
} from "../domain/curriculum";
import type {
  CurriculumStageId,
  LearningEvidence,
  SkillMastery,
  UserState,
} from "../domain/types";
import { applyEvidence, emptyMastery } from "../domain/mastery";
import { lessonScripts } from "../learning/lessons";
import type {
  AssessmentAttempt,
  AssessmentItem,
  AssessmentItemResult,
  AssessmentSession,
  PlacementProfile,
  StageCertification,
  StageGateEvaluation,
  StageGateMetrics,
  StageGateRequirements,
} from "./types";

const placementAnchorIds = [
  "rules.pieces",
  "rules.mate",
  "fundamentals.hanging",
  "fundamentals.blunder-check",
  "openings.king-safety",
  "strategy.piece-activity",
  "tactics.knight-fork",
  "tactics.pin",
  "calculation.candidates",
  "strategy.open-files",
  "defense.prophylaxis",
  "attack.mating-net",
  "endgames.opposition",
  "conversion.simplify",
  "practical.plan",
  "practical.post-move-check",
];

const transferRequirements: Record<CurriculumStageId, number> = {
  learn: 0,
  safety: 15,
  build: 18,
  tactics: 20,
  thinking: 25,
  fight: 28,
  finish: 22,
  practical: 30,
};

export const baseStageRequirements: Omit<StageGateRequirements, "transfer"> = {
  coverage: 80,
  mastery: 55,
  retention: 35,
  checkpoint: 80,
};

function moveStepForSkill(skillId: string) {
  const lesson = lessonScripts[skillId];
  return lesson?.steps.find((step) => step.type === "move");
}

function assessmentItem(skillId: string, suffix: string): AssessmentItem {
  const skill = skillById[skillId];
  const step = moveStepForSkill(skillId);

  if (!skill || !step || step.type !== "move") {
    throw new Error(`Cannot build assessment item for ${skillId}`);
  }

  const chess = new Chess(step.fen);
  const encoded = step.acceptedMoves[0];
  const move = chess.move({
    from: encoded.slice(0, 2),
    to: encoded.slice(2, 4),
    promotion: encoded.slice(4, 5) || "q",
  });

  if (!move) {
    throw new Error(`Assessment target move is illegal for ${skillId}`);
  }

  return {
    id: `${suffix}:${skillId}`,
    skillId,
    stageId: skill.stage,
    fen: step.fen,
    acceptedMoves: [...step.acceptedMoves],
    answerSan: move.san,
  };
}

export function buildPlacementAssessment(now = new Date()): AssessmentSession {
  return {
    id: `placement:${now.toISOString()}`,
    kind: "placement",
    createdAt: now.toISOString(),
    items: placementAnchorIds.map((skillId) =>
      assessmentItem(skillId, "placement"),
    ),
  };
}

export function checkpointAttemptCount(
  state: UserState,
  stageId: CurriculumStageId,
) {
  return (state.assessments ?? []).filter(
    (attempt) => attempt.kind === "checkpoint" && attempt.stageId === stageId,
  ).length;
}

export function buildStageCheckpoint(
  stageId: CurriculumStageId,
  attemptNumber = 0,
  now = new Date(),
): AssessmentSession {
  const pool = skills
    .filter((skill) => skill.stage === stageId)
    .sort((a, b) => {
      if (b.importance !== a.importance) return b.importance - a.importance;
      return b.difficulty - a.difficulty;
    });

  const count = Math.min(6, pool.length);
  const offset = pool.length ? attemptNumber % pool.length : 0;
  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)];
  const selected = rotated.slice(0, count);

  return {
    id: `checkpoint:${stageId}:${now.toISOString()}`,
    kind: "checkpoint",
    stageId,
    createdAt: now.toISOString(),
    items: selected.map((skill) =>
      assessmentItem(skill.id, `checkpoint:${stageId}`),
    ),
  };
}

export function completeAssessmentAttempt(
  session: AssessmentSession,
  results: AssessmentItemResult[],
  now = new Date(),
): AssessmentAttempt {
  const score = results.length
    ? Math.round(
        (results.filter((result) => result.success).length / results.length) *
          100,
      )
    : 0;

  return {
    id: `attempt:${session.id}`,
    sessionId: session.id,
    kind: session.kind,
    stageId: session.stageId,
    completedAt: now.toISOString(),
    score,
    results,
  };
}

export function placementProfileFromAttempt(
  attempt: AssessmentAttempt,
): PlacementProfile {
  if (attempt.kind !== "placement") {
    throw new Error("Placement profile requires a placement attempt.");
  }

  const stageScores: PlacementProfile["stageScores"] = {};

  for (const stage of curriculumStages) {
    const results = attempt.results.filter(
      (result) => result.stageId === stage.id,
    );
    stageScores[stage.id] = results.length
      ? Math.round(
          (results.filter((result) => result.success).length / results.length) *
            100,
        )
      : 0;
  }

  let recommendedStageId = curriculumStages[0].id;
  for (const stage of curriculumStages) {
    recommendedStageId = stage.id;
    if ((stageScores[stage.id] ?? 0) < 75) break;
  }

  return {
    attemptId: attempt.id,
    completedAt: attempt.completedAt,
    recommendedStageId,
    stageScores,
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function masteryFor(
  state: UserState,
  skillId: string,
): SkillMastery | undefined {
  return state.mastery[skillId];
}

function stageTransferScore(state: UserState, stageId: CurriculumStageId) {
  const values = skills
    .filter((skill) => skill.stage === stageId)
    .map((skill) => {
      const mastery = masteryFor(state, skill.id);
      return mastery
        ? Math.max(
            mastery.trainingTransfer,
            mastery.realGameRecognition,
            mastery.realGameExecution,
          )
        : 0;
    })
    .sort((a, b) => b - a);

  if (!values.length) return 0;
  const representativeCount = Math.max(1, Math.ceil(values.length / 2));
  return Math.round(average(values.slice(0, representativeCount)));
}

function latestCheckpoint(
  state: UserState,
  stageId: CurriculumStageId,
): AssessmentAttempt | undefined {
  return [...(state.assessments ?? [])]
    .filter(
      (attempt) =>
        attempt.kind === "checkpoint" && attempt.stageId === stageId,
    )
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
}

function placementUnlockOrder(state: UserState) {
  const stageId = state.placement?.recommendedStageId;
  if (!stageId) return -1;
  return (
    curriculumStages.find((stage) => stage.id === stageId)?.order ?? -1
  );
}

export function courseCurriculumFloor(state: UserState) {
  let floor = Math.max(0, placementUnlockOrder(state));

  for (const certification of Object.values(
    state.stageCertifications ?? {},
  )) {
    if (!certification) continue;
    const order =
      curriculumStages.find((stage) => stage.id === certification.stageId)
        ?.order ?? 0;
    floor = Math.max(floor, order + 1);
  }

  return Math.min(curriculumStages.length - 1, floor);
}

export function stageRequirements(
  stageId: CurriculumStageId,
): StageGateRequirements {
  return {
    ...baseStageRequirements,
    transfer: transferRequirements[stageId],
  };
}

export function stageSequenceUnlocked(
  state: UserState,
  stageId: CurriculumStageId,
) {
  const stage = curriculumStages.find((item) => item.id === stageId);
  if (!stage) return false;
  if (stage.order === 0) return true;

  const prior = curriculumStages.find((item) => item.order === stage.order - 1);
  if (!prior) return true;
  if (state.stageCertifications?.[prior.id]) return true;

  return placementUnlockOrder(state) >= stage.order;
}

export function evaluateStageGate(
  state: UserState,
  stageId: CurriculumStageId,
): StageGateEvaluation {
  const stageSkills = skills.filter((skill) => skill.stage === stageId);
  const requirements = stageRequirements(stageId);
  const latest = latestCheckpoint(state, stageId);
  const certification = state.stageCertifications?.[stageId];

  const coverage = Math.round(
    (stageSkills.filter(
      (skill) => (masteryFor(state, skill.id)?.attempts ?? 0) > 0,
    ).length /
      Math.max(1, stageSkills.length)) *
      100,
  );
  const mastery = Math.round(
    average(
      stageSkills.map(
        (skill) => masteryFor(state, skill.id)?.effectiveMastery ?? 0,
      ),
    ),
  );
  const retention = Math.round(
    average(
      stageSkills.map(
        (skill) => masteryFor(state, skill.id)?.delayedRetention ?? 0,
      ),
    ),
  );
  const transfer = stageTransferScore(state, stageId);
  const checkpoint = latest?.score ?? 0;

  const metrics: StageGateMetrics = {
    coverage,
    mastery,
    retention,
    transfer,
    checkpoint,
  };

  const blockers = (Object.keys(requirements) as Array<
    keyof StageGateRequirements
  >).filter((key) => metrics[key] < requirements[key]);

  if (certification) {
    return {
      stageId,
      status: "passed",
      metrics,
      requirements,
      blockers: [],
      latestAttemptId: certification.attemptId,
    };
  }

  if (!stageSequenceUnlocked(state, stageId)) {
    return {
      stageId,
      status: "locked",
      metrics,
      requirements,
      blockers,
      latestAttemptId: latest?.id,
    };
  }

  if (!blockers.length) {
    return {
      stageId,
      status: "passed",
      metrics,
      requirements,
      blockers: [],
      latestAttemptId: latest?.id,
    };
  }

  if (latest?.score !== undefined) {
    if (latest.score < requirements.checkpoint) {
      return {
        stageId,
        status: "remediation",
        metrics,
        requirements,
        blockers,
        latestAttemptId: latest.id,
      };
    }

    return {
      stageId,
      status: "provisional",
      metrics,
      requirements,
      blockers,
      latestAttemptId: latest.id,
    };
  }

  const stage = curriculumStages.find((item) => item.id === stageId);
  const placed =
    state.placement &&
    stage &&
    stage.order < placementUnlockOrder(state);

  if (placed) {
    return {
      stageId,
      status: "placed",
      metrics,
      requirements,
      blockers,
    };
  }

  const ready =
    coverage >= Math.min(requirements.coverage, 70) &&
    mastery >= Math.min(requirements.mastery, 45);

  return {
    stageId,
    status: ready ? "ready" : "learning",
    metrics,
    requirements,
    blockers,
  };
}

export function certificationFromGate(
  gate: StageGateEvaluation,
  attempt: AssessmentAttempt,
): StageCertification | null {
  const freshBlockers = (
    Object.keys(gate.requirements) as Array<keyof StageGateRequirements>
  ).filter((key) => gate.metrics[key] < gate.requirements[key]);

  if (
    attempt.kind !== "checkpoint" ||
    !attempt.stageId ||
    gate.stageId !== attempt.stageId ||
    attempt.score < gate.requirements.checkpoint ||
    freshBlockers.length > 0
  ) {
    return null;
  }

  return {
    stageId: gate.stageId,
    attemptId: attempt.id,
    passedAt: attempt.completedAt,
    checkpointScore: attempt.score,
    metrics: gate.metrics,
    method: "checkpoint",
  };
}

export function assessmentRemediationSkillIds(state: UserState) {
  const latest = [...(state.assessments ?? [])]
    .filter((attempt) => attempt.kind === "checkpoint")
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];

  if (!latest?.stageId) return [];

  const failed = latest.results
    .filter((result) => !result.success)
    .map((result) => result.skillId);

  if (latest.score < stageRequirements(latest.stageId).checkpoint && failed.length) {
    return [...new Set(failed)].slice(0, 4);
  }

  const gate = evaluateStageGate(state, latest.stageId);
  if (gate.status !== "provisional") return [];

  if (failed.length) return [...new Set(failed)].slice(0, 4);

  return skills
    .filter((skill) => skill.stage === latest.stageId)
    .sort(
      (a, b) =>
        (state.mastery[a.id]?.effectiveMastery ?? 0) -
        (state.mastery[b.id]?.effectiveMastery ?? 0),
    )
    .slice(0, 3)
    .map((skill) => skill.id);
}


export function applyAssessmentToState(
  state: UserState,
  session: AssessmentSession,
  results: AssessmentItemResult[],
  now = new Date(),
) {
  const attempt = completeAssessmentAttempt(session, results, now);
  const mastery = { ...state.mastery };

  for (const result of results) {
    const skill = skillById[result.skillId];
    if (!skill) continue;

    const base =
      mastery[skill.id] ??
      emptyMastery(skill.id, Math.min(1, skill.difficulty / 5));

    const evidence: LearningEvidence = {
      skillId: skill.id,
      source: session.kind === "placement" ? "diagnostic" : "checkpoint",
      success: result.success,
      quality: result.success ? 1 : 0,
      difficulty: Math.min(1, skill.difficulty / 5),
      occurredAt: now.toISOString(),
    };

    mastery[skill.id] = applyEvidence(base, evidence);
  }

  let next: UserState = {
    ...state,
    mastery,
    assessments: [...(state.assessments ?? []), attempt],
  };

  let placement: PlacementProfile | undefined;
  let certification: StageCertification | null = null;

  if (session.kind === "placement") {
    placement = placementProfileFromAttempt(attempt);
    next = {
      ...next,
      placement,
    };
  } else if (session.stageId) {
    const gate = evaluateStageGate(next, session.stageId);
    certification = certificationFromGate(gate, attempt);

    if (certification) {
      next = {
        ...next,
        stageCertifications: {
          ...(next.stageCertifications ?? {}),
          [session.stageId]: certification,
        },
      };
    }
  }

  return {
    state: next,
    attempt,
    placement,
    certification,
  };
}
