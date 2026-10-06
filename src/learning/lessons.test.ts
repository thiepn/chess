import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import {
  deepTransferSkillIds,
  lessonCatalogIssues,
  lessonScripts,
} from "./lessons";

describe("lesson scripts", () => {
  it("passes the full lesson-content audit", () => {
    expect(lessonCatalogIssues()).toEqual([]);
  });

  it("uses the full teaching sequence for every authored skill", () => {
    for (const lesson of Object.values(lessonScripts)) {
      expect(lesson.steps.length, lesson.id).toBeGreaterThanOrEqual(8);

      const stages = new Set(
        lesson.steps.map((step) => step.stage),
      );
      for (const stage of [
        "model",
        "example",
        "contrast",
        "guided",
        "retrieval",
        "transfer",
        "takeaway",
      ] as const) {
        expect(stages.has(stage), `${lesson.id}: ${stage}`).toBe(true);
      }
    }
  });

  it("contains valid FEN positions", () => {
    for (const lesson of Object.values(lessonScripts)) {
      for (const step of lesson.steps) {
        expect(
          () => new Chess(step.fen),
          `${lesson.id}/${step.id}`,
        ).not.toThrow();
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
          const promotion =
            encoded.slice(4, 5) || undefined;

          expect(
            chess.move({
              from,
              to,
              promotion: promotion || "q",
            }),
            `${lesson.id}/${step.id}: ${encoded}`,
          ).toBeTruthy();
        }
      }
    }
  });

  it("uses escalating hints instead of immediately revealing every move", () => {
    for (const lesson of Object.values(lessonScripts)) {
      for (const step of lesson.steps) {
        if (step.type !== "move") continue;

        expect(
          step.hints.length,
          `${lesson.id}/${step.id}`,
        ).toBeGreaterThanOrEqual(2);

        const first = step.hints[0].text.toLowerCase();
        const accepted = step.acceptedMoves[0];
        expect(
          first.includes(accepted.slice(0, 2)) &&
            first.includes(accepted.slice(2, 4)),
          `${lesson.id}/${step.id}: first hint reveals coordinates`,
        ).toBe(false);
      }
    }
  });

  it("gives misconception choices explicit feedback", () => {
    for (const lesson of Object.values(lessonScripts)) {
      const choiceSteps = lesson.steps.filter(
        (step) => step.type === "choice",
      );

      expect(choiceSteps.length, lesson.id).toBeGreaterThanOrEqual(2);
      for (const step of choiceSteps) {
        expect(step.options.length).toBeGreaterThanOrEqual(3);
        expect(
          step.options.every(
            (option) => option.feedback.trim().length > 20,
          ),
        ).toBe(true);
      }
    }
  });

  it("uses a distinct transfer position for the prioritized deep-content skills", () => {
    for (const skillId of deepTransferSkillIds) {
      const lesson = lessonScripts[skillId];
      const model = lesson.steps.find(
        (step) => step.stage === "model",
      );
      const transfer = lesson.steps.find(
        (step) => step.stage === "transfer",
      );

      expect(model, skillId).toBeTruthy();
      expect(transfer, skillId).toBeTruthy();
      expect(transfer?.fen, skillId).not.toBe(model?.fen);
    }
  });
});
