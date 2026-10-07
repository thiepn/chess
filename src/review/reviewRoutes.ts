export interface ReviewRouteState {
  mode: "index" | "game";
  gameId?: string;
}

export function resolveReviewRoute(path: string): ReviewRouteState {
  const normalized = path.replace(/\/$/, "") || "/review";
  if (normalized === "/review") return { mode: "index" };

  const prefix = "/review/";
  if (!normalized.startsWith(prefix)) return { mode: "index" };

  const encoded = normalized.slice(prefix.length);
  if (!encoded) return { mode: "index" };

  try {
    return { mode: "game", gameId: decodeURIComponent(encoded) };
  } catch {
    return { mode: "game", gameId: encoded };
  }
}

export function reviewGamePath(gameId: string) {
  return `/review/${encodeURIComponent(gameId)}`;
}
