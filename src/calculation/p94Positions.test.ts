import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import corpus from "../../public/data/calculation/p94-candidates-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const positions = corpus.positions as CalculationPosition[];

describe("P94 original candidate-move calculation studies", () => {
  it("contains forty independent positions in five instructional groups", () => {
    expect(positions).toHaveLength(40);
    expect(new Set(positions.map(item => item.id)).size).toBe(40);
    expect(new Set(positions.map(item => item.fen)).size).toBe(40);
    const groups = positions.reduce<Record<string, number>>((result, item) => {
      result[item.sourceLabel] = (result[item.sourceLabel] ?? 0) + 1;
      return result;
    }, {});
    expect(Object.values(groups).sort()).toEqual([8, 8, 8, 8, 8]);
  });

  it("replays every line with legal moves and the expected side to move", () => {
    for (const item of positions) {
      expect(item.bestMove, item.id).toBe(item.principalVariation[0]);
      expect(new Chess(item.fen).turn(), item.id).toBe(item.playerColor);
      const line = legalCalculationBranch(item);
      expect(line?.length, item.id).toBe(3);
      expect(line?.map(step => step.actor), item.id).toEqual([
        "learner", "opponent", "learner",
      ]);
    }
  });

  it("contains answer explanations, opposing replies and an alternative for comparison", () => {
    for (const item of positions) {
      expect(item.source, item.id).toBe("authored");
      expect(item.skillIds, item.id).toContain("calculation.candidates");
      expect(item.prompt.length, item.id).toBeGreaterThan(65);
      expect(item.explanation.length, item.id).toBeGreaterThan(150);
      expect(item.explanation, item.id).toContain("Compare");
      expect(item.replyReason?.length, item.id).toBeGreaterThan(65);
      expect(item.continuationReason?.length, item.id).toBeGreaterThan(55);
    }
  });
});
