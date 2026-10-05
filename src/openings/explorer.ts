import { openingNodes } from "./repertoire";
import type { OpeningExplorerPosition } from "./types";

export function repertoireExplorerPosition(
  nodeId: string,
): OpeningExplorerPosition | null {
  const node = openingNodes[nodeId];
  if (!node) return null;

  return {
    fen: node.fen,
    opening: {
      eco: node.eco,
      name: node.name,
    },
    source: "repertoire",
    moves: node.children.map((childId) => {
      const child = openingNodes[childId];
      return {
        uci: child.moveFromParent ?? "",
        san: child.sanFromParent ?? child.moveFromParent ?? "",
        source: "repertoire" as const,
        repertoireNodeId: child.id,
      };
    }),
  };
}
