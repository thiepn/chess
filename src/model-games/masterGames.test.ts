import { Chess } from "chess.js";
import { describe, expect, it, vi } from "vitest";
import { hydrateMasterGames, masterDraftKey, restoreMasterDrafts } from "./masterGames";
import asset from "../../public/data/model-games/p113-master-games-v1.json";


describe("P113 source-qualified master-game journeys", () => {
  it("contains eight complete replayable historical games and 32 independent decision points", () => {
    const { accepted, rejected } = hydrateMasterGames(asset);
    expect(rejected).toBe(0);
    expect(accepted).toHaveLength(8);
    expect(accepted.reduce((n, item) => n + item.game.checkpoints.length, 0)).toBe(32);
    for (const entry of accepted) {
      expect(entry.fens).toHaveLength(entry.sans.length + 1);
      expect(entry.game.source).toContain("github.com/mcostalba/chess_db/");
      for (const decision of entry.game.checkpoints) {
        const original = new Chess(entry.fens[decision.ply]);
        const legal = original.moves();
        expect(legal.length, decision.id).toBeGreaterThan(0);
        const historical = entry.sans[decision.ply];
        expect(legal, decision.id).toContain(historical);
        const played = original.move(historical);
        expect(original.fen()).toBe(entry.fens[decision.ply + 1]);
        expect(played.san).toBe(historical);
      }
    }
  });

  it("rejects fabricated or truncated source lines before showing them to learners", () => {
    const broken = structuredClone(asset) as { version: number; games: { pgn: string }[] };
    broken.games[0].pgn = broken.games[0].pgn.replace("1. e4", "1. e5");
    const result = hydrateMasterGames(broken);
    expect(result.rejected).toBeGreaterThan(0);
    expect(result.accepted).toHaveLength(7);
  });

  it("rejects incorrect provenance, arbitrary extra checkpoints and unknown schema versions", () => {
    const bad = structuredClone(asset) as {
      version: number; games: { source: string; checkpoints: unknown[] }[];
    };
    bad.games[0].source = "https://invalid.example/game";
    bad.games[1].checkpoints.push({ id: "unverified", ply: 4 });
    const checked = hydrateMasterGames(bad);
    expect(checked.accepted).toHaveLength(6);
    expect(checked.rejected).toBe(2);
    bad.version = 2;
    expect(hydrateMasterGames(bad).accepted).toHaveLength(0);
  });
});

// P123: regression against cross-profile draft disclosure and stale recovery.
describe("P123 owner-scoped historical draft recovery", () => {
  it("recovers only the exact owner/game combination and refuses stale storage", () => {
    const records = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (key: string) => records.get(key) ?? null });
    try {
      const a = masterDraftKey("account:A", "source-one");
      const b = masterDraftKey("account:B", "source-one");
      const other = masterDraftKey("account:A", "source-two");
      expect(a).not.toBe(b);
      expect(a).not.toBe(other);
      const drafts = { decision: { plan: "private A answer", defense: "private A threat",
        transfer: "", revealed: false, mark: null } };
      records.set(a, JSON.stringify({ version: 1, saved: Date.now(), drafts }));
      expect(restoreMasterDrafts("account:A", "source-one").decision.plan).toBe("private A answer");
      expect(restoreMasterDrafts("account:B", "source-one")).toEqual({});
      expect(restoreMasterDrafts("account:A", "source-two")).toEqual({});
      expect(restoreMasterDrafts("", "source-one")).toEqual({});
      records.set(a, JSON.stringify({ version: 1, saved: Date.now() - 86400001, drafts }));
      expect(restoreMasterDrafts("account:A", "source-one")).toEqual({});
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
