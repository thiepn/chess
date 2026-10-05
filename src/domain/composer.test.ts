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

  it("pulls a due blunder from the personal mistake bank into training", () => {
    const state = {
      ...initialUserState,
      mistakes: [
        {
          id: "game-1:11",
          gameId: "game-1",
          ply: 11,
          moveNumber: 6,
          playerColor: "w" as const,
          positionFen: "4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1",
          actualMove: "e2e7",
          actualSan: "Qe7+",
          bestMove: "e2b5",
          principalVariation: ["e2b5"],
          evaluationBefore: 50,
          evaluationAfter: -400,
          centipawnLoss: 450,
          severity: "blunder" as const,
          skillIds: ["fundamentals.blunder-check"],
          explanation: "Check forcing moves before committing.",
          createdAt: "2026-10-05T10:00:00Z",
          nextReviewAt: "2026-10-05T10:00:00Z",
          attempts: 0,
          successes: 0,
          resolved: false,
        },
      ],
    };

    const session = composeSession(
      state,
      "standard",
      new Date("2026-10-05T12:00:00Z"),
    );

    expect(
      session.activities.some(
        (item) =>
          item.source === "game" &&
          item.activityType === "personalMistake" &&
          item.mistakeId === "game-1:11",
      ),
    ).toBe(true);
  });

  it("schedules a real-game opening deviation even if normal recall is not due", () => {
    const state = {
      ...initialUserState,
      openingProgress: {
        "white-start": {
          nodeId: "white-start",
          attempts: 4,
          successes: 4,
          streak: 4,
          lastAttemptAt: "2026-10-05T10:00:00Z",
          nextReviewAt: "2026-11-05T10:00:00Z",
          lastQuality: 1,
        },
      },
      openingDeviations: [
        {
          id: "g1:opening:1",
          gameId: "g1",
          repertoireId: "white-e4-simple",
          nodeId: "white-start",
          ply: 1,
          expectedMoves: ["e2e4"],
          playedMove: "d2d4",
          occurredAt: "2026-10-05T11:00:00Z",
          resolved: false,
        },
      ],
    };

    const session = composeSession(
      state,
      "standard",
      new Date("2026-10-05T12:00:00Z"),
    );

    expect(
      session.activities.some(
        (item) =>
          item.activityType === "openingRecall" &&
          item.openingNodeId === "white-start" &&
          item.repertoireId === "white-e4-simple",
      ),
    ).toBe(true);
  });

  it("schedules a due study promoted from the library", () => {
    const state = {
      ...initialUserState,
      savedStudies: [
        {
          id: "study-1",
          title: "Remember this candidate move",
          kind: "position" as const,
          fen: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1",
          notes: "Look for forcing moves first.",
          tags: ["calculation"],
          source: "personal" as const,
          orientation: "w" as const,
          arrows: [],
          highlights: [],
          favorite: true,
          createdAt: "2026-10-05T09:00:00Z",
          updatedAt: "2026-10-05T09:00:00Z",
          training: {
            enabled: true,
            skillId: "calculation.candidates",
            targetMove: "e2e4",
            targetSan: "e4",
            attempts: 0,
            successes: 0,
            streak: 0,
            nextReviewAt: "2026-10-05T09:00:00Z",
            lastQuality: 0,
          },
        },
      ],
    };

    const session = composeSession(
      state,
      "deep",
      new Date("2026-10-05T12:00:00Z"),
    );

    expect(
      session.activities.some(
        (item) =>
          item.source === "library" &&
          item.activityType === "savedStudy" &&
          item.studyId === "study-1" &&
          item.title === "Remember this candidate move",
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
