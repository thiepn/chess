import { describe, expect, it } from "vitest";
import { composeSession, sessionMinutes } from "./composer";
import { initialUserState } from "../data/demo";

describe("training composer", () => {
  it("keeps sessions inside the requested time budget", () => {
    const session = composeSession(
      initialUserState,
      "standard",
      new Date("2026-10-05T12:00:00Z"),
    );
    expect(session.plannedMinutes).toBeLessThanOrEqual(sessionMinutes.standard + 1);
    expect(session.activities.length).toBeGreaterThan(0);
  });

  it("prioritizes a critical recurring weakness", () => {
    const session = composeSession(
      initialUserState,
      "standard",
      new Date("2026-10-05T12:00:00Z"),
    );
    expect(
      session.activities.some(
        (item) =>
          item.source === "weakness" &&
          item.skillIds.includes("fundamentals.hanging"),
      ),
    ).toBe(true);
  });

  it("limits novel material", () => {
    const session = composeSession(
      initialUserState,
      "deep",
      new Date("2026-10-05T12:00:00Z"),
    );
    const novelMinutes = session.activities
      .filter((item) => item.novelty > .8)
      .reduce((sum, item) => sum + item.estimatedMinutes, 0);

    expect(novelMinutes).toBeLessThanOrEqual(sessionMinutes.deep * .3);
  });
});
