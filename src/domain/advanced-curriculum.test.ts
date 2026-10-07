import { describe, expect, it } from "vitest";
import { skills } from "./curriculum";
import { lessonScripts } from "../learning/lessons";
import { authoredPositions } from "../calculation/positions";
import { endgamePositions } from "../endgames/positions";
import { trainingScenarios } from "../play/scenarios";
import { modelGames } from "../model-games/games";

const advanced = skills.filter(
  (skill) => skill.stage === "advanced",
);

describe("P35 advanced curriculum", () => {
  it("adds a deliberately bounded advanced stage", () => {
    expect(advanced).toHaveLength(18);
    expect(
      new Set(advanced.map((skill) => skill.domain)).size,
    ).toBeGreaterThanOrEqual(7);
    expect(
      advanced.every((skill) => skill.difficulty === 5),
    ).toBe(true);
  });

  it("gives every advanced skill the full P28 lesson engine", () => {
    for (const skill of advanced) {
      const lesson = lessonScripts[skill.id];
      expect(lesson, skill.id).toBeTruthy();
      expect(lesson.steps.length, skill.id).toBeGreaterThanOrEqual(8);
      expect(
        lesson.steps.some((step) => step.stage === "transfer"),
        skill.id,
      ).toBe(true);
    }
  });

  it("routes advanced calculation into P29 dedicated positions", () => {
    const supported = new Set(
      authoredPositions.flatMap((position) => position.skillIds),
    );
    for (const skillId of [
      "calculation.branching",
      "calculation.evaluation",
      "tactics.combinations",
      "tactics.defensive-resources",
    ]) {
      expect(supported.has(skillId), skillId).toBe(true);
    }
  });

  it("routes advanced endings and conversion into P31 play-outs", () => {
    const supported = new Set(
      endgamePositions.map((position) => position.skillId),
    );
    for (const skillId of [
      "endgames.rook-checks",
      "endgames.opposite-bishops",
      "endgames.minor-piece",
      "conversion.two-weaknesses",
    ]) {
      expect(supported.has(skillId), skillId).toBe(true);
    }
  });

  it("gives strategic advanced skills resistant engine scenarios", () => {
    const supported = new Set(
      trainingScenarios.map((scenario) => scenario.skillId),
    );
    for (const skillId of [
      "strategy.imbalances",
      "strategy.restriction",
      "strategy.repertoire-middlegames",
      "practical.complications",
    ]) {
      expect(supported.has(skillId), skillId).toBe(true);
    }
  });

  it("teaches advanced strategy inside complete P33 model games", () => {
    const checkpointSkills = new Set(
      modelGames.flatMap((game) =>
        game.checkpoints.map((checkpoint) => checkpoint.skillId),
      ),
    );
    for (const skillId of [
      "strategy.exchanges",
      "strategy.repertoire-middlegames",
      "strategy.imbalances",
      "strategy.coordination",
    ]) {
      expect(checkpointSkills.has(skillId), skillId).toBe(true);
    }
  });
});
