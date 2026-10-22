import type { LearningAnalyticsEvent } from "../analytics/types";
import { curriculumStages, isSkillUnlocked, readyCurriculumSkills, skills } from "../domain/curriculum";
import type { ChessSkill, CurriculumStageId, SkillMastery } from "../domain/types";

const masteryValue = (record?: SkillMastery) =>
  Math.max(0, Math.min(100, Math.round(record?.effectiveMastery ?? 0)));

/** A course entry is a real, currently accessible skill, never an invented roadmap step. */
export function nextCourseLesson(
  mastery: Record<string, SkillMastery>,
  minimumStageOrder: number,
): { skill: ChessSkill; kind: "next" | "revisit" } | null {
  const recommended = readyCurriculumSkills(mastery, minimumStageOrder)[0];
  if (recommended) return { skill: recommended, kind: "next" };

  const inScope = skills.filter((skill) =>
    (curriculumStages.find((stage) => stage.id === skill.stage)?.order ?? -1) >= minimumStageOrder &&
    isSkillUnlocked(skill, mastery),
  );
  const fallback = inScope[0] ?? skills.find((skill) => isSkillUnlocked(skill, mastery));
  return fallback ? { skill: fallback, kind: "revisit" } : null;
}

/** Mastery is evidence-based; an opened preview is NOT a completed lesson. */
export function chapterEvidence(
  stageId: CurriculumStageId,
  mastery: Record<string, SkillMastery>,
) {
  const members = skills.filter((skill) => skill.stage === stageId);
  const mastered = members.filter((skill) => masteryValue(mastery[skill.id]) >= 75).length;
  const practiced = members.filter((skill) => (mastery[skill.id]?.attempts ?? 0) > 0).length;
  const average = members.length
    ? Math.round(members.reduce((sum, skill) => sum + masteryValue(mastery[skill.id]), 0) / members.length)
    : 0;
  return { total: members.length, mastered, practiced, average };
}

/** Only an actual recorded guided-lesson outcome may label lesson completion. */
export function recordedLessonStatus(
  events: readonly LearningAnalyticsEvent[],
  skillId: string,
): "not-started" | "attempted" | "passed" {
  const attempts = events.filter((event) =>
    event.kind === "evidence" &&
    event.evidenceSource === "lesson" &&
    event.skillId === skillId,
  );
  if (attempts.some((event) => event.success === true)) return "passed";
  return attempts.length ? "attempted" : "not-started";
}
