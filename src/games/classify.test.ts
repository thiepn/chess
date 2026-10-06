import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { buildPersonalMistake, classifyReview } from "./classify";
import type { EngineMoveReview } from "./types";

function review(overrides: Partial<EngineMoveReview> = {}): EngineMoveReview {
  const chess = new Chess();
  const beforeFen = chess.fen();
  const move = chess.move("f3")!;

  return {
    gameId: "g1",
    ply: 1,
    move: {
      ply: 1,
      moveNumber: 1,
      color: "w",
      san: move.san,
      uci: `${move.from}${move.to}`,
      from: move.from,
      to: move.to,
      piece: move.piece,
      beforeFen,
      afterFen: chess.fen(),
    },
    before: {
      scoreCp: 20,
      bestMove: "e2e4",
      pv: ["e2e4", "e7e5"],
      depth: 12,
    },
    after: {
      scoreCp: 110,
      bestMove: "e7e5",
      pv: ["e7e5"],
      depth: 12,
    },
    centipawnLoss: 130,
    ...overrides,
  };
}

describe("critical moment classification", () => {
  it("ignores small engine differences", () => {
    expect(classifyReview(review({ centipawnLoss: 45 }))).toBeNull();
  });

  it("turns meaningful early errors into curriculum-linked mistakes", () => {
    const result = classifyReview(review());
    expect(result?.severity).toBe("mistake");
    expect(result?.skillIds).toContain("openings.principles");
  });

  it("distinguishes a very fast costly decision as time-management evidence", () => {
    const result = classifyReview(
      review({
        move: {
          ...review().move,
          moveTimeSeconds: 2.2,
        },
      }),
    );

    expect(result?.errorType).toBe("time-management");
    expect(result?.errorReason).toContain("2.2s");
  });

  it("marks an ordinary early non-forcing error as a strategic-plan error", () => {
    const result = classifyReview(review());
    expect(result?.errorType).toBe("strategic-plan");
  });

  it("creates a due personal training position without revealing it first", () => {
    const result = buildPersonalMistake(review(), new Date("2026-10-05T12:00:00Z"));
    expect(result?.positionFen).toBeTruthy();
    expect(result?.actualMove).toBe("f2f3");
    expect(result?.bestMove).toBe("e2e4");
    expect(result?.nextReviewAt).toBe("2026-10-05T12:00:00.000Z");
  });

  it("filters low-value errors from already lost positions", () => {
    expect(
      classifyReview(
        review({
          centipawnLoss: 150,
          before: {
            scoreCp: -900,
            bestMove: "e2e4",
            pv: ["e2e4"],
            depth: 12,
          },
        }),
      ),
    ).toBeNull();
  });
});
