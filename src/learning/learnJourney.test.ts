import { describe, expect, it } from "vitest";
import { curriculumStages, isSkillUnlocked, skills } from "../domain/curriculum";
import type { SkillMastery } from "../domain/types";
import type { LearningAnalyticsEvent } from "../analytics/types";
import { chapterEvidence, nextCourseLesson, recordedLessonStatus } from "./learnJourney";

const stateFor = (skillId: string, mastery: number, attempts: number): SkillMastery =>
  ({ skillId, effectiveMastery: mastery, attempts }) as SkillMastery;

describe("Learn course journey", () => {
  it("chooses a genuinely accessible, not-yet-mastered first lesson", () => {
    const continuation = nextCourseLesson({}, 0);
    expect(continuation).not.toBeNull();
    expect(continuation?.kind).toBe("next");
    expect(continuation && isSkillUnlocked(continuation.skill, {})).toBe(true);
  });

  it("never fabricates an additional chapter when every skill is mastered", () => {
    const mastery = Object.fromEntries(
      skills.map((skill) => [skill.id, stateFor(skill.id, 100, 2)]),
    );
    const continuation = nextCourseLesson(mastery, 4);
    expect(continuation?.kind).toBe("revisit");
    expect(curriculumStages.find((stage) =>
      stage.id === continuation?.skill.stage)?.order).toBeGreaterThanOrEqual(4);
  });

  it("keeps recorded attempts separate from strong skill evidence", () => {
    const first = skills.find((skill) => skill.stage === curriculumStages[0].id);
    expect(first).toBeDefined();
    const mastery = { [first!.id]: stateFor(first!.id, 45, 2) };
    const chapter = chapterEvidence(curriculumStages[0].id, mastery);
    expect(chapter.practiced).toBe(1);
    expect(chapter.mastered).toBe(0);
    expect(chapter.average).toBeGreaterThan(0);
  });

  it("marks a lesson passed only from a real guided-lesson outcome", () => {
    const other: LearningAnalyticsEvent = {
      kind: "evidence", evidenceSource: "themedPuzzle", skillId: "skill-1", success: true,
    } as LearningAnalyticsEvent;
    const attempted: LearningAnalyticsEvent = {
      ...other, evidenceSource: "lesson", success: false,
    };
    const passed: LearningAnalyticsEvent = { ...attempted, success: true };

    expect(recordedLessonStatus([], "skill-1")).toBe("not-started");
    expect(recordedLessonStatus([other], "skill-1")).toBe("not-started");
    expect(recordedLessonStatus([attempted], "skill-1")).toBe("attempted");
    expect(recordedLessonStatus([attempted, passed], "skill-1")).toBe("passed");
    expect(recordedLessonStatus([passed], "another-skill")).toBe("not-started");
  });
});
