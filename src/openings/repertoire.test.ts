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

  it("adds deeper compact branches without becoming an opening encyclopedia", () => {
    expect(pathToNode("italian-c3").map((node) => node.id)).toEqual([
      "white-start",
      "white-e4",
      "italian-e5",
      "italian-nf3",
      "italian-nc6",
      "italian-bc4",
      "italian-bc5",
      "italian-d3-bc5",
      "italian-d6",
      "italian-c3",
    ]);
    expect(pathToNode("black-caro-bf5").length).toBeGreaterThanOrEqual(8);
    expect(pathToNode("black-qgd-be7").length).toBeGreaterThanOrEqual(8);
  });

  it("inherits structure and tactical context down practical branches", () => {
    expect(openingNodes["italian-c3"].structure).toContain("e4/e5");
    expect(openingNodes["alapin-d4"].tacticalMotifs).toContain("d4 central break");
    expect(openingNodes["black-qgd-be7"].structure).toContain("d5/e6");
  });

  it("gives each repertoire a valid root and membership", () => {
    for (const repertoire of repertoires) {
      expect(openingNodes[repertoire.rootNodeId]).toBeTruthy();
      expect(repertoire.nodeIds).toContain(repertoire.rootNodeId);
    }
  });
});
