import { Chess, type Square } from "chess.js";
import { describe, expect, it } from "vitest";
import { decideBoardTap } from "./live-board-selection";
import { liveBoardFen, recordAcceptedBoardFen } from "./live-board-position";

function tap(board: Chess, from: Square | null, square: Square) {
  const piece = board.get(square);
  const legal = from !== null && board.moves({ square: from, verbose: true })
    .some(move => move.to === square);
  return decideBoardTap(from, square, piece?.color ?? null, board.turn(), legal);
}

describe("rapid tap and touch selection follows the live board", () => {
  it("can select the next side immediately after a move before React rerenders", () => {
    const rendered = new Chess().fen();
    const live = { current: rendered };
    let origin: Square | null = null;

    const white = new Chess(liveBoardFen(live));
    expect(tap(white, origin, "e2")).toBe("select");
    origin = "e2";
    expect(tap(white, origin, "e4")).toBe("move");
    white.move("e4");
    recordAcceptedBoardFen(live, white.fen());
    origin = null;

    // The old rendered board still says White, while the live board says Black.
    expect(new Chess(rendered).turn()).toBe("w");
    const black = new Chess(liveBoardFen(live));
    expect(black.turn()).toBe("b");
    expect(tap(black, origin, "e7")).toBe("select");
    origin = "e7";
    expect(tap(black, origin, "e5")).toBe("move");
  });

  it("refuses an opponent's piece and a geometrically illegal destination", () => {
    const board = new Chess();
    expect(tap(board, null, "e7")).toBe("ignore");
    expect(tap(board, "e2", "e7")).toBe("reject");
    expect(tap(board, "e2", "e5")).toBe("reject");
  });

  it("clears or switches the current selection without obsolete move targets", () => {
    const board = new Chess();
    expect(tap(board, "e2", "e2")).toBe("clear");
    expect(tap(board, "e2", "g1")).toBe("select");
    expect(tap(board, null, "e4")).toBe("ignore");
  });

  it("does not let stale selection authorize a move after a changed turn", () => {
    const board = new Chess();
    board.move("e4");
    expect(board.turn()).toBe("b");
    expect(tap(board, "e2", "e4")).toBe("reject");
    expect(tap(board, "e2", "e7")).toBe("select");
  });
});
