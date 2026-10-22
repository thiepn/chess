import { describe, expect, it } from "vitest";
import { sessionNoveltyAllowance } from "./sessionNovelty";

describe("short-session curriculum novelty admission", () => {
  it("can fit a complete first 10-minute lesson in a Quick session", () => {
    expect(sessionNoveltyAllowance("quick", 10)).toBe(10);
  });

  it("allows one 10-minute new concept within Standard without exceeding time budget", () => {
    expect(sessionNoveltyAllowance("standard", 25)).toBe(10);
    expect(sessionNoveltyAllowance("standard", 25)).toBeLessThan(25);
  });

  it("preserves the original long-session 28% ceiling", () => {
    expect(sessionNoveltyAllowance("deep", 60)).toBeCloseTo(16.8);
    expect(sessionNoveltyAllowance("deep", 60)).toBeLessThan(18);
  });

  it("never allows more novelty minutes than the whole available short session", () => {
    for (const budget of [0, 2, 4, 8, 10, 25]) {
      expect(sessionNoveltyAllowance("quick", budget)).toBeLessThanOrEqual(budget);
      expect(sessionNoveltyAllowance("standard", budget)).toBeLessThanOrEqual(budget);
      expect(sessionNoveltyAllowance("quick", budget)).toBeGreaterThanOrEqual(0);
    }
  });
});
