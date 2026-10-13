import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import checks from "../../public/data/calculation/p101-queen-forcing-v1.json";
import practical from "../../public/data/calculation/p101-queen-practical-v1.json";
import p100 from "../../public/data/calculation/p100-minor-piece-v1.json";
import p99a from "../../public/data/calculation/p99-rook-foundations-v1.json";
import p99b from "../../public/data/calculation/p99-rook-geometry-v1.json";
import p99c from "../../public/data/calculation/p99-rook-practical-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const studies = [...checks.positions, ...practical.positions] as CalculationPosition[];
const inherited = new Set([
  ...p100.positions, ...p99a.positions, ...p99b.positions, ...p99c.positions,
].map(p => p.fen));

describe("P101 queen and mixed-material endgames", () => {
  it("adds seven five-study families and thirty-five distinct unseen boards", () => {
    expect(checks.positions).toHaveLength(15);
    expect(practical.positions).toHaveLength(20);
    expect(studies).toHaveLength(35);
    expect(new Set(studies.map(p => p.id)).size).toBe(35);
    expect(new Set(studies.map(p => p.fen)).size).toBe(35);
    expect(studies.filter(p => inherited.has(p.fen))).toEqual([]);
    const groups = studies.reduce<Record<string, number>>((a, p) => {
      a[p.sourceLabel] = (a[p.sourceLabel] ?? 0) + 1; return a;
    }, {});
    expect(Object.values(groups).sort()).toEqual(Array(7).fill(5));
  });
  it("legally replays all five-ply main lines and seventy distinct defensive/candidate branches", () => {
    let branches = 0;
    for (const p of studies) {
      const game = new Chess(p.fen);
      expect(game.turn(), p.id).toBe(p.playerColor);
      expect(game.isGameOver(), p.id).toBe(false);
      const pieces = p.fen.split(" ")[0].replace(/[1-8/]/g, "");
      expect(pieces, p.id).toMatch(/^[KkQqRrBbNnPp]+$/);
      expect(pieces.split("K"), p.id).toHaveLength(2);
      expect(pieces.split("k"), p.id).toHaveLength(2);
      expect(pieces.includes("Q"), p.id).toBe(true);
      expect(p.principalVariation.length, p.id).toBe(5);
      expect(p.principalVariation[0], p.id).toBe(p.bestMove);
      expect(legalCalculationBranch(p)?.length, p.id).toBe(5);
      expect(p.defensiveStudy?.variations.length, p.id).toBe(2);
      for (const branch of p.defensiveStudy?.variations ?? []) {
        expect(branch.moves.length, p.id).toBeGreaterThanOrEqual(3);
        expect(legalCalculationBranch({
          ...p, bestMove: branch.moves[0], principalVariation: branch.moves,
        })?.length, p.id).toBe(branch.moves.length);
        expect(branch.explanation.length, p.id).toBeGreaterThan(80);
        branches++;
      }
    }
    expect(branches).toBe(70);
  });
  it("keeps queen-sacrifice traps out of native scored reference continuations", () => {
    const ref = (id: number) => studies.find(p =>
      p.id === `calc:p101-${String(id).padStart(2, "0")}`)!;
    expect(ref(15).principalVariation[2]).toBe("e8e6");
    expect(ref(29).principalVariation[2]).toBe("e8e3");
    expect(ref(30).principalVariation[2]).toBe("d8d4");
    expect(ref(35).principalVariation[2]).toBe("d8d4");
    for (const id of [15, 29, 30, 35]) {
      expect(ref(id).defensiveStudy?.variations[0].label)
        .toBe("Poisoned tactical alternative");
    }
  });
  it("explains defensive resistance and material/king-square outcomes without false WDL proofs", () => {
    for (const p of studies) {
      expect(p.prompt.length, p.id).toBeGreaterThan(140);
      expect(p.explanation.length, p.id).toBeGreaterThan(490);
      expect(p.replyReason?.length, p.id).toBeGreaterThan(100);
      expect(p.defensiveStudy?.reflection.length, p.id).toBeGreaterThan(130);
      expect(p.explanation, p.id).toMatch(/not .*certif|not .*proof|not .*optima/i);
    }
  });
});
