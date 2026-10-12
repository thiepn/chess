import {Chess} from "chess.js";
import type {CalculationPosition,CalculationEvidence} from "./types";

/** Replays every recorded ply. An authored continuation is not an engine uniqueness claim. */
export function legalCalculationBranch(position:Pick<CalculationPosition,
  "fen"|"bestMove"|"principalVariation"|"playerColor">) {
  try {
    if(position.principalVariation.length<3 || position.principalVariation.length>16 ||
       position.bestMove!==position.principalVariation[0])return null;
    const game=new Chess(position.fen);
    if(game.turn()!==position.playerColor)return null;
    const rows:{ply:number;uci:string;san:string;beforeFen:string;afterFen:string;actor:"learner"|"opponent"}[]=[];
    for(let i=0;i<position.principalVariation.length;i++){
      const uci=position.principalVariation[i];
      if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci))return null;
      const beforeFen=game.fen();
      const move=game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]||"q"});
      if(!move || (move.promotion && move.promotion!==uci[4]))return null;
      rows.push({ply:i+1,uci,san:move.san,beforeFen,afterFen:game.fen(),
        actor:i%2===0?"learner":"opponent"});
    }
    return rows;
  }catch{return null;}
}
export function calculationMisconceptions(position:CalculationPosition,evidence:CalculationEvidence):string[]{
  const details:string[]=[];
  if(!evidence.selectedMoveScore)
    details.push("Main move: you did not choose the recorded forcing or improving resource. Recheck checks, captures, and tactical safety.");
  if(!evidence.replyScore)
    details.push(`Opponent reply: do not assume the opponent helps your plan. ${position.replyReason ?? "Rebuild the position and find the strongest legal response."}`);
  if(!evidence.continuationScore)
    details.push(`Continuation: calculate another full ply after the response. ${position.continuationReason ?? "Compare the resulting pieces and king safety."}`);
  return details.length?details:["The recorded three-ply line was reconstructed. Retention still requires a later independent attempt."];
}
