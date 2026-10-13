import { ChevronLeft, ChevronRight, Eye, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChessBoard } from "./ChessBoard";
import {
  emptyMasterDraft, masterDraftKey, restoreMasterDrafts,
  type MasterDraft, type MasterTimeline,
} from "../model-games/masterGames";
import {
  crossGameTransferAsset, hydrateTransferCases, type TransferCaseStudy,
} from "../model-games/crossGameTransfer";
import "../styles/p114-cross-game-transfer.css";

interface Props {
  games: MasterTimeline[];
  owner: string;
  onOpenPosition: (gameId: string, checkpointId: string) => void;
}
const LENGTH = 1200;
export function CrossGameTransferLab({ games, owner, onOpenPosition }: Props) {
  const [cases, setCases] = useState<TransferCaseStudy[] | null>(null);
  const [rejected, setRejected] = useState(0);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, MasterDraft>>({});
  const [restoredOwner, setRestoredOwner] = useState("");
  const [showHint, setShowHint] = useState(0);
  const [shownMoves, setShownMoves] = useState<[boolean, boolean]>([false, false]);

  useEffect(() => {
    const abort = new AbortController();
    fetch(crossGameTransferAsset, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Source archive could not be retrieved");
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        if (abort.signal.aborted) return;
        const result = hydrateTransferCases(payload, games);
        setCases(result.accepted);
        setRejected(result.rejected);
        setError(result.accepted.length ? "" : "No paired positions have two valid, complete source games.");
      })
      .catch(() => {
        if (!abort.signal.aborted) setError("Comparison source is unavailable. No positions have been invented.");
      });
    return () => abort.abort();
  }, [games]);

  useEffect(() => {
    setRestoredOwner("");
    if (!owner || !cases) { setDrafts({}); return; }
    const recovered = Object.fromEntries(cases.flatMap((item) => {
      const stored = restoreMasterDrafts(owner, "p114:" + item.source.id)[item.source.id];
      return stored ? [[item.source.id, stored]] : [];
    }));
    setDrafts(recovered);
    setRestoredOwner(owner);
  }, [owner, cases]);

  const active = cases?.find((item) => item.source.id === selectedId) ?? cases?.[0];
  const currentId = active?.source.id ?? "";
  // An Account switch cannot momentarily display another owner's restored answers.
  const visibleDrafts = restoredOwner === owner ? drafts : {};
  const draft = active ? visibleDrafts[active.source.id] ?? emptyMasterDraft() : emptyMasterDraft();
  const reviewed = useMemo(() => cases?.filter((item) => visibleDrafts[item.source.id]?.mark).length ?? 0, [cases, visibleDrafts]);

  useEffect(() => {
    if (!owner || restoredOwner !== owner || !active || !drafts[active.source.id]) return;
    try {
      sessionStorage.setItem(masterDraftKey(owner, "p114:" + active.source.id), JSON.stringify({
        version: 1, saved: Date.now(), drafts: { [active.source.id]: drafts[active.source.id] },
      }));
    } catch { /* The writing activity remains usable without session storage. */ }
  }, [owner, restoredOwner, active, drafts]);

  function edit(patch: Partial<MasterDraft>) {
    if (!active) return;
    setDrafts((previous) => ({
      ...previous,
      [active.source.id]: { ...(previous[active.source.id] ?? emptyMasterDraft()), ...patch },
    }));
  }
  function choose(id: string) {
    setSelectedId(id);
    setShowHint(0);
    setShownMoves([false, false]);
  }
  const canCompare = draft.plan.trim().length >= 18 && draft.defense.trim().length >= 18;
  const activeIndex = active ? cases?.findIndex((item) => item.source.id === currentId) ?? 0 : 0;

  return (
    <section className="p114-transfer" aria-label="Cross-game strategic transfer">
      <header className="p114-title">
        <div>
          <p className="eyebrow">P114 · COMPARATIVE STRATEGIC DECISIONS</p>
          <h2>One principle. Two positions. Different decisions.</h2>
          <p>Compare real historical positions, justify your plan and the opponent's resistance, then explain what transfers. All responses are unscored and remain local to this browser session.</p>
        </div>
        <span role="status">{reviewed}/{cases?.length ?? 12} self-assessed</span>
      </header>
      {!cases && !error && <p role="status">Loading the paired, source-checked positions…</p>}
      {error && <p role="alert">{error}</p>}
      {rejected > 0 && <p role="alert">{rejected} comparisons were excluded because a source game, checkpoint, or recorded continuation could not be verified.</p>}
      {cases && cases.length > 0 && <>
        <nav className="p114-picker" aria-label="Choose a comparative strategic study">
          {cases.map((item, index) => (
            <button type="button" key={item.source.id}
              className={item.source.id === currentId ? "selected" : ""}
              aria-current={item.source.id === currentId ? "step" : undefined}
              onClick={() => choose(item.source.id)}>
              <span>{index + 1}. {item.source.theme}</span>
              <strong>{item.source.title}</strong>
              {visibleDrafts[item.source.id]?.mark && <small>{visibleDrafts[item.source.id].mark === "retry" ? "Review again" : "Self-checked"}</small>}
            </button>
          ))}
        </nav>
        {active && <div className="p114-session" key={active.source.id}>
          <header className="p114-session-head">
            <p className="eyebrow">STUDY {activeIndex + 1} / {cases.length} · {active.source.theme}</p>
            <h3>{active.source.title}</h3>
            <p>{active.source.comparePrompt}</p>
          </header>
          <div className="p114-board-pair">
            {([active.first, active.second] as const).map((pin, index) => {
              const source = index === 0 ? active.source.first : active.source.second;
              return <article className="p114-source-position" key={source.gameId}>
                <div className="p114-position-title"><strong>{index === 0 ? "Position A" : "Position B"}</strong>
                  <span>{pin.game.game.year} · {pin.game.game.players}</span>
                </div>
                <ChessBoard
                  key={source.gameId + ":" + source.ply + ":" + shownMoves[index]}
                  fen={draft.revealed && shownMoves[index] ? pin.afterFen : pin.fen}
                  orientation={pin.game.game.orientation}
                  disabled
                />
                <p className="p114-ply">Before move {Math.floor(source.ply / 2) + 1}{source.ply % 2 ? "… (Black)" : ". (White)"} · {pin.game.game.event}</p>
                {draft.revealed && <div className="p114-recorded">
                  <p>Observed: <strong>{source.move} {source.reply} {source.continuation}</strong></p>
                  <button type="button" className="secondary" aria-pressed={shownMoves[index]}
                    onClick={() => setShownMoves((old) => old.map((v, i) => i === index ? !v : v) as [boolean, boolean])}>
                    {shownMoves[index] ? "Before historical move" : "After historical move"}
                  </button>
                  <button type="button" className="secondary"
                    onClick={() => onOpenPosition(source.gameId, source.checkpointId)}>
                    Open complete game <ChevronRight size={15} />
                  </button>
                </div>}
              </article>;
            })}
          </div>
          <div className="p114-writing">
            <h4>1 · Decide independently</h4>
            <label htmlFor="p114-compare">Which details require a different plan?</label>
            <textarea id="p114-compare" rows={4} maxLength={LENGTH} value={draft.plan}
              placeholder="Compare pawn structure, development, king safety and a legal candidate for each board."
              onChange={(event) => edit({ plan: event.target.value, revealed: false, mark: null })} />
            <label htmlFor="p114-resist">What can the opponent do to resist each plan?</label>
            <p>{active.source.resistancePrompt}</p>
            <textarea id="p114-resist" rows={3} maxLength={LENGTH} value={draft.defense}
              placeholder="One concrete defender reply or forcing resource per position."
              onChange={(event) => edit({ defense: event.target.value, revealed: false, mark: null })} />
            {!draft.revealed && <div className="p114-hints">
              {active.source.hints.slice(0, showHint).map((hint, i) => <p key={i}><strong>Hint {i + 1}:</strong> {hint}</p>)}
              <button className="secondary" type="button" disabled={showHint === active.source.hints.length}
                onClick={() => setShowHint((n) => Math.min(n + 1, active.source.hints.length))}>Show next hint</button>
              <button className="primary" type="button" disabled={!canCompare}
                onClick={() => edit({ revealed: true })}><Eye size={15} /> Compare with source</button>
            </div>}
            {draft.revealed && <section className="p114-model" aria-live="polite">
              <h4>2 · Verify against the recorded games</h4>
              <p>{active.source.model}</p>
              <h5>Specific misconception and repair</h5><p>{active.source.misconception}</p>
              <p className="p114-integrity">The displayed moves are factual PGN continuations; their objective evaluation and unique optimality are not certified.</p>
              <h4>3 · Transfer without copying the move</h4>
              <p>{active.source.transferPrompt}</p>
              <label htmlFor="p114-transfer">My revised transferable principle</label>
              <textarea id="p114-transfer" rows={3} maxLength={LENGTH} value={draft.transfer}
                placeholder="Describe the decision criterion and a possible failure case in your own game."
                onChange={(event) => edit({ transfer: event.target.value, mark: null })} />
              <div className="p114-marks" role="group" aria-label="Unscored comparison self-check">
                <button type="button" className={draft.mark === "retry" ? "selected" : ""}
                  disabled={draft.transfer.trim().length < 18}
                  aria-pressed={draft.mark === "retry"} onClick={() => edit({ mark: "retry" })}>Needs another attempt</button>
                <button type="button" className={draft.mark === "understood" ? "selected" : ""}
                  disabled={draft.transfer.trim().length < 18}
                  aria-pressed={draft.mark === "understood"} onClick={() => edit({ mark: "understood" })}>Understood</button>
              </div>
            </section>}
            <footer className="p114-footer">
              <button className="secondary" type="button" disabled={activeIndex === 0}
                onClick={() => choose(cases[activeIndex - 1].source.id)}><ChevronLeft size={15}/> Previous pair</button>
              <button className="secondary" type="button" disabled={activeIndex === cases.length - 1}
                onClick={() => choose(cases[activeIndex + 1].source.id)}>Next pair <ChevronRight size={15}/></button>
              <button className="p114-reset" type="button" onClick={() => edit(emptyMasterDraft())}>
                <RotateCcw size={14}/> Clear this draft
              </button>
            </footer>
            <p className="p114-integrity">Original text is visible only after your first responses. Drafts use the existing P113 owner-scoped session mechanism (not Account mastery, grades, or synchronized progress).</p>
          </div>
        </div>}
      </>}
    </section>
  );
}
