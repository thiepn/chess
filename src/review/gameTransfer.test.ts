import {describe,it,expect} from "vitest";
import {Chess} from "chess.js";
import type {ImportedGame,PersonalMistake} from "../games/types";
import {recordReviewAttempt} from "./practiceLoop";
import {gameTransferMissions,gameTransferReadiness} from "./gameTransfer";

function records(gameId:string,wrongMove:string="a2a3") {
 const board=new Chess(),beforeFen=board.fen();
 const original=board.move({from:wrongMove.slice(0,2),to:wrongMove.slice(2,4)});
 if(!original)throw Error("Bad synthetic move");
 const game:ImportedGame={id:gameId,pgn:"",importedAt:"2026-10-09T09:00:00Z",
   white:"Synthetic White",black:"Synthetic Black",playerColor:"w",result:"*",
   criticalMomentIds:[],moves:[{ply:1,moveNumber:1,color:"w",san:original.san,
     uci:wrongMove,from:original.from,to:original.to,piece:original.piece,
     beforeFen,afterFen:board.fen()}]};
 const mistake:PersonalMistake={id:`mistake-${gameId}`,gameId,ply:1,moveNumber:1,
   playerColor:"w",positionFen:beforeFen,actualMove:wrongMove,actualSan:original.san,
   bestMove:"e2e4",principalVariation:["e2e4","e7e5","g1f3"],evaluationBefore:10,
   evaluationAfter:-180,centipawnLoss:190,severity:"mistake",
   skillIds:["strategy.open-files"],explanation:"Develop toward the center.",
   errorType:"strategic-plan",errorReason:"Compare center access before pushing a rook pawn.",
   createdAt:"2026-10-09T09:00:00Z",nextReviewAt:"2026-10-10T09:00:00Z",
   attempts:0,successes:0,resolved:false};
 return {game,mistake};
}
describe("P91 owner-authoritative saved-game learning missions",()=>{
 const now=new Date("2026-10-13T12:00:00Z");
 it("rejects absent, foreign, tampered or illegal game-to-engine lineage",()=>{
   const {game,mistake}=records("g-one");
   expect(gameTransferMissions([game],[mistake],[],now)).toHaveLength(1);
   expect(gameTransferMissions([],[mistake],[],now)).toHaveLength(0);
   expect(gameTransferMissions([{...game,id:"foreign"}],[mistake],[],now)).toHaveLength(0);
   expect(gameTransferMissions([game],[{...mistake,positionFen:"invalid"}],[],now)).toHaveLength(0);
   expect(gameTransferMissions([game],[{...mistake,principalVariation:["e2e4","a1a1"]}],[],now)).toHaveLength(0);
   expect(gameTransferMissions([game],[mistake,mistake],[],now)).toHaveLength(1);
 });
 it("links strategy to legally replayed move and reply without creating fabricated grades",()=>{
   const {game,mistake}=records("g-two");
   const mission=gameTransferMissions([game],[mistake],[],now)[0];
   expect(mission).toMatchObject({gameId:"g-two",moveNumber:1,lane:"strategy",
     lineLength:3,cleanReturns:0,spacedCleanPairs:0,
     assistedReturns:0,missedReturns:0,due:true});
   expect(mistake.principalVariation).toEqual(["e2e4","e7e5","g1f3"]);
   expect(mistake.errorReason).toContain("center access");
   expect(gameTransferReadiness([mission]).readiness).toBe("needs-practice");
 });
 it("separates assisted results from two genuine independent 24-hour recalls",()=>{
   const {game,mistake}=records("g-three");
   const create=(attempts:ReturnType<typeof recordReviewAttempt>,date:string,
     hintsUsed:number,attemptsMoves:string[])=>recordReviewAttempt(attempts,mistake,game,{
       playedMove:attemptsMoves.at(-1)??null,triedMoves:attemptsMoves,
       succeeded:true,quality:1,hintsUsed,
       wrongAttempts:attemptsMoves.filter(x=>x!=="e2e4").length,
     },new Date(date));
   let history=create([],"2026-10-09T12:00:00Z",1,["e2e4"]);
   history=create(history,"2026-10-10T12:00:00Z",0,["e2e4"]);
   history=create(history,"2026-10-10T13:00:00Z",0,["e2e4"]);
   const early=gameTransferMissions([game],[mistake],history,now)[0];
   expect(early).toMatchObject({cleanReturns:2,spacedCleanPairs:0,assistedReturns:1});
   history=create(history,"2026-10-12T12:00:00Z",0,["e2e4"]);
   const qualified=gameTransferMissions([game],[mistake],history,now)[0];
   expect(qualified.spacedCleanPairs).toBe(1);
   const read=gameTransferReadiness([qualified]);
   expect(read).toMatchObject({qualifiedPositions:1,verifiedAttempts:4,
     independentRecalls:3,assistedSolves:1,spacedIndependentPairs:1,
     readiness:"emerging"});
   expect(read.readiness).not.toBe("reviewed"); // only one original game
 });
 it("an intervening hinted return breaks the independently spaced chain",()=>{
   const {game,mistake}=records("g-assisted");
   const sample=(t:string,hintsUsed:number)=>
     recordReviewAttempt([],mistake,game,{playedMove:"e2e4",triedMoves:["e2e4"],
       succeeded:true,quality:1,hintsUsed,wrongAttempts:0},new Date(t))[0];
   const attempts=[
     sample("2026-10-09T12:00:00Z",0),
     sample("2026-10-10T12:00:00Z",1),
     sample("2026-10-12T12:00:00Z",0),
   ];
   const mission=gameTransferMissions([game],[mistake],attempts,now)[0];
   expect(mission).toMatchObject({cleanReturns:2,assistedReturns:1,spacedCleanPairs:0});
 });
 it("does not turn absent personal games into claims of chess strength",()=>{
   expect(gameTransferReadiness([])).toMatchObject({readiness:"no-game-evidence",
     qualifiedPositions:0,independentRecalls:0,spacedIndependentPairs:0});
 });
});
