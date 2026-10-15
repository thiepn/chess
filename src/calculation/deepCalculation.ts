import { Chess } from "chess.js";
import { legalCalculationBranch } from "./branchFeedback";
import type { CalculationPosition } from "./types";

export type PlyOrigin = "learner" | "authored-response" | "local-engine";
export interface DeepPly { uci: string; origin: PlyOrigin }
export interface DeepBranch {
  id: string;
  label: string;
  plies: NonNullable<ReturnType<typeof legalCalculationBranch>>;
  explanation: string;
}
export interface DeepDraft {
  branchId: string;
  played: DeepPly[];
  cursor: number;
  reveal: boolean;
}

const MAX_PLIES = 8;
const KEY = "chess:p108:calculation-draft:";
const ttl = 24 * 60 * 60 * 1000;
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const origins: PlyOrigin[] = ["learner", "authored-response", "local-engine"];

export function verifiedDeepBranches(position: CalculationPosition): DeepBranch[] {
  const list = [
    { id: "main", label: "Principal continuation", moves: position.principalVariation,
      explanation: position.continuationReason ?? position.explanation },
    ...(position.defensiveStudy?.variations ?? []).map((item, index) => ({
      id: `alternative-${index + 1}`, label: item.label, moves: item.moves,
      explanation: item.explanation,
    })),
  ];
  const seen = new Set<string>();
  return list.flatMap(item => {
    if (!Array.isArray(item.moves) || item.moves.length < 3 ||
        item.moves.length > MAX_PLIES) return [];
    const rows = legalCalculationBranch({
      fen: position.fen, playerColor: position.playerColor,
      bestMove: item.moves[0], principalVariation: item.moves,
    });
    if (!rows || rows.length !== item.moves.length) return [];
    const fingerprint = item.moves.join(",");
    if (seen.has(fingerprint)) return [];
    seen.add(fingerprint);
    return [{ id: item.id, label: item.label, plies: rows, explanation: item.explanation }];
  });
}

/** Distinct opponent replies from verified ORIGINAL legal source branches,
 * after the exact moves the learner played. No invented defensive rankings. */
export function recordedDefenderChoices(
  position: CalculationPosition, branches: DeepBranch[], played: DeepPly[],
):{uci:string;san:string;branchId:string;label:string}[] {
  if (!played.length || played.length>=MAX_PLIES) return [];
  const frames=deepFrames(position,played);
  const boardFen=frames?.[played.length]?.fen;
  if (!boardFen) return [];
  try { if(new Chess(boardFen).turn()===position.playerColor) return []; }
  catch { return []; }
  const found=new Set<string>(),result:{uci:string;san:string;branchId:string;label:string}[]=[];
  for(const branch of branches){
    if(!played.every((move,i)=>branch.plies[i]?.uci===move.uci))continue;
    const documented=branch.plies[played.length];
    if(!documented||found.has(documented.uci))continue;
    const legal=playDeepMove(boardFen,documented.uci);
    if(!legal||legal.san!==documented.san)continue;
    found.add(documented.uci);
    result.push({uci:documented.uci,san:documented.san,branchId:branch.id,label:branch.label});
  }
  return result;
}
/** Original, legally replayed side-by-side two-ply outcomes. Never compare
 * engine strength or invent a move beyond the authored source. */
export function documentedDefensiveBoards(
  branches:readonly DeepBranch[], maximum=3, firstUci?:string,
) {
  const seen=new Set<string>();
  const limit=Math.min(4,Math.max(0,Math.floor(maximum)));
  return branches.flatMap(branch=>{
    if(branch.plies.length<2 || (firstUci && branch.plies[0].uci!==firstUci))return [];
    const after=branch.plies[1].afterFen;
    if(seen.has(after))return [];
    seen.add(after);
    return [{
      id:branch.id,label:branch.label,fen:after,
      firstMove:branch.plies[0].san,defenderMove:branch.plies[1].san,
      continuedLine:branch.plies.slice(2).map(p=>p.san),
      explanation:branch.explanation,
    }];
  }).slice(0,limit);
}

/** Switching an original branch keeps precisely the legal move prefix shared
 * with that branch; incompatible old decisions remain in the original draft only
 * until the learner chooses another branch. This never awards mastery. */
export function sharedBranchDraft(branch:DeepBranch, draft:DeepDraft):DeepDraft {
  const played=draft.played.slice(0,draft.cursor);
  let shared=0;
  for(;shared<played.length&&branch.plies[shared]?.uci===played[shared].uci;shared++){}
  return {branchId:branch.id,played:played.slice(0,shared),cursor:shared,reveal:false};
}

/** A legal entered prefix is allowed to select the corresponding original
 * authored line. This is source recognition, never a quality judgment. */
export function matchingSourceBranch(
  branches:readonly DeepBranch[], entered:readonly DeepPly[], preferredId?:string,
):DeepBranch|null {
  const matches=branches.filter(b=>entered.length<=b.plies.length &&
    entered.every((move,i)=>b.plies[i].uci===move.uci));
  return matches.find(b=>b.id===preferredId)??matches[0]??null;
}

/** Reveal/play ONLY the next original source-side continuation after a learner
 * has defended an authored candidate. Deliberately stop on any unknown move. */
export function nextRecordedSourceMove(
  position:CalculationPosition, branches:readonly DeepBranch[],
  played:readonly DeepPly[], preferredId?:string,
):{branchId:string;uci:string;san:string;label:string}|null {
  if(played.length<2 || played.length>=MAX_PLIES || played.length%2!==0)return null;
  const matching=matchingSourceBranch(branches,played,preferredId);
  const next=matching?.plies[played.length];
  if(!next)return null;
  const frames=deepFrames(position,[...played]);
  const fen=frames?.[played.length]?.fen;
  if(!fen || next.beforeFen!==fen)return null;
  try { if(new Chess(fen).turn()!==position.playerColor)return null; }
  catch { return null; }
  if(playDeepMove(fen,next.uci)?.san!==next.san)return null;
  return {branchId:matching!.id,uci:next.uci,san:next.san,label:matching!.label};
}

/** Present feedback from the exact source branch whose defender was played.
 * Never reuse principal-line criticism for a different recorded alternative. */
export function recordedDefenseFeedback(
  position:CalculationPosition, branch:DeepBranch, played:readonly DeepPly[],
):{reply:string;misconception?:string;label:string}|null {
  if(played.length<2 || branch.plies[0]?.uci!==played[0].uci ||
      branch.plies[1]?.uci!==played[1].uci)return null;
  const principal=branch.id==="main";
  return {
    reply:principal ? (position.replyReason?.trim()||branch.explanation) : branch.explanation,
    misconception:principal ? position.defensiveStudy?.misconception?.trim()||undefined : undefined,
    label:branch.label,
  };
}

/** Exact source-linked defender decisions in this single board session.
 * A legal unrecorded reply is an exploration, not a failed graded answer.
 * Authored and engine moves are not counted as independent learner choices. */
export function independentDefenderDecisions(
  position:CalculationPosition, branches:readonly DeepBranch[], played:readonly DeepPly[],
):{ply:number;uci:string;san:string;documented:boolean;sourceLabel?:string}[] {
  if(!played.length || played[0].origin!=="authored-response")return [];
  const frames=deepFrames(position,[...played]);
  if(!frames)return [];
  const decisions:{ply:number;uci:string;san:string;documented:boolean;sourceLabel?:string}[]=[];
  for(let i=1;i<played.length;i+=2){
    if(played[i].origin!=="learner")continue;
    const source=branches.find(branch=>played.slice(0,i+1).every(
      (step,index)=>branch.plies[index]?.uci===step.uci,
    ));
    decisions.push({
      ply:i+1,uci:played[i].uci,san:frames[i+1].san,
      documented:Boolean(source),...(source?{sourceLabel:source.label}:{}),
    });
  }
  return decisions;
}

/** The opposing source's legal, independently authored replies after ANY
 * shared prefix, including the second or third defensive decision. The
 * returned FENs are replayed in verifiedDeepBranches, not synthesized. */
export function documentedDefenderOutcomes(
  position:CalculationPosition, branches:readonly DeepBranch[],
  prefix:readonly DeepPly[],limit=3,
):{branchId:string;label:string;replySan:string;fen:string;continuation:string[];explanation:string}[] {
  if(!prefix.length || prefix.length>=MAX_PLIES)return [];
  const frames=deepFrames(position,[...prefix]);
  const fen=frames?.[prefix.length]?.fen;
  if(!fen)return [];
  try{if(new Chess(fen).turn()===position.playerColor)return [];}catch{return [];}
  const unique=new Set<string>();
  return branches.flatMap(branch=>{
    if(!prefix.every((step,i)=>branch.plies[i]?.uci===step.uci))return [];
    const response=branch.plies[prefix.length];
    if(!response || response.beforeFen!==fen || unique.has(response.afterFen))return [];
    if(playDeepMove(fen,response.uci)?.san!==response.san)return [];
    unique.add(response.afterFen);
    return [{
      branchId:branch.id,label:branch.label,replySan:response.san,
      fen:response.afterFen,
      continuation:branch.plies.slice(prefix.length+1).map(step=>step.san),
      explanation:branch.explanation,
    }];
  }).slice(0,Math.min(4,Math.max(0,Math.floor(limit))));
}

/** Start an ungraded opponent-side challenge directly after an authored legal
 * first move. The setup move is marked authored; it is not learner evidence. */
export function sourceDefenderSetup(branch:DeepBranch):DeepDraft {
  const first=branch.plies[0];
  return first ? {
    branchId:branch.id,
    played:[{uci:first.uci,origin:"authored-response"}],
    cursor:1,
    reveal:false,
  } : blankDeepDraft(branch);
}

export function playDeepMove(fen: string, uci: string): { fen: string; san: string } | null {
  if (!UCI.test(uci)) return null;
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2), to: uci.slice(2, 4),
      ...(uci.length === 5 ? { promotion: uci[4] } : {}),
    });
    if (!move || (move.promotion && move.promotion !== uci[4])) return null;
    return { fen: chess.fen(), san: move.san };
  } catch { return null; }
}

export function deepFrames(position: CalculationPosition, played: DeepPly[]) {
  const frames = [{ fen: position.fen, san: "" }];
  for (const entry of played.slice(0, MAX_PLIES)) {
    const next = playDeepMove(frames[frames.length - 1].fen, entry.uci);
    if (!next) return null;
    frames.push(next);
  }
  return frames;
}

export function comparisonFor(branch: DeepBranch, played: DeepPly[]) {
  const rows = branch.plies;
  let matched = 0;
  for (const [i, move] of played.entries()) {
    if (rows[i]?.uci !== move.uci || i !== matched) break;
    matched++;
  }
  return {
    matched, deviated: matched < Math.min(played.length, rows.length),
    outsideReference: played.length > rows.length && matched === rows.length,
  };
}

function key(owner: string, position: CalculationPosition, scope?: "defender") {
  return KEY + encodeURIComponent(owner) + ":" + encodeURIComponent(position.id) +
    (scope ? ":mode:" + encodeURIComponent(scope) : "");
}
export function blankDeepDraft(branch: DeepBranch): DeepDraft {
  return { branchId: branch.id, played: [], cursor: 0, reveal: false };
}
export function readDeepDraft(owner: string, position: CalculationPosition, branches: DeepBranch[], scope?: "defender"): DeepDraft {
  const blank = blankDeepDraft(branches[0]);
  if (!owner || typeof sessionStorage === "undefined") return blank;
  try {
    const raw = sessionStorage.getItem(key(owner, position, scope));
    if (!raw || raw.length > 2300) return blank;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return blank;
    const v = data as Record<string, unknown>;
    if (v.version !== 1 || v.fen !== position.fen ||
        typeof v.savedAt !== "number" || Date.now() - v.savedAt > ttl ||
        v.savedAt > Date.now() + 60000 ||
        typeof v.branchId !== "string" || !branches.some(b => b.id === v.branchId) ||
        !Array.isArray(v.played) || v.played.length > MAX_PLIES) return blank;
    const played: DeepPly[] = v.played.map((value: unknown) => {
      if (!value || typeof value !== "object") throw new Error("Invalid draft move");
      const move = value as Record<string, unknown>;
      if (typeof move.uci !== "string" || !UCI.test(move.uci) ||
          !origins.includes(move.origin as PlyOrigin)) throw new Error("Invalid draft move");
      return { uci: move.uci, origin: move.origin as PlyOrigin };
    });
    if (!deepFrames(position, played)) return blank;
    const cursor = typeof v.cursor === "number" && Number.isInteger(v.cursor) &&
      v.cursor >= 0 && v.cursor <= played.length ? v.cursor : played.length;
    return { branchId: v.branchId, played, cursor, reveal: v.reveal === true };
  } catch { return blank; }
}
export function writeDeepDraft(owner: string, position: CalculationPosition, draft: DeepDraft, scope?: "defender") {
  if (!owner || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key(owner, position, scope), JSON.stringify({
      version: 1, fen: position.fen, savedAt: Date.now(), ...draft,
    }));
  } catch { /* Session storage may be unavailable. */ }
}
export function discardDeepDraft(owner: string, position: CalculationPosition, scope?: "defender") {
  if (!owner || typeof sessionStorage === "undefined") return;
  try { sessionStorage.removeItem(key(owner, position, scope)); } catch { /* no persistence */ }
}
