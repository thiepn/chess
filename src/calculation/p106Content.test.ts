import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import active from "../../public/data/calculation/p106-active-defense-v1.json";
import queens from "../../public/data/calculation/p106-queen-counterplay-v1.json";
import fortress from "../../public/data/calculation/p106-king-fortress-v1.json";
import p105a from "../../public/data/calculation/p105-checking-networks-v1.json";
import p105b from "../../public/data/calculation/p105-initiative-resistance-v1.json";
import p105c from "../../public/data/calculation/p105-shelter-prophylaxis-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const positions = [
  ...active.positions, ...queens.positions, ...fortress.positions,
] as CalculationPosition[];
const previous = new Set([...p105a.positions, ...p105b.positions, ...p105c.positions]
  .map(p => p.fen));
const caseId = (id: number) => positions.find(p =>
  p.id === `calc:p106-${String(id).padStart(2, "0")}`)!;

describe("P106 original defensive technique and counterplay", () => {
  it("adds 48 distinct original boards in sixteen three-case defensive topics", () => {
    expect([active.positions.length, queens.positions.length, fortress.positions.length])
      .toEqual([15, 15, 18]);
    expect(positions).toHaveLength(48);
    expect(new Set(positions.map(p => p.id)).size).toBe(48);
    expect(new Set(positions.map(p => p.fen)).size).toBe(48);
    expect(positions.filter(p => previous.has(p.fen))).toEqual([]);
    const groups = positions.reduce<Record<string, number>>((acc, p) => {
      acc[p.sourceLabel] = (acc[p.sourceLabel] ?? 0) + 1;
      return acc;
    }, {});
    expect(Object.keys(groups)).toHaveLength(16);
    expect(Object.values(groups)).toEqual(Array(16).fill(3));
  });

  it("legally replays all 48 scored reference and 96 contextual alternatives", () => {
    let alternatives = 0;
    for (const p of positions) {
      const board = new Chess(p.fen);
      expect(board.turn(), p.id).toBe(p.playerColor);
      expect(board.isGameOver(), p.id).toBe(false);
      expect(p.bestMove, p.id).toBe(p.principalVariation[0]);
      expect(p.principalVariation.length, p.id).toBe(5);
      expect(legalCalculationBranch(p)?.length, p.id)
        .toBe(p.principalVariation.length);
      expect(p.defensiveStudy?.variations.length, p.id).toBe(2);
      for (const branch of p.defensiveStudy?.variations ?? []) {
        expect(branch.moves.length, p.id).toBeGreaterThanOrEqual(3);
        expect(legalCalculationBranch({
          ...p, bestMove: branch.moves[0], principalVariation: branch.moves,
        })?.length, p.id).toBe(branch.moves.length);
        expect(branch.explanation.length, p.id).toBeGreaterThan(105);
        alternatives++;
      }
    }
    expect(alternatives).toBe(96);
  });

  it("distinguishes real wrong-bishop stalemate from extra-pawn resources", () => {
    const pure = new Chess(caseId(46).fen);
    for (const move of ["h1g1", "h3h2", "g1h1", "f3g3"]) {
      expect(pure.move({ from: move.slice(0, 2), to: move.slice(2, 4) }))
        .not.toBeNull();
    }
    expect(pure.isStalemate()).toBe(true);
    const captured = new Chess(caseId(46).fen);
    for (const move of caseId(46).principalVariation) {
      expect(captured.move({ from: move.slice(0, 2), to: move.slice(2, 4) }))
        .not.toBeNull();
    }
    expect(captured.isInsufficientMaterial()).toBe(true);
    for (const id of [47, 48]) {
      const board = new Chess(caseId(id).fen);
      for (const move of ["h1g1", "h3h2", "g1h1", "f3g3"]) {
        expect(board.move({ from: move.slice(0, 2), to: move.slice(2, 4) }))
          .not.toBeNull();
      }
      expect(board.isStalemate(), String(id)).toBe(false);
    }
  });

  it("teaches board-dependent attacker resistance, failed defenses and independent recall", () => {
    for (const p of [...active.positions, ...queens.positions, ...fortress.positions]) {
      expect(p.source, p.id).toBe("authored");
      expect(p.prompt.length, p.id).toBeGreaterThan(235);
      expect(p.explanation.length, p.id).toBeGreaterThan(850);
      expect(p.defensiveStudy.reflection.length, p.id).toBeGreaterThan(220);
      expect(p.defensiveTechniqueStudy.exercises, p.id).toHaveLength(3);
      expect(p.defensiveTechniqueStudy.principle.length, p.id).toBeGreaterThan(105);
      for (const exercise of p.defensiveTechniqueStudy.exercises) {
        expect(exercise.prompt.length, p.id).toBeGreaterThan(70);
        expect(exercise.answer.length, p.id).toBeGreaterThan(65);
        expect(exercise.repair.length, p.id).toBeGreaterThan(85);
      }
      expect(p.skillIds.some(s => s.startsWith("calculation.")), p.id).toBe(true);
    }
  });
});
