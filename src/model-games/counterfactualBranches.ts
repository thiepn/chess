import { Chess, type Square } from "chess.js";
import type { MasterTimeline } from "./masterGames";
import type { TransferCaseStudy } from "./crossGameTransfer";

export interface ProbeAnchor { gameId: string; checkpointId: string; ply: number }
export interface CounterfactualChallenge {
  id: string;
  first: ProbeAnchor;
  second: ProbeAnchor;
  firstChallenge: string;
  secondChallenge: string;
  defenderPrompt: string;
  revision: string;
  misconception: string;
  factsNote: string;
  reconstruction: { first: string; second: string; after: string };
  repair: { first: string; second: string; rebuild: string; transfer: string };
}
export const counterfactualAsset = `${import.meta.env.BASE_URL}data/model-games/p115-counterfactual-v1.json`;
export const BRANCH_LIMIT = 6;

/** A P115 prompt is usable only for the exact legal and source-pinned P114 pair. */
export function hydrateCounterfactuals(payload: unknown, studies: TransferCaseStudy[]) {
  const accepted: CounterfactualChallenge[] = [];
  let rejected = 0;
  if (!payload || typeof payload !== "object" ||
    (payload as { version?: unknown }).version !== 1) return { accepted, rejected: 1 };
  const raw = (payload as { challenges?: unknown }).challenges;
  if (!Array.isArray(raw)) return { accepted, rejected: 1 };
  const sources = new Map(studies.map((study) => [study.source.id, study]));
  const ids = new Set<string>();
  for (const record of raw) {
    try {
      const item = record as CounterfactualChallenge;
      const base = item && sources.get(item.id);
      if (!base || ids.has(item.id) ||
        ![["first", base.source.first], ["second", base.source.second]].every(([key, source]) => {
          const anchor = item[key as "first" | "second"];
          const match = source as { gameId: string; checkpointId: string; ply: number };
          return anchor && anchor.gameId === match.gameId &&
            anchor.checkpointId === match.checkpointId && anchor.ply === match.ply;
        }) ||
        ["firstChallenge", "secondChallenge", "defenderPrompt", "revision", "misconception", "factsNote"]
          .some((key) => typeof item[key as keyof CounterfactualChallenge] !== "string" ||
            (item[key as keyof CounterfactualChallenge] as string).trim().length < 60) ||
        !item.reconstruction || ["first", "second", "after"].some((part) =>
          typeof item.reconstruction[part as keyof typeof item.reconstruction] !== "string" ||
          item.reconstruction[part as keyof typeof item.reconstruction].trim().length < 80) ||
        !item.repair || ["first", "second", "rebuild", "transfer"].some((part) =>
          typeof item.repair[part as keyof typeof item.repair] !== "string" ||
          item.repair[part as keyof typeof item.repair].trim().length < 80)) {
        throw new Error("Unqualified counterfactual prompt");
      }
      ids.add(item.id);
      accepted.push(item);
    } catch { rejected++; }
  }
  return { accepted, rejected };
}
export interface BranchReplay {
  fen: string;
  sans: string[];
  turn: "w" | "b";
  inCheck: boolean;
  checkmate: boolean;
  drawn: boolean;
  gameOver: boolean;
  lastCapture: string | null;
  lastPromotion: string | null;
  invalid: boolean;
}
export function replayCounterfactual(fen: string, input: readonly string[]): BranchReplay {
  const chess = new Chess(fen);
  const sans: string[] = [];
  let lastCapture: string | null = null;
  let lastPromotion: string | null = null;
  let invalid = !Array.isArray(input) || input.length > BRANCH_LIMIT;
  if (!invalid) for (const raw of input) {
    if (typeof raw !== "string" || raw.length > 12 || chess.isGameOver()) { invalid = true; break; }
    try {
      const result = chess.move(raw);
      sans.push(result.san);
      lastCapture = result.captured ?? null;
      lastPromotion = result.promotion ?? null;
    } catch { invalid = true; break; }
  }
  if (invalid) {
    return { fen, sans: [], turn: new Chess(fen).turn(), inCheck: false,
      checkmate: false, drawn: false, gameOver: false,
      lastCapture: null, lastPromotion: null, invalid: true };
  }
  return { fen: chess.fen(), sans, turn: chess.turn(),
    inCheck: chess.isCheck(), checkmate: chess.isCheckmate(),
    drawn: chess.isDraw(), gameOver: chess.isGameOver(),
    lastCapture, lastPromotion, invalid: false };
}
/** Both sides are moved by the learner. No simulated defender or asserted engine score. */
export function advanceCounterfactual(
  fen: string, line: readonly string[],
  input: { from: string; to: string; promotion?: string },
): string[] | null {
  try {
    const current = replayCounterfactual(fen, line);
    if (current.invalid || current.gameOver || current.sans.length >= BRANCH_LIMIT) return null;
    const chess = new Chess(current.fen);
    const result = chess.move({
      from: input.from as Square, to: input.to as Square,
      promotion: input.promotion,
    });
    return [...current.sans, result.san];
  } catch { return null; }
}
/** An exhaustive rule-legal menu, never a ranking of replies. */
export function legalReplyResources(fen: string) {
  const moves = new Chess(fen).moves({ verbose: true });
  return { all: moves, forcing: moves.filter((move) =>
    Boolean(move.captured) || /[+#]$/.test(move.san)) };
}
/** Deterministic differences between legal SAN branches and an observed PGN, never an evaluation. */
export function branchEvidence(fen: string, candidate: readonly string[], other: readonly string[],
  observed: readonly string[]) {
  const own = replayCounterfactual(fen, candidate);
  const alt = replayCounterfactual(fen, other);
  const source = replayCounterfactual(fen, observed);
  if (own.invalid || alt.invalid || source.invalid) return null;
  const difference = (a: readonly string[], b: readonly string[]) =>
    a.findIndex((san, i) => san !== b[i]);
  const first = difference(own.sans, source.sans);
  const second = difference(own.sans, alt.sans);
  const replay = new Chess(fen);
  const events: string[] = [];
  own.sans.forEach((san, i) => {
    const move = replay.move(san);
    if (move.captured) events.push(`Ply ${i + 1}: capture on ${move.to}`);
    if (move.promotion) events.push(`Ply ${i + 1}: promotion to ${move.promotion}`);
    if (replay.isCheck()) events.push(`Ply ${i + 1}: check`);
  });
  return {
    sameSourcePlies: first < 0 ? Math.min(own.sans.length, source.sans.length) : first,
    divergesFromSource: first < 0 ? own.sans.length > source.sans.length : true,
    sameAlternativePlies: second < 0 ? Math.min(own.sans.length, alt.sans.length) : second,
    differsFromAlternative: second < 0 ? own.sans.length > alt.sans.length : true,
    needsDefense: own.sans.length === 1 && !own.gameOver,
    replyPlayed: own.sans.length >= 2,
    events,
  };
}
/** Exact PGN history, never a hypothetical continuation or an engine verdict. */
export function observedCounterfactual(
  source: MasterTimeline, ply: number,
): string[] {
  return source.sans.slice(ply, ply + 3);
}
