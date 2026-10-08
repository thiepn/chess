/**
 * A chess move is defined by origin, destination AND promotion piece.
 * Collapsing to the first four UCI characters gives false credit for an
 * incorrect promotion (e.g. a7a8q !== a7a8n).
 * This helper only compares canonical, complete UCI move strings.
 */
export function sameUciMove(left?: string, right?: string): boolean {
  return Boolean(left && right && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(left) &&
    /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(right) && left === right);
}
