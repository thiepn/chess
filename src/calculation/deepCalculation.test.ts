import { describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import type { CalculationPosition } from "./types";
import {
  blankDeepDraft, comparisonFor, deepFrames, playDeepMove,
  readDeepDraft, writeDeepDraft, discardDeepDraft, verifiedDeepBranches,
} from "./deepCalculation";
import defense from "../../public/data/calculation/p106-active-defense-v1.json";
import structures from "../../public/data/calculation/p103-structures-a-v1.json";
import older from "../../public/data/calculation/p94-candidates-v1.json";

const current = defense.positions[0] as CalculationPosition;

describe("P108 source-authorized independent multi-ply calculation", () => {
  it("offers genuine source-legal 4–8 ply principal and resistance lines", () => {
    for (const position of [...defense.positions, ...structures.positions]) {
      const branches = verifiedDeepBranches(position as CalculationPosition);
      expect(branches.length).toBeGreaterThanOrEqual(2);
      expect(branches[0].id).toBe("main");
      for (const branch of branches) {
        expect(branch.plies.length).toBeGreaterThanOrEqual(4);
        expect(branch.plies.length).toBeLessThanOrEqual(8);
        expect(new Set(branch.plies.map(step => step.ply)).size).toBe(branch.plies.length);
        expect(branch.plies[0].beforeFen).toBe(position.fen);
      }
    }
  });

  it("retains chronological FENs, accurate SAN and branch comparison", () => {
    const branch = verifiedDeepBranches(current)[0];
    const played = branch.plies.slice(0, 5).map(row => ({
      uci: row.uci, origin: "learner" as const,
    }));
    const frames = deepFrames(current, played)!;
    expect(frames).toHaveLength(6);
    expect(frames[5].fen).toBe(branch.plies[4].afterFen);
    expect(frames[4].san).toBe(branch.plies[3].san);
    expect(comparisonFor(branch, played).matched).toBe(5);
    expect(comparisonFor(branch, played).deviated).toBe(false);
  });

  it("accepts a legal non-cooperative departure without marking it as mastered", () => {
    const branch = verifiedDeepBranches(current)[0];
    const board = new Chess(current.fen);
    const different = board.moves({ verbose: true }).find(move =>
      `${move.from}${move.to}${move.promotion ?? ""}` !== branch.plies[0].uci)!;
    const choice = `${different.from}${different.to}${different.promotion ?? ""}`;
    expect(playDeepMove(current.fen, choice)).not.toBeNull();
    expect(comparisonFor(branch, [{ uci: choice, origin: "learner" }]))
      .toEqual({ matched: 0, deviated: true, outsideReference: false });
    expect(deepFrames(current, [{ uci: "a1a1", origin: "learner" }]))
      .toBeNull();
  });

  it("now replays genuinely source-legal three-ply cases without fabricating a fourth move", () => {
    const entry = older.positions[0] as CalculationPosition;
    expect(entry.principalVariation).toHaveLength(3);
    const branches=verifiedDeepBranches(entry);
    expect(branches.length).toBeGreaterThanOrEqual(1);
    expect(branches[0].plies).toHaveLength(3);
    const played=branches[0].plies.map(row=>({uci:row.uci,origin:"learner" as const}));
    expect(deepFrames(entry,played)).toHaveLength(4);
    expect(comparisonFor(branches[0],played).matched).toBe(3);
    expect(branches[0].plies[2].afterFen).toBe(deepFrames(entry,played)![3].fen);
    expect(branches[0].plies[3]).toBeUndefined();
  });

  it("revalidates resumable line navigation, owner and tampering", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
    });
    try {
      const branches = verifiedDeepBranches(current);
      const played = branches[0].plies.slice(0, 5).map(row =>
        ({ uci: row.uci, origin: "learner" as const }));
      writeDeepDraft("owner-a", current, {
        branchId: branches[0].id, played, cursor: 3, reveal: false,
      });
      expect(readDeepDraft("owner-a", current, branches).cursor).toBe(3);
      expect(readDeepDraft("owner-b", current, branches).played).toEqual([]);
      const key = [...storage.keys()][0];
      const record = JSON.parse(storage.get(key)!);
      storage.set(key, JSON.stringify({
        ...record, played: [{ uci: "a1a1", origin: "learner" }],
      }));
      expect(readDeepDraft("owner-a", current, branches).played).toEqual([]);
      discardDeepDraft("owner-a", current);
      expect(storage.size).toBe(0);
    } finally { vi.unstubAllGlobals(); }
  });

  it("produces a source-specific blank draft, not a progress score", () => {
    const branches = verifiedDeepBranches(current);
    expect(blankDeepDraft(branches[0])).toEqual({
      branchId: branches[0].id, played: [], cursor: 0, reveal: false,
    });
    expect(readDeepDraft("", current, branches).played).toEqual([]);
  });
});
