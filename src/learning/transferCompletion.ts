import { Chess } from "chess.js";
import type { LessonScript, LessonStep } from "./types";
import { lessonPositionKey } from "./lessonPositionKey";

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
// Source-v1 P92 owners are contractual. Dropping a challenge otherwise lets a
// successful fetch silently erase a required independent transfer and change
// the original mastery/Review denominator without any catalog error.
export const p92ChallengeSkillIds: ReadonlySet<string> = new Set([
  "rules.board",   "rules.pieces",   "rules.capture",   "rules.check",
  "rules.check-responses",   "rules.mate",   "rules.castling",   "rules.promotion",
  "fundamentals.values",   "fundamentals.defended",   "fundamentals.trades",   "openings.principles",
  "openings.development",   "openings.center",   "openings.king-safety",   "openings.queen-timing",
  "openings.tempo",   "strategy.piece-activity",   "strategy.worst-piece",   "calculation.move-order",
  "strategy.open-files",   "strategy.outposts",   "pawns.breaks",   "pawns.weaknesses",
  "defense.prophylaxis",   "practical.plan", 
]);

function legal(fen: string, uci: string): boolean {
  try {
    return new Chess(fen).moves({verbose:true}).some(m =>
      m.from + m.to + (m.promotion ?? "") === uci);
  } catch { return false; }
}

/** Qualify local author data before using it for scored attempts. */
export function validateTransferCatalog(raw: unknown): ReadonlyMap<string,TransferExercise> {
  const source = raw as {schema?:string;items?:TransferExercise[]} | null;
  if (source?.schema !== "thiepn.chess.transfer.v1" || source.items?.length !== 49)
    throw Error("Unexpected transfer catalog");
  const rows = new Map<string,TransferExercise>();
  for (const item of source.items) {
    if (!item || rows.has(item.skillId) ||
      fields.some(k => typeof item[k] !== "string" || !item[k].trim()) ||
      !legal(item.fen,item.acceptedMove))
      throw Error("Invalid transfer record");
    // A missing, null or relocated P92 check must fail closed rather than
    // masquerade as a valid P88-only lesson.
    const expectsChallenge = p92ChallengeSkillIds.has(item.skillId);
    if (Boolean(item.challenge) !== expectsChallenge)
      throw Error("Incomplete authored P92 transfer");
    const c = item.challenge;
    if (c) {
      const moves = c.acceptedMoves;
      if (typeof c.fen !== "string" || lessonPositionKey(c.fen) === lessonPositionKey(item.fen) ||
        ![c.fen,c.prompt,c.success,c.misconception].every(x => typeof x === "string" && x.trim()) ||
        !Array.isArray(c.hints) || c.hints.length !== 3 ||
        c.hints.some(x => typeof x !== "string" || x.length < 15) ||
        !Array.isArray(moves) || moves.length < 1 || moves.length > 3 ||
        new Set(moves).size !== moves.length ||
        !c.successByMove || Object.keys(c.successByMove).length !== moves.length ||
        moves.some(m => !legal(c.fen,m) ||
          typeof c.successByMove[m] !== "string" || c.successByMove[m].length < 35))
        throw Error("Invalid authored second transfer");
    }
    rows.set(item.skillId,item);
  }
  if (rows.size !== 49 || [...p92ChallengeSkillIds].some(id => !rows.get(id)?.challenge))
    throw Error("Incomplete historical independent transfer catalog");
  return rows;
}

export function checkedTransfer(lesson: LessonScript, entry: TransferExercise): LessonScript {
  // Compare actual position-defining FEN fields, not halfmove/fullmove
  // counters. A replay of an earlier model/choice/retrieval board cannot
  // qualify as the original independent P88 or P92 transfer.
  const originalBoards = new Set(lesson.steps.map(step => lessonPositionKey(step.fen)));
  if (entry.skillId!==lesson.skillId || originalBoards.has(lessonPositionKey(entry.fen)) ||
      !legal(entry.fen,entry.acceptedMove))
    throw new Error("Transfer position is not independently valid");
  const move=entry.acceptedMove;
  if (entry.challenge && (originalBoards.has(lessonPositionKey(entry.challenge.fen)) ||
      lessonPositionKey(entry.challenge.fen) === lessonPositionKey(entry.fen)))
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
    ...task,
    id: "transfer-depth", eyebrow: "NEW POSITION", title: "Choose and justify a plan",
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
