import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import partA from "../../public/data/calculation/p103-structures-a-v1.json";
import partB from "../../public/data/calculation/p103-structures-b-v1.json";
import p102a from "../../public/data/calculation/p102-conversion-v1.json";
import p102b from "../../public/data/calculation/p102-activity-v1.json";
import p102c from "../../public/data/calculation/p102-defense-v1.json";
import p102d from "../../public/data/calculation/p102-races-stalemate-v1.json";
import p102e from "../../public/data/calculation/p102-precision-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const studies = [...partA.positions, ...partB.positions] as CalculationPosition[];
const priorFens = new Set([
  ...p102a.positions, ...p102b.positions, ...p102c.positions,
  ...p102d.positions, ...p102e.positions,
].map(p => p.fen));

describe("P103 pawn structures and their plans", () => {
  it("adds 50 original boards, 10 balanced strategic families and no P102 duplicates", () => {
    expect(partA.positions).toHaveLength(25);
    expect(partB.positions).toHaveLength(25);
    expect(studies).toHaveLength(50);
    expect(new Set(studies.map(p => p.id)).size).toBe(50);
    expect(new Set(studies.map(p => p.fen)).size).toBe(50);
    expect(studies.filter(p => priorFens.has(p.fen))).toEqual([]);
    const groups = studies.reduce<Record<string, number>>((acc, p) => {
      acc[p.sourceLabel] = (acc[p.sourceLabel] ?? 0) + 1;
      return acc;
    }, {});
    expect(Object.keys(groups)).toHaveLength(10);
    expect(Object.values(groups).sort((a, b) => a - b))
      .toEqual(Array(10).fill(5));
  });

  it("replays all 50 five-ply references and 100 defensive/candidate variations", () => {
    let alternatives = 0;
    for (const p of studies) {
      const game = new Chess(p.fen);
      expect(game.turn(), p.id).toBe("w");
      expect(game.isGameOver(), p.id).toBe(false);
      expect(p.bestMove, p.id).toBe(p.principalVariation[0]);
      expect(p.principalVariation, p.id).toHaveLength(5);
      expect(legalCalculationBranch(p)?.length, p.id).toBe(5);
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
    expect(alternatives).toBe(100);
  });

  it("represents real structural features rather than only assigning theme labels", () => {
    const get = (p: CalculationPosition, square: "a2"|"b2"|"c2"|"c3"|"c4"|"d4"|"e3"|"e4") =>
      new Chess(p.fen).get(square);
    const whitePawn = (p: CalculationPosition, square: Parameters<typeof get>[1]) => {
      const piece = get(p, square);
      return piece?.type === "p" && piece.color === "w";
    };
    for (const p of studies) {
      const theme = p.sourceLabel;
      if (theme.endsWith("Isolated queen's pawn")) {
        expect(whitePawn(p, "d4"), p.id).toBe(true);
        // The IQP lacks a neighbouring friendly c/e-file pawn anywhere.
        const b = new Chess(p.fen).board();
        const neighbor = b.flat().some(sq => sq?.color === "w" &&
          sq.type === "p" && (sq.square.startsWith("c") || sq.square.startsWith("e")));
        expect(neighbor, p.id).toBe(false);
      }
      if (theme.endsWith("Hanging c- and d-pawns")) {
        expect(whitePawn(p, "c4"), p.id).toBe(true);
        expect(whitePawn(p, "d4"), p.id).toBe(true);
      }
      if (theme.endsWith("Doubled and backward pawns")) {
        const cPawns = new Chess(p.fen).board().flat()
          .filter(sq => sq?.color === "w" && sq.type === "p" && sq.square.startsWith("c"));
        expect(cPawns.length, p.id).toBeGreaterThanOrEqual(2);
      }
      if (theme.endsWith("Carlsbad minority attack")) {
        expect(whitePawn(p, "b2"), p.id).toBe(true);
        expect(p.prompt, p.id).toMatch(/c6|minority|b4/i);
      }
    }
  });

  it("teaches strategic choice, piece placement, pawn levers and independent recall", () => {
    for (const raw of [...partA.positions, ...partB.positions]) {
      const p = raw as CalculationPosition;
      expect(p.source, p.id).toBe("authored");
      expect(p.prompt.length, p.id).toBeGreaterThan(255);
      expect(p.explanation.length, p.id).toBeGreaterThan(1050);
      expect(p.replyReason?.length, p.id).toBeGreaterThan(145);
      expect(p.defensiveStudy?.reflection.length, p.id).toBeGreaterThan(190);
      expect(raw.pawnStructureStudy.independentExercises, p.id).toHaveLength(3);
      expect(raw.pawnStructureStudy.strategicModel.length, p.id).toBeGreaterThan(180);
      expect(raw.pawnStructureStudy.context.length, p.id).toBeGreaterThan(75);
      expect(p.skillIds.some(skill => skill.startsWith("calculation.")), p.id).toBe(true);
    }
  });
});
