import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import source from "../../public/data/model-games/p113-master-games-v1.json";
import cases from "../../public/data/model-games/p114-transfer-cases-v1.json";
import tasks from "../../public/data/model-games/p115-counterfactual-v1.json";
import { hydrateMasterGames } from "./masterGames";
import { hydrateTransferCases } from "./crossGameTransfer";
import { branchEvidence, hydrateCounterfactuals, observedCounterfactual } from "./counterfactualBranches";

const games = hydrateMasterGames(source);
const pairs = hydrateTransferCases(cases, games.accepted);
const challenges = hydrateCounterfactuals(tasks, pairs.accepted);

describe("P119 factual source-relative opponent response and repair", () => {
  it("retains all 24 fully pinned original studies with four substantive staged repairs", () => {
    expect(pairs.rejected).toBe(0);
    expect(challenges.rejected).toBe(0);
    expect(challenges.accepted).toHaveLength(24);
    for (const task of challenges.accepted) {
      const base = pairs.accepted.find((item) => item.source.id === task.id);
      expect(base).toBeDefined();
      for (const field of ["first", "second", "rebuild", "transfer"] as const) {
        expect(task.repair[field].length).toBeGreaterThan(80);
      }
      expect(task.repair.first).toContain(base!.source.first.reply);
      expect(task.repair.second).toContain(base!.source.second.continuation);
    }
  });
  it("rejects missing, wrong-format and incomplete learner repair witnesses", () => {
    const invalid = structuredClone(tasks);
    invalid.challenges[0].repair.first = "";
    invalid.challenges[1].repair = null as never;
    invalid.challenges[2].repair.transfer = "too short";
    const result = hydrateCounterfactuals(invalid, pairs.accepted);
    expect(result.rejected).toBe(3);
    expect(result.accepted).toHaveLength(21);
  });
  it("replays source-matched facts and identifies factual divergence without verdicts", () => {
    for (const pair of pairs.accepted) for (const pin of [pair.first, pair.second]) {
      const ply = pin.game.fens.indexOf(pin.fen);
      const history = observedCounterfactual(pin.game, ply);
      const exact = branchEvidence(pin.fen, history, [], history);
      expect(exact).not.toBeNull();
      expect(exact!.sameSourcePlies).toBe(3);
      expect(exact!.divergesFromSource).toBe(false);
      expect(exact!.replyPlayed).toBe(true);
      const first = branchEvidence(pin.fen, history.slice(0, 1), [], history);
      expect(first!.needsDefense).toBe(true);
      const legalAlternative = new Chess(pin.fen).moves().find((m) => m !== history[0]);
      if (legalAlternative) {
        const different = branchEvidence(pin.fen, [legalAlternative], history, history);
        expect(different!.divergesFromSource).toBe(true);
        expect(different!.sameSourcePlies).toBe(0);
      }
    }
  });
  it("rejects nonlegal learner histories instead of rewriting them into model moves", () => {
    const pin = pairs.accepted[0].first;
    expect(branchEvidence(pin.fen, ["this-is-not-a-san"], [], [])).toBeNull();
    expect(branchEvidence(pin.fen, [], ["illegal"], [])).toBeNull();
  });
});
