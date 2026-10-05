import type {
  OpeningProgress,
  OpeningRepertoire,
} from "./types";
import { openingNodes } from "./repertoire";

export function trainableOpeningNodes(repertoire: OpeningRepertoire) {
  return repertoire.nodeIds
    .map((id) => openingNodes[id])
    .filter(
      (node) =>
        node &&
        node.sideToMove === repertoire.color &&
        Boolean(node.preferredChildId),
    );
}

export function createOpeningProgress(
  nodeId: string,
  now = new Date(),
): OpeningProgress {
  return {
    nodeId,
    attempts: 0,
    successes: 0,
    streak: 0,
    nextReviewAt: now.toISOString(),
    lastQuality: 0,
  };
}

export function applyOpeningAttempt(
  previous: OpeningProgress,
  success: boolean,
  quality: number,
  now = new Date(),
): OpeningProgress {
  const streak = success ? previous.streak + 1 : 0;
  const intervalDays = success
    ? streak >= 5
      ? 45
      : streak === 4
        ? 21
        : streak === 3
          ? 7
          : streak === 2
            ? 3
            : 1
    : .2;

  return {
    ...previous,
    attempts: previous.attempts + 1,
    successes: previous.successes + (success ? 1 : 0),
    streak,
    lastAttemptAt: now.toISOString(),
    lastQuality: quality,
    nextReviewAt: new Date(
      now.getTime() + intervalDays * 86_400_000,
    ).toISOString(),
  };
}

export function dueOpeningNodes(
  repertoire: OpeningRepertoire,
  progress: Record<string, OpeningProgress>,
  now = new Date(),
) {
  return trainableOpeningNodes(repertoire)
    .filter((node) => {
      const item = progress[node.id];
      return !item || new Date(item.nextReviewAt) <= now;
    })
    .sort((a, b) => {
      const pa = progress[a.id];
      const pb = progress[b.id];

      const aNew = pa ? 0 : 1;
      const bNew = pb ? 0 : 1;
      if (aNew !== bNew) return aNew - bNew;

      const priority = { core: 3, common: 2, optional: 1 };
      return priority[b.priority] - priority[a.priority];
    });
}

export function repertoireMastery(
  repertoire: OpeningRepertoire,
  progress: Record<string, OpeningProgress>,
) {
  const nodes = trainableOpeningNodes(repertoire);
  if (!nodes.length) return 0;

  const total = nodes.reduce((sum, node) => {
    const item = progress[node.id];
    if (!item) return sum;
    const accuracy = item.attempts ? item.successes / item.attempts : 0;
    const retention = Math.min(1, item.streak / 3);
    return sum + (accuracy * .55 + retention * .45);
  }, 0);

  return Math.round((total / nodes.length) * 100);
}
