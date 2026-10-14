import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import originals from "../../public/data/model-games/p113-master-games-v1.json";
import pairs from "../../public/data/model-games/p114-transfer-cases-v1.json";
import probes from "../../public/data/model-games/p115-counterfactual-v1.json";
import { hydrateMasterGames } from "./masterGames";
import { hydrateTransferCases } from "./crossGameTransfer";
import {
  advanceCounterfactual, hydrateCounterfactuals,
  observedCounterfactual, replayCounterfactual, BRANCH_LIMIT,
} from "./counterfactualBranches";

const source = hydrateMasterGames(originals);
const paired = hydrateTransferCases(pairs, source.accepted);

describe("P115 independent, original-identity counterfactuals", () => {
  it("accepts 24 source-pinned cases and 48 original position challenges", () => {
    expect(source.rejected).toBe(0);
    expect(paired.rejected).toBe(0);
    const result = hydrateCounterfactuals(probes, paired.accepted);
    expect(result.rejected).toBe(0);
    expect(result.accepted).toHaveLength(24);
    expect(new Set(result.accepted.map((item) => item.id)).size).toBe(24);
  });
  it("does not accept source drift, duplicate identities or fabricated game links", () => {
    const broken = structuredClone(probes);
    broken.challenges[0].first.ply++;
    broken.challenges[1].second.gameId = "not-in-original-source";
    broken.challenges[2].id = broken.challenges[3].id;
    const checked = hydrateCounterfactuals(broken, paired.accepted);
    expect(checked.rejected).toBeGreaterThanOrEqual(3);
    expect(checked.accepted.length).toBeLessThan(24);
    expect(hydrateCounterfactuals({ version: 3, challenges: probes.challenges }, paired.accepted).accepted).toHaveLength(0);
  });
  it("replays original move and defender reply legally without claiming their optimality", () => {
    for (const study of paired.accepted) {
      for (const sourcePosition of [study.first, study.second]) {
        const ply = sourcePosition.game.fens.indexOf(sourcePosition.fen);
        const history = observedCounterfactual(sourcePosition.game, ply);
        const replay = replayCounterfactual(sourcePosition.fen, history);
        expect(replay.invalid).toBe(false);
        expect(replay.sans).toEqual(history);
        expect(replay.fen).toBe(sourcePosition.game.fens[ply + 3]);
        const first = new Chess(sourcePosition.fen).moves({ verbose: true }).find(
          (move) => move.san === history[0]);
        expect(first).toBeDefined();
        const advanced = advanceCounterfactual(sourcePosition.fen, [], first!);
        expect(advanced).toEqual([history[0]]);
      }
    }
  });
  it("rejects illegal moves and stale or overly long saved lines without substituting moves", () => {
    const pin = paired.accepted[0].first;
    expect(advanceCounterfactual(pin.fen, [], { from: "z9", to: "z8" })).toBeNull();
    const invalid = replayCounterfactual(pin.fen, ["illegal"]);
    expect(invalid.invalid).toBe(true);
    expect(invalid.sans).toEqual([]);
    expect(replayCounterfactual(pin.fen, Array(BRANCH_LIMIT + 1).fill("a3")).invalid).toBe(true);
    expect(advanceCounterfactual(pin.fen, ["illegal"], { from: "a2", to: "a3" })).toBeNull();
  });
});
