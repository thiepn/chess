import { Chess } from "chess.js";
import type { PuzzleAttemptSummary, PuzzleRecord } from "./types";

const DAY=86_400_000;
export function legalPuzzleLine(puzzle: PuzzleRecord): string[] | null {
  if (!puzzle.solutionMoves.length || puzzle.solutionMoves.length > 24) return null;
  try {
    const board=new Chess(puzzle.initialFen);
    const san:string[]=[];
    for(const uci of puzzle.solutionMoves) {
      if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci))return null;
      const move=board.move({from:uci.slice(0,2),to:uci.slice(2,4),
        promotion:uci[4]||"q"});
      if (!move || (move.promotion && !uci.endsWith(move.promotion))) return null;
      san.push(move.san);
    }
    return san;
  }catch{return null;}
}
export function puzzleRetryAt(prior: PuzzleAttemptSummary | undefined,
  clean:boolean, now:Date) {
  const last=prior?.nextReviewAt ? Date.parse(prior.nextReviewAt) : NaN;
  const spaced=!Number.isFinite(last) || now.getTime()>=last;
  const streak=clean ? (spaced ? (prior?.cleanStreak??0)+1 :
    Math.max(1,prior?.cleanStreak??1)) : 0;
  const days=clean ? [1,3,7,14,30][Math.min(streak,5)-1] : .5;
  return {streak, next:new Date(now.getTime()+days*DAY).toISOString()};
}
export function recordPuzzleResult(prior:PuzzleAttemptSummary|undefined,
  puzzleId:string, succeeded:boolean, hintsUsed:number,
  wrongMoves:readonly string[], quality:number, now:Date):PuzzleAttemptSummary {
  const independent=succeeded && hintsUsed===0 && wrongMoves.length===0;
  const spaced=puzzleRetryAt(prior,independent,now);
  return {puzzleId,attempts:(prior?.attempts??0)+1,
    successes:(prior?.successes??0)+(succeeded?1:0),
    lastAttemptAt:now.toISOString(),lastSuccessAt:succeeded?now.toISOString():prior?.lastSuccessAt,
    lastQuality:quality,hintsUsed,wrongAttempts:wrongMoves.length,
    lastIndependent:independent,cleanStreak:spaced.streak,
    nextReviewAt:succeeded?spaced.next:new Date(now.getTime()+.25*DAY).toISOString(),
    lastWrongMove:wrongMoves.at(-1),
  };
}
/** No rating/strength claim: a bounded local target adjustment using actual outcomes. */
export function calibratedPuzzleRating(target:number,
  history:Record<string,PuzzleAttemptSummary>, puzzles:readonly PuzzleRecord[]) {
  const attempts=puzzles.flatMap(p=>history[p.id]?[history[p.id]]:[])
    .sort((a,b)=>Date.parse(b.lastAttemptAt)-Date.parse(a.lastAttemptAt)).slice(0,4);
  if(attempts.length<2)return target;
  const clean=attempts.filter(a=>a.lastIndependent).length;
  const delta=clean>=3?120:clean===2?40:clean===0?-140:-60;
  return Math.max(650,Math.min(2200,target+delta));
}
