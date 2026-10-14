import { sameUciMove } from "../learning/uci";
import {
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  RotateCcw,
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
import { deepTransferSkillIds, lessonForSkill } from "../learning/lessons";
import { checkedTransfer, loadTransferCatalog, type TransferExercise } from "../learning/transferCompletion";
import { beginnerSkillIds, loadBeginnerPractice, withBeginnerPractice, type BeginnerPracticeEntry } from "../learning/beginnerPractice";
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
  if (step.stage === "transfer" && step.type === "move" && step.support === "retrieval") {
    return "Independent check";
  }
  const labels = {
    model: "Concept model",
    example: "Worked example",
    contrast: "Contrast",
    check: "Concept check",
    guided: "Guided practice",
    retrieval: "Independent retrieval",
    transfer: "Apply it",
    takeaway: "Takeaway",
  } as const;
  return labels[step.stage];
}

export function LessonRunner({
  activity,
  skill,
  onComplete,
}: LessonRunnerProps) {
  const baseLesson = useMemo(
    () => lessonForSkill(skill.id,skill.title,skill.description,activity.activityType),
    [activity.activityType,skill.description,skill.id,skill.title],
  );
  const missingTransfer = !deepTransferSkillIds.includes(skill.id);
  const beginner = beginnerSkillIds.some(id => id === skill.id);
  const [transferEntry,setTransferEntry] = useState<{skillId:string;entry:TransferExercise}|null>(null);
  const [transferError,setTransferError] = useState<string|null>(null);
  const [transferRetry,setTransferRetry] = useState(0);
  useEffect(()=>{
    if (!missingTransfer) return;
    let cancelled=false;
    setTransferError(null);
    void loadTransferCatalog().then(catalog=>{
      if (cancelled) return;
      const entry=catalog.get(skill.id);
      if(!entry){setTransferError("No independently authored transfer position is available for this skill.");return;}
      setTransferEntry({skillId:skill.id,entry});
    }).catch(()=>{
      if(!cancelled)setTransferError("Transfer exercises are unavailable. Lesson progress has not changed.");
    });
    return ()=>{cancelled=true;};
  },[skill.id,missingTransfer,transferRetry]);
  const [beginnerEntry, setBeginnerEntry] = useState<{ skillId: string; entry: BeginnerPracticeEntry } | null>(null);
  const [beginnerError, setBeginnerError] = useState<string | null>(null);
  const [beginnerRetry, setBeginnerRetry] = useState(0);
  useEffect(() => {
    if (!beginner) return;
    let cancelled = false;
    setBeginnerError(null);
    void loadBeginnerPractice().then(catalog => {
      if (cancelled) return;
      const entry = catalog.get(skill.id);
      if (!entry) { setBeginnerError("The original beginner source is incomplete."); return; }
      setBeginnerEntry({ skillId: skill.id, entry });
    }).catch(() => {
      if (!cancelled) setBeginnerError("Beginner practice is unavailable or unverified. No lesson credit has been written.");
    });
    return () => { cancelled = true; };
  }, [beginner, skill.id, beginnerRetry]);

  const transferLesson = useMemo(() =>
    missingTransfer && transferEntry?.skillId === skill.id
      ? checkedTransfer(baseLesson, transferEntry.entry) : baseLesson,
    [baseLesson, missingTransfer, skill.id, transferEntry]);
  const lesson = useMemo(() =>
    beginner && beginnerEntry?.skillId === skill.id
      ? withBeginnerPractice(transferLesson, beginnerEntry.entry) : transferLesson,
    [beginner, beginnerEntry, skill.id, transferLesson]);

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

  // Never fall through to the same-position fallback: that is retrieval, not transfer.
  if ((missingTransfer && transferEntry?.skillId !== skill.id) ||
      (beginner && beginnerEntry?.skillId !== skill.id)) {
    const error = (missingTransfer && transferEntry?.skillId !== skill.id ? transferError : null) ??
      (beginner && beginnerEntry?.skillId !== skill.id ? beginnerError : null);
    return <div className="lesson-runner lesson-runner-v2" role="status">
      <h2>{error ? "Lesson source unavailable" : "Preparing original practice"}</h2>
      <p>{error ?? "Loading and validating the independent board positions for this lesson."}</p>
      {error && <button type="button" onClick={() => {
        setTransferRetry(value => value + 1);
        setBeginnerRetry(value => value + 1);
      }}>Retry lesson content</button>}
    </div>;
  }
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
              const accepted = step.acceptedMoves.some(
                (expected) => sameUciMove(uci, expected),
              );

              if (accepted) {
                setSolved(true);
                setFeedback(step.successByMove?.[uci] ?? step.successBody);
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
                  (step.support === "transfer"
                    ? step.misconceptionFeedback ??
                      "Recheck the condition that makes the concept work, then calculate the strongest reply."
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
                    <div className="lesson-feedback error" role="alert" aria-atomic="true">
                      <span>
                        {feedback}
                      </span>
                    </div>
                  )}

                {solved && (
                  <div className="lesson-feedback success" role="status" aria-live="polite" aria-atomic="true">
                    <CheckCircle2 size={19} />
                    <div>
                      <strong>
                        {
                          step.successTitle
                        }
                      </strong>
                      <span>
                        {
                          feedback ?? step.successBody
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
                    <div className="lesson-hint-stack" role="status" aria-live="polite" aria-relevant="additions">
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
                    <div className="lesson-feedback error" role="alert" aria-atomic="true">
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
                  <div className="lesson-feedback success" role="status" aria-live="polite" aria-atomic="true">
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
                    <CheckCircle2 size={19} />
                    <div>
                      <strong>
                        {
                          step.successTitle
                        }
                      </strong>
                      <span>
                        {
                          feedback ?? step.successBody
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
                {masteryPreview.transferSteps > 0
                  ? `Independent transfer: ${masteryPreview.transferFirstTryCorrect}/${masteryPreview.transferSteps} · delayed recall will be scheduled`
                  : "First try · hints are counted separately"}
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
