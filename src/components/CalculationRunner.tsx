import { sameUciMove } from "../learning/uci";
import { Chess } from "chess.js";
import {
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  Target,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChessSkill,
  TrainingActivity,
  TrainingOutcome,
} from "../domain/types";
import { StockfishBrowserEngine } from "../engine/stockfish";
import { scoreCalculationAttempt } from "../calculation/scoring";
import {legalCalculationBranch, calculationMisconceptions} from "../calculation/branchFeedback";
import type {
  CalculationCandidateMove,
  CalculationPosition,
} from "../calculation/types";
import { ChessBoard } from "./ChessBoard";
import { CalculationStudyPanel } from "./CalculationStudyPanel";
import { studyMaterialFor } from "../calculation/studyDelivery";
import { verifiedDeepBranches } from "../calculation/deepCalculation";

import { DeepCalculationLab } from "./DeepCalculationLab";

interface CalculationRunnerProps {
  activity: TrainingActivity;
  skill: ChessSkill;
  position: CalculationPosition;
  storageOwner: string;
  /** Close unscored source studies without generating fake learning evidence. */
  onInstructionalExit?: () => void;
  onComplete: (
    outcome: TrainingOutcome,
  ) => void;
}

type Phase =
  | "candidates"
  | "reply"
  | "continuation"
  | "result";

function applyUci(
  fen: string,
  uci: string,
) {
  const chess = new Chess(fen);
  const move = chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion:
      uci.slice(4, 5) || "q",
  });
  if (!move) {
    throw new Error(
      `Illegal calculation move: ${uci}`,
    );
  }
  return {
    fen: chess.fen(),
    san: move.san,
  };
}


export function CalculationRunner({
  activity,
  skill,
  position,
  storageOwner,
  onInstructionalExit,
  onComplete,
}: CalculationRunnerProps) {
  const [phase, setPhase] =
    useState<Phase>("candidates");
  const [candidates, setCandidates] =
    useState<CalculationCandidateMove[]>(
      [],
    );
  const [
    selectedMove,
    setSelectedMove,
  ] = useState<string>();
  const [
    candidateFen,
    setCandidateFen,
  ] = useState<string>();
  const [
    predictedReply,
    setPredictedReply,
  ] = useState<string>();
  const [replyFen, setReplyFen] =
    useState<string>();
  const [
    predictedContinuation,
    setPredictedContinuation,
  ] = useState<string>();
  const [bestReply, setBestReply] =
    useState<string>();
  const [
    bestContinuation,
    setBestContinuation,
  ] = useState<string>();
  const [
    visualizationMode,
    setVisualizationMode,
  ] = useState(
    skill.id ===
      "calculation.visualization",
  );
  const [
    boardRevealed,
    setBoardRevealed,
  ] = useState(true);
  const [
    boardVersion,
    setBoardVersion,
  ] = useState(0);
  const [engineStatus, setEngineStatus] =
    useState<
      "loading" | "ready" | "error"
    >("loading");
  const [
    referenceBusy,
    setReferenceBusy,
  ] = useState(false);

  const engineRef =
    useRef<StockfishBrowserEngine | null>(
      null,
    );
  const enginePromiseRef =
    useRef<
      Promise<StockfishBrowserEngine> | null
    >(null);

  const hasIndependentStudy = useMemo(() => !!studyMaterialFor(position,activity.courseFocusSkillId), [position,activity.courseFocusSkillId]);
  const [showWorkedReview, setShowWorkedReview] = useState(!hasIndependentStudy);
  const hasDeepBranches = useMemo(() => verifiedDeepBranches(position).length > 0, [position]);
  const [deepDone, setDeepDone] = useState(false);
  const verifiedBranch=useMemo(()=>legalCalculationBranch(position),[position]);
  const referenceLine=verifiedBranch?.map(p=>p.san)??[];

  useEffect(() => {
    let cancelled = false;
    const promise =
      StockfishBrowserEngine.create();
    enginePromiseRef.current = promise;
    promise
      .then((engine) => {
        if (cancelled) {
          engine.quit();
          return;
        }
        engineRef.current = engine;
        setEngineStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setEngineStatus("error");
        }
      });

    return () => {
      cancelled = true;
      engineRef.current?.quit();
      engineRef.current = null;
      enginePromiseRef.current = null;
    };
  }, [position.id]);

  async function analyzeReference(
    fen: string,
    fallback?: string,
  ) {
    try {
      const engine =
        engineRef.current ??
        (await enginePromiseRef.current);
      if (!engine) return fallback;
      const result =
        await engine.evaluate(fen, 12);
      return (
        result.bestMove || fallback
      );
    } catch {
      setEngineStatus("error");
      return fallback;
    }
  }

  function resetExercise() {
    setShowWorkedReview(!hasIndependentStudy);
    setDeepDone(false);
    setPhase("candidates");
    setCandidates([]);
    setSelectedMove(undefined);
    setCandidateFen(undefined);
    setPredictedReply(undefined);
    setReplyFen(undefined);
    setPredictedContinuation(
      undefined,
    );
    setBestReply(undefined);
    setBestContinuation(undefined);
    setBoardRevealed(true);
    setBoardVersion(
      (value) => value + 1,
    );
  }

  async function chooseCandidate(
    candidate: CalculationCandidateMove,
  ) {
    const applied = applyUci(
      position.fen,
      candidate.uci,
    );
    setSelectedMove(candidate.uci);
    setCandidateFen(applied.fen);
    setBoardRevealed(
      !visualizationMode,
    );

    const fallback = sameUciMove(
      candidate.uci,
      position.bestMove,
    )
      ? position.principalVariation[1]
      : undefined;

    if (fallback) {
      setBestReply(fallback);
      setPhase("reply");
      return;
    }

    setReferenceBusy(true);
    const reference =
      await analyzeReference(
        applied.fen,
      );
    setBestReply(reference);
    setReferenceBusy(false);
    setPhase("reply");
  }

  async function recordReply(
    uci: string,
    fen: string,
  ) {
    setPredictedReply(uci);
    setReplyFen(fen);
    setBoardRevealed(
      !visualizationMode,
    );

    const fallback =
      sameUciMove(
        selectedMove,
        position.bestMove,
      ) &&
      sameUciMove(
        uci,
        position.principalVariation[1],
      )
        ? position
            .principalVariation[2]
        : undefined;

    if (fallback) {
      setBestContinuation(fallback);
      setPhase("continuation");
      return;
    }

    setReferenceBusy(true);
    const reference =
      await analyzeReference(
        fen,
      );
    setBestContinuation(reference);
    setReferenceBusy(false);
    setPhase("continuation");
  }

  const score =
    phase === "result" &&
    selectedMove &&
    position.assessmentStatus !== "instructional-only"
      ? scoreCalculationAttempt({
          positionId: position.id,
          source: position.source,
          candidates,
          selectedMove,
          bestMove:
            position.bestMove,
          predictedReply,
          bestReply,
          predictedContinuation,
          bestContinuation,
          visualizationUsed:
            visualizationMode,
        })
      : null;

  const currentFen =
    phase === "candidates"
      ? position.fen
      : phase === "reply"
        ? candidateFen ??
          position.fen
        : replyFen ??
          candidateFen ??
          position.fen;

  const orientation =
    position.playerColor;

  const hiddenBoard =
    visualizationMode &&
    phase !== "candidates" &&
    phase !== "result" &&
    !boardRevealed;

  const canFinish =
    (!hasDeepBranches || deepDone) &&
    showWorkedReview &&
    Boolean(verifiedBranch) &&
    phase === "result" &&
    score &&
    (bestReply || engineStatus === "error") &&
    (bestContinuation ||
      engineStatus === "error");

  if(!verifiedBranch)return <div className="calculation-runner" role="alert">
    <h2>Calculation source could not be verified</h2>
    <p>This position's recorded continuation is invalid or unavailable. No scored attempt will be written.</p>
  </div>;

  return (
    <div className="calculation-runner">
      <div className="calculation-stage-rail">
        {[
          ["candidates", "Candidates"],
          ["reply", "Best reply"],
          [
            "continuation",
            "Continuation",
          ],
          ["result", "Review"],
        ].map(([id, label], index) => {
          const order = [
            "candidates",
            "reply",
            "continuation",
            "result",
          ];
          const currentIndex =
            order.indexOf(phase);
          return (
            <div
              key={id}
              className={[
                "calculation-stage-chip",
                index < currentIndex
                  ? "done"
                  : "",
                id === phase
                  ? "current"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={id === phase ? "step" : undefined}
            >
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </div>
          );
        })}
      </div>

      <div className="lesson-stage calculation-stage">
        <div className="lesson-board-column">
          <div
            className={[
              "calculation-board-frame",
              hiddenBoard
                ? "blind"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <ChessBoard
              key={`${position.id}-${phase}-${boardVersion}`}
              fen={currentFen}
              orientation={orientation}
              disabled={
                phase === "result" ||
                hiddenBoard ||
                referenceBusy
              }
              onMove={(move) => {
                const uci =
                  `${move.from}${move.to}${move.promotion ?? ""}`;

                if (
                  phase === "candidates"
                ) {
                  if (
                    candidates.some(
                      (candidate) =>
                        sameUciMove(
                          candidate.uci,
                          uci,
                        ),
                    )
                  ) {
                    return false;
                  }
                  if (
                    candidates.length >= 3
                  ) {
                    return false;
                  }

                  setCandidates(
                    (previous) => [
                      ...previous,
                      {
                        uci,
                        san: move.san,
                      },
                    ],
                  );
                  window.setTimeout(
                    () =>
                      setBoardVersion(
                        (value) =>
                          value + 1,
                      ),
                    0,
                  );
                  return true;
                }

                if (phase === "reply") {
                  void recordReply(
                    uci,
                    move.fen,
                  );
                  return true;
                }

                if (
                  phase ===
                  "continuation"
                ) {
                  setPredictedContinuation(
                    uci,
                  );
                  setPhase("result");
                  return true;
                }

                return false;
              }}
            />

            {hiddenBoard && (
              <div className="calculation-blind-overlay">
                <EyeOff size={28} />
                <strong>
                  Visualize the position
                </strong>
                <span>
                  Rebuild the board in your
                  head before entering the
                  next move.
                </span>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setBoardRevealed(
                      true,
                    )
                  }
                >
                  <Eye size={15} /> Reveal
                  board to enter move
                </button>
              </div>
            )}
          </div>

          <div className="board-caption">
            <span>
              {position.sourceLabel}
            </span>
            <span>
              {phase === "candidates"
                ? `${candidates.length}/3 candidates generated`
                : visualizationMode
                  ? "Visualization mode"
                  : "Board visible"}
            </span>
          </div>
        </div>

        <div className="lesson-instruction calculation-instruction">
          <div>
            <p className="eyebrow">
              {position.assessmentStatus === "instructional-only"
                ? "POSITION STUDY · UNSCORED" : "CALCULATION TRAINER"}
            </p>
            <h2>
              {phase === "candidates"
                ? position.title
                : phase === "reply"
                  ? (position.assessmentStatus === "instructional-only"
                    ? "Predict a challenging opponent reply." : "Give the opponent their best reply.")
                  : phase ===
                      "continuation"
                    ? "Continue one move deeper."
                    : score?.success
                      ? "Your line held up."
                      : "Compare your calculation."}
            </h2>

            {phase === "candidates" && (
              <>
                <p className="lesson-prompt">
                  {position.prompt}
                </p>
                {position.assessmentStatus === "instructional-only" && (
                  <p className="calculation-instructional-note">
                    Authored legal reference lines, not verified best moves. This case
                    does not change a score, practice history or learning progress.
                  </p>
                )}
                <div className="calculation-rule">
                  <Target size={17} />
                  <span>
                    Generate moves before
                    calculating deeply.
                    Checks, captures and
                    threats first; then
                    useful quiet candidates.
                  </span>
                </div>

                <label className="calculation-visualization-toggle">
                  <input
                    type="checkbox"
                    checked={
                      visualizationMode
                    }
                    onChange={(event) =>
                      setVisualizationMode(
                        event.target
                          .checked,
                      )
                    }
                  />
                  <span>
                    <strong>
                      Blind visualization
                    </strong>
                    <small>
                      Hide the board between
                      plies and rebuild it
                      mentally.
                    </small>
                  </span>
                </label>

                <div className="calculation-candidates">
                  {candidates.length ===
                    0 && (
                    <span className="calculation-empty">
                      Make a move on the board
                      to add it as a candidate.
                      The board resets
                      automatically.
                    </span>
                  )}
                  {candidates.map(
                    (candidate) => (
                      <div
                        key={
                          candidate.uci
                        }
                        className="calculation-candidate"
                      >
                        <strong>
                          {
                            candidate.san
                          }
                        </strong>
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              void chooseCandidate(
                                candidate,
                              )
                            }
                          >
                            Calculate this
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${candidate.san}`}
                            onClick={() =>
                              setCandidates(
                                (
                                  previous,
                                ) =>
                                  previous.filter(
                                    (
                                      item,
                                    ) =>
                                      item.uci !==
                                      candidate.uci,
                                  ),
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </>
            )}

            {phase === "reply" && (
              <>
                <p className="lesson-prompt">
                  You chose{" "}
                  <strong>
                    {
                      candidates.find(
                        (item) =>
                          sameUciMove(
                            item.uci,
                            selectedMove,
                          ),
                      )?.san
                    }
                  </strong>
                  . Switch sides mentally:
                  what is the strongest reply?
                </p>
                <div className="calculation-rule">
                  <Target size={17} />
                  <span>
                    Do not choose the reply
                    you hope to see. Look for
                    the opponent's strongest
                    forcing or improving move.
                  </span>
                </div>
              </>
            )}

            {phase ===
              "continuation" && (
              <>
                <p className="lesson-prompt">
                  Assume the reply you just
                  entered is played. What is
                  your best continuation from
                  the resulting position?
                </p>
                <div className="calculation-rule">
                  <Target size={17} />
                  <span>
                    Rebuild every piece on
                    its new square before
                    calculating the next
                    move.
                  </span>
                </div>
              </>
            )}


            {phase === "result" && hasDeepBranches && !deepDone && (
                <DeepCalculationLab
                  position={position}
                  storageOwner={storageOwner}
                  onComplete={() => setDeepDone(true)}
                  evaluateLocally={async fen => {
                    const engine = engineRef.current ?? await enginePromiseRef.current;
                    return engine ? engine.evaluate(fen, 10) : null;
                  }}
                />
            )}

            {phase === "result" && (!hasDeepBranches || deepDone) && !showWorkedReview && hasIndependentStudy && (
              <div className="calculation-study-gate">
                <CalculationStudyPanel key={`${storageOwner}:${position.id}:${activity.courseFocusSkillId??""}`}
                  position={position} storageOwner={storageOwner} focusSkillId={activity.courseFocusSkillId} />
                <button type="button" className="primary"
                  onClick={() => setShowWorkedReview(true)}>
                  Continue to worked calculation review <ChevronRight size={17}/>
                </button>
                <small>You can continue without self-assessing, but unanswered study
                  questions receive no credit and are not included in mastery.</small>
              </div>
            )}


            {phase === "result" && position.assessmentStatus === "instructional-only" &&
              (!hasDeepBranches || deepDone) && showWorkedReview && (
              <section className="calculation-instructional-review" aria-label="Authored strategic review">
                <p className="eyebrow">UNSCORED · AUTHOR-QUALIFIED POSITION</p>
                <h3>Compare plans, not a fabricated grade</h3>
                <p>{position.explanation}</p>
                <p><strong>Legally replayed sample:</strong> {referenceLine.join(" ")}</p>
                <p>{position.replyReason}</p>
                <p>{position.continuationReason}</p>
                <p className="calculation-instructional-note">These moves are legal learning
                  illustrations, not verified unique-best chess answers. No three-ply
                  grade, mastery, review history or training credit is recorded.</p>
                <button type="button" className="primary"
                  onClick={onInstructionalExit}>
                  Leave study without writing a score <ChevronRight size={17}/>
                </button>
              </section>
            )}

            {phase === "result" && hasDeepBranches && deepDone && (
              <button type="button" className="secondary"
                onClick={() => { setDeepDone(false); setShowWorkedReview(!hasIndependentStudy); }}>
                Reopen multi-ply board and saved branch
              </button>
            )}

            {phase === "result" &&
              score && (!hasDeepBranches || deepDone) && showWorkedReview && (
                <>
                  <div
                    className={[
                      "calculation-result-banner",
                      score.success
                        ? "success"
                        : "repair",
                    ].join(" ")}
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <CheckCircle2 size={19} />
                    <div>
                      <strong>
                        {score.success
                          ? "Calculation held together"
                          : "A calculation link broke"}
                      </strong>
                      <span>
                        {position.explanation}
                      </span>
                    </div>
                  </div>

                  <div className="calculation-score-grid">
                    <div>
                      <span>
                        Candidate quality
                      </span>
                      <strong>
                        {Math.round(
                          score.evidence
                            .candidateScore *
                            100,
                        )}
                        %
                      </strong>
                    </div>
                    <div>
                      <span>
                        Main move
                      </span>
                      <strong>
                        {score.evidence
                          .selectedMoveScore
                          ? "Correct"
                          : "Missed"}
                      </strong>
                    </div>
                    <div>
                      <span>
                        Best reply
                      </span>
                      <strong>
                        {score.evidence
                          .replyScore
                          ? "Correct"
                          : "Missed"}
                      </strong>
                    </div>
                    <div>
                      <span>
                        Continuation
                      </span>
                      <strong>
                        {score.evidence
                          .continuationScore
                          ? "Correct"
                          : "Missed"}
                      </strong>
                    </div>
                    <div>
                      <span>
                        Line depth
                      </span>
                      <strong>
                        {
                          score.evidence
                            .lineDepth
                        }
                        /3
                      </strong>
                    </div>
                    <div>
                      <span>
                        Overall
                      </span>
                      <strong>
                        {Math.round(
                          score.quality *
                            100,
                        )}
                        %
                      </strong>
                    </div>
                  </div>

                  <div className="calculation-reference-line">
                    <span>
                      Legally replayed reference line
                    </span>
                    <strong>
                      {referenceLine.join(
                        " ",
                      )}
                    </strong>
                    <small>
                      Each move in the recorded branch is legal. This does not prove a unique best response; off-reference replies use local Stockfish when available.
                    </small>
                    <ol className="calculation-branch-steps">
                      {verifiedBranch.slice(0,5).map(row=><li key={row.ply}>
                        <strong>{row.actor==="opponent"?"Opponent":"You"} · {row.san}</strong>
                        <small>{row.ply===2?(position.replyReason??"Verify the strongest legal reply.")
                          :row.ply===3?(position.continuationReason??"Reassess the resulting position.")
                          :"Replay the legal move before continuing."}</small>
                      </li>)}
                    </ol>
                    <div className="calculation-repair-plan" role="status">
                      <strong>What to review next</strong>
                      {calculationMisconceptions(position,score.evidence).map(text=><p key={text}>{text}</p>)}
                    </div>
                  </div>

                  {!score.success && (
                    <p className="calculation-retry-note">
                      This position will be
                      scheduled sooner. You
                      can also reset it now
                      and calculate again from
                      the original board.
                    </p>
                  )}
                </>
              )}
          </div>

          <div className="lesson-controls">
            <div className="calculation-engine-state" role="status" aria-live="polite">
              <span>
                Local Stockfish
              </span>
              <strong>
                {referenceBusy
                  ? "checking hidden reply"
                  : engineStatus === "ready"
                    ? "ready"
                    : engineStatus ===
                        "loading"
                      ? "loading"
                      : "fallback line"}
              </strong>
            </div>

            <div className="lesson-button-row">
              {phase === "result" &&
                position.assessmentStatus !== "instructional-only" &&
                !score?.success && (
                  <button
                    type="button"
                    className="hint-button"
                    onClick={
                      resetExercise
                    }
                  >
                    <RotateCcw
                      size={16}
                    />{" "}
                    Retry from original
                  </button>
                )}

              {phase === "result" && position.assessmentStatus !== "instructional-only" && (
                <button
                  type="button"
                  className="primary"
                  disabled={!canFinish}
                  onClick={() => {
                    if (!score || !verifiedBranch || phase!=="result")return;
                    onComplete({
                      success:
                        score.success,
                      quality:
                        score.quality,
                      hintsUsed: 0,
                      wrongAttempts:
                        score.wrongAttempts,
                      calculationPositionId:
                        position.id,
                      calculationEvidence:
                        score.evidence,
                    });
                  }}
                >
                  {score?.success
                    ? "Finish"
                    : "Finish · retry later"}
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
