import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { sameUciMove } from "./uci";
import { lessonCatalogIssues, lessonScripts } from "./lessons";
import { authoredPositions, calculationCatalogIssues } from "../calculation/positions";
import { endgamePositions, endgameCatalogIssues } from "../endgames/positions";
import { seedPuzzles } from "../puzzles/seed";
import { scoreCalculationAttempt } from "../calculation/scoring";

describe("P63 instructional truth and answer integrity", () => {
  it("distinguishes promotion targets, but accepts an identical full UCI move", () => {
    expect(sameUciMove("a7a8n", "a7a8q")).toBe(false);
    expect(sameUciMove("a7a8n", "a7a8n")).toBe(true);
    expect(sameUciMove("e2e4", "e2e4")).toBe(true);
    expect(sameUciMove("a7a8", "a7a8n")).toBe(false);
    expect(sameUciMove("e2e5", undefined)).toBe(false);
    expect(sameUciMove("not-a-move", "not-a-move")).toBe(false);
  });

  it("does not award winning calculation credit for an incorrect underpromotion", () => {
    const outcome = scoreCalculationAttempt({
      positionId: "underpromotion-test",
      source: "authored",
      candidates: [{ uci: "a7a8q", san: "a8=Q" }],
      selectedMove: "a7a8q",
      bestMove: "a7a8n",
      predictedReply: "e8f7",
      bestReply: "e8f7",
      predictedContinuation: "a8b6",
      bestContinuation: "a8b6",
      visualizationUsed: false,
    });
    expect(outcome.success).toBe(false);
    expect(outcome.evidence.selectedMoveScore).toBe(0);
    expect(outcome.evidence.candidateScore).toBeLessThan(1);
  });

  it("keeps all authored lessons internally chess-legal", () => {
    expect(lessonCatalogIssues()).toEqual([]);
    for (const [skillId, lesson] of Object.entries(lessonScripts)) {
      for (const step of lesson.steps) {
        const chess = new Chess(step.fen);
        if (step.type !== "move") continue;
        for (const encoded of step.acceptedMoves) {
          const move = chess.moves({ verbose: true }).find((candidate) =>
            candidate.from + candidate.to + (candidate.promotion ?? "") === encoded);
          expect(move, skillId + "/" + step.id + ": " + encoded).toBeDefined();
        }
      }
    }
  });

  it("does not repeat the recognition distractors as a memory test", () => {
    for (const lesson of Object.values(lessonScripts)) {
      const contrast = lesson.steps.find((step) => step.id === "misconception");
      const retrieval = lesson.steps.find((step) => step.id === "retrieval-check");
      expect(contrast?.type).toBe("choice");
      expect(retrieval?.type).toBe("choice");
      if (contrast?.type !== "choice" || retrieval?.type !== "choice") continue;
      expect(retrieval.options.map((item) => item.text), lesson.id)
        .not.toEqual(contrast.options.map((item) => item.text));
    }
  });

  it("does not mark a repeated demonstration as transfer to an unfamiliar position", () => {
    const lessons = Object.values(lessonScripts);
    const newPosition = lessons.filter((lesson) => {
      const model = lesson.steps.find((step) => step.id === "model");
      const lastPractice = lesson.steps.find((step) => step.id === "transfer");
      return model?.fen !== lastPractice?.fen;
    });
    const samePosition = lessons.filter((lesson) => {
      const model = lesson.steps.find((step) => step.id === "model");
      const lastPractice = lesson.steps.find((step) => step.id === "transfer");
      return model?.fen === lastPractice?.fen;
    });
    expect(newPosition.length).toBeGreaterThan(0);
    expect(samePosition.length).toBeGreaterThan(0);
    for (const lesson of newPosition) {
      const lastPractice = lesson.steps.find((step) => step.id === "transfer");
      expect(lastPractice?.type).toBe("move");
      if (lastPractice?.type === "move") expect(lastPractice.support).toBe("transfer");
    }
    for (const lesson of samePosition) {
      const lastPractice = lesson.steps.find((step) => step.id === "transfer");
      expect(lastPractice?.type).toBe("move");
      if (lastPractice?.type === "move") expect(lastPractice.support).toBe("retrieval");
    }
  });

  it("validates critical rule demonstrations against the actual position", () => {
    const exercise = (skill: string) => {
      const step = lessonScripts[skill].steps.find((item) =>
        item.id === "guided" && item.type === "move");
      if (!step || step.type !== "move") throw new Error("Missing guided lesson: " + skill);
      const chess = new Chess(step.fen);
      const uci = step.acceptedMoves[0];
      const move = chess.move({
        from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || "q",
      });
      return { chess, move };
    };
    expect(exercise("rules.mate").chess.isCheckmate()).toBe(true);
    expect(exercise("rules.castling").move.isKingsideCastle()).toBe(true);
    expect(exercise("rules.promotion").move.promotion).toBe("q");
    expect(exercise("rules.draws").chess.isStalemate()).toBe(false);
  });

  it("validates reference calculation lines and endgame objectives structurally", () => {
    expect(calculationCatalogIssues()).toEqual([]);
    expect(endgameCatalogIssues()).toEqual([]);
    expect(authoredPositions.length).toBeGreaterThan(0);
    expect(authoredPositions.some((position) => position.id === "calc:advanced-combination")).toBe(false);
    expect(authoredPositions.some((position) =>
      position.skillIds.includes("tactics.combinations"))).toBe(true);
    for (const position of endgamePositions) {
      expect(new Chess(position.fen).turn(), position.id).toBe(position.playerColor);
      expect(position.successOutcomes, position.id).toContain("win");
      expect(position.recognitionOptions.filter((option) => option.id === position.recognitionAnswer))
        .toHaveLength(1);
      expect(position.processCues.length, position.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("replays all bundled seed puzzle solution moves without a gap", () => {
    for (const puzzle of seedPuzzles) {
      const chess = new Chess(puzzle.initialFen);
      expect(puzzle.solutionMoves.length, puzzle.id).toBeGreaterThan(0);
      for (const encoded of puzzle.solutionMoves) {
        const candidate = chess.moves({ verbose: true }).find((move) =>
          move.from + move.to + (move.promotion ?? "") === encoded);
        expect(candidate, puzzle.id + " " + encoded).toBeDefined();
        if (!candidate) break;
        chess.move(candidate);
      }
    }
  });
});
