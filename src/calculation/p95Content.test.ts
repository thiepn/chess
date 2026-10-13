import { describe, expect, it } from "vitest";
import p95 from "../../public/data/calculation/p95-defensive-resistance-v1.json";
import p94 from "../../public/data/calculation/p94-candidates-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const positions = p95.positions as CalculationPosition[];

describe("P95 defender-resistance instructional corpus", () => {
  it("has forty distinct positions independent of P94, eight in each section", () => {
    expect(positions).toHaveLength(40);
    expect(new Set(positions.map(p => p.id)).size).toBe(40);
    expect(new Set(positions.map(p => p.fen)).size).toBe(40);
    const previous = new Set(p94.positions.map(p => p.fen));
    expect(positions.every(p => !previous.has(p.fen))).toBe(true);
    const groups = positions.reduce<Record<string, number>>((result, p) => {
      result[p.sourceLabel] = (result[p.sourceLabel] ?? 0) + 1;
      return result;
    }, {});
    expect(Object.values(groups).sort()).toEqual([8, 8, 8, 8, 8]);
  });

  it("replays every authored answer and every alternative under real chess legality", () => {
    let branches = 0;
    for (const p of positions) {
      expect(p.source).toBe("authored");
      expect(p.id.startsWith("calc:p95-")).toBe(true);
      expect(p.skillIds).toContain("calculation.reply");
      expect(p.principalVariation.length).toBe(3);
      expect(legalCalculationBranch(p)?.length, p.id).toBe(3);
      for (const alternative of p.defensiveStudy?.variations ?? []) {
        expect(alternative.explanation.length).toBeGreaterThan(50);
        expect(legalCalculationBranch({
          ...p,
          bestMove: alternative.moves[0],
          principalVariation: alternative.moves,
        })?.length, p.id).toBe(alternative.moves.length);
        branches++;
      }
    }
    expect(branches).toBeGreaterThanOrEqual(24);
  });

  it("teaches defensive replies and individual misconceptions, not engine-unique answers", () => {
    for (const p of positions) {
      expect(p.prompt.length, p.id).toBeGreaterThan(100);
      expect(p.explanation.length, p.id).toBeGreaterThan(300);
      expect(p.replyReason?.length, p.id).toBeGreaterThan(45);
      expect(p.continuationReason?.length, p.id).toBeGreaterThan(45);
      expect(p.defensiveStudy?.misconception.length, p.id).toBeGreaterThan(45);
    }
  });
});
