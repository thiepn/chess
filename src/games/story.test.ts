import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { buildGameReviewStory } from "./story";
import type { EngineMoveReview, ImportedGame, PersonalMistake } from "./types";

function makeReviews(): EngineMoveReview[] {
  const chess = new Chess();
  const sans = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "d3", "Bc5"];
  const reviews: EngineMoveReview[] = [];
  let ply = 0;

  for (const san of sans) {
    const beforeFen = chess.fen();
    const move = chess.move(san)!;
    ply += 1;
    if (move.color !== "w") continue;

    reviews.push({
      gameId: "g1",
      ply,
      move: {
        ply,
        moveNumber: Math.ceil(ply / 2),
        color: move.color,
        san: move.san,
        uci: `${move.from}${move.to}`,
        from: move.from,
        to: move.to,
        piece: move.piece,
        captured: move.captured,
        beforeFen,
        afterFen: chess.fen(),
      },
      before: {
        scoreCp: 20,
        bestMove: `${move.from}${move.to}`,
        pv: [`${move.from}${move.to}`],
        depth: 10,
      },
      after: {
        scoreCp: -20,
        bestMove: "a7a6",
        pv: ["a7a6"],
        depth: 10,
      },
      centipawnLoss: ply === 5 ? 160 : 10,
    });
  }

  return reviews;
}

describe("game review story", () => {
  it("keeps the review focused on a small number of moments", () => {
    const reviews = makeReviews();
    const mistake: PersonalMistake = {
      id: "g1:5",
      gameId: "g1",
      ply: 5,
      moveNumber: 3,
      playerColor: "w",
      positionFen: reviews[2].move.beforeFen,
      actualMove: reviews[2].move.uci,
      actualSan: reviews[2].move.san,
      bestMove: reviews[2].before.bestMove,
      principalVariation: reviews[2].before.pv,
      evaluationBefore: 20,
      evaluationAfter: -140,
      centipawnLoss: 160,
      severity: "mistake",
      skillIds: ["openings.principles"],
      explanation: "Develop with purpose.",
      createdAt: "2026-10-05T12:00:00Z",
      nextReviewAt: "2026-10-05T12:00:00Z",
      attempts: 0,
      successes: 0,
      resolved: false,
    };
    const game: ImportedGame = {
      id: "g1",
      pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 *",
      importedAt: "2026-10-05T12:00:00Z",
      playerColor: "w",
      white: "You",
      black: "Opponent",
      result: "*",
      moves: reviews.map((review) => review.move),
      criticalMomentIds: [mistake.id],
    };

    const story = buildGameReviewStory(
      game,
      reviews,
      [mistake],
      new Date("2026-10-05T12:30:00Z"),
    );

    expect(story.moments.length).toBeGreaterThanOrEqual(3);
    expect(story.moments.length).toBeLessThanOrEqual(5);
    expect(story.moments.some((moment) => moment.mistakeId === mistake.id)).toBe(true);
    expect(story.phases[0]?.phase).toBe("opening");
    expect(story.prioritySkillId).toBe("openings.principles");
  });

  it("does not invent critical mistakes in a clean game", () => {
    const reviews = makeReviews().map((review) => ({
      ...review,
      centipawnLoss: 8,
    }));
    const game: ImportedGame = {
      id: "g2",
      pgn: "1. e4 e5 2. Nf3 Nc6 *",
      importedAt: "2026-10-05T12:00:00Z",
      playerColor: "w",
      white: "You",
      black: "Opponent",
      result: "*",
      moves: reviews.map((review) => review.move),
      criticalMomentIds: [],
    };

    const story = buildGameReviewStory(game, reviews, []);
    expect(story.verdict).toBe("clean");
    expect(story.moments.every((moment) => !moment.mistakeId)).toBe(true);
  });
});
