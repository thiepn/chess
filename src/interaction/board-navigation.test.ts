import { describe, expect, it } from "vitest";
import { nextBoardFocusIndex } from "./board-navigation";

describe("board keyboard navigation", () => {
  it("moves within the visible rank without wrapping", () => {
    expect(nextBoardFocusIndex(8, "ArrowLeft")).toBe(8);
    expect(nextBoardFocusIndex(15, "ArrowRight")).toBe(15);
    expect(nextBoardFocusIndex(10, "ArrowLeft")).toBe(9);
    expect(nextBoardFocusIndex(10, "ArrowRight")).toBe(11);
  });

  it("moves one visible rank with up and down", () => {
    expect(nextBoardFocusIndex(18, "ArrowUp")).toBe(10);
    expect(nextBoardFocusIndex(18, "ArrowDown")).toBe(26);
    expect(nextBoardFocusIndex(2, "ArrowUp")).toBe(2);
    expect(nextBoardFocusIndex(62, "ArrowDown")).toBe(62);
  });

  it("supports Home and End inside the current visible rank", () => {
    expect(nextBoardFocusIndex(19, "Home")).toBe(16);
    expect(nextBoardFocusIndex(19, "End")).toBe(23);
  });
});
