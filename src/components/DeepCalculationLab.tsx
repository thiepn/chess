import { Chess } from "chess.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { CalculationPosition } from "../calculation/types";
import {
  blankDeepDraft, comparisonFor, deepFrames, discardDeepDraft,
  playDeepMove, readDeepDraft, verifiedDeepBranches, writeDeepDraft,
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
  /** Existing local Stockfish, only contacted on an explicit learner click. */
  evaluateLocally: (fen: string) => Promise<EngineSuggestion | null>;
}

export function DeepCalculationLab({
  position, storageOwner, onComplete, evaluateLocally,
}: Props) {
  const branches = useMemo(() => verifiedDeepBranches(position), [position]);
  const [draft, setDraft] = useState(() => readDeepDraft(storageOwner, position, branches));
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<{ fen: string; move: string; depth: number } | null>(null);
  const [error, setError] = useState("");
  const epoch = useRef(0);

  useEffect(() => {
    writeDeepDraft(storageOwner, position, draft);
  }, [storageOwner, position, draft]);
  useEffect(() => () => { epoch.current++; }, []);

  // App mounts the lab only for positions with legal 4+ ply material.
  if (!branches.length) return null;
  const branch = branches.find(item => item.id === draft.branchId) ?? branches[0];
  const frames = deepFrames(position, draft.played);
  const cursor = Math.min(draft.cursor, draft.played.length);
  const fen = frames?.[cursor]?.fen ?? position.fen;
  const game = new Chess(fen);
  const maxed = cursor >= 8 || game.isGameOver();
  const reference = comparisonFor(branch, draft.played.slice(0, cursor));
  const next = branch.plies[cursor];
  const canUseAuthoredOpponent = !maxed && cursor > 0 &&
    game.turn() !== position.playerColor && !reference.deviated &&
    !reference.outsideReference && Boolean(next &&
      playDeepMove(fen, next.uci));
  const counter = Math.min(8, branch.plies.length);
  const candidate = local?.fen === fen ? playDeepMove(fen, local.move) : null;

  function resetTransient() {
    epoch.current++;
    setLocal(null);
    setError("");
    setBusy(false);
  }
  function setBranch(id: string) {
    const selected = branches.find(item => item.id === id);
    if (!selected) return;
    resetTransient();
    setDraft(blankDeepDraft(selected));
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
          <p>Play both sides on the board, or make the defender follow an authored reply.
            Authored continuations are legal examples, not proof of the best move.</p>
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

      <div className="deep-lab-board">
        <ChessBoard key={`${position.id}:${branch.id}:${cursor}:${fen}`}
          fen={fen} orientation={position.playerColor} disabled={maxed || busy}
          onMove={item => move(`${item.from}${item.to}${item.promotion ?? ""}`, "learner")} />
        <div className="deep-lab-board-details" role="status" aria-live="polite">
          <strong>{maxed ? game.isGameOver() ? "Position ended" : "Eight-ply practice limit"
            : game.turn() === position.playerColor ? "Your side to move" : "Defender to move"}</strong>
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
            {i + 1}. {allSan[i]} <small>{ply.origin === "authored-response"
              ? "Authored" : ply.origin === "local-engine" ? "Local engine" : "Entered"}</small>
          </button>
        ))}
      </nav>
      <div className="deep-lab-actions">
        <button type="button" className="secondary" disabled={busy || cursor === 0}
          onClick={() => navigate(cursor - 1)}><ChevronLeft size={16}/> Back</button>
        <button type="button" className="secondary" disabled={busy || cursor === draft.played.length}
          onClick={() => navigate(cursor + 1)}>Forward <ChevronRight size={16}/></button>
        {canUseAuthoredOpponent && (
          <button type="button" className="secondary"
            onClick={() => move(next.uci, "authored-response")}>
            Play documented defender reply
          </button>
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
        <p>{reference.deviated
          ? `The entered sequence departed from ${branch.label} after ${reference.matched} matching plies. Continue calculating legally, examine another branch, or use the local engine explicitly.`
          : `Matched ${reference.matched} of ${counter} authored plies. Continue beyond the recorded sequence only as unguided exploration.`}</p>
        {cursor >= 4 &&
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
        <button type="button" className="secondary" onClick={onComplete}>Skip optional depth lab</button>
        <button type="button" className="primary" disabled={cursor < 4}
          onClick={onComplete}>
          Continue to independent study <ChevronRight size={16}/>
        </button>
      </footer>
    </section>
  );
}
