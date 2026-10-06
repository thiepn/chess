import {
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Eye,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import {
  domainLabels,
  skillById,
} from "../domain/curriculum";
import {
  modelGameCheckpointPosition,
} from "../model-games/games";
import {
  currentModelGameScore,
  nextModelGameCheckpointIndex,
  scoreModelGameCheckpoint,
} from "../model-games/progress";
import type {
  ModelGame,
  ModelGameCheckpointResult,
  ModelGameProgress,
} from "../model-games/types";
import { ChessBoard } from "./ChessBoard";

interface ModelGameRunnerProps {
  game: ModelGame;
  progress?: ModelGameProgress;
  savedStudyIds: string[];
  onCheckpointResult: (
    result: ModelGameCheckpointResult,
  ) => void;
  onSaveCheckpoint: (
    gameId: string,
    checkpointId: string,
  ) => void;
  onComplete: (gameId: string) => void;
  onExit: () => void;
}

type RunnerPhase =
  | "question"
  | "move"
  | "reveal"
  | "complete";

export function ModelGameRunner({
  game,
  progress,
  savedStudyIds,
  onCheckpointResult,
  onSaveCheckpoint,
  onComplete,
  onExit,
}: ModelGameRunnerProps) {
  const initialIndex =
    nextModelGameCheckpointIndex(
      game,
      progress,
    );
  const [checkpointIndex, setCheckpointIndex] =
    useState(initialIndex);
  const [phase, setPhase] =
    useState<RunnerPhase>("question");
  const [
    selectedOptionId,
    setSelectedOptionId,
  ] = useState<string | null>(null);
  const [
    questionSubmitted,
    setQuestionSubmitted,
  ] = useState(false);
  const [
    questionCorrect,
    setQuestionCorrect,
  ] = useState(false);
  const [wrongMoves, setWrongMoves] =
    useState(0);
  const [hintsUsed, setHintsUsed] =
    useState(0);
  const [moveSolved, setMoveSolved] =
    useState(false);
  const [firstTry, setFirstTry] =
    useState(false);
  const [revealed, setRevealed] =
    useState(false);

  const checkpoint =
    game.checkpoints[checkpointIndex];
  const position = useMemo(
    () =>
      checkpoint
        ? modelGameCheckpointPosition(
            game,
            checkpoint,
          )
        : null,
    [checkpoint, game],
  );
  const skill = checkpoint
    ? skillById[checkpoint.skillId]
    : undefined;
  const selectedOption =
    checkpoint?.options.find(
      (option) =>
        option.id === selectedOptionId,
    );
  const savedId = checkpoint
    ? `model:${game.id}:${checkpoint.id}`
    : "";
  const saved = savedStudyIds.includes(savedId);
  const score = currentModelGameScore(
    progress,
    game,
  );

  function resetForCheckpoint() {
    setPhase("question");
    setSelectedOptionId(null);
    setQuestionSubmitted(false);
    setQuestionCorrect(false);
    setWrongMoves(0);
    setHintsUsed(0);
    setMoveSolved(false);
    setFirstTry(false);
    setRevealed(false);
  }

  function submitQuestion() {
    if (
      !selectedOption ||
      questionSubmitted
    ) {
      return;
    }
    setQuestionCorrect(
      selectedOption.correct,
    );
    setQuestionSubmitted(true);
  }

  function tryHistoricalMove(move: {
    from: string;
    to: string;
    promotion?: string;
  }) {
    if (!position) return false;

    const encoded =
      `${move.from}${move.to}${move.promotion ?? ""}`;
    if (encoded !== position.expectedMove) {
      setWrongMoves(
        (value) => value + 1,
      );
      return false;
    }

    setMoveSolved(true);
    setFirstTry(wrongMoves === 0);
    setPhase("reveal");
    return true;
  }

  function revealMove() {
    setMoveSolved(false);
    setFirstTry(false);
    setRevealed(true);
    setPhase("reveal");
  }

  function continueFromReveal() {
    if (!checkpoint) return;

    const partial = {
      checkpointId: checkpoint.id,
      skillId: checkpoint.skillId,
      questionCorrect,
      moveSolved,
      firstTry,
      revealed,
      hintsUsed,
      wrongMoves,
    };
    const result: ModelGameCheckpointResult =
      {
        ...partial,
        quality:
          scoreModelGameCheckpoint(
            partial,
          ),
      };

    onCheckpointResult(result);

    if (
      checkpointIndex >=
      game.checkpoints.length - 1
    ) {
      setPhase("complete");
      return;
    }

    setCheckpointIndex(
      (value) => value + 1,
    );
    resetForCheckpoint();
  }

  if (!checkpoint || !position) {
    return (
      <section className="model-game-runner">
        <div className="model-game-complete">
          <strong>
            This model game has no usable
            checkpoint.
          </strong>
          <button
            className="secondary"
            type="button"
            onClick={onExit}
          >
            Close
          </button>
        </div>
      </section>
    );
  }

  if (phase === "complete") {
    return (
      <section className="model-game-runner">
        <div className="model-game-complete">
          <CheckCircle2 size={34} />
          <p className="eyebrow">
            MODEL GAME COMPLETE
          </p>
          <h2>
            You studied the decisions, not
            just the moves.
          </h2>
          <p>
            Current retained checkpoint score:
            {" "}
            <strong>{score}%</strong>. Saved
            positions will return through the
            normal Library review system.
          </p>
          <div className="model-game-complete-actions">
            <button
              className="primary"
              type="button"
              onClick={() =>
                onComplete(game.id)
              }
            >
              Finish
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setCheckpointIndex(0);
                resetForCheckpoint();
              }}
            >
              <RotateCcw size={15} />
              Study again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="model-game-runner">
      <header className="model-game-runner-header">
        <div>
          <p className="eyebrow">
            MODEL GAME · {game.year}
          </p>
          <h2>{game.title}</h2>
          <p>{game.players}</p>
        </div>
        <div className="model-game-runner-count">
          <span>Decision</span>
          <strong>
            {checkpointIndex + 1}/
            {game.checkpoints.length}
          </strong>
        </div>
      </header>

      <div className="model-game-stage-rail">
        <span
          className={
            phase === "question"
              ? "active"
              : "done"
          }
        >
          1 · Plan
        </span>
        <span
          className={
            phase === "move"
              ? "active"
              : phase === "reveal"
                ? "done"
                : ""
          }
        >
          2 · Move
        </span>
        <span
          className={
            phase === "reveal"
              ? "active"
              : ""
          }
        >
          3 · Explain
        </span>
      </div>

      <div className="model-game-runner-layout">
        <div className="model-game-board">
          <ChessBoard
            key={
              phase === "reveal"
                ? `${checkpoint.id}:after`
                : checkpoint.id
            }
            fen={
              phase === "reveal"
                ? position.afterFen
                : position.beforeFen
            }
            orientation={game.orientation}
            disabled={phase !== "move"}
            onMove={
              phase === "move"
                ? tryHistoricalMove
                : undefined
            }
          />
          <div className="board-caption">
            <span>
              {game.orientation === "w"
                ? "White"
                : "Black"} perspective
            </span>
            <span>
              {phase === "question"
                ? "Read the position before moving"
                : phase === "move"
                  ? "Play the move that fits the plan"
                  : `Historical move: ${position.targetSan}`}
            </span>
          </div>
        </div>

        <div className="model-game-decision-panel">
          <div className="model-game-skill-chip">
            <span>
              {skill
                ? domainLabels[
                    skill.domain
                  ]
                : "Strategy"}
            </span>
            <strong>
              {skill?.title ??
                checkpoint.title}
            </strong>
          </div>

          <h3>{checkpoint.title}</h3>

          {phase === "question" ? (
            <>
              <p className="model-game-prompt">
                {checkpoint.prompt}
              </p>
              <div className="model-game-options">
                {checkpoint.options.map(
                  (option) => (
                    <button
                      key={option.id}
                      type="button"
                      disabled={
                        questionSubmitted
                      }
                      className={[
                        selectedOptionId ===
                        option.id
                          ? "selected"
                          : "",
                        questionSubmitted &&
                        option.correct
                          ? "correct"
                          : "",
                        questionSubmitted &&
                        selectedOptionId ===
                          option.id &&
                        !option.correct
                          ? "incorrect"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() =>
                        setSelectedOptionId(
                          option.id,
                        )
                      }
                    >
                      {option.label}
                    </button>
                  ),
                )}
              </div>

              {questionSubmitted &&
                selectedOption && (
                  <div
                    className={
                      selectedOption.correct
                        ? "model-game-feedback correct"
                        : "model-game-feedback incorrect"
                    }
                  >
                    <strong>
                      {selectedOption.correct
                        ? "Plan recognized"
                        : "Reframe the position"}
                    </strong>
                    <span>
                      {
                        selectedOption.feedback
                      }
                    </span>
                  </div>
                )}

              <div className="model-game-actions">
                {!questionSubmitted ? (
                  <button
                    className="primary"
                    type="button"
                    disabled={
                      !selectedOptionId
                    }
                    onClick={
                      submitQuestion
                    }
                  >
                    Check plan
                  </button>
                ) : (
                  <button
                    className="primary"
                    type="button"
                    onClick={() =>
                      setPhase("move")
                    }
                  >
                    Guess the move
                    <ChevronRight
                      size={15}
                    />
                  </button>
                )}
              </div>
            </>
          ) : phase === "move" ? (
            <>
              <p className="model-game-prompt">
                Find the move played in the
                game that best expresses the
                plan you just identified.
              </p>

              {wrongMoves > 0 && (
                <div className="model-game-feedback incorrect">
                  <strong>
                    Not the historical move.
                  </strong>
                  <span>
                    Keep the strategic goal
                    fixed and compare candidate
                    moves by what they improve.
                  </span>
                </div>
              )}

              {hintsUsed > 0 && (
                <div className="model-game-hints">
                  {checkpoint.hints
                    .slice(0, hintsUsed)
                    .map((hint, index) => (
                      <p key={hint}>
                        <Lightbulb
                          size={14}
                        />
                        <span>
                          Hint {index + 1}:{" "}
                          {hint}
                        </span>
                      </p>
                    ))}
                </div>
              )}

              <div className="model-game-actions">
                <button
                  className="secondary"
                  type="button"
                  disabled={
                    hintsUsed >=
                    checkpoint.hints.length
                  }
                  onClick={() =>
                    setHintsUsed(
                      (value) =>
                        Math.min(
                          checkpoint.hints
                            .length,
                          value + 1,
                        ),
                    )
                  }
                >
                  <Lightbulb size={15} />
                  Hint
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={revealMove}
                >
                  <Eye size={15} />
                  Reveal move
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                className={
                  revealed
                    ? "model-game-result assisted"
                    : "model-game-result solved"
                }
              >
                {revealed ? (
                  <Eye size={18} />
                ) : (
                  <CheckCircle2
                    size={18}
                  />
                )}
                <div>
                  <span>
                    {revealed
                      ? "REVEALED"
                      : firstTry
                        ? "FIRST TRY"
                        : "SOLVED"}
                  </span>
                  <strong>
                    {position.targetSan}
                  </strong>
                </div>
              </div>

              <div className="model-game-explanation">
                <span>WHY IT WORKS</span>
                <p>
                  {checkpoint.explanation}
                </p>
              </div>

              <div className="model-game-plan">
                <span>REUSABLE PLAN</span>
                <strong>
                  {checkpoint.plan}
                </strong>
              </div>

              {checkpoint.turningPoint && (
                <div className="model-game-turning-point">
                  <span>TURNING POINT</span>
                  <p>
                    {
                      checkpoint.turningPoint
                    }
                  </p>
                </div>
              )}

              <div className="model-game-actions">
                <button
                  className={
                    saved
                      ? "secondary saved"
                      : "secondary"
                  }
                  type="button"
                  disabled={saved}
                  onClick={() =>
                    onSaveCheckpoint(
                      game.id,
                      checkpoint.id,
                    )
                  }
                >
                  <Bookmark size={15} />
                  {saved
                    ? "Saved to training"
                    : "Save to training"}
                </button>
                <button
                  className="primary"
                  type="button"
                  onClick={
                    continueFromReveal
                  }
                >
                  {checkpointIndex ===
                  game.checkpoints.length -
                    1
                    ? "Complete game"
                    : "Next decision"}
                  <ChevronRight
                    size={15}
                  />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
