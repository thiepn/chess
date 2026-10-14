import { describe, expect, it } from "vitest";
import originals from "../../public/data/model-games/p113-master-games-v1.json";
import comparisons from "../../public/data/model-games/p114-transfer-cases-v1.json";
import { hydrateMasterGames } from "./masterGames";
import { hydrateTransferCases } from "./crossGameTransfer";
import { exportPairNotes, importPairNotes } from "./transferCapsule";
const games = hydrateMasterGames(originals);
const pairs = hydrateTransferCases(comparisons, games.accepted);
const first = pairs.accepted[0];
const next = pairs.accepted[1];
const initial = {
  plan: "My center plan includes checks first.",
  defense: "I would check the opponent's knight.",
  transfer: "The plan transfers only if the king is defended.",
  revealed: false, mark: "retry" as const,
  branchA: [], branchB: [], branchAltA: [], branchAltB: [],
  branchNoteA: "The first defender move changes the pawn chain.",
  branchPlanA: "Before moving, identify White’s immediate check and central pawn contact.",
  branchPlanB: "Before moving, identify which rook could seize the open file.",
  branchNoteB: "The second defender can activate a rook.",
};
describe("P117 explicit portable historical study notes", () => {
  it("preserves the original case and two independent candidate slots without account data", () => {
    expect(pairs.rejected).toBe(0);
    expect(pairs.accepted).toHaveLength(24);
    const capsule = exportPairNotes(first, initial);
    expect(capsule).not.toMatch(/accountId|owner|email|password/);
    const imported = importPairNotes(capsule, first);
    expect(imported.plan).toBe(initial.plan);
    expect(imported.branchPlanA).toBe(initial.branchPlanA);
    expect(imported.branchPlanB).toBe(initial.branchPlanB);
    expect(imported.branchAltA).toEqual([]);
    expect(imported.mark).toBe("retry");
  });
  it("restores unchanged P117 portable notes without new optional reconstruction fields", () => {
    const prior = JSON.parse(exportPairNotes(first, initial));
    delete prior.notes.branchPlanA;
    delete prior.notes.branchPlanB;
    const restored = importPairNotes(JSON.stringify(prior), first);
    expect(restored.branchPlanA).toBe("");
    expect(restored.branchPlanB).toBe("");
    expect(restored.plan).toBe(initial.plan);
  });
  it("refuses unknown source identities, stale date, arbitrary strings and illegal moves", () => {
    const capsule = exportPairNotes(first, initial);
    expect(() => importPairNotes(capsule, next)).toThrow();
    const replaced = JSON.parse(capsule);
    replaced.notes.branchA = ["illegal"];
    expect(() => importPairNotes(JSON.stringify(replaced), first)).toThrow(/not legal/);
    replaced.notes.branchA = [];
    replaced.savedAt = Date.now() - 31 * 86400000;
    expect(() => importPairNotes(JSON.stringify(replaced), first)).toThrow(/expired/);
    replaced.savedAt = Date.now();
    replaced.notes.plan = "a".repeat(1201);
    expect(() => importPairNotes(JSON.stringify(replaced), first)).toThrow(/Invalid writing/);
    expect(() => importPairNotes("{", first)).toThrow();
  });
  it("replays preserved legal opponent variations independently from the observed record", () => {
    const a = first.first;
    const firstMove = a.game.sans[first.source.first.ply];
    const sourceWithLegalVariation = {
      ...initial, branchA: [firstMove], branchAltA: [firstMove],
      branchB: [], branchAltB: [],
    };
    const roundtrip = importPairNotes(exportPairNotes(first, sourceWithLegalVariation), first);
    expect(roundtrip.branchA).toEqual([firstMove]);
    expect(roundtrip.branchAltA).toEqual([firstMove]);
  });
});
