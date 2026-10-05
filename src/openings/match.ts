import type { ImportedGame } from "../games/types";
import { openingNodes, repertoires } from "./repertoire";
import type { OpeningDeviation, OpeningRepertoire } from "./types";

function candidateRepertoires(game: ImportedGame) {
  return repertoires.filter((repertoire) => repertoire.color === game.playerColor);
}

function branchFit(game: ImportedGame, repertoire: OpeningRepertoire) {
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

  return matched;
}

export function chooseRepertoireForGame(game: ImportedGame) {
  return candidateRepertoires(game)
    .map((repertoire) => ({
      repertoire,
      fit: branchFit(game, repertoire),
    }))
    .sort((a, b) => b.fit - a.fit)[0]?.repertoire;
}

export function openingDeviationsForGame(
  game: ImportedGame,
  occurredAt = new Date(),
): OpeningDeviation[] {
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

    // If the opponent leaves the curated tree, that is not the learner's
    // mistake. Stop tracking rather than treating unknown theory as failure.
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
