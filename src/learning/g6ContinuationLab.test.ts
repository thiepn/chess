import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import original from "../../public/data/learning/g2-tactical-transfer-v1.json";
import historical from "../../public/data/learning/transfer-v1.json";
import { lessonForSkill } from "./lessons";
import { assembleVerifiedLesson } from "./assembleVerifiedLesson";
import { g2ReplyComparison } from "./g2ReplyComparison";
import { validateG2TacticalTransfer, g2TacticalSkillIds } from "./g2TacticalTransfer";
import { g5TacticalReplay } from "./g5TacticalReplay";
import { validateTransferCatalog } from "./transferCompletion";
import {
  beginG6Exploration, g6CurrentFen, g6ExploreMove, g6PositionState,
  g6Rewind, MAX_G6_PLIES,
} from "./g6ContinuationLab";

function apply(line: NonNullable<ReturnType<typeof beginG6Exploration>>,
  uci: string) {
  const board = new Chess(g6CurrentFen(line));
  const move = board.move({
    from: uci.slice(0, 2), to: uci.slice(2, 4),
    promotion: uci.slice(4) || "q",
  });
  expect(move).not.toBeNull();
  return g6ExploreMove(line, {
    from: move.from, to: move.to, promotion: move.promotion,
    san: move.san, fen: board.fen(),
  });
}

describe("G6 original Black reply continuation lab", () => {
  const tactical = validateG2TacticalTransfer(original);
  const transfer = validateTransferCatalog(historical);

  it("starts from each of 36 authentic, verified G5 reply FENs and explores only legal continuations", () => {
    let count = 0;
    for (const skillId of g2TacticalSkillIds) {
      const entry = tactical.get(skillId)!;
      const lesson = assembleVerifiedLesson(
        lessonForSkill(skillId, "Original", "Original"),
        { transfer: transfer.get(skillId), tactical: entry },
      );
      for (let caseNo = 1; caseNo <= 3; caseNo++) {
        for (let replyNo = 1; replyNo <= 2; replyNo++) {
          const replyId = `g2-tactical-${caseNo}-reply-${replyNo}`;
          const comparison = g2ReplyComparison(lesson, replyId)!;
          const sourced = g5TacticalReplay(entry, comparison, replyId)!;
          const line = beginG6Exploration(sourced.frames[2].fen);
          expect(line).not.toBeNull();
          if (!line) continue;
          expect(line.anchorFen).toBe(sourced.frames[2].fen);
          expect(line.moves).toHaveLength(0);

          const board = new Chess(line.anchorFen);
          const legal = board.moves({ verbose: true });
          if (legal.length) {
            const option = legal[0];
            const advanced = apply(line,
              `${option.from}${option.to}${option.promotion ?? ""}`);
            expect(advanced).not.toBeNull();
            expect(advanced?.moves).toHaveLength(1);
            expect(advanced?.moves[0].fen).toBe(g6CurrentFen(advanced!));
            expect(g6Rewind(advanced!, 0)?.moves).toHaveLength(0);
            expect(g6CurrentFen(g6Rewind(advanced!, 0)!)).toBe(line.anchorFen);
            expect(line.moves).toHaveLength(0);
          } else {
            expect(g6PositionState(line).terminal).toBe(true);
          }
          count++;
        }
      }
    }
    expect(count).toBe(36);
  });

  it("permits a different legal continuation after rewinding without affecting prior line objects", () => {
    const line = beginG6Exploration(new Chess().fen())!;
    const first = apply(line, "e2e4")!;
    const second = apply(first, "e7e5")!;
    const rewound = g6Rewind(second, 1)!;
    const alternative = apply(rewound, "c7c5")!;
    expect(second.moves.map(move => move.san)).toEqual(["e4", "e5"]);
    expect(alternative.moves.map(move => move.san)).toEqual(["e4", "c5"]);
    expect(alternative.anchorFen).toBe(line.anchorFen);
    expect(first.moves).toHaveLength(1);
    expect(line.moves).toHaveLength(0);
    expect(g6Rewind(second, -1)).toBeNull();
    expect(g6Rewind(second, 3)).toBeNull();
    expect(g6Rewind(second, 0.5)).toBeNull();
  });

  it("rejects forged or illegal board events; promotion and castling remain native Chess.js", () => {
    const start = beginG6Exploration(new Chess().fen())!;
    expect(g6ExploreMove(start, {
      from: "e2", to: "e5", san: "e5", fen: "forged",
    })).toBeNull();
    const board = new Chess(start.anchorFen);
    const moved = board.move({ from: "e2", to: "e4" });
    expect(g6ExploreMove(start, {
      from: moved.from, to: moved.to, san: "wrong SAN", fen: board.fen(),
    })).toBeNull();
    expect(g6ExploreMove(start, {
      from: moved.from, to: moved.to, san: moved.san, fen: "forged",
    })).toBeNull();

    const promotion = beginG6Exploration("7k/P7/8/8/8/8/8/K7 w - - 0 1")!;
    const promoted = apply(promotion, "a7a8n")!;
    expect(promoted.moves[0].promotion).toBe("n");
    expect(promoted.moves[0].san).toContain("=N");
    const castling = beginG6Exploration("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")!;
    const castled = apply(castling, "e1g1")!;
    expect(castled.moves[0].san).toBe("O-O");
  });

  it("stops after twelve legal exploratory moves with no extra scored exercise", () => {
    const moves = [
      "e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6",
      "d2d3", "f8c5", "b1c3", "d7d6", "c1g5", "c8g4",
    ];
    let line = beginG6Exploration(new Chess().fen())!;
    for (const uci of moves) {
      const next = apply(line, uci);
      expect(next).not.toBeNull();
      line = next!;
    }
    expect(line.moves).toHaveLength(MAX_G6_PLIES);
    expect(g6PositionState(line).terminal).toBe(true);
    const nextBoard = new Chess(g6CurrentFen(line));
    const nextMove = nextBoard.moves({ verbose: true })[0];
    nextBoard.move({ from: nextMove.from, to: nextMove.to, promotion: nextMove.promotion });
    expect(g6ExploreMove(line, {
      from: nextMove.from, to: nextMove.to,
      san: nextMove.san, fen: nextBoard.fen(),
    })).toBeNull();
  });
});
