/**
 * A pointer or HTML drag belongs to the board at gesture start. If another
 * game, lesson, or accepted move changes the live FEN before drop, that old
 * drag must never act on the replacement board.
 *
 * Include move clocks intentionally: a new move on otherwise identical
 * geometry is still a distinct game/lesson state for an in-flight gesture.
 */
export function isGestureBoardCurrent(startFen: string | null, liveFen: string): boolean {
  return startFen !== null && startFen === liveFen;
}
