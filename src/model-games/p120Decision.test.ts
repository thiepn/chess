import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import originals from "../../public/data/model-games/p113-master-games-v1.json";
import cases from "../../public/data/model-games/p114-transfer-cases-v1.json";
import probes from "../../public/data/model-games/p115-counterfactual-v1.json";
import { hydrateMasterGames, emptyMasterDraft } from "./masterGames";
import { hydrateTransferCases } from "./crossGameTransfer";
import { hydrateCounterfactuals, legalReplyResources, replayCounterfactual } from "./counterfactualBranches";
import { exportPairNotes, importPairNotes } from "./transferCapsule";

const games = hydrateMasterGames(originals);
const pairs = hydrateTransferCases(cases, games.accepted);
const checked = hydrateCounterfactuals(probes, pairs.accepted);

describe("P120 actual source-bound defender decision and continuity", () => {
  it("accepts 24 original source identities and 96 specific defender decision prompts", () => {
    expect(games.rejected).toBe(0);
    expect(pairs.rejected).toBe(0);
    expect(checked.rejected).toBe(0);
    expect(checked.accepted).toHaveLength(24);
    expect(checked.ui).toBeTruthy();
    expect(checked.ui!.badLine.length).toBeGreaterThan(35);
    for (const task of checked.accepted) {
      const pair = pairs.accepted.find((item) => item.source.id === task.id)!;
      for (const value of Object.values(task.decision)) expect(value.length).toBeGreaterThan(80);
      expect(task.decision.first).toContain(pair.source.first.reply);
      expect(task.decision.second).toContain(pair.source.second.reply);
    }
  });
  it("refuses missing or corrupted decision prompts and missing external guidance", () => {
    const broken = structuredClone(probes);
    broken.challenges[0].decision.first = "";
    broken.challenges[1].decision = null as never;
    expect(hydrateCounterfactuals(broken, pairs.accepted).rejected).toBe(2);
    const noGuidance = structuredClone(probes);
    delete (noGuidance as {ui?: unknown}).ui;
    expect(hydrateCounterfactuals(noGuidance, pairs.accepted).accepted).toHaveLength(0);
  });
  it("preserves defender writing across portable notes and reads P117/P118 legacy formats", () => {
    const pair = pairs.accepted[0];
    const draft = { ...emptyMasterDraft(), branchThreatA: "The defender has a legal quiet blockade.",
      branchThreatB: "A check may change the intended pawn break." };
    const encoded = exportPairNotes(pair, draft);
    expect(importPairNotes(encoded, pair).branchThreatA).toBe(draft.branchThreatA);
    expect(importPairNotes(encoded, pair).branchThreatB).toBe(draft.branchThreatB);
    const previous = JSON.parse(encoded);
    delete previous.notes.branchThreatA;
    delete previous.notes.branchThreatB;
    const restored = importPairNotes(JSON.stringify(previous), pair);
    expect(restored.branchThreatA).toBe("");
    expect(restored.branchThreatB).toBe("");
  });
  it("supports quiet defenders, legal reply paging, and replay without inventing best moves", () => {
    for (const pair of pairs.accepted) {
      for (const pin of [pair.first, pair.second]) {
        const reply = legalReplyResources(pin.fen);
        expect(reply.all.map((move) => move.san)).toEqual(new Chess(pin.fen).moves());
        expect(reply.forcing.every((move) => Boolean(move.captured) || /[+#]$/.test(move.san))).toBe(true);
        const san = reply.all[0]?.san;
        if (san) expect(replayCounterfactual(pin.fen, [san]).invalid).toBe(false);
        const pages = Array.from({length:Math.ceil(reply.all.length / 12)},(_,i)=>reply.all.slice(i*12,(i+1)*12));
        expect(pages.flat().map((move)=>move.san)).toEqual(reply.all.map((move)=>move.san));
      }
    }
  });
});
