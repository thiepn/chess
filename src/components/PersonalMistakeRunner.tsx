import { Chess, type Color, type Square } from "chess.js";
import { CheckCircle2, ChevronRight, Lightbulb, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { TrainingOutcome } from "../domain/types";
import type { PersonalMistake } from "../games/types";
import type { BoardArrow, BoardHighlight } from "../learning/types";
import { legalVariation } from "../review/variation";
import { ChessBoard } from "./ChessBoard";

interface PersonalMistakeRunnerProps {
  mistake: PersonalMistake;
  /** Account-scoped key; never use the previous account's unsent attempt. */
  storageOwner: string;
  onComplete: (outcome: TrainingOutcome) => void;
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
  return choice === best || (best.length === 4 && choice === best + "q");
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
        (entry.solved && (!last || !matchesBest(last,mistake.bestMove))) ||
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
    try {
      sessionStorage.setItem(draftKey(storageOwner,mistake.id),JSON.stringify(draft));
    } catch { /* Private/session storage disabled: never claim durable recovery. */ }
  }, [storageOwner, mistake.id, draft]);

  function appendMove(move: string, accepted: boolean) {
    setDraft(d => ({
      ...d, moves:[...d.moves,move].slice(-40), solved:accepted,
    }));
  }
  const hintArrows: BoardArrow[] = draft.hint && !finished
    ? [{from:mistake.bestMove.slice(0,2) as Square,to:mistake.bestMove.slice(2,4) as Square,tone:"hint"}] : [];
  const hintHighlights: BoardHighlight[] = draft.hint && !finished
    ? [{square:mistake.bestMove.slice(0,2) as Square,tone:"hint"},
       {square:mistake.bestMove.slice(2,4) as Square,tone:"good"}] : [];

  function finish() {
    const penalty = hintsUsed * .15 + wrongAttempts * .12;
    try { sessionStorage.removeItem(draftKey(storageOwner,mistake.id)); }
    catch { /* session storage may be unavailable */ }
    onComplete({
      success:solved,quality:solved ? Math.max(.25,1 - penalty) : 0,
      hintsUsed,wrongAttempts,mistakeId:mistake.id,
      mistakePractice:{
        playedMove:triedMoves.at(-1) ?? null,
        triedMoves:[...triedMoves],
      },
    });
  }

  return (
    <div className="lesson-runner mistake-runner">
      <div className="lesson-stage">
        <div className="lesson-board-column">
          <ChessBoard
            key={`${mistake.id}-${boardVersion}-${lineStep}`}
            fen={currentFen}
            orientation={orientation}
            disabled={finished}
            highlights={hintHighlights}
            arrows={hintArrows}
            onMove={(move) => {
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
              <p>Moves are replayed legally from this position, not claimed as forced.</p>
            </section>
          )}
        </div>
        <div className="lesson-instruction">
          <div>
            <p className="eyebrow">FROM YOUR OWN GAME · TRAINING</p>
            <h2>{solved ? "You found the engine's choice." : draft.revealed
              ? "Review the stronger choice." : "What should you play instead?"}</h2>
            <p className="lesson-prompt">{finished ? mistake.explanation
              : "Play a legal candidate without seeing the saved engine move first. Only actual attempts change your training progress."}</p>
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
          <div className="lesson-controls">
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
            <p className="review-practice-footnote">This practice position is session-resumable for the active Chess owner only. Leaving without recording does not award success.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
