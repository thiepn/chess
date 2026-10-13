import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import checks from "../../public/data/calculation/p105-checking-networks-v1.json";
import resistance from "../../public/data/calculation/p105-initiative-resistance-v1.json";
import shelter from "../../public/data/calculation/p105-shelter-prophylaxis-v1.json";
import p104Rooks from "../../public/data/calculation/p104-rooks-bishops-v1.json";
import p104Knights from "../../public/data/calculation/p104-knight-harmony-v1.json";
import p104Plans from "../../public/data/calculation/p104-practical-plans-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const studies = [
  ...checks.positions, ...resistance.positions, ...shelter.positions,
] as CalculationPosition[];
const earlier = new Set([
  ...p104Rooks.positions, ...p104Knights.positions, ...p104Plans.positions,
].map(p => p.fen));

describe("P105 original king safety and attacking plans", () => {
  it("adds exactly 45 distinct positions across 15 board-specific attack concepts", () => {
    expect([checks.positions.length, resistance.positions.length, shelter.positions.length])
      .toEqual([15, 15, 15]);
    expect(studies).toHaveLength(45);
    expect(new Set(studies.map(p => p.id)).size).toBe(45);
    expect(new Set(studies.map(p => p.fen)).size).toBe(45);
    expect(studies.filter(p => earlier.has(p.fen))).toEqual([]);
    const counts = studies.reduce<Record<string, number>>((acc, p) => {
      acc[p.sourceLabel] = (acc[p.sourceLabel] ?? 0) + 1;
      return acc;
    }, {});
    expect(Object.keys(counts)).toHaveLength(15);
    expect(Object.values(counts)).toEqual(Array(15).fill(3));
  });

  it("replays all 45 original principal and 90 contrasting move lines using real chess.js", () => {
    let alternatives = 0;
    for (const p of studies) {
      const board = new Chess(p.fen);
      expect(board.turn(), p.id).toBe(p.playerColor);
      expect(board.isGameOver(), p.id).toBe(false);
      expect(p.principalVariation.length, p.id).toBe(5);
      expect(p.bestMove, p.id).toBe(p.principalVariation[0]);
      expect(legalCalculationBranch(p)?.length, p.id).toBe(5);
      expect(p.defensiveStudy?.variations.length, p.id).toBe(2);
      for (const alternative of p.defensiveStudy?.variations ?? []) {
        expect(alternative.moves.length, p.id).toBeGreaterThanOrEqual(3);
        expect(legalCalculationBranch({
          ...p,
          bestMove: alternative.moves[0],
          principalVariation: alternative.moves,
        })?.length, p.id).toBe(alternative.moves.length);
        expect(alternative.explanation.length, p.id).toBeGreaterThan(105);
        alternatives += 1;
      }
    }
    expect(alternatives).toBe(90);
  });

  it("distinguishes defended captures and pawn shelter from forcing attacks", () => {
    const at = (number: number) => studies.find(p =>
      p.id === `calc:p105-${String(number).padStart(2, "0")}`)!;
    for (const n of [28, 29, 30]) {
      expect(at(n).principalVariation[2], at(n).id).toBe("e8e6");
      expect(at(n).defensiveStudy?.variations[1].moves[2], at(n).id)
        .toBe("e8f8");
      expect(new Chess(at(n).fen).get("f7")?.type, at(n).id).toBe("r");
    }
    for (const n of [37, 38, 39]) {
      expect(new Chess(at(n).fen).get("f7")?.type, at(n).id).toBe("p");
      expect(at(n).principalVariation[2], at(n).id).toBe("h5h6");
      expect(at(n).defensiveStudy?.variations[1].moves[2], at(n).id)
        .toBe("h5g6");
    }
    for (const n of [40, 41, 42]) {
      expect(new Chess(at(n).fen).get("g2")?.type, at(n).id).toBe("p");
      expect(new Chess(at(n).fen).get("h2")?.type, at(n).id).toBe("p");
    }
  });

  it("supplies three independent board-dependent exercises and misconception repairs", () => {
    for (const row of [...checks.positions, ...resistance.positions, ...shelter.positions]) {
      const p = row as CalculationPosition;
      expect(p.source, p.id).toBe("authored");
      expect(p.prompt.length, p.id).toBeGreaterThan(300);
      expect(p.explanation.length, p.id).toBeGreaterThan(1100);
      expect(p.replyReason?.length, p.id).toBeGreaterThan(130);
      expect(p.defensiveStudy?.reflection.length, p.id).toBeGreaterThan(260);
      expect(row.kingAttackStudy.attackingPrinciple.length, p.id).toBeGreaterThan(105);
      expect(row.kingAttackStudy.independentExercises, p.id).toHaveLength(3);
      for (const exercise of row.kingAttackStudy.independentExercises) {
        expect(exercise.question.length, p.id).toBeGreaterThan(75);
        expect(exercise.answer.length, p.id).toBeGreaterThan(85);
        expect(exercise.correction.length, p.id).toBeGreaterThan(85);
      }
      expect(p.skillIds.some(s => s.startsWith("calculation.")), p.id).toBe(true);
    }
  });
});
