import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { legalVariation, momentVariation } from "./variation";
import type { GameStoryMoment } from "../games/types";

describe("P85 source-grounded variation navigation", () => {
  const fen = new Chess().fen();
  it("replays legal UCI moves to real board positions and SAN, without altering source", () => {
    const pv = ["e2e4", "e7e5", "g1f3"];
    const steps = legalVariation(fen, pv);
    const control = new Chess();
    for (let i = 0; i < pv.length; i++) {
      control.move({ from: pv[i].slice(0,2), to: pv[i].slice(2,4) });
      expect(steps[i]).toMatchObject({ ply: i + 1, fen: control.fen() });
    }
    expect(steps.map((s) => s.san)).toEqual(["e4", "e5", "Nf3"]);
    expect(pv).toEqual(["e2e4", "e7e5", "g1f3"]);
  });

  it("stops at the first illegal or malformed move, never fabricating a continuation", () => {
    expect(legalVariation(fen, ["e2e4", "e7e5", "e2e4", "g8f6"])).toHaveLength(2);
    expect(legalVariation(fen, ["(none)", "e2e4"])).toEqual([]);
    expect(legalVariation("invalid FEN", ["e2e4"])).toEqual([]);
    expect(legalVariation(fen, ["e2e4", "e7e5"], Number.NaN)).toEqual([]);
    expect(legalVariation(fen, Array(20).fill("e2e4"))).toHaveLength(1);
  });

  it("allows legal underpromotion only when chess.js validates it", () => {
    const position = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
    expect(legalVariation(position, ["a7a8n"])[0].san).toContain("=N");
    expect(legalVariation(position, ["a7a8n"])[0].fen).toContain("N3k3");
  });

  it("rejects an engine PV that disagrees with the stored best move or has no legal moves", () => {
    const moment = {
      positionFen: fen, bestMove: "e2e4", principalVariation: ["d2d4", "d7d5"],
    } as GameStoryMoment;
    expect(momentVariation(moment)).toEqual([]);
    expect(momentVariation({ ...moment, principalVariation: ["e2e4", "e7e5"] }).map(s => s.san))
      .toEqual(["e4", "e5"]);
    expect(momentVariation({ ...moment, bestMove: "(none)" })).toEqual([]);
  });
});
