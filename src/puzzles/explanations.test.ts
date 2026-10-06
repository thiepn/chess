import { describe, expect, it } from "vitest";
import { seedPuzzles } from "./seed";
import {
  primaryPuzzleTheme,
  puzzleExplanation,
  puzzleSolutionSan,
} from "./explanations";

describe("P27 puzzle explanations", () => {
  it("extracts an instructional motif instead of structural noise", () => {
    const puzzle = seedPuzzles.find(
      (item) => item.id === "seed-pin-1",
    )!;
    expect(primaryPuzzleTheme(puzzle)).toBe("pin");
    expect(puzzleExplanation(puzzle).motif).toBe("Pin");
  });

  it("converts the stored UCI solution into readable SAN", () => {
    const puzzle = seedPuzzles.find(
      (item) => item.id === "seed-skewer-1",
    )!;
    const san = puzzleSolutionSan(puzzle);
    expect(san.length).toBe(
      puzzle.solutionMoves.length,
    );
    expect(san[0]).toBeTruthy();
  });

  it("explains Lichess alternative-move semantics without claiming every mate-in-one is unique", () => {
    const mate = seedPuzzles.find(
      (item) => item.id === "seed-mate-1",
    )!;
    const explanation = puzzleExplanation({
      ...mate,
      source: "lichess",
    });
    expect(explanation.alternatives).toContain(
      "more than one",
    );
  });
});
