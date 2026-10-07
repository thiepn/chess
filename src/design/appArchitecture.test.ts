import { describe, expect, it } from "vitest";
import {
  chessDesignContract,
  defaultAppPath,
  primaryAppPages,
  secondaryAppPages,
} from "./appArchitecture";

describe("P37 visual architecture contract", () => {
  it("makes Train the default full-page destination", () => {
    expect(defaultAppPath).toBe("/train");
    expect(primaryAppPages[0]).toMatchObject({
      id: "train",
      path: "/train",
    });
  });

  it("keeps the five primary mobile destinations stable", () => {
    expect(primaryAppPages.filter((page) => page.mobile).map((page) => page.id)).toEqual([
      "train",
      "learn",
      "play",
      "review",
      "library",
    ]);
  });

  it("keeps route paths unique", () => {
    const paths = [...primaryAppPages, ...secondaryAppPages].map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("locks the non-SaaS presentation rules", () => {
    expect(chessDesignContract.giantSentenceHeroByDefault).toBe(false);
    expect(chessDesignContract.permanentGenericSidebar).toBe(false);
    expect(chessDesignContract.primaryWorkflowsUseFullPageRoutes).toBe(true);
    expect(chessDesignContract.boardIsPrimaryWhenPositionActive).toBe(true);
  });
});
