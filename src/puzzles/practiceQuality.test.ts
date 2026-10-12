import {describe,it,expect} from "vitest";
import {seedPuzzles} from "./seed";
import {legalPuzzleLine,recordPuzzleResult,calibratedPuzzleRating,puzzleRetryAt} from "./practiceQuality";
import {selectPuzzle} from "./selector";

const now=new Date("2026-10-12T12:00:00Z");
describe("P89 truthful puzzle coaching and spaced practice",()=>{
 it("independently reconstructs all seed continuations and rejects corrupt responses",()=>{
  for(const p of seedPuzzles)expect(legalPuzzleLine(p)?.length,p.id).toBe(p.solutionMoves.length);
  const p=seedPuzzles[0];
  expect(legalPuzzleLine({...p,solutionMoves:["a1a1"]})).toBeNull();
  expect(legalPuzzleLine({...p,initialFen:"bad"})).toBeNull();
  expect(legalPuzzleLine({...p,solutionMoves:[]})).toBeNull();
 });
 it("separates clean delayed recall from assisted and missed practice",()=>{
  const a=recordPuzzleResult(undefined,"seed-test",true,0,[],1,now);
  expect(a).toMatchObject({successes:1,cleanStreak:1,lastIndependent:true});
  expect(Date.parse(a.nextReviewAt!)-now.getTime()).toBe(86_400_000);
  const early=recordPuzzleResult(a,"seed-test",true,0,[],1,new Date(now.getTime()+60_000));
  expect(early.cleanStreak).toBe(1);
  const later=new Date(now.getTime()+86_400_000);
  const b=recordPuzzleResult(a,"seed-test",true,0,[],1,later);
  expect(b.cleanStreak).toBe(2);
  expect(Date.parse(b.nextReviewAt!)-later.getTime()).toBe(3*86_400_000);
  const help=recordPuzzleResult(b,"seed-test",true,1,[],.8,later);
  expect(help).toMatchObject({successes:3,lastIndependent:false,cleanStreak:0});
  expect(Date.parse(help.nextReviewAt!)-later.getTime()).toBe(43_200_000);
  const miss=recordPuzzleResult(help,"seed-test",false,1,["e2e4"],0,later);
  expect(miss).toMatchObject({successes:3,lastIndependent:false,cleanStreak:0,lastWrongMove:"e2e4"});
  expect(Date.parse(miss.nextReviewAt!)-later.getTime()).toBe(21_600_000);
 });
 it("adjusts target within bounds based on recent independent performance",()=>{
  const pool=seedPuzzles.slice(0,4),history:Record<string,ReturnType<typeof recordPuzzleResult>>={};
  for(const p of pool)history[p.id]=recordPuzzleResult(undefined,p.id,false,1,["e2e4"],0,now);
  expect(calibratedPuzzleRating(1400,history,pool)).toBe(1260);
  for(const p of pool)history[p.id]=recordPuzzleResult(undefined,p.id,true,0,[],1,now);
  expect(calibratedPuzzleRating(1400,history,pool)).toBe(1520);
  expect(calibratedPuzzleRating(650,{},pool)).toBe(650);
 });
 it("respects explicit next due timestamps and returns failed puzzles after short spacing",()=>{
  const pool=seedPuzzles.filter(p=>p.skillIds.includes("tactics.knight-fork"));
  const target=pool[0];
  const failed=recordPuzzleResult(undefined,target.id,false,0,["d6f7"],0,now);
  const criterion={skillId:"tactics.knight-fork",mastery:0,activityDifficulty:2,
    targetRating:target.rating,history:{[target.id]:failed}};
  expect(selectPuzzle(pool,criterion,now)?.id).not.toBe(target.id);
  const after=new Date(now.getTime()+7*3_600_000);
  expect(puzzleRetryAt(failed,false,after).streak).toBe(0);
  expect(selectPuzzle(pool,criterion,after)).toBeTruthy();
 });
});
