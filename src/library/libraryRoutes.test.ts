import { describe, expect, it } from "vitest";
import {
  libraryCollectionPath,
  libraryGamePath,
  libraryReferencePath,
  libraryStudyPath,
  resolveLibraryRoute,
} from "./libraryRoutes";

describe("P45 Library routes", () => {
  it("uses /library as the archive index", () => {
    expect(resolveLibraryRoute("/library")).toEqual({ mode: "index" });
  });

  it("resolves real collection pages", () => {
    expect(resolveLibraryRoute("/library/endgames")).toEqual({
      mode: "collection",
      collection: "endgames",
    });
  });

  it("resolves a saved study workspace", () => {
    expect(resolveLibraryRoute("/library/studies/study-1")).toEqual({
      mode: "workspace",
      resourceKind: "study",
      resourceId: "study-1",
    });
  });

  it("builds stable resource URLs", () => {
    expect(libraryCollectionPath("games")).toBe("/library/games");
    expect(libraryStudyPath("study:1/2")).toBe(
      "/library/studies/study%3A1%2F2",
    );
    expect(libraryReferencePath("reference-opera-game")).toBe(
      "/library/references/reference-opera-game",
    );
    expect(libraryGamePath("game:abc")).toBe(
      "/library/games/game%3Aabc",
    );
  });
});
