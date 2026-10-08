import { memo, type ReactElement } from "react";
import type { Color, PieceSymbol } from "chess.js";
import type { PieceStyle } from "../interaction/types";

interface ChessPieceProps {
  color: Color;
  type: PieceSymbol;
  className?: string;
  styleVariant?: PieceStyle;
}

export const chessPieceNames: Record<PieceSymbol, string> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};

function PieceBase() {
  return (
    <>
      <path d="M25 76h50l7 10H18l7-10Z" className="piece-fill piece-outline" />
      <path d="M29 67h42l4 9H25l4-9Z" className="piece-fill piece-outline" />
    </>
  );
}

function Pawn() {
  return (
    <>
      <circle cx="50" cy="30" r="14" className="piece-fill piece-outline" />
      <path d="M42 43h16l7 24H35l7-24Z" className="piece-fill piece-outline" />
      <PieceBase />
    </>
  );
}

function Rook() {
  return (
    <>
      <path
        d="M28 22h10v8h8v-8h8v8h8v-8h10v18H28V22Z"
        className="piece-fill piece-outline"
      />
      <path d="M34 40h32l5 27H29l5-27Z" className="piece-fill piece-outline" />
      <path d="M34 46h32" className="piece-detail" />
      <PieceBase />
    </>
  );
}

function Knight() {
  return (
    <>
      <path
        d="M34 66c1-13 4-22 13-30l-5-12c13 1 27 8 34 20-6 3-10 7-13 13l5 10H34Z"
        className="piece-fill piece-outline"
      />
      <path
        d="M47 37c8 0 15 3 20 9-10 1-16 5-21 13"
        className="piece-detail"
      />
      <circle cx="57" cy="39" r="2.2" className="piece-eye" />
      <PieceBase />
    </>
  );
}

function Bishop() {
  return (
    <>
      <path
        d="M50 19c10 9 16 17 16 27 0 9-7 15-16 15s-16-6-16-15c0-10 6-18 16-27Z"
        className="piece-fill piece-outline"
      />
      <path d="M55 28 44 47" className="piece-detail bishop-cut" />
      <path d="M38 58h24l7 9H31l7-9Z" className="piece-fill piece-outline" />
      <PieceBase />
    </>
  );
}

function Queen() {
  return (
    <>
      <circle cx="28" cy="27" r="4" className="piece-fill piece-outline" />
      <circle cx="42" cy="20" r="4" className="piece-fill piece-outline" />
      <circle cx="58" cy="20" r="4" className="piece-fill piece-outline" />
      <circle cx="72" cy="27" r="4" className="piece-fill piece-outline" />
      <path
        d="M28 31 38 58h24l10-27-14 12-8-17-8 17-14-12Z"
        className="piece-fill piece-outline"
      />
      <path d="M36 55h28" className="piece-detail" />
      <PieceBase />
    </>
  );
}

function King() {
  return (
    <>
      <path d="M50 14v18M42 23h16" className="piece-detail king-cross" />
      <path
        d="M50 30c10 0 17 7 17 16 0 7-5 12-10 16h-14c-5-4-10-9-10-16 0-9 7-16 17-16Z"
        className="piece-fill piece-outline"
      />
      <path d="M38 58h24l7 9H31l7-9Z" className="piece-fill piece-outline" />
      <PieceBase />
    </>
  );
}

const pieceByType: Record<PieceSymbol, () => ReactElement> = {
  p: Pawn,
  r: Rook,
  n: Knight,
  b: Bishop,
  q: Queen,
  k: King,
};

// The 12 color/type SVG variants keep stable props through most board moves.
export const ChessPiece = memo(function ChessPiece({
  color,
  type,
  className = "",
  styleVariant = "classic",
}: ChessPieceProps) {
  const Shape = pieceByType[type];
  return (
    <svg
      className={[
        "chess-piece-svg",
        `chess-piece-${color}`,
        `piece-style-${styleVariant}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${color === "w" ? "White" : "Black"} ${chessPieceNames[type]}`}
      focusable="false"
    >
      <Shape />
    </svg>
  );
});
