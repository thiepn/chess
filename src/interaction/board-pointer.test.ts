import { describe, expect, it } from "vitest";
import { BOARD_DRAG_THRESHOLD_PX, isBoardDrag, isBoardSquare } from "./board-pointer";

describe("P82 chessboard touch/pen gesture boundaries", () => {
  it("keeps short taps as taps, not accidental drag moves", () => {
    expect(isBoardDrag(10, 10, 14, 15)).toBe(false);
    expect(isBoardDrag(10, 10, 19, 10)).toBe(false);
    expect(isBoardDrag(10, 10, 10 + BOARD_DRAG_THRESHOLD_PX, 10)).toBe(true);
    expect(isBoardDrag(10, 10, 18, 16)).toBe(true);
  });
  it("does not accept missing or non-finite gesture coordinates", () => {
    expect(isBoardDrag(0, 0, Number.NaN, 10)).toBe(false);
    expect(isBoardDrag(0, 0, Infinity, 10)).toBe(false);
  });
  it("restricts drop targets to actual board coordinates", () => {
    expect(isBoardSquare("e4")).toBe(true);
    expect(isBoardSquare("a1")).toBe(true);
    expect(isBoardSquare("h8")).toBe(true);
    for (const value of ["a0", "i4", "h9", "E4", "../e4", "promotion", "", null]) {
      expect(isBoardSquare(value)).toBe(false);
    }
  });
});
