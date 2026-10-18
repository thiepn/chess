import { describe, expect, it } from "vitest";
import authored from "../../public/data/learning/transfer-v1.json";
import { assertP92ChallengeOwnership, p92ChallengeSkillIds } from "./p92ChallengeIntegrity";

describe("historical P92 source-v1 transfer ownership", () => {
  it("preserves all 26 authored challenge owners in the 49-row P88 catalog", () => {
    expect(authored.items).toHaveLength(49);
    expect(p92ChallengeSkillIds.size).toBe(26);
    expect(() => assertP92ChallengeOwnership(authored.items)).not.toThrow();
    expect(authored.items.filter(row => row.challenge)).toHaveLength(26);
  });

  it("fails closed when an existing independent transfer is omitted or nulled", () => {
    const removed = structuredClone(authored);
    const target = removed.items.find(row => row.challenge)!;
    delete (target as { challenge?: unknown }).challenge;
    expect(() => assertP92ChallengeOwnership(removed.items))
      .toThrow(/Incomplete authored P92 transfer/);

    const nulled = structuredClone(authored);
    (nulled.items.find(row => row.challenge)! as { challenge?: unknown }).challenge = null;
    expect(() => assertP92ChallengeOwnership(nulled.items))
      .toThrow(/Incomplete authored P92 transfer/);
  });

  it("rejects relocation to another lesson, malformed challenge and duplicate owners", () => {
    const shifted = structuredClone(authored);
    const first = shifted.items.find(row => row.challenge)!;
    const unexpected = shifted.items.find(row => !row.challenge)!;
    (unexpected as { challenge?: unknown }).challenge = first.challenge;
    delete (first as { challenge?: unknown }).challenge;
    expect(() => assertP92ChallengeOwnership(shifted.items))
      .toThrow(/Incomplete authored P92 transfer/);

    const malformed = structuredClone(authored);
    (malformed.items.find(row => row.challenge)! as { challenge?: unknown }).challenge = false;
    expect(() => assertP92ChallengeOwnership(malformed.items))
      .toThrow(/Incomplete authored P92 transfer/);

    const duplicate = structuredClone(authored);
    duplicate.items[1].skillId = duplicate.items[0].skillId;
    expect(() => assertP92ChallengeOwnership(duplicate.items))
      .toThrow(/Invalid historical P88 source identity/);
  });
});
