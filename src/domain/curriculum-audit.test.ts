import { describe, expect, it } from "vitest";
import { auditCurriculum } from "./curriculum-audit";
import { curriculumStages, skills } from "./curriculum";

describe("curriculum completeness", () => {
  it("has a substantial beginner-through-advanced course", () => {
    const audit = auditCurriculum();

    expect(audit.stageCount).toBe(9);
    expect(audit.skillCount).toBeGreaterThanOrEqual(80);
    expect(audit.authoredLessonCount).toBe(audit.skillCount);
    expect(audit.errors).toEqual([]);
  });

  it("keeps every stage meaningfully populated", () => {
    for (const stage of curriculumStages) {
      expect(
        skills.filter((skill) => skill.stage === stage.id).length,
        stage.id,
      ).toBeGreaterThanOrEqual(5);
    }
  });

  it("keeps every skill connected to practice or transfer", () => {
    for (const skill of skills) {
      expect(skill.trainingModes.length, skill.id).toBeGreaterThan(0);
      expect(
        skill.trainingModes.some((mode) =>
          [
            "guidedDemo",
            "themedPuzzle",
            "mixedPuzzle",
            "calculation",
            "openingPosition",
            "endgameDrill",
            "conversionChallenge",
            "defenseChallenge",
            "engineGame",
            "gameReview",
            "boardVision",
            "microReview",
            "conceptLesson",
          ].includes(mode),
        ),
        skill.id,
      ).toBe(true);
    }
  });
});
