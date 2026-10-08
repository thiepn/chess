import { describe, expect, it } from "vitest";
import { HISTORY_PAGE_SIZE, nextVisibleCount } from "./pageWindow";

describe("P56 archive windowing", () => {
  it("advances in bounded batches while preserving access to every item", () => {
    const records = Array.from({ length: 103 }, (_, index) => index);
    let count = HISTORY_PAGE_SIZE;
    expect(records.slice(0, count)).toHaveLength(40);
    count = nextVisibleCount(records.length, count);
    expect(records.slice(0, count)).toHaveLength(80);
    count = nextVisibleCount(records.length, count);
    expect(count).toBe(103);
    expect(records.slice(0, count)).toEqual(records);
  });

  it("does not overflow the available collection and supports reset after filtering", () => {
    expect(nextVisibleCount(8, HISTORY_PAGE_SIZE)).toBe(8);
    expect(nextVisibleCount(0, HISTORY_PAGE_SIZE)).toBe(0);
    expect(nextVisibleCount(93, 0)).toBe(HISTORY_PAGE_SIZE);
    expect(nextVisibleCount(93, 40, 12)).toBe(52);
  });
});
