import teaching from "../../public/data/endgames/guidance-v1.json";
import {validateEndgameGuidance} from "./guidance";
import {describe,it,expect} from "vitest";
import {endgamePositions,endgameCatalogIssues} from "./positions";
import {endgameRepairPlan,verifyEndgameHistory} from "./diagnostics";
import type {EndgameEvidence} from "./types";

describe("P90 practical endgame source and retention gates",()=>{
 it("adds three playable and correctly structured new technique choices",()=>{
   const added=endgamePositions.filter(p=>p.id.endsWith("-p90"));
   expect(added).toHaveLength(3);
   expect(endgameCatalogIssues()).toEqual([]);
   for(const p of added){
     expect(p.recognitionOptions).toHaveLength(3);
     expect(p.recognitionOptions.find(o=>o.id===p.recognitionAnswer)).toBeTruthy();
     expect(p.processCues.length).toBeGreaterThanOrEqual(3);
   }
 });
 it("rejects nonreplayable wins and falsely declared survival",()=>{
   const p=endgamePositions.find(p=>p.id==="endgame:rook-second-front-p90")!;
   const evidence:EndgameEvidence={positionId:p.id,techniqueId:p.techniqueId,
     objectiveType:p.objectiveType,recognitionCorrect:true,executionSuccess:true,
     outcome:"survived",plies:0,hintsUsed:0,delayedRetention:true};
   expect(verifyEndgameHistory(p,[],evidence)).toBe(false);
   expect(verifyEndgameHistory(p,["a1a9"],{...evidence,plies:1})).toBe(false);
   expect(verifyEndgameHistory(p,[],{...evidence,positionId:"another"})).toBe(false);
   expect(verifyEndgameHistory(p,[],{...evidence,outcome:"win"})).toBe(false);
 });
 it("explains specific mistaken recognition and assisted attempts",()=>{
   const p=endgamePositions.find(p=>p.id==="endgame:rook-checking-distance-p90")!;
   const evidence:EndgameEvidence={positionId:p.id,techniqueId:p.techniqueId,
     objectiveType:p.objectiveType,recognitionCorrect:false,executionSuccess:false,
     outcome:"resigned",plies:1,hintsUsed:2,delayedRetention:false};
   const source=validateEndgameGuidance(teaching).get(p.id)!;
   const explanation=endgameRepairPlan({...p,...source},"contact",evidence).join(" ");
   expect(explanation).toContain("unprotected");
   expect(explanation).toContain("unaided");
   expect(explanation).toContain(p.failureNote);
 });
});

describe("P91 retained original endgame guidance custody",()=>{
 it("qualifies every authored endgame against the on-demand original text",()=>{
  const available=validateEndgameGuidance(teaching);
  expect(available.size).toBe(endgamePositions.length);
  for(const p of endgamePositions){
   const source=available.get(p.id);
   expect(source?.recognitionOptions.map(o=>o.id)).toEqual(p.recognitionOptions.map(o=>o.id));
   expect(source?.recognitionOptions.every(o=>o.label&&o.explanation)).toBe(true);
   expect(source?.processCues.every(c=>c.length>5)).toBe(true);
  }
 });
 it("rejects missing, corrupt and duplicated human-authored guidance",()=>{
  expect(()=>validateEndgameGuidance({...teaching,items:teaching.items.slice(1)})).toThrow();
  expect(()=>validateEndgameGuidance({...teaching,items:[...teaching.items.slice(0,-1),teaching.items[0]]})).toThrow();
  expect(()=>validateEndgameGuidance({...teaching,items:teaching.items.map((x,i)=>
   i===0?{...x,processCues:[""]}:x)})).toThrow();
 });
});
