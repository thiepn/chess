import type { ImportedGame, ImportedGameSource } from "../games/types";

export type ReviewGameStatus = "all" | "reviewed" | "pending";
export type ReviewGameSource = "all" | ImportedGameSource;

export function reviewSourceLabel(game: Pick<ImportedGame, "source">): string {
  if (game.source === "lichess") return "Lichess";
  if (game.source === "training") return "Training";
  return "PGN import";
}

export function filterReviewGames(
  games: readonly ImportedGame[],
  query: string,
  status: ReviewGameStatus,
  source: ReviewGameSource,
): ImportedGame[] {
  const term = query.trim().toLocaleLowerCase();
  return games.filter((game) => {
    if (status === "reviewed" && !game.reviewStory) return false;
    if (status === "pending" && game.reviewStory) return false;
    if (source !== "all" && (game.source ?? "manual") !== source) return false;
    return !term || [
      game.white, game.black, game.openingName, game.event, game.id, game.externalId,
    ].some((field) => field?.toLocaleLowerCase().includes(term));
  }).sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

/** Original external provenance is linked only for an authenticated HTTPS Lichess host. */
export function reviewSourceLink(game: Pick<ImportedGame, "source" | "externalUrl">): string | null {
  if (game.source !== "lichess" || !game.externalUrl) return null;
  try {
    const url = new URL(game.externalUrl);
    if (url.protocol !== "https:" || url.hostname !== "lichess.org" ||
      url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
