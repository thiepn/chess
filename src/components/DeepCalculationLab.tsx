import { Chess } from "chess.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { CalculationPosition } from "../calculation/types";
import {
  blankDeepDraft, comparisonFor, deepFrames, discardDeepDraft,
  playDeepMove, readDeepDraft, recordedDefenderChoices, documentedDefensiveBoards,
  sharedBranchDraft, sourceDefenderSetup, verifiedDeepBranches, writeDeepDraft,
  type DeepPly, type PlyOrigin,
} from "../calculation/deepCalculation";
import { ChessBoard } from "./ChessBoard";

interface EngineSuggestion {
  bestMove: string;
  depth: number;
  pv: string[];
}
interface Props {
  position: CalculationPosition;
  storageOwner: string;
  onComplete: () => void;
  /** For ungraded standalone defender challenge; optional traditional lab unchanged. */
  exitLabel?: string;
  /** Existing local Stockfish, only contacted on an explicit learner click. */
  evaluateLocally: (fen: string) => Promise<EngineSuggestion | null>;
}

export function DeepCalculationLab({
  position, storageOwner, onComplete, exitLabel, evaluateLocally,
}: Props) {
  const branches = useMemo(() => verifiedDeepBranches(position), [position]);
  const [draft, setDraft] = useState(() => readDeepDraft(storageOwner, position, branches));
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<{ fen: string; move: string; depth: number } | null>(null);
  const [error, setError] = useState("");
  // Keep the actual defender move hidden until the learner chooses to reveal it.
  // The source is an illustrative recorded line, never an engine-optimality claim.
  const [showSourceReply,setShowSourceReply]=useState(false);
  const [showTwoPlyComparisons,setShowTwoPlyComparisons]=useState(false);
  const epoch = useRef(0);

  useEffect(() => {
    writeDeepDraft(storageOwner, position, draft);
  }, [storageOwner, position, draft]);
  useEffect(() => () => { epoch.current++; }, []);

  // Original legal 3–8 ply cases now share the same optional deep board.
  // No new move/grade engine or fabricated continuation.
  if (!branches.length) return null;
  const branch = branches.find(item => item.id === draft.branchId) ?? branches[0];
  const frames = deepFrames(position, draft.played);
  const cursor = Math.min(draft.cursor, draft.played.length);
  const fen = frames?.[cursor]?.fen ?? position.fen;
  const game = new Chess(fen);
  const maxed = cursor >= 8 || game.isGameOver();
  const reference = comparisonFor(branch, draft.played.slice(0, cursor));
  // Compare genuine defender replies to the SAME source candidate, not
  // unrelated first moves that could create a misleading comparison.
  const sourceComparisons=useMemo(()=>
    documentedDefensiveBoards(branches,3,branch.plies[0]?.uci),
    [branches,branch],
  );
  const originalReplies = !maxed
    ? recordedDefenderChoices(position, branches, draft.played.slice(0,cursor))
    : [];
  const canUseAuthoredOpponent=originalReplies.length>0;
  const counter = Math.min(8, branch.plies.length);
  const candidate = local?.fen === fen ? playDeepMove(fen, local.move) : null;
  const defendingTheSource=draft.played[0]?.origin==="authored-response";
  const viewColor=defendingTheSource && cursor>=1
    ? position.playerColor==="w" ? "b" : "w"
    : position.playerColor;

  function resetTransient() {
    epoch.current++;
    setLocal(null);
    setError("");
    setShowSourceReply(false);
    setShowTwoPlyComparisons(false);
    setBusy(false);
  }
  function setBranch(id: string) {
    const selected = branches.find(item => item.id === id);
    if (!selected) return;
    resetTransient();
    setDraft(previous=>sharedBranchDraft(selected,previous));
  }
  function move(uci: string, origin: PlyOrigin): boolean {
    if (maxed || busy || !playDeepMove(fen, uci)) return false;
    resetTransient();
    setDraft(previous => ({
      ...previous,
      played: [...previous.played.slice(0, cursor), { uci, origin }],
      cursor: cursor + 1,
      reveal: false,
    }));
    return true;
  }
  function navigate(to: number) {
    if (to < 0 || to > draft.played.length) return;
    resetTransient();
    setDraft(previous => ({ ...previous, cursor: to }));
  }
  async function inspectLocal() {
    if (maxed || busy) return;
    const request = ++epoch.current;
    setError("");
    setLocal(null);
    setBusy(true);
    try {
      const result = await evaluateLocally(fen);
      if (request !== epoch.current) return;
      if (!result || !playDeepMove(fen, result.bestMove)) {
        setError("Local analysis could not provide a legal continuation.");
      } else {
        setLocal({ fen, move: result.bestMove, depth: result.depth });
      }
    } catch {
      if (request === epoch.current) setError("Local Stockfish is unavailable; manual board moves remain usable.");
    } finally {
      if (request === epoch.current) setBusy(false);
    }
  }
  function clear() {
    resetTransient();
    discardDeepDraft(storageOwner, position);
    setDraft(blankDeepDraft(branch));
  }
  const alternate = branches.find(item => item.id !== branch.id &&
    draft.played.slice(0, cursor).every((ply, i) => item.plies[i]?.uci === ply.uci));
  const allSan = frames?.slice(1).map(frame => frame.san) ?? [];

  return (
    <section className="deep-lab" aria-label="Multi-ply calculation workspace">
      <header className="deep-lab-heading">
        <div>
          <p className="eyebrow">P108 · DEEP CALCULATION LAB</p>
          <h3>Calculate, resist, revise</h3>
          <p>Rehearse each move and the concrete reply on this original board.
            Three-ply cases stop at their actual source boundary; longer branches continue
            as authored. They are legal examples, not proof of unique best moves.</p>
        </div>
        <span className="deep-lab-count">{cursor}/8 plies</span>
      </header>

      <fieldset className="deep-lab-branches">
        <legend>Choose a line to investigate</legend>
        {branches.map(item => (
          <button key={item.id} type="button" className={branch.id === item.id ? "chosen" : ""}
            aria-pressed={branch.id === item.id}
            onClick={() => setBranch(item.id)}>
            {item.label} <small>· {item.plies.length} authored plies</small>
          </button>
        ))}
      </fieldset>

      {cursor===0 && branch.plies.length>=3 && <div className="deep-lab-defender-challenge">
        <strong>Practice the opponent's side</strong>
        <p>Set up the source's recorded first move, then find a legal defense yourself.
          The board turns toward the defender. This is ungraded rehearsal,
          not an additional scored calculation attempt.</p>
        <button type="button" className="secondary" onClick={()=>{
          resetTransient();
          setDraft(sourceDefenderSetup(branch));
        }}>Start defender-side challenge</button>
      </div>}
      <div className="deep-lab-board">
        <ChessBoard key={`${position.id}:${branch.id}:${cursor}:${fen}:${viewColor}`}
          fen={fen} orientation={viewColor} disabled={maxed || busy}
          onMove={item => move(`${item.from}${item.to}${item.promotion ?? ""}`, "learner")} />
        <div className="deep-lab-board-details" role="status" aria-live="polite">
          {canUseAuthoredOpponent && <p>
            Play the defender independently before revealing its source response.
            What check, capture, block or counter-threat creates the most resistance?
          </p>}
          <strong>{maxed ? game.isGameOver() ? "Position ended" : "Eight-ply practice limit"
            : defendingTheSource
              ? game.turn()!==position.playerColor ? "Defend against the source move" : "Source side to move"
              : game.turn()===position.playerColor ? "Your side to move" : "Defender to move"}</strong>
          <span>{reference.deviated
            ? alternate ? `Legal line also appears in ${alternate.label}; no quality verdict.`
              : "Legal continuation outside this authored line; no best-move verdict."
            : reference.outsideReference ? "Beyond the authored reference; legal exploration only."
            : `${reference.matched} recorded moves matched; this does not establish optimal play.`}</span>
        </div>
      </div>

      <nav className="deep-lab-timeline" aria-label="Explore calculated positions">
        <button type="button" aria-label="Initial position" className={cursor === 0 ? "current" : ""}
          aria-current={cursor === 0 ? "step" : undefined}
          onClick={() => navigate(0)}>Start</button>
        {draft.played.map((ply, i) => (
          <button key={i} type="button" className={cursor === i + 1 ? "current" : ""}
            aria-current={cursor === i + 1 ? "step" : undefined}
            onClick={() => navigate(i + 1)}>
            {i + 1}. {allSan[i]} <small>{defendingTheSource && i===0 ? "Source setup"
              : ply.origin === "authored-response" ? "Authored"
              : ply.origin === "local-engine" ? "Local engine" : "Entered"}</small>
          </button>
        ))}
      </nav>
      <div className="deep-lab-actions">
        <button type="button" className="secondary" disabled={busy || cursor === 0}
          onClick={() => navigate(cursor - 1)}><ChevronLeft size={16}/> Back</button>
        <button type="button" className="secondary" disabled={busy || cursor === draft.played.length}
          onClick={() => navigate(cursor + 1)}>Forward <ChevronRight size={16}/></button>
        {canUseAuthoredOpponent && !showSourceReply && (
          <button type="button" className="secondary"
            onClick={() => setShowSourceReply(true)}>
            Reveal the recorded defender response
          </button>
        )}
        {canUseAuthoredOpponent && showSourceReply && (
          <div className="deep-lab-defender-choices" role="group"
            aria-label="Legally verified original defender responses">
            <p>{originalReplies.length} distinct recorded {originalReplies.length===1?"reply":"replies"}
              from the original source. Select a legal illustration, not a certified
              objectively best defense.</p>
            {originalReplies.map(reply=><button key={reply.uci}
              type="button" className="secondary"
              onClick={()=>move(reply.uci,"authored-response")}>
              {reply.san} · {reply.label}
            </button>)}
          </div>
        )}
        <button type="button" className="secondary" disabled={busy || maxed}
          onClick={() => void inspectLocal()}>
          {busy ? "Local engine checking…" : "Check optional local engine move"}
        </button>
      </div>
      {local && candidate && (
        <div className="deep-lab-engine" role="status">
          <strong>Local Stockfish suggestion: {candidate.san} · depth {local.depth}</strong>
          <p>Analysis of this exact board, not a certified unique best move or a mastery score.</p>
          <button type="button" className="secondary"
            onClick={() => move(local.move, "local-engine")}>Play suggested move</button>
        </div>
      )}
      {error && <p role="alert" className="deep-lab-error">{error}</p>}

      <div className="deep-lab-feedback">
        <strong>Branch comparison</strong>
        {alternate && <button type="button" className="secondary"
          onClick={() => {
            resetTransient();
            setDraft(previous=>sharedBranchDraft(alternate,previous));
          }}>
          Compare this exact continuation with {alternate.label}
        </button>}
        {cursor>=2 && <section aria-label="Defender reply analysis" role="status">
          {reference.matched>=2 ? <>
            <strong>Recorded defender reply recognized</strong>
            <p>{position.replyReason?.trim() || branch.explanation}</p>
            {position.defensiveStudy?.misconception && <p>
              <strong>Common misread:</strong> {position.defensiveStudy.misconception}
            </p>}
          </> : <>
            <strong>Different legal defender chosen</strong>
            <p>This continuation is outside the selected authored line. That alone
              neither proves it inferior nor certifies your chosen move.
              {alternate ? " It also appears in another original documented branch."
                : " Explore it legally or compare the recorded defender when ready."}</p>
          </>}
          <p>Reassess the learner's next move after the defender's actual position,
            rather than assuming an opponent will follow the desired plan.</p>
        </section>}
        {cursor>=2 && sourceComparisons.length>=2 && <section className="deep-lab-source-comparison"
          aria-label="Compare original opponent responses">
          <button type="button" className="secondary"
            aria-expanded={showTwoPlyComparisons}
            onClick={()=>setShowTwoPlyComparisons(value=>!value)}>
            {showTwoPlyComparisons?"Hide":"Compare"} {sourceComparisons.length} documented two-ply positions
          </button>
          {showTwoPlyComparisons && <>
            <p>These boards show the exact source positions after the candidate
              and defender reply. Compare king safety, material, initiative,
              escape squares and the remaining source line before choosing a plan.
              No engine or mastery verdict is inferred.</p>
            <div className="deep-lab-source-boards">
              {sourceComparisons.map(item=><article key={item.id}>
                <h4>{item.label}</h4>
                <ChessBoard fen={item.fen} orientation={position.playerColor} disabled/>
                <p><strong>Recorded:</strong> {item.firstMove} {item.defenderMove}</p>
                <p><strong>Continuation:</strong> {item.continuedLine.join(" ")||"No further original moves"}</p>
                <p>{item.explanation}</p>
                <button type="button" className="secondary"
                  onClick={()=>setBranch(item.id)}>
                  Rehearse this documented branch
                </button>
              </article>)}
            </div>
          </>}
        </section>}
        <p>{reference.deviated
          ? `The entered sequence departed from ${branch.label} after ${reference.matched} matching plies. Continue calculating legally, examine another branch, or use the local engine explicitly.` 
          : `Matched ${reference.matched} of ${counter} authored plies. Continue beyond the recorded sequence only as unguided exploration.`}</p>
        {cursor >= Math.min(4, branch.plies.length) &&
          <button type="button" className="secondary"
            onClick={() => setDraft(previous => ({ ...previous, reveal: !previous.reveal }))}>
            {draft.reveal ? "Hide authored line" : "Reveal authored comparison"}
          </button>}
        {draft.reveal && <div className="deep-lab-reveal">
          <p><strong>Recorded line:</strong> {branch.plies.map(row => row.san).join(" ")}</p>
          <p>{branch.explanation}</p>
        </div>}
        <small>Position history is recoverable in this tab for 24 hours. No additional
          score, grade, review record, server write or synthetic chess evidence is created.</small>
      </div>
      <footer className="deep-lab-footer">
        <button type="button" className="secondary" onClick={clear}>
          <RotateCcw size={15}/> Discard branch draft
        </button>
        <button type="button" className="secondary" onClick={onComplete}>
          {exitLabel ? "Leave unscored practice" : "Skip optional depth lab"}
        </button>
        <button type="button" className="primary"
          disabled={cursor < (exitLabel ? 2 : Math.min(4, branch.plies.length))}
          onClick={onComplete}>
          {exitLabel ?? "Continue to independent study"} <ChevronRight size={16}/>
        </button>
      </footer>
    </section>
  );
}
