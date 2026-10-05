import { describe, expect, it } from "vitest";
import { importPgn } from "../games/import";
import { chooseRepertoireForGame, openingDeviationsForGame } from "./match";

describe("opening repertoire matching", () => {
  it("matches a White Italian game to the 1.e4 repertoire", () => {
    const game = importPgn("1. e4 e5 2. Nf3 Nc6 3. Bc4 *", "w");
    expect(chooseRepertoireForGame(game)?.id).toBe("white-e4-simple");
    expect(openingDeviationsForGame(game)).toHaveLength(0);
  });

  it("flags the learner leaving the preferred line", () => {
    const game = importPgn("1. d4 d5 2. c4 e6 *", "w");
    const deviations = openingDeviationsForGame(game);
    expect(deviations).toHaveLength(1);
    expect(deviations[0].nodeId).toBe("white-start");
    expect(deviations[0].expectedMoves).toEqual(["e2e4"]);
  });

  it("does not blame the learner when the opponent leaves the curated tree", () => {
    const game = importPgn("1. e4 a6 2. d4 *", "w");
    expect(openingDeviationsForGame(game)).toHaveLength(0);
  });

  it("does not classify training-position games as opening deviations", () => {
    const game = importPgn(
      `[SetUp "1"]
[FEN "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"]

3. Bc4 Nf6 *`,
      "w",
    );

    expect(chooseRepertoireForGame(game)).toBeUndefined();
    expect(openingDeviationsForGame(game)).toHaveLength(0);
  });

  it("matches Black Caro-Kann moves without deviation", () => {
    const game = importPgn("1. e4 c6 2. d4 d5 *", "b");
    expect(chooseRepertoireForGame(game)?.id).toBe("black-caro");
    expect(openingDeviationsForGame(game)).toHaveLength(0);
  });
});
