import { useEffect, useState } from "react";
import { ChessBoard } from "./ChessBoard";
import type { MasterDraft } from "../model-games/masterGames";
import type { TransferCaseStudy } from "../model-games/crossGameTransfer";
import {
  BRANCH_LIMIT, advanceCounterfactual, counterfactualAsset,
  hydrateCounterfactuals, observedCounterfactual,
  replayCounterfactual, legalReplyResources, branchEvidence, forkCounterfactual, type CounterfactualChallenge, type SourceGuidance,
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
  const [guidance, setGuidance] = useState<SourceGuidance | null>(null);
  const [error, setError] = useState("");
  const [rejected, setRejected] = useState(0);
  const [reference, setReference] = useState<[boolean, boolean]>([false, false]);
  const [slots, setSlots] = useState<[number, number]>([0, 0]);
  const [cursors, setCursors] = useState<[number, number]>([0, 0]);
  const [allLegal, setAllLegal] = useState<[boolean, boolean]>([false, false]);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [movePages, setMovePages] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const abort = new AbortController();
    setError("");
    fetch(counterfactualAsset, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("P115 source unavailable");
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        if (abort.signal.aborted) return;
        const checked = hydrateCounterfactuals(payload, studies);
        setChallenges(checked.accepted);
        setGuidance(checked.ui ?? null);
        setRejected(checked.rejected);
        if (!checked.accepted.length) setError("No source-qualified counterfactual exercises.");
      })
      .catch(() => {
        if (!abort.signal.aborted) setError("Could not load the original P115 exercises. P114 comparison remains available.");
      });
    return () => abort.abort();
  }, [studies, loadAttempt]);

  useEffect(() => { setReference([false, false]); setSlots([0, 0]); setAllLegal([false, false]); setMovePages([0, 0]); }, [active.source.id]);
  // Recover the end of each surviving canonical branch on returning to this study.
  // Manual timeline scrubbing does not rewrite the branch or cause a new grade.
  useEffect(() => {
    setCursors([
      slots[0] === 0 ? draft.branchA?.length ?? 0 : draft.branchAltA?.length ?? 0,
      slots[1] === 0 ? draft.branchB?.length ?? 0 : draft.branchAltB?.length ?? 0,
    ]);
  }, [active.source.id, slots, draft.branchA, draft.branchB, draft.branchAltA, draft.branchAltB]);
  const challenge = challenges.find((item) => item.id === active.source.id);
  function setLine(index: number, line: string[]) {
    const key = index === 0
      ? slots[index] === 0 ? "branchA" : "branchAltA"
      : slots[index] === 0 ? "branchB" : "branchAltB";
    onChange({ [key]: line, mark: null });
    setMovePages((pages) => pages.map((n,i) => i === index ? 0 : n) as [number,number]);
    setCursors((previous) => previous.map((value, position) =>
      position === index ? line.length : value) as [number, number]);
  }

  return <section className="p115-lab" aria-label="P115 independent counterfactual branches">
    <header>
      <p className="eyebrow">P115 · PLAY THE PLAN, THEN DEFEND AGAINST YOURSELF</p>
      <h3>Legal candidate → opponent resistance → revised plan</h3>
      <p>{guidance?.intro ?? "Reconstruct the source-linked move and opponent reply. No engine or simulated defender."}</p>
    </header>
    {!challenge && !error && <p role="status">Verifying source-linked variation challenges…</p>}
    {error && <div role="alert"><p>{error}</p>
      <button type="button" className="secondary" onClick={() => setLoadAttempt((n) => n + 1)}>Retry original prompts</button>
    </div>}
    {rejected > 0 && <p role="status">{rejected} source-inconsistent challenge records excluded.</p>}
    {challenge && <>
      <div className="p115-two-boards">
        {([active.first, active.second] as const).map((pin, index) => {
          const source = index === 0 ? active.source.first : active.source.second;
          const main = (index === 0 ? draft.branchA : draft.branchB) ?? [];
          const alternate = (index === 0 ? draft.branchAltA : draft.branchAltB) ?? [];
          const line = slots[index] === 0 ? main : alternate;
          const otherLine = slots[index] === 0 ? alternate : main;
          const result = replayCounterfactual(pin.fen, line);
          const last = result.sans.length;
          const historical = observedCounterfactual(pin.game, source.ply);
          const evidence = branchEvidence(pin.fen, line, slots[index] === 0 ? alternate : main, historical);
          const isReference = draft.revealed && reference[index];
          const cursor = Math.min(cursors[index], line.length);
          const forked = cursor > 0 ? forkCounterfactual(pin.fen, line, cursor) : null;
          const browseHistory = cursor < line.length;
          const examined = browseHistory ? replayCounterfactual(pin.fen, line.slice(0, cursor)) : result;
          const resources = !result.invalid && !isReference && !browseHistory && !result.gameOver &&
            last < BRANCH_LIMIT ? legalReplyResources(result.fen) : { all: [], forcing: [] };
          const candidates = resources.all;
          const forcing = resources.forcing;
          const pool = allLegal[index] ? candidates : forcing;
          const page = Math.min(movePages[index], Math.max(0, Math.ceil(pool.length / 12) - 1));
          const offered = pool.slice(page * 12, page * 12 + 12);
          const reconstruction = index === 0 ? challenge.reconstruction.first : challenge.reconstruction.second;
          const name = index === 0 ? "A" : "B";
          const currentFen = isReference ? pin.game.fens[source.ply + 3] :
            examined.invalid ? pin.fen : examined.fen;
          function fork() {
            if (!forked || isReference) return;
            if (otherLine.length && !window.confirm(guidance?.forkReplace ??
              "Replace the other candidate with this legal prefix?")) return;
            const target = index === 0
              ? slots[index] === 0 ? "branchAltA" : "branchA"
              : slots[index] === 0 ? "branchAltB" : "branchB";
            onChange({ [target]: forked, mark: null });
            setSlots((old) => old.map((value, i) => i === index ? 1 - value : value) as [number, number]);
            setReference((old) => old.map((value, i) => i === index ? false : value) as [boolean, boolean]);
          }
          function play(move: { from: string; to: string; promotion?: string }) {
            if (isReference || browseHistory) return false;
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
                  setReference((old) => old.map((n, i) => i === index ? false : n) as [boolean, boolean]);
                  setMovePages((old) => old.map((n,i) => i === index ? 0 : n) as [number,number]); }}>
                {slot === 0 ? "Original candidate" : "Alternative candidate"}
              </button>)}
            </div>
            <label htmlFor={"p118-plan-" + index}>Before moving: reconstruct the threats and name a candidate</label>
            <p className="p115-source-task">{reconstruction}</p>
            <textarea id={"p118-plan-" + index} rows={2} maxLength={1200}
              placeholder="Which squares matter, which replies concern you, and why?"
              value={index === 0 ? draft.branchPlanA ?? "" : draft.branchPlanB ?? ""}
              onChange={(event) => onChange(index === 0
                ? { branchPlanA: event.target.value, mark: null } : { branchPlanB: event.target.value, mark: null })}/>
            <ChessBoard
              key={source.gameId + ":" + currentFen + ":" + isReference}
              fen={currentFen}
              orientation={pin.game.game.orientation}
              disabled={isReference || result.invalid || browseHistory || result.gameOver || last >= BRANCH_LIMIT}
              onMove={isReference ? undefined : play}
            />
            {last > 0 && !result.invalid && !isReference && <div className="p115-actions" role="group" aria-label={"Explore previously played moves in position " + name}>
              <button className="secondary" type="button" disabled={cursor === 0}
                onClick={() => setCursors((old) => old.map((v,i) => i === index ? Math.max(0, v - 1) : v) as [number,number])}>Previous position</button>
              <span role="status">Ply {cursor} of {last}</span>
              <div className="p120-ply-list" role="group" aria-label={"Replay plies in position " + name}>
                <button type="button" aria-pressed={cursor === 0}
                  onClick={() => setCursors((old) => old.map((v,i) => i === index ? 0 : v) as [number,number])}>Start</button>
                {line.map((san, ply) => <button type="button" key={ply} aria-pressed={cursor === ply + 1}
                  onClick={() => setCursors((old) => old.map((v,i) => i === index ? ply + 1 : v) as [number,number])}>
                  {ply + 1}. {san}</button>)}
              </div>
              <button className="secondary" type="button" disabled={cursor >= last}
                onClick={() => setCursors((old) => old.map((v,i) => i === index ? Math.min(last, v + 1) : v) as [number,number])}>Next position</button>
              {browseHistory && <button className="secondary" type="button"
                onClick={() => setLine(index, line.slice(0,cursor))}>Continue from this position</button>}
            </div>}
            {!isReference && <div className="p115-actions">
              <button type="button" className="secondary" disabled={!forked}
                onClick={fork}>
                Fork selected ply into {slots[index] === 0 ? "alternative" : "original"} line
              </button>
              <small>{forked ? guidance?.forkHint : guidance?.forkEarly}</small>
            </div>}
            {result.invalid && <p role="alert">{guidance?.badLine ?? "Saved variation is not legal; clear only this candidate."}</p>}
            {(main.length > 0 || alternate.length > 0) && <p className="p115-notation">
              <strong>Two candidate lines:</strong> First: {main.join(" ") || "not entered"} · Alternative: {alternate.join(" ") || "not entered"}
            </p>}
            <div className="p115-notation" aria-live="polite">
              <strong>{isReference ? "Observed PGN:" : "Your legal branch:"}</strong>
              <span>{isReference ? historical.join(" ") : last ? result.sans.join(" ") : "No moves played"}</span>
            </div>
            {evidence && !isReference && <section className="p115-reflection" aria-label={"Source and defender evidence for " + name}>
              <strong>{evidence.needsDefense ? "Now play the defender" :
                evidence.replyPlayed ? "Reconstruct after resistance" : "Candidate rehearsal"}</strong>
              {evidence.needsDefense && <p>{challenge.fork.before}</p>}
              {evidence.replyPlayed && !draft.revealed && <p>{guidance?.repairBefore}</p>}
              {evidence.replyPlayed && <p>{draft.revealed ?
                (index === 0 ? challenge.decision.first : challenge.decision.second) :
                guidance?.repairBefore}</p>}
              {line.length >= 4 && <p>{draft.revealed ? challenge.fork.revise : guidance?.repairAfter}</p>}
              {evidence.events.length > 0 && <p>Legal board events: {evidence.events.join("; ")}. These facts do not assign strategic value.</p>}
              {draft.revealed && <p>Shared PGN plies: {evidence.sameSourcePlies}.
                {evidence.divergesFromSource ? " Different continuation." : " No divergence yet."}
                {" "}{guidance?.lookAhead}</p>}
            </section>}
            {!result.invalid && !isReference && <p className="p115-facts" role="status">
              {result.checkmate ? "Checkmate in this legal board position" :
                result.drawn ? "Draw reported by chess.js rules" :
                result.inCheck ? "King of side to move is in check" : "No check"}
              {result.lastCapture ? " · Last move captured: " + result.lastCapture : ""}
              {result.lastPromotion ? " · Promoted to " + result.lastPromotion : ""}
              {" · "}{result.gameOver ? "Game finished" : last >= BRANCH_LIMIT ? "Six-ply limit" :
                "Next: " + (result.turn === "w" ? "White" : "Black")}
            </p>}
            {candidates.length > 0 && <div className="p118-resource">
              <p>Legal moves: {candidates.length}; checks/captures: {forcing.length}. {guidance?.moveDisclaimer}</p>
              <div className="p115-actions">
                <button type="button" className="secondary" aria-pressed={allLegal[index]}
                  onClick={() => { setAllLegal((old) => old.map((value,i) => i === index ? !value : value) as [boolean,boolean]); setMovePages((old) => old.map((n,i) => i === index ? 0 : n) as [number,number]); }}>
                  {allLegal[index] ? "Show checks and captures" : "Show all legal moves"}
                </button>
              </div>
              <div className="p118-moves" role="group" aria-label={"Play a legal move for " + (result.turn === "w" ? "White" : "Black")}>
                {offered.map((move) => <button type="button" key={move.san}
                  onClick={() => play({ from: move.from, to: move.to, promotion: move.promotion })}>
                  {move.san}</button>)}
              </div>
              {offered.length === 0 && <small>No checks or captures here. Consider a legal quiet move.</small>}
              {pool.length > 12 && <div className="p115-actions" role="group" aria-label={"More legal moves for " + name}>
                <button type="button" className="secondary" disabled={page === 0}
                  onClick={() => setMovePages((old) => old.map((n,i) => i === index ? Math.max(0,page - 1) : n) as [number,number])}>Previous moves</button>
                <span role="status">Moves {page * 12 + 1}–{Math.min(pool.length,(page + 1) * 12)} / {pool.length}</span>
                <button type="button" className="secondary" disabled={(page + 1) * 12 >= pool.length}
                  onClick={() => setMovePages((old) => old.map((n,i) => i === index ? page + 1 : n) as [number,number])}>Next moves</button>
              </div>}
            </div>}
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
            {last > 1 && draft.revealed && !result.invalid && <p className="p115-facts">{challenge.fork.reply}</p>}
            {last > 0 && !result.invalid && <>
              <label htmlFor={"p120-defense-" + index}>Defender analysis — which legal check, capture or quiet response concerns you?</label>
              <textarea id={"p120-defense-" + index} rows={2} maxLength={1200}
                placeholder="Name the move and the concrete threat; no evaluation is implied."
                value={index === 0 ? draft.branchThreatA ?? "" : draft.branchThreatB ?? ""}
                onChange={(event) => onChange(index === 0 ?
                  { branchThreatA: event.target.value, mark: null } :
                  { branchThreatB: event.target.value, mark: null })}/>
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
        <strong>P121 · Compare alternative defenses and transfer carefully</strong>
        <p>{challenge.fork.carry}</p>
        <strong>P120 · Defend, repair, then transfer</strong>
        <p>{challenge.decision.transfer}</p>
        <strong>P118 · Independent historical reconstruction</strong>
        <p>{challenge.reconstruction.after}</p>
        <strong>Opponent-resistance protocol</strong>
        <p>{challenge.defenderPrompt}</p>
        <strong>Reconstruct a transferable decision</strong>
        <p>{challenge.revision}</p>
        {draft.revealed && <>
          <strong>Specific misconception to avoid</strong>
          <p>{challenge.misconception}</p>
          <p>{challenge.factsNote}</p>
        </>}
        <small>{guidance?.note}</small>
      </section>
    </>}
  </section>;
}
