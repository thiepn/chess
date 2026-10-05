import { describe, expect, it } from "vitest";
import { importLichessPgnBatch } from "./api";

const whiteGame = `[Event "Rated Blitz game"]
[Site "https://lichess.org/AbCd1234"]
[Date "2026.10.05"]
[UTCDate "2026.10.05"]
[UTCTime "18:30:00"]
[White "TestUser"]
[Black "OpponentA"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`;

const blackGame = `[Event "Rated Rapid game"]
[Site "https://lichess.org/ZyXw9876"]
[Date "2026.10.06"]
[UTCDate "2026.10.06"]
[UTCTime "00:05:00"]
[White "OpponentB"]
[Black "testuser"]
[Result "0-1"]

1. d4 d5 2. c4 e6 3. Nc3 Nf6 0-1`;

describe("Lichess intake", () => {
  it("imports a PGN batch and infers the linked player's color", () => {
    const games = importLichessPgnBatch(
      `${whiteGame}\n\n${blackGame}`,
      "TestUser",
    );

    expect(games).toHaveLength(2);
    expect(games[0].playerColor).toBe("w");
    expect(games[1].playerColor).toBe("b");
  });

  it("uses stable Lichess IDs and provenance", () => {
    const [game] = importLichessPgnBatch(whiteGame, "@testuser");

    expect(game.id).toBe("lichess:AbCd1234");
    expect(game.externalId).toBe("AbCd1234");
    expect(game.externalUrl).toBe("https://lichess.org/AbCd1234");
    expect(game.source).toBe("lichess");
    expect(game.importedAt).toBe("2026-10-05T18:30:00.000Z");
  });

  it("skips games that do not contain the linked username", () => {
    const games = importLichessPgnBatch(whiteGame, "SomeoneElse");
    expect(games).toEqual([]);
  });

  it("skips malformed entries without losing valid games", () => {
    const games = importLichessPgnBatch(
      `[Event "Broken"]\n[Site "https://lichess.org/Broken12"]\n\nnot chess\n\n${whiteGame}`,
      "TestUser",
    );

    expect(games).toHaveLength(1);
    expect(games[0].externalId).toBe("AbCd1234");
  });
});
