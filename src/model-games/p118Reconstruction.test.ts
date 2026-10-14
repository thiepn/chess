import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import originals from "../../public/data/model-games/p113-master-games-v1.json";
import comparisons from "../../public/data/model-games/p114-transfer-cases-v1.json";
import challenges from "../../public/data/model-games/p115-counterfactual-v1.json";
import { hydrateMasterGames } from "./masterGames";
import { hydrateTransferCases } from "./crossGameTransfer";
import { hydrateCounterfactuals, legalReplyResources, replayCounterfactual } from "./counterfactualBranches";

const games = hydrateMasterGames(originals);
const paired = hydrateTransferCases(comparisons, games.accepted);
const tasks = hydrateCounterfactuals(challenges, paired.accepted);

describe("P118 verified opponent-resistance reconstruction", () => {
  it("contains all 48 independently grounded board prompts across 24 original pairs", () => {
    expect(games.rejected).toBe(0);
    expect(paired.rejected).toBe(0);
    expect(tasks.rejected).toBe(0);
    expect(tasks.accepted).toHaveLength(24);
    for (const challenge of tasks.accepted) {
      expect(challenge.reconstruction.first.length).toBeGreaterThan(80);
      expect(challenge.reconstruction.second.length).toBeGreaterThan(80);
      expect(challenge.reconstruction.after).toContain("compare");
      const caseStudy = paired.accepted.find((item) => item.source.id === challenge.id)!;
      expect(challenge.reconstruction.after).toContain(caseStudy.source.first.move);
      expect(challenge.reconstruction.after).toContain(caseStudy.source.second.move);
    }
  });
  it("rejects absent or invalid staged prompts without inventing a fallback", () => {
    const corrupted = structuredClone(challenges);
    corrupted.challenges[0].reconstruction.first = "";
    corrupted.challenges[1].reconstruction = null as never;
    const rejected = hydrateCounterfactuals(corrupted, paired.accepted);
    expect(rejected.rejected).toBe(2);
    expect(rejected.accepted).toHaveLength(22);
  });
  it("lists only genuine chess.js legal moves; 'forcing' means check or capture, not engine-best", () => {
    for (const pair of paired.accepted) {
      for (const pin of [pair.first, pair.second]) {
        const board = new Chess(pin.fen);
        const resources = legalReplyResources(pin.fen);
        expect(resources.all.map((move) => move.san)).toEqual(board.moves());
        for (const move of resources.forcing) {
          expect(resources.all).toContainEqual(move);
          expect(Boolean(move.captured) || /[+#]$/.test(move.san)).toBe(true);
        }
        const line = board.moves().slice(0, 1);
        const result = replayCounterfactual(pin.fen, line);
        expect(result.invalid).toBe(false);
        expect(legalReplyResources(result.fen).all.map((move) => move.san))
          .toEqual(new Chess(result.fen).moves());
      }
    }
  });
});
