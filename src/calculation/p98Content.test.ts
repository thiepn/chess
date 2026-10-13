import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import p98 from "../../public/data/calculation/p98-essential-pawn-endgames-v1.json";
import p94 from "../../public/data/calculation/p94-candidates-v1.json";
import p95 from "../../public/data/calculation/p95-defensive-resistance-v1.json";
import p96 from "../../public/data/calculation/p96-quiet-positional-v1.json";
import p97a from "../../public/data/calculation/p97-forcing-v1.json";
import p97b from "../../public/data/calculation/p97-defenses-v1.json";
import p97c from "../../public/data/calculation/p97-positional-v1.json";
import p97d from "../../public/data/calculation/p97-promotions-v1.json";
import p97e from "../../public/data/calculation/p97-mixed-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const positions = p98.positions as CalculationPosition[];
const older = new Set([
  ...p94.positions, ...p95.positions, ...p96.positions,
  ...p97a.positions, ...p97b.positions, ...p97c.positions,
  ...p97d.positions, ...p97e.positions,
].map(p => p.fen));

describe("P98 Essential Pawn Endgames", () => {
  it("supplies forty new king-and-pawn cases across five educational themes", () => {
    expect(positions).toHaveLength(40);
    expect(new Set(positions.map(p => p.id)).size).toBe(40);
    expect(new Set(positions.map(p => p.fen)).size).toBe(40);
    expect(positions.filter(p => older.has(p.fen))).toEqual([]);
    const counts = positions.reduce<Record<string, number>>((acc, p) => {
      acc[p.sourceLabel] = (acc[p.sourceLabel] ?? 0) + 1;
      return acc;
    }, {});
    expect(Object.values(counts).sort()).toEqual([8, 8, 8, 8, 8]);
  });

  it("uses fully legal three-ply main and defensive lines with only kings and pawns", () => {
    for (const p of positions) {
      const chess = new Chess(p.fen);
      expect(chess.turn(), p.id).toBe(p.playerColor);
      expect(chess.isGameOver(), p.id).toBe(false);
      expect(p.fen.split(" ")[0].replace(/[1-8/]/g, ""), p.id)
        .toMatch(/^[KPkp]+$/);
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

  it("contains worked king geometry, countermove and repair guidance without fake tablebase authority", () => {
    for (const p of p98.positions) {
      expect(p.explanation.length, p.id).toBeGreaterThan(750);
      expect(p.prompt.length, p.id).toBeGreaterThan(150);
      expect(p.replyReason.length, p.id).toBeGreaterThan(90);
      expect(p.defensiveStudy.reflection.length, p.id).toBeGreaterThan(210);
      expect(p.pawnEndgameStudy.status, p.id).toBe("instructional-not-tablebase");
      expect(p.explanation, p.id).toMatch(/king|pawn/i);
      expect(p.skillIds.some(skill => skill.startsWith("endgames.") ||
        skill.startsWith("pawns.")), p.id).toBe(true);
    }
  });
});
