import { Chess, type Color, type Square } from "chess.js";
import { Check, ChevronRight, Lightbulb, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  ChessSkill,
  SkillMastery,
  TrainingActivity,
  TrainingOutcome,
} from "../domain/types";
import { loadPuzzlesForSkill } from "../puzzles/repository";
import { selectPuzzle } from "../puzzles/selector";
import type { PuzzleAttemptSummary, PuzzleRecord } from "../puzzles/types";
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

function humanTheme(theme: string) {
  return theme
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
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

    loadPuzzlesForSkill(skill.id).then((corpus) => {
      if (cancelled) return;
      const selected = selectPuzzle(corpus, {
        skillId: skill.id,
        mastery: mastery?.effectiveMastery ?? 0,
        activityDifficulty: activity.difficulty,
        history,
      });
      setPuzzle(selected);
      setPosition(selected?.initialFen ?? null);
      setBoardVersion((value) => value + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [activity.difficulty, history, mastery?.effectiveMastery, skill.id]);

  const orientation = useMemo<Color>(() => {
    if (!position) return "w";
    return new Chess(position).turn();
  }, [position]);

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
    ? humanTheme(puzzle.themes.find((theme) => !["short", "oneMove", "long"].includes(theme)) ?? "Tactic")
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

  function finish() {
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
                <span>{humanTheme(puzzle.openingTags[0].replaceAll("_", " "))}</span>
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
              <div className="lesson-feedback success">
                <Sparkles size={19} />
                <div>
                  <strong>Correct sequence</strong>
                  <span>
                    {wrongAttempts === 0 && hintsUsed === 0
                      ? "Clean solve. This is strong recognition evidence."
                      : "Solved. The app will account for hints and retries when updating mastery."}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="lesson-controls">
            <div className="puzzle-source-line">
              <Check size={14} />
              <span>
                {puzzle.source === "lichess"
                  ? "Curated from the open Lichess puzzle database"
                  : "Built-in offline practice position"}
              </span>
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
