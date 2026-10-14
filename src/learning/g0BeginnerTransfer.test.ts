import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import originalLessons from "../../public/data/lessons/p116-lesson-content-v1.json";
import transfer from "../../public/data/learning/transfer-v1.json";
import { validateTransferCatalog } from "./transferCompletion";

const beginnerIds = [
  "rules.board", "rules.pieces", "rules.capture", "rules.check",
  "rules.check-responses", "rules.mate", "rules.castling", "rules.promotion",
  "fundamentals.values", "fundamentals.defended",
] as const;

describe("G0 original beginner-depth transfer", () => {
  it("retains P88's original 49 skill records and qualifies ten genuinely new boards", () => {
    const verified = validateTransferCatalog(transfer);
    expect(verified.size).toBe(49);
    expect([...verified.values()].filter(item => Boolean(item.challenge)).length).toBe(26);
    const seen = new Set<string>();
    for (const id of beginnerIds) {
      const original = originalLessons.seeds[id];
      const next = verified.get(id);
      expect(next?.challenge, id).toBeTruthy();
      const challenge = next!.challenge!;
      expect(challenge.fen).not.toBe(next!.fen);
      expect(challenge.fen).not.toBe(original.fen);
      expect(seen.has(challenge.fen)).toBe(false);
      seen.add(challenge.fen);
      const legal = new Chess(challenge.fen).moves({ verbose: true })
        .map(move => move.from + move.to + (move.promotion ?? ""));
      for (const move of challenge.acceptedMoves)
        expect(legal, id).toContain(move);
      expect(challenge.misconception.length).toBeGreaterThan(65);
      expect(challenge.success.length).toBeGreaterThan(65);
    }
  });
});
