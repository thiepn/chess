import { describe, expect, it } from "vitest";
import { extractLichessGameId } from "./lichess";

describe("Lichess import", () => {
  it("extracts game IDs from common Lichess URLs", () => {
    expect(extractLichessGameId("https://lichess.org/AbCd1234")).toBe("AbCd1234");
    expect(extractLichessGameId("https://lichess.org/game/AbCd1234EfGh")).toBe("AbCd1234");
    expect(extractLichessGameId("AbCd1234")).toBe("AbCd1234");
  });

  it("rejects unrelated URLs", () => {
    expect(extractLichessGameId("https://example.com/AbCd1234")).toBeNull();
  });
});
