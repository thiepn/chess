import { sameUciMove } from "../learning/uci";
import { Chess, type Color, type Square } from "chess.js";
import { Check, ChevronRight, ExternalLink, Lightbulb, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChessSkill,
  SkillMastery,
  TrainingActivity,
  TrainingOutcome,
} from "../domain/types";
import { loadPuzzlesForSkill, loadMixedPuzzlesForSkill } from "../puzzles/repository";
import {
  humanPuzzleTheme,
  puzzleExplanation,
  loadPuzzleCoaching,
} from "../puzzles/explanations";
import { selectPuzzle } from "../puzzles/selector";
import { legalPuzzleLine, puzzleRetryAt } from "../puzzles/practiceQuality";
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
  relatedGame?: {gameId:string;moveNumber:number};
  onOpenReviewGame?: (gameId:string)=>void;
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
  relatedGame,
  onOpenReviewGame,
  onComplete,
}: PuzzleRunnerProps) {
  const [puzzle, setPuzzle] = useState<PuzzleRecord | null | undefined>(undefined);
  const [position, setPosition] = useState<string | null>(null);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [wrongMoves,setWrongMoves] = useState<string[]>([]);
  const [revealed,setRevealed] = useState(false);
  const [lastReply,setLastReply] = useState<string|null>(null);
  const [replyChecks,setReplyChecks] = useState<string[]>([]);
  const [motifAdvice,setMotifAdvice] = useState<Record<string,string>>();
  const completing=useRef(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [boardVersion, setBoardVersion] = useState(0);
  const [replying, setReplying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] =
    useState<EngineEvaluation | null>(null);
  const [verificationError, setVerificationError] =
    useState<string | null>(null);

  useEffect(()=>{
    let cancelled=false;
    void loadPuzzleCoaching().then(advice=>{if(!cancelled)setMotifAdvice(advice);})
      .catch(()=>{if(!cancelled)setMotifAdvice(undefined);});
    return ()=>{cancelled=true;};
  },[]);

  useEffect(() => {
    let cancelled = false;
    completing.current=false;

    setPuzzle(undefined);
    setPosition(null);
    setSolutionIndex(0);
    setSolved(false);
    setShowHint(false);
    setHintsUsed(0);
    setWrongAttempts(0);
    setWrongMoves([]);
    setRevealed(false);
    setLastReply(null);
    setReplyChecks([]);
    setFeedback(null);
    setVerifying(false);
    setVerification(null);
    setVerificationError(null);

    (activity.activityType === "mixedPuzzle"
      ? loadMixedPuzzlesForSkill(skill.id)
      : loadPuzzlesForSkill(skill.id)).then((corpus) => {
      if (cancelled) return;
      const selected = selectPuzzle(corpus, {
        skillId: skill.id,
        mastery: mastery?.effectiveMastery ?? 0,
        activityDifficulty: activity.difficulty,
        targetRating: activity.adaptivePolicy?.targetPuzzleRating,
        history,
        mixed:activity.activityType==="mixedPuzzle",
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
    activity.activityType,
    history,
    mastery?.effectiveMastery,
    skill.id,
  ]);

  const orientation = useMemo<Color>(() => {
    if (!position) return "w";
    return new Chess(position).turn();
  }, [position]);

  const explanation = useMemo(
    () => (puzzle ? puzzleExplanation(puzzle,motifAdvice) : null),
    [puzzle,motifAdvice],
  );

  const verifiedLine=useMemo(()=>puzzle?legalPuzzleLine(puzzle):null,[puzzle]);
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

  if (puzzle && !verifiedLine) {
    return <div className="puzzle-loading" role="alert">
      <strong>Invalid stored puzzle continuation</strong>
      <span>Practice has stopped; no result can be awarded from this source.</span>
    </div>;
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
    if (hintsUsed>=2)return;
    setHintsUsed(value=>value+1);
    if(hintsUsed>=1)setShowHint(true);
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

  function revealStoredLine() {
    if(!puzzle || !verifiedLine || solved)return;
    setRevealed(true);
    setSolved(true);
    setReplying(false);
  }

  async function verifyWithEngine() {
    if (!puzzle || !solved || verifying) return;

    let engine: StockfishBrowserEngine | null = null;
    setVerifying(true);
    setVerificationError(null);

    try {
      engine = await StockfishBrowserEngine.create();
      setVerification(await engine.evaluate(puzzle.initialFen, 12));
      const checks:string[]=[];
      const board=new Chess(puzzle.initialFen);
      for(let i=0;i<puzzle.solutionMoves.length && checks.length<2;i++){
        if(i%2===1){
          const result=await engine.evaluate(board.fen(),10);
          checks.push(result.bestMove===puzzle.solutionMoves[i]
            ? `Reply ${checks.length+1}: matches engine at depth 10`
            : `Reply ${checks.length+1}: reference line differs from depth-10 engine choice`);
        }
        applyUci(board,puzzle.solutionMoves[i]);
      }
      setReplyChecks(checks);
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
    if (!puzzle || !verifiedLine || completing.current || !solved)return;
    completing.current=true;
    const success=!revealed;
    onComplete({
      success,
      quality:success?Math.max(.2,Math.round(100-hintsUsed*20-wrongMoves.length*12)/100):0,
      hintsUsed,
      wrongAttempts:wrongMoves.length,
      puzzleId:puzzle.id,puzzleRating:puzzle.rating,puzzleSkillIds:puzzle.skillIds,
      puzzlePractice:{sourceFen:puzzle.initialFen,solutionMoves:[...puzzle.solutionMoves],
        wrongMoves:[...wrongMoves],completed:success},
    });
  }

  return (
    <div className="lesson-runner puzzle-runner training-workspace">
      <div className="lesson-stage training-workspace-stage">
        <div className="lesson-board-column training-workspace-board">
          <ChessBoard
            key={`${puzzle.id}-${boardVersion}`}
            fen={position}
            orientation={orientation}
            disabled={solved || replying}
            highlights={hintHighlights}
            arrows={hintArrow}
            onMove={(move) => {
              if (!expectedMove || replying || revealed || wrongMoves.length>=40)return false;
              const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
              const accepted = sameUciMove(uci, expectedMove);

              if (!accepted) {
                setWrongAttempts((value) => value + 1);
                setWrongMoves(old=>[...old,uci].slice(-40));
                setFeedback(`${sanForUci(position,uci)} is legal, but is not the stored reference. ${themed ? explanation?.point ?? "Calculate the best reply." : "Recheck forcing replies and quiet defensive resources."} Other legal alternatives are not scored as engine errors.`);
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
                setFeedback("The stored reply is illegal. This position cannot award a result.");
                return false;
              }

              setReplying(true);
              window.setTimeout(() => {
                const followingIndex = nextIndex + 1;
                setPosition(afterPlayer.fen());
                setLastReply(replyMove.san);
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

        <div className="lesson-instruction training-workspace-panel">
          <div className="training-workspace-reading">
            <p className="eyebrow">{label.toUpperCase()}</p>
            <h2>{revealed?"Study the reference line.":solved ? "Position solved." : "Find the reference move."}</h2>
            <p className="lesson-prompt">
              {solved
                ? revealed
                  ? "The answer was revealed. This is a missed attempt, not independent mastery."
                  : "You followed the stored tactical continuation, including legally checked opponent replies."
                : replying
                  ? "Good. Now watch the opponent's forced reply."
                  : themed
                    ? `Use the ${label.toLowerCase()} pattern, but calculate the move before playing it.`
                    : "No motif is given. Calculate checks, captures, quiet threats and defensive resources. Predict the strongest reply."}
            </p>

            <div className="puzzle-attempt-progress" role="progressbar"
              aria-label="Puzzle continuation progress"
              aria-valuemin={0} aria-valuemax={puzzle.solutionMoves.length}
              aria-valuenow={solved ? puzzle.solutionMoves.length : Math.min(solutionIndex, puzzle.solutionMoves.length)}>
              <span style={{ width: `${((solved ? puzzle.solutionMoves.length : solutionIndex) / Math.max(1, puzzle.solutionMoves.length)) * 100}%` }} />
            </div>
            <div className="puzzle-meta">
              <span>Rated {puzzle.rating}</span>
              {puzzle.source === "lichess" && <span>Lichess · CC0</span>}
              {(solved || themed) && puzzle.openingTags?.[0] && (
                <span>{humanPuzzleTheme(puzzle.openingTags[0].replaceAll("_", " "))}</span>
              )}
            </div>

            {lastReply && !revealed && <p className="puzzle-reply-status" role="status">
              Recorded opponent reply: {lastReply} · checked legal against the puzzle position.
            </p>}
            {feedback && !solved && (
              <div className="lesson-feedback error" role="alert" aria-atomic="true">
                <span>{feedback}</span>
                <button type="button" onClick={resetCurrentPosition}>
                  <RotateCcw size={15} /> Reset
                </button>
              </div>
            )}

            {hintsUsed>0 && !solved && (
              <div className="hint-card" role="status" aria-live="polite">
                <Lightbulb size={18} />
                <div>
                  <strong>{showHint?"Move hint":"Concept hint"}</strong>
                  <span>{showHint?"The reference move is marked. This counts as assisted practice.":themed ? explanation?.point ?? "Calculate the reply." : "Look for checks, captures and quieter defensive resources, then forecast the opponent's reply."}</span>
                </div>
              </div>
            )}

            {solved && (
              <>
                <div className="lesson-feedback success" role="status" aria-live="polite" aria-atomic="true">
                  <Check size={19} />
                  <div>
                    <strong>Correct sequence</strong>
                    <span>
                      {revealed?"Revealed. No puzzle success or mastery credit."
                        : wrongAttempts === 0 && hintsUsed === 0
                          ? "Independent clean solve. Retention is checked later."
                          : "Assisted solve. Repeat later without hints for independent recall."}
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
                    <p className="puzzle-retry-note">
                      Before engine analysis, compare two candidate moves and the
                      strongest legal reply to each. Why is the stored continuation
                      better against a resourceful defender? Legal replay alone
                      does not establish a unique best move.
                    </p>

                    <div className="puzzle-solution-line">
                      <span>Solution</span>
                      <strong>
                        {verifiedLine?.length
                          ? verifiedLine.join("  ")
                          : puzzle.solutionMoves.join("  ")}
                      </strong>
                    </div>

                    <div className="puzzle-alternative-note">
                      <span>Why not another move?</span>
                      <p>{explanation.alternatives}</p>
                    </div>

                    <p className="puzzle-retry-note">
                      Next spaced practice: {new Date(revealed
                        ? Date.now()+6*3_600_000
                        : puzzleRetryAt(history?.[puzzle.id],
                            hintsUsed===0&&wrongMoves.length===0,new Date()).next).toLocaleString()}.
                      {revealed?" Missed attempt (6-hour return).":
                        hintsUsed||wrongMoves.length?" Assisted return in 12 hours.":" Independent recall interval."}
                    </p>
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
                    <Check size={17} />
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
                    <div className="puzzle-engine-result" role="status" aria-live="polite" aria-atomic="true">
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

                  {replyChecks.length>0 && <p className="puzzle-reply-status" role="status">
                    {replyChecks.join(" · ")}. Depth-10 analysis is not proof of a unique best reply.
                  </p>}
                  {verificationError && (
                    <small className="puzzle-engine-error" role="alert">
                      {verificationError}
                    </small>
                  )}
                </section>
              </>
            )}
          </div>

          <div className="lesson-controls training-workspace-actions">
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
                  {hintsUsed===0?"Concept hint":hintsUsed===1?"Show move hint":"Hints shown"}
                </button>
              )}

              {!solved && <button className="secondary" type="button"
                onClick={revealStoredLine}>Reveal and schedule retry</button>}
              {solved && (
                <button className="primary" type="button" onClick={finish}>
                  {revealed?"Record missed puzzle":"Record solve"} <ChevronRight size={18} />
                </button>
              )}
              {solved && relatedGame && onOpenReviewGame && (
                <button className="secondary" type="button"
                  onClick={()=>onOpenReviewGame(relatedGame.gameId)}>
                  Study related saved-game mistake · move {relatedGame.moveNumber}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
