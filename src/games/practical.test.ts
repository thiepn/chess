import { describe, expect, it } from "vitest";
import { classifyTimeControl } from "./import";
import { buildPracticalGameMetrics, timeControlWeight } from "./practical";
import type {
  EngineMoveReview,
  ImportedGame,
  PersonalMistake,
} from "./types";

function review(loss: number, ply: number): EngineMoveReview {
  return {
    gameId: "lichess:test",
    ply,
    move: {
      ply,
      moveNumber: Math.ceil(ply / 2),
      color: "w",
      san: "Nf3",
      uci: "g1f3",
      from: "g1",
      to: "f3",
      piece: "n",
      beforeFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      afterFen: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1",
    },
    before: {
      scoreCp: 20,
      bestMove: "g1f3",
      pv: ["g1f3"],
      depth: 10,
    },
    after: {
      scoreCp: -Math.max(0, 20 - loss),
      bestMove: "g8f6",
      pv: ["g8f6"],
      depth: 10,
    },
    centipawnLoss: loss,
  };
}

const game: ImportedGame = {
  id: "lichess:test",
  pgn: "test",
  source: "lichess",
  externalId: "test",
  importedAt: "2026-10-06T08:00:00Z",
  playerColor: "w",
  white: "User",
  black: "Opponent",
  result: "1-0",
  moves: [],
  criticalMomentIds: [],
  timeControl: "600+5",
  timeControlCategory: "rapid",
  playerRating: 1400,
  opponentRating: 1500,
};

describe("practical game context", () => {
  it("classifies common time controls", () => {
    expect(classifyTimeControl("60+0")).toBe("bullet");
    expect(classifyTimeControl("180+2")).toBe("blitz");
    expect(classifyTimeControl("600+5")).toBe("rapid");
    expect(classifyTimeControl("1800+10")).toBe("classical");
    expect(classifyTimeControl("1/86400")).toBe("correspondence");
  });

  it("values slower human games above bullet for transfer context", () => {
    expect(timeControlWeight("rapid")).toBeGreaterThan(
      timeControlWeight("bullet"),
    );
  });

  it("scores a clean game above a blunder-heavy game", () => {
    const clean = buildPracticalGameMetrics(
      game,
      [review(10, 1), review(15, 3), review(20, 5)],
      [],
    );

    const mistake: PersonalMistake = {
      id: "m1",
      gameId: game.id,
      ply: 3,
      moveNumber: 2,
      playerColor: "w",
      positionFen: review(300, 3).move.beforeFen,
      actualMove: "g1f3",
      actualSan: "Nf3",
      bestMove: "g1f3",
      principalVariation: ["g1f3"],
      evaluationBefore: 20,
      evaluationAfter: -280,
      centipawnLoss: 300,
      severity: "blunder",
      skillIds: ["fundamentals.blunder-check"],
      explanation: "test",
      createdAt: "2026-10-06T08:00:00Z",
      nextReviewAt: "2026-10-06T08:00:00Z",
      attempts: 0,
      successes: 0,
      resolved: false,
    };

    const costly = buildPracticalGameMetrics(
      game,
      [review(10, 1), review(300, 3), review(180, 5)],
      [mistake],
    );

    expect(clean.qualityScore).toBeGreaterThan(costly.qualityScore);
    expect(costly.blunderRate).toBeGreaterThan(0);
  });
});
