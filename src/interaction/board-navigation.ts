export type BoardNavigationKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown"
  | "Home"
  | "End";

export function nextBoardFocusIndex(
  currentIndex: number,
  key: BoardNavigationKey,
  total = 64,
  width = 8,
) {
  if (total <= 0) return 0;

  const current = Math.max(
    0,
    Math.min(total - 1, currentIndex),
  );
  const rowStart =
    Math.floor(current / width) * width;
  const rowEnd = Math.min(
    total - 1,
    rowStart + width - 1,
  );

  if (key === "ArrowLeft") {
    return Math.max(rowStart, current - 1);
  }
  if (key === "ArrowRight") {
    return Math.min(rowEnd, current + 1);
  }
  if (key === "ArrowUp") {
    return Math.max(0, current - width);
  }
  if (key === "ArrowDown") {
    return Math.min(total - 1, current + width);
  }
  if (key === "Home") return rowStart;
  return rowEnd;
}
