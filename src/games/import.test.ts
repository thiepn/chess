import { describe, expect, it } from "vitest";
import { importPgn, playerMoveCount } from "./import";

const pgn = `[Event "Training game"]
[White "Jonathan"]
[Black "Opponent"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0`;

describe("PGN import", () => {
  it("normalizes headers, positions and UCI moves", () => {
    const game = importPgn(pgn, "w", "2026-10-05T12:00:00Z");

    expect(game.white).toBe("Jonathan");
    expect(game.black).toBe("Opponent");
    expect(game.result).toBe("1-0");
    expect(game.moves).toHaveLength(10);
    expect(game.moves[0].uci).toBe("e2e4");
    expect(game.moves[0].beforeFen).toContain(" w ");
    expect(game.moves[0].afterFen).toContain(" b ");
    expect(playerMoveCount(game)).toBe(5);
  });

  it("preserves opening metadata when present", () => {
    const game = importPgn(
      `[Opening "Italian Game: Classical Variation"]
[ECO "C50"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 *`,
      "w",
    );
    expect(game.openingName).toBe("Italian Game: Classical Variation");
    expect(game.eco).toBe("C50");
  });

  it("preserves a custom starting FEN", () => {
    const custom = `[Event "Scenario"]
[SetUp "1"]
[FEN "4k3/8/8/4K3/4P3/8/8/8 w - - 0 1"]
[Result "*"]

1. Kf6 *`;

    const game = importPgn(custom, "w");
    expect(game.startingFen).toBe("4k3/8/8/4K3/4P3/8/8/8 w - - 0 1");
  });

  it("uses the FEN full-move number for scenario timelines", () => {
    const custom = `[Event "Late scenario"]
[SetUp "1"]
[FEN "4k3/8/8/4K3/4P3/8/8/8 w - - 0 27"]
[Result "*"]

27. Kf6 *`;

    const game = importPgn(custom, "w");
    expect(game.moves[0].moveNumber).toBe(27);
  });

  it("extracts per-move clock context when PGN clock annotations are complete", () => {
    const game = importPgn(
      `[Event "Clocked game"]
[TimeControl "60+0"]
[Result "*"]

1. e4 {[%clk 0:00:55]} e5 {[%clk 0:00:58]} 2. Nf3 {[%clk 0:00:50]} Nc6 {[%clk 0:00:52]} *`,
      "w",
    );

    expect(game.moves[0].clockSecondsAfterMove).toBe(55);
    expect(game.moves[0].moveTimeSeconds).toBe(5);
    expect(game.moves[1].moveTimeSeconds).toBe(2);
    expect(game.moves[2].moveTimeSeconds).toBe(5);
    expect(game.moves[3].moveTimeSeconds).toBe(6);
  });

  it("does not invent clock context from incomplete annotations", () => {
    const game = importPgn(
      `[TimeControl "60+0"]

1. e4 {[%clk 0:00:55]} e5 2. Nf3 Nc6 *`,
      "w",
    );

    expect(game.moves.every((move) => move.moveTimeSeconds === undefined)).toBe(true);
  });

  it("rejects PGN without moves", () => {
    expect(() => importPgn('[Event "Empty"]', "w")).toThrow();
  });
});
