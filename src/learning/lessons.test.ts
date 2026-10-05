import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { lessonScripts } from "./lessons";

describe("lesson scripts", () => {
  it("contains valid FEN positions", () => {
    for (const lesson of Object.values(lessonScripts)) {
      for (const step of lesson.steps) {
        expect(() => new Chess(step.fen), `${lesson.id}/${step.id}`).not.toThrow();
      }
    }
  });

  it("contains legal accepted moves", () => {
    for (const lesson of Object.values(lessonScripts)) {
      for (const step of lesson.steps) {
        if (step.type !== "move") continue;

        for (const encoded of step.acceptedMoves) {
          const chess = new Chess(step.fen);
          const from = encoded.slice(0, 2);
          const to = encoded.slice(2, 4);
          const promotion = encoded.slice(4, 5) || undefined;

          expect(
            chess.move({ from, to, promotion: promotion || "q" }),
            `${lesson.id}/${step.id}: ${encoded}`,
          ).toBeTruthy();
        }
      }
    }
  });
});
