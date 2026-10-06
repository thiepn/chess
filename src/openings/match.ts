import type { ImportedGame } from "../games/types";
import { openingNodes, repertoires } from "./repertoire";
import type {
  GameOpeningIdentity,
  OpeningDeviation,
  OpeningRepertoire,
} from "./types";

function candidateRepertoires(game: ImportedGame) {
  return repertoires.filter((repertoire) => repertoire.color === game.playerColor);
}

function branchMatch(game: ImportedGame, repertoire: OpeningRepertoire) {
  let node = openingNodes[repertoire.rootNodeId];
  let matched = 0;

  for (const move of game.moves) {
    const child = node.children
      .map((id) => openingNodes[id])
      .find((item) => item.moveFromParent === move.uci);

    if (!child) break;
    matched += 1;
    node = child;
  }

  return { matched, node };
}

function branchFit(game: ImportedGame, repertoire: OpeningRepertoire) {
  return branchMatch(game, repertoire).matched;
}

export function chooseRepertoireForGame(game: ImportedGame) {
  if (game.startingFen) return undefined;

  return candidateRepertoires(game)
    .map((repertoire) => ({
      repertoire,
      fit: branchFit(game, repertoire),
    }))
    .sort((a, b) => b.fit - a.fit)[0]?.repertoire;
}

function openingFamily(name: string) {
  return name
    .replace(/\s*:\s*.+$/, "")
    .replace(/\s*,\s*.+$/, "")
    .trim();
}

export function openingIdentityForGame(
  game: ImportedGame,
): GameOpeningIdentity {
  const headerName = game.openingName?.trim();
  if (headerName) {
    return {
      key: `header:${openingFamily(headerName).toLocaleLowerCase()}`,
      label: openingFamily(headerName),
      eco: game.eco,
      source: "header" as const,
    };
  }

  if (game.startingFen) {
    return {
      key: "position:start-fen",
      label: "Custom position",
      source: "position" as const,
    };
  }

  const best = candidateRepertoires(game)
    .map((repertoire) => {
      const match = branchMatch(game, repertoire);
      return {
        repertoire,
        fit: match.matched,
        node: match.node,
      };
    })
    .sort((a, b) => b.fit - a.fit)[0];

  if (best && best.fit > 0) {
    return {
      key: `repertoire:${best.repertoire.id}`,
      label:
        best.fit >= 2 && best.node.name
          ? openingFamily(best.node.name)
          : best.repertoire.name,
      eco: best.node.eco,
      repertoireId: best.repertoire.id,
      matchedPlies: best.fit,
      source: "repertoire" as const,
    };
  }

  const first = game.moves[0]?.uci;
  const second = game.moves[1]?.uci;
  const label =
    first === "e2e4" && second === "c7c5"
      ? "Sicilian Defense"
      : first === "e2e4" && second === "e7e5"
        ? "Open Game"
        : first === "e2e4" && second === "e7e6"
          ? "French Defense"
          : first === "e2e4" && second === "c7c6"
            ? "Caro-Kann Defense"
            : first === "d2d4" && second === "d7d5"
              ? "Queen's Pawn Game"
              : first === "d2d4"
                ? "Queen's Pawn Game"
                : first === "c2c4"
                  ? "English Opening"
                  : first === "g1f3"
                    ? "Réti Opening"
                    : "Other opening";

  return {
    key: `fallback:${label.toLocaleLowerCase()}`,
    label,
    source: "fallback" as const,
  };
}

export function openingDeviationsForGame(
  game: ImportedGame,
  occurredAt = new Date(),
): OpeningDeviation[] {
  if (game.startingFen) return [];

  const repertoire = chooseRepertoireForGame(game);
  if (!repertoire) return [];

  const deviations: OpeningDeviation[] = [];
  let node = openingNodes[repertoire.rootNodeId];

  for (const move of game.moves) {
    const children = node.children.map((id) => openingNodes[id]);
    const matchingChild = children.find(
      (child) => child.moveFromParent === move.uci,
    );

    if (matchingChild) {
      if (
        node.sideToMove === repertoire.color &&
        node.preferredChildId &&
        matchingChild.id !== node.preferredChildId
      ) {
        deviations.push({
          id: `${game.id}:opening:${move.ply}`,
          gameId: game.id,
          repertoireId: repertoire.id,
          nodeId: node.id,
          ply: move.ply,
          expectedMoves: [openingNodes[node.preferredChildId].moveFromParent!],
          playedMove: move.uci,
          occurredAt: occurredAt.toISOString(),
          resolved: false,
        });
      }

      node = matchingChild;
      continue;
    }

    if (node.sideToMove !== repertoire.color) break;

    if (node.preferredChildId) {
      deviations.push({
        id: `${game.id}:opening:${move.ply}`,
        gameId: game.id,
        repertoireId: repertoire.id,
        nodeId: node.id,
        ply: move.ply,
        expectedMoves: [openingNodes[node.preferredChildId].moveFromParent!],
        playedMove: move.uci,
        occurredAt: occurredAt.toISOString(),
        resolved: false,
      });
    }
    break;
  }

  return deviations;
}
