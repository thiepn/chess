import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import a from "../../public/data/calculation/p111-opening-bridges-a-v1.json";
import b from "../../public/data/calculation/p111-opening-bridges-b-v1.json";
import { openingNodes, repertoireById, pathToNode } from "./repertoire";
import { hydrateOpeningTransition, legalOpeningContinuation } from "./transitionStudy";
import { legalCalculationBranch } from "../calculation/branchFeedback";
import { verifiedDeepBranches } from "../calculation/deepCalculation";
import { studyMaterialFor } from "../calculation/studyDelivery";
import type { CalculationPosition } from "../calculation/types";

const cases = [...a.positions, ...b.positions] as unknown as CalculationPosition[];

describe("P111 source-authorized opening-to-middlegame bridges", () => {
  it("uses 16 distinct native repertoire identities and real original node FENs", () => {
    expect(cases).toHaveLength(16);
    expect(new Set(cases.map(c => c.id)).size).toBe(16);
    expect(new Set(cases.map(c => c.openingTransitionStudy?.nodeId)).size).toBe(16);
    for (const item of cases) {
      const source = item.openingTransitionStudy!;
      const node = openingNodes[source.nodeId];
      expect(node, item.id).toBeDefined();
      expect(repertoireById[source.repertoireId].nodeIds).toContain(node.id);
      expect(pathToNode(node.id).at(-1)?.fen).toBe(node.fen);
      expect(item.fen).toBe(`@repertoire:${source.nodeId}`);
      expect(item.assessmentStatus).toBe("instructional-only");
      const hydrated = hydrateOpeningTransition(item);
      expect(hydrated, item.id).not.toBeNull();
      expect(hydrated!.fen).toBe(node.fen);
      expect(hydrated!.playerColor).toBe(node.sideToMove);
      expect(new Chess(hydrated!.fen).turn()).toBe(node.sideToMove);
    }
  });

  it("replays all legal 5-ply main and independently authored-started alternatives", () => {
    for (const item of cases) {
      const hydrated = hydrateOpeningTransition(item);
      expect(hydrated, item.id).not.toBeNull();
      const position = hydrated!;
      expect(position.principalVariation).toHaveLength(5);
      expect(legalCalculationBranch(position)).toHaveLength(5);
      expect(position.defensiveStudy?.variations).toHaveLength(2);
      for (const alternative of position.defensiveStudy?.variations ?? []) {
        expect(alternative.moves).toHaveLength(5);
        expect(legalCalculationBranch({
          fen: position.fen, playerColor: position.playerColor,
          bestMove: alternative.moves[0], principalVariation: alternative.moves,
        })).toHaveLength(5);
      }
      expect(verifiedDeepBranches(position).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("teaches pawn breaks, practical responses and misconception repair without grades", () => {
    for (const item of cases) {
      const position = hydrateOpeningTransition(item)!;
      expect(position.openingTransitionStudy?.structure.length).toBeGreaterThan(35);
      expect(position.openingTransitionStudy?.counterplan.length).toBeGreaterThan(35);
      expect(position.openingTransitionStudy?.tradeDecision.length).toBeGreaterThan(35);
      const questions = studyMaterialFor(position)?.questions ?? [];
      expect(questions).toHaveLength(3);
      questions.forEach(q => {
        expect(q.prompt.length).toBeGreaterThan(110);
        expect(q.answer.length).toBeGreaterThan(250);
        expect(q.repair.length).toBeGreaterThan(100);
      });
    }
  });

  it("rejects nonexistent nodes, altered source FEN and illegal UCI prefixes", () => {
    const original = cases[0];
    expect(hydrateOpeningTransition({ ...original, fen: "8/8/8/8/8/8/8/8 w - - 0 1" })).toBeNull();
    expect(hydrateOpeningTransition({
      ...original,
      openingTransitionStudy: { ...original.openingTransitionStudy!, nodeId: "not-an-original-node" },
    })).toBeNull();
    expect(legalOpeningContinuation(openingNodes["italian-bc4"].fen, ["a1a1"])).toBeNull();
  });
});
