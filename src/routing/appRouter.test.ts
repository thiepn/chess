import { describe, expect, it } from "vitest";
import { pathForPage, resolveAppRoute } from "./appRouter";

describe("P38 app routing", () => {
  it("resolves root to Train", () => {
    expect(resolveAppRoute("/")).toMatchObject({
      page: "train",
      path: "/train",
      isFallback: false,
    });
  });

  it("resolves primary and nested route families by page", () => {
    expect(resolveAppRoute("/train/session/adaptive%3Atactics")).toMatchObject({
      page: "train",
      path: "/train/session/adaptive%3Atactics",
    });
    expect(resolveAppRoute("/learn")).toMatchObject({ page: "learn" });
    expect(resolveAppRoute("/learn/tactics/pins")).toMatchObject({
      page: "learn",
      path: "/learn/tactics/pins",
    });
    expect(resolveAppRoute("/review/game-42")).toMatchObject({
      page: "review",
    });
    expect(resolveAppRoute("/library/repertoire/caro-kann")).toMatchObject({
      page: "library",
    });
  });

  it("keeps Progress and Settings as secondary pages", () => {
    expect(resolveAppRoute("/progress")).toMatchObject({ page: "progress" });
    expect(resolveAppRoute("/settings")).toMatchObject({ page: "settings" });
  });

  it("falls unknown routes back to Train", () => {
    expect(resolveAppRoute("/dashboard")).toMatchObject({
      page: "train",
      path: "/train",
      requestedPath: "/dashboard",
      isFallback: true,
    });
  });

  it("provides stable page paths", () => {
    expect(pathForPage("train")).toBe("/train");
    expect(pathForPage("review")).toBe("/review");
    expect(pathForPage("progress")).toBe("/progress");
  });
});
