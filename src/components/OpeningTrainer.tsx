import { ChevronRight, Lightbulb, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { TrainingOutcome } from "../domain/types";
import { openingNodes } from "../openings/repertoire";
import type { OpeningNode, OpeningRepertoire } from "../openings/types";
import type { BoardArrow, BoardHighlight } from "../learning/types";
import { ChessBoard } from "./ChessBoard";
import type { Square } from "chess.js";

interface OpeningTrainerProps {
  repertoire: OpeningRepertoire;
  node: OpeningNode;
  onComplete: (outcome: TrainingOutcome) => void;
}

export function OpeningTrainer({
  repertoire,
  node,
  onComplete,
}: OpeningTrainerProps) {
  const target = node.preferredChildId
    ? openingNodes[node.preferredChildId]
    : undefined;

  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [boardVersion, setBoardVersion] = useState(0);

  const hintArrows = useMemo<BoardArrow[]>(() => {
    if (!showHint || !target?.moveFromParent) return [];
    return [{
      from: target.moveFromParent.slice(0, 2) as Square,
      to: target.moveFromParent.slice(2, 4) as Square,
      tone: "hint",
    }];
  }, [showHint, target]);

  const hintHighlights = useMemo<BoardHighlight[]>(() => {
    if (!showHint || !target?.moveFromParent) return [];
    return [
      { square: target.moveFromParent.slice(0, 2) as Square, tone: "hint" },
      { square: target.moveFromParent.slice(2, 4) as Square, tone: "good" },
    ];
  }, [showHint, target]);

  if (!target?.moveFromParent) {
    return (
      <div className="empty-bank">
        <strong>No recall move is configured for this position.</strong>
      </div>
    );
  }

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
    const penalty = hintsUsed * .14 + wrongAttempts * .11;
    onComplete({
      success: true,
      quality: Math.max(.28, 1 - penalty),
      hintsUsed,
      wrongAttempts,
    });
  }

  return (
    <div className="lesson-runner opening-trainer">
      <div className="lesson-stage">
        <div className="lesson-board-column">
          <ChessBoard
            key={`${node.id}-${boardVersion}`}
            fen={node.fen}
            orientation={repertoire.color}
            disabled={solved}
            arrows={hintArrows}
            highlights={hintHighlights}
            onMove={(move) => {
              const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
              const expected = target.moveFromParent!;
              const accepted =
                uci === expected ||
                `${move.from}${move.to}` === expected.slice(0, 4);

              if (accepted) {
                setSolved(true);
                setFeedback(null);
                return true;
              }

              setWrongAttempts((value) => value + 1);
              setFeedback(
                "That move is playable, but it is not the move in your repertoire. Recover the plan rather than guessing the line.",
              );
              return false;
            }}
          />

          <div className="board-caption">
            <span>{repertoire.versus}</span>
            <span>{node.eco ?? "Repertoire position"}</span>
          </div>
        </div>

        <div className="lesson-instruction">
          <div>
            <p className="eyebrow">REPERTOIRE RECALL</p>
            <h2>{solved ? target.name : "What is your move?"}</h2>
            <p className="lesson-prompt">
              {solved
                ? target.purpose ?? "You recovered the planned continuation."
                : "Do not recall notation mechanically. Identify what the position is asking for, then play the repertoire move."}
            </p>

            {!solved && node.plans.length > 0 && (
              <div className="opening-plan-preview">
                <span>Position plan</span>
                <strong>{node.plans[0]}</strong>
              </div>
            )}

            {showHint && !solved && (
              <div className="hint-card">
                <Lightbulb size={18} />
                <div>
                  <strong>Directional hint</strong>
                  <span>The move is highlighted. Before playing it, say what it achieves.</span>
                </div>
              </div>
            )}

            {feedback && !solved && (
              <div className="lesson-feedback error">
                <span>{feedback}</span>
                <button type="button" onClick={reset}>
                  <RotateCcw size={15} /> Reset
                </button>
              </div>
            )}

            {solved && (
              <div className="lesson-feedback success">
                <Sparkles size={19} />
                <div>
                  <strong>{target.sanFromParent} — correct.</strong>
                  <span>
                    {target.plans[0] ??
                      target.purpose ??
                      "This continuation belongs to your core repertoire."}
                  </span>
                </div>
              </div>
            )}

            {solved && target.commonMistakes.length > 0 && (
              <div className="opening-warning">
                <span>Avoid</span>
                <strong>{target.commonMistakes[0]}</strong>
              </div>
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
