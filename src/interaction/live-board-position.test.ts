import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { liveBoardFen, recordAcceptedBoardFen } from "./live-board-position";

describe("live board position authority between React renders", () => {
  it("validates a second rapid move from the accepted board, not stale rendered state", () => {
    const rendered = new Chess().fen();
    const current = { current: rendered };
    const first = new Chess(liveBoardFen(current));
    expect(first.move("e4")).toBeTruthy();
    recordAcceptedBoardFen(current, first.fen());

    // React may still show the initial white-to-move position in this tick.
    expect(rendered).toBe(new Chess().fen());
    expect(new Chess(rendered).turn()).toBe("w");
    const second = new Chess(liveBoardFen(current));
    expect(second.turn()).toBe("b");
    expect(second.move("e5")).toBeTruthy();
    recordAcceptedBoardFen(current, second.fen());
    expect(new Chess(liveBoardFen(current)).turn()).toBe("w");
  });

  it("does not commit rejected moves and resets exactly when the source FEN changes", () => {
    const initial = new Chess().fen();
    const current = { current: initial };
    const illegal = new Chess(liveBoardFen(current));
    expect(() => illegal.move("e5")).toThrow();
    expect(liveBoardFen(current)).toBe(initial);

    const accepted = new Chess(liveBoardFen(current));
    accepted.move("d4");
    recordAcceptedBoardFen(current, accepted.fen());
    expect(liveBoardFen(current)).not.toBe(initial);
    recordAcceptedBoardFen(current, initial);
    expect(liveBoardFen(current)).toBe(initial);
  });

  it("uses the live position for promotion detection after the previous move", () => {
    const start = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
    const current = { current: start };
    const pre = new Chess(liveBoardFen(current));
    expect(pre.moves({ square: "a7", verbose: true }).some(move => move.promotion === "q")).toBe(true);
    expect(pre.move({ from: "a7", to: "a8", promotion: "q" })).toBeTruthy();
    recordAcceptedBoardFen(current, pre.fen());
    const live = new Chess(liveBoardFen(current));
    expect(live.turn()).toBe("b");
    expect(live.moves({ square: "a7", verbose: true })).toHaveLength(0);
  });
});
