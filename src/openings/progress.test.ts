import { describe, expect, it } from "vitest";
import {
  applyOpeningAttempt,
  createOpeningProgress,
  dueOpeningNodes,
  repertoireMastery,
  trainableOpeningNodes,
} from "./progress";
import { repertoireById } from "./repertoire";

describe("opening recall progress", () => {
  const repertoire = repertoireById["white-e4-simple"];

  it("trains only positions where the learner has a repertoire move", () => {
    const ids = trainableOpeningNodes(repertoire).map((node) => node.id);
    expect(ids).toContain("white-start");
    expect(ids).toContain("italian-e5");
    expect(ids).not.toContain("white-e4");
  });

  it("schedules successful retrieval farther into the future", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    const first = applyOpeningAttempt(
      createOpeningProgress("white-start", now),
      true,
      1,
      now,
    );
    const second = applyOpeningAttempt(
      first,
      true,
      1,
      new Date("2026-10-06T12:00:00Z"),
    );

    expect(new Date(second.nextReviewAt).getTime()).toBeGreaterThan(
      new Date(first.nextReviewAt).getTime(),
    );
    expect(second.streak).toBe(2);
  });

  it("treats unseen positions as due", () => {
    const due = dueOpeningNodes(
      repertoire,
      {},
      new Date("2026-10-05T12:00:00Z"),
    );
    expect(due.length).toBeGreaterThan(0);
  });

  it("derives repertoire mastery from retrieval evidence", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    const progress = {
      "white-start": {
        ...createOpeningProgress("white-start", now),
        attempts: 3,
        successes: 3,
        streak: 3,
      },
    };
    expect(repertoireMastery(repertoire, progress)).toBeGreaterThan(0);
  });
});
