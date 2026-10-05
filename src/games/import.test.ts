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

  it("rejects PGN without moves", () => {
    expect(() => importPgn('[Event "Empty"]', "w")).toThrow();
  });
});
