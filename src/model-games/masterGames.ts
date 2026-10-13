import { Chess, type Color } from "chess.js";

export interface MasterDecision {
  id: string;
  ply: number;
  focus: string;
  lens: string;
  prompt: string;
  model: string;
  misconception: string;
  transfer: string;
  observed: string;
}
export interface MasterGame {
  id: string;
  title: string;
  players: string;
  event: string;
  year: number;
  result: string;
  orientation: Color;
  summary: string;
  source: string;
  sourceNote: string;
  pgn: string;
  checkpoints: MasterDecision[];
}
export interface MasterTimeline {
  game: MasterGame;
  sans: string[];
  fens: string[];
}
export interface MasterDraft {
  plan: string;
  defense: string;
  transfer: string;
  revealed: boolean;
  mark: "understood" | "retry" | null;
}
const EMPTY: MasterDraft = { plan: "", defense: "", transfer: "", revealed: false, mark: null };
export const emptyMasterDraft = (): MasterDraft => ({ ...EMPTY });
export const masterGameAsset = `${import.meta.env.BASE_URL}data/model-games/p113-master-games-v1.json`;

/** Reject stale, incomplete or illegal source data before any learner-facing claim. */
export function hydrateMasterGames(input: unknown) {
  const accepted: MasterTimeline[] = [];
  let rejected = 0;
  if (!input || typeof input !== "object" || (input as { version?: unknown }).version !== 1) {
    return { accepted, rejected: 1 };
  }
  const games = (input as { games?: unknown }).games;
  if (!Array.isArray(games)) return { accepted, rejected: 1 };
  const ids = new Set<string>();
  for (const unknownGame of games) {
    try {
      const game = unknownGame as MasterGame;
      if (!game || typeof game !== "object" || typeof game.id !== "string" ||
          !/^[-a-z0-9]+$/.test(game.id) || ids.has(game.id) ||
          typeof game.pgn !== "string" || !game.pgn.includes("[Result ") ||
          typeof game.source !== "string" ||
          !game.source.startsWith("https://github.com/mcostalba/chess_db/") ||
          (game.orientation !== "w" && game.orientation !== "b") ||
          !Array.isArray(game.checkpoints) || game.checkpoints.length !== 4 ||
          !["1-0", "0-1", "1/2-1/2"].includes(game.result)) throw new Error("Incomplete source");
      const parsed = new Chess();
      parsed.loadPgn(game.pgn, { strict: false });
      const sans = parsed.history();
      if (sans.length < 30 || parsed.header().Result !== game.result) throw new Error("Incomplete record");
      const replay = new Chess();
      const fens = [replay.fen()];
      for (const move of sans) {
        replay.move(move);
        fens.push(replay.fen());
      }
      const steps = new Set<string>();
      for (const checkpoint of game.checkpoints) {
        if (!checkpoint || typeof checkpoint.id !== "string" || steps.has(checkpoint.id) ||
            !Number.isInteger(checkpoint.ply) || checkpoint.ply < 0 ||
            checkpoint.ply >= sans.length - 2 || !checkpoint.prompt ||
            !checkpoint.model || !checkpoint.misconception ||
            !checkpoint.transfer || !checkpoint.observed) throw new Error("Invalid decision");
        steps.add(checkpoint.id);
      }
      ids.add(game.id);
      accepted.push({ game, sans, fens });
    } catch {
      rejected++;
    }
  }
  return { accepted, rejected };
}

/** Same-account, short-lived drafts only; no grading, sync or achievement writes. */
export function restoreMasterDrafts(owner: string, gameId: string): Record<string, MasterDraft> {
  if (!owner) return {};
  try {
    const raw = sessionStorage.getItem(masterDraftKey(owner, gameId));
    if (!raw || raw.length > 18000) return {};
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return {};
    const state = value as { version?: number; saved?: number; drafts?: Record<string, MasterDraft> };
    if (state.version !== 1 || typeof state.saved !== "number" ||
        state.saved > Date.now() + 60000 || Date.now() - state.saved > 86400000 ||
        !state.drafts || typeof state.drafts !== "object") return {};
    return Object.fromEntries(Object.entries(state.drafts).slice(0, 8).map(([id, draft]) => [
      id, {
        plan: typeof draft?.plan === "string" ? draft.plan.slice(0, 1200) : "",
        defense: typeof draft?.defense === "string" ? draft.defense.slice(0, 1200) : "",
        transfer: typeof draft?.transfer === "string" ? draft.transfer.slice(0, 1200) : "",
        revealed: draft?.revealed === true,
        mark: draft?.mark === "retry" || draft?.mark === "understood" ? draft.mark : null,
      },
    ]));
  } catch { return {}; }
}
export function masterDraftKey(owner: string, gameId: string) {
  return "chess:p113:master-draft:" + encodeURIComponent(owner) + ":" + encodeURIComponent(gameId);
}
