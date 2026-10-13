import { Chess } from "chess.js";
import { ChevronLeft, ChevronRight, Eye, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChessBoard } from "./ChessBoard";
import {
  emptyMasterDraft, hydrateMasterGames, masterDraftKey,
  masterGameAsset, restoreMasterDrafts,
  type MasterDraft, type MasterTimeline,
} from "../model-games/masterGames";

const MAX_WRITING = 1200;

export function MasterGameLibrary({ owner }: { owner: string }) {
  const [expanded, setExpanded] = useState(false);
  const [collection, setCollection] = useState<MasterTimeline[] | null>(null);
  const [rejected, setRejected] = useState(0);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [decisionIndex, setDecisionIndex] = useState(0);
  const [viewPly, setViewPly] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, MasterDraft>>({});
  const [draftOwner, setDraftOwner] = useState("");
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
  const currentDraft = decision ? drafts[decision.id] ?? emptyMasterDraft() : emptyMasterDraft();
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
    setDrafts(selectedId ? restoreMasterDrafts(owner, selectedId) : {});
    if (owner && selectedId) setDraftOwner(owner + ":" + selectedId);
  }, [owner, selectedId]);

  useEffect(() => {
    if (!owner || !selectedId || draftOwner !== owner + ":" + selectedId) return;
    try {
      sessionStorage.setItem(masterDraftKey(owner, selectedId), JSON.stringify({
        version: 1, saved: Date.now(), drafts,
      }));
    } catch { /* Session quota/private browsing does not block study. */ }
  }, [owner, selectedId, draftOwner, drafts]);

  const completed = useMemo(() => current
    ? current.game.checkpoints.filter((item) => drafts[item.id]?.mark).length
    : 0, [current, drafts]);

  function choose(item: MasterTimeline) {
    setSelectedId(item.game.id);
    setDecisionIndex(0);
    setViewPly(item.game.checkpoints[0].ply);
  }
  function selectDecision(index: number) {
    if (!current) return;
    setDecisionIndex(index);
    setViewPly(current.game.checkpoints[index].ply);
  }
  function edit(patch: Partial<MasterDraft>) {
    if (!decision) return;
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
      {expanded && !collection && !error && <p role="status">Loading legal PGN game records…</p>}
      {expanded && error && <div role="alert">
        <p>{error}</p><button className="secondary" type="button" onClick={() => { setError(""); setCollection(null); }}>Retry source</button>
      </div>}
      {expanded && collection && !current && (
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
      {expanded && current && decision && (
        <section className="p113-study" aria-label={current.game.title}>
          <header className="p113-study-head">
            <button className="secondary" type="button" onClick={() => setSelectedId("")}>
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
                key={current.game.id + ":" + viewPly + ":" + Boolean(exploreFen)}
                fen={exploreFen || fen}
                orientation={current.game.orientation}
                disabled={exploreFen === null}
                onMove={exploreFen !== null ? exploreMove : undefined}
              />
              <div className="p113-move-controls" role="group" aria-label="Historical move navigation">
                <button type="button" aria-label="Beginning of game" onClick={() => setViewPly(0)} disabled={viewPly === 0}>|←</button>
                <button type="button" aria-label="Previous historical move" onClick={() => setViewPly((ply) => Math.max(0, ply - 1))} disabled={viewPly === 0}><ChevronLeft size={16}/></button>
                <span aria-live="polite">{viewPly === 0 ? "Starting position" : "Ply " + viewPly + "/" + plyCount + " · " + moveShown}</span>
                <button type="button" aria-label="Next historical move" onClick={() => setViewPly((ply) => Math.min(plyCount, ply + 1))} disabled={viewPly === plyCount}><ChevronRight size={16}/></button>
                <button type="button" aria-label="End of game" onClick={() => setViewPly(plyCount)} disabled={viewPly === plyCount}>→|</button>
              </div>
              <div className="p113-movelist" aria-label="Historical moves seen so far">
                {current.sans.slice(Math.max(0, viewPly - 16), viewPly).map((move, offset) => {
                  const ply = Math.max(0, viewPly - 16) + offset;
                  return <button key={ply} type="button" onClick={() => setViewPly(ply + 1)}
                    aria-label={"Return to ply " + (ply + 1)}>{ply % 2 === 0 ? Math.floor(ply / 2) + 1 + ". " : ""}{move}</button>;
                })}
              </div>
              <div className="p113-explore">
                <button className="secondary" type="button" onClick={() => { setExploreFen(fen); setExploreLine([]); }}>
                  Try a legal alternative
                </button>
                {exploreFen !== null && <>
                  <p><strong>Unscored local exploration:</strong> {exploreLine.length ? exploreLine.join(" ") : "Move a piece on the board. Up to eight legal plies."}</p>
                  <button className="secondary" type="button" onClick={() => { setExploreFen(null); setExploreLine([]); }}>
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
                    {index + 1}. {item.lens} {drafts[item.id]?.mark ? "✓" : ""}
                  </button>
                ))}
              </nav>
              <p className="eyebrow">DECISION {decisionIndex + 1} / 4 · {decision.focus}</p>
              <h3>Think before looking ahead</h3>
              <p>{decision.prompt}</p>
              <label htmlFor="p113-plan">Candidate move and strategic reasoning</label>
              <textarea id="p113-plan" maxLength={MAX_WRITING} rows={3} value={currentDraft.plan}
                onChange={(event) => edit({ plan: event.target.value, revealed: false, mark: null })}
                placeholder="Name a legal candidate, target square, plan and concrete reason." />
              <label htmlFor="p113-defense">Opponent's strongest practical objection</label>
              <textarea id="p113-defense" maxLength={MAX_WRITING} rows={3} value={currentDraft.defense}
                onChange={(event) => edit({ defense: event.target.value, revealed: false, mark: null })}
                placeholder="What could the other side actually play?"/>
              {!currentDraft.revealed && <button type="button" className="primary"
                disabled={!comparisonReady} onClick={() => edit({ revealed: true })}>
                <Eye size={15}/> Compare with historical continuation
              </button>}
              {currentDraft.revealed && (
                <section className="p113-comparison" aria-live="polite">
                  <strong>Observed move and original study explanation</strong><p>{decision.model}</p>
                  <strong>Misconception and repair</strong><p>{decision.misconception}</p>
                  <strong>Independent transfer</strong><p>{decision.transfer}</p>
                  <label htmlFor="p113-transfer">Your revised plan for alternative resistance</label>
                  <textarea id="p113-transfer" maxLength={MAX_WRITING} rows={3} value={currentDraft.transfer}
                    onChange={(event) => edit({ transfer: event.target.value, mark: null })} />
                  <p className="p113-source-caption">{decision.observed}</p>
                  <div className="p113-mark" role="group" aria-label="Unscored self-assessment">
                    <button type="button" className={currentDraft.mark === "retry" ? "selected" : ""}
                      aria-pressed={currentDraft.mark === "retry"} onClick={() => edit({ mark: "retry" })}>Retry this decision</button>
                    <button type="button" className={currentDraft.mark === "understood" ? "selected" : ""}
                      aria-pressed={currentDraft.mark === "understood"} onClick={() => edit({ mark: "understood" })}>Understood</button>
                  </div>
                </section>
              )}
              <div className="p113-next">
                <button type="button" className="secondary" disabled={decisionIndex === 0} onClick={() => selectDecision(decisionIndex - 1)}><ChevronLeft size={15}/> Previous decision</button>
                <button type="button" className="secondary" disabled={decisionIndex === 3} onClick={() => selectDecision(decisionIndex + 1)}>Next decision <ChevronRight size={15}/></button>
              </div>
              <button type="button" className="p113-reset" onClick={resetDraft}><RotateCcw size={14}/> Restart this decision</button>
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
