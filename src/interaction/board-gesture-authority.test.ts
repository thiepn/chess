import { describe, expect, it } from "vitest";
import { isGestureBoardCurrent } from "./board-gesture-authority";

describe("touch and HTML drag source-board continuity", () => {
  const original = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const advanced = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

  it("allows a valid gesture to finish on the same current position", () => {
    expect(isGestureBoardCurrent(original, original)).toBe(true);
    expect(isGestureBoardCurrent(advanced, advanced)).toBe(true);
  });

  it("rejects a touch drag started before a real move or lesson switch", () => {
    expect(isGestureBoardCurrent(original, advanced)).toBe(false);
    expect(isGestureBoardCurrent(advanced, original)).toBe(false);
  });

  it("rejects stale HTML drag even when pieces match but the game clock changed", () => {
    const nextTurn = original.replace(" 0 1", " 2 3");
    expect(nextTurn).not.toBe(original);
    expect(isGestureBoardCurrent(original, nextTurn)).toBe(false);
  });

  it("rejects a cancelled or not-yet-started HTML drag", () => {
    expect(isGestureBoardCurrent(null, original)).toBe(false);
  });
});
