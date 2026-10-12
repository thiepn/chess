import { Chess } from "chess.js";
import type { LessonScript, LessonStep } from "./types";

export interface TransferChallenge {
  fen: string;
  acceptedMoves: string[];
  prompt: string;
  success: string;
  misconception: string;
  successByMove: Record<string, string>;
  hints: string[];
}
export interface TransferExercise {
  skillId: string; fen: string; acceptedMove: string;
  prompt: string; success: string; misconception: string;
  challenge?: TransferChallenge;
}
let cached: Promise<ReadonlyMap<string, TransferExercise>> | undefined;
const fields = ["skillId","fen","acceptedMove","prompt","success","misconception"] as const;

function legal(entry: Pick<TransferExercise, "fen" | "acceptedMove">): boolean {
  const move = entry.acceptedMove;
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) return false;
  try {
    return new Chess(entry.fen).moves({verbose:true}).some(m =>
      m.from + m.to + (m.promotion ?? "") === move);
  } catch { return false; }
}

function catalogIndex(raw: unknown): ReadonlyMap<string,TransferExercise> {
  const source = raw as {schema?:string;items?:TransferExercise[]} | null;
  if (source?.schema !== "thiepn.chess.transfer.v1" || source.items?.length !== 49)
    throw Error("Unexpected transfer catalog");
  const rows = new Map<string,TransferExercise>();
  for (const item of source.items) {
    if (!item || ["skillId","fen","acceptedMove","prompt","success","misconception"]
      .some(k => typeof item[k as keyof TransferExercise] !== "string" ||
        !(item[k as keyof TransferExercise] as string).trim()) ||
      rows.has(item.skillId)) throw Error("Invalid authored transfer record");
    rows.set(item.skillId,item);
  }
  return rows;
}

/** Validate all locally owned instruction before allowing scored retrieval. */
export function validateTransferCatalog(raw: unknown): ReadonlyMap<string,TransferExercise> {
  const rows = catalogIndex(raw);
  for (const item of rows.values()) {
    if (!legal(item)) throw Error("Illegal transfer response");
    const c = item.challenge;
    if (!c) continue;
    const moves = c.acceptedMoves;
    const feedback = c.successByMove;
    if (typeof c.fen !== "string" || !c.fen || c.fen === item.fen ||
      ![c.prompt,c.success,c.misconception].every(s => typeof s === "string" && s.trim()) ||
      !Array.isArray(c.hints) || c.hints.length !== 3 ||
      c.hints.some(h => typeof h !== "string" || h.length < 15) ||
      !Array.isArray(moves) || moves.length < 1 || moves.length > 3 ||
      new Set(moves).size !== moves.length ||
      !feedback || Object.keys(feedback).length !== moves.length ||
      moves.some(move => !legal({fen:c.fen,acceptedMove:move}) ||
        typeof feedback[move] !== "string" || feedback[move].length < 35))
      throw Error("Invalid P92 transfer: " + item.skillId);
  }
  return rows;
}

export function checkedTransfer(lesson: LessonScript, entry: TransferExercise): LessonScript {
  if (entry.skillId!==lesson.skillId || entry.fen===lesson.steps[0]?.fen || !legal(entry))
    throw new Error("Transfer position is not independently valid");
  const move=entry.acceptedMove;
  if (entry.challenge && (entry.challenge.fen === lesson.steps[0]?.fen ||
      entry.challenge.fen === entry.fen))
    throw Error("Non-independent P92 position");
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
  const extra: LessonStep | null = entry.challenge ? {
    id: "transfer-depth", type: "move", stage: "transfer", support: "transfer",
    eyebrow: "SECOND INDEPENDENT POSITION", title: "Choose and justify a plan",
    prompt: entry.challenge.prompt, fen: entry.challenge.fen,
    acceptedMoves: entry.challenge.acceptedMoves,
    successTitle: "Reasoned transfer completed",
    successBody: entry.challenge.success,
    successByMove: entry.challenge.successByMove,
    misconceptionFeedback: entry.challenge.misconception,
    hints: entry.challenge.hints.map(text => ({text})),
  } : null;
  return {...lesson, steps:lesson.steps.flatMap(step =>
    step.id === "transfer" ? [task, ...(extra ? [extra] : [])] :
    step.id === "takeaway" && step.type === "explain" ?
      [{...step,fen:entry.challenge?.fen ?? entry.fen,
        body:`${lesson.summary} ${entry.challenge?.success ?? entry.success} Revisit later without hints to demonstrate retention.`}] : [step])};
}

export function loadTransferCatalog(): Promise<ReadonlyMap<string,TransferExercise>> {
  return cached ??= fetch(`${import.meta.env.BASE_URL}data/learning/transfer-v1.json`)
    .then(response=>{if(!response.ok)throw Error("Missing transfer data");return response.json();})
    .then(validateTransferCatalog)
    .catch(error=>{cached=undefined;throw error;});
}
