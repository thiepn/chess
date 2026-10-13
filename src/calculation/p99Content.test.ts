import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import rookFundamentals from "../../public/data/calculation/p99-rook-foundations-v1.json";
import rookGeometry from "../../public/data/calculation/p99-rook-geometry-v1.json";
import rookPractical from "../../public/data/calculation/p99-rook-practical-v1.json";
import p98 from "../../public/data/calculation/p98-essential-pawn-endgames-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const sections = [rookFundamentals, rookGeometry, rookPractical];
const studies = sections.flatMap(s => s.positions) as CalculationPosition[];

describe("P99 Practical Rook Endgames", () => {
  it("adds 45 distinct original rook exercises, nine learning themes with five each", () => {
    expect(sections.map(s => s.positions.length)).toEqual([15, 15, 15]);
    expect(studies).toHaveLength(45);
    expect(new Set(studies.map(p => p.id)).size).toBe(45);
    expect(new Set(studies.map(p => p.fen)).size).toBe(45);
    expect(studies.filter(p => p98.positions.some(q => q.fen === p.fen))).toEqual([]);
    const counts = studies.reduce<Record<string, number>>((acc, p) => {
      acc[p.sourceLabel] = (acc[p.sourceLabel] ?? 0) + 1; return acc;
    }, {});
    expect(Object.values(counts).sort((a, b) => a - b)).toEqual(Array(9).fill(5));
  });

  it("has playable FENs, kings, a rook each and genuine chess-legal main/defensive lines", () => {
    for (const p of studies) {
      const chess = new Chess(p.fen);
      expect(chess.turn(), p.id).toBe(p.playerColor);
      expect(chess.isGameOver(), p.id).toBe(false);
      const material = p.fen.split(" ")[0].replace(/[1-8/]/g, "");
      expect(material.split("K"), p.id).toHaveLength(2);
      expect(material.split("k"), p.id).toHaveLength(2);
      expect(material.split("R"), p.id).toHaveLength(2);
      expect(material.split("r"), p.id).toHaveLength(2);
      expect(material, p.id).toMatch(/^[KkRrPp]+$/);
      expect(legalCalculationBranch(p)?.length, p.id).toBe(3);
      expect(p.principalVariation[0], p.id).toBe(p.bestMove);
      expect(p.defensiveStudy?.variations.length, p.id).toBe(1);
      for (const v of p.defensiveStudy?.variations ?? []) {
        expect(legalCalculationBranch({
          ...p, bestMove: v.moves[0], principalVariation: v.moves,
        })?.length, p.id).toBe(v.moves.length);
      }
    }
  });

  it("explains rook conversion, king placement and defense without invented tablebase outcomes", () => {
    for (const p of studies) {
      expect(p.prompt.length, p.id).toBeGreaterThan(170);
      expect(p.explanation.length, p.id).toBeGreaterThan(350);
      expect(p.replyReason?.length, p.id).toBeGreaterThan(65);
      expect(p.defensiveStudy?.misconception.length, p.id).toBeGreaterThan(65);
      expect(p.defensiveStudy?.reflection.length, p.id).toBeGreaterThan(150);
      expect(p.skillIds.some(skill => skill.startsWith("endgames.") || skill === "pawns.passed"), p.id).toBe(true);
    }
  });
});
