import { Chess, type Square } from "chess.js";
import { describe, expect, it } from "vitest";
import g2Source from "../../public/data/learning/g2-tactical-transfer-v1.json";
import transfers from "../../public/data/learning/transfer-v1.json";
import { lessonForSkill } from "./lessons";
import { assembleVerifiedLesson } from "./assembleVerifiedLesson";
import { g2ReplyComparison } from "./g2ReplyComparison";
import { g2TacticalSkillIds, validateG2TacticalTransfer } from "./g2TacticalTransfer";
import { g5TacticalReplay } from "./g5TacticalReplay";
import { validateTransferCatalog } from "./transferCompletion";
import { g8InspectSquare, g8BoardVision } from "./g8BoardVision";

describe("G8 original tactical board vision", () => {
  const catalog = validateG2TacticalTransfer(g2Source);
  const historical = validateTransferCatalog(transfers);

  it("inspects all 18 original positions and 36 source-authored replies", () => {
    let original = 0;
    let replies = 0;
    for (const skillId of g2TacticalSkillIds) {
      const entry = catalog.get(skillId)!;
      const lesson = assembleVerifiedLesson(lessonForSkill(skillId, "Original", "Original"), {
        transfer: historical.get(skillId), tactical: entry,
      });
      for (let caseNumber = 1; caseNumber <= 3; caseNumber++) {
        const source = entry.cases[caseNumber - 1];
        const current = g8BoardVision(source.fen)!;
        expect(current.sideToMove).toBe("w");
        expect(current.attackedWhite.every(piece => piece.attackers > 0)).toBe(true);
        expect(current.attackedBlack.every(piece => piece.attackers > 0)).toBe(true);
        for (const target of [...current.attackedWhite, ...current.attackedBlack]) {
          const fact = g8InspectSquare(source.fen, target.square)!;
          const origins = target.color === "w" ? fact.blackAttackers : fact.whiteAttackers;
          expect(origins.length).toBe(target.attackers);
          expect(fact.highlights.some(h => h.square === target.square)).toBe(true);
          expect(fact.arrows).toHaveLength(fact.whiteAttackers.length + fact.blackAttackers.length);
        }
        original++;
        for (let reply = 1; reply <= 2; reply++) {
          const id = `g2-tactical-${caseNumber}-reply-${reply}`;
          const comparison = g2ReplyComparison(lesson, id)!;
          const replay = g5TacticalReplay(entry, comparison, id)!;
          const after = replay.frames[2].fen;
          const summary = g8BoardVision(after)!;
          expect(summary.sideToMove).toBe("w");
          for (const occupied of [...summary.attackedWhite, ...summary.attackedBlack]) {
            const fact = g8InspectSquare(after, occupied.square)!;
            expect(fact.occupant?.color).toBe(occupied.color);
            expect(fact.occupant?.piece).toBe(occupied.piece);
          }
          replies++;
        }
      }
    }
    expect(original).toBe(18);
    expect(replies).toBe(36);
  });

  it("differentiates geometric attacks, defense, and legal-move availability", () => {
    const board = new Chess();
    const f3 = g8InspectSquare(board.fen(), "f3")!;
    expect(f3.occupant).toBeNull();
    expect(f3.whiteAttackers.map(a => a.square)).toEqual(
      expect.arrayContaining(["e2", "g2", "g1"]),
    );
    expect(f3.blackAttackers).toHaveLength(0);
    expect(f3.legalMoves).toEqual([]);
    expect(f3.arrows).toHaveLength(f3.whiteAttackers.length);

    const e2 = g8InspectSquare(board.fen(), "e2")!;
    expect(e2.occupant).toEqual({ color: "w", piece: "p" });
    expect(e2.legalMoves.map(m => m.to)).toEqual(expect.arrayContaining(["e3", "e4"]));
    const e7 = g8InspectSquare(board.fen(), "e7")!;
    expect(e7.occupant?.color).toBe("b");
    expect(e7.legalMoves).toHaveLength(0); // Black is not to move.
  });

  it("identifies mutual pawn attacks as facts without claiming either capture is legal", () => {
    const fen = "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1";
    const white = g8InspectSquare(fen, "e4")!;
    const black = g8InspectSquare(fen, "d5")!;
    expect(white.blackAttackers.map(item => item.square)).toContain("d5");
    expect(black.whiteAttackers.map(item => item.square)).toContain("e4");
    expect(white.legalMoves.map(m => m.to)).toContain("d5");
    expect(black.legalMoves).toHaveLength(0);
    const overview = g8BoardVision(fen)!;
    expect(overview.attackedWhite.find(item => item.square === "e4")?.attackers).toBe(1);
    expect(overview.attackedBlack.find(item => item.square === "d5")?.attackers).toBe(1);
  });

  it("shows pinned-piece attacks even when the pinned piece cannot legally move", () => {
    const fen = "4k3/4n3/8/8/8/8/4R3/4K3 w - - 0 1";
    const square = g8InspectSquare(fen, "c6")!;
    expect(square.blackAttackers.map(piece => piece.square)).toContain("e7");
    expect(square.legalMoves).toHaveLength(0);
  });

  it("rejects malformed boards and squares without inventing attack data", () => {
    const valid = new Chess().fen();
    expect(g8BoardVision("not a FEN")).toBeNull();
    expect(g8InspectSquare("not a FEN", "e4")).toBeNull();
    expect(g8InspectSquare(valid, "i9" as Square)).toBeNull();
    expect(g8InspectSquare(valid, "e5?" as Square)).toBeNull();
    for (const square of ["a1", "h8", "e4", "g7"] as const) {
      const fact = g8InspectSquare(valid, square);
      expect(fact?.square).toBe(square);
    }
  });
});
