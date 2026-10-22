import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import original from "../../public/data/learning/g2-tactical-transfer-v1.json";
import historical from "../../public/data/learning/transfer-v1.json";
import { lessonForSkill } from "./lessons";
import { assembleVerifiedLesson } from "./assembleVerifiedLesson";
import { g2ReplyComparison } from "./g2ReplyComparison";
import { g2TacticalSkillIds, validateG2TacticalTransfer } from "./g2TacticalTransfer";
import { g5TacticalReplay } from "./g5TacticalReplay";
import { beginG6Exploration, g6CurrentFen, g6ExploreMove } from "./g6ContinuationLab";
import { validateTransferCatalog } from "./transferCompletion";
import {
  g7BeginNotebook, g7SaveVariation, g7LoadVariation, g7CompareVariations,
} from "./g7VariationNotebook";

function play(line: NonNullable<ReturnType<typeof beginG6Exploration>>, uci: string) {
  const board = new Chess(g6CurrentFen(line));
  const move = board.move({
    from: uci.slice(0, 2), to: uci.slice(2, 4),
    promotion: uci.slice(4) || "q",
  });
  expect(move).not.toBeNull();
  return g6ExploreMove(line, {
    from: move.from, to: move.to, san: move.san,
    promotion: move.promotion, fen: board.fen(),
  });
}

describe("G7 learner-created alternatives from original reply positions", () => {
  const source = validateG2TacticalTransfer(original);
  const transfer = validateTransferCatalog(historical);

  it("creates source-anchored notebooks for all 36 original G2 defense boards", () => {
    let total = 0;
    let candidatePairs = 0;
    for (const skillId of g2TacticalSkillIds) {
      const entry = source.get(skillId)!;
      const lesson = assembleVerifiedLesson(
        lessonForSkill(skillId, "Original", "Original"),
        { transfer: transfer.get(skillId), tactical: entry },
      );
      for (let caseNo = 1; caseNo <= 3; caseNo++) {
        for (let replyNo = 1; replyNo <= 2; replyNo++) {
          const id = `g2-tactical-${caseNo}-reply-${replyNo}`;
          const comparison = g2ReplyComparison(lesson, id)!;
          const replay = g5TacticalReplay(entry, comparison, id)!;
          const anchor = replay.frames[2].fen;
          const notebook = g7BeginNotebook(anchor);
          const line = beginG6Exploration(anchor);
          expect(notebook?.anchorFen).toBe(anchor);
          expect(line?.anchorFen).toBe(anchor);
          expect(g7CompareVariations(notebook!)).toBeNull();
          const legalMoves = new Chess(anchor).moves({ verbose: true });
          if (legalMoves.length >= 2 && line) {
            const first = legalMoves[0];
            const second = legalMoves[1];
            const A = play(line, `${first.from}${first.to}${first.promotion ?? ""}`)!;
            const B = play(line, `${second.from}${second.to}${second.promotion ?? ""}`)!;
            const storedA = g7SaveVariation(notebook!, "A", A);
            const storedB = storedA && g7SaveVariation(storedA, "B", B);
            expect(storedA).not.toBeNull();
            expect(storedB).not.toBeNull();
            const comparisonFacts = g7CompareVariations(storedB!);
            expect(comparisonFacts?.commonPlies).toBe(0);
            expect(comparisonFacts?.firstDifferentPly).toBe(1);
            expect(comparisonFacts?.A.positionFen).toBe(g6CurrentFen(A));
            expect(comparisonFacts?.B.positionFen).toBe(g6CurrentFen(B));
            expect(g7LoadVariation(storedB!, "B", anchor)?.moves).toEqual(B.moves);
            candidatePairs++;
          }
          total++;
        }
      }
    }
    expect(total).toBe(36);
    expect(candidatePairs).toBeGreaterThan(0);
  });

  it("keeps two truly different legal lines and allows switching without destroying either", () => {
    const anchor = new Chess().fen();
    const start = beginG6Exploration(anchor)!;
    const A = play(start, "e2e4")!;
    const B = play(start, "d2d4")!;
    const empty = g7BeginNotebook(anchor)!;
    expect(g7SaveVariation(empty, "A", start)).toBeNull();
    const withA = g7SaveVariation(empty, "A", A)!;
    expect(g7SaveVariation(withA, "B", A)).toBeNull();
    const both = g7SaveVariation(withA, "B", B)!;
    expect(both.A?.moves.map(move => move.san)).toEqual(["e4"]);
    expect(both.B?.moves.map(move => move.san)).toEqual(["d4"]);
    const details = g7CompareVariations(both)!;
    expect(details.commonPlies).toBe(0);
    expect(details.A.whitePieces).toBe(16);
    expect(details.A.blackPieces).toBe(16);
    expect(details.B.whitePieces).toBe(16);
    expect(details.B.blackPieces).toBe(16);

    const restored = g7LoadVariation(both, "A", anchor)!;
    expect(restored).not.toBe(both.A);
    expect(restored.moves).not.toBe(both.A?.moves);
    const extended = play(restored, "e7e5")!;
    expect(extended.moves.map(move => move.san)).toEqual(["e4", "e5"]);
    expect(both.A?.moves.map(move => move.san)).toEqual(["e4"]);
    expect(both.B?.moves.map(move => move.san)).toEqual(["d4"]);
    expect(g7LoadVariation(both, "B", anchor)?.moves.map(move => move.san)).toEqual(["d4"]);
  });

  it("reports only factual material and check states without assigning a move ranking", () => {
    const anchor = "8/8/8/3p4/4P3/8/8/K6k w - - 0 1";
    const start = beginG6Exploration(anchor)!;
    const capture = play(start, "e4d5")!;
    const advance = play(start, "e4e5")!;
    const A = g7SaveVariation(g7BeginNotebook(anchor)!, "A", capture)!;
    const both = g7SaveVariation(A, "B", advance)!;
    const comparison = g7CompareVariations(both)!;
    expect(comparison.A.blackPieces).toBe(1);
    expect(comparison.B.blackPieces).toBe(2);
    expect(comparison.A.whitePieces).toBe(2);
    expect(comparison.B.whitePieces).toBe(2);
    expect(comparison.A.moves).toEqual(["exd5"]);
    expect(comparison.B.moves).toEqual(["e5"]);
    expect(comparison.A.status).toContain("to move");
  });

  it("denies cross-source anchors and corrupted/forged candidate histories", () => {
    const anchor = new Chess().fen();
    const line = play(beginG6Exploration(anchor)!, "e2e4")!;
    const notebook = g7BeginNotebook(anchor)!;
    const A = g7SaveVariation(notebook, "A", line)!;
    const other = "8/8/8/8/8/8/8/K6k w - - 0 1";
    expect(g7LoadVariation(A, "A", other)).toBeNull();
    expect(g7SaveVariation(g7BeginNotebook(other)!, "B", line)).toBeNull();
    const injected = {
      ...line, moves: [{ ...line.moves[0], san: "fabricated checkmate" }],
    };
    expect(g7SaveVariation(notebook, "A", injected)).toBeNull();
    expect(g7CompareVariations({ ...A, B: injected })).toBeNull();
    expect(g7LoadVariation({ ...A, A: injected }, "A", anchor)).toBeNull();
    expect(g7BeginNotebook("invalid FEN")).toBeNull();
  });

  it("identifies shared legal opening moves before two learner branches diverge", () => {
    const start = beginG6Exploration(new Chess().fen())!;
    const common = play(start, "e2e4")!;
    const A = play(common, "e7e5")!;
    const B = play(common, "c7c5")!;
    const notebook = g7BeginNotebook(start.anchorFen)!;
    const both = g7SaveVariation(g7SaveVariation(notebook, "A", A)!, "B", B)!;
    const comparison = g7CompareVariations(both)!;
    expect(comparison.commonPlies).toBe(1);
    expect(comparison.firstDifferentPly).toBe(2);
    expect(comparison.A.moves).toEqual(["e4", "e5"]);
    expect(comparison.B.moves).toEqual(["e4", "c5"]);
  });
});
