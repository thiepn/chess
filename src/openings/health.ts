import type { ImportedGame } from "../games/types";
import {
  matchedRepertoireNodeIds,
} from "./match";
import { openingNodes } from "./repertoire";
import {
  repertoireMastery,
  trainableOpeningNodes,
} from "./progress";
import type {
  OpeningDeviation,
  OpeningProgress,
  OpeningRepertoire,
  RepertoireBranchHealth,
  RepertoireHealth,
} from "./types";

function ratio(
  numerator: number,
  denominator: number,
) {
  return denominator > 0
    ? numerator / denominator
    : 0;
}

function percent(value: number) {
  return Math.round(
    Math.max(0, Math.min(1, value)) *
      100,
  );
}

function nodeRecall(
  progress?: OpeningProgress,
) {
  if (!progress?.attempts) return 0;
  return (
    ratio(
      progress.successes,
      progress.attempts,
    ) *
      .6 +
    Math.min(1, progress.streak / 3) *
      .4
  );
}

function nodeConcept(
  progress?: OpeningProgress,
) {
  if (!progress?.conceptAttempts) return 0;
  return ratio(
    progress.conceptSuccesses ?? 0,
    progress.conceptAttempts,
  );
}

function nodeLine(
  progress?: OpeningProgress,
) {
  if (!progress?.lineAttempts) return 0;
  return ratio(
    progress.lineSuccesses ?? 0,
    progress.lineAttempts,
  );
}

export function repertoireHealth(
  repertoire: OpeningRepertoire,
  progress: Record<
    string,
    OpeningProgress
  >,
  deviations: OpeningDeviation[],
  games: ImportedGame[],
): RepertoireHealth {
  const root = openingNodes[repertoire.rootNodeId];
  const repertoireGames = games.filter((game) => {
    if (game.startingFen || game.playerColor !== repertoire.color) {
      return false;
    }
    if (repertoire.color === "w") {
      return true;
    }

    const expectedOpponentStarts = new Set(
      root.children
        .map((id) => openingNodes[id]?.moveFromParent)
        .filter((move): move is string => Boolean(move)),
    );
    return Boolean(
      game.moves[0]?.uci &&
      expectedOpponentStarts.has(game.moves[0].uci),
    );
  });
  const relevantDeviations =
    deviations.filter(
      (item) =>
        item.repertoireId ===
        repertoire.id,
    );

  const trainable =
    trainableOpeningNodes(repertoire);
  const conceptValues = trainable
    .map((node) =>
      nodeConcept(progress[node.id]),
    )
    .filter((value) => value > 0);
  const lineValues = trainable
    .map((node) =>
      nodeLine(progress[node.id]),
    )
    .filter((value) => value > 0);

  const branchCandidates =
    trainable.map((node) => {
      const gamesThroughNode =
        repertoireGames.filter((game) =>
          matchedRepertoireNodeIds(
            game,
            repertoire,
          ).includes(node.id),
        ).length;
      const nodeDeviations =
        relevantDeviations.filter(
          (item) =>
            item.nodeId === node.id,
        ).length;
      const recall =
        nodeRecall(progress[node.id]);
      const concept =
        nodeConcept(progress[node.id]);
      const gameScore =
        gamesThroughNode > 0
          ? 1 -
            Math.min(
              1,
              nodeDeviations /
                gamesThroughNode,
            )
          : .5;
      const evidenceWeight =
        gamesThroughNode > 0 ? .5 : .25;
      const health =
        gameScore * evidenceWeight +
        recall * .35 +
        concept *
          (1 - evidenceWeight - .35);

      return {
        nodeId: node.id,
        label: node.name,
        games: gamesThroughNode,
        deviations: nodeDeviations,
        deviationRate: percent(
          ratio(
            nodeDeviations,
            gamesThroughNode,
          ),
        ),
        recall: percent(recall),
        conceptRecall: percent(concept),
        health: percent(health),
      } satisfies RepertoireBranchHealth;
    });

  const branches = branchCandidates
    .filter(
      (branch) =>
        branch.games > 0 ||
        progress[branch.nodeId],
    )
    .sort(
      (a, b) =>
        a.health - b.health ||
        b.deviations - a.deviations,
    );

  const recallMastery =
    repertoireMastery(
      repertoire,
      progress,
    );
  const conceptMastery = percent(
    conceptValues.length
      ? conceptValues.reduce(
          (sum, value) => sum + value,
          0,
        ) / conceptValues.length
      : 0,
  );
  const lineMastery = percent(
    lineValues.length
      ? lineValues.reduce(
          (sum, value) => sum + value,
          0,
        ) / lineValues.length
      : 0,
  );
  const deviationRate = percent(
    ratio(
      relevantDeviations.length,
      repertoireGames.length,
    ),
  );
  const realGameScore =
    repertoireGames.length > 0
      ? 100 - deviationRate
      : 50;
  const health = Math.round(
    realGameScore * .5 +
      recallMastery * .3 +
      (conceptMastery || recallMastery) *
        .15 +
      (lineMastery || recallMastery) *
        .05,
  );

  return {
    repertoireId: repertoire.id,
    games: repertoireGames.length,
    deviations:
      relevantDeviations.length,
    deviationRate,
    recallMastery,
    conceptMastery,
    lineMastery,
    health,
    weakestBranch: branches[0],
    branches,
  };
}

export function nextRepertoireRepairNode(
  health: RepertoireHealth,
) {
  return health.weakestBranch
    ? openingNodes[
        health.weakestBranch.nodeId
      ]
    : undefined;
}
