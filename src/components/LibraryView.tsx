import { Chess, type Color, type Square } from "chess.js";
import {
  Bookmark,
  BookOpenCheck,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  FlipHorizontal2,
  FolderOpen,
  Gamepad2,
  Heart,
  Library,
  LoaderCircle,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Target,
  Trash2,
  Undo2,
  Redo2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { skills } from "../domain/curriculum";
import { StockfishBrowserEngine } from "../engine/stockfish";
import type { EngineEvaluation, ImportedGame } from "../games/types";
import { createStudyTraining, dueStudyTraining } from "../library/progress";
import { referenceStudies } from "../library/references";
import type { ReferenceStudy, SavedStudy, StudyKind } from "../library/types";
import {
  appendWorkspaceMove,
  fenAtCursor,
  lineToPgn,
  loadFenLine,
  loadPgnLine,
  pvToSan,
  standardFen,
  type WorkspaceLine,
} from "../library/workspace";
import type { BoardArrow } from "../learning/types";
import { ChessBoard } from "./ChessBoard";

type LibraryTab = "workspace" | "saved" | "references" | "games";

interface LibraryViewProps {
  studies: SavedStudy[];
  games: ImportedGame[];
  onSaveStudy: (study: SavedStudy) => void;
  onDeleteStudy: (studyId: string) => void;
  onToggleFavorite: (studyId: string) => void;
  onTrainStudy: (studyId: string) => void;
}

function evalLabel(cp: number) {
  if (Math.abs(cp) > 90_000) return cp > 0 ? "+M" : "-M";
  const value = cp / 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function studyKindLabel(kind: StudyKind) {
  if (kind === "game") return "Game";
  if (kind === "opening") return "Opening";
  if (kind === "endgame") return "Endgame";
  if (kind === "tactic") return "Tactic";
  if (kind === "reference") return "Reference";
  return "Position";
}

function uciArrow(uci?: string): BoardArrow[] {
  if (!uci || uci === "(none)") return [];
  return [{
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    tone: "good",
  }];
}

function newStudyId() {
  return `study-${Date.now().toString(36)}`;
}

export function LibraryView({
  studies,
  games,
  onSaveStudy,
  onDeleteStudy,
  onToggleFavorite,
  onTrainStudy,
}: LibraryViewProps) {
  const [tab, setTab] = useState<LibraryTab>("workspace");
  const [line, setLine] = useState<WorkspaceLine>(() => loadFenLine(standardFen, "w"));
  const [cursor, setCursor] = useState(0);
  const [orientation, setOrientation] = useState<Color>("w");
  const [title, setTitle] = useState("Untitled study");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [kind, setKind] = useState<StudyKind>("position");
  const [loadedStudyId, setLoadedStudyId] = useState<string | undefined>();
  const [source, setSource] = useState<SavedStudy["source"]>("personal");
  const [sourceId, setSourceId] = useState<string | undefined>();
  const [fenInput, setFenInput] = useState(standardFen);
  const [pgnInput, setPgnInput] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [trainingSkillId, setTrainingSkillId] = useState("calculation.candidates");
  const [query, setQuery] = useState("");

  const currentFen = fenAtCursor(line, cursor);
  const currentPgn = useMemo(
    () => lineToPgn({ ...line, moves: line.moves.slice(0, cursor) }),
    [cursor, line],
  );
  const pvSan = useMemo(
    () => evaluation ? pvToSan(currentFen, evaluation.pv.slice(0, 6)) : [],
    [currentFen, evaluation],
  );
  const dueCount = dueStudyTraining(studies).length;
  const favoriteCount = studies.filter((study) => study.favorite).length;

  const filteredStudies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return studies;
    return studies.filter((study) =>
      [
        study.title,
        study.notes,
        ...study.tags,
        studyKindLabel(study.kind),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, studies]);

  function resetWorkspace(
    next: WorkspaceLine,
    options: {
      title?: string;
      notes?: string;
      tags?: string[];
      kind?: StudyKind;
      studyId?: string;
      source?: SavedStudy["source"];
      sourceId?: string;
      orientation?: Color;
      engine?: SavedStudy["engine"];
    } = {},
  ) {
    setLine(next);
    setCursor(next.moves.length);
    setOrientation(options.orientation ?? next.orientation);
    setTitle(options.title ?? "Untitled study");
    setNotes(options.notes ?? "");
    setTags(options.tags?.join(", ") ?? "");
    setKind(options.kind ?? (next.moves.length ? "game" : "position"));
    setLoadedStudyId(options.studyId);
    setSource(options.source ?? "personal");
    setSourceId(options.sourceId);
    setEvaluation(
      options.engine
        ? {
            scoreCp: options.engine.evaluationCp,
            bestMove: options.engine.bestMove,
            pv: options.engine.principalVariation,
            depth: options.engine.depth,
          }
        : null,
    );
    setFenInput(fenAtCursor(next, next.moves.length));
    setPgnInput(next.moves.length ? lineToPgn(next) : "");
    setLoadError(null);
    setTab("workspace");
  }

  function openSavedStudy(study: SavedStudy) {
    try {
      const next = study.pgn
        ? loadPgnLine(study.pgn, study.orientation)
        : loadFenLine(study.fen, study.orientation);
      resetWorkspace(next, {
        title: study.title,
        notes: study.notes,
        tags: study.tags,
        kind: study.kind,
        studyId: study.id,
        source: study.source,
        sourceId: study.sourceId,
        orientation: study.orientation,
        engine: study.engine,
      });
    } catch {
      setLoadError("This saved study could not be loaded.");
      setTab("workspace");
    }
  }

  function openReference(reference: ReferenceStudy) {
    try {
      const next = reference.pgn
        ? loadPgnLine(reference.pgn, reference.orientation)
        : loadFenLine(reference.fen!, reference.orientation);
      resetWorkspace(next, {
        title: reference.title,
        notes: reference.description,
        tags: reference.tags,
        kind: reference.kind,
        source: "reference",
        sourceId: reference.id,
        orientation: reference.orientation,
      });
    } catch {
      setLoadError("This reference could not be loaded.");
      setTab("workspace");
    }
  }

  function openGame(game: ImportedGame) {
    try {
      const next = loadPgnLine(game.pgn, game.playerColor);
      resetWorkspace(next, {
        title: `${game.white} — ${game.black}`,
        notes: game.reviewStory?.summary ?? "Saved from your game history.",
        tags: ["game", game.reviewStory?.verdict ?? "played"],
        kind: "game",
        source: "game",
        sourceId: game.id,
        orientation: game.playerColor,
      });
    } catch {
      setLoadError("This game could not be opened in the workspace.");
      setTab("workspace");
    }
  }

  async function analyzePosition() {
    if (evaluating) return;
    let engine: StockfishBrowserEngine | null = null;
    setEvaluating(true);
    setLoadError(null);

    try {
      const chess = new Chess(currentFen);
      if (chess.isGameOver()) {
        throw new Error("This position is already terminal.");
      }
      engine = await StockfishBrowserEngine.create();
      setEvaluation(await engine.evaluate(currentFen, 12));
    } catch (cause) {
      setLoadError(
        cause instanceof Error ? cause.message : "The position could not be analyzed.",
      );
    } finally {
      engine?.quit();
      setEvaluating(false);
    }
  }

  function buildStudy(training = false): SavedStudy | null {
    const now = new Date().toISOString();
    const bestSan = evaluation
      ? pvToSan(currentFen, [evaluation.bestMove])[0]
      : undefined;

    if (training && (!evaluation?.bestMove || evaluation.bestMove === "(none)" || !bestSan)) {
      setLoadError("Analyze the position first so there is a concrete move to remember.");
      return null;
    }

    const existing = loadedStudyId
      ? studies.find((study) => study.id === loadedStudyId)
      : undefined;
    const samePosition = existing?.fen === currentFen;
    const parsedTags = [...new Set(
      tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    )];

    const study: SavedStudy = {
      id: existing?.id ?? newStudyId(),
      title: title.trim() || "Untitled study",
      kind,
      fen: currentFen,
      pgn: line.moves.length ? currentPgn : undefined,
      notes: notes.trim(),
      tags: parsedTags,
      source,
      sourceId,
      orientation,
      arrows: evaluation
        ? uciArrow(evaluation.bestMove)
        : samePosition
          ? existing?.arrows ?? []
          : [],
      highlights: samePosition ? existing?.highlights ?? [] : [],
      engine: evaluation
        ? {
            evaluationCp: evaluation.scoreCp,
            bestMove: evaluation.bestMove,
            bestSan: bestSan ?? evaluation.bestMove,
            principalVariation: evaluation.pv.slice(0, 8),
            depth: evaluation.depth,
          }
        : samePosition
          ? existing?.engine
          : undefined,
      training:
        training && evaluation && bestSan
          ? createStudyTraining(
              trainingSkillId,
              evaluation.bestMove,
              bestSan,
              new Date(now),
            )
          : samePosition
            ? existing?.training
            : undefined,
      favorite: existing?.favorite ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    return study;
  }

  function saveStudy(training = false) {
    const study = buildStudy(training);
    if (!study) return;
    onSaveStudy(study);
    setLoadedStudyId(study.id);
    setLoadError(null);
  }

  const engineArrow = evaluation ? uciArrow(evaluation.bestMove) : [];

  return (
    <section className="library-view">
      <header className="section-hero compact library-hero">
        <div>
          <p className="eyebrow">LIBRARY</p>
          <h1>Your chess workspace.</h1>
          <p>
            Analyze freely, keep positions that matter, revisit complete games,
            and promote only the best study positions back into adaptive training.
          </p>
        </div>
        <div className="section-hero-icon" aria-hidden="true">
          <Library size={30} />
        </div>
      </header>

      <div className="library-metrics">
        <div><span>Saved studies</span><strong>{studies.length}</strong></div>
        <div><span>Favorites</span><strong>{favoriteCount}</strong></div>
        <div><span>Due from library</span><strong>{dueCount}</strong></div>
        <div><span>Games available</span><strong>{games.length}</strong></div>
      </div>

      <nav className="library-tabs" aria-label="Library sections">
        {([
          ["workspace", "Analysis board", BrainCircuit],
          ["saved", "Saved studies", Bookmark],
          ["references", "References", BookOpenCheck],
          ["games", "My games", Gamepad2],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {tab === "workspace" ? (
        <div className="analysis-workspace">
          <div className="analysis-board-column">
            <div className="workspace-toolbar">
              <button
                type="button"
                onClick={() =>
                  resetWorkspace(loadFenLine(standardFen, "w"), {
                    title: "Untitled study",
                    kind: "position",
                    orientation: "w",
                    source: "personal",
                  })
                }
              >
                <Sparkles size={15} /> New
              </button>
              <button
                type="button"
                disabled={cursor <= 0}
                onClick={() => {
                  setCursor((value) => Math.max(0, value - 1));
                  setEvaluation(null);
                }}
                aria-label="Undo move"
              >
                <Undo2 size={16} />
              </button>
              <button
                type="button"
                disabled={cursor >= line.moves.length}
                onClick={() => {
                  setCursor((value) => Math.min(line.moves.length, value + 1));
                  setEvaluation(null);
                }}
                aria-label="Redo move"
              >
                <Redo2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCursor(0);
                  setEvaluation(null);
                }}
              >
                <RotateCcw size={15} /> Start
              </button>
              <button
                type="button"
                onClick={() => setOrientation((value) => value === "w" ? "b" : "w")}
              >
                <FlipHorizontal2 size={15} /> Flip
              </button>
            </div>

            <ChessBoard
              key={orientation}
              fen={currentFen}
              orientation={orientation}
              arrows={engineArrow}
              onMove={(move) => {
                try {
                  const next = appendWorkspaceMove(
                    line,
                    cursor,
                    move.from,
                    move.to,
                    move.promotion,
                  );
                  setLine(next);
                  setCursor(next.moves.length);
                  setEvaluation(null);
                  setFenInput(fenAtCursor(next, next.moves.length));
                  setPgnInput(lineToPgn(next));
                  return true;
                } catch {
                  return false;
                }
              }}
            />

            <div className="workspace-move-strip">
              <button
                type="button"
                className={cursor === 0 ? "active" : ""}
                onClick={() => {
                  setCursor(0);
                  setEvaluation(null);
                }}
              >
                Start
              </button>
              {line.moves.map((move, index) => (
                <button
                  key={`${move.ply}-${move.uci}`}
                  type="button"
                  className={cursor === index + 1 ? "active" : ""}
                  onClick={() => {
                    setCursor(index + 1);
                    setEvaluation(null);
                  }}
                >
                  <small>{move.moveNumber}{move.color === "b" ? "…" : "."}</small>
                  {move.san}
                </button>
              ))}
            </div>
          </div>

          <aside className="analysis-control-panel">
            <div className="workspace-section-heading">
              <div>
                <p className="eyebrow">FREE ANALYSIS</p>
                <h2>{title || "Untitled study"}</h2>
              </div>
              {loadedStudyId && <span>Saved</span>}
            </div>

            <div className="analysis-engine-card">
              <div className="analysis-engine-head">
                <div>
                  <BrainCircuit size={18} />
                  <span>Stockfish</span>
                </div>
                <button
                  className="secondary"
                  type="button"
                  disabled={evaluating}
                  onClick={() => void analyzePosition()}
                >
                  {evaluating ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}
                  {evaluating ? "Analyzing…" : "Analyze position"}
                </button>
              </div>

              {evaluation ? (
                <div className="analysis-engine-result">
                  <div className="engine-eval-number">
                    <span>Evaluation</span>
                    <strong>{evalLabel(evaluation.scoreCp)}</strong>
                  </div>
                  <div>
                    <span>Best move</span>
                    <strong>{pvSan[0] ?? evaluation.bestMove}</strong>
                  </div>
                  <div className="engine-pv">
                    <span>Principal variation</span>
                    <strong>{pvSan.join(" ") || evaluation.pv.slice(0, 6).join(" ")}</strong>
                  </div>
                </div>
              ) : (
                <p className="analysis-engine-empty">
                  Engine analysis is on demand so the workspace stays quiet until you need it.
                </p>
              )}
            </div>

            <div className="workspace-loaders">
              <details>
                <summary>Load FEN</summary>
                <textarea
                  value={fenInput}
                  onChange={(event) => setFenInput(event.target.value)}
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      resetWorkspace(loadFenLine(fenInput, orientation), {
                        title: "FEN study",
                        kind: "position",
                        orientation,
                        source: "import",
                      });
                    } catch {
                      setLoadError("Enter a valid FEN position.");
                    }
                  }}
                >
                  Load position
                </button>
              </details>

              <details>
                <summary>Load PGN</summary>
                <textarea
                  value={pgnInput}
                  onChange={(event) => setPgnInput(event.target.value)}
                  spellCheck={false}
                  placeholder="Paste a game or variation…"
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      resetWorkspace(loadPgnLine(pgnInput, orientation), {
                        title: "Imported game",
                        kind: "game",
                        orientation,
                        source: "import",
                      });
                    } catch {
                      setLoadError("Enter a PGN containing at least one legal move.");
                    }
                  }}
                >
                  Load game
                </button>
              </details>
            </div>

            <div className="study-editor">
              <label>
                <span>Title</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label>
                <span>Kind</span>
                <select value={kind} onChange={(event) => setKind(event.target.value as StudyKind)}>
                  {(["position","game","opening","endgame","tactic","reference"] as StudyKind[]).map((item) => (
                    <option key={item} value={item}>{studyKindLabel(item)}</option>
                  ))}
                </select>
              </label>
              <label className="editor-wide">
                <span>Notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="What makes this position worth keeping?"
                />
              </label>
              <label className="editor-wide">
                <span>Tags</span>
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="calculation, rook ending, repertoire…"
                />
              </label>
            </div>

            <div className="training-promotion">
              <div>
                <Target size={17} />
                <div>
                  <strong>Promote to training</strong>
                  <span>Save Stockfish's best move as a position you want to recall later.</span>
                </div>
              </div>
              <select
                value={trainingSkillId}
                onChange={(event) => setTrainingSkillId(event.target.value)}
              >
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.title}
                  </option>
                ))}
              </select>
            </div>

            {loadError && (
              <div className="analysis-error">
                <strong>Workspace issue</strong>
                <span>{loadError}</span>
              </div>
            )}

            <div className="workspace-save-actions">
              <button className="secondary" type="button" onClick={() => saveStudy(false)}>
                <Save size={16} /> Save study
              </button>
              <button className="primary" type="button" onClick={() => saveStudy(true)}>
                <Target size={16} /> Save + train
              </button>
            </div>
          </aside>
        </div>
      ) : tab === "saved" ? (
        <section className="library-collection">
          <div className="collection-toolbar">
            <div>
              <p className="eyebrow">YOUR STUDIES</p>
              <h2>Keep only what is worth returning to.</h2>
            </div>
            <label className="library-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notes, tags, titles…"
              />
            </label>
          </div>

          {filteredStudies.length ? (
            <div className="study-card-grid">
              {[...filteredStudies]
                .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt))
                .map((study) => (
                  <article className="study-card" key={study.id}>
                    <div className="study-card-top">
                      <span>{studyKindLabel(study.kind)}</span>
                      <button
                        type="button"
                        className={study.favorite ? "favorite active" : "favorite"}
                        onClick={() => onToggleFavorite(study.id)}
                        aria-label={study.favorite ? "Remove favorite" : "Add favorite"}
                      >
                        <Heart size={15} />
                      </button>
                    </div>
                    <h3>{study.title}</h3>
                    <p>{study.notes || "No notes yet."}</p>
                    <div className="study-tags">
                      {study.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                    {study.training && (
                      <div className="study-training-state">
                        <Target size={13} />
                        <span>
                          {new Date(study.training.nextReviewAt) <= new Date()
                            ? "Due for recall"
                            : `Recall streak ${study.training.streak}`}
                        </span>
                      </div>
                    )}
                    <div className="study-card-actions">
                      <button type="button" onClick={() => openSavedStudy(study)}>
                        <FolderOpen size={15} /> Open
                      </button>
                      {study.training && (
                        <button type="button" onClick={() => onTrainStudy(study.id)}>
                          <Target size={15} /> Train
                        </button>
                      )}
                      <button
                        type="button"
                        className="danger"
                        onClick={() => onDeleteStudy(study.id)}
                        aria-label={`Delete ${study.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          ) : (
            <div className="empty-bank">
              <Bookmark size={24} />
              <strong>No saved studies match.</strong>
              <span>Use the analysis board to save positions, games and ideas.</span>
            </div>
          )}
        </section>
      ) : tab === "references" ? (
        <section className="library-collection">
          <div className="collection-toolbar">
            <div>
              <p className="eyebrow">REFERENCE COLLECTION</p>
              <h2>Small, useful positions—not a content warehouse.</h2>
            </div>
          </div>
          <div className="reference-grid">
            {referenceStudies.map((reference) => (
              <button
                type="button"
                key={reference.id}
                className="reference-card"
                onClick={() => openReference(reference)}
              >
                <div className="reference-icon">
                  {reference.kind === "game" ? <Gamepad2 size={20} /> : <BookOpenCheck size={20} />}
                </div>
                <span>{studyKindLabel(reference.kind)}</span>
                <strong>{reference.title}</strong>
                <p>{reference.description}</p>
                <div>
                  {reference.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}
                </div>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="library-collection">
          <div className="collection-toolbar">
            <div>
              <p className="eyebrow">MY GAMES</p>
              <h2>Every played or imported game is study material.</h2>
            </div>
          </div>
          {games.length ? (
            <div className="library-games">
              {[...games].reverse().map((game) => (
                <button
                  type="button"
                  key={game.id}
                  onClick={() => openGame(game)}
                >
                  <div>
                    <strong>{game.white} — {game.black}</strong>
                    <span>{game.result} · {Math.ceil(game.moves.length / 2)} moves</span>
                  </div>
                  <div>
                    <span>{game.reviewStory?.verdict ?? (game.analyzedAt ? "analyzed" : "saved")}</span>
                    <strong>{game.reviewStory?.moments.length ?? game.criticalMomentIds.length} moments</strong>
                  </div>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-bank">
              <Gamepad2 size={24} />
              <strong>No games yet.</strong>
              <span>Games from Play and Review will appear here automatically.</span>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
