import { describe, expect, it } from "vitest";
import { importPgn } from "../games/import";
import {
  openingDeviationsForGame,
} from "./match";
import {
  createOpeningProgress,
  applyOpeningAttempt,
} from "./progress";
import {
  repertoireById,
} from "./repertoire";
import { repertoireHealth } from "./health";

describe("P32 repertoire health", () => {
  it("uses real matched games and deviations in health", () => {
    const repertoire =
      repertoireById["white-e4-simple"];
    const good = importPgn(
      "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 *",
      "w",
    );
    const deviated = importPgn(
      "1. d4 d5 2. c4 e6 *",
      "w",
    );
    const deviations = [
      ...openingDeviationsForGame(good),
      ...openingDeviationsForGame(
        deviated,
      ),
    ];

    const health = repertoireHealth(
      repertoire,
      {},
      deviations,
      [good, deviated],
    );

    expect(health.games).toBe(2);
    expect(health.deviations).toBe(1);
    expect(health.deviationRate).toBe(50);
    expect(health.health).toBeLessThan(100);
  });

  it("does not count zero-fit games as repertoire evidence", () => {
    const repertoire =
      repertoireById["black-caro"];
    const unrelated = importPgn(
      "1. d4 d5 2. c4 e6 *",
      "b",
    );

    const health = repertoireHealth(
      repertoire,
      {},
      [],
      [unrelated],
    );

    expect(health.games).toBe(0);
  });

  it("identifies a weak branch from combined recall and game evidence", () => {
    const repertoire =
      repertoireById["white-e4-simple"];
    const now = new Date(
      "2026-10-06T12:00:00Z",
    );
    const good = applyOpeningAttempt(
      createOpeningProgress(
        "italian-e5",
        now,
      ),
      true,
      1,
      now,
      { conceptCorrect: true },
    );
    const weak = applyOpeningAttempt(
      createOpeningProgress(
        "white-start",
        now,
      ),
      false,
      .2,
      now,
      { conceptCorrect: false },
    );

    const health = repertoireHealth(
      repertoire,
      {
        "italian-e5": good,
        "white-start": weak,
      },
      [],
      [],
    );

    expect(
      health.weakestBranch?.nodeId,
    ).toBe("white-start");
  });
});
