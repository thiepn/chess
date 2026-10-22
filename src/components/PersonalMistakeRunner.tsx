import { Chess, type Color, type Square } from "chess.js";
import { CheckCircle2, ChevronRight, Lightbulb, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { reviewAttemptQuality } from "../review/practiceLoop";
import type { TrainingOutcome } from "../domain/types";
import type { PersonalMistake } from "../games/types";
import type { BoardArrow, BoardHighlight } from "../learning/types";
import { legalVariation } from "../review/variation";
import { ChessBoard } from "./ChessBoard";

interface PersonalMistakeRunnerProps {
  mistake: PersonalMistake;
  /** Account-scoped key; never use the previous account's unsent attempt. */
  storageOwner: string;
  onComplete: (outcome: TrainingOutcome) => boolean | void;
}
interface PracticeDraft {
  owner: string;
  mistakeId: string;
  fen: string;
  bestMove: string;
  moves: string[];
  hint: boolean;
  solved: boolean;
  revealed: boolean;
}
function draftKey(owner: string, id: string) {
  return "chess:review-practice-p86:" + encodeURIComponent(owner) + ":" + encodeURIComponent(id);
}
function legalChoice(fen: string, uci: string): boolean {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return false;
  try {
    const position = new Chess(fen);
    return Boolean(position.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci.slice(4,5) || "q"}));
  } catch { return false; }
}
function matchesBest(choice: string, best: string) {
  return choice === best;
}
function restoreDraft(owner: string, mistake: PersonalMistake): PracticeDraft {
  const initial: PracticeDraft = {
    owner, mistakeId:mistake.id, fen:mistake.positionFen, bestMove:mistake.bestMove,
    moves:[], hint:false, solved:false, revealed:false,
  };
  try {
    const raw = sessionStorage.getItem(draftKey(owner,mistake.id));
    if (!raw) return initial;
    const entry = JSON.parse(raw) as PracticeDraft;
    if (entry.owner !== owner || entry.mistakeId !== mistake.id ||
        entry.fen !== mistake.positionFen || entry.bestMove !== mistake.bestMove ||
        !Array.isArray(entry.moves) || entry.moves.length > 40 ||
        entry.moves.some(m => typeof m !== "string" || !legalChoice(mistake.positionFen,m))) return initial;
    const last = entry.moves.at(-1);
    if (typeof entry.hint !== "boolean" || typeof entry.solved !== "boolean" ||
        typeof entry.revealed !== "boolean" ||
        (entry.solved && (!last || !matchesBest(last,mistake.bestMove) ||
          entry.moves.filter(m => matchesBest(m,mistake.bestMove)).length !== 1)) ||
        (!entry.solved && entry.moves.includes(mistake.bestMove)) ||
        (entry.revealed && entry.solved)) return initial;
    return entry;
  } catch { return initial; }
}

function evalLabel(cp: number) {
  if (Math.abs(cp) > 90_000) return cp > 0 ? "winning" : "lost";
  const value = cp / 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

export function PersonalMistakeRunner({ mistake, storageOwner, onComplete }: PersonalMistakeRunnerProps) {
  const [draft, setDraft] = useState(() => restoreDraft(storageOwner, mistake));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [boardVersion, setBoardVersion] = useState(0);
  const [lineStep, setLineStep] = useState(0);
  const completing = useRef(false);
  const orientation = mistake.playerColor as Color;
  const triedMoves = draft.moves;
  const solved = draft.solved;
  const finished = solved || draft.revealed;
  const wrongAttempts = triedMoves.filter(m => !matchesBest(m,mistake.bestMove)).length;
  const hintsUsed = draft.hint ? 1 : 0;

  const line = useMemo(() => {
    if (mistake.principalVariation[0] !== mistake.bestMove) return [];
    return legalVariation(mistake.positionFen, mistake.principalVariation);
  }, [mistake.positionFen, mistake.principalVariation, mistake.bestMove]);
  const bestSan = line[0]?.san ?? "No verified engine move";
  const currentFen = finished && lineStep > 0
    ? line[lineStep - 1]?.fen ?? mistake.positionFen
    : mistake.positionFen;

  useEffect(() => {
    if (draft.owner !== storageOwner || draft.mistakeId !== mistake.id ||
        draft.fen !== mistake.positionFen || draft.bestMove !== mistake.bestMove) return;
    try {
      sessionStorage.setItem(draftKey(storageOwner,mistake.id),JSON.stringify(draft));
    } catch { /* Private/session storage disabled: never claim durable recovery. */ }
  }, [storageOwner, mistake.id, draft]);

  function appendMove(move: string, accepted: boolean) {
    setDraft(d => d.moves.length >= 40 || d.solved || d.revealed ? d : ({
      ...d, moves:[...d.moves,move], solved:accepted,
    }));
  }
  const hintArrows: BoardArrow[] = draft.hint && !finished
    ? [{from:mistake.bestMove.slice(0,2) as Square,to:mistake.bestMove.slice(2,4) as Square,tone:"hint"}] : [];
  const hintHighlights: BoardHighlight[] = draft.hint && !finished
    ? [{square:mistake.bestMove.slice(0,2) as Square,tone:"hint"},
       {square:mistake.bestMove.slice(2,4) as Square,tone:"good"}] : [];

  function finish() {
    if (completing.current || !finished || draft.owner !== storageOwner ||
        draft.fen !== mistake.positionFen || draft.bestMove !== mistake.bestMove) return;
    completing.current = true;
    const accepted = onComplete({
      success:solved,quality:reviewAttemptQuality(solved,hintsUsed,wrongAttempts),
      hintsUsed,wrongAttempts,mistakeId:mistake.id,
      mistakePractice:{
        playedMove:triedMoves.at(-1) ?? null,
        triedMoves:[...triedMoves],
      },
    });
    if (accepted === false) {
      completing.current = false;
      setFeedback("This game or Chess account changed. Your practice was not recorded.");
      return;
    }
    // Remove only after the parent accepted the verified event; replaying an
    // old finished tab draft must never count the same action again.
    try { sessionStorage.removeItem(draftKey(storageOwner,mistake.id)); }
    catch { /* A blocked storage backend cannot be claimed as durable. */ }
  }

  return (
    <div className="lesson-runner mistake-runner training-workspace">
      <div className="lesson-stage training-workspace-stage">
        <div className="lesson-board-column training-workspace-board">
          <ChessBoard
            key={`${mistake.id}-${boardVersion}-${lineStep}`}
            fen={currentFen}
            orientation={orientation}
            disabled={finished}
            highlights={hintHighlights}
            arrows={hintArrows}
            onMove={(move) => {
              if (draft.moves.length >= 40) {
                setFeedback("Attempt limit reached. Reveal the engine choice to record a missed attempt.");
                return false;
              }
              const uci=`${move.from}${move.to}${move.promotion ?? ""}`;
              const accepted=matchesBest(uci,mistake.bestMove);
              appendMove(uci,accepted);
              if (accepted) {
                setFeedback(null);
                return true;
              }
              setFeedback("That move is legal, but not the source-verified engine choice. Inspect the position and try again.");
              return false;
            }}
          />
          <div className="board-caption">
            <span>{orientation === "w" ? "White" : "Black"} to move</span>
            <span>From your saved game · move {mistake.moveNumber}</span>
          </div>
          {finished && line.length > 1 && (
            <section className="review-practice-line" aria-label="Source-verified tactical continuation">
              <strong aria-live="polite">Engine continuation · {lineStep}/{line.length}</strong>
              <div className="review-practice-line-steps">
                <button type="button" aria-current={lineStep === 0 ? "step" : undefined}
                  onClick={() => setLineStep(0)}>Start</button>
                {line.map(step => (
                  <button type="button" key={step.ply}
                    aria-current={lineStep === step.ply ? "step" : undefined}
                    onClick={() => setLineStep(step.ply)}>{step.ply}. {step.san}</button>
                ))}
              </div>
              <p>Moves are replayed legally from the saved source. The reply is a recorded engine line, not proof that other legal responses lose.</p>
              {line[1] && <p><strong>Opponent's recorded response: {line[1].san}.</strong> Rebuild the board after that reply before judging your plan.</p>}
            </section>
          )}
        </div>
        <div className="lesson-instruction training-workspace-panel">
          <div className="training-workspace-reading">
            <p className="eyebrow">FROM YOUR OWN GAME · TRAINING</p>
            <h2>{solved ? "You found the engine's choice." : draft.revealed
              ? "Review the stronger choice." : "What should you play instead?"}</h2>
            <p className="lesson-prompt">{finished ? mistake.explanation
              : mistake.errorType==="strategic-plan"
                ? "Identify the worst-placed piece, your plan and Black or White's strongest counterplay before moving. Only actual attempts change progress."
                : mistake.errorType==="calculation-failure"
                ? "Calculate candidate, opponent's strongest reply and your continuation before moving."
                : "Play a legal candidate before seeing the engine suggestion. Only actual attempts change your training progress."}</p>
            {finished && (mistake.errorReason || mistake.errorType) && (
              <div className="lesson-feedback" role="status">
                <strong>{mistake.errorType?.replaceAll("-"," ") ?? "Game decision"}</strong>
                <span>{mistake.errorReason ?? "Reconstruct the original tactical or strategic choice, then verify the opponent's reply."}</span>
              </div>
            )}
            <p className="review-practice-context" aria-live="polite">
              {triedMoves.length} attempted move{triedMoves.length === 1 ? "" : "s"} ·
              {wrongAttempts} incorrect · {hintsUsed} hint{hintsUsed === 1 ? "" : "s"}
            </p>
            {!finished && draft.hint && (
              <div className="hint-card">
                <Lightbulb size={18} />
                <div><strong>Directional hint</strong><span>The board highlights the recorded engine choice.</span></div>
              </div>
            )}
            {!finished && feedback && (
              <div className="lesson-feedback error" role="status">
                <span>{feedback}</span>
                <button type="button" onClick={() => {
                  setFeedback(null);
                  setBoardVersion(x=>x+1);
                }}><RotateCcw size={15} /> Reset</button>
              </div>
            )}
            {finished && (
              <>
                <p className="review-practice-context" role="status">
                  {solved && !hintsUsed && !wrongAttempts
                    ? "Independent recall · a clean answer extends your next review."
                    : solved
                      ? "Supported solution · repeat soon without hints or wrong moves."
                      : "Missed attempt · this position returns for practice in about six hours."}
                  {" "}Verified practice quality: {Math.round(reviewAttemptQuality(solved,hintsUsed,wrongAttempts) * 100)}%.
                </p>
                <div className={`lesson-feedback ${solved ? "success" : "error"}`}>
                  <CheckCircle2 size={19} />
                  <div>
                    <strong>{bestSan} is the verified engine suggestion.</strong>
                    <span>You originally played {mistake.actualSan}. Your-side engine score changed from {evalLabel(mistake.evaluationBefore)} to {evalLabel(mistake.evaluationAfter)}.</span>
                  </div>
                </div>
                <div className="mistake-line">
                  <span>Original move</span><strong>{mistake.actualSan}</strong>
                  <span>Engine choice</span><strong>{bestSan}</strong>
                  <span>Approximate cost</span><strong>{(mistake.centipawnLoss / 100).toFixed(1)} pawns</strong>
                </div>
              </>
            )}
          </div>
          <div className="lesson-controls training-workspace-actions">
            <div className="lesson-button-row">
              {!finished && (
                <>
                  <button className="hint-button" type="button"
                    onClick={() => {setDraft(d=>({...d,hint:true}));setFeedback(null);}}>
                    <Lightbulb size={16} />{draft.hint ? "Hint shown" : "Show hint"}
                  </button>
                  <button className="secondary" type="button"
                    onClick={() => {setDraft(d=>({...d,revealed:true}));setFeedback(null);}}>
                    Reveal and record missed attempt
                  </button>
                </>
              )}
              {finished && (
                <button className="primary" type="button" onClick={finish}>
                  Record {solved ? "practice" : "missed attempt"} <ChevronRight size={18} />
                </button>
              )}
            </div>
            <p className="review-practice-footnote">Recovery is local to this tab and Chess owner. Unsubmitted work cannot increase mastery. Clean unaided answers, not assisted reveals, extend review intervals.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
