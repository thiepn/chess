/**
 * The board can receive a second pointer/keyboard input before React has
 * committed the previous accepted move. Its synchronous position ref, not
 * the rendered `position` state, is authoritative for new move validation.
 */
export interface LiveBoardPosition {
  current: string;
}

export function liveBoardFen(position: LiveBoardPosition): string {
  return position.current;
}

/** Commit only an accepted move; declined attempts retain the old position. */
export function recordAcceptedBoardFen(position: LiveBoardPosition, acceptedFen: string): void {
  position.current = acceptedFen;
}
