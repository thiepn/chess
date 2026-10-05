import { describe, expect, it } from "vitest";
import {
  buildCandidatePool,
  composeSession,
  sessionMinutes,
} from "./composer";
import { curriculumStages, skillById } from "./curriculum";
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

  it("prioritizes skills missed in the latest checkpoint", () => {
    const state = {
      ...initialUserState,
      placement: {
        attemptId: "placement-1",
        completedAt: "2026-10-05T09:00:00Z",
        recommendedStageId: "safety" as const,
        stageScores: {},
      },
      assessments: [
        {
          id: "attempt:checkpoint:safety",
          sessionId: "checkpoint:safety",
          kind: "checkpoint" as const,
          stageId: "safety" as const,
          completedAt: "2026-10-05T11:00:00Z",
          score: 50,
          results: [
            {
              itemId: "one",
              skillId: "fundamentals.hanging",
              stageId: "safety" as const,
              success: false,
            },
            {
              itemId: "two",
              skillId: "fundamentals.values",
              stageId: "safety" as const,
              success: true,
            },
          ],
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
          item.source === "assessment" &&
          item.skillIds.includes("fundamentals.hanging"),
      ),
    ).toBe(true);
  });

  it("does not recommend curriculum below the placement floor", () => {
    const state = {
      ...initialUserState,
      placement: {
        attemptId: "placement-advanced",
        completedAt: "2026-10-05T09:00:00Z",
        recommendedStageId: "tactics" as const,
        stageScores: {},
      },
    };

    const pool = buildCandidatePool(
      state,
      new Date("2026-10-05T12:00:00Z"),
    );
    const curriculum = pool.filter((item) => item.source === "curriculum");
    const tacticsOrder =
      curriculumStages.find((stage) => stage.id === "tactics")?.order ?? 0;

    expect(curriculum.length).toBeGreaterThan(0);
    expect(
      curriculum.every((item) => {
        const skill = skillById[item.skillIds[0]];
        const order =
          curriculumStages.find((stage) => stage.id === skill?.stage)?.order ??
          -1;
        return order >= tacticsOrder;
      }),
    ).toBe(true);
  });

  it("turns a transfer gap into a playable adaptive scenario", () => {
    const base = initialUserState.mastery["endgames.opposition"];
    const state = {
      ...initialUserState,
      weaknesses: [],
      mastery: {
        ...initialUserState.mastery,
        "endgames.opposition": {
          ...base,
          attempts: 16,
          understanding: 82,
          recognition: 78,
          execution: 74,
          mixedRecognition: 72,
          effectiveMastery: 68,
          trainingTransfer: 8,
          realGameRecognition: 5,
          realGameExecution: 3,
          confidence: 72,
          lastSuccessAt: "2026-10-05T10:00:00Z",
          stabilityDays: 8,
          nextReviewAt: "2026-11-05T10:00:00Z",
        },
      },
      focus: {
        domain: "endgames" as const,
      },
    };

    const pool = buildCandidatePool(
      state,
      new Date("2026-10-05T12:00:00Z"),
    );
    const candidate = pool.find(
      (item) =>
        item.skillIds.includes("endgames.opposition") &&
        item.activityType === "engineGame",
    );

    expect(candidate).toBeTruthy();
    expect(candidate?.scenarioId).toBe("endgame-opposition");
    expect(candidate?.adaptivePolicy?.reason).toContain("transfer");
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
