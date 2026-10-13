import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import p100 from "../../public/data/calculation/p100-minor-piece-v1.json";
import p99a from "../../public/data/calculation/p99-rook-foundations-v1.json";
import p99b from "../../public/data/calculation/p99-rook-geometry-v1.json";
import p99c from "../../public/data/calculation/p99-rook-practical-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const cases = p100.positions as CalculationPosition[];
const previousFens = new Set([...p99a.positions, ...p99b.positions, ...p99c.positions].map(p => p.fen));
const groupFor = (p: CalculationPosition) => p.sourceLabel.replace(/^P100 · /, "");

describe("P100 original minor-piece endgames", () => {
  it("provides eight complete five-position learning groups without inherited P99 boards", () => {
    expect(cases).toHaveLength(40);
    expect(new Set(cases.map(p => p.id)).size).toBe(40);
    expect(new Set(cases.map(p => p.fen)).size).toBe(40);
    expect(cases.filter(p => previousFens.has(p.fen))).toEqual([]);
    const groups = cases.reduce<Record<string, number>>((acc, p) => {
      const group = groupFor(p);
      acc[group] = (acc[group] ?? 0) + 1; return acc;
    }, {});
    expect(Object.keys(groups)).toHaveLength(8);
    expect(Object.values(groups)).toEqual(Array(8).fill(5));
  });
  it("replays all 40 main and 40 alternative branches on real chess.js boards", () => {
    for (const p of cases) {
      const game = new Chess(p.fen);
      expect(game.isGameOver(), p.id).toBe(false);
      expect(game.turn(), p.id).toBe(p.playerColor);
      const board = p.fen.split(" ")[0].replace(/[1-8/]/g, "");
      expect(board, p.id).toMatch(/^[KkBbNnPp]+$/);
      expect(board.split("K"), p.id).toHaveLength(2);
      expect(board.split("k"), p.id).toHaveLength(2);
      expect(board.includes("B") || board.includes("N"), p.id).toBe(true);
      expect(board.includes("b") || board.includes("n"), p.id).toBe(true);
      expect(legalCalculationBranch(p)?.length, p.id).toBe(3);
      for (const line of p.defensiveStudy?.variations ?? []) {
        expect(legalCalculationBranch({
          ...p, bestMove: line.moves[0], principalVariation: line.moves,
        })?.length, p.id).toBe(line.moves.length);
      }
      expect(p.defensiveStudy?.variations.length, p.id).toBe(1);
    }
  });
  it("does not confuse opposite and same bishop colors, or the wrong rook-pawn corner", () => {
    for (const p of cases) {
      if (!["Opposite-coloured bishops", "Same-coloured bishops", "Wrong bishop and rook pawn"].includes(groupFor(p))) continue;
      const board = new Chess(p.fen).board();
      const squareColor = (piece: "B" | "b") => {
        for (let rank = 0; rank < 8; rank++)
          for (let file = 0; file < 8; file++) {
            const sq = board[rank][file];
            if (sq?.type === "b" && sq.color === (piece === "B" ? "w" : "b"))
              return (rank + file) % 2;
          }
        throw new Error("Expected bishop missing");
      };
      const white = squareColor("B");
      if (groupFor(p) === "Wrong bishop and rook pawn") {
        // h8 is dark; a light-square white bishop cannot control that corner.
        expect(white, p.id).toBe(0);
        expect(p.fen, p.id).toContain("k");
      } else {
        expect(white === squareColor("b"), p.id)
          .toBe(groupFor(p) === "Same-coloured bishops");
      }
    }
  });
  it("ships authored context, independent prompts and existing learner authority only", () => {
    for (const p of cases) {
      expect(p.prompt.length, p.id).toBeGreaterThan(155);
      expect(p.explanation.length, p.id).toBeGreaterThan(580);
      expect(p.replyReason?.length, p.id).toBeGreaterThan(100);
      expect(p.defensiveStudy?.reflection.length, p.id).toBeGreaterThan(145);
      expect(p.skillIds.some(id => id === "endgames.minor-piece" ||
        id === "endgames.opposite-bishops"), p.id).toBe(true);
    }
  });
});
