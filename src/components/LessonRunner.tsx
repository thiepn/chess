import { ChevronRight, Lightbulb, RotateCcw, Sparkles } from "lucide-react";
import type { Color } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import type { ChessSkill, TrainingActivity, TrainingOutcome } from "../domain/types";
import { lessonForSkill } from "../learning/lessons";
import type { BoardArrow, BoardHighlight } from "../learning/types";
import { ChessBoard } from "./ChessBoard";

interface LessonRunnerProps {
  activity: TrainingActivity;
  skill: ChessSkill;
  onComplete: (outcome: TrainingOutcome) => void;
}

export function LessonRunner({
  activity,
  skill,
  onComplete,
}: LessonRunnerProps) {
  const lesson = useMemo(
    () => lessonForSkill(skill.id, skill.title, skill.description, activity.activityType),
    [activity.activityType, skill.description, skill.id, skill.title],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [boardReset, setBoardReset] = useState(0);

  const step = lesson.steps[stepIndex];
  const isLast = stepIndex === lesson.steps.length - 1;
  const orientation = (step.fen.split(/\s+/)[1] === "b" ? "b" : "w") as Color;

  useEffect(() => {
    setStepIndex(0);
    setSolved(false);
    setShowHint(false);
    setHintsUsed(0);
    setWrongAttempts(0);
    setFeedback(null);
    setBoardReset((value) => value + 1);
  }, [lesson.id]);

  function nextStep() {
    if (isLast) {
      const penalty = hintsUsed * .12 + wrongAttempts * .1;
      onComplete({
        success: true,
        quality: Math.max(.35, 1 - penalty),
        hintsUsed,
        wrongAttempts,
      });
      return;
    }

    setStepIndex((value) => value + 1);
    setSolved(false);
    setShowHint(false);
    setFeedback(null);
    setBoardReset((value) => value + 1);
  }

  function revealHint() {
    if (!showHint) setHintsUsed((value) => value + 1);
    setShowHint(true);
    setFeedback(null);
  }

  function retry() {
    setSolved(false);
    setFeedback(null);
    setBoardReset((value) => value + 1);
  }

  const displayedHighlights: BoardHighlight[] = [
    ...(step.type === "explain" ? step.highlights ?? [] : []),
    ...(step.type === "move" && showHint ? step.hintHighlights ?? [] : []),
  ];

  const displayedArrows: BoardArrow[] = [
    ...(step.type === "explain" ? step.arrows ?? [] : []),
    ...(step.type === "move" && showHint ? step.hintArrows ?? [] : []),
  ];

  return (
    <div className="lesson-runner">
      <div className="lesson-stage">
        <div className="lesson-board-column">
          <ChessBoard
            key={`${step.id}-${boardReset}`}
            fen={step.fen}
            orientation={orientation}
            disabled={step.type === "explain" || solved}
            highlights={displayedHighlights}
            arrows={displayedArrows}
            onMove={(move) => {
              if (step.type !== "move") return false;
              const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
              const accepted = step.acceptedMoves.includes(uci) ||
                step.acceptedMoves.includes(`${move.from}${move.to}`);

              if (accepted) {
                setSolved(true);
                setFeedback(null);
                return true;
              }

              setWrongAttempts((value) => value + 1);
              setFeedback("That move is legal, but it does not solve this position. Look at what changed.");
              return false;
            }}
          />

          <div className="board-caption">
            <span>{orientation === "w" ? "White" : "Black"} perspective</span>
            <span>Tap a piece to see legal moves</span>
          </div>
        </div>

        <div className="lesson-instruction">
          <div>
            <p className="eyebrow">{step.eyebrow ?? "LESSON"}</p>
            <h2>{step.title}</h2>

            {step.type === "explain" ? (
              <p className="lesson-body">{step.body}</p>
            ) : (
              <>
                <p className="lesson-prompt">{step.prompt}</p>

                {showHint && !solved && (
                  <div className="hint-card">
                    <Lightbulb size={18} />
                    <div>
                      <strong>Hint</strong>
                      <span>{step.hint}</span>
                    </div>
                  </div>
                )}

                {feedback && !solved && (
                  <div className="lesson-feedback error">
                    <span>{feedback}</span>
                    <button type="button" onClick={retry}>
                      <RotateCcw size={15} /> Reset
                    </button>
                  </div>
                )}

                {solved && (
                  <div className="lesson-feedback success">
                    <div className="success-burst" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <Sparkles size={19} />
                    <div>
                      <strong>{step.successTitle}</strong>
                      <span>{step.successBody}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="lesson-controls">
            <div className="step-dots" aria-label={`Step ${stepIndex + 1} of ${lesson.steps.length}`}>
              {lesson.steps.map((item, index) => (
                <span
                  key={item.id}
                  className={
                    index < stepIndex
                      ? "done"
                      : index === stepIndex
                        ? "current"
                        : ""
                  }
                />
              ))}
            </div>

            <div className="lesson-button-row">
              {step.type === "move" && !solved && (
                <button className="hint-button" type="button" onClick={revealHint}>
                  <Lightbulb size={16} />
                  {showHint ? "Hint shown" : "Show hint"}
                </button>
              )}

              {(step.type === "explain" || solved) && (
                <button className="primary" type="button" onClick={nextStep}>
                  {isLast ? "Finish" : "Continue"} <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
