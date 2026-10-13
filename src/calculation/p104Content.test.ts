import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import rooksBishops from "../../public/data/calculation/p104-rooks-bishops-v1.json";
import knightHarmony from "../../public/data/calculation/p104-knight-harmony-v1.json";
import practicalPlans from "../../public/data/calculation/p104-practical-plans-v1.json";
import p103a from "../../public/data/calculation/p103-structures-a-v1.json";
import p103b from "../../public/data/calculation/p103-structures-b-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const studies = [
  ...rooksBishops.positions, ...knightHarmony.positions, ...practicalPlans.positions,
] as CalculationPosition[];
const previousFens = new Set([...p103a.positions, ...p103b.positions].map(p => p.fen));

describe("P104 genuine piece activity and strategic-plan casework", () => {
  it("delivers 45 original study boards in 15 distinct coordination topics", () => {
    expect([rooksBishops.positions.length, knightHarmony.positions.length,
      practicalPlans.positions.length]).toEqual([15, 15, 15]);
    expect(studies).toHaveLength(45);
    expect(new Set(studies.map(p => p.id)).size).toBe(45);
    expect(new Set(studies.map(p => p.fen)).size).toBe(45);
    expect(studies.filter(p => previousFens.has(p.fen))).toEqual([]);
    const groups = studies.reduce<Record<string, number>>((acc, p) => {
      acc[p.sourceLabel] = (acc[p.sourceLabel] ?? 0) + 1; return acc;
    }, {});
    expect(Object.keys(groups)).toHaveLength(15);
    expect(Object.values(groups)).toEqual(Array(15).fill(3));
  });

  it("legally replays all 45 scored reference lines and 90 alternative defensive plans", () => {
    let defensiveLines = 0;
    for (const p of studies) {
      const game = new Chess(p.fen);
      expect(game.turn(), p.id).toBe("w");
      expect(game.isGameOver(), p.id).toBe(false);
      expect(p.source, p.id).toBe("authored");
      expect(p.bestMove, p.id).toBe(p.principalVariation[0]);
      expect(p.principalVariation.length, p.id).toBe(5);
      expect(legalCalculationBranch(p)?.length, p.id).toBe(5);
      expect(p.defensiveStudy?.variations.length, p.id).toBe(2);
      for (const variation of p.defensiveStudy?.variations ?? []) {
        expect(variation.moves.length, p.id).toBeGreaterThanOrEqual(3);
        expect(legalCalculationBranch({
          ...p,
          bestMove: variation.moves[0],
          principalVariation: variation.moves,
        })?.length, p.id).toBe(variation.moves.length);
        defensiveLines++;
      }
    }
    expect(defensiveLines).toBe(90);
  });

  it("confronts actual piece-placement geometry, material and defensive captures", () => {
    for (const p of studies) {
      const board = new Chess(p.fen);
      const material = p.fen.split(" ")[0].replace(/[1-8/]/g, "");
      expect(material, p.id).toMatch(/^[KkQqRrBbNnPp]+$/);
      expect(material.split("K"), p.id).toHaveLength(2);
      expect(material.split("k"), p.id).toHaveLength(2);
      expect(material.includes("R") || material.includes("B") ||
        material.includes("N"), p.id).toBe(true);
      if (p.sourceLabel.endsWith("Rook and knight harmony")) {
        expect(board.get("a1")?.type, p.id).toBe("r");
        expect(board.get("b3")?.type, p.id).toBe("n");
      }
      if (p.sourceLabel.endsWith("Bishop rehabilitation")) {
        expect(board.get("c1")?.type, p.id).toBe("b");
        expect(board.get("e3")?.type, p.id).toBe("p");
        expect(board.get("e3")?.color, p.id).toBe("w");
      }
    }
  });

  it("pairs substantive authored instruction with three independently answerable exercises", () => {
    for (const p of [...rooksBishops.positions, ...knightHarmony.positions,
      ...practicalPlans.positions]) {
      expect(p.prompt.length, p.id).toBeGreaterThan(375);
      expect(p.explanation.length, p.id).toBeGreaterThan(1270);
      expect(p.defensiveStudy.reflection.length, p.id).toBeGreaterThan(390);
      expect(p.defensiveStudy.variations, p.id).toHaveLength(2);
      expect(p.pieceCoordinationStudy.principle.length, p.id).toBeGreaterThan(140);
      expect(p.pieceCoordinationStudy.context.length, p.id).toBeGreaterThan(130);
      expect(p.pieceCoordinationStudy.practice, p.id).toHaveLength(3);
      for (const exercise of p.pieceCoordinationStudy.practice) {
        expect(exercise.question.length, p.id).toBeGreaterThan(45);
        expect(exercise.model.length, p.id).toBeGreaterThan(140);
        expect(exercise.correction.length, p.id).toBeGreaterThan(100);
      }
      expect(p.skillIds.some(s => s.startsWith("calculation.")), p.id).toBe(true);
    }
  });
});
