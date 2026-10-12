import {Chess} from "chess.js";
import type {ImportedGame,PersonalMistake} from "../games/types";
import {legalReviewMistake,verifiedReviewAttempts,type RecordedReviewAttempt} from "./practiceLoop";

export type TransferLane="strategy"|"calculation"|"tactics"|"endgame";
export interface TransferMission {
  mistakeId:string;gameId:string;gameLabel:string;skillId:string;
  lane:TransferLane;
  moveNumber:number;actualSan:string;
  lineLength:number;due:boolean;
  question:string;priority:number;
  cleanReturns:number;spacedCleanPairs:number;assistedReturns:number;missedReturns:number;
  nextReviewAt:string;
}
export interface TransferReadiness {
  qualifiedPositions:number;verifiedAttempts:number;
  uniqueGames:number;independentRecalls:number;assistedSolves:number;
  missedAttempts:number;spacedIndependentPairs:number;duePositions:number;
  readiness:"no-game-evidence"|"needs-practice"|"emerging"|"reviewed";
  limitation:string;
}
function laneFor(m:PersonalMistake):TransferLane {
  if(m.errorType==="strategic-plan")return "strategy";
  if(m.skillIds.some(x=>x.startsWith("endgames.")) ||
     m.skillIds.some(x=>x.startsWith("pawns.")))return "endgame";
  if(m.errorType==="calculation-failure" ||
     m.skillIds.some(x=>x.startsWith("calculation.")))return "calculation";
  return "tactics";
}
function verifiedLine(m:PersonalMistake) {
  if(m.principalVariation[0]!==m.bestMove ||
     m.principalVariation.length>16)return null;
  try {
    const board=new Chess(m.positionFen);
    const san:string[]=[];
    for(const uci of m.principalVariation){
      if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci))return null;
      const move=board.move({from:uci.slice(0,2),to:uci.slice(2,4),
        promotion:uci[4]||"q"});
      if(!move || (move.promotion && move.promotion!==uci[4]))return null;
      san.push(move.san);
    }
    return san.length>=1?san:null;
  }catch{return null;}
}
/** Read-only projections of the authoritative, owner-scoped game and review stores. */
export function gameTransferMissions(
 games:readonly ImportedGame[],mistakes:readonly PersonalMistake[],
 history:readonly RecordedReviewAttempt[],now=new Date(),
):TransferMission[]{
 const byGame=new Map(games.map(g=>[g.id,g]));
 if(!Number.isFinite(now.getTime()))return [];
 const seen=new Set<string>();
 return mistakes.flatMap(m=>{
   const game=byGame.get(m.gameId);
   if(!game||seen.has(m.id)||!legalReviewMistake(m,game))return [];
   const line=verifiedLine(m);if(!line)return [];
   seen.add(m.id);
   const attempts=verifiedReviewAttempts(m,history,now);
   const independent=attempts.filter(a=>a.succeeded&&!a.hintsUsed&&!a.wrongAttempts);
   // A repeat within the same practice sitting is NOT time-separated recall.
   let spacedCleanPairs=0,lastCleanAt:number|null=null;
   for(const event of attempts){
     // A hint, incorrect move or reveal resets the independence chain.
     if(!event.succeeded||event.hintsUsed||event.wrongAttempts) {
       lastCleanAt=null;continue;
     }
     const at=Date.parse(event.occurredAt);
     if(lastCleanAt!==null&&at-lastCleanAt>=86_400_000){
       spacedCleanPairs++;lastCleanAt=at;
     }else if(lastCleanAt===null)lastCleanAt=at;
     // Short repeats are mere practice; they cannot reset the 24h clock.
   }
   const assisted=attempts.filter(a=>a.succeeded&&(a.hintsUsed>0||a.wrongAttempts>0));
   const missed=attempts.filter(a=>!a.succeeded);
   const lane=laneFor(m);
   const due=!(Number.isFinite(Date.parse(m.nextReviewAt))) ||
     Date.parse(m.nextReviewAt)<=now.getTime();
   const priority=(m.severity==="blunder"?3:m.severity==="mistake"?2:1)+
     (due?2:0)+Math.min(2,missed.length*.5)-(independent.length>=2?1:0);
   return [{mistakeId:m.id,gameId:m.gameId,
     gameLabel:`${game.white} — ${game.black}`,skillId:m.skillIds[0]||"fundamentals.attacked",
     lane,
     moveNumber:m.moveNumber,actualSan:m.actualSan,
     lineLength:line.length,
     due,
     question:lane==="strategy"?"What was your plan, and which opponent reply makes it unsafe?"
       :lane==="endgame"?"Which king, rook or pawn resource makes the technique work?"
       :lane==="calculation"?"Find the move, the best recorded reply, and your continuation."
       :"Find the tactical resource and verify the opponent's reply.",
     priority,cleanReturns:independent.length,spacedCleanPairs,assistedReturns:assisted.length,
     missedReturns:missed.length,nextReviewAt:m.nextReviewAt}];
 }).sort((a,b)=>b.priority-a.priority||a.mistakeId.localeCompare(b.mistakeId));
}
export function gameTransferReadiness(missions:readonly TransferMission[]):TransferReadiness {
 const unique=new Set(missions.map(m=>m.mistakeId));
 const clean=missions.reduce((n,m)=>n+m.cleanReturns,0);
 const assisted=missions.reduce((n,m)=>n+m.assistedReturns,0);
 const missed=missions.reduce((n,m)=>n+m.missedReturns,0);
 const pairs=missions.filter(m=>m.spacedCleanPairs>0).length;
 const due=missions.filter(m=>m.due).length;
 const gamesWithDelayed=new Set(missions.filter(m=>m.spacedCleanPairs>0).map(m=>m.gameId)).size;
 const readiness=!missions.length?"no-game-evidence":!clean?"needs-practice":
   pairs>=2&&gamesWithDelayed>=2?"reviewed":"emerging";
 return {qualifiedPositions:unique.size,verifiedAttempts:clean+assisted+missed,
   uniqueGames:new Set(missions.map(m=>m.gameId)).size,
   independentRecalls:clean,assistedSolves:assisted,missedAttempts:missed,
   spacedIndependentPairs:pairs,duePositions:due,readiness,
   limitation:"Verified game review is not a rating or mastery certification. Delayed recall needs clean, unaided attempts at least 24 hours apart."};
}
