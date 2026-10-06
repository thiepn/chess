import {
  ChevronRight,
  GitBranch,
  Lightbulb,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Square } from "chess.js";
import type {
  TrainingOutcome,
} from "../domain/types";
import {
  openingNodes,
  pathToNode,
} from "../openings/repertoire";
import type {
  OpeningNode,
  OpeningRepertoire,
  OpeningTrainingMode,
} from "../openings/types";
import type {
  BoardArrow,
  BoardHighlight,
} from "../learning/types";
import { ChessBoard } from "./ChessBoard";

interface OpeningTrainerProps {
  repertoire: OpeningRepertoire;
  node: OpeningNode;
  mode?: OpeningTrainingMode;
  lineNodeId?: string;
  onComplete: (
    outcome: TrainingOutcome,
  ) => void;
}

function sameMove(
  left: string,
  right: string,
) {
  return (
    left === right ||
    left.slice(0, 4) ===
      right.slice(0, 4)
  );
}

function whyOptions(
  node: OpeningNode,
  target: OpeningNode,
) {
  const correct =
    target.purpose ??
    target.plans[0] ??
    "It advances the repertoire plan while keeping the position coherent.";
  const siblingPurpose = node.children
    .map((id) => openingNodes[id])
    .find(
      (child) =>
        child.id !== target.id &&
        child.purpose &&
        child.purpose !== correct,
    )?.purpose;
  const commonMistake =
    node.commonMistakes[0] ??
    target.commonMistakes[0];

  return [
    {
      id: "correct",
      text: correct,
      feedback:
        "Correct. The move belongs in the repertoire because it serves this positional purpose, not because the notation was memorized.",
    },
    {
      id: "memory",
      text:
        commonMistake ??
        "Because this move should be played automatically whenever the opening name looks familiar.",
      feedback:
        "That is exactly what the repertoire should avoid. The board position and plan must justify the move.",
    },
    {
      id: "sibling",
      text:
        siblingPurpose ??
        "To force an immediate tactical win before finishing development.",
      feedback:
        "That plan belongs to a different branch or position. Reconnect the move to the structure in front of you.",
    },
  ];
}

export function OpeningTrainer({
  repertoire,
  node,
  mode = "recall",
  lineNodeId,
  onComplete,
}: OpeningTrainerProps) {
  if (mode === "line") {
    return (
      <OpeningLineRehearsal
        repertoire={repertoire}
        targetNodeId={
          lineNodeId ?? node.id
        }
        onComplete={onComplete}
      />
    );
  }

  return (
    <OpeningRecallTrainer
      repertoire={repertoire}
      node={node}
      onComplete={onComplete}
    />
  );
}

function OpeningRecallTrainer({
  repertoire,
  node,
  onComplete,
}: Omit<
  OpeningTrainerProps,
  "mode" | "lineNodeId"
>) {
  const target = node.preferredChildId
    ? openingNodes[
        node.preferredChildId
      ]
    : undefined;

  const [stage, setStage] =
    useState<"move" | "why" | "done">(
      "move",
    );
  const [showHint, setShowHint] =
    useState(false);
  const [hintsUsed, setHintsUsed] =
    useState(0);
  const [
    wrongAttempts,
    setWrongAttempts,
  ] = useState(0);
  const [feedback, setFeedback] =
    useState<string | null>(null);
  const [
    boardVersion,
    setBoardVersion,
  ] = useState(0);
  const [
    conceptFirstTry,
    setConceptFirstTry,
  ] = useState(true);
  const [
    conceptFeedback,
    setConceptFeedback,
  ] = useState<string | null>(null);

  const hintArrows = useMemo<
    BoardArrow[]
  >(() => {
    if (
      !showHint ||
      !target?.moveFromParent
    ) {
      return [];
    }
    return [
      {
        from: target.moveFromParent.slice(
          0,
          2,
        ) as Square,
        to: target.moveFromParent.slice(
          2,
          4,
        ) as Square,
        tone: "hint",
      },
    ];
  }, [showHint, target]);

  const hintHighlights = useMemo<
    BoardHighlight[]
  >(() => {
    if (
      !showHint ||
      !target?.moveFromParent
    ) {
      return [];
    }
    return [
      {
        square:
          target.moveFromParent.slice(
            0,
            2,
          ) as Square,
        tone: "hint",
      },
      {
        square:
          target.moveFromParent.slice(
            2,
            4,
          ) as Square,
        tone: "good",
      },
    ];
  }, [showHint, target]);

  const choices = useMemo(
    () =>
      target
        ? whyOptions(node, target)
        : [],
    [node, target],
  );

  if (!target?.moveFromParent) {
    return (
      <div className="empty-bank">
        <strong>
          No recall move is configured for
          this position.
        </strong>
      </div>
    );
  }

  function revealHint() {
    if (!showHint) {
      setHintsUsed(
        (value) => value + 1,
      );
    }
    setShowHint(true);
    setFeedback(null);
  }

  function reset() {
    setFeedback(null);
    setBoardVersion(
      (value) => value + 1,
    );
  }

  function finish() {
    const conceptPenalty =
      conceptFirstTry ? 0 : .18;
    const penalty =
      hintsUsed * .14 +
      wrongAttempts * .11 +
      conceptPenalty;

    onComplete({
      success: true,
      quality: Math.max(
        .24,
        1 - penalty,
      ),
      hintsUsed,
      wrongAttempts,
      openingNodeIds: [node.id],
      openingConceptCorrect:
        conceptFirstTry,
    });
  }

  return (
    <div className="lesson-runner opening-trainer opening-trainer-v2">
      <div className="opening-recall-stage">
        <span
          className={
            stage === "move"
              ? "active"
              : "done"
          }
        >
          1 · Move
        </span>
        <span
          className={
            stage === "why"
              ? "active"
              : stage === "done"
                ? "done"
                : ""
          }
        >
          2 · Why
        </span>
      </div>

      <div className="lesson-stage">
        <div className="lesson-board-column">
          <ChessBoard
            key={`${node.id}-${boardVersion}`}
            fen={node.fen}
            orientation={repertoire.color}
            disabled={stage !== "move"}
            arrows={hintArrows}
            highlights={
              hintHighlights
            }
            onMove={(move) => {
              const uci =
                `${move.from}${move.to}${move.promotion ?? ""}`;
              const accepted = sameMove(
                uci,
                target.moveFromParent!,
              );

              if (accepted) {
                setFeedback(null);
                setStage("why");
                return true;
              }

              setWrongAttempts(
                (value) => value + 1,
              );
              setFeedback(
                "That move may be playable, but it is not your repertoire move here. Recover the plan rather than guessing notation.",
              );
              return false;
            }}
          />

          <div className="board-caption">
            <span>
              {repertoire.versus}
            </span>
            <span>
              {node.eco ??
                "Repertoire position"}
            </span>
          </div>
        </div>

        <div className="lesson-instruction">
          <div>
            <p className="eyebrow">
              {stage === "move"
                ? "REPERTOIRE RECALL"
                : "WHY THIS MOVE?"}
            </p>
            <h2>
              {stage === "move"
                ? "What is your move?"
                : target.name}
            </h2>

            {stage === "move" ? (
              <>
                <p className="lesson-prompt">
                  Do not recall notation
                  mechanically. Read the
                  structure, identify the plan,
                  then play your move.
                </p>

                {node.structure && (
                  <div className="opening-structure-cue">
                    <span>Structure</span>
                    <strong>
                      {node.structure}
                    </strong>
                  </div>
                )}

                {node.plans.length > 0 && (
                  <div className="opening-plan-preview">
                    <span>
                      Position plan
                    </span>
                    <strong>
                      {node.plans[0]}
                    </strong>
                  </div>
                )}

                {showHint && (
                  <div className="hint-card">
                    <Lightbulb
                      size={18}
                    />
                    <div>
                      <strong>
                        Directional hint
                      </strong>
                      <span>
                        The move is
                        highlighted. Say what
                        it achieves before
                        playing it.
                      </span>
                    </div>
                  </div>
                )}

                {feedback && (
                  <div className="lesson-feedback error">
                    <span>
                      {feedback}
                    </span>
                    <button
                      type="button"
                      onClick={reset}
                    >
                      <RotateCcw
                        size={15}
                      />{" "}
                      Reset
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="lesson-prompt">
                  You remembered{" "}
                  <strong>
                    {target.sanFromParent}
                  </strong>
                  . Which explanation best
                  describes why it belongs in
                  this position?
                </p>

                <div className="opening-why-options">
                  {choices.map(
                    (choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        className={
                          stage === "done" &&
                          choice.id ===
                            "correct"
                            ? "correct"
                            : ""
                        }
                        disabled={
                          stage === "done"
                        }
                        onClick={() => {
                          if (
                            choice.id ===
                            "correct"
                          ) {
                            setConceptFeedback(
                              choice.feedback,
                            );
                            setStage("done");
                          } else {
                            setConceptFirstTry(
                              false,
                            );
                            setWrongAttempts(
                              (value) =>
                                value + 1,
                            );
                            setConceptFeedback(
                              choice.feedback,
                            );
                          }
                        }}
                      >
                        {choice.text}
                      </button>
                    ),
                  )}
                </div>

                {conceptFeedback && (
                  <div
                    className={
                      stage === "done"
                        ? "lesson-feedback success"
                        : "lesson-feedback error"
                    }
                  >
                    {stage === "done" && (
                      <Sparkles
                        size={18}
                      />
                    )}
                    <span>
                      {conceptFeedback}
                    </span>
                  </div>
                )}

                {stage === "done" &&
                  target.tacticalMotifs
                    .length > 0 && (
                    <div className="opening-motif-strip">
                      <span>
                        Typical tactics
                      </span>
                      <div>
                        {target.tacticalMotifs.map(
                          (motif) => (
                            <strong
                              key={
                                motif
                              }
                            >
                              {motif}
                            </strong>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {stage === "done" &&
                  target.commonMistakes
                    .length > 0 && (
                    <div className="opening-warning">
                      <span>Avoid</span>
                      <strong>
                        {
                          target
                            .commonMistakes[0]
                        }
                      </strong>
                    </div>
                  )}
              </>
            )}
          </div>

          <div className="lesson-controls">
            <div className="lesson-button-row">
              {stage === "move" && (
                <button
                  className="hint-button"
                  type="button"
                  onClick={revealHint}
                >
                  <Lightbulb size={16} />
                  {showHint
                    ? "Hint shown"
                    : "Show hint"}
                </button>
              )}
              {stage === "done" && (
                <button
                  className="primary"
                  type="button"
                  onClick={finish}
                >
                  Continue{" "}
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

function OpeningLineRehearsal({
  repertoire,
  targetNodeId,
  onComplete,
}: {
  repertoire: OpeningRepertoire;
  targetNodeId: string;
  onComplete: (
    outcome: TrainingOutcome,
  ) => void;
}) {
  const path = useMemo(
    () => pathToNode(targetNodeId),
    [targetNodeId],
  );
  const [index, setIndex] =
    useState(1);
  const [
    wrongAttempts,
    setWrongAttempts,
  ] = useState(0);
  const [
    practicedNodeIds,
    setPracticedNodeIds,
  ] = useState<string[]>([]);
  const [finished, setFinished] =
    useState(path.length <= 1);

  const parent =
    path[Math.min(
      index - 1,
      path.length - 1,
    )];
  const target =
    path[Math.min(
      index,
      path.length - 1,
    )];
  const learnerTurn =
    parent?.sideToMove ===
    repertoire.color;

  function advance(
    practicedNodeId?: string,
  ) {
    if (practicedNodeId) {
      setPracticedNodeIds(
        (previous) =>
          previous.includes(
            practicedNodeId,
          )
            ? previous
            : [
                ...previous,
                practicedNodeId,
              ],
      );
    }

    if (index >= path.length - 1) {
      setFinished(true);
      return;
    }
    setIndex(
      (value) => value + 1,
    );
  }

  if (
    path.length <= 1 ||
    !target?.moveFromParent
  ) {
    return (
      <div className="empty-bank">
        <strong>
          Choose a deeper repertoire
          position before rehearsing a
          complete branch.
        </strong>
      </div>
    );
  }

  if (finished) {
    const quality = Math.max(
      .35,
      1 - wrongAttempts * .1,
    );
    return (
      <div className="opening-line-complete">
        <GitBranch size={28} />
        <p className="eyebrow">
          LINE REHEARSAL
        </p>
        <h2>
          Branch reconstructed.
        </h2>
        <p>
          You rebuilt{" "}
          {path
            .slice(1)
            .map(
              (item) =>
                item.sanFromParent,
            )
            .join(" ")}
          .
        </p>
        <button
          className="primary"
          type="button"
          onClick={() =>
            onComplete({
              success: true,
              quality,
              hintsUsed: 0,
              wrongAttempts,
              openingNodeIds:
                practicedNodeIds,
              openingLineCompleted:
                true,
            })
          }
        >
          Finish rehearsal{" "}
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="lesson-runner opening-trainer opening-line-trainer">
      <div className="opening-line-progress">
        <span>
          Ply {index} /{" "}
          {path.length - 1}
        </span>
        <strong>
          {path
            .slice(1, index)
            .map(
              (item) =>
                item.sanFromParent,
            )
            .join(" ") ||
            "Start"}
        </strong>
      </div>

      <div className="lesson-stage">
        <div className="lesson-board-column">
          <ChessBoard
            key={`${parent.id}-${index}`}
            fen={parent.fen}
            orientation={repertoire.color}
            disabled={!learnerTurn}
            onMove={(move) => {
              if (!learnerTurn) {
                return false;
              }
              const uci =
                `${move.from}${move.to}${move.promotion ?? ""}`;
              if (
                sameMove(
                  uci,
                  target.moveFromParent!,
                )
              ) {
                advance(parent.id);
                return true;
              }
              setWrongAttempts(
                (value) => value + 1,
              );
              return false;
            }}
          />
          <div className="board-caption">
            <span>
              {repertoire.name}
            </span>
            <span>
              {learnerTurn
                ? "Your move"
                : "Opponent response"}
            </span>
          </div>
        </div>

        <div className="lesson-instruction">
          <div>
            <p className="eyebrow">
              FULL-LINE REHEARSAL
            </p>
            <h2>
              {learnerTurn
                ? "Rebuild the next move."
                : `Opponent: ${target.sanFromParent}`}
            </h2>
            <p className="lesson-prompt">
              {learnerTurn
                ? "Use the position and plan. Do not read the move list ahead."
                : "The opponent follows this curated branch. Read the new structure before continuing."}
            </p>

            {parent.structure && (
              <div className="opening-structure-cue">
                <span>
                  Structure
                </span>
                <strong>
                  {parent.structure}
                </strong>
              </div>
            )}

            {!learnerTurn && (
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  advance()
                }
              >
                Play{" "}
                {target.sanFromParent}
                <ChevronRight
                  size={16}
                />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
