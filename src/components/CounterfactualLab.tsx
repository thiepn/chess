import { useEffect, useState } from "react";
import { ChessBoard } from "./ChessBoard";
import type { MasterDraft } from "../model-games/masterGames";
import type { TransferCaseStudy } from "../model-games/crossGameTransfer";
import {
  BRANCH_LIMIT, advanceCounterfactual, counterfactualAsset,
  hydrateCounterfactuals, observedCounterfactual,
  replayCounterfactual, type CounterfactualChallenge,
} from "../model-games/counterfactualBranches";
import "../styles/p115-counterfactual.css";

interface Props {
  studies: TransferCaseStudy[];
  active: TransferCaseStudy;
  draft: MasterDraft;
  onChange: (changes: Partial<MasterDraft>) => void;
  onOpenPosition: (gameId: string, checkpointId: string) => void;
}
export function CounterfactualLab({ studies, active, draft, onChange, onOpenPosition }: Props) {
  const [challenges, setChallenges] = useState<CounterfactualChallenge[]>([]);
  const [error, setError] = useState("");
  const [rejected, setRejected] = useState(0);
  const [reference, setReference] = useState<[boolean, boolean]>([false, false]);
  const [slots, setSlots] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const abort = new AbortController();
    fetch(counterfactualAsset, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("P115 source unavailable");
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        if (abort.signal.aborted) return;
        const checked = hydrateCounterfactuals(payload, studies);
        setChallenges(checked.accepted);
        setRejected(checked.rejected);
        if (!checked.accepted.length) setError("No source-qualified counterfactual exercises.");
      })
      .catch(() => {
        if (!abort.signal.aborted) setError("Could not load the original P115 exercises. P114 comparison remains available.");
      });
    return () => abort.abort();
  }, [studies]);

  useEffect(() => { setReference([false, false]); setSlots([0, 0]); }, [active.source.id]);
  const challenge = challenges.find((item) => item.id === active.source.id);
  function setLine(index: number, line: string[]) {
    const key = index === 0
      ? slots[index] === 0 ? "branchA" : "branchAltA"
      : slots[index] === 0 ? "branchB" : "branchAltB";
    onChange({ [key]: line, mark: null });
  }

  return <section className="p115-lab" aria-label="P115 independent counterfactual branches">
    <header>
      <p className="eyebrow">P115 · PLAY THE PLAN, THEN DEFEND AGAINST YOURSELF</p>
      <h3>Legal candidate → opponent resistance → revised plan</h3>
      <p>Make moves for both players on each board. No opponent is simulated, and the app makes no engine-best or strategic-strength claims. Six legal plies per side of the comparison.</p>
    </header>
    {!challenge && !error && <p role="status">Verifying source-linked variation challenges…</p>}
    {error && <p role="alert">{error}</p>}
    {rejected > 0 && <p role="status">{rejected} source-inconsistent challenge records excluded.</p>}
    {challenge && <>
      <div className="p115-two-boards">
        {([active.first, active.second] as const).map((pin, index) => {
          const source = index === 0 ? active.source.first : active.source.second;
          const main = (index === 0 ? draft.branchA : draft.branchB) ?? [];
          const alternate = (index === 0 ? draft.branchAltA : draft.branchAltB) ?? [];
          const line = slots[index] === 0 ? main : alternate;
          const other = replayCounterfactual(pin.fen, slots[index] === 0 ? alternate : main);
          const result = replayCounterfactual(pin.fen, line);
          const historical = observedCounterfactual(pin.game, source.ply);
          const referenceReplay = replayCounterfactual(pin.fen, historical);
          const isReference = draft.revealed && reference[index];
          const name = index === 0 ? "A" : "B";
          const last = result.sans.length;
          const currentFen = isReference && !referenceReplay.invalid
            ? referenceReplay.fen : result.invalid ? pin.fen : result.fen;
          function play(move: { from: string; to: string; promotion?: string }) {
            if (isReference) return false;
            const next = advanceCounterfactual(pin.fen, line, move);
            if (!next) return false;
            setLine(index, next);
            return true;
          }
          return <article className="p115-position" key={source.gameId}>
            <header><strong>Position {name} · {pin.game.game.players}</strong>
              <span>{pin.game.game.year} · {pin.game.game.event}</span></header>
            <p className="p115-source-task">{index === 0 ? challenge.firstChallenge : challenge.secondChallenge}</p>
            <div className="p115-actions" role="group" aria-label={"Candidate variations for position " + name}>
              {[0, 1].map((slot) => <button key={slot} type="button" className="secondary"
                aria-pressed={slots[index] === slot}
                onClick={() => { setSlots((old) => old.map((n, i) => i === index ? slot : n) as [number, number]);
                  setReference((old) => old.map((n, i) => i === index ? false : n) as [boolean, boolean]); }}>
                {slot === 0 ? "Original candidate" : "Alternative candidate"}
              </button>)}
            </div>
            <ChessBoard
              key={source.gameId + ":" + currentFen + ":" + isReference}
              fen={currentFen}
              orientation={pin.game.game.orientation}
              disabled={isReference || result.invalid || result.gameOver || last >= BRANCH_LIMIT}
              onMove={isReference ? undefined : play}
            />
            {result.invalid && <p role="alert">The saved variation contains a move that is not legal from this source board. Clear it to resume; no line was silently rewritten.</p>}
            {(main.length > 0 || alternate.length > 0) && <p className="p115-notation">
              <strong>Two candidate lines:</strong> First: {main.join(" ") || "not entered"} · Alternative: {alternate.join(" ") || "not entered"}
            </p>}
            <div className="p115-notation" aria-live="polite">
              <strong>{isReference ? "Observed PGN:" : "Your legal branch:"}</strong>
              <span>{isReference ? historical.join(" ") : last ? result.sans.join(" ") : "No moves played"}</span>
            </div>
            {main.length > 0 && alternate.length > 0 && !result.invalid && !other.invalid && <p className="p115-facts">
              Compare your branches: which defender reply made you change the plan? Different legal continuations do not prove a best move.
            </p>}
            {!result.invalid && !isReference && <p className="p115-facts" role="status">
              {result.checkmate ? "Checkmate in this legal board position" :
                result.drawn ? "Draw reported by chess.js rules" :
                result.inCheck ? "King of side to move is in check" : "No check"}
              {result.lastCapture ? " · Last move captured: " + result.lastCapture : ""}
              {result.lastPromotion ? " · Promoted to " + result.lastPromotion : ""}
              {" · "}{result.gameOver ? "Game finished" : last >= BRANCH_LIMIT ? "Six-ply limit" :
                "Next: " + (result.turn === "w" ? "White" : "Black")}
            </p>}
            <div className="p115-actions">
              <button className="secondary" type="button" disabled={!last || isReference}
                onClick={() => setLine(index, line.slice(0, -1))}>Undo move</button>
              <button className="secondary" type="button" disabled={!last && !result.invalid}
                onClick={() => { setLine(index, []); setReference((old) => old.map((value, i) => i === index ? false : value) as [boolean, boolean]); }}>
                Clear branch
              </button>
              {draft.revealed && <button type="button" className="secondary" aria-pressed={isReference}
                onClick={() => setReference((old) => old.map((value, i) => i === index ? !value : value) as [boolean, boolean])}>
                {isReference ? "Back to my moves" : "View historical three plies"}
              </button>}
            </div>
            {last > 0 && !result.invalid && <>
              <label htmlFor={"p115-note-" + index}>What changed after the opponent's response?</label>
              <textarea rows={3} id={"p115-note-" + index} maxLength={1200}
                placeholder="Name the changed squares, actual threats and a plan you would revise."
                value={index === 0 ? draft.branchNoteA ?? "" : draft.branchNoteB ?? ""}
                onChange={(event) => onChange(index === 0
                  ? { branchNoteA: event.target.value, mark: null } : { branchNoteB: event.target.value, mark: null })} />
            </>}
            {draft.revealed && <button type="button" className="p115-open-source"
              onClick={() => onOpenPosition(source.gameId, source.checkpointId)}>
              Open this original game at its decision
            </button>}
          </article>;
        })}
      </div>
      <section className="p115-reflection">
        <strong>Opponent-resistance protocol</strong>
        <p>{challenge.defenderPrompt}</p>
        <strong>Reconstruct a transferable decision</strong>
        <p>{challenge.revision}</p>
        {draft.revealed && <>
          <strong>Specific misconception to avoid</strong>
          <p>{challenge.misconception}</p>
          <p>{challenge.factsNote}</p>
        </>}
        <small>Variation SAN, writing and self-mark are stored only in the existing owner-scoped P113/P114 browser-session draft. No new grade, opponent engine, Account writer or database.</small>
      </section>
    </>}
  </section>;
}
