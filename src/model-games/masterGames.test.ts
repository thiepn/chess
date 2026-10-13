import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { hydrateMasterGames } from "./masterGames";
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
