import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useExperience } from "../interaction/ExperienceProvider";
import type { BoardArrow, BoardHighlight, BoardTone } from "../learning/types";

interface BoardMove {
  from: Square;
  to: Square;
  san: string;
  fen: string;
  promotion?: string;
}

interface ChessBoardProps {
  fen: string;
  orientation?: Color;
  disabled?: boolean;
  highlights?: BoardHighlight[];
  arrows?: BoardArrow[];
  onMove?: (move: BoardMove) => boolean;
  presentationMove?: { from: Square; to: Square };
}

const pieces: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

function squareList(orientation: Color): Square[] {
  const ranks = orientation === "w" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const shownFiles = orientation === "w" ? files : [...files].reverse();
  return ranks.flatMap((rank) =>
    shownFiles.map((file) => `${file}${rank}` as Square),
  );
}

function toneClass(tone: BoardTone) {
  return `tone-${tone}`;
}

function arrowPoint(square: Square, orientation: Color) {
  const file = files.indexOf(square[0] as (typeof files)[number]);
  const rank = Number(square[1]);
  return orientation === "w"
    ? { x: file + .5, y: 8 - rank + .5 }
    : { x: 7 - file + .5, y: rank - 1 + .5 };
}

export function ChessBoard({
  fen,
  orientation = "w",
  disabled = false,
  highlights = [],
  arrows = [],
  onMove,
  presentationMove,
}: ChessBoardProps) {
  const [position, setPosition] = useState(fen);
  const [selected, setSelected] = useState<Square | null>(null);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [secondaryMove, setSecondaryMove] = useState<{ from: Square; to: Square } | null>(null);
  const [rejected, setRejected] = useState<Square | null>(null);
  const { feedback } = useExperience();

  useEffect(() => {
    setPosition(fen);
    setSelected(null);
    setLastMove(null);
    setSecondaryMove(null);
    setRejected(null);
  }, [fen]);

  const chess = useMemo(() => new Chess(position), [position]);
  const squares = useMemo(() => squareList(orientation), [orientation]);
  const legalTargets = useMemo(() => {
    if (!selected || disabled) return new Set<Square>();
    return new Set(
      chess.moves({ square: selected, verbose: true }).map((move) => move.to),
    );
  }, [chess, disabled, selected]);

  const highlightMap = useMemo(
    () => new Map(highlights.map((item) => [item.square, item.tone])),
    [highlights],
  );

  const checkedKing = useMemo(() => {
    if (!chess.inCheck()) return null;
    const turn = chess.turn();

    for (const row of chess.board()) {
      for (const piece of row) {
        if (piece?.type === "k" && piece.color === turn) return piece.square;
      }
    }

    return null;
  }, [chess]);

  function tryMove(from: Square, to: Square) {
    if (disabled) return false;

    const candidate = new Chess(position);
    let move;

    try {
      move = candidate.move({ from, to, promotion: "q" });
    } catch {
      move = null;
    }

    if (!move) {
      setRejected(to);
      feedback("error");
      window.setTimeout(() => setRejected(null), 260);
      return false;
    }

    const accepted =
      onMove?.({
        from,
        to,
        san: move.san,
        fen: candidate.fen(),
        promotion: move.promotion,
      }) ?? true;

    if (!accepted) {
      setRejected(to);
      setSelected(null);
      feedback("error");
      window.setTimeout(() => setRejected(null), 300);
      return false;
    }

    const castle =
      move.piece === "k" && Math.abs(move.to.charCodeAt(0) - move.from.charCodeAt(0)) === 2
        ? move.to[0] === "g"
          ? {
              from: `h${move.from[1]}` as Square,
              to: `f${move.from[1]}` as Square,
            }
          : {
              from: `a${move.from[1]}` as Square,
              to: `d${move.from[1]}` as Square,
            }
        : null;

    setPosition(candidate.fen());
    setLastMove({ from, to });
    setSecondaryMove(castle);
    setSelected(null);

    if (candidate.inCheck()) feedback("check");
    else if (move.captured) feedback("capture");
    else feedback("move");

    return true;
  }

  function selectSquare(square: Square) {
    if (disabled) return;

    const piece = chess.get(square);
    if (selected) {
      if (square === selected) {
        setSelected(null);
        return;
      }
      if (legalTargets.has(square)) {
        void tryMove(selected, square);
        return;
      }
      if (piece?.color === chess.turn()) {
        setSelected(square);
        return;
      }
      setRejected(square);
      feedback("error");
      window.setTimeout(() => setRejected(null), 260);
      return;
    }

    if (piece?.color === chess.turn()) {
      setSelected(square);
      feedback("select");
    }
  }

  function squareLabel(square: Square) {
    const piece = chess.get(square);
    if (!piece) return `${square}, empty`;
    const names: Record<PieceSymbol, string> = {
      k: "king",
      q: "queen",
      r: "rook",
      b: "bishop",
      n: "knight",
      p: "pawn",
    };
    return `${square}, ${piece.color === "w" ? "white" : "black"} ${names[piece.type]}`;
  }

  return (
    <div className="chess-board-wrap">
      <div className="chess-board" role="grid" aria-label="Interactive chessboard">
        {squares.map((square, index) => {
          const piece = chess.get(square);
          const file = square.charCodeAt(0) - 97;
          const rank = Number(square[1]);
          const dark = (file + rank) % 2 === 1;
          const tone = highlightMap.get(square);
          const isSelected = selected === square;
          const isLegal = legalTargets.has(square);
          const displayMove = lastMove ?? presentationMove;
          const isSecondary =
            secondaryMove?.from === square || secondaryMove?.to === square;
          const isLast =
            displayMove?.from === square ||
            displayMove?.to === square ||
            isSecondary;
          const isChecked = checkedKing === square;
          const classes = [
            "board-square",
            dark ? "dark" : "light",
            tone ? toneClass(tone) : "",
            isSelected ? "selected" : "",
            isLegal ? "legal-target" : "",
            isLast ? "last-move" : "",
            rejected === square ? "rejected" : "",
            isChecked ? "in-check" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const col = index % 8;
          const row = Math.floor(index / 8);
          const showFile = row === 7;
          const showRank = col === 0;

          return (
            <button
              type="button"
              role="gridcell"
              key={square}
              className={classes}
              aria-label={squareLabel(square)}
              aria-selected={isSelected}
              onClick={() => selectSquare(square)}
              draggable={!disabled && !!piece && piece.color === chess.turn()}
              onDragStart={() => setDragFrom(square)}
              onDragOver={(event) => {
                if (dragFrom) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragFrom) void tryMove(dragFrom, square);
                setDragFrom(null);
              }}
              onDragEnd={() => setDragFrom(null)}
            >
              {piece && (() => {
                const landingMove =
                  displayMove?.to === square
                    ? displayMove
                    : secondaryMove?.to === square
                      ? secondaryMove
                      : null;
                const start = landingMove
                  ? arrowPoint(landingMove.from, orientation)
                  : null;
                const end = landingMove
                  ? arrowPoint(landingMove.to, orientation)
                  : null;
                const style = start && end
                  ? {
                      "--piece-dx": `${(start.x - end.x) * 100}%`,
                      "--piece-dy": `${(start.y - end.y) * 100}%`,
                    } as CSSProperties
                  : undefined;

                return (
                  <span
                    className={[
                      "piece",
                      piece.color === "w" ? "white-piece" : "black-piece",
                      landingMove ? "piece-land" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={style}
                    aria-hidden="true"
                  >
                    {pieces[piece.color][piece.type]}
                  </span>
                );
              })()}
              {isLegal && <span className={piece ? "capture-ring" : "move-dot"} aria-hidden="true" />}
              {showFile && <span className="file-label" aria-hidden="true">{square[0]}</span>}
              {showRank && <span className="rank-label" aria-hidden="true">{square[1]}</span>}
            </button>
          );
        })}

        {arrows.length > 0 && (
          <svg
            className="board-arrows"
            viewBox="0 0 8 8"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <marker id="arrow-focus" markerWidth=".65" markerHeight=".65" refX=".5" refY=".25" orient="auto">
                <path d="M0,0 L0.55,0.25 L0,0.5 Z" fill="#829cff" />
              </marker>
              <marker id="arrow-good" markerWidth=".65" markerHeight=".65" refX=".5" refY=".25" orient="auto">
                <path d="M0,0 L0.55,0.25 L0,0.5 Z" fill="#57d49b" />
              </marker>
              <marker id="arrow-danger" markerWidth=".65" markerHeight=".65" refX=".5" refY=".25" orient="auto">
                <path d="M0,0 L0.55,0.25 L0,0.5 Z" fill="#ff758d" />
              </marker>
              <marker id="arrow-hint" markerWidth=".65" markerHeight=".65" refX=".5" refY=".25" orient="auto">
                <path d="M0,0 L0.55,0.25 L0,0.5 Z" fill="#ffc96b" />
              </marker>
            </defs>
            {arrows.map((arrow, index) => {
              const start = arrowPoint(arrow.from, orientation);
              const end = arrowPoint(arrow.to, orientation);
              const tone = arrow.tone ?? "focus";
              return (
                <line
                  key={`${arrow.from}-${arrow.to}-${index}`}
                  className={`board-arrow ${toneClass(tone)}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  markerEnd={`url(#arrow-${tone})`}
                />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
