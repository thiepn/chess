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
  for (const entry of data.values()) {
    if (!legal(entry)) throw Error("Illegal transfer response");
    const challenge = entry.challenge;
    if (!challenge) continue;
    if (!challenge.fen || challenge.fen === entry.fen ||
      !challenge.prompt?.trim() || !challenge.success?.trim() ||
      !challenge.misconception?.trim() ||
      !Array.isArray(challenge.hints) || challenge.hints.length !== 3 ||
      challenge.hints.some(h => typeof h !== "string" || h.trim().length < 15) ||
      !Array.isArray(challenge.acceptedMoves) ||
      challenge.acceptedMoves.length < 1 || challenge.acceptedMoves.length > 3 ||
      new Set(challenge.acceptedMoves).size !== challenge.acceptedMoves.length)
      throw Error("Invalid P92 transfer: " + entry.skillId);
    try {
      const board = new Chess(challenge.fen);
      for (const move of challenge.acceptedMoves) {
        if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move) ||
            !challenge.successByMove || typeof challenge.successByMove[move] !== "string" ||
            challenge.successByMove[move].length < 35)
          throw Error("Missing move-specific correction");
        if (!board.moves({verbose:true}).some(candidate =>
            candidate.from + candidate.to + (candidate.promotion ?? "") === move))
          throw Error("Illegal accepted move");
      }
      if (Object.keys(challenge.successByMove).sort().join(",") !==
          [...challenge.acceptedMoves].sort().join(","))
        throw Error("Unqualified alternative feedback");
    } catch {
      throw Error("Illegal or incomplete P92 transfer: " + entry.skillId);
    }
  }
  return data;
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
