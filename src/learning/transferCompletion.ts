import { Chess } from "chess.js";
import type { LessonScript, LessonStep } from "./types";

export interface TransferExercise {
  skillId: string; fen: string; acceptedMove: string;
  prompt: string; success: string; misconception: string;
}
let cached: Promise<ReadonlyMap<string, TransferExercise>> | undefined;
const fields = ["skillId","fen","acceptedMove","prompt","success","misconception"] as const;

function legal(entry: TransferExercise): boolean {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(entry.acceptedMove)) return false;
  const game = new Chess(entry.fen);
  const {acceptedMove:move}=entry;
  const played=game.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]||"q"});
  return Boolean(played && (!played.promotion || move.endsWith(played.promotion)));
}

function catalogIndex(raw: unknown): ReadonlyMap<string,TransferExercise> {
  const data=raw as {schema?:string;items?:TransferExercise[]} | null;
  if (data?.schema!=="thiepn.chess.transfer.v1" || data.items?.length!==49)
    throw Error("Unexpected transfer catalog");
  const result=new Map<string,TransferExercise>();
  for(const item of data.items) {
    if (!item || fields.some(field=>typeof item[field]!=="string" || !item[field].trim()) ||
        result.has(item.skillId)) throw Error("Invalid authored transfer record");
    result.set(item.skillId,item);
  }
  return result;
}

/** Full corpus qualification; runtime also checks each exercised move. */
export function validateTransferCatalog(raw: unknown): ReadonlyMap<string,TransferExercise> {
  const data=catalogIndex(raw);
  for(const entry of data.values())if(!legal(entry))throw Error("Illegal transfer response");
  return data;
}

export function checkedTransfer(lesson: LessonScript, entry: TransferExercise): LessonScript {
  if (entry.skillId!==lesson.skillId || entry.fen===lesson.steps[0]?.fen || !legal(entry))
    throw new Error("Transfer position is not independently valid");
  const move=entry.acceptedMove;
  const task:LessonStep={
    id:"transfer",type:"move",stage:"transfer",support:"transfer",
    eyebrow:"INDEPENDENT TRANSFER",title:"Solve a different position",
    prompt:entry.prompt,fen:entry.fen,acceptedMoves:[move],
    successTitle:"Transfer position completed",successBody:entry.success,
    misconceptionFeedback:entry.misconception,
    hints:[
      {text:`Recall the principle: ${lesson.summary} Check the opponent's best reply.`},
      {text:entry.success},
      {text:`Examine the move from ${move.slice(0,2)} to ${move.slice(2,4)}.`},
    ],
  };
  return {...lesson,steps:lesson.steps.map(step=>step.id==="transfer"?task:
    step.id==="takeaway" && step.type==="explain" ?
      {...step,fen:entry.fen,body:`${lesson.summary} ${entry.success} Revisit later without hints to demonstrate retention.`} : step)};
}

export function loadTransferCatalog(): Promise<ReadonlyMap<string,TransferExercise>> {
  return cached ??= fetch(`${import.meta.env.BASE_URL}data/learning/transfer-v1.json`)
    .then(response=>{if(!response.ok)throw Error("Missing transfer data");return response.json();})
    .then(catalogIndex)
    .catch(error=>{cached=undefined;throw error;});
}
