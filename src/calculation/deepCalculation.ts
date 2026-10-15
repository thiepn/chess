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
