import type { MasterTimeline } from "./masterGames";

export interface TransferAnchor {
  gameId: string;
  checkpointId: string;
  ply: number;
  move: string;
  reply: string;
  continuation: string;
}
export interface TransferCase {
  id: string;
  theme: string;
  title: string;
  first: TransferAnchor;
  second: TransferAnchor;
  comparePrompt: string;
  model: string;
  resistancePrompt: string;
  transferPrompt: string;
  misconception: string;
  hints: string[];
  integrity: "source-linked-instructional-only";
}
export interface TransferCaseStudy {
  source: TransferCase;
  first: { game: MasterTimeline; fen: string; afterFen: string };
  second: { game: MasterTimeline; fen: string; afterFen: string };
}
/** The source of truth remains the original P113 PGN replay and checkpoint identities. */
export function hydrateTransferCases(payload: unknown, sourceGames: MasterTimeline[]) {
  const accepted: TransferCaseStudy[] = [];
  let rejected = 0;
  const issues: string[] = [];
  if (!payload || typeof payload !== "object" ||
      (payload as { version?: unknown }).version !== 1) return { accepted, rejected: 1 };
  const records = (payload as { cases?: unknown }).cases;
  if (!Array.isArray(records)) return { accepted, rejected: 1 };
  const byGame = new Map(sourceGames.map((item) => [item.game.id, item]));
  const ids = new Set<string>();
  const pin = (anchor: TransferAnchor) => {
    if (!anchor || typeof anchor.gameId !== "string" ||
        typeof anchor.checkpointId !== "string" || !Number.isInteger(anchor.ply)) return null;
    const game = byGame.get(anchor.gameId);
    if (!game || !game.game.checkpoints.some((item) =>
        item.id === anchor.checkpointId && item.ply === anchor.ply) ||
        anchor.ply < 0 || anchor.ply + 3 > game.sans.length ||
        game.sans[anchor.ply] !== anchor.move ||
        game.sans[anchor.ply + 1] !== anchor.reply ||
        game.sans[anchor.ply + 2] !== anchor.continuation) return null;
    return { game, fen: game.fens[anchor.ply], afterFen: game.fens[anchor.ply + 1] };
  };
  for (const entry of records) {
    try {
      const item = entry as TransferCase;
      if (!item || typeof item !== "object" ||
          !/^[a-z0-9-]{8,}$/.test(item.id) || ids.has(item.id) ||
          !item.title?.trim() || !item.theme?.trim() ||
          !item.comparePrompt?.trim() || !item.model?.trim() ||
          !item.resistancePrompt?.trim() || !item.transferPrompt?.trim() ||
          !item.misconception?.trim() || item.integrity !== "source-linked-instructional-only" ||
          !Array.isArray(item.hints) || item.hints.length < 2 ||
          item.hints.some((hint) => typeof hint !== "string" || hint.trim().length < 16)) {
        throw new Error("Incomplete original comparison");
      }
      const first = pin(item.first);
      const second = pin(item.second);
      if (!first || !second || first.game.game.id === second.game.game.id ||
          first.fen === second.fen) throw new Error("Unverified or duplicate source");
      ids.add(item.id);
      accepted.push({ source: item, first, second });
    } catch (error) {
      rejected++;
      issues.push(String((entry as {id?: string})?.id ?? "unknown") + ": " +
        (error instanceof Error ? error.message : "invalid source"));
    }
  }
  return { accepted, rejected, issues };
}
export const crossGameTransferAsset =
  `${import.meta.env.BASE_URL}data/model-games/p114-transfer-cases-v1.json`;
