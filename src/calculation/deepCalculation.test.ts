import { describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import type { CalculationPosition } from "./types";
import {
  blankDeepDraft, comparisonFor, deepFrames, playDeepMove,
  readDeepDraft, writeDeepDraft, discardDeepDraft, verifiedDeepBranches,
  recordedDefenderChoices,documentedDefensiveBoards,sharedBranchDraft,sourceDefenderSetup,
  matchingSourceBranch,nextRecordedSourceMove,recordedDefenseFeedback,
} from "./deepCalculation";
import defense from "../../public/data/calculation/p106-active-defense-v1.json";
import structures from "../../public/data/calculation/p103-structures-a-v1.json";
import attacks from "../../public/data/calculation/p105-checking-networks-v1.json";
import originalP110 from "../../public/data/calculation/p110-prophylaxis-a-v1.json";
import older from "../../public/data/calculation/p94-candidates-v1.json";
import defensesP95 from "../../public/data/calculation/p95-defensive-resistance-v1.json";

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

  it("starts blind opponent-side rehearsal from legal original source setup without credit",()=>{
    for(const p of [older.positions[0],defensesP95.positions[0],structures.positions[0]] as CalculationPosition[]){
      const branch=verifiedDeepBranches(p)[0];
      const setup=sourceDefenderSetup(branch);
      expect(setup.branchId).toBe(branch.id);
      expect(setup.cursor).toBe(1);
      expect(setup.played[0]).toEqual({uci:branch.plies[0].uci,origin:"authored-response"});
      expect(setup.reveal).toBe(false);
      const frames=deepFrames(p,setup.played)!;
      expect(frames[1].fen).toBe(branch.plies[0].afterFen);
      expect(new Chess(frames[1].fen).turn()).not.toBe(p.playerColor);
      expect(recordedDefenderChoices(p,verifiedDeepBranches(p),setup.played).length).toBeGreaterThan(0);
    }
  });
  it("continues after a different documented defender response without losing source continuity",()=>{
    for(const p of [structures.positions[0],attacks.positions[0]] as CalculationPosition[]){
      const branches=verifiedDeepBranches(p);
      const initial=sourceDefenderSetup(branches[0]);
      const options=recordedDefenderChoices(p,branches,initial.played);
      expect(options.length,p.id).toBeGreaterThanOrEqual(2);
      const alternate=options.find(choice=>choice.uci!==branches[0].plies[1].uci)!;
      expect(alternate,p.id).toBeDefined();
      const entered=[...initial.played,{uci:alternate.uci,origin:"learner" as const}];
      const matched=matchingSourceBranch(branches,entered,initial.branchId);
      expect(matched?.id,p.id).toBe(alternate.branchId);
      const explanation=recordedDefenseFeedback(p,matched!,entered);
      expect(explanation?.reply,p.id).toBe(matched?.explanation);
      expect(explanation?.misconception,p.id).toBeUndefined();
      expect(recordedDefenseFeedback(p,branches[0],entered),p.id).toBeNull();
      const next=nextRecordedSourceMove(p,branches,entered,initial.branchId);
      expect(next?.uci,p.id).toBe(matched?.plies[2].uci);
      expect(next?.san,p.id).toBe(matched?.plies[2].san);
      const sourceReplayed=[...entered,{uci:next!.uci,origin:"authored-response" as const}];
      expect(matchingSourceBranch(branches,sourceReplayed)?.id,p.id).toBe(matched?.id);
      expect(nextRecordedSourceMove(p,branches,sourceReplayed,matched?.id),p.id).toBeNull();
      const bad=[...initial.played,{uci:"a1a1",origin:"learner" as const}];
      expect(matchingSourceBranch(branches,bad),p.id).toBeNull();
      expect(nextRecordedSourceMove(p,branches,bad),p.id).toBeNull();
    }
  });
  it("can rehearse two independent defender replies against recorded P106 attacking continuation",()=>{
    const p=defense.positions[0] as CalculationPosition;
    const branch=verifiedDeepBranches(p)[0];
    expect(branch.plies.length).toBeGreaterThanOrEqual(5);
    const entered=sourceDefenderSetup(branch);
    const firstDefense=branch.plies[1];
    entered.played.push({uci:firstDefense.uci,origin:"learner"});
    entered.cursor=2;
    const reply=nextRecordedSourceMove(p,verifiedDeepBranches(p),entered.played,branch.id);
    expect(reply?.uci).toBe(branch.plies[2].uci);
    entered.played.push({uci:reply!.uci,origin:"authored-response"});
    entered.cursor=3;
    expect(recordedDefenderChoices(p,verifiedDeepBranches(p),entered.played)
      .some(c=>c.uci===branch.plies[3].uci)).toBe(true);
    entered.played.push({uci:branch.plies[3].uci,origin:"learner"});
    entered.cursor=4;
    const response=nextRecordedSourceMove(p,verifiedDeepBranches(p),entered.played,branch.id);
    expect(response?.uci).toBe(branch.plies[4].uci);
    expect(response?.san).toBe(branch.plies[4].san);
    expect(deepFrames(p,entered.played)?.[4].fen).toBe(branch.plies[3].afterFen);
    expect(recordedDefenseFeedback(p,branch,entered.played)?.reply)
      .toBe(p.replyReason?.trim()||branch.explanation);
  });
  it("offers multiple SOURCE-VERIFIED defender choices after the learner's exact first move",()=>{
    for(const sample of [structures.positions[0],attacks.positions[0]]){
      const p=sample as CalculationPosition;
      const branches=verifiedDeepBranches(p),first=branches[0].plies[0];
      const input=[{uci:first.uci,origin:"learner" as const}];
      const choices=recordedDefenderChoices(p,branches,input);
      expect(choices.length,p.id).toBeGreaterThanOrEqual(2);
      const fromFen=deepFrames(p,input)![1].fen;
      const board=new Chess(fromFen);
      expect(board.turn(),p.id).not.toBe(p.playerColor);
      for(const choice of choices){
        const replay=playDeepMove(fromFen,choice.uci);
        expect(replay?.san,p.id).toBe(choice.san);
        expect(branches.some(b=>b.id===choice.branchId&&
          b.plies[0].uci===first.uci&&b.plies[1].uci===choice.uci),p.id).toBe(true);
      }
      expect(new Set(choices.map(c=>c.uci)).size).toBe(choices.length);
      expect(recordedDefenderChoices(p,branches,[])).toEqual([]);
      expect(recordedDefenderChoices(p,branches,[{uci:"a1a1",origin:"learner"}])).toEqual([]);
    }
  });
  it("shows genuinely different original two-ply outcomes, without manufacturing lines",()=>{
    for(const p of [structures.positions[0],attacks.positions[0]] as CalculationPosition[]){
      const branches=verifiedDeepBranches(p);
      const comparisons=documentedDefensiveBoards(branches,3,branches[0].plies[0].uci);
      expect(comparisons.length,p.id).toBeGreaterThanOrEqual(2);
      expect(comparisons.every(c=>c.firstMove===branches[0].plies[0].san),p.id).toBe(true);
      expect(comparisons.length,p.id).toBeLessThanOrEqual(3);
      for(const original of comparisons){
        const branch=branches.find(b=>b.id===original.id)!;
        expect(original.fen,p.id).toBe(branch.plies[1].afterFen);
        expect(original.defenderMove,p.id).toBe(branch.plies[1].san);
        expect(original.continuedLine,p.id).toEqual(branch.plies.slice(2).map(p=>p.san));
      }
      const main=branches[0],different=branches.find(b=>
        b.plies[0].uci===main.plies[0].uci&&b.plies[1].uci!==main.plies[1].uci)!;
      expect(different,p.id).toBeDefined();
      const draft={branchId:main.id,played:main.plies.slice(0,2).map(m=>({
        uci:m.uci,origin:"learner" as const
      })),cursor:2,reveal:true};
      const transferred=sharedBranchDraft(different,draft);
      expect(transferred.branchId,p.id).toBe(different.id);
      expect(transferred.cursor,p.id).toBe(1);
      expect(transferred.played.map(m=>m.uci),p.id).toEqual([main.plies[0].uci]);
      expect(draft.cursor,p.id).toBe(2);
    }
  });
  it("keeps alternate defender evidence source-owned and never predicts a ranking",()=>{
    const samples=[...structures.positions,...attacks.positions,...originalP110.positions] as CalculationPosition[];
    let multiReply=0;
    for(const source of samples){
      const branches=verifiedDeepBranches(source);
      expect(branches.length,source.id).toBeGreaterThanOrEqual(2);
      const first=branches[0].plies[0];
      const candidate=[{uci:first.uci,origin:"learner" as const}];
      const choices=recordedDefenderChoices(source,branches,candidate);
      if(choices.length<2)continue;
      multiReply++;
      const after=deepFrames(source,candidate)![1].fen;
      for(const choice of choices){
        expect(playDeepMove(after,choice.uci)?.san,source.id).toBe(choice.san);
      }
      const boards=documentedDefensiveBoards(branches,3,branches[0].plies[0].uci);
      expect(boards.length,source.id).toBeGreaterThanOrEqual(2);
      expect(new Set(boards.map(b=>b.fen)).size,source.id).toBe(boards.length);
    }
    expect(multiReply).toBeGreaterThanOrEqual(20);
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

  it("makes all 80 existing P94–P95 three-ply authored cases playable on the original board",()=>{
    const source=[...older.positions,...defensesP95.positions] as CalculationPosition[];
    expect(source).toHaveLength(80);
    for(const p of source){
      expect(p.principalVariation).toHaveLength(3);
      const branches=verifiedDeepBranches(p);
      expect(branches.length,p.id).toBeGreaterThanOrEqual(1);
      expect(branches[0].plies,p.id).toHaveLength(3);
      const moves=branches[0].plies.map(row=>({uci:row.uci,origin:"learner" as const}));
      expect(deepFrames(p,moves)?.length,p.id).toBe(4);
      expect(p.replyReason?.trim().length,p.id).toBeGreaterThan(15);
      if(p.id.startsWith("calc:p95-"))
        expect(p.defensiveStudy?.misconception?.trim().length,p.id).toBeGreaterThan(15);
    }
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
      // Standalone opponent-side rehearsals never overwrite scored-source drafts.
      writeDeepDraft("owner-a",current,sourceDefenderSetup(branches[0]),"defender");
      expect(readDeepDraft("owner-a",current,branches,"defender").cursor).toBe(1);
      expect(readDeepDraft("owner-a",current,branches).cursor).toBe(3);
      expect(readDeepDraft("owner-b",current,branches,"defender").played).toEqual([]);
      discardDeepDraft("owner-a",current,"defender");
      expect(readDeepDraft("owner-a",current,branches,"defender").cursor).toBe(0);
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
