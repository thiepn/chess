import { describe, expect, it } from "vitest";
import { resolveReviewRoute, reviewGamePath } from "./reviewRoutes";

describe("P44 Review routes", () => {
  it("uses /review as the review index", () => {
    expect(resolveReviewRoute("/review")).toEqual({ mode: "index" });
  });

  it("resolves a game review page", () => {
    expect(resolveReviewRoute("/review/game-42")).toEqual({
      mode: "game",
      gameId: "game-42",
    });
  });

  it("encodes game ids safely", () => {
    expect(reviewGamePath("lichess:abc/123")).toBe(
      "/review/lichess%3Aabc%2F123",
    );
  });
});
