import "../styles/p113-master-games.css";
import { Chess } from "chess.js";
import { ChevronLeft, ChevronRight, Eye, RotateCcw } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ChessBoard } from "./ChessBoard";
import {
  emptyMasterDraft, hydrateMasterGames, masterDraftKey,
  masterGameAsset, restoreMasterDrafts,
  type MasterDraft, type MasterTimeline,
} from "../model-games/masterGames";

const CrossGameTransferLab = lazy(() => import("./CrossGameTransferLab").then((module) => ({
  default: module.CrossGameTransferLab,
})));
const MAX_WRITING = 1200;

export function MasterGameLibrary({ owner, focusSkillId }: { owner: string; focusSkillId?: string }) {
  const [expanded, setExpanded] = useState(true);
  const [collection, setCollection] = useState<MasterTimeline[] | null>(null);
  const [rejected, setRejected] = useState(0);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [transferOpen, setTransferOpen] = useState(Boolean(focusSkillId));
  const [decisionIndex, setDecisionIndex] = useState(0);
  const [viewPly, setViewPly] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, MasterDraft>>({});
  const [draftOwner, setDraftOwner] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [exploreFen, setExploreFen] = useState<string | null>(null);
  const [exploreLine, setExploreLine] = useState<string[]>([]);

  useEffect(() => {
    if (!expanded || collection || error) return;
    const abort = new AbortController();
    fetch(masterGameAsset, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Game data unavailable");
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        if (abort.signal.aborted) return;
        const result = hydrateMasterGames(payload);
        setCollection(result.accepted);
        setRejected(result.rejected);
        if (!result.accepted.length) setError("No complete, legal source records available.");
      })
      .catch(() => {
        if (!abort.signal.aborted) setError("The game archive could not be loaded. Retry when connected.");
      });
    return () => abort.abort();
  }, [expanded, collection, error]);

  const current = collection?.find((item) => item.game.id === selectedId);
  const decision = current?.game.checkpoints[decisionIndex];
  // Never expose the previous Account's draft while the restoration effect runs.
  const ownerDraftKey = owner && selectedId ? masterDraftKey(owner, selectedId) : "";
  const draftReady = Boolean(ownerDraftKey && draftOwner === ownerDraftKey);
  const visibleDrafts = draftReady ? drafts : {};
  const currentDraft = decision ? visibleDrafts[decision.id] ?? emptyMasterDraft() : emptyMasterDraft();
  const fen = current?.fens[viewPly] ?? "";
  const plyCount = current?.sans.length ?? 0;
  const moveShown = viewPly > 0 ? current?.sans[viewPly - 1] : undefined;
  const comparisonReady = currentDraft.plan.trim().length >= 12 &&
    currentDraft.defense.trim().length >= 12;

  useEffect(() => {
    setExploreFen(null);
    setExploreLine([]);
  }, [selectedId, viewPly]);

  useEffect(() => {
    setDraftOwner("");
    setDrafts(owner && selectedId ? restoreMasterDrafts(owner, selectedId) : {});
    setStorageError(false);
    if (owner && selectedId) setDraftOwner(masterDraftKey(owner, selectedId));
  }, [owner, selectedId]);

  useEffect(() => {
    if (!ownerDraftKey || draftOwner !== ownerDraftKey) return;
    try {
      sessionStorage.setItem(ownerDraftKey, JSON.stringify({
        version: 1, saved: Date.now(), drafts,
      }));
      setStorageError(false);
    } catch {
      // Keep unsaved text on screen and tell the learner recovery is unavailable.
      setStorageError(true);
    }
  }, [ownerDraftKey, draftOwner, drafts]);

  const completed = useMemo(() => current
    ? current.game.checkpoints.filter((item) => visibleDrafts[item.id]?.mark).length
    : 0, [current, visibleDrafts]);

  function confirmLeavingVariation() {
    return !exploreLine.length ||
      window.confirm("Leave this unsaved legal variation? Its moves are not included in your written draft.");
  }
  function visitPly(ply: number) {
    if (!current || ply === viewPly || !confirmLeavingVariation()) return;
    setViewPly(Math.max(0, Math.min(current.sans.length, ply)));
  }
  function choose(item: MasterTimeline) {
    if (!confirmLeavingVariation()) return;
    setSelectedId(item.game.id);
    setDecisionIndex(0);
    setViewPly(item.game.checkpoints[0].ply);
  }
  function openPairSource(gameId: string, checkpointId: string) {
    if (!confirmLeavingVariation()) return;
    const game = collection?.find((entry) => entry.game.id === gameId);
    if (!game) return;
    const index = game.game.checkpoints.findIndex((checkpoint) => checkpoint.id === checkpointId);
    if (index < 0) return;
    setSelectedId(gameId);
    setDecisionIndex(index);
    setViewPly(game.game.checkpoints[index].ply);
    setTransferOpen(false);
  }
  function selectDecision(index: number) {
    if (!current || ((index !== decisionIndex ||
      viewPly !== current.game.checkpoints[index]?.ply) && !confirmLeavingVariation())) return;
    setDecisionIndex(index);
    setViewPly(current.game.checkpoints[index].ply);
  }
  function edit(patch: Partial<MasterDraft>) {
    if (!decision || !ownerDraftKey || draftOwner !== ownerDraftKey) return;
    setDrafts((existing) => ({
      ...existing,
      [decision.id]: { ...(existing[decision.id] ?? emptyMasterDraft()), ...patch },
    }));
  }
  function exploreMove(move: { from: string; to: string; promotion?: string }) {
    if (!current || exploreLine.length >= 8) return false;
    try {
      const chess = new Chess(exploreFen || fen);
      const played = chess.move({ from: move.from, to: move.to, promotion: move.promotion });
      setExploreFen(chess.fen());
      setExploreLine((line) => [...line, played.san]);
      return true;
    } catch { return false; }
  }
  function resetDraft() {
    if (!decision) return;
    if ((currentDraft.plan || currentDraft.defense || currentDraft.transfer ||
      currentDraft.mark || currentDraft.revealed) &&
      !window.confirm("Discard this decision's unsent writing and self-check?")) return;
    edit(emptyMasterDraft());
  }
  return (
    <section className="p113-master" aria-label="P113 complete master game studies">
      <header className="model-game-method">
        <div>
          <p className="eyebrow">P113 · COMPLETE GAME LAB</p>
          <h2>Critical decisions in a whole game</h2>
          <p>Four existing model games above, plus eight historical game journeys with 32 new independent decision prompts. This workspace is unscored.</p>
        </div>
        <button type="button" className="secondary" aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Close archive" : "Explore master games"}
        </button>
      </header>
      {storageError && current && <p role="alert">This browser could not save your master-game draft. Copy your answers before leaving this tab.</p>}
      {expanded && !collection && !error && <p role="status">Loading legal PGN game records…</p>}
      {expanded && error && <div role="alert">
        <p>{error}</p><button className="secondary" type="button" onClick={() => { setError(""); setCollection(null); }}>Retry source</button>
      </div>}
      {expanded && collection && collection.length > 0 && (
        <nav className="p114-handoff-nav" aria-label="Master-game learning mode">
          <button type="button" className={!transferOpen ? "selected" : ""}
            aria-current={!transferOpen ? "page" : undefined}
            onClick={() => {
              if (!confirmLeavingVariation()) return;
              setTransferOpen(false);
              setSelectedId("");
            }}>
            Complete games
          </button>
          <button type="button" className={transferOpen ? "selected" : ""}
            aria-current={transferOpen ? "page" : undefined}
            onClick={() => {
              if (!confirmLeavingVariation()) return;
              setTransferOpen(true);
              setSelectedId("");
            }}>
            P114 · Compare strategic decisions
          </button>
        </nav>
      )}
      {expanded && collection && transferOpen && (
        <Suspense fallback={<p role="status">Opening comparative studies…</p>}>
          <CrossGameTransferLab owner={owner} games={collection} onOpenPosition={openPairSource} focusSkillId={focusSkillId}/>
        </Suspense>
      )}
      {expanded && collection && !current && !transferOpen && (
        <>
          <p className="p113-source-caption">Historical PGN move scores are factual records. The original decision questions are interpretations, not unique-best-move or engine-verified claims. No scores, achievements or mastery are written.</p>
          {rejected > 0 && <p role="alert">{rejected} source records excluded because their PGN or metadata could not be validated.</p>}
          <div className="model-game-grid">
            {collection.map((item) => (
              <article key={item.game.id} className="model-game-card">
                <div className="model-game-card-top">
                  <span>{item.game.year} · {item.game.event}</span>
                  <strong>{item.game.result}</strong>
                </div>
                <h3>{item.game.title}</h3><strong className="model-game-players">{item.game.players}</strong>
                <p>{item.game.summary}</p>
                <p>{item.sans.length} verified historical plies · 4 independent decisions</p>
                <button type="button" className="model-game-start" onClick={() => choose(item)}>
                  Open complete game <ChevronRight size={15} />
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {expanded && !transferOpen && current && decision && (
        <section className="p113-study" aria-label={current.game.title}>
          <header className="p113-study-head">
            <button className="secondary" type="button" onClick={() => { if (confirmLeavingVariation()) setSelectedId(""); }}>
              <ChevronLeft size={15} /> All games
            </button>
            <div>
              <p className="eyebrow">MASTER GAME · {current.game.year} · {current.game.result}</p>
              <h2>{current.game.title}</h2>
              <p>{current.game.players} · {current.game.event}</p>
            </div>
            <span role="status">{completed}/4 self-assessed</span>
          </header>
          <div className="p113-grid">
            <div className="p113-board-panel">
              <ChessBoard
                key={current.game.id}
                fen={exploreFen || fen}
                orientation={current.game.orientation}
                disabled={exploreFen === null}
                onMove={exploreFen !== null ? exploreMove : undefined}
              />
              <div className="p113-move-controls" role="group" aria-label="Historical move navigation">
                <button type="button" aria-label="Beginning of game" onClick={() => visitPly(0)} disabled={viewPly === 0}>|←</button>
                <button type="button" aria-label="Previous historical move" onClick={() => visitPly(viewPly - 1)} disabled={viewPly === 0}><ChevronLeft size={16}/></button>
                <span aria-live="polite">{viewPly === 0 ? "Starting position" : "Ply " + viewPly + "/" + plyCount + " · " + moveShown}</span>
                <button type="button" aria-label="Next historical move" onClick={() => visitPly(viewPly + 1)} disabled={viewPly === plyCount}><ChevronRight size={16}/></button>
                <button type="button" aria-label="End of game" onClick={() => visitPly(plyCount)} disabled={viewPly === plyCount}>→|</button>
              </div>
              <div className="p113-movelist" aria-label="Historical moves seen so far">
                {current.sans.slice(Math.max(0, viewPly - 16), viewPly).map((move, offset) => {
                  const ply = Math.max(0, viewPly - 16) + offset;
                  return <button key={ply} type="button" onClick={() => visitPly(ply + 1)}
                    aria-label={"Return to ply " + (ply + 1)}>{ply % 2 === 0 ? Math.floor(ply / 2) + 1 + ". " : ""}{move}</button>;
                })}
              </div>
              <div className="p113-explore">
                <button className="secondary" type="button" onClick={() => {
                  if (confirmLeavingVariation()) { setExploreFen(fen); setExploreLine([]); }
                }}>
                  Try a legal alternative
                </button>
                {exploreFen !== null && <>
                  <p><strong>Unscored local exploration:</strong> {exploreLine.length ? exploreLine.join(" ") : "Move a piece on the board. Up to eight legal plies."}</p>
                  <button className="secondary" type="button" onClick={() => {
                    if (!confirmLeavingVariation()) return;
                    setExploreFen(null);
                    setExploreLine([]);
                  }}>
                    Reset to historical position
                  </button>
                </>}
              </div>
            </div>
            <div className="p113-work-panel">
              <nav className="p113-decisions" aria-label="Critical decisions">
                {current.game.checkpoints.map((item, index) => (
                  <button key={item.id} type="button" className={decisionIndex === index ? "selected" : ""}
                    aria-current={decisionIndex === index ? "step" : undefined}
                    onClick={() => selectDecision(index)}>
                    {index + 1}. {item.lens} {visibleDrafts[item.id]?.mark ? "✓" : ""}
                  </button>
                ))}
              </nav>
              <p className="eyebrow">DECISION {decisionIndex + 1} / 4 · {decision.focus}</p>
              <h3>Think before looking ahead</h3>
              <p>{decision.prompt}</p>
              {!draftReady && <p role="status">Restoring this Account's historical study drafts…</p>}
              <label htmlFor="p113-plan">Candidate move and strategic reasoning</label>
              <textarea id="p113-plan" maxLength={MAX_WRITING} rows={3} disabled={!draftReady} value={currentDraft.plan}
                onChange={(event) => edit({ plan: event.target.value, revealed: false, mark: null })}
                placeholder="Name a legal candidate, target square, plan and concrete reason." />
              <label htmlFor="p113-defense">Opponent's strongest practical objection</label>
              <textarea id="p113-defense" maxLength={MAX_WRITING} rows={3} disabled={!draftReady} value={currentDraft.defense}
                onChange={(event) => edit({ defense: event.target.value, revealed: false, mark: null })}
                placeholder="What could the other side actually play?"/>
              {!currentDraft.revealed && <button type="button" className="primary"
                disabled={!draftReady || !comparisonReady} onClick={() => edit({ revealed: true })}>
                <Eye size={15}/> Compare with historical continuation
              </button>}
              {currentDraft.revealed && (
                <section className="p113-comparison" aria-live="polite">
                  <strong>Observed move and original study explanation</strong><p>{decision.model}</p>
                  <strong>Misconception and repair</strong><p>{decision.misconception}</p>
                  <strong>Independent transfer</strong><p>{decision.transfer}</p>
                  <label htmlFor="p113-transfer">Your revised plan for alternative resistance</label>
                  <textarea id="p113-transfer" maxLength={MAX_WRITING} rows={3} disabled={!draftReady} value={currentDraft.transfer}
                    onChange={(event) => edit({ transfer: event.target.value, mark: null })} />
                  <p className="p113-source-caption">{decision.observed}</p>
                  <div className="p113-mark" role="group" aria-label="Unscored self-assessment">
                    <button type="button" className={currentDraft.mark === "retry" ? "selected" : ""}
                      aria-pressed={currentDraft.mark === "retry"} disabled={!draftReady}
                      onClick={() => edit({ mark: "retry" })}>Retry this decision</button>
                    <button type="button" className={currentDraft.mark === "understood" ? "selected" : ""}
                      aria-pressed={currentDraft.mark === "understood"} disabled={!draftReady}
                      onClick={() => edit({ mark: "understood" })}>Understood</button>
                  </div>
                </section>
              )}
              <div className="p113-next">
                <button type="button" className="secondary" disabled={decisionIndex === 0} onClick={() => selectDecision(decisionIndex - 1)}><ChevronLeft size={15}/> Previous decision</button>
                <button type="button" className="secondary" disabled={decisionIndex === 3} onClick={() => selectDecision(decisionIndex + 1)}>Next decision <ChevronRight size={15}/></button>
              </div>
              <button type="button" className="p113-reset" disabled={!draftReady} onClick={resetDraft}><RotateCcw size={14}/> Restart this decision</button>
              <p className="p113-source-caption">This short-lived draft is scoped to the current Account profile and session; it is not submitted, scored or synced. Move navigation is free and can reveal later moves.</p>
              <a href={current.game.source} target="_blank" rel="noreferrer">Historical PGN source</a>
              <p className="p113-source-caption">{current.game.sourceNote}</p>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
