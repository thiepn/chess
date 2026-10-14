import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import games from "../../public/data/model-games/p113-master-games-v1.json";
import pairs from "../../public/data/model-games/p114-transfer-cases-v1.json";
import { hydrateMasterGames } from "./masterGames";
import { hydrateTransferCases } from "./crossGameTransfer";

describe("P114 source-bound cross-game transfer", () => {
  it("pins twenty-four pairs to complete P113 legal PGNs and distinct source checkpoints", () => {
    const source = hydrateMasterGames(games);
    expect(source.rejected).toBe(0);
    const result = hydrateTransferCases(pairs, source.accepted);
    expect(result.rejected).toBe(0);
    expect(result.accepted).toHaveLength(24);
    for (const study of result.accepted) {
      for (const pinned of [study.first, study.second]) {
        const original = pinned.game.game.checkpoints.find(
          (decision) => decision.ply === pinned.game.fens.indexOf(pinned.fen));
        expect(original, study.source.id).toBeDefined();
        const chess = new Chess(pinned.fen);
        const expected = pinned.game.sans[original!.ply];
        expect(chess.moves(), study.source.id).toContain(expected);
        chess.move(expected);
        expect(chess.fen(), study.source.id).toBe(pinned.afterFen);
      }
      expect(study.source.comparePrompt.length).toBeGreaterThan(35);
      expect(study.source.misconception.length).toBeGreaterThan(50);
    }
  });
  it("rejects drifted moves, unknown checkpoint identity, duplicate ids and manufactured provenance", () => {
    const source = hydrateMasterGames(games);
    const broken = structuredClone(pairs);
    broken.cases[0].first.move = "Qa5";
    broken.cases[1].second.checkpointId = "unknown";
    broken.cases[2].id = broken.cases[3].id;
    const result = hydrateTransferCases(broken, source.accepted);
    expect(result.rejected).toBeGreaterThanOrEqual(3);
    expect(result.accepted.length).toBeLessThan(24);
    expect(hydrateTransferCases({ version: 2, cases: pairs.cases }, source.accepted).accepted).toHaveLength(0);
  });
});
