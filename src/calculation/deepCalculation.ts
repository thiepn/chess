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

function key(owner: string, position: CalculationPosition) {
  return KEY + encodeURIComponent(owner) + ":" + encodeURIComponent(position.id);
}
export function blankDeepDraft(branch: DeepBranch): DeepDraft {
  return { branchId: branch.id, played: [], cursor: 0, reveal: false };
}
export function readDeepDraft(owner: string, position: CalculationPosition, branches: DeepBranch[]): DeepDraft {
  const blank = blankDeepDraft(branches[0]);
  if (!owner || typeof sessionStorage === "undefined") return blank;
  try {
    const raw = sessionStorage.getItem(key(owner, position));
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
export function writeDeepDraft(owner: string, position: CalculationPosition, draft: DeepDraft) {
  if (!owner || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key(owner, position), JSON.stringify({
      version: 1, fen: position.fen, savedAt: Date.now(), ...draft,
    }));
  } catch { /* Session storage may be unavailable. */ }
}
export function discardDeepDraft(owner: string, position: CalculationPosition) {
  if (!owner || typeof sessionStorage === "undefined") return;
  try { sessionStorage.removeItem(key(owner, position)); } catch { /* no persistence */ }
}
