import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import master from "../../public/data/model-games/p113-master-games-v1.json";
import comparisons from "../../public/data/model-games/p114-transfer-cases-v1.json";
import probes from "../../public/data/model-games/p115-counterfactual-v1.json";
import { hydrateMasterGames, emptyMasterDraft } from "./masterGames";
import { hydrateTransferCases } from "./crossGameTransfer";
import { hydrateCounterfactuals, forkCounterfactual, replayCounterfactual } from "./counterfactualBranches";
import { exportPairNotes, importPairNotes } from "./transferCapsule";

const games = hydrateMasterGames(master);
const pairs = hydrateTransferCases(comparisons, games.accepted);
const checked = hydrateCounterfactuals(probes, pairs.accepted);

describe("P121 historical defender variation forks", () => {
  it("accepts all 24 original pairs and each source-pinned fork instruction", () => {
    expect(games.rejected).toBe(0);
    expect(pairs.rejected).toBe(0);
    expect(checked.rejected).toBe(0);
    expect(checked.accepted).toHaveLength(24);
    for (const challenge of checked.accepted) {
      const source = pairs.accepted.find((item) => item.source.id === challenge.id)!;
      expect(challenge.fork.before.length).toBeGreaterThan(80);
      expect(challenge.fork.reply).toContain(source.source.first.reply);
      expect(challenge.fork.reply).toContain(source.source.second.reply);
      expect(challenge.fork.revise.length).toBeGreaterThan(80);
      expect(challenge.fork.carry).toContain(source.source.transferPrompt);
    }
  });
  it("rejects removed or incomplete witness instructions without using fabricated replacements", () => {
    const bad = structuredClone(probes);
    bad.challenges[0].fork.before = "";
    bad.challenges[1].fork = null as never;
    const result = hydrateCounterfactuals(bad, pairs.accepted);
    expect(result.rejected).toBe(2);
    expect(result.accepted).toHaveLength(22);
  });
  it("duplicates only a source-legal SAN prefix, never touching its original history", () => {
    for (const pair of pairs.accepted) for (const pin of [pair.first, pair.second]) {
      const observed = pin.game.sans.slice(pin.game.fens.indexOf(pin.fen), pin.game.fens.indexOf(pin.fen) + 3);
      const original = [...observed];
      const fork = forkCounterfactual(pin.fen, original, 1);
      expect(fork).toEqual(original.slice(0, 1));
      expect(original).toEqual(observed);
      if (fork) {
        const legalReplies = new Chess(replayCounterfactual(pin.fen, fork).fen).moves();
        const otherReply = legalReplies.find((move) => move !== observed[1]);
        if (otherReply) {
          expect(replayCounterfactual(pin.fen, [...fork, otherReply]).invalid).toBe(false);
          expect(original[1]).toBe(observed[1]);
        }
      }
    }
  });
  it("rejects invalid, out-of-range and empty forks and preserves older portable notes", () => {
    const pin = pairs.accepted[0].first;
    expect(forkCounterfactual(pin.fen, [], 0)).toBeNull();
    expect(forkCounterfactual(pin.fen, ["not-san"], 1)).toBeNull();
    expect(forkCounterfactual(pin.fen, ["e4"], 2)).toBeNull();
    const note = exportPairNotes(pairs.accepted[0], emptyMasterDraft());
    expect(importPairNotes(note, pairs.accepted[0]).mark).toBeNull();
  });
});
