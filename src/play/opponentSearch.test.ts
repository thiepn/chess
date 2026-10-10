import { describe, expect, it } from "vitest";
import { opponentThinkBudgetMs } from "./opponentSearch";

describe("P83 opponent clock-aware response budgets", () => {
  const initial = { whiteMs: 600000, blackMs: 600000 };
  it("uses distinct, bounded difficulties without inventing Elo accuracy", () => {
    const times = [0, 3, 7, 13].map(skillLevel =>
      opponentThinkBudgetMs({ skillLevel }, "untimed", initial, "b"));
    expect(times).toEqual([300, 500, 850, 1400]);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
  it("allocates a small fraction of the actual opponent remaining clock", () => {
    expect(opponentThinkBudgetMs({ skillLevel: 13 }, "10+0",
      {whiteMs: 600000,blackMs: 3000}, "b")).toBe(150);
    expect(opponentThinkBudgetMs({ skillLevel: 13 }, "15+10",
      {whiteMs: 900000,blackMs: 15000}, "b")).toBe(500);
    expect(opponentThinkBudgetMs({ skillLevel: 13 }, "10+0",
      {whiteMs: 3600,blackMs: 600000}, "w")).toBe(150);
  });
  it("never creates NaN/non-finite opponent search time", () => {
    expect(opponentThinkBudgetMs({ skillLevel: 7 }, "10+0",
      {whiteMs: Infinity,blackMs: NaN}, "b")).toBe(150);
    expect(opponentThinkBudgetMs({ skillLevel: 0 }, "untimed",initial,"b")).toBe(300);
  });
});
