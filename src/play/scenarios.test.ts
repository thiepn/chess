import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { trainingScenarios, validateTrainingScenarios } from "./scenarios";

describe("training scenarios", () => {
  it("contains only legal unfinished positions", () => {
    expect(validateTrainingScenarios()).toBe(true);

    for (const scenario of trainingScenarios) {
      const chess = new Chess(scenario.fen);
      expect(chess.isGameOver(), scenario.id).toBe(false);
      expect(chess.turn(), scenario.id).toBe(scenario.playerColor);
    }
  });

  it("covers all specialized P7 play modes", () => {
    const modes = new Set(trainingScenarios.map((scenario) => scenario.mode));
    expect(modes).toEqual(
      new Set(["opening", "conversion", "defense", "endgame"]),
    );
  });
});
