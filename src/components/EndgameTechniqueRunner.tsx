import { Chess, type Square } from "chess.js";
import {
  ChevronRight,
  Flag,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
  Shield,
  CheckCircle2,
  Target,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StockfishBrowserEngine } from "../engine/stockfish";
import { scoreEndgameAttempt } from "../endgames/scoring";
import type {
  EndgameEvidence,
  EndgamePosition,
} from "../endgames/types";
import type {
  ChessSkill,
  TrainingActivity,
  TrainingOutcome,
} from "../domain/types";
import { ChessBoard } from "./ChessBoard";

interface EndgameTechniqueRunnerProps {
  activity: TrainingActivity;
  skill: ChessSkill;
  position: EndgamePosition;
  delayedRetention: boolean;
  onComplete: (
    outcome: TrainingOutcome,
  ) => void;
}

type Stage =
  | "recognition"
  | "play"
  | "result";

interface TechniqueResult {
  executionSuccess: boolean;
  outcome: EndgameEvidence["outcome"];
}

function outcomeFor(
  chess: Chess,
  playerColor: "w" | "b",
): "win" | "draw" | "loss" {
  if (chess.isCheckmate()) {
    return chess.turn() === playerColor
      ? "loss"
      : "win";
  }
  return "draw";
}

export function EndgameTechniqueRunner({
  activity,
  skill,
  position,
  delayedRetention,
  onComplete,
}: EndgameTechniqueRunnerProps) {
  const gameRef = useRef(
    new Chess(position.fen),
  );
  const engineRef =
    useRef<StockfishBrowserEngine | null>(
      null,
    );
  const finishedRef = useRef(false);

  const [stage, setStage] =
    useState<Stage>("recognition");
  const [
    recognitionChoice,
    setRecognitionChoice,
  ] = useState<string>();
  const [fen, setFen] =
    useState(position.fen);
  const [moves, setMoves] = useState<
    string[]
  >([]);
  const [
    presentationMove,
    setPresentationMove,
  ] = useState<
    | {
        from: Square;
        to: Square;
      }
    | undefined
  >();
  const [thinking, setThinking] =
    useState(false);
  const [engineReady, setEngineReady] =
    useState(false);
  const [engineError, setEngineError] =
    useState<string>();
  const [hintsUsed, setHintsUsed] =
    useState(0);
  const [result, setResult] =
    useState<TechniqueResult>();

  const recognitionCorrect =
    recognitionChoice ===
    position.recognitionAnswer;
  const playerToMove =
    gameRef.current.turn() ===
      position.playerColor &&
    !gameRef.current.isGameOver();

  const score = useMemo(
    () =>
      result
        ? scoreEndgameAttempt({
            position,
            recognitionCorrect,
            executionSuccess:
              result.executionSuccess,
            outcome: result.outcome,
            plies: moves.length,
            hintsUsed,
            delayedRetention,
          })
        : undefined,
    [
      result,
      position,
      recognitionCorrect,
      moves.length,
      hintsUsed,
      delayedRetention,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    StockfishBrowserEngine.create()
      .then((engine) => {
        if (cancelled) {
          engine.quit();
          return;
        }
        engineRef.current = engine;
        setEngineReady(true);
      })
      .catch((cause) => {
        if (!cancelled) {
          setEngineError(
            cause instanceof Error
              ? cause.message
              : "Stockfish could not load.",
          );
        }
      });

    return () => {
      cancelled = true;
      engineRef.current?.quit();
      engineRef.current = null;
    };
  }, [position.id]);

  function resetPlay() {
    gameRef.current = new Chess(
      position.fen,
    );
    finishedRef.current = false;
    setFen(position.fen);
    setMoves([]);
    setPresentationMove(undefined);
    setThinking(false);
    setResult(undefined);
    setStage("play");
  }

  function finish(
    executionSuccess: boolean,
    outcome: EndgameEvidence["outcome"],
  ) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setResult({
      executionSuccess,
      outcome,
    });
    setStage("result");
  }

  function finishIfNeeded() {
    const chess = gameRef.current;

    if (chess.isGameOver()) {
      const outcome = outcomeFor(
        chess,
        position.playerColor,
      );
      finish(
        position.successOutcomes.includes(
          outcome === "loss"
            ? "draw"
            : outcome,
        ) && outcome !== "loss",
        outcome,
      );
      return true;
    }

    if (
      position.objectiveType ===
        "hold" &&
      position.survivalPlies &&
      moves.length >=
        position.survivalPlies
    ) {
      finish(true, "survived");
      return true;
    }

    if (
      moves.length >=
      position.maxPlies
    ) {
      finish(false, "limit");
      return true;
    }

    return false;
  }

  useEffect(() => {
    if (
      stage !== "play" ||
      result ||
      thinking ||
      !engineReady ||
      !engineRef.current ||
      finishedRef.current
    ) {
      return;
    }

    const chess = gameRef.current;
    if (finishIfNeeded()) return;
    if (
      chess.turn() ===
      position.playerColor
    ) {
      return;
    }

    let cancelled = false;
    setThinking(true);
    engineRef.current
      .chooseMove(chess.fen(), {
        skillLevel: 18,
        depth:
          position.difficulty >= 5
            ? 12
            : 10,
      })
      .then((evaluation) => {
        if (
          cancelled ||
          finishedRef.current
        ) {
          return;
        }

        const encoded =
          evaluation.bestMove;
        if (
          !encoded ||
          encoded === "(none)"
        ) {
          finishIfNeeded();
          return;
        }

        let move;
        try {
          move = chess.move({
            from: encoded.slice(0, 2),
            to: encoded.slice(2, 4),
            promotion:
              encoded.slice(4, 5) ||
              "q",
          });
        } catch {
          move = null;
        }

        if (!move) {
          setEngineError(
            "Stockfish returned an illegal endgame move.",
          );
          return;
        }

        setMoves((previous) => [
          ...previous,
          move.san,
        ]);
        setPresentationMove({
          from: move.from as Square,
          to: move.to as Square,
        });
        setFen(chess.fen());
      })
      .catch((cause) => {
        if (!cancelled) {
          setEngineError(
            cause instanceof Error
              ? cause.message
              : "The endgame opponent failed.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setThinking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    fen,
    stage,
    result,
    thinking,
    engineReady,
    position.playerColor,
    position.difficulty,
    position.objectiveType,
    position.survivalPlies,
    position.maxPlies,
    moves.length,
  ]);

  useEffect(() => {
    if (
      stage === "play" &&
      !thinking &&
      moves.length > 0
    ) {
      finishIfNeeded();
    }
  }, [moves.length, stage, thinking]);

  const visibleCue =
    hintsUsed > 0
      ? position.processCues[
          Math.min(
            hintsUsed - 1,
            position.processCues.length -
              1,
          )
        ]
      : undefined;

  if (stage === "recognition") {
    return (
      <div className="endgame-runner">
        <div className="endgame-header">
          <div>
            <p className="eyebrow">
              ENDGAME & TECHNIQUE
            </p>
            <h2>{position.title}</h2>
            <p>{position.subtitle}</p>
          </div>
          <span>
            {skill.title}
          </span>
        </div>

        <div className="endgame-recognition-layout">
          <div className="endgame-preview-board">
            <ChessBoard
              fen={position.fen}
              orientation={
                position.playerColor
              }
              disabled
            />
          </div>

          <div className="endgame-recognition-panel">
            <div className="endgame-objective">
              <Target size={17} />
              <div>
                <span>Objective</span>
                <strong>
                  {position.objective}
                </strong>
              </div>
            </div>

            <h3>
              {position.recognitionPrompt}
            </h3>

            <div className="endgame-recognition-options">
              {position.recognitionOptions.map(
                (option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      recognitionChoice ===
                      option.id
                        ? "active"
                        : ""
                    }
                    aria-pressed={recognitionChoice === option.id}
                    onClick={() =>
                      setRecognitionChoice(
                        option.id,
                      )
                    }
                  >
                    {option.label}
                  </button>
                ),
              )}
            </div>

            {recognitionChoice && (
              <div
                className={[
                  "endgame-recognition-feedback",
                  recognitionCorrect
                    ? "correct"
                    : "incorrect",
                ].join(" ")}
                role={recognitionCorrect ? "status" : "alert"}
                aria-live={recognitionCorrect ? "polite" : "assertive"}
                aria-atomic="true"
              >
                <BrainCircuit
                  size={16}
                />
                <span>
                  {
                    position
                      .recognitionOptions
                      .find(
                        (option) =>
                          option.id ===
                          recognitionChoice,
                      )
                      ?.explanation
                  }
                </span>
              </div>
            )}

            <button
              className="primary"
              type="button"
              disabled={
                !recognitionChoice ||
                !engineReady
              }
              onClick={() =>
                setStage("play")
              }
            >
              {engineReady
                ? "Play it out"
                : "Loading resistance…"}
              <ChevronRight
                size={17}
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="endgame-runner">
      <div className="endgame-header">
        <div>
          <p className="eyebrow">
            {position.objectiveType ===
            "hold"
              ? "DEFENSIVE TECHNIQUE"
              : "CONVERSION TECHNIQUE"}
          </p>
          <h2>{position.title}</h2>
          <p>{position.objective}</p>
        </div>
        <div className="endgame-status-chip" role="status" aria-live="polite">
          {thinking ? (
            <LoaderCircle
              className="spin"
              size={15}
            />
          ) : position.objectiveType ===
            "hold" ? (
            <Shield size={15} />
          ) : (
            <Flag size={15} />
          )}
          <span>
            {thinking
              ? "Opponent thinking"
              : result
                ? "Attempt complete"
                : "Your technique"}
          </span>
        </div>
      </div>

      <div className="endgame-play-layout">
        <div className="endgame-board-column">
          <ChessBoard
            key={`${position.id}-${fen}`}
            fen={fen}
            orientation={
              position.playerColor
            }
            disabled={
              stage !== "play" ||
              !playerToMove ||
              thinking ||
              Boolean(result) ||
              Boolean(engineError)
            }
            presentationMove={
              presentationMove
            }
            onMove={(boardMove) => {
              if (
                stage !== "play" ||
                !playerToMove ||
                thinking ||
                result
              ) {
                return false;
              }

              const chess =
                gameRef.current;
              let move;
              try {
                move = chess.move({
                  from: boardMove.from,
                  to: boardMove.to,
                  promotion:
                    boardMove.promotion ||
                    "q",
                });
              } catch {
                move = null;
              }

              if (!move) return false;

              setMoves((previous) => [
                ...previous,
                move.san,
              ]);
              setPresentationMove(
                undefined,
              );
              setFen(chess.fen());
              return true;
            }}
          />

          <div className="board-caption">
            <span>
              {moves.length} plies
            </span>
            <span>
              {position.objectiveType ===
                "hold" &&
              position.survivalPlies
                ? `Hold target: ${position.survivalPlies} plies`
                : `Technique limit: ${position.maxPlies} plies`}
            </span>
          </div>
        </div>

        <aside className="endgame-side-panel">
          <div className="endgame-technique-card">
            <span>Technique</span>
            <strong>
              {position.subtitle}
            </strong>
            <p>
              {
                position.processCues[
                  0
                ]
              }
            </p>
          </div>

          {visibleCue && (
            <div className="hint-card" role="status" aria-live="polite">
              <Lightbulb
                size={16}
              />
              <div>
                <strong>
                  Process cue{" "}
                  {hintsUsed}
                </strong>
                <span>
                  {visibleCue}
                </span>
              </div>
            </div>
          )}

          {!result && (
            <button
              className="secondary"
              type="button"
              disabled={
                hintsUsed >=
                position.processCues
                  .length
              }
              onClick={() =>
                setHintsUsed(
                  (value) => value + 1,
                )
              }
            >
              <Lightbulb size={16} />
              Next process cue
            </button>
          )}

          <div className="endgame-move-strip">
            <span>Recent moves</span>
            <strong>
              {moves.slice(-8).join(
                " ",
              ) || "—"}
            </strong>
          </div>

          {engineError && (
            <div className="analysis-error" role="alert">
              <strong>
                Resistance unavailable
              </strong>
              <span>
                {engineError}
              </span>
            </div>
          )}

          {!result && (
            <button
              className="resign-button"
              type="button"
              disabled={
                moves.length === 0
              }
              onClick={() =>
                finish(
                  false,
                  "resigned",
                )
              }
            >
              <Flag size={15} />
              End attempt
            </button>
          )}

          {result && score && (
            <div
              className={[
                "endgame-result-card",
                score.success
                  ? "success"
                  : "repair",
              ].join(" ")}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <div>
                {score.success ? (
                  <Sparkles
                    size={21}
                  />
                ) : (
                  <RotateCcw
                    size={21}
                  />
                )}
                <div>
                  <span>
                    {score.success
                      ? "Technique held"
                      : "Technique broke"}
                  </span>
                  <strong>
                    {score.success
                      ? position.successNote
                      : position.failureNote}
                  </strong>
                </div>
              </div>

              <div className="endgame-result-grid">
                <div>
                  <span>
                    Recognition
                  </span>
                  <strong>
                    {recognitionCorrect
                      ? "Correct"
                      : "Missed"}
                  </strong>
                </div>
                <div>
                  <span>
                    Execution
                  </span>
                  <strong>
                    {score.success
                      ? "Passed"
                      : "Retry"}
                  </strong>
                </div>
                <div>
                  <span>
                    Quality
                  </span>
                  <strong>
                    {Math.round(
                      score.quality *
                        100,
                    )}
                    %
                  </strong>
                </div>
                <div>
                  <span>
                    Retention
                  </span>
                  <strong>
                    {delayedRetention
                      ? "Delayed"
                      : "Fresh"}
                  </strong>
                </div>
              </div>

              {!score.success && (
                <button
                  className="secondary"
                  type="button"
                  onClick={resetPlay}
                >
                  <RotateCcw
                    size={16}
                  />
                  Retry same position
                </button>
              )}

              <button
                className="primary"
                type="button"
                onClick={() =>
                  onComplete({
                    success:
                      score.success,
                    quality:
                      score.quality,
                    hintsUsed,
                    wrongAttempts:
                      score.success
                        ? 0
                        : 1,
                    endgamePositionId:
                      position.id,
                    endgameEvidence:
                      score.evidence,
                  })
                }
              >
                {score.success
                  ? "Finish"
                  : "Finish · return sooner"}
                <ChevronRight
                  size={17}
                />
              </button>
            </div>
          )}

          <div className="endgame-source-note">
            <Target size={14} />
            <span>
              Recognition and practical
              execution are scored
              separately. Stockfish plays
              the resisting side locally.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
