import { describe, expect, it } from "vitest";
import type { ImportedGame } from "../games/types";
import { filterReviewGames, reviewSourceLabel, reviewSourceLink } from "./reviewPresentation";

const game = (id: string, source: ImportedGame["source"], reviewed: boolean): ImportedGame => ({
  id, source, white: "Player White", black: "Player Black",
  importedAt: id === "new" ? "2026-10-21T09:00:00Z" : "2026-10-20T09:00:00Z",
  openingName: "Italian Game", moves: [], result: "1-0",
  ...(reviewed ? { reviewStory: { moments: [] } as NonNullable<ImportedGame["reviewStory"]> } : {}),
} as ImportedGame);

describe("Review game presentation without changing sources", () => {
  const games = [game("old", "manual", true), game("new", "lichess", false), game("train", "training", true)];

  it("sorts matching original game objects, preserving IDs and record identities", () => {
    const result = filterReviewGames(games, "player", "all", "all");
    expect(result.map((entry) => entry.id)).toEqual(["new", "old", "train"]);
    expect(result[0]).toBe(games[1]);
  });

  it("stabilizes equal import timestamps without altering game identities", () => {
    const one = game("b", "manual", true);
    const two = game("a", "manual", true);
    expect(filterReviewGames([one, two], "", "all", "all").map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("filters by real stored analysis and source instead of manufacturing reviewed records", () => {
    expect(filterReviewGames(games, "", "pending", "all").map((entry) => entry.id)).toEqual(["new"]);
    expect(filterReviewGames(games, "", "reviewed", "training").map((entry) => entry.id)).toEqual(["train"]);
    expect(filterReviewGames(games, "italian", "all", "manual").map((entry) => entry.id)).toEqual(["old"]);
  });

  it("labels a missing source as PGN import, never human transfer", () => {
    expect(reviewSourceLabel({ source: undefined })).toBe("PGN import");
    expect(reviewSourceLabel({ source: "training" })).toBe("Training");
  });

  it("allows provenance links only for the exact secure Lichess host", () => {
    expect(reviewSourceLink({ source: "lichess", externalUrl: "https://lichess.org/abcdef" })).toBe("https://lichess.org/abcdef");
    for (const invalid of [
      "http://lichess.org/abcdef", "https://lichess.org.evil.test/abcdef",
      "https://evil.test/abcdef", "javascript:alert(1)", "https://name:pass@lichess.org/abcdef",
    ]) {
      expect(reviewSourceLink({ source: "lichess", externalUrl: invalid })).toBeNull();
    }
    expect(reviewSourceLink({ source: "manual", externalUrl: "https://lichess.org/abcdef" })).toBeNull();
  });
});
