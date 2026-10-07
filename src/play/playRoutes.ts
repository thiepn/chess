import type { PlaySetup } from "./types";

export interface PlayRouteState {
  mode: "setup" | "game";
  gameKey?: string;
}

export function resolvePlayRoute(path: string): PlayRouteState {
  const normalized = path.replace(/\/$/, "") || "/play";
  if (normalized === "/play") return { mode: "setup" };

  const prefix = "/play/game/";
  if (!normalized.startsWith(prefix)) return { mode: "setup" };

  const encoded = normalized.slice(prefix.length);
  if (!encoded) return { mode: "setup" };

  try {
    return {
      mode: "game",
      gameKey: decodeURIComponent(encoded),
    };
  } catch {
    return {
      mode: "game",
      gameKey: encoded,
    };
  }
}

export function playGameKey(setup: PlaySetup) {
  return setup.scenarioId
    ? `scenario:${setup.scenarioId}:${setup.aiProfileId}`
    : `standard:${setup.playerColor}:${setup.aiProfileId}`;
}

export function playGamePath(setup: PlaySetup) {
  return `/play/game/${encodeURIComponent(playGameKey(setup))}`;
}

export function setupFromGameKey(gameKey: string): PlaySetup | undefined {
  const parts = gameKey.split(":");

  if (
    parts[0] === "standard" &&
    (parts[1] === "w" || parts[1] === "b") &&
    parts[2]
  ) {
    return {
      mode: "standard",
      playerColor: parts[1],
      aiProfileId: parts[2] as PlaySetup["aiProfileId"],
    };
  }

  if (parts[0] === "scenario" && parts.length >= 3) {
    const aiProfileId = parts.at(-1) as PlaySetup["aiProfileId"];
    const scenarioId = parts.slice(1, -1).join(":");
    return {
      mode: "replay",
      playerColor: "w",
      aiProfileId,
      scenarioId,
    };
  }

  return undefined;
}
