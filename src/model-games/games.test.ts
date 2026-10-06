import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import {
  modelGameCatalogIssues,
  modelGameCheckpointPosition,
  modelGames,
  modelGameTimeline,
} from "./games";

describe("P33 model game corpus", () => {
  it("passes the compact catalog audit", () => {
    expect(modelGameCatalogIssues()).toEqual([]);
  });

  it("contains legal complete games", () => {
    for (const game of modelGames) {
      const chess = new Chess();
      expect(
        () =>
          chess.loadPgn(game.pgn, {
            strict: false,
          }),
        game.id,
      ).not.toThrow();
      expect(
        modelGameTimeline(game).length,
        game.id,
      ).toBeGreaterThan(20);
    }
  });

  it("maps every checkpoint to the historical move", () => {
    for (const game of modelGames) {
      for (const checkpoint of game.checkpoints) {
        const position =
          modelGameCheckpointPosition(
            game,
            checkpoint,
          );
        const chess = new Chess(
          position.beforeFen,
        );
        const move = chess.move({
          from: position.expectedMove.slice(
            0,
            2,
          ) as import("chess.js").Square,
          to: position.expectedMove.slice(
            2,
            4,
          ) as import("chess.js").Square,
          promotion:
            position.expectedMove.slice(
              4,
              5,
            ) || undefined,
        });

        expect(move.san, checkpoint.id).toBe(
          position.targetSan,
        );
        expect(chess.fen(), checkpoint.id).toBe(
          position.afterFen,
        );
      }
    }
  });

  it("keeps questions active rather than passive", () => {
    for (const game of modelGames) {
      for (const checkpoint of game.checkpoints) {
        expect(
          checkpoint.options.length,
          checkpoint.id,
        ).toBeGreaterThanOrEqual(3);
        expect(
          checkpoint.options.filter(
            (option) => option.correct,
          ),
          checkpoint.id,
        ).toHaveLength(1);
        expect(
          checkpoint.hints.length,
          checkpoint.id,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("connects model games to the personal repertoire without requiring every game to be an opening lesson", () => {
    const linked = modelGames.filter(
      (game) => game.repertoireId,
    );
    expect(linked.length).toBeGreaterThanOrEqual(3);
    expect(
      linked.map((game) => game.repertoireId),
    ).toContain("black-caro");
    expect(
      linked.map((game) => game.repertoireId),
    ).toContain("black-qgd");
    expect(
      linked.map((game) => game.repertoireId),
    ).toContain("white-e4-simple");
  });
});
