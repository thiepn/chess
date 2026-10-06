import { Chess, type Color, type Square } from "chess.js";
import { BrainCircuit, Check, ChevronRight, ExternalLink, Lightbulb, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  ChessSkill,
  SkillMastery,
  TrainingActivity,
  TrainingOutcome,
} from "../domain/types";
import { loadPuzzlesForSkill } from "../puzzles/repository";
import {
  humanPuzzleTheme,
  puzzleExplanation,
  puzzleSolutionSan,
} from "../puzzles/explanations";
import { selectPuzzle } from "../puzzles/selector";
import type { PuzzleAttemptSummary, PuzzleRecord } from "../puzzles/types";
import { StockfishBrowserEngine } from "../engine/stockfish";
import type { EngineEvaluation } from "../games/types";
import type { BoardArrow, BoardHighlight } from "../learning/types";
import { ChessBoard } from "./ChessBoard";
import { LessonRunner } from "./LessonRunner";

interface PuzzleRunnerProps {
  activity: TrainingActivity;
  skill: ChessSkill;
  mastery?: SkillMastery;
  history?: Record<string, PuzzleAttemptSummary>;
  onComplete: (outcome: TrainingOutcome) => void;
}

function applyUci(chess: Chess, encoded: string) {
  return chess.move({
    from: encoded.slice(0, 2),
    to: encoded.slice(2, 4),
    promotion: encoded.slice(4, 5) || "q",
  });
}

function sanForUci(fen: string, uci: string) {
  try {
    const chess = new Chess(fen);
    return chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4, 5) || "q",
    })?.san ?? uci;
  } catch {
    return uci;
  }
}

export function PuzzleRunner({
  activity,
  skill,
  mastery,
  history,
  onComplete,
}: PuzzleRunnerProps) {
  const [puzzle, setPuzzle] = useState<PuzzleRecord | null | undefined>(undefined);
  const [position, setPosition] = useState<string | null>(null);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [boardVersion, setBoardVersion] = useState(0);
  const [replying, setReplying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] =
    useState<EngineEvaluation | null>(null);
  const [verificationError, setVerificationError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setPuzzle(undefined);
    setPosition(null);
    setSolutionIndex(0);
    setSolved(false);
    setShowHint(false);
    setHintsUsed(0);
    setWrongAttempts(0);
    setFeedback(null);
    setVerifying(false);
    setVerification(null);
    setVerificationError(null);

    loadPuzzlesForSkill(skill.id).then((corpus) => {
      if (cancelled) return;
      const selected = selectPuzzle(corpus, {
        skillId: skill.id,
        mastery: mastery?.effectiveMastery ?? 0,
        activityDifficulty: activity.difficulty,
        targetRating: activity.adaptivePolicy?.targetPuzzleRating,
        history,
      });
      setPuzzle(selected);
      setPosition(selected?.initialFen ?? null);
      setBoardVersion((value) => value + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [
    activity.adaptivePolicy?.targetPuzzleRating,
    activity.difficulty,
    history,
    mastery?.effectiveMastery,
    skill.id,
  ]);

  const orientation = useMemo<Color>(() => {
    if (!position) return "w";
    return new Chess(position).turn();
  }, [position]);

  const explanation = useMemo(
    () => (puzzle ? puzzleExplanation(puzzle) : null),
    [puzzle],
  );
  const solutionSan = useMemo(
    () => (puzzle ? puzzleSolutionSan(puzzle) : []),
    [puzzle],
  );

  const expectedMove = puzzle?.solutionMoves[solutionIndex];
  const hintArrow: BoardArrow[] = useMemo(() => {
    if (!showHint || !expectedMove) return [];
    return [
      {
        from: expectedMove.slice(0, 2) as Square,
        to: expectedMove.slice(2, 4) as Square,
        tone: "hint",
      },
    ];
  }, [expectedMove, showHint]);

  const hintHighlights: BoardHighlight[] = useMemo(() => {
    if (!showHint || !expectedMove) return [];
    return [
      { square: expectedMove.slice(0, 2) as Square, tone: "hint" },
      { square: expectedMove.slice(2, 4) as Square, tone: "good" },
    ];
  }, [expectedMove, showHint]);

  if (puzzle === undefined) {
    return (
      <div className="puzzle-loading">
        <LoaderCircle size={28} />
        <strong>Choosing the right position…</strong>
        <span>Difficulty and recent puzzle history are being matched to this skill.</span>
      </div>
    );
  }

  if (!puzzle || !position) {
    return (
      <LessonRunner
        activity={activity}
        skill={skill}
        onComplete={onComplete}
      />
    );
  }

  const themed = activity.activityType === "themedPuzzle";
  const label = themed
    ? explanation?.motif ?? "Tactic"
    : "Mixed position";

  function showPuzzleHint() {
    if (!showHint) setHintsUsed((value) => value + 1);
    setShowHint(true);
    setFeedback(null);
  }

  function resetCurrentPosition() {
    if (!puzzle) return;
    const chess = new Chess(puzzle.initialFen);
    for (let index = 0; index < solutionIndex; index += 1) {
      applyUci(chess, puzzle.solutionMoves[index]);
    }
    setPosition(chess.fen());
    setFeedback(null);
    setBoardVersion((value) => value + 1);
  }

  async function verifyWithEngine() {
    if (!puzzle || !solved || verifying) return;

    let engine: StockfishBrowserEngine | null = null;
    setVerifying(true);
    setVerificationError(null);

    try {
      engine = await StockfishBrowserEngine.create();
      setVerification(
        await engine.evaluate(puzzle.initialFen, 12),
      );
    } catch (cause) {
      setVerificationError(
        cause instanceof Error
          ? cause.message
          : "Stockfish verification was unavailable.",
      );
    } finally {
      engine?.quit();
      setVerifying(false);
    }
  }

  function finish() {
    if (!puzzle) return;
    const penalty = hintsUsed * .12 + wrongAttempts * .1;
    onComplete({
      success: true,
      quality: Math.max(.3, 1 - penalty),
      hintsUsed,
      wrongAttempts,
      puzzleId: puzzle.id,
      puzzleRating: puzzle.rating,
      puzzleSkillIds: puzzle.skillIds,
    });
  }

  return (
    <div className="lesson-runner puzzle-runner">
      <div className="lesson-stage">
        <div className="lesson-board-column">
          <ChessBoard
            key={`${puzzle.id}-${boardVersion}`}
            fen={position}
            orientation={orientation}
            disabled={solved || replying}
            highlights={hintHighlights}
            arrows={hintArrow}
            onMove={(move) => {
              if (!expectedMove || replying) return false;
              const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
              const accepted =
                uci === expectedMove ||
                `${move.from}${move.to}` === expectedMove.slice(0, 4);

              if (!accepted) {
                setWrongAttempts((value) => value + 1);
                setFeedback("Legal move, but not the best move in this position.");
                return false;
              }

              setFeedback(null);
              setShowHint(false);

              const nextIndex = solutionIndex + 1;
              if (nextIndex >= puzzle.solutionMoves.length) {
                setSolved(true);
                return true;
              }

              const reply = puzzle.solutionMoves[nextIndex];
              const afterPlayer = new Chess(move.fen);
              const replyMove = applyUci(afterPlayer, reply);

              if (!replyMove) {
                setSolved(true);
                return true;
              }

              setReplying(true);
              window.setTimeout(() => {
                const followingIndex = nextIndex + 1;
                setPosition(afterPlayer.fen());
                setSolutionIndex(followingIndex);
                setBoardVersion((value) => value + 1);
                setReplying(false);

                if (followingIndex >= puzzle.solutionMoves.length) {
                  setSolved(true);
                }
              }, 430);

              return true;
            }}
          />

          <div className="board-caption">
            <span>{orientation === "w" ? "White" : "Black"} to move</span>
            <span>Difficulty ~{puzzle.rating}</span>
          </div>
        </div>

        <div className="lesson-instruction">
          <div>
            <p className="eyebrow">{label.toUpperCase()}</p>
            <h2>{solved ? "Position solved." : "Find the best move."}</h2>
            <p className="lesson-prompt">
              {solved
                ? "You found the full tactical sequence, including the opponent's best replies."
                : replying
                  ? "Good. Now watch the opponent's forced reply."
                  : themed
                    ? `Use the ${label.toLowerCase()} pattern, but calculate the move before playing it.`
                    : "No motif is revealed. Read the position exactly as you would in a real game."}
            </p>

            <div className="puzzle-meta">
              <span>Rated {puzzle.rating}</span>
              {puzzle.source === "lichess" && <span>Lichess · CC0</span>}
              {puzzle.openingTags?.[0] && (
                <span>{humanPuzzleTheme(puzzle.openingTags[0].replaceAll("_", " "))}</span>
              )}
            </div>

            {feedback && !solved && (
              <div className="lesson-feedback error">
                <span>{feedback}</span>
                <button type="button" onClick={resetCurrentPosition}>
                  <RotateCcw size={15} /> Reset
                </button>
              </div>
            )}

            {showHint && !solved && (
              <div className="hint-card">
                <Lightbulb size={18} />
                <div>
                  <strong>Directional hint</strong>
                  <span>The board now shows the move's origin and destination. Try to explain why it works before playing it.</span>
                </div>
              </div>
            )}

            {solved && (
              <>
                <div className="lesson-feedback success">
                  <Sparkles size={19} />
                  <div>
                    <strong>Correct sequence</strong>
                    <span>
                      {wrongAttempts === 0 && hintsUsed === 0
                        ? "Clean solve. This is strong recognition evidence."
                        : "Solved. Hints and retries will reduce the mastery evidence rather than being treated as a clean solve."}
                    </span>
                  </div>
                </div>

                {explanation && (
                  <section className="puzzle-explanation-card">
                    <div className="puzzle-explanation-head">
                      <div>
                        <span>Pattern</span>
                        <strong>{explanation.motif}</strong>
                      </div>
                      <small>
                        {themed
                          ? "Now make the pattern explicit."
                          : "The motif was hidden until after the solve."}
                      </small>
                    </div>

                    <p>{explanation.point}</p>

                    <div className="puzzle-solution-line">
                      <span>Solution</span>
                      <strong>
                        {solutionSan.length
                          ? solutionSan.join("  ")
                          : puzzle.solutionMoves.join("  ")}
                      </strong>
                    </div>

                    <div className="puzzle-alternative-note">
                      <span>Why not another move?</span>
                      <p>{explanation.alternatives}</p>
                    </div>

                    {wrongAttempts > 0 && (
                      <div className="puzzle-retry-note">
                        <RotateCcw size={14} />
                        <span>
                          You tried {wrongAttempts} alternative move{wrongAttempts === 1 ? "" : "s"}.
                          The next spaced appearance will test whether the tactical idea is now retained.
                        </span>
                      </div>
                    )}
                  </section>
                )}

                <section className="puzzle-verification">
                  <div>
                    <BrainCircuit size={17} />
                    <span>
                      <strong>Optional engine check</strong>
                      <small>
                        Verify only after solving so Stockfish never spoils the exercise.
                      </small>
                    </span>
                  </div>

                  {!verification && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={verifyWithEngine}
                      disabled={verifying}
                    >
                      {verifying ? (
                        <>
                          <LoaderCircle size={15} /> Checking…
                        </>
                      ) : (
                        "Verify with Stockfish"
                      )}
                    </button>
                  )}

                  {verification && (
                    <div className="puzzle-engine-result">
                      <span>Stockfish · depth {verification.depth}</span>
                      <strong>
                        {sanForUci(
                          puzzle.initialFen,
                          verification.bestMove,
                        )}
                      </strong>
                      <small>
                        {verification.bestMove === puzzle.solutionMoves[0]
                          ? "Matches the stored Lichess solution."
                          : puzzle.themes.includes("mateIn1")
                            ? "Different first choice at this depth. Mate-in-one positions can contain multiple winning mates."
                            : "Stockfish chose a different first move at this depth; the stored Lichess line remains the puzzle reference."}
                      </small>
                    </div>
                  )}

                  {verificationError && (
                    <small className="puzzle-engine-error">
                      {verificationError}
                    </small>
                  )}
                </section>
              </>
            )}
          </div>

          <div className="lesson-controls">
            <div className="puzzle-source-line">
              <Check size={14} />
              <span>
                {puzzle.source === "lichess"
                  ? "Curated from the open Lichess puzzle database · CC0"
                  : "Built-in offline practice position"}
              </span>
              {solved && puzzle.source === "lichess" && (
                <a
                  href={`https://lichess.org/training/${puzzle.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Original <ExternalLink size={13} />
                </a>
              )}
            </div>

            <div className="lesson-button-row">
              {!solved && !replying && (
                <button className="hint-button" type="button" onClick={showPuzzleHint}>
                  <Lightbulb size={16} />
                  {showHint ? "Hint shown" : "Show hint"}
                </button>
              )}

              {solved && (
                <button className="primary" type="button" onClick={finish}>
                  Continue <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
