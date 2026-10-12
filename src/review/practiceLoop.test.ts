import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { importPgn } from "../games/import";
import { legalReviewMistake, recordReviewAttempt, reviewPracticeQueue, reviewAttemptQuality, scheduleVerifiedReview, verifiedReviewAttempts } from "./practiceLoop";
import type { PersonalMistake } from "../games/types";

const date = new Date("2026-10-10T16:00:00Z");
const game = importPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *', "w", date.toISOString(), {source:"manual"});
const move = game.moves[2];
const sample: PersonalMistake = {
 id: `${game.id}:3`,gameId:game.id,ply:3,moveNumber:move.moveNumber,
 playerColor:"w",positionFen:move.beforeFen,actualMove:move.uci,actualSan:move.san,
 bestMove:"f1c4",principalVariation:["f1c4","g8f6"],evaluationBefore:30,evaluationAfter:5,
 centipawnLoss:130,severity:"mistake",skillIds:["openings.principles"],explanation:"Develop",
 createdAt:date.toISOString(), nextReviewAt:date.toISOString(),
 attempts:0,successes:0,resolved:false,
};
describe("P86 owner-source verified mistake practice",()=>{
 it("requires exact source game, original move and legal engine suggestion",()=>{
  expect(legalReviewMistake(sample,game)).toBe(true);
  for(const patch of [{gameId:"foreign"},{ply:5},{positionFen:new Chess().fen()},
   {actualMove:"a2a4"},{bestMove:"e2e5"},{playerColor:"b" as const},{actualSan:"wrong"}])
   expect(legalReviewMistake({...sample,...patch},game)).toBe(false);
 });
 it("ranks due unsolved cases with real failure history but excludes all orphaned and stale game identities",()=>{
  const later={...sample,id:sample.id+":later",nextReviewAt:"2099-01-01T00:00:00Z",resolved:true};
  const orphan={...sample,id:"orphan",gameId:"other"};
  const queue=reviewPracticeQueue([game],[later,orphan,sample,sample],[],date);
  expect(queue.map(x=>x.mistake.id)).toEqual([sample.id,later.id]);
  expect(queue[0].due).toBe(true);
  const q2=reviewPracticeQueue([game],[sample],[{
   id:"x",mistakeId:sample.id,gameId:game.id,ply:3,playedMove:"g1f3",triedMoves:["g1f3"],
   succeeded:false,quality:0,hintsUsed:0,wrongAttempts:1,occurredAt:date.toISOString(),
  }],date);
  expect(q2[0].recentAttempts).toBe(1);
  expect(q2[0].score).toBeGreaterThan(queue[0].score);
 });
 it("records one bounded source-verified attempt and rejects fake successes and illegal moves",()=>{
  const input={playedMove:"f1c4",triedMoves:["g1f3","f1c4"],succeeded:true,quality:.75,hintsUsed:1,wrongAttempts:1};
  const one=recordReviewAttempt([],sample,game,input,date);
  expect(one).toHaveLength(1);
  expect(one[0]).toMatchObject({gameId:game.id,ply:3,succeeded:true,wrongAttempts:1,hintsUsed:1});
  expect(recordReviewAttempt(one,sample,game,{...input,playedMove:"e2e5"},date)).toEqual(one);
  expect(recordReviewAttempt(one,sample,game,{...input,playedMove:"g1f3"},date)).toEqual(one);
  expect(recordReviewAttempt(one,sample,{...game,id:"wrong"},input,date)).toEqual(one);
  expect(recordReviewAttempt(one,sample,game,{...input,quality:Infinity},date)).toEqual(one);
  expect(recordReviewAttempt(one,sample,game,{...input,triedMoves:Array(41).fill("f1c4")},date)).toEqual(one);
  // Revealing after solving cannot be disguised as a missed attempt.
  expect(recordReviewAttempt(one,sample,game,{...input,playedMove:null,succeeded:false,quality:0},date)).toEqual(one);
  const revealed=recordReviewAttempt(one,sample,game,{
    playedMove:null,triedMoves:[],succeeded:false,quality:0,hintsUsed:0,wrongAttempts:0,
  },date);
  expect(revealed[1].succeeded).toBe(false);
  expect(input.triedMoves).toEqual(["g1f3","f1c4"]);
 });
});

describe("P87 calibrated evidence from actual Review practice",()=>{
 const good={playedMove:"f1c4",triedMoves:["f1c4"],succeeded:true,quality:1,hintsUsed:0,wrongAttempts:0};
 const later=(days:number)=>new Date(date.getTime()+days*86_400_000);
 it("scores independently of caller hints, repetitions and self-reported quality",()=>{
   expect(reviewAttemptQuality(true,0,0)).toBe(1);
   expect(reviewAttemptQuality(true,1,1)).toBe(.68);
   expect(reviewAttemptQuality(false,0,0)).toBe(0);
   const attempt=recordReviewAttempt([],sample,game,{
     ...good,triedMoves:["g1f3","f1c4"],quality:1,wrongAttempts:1,hintsUsed:1,
   },date)[0];
   expect(attempt).toMatchObject({quality:.68,succeeded:true,
     positionFen:sample.positionFen,bestMove:sample.bestMove});
 });
 it("rejects invalid histories, fake success, inconsistent counts and incorrect endpoint",()=>{
   const fake={...good,triedMoves:["g1f3","f1c4"],wrongAttempts:0};
   expect(recordReviewAttempt([],sample,game,fake,date)).toEqual([]);
   expect(recordReviewAttempt([],sample,game,{...good,playedMove:"g1f3"},date)).toEqual([]);
   expect(recordReviewAttempt([],sample,game,{...good,quality:NaN},date)).toEqual([]);
   expect(recordReviewAttempt([],sample,game,{...good,hintsUsed:2},date)).toEqual([]);
   expect(recordReviewAttempt([],sample,game,{...good,
     succeeded:false,quality:0},date)).toEqual([]);
   const trueHistory=recordReviewAttempt([],sample,game,good,date);
   const corrupted={...trueHistory[0],wrongAttempts:1,quality:1};
   const wrongSource={...trueHistory[0],positionFen:new Chess().fen()};
   expect(verifiedReviewAttempts(sample,[corrupted,wrongSource],date)).toEqual([]);
   const forgedGrade={...trueHistory[0],quality:0};
   expect(verifiedReviewAttempts(sample,[forgedGrade],date)).toHaveLength(1);
   expect(reviewPracticeQueue([game],[sample],[forgedGrade],date)[0].lastQuality).toBe(1);
 });
 it("schedules repeated unaided recall in graduated intervals and resets after help",()=>{
   let history=recordReviewAttempt([],sample,game,good,date);
   let state=scheduleVerifiedReview(sample,history,date);
   expect(Date.parse(state.nextReviewAt)-date.getTime()).toBe(86_400_000);
   expect(state.resolved).toBe(false);
   history=recordReviewAttempt(history,state,game,good,later(1));
   state=scheduleVerifiedReview(state,history,later(1));
   expect(Date.parse(state.nextReviewAt)-later(1).getTime()).toBe(3*86_400_000);
   expect(state.resolved).toBe(true);
   history=recordReviewAttempt(history,state,game,{...good,hintsUsed:1},later(4));
   state=scheduleVerifiedReview(state,history,later(4));
   expect(state.resolved).toBe(false);
   expect(Date.parse(state.nextReviewAt)-later(4).getTime()).toBe(43_200_000);
 });
 it("puts missed and revealed attempts back in six hours with no quality or mastery claim",()=>{
   const miss={playedMove:"g1f3",triedMoves:["g1f3"],
      succeeded:false,quality:1,hintsUsed:0,wrongAttempts:1};
   const history=recordReviewAttempt([],sample,game,miss,date);
   expect(history[0].quality).toBe(0);
   const state=scheduleVerifiedReview(sample,history,date);
   expect(Date.parse(state.nextReviewAt)-date.getTime()).toBe(21_600_000);
   expect(state.resolved).toBe(false);
   expect(reviewPracticeQueue([game],[state],history,later(.3))[0].reviewReason)
      .toContain("Last attempt missed");
 });
 it("orders old and fresh attempts chronologically, ignoring future and foreign records",()=>{
   const first=recordReviewAttempt([],sample,game,good,date)[0];
   const failure=recordReviewAttempt([] ,sample,game,{
     playedMove:null,triedMoves:[],succeeded:false,quality:0,hintsUsed:0,wrongAttempts:0,
   },later(1))[0];
   const future={...first,id:"future",occurredAt:later(100).toISOString()};
   const past=verifiedReviewAttempts(sample,[failure,first,future],later(2));
   expect(past.map(a=>a.occurredAt)).toEqual([first.occurredAt,failure.occurredAt]);
   const queue=reviewPracticeQueue([game],[sample],[future,failure,first],later(2))[0];
   expect(queue.recentAttempts).toBe(2);
   expect(queue.lastQuality).toBe(0);
 });
});
