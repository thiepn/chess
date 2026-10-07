export type LibraryCollection =
  | "studies"
  | "positions"
  | "endgames"
  | "games";

export type LibraryResourceKind = "study" | "reference" | "game";

export interface LibraryRouteState {
  mode: "index" | "collection" | "workspace";
  collection?: LibraryCollection;
  resourceKind?: LibraryResourceKind;
  resourceId?: string;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function resolveLibraryRoute(path: string): LibraryRouteState {
  const normalized = path.replace(/\/$/, "") || "/library";
  if (normalized === "/library") return { mode: "index" };
  if (normalized === "/library/workspace") return { mode: "workspace" };

  const parts = normalized.split("/").filter(Boolean);
  if (parts[0] !== "library") return { mode: "index" };

  if (
    parts.length === 2 &&
    ["studies", "positions", "endgames", "games"].includes(parts[1])
  ) {
    return {
      mode: "collection",
      collection: parts[1] as LibraryCollection,
    };
  }

  if (parts.length >= 3) {
    const collection = parts[1];
    const resourceId = safeDecode(parts.slice(2).join("/"));

    if (collection === "studies") {
      return { mode: "workspace", resourceKind: "study", resourceId };
    }

    if (collection === "references") {
      return { mode: "workspace", resourceKind: "reference", resourceId };
    }

    if (collection === "games") {
      return { mode: "workspace", resourceKind: "game", resourceId };
    }
  }

  return { mode: "index" };
}

export function libraryCollectionPath(collection: LibraryCollection) {
  return `/library/${collection}`;
}

export function libraryStudyPath(studyId: string) {
  return `/library/studies/${encodeURIComponent(studyId)}`;
}

export function libraryReferencePath(referenceId: string) {
  return `/library/references/${encodeURIComponent(referenceId)}`;
}

export function libraryGamePath(gameId: string) {
  return `/library/games/${encodeURIComponent(gameId)}`;
}
