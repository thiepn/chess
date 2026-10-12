import { Chess } from "chess.js";
import type { LessonScript, LessonStep } from "./types";

/** Authored original teaching positions; no external game/engine-best claims. */
export interface TransferExercise {
  skillId: string;
  fen: string;
  acceptedMove: string;
  prompt: string;
  success: string;
  misconception: string;
}
interface TransferCatalog { schema: string; items: TransferExercise[] }
let cached: Promise<ReadonlyMap<string, TransferExercise>> | null = null;
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export function checkedTransfer(lesson: LessonScript, entry: TransferExercise): LessonScript {
  if (entry.skillId !== lesson.skillId || !UCI.test(entry.acceptedMove) ||
      !entry.prompt?.trim() || !entry.success?.trim() || !entry.misconception?.trim() ||
      entry.fen === lesson.steps[0]?.fen) {
    throw new Error("Transfer data does not match the authored lesson or repeats its model");
  }
  const chess = new Chess(entry.fen);
  const moved = chess.move({
    from:entry.acceptedMove.slice(0,2),to:entry.acceptedMove.slice(2,4),
    promotion:entry.acceptedMove.slice(4,5) || "q",
  });
  if (!moved || (moved.promotion && !entry.acceptedMove.endsWith(moved.promotion))) {
    throw new Error("Transfer answer is not a legal move at its recorded position");
  }
  const transfer: LessonStep = {
    id:"transfer",type:"move",stage:"transfer",support:"transfer",
    eyebrow:"INDEPENDENT TRANSFER",title:"Solve a different position",
    prompt:entry.prompt,fen:entry.fen,acceptedMoves:[entry.acceptedMove],
    successTitle:"Transfer position completed",successBody:entry.success,
    misconceptionFeedback:entry.misconception,
    hints:[
      {text:`Recall the principle: ${lesson.summary} Check the opponent's strongest response.`},
      {text:entry.success},
      {text:`Examine the move from ${entry.acceptedMove.slice(0,2)} to ${entry.acceptedMove.slice(2,4)}.`},
    ],
  };
  return {...lesson, steps:lesson.steps.map(step=>step.id==="transfer"?transfer:
    step.id==="takeaway" && step.type==="explain" ?
      {...step,fen:entry.fen,body:`${lesson.summary} ${entry.success} Revisit this idea later without hints to demonstrate retention.`} : step)};
}

export function validateTransferCatalog(raw: unknown): ReadonlyMap<string,TransferExercise> {
  const catalog=raw as Partial<TransferCatalog> | null;
  if (!catalog || catalog.schema !== "thiepn.chess.transfer.v1" ||
      !Array.isArray(catalog.items) || catalog.items.length !== 49) {
    throw new Error("Transfer catalog missing or unexpected version/size");
  }
  const out=new Map<string,TransferExercise>();
  for(const item of catalog.items){
    if (!item || typeof item.skillId !== "string" || out.has(item.skillId) ||
        typeof item.fen !== "string" || typeof item.acceptedMove !== "string" ||
        typeof item.prompt !== "string" || typeof item.success !== "string" ||
        typeof item.misconception !== "string" || !UCI.test(item.acceptedMove)) {
      throw new Error("Invalid or duplicate transfer entry");
    }
    const chess=new Chess(item.fen);
    const moved=chess.move({from:item.acceptedMove.slice(0,2),to:item.acceptedMove.slice(2,4),
      promotion:item.acceptedMove.slice(4,5) || "q"});
    if (!moved || (moved.promotion && !item.acceptedMove.endsWith(moved.promotion)))
      throw new Error("Transfer catalog contains an illegal move");
    out.set(item.skillId,item);
  }
  return out;
}

export function loadTransferCatalog(): Promise<ReadonlyMap<string,TransferExercise>> {
  if (!cached) cached=fetch(`${import.meta.env.BASE_URL}data/learning/transfer-v1.json`)
    .then(response=>{if(!response.ok)throw new Error("Transfer data is not available");return response.json();})
    .then(validateTransferCatalog)
    .catch(error=>{cached=null;throw error;});
  return cached;
}
