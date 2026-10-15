import fs from "node:fs";
import path from "node:path";
import {describe,it,expect} from "vitest";
import type {CalculationPosition} from "../calculation/types";
import {hydrateOpeningTransition} from "../openings/transitionStudy";
import {hydrateEndgameDecision} from "../endgames/decisionStudy";
import {alignSourceStudySkills} from "../calculation/studySkillAlignment";
import {legalCalculationBranch} from "../calculation/branchFeedback";
import {verifiedDeepBranches,recordedDefenderChoices} from "../calculation/deepCalculation";
import {level78AdvancedCases} from "./level78Pathways";
import {level456Pathways} from "./level456Pathways";
import {curriculumStages,skills} from "../domain/curriculum";
import {endgamePositions} from "../endgames/positions";

/** Focused original 39-file, 684-position source inventory. It deliberately
 * runs only in Vitest, not at application startup and not against user data. */
function readOriginal() {
 const root=path.resolve("public/data/calculation");
 const files=fs.readdirSync(root).filter(f=>/^p\d+.*-v1\.json$/.test(f)).sort();
 const cases:CalculationPosition[]=[];
 for(const file of files) {
   const parsed=JSON.parse(fs.readFileSync(path.join(root,file),"utf8")) as {positions:CalculationPosition[]};
   if(!Array.isArray(parsed.positions))throw Error("Invalid source file "+file);
   for(const original of parsed.positions){
     const opening=hydrateOpeningTransition(original);
     if(!opening)throw Error("Failed repertoire FEN hydration "+original.id);
     const ending=hydrateEndgameDecision(opening);
     if(!ending)throw Error("Failed endgame source hydration "+original.id);
     cases.push(alignSourceStudySkills(ending));
   }
 }
 return {files,cases};
}
describe("actual Level 4–8 source coverage and historical grading boundaries",()=>{
 it("contains exactly 39 original source files and 684 qualified source positions",()=>{
   const {files,cases}=readOriginal();
   expect(files).toHaveLength(39);
   expect(cases).toHaveLength(684);
   expect(new Set(cases.map(p=>p.id)).size).toBe(684);
   for(const p of cases){
     expect(p.source,p.id).toBe("authored");
     expect(legalCalculationBranch(p),p.id).not.toBeNull();
   }
   expect(cases.filter(p=>p.assessmentStatus==="instructional-only")).toHaveLength(126);
   expect(cases.filter(p=>p.assessmentStatus!== "instructional-only")).toHaveLength(558);
 });
 it("finds real choices among opponent responses without inventing an extra source",()=>{
   const {cases}=readOriginal();
   let originalMultiReply=0;
   for(const p of cases){
     const branches=verifiedDeepBranches(p);
     if(!branches.length)continue;
     const first=branches[0].plies[0];
     const legalReplies=recordedDefenderChoices(p,branches,[{uci:first.uci,origin:"learner"}]);
     if(legalReplies.length>=2)originalMultiReply++;
   }
   // Observed 142 raw multi-reply positions; hydrated opening/endgame sources
   // can change branch lengths, so require a conservative legal minimum.
   expect(originalMultiReply).toBeGreaterThanOrEqual(125);
 });
 it("turns 15 underserved original scored pawn studies into genuine UNGRADED advanced practice",()=>{
   const {cases}=readOriginal();
   const expected=["pawns.iqp","pawns.hanging","pawns.minority"];
   for(const id of expected){
     const source=level78AdvancedCases(id,cases,endgamePositions);
     const fromP103=source.filter(p=>p.id.startsWith("calc:p103-"));
     expect(fromP103.length,id).toBeGreaterThanOrEqual(5);
     expect(fromP103.every(x=>!x.assessed&&!x.direct),id).toBe(true);
     expect(new Set(fromP103.map(x=>x.position.fen)).size,id).toBe(fromP103.length);
   }
 });
 it("produces honest per-skill coverage without inventing cases or upgrading unrelated skills",()=>{
   const {cases}=readOriginal();
   const selected=skills.filter(s=>["thinking","fight","finish","practical","advanced"].includes(s.stage));
   expect(selected).toHaveLength(51);
   const report=selected.map(s=>{
     const sources=s.stage==="advanced" ? level78AdvancedCases(s.id,cases,endgamePositions,12)
       : level456Pathways(s.id,cases,endgamePositions,12);
     return {skillId:s.id,stage:s.stage,count:sources.length,
       originallyScored:sources.filter(p=>p.assessed).length,
       contextual:sources.filter(p=>!p.direct).length,
       uniqueFen:new Set(sources.map(p=>p.position.fen)).size};
   });
   for(const row of report){
     expect(row.count).toBeLessThanOrEqual(12);
     expect(row.count).toBe(row.uniqueFen);
     // Level 7 uses original Review and PGN evidence; no fictional static game cases.
     if(row.stage==="practical")expect(row.count).toBe(0);
   }
   // Report is diagnostic, not a requirement to fabricate 12 boards per skill.
   console.info("Level 4–8 original source coverage",JSON.stringify(report));
 });
});
