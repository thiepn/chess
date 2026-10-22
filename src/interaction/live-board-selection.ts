/** A tap is evaluated against the latest committed board and selection. */
export type BoardTapAction = "ignore" | "clear" | "select" | "move" | "reject";

export function decideBoardTap(
  selected: string | null,
  target: string,
  occupantColor: "w" | "b" | null,
  sideToMove: "w" | "b",
  isLegalDestination: boolean,
): BoardTapAction {
  if (selected === target) return "clear";
  if (selected && isLegalDestination) return "move";
  if (occupantColor === sideToMove) return "select";
  return selected ? "reject" : "ignore";
}
