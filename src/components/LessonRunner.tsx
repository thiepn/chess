import {
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Color } from "chess.js";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ChessSkill,
  TrainingActivity,
  TrainingOutcome,
} from "../domain/types";
import { lessonForSkill } from "../learning/lessons";
import { summarizeLessonMastery } from "../learning/mastery";
import type {
  BoardArrow,
  BoardHighlight,
  LessonStep,
  LessonStepResult,
} from "../learning/types";
import { emitExperienceEvent } from "../interaction/events";
import { ChessBoard } from "./ChessBoard";

interface LessonRunnerProps {
  activity: TrainingActivity;
  skill: ChessSkill;
  onComplete: (
    outcome: TrainingOutcome,
  ) => void;
}

function stepLabel(step: LessonStep) {
  const labels = {
    model: "Concept model",
    example: "Worked example",
    contrast: "Contrast",
    check: "Concept check",
    guided: "Guided practice",
    retrieval: "Independent retrieval",
    transfer: "Transfer",
    takeaway: "Takeaway",
  } as const;
  return labels[step.stage];
}

export function LessonRunner({
  activity,
  skill,
  onComplete,
}: LessonRunnerProps) {
  const lesson = useMemo(
    () =>
      lessonForSkill(
        skill.id,
        skill.title,
        skill.description,
        activity.activityType,
      ),
    [
      activity.activityType,
      skill.description,
      skill.id,
      skill.title,
    ],
  );

  const [stepIndex, setStepIndex] =
    useState(0);
  const [solved, setSolved] =
    useState(false);
  const [
    stepHintsUsed,
    setStepHintsUsed,
  ] = useState(0);
  const [
    totalHintsUsed,
    setTotalHintsUsed,
  ] = useState(0);
  const [
    stepWrongAttempts,
    setStepWrongAttempts,
  ] = useState(0);
  const [
    totalWrongAttempts,
    setTotalWrongAttempts,
  ] = useState(0);
  const [feedback, setFeedback] =
    useState<string | null>(null);
  const [
    selectedOption,
    setSelectedOption,
  ] = useState<string | null>(null);
  const [boardReset, setBoardReset] =
    useState(0);
  const [results, setResults] =
    useState<LessonStepResult[]>([]);

  const step = lesson.steps[stepIndex];
  const isLast =
    stepIndex === lesson.steps.length - 1;
  const orientation = (
    step.fen.split(/\s+/)[1] === "b"
      ? "b"
      : "w"
  ) as Color;

  useEffect(() => {
    setStepIndex(0);
    setSolved(false);
    setStepHintsUsed(0);
    setTotalHintsUsed(0);
    setStepWrongAttempts(0);
    setTotalWrongAttempts(0);
    setFeedback(null);
    setSelectedOption(null);
    setResults([]);
    setBoardReset((value) => value + 1);
  }, [lesson.id]);

  function recordResult(
    item: LessonStepResult,
  ) {
    setResults((previous) => [
      ...previous.filter(
        (result) =>
          result.stepId !== item.stepId,
      ),
      item,
    ]);
  }

  function resetStepState() {
    setSolved(false);
    setStepHintsUsed(0);
    setStepWrongAttempts(0);
    setFeedback(null);
    setSelectedOption(null);
    setBoardReset((value) => value + 1);
  }

  function nextStep() {
    if (isLast) {
      const mastery =
        summarizeLessonMastery(results);
      onComplete({
        success: mastery.masteryPassed,
        quality: mastery.masteryQuality,
        hintsUsed: totalHintsUsed,
        wrongAttempts:
          totalWrongAttempts,
        lessonEvidence: mastery,
      });
      return;
    }

    setStepIndex(
      (value) => value + 1,
    );
    resetStepState();
  }

  function revealHint() {
    if (step.type !== "move") return;
    if (
      stepHintsUsed >= step.hints.length
    ) {
      return;
    }
    setStepHintsUsed(
      (value) => value + 1,
    );
    setTotalHintsUsed(
      (value) => value + 1,
    );
    setFeedback(null);
    emitExperienceEvent({ feedback: "reveal" });
  }

  function retry() {
    setSolved(false);
    setFeedback(null);
    setSelectedOption(null);
    setBoardReset(
      (value) => value + 1,
    );
  }

  function answerChoice(
    optionId: string,
  ) {
    if (
      step.type !== "choice" ||
      solved
    ) {
      return;
    }

    setSelectedOption(optionId);
    const option = step.options.find(
      (item) => item.id === optionId,
    );
    if (!option) return;

    if (
      optionId === step.correctOptionId
    ) {
      setSolved(true);
      setFeedback(null);
      recordResult({
        stepId: step.id,
        support: step.support,
        correct: true,
        firstTry:
          stepWrongAttempts === 0,
        hintsUsed: 0,
        wrongAttempts:
          stepWrongAttempts,
      });
      return;
    }

    setStepWrongAttempts(
      (value) => value + 1,
    );
    setTotalWrongAttempts(
      (value) => value + 1,
    );
    setFeedback(option.feedback);
  }

  const revealedHints =
    step.type === "move"
      ? step.hints.slice(
          0,
          stepHintsUsed,
        )
      : [];
  const latestHint =
    revealedHints.at(-1);

  const displayedHighlights: BoardHighlight[] =
    [
      ...(step.type === "explain"
        ? step.highlights ?? []
        : []),
      ...(step.type === "move" &&
      latestHint
        ? latestHint.highlights ?? []
        : []),
    ];

  const displayedArrows: BoardArrow[] = [
    ...(step.type === "explain"
      ? step.arrows ?? []
      : []),
    ...(step.type === "move" &&
    latestHint
      ? latestHint.arrows ?? []
      : []),
  ];

  const masteryPreview =
    summarizeLessonMastery(results);

  return (
    <div className="lesson-runner lesson-runner-v2">
      <div className="lesson-progress-rail">
        {lesson.steps.map(
          (item, index) => (
            <div
              key={item.id}
              className={[
                "lesson-progress-stage",
                index < stepIndex
                  ? "done"
                  : "",
                index === stepIndex
                  ? "current"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>
                {index < stepIndex ? (
                  <CheckCircle2
                    size={13}
                  />
                ) : (
                  index + 1
                )}
              </span>
              <small>
                {stepLabel(item)}
              </small>
            </div>
          ),
        )}
      </div>

      <div className="lesson-stage">
        <div className="lesson-board-column">
          <ChessBoard
            key={`${step.id}-${boardReset}`}
            fen={step.fen}
            orientation={orientation}
            disabled={
              step.type !== "move" ||
              solved
            }
            highlights={
              displayedHighlights
            }
            arrows={displayedArrows}
            onMove={(move) => {
              if (
                step.type !== "move"
              ) {
                return false;
              }

              const uci =
                `${move.from}${move.to}${move.promotion ?? ""}`;
              const shortUci =
                `${move.from}${move.to}`;
              const accepted =
                step.acceptedMoves.includes(
                  uci,
                ) ||
                step.acceptedMoves.includes(
                  shortUci,
                );

              if (accepted) {
                setSolved(true);
                setFeedback(null);
                recordResult({
                  stepId: step.id,
                  support:
                    step.support,
                  correct: true,
                  firstTry:
                    stepWrongAttempts ===
                      0 &&
                    stepHintsUsed === 0,
                  hintsUsed:
                    stepHintsUsed,
                  wrongAttempts:
                    stepWrongAttempts,
                });
                return true;
              }

              setStepWrongAttempts(
                (value) => value + 1,
              );
              setTotalWrongAttempts(
                (value) => value + 1,
              );
              setFeedback(
                step.wrongMoveFeedback?.[
                  uci
                ] ??
                  step.wrongMoveFeedback?.[
                    shortUci
                  ] ??
                  (step.support ===
                  "transfer"
                    ? "That move is legal, but it does not transfer the lesson correctly. Re-identify the condition that made the concept work before choosing a move."
                    : "That move is legal, but it does not express the lesson yet. Recheck the position, the opponent's strongest reply, and the purpose of your move."),
              );
              return false;
            }}
          />

          <div className="board-caption">
            <span>
              {orientation === "w"
                ? "White"
                : "Black"}{" "}
              perspective
            </span>
            <span>
              {step.type === "move"
                ? "Move only when you can explain the idea"
                : "Study the position before continuing"}
            </span>
          </div>
        </div>

        <div className="lesson-instruction">
          <div>
            <div className="lesson-step-meta">
              <p className="eyebrow">
                {step.eyebrow ??
                  "LESSON"}
              </p>
              <span>
                {stepLabel(step)}
              </span>
            </div>

            <h2>{step.title}</h2>

            {step.type ===
            "explain" ? (
              <p className="lesson-body">
                {step.body}
              </p>
            ) : step.type ===
              "choice" ? (
              <>
                <p className="lesson-prompt">
                  {step.prompt}
                </p>

                <div className="lesson-choice-grid">
                  {step.options.map(
                    (option) => {
                      const correct =
                        option.id ===
                        step.correctOptionId;
                      const chosen =
                        selectedOption ===
                        option.id;
                      return (
                        <button
                          type="button"
                          key={option.id}
                          className={[
                            "lesson-choice",
                            chosen
                              ? "selected"
                              : "",
                            solved &&
                            correct
                              ? "correct"
                              : "",
                            chosen &&
                            !correct &&
                            !solved
                              ? "incorrect"
                              : "",
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(" ")}
                          disabled={solved}
                          onClick={() =>
                            answerChoice(
                              option.id,
                            )
                          }
                        >
                          <span>
                            {option.text}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>

                {feedback &&
                  !solved && (
                    <div className="lesson-feedback error">
                      <span>
                        {feedback}
                      </span>
                    </div>
                  )}

                {solved && (
                  <div className="lesson-feedback success">
                    <Sparkles
                      size={19}
                    />
                    <div>
                      <strong>
                        {
                          step.successTitle
                        }
                      </strong>
                      <span>
                        {
                          step.successBody
                        }
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="lesson-prompt">
                  {step.prompt}
                </p>

                {revealedHints.length >
                  0 &&
                  !solved && (
                    <div className="lesson-hint-stack">
                      {revealedHints.map(
                        (
                          hint,
                          index,
                        ) => (
                          <div
                            className="hint-card"
                            key={index}
                          >
                            <Lightbulb
                              size={17}
                            />
                            <div>
                              <strong>
                                Hint{" "}
                                {index +
                                  1}
                              </strong>
                              <span>
                                {
                                  hint.text
                                }
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                {feedback &&
                  !solved && (
                    <div className="lesson-feedback error">
                      <span>
                        {feedback}
                      </span>
                      <button
                        type="button"
                        onClick={retry}
                      >
                        <RotateCcw
                          size={15}
                        />{" "}
                        Reset
                      </button>
                    </div>
                  )}

                {solved && (
                  <div className="lesson-feedback success">
                    <div
                      className="success-burst"
                      aria-hidden="true"
                    >
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <Sparkles
                      size={19}
                    />
                    <div>
                      <strong>
                        {
                          step.successTitle
                        }
                      </strong>
                      <span>
                        {
                          step.successBody
                        }
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="lesson-controls lesson-controls-v2">
            <div className="lesson-mastery-preview">
              <span>
                Independent checks
              </span>
              <strong>
                {
                  masteryPreview.firstTryCorrect
                }
                /
                {
                  masteryPreview.independentSteps
                }
              </strong>
              <small>
                first try · hints reduce
                mastery evidence
              </small>
            </div>

            <div className="lesson-button-row">
              {step.type ===
                "move" &&
                !solved && (
                  <button
                    className="hint-button"
                    type="button"
                    onClick={
                      revealHint
                    }
                    disabled={
                      stepHintsUsed >=
                      step.hints.length
                    }
                  >
                    <Lightbulb
                      size={16}
                    />
                    {stepHintsUsed ===
                    0
                      ? "Need a hint?"
                      : stepHintsUsed <
                          step.hints
                            .length
                        ? "Next hint"
                        : "All hints shown"}
                  </button>
                )}

              {(step.type ===
                "explain" ||
                solved) && (
                <button
                  className="primary"
                  type="button"
                  onClick={nextStep}
                >
                  {isLast
                    ? "Finish lesson"
                    : "Continue"}{" "}
                  <ChevronRight
                    size={18}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
