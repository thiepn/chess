import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import a from "../../public/data/calculation/p112-endgame-decisions-a-v1.json";
import b from "../../public/data/calculation/p112-endgame-decisions-b-v1.json";
import conv from "../../public/data/calculation/p102-conversion-v1.json";
import activity from "../../public/data/calculation/p102-activity-v1.json";
import defense from "../../public/data/calculation/p102-defense-v1.json";
import races from "../../public/data/calculation/p102-races-stalemate-v1.json";
import precision from "../../public/data/calculation/p102-precision-v1.json";
import queenForcing from "../../public/data/calculation/p101-queen-forcing-v1.json";
import queenPractical from "../../public/data/calculation/p101-queen-practical-v1.json";
import type { CalculationPosition } from "../calculation/types";
import { hydrateEndgameDecision } from "./decisionStudy";
import { legalCalculationBranch } from "../calculation/branchFeedback";
import { verifiedDeepBranches } from "../calculation/deepCalculation";
import { studyMaterialFor } from "../calculation/studyDelivery";

const positions = [...a.positions, ...b.positions] as unknown as CalculationPosition[];
const previous = [
  ...conv.positions, ...activity.positions, ...defense.positions, ...races.positions,
  ...precision.positions, ...queenForcing.positions, ...queenPractical.positions,
];
const files = new Map(previous.map(source => [source.id, source]));
const abc = "abcdefgh";
function flipSquare(s: string) { return abc[7 - abc.indexOf(s[0])] + (9 - Number(s[1])); }
function flipMove(u: string) { return flipSquare(u.slice(0, 2)) + flipSquare(u.slice(2, 4)) + u.slice(4); }
function flipFen(fen: string) {
  const [board, turn] = fen.split(" ");
  const rows = board.split("/").map(row => row.replace(/[1-8]/g, x => ".".repeat(Number(x))).split(""));
  const flipped = rows.reverse().map(row => row.reverse().map(p => p === "." ? "." :
    p === p.toUpperCase() ? p.toLowerCase() : p.toUpperCase())).map(row => {
    let out = "", empty = 0;
    for (const p of row) if (p === ".") empty++;
    else { if (empty) out += empty; empty = 0; out += p; }
    return out + (empty ? empty : "");
  });
  return flipped.join("/") + " " + (turn === "w" ? "b" : "w") + " - - 0 1";
}

describe("P112 independent ungraded endgame conversion chains", () => {
  it("provides 30 distinct legal original-source transformations, 10 three-stage chains", () => {
    expect(positions).toHaveLength(30);
    expect(new Set(positions.map(p => p.id)).size).toBe(30);
    expect(new Set(positions.map(p => p.fen)).size).toBe(30);
    const chains = new Map<string, number[]>();
    for (const p of positions) {
      expect(p.assessmentStatus).toBe("instructional-only");
      const study = p.endgameDecisionStudy!;
      const source = files.get(study.sourceId);
      expect(source, p.id).toBeDefined();
      expect(p.fen).toBe(flipFen(source!.fen));
      expect(new Chess(p.fen).turn()).toBe(p.playerColor);
      expect(p.principalVariation).toEqual(source!.principalVariation.map(flipMove));
      const steps = chains.get(study.family) ?? [];
      steps.push(study.stage);
      chains.set(study.family, steps);
    }
    expect(chains.size).toBe(10);
    for (const steps of chains.values()) expect(steps).toEqual([1, 2, 3]);
  });

  it("qualifies true five-ply chess.js branches with distinct defensive continuations", () => {
    for (const raw of positions) {
      const position = hydrateEndgameDecision(raw);
      expect(position, raw.id).not.toBeNull();
      expect(legalCalculationBranch(position!)).toHaveLength(5);
      const variations = position!.defensiveStudy!.variations;
      expect(variations).toHaveLength(2);
      expect(variations[0].moves).toHaveLength(5);
      for (const v of variations) {
        expect([3, 5]).toContain(v.moves.length);
        expect(legalCalculationBranch({
          ...position!, bestMove: v.moves[0], principalVariation: v.moves,
        })).toHaveLength(v.moves.length);
      }
      // The P108 4–8-ply lab only admits genuinely replayable >=4-ply lines.
      expect(verifiedDeepBranches(position!).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("has independently answerable conversion decisions with feedback, no invented result", () => {
    for (const raw of positions) {
      const study = raw.endgameDecisionStudy!;
      expect(study.proofStatus).toMatch(/no verified/i);
      const questions = studyMaterialFor(raw)?.questions ?? [];
      expect(questions).toHaveLength(3);
      for (const q of questions) {
        expect(q.prompt.length).toBeGreaterThan(90);
        expect(q.answer.length).toBeGreaterThan(210);
        expect(q.repair.length).toBeGreaterThan(85);
      }
      expect(raw.explanation.length).toBeGreaterThan(430);
    }
  });

  it("rejects tampered sources and unverified claims from the scored authority", () => {
    const raw = positions[0];
    expect(hydrateEndgameDecision({ ...raw, assessmentStatus: undefined })).toBeNull();
    expect(hydrateEndgameDecision({
      ...raw, principalVariation: ["h1h1", ...raw.principalVariation.slice(1)],
    })).toBeNull();
    expect(hydrateEndgameDecision({
      ...raw, endgameDecisionStudy: { ...raw.endgameDecisionStudy!, sourceId: "calc:unknown" },
    })).toBeNull();
  });
});
