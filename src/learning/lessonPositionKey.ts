/**
 * Chess position identity for independent lesson evidence. Halfmove and
 * fullmove counters are historical metadata, not a new tactical situation.
 * Retain pieces, side to move, castling and en-passant rights because they
 * can change which moves are legal.
 */
export function lessonPositionKey(fen: string): string {
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6)
    throw Error("Incomplete lesson FEN");
  return fields.slice(0, 4).join(" ");
}
