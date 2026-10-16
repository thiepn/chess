import { describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import type { CalculationPosition } from "./types";
import {
  blankDeepDraft, comparisonFor, deepFrames, playDeepMove,
  readDeepDraft, writeDeepDraft, discardDeepDraft, verifiedDeepBranches,
  recordedDefenderChoices,documentedDefensiveBoards,sharedBranchDraft,sourceDefenderSetup,
  matchingSourceBranch,nextRecordedSourceMove,recordedDefenseFeedback,
  independentDefenderDecisions,documentedDefenderOutcomes,
  documentedCandidateBoards,independentSourceDecisions,
} from "./deepCalculation";
import defense from "../../public/data/calculation/p106-active-defense-v1.json";
import structures from "../../public/data/calculation/p103-structures-a-v1.json";
import attacks from "../../public/data/calculation/p105-checking-networks-v1.json";
import originalP110 from "../../public/data/calculation/p110-prophylaxis-a-v1.json";
import originalP104 from "../../public/data/calculation/p104-practical-plans-v1.json";
import originalP112 from "../../public/data/calculation/p112-endgame-decisions-a-v1.json";
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
  it("traces multiple genuine defender decisions without converting source moves into learner credit",()=>{
    const source=defense.positions[0] as CalculationPosition;
    const branches=verifiedDeepBranches(source);
    const main=branches[0];
    const entered=sourceDefenderSetup(main).played;
    expect(independentDefenderDecisions(source,branches,entered)).toEqual([]);
    const initial=documentedDefenderOutcomes(source,branches,entered,3);
    expect(initial.length).toBeGreaterThanOrEqual(1);
    expect(initial.every(x=>x.fen===branches.find(b=>b.id===x.branchId)?.plies[1].afterFen)).toBe(true);
    entered.push({uci:main.plies[1].uci,origin:"learner"});
    let decisions=independentDefenderDecisions(source,branches,entered);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ply:2,uci:main.plies[1].uci,san:main.plies[1].san,documented:true});
    entered.push({uci:main.plies[2].uci,origin:"authored-response"});
    const later=documentedDefenderOutcomes(source,branches,entered);
    expect(later).toContainEqual(expect.objectContaining({
      replySan:main.plies[3].san,
      fen:main.plies[3].afterFen,
    }));
    expect(later.every(row=>row.fen===branches.find(b=>b.id===row.branchId)?.plies[3].afterFen)).toBe(true);
    entered.push({uci:main.plies[3].uci,origin:"learner"});
    decisions=independentDefenderDecisions(source,branches,entered);
    expect(decisions).toHaveLength(2);
    expect(decisions[1]).toMatchObject({ply:4,san:main.plies[3].san,documented:true});
    expect(deepFrames(source,entered)?.[4].fen).toBe(main.plies[3].afterFen);
    // An authored/autoplayed defense is not an independently chosen reply.
    expect(independentDefenderDecisions(source,branches,[
      entered[0],{...entered[1],origin:"authored-response"},entered[2],entered[3],
    ])).toHaveLength(1);
    // This legitimate source line cannot certify an invented 9th ply.
    expect(documentedDefenderOutcomes(source,branches,
      main.plies.map((step,i)=>({uci:step.uci,origin:i%2===0?"authored-response" as const:"learner" as const})))
    ).toEqual([]);
  });
  it("reports legal unrecorded defenses as exploration, never as graded failures",()=>{
    const p=defense.positions[0] as CalculationPosition;
    const branches=verifiedDeepBranches(p);
    const setup=sourceDefenderSetup(branches[0]).played;
    const board=new Chess(branches[0].plies[0].afterFen);
    const documented=new Set(branches.map(b=>b.plies[1]?.uci));
    const different=board.moves({verbose:true}).find(m=>!documented.has(m.from+m.to+(m.promotion??"")));
    expect(different).toBeDefined();
    const entered=[...setup,{uci:different!.from+different!.to+(different!.promotion??""),origin:"learner" as const}];
    expect(deepFrames(p,entered)?.length).toBe(3);
    expect(independentDefenderDecisions(p,branches,entered)).toMatchObject([{ply:2,documented:false}]);
    expect(nextRecordedSourceMove(p,branches,entered)).toBeNull();
    expect(documentedDefenderOutcomes(p,branches,entered)).toEqual([]);
  });
  it("surfaces multiple real defender outcomes across original case families",()=>{
    const original=[...structures.positions,...attacks.positions,...defense.positions,
      ...originalP110.positions] as CalculationPosition[];
    let withAlternatives=0;
    for(const position of original){
      const branches=verifiedDeepBranches(position);
      expect(branches.length,position.id).toBeGreaterThanOrEqual(1);
      const setup=sourceDefenderSetup(branches[0]);
      const outcomes=documentedDefenderOutcomes(position,branches,setup.played);
      const firstDefenses=recordedDefenderChoices(position,branches,setup.played);
      expect(outcomes.map(o=>o.replySan)).toEqual(firstDefenses.slice(0,outcomes.length).map(o=>o.san));
      for(const choice of outcomes){
        const selected=branches.find(b=>b.id===choice.branchId)!;
        expect(choice.fen,position.id).toBe(selected.plies[1].afterFen);
        expect(choice.continuation,position.id)
          .toEqual(selected.plies.slice(2).map(p=>p.san));
        expect(choice.explanation,position.id).toBe(selected.explanation);
      }
      if(outcomes.length>=2)withAlternatives++;
    }
    // Source metadata inspected: 31 raw P103/P105/P106/P110 cases
    // have different legal responses to the same source candidate.
    expect(withAlternatives).toBeGreaterThanOrEqual(20);
  });
  it("offers original independent candidate decisions with source-backed three-ply contrasting boards",()=>{
    for(const p of [structures.positions[0],originalP104.positions[0],originalP112.positions[0]] as CalculationPosition[]){
      const sourceSnapshot=JSON.stringify(p);
      const branches=verifiedDeepBranches(p);
      const choices=documentedCandidateBoards(branches);
      expect(choices.length,p.id).toBeGreaterThanOrEqual(2);
      expect(documentedCandidateBoards(branches,0),p.id).toEqual([]);
      expect(new Set(choices.map(c=>c.firstUci)).size,p.id).toBe(choices.length);
      for(const choice of choices){
        const source=branches.find(b=>b.id===choice.branchId)!;
        expect(choice.firstSan,p.id).toBe(source.plies[0].san);
        expect(choice.sample,p.id).toEqual(source.plies.slice(0,3).map(p=>p.san));
        expect(choice.fen,p.id).toBe(source.plies[2].afterFen);
        expect(choice.explanation,p.id).toBe(source.explanation);
      }
      const other=branches.find(b=>b.plies[0].uci!==branches[0].plies[0].uci)!;
      const entered=[
        {uci:other.plies[0].uci,origin:"learner" as const},
        {uci:other.plies[1].uci,origin:"authored-response" as const},
        {uci:other.plies[2].uci,origin:"learner" as const},
      ];
      expect(matchingSourceBranch(branches,entered)?.id,p.id).toBe(other.id);
      expect(deepFrames(p,entered)?.[3].fen,p.id).toBe(other.plies[2].afterFen);
      expect(independentSourceDecisions(p,branches,entered),p.id).toMatchObject([
        {ply:1,san:other.plies[0].san,documented:true},
        {ply:3,san:other.plies[2].san,documented:true},
      ]);
      expect(recordedDefenderChoices(p,branches,entered.slice(0,1)).length,p.id)
        .toBeGreaterThan(0);
      expect(JSON.stringify(p),p.id).toBe(sourceSnapshot);
    }
  });
  it("keeps legal non-source candidate moves as ungraded exploration",()=>{
    const p=structures.positions[0] as CalculationPosition;
    const branches=verifiedDeepBranches(p);
    const known=new Set(branches.map(b=>b.plies[0].uci));
    const alternative=new Chess(p.fen).moves({verbose:true})
      .find(m=>!known.has(m.from+m.to+(m.promotion??"")));
    expect(alternative).toBeDefined();
    const played=[{uci:alternative!.from+alternative!.to+(alternative!.promotion??""),
      origin:"learner" as const}];
    expect(deepFrames(p,played)?.length).toBe(2);
    expect(independentSourceDecisions(p,branches,played)).toMatchObject([
      {ply:1,documented:false},
    ]);
    expect(recordedDefenderChoices(p,branches,played)).toEqual([]);
    expect(independentSourceDecisions(p,branches,[
      {uci:branches[0].plies[0].uci,origin:"local-engine"},
    ])).toEqual([]);
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
      const originalCandidate=branches[0].plies[0];
      writeDeepDraft("owner-a",current,{
        branchId:branches[0].id,
        played:[{uci:originalCandidate.uci,origin:"learner"}],cursor:1,reveal:false,
      },"candidate");
      expect(readDeepDraft("owner-a",current,branches,"candidate").cursor).toBe(1);
      expect(readDeepDraft("owner-a",current,branches).cursor).toBe(3);
      expect(readDeepDraft("owner-b",current,branches,"candidate").played).toEqual([]);
      expect(readDeepDraft("owner-a",current,branches,"defender").played).toEqual([]);
      discardDeepDraft("owner-a",current,"candidate");
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
