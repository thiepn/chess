import { Chess, type Color } from "chess.js";
import { importPgn } from "../games/import";
import type { ImportedGame } from "../games/types";
import type { LichessPublicProfile } from "./types";

const API_ORIGIN = "https://lichess.org";

function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "");
}

function apiError(response: Response, action: string) {
  if (response.status === 429) {
    return new Error(
      "Lichess is rate-limiting requests. Wait about a minute before syncing again.",
    );
  }
  if (response.status === 404) {
    return new Error(`Lichess could not find that ${action}.`);
  }
  return new Error(
    `Lichess returned ${response.status} while loading ${action}.`,
  );
}

export async function fetchLichessProfile(
  usernameInput: string,
): Promise<LichessPublicProfile> {
  const username = normalizeUsername(usernameInput);
  if (!username) throw new Error("Enter a Lichess username.");

  const response = await fetch(
    `${API_ORIGIN}/api/user/${encodeURIComponent(username)}`,
    {
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) throw apiError(response, "user");
  const data = (await response.json()) as {
    id?: string;
    username?: string;
    title?: string;
    disabled?: boolean;
  };

  if (!data.id || !data.username) {
    throw new Error("Lichess returned an invalid user profile.");
  }

  return {
    id: data.id,
    username: data.username,
    title: data.title,
    disabled: data.disabled,
  };
}

function splitPgnBatch(value: string) {
  return value
    .trim()
    .split(/(?=\[Event\s+")/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function gameDateFromHeaders(headers: Record<string, string>) {
  const date = headers.UTCDate || headers.Date;
  if (!date || !/^\d{4}\.\d{2}\.\d{2}$/.test(date)) {
    return new Date().toISOString();
  }

  const time =
    headers.UTCTime && /^\d{2}:\d{2}:\d{2}$/.test(headers.UTCTime)
      ? headers.UTCTime
      : "12:00:00";
  const iso = `${date.replaceAll(".", "-")}T${time}Z`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

function lichessGameId(headers: Record<string, string>) {
  const site = headers.Site ?? "";
  const match = site.match(/lichess\.org\/([A-Za-z0-9]{8,12})/);
  return match?.[1]?.slice(0, 8);
}

function playerColorFor(
  headers: Record<string, string>,
  usernameInput: string,
): Color | null {
  const username = normalizeUsername(usernameInput).toLocaleLowerCase();
  const white = (headers.White ?? "").trim().toLocaleLowerCase();
  const black = (headers.Black ?? "").trim().toLocaleLowerCase();

  if (white === username) return "w";
  if (black === username) return "b";
  return null;
}

export function importLichessPgnBatch(
  text: string,
  username: string,
): ImportedGame[] {
  const games: ImportedGame[] = [];

  for (const pgn of splitPgnBatch(text)) {
    try {
      const chess = new Chess();
      chess.loadPgn(pgn, { strict: false });
      const headers = chess.getHeaders();
      const color = playerColorFor(headers, username);
      const externalId = lichessGameId(headers);

      if (!color || !externalId) continue;

      games.push(
        importPgn(pgn, color, gameDateFromHeaders(headers), {
          source: "lichess",
          externalId,
          externalUrl: `${API_ORIGIN}/${externalId}`,
        }),
      );
    } catch {
      // Skip malformed individual exports without failing the entire sync batch.
    }
  }

  return games.sort((a, b) => a.importedAt.localeCompare(b.importedAt));
}

export interface FetchRecentLichessGamesOptions {
  max?: number;
  since?: string;
}

async function fetchUserGamesText(
  username: string,
  options: FetchRecentLichessGamesOptions,
) {
  const params = new URLSearchParams();
  params.set("max", String(Math.max(1, Math.min(options.max ?? 12, 50))));
  params.set("moves", "true");
  params.set("clocks", "false");
  params.set("evals", "false");
  params.set("opening", "true");

  if (options.since) {
    const since = new Date(options.since).getTime();
    if (Number.isFinite(since)) {
      // Deliberate overlap prevents a game near the previous sync boundary
      // from being missed. Stable external IDs remove duplicates afterward.
      params.set("since", String(Math.max(0, since - 6 * 60 * 60 * 1000)));
    }
  }

  const primary = `${API_ORIGIN}/api/games/user/${encodeURIComponent(username)}?${params}`;
  let response = await fetch(primary, {
    headers: { Accept: "application/x-chess-pgn" },
  });

  // Lichess has occasionally had temporary routing regressions on the
  // documented endpoint. Keep the historical export route as a narrow
  // compatibility fallback rather than scraping HTML.
  if (response.status === 404) {
    const fallback = `${API_ORIGIN}/games/export/${encodeURIComponent(username)}?${params}`;
    response = await fetch(fallback, {
      headers: { Accept: "application/x-chess-pgn" },
    });
  }

  if (!response.ok) throw apiError(response, "recent games");
  return response.text();
}

export async function fetchRecentLichessGames(
  usernameInput: string,
  options: FetchRecentLichessGamesOptions = {},
) {
  const username = normalizeUsername(usernameInput);
  if (!username) throw new Error("Link a Lichess username before syncing.");

  const text = await fetchUserGamesText(username, options);
  return importLichessPgnBatch(text, username);
}

export function lichessProfileUrl(username: string) {
  return `${API_ORIGIN}/@/${encodeURIComponent(normalizeUsername(username))}`;
}

export function lichessPlayUrl() {
  return API_ORIGIN;
}
