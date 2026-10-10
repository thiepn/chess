import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useExperience } from "../interaction/ExperienceProvider";
import type { BoardArrow, BoardHighlight, BoardTone } from "../learning/types";
import { nextBoardFocusIndex, type BoardNavigationKey } from "../interaction/board-navigation";
import { ChessPiece, chessPieceNames } from "./ChessPiece";
import { isBoardDrag, isBoardSquare } from "../interaction/board-pointer";


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
  const positionRef = useRef(fen);
  const [selected, setSelected] = useState<Square | null>(null);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [dragHover, setDragHover] = useState<Square | null>(null);
  const pointerGestureRef = useRef<{ pointerId: number; from: Square; x: number; y: number; dragging: boolean } | null>(null);
  const suppressNextClickRef = useRef(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [lastMoveKind, setLastMoveKind] = useState<"move" | "capture" | "promotion" | "castle">("move");
  const [secondaryMove, setSecondaryMove] = useState<{ from: Square; to: Square } | null>(null);
  const [boardFlipping, setBoardFlipping] = useState(false);
  const previousOrientation = useRef(orientation);
  const [rejected, setRejected] = useState<Square | null>(null);
  const [focusedSquare, setFocusedSquare] = useState<Square>(
    () => squareList(orientation)[0],
  );
  const squareRefs = useRef(new Map<Square, HTMLButtonElement>());
  const promotionFirstChoiceRef = useRef<HTMLButtonElement>(null);
  const promotionCancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (pendingPromotion) {
      window.requestAnimationFrame(() => promotionFirstChoiceRef.current?.focus());
    }
  }, [pendingPromotion]);
  const instructionsId = useId();
  const { feedback, settings } = useExperience();

  useEffect(() => {
    if (positionRef.current === fen) return;
    positionRef.current = fen;
    setPosition(fen);
    setSelected(null);
    setPendingPromotion(null);
    setDragFrom(null);
    setDragHover(null);
    pointerGestureRef.current = null;
    setLastMove(null);
    setSecondaryMove(null);
    setLastMoveKind("move");
    setRejected(null);
  }, [fen]);

  useEffect(() => {
    if (previousOrientation.current === orientation) return;
    previousOrientation.current = orientation;
    setBoardFlipping(true);
    const timer = window.setTimeout(() => setBoardFlipping(false), 190);
    return () => window.clearTimeout(timer);
  }, [orientation]);

  const chess = useMemo(() => new Chess(position), [position]);
  const squares = useMemo(() => squareList(orientation), [orientation]);

  useEffect(() => {
    setFocusedSquare((current) => squares.includes(current) ? current : squares[0]);
  }, [squares]);
  const legalTargets = useMemo(() => {
    const origin = dragFrom ?? selected;
    if (!origin || disabled) return new Set<Square>();
    return new Set(
      chess.moves({ square: origin, verbose: true }).map((move) => move.to),
    );
  }, [chess, disabled, dragFrom, selected]);

  const highlightMap = useMemo(
    () => new Map(highlights.map((item) => [item.square, item.tone])),
    [highlights],
  );

  const checkedKing = useMemo(() => {
    if (!chess.inCheck()) return null;
    const turn = chess.turn();

    const board = chess.board();
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board[row].length; col += 1) {
        const piece = board[row][col];
        if (piece?.type === "k" && piece.color === turn) {
          return `${files[col]}${8 - row}` as Square;
        }
      }
    }

    return null;
  }, [chess]);

  function requestMove(from: Square, to: Square) {
    if (disabled) return false;
    const promotions = chess.moves({ square: from, verbose: true })
      .filter((move) => move.to === to && Boolean(move.promotion));
    if (promotions.length) {
      setSelected(null);
      setPendingPromotion({ from, to });
      return false;
    }
    return tryMove(from, to);
  }

  function tryMove(from: Square, to: Square, promotion: "q" | "r" | "b" | "n" = "q") {
    if (disabled) return false;

    const candidate = new Chess(position);
    let move;

    try {
      move = candidate.move({ from, to, promotion });
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

    positionRef.current = candidate.fen();
    setPosition(candidate.fen());
    setPendingPromotion(null);
    setLastMove({ from, to });
    setLastMoveKind(
      castle
        ? "castle"
        : move.promotion
          ? "promotion"
          : move.captured
            ? "capture"
            : "move",
    );
    setSecondaryMove(castle);
    setSelected(null);
    setDragFrom(null);
    setDragHover(null);

    if (candidate.inCheck()) feedback("check");
    else if (move.promotion) feedback("promotion");
    else if (castle) feedback("castle");
    else if (move.captured) feedback("capture");
    else feedback("move");

    return true;
  }

  // Pointer Events support touch/pen chess moves without changing desktop HTML drag.
  function pointerSquare(event: ReactPointerEvent<HTMLButtonElement>): Square | null {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const candidate = target?.closest<HTMLElement>(".chess-board-v2 [data-square]")?.dataset.square;
    return isBoardSquare(candidate) ? candidate as Square : null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>, from: Square) {
    if (disabled || pendingPromotion || event.pointerType === "mouse" || !event.isPrimary) return;
    if (chess.get(from)?.color !== chess.turn()) return;
    pointerGestureRef.current = { pointerId: event.pointerId, from, x: event.clientX, y: event.clientY, dragging: false };
    try { event.currentTarget.setPointerCapture(event.pointerId); }
    catch { /* Synthetic tests cannot capture an untrusted pointer. */ }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const gesture = pointerGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (!gesture.dragging && !isBoardDrag(gesture.x, gesture.y, event.clientX, event.clientY)) return;
    if (!gesture.dragging) {
      gesture.dragging = true;
      setSelected(null);
      setDragFrom(gesture.from);
    }
    setDragHover(pointerSquare(event));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const gesture = pointerGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    pointerGestureRef.current = null;
    if (!gesture.dragging) return; // Tap goes through normal click selection.
    const target = pointerSquare(event);
    setDragFrom(null);
    setDragHover(null);
    suppressNextClickRef.current = true;
    window.setTimeout(() => { suppressNextClickRef.current = false; }, 0);
    if (target && target !== gesture.from) {
      setFocusedSquare(target);
      void requestMove(gesture.from, target);
    }
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    if (pointerGestureRef.current?.pointerId !== event.pointerId) return;
    pointerGestureRef.current = null;
    setDragFrom(null);
    setDragHover(null);
  }

  function focusSquare(square: Square) {
    setFocusedSquare(square);
    window.requestAnimationFrame(() => {
      squareRefs.current.get(square)?.focus();
    });
  }

  function handleSquareKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    square: Square,
  ) {
    if (event.key === "Escape" && pendingPromotion) {
      event.preventDefault();
      setPendingPromotion(null);
      return;
    }
    if (event.key === "Escape" && selected) {
      event.preventDefault();
      event.stopPropagation();
      setSelected(null);
      return;
    }

    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();
    const currentIndex = squares.indexOf(square);
    const nextIndex = nextBoardFocusIndex(
      currentIndex,
      event.key as BoardNavigationKey,
      squares.length,
    );
    focusSquare(squares[nextIndex]);
  }

  function selectSquare(square: Square) {
    setFocusedSquare(square);
    if (disabled) return;

    const piece = chess.get(square);
    if (selected) {
      if (square === selected) {
        setSelected(null);
        return;
      }
      if (legalTargets.has(square)) {
        void requestMove(selected, square);
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
    const parts = [
      piece
        ? `${square}, ${piece.color === "w" ? "white" : "black"} ${chessPieceNames[piece.type]}`
        : `${square}, empty`,
    ];

    if (selected === square) parts.push("selected");
    if (dragFrom === square) parts.push("dragging piece");
    if (dragHover === square) parts.push(legalTargets.has(square) ? "legal drop target" : "invalid drop target");
    if (legalTargets.has(square)) {
      parts.push(piece ? "legal capture target" : "legal move target");
    }
    if (checkedKing === square) parts.push("king in check");
    if (lastMove?.from === square) parts.push("last move origin");
    if (lastMove?.to === square) {
      parts.push(
        lastMoveKind === "capture"
          ? "last move destination, capture"
          : lastMoveKind === "promotion"
            ? "last move destination, promotion"
            : lastMoveKind === "castle"
              ? "last move destination, castling"
              : "last move destination",
      );
    }

    const tone = highlightMap.get(square);
    if (tone === "good") parts.push("recommended square");
    else if (tone === "danger") parts.push("danger square");
    else if (tone === "hint") parts.push("hint square");
    else if (tone === "focus") parts.push("focus square");

    return parts.join(", ");
  }

  const arrowStatus = arrows.length
    ? ` ${arrows
        .map(
          (arrow) =>
            `${arrow.tone ?? "focus"} arrow from ${arrow.from} to ${arrow.to}`,
        )
        .join(". ")}.`
    : "";

  const boardStatus = dragFrom
    ? `Dragging from ${dragFrom}. ${legalTargets.size} legal destinations.${arrowStatus}`
    : selected
    ? `${squareLabel(selected)}. ${legalTargets.size} legal move${legalTargets.size === 1 ? "" : "s"}.${arrowStatus}`
    : checkedKing
      ? `${chess.turn() === "w" ? "White" : "Black"} king is in check.${arrowStatus}`
      : lastMove
        ? `${
            lastMoveKind === "capture"
              ? "Capture"
              : lastMoveKind === "promotion"
                ? "Promotion"
                : lastMoveKind === "castle"
                  ? "Castling move"
                  : "Move"
          } from ${lastMove.from} to ${lastMove.to}.${arrowStatus}`
        : `No square selected.${arrowStatus}`;

  return (
    <div className="chess-board-wrap">
      <span id={instructionsId} className="sr-only">
        {disabled
          ? "Chessboard preview. Use arrow keys to inspect squares."
          : "Use arrow keys to move between squares. Press Enter or Space to select a piece or destination. Press Escape to clear a selected square. On touch, drag a piece or tap the piece and its destination."}
      </span>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {boardStatus}
      </span>
      <div
        className={`chess-board chess-board-v2 orientation-${orientation === "w" ? "white" : "black"}${boardFlipping ? " board-flipping" : ""}`}
        data-orientation={orientation}
        data-last-move-kind={lastMove ? lastMoveKind : undefined}
        role="grid"
        aria-rowcount={8}
        aria-colcount={8}
        aria-describedby={instructionsId}
        aria-label={`${disabled ? "Chessboard preview" : "Interactive chessboard"}. ${orientation === "w" ? "White" : "Black"} is at the bottom.`}
      >
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
          const isMoveOrigin =
            displayMove?.from === square || secondaryMove?.from === square;
          const isMoveDestination =
            displayMove?.to === square || secondaryMove?.to === square;
          const isLast = isMoveOrigin || isMoveDestination;
          const isChecked = checkedKing === square;
          const classes = [
            "board-square",
            dark ? "dark" : "light",
            tone ? toneClass(tone) : "",
            isSelected ? "selected" : "",
            !disabled && piece?.color === chess.turn() ? "board-movable" : "",
            dragFrom === square ? "board-drag-source" : "",
            dragFrom && isLegal ? "board-drag-legal" : "",
            dragFrom && dragHover === square ? "board-drag-hover" : "",
            isLegal ? "legal-target" : "",
            isLast ? "last-move" : "",
            isMoveOrigin ? "move-origin" : "",
            isMoveDestination ? "move-destination" : "",
            isMoveDestination ? `move-impact-${lastMoveKind}` : "",
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
              style={{
                touchAction: !disabled && piece?.color === chess.turn() ? "none" : "manipulation",
                cursor: dragFrom === square ? "grabbing" : !disabled && piece?.color === chess.turn() ? "grab" : undefined,
                outline: dragFrom === square
                  ? "3px solid #357bd8"
                  : dragFrom && dragHover === square
                    ? (isLegal ? "4px solid #328554" : "3px solid #c86464")
                    : undefined,
                outlineOffset: dragFrom === square || (dragFrom && dragHover === square) ? "-3px" : undefined,
              }}
              ref={(node) => {
                if (node) squareRefs.current.set(square, node);
                else squareRefs.current.delete(square);
              }}
              data-square={square}
              tabIndex={square === focusedSquare ? 0 : -1}
              aria-label={squareLabel(square)}
              aria-selected={isSelected}
              aria-disabled={disabled}
              onFocus={() => setFocusedSquare(square)}
              onKeyDown={(event) => handleSquareKeyDown(event, square)}
              onClick={() => {
                if (suppressNextClickRef.current) {
                  suppressNextClickRef.current = false;
                  return;
                }
                selectSquare(square);
              }}
              onPointerDown={(event) => handlePointerDown(event, square)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              draggable={!disabled && !!piece && piece.color === chess.turn()}
              onDragStart={(event) => {
                if (disabled || piece?.color !== chess.turn() || pendingPromotion) {
                  event.preventDefault();
                  return;
                }
                setSelected(null);
                setDragFrom(square);
              }}
              onDragOver={(event) => {
                if (dragFrom) {
                  event.preventDefault();
                  setDragHover(square);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragFrom && dragFrom !== square) void requestMove(dragFrom, square);
                setDragFrom(null);
                setDragHover(null);
              }}
              onDragEnd={() => { setDragFrom(null); setDragHover(null); }}
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
                      "piece-v2",
                      piece.color === "w" ? "white-piece" : "black-piece",
                      landingMove ? "piece-land" : "",
                      landingMove && displayMove?.to === square
                        ? `piece-land-${lastMoveKind}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={style}
                    aria-hidden="true"
                    data-piece={`${piece.color}${piece.type}`}
                  >
                    <ChessPiece
                      color={piece.color}
                      type={piece.type}
                      styleVariant={settings.pieceStyle}
                    />
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
                <path d="M0,0 L0.55,0.25 L0,0.5 Z" fill="#357bd8" />
              </marker>
              <marker id="arrow-good" markerWidth=".65" markerHeight=".65" refX=".5" refY=".25" orient="auto">
                <path d="M0,0 L0.55,0.25 L0,0.5 Z" fill="#5fa77a" />
              </marker>
              <marker id="arrow-danger" markerWidth=".65" markerHeight=".65" refX=".5" refY=".25" orient="auto">
                <path d="M0,0 L0.55,0.25 L0,0.5 Z" fill="#c86464" />
              </marker>
              <marker id="arrow-hint" markerWidth=".65" markerHeight=".65" refX=".5" refY=".25" orient="auto">
                <path d="M0,0 L0.55,0.25 L0,0.5 Z" fill="#c99c52" />
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
      {pendingPromotion && (
        <div className="board-promotion-picker" role="dialog" aria-modal="true"
          aria-label={"Choose promotion piece for " + pendingPromotion.from + " to " + pendingPromotion.to}
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              const first = promotionFirstChoiceRef.current;
              const last = promotionCancelRef.current;
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault(); last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first?.focus();
              }
              return;
            }
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            const from = pendingPromotion.from;
            setPendingPromotion(null);
            focusSquare(from);
          }}>
          <div className="board-promotion-caption">
            <strong>Choose promotion</strong>
            <small>{pendingPromotion.from} → {pendingPromotion.to}</small>
          </div>
          <div className="board-promotion-options">
            {([
              ["q", "Queen"], ["r", "Rook"], ["b", "Bishop"], ["n", "Knight"],
            ] as const).map(([piece, label], index) => (
              <button type="button" key={piece} className="board-promotion-choice"
                ref={index === 0 ? promotionFirstChoiceRef : undefined}
                aria-label={"Promote to " + label}
                onClick={() => {
                  const to = pendingPromotion.to;
                  if (tryMove(pendingPromotion.from, to, piece)) focusSquare(to);
                }}>
                <span className="board-promotion-piece" aria-hidden="true">
                  <ChessPiece color={chess.turn()} type={piece} styleVariant={settings.pieceStyle} />
                </span>
                <span>{label}</span>
              </button>
            ))}
            <button type="button" className="board-promotion-cancel" ref={promotionCancelRef} onClick={() => {
              const from = pendingPromotion.from;
              setPendingPromotion(null);
              focusSquare(from);
            }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
