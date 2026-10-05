import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { openingNodes, pathToNode, repertoires } from "./repertoire";

describe("opening repertoire", () => {
  it("contains only legal derived positions", () => {
    for (const node of Object.values(openingNodes)) {
      expect(() => new Chess(node.fen), node.id).not.toThrow();
    }
  });

  it("keeps parent-child links consistent", () => {
    for (const node of Object.values(openingNodes)) {
      for (const childId of node.children) {
        expect(openingNodes[childId]?.parentId).toBe(node.id);
      }
    }
  });

  it("builds an ordered path to the Italian repertoire move", () => {
    expect(pathToNode("italian-bc4").map((node) => node.id)).toEqual([
      "white-start",
      "white-e4",
      "italian-e5",
      "italian-nf3",
      "italian-nc6",
      "italian-bc4",
    ]);
  });

  it("gives each repertoire a valid root and membership", () => {
    for (const repertoire of repertoires) {
      expect(openingNodes[repertoire.rootNodeId]).toBeTruthy();
      expect(repertoire.nodeIds).toContain(repertoire.rootNodeId);
    }
  });
});
