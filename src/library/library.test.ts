import { describe, expect, it } from "vitest";
import { referenceStudies, validateReferenceStudies } from "./references";
import {
  applyStudyAttempt,
  createStudyTraining,
  dueStudyTraining,
} from "./progress";
import {
  appendWorkspaceMove,
  fenAtCursor,
  loadFenLine,
  loadPgnLine,
  lineToPgn,
} from "./workspace";
import type { SavedStudy } from "./types";

describe("library workspace", () => {
  it("keeps every built-in reference loadable", () => {
    expect(validateReferenceStudies()).toBe(true);
    expect(referenceStudies.some((item) => item.kind === "game")).toBe(true);
  });

  it("supports branching from a PGN position", () => {
    const line = loadPgnLine("1. e4 e5 2. Nf3 Nc6 *");
    const branched = appendWorkspaceMove(line, 2, "g1", "f3");
    expect(branched.moves).toHaveLength(3);
    expect(fenAtCursor(branched, 3)).toContain(" b ");
    expect(lineToPgn(branched)).toContain("Nf3");
  });

  it("loads arbitrary legal FEN positions", () => {
    const line = loadFenLine("4k3/8/8/8/8/8/4K3/8 w - - 0 1");
    expect(line.baseFen).toContain("4k3");
  });

  it("spaces promoted study positions after retrieval", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    const training = createStudyTraining(
      "calculation.candidates",
      "e2e4",
      "e4",
      now,
    );
    const after = applyStudyAttempt(training, true, 1, now);

    const study: SavedStudy = {
      id: "s1",
      title: "Candidate move",
      kind: "position",
      fen: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1",
      notes: "",
      tags: [],
      source: "personal",
      orientation: "w",
      arrows: [],
      highlights: [],
      training: after,
      favorite: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    expect(dueStudyTraining([study], now)).toHaveLength(0);
    expect(new Date(after.nextReviewAt).getTime()).toBeGreaterThan(now.getTime());
  });
});
