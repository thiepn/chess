/** Progressive windows avoid mounting hundreds of history rows at once. */
export const HISTORY_PAGE_SIZE = 40;

export function nextVisibleCount(
  total: number,
  current: number,
  increment = HISTORY_PAGE_SIZE,
): number {
  return Math.min(Math.max(0, total), Math.max(0, current) + Math.max(1, increment));
}
