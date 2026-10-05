import { Lightbulb, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import type { TrainingOutcome } from "../domain/types";
import type { SavedStudy } from "../library/types";
import type { BoardArrow } from "../learning/types";
import { ChessBoard } from "./ChessBoard";
import type { Square } from "chess.js";

interface SavedStudyTrainerProps {
  study: SavedStudy;
  onComplete: (outcome: TrainingOutcome) => void;
}

export function SavedStudyTrainer({
  study,
  onComplete,
}: SavedStudyTrainerProps) {
  const training = study.training;
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [boardVersion, setBoardVersion] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!training) {
    return <div className="empty-bank"><strong>This study is not in training.</strong></div>;
  }

  const arrows: BoardArrow[] = showHint
    ? [{
        from: training.targetMove.slice(0, 2) as Square,
        to: training.targetMove.slice(2, 4) as Square,
        tone: "hint",
      }]
    : [];

  function finish() {
    onComplete({
      success: true,
      quality: Math.max(.25, 1 - hintsUsed * .15 - wrongAttempts * .12),
      hintsUsed,
      wrongAttempts,
      studyId: study.id,
    });
  }

  return (
    <div className="lesson-runner saved-study-trainer">
      <div className="lesson-stage">
        <div className="lesson-board-column">
          <ChessBoard
            key={boardVersion}
            fen={study.fen}
            orientation={study.orientation}
            disabled={solved}
            arrows={arrows}
            onMove={(move) => {
              const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
              const accepted =
                uci === training.targetMove ||
                `${move.from}${move.to}` === training.targetMove.slice(0, 4);

              if (accepted) {
                setSolved(true);
                setFeedback(null);
                return true;
              }

              setWrongAttempts((value) => value + 1);
              setFeedback("That is legal, but it is not the move you chose to remember from this study.");
              return false;
            }}
          />
          <div className="board-caption">
            <span>Saved study</span>
            <span>{study.title}</span>
          </div>
        </div>

        <div className="lesson-instruction">
          <div>
            <p className="eyebrow">FROM YOUR LIBRARY</p>
            <h2>{solved ? training.targetSan : "Recover the key move."}</h2>
            <p className="lesson-prompt">
              {solved
                ? study.notes || "You recovered the move you marked as important."
                : study.notes || "You saved this position because it was worth remembering. Reconstruct the idea before moving."}
            </p>

            {!solved && showHint && (
              <div className="hint-card">
                <Lightbulb size={18} />
                <div>
                  <strong>Directional hint</strong>
                  <span>The saved target move is shown on the board.</span>
                </div>
              </div>
            )}

            {!solved && feedback && (
              <div className="lesson-feedback error">
                <span>{feedback}</span>
                <button type="button" onClick={() => {
                  setFeedback(null);
                  setBoardVersion((value) => value + 1);
                }}>
                  <RotateCcw size={15} /> Reset
                </button>
              </div>
            )}

            {solved && (
              <div className="lesson-feedback success">
                <Sparkles size={19} />
                <div>
                  <strong>{training.targetSan} — remembered.</strong>
                  <span>This position will be spaced farther out if recall stays reliable.</span>
                </div>
              </div>
            )}
          </div>

          <div className="lesson-controls">
            <div className="lesson-button-row">
              {!solved ? (
                <button
                  className="hint-button"
                  type="button"
                  onClick={() => {
                    if (!showHint) setHintsUsed((value) => value + 1);
                    setShowHint(true);
                  }}
                >
                  <Lightbulb size={16} /> {showHint ? "Hint shown" : "Show hint"}
                </button>
              ) : (
                <button className="primary" type="button" onClick={finish}>
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
