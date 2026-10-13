import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import forcing from "../../public/data/calculation/p97-forcing-v1.json";
import defenses from "../../public/data/calculation/p97-defenses-v1.json";
import positional from "../../public/data/calculation/p97-positional-v1.json";
import promotions from "../../public/data/calculation/p97-promotions-v1.json";
import mixed from "../../public/data/calculation/p97-mixed-v1.json";
import p94 from "../../public/data/calculation/p94-candidates-v1.json";
import p95 from "../../public/data/calculation/p95-defensive-resistance-v1.json";
import p96 from "../../public/data/calculation/p96-quiet-positional-v1.json";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

const groups = [forcing, defenses, positional, promotions, mixed];
const positions = groups.flatMap(section => section.positions) as CalculationPosition[];

describe("P97 extended calculation and variation trees", () => {
  it("provides fifty original, nonduplicated positions across five study areas", () => {
    expect(groups.map(group => group.positions.length)).toEqual([10, 10, 10, 10, 10]);
    expect(positions).toHaveLength(50);
    expect(new Set(positions.map(p => p.id)).size).toBe(50);
    expect(new Set(positions.map(p => p.fen)).size).toBe(50);
    const older = new Set([...p94.positions, ...p95.positions, ...p96.positions].map(p => p.fen));
    expect(positions.filter(p => older.has(p.fen))).toEqual([]);
  });

  it("legally replays 50 five-ply references and 100 defensive/candidate branches", () => {
    let alternativeCount = 0;
    for (const position of positions) {
      expect(position.id, position.title).toMatch(/^calc:p97-/);
      expect(new Chess(position.fen).turn(), position.id).toBe(position.playerColor);
      expect(position.bestMove, position.id).toBe(position.principalVariation[0]);
      expect(position.principalVariation, position.id).toHaveLength(5);
      expect(legalCalculationBranch(position)?.length, position.id).toBe(5);
      for (const branch of position.defensiveStudy?.variations ?? []) {
        expect(branch.moves.length, position.id).toBeGreaterThanOrEqual(3);
        expect(legalCalculationBranch({ ...position, bestMove: branch.moves[0],
          principalVariation: branch.moves })?.length, position.id).toBe(branch.moves.length);
        expect(branch.explanation.length, position.id).toBeGreaterThan(75);
        alternativeCount++;
      }
    }
    expect(alternativeCount).toBe(100);
  });

  it("includes explicit opponent resistance, endpoint assessment and misconception repair", () => {
    for (const position of positions) {
      expect(position.prompt.length, position.id).toBeGreaterThan(120);
      expect(position.explanation.length, position.id).toBeGreaterThan(300);
      expect(position.replyReason?.length, position.id).toBeGreaterThan(65);
      expect(position.continuationReason?.length, position.id).toBeGreaterThan(55);
      expect(position.defensiveStudy?.misconception.length, position.id).toBeGreaterThan(50);
      expect(position.defensiveStudy?.reflection.length, position.id).toBeGreaterThan(70);
    }
  });
});
