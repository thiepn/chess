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
import { personalLearningRoute } from "../coach/personalLearningRoute";
import type { RecordedReviewAttempt } from "../review/practiceLoop";
import type { LearningAnalyticsEvent } from "../analytics/types";
import { g10LearningFeedback } from "../coach/learningFeedback";
import { g11CoachFollowUp } from "../coach/prescriptionHandoff";
import type { CoachEffectivenessInsight, TrainingPrescription, PrescriptionTrackingRecord } from "../prescriptions/types";
import { g12PostTrainingFollowThrough } from "../coach/postTrainingFollowThrough";
import type { TrainingActivity } from "../domain/types";

interface GameReviewCoachProps {
  game: ImportedGame;
  moment: GameStoryMoment;
  mistake?: PersonalMistake;
  allGames: ImportedGame[];
  allMistakes: PersonalMistake[];
  practiceHistory: RecordedReviewAttempt[];
  learningEvents: LearningAnalyticsEvent[];
  prescriptions: TrainingPrescription[];
  coachEffectiveness: CoachEffectivenessInsight;
  prescriptionHistory: PrescriptionTrackingRecord[];
  onOpenReviewGame: (id: string) => void;
  scheduledTraining: TrainingActivity[];
  onOpenTrainingPlan: () => void;
  onTrainMistake: (mistakeId: string) => void;
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
  allGames,
  allMistakes,
  practiceHistory,
  learningEvents,
  prescriptions,
  coachEffectiveness,
  prescriptionHistory,
  onOpenReviewGame,
  scheduledTraining,
  onOpenTrainingPlan,
  onTrainMistake,
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

  const learningRoute = useMemo(() => personalLearningRoute(
    game, moment, allGames, allMistakes, practiceHistory,
  ), [game, moment, allGames, allMistakes, practiceHistory]);
  const handoff = learningRoute?.handoff;
  const feedback = useMemo(() => learningRoute
    ? g10LearningFeedback(learningRoute, allGames, allMistakes, practiceHistory, learningEvents)
    : null, [learningRoute, allGames, allMistakes, practiceHistory, learningEvents]);
  const followUp = useMemo(() => learningRoute && feedback
    ? g11CoachFollowUp(learningRoute, feedback, prescriptions, coachEffectiveness, scheduledTraining)
    : null, [learningRoute, feedback, prescriptions, coachEffectiveness, scheduledTraining]);
  const postTraining = useMemo(() => learningRoute && feedback
    ? g12PostTrainingFollowThrough(learningRoute, feedback, prescriptionHistory, coachEffectiveness, allGames)
    : null, [learningRoute, feedback, prescriptionHistory, coachEffectiveness, allGames]);
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
              {handoff ? (
                <div className="review-coach-handoff" role="group" aria-label="Game evidence and next practice">
                  <strong>{handoff.observation}</strong>
                  <p>{handoff.gameCountLabel}</p>
                  {handoff.skillTitle && <p>Related skill: {handoff.skillTitle}</p>}
                  {feedback && feedback.original.attempted > 0 && (
                    <p>Original review: {feedback.original.clean} clean unaided,
                      {" "}{feedback.original.assisted} assisted,
                      {" "}{feedback.original.missed} missed.
                      {feedback.original.spacedCleanRecalls && " Clean recalls at least 24 hours apart."}
                    </p>
                  )}
                  {feedback && feedback.guided.observed > 0 && (
                    <p>Recorded lesson/guided evidence: {feedback.guided.successful} successful
                      {" "}of {feedback.guided.observed}. This is guided practice, not a transfer result.</p>
                  )}
                  {feedback && feedback.independentPractice.observed > 0 && (
                    <p>Recorded mixed/checkpoint practice: {feedback.independentPractice.successful}
                      {" "}successful of {feedback.independentPractice.observed}.
                      Different-game recall is assessed separately.</p>
                  )}
                  {handoff.mistakeId && (
                    <button type="button" className="secondary" onClick={() => {
                      persist({ relatedPracticeStarted: true });
                      onTrainMistake(handoff.mistakeId!);
                    }}>
                      {feedback?.next === "original" ? "Next: review original game position"
    : handoff.due ? "Review due game position" : "Practice this game position"}
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <p>No verified game position is available for targeted practice.</p>
              )}

              {learningRoute?.independentPosition && (
                <div className="review-coach-transfer-route">
                  <strong>Different game position</strong>
                  <p>Move {learningRoute.independentPosition.moveNumber} from another analyzed game.
                    {learningRoute.independentPosition.recordedAttempts === 0
                      ? " No practice attempt recorded for this position."
                      : ` ${learningRoute.independentPosition.recordedAttempts} prior practice attempt(s) recorded.`}
                  </p>
                  {feedback?.differentGame && feedback.differentGame.attempted > 0 && (
                    <p>Different-game review: {feedback.differentGame.clean} clean unaided,
                      {" "}{feedback.differentGame.assisted} assisted,
                      {" "}{feedback.differentGame.missed} missed.
                      {feedback.differentGame.spacedCleanRecalls &&
                        " Clean recalls at least 24 hours apart."}
                    </p>
                  )}
                  <button type="button" className="primary" onClick={() => {
                    persist({ relatedPracticeStarted: true });
                    onTrainMistake(learningRoute.independentPosition!.mistakeId);
                  }}>
                    {feedback?.next === "different-game" ?
                      "Next: practice different game position" : "Practice different game position"}
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
              {feedback?.transferAcrossGames && (
                <p className="review-coach-later-games">
                  Different original game positions:
                  {" "}{feedback.transferAcrossGames.cleanUnaidedPositions}
                  {" "}with at least one clean unaided recall of
                  {" "}{feedback.transferAcrossGames.verifiedPositions} verified positions.
                  {" "}{feedback.transferAcrossGames.attemptedPositions} practiced;
                  {" "}{feedback.transferAcrossGames.needsIndependentRetry}
                  {" "}practiced without a clean recall.
                </p>
              )}
              {learningRoute?.later && learningRoute.later.analyzedGames > 0 && (
                <p className="review-coach-later-games">
                  Later-dated analyzed games: {learningRoute.later.analyzedGames}.
                  Verified mistakes in this skill: {learningRoute.later.gamesWithVerifiedMistakes}.
                  Training effectiveness is evaluated separately; this count does not establish improvement.
                </p>
              )}

              {feedback?.afterIndependentRecall && (
                <p className="review-coach-later-games">
                  After clean recall on a different game position:
                  {" "}{feedback.afterIndependentRecall.distinctAnalyzedGames} later-dated analyzed games;
                  {" "}{feedback.afterIndependentRecall.gamesWithVerifiedSkillMistake}
                  {" "}with a verified mistake in this skill.
                  These are observations, not proof that training caused improvement.
                </p>
              )}

              {postTraining && (
                <section className="review-coach-post-training" aria-label="Completed repair follow-through">
                  <strong>Completed repair: {postTraining.title}</strong>
                  <p>{postTraining.completions} recorded completion(s).
                    {" "}{postTraining.completedActions} distinct prescribed actions completed.</p>
                  <p>Original game Review: {postTraining.originalRecall.cleanUnaided} clean unaided,
                    {" "}{postTraining.originalRecall.assisted} assisted,
                    {" "}{postTraining.originalRecall.missed} missed.</p>
                  {postTraining.independentRecall && (
                    <p>Different-game transfer: {postTraining.independentRecall.cleanPositions}
                      {" "}positions with clean unaided recall from
                      {" "}{postTraining.independentRecall.attemptedPositions} practiced.</p>
                  )}
                  {postTraining.outcome && (
                    <p>Recorded game evaluation: {postTraining.outcome.status}
                      {" "}({postTraining.outcome.postGames} matching human games).
                      {postTraining.outcome.trainingSuccessRate !== null &&
                        ` Training success: ${postTraining.outcome.trainingSuccessRate}%.`}
                    </p>
                  )}
                  <p>{postTraining.explanation}</p>
                  {postTraining.next === "recall-original" && handoff?.mistakeId && (
                    <button type="button" className="secondary" onClick={() => {
                      persist({ relatedPracticeStarted: true });
                      onTrainMistake(handoff.mistakeId!);
                    }}>Review original game position <ChevronRight size={16}/></button>
                  )}
                  {postTraining.next === "practice-different-game" &&
                    learningRoute?.independentPosition && (
                    <button type="button" className="primary" onClick={() => {
                      persist({ relatedPracticeStarted: true });
                      onTrainMistake(learningRoute.independentPosition!.mistakeId);
                    }}>Practice independent position <ChevronRight size={16}/></button>
                  )}
                  {postTraining.next === "review-later-game" && postTraining.laterGameId && (
                    <button type="button" className="primary" onClick={() =>
                      onOpenReviewGame(postTraining.laterGameId!)}>
                      Review analyzed human game <ChevronRight size={16}/>
                    </button>
                  )}
                </section>
              )}

              {followUp && (
                <section className="review-coach-prescription" aria-label="Linked training repair">
                  <strong>{followUp.title}</strong>
                  <p>{followUp.explanation}</p>
                  {!postTraining && followUp.outcome && followUp.outcome.completions > 0 && (
                    <p>
                      Recorded repair evaluation: {followUp.outcome.status}.
                      {" "}{followUp.outcome.postGames} matching later games assessed.
                      This is the existing prescription outcome, not a new rating.
                    </p>
                  )}
                  {followUp.action === "open-training" && followUp.planActivityId && (
                    <button type="button" className="primary" onClick={() => {
                      persist({ relatedPracticeStarted: true });
                      onOpenTrainingPlan();
                    }}>
                      Open prescribed training plan <ChevronRight size={16} />
                    </button>
                  )}
                </section>
              )}

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
              ) : handoff?.skillId ? (
                <button
                  className="primary"
                  type="button"
                  onClick={() => {
                    persist({
                      relatedPracticeStarted:
                        true,
                    });
                    onPracticeSkill(
                      handoff.skillId!,
                    );
                  }}
                >
                  {feedback?.next === "canonical-skill" ? "Next: practice" : "Practice"} {handoff.skillTitle ?? "related skill"}
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
