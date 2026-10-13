import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import conversion from "../../public/data/calculation/p102-conversion-v1.json";
import activity from "../../public/data/calculation/p102-activity-v1.json";
import defense from "../../public/data/calculation/p102-defense-v1.json";
import races from "../../public/data/calculation/p102-races-stalemate-v1.json";
import precision from "../../public/data/calculation/p102-precision-v1.json";
import p98 from "../../public/data/calculation/p98-essential-pawn-endgames-v1.json";
import p99a from "../../public/data/calculation/p99-rook-foundations-v1.json";
import p99b from "../../public/data/calculation/p99-rook-geometry-v1.json";
import p99c from "../../public/data/calculation/p99-rook-practical-v1.json";
import p100 from "../../public/data/calculation/p100-minor-piece-v1.json";
import p101a from "../../public/data/calculation/p101-queen-forcing-v1.json";
import p101b from "../../public/data/calculation/p101-queen-practical-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const studies = [
  ...conversion.positions, ...activity.positions, ...defense.positions,
  ...races.positions, ...precision.positions,
] as CalculationPosition[];
const sourceCounts = [conversion, activity, defense, races, precision].map(
  s => s.positions.length,
);
const previous = new Set([
  ...p98.positions, ...p99a.positions, ...p99b.positions, ...p99c.positions,
  ...p100.positions, ...p101a.positions, ...p101b.positions,
].map(p => p.fen));

describe("P102 original endgame conversion and practical resistance", () => {
  it("delivers 45 unique FENs across all five external learner-content files", () => {
    expect(sourceCounts).toEqual([15, 9, 6, 9, 6]);
    expect(studies).toHaveLength(45);
    expect(new Set(studies.map(p => p.id)).size).toBe(45);
    expect(new Set(studies.map(p => p.fen)).size).toBe(45);
    expect(studies.filter(p => previous.has(p.fen))).toEqual([]);
    expect(new Set(studies.map(p => p.sourceLabel)).size).toBe(8);
  });

  it("replays 45 five-ply references and 90 defensive/candidate lines", () => {
    let alternatives = 0;
    for (const p of studies) {
      const game = new Chess(p.fen);
      expect(game.turn(), p.id).toBe(p.playerColor);
      expect(game.isGameOver(), p.id).toBe(false);
      expect(p.principalVariation, p.id).toHaveLength(5);
      expect(p.bestMove, p.id).toBe(p.principalVariation[0]);
      expect(legalCalculationBranch(p)?.length, p.id).toBe(5);
      expect(p.defensiveStudy?.variations.length, p.id).toBe(2);
      for (const branch of p.defensiveStudy?.variations ?? []) {
        expect(branch.moves.length, p.id).toBeGreaterThanOrEqual(3);
        expect(legalCalculationBranch({
          ...p, bestMove: branch.moves[0],
          principalVariation: branch.moves,
        })?.length, p.id).toBe(branch.moves.length);
        expect(branch.explanation.length, p.id).toBeGreaterThan(65);
        alternatives++;
      }
    }
    expect(alternatives).toBe(90);
  });

  it("teaches an exact stalemate trap and shows when an enemy pawn prevents it", () => {
    const fen = (suffix: number) => studies.find(p => p.id === `calc:p102-${suffix}`)!.fen;
    for (const id of [37, 38]) {
      const chess = new Chess(fen(id));
      expect(chess.move({ from: "g6", to: "f7" }), String(id)).not.toBeNull();
      expect(chess.isStalemate(), String(id)).toBe(true);
    }
    const pawnResource = new Chess(fen(39));
    expect(pawnResource.move({ from: "g6", to: "f7" })).not.toBeNull();
    expect(pawnResource.isStalemate()).toBe(false);
  });

  it("provides independent application, defender replies and avoids fabricated tablebase outcomes", () => {
    for (const p of studies) {
      expect(p.source, p.id).toBe("authored");
      expect(p.prompt.length, p.id).toBeGreaterThan(150);
      expect(p.explanation.length, p.id).toBeGreaterThan(450);
      expect(p.replyReason?.length, p.id).toBeGreaterThan(65);
      expect(p.defensiveStudy?.misconception.length, p.id).toBeGreaterThan(60);
      expect(p.defensiveStudy?.reflection.length, p.id).toBeGreaterThan(100);
      expect(p.explanation, p.id).toMatch(/WDL|certif|proof|tablebase|endgame/i);
    }
  });
});
