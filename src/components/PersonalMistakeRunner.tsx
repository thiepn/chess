import { Chess, type Color, type Square } from "chess.js";
import { ChevronRight, Lightbulb, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { TrainingOutcome } from "../domain/types";
import type { PersonalMistake } from "../games/types";
import type { BoardArrow, BoardHighlight } from "../learning/types";
import { ChessBoard } from "./ChessBoard";

interface PersonalMistakeRunnerProps {
  mistake: PersonalMistake;
  onComplete: (outcome: TrainingOutcome) => void;
}

function sanFor(fen: string, uci: string) {
  const chess = new Chess(fen);
  try {
    return chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4, 5) || "q",
    })?.san ?? uci;
  } catch {
    return uci;
  }
}

function evalLabel(cp: number) {
  if (Math.abs(cp) > 90_000) return cp > 0 ? "winning" : "lost";
  const value = cp / 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

export function PersonalMistakeRunner({
  mistake,
  onComplete,
}: PersonalMistakeRunnerProps) {
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [boardVersion, setBoardVersion] = useState(0);

  const orientation = mistake.playerColor as Color;
  const bestSan = useMemo(
    () => sanFor(mistake.positionFen, mistake.bestMove),
    [mistake.bestMove, mistake.positionFen],
  );

  const hintArrows: BoardArrow[] = showHint
    ? [{
        from: mistake.bestMove.slice(0, 2) as Square,
        to: mistake.bestMove.slice(2, 4) as Square,
        tone: "hint",
      }]
    : [];

  const hintHighlights: BoardHighlight[] = showHint
    ? [
        { square: mistake.bestMove.slice(0, 2) as Square, tone: "hint" },
        { square: mistake.bestMove.slice(2, 4) as Square, tone: "good" },
      ]
    : [];

  function revealHint() {
    if (!showHint) setHintsUsed((value) => value + 1);
    setShowHint(true);
    setFeedback(null);
  }

  function reset() {
    setFeedback(null);
    setBoardVersion((value) => value + 1);
  }

  function finish() {
    const penalty = hintsUsed * .15 + wrongAttempts * .12;
    onComplete({
      success: true,
      quality: Math.max(.25, 1 - penalty),
      hintsUsed,
      wrongAttempts,
      mistakeId: mistake.id,
    });
  }

  return (
    <div className="lesson-runner mistake-runner">
      <div className="lesson-stage">
        <div className="lesson-board-column">
          <ChessBoard
            key={`${mistake.id}-${boardVersion}`}
            fen={mistake.positionFen}
            orientation={orientation}
            disabled={solved}
            highlights={hintHighlights}
            arrows={hintArrows}
            onMove={(move) => {
              const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
              const accepted =
                uci === mistake.bestMove ||
                `${move.from}${move.to}` === mistake.bestMove.slice(0, 4);

              if (accepted) {
                setSolved(true);
                setFeedback(null);
                return true;
              }

              setWrongAttempts((value) => value + 1);
              setFeedback("That is legal, but it does not repair the mistake. Re-read the position before moving again.");
              return false;
            }}
          />
          <div className="board-caption">
            <span>{orientation === "w" ? "White" : "Black"} to move</span>
            <span>From your game · move {mistake.moveNumber}</span>
          </div>
        </div>

        <div className="lesson-instruction">
          <div>
            <p className="eyebrow">FROM YOUR GAME</p>
            <h2>{solved ? "You found the repair." : "What should you play instead?"}</h2>
            <p className="lesson-prompt">
              {solved
                ? mistake.explanation
                : "You reached this exact position before. The move you played is hidden until you solve it again."}
            </p>

            {!solved && showHint && (
              <div className="hint-card">
                <Lightbulb size={18} />
                <div>
                  <strong>Directional hint</strong>
                  <span>The board now shows the best move's origin and destination. Explain the idea before playing it.</span>
                </div>
              </div>
            )}

            {!solved && feedback && (
              <div className="lesson-feedback error">
                <span>{feedback}</span>
                <button type="button" onClick={reset}>
                  <RotateCcw size={15} /> Reset
                </button>
              </div>
            )}

            {solved && (
              <>
                <div className="lesson-feedback success">
                  <Sparkles size={19} />
                  <div>
                    <strong>{bestSan} was stronger.</strong>
                    <span>
                      You played {mistake.actualSan}. The evaluation changed from {evalLabel(mistake.evaluationBefore)} to {evalLabel(mistake.evaluationAfter)}.
                    </span>
                  </div>
                </div>

                <div className="mistake-line">
                  <span>Your move</span>
                  <strong>{mistake.actualSan}</strong>
                  <span>Best move</span>
                  <strong>{bestSan}</strong>
                  <span>Loss</span>
                  <strong>{(mistake.centipawnLoss / 100).toFixed(1)} pawns</strong>
                </div>
              </>
            )}
          </div>

          <div className="lesson-controls">
            <div className="lesson-button-row">
              {!solved && (
                <button className="hint-button" type="button" onClick={revealHint}>
                  <Lightbulb size={16} />
                  {showHint ? "Hint shown" : "Show hint"}
                </button>
              )}
              {solved && (
                <button className="primary" type="button" onClick={finish}>
                  Continue <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
