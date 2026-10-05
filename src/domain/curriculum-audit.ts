import { curriculumStages, skills } from "./curriculum";
import { lessonCatalogIssues, lessonScripts } from "../learning/lessons";

export interface CurriculumAudit {
  skillCount: number;
  stageCount: number;
  authoredLessonCount: number;
  errors: string[];
  warnings: string[];
}

export function auditCurriculum(): CurriculumAudit {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  const known = new Set(skills.map((skill) => skill.id));

  for (const skill of skills) {
    if (ids.has(skill.id)) errors.push(`duplicate skill id: ${skill.id}`);
    ids.add(skill.id);

    if (!lessonScripts[skill.id]) {
      errors.push(`missing authored lesson: ${skill.id}`);
    }

    if (!skill.trainingModes.length) {
      errors.push(`skill has no training modes: ${skill.id}`);
    }

    if (skill.importance <= 0 || skill.importance > 1) {
      errors.push(`invalid importance: ${skill.id}`);
    }

    if (skill.difficulty < 1 || skill.difficulty > 5) {
      errors.push(`invalid difficulty: ${skill.id}`);
    }

    for (const prerequisite of skill.prerequisites) {
      if (!known.has(prerequisite.skillId)) {
        errors.push(
          `missing prerequisite ${prerequisite.skillId} referenced by ${skill.id}`,
        );
      }
      if (prerequisite.skillId === skill.id) {
        errors.push(`self prerequisite: ${skill.id}`);
      }
    }
  }

  for (const stage of curriculumStages) {
    if (!skills.some((skill) => skill.stage === stage.id)) {
      errors.push(`empty curriculum stage: ${stage.id}`);
    }
  }

  const permanent = new Set<string>();
  const visiting = new Set<string>();

  function visit(skillId: string, trail: string[]) {
    if (permanent.has(skillId)) return;
    if (visiting.has(skillId)) {
      errors.push(`prerequisite cycle: ${[...trail, skillId].join(" -> ")}`);
      return;
    }

    visiting.add(skillId);
    const skill = skills.find((item) => item.id === skillId);
    for (const prerequisite of skill?.prerequisites ?? []) {
      if (known.has(prerequisite.skillId)) {
        visit(prerequisite.skillId, [...trail, skillId]);
      }
    }
    visiting.delete(skillId);
    permanent.add(skillId);
  }

  for (const skill of skills) visit(skill.id, []);

  errors.push(...lessonCatalogIssues());

  const lessonOnly = Object.keys(lessonScripts).filter((id) => !known.has(id));
  for (const id of lessonOnly) warnings.push(`lesson has no curriculum skill: ${id}`);

  return {
    skillCount: skills.length,
    stageCount: curriculumStages.length,
    authoredLessonCount: Object.keys(lessonScripts).filter((id) => known.has(id)).length,
    errors,
    warnings,
  };
}
