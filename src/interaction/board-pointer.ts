/** Pixel hysteresis keeps ordinary taps from becoming accidental touch drags. */
export const BOARD_DRAG_THRESHOLD_PX = 10;

export function isBoardDrag(startX: number, startY: number, x: number, y: number) {
  const dx = x - startX;
  const dy = y - startY;
  return Number.isFinite(dx) && Number.isFinite(dy)
    && dx * dx + dy * dy >= BOARD_DRAG_THRESHOLD_PX ** 2;
}

/** Drop targets must be real chess squares, never labels, controls or external elements. */
export function isBoardSquare(value: string | undefined | null): value is string {
  return typeof value === "string" && /^[a-h][1-8]$/.test(value);
}
