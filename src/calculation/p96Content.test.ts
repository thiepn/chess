import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import corpus from "../../public/data/calculation/p96-quiet-positional-v1.json";
import p94 from "../../public/data/calculation/p94-candidates-v1.json";
import p95 from "../../public/data/calculation/p95-defensive-resistance-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const cases = corpus.positions as CalculationPosition[];

describe("P96 quiet-move educational positions", () => {
  it("supplies 35 distinct new board situations in seven instructional families", () => {
    expect(cases).toHaveLength(35);
    expect(new Set(cases.map(p => p.id)).size).toBe(35);
    expect(new Set(cases.map(p => p.fen)).size).toBe(35);
    const inherited = new Set([...p94.positions, ...p95.positions].map(p => p.fen));
    expect(cases.filter(p => inherited.has(p.fen))).toEqual([]);
    const groups = cases.reduce<Record<string, number>>((acc, p) => {
      acc[p.sourceLabel] = (acc[p.sourceLabel] ?? 0) + 1;
      return acc;
    }, {});
    expect(Object.values(groups).sort()).toEqual(Array(7).fill(5));
  });

  it("replays first three plies and authored alternatives with chess.js", () => {
    for (const p of cases) {
      expect(new Chess(p.fen).turn(), p.id).toBe(p.playerColor);
      expect(legalCalculationBranch(p)?.length, p.id).toBe(3);
      expect(p.principalVariation[0], p.id).toBe(p.bestMove);
      const branches = p.defensiveStudy?.variations ?? [];
      expect(branches.length, p.id).toBeGreaterThan(0);
      for (const branch of branches) {
        expect(legalCalculationBranch({
          ...p, bestMove: branch.moves[0], principalVariation: branch.moves,
        })?.length, p.id).toBe(branch.moves.length);
      }
    }
  });

  it("teaches genuine move-order and defensive tradeoffs beyond a move list", () => {
    for (const p of cases) {
      expect(p.prompt.length, p.id).toBeGreaterThan(80);
      expect(p.explanation.length, p.id).toBeGreaterThan(260);
      expect(p.replyReason?.length, p.id).toBeGreaterThan(35);
      expect(p.continuationReason?.length, p.id).toBeGreaterThan(35);
      expect(p.defensiveStudy?.misconception.length, p.id).toBeGreaterThan(35);
    }
  });
});
