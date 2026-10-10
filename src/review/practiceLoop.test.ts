import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { importPgn } from "../games/import";
import { legalReviewMistake, recordReviewAttempt, reviewPracticeQueue } from "./practiceLoop";
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
  expect(recordReviewAttempt(one,sample,game,{...input,playedMove:null,succeeded:false,quality:0},date)[1].succeeded).toBe(false);
  expect(input.triedMoves).toEqual(["g1f3","f1c4"]);
 });
});
