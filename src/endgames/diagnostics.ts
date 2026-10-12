import {Chess} from "chess.js";
import type {EndgamePosition,EndgameEvidence} from "./types";

export function endgameRepairPlan(
 position:EndgamePosition,choice:string|undefined,
 evidence:EndgameEvidence,
):string[]{
 const notes:string[]=[];
 if(choice!==position.recognitionAnswer){
   const chosen=position.recognitionOptions.find(x=>x.id===choice);
   notes.push(chosen?.explanation??"Identify the correct method before calculating.");
 }
 if(!evidence.executionSuccess)notes.push(position.failureNote);
 else notes.push(position.successNote);
 if(evidence.hintsUsed>0)
   notes.push("This technique was completed with process cues. Retry unaided after the interval for independent retention.");
 if(evidence.outcome==="survived")
   notes.push("The defensive survival target was reached. This is a practical engine hold, not a tablebase proof of a draw.");
 if(evidence.outcome==="limit")
   notes.push("The move cap was reached; improve efficiency and king/rook coordination.");
 return notes;
}
export function verifyEndgameHistory(
 position:EndgamePosition,movesSan:readonly string[],evidence:EndgameEvidence,
):boolean {
 try{
   if(evidence.positionId!==position.id || evidence.techniqueId!==position.techniqueId ||
     evidence.objectiveType!==position.objectiveType || evidence.plies!==movesSan.length ||
     movesSan.length>position.maxPlies+1 || evidence.hintsUsed<0 ||
     evidence.hintsUsed>position.processCues.length)return false;
   const game=new Chess(position.fen);
   for(const san of movesSan){
     if(typeof san!=="string" || san.length>16 || !game.move(san))return false;
   }
   if(evidence.outcome==="win")return game.isCheckmate() && game.turn()!==position.playerColor;
   if(evidence.outcome==="loss")return game.isCheckmate() && game.turn()===position.playerColor;
   if(evidence.outcome==="draw")return game.isDraw();
   if(evidence.outcome==="survived")
     return position.objectiveType==="hold" && !game.isGameOver() &&
       movesSan.length>=(position.survivalPlies??Infinity) &&
       evidence.executionSuccess;
   if(evidence.outcome==="limit")return movesSan.length>=position.maxPlies && !evidence.executionSuccess;
   if(evidence.outcome==="resigned")return !evidence.executionSuccess;
   return false;
 }catch{return false;}
}
