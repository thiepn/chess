import { sameUciMove } from "../learning/uci";
import { Chess } from "chess.js";
import {
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  Lightbulb,
  RotateCcw,
  Target,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  GameReviewReflection,
  GameStoryMoment,
  ImportedGame,
  PersonalMistake,
  ReviewErrorType,
  ReviewThoughtTag,
} from "../games/types";
import { emitExperienceEvent } from "../interaction/events";
import type { OpeningDeviation } from "../openings/types";
import {
  openingNodes,
  repertoireById,
} from "../openings/repertoire";
import { ChessBoard } from "./ChessBoard";

interface GameReviewCoachProps {
  game: ImportedGame;
  moment: GameStoryMoment;
  mistake?: PersonalMistake;
  reflection?: GameReviewReflection;
  openingDeviation?: OpeningDeviation;
  onClose: () => void;
  onUpdateReflection: (
    reflection: GameReviewReflection,
  ) => void;
  onRetainLesson: (
    gameId: string,
    momentId: string,
  ) => void;
  onPracticeSkill: (skillId: string) => void;
  onPracticeOpening: (
    repertoireId: string,
    nodeId: string,
  ) => void;
}

type CoachStage =
  | "reflect"
  | "retry"
  | "explain";

const thoughtChoices: {
  id: ReviewThoughtTag;
  label: string;
}[] = [
  { id: "candidate-search", label: "I missed a candidate" },
  { id: "calculation", label: "My line was wrong" },
  { id: "threat-awareness", label: "I missed their threat" },
  { id: "plan", label: "I chose the wrong plan" },
  { id: "time-pressure", label: "Time changed my decision" },
  { id: "opening-memory", label: "I forgot the opening idea" },
  { id: "execution", label: "I knew better but played it anyway" },
  { id: "unsure", label: "I am not sure" },
];

function sanFor(
  fen: string,
  uci: string,
) {
  try {
    const chess = new Chess(fen);
    return (
      chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion:
          uci.slice(4, 5) || "q",
      })?.san ?? uci
    );
  } catch {
    return uci;
  }
}

function pvToSan(
  fen: string,
  pv: string[],
) {
  const chess = new Chess(fen);
  const sans: string[] = [];
  for (const uci of pv.slice(0, 5)) {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion:
          uci.slice(4, 5) || "q",
      });
      if (!move) break;
      sans.push(move.san);
    } catch {
      break;
    }
  }
  return sans;
}

function errorLabel(
  type?: ReviewErrorType,
) {
  switch (type) {
    case "tactical-miss":
      return "Tactical miss";
    case "calculation-failure":
      return "Calculation failure";
    case "strategic-plan":
      return "Strategic plan error";
    case "time-management":
      return "Time-management error";
    case "execution-error":
      return "Execution error";
    case "opening-deviation":
      return "Opening deviation";
    default:
      return "Decision error";
  }
}

function candidateSans(
  moment: GameStoryMoment,
) {
  const chess = new Chess(moment.positionFen);
  const candidates = new Map<string, string>();

  for (const uci of [
    moment.actualMove,
    moment.bestMove,
  ]) {
    if (!uci) continue;
    candidates.set(
      uci,
      sanFor(moment.positionFen, uci),
    );
  }

  for (const move of chess.moves({
    verbose: true,
  })) {
    if (candidates.size >= 3) break;
    if (!move.captured && !move.san.includes("+")) {
      continue;
    }
    const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
    candidates.set(
      uci,
      move.san,
    );
  }

  return [...candidates.entries()].map(
    ([uci, san]) => ({ uci, san }),
  );
}

export function GameReviewCoach({
  game,
  moment,
  mistake,
  reflection,
  openingDeviation,
  onClose,
  onUpdateReflection,
  onRetainLesson,
  onPracticeSkill,
  onPracticeOpening,
}: GameReviewCoachProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const [stage, setStage] =
    useState<CoachStage>(
      reflection?.retryMove
        ? "explain"
        : reflection?.thoughtTag
          ? "retry"
          : "reflect",
    );
  const [thoughtTag, setThoughtTag] =
    useState<ReviewThoughtTag | undefined>(
      reflection?.thoughtTag,
    );
  const [thoughtNote, setThoughtNote] =
    useState(reflection?.thoughtNote ?? "");
  const [retryMove, setRetryMove] =
    useState<string | undefined>(
      reflection?.retryMove,
    );
  const [retrySuccess, setRetrySuccess] =
    useState(
      reflection?.retrySuccess ?? false,
    );
  const [hintUsed, setHintUsed] =
    useState(reflection?.hintUsed ?? false);
  const [bestRevealed, setBestRevealed] =
    useState(
      reflection?.bestRevealed ?? false,
    );
  const [
    continuationRevealed,
    setContinuationRevealed,
  ] = useState(
    reflection?.continuationRevealed ??
      false,
  );
  const [boardVersion, setBoardVersion] =
    useState(0);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((element) => !element.hasAttribute("hidden"));

      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>(".close-button")?.focus();
    });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const candidates = useMemo(
    () => candidateSans(moment),
    [moment],
  );
  const pvSan = useMemo(
    () =>
      pvToSan(
        moment.positionFen,
        moment.principalVariation,
      ),
    [moment],
  );

  const deviationNode =
    openingDeviation
      ? openingNodes[
          openingDeviation.nodeId
        ]
      : undefined;
  const deviationRepertoire =
    openingDeviation
      ? repertoireById[
          openingDeviation.repertoireId
        ]
      : undefined;
  const expectedMove =
    openingDeviation?.expectedMoves[0];
  const expectedSan = expectedMove
    ? sanFor(
        moment.positionFen,
        expectedMove,
      )
    : undefined;

  function persist(
    patch: Partial<GameReviewReflection>,
  ) {
    onUpdateReflection({
      momentId: moment.id,
      gameId: game.id,
      ply: moment.ply,
      thoughtTag,
      thoughtNote:
        thoughtNote.trim() || undefined,
      retryMove,
      retrySuccess,
      hintUsed,
      bestRevealed,
      continuationRevealed,
      retained: reflection?.retained,
      relatedPracticeStarted:
        reflection?.relatedPracticeStarted,
      updatedAt: new Date().toISOString(),
      ...patch,
    });
  }

  function startRetry() {
    if (!thoughtTag) return;
    persist({
      thoughtTag,
      thoughtNote:
        thoughtNote.trim() || undefined,
    });
    setStage("retry");
  }

  function revealBest() {
    setBestRevealed(true);
    persist({
      bestRevealed: true,
      retryMove,
      retrySuccess,
      hintUsed,
    });
    setStage("explain");
    emitExperienceEvent({ feedback: "reveal" });
  }

  const primarySkillId =
    moment.skillIds.find(Boolean);
  const resultMoveSan = retryMove
    ? sanFor(
        moment.positionFen,
        retryMove,
      )
    : undefined;

  return (
    <div
      ref={dialogRef}
      className="review-coach-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <section className="review-coach">
        <button
          className="close-button"
          type="button"
          onClick={onClose}
          aria-label="Close coached review"
        >
          <X size={17} />
        </button>

        <header className="review-coach-header">
          <div>
            <p className="eyebrow">
              COACHED REVIEW · MOVE{" "}
              {moment.moveNumber}
            </p>
            <h2 id={headingId}>
              {stage === "reflect"
                ? "What were you thinking?"
                : stage === "retry"
                  ? "Play the position again first."
                  : "Turn the engine result into one lesson."}
            </h2>
          </div>
          <span className="review-error-chip">
            {errorLabel(
              moment.errorType ??
                mistake?.errorType,
            )}
          </span>
        </header>

        {stage === "reflect" ? (
          <div className="review-self-analysis">
            <div className="review-thought-grid">
              {thoughtChoices.map(
                (choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className={
                      thoughtTag ===
                      choice.id
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setThoughtTag(
                        choice.id,
                      )
                    }
                  >
                    {choice.label}
                  </button>
                ),
              )}
            </div>

            <label className="review-thought-note">
              <span>
                Optional: reconstruct the
                decision in your own words
              </span>
              <textarea
                value={thoughtNote}
                onChange={(event) =>
                  setThoughtNote(
                    event.target.value,
                  )
                }
                placeholder="I was trying to… / I expected… / I rejected… because…"
              />
            </label>

            {moment.moveTimeSeconds !==
              undefined && (
              <div className="review-time-context">
                <Clock3 size={17} />
                <div>
                  <strong>
                    {moment.moveTimeSeconds.toFixed(
                      1,
                    )}
                    s on this move
                  </strong>
                  <span>
                    Clock context is evidence,
                    not the diagnosis by itself.
                  </span>
                </div>
              </div>
            )}

            <button
              className="primary"
              type="button"
              disabled={!thoughtTag}
              onClick={startRetry}
            >
              Retry before seeing the answer
              <ChevronRight size={17} />
            </button>
          </div>
        ) : stage === "retry" ? (
          <div className="review-retry-layout">
            <div className="review-retry-board">
              <ChessBoard
                key={`${moment.id}-${boardVersion}`}
                fen={moment.positionFen}
                orientation={game.playerColor}
                disabled={Boolean(retryMove)}
                onMove={(move) => {
                  const uci =
                    `${move.from}${move.to}${move.promotion ?? ""}`;
                  const success = sameUciMove(
                    uci,
                    moment.bestMove,
                  );
                  setRetryMove(uci);
                  setRetrySuccess(success);
                  persist({
                    retryMove: uci,
                    retrySuccess: success,
                    hintUsed,
                  });
                  if (success) {
                    window.setTimeout(
                      () =>
                        setStage(
                          "explain",
                        ),
                      250,
                    );
                  }
                  return true;
                }}
              />
              <div className="board-caption">
                <span>
                  {game.playerColor === "w"
                    ? "White"
                    : "Black"}{" "}
                  to move
                </span>
                <span>
                  Answer remains hidden
                </span>
              </div>
            </div>

            <div className="review-retry-panel">
              <p>
                Re-evaluate the position from
                scratch. Do not try to remember
                the engine move.
              </p>

              {hintUsed && (
                <div className="hint-card">
                  <Lightbulb size={17} />
                  <div>
                    <strong>
                      Process hint
                    </strong>
                    <span>
                      {moment.errorReason ??
                        mistake?.errorReason ??
                        "Compare forcing candidates and the opponent's strongest reply before committing."}
                    </span>
                  </div>
                </div>
              )}

              {retryMove && !retrySuccess && (
                <div className="review-retry-result">
                  <strong>
                    {resultMoveSan} is legal,
                    but it does not solve the
                    problem.
                  </strong>
                  <span>
                    You can reset and try once
                    more, ask for a process
                    hint, or reveal the best
                    candidate.
                  </span>
                </div>
              )}

              <div className="review-retry-actions">
                {!hintUsed && (
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      setHintUsed(true);
                      persist({
                        hintUsed: true,
                      });
                    }}
                  >
                    <Lightbulb size={16} />
                    Hint
                  </button>
                )}
                {retryMove &&
                  !retrySuccess && (
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => {
                        setRetryMove(
                          undefined,
                        );
                        setRetrySuccess(
                          false,
                        );
                        setBoardVersion(
                          (value) =>
                            value + 1,
                        );
                      }}
                    >
                      <RotateCcw
                        size={16}
                      />
                      Retry
                    </button>
                  )}
                <button
                  className="secondary"
                  type="button"
                  onClick={revealBest}
                >
                  <Eye size={16} />
                  Show best
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="review-explain-layout">
            <div className="review-explanation-main">
              <div className="review-error-summary">
                <Target size={19} />
                <div>
                  <strong>
                    {errorLabel(
                      moment.errorType ??
                        mistake?.errorType,
                    )}
                  </strong>
                  <span>
                    {moment.errorReason ??
                      mistake?.errorReason ??
                      moment.summary}
                  </span>
                </div>
              </div>

              <div className="review-candidate-compare">
                <span>
                  Candidates worth comparing
                </span>
                <div>
                  {candidates.map(
                    (candidate) => {
                      const isBest =
                        sameUciMove(
                          candidate.uci,
                          moment.bestMove,
                        );
                      const wasYours =
                        sameUciMove(
                          candidate.uci,
                          moment.actualMove,
                        );
                      return (
                        <div
                          key={
                            candidate.uci
                          }
                          className={
                            isBest
                              ? "best"
                              : ""
                          }
                        >
                          <strong>
                            {
                              candidate.san
                            }
                          </strong>
                          <small>
                            {isBest
                              ? "best candidate"
                              : wasYours
                                ? "your game move"
                                : "other legal candidate"}
                          </small>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              <p className="review-position-explanation">
                {moment.summary}
              </p>

              {openingDeviation &&
                deviationNode && (
                  <div className="review-opening-deviation">
                    <span>
                      Repertoire deviation
                    </span>
                    <strong>
                      {deviationRepertoire?.name ??
                        "Your repertoire"}
                    </strong>
                    <p>
                      You played{" "}
                      {sanFor(
                        moment.positionFen,
                        openingDeviation.playedMove,
                      )}
                      {expectedSan
                        ? `; your repertoire expected ${expectedSan}.`
                        : "."}
                    </p>
                    {deviationNode.purpose && (
                      <small>
                        {
                          deviationNode.purpose
                        }
                      </small>
                    )}
                  </div>
                )}

              <div className="review-engine-evidence">
                <div>
                  <span>
                    Engine line
                  </span>
                  <small>
                    Evidence after reasoning,
                    not the lesson itself
                  </small>
                </div>
                {continuationRevealed ? (
                  <strong>
                    {pvSan.join(" ")}
                  </strong>
                ) : (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setContinuationRevealed(
                        true,
                      );
                      persist({
                        continuationRevealed:
                          true,
                        bestRevealed: true,
                      });
                    }}
                  >
                    Show continuation
                  </button>
                )}
              </div>
            </div>

            <aside className="review-transfer-card">
              <p className="eyebrow">
                TRANSFER NOW
              </p>
              <h3>
                Test the same lesson immediately.
              </h3>
              <p>
                Do not end review at
                explanation. Make the same
                decision again in a different
                training context.
              </p>

              {openingDeviation ? (
                <button
                  className="primary"
                  type="button"
                  onClick={() => {
                    persist({
                      relatedPracticeStarted:
                        true,
                    });
                    onPracticeOpening(
                      openingDeviation.repertoireId,
                      openingDeviation.nodeId,
                    );
                  }}
                >
                  Practice repertoire position
                  <ChevronRight size={16} />
                </button>
              ) : primarySkillId ? (
                <button
                  className="primary"
                  type="button"
                  onClick={() => {
                    persist({
                      relatedPracticeStarted:
                        true,
                    });
                    onPracticeSkill(
                      primarySkillId,
                    );
                  }}
                >
                  Practice related position
                  <ChevronRight size={16} />
                </button>
              ) : null}

              <div className="review-retain-choice">
                <Bookmark size={17} />
                <div>
                  <strong>
                    Worth retaining?
                  </strong>
                  <span>
                    Only save this position if
                    you want it to return as
                    spaced review.
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={
                  reflection?.retained
                    ? "secondary retained"
                    : "secondary"
                }
                onClick={() => {
                  persist({
                    retained: true,
                    bestRevealed: true,
                  });
                  onRetainLesson(
                    game.id,
                    moment.id,
                  );
                }}
              >
                <Bookmark size={16} />
                {reflection?.retained
                  ? "Lesson retained"
                  : "Retain this lesson"}
              </button>

              {retrySuccess && (
                <div className="review-retry-success">
                  <CheckCircle2 size={15} />
                  <span>
                    You found the better move before
                    the answer was shown.
                  </span>
                </div>
              )}

              <button
                type="button"
                className="review-coach-done"
                onClick={onClose}
              >
                Done
              </button>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
