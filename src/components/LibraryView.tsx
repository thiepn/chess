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
import { useEffect, useMemo, useRef, useState } from "react";
import { skills } from "../domain/curriculum";
import { StockfishBrowserEngine } from "../engine/stockfish";
import type { EngineEvaluation, ImportedGame } from "../games/types";
import {
  libraryCollectionPath,
  libraryGamePath,
  libraryReferencePath,
  libraryStudyPath,
  resolveLibraryRoute,
  type LibraryCollection,
} from "../library/libraryRoutes";
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
import "../styles/library-v2.css";

interface LibraryViewProps {
  studies: SavedStudy[];
  games: ImportedGame[];
  routePath: string;
  onNavigate: (path: string) => void;
  onSaveStudy: (study: SavedStudy) => void;
  onDeleteStudy: (studyId: string) => void;
  onToggleFavorite: (studyId: string) => void;
  onTrainStudy: (studyId: string) => void;
}

interface WorkspaceOptions {
  title?: string;
  notes?: string;
  tags?: string[];
  kind?: StudyKind;
  studyId?: string;
  source?: SavedStudy["source"];
  sourceId?: string;
  orientation?: Color;
  engine?: SavedStudy["engine"];
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
  return [
    {
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      tone: "good",
    },
  ];
}

function newStudyId() {
  return `study-${Date.now().toString(36)}`;
}

function collectionLabel(collection: LibraryCollection) {
  if (collection === "studies") return "Saved studies";
  if (collection === "positions") return "Positions";
  if (collection === "endgames") return "Endgames";
  return "My games";
}

function collectionDescription(collection: LibraryCollection) {
  if (collection === "studies") {
    return "Your own positions, games and ideas worth returning to.";
  }
  if (collection === "positions") {
    return "Tactical, strategic and reference positions for deliberate study.";
  }
  if (collection === "endgames") {
    return "Saved and reference endings for technique, recall and conversion.";
  }
  return "Played and imported games available as study material.";
}

function isDue(study: SavedStudy) {
  return Boolean(
    study.training &&
      new Date(study.training.nextReviewAt).getTime() <= Date.now(),
  );
}

export function LibraryView({
  studies,
  games,
  routePath,
  onNavigate,
  onSaveStudy,
  onDeleteStudy,
  onToggleFavorite,
  onTrainStudy,
}: LibraryViewProps) {
  const route = resolveLibraryRoute(routePath);
  const hydratedPath = useRef<string | null>(null);

  const [line, setLine] = useState<WorkspaceLine>(() =>
    loadFenLine(standardFen, "w"),
  );
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
  const [trainingSkillId, setTrainingSkillId] = useState(
    "calculation.candidates",
  );
  const [query, setQuery] = useState("");

  const currentFen = fenAtCursor(line, cursor);
  const currentPgn = useMemo(
    () => lineToPgn({ ...line, moves: line.moves.slice(0, cursor) }),
    [cursor, line],
  );
  const pvSan = useMemo(
    () => (evaluation ? pvToSan(currentFen, evaluation.pv.slice(0, 6)) : []),
    [currentFen, evaluation],
  );

  const dueStudies = useMemo(() => dueStudyTraining(studies), [studies]);
  const favoriteCount = studies.filter((study) => study.favorite).length;

  const sortedStudies = useMemo(
    () =>
      [...studies].sort(
        (a, b) =>
          Number(b.favorite) - Number(a.favorite) ||
          b.updatedAt.localeCompare(a.updatedAt),
      ),
    [studies],
  );

  const filteredStudies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sortedStudies;

    return sortedStudies.filter((study) =>
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
  }, [query, sortedStudies]);

  const positionStudies = useMemo(
    () =>
      filteredStudies.filter((study) =>
        ["position", "tactic", "opening", "reference"].includes(study.kind),
      ),
    [filteredStudies],
  );

  const endgameStudies = useMemo(
    () => filteredStudies.filter((study) => study.kind === "endgame"),
    [filteredStudies],
  );

  const endgameReferences = referenceStudies.filter(
    (reference) => reference.kind === "endgame",
  );
  const positionReferences = referenceStudies.filter(
    (reference) => reference.kind !== "endgame",
  );

  function resetWorkspace(
    next: WorkspaceLine,
    options: WorkspaceOptions = {},
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
  }

  function loadSavedStudy(study: SavedStudy) {
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
  }

  function loadReference(reference: ReferenceStudy) {
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
  }

  function loadGame(game: ImportedGame) {
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
  }

  useEffect(() => {
    if (route.mode !== "workspace") return;
    if (hydratedPath.current === routePath) return;
    hydratedPath.current = routePath;

    try {
      if (!route.resourceKind) {
        resetWorkspace(loadFenLine(standardFen, "w"), {
          title: "Untitled study",
          kind: "position",
          orientation: "w",
          source: "personal",
        });
        return;
      }

      if (route.resourceKind === "study") {
        const study = studies.find((item) => item.id === route.resourceId);
        if (!study) throw new Error("This saved study is no longer available.");
        loadSavedStudy(study);
        return;
      }

      if (route.resourceKind === "reference") {
        const reference = referenceStudies.find(
          (item) => item.id === route.resourceId,
        );
        if (!reference) throw new Error("This reference is no longer available.");
        loadReference(reference);
        return;
      }

      const game = games.find((item) => item.id === route.resourceId);
      if (!game) throw new Error("This game is no longer available.");
      loadGame(game);
    } catch (cause) {
      setLoadError(
        cause instanceof Error
          ? cause.message
          : "This library item could not be loaded.",
      );
    }
  }, [games, route.mode, route.resourceId, route.resourceKind, routePath, studies]);

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
        cause instanceof Error
          ? cause.message
          : "The position could not be analyzed.",
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

    if (
      training &&
      (!evaluation?.bestMove ||
        evaluation.bestMove === "(none)" ||
        !bestSan)
    ) {
      setLoadError(
        "Analyze the position first so there is a concrete move to remember.",
      );
      return null;
    }

    const existing = loadedStudyId
      ? studies.find((study) => study.id === loadedStudyId)
      : undefined;
    const samePosition = existing?.fen === currentFen;
    const parsedTags = [
      ...new Set(
        tags
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];

    return {
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
  }

  function saveStudy(training = false) {
    const study = buildStudy(training);
    if (!study) return;

    onSaveStudy(study);
    setLoadedStudyId(study.id);
    setLoadError(null);

    if (routePath === "/library/workspace") {
      onNavigate(libraryStudyPath(study.id));
    }
  }

  function openStudy(study: SavedStudy) {
    onNavigate(libraryStudyPath(study.id));
  }

  function openReference(reference: ReferenceStudy) {
    onNavigate(libraryReferencePath(reference.id));
  }

  function openGame(game: ImportedGame) {
    onNavigate(libraryGamePath(game.id));
  }

  const engineArrow = evaluation ? uciArrow(evaluation.bestMove) : [];

  function archiveRail(active?: LibraryCollection | "index") {
    const items: Array<{
      id: LibraryCollection;
      label: string;
      count: number;
    }> = [
      { id: "studies", label: "Studies", count: studies.length },
      {
        id: "positions",
        label: "Positions",
        count: positionStudies.length + positionReferences.length,
      },
      {
        id: "endgames",
        label: "Endgames",
        count: endgameStudies.length + endgameReferences.length,
      },
      { id: "games", label: "Games", count: games.length },
    ];

    return (
      <aside className="library-v2-rail" aria-label="Library collections">
        <button
          type="button"
          className={active === "index" ? "active library-v2-root" : "library-v2-root"}
          onClick={() => onNavigate("/library")}
        >
          <Library size={16} />
          <span>
            <strong>Library</strong>
            <small>Study archive</small>
          </span>
        </button>

        <nav>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={active === item.id ? "active" : ""}
              aria-current={active === item.id ? "page" : undefined}
              onClick={() => onNavigate(libraryCollectionPath(item.id))}
            >
              <span>{item.label}</span>
              <small>{item.count}</small>
            </button>
          ))}
        </nav>

        <div className="library-v2-system-links">
          <button type="button" onClick={() => onNavigate("/learn/openings")}>
            <BookOpenCheck size={14} />
            Repertoire
          </button>
          <button type="button" onClick={() => onNavigate("/learn/model-games")}>
            <Gamepad2 size={14} />
            Model games
          </button>
        </div>

        <button
          type="button"
          className="library-v2-new-study"
          onClick={() => onNavigate("/library/workspace")}
        >
          <BrainCircuit size={14} />
          Analysis board
        </button>
      </aside>
    );
  }

  function renderStudyRow(study: SavedStudy) {
    return (
      <article className="library-v2-row" key={study.id}>
        <button
          type="button"
          className="library-v2-row-main"
          onClick={() => openStudy(study)}
        >
          <span className="library-v2-kind">{studyKindLabel(study.kind)}</span>
          <span className="library-v2-row-copy">
            <strong>{study.title}</strong>
            <small>{study.notes || "No notes yet."}</small>
          </span>
          <span className="library-v2-row-meta">
            {study.favorite && <Heart size={12} />}
            {isDue(study)
              ? "Due"
              : study.training
                ? `streak ${study.training.streak}`
                : "Study"}
          </span>
          <ChevronRight size={14} />
        </button>

        <div className="library-v2-row-actions">
          <button
            type="button"
            className={study.favorite ? "favorite active" : "favorite"}
            onClick={() => onToggleFavorite(study.id)}
            aria-label={study.favorite ? "Remove favorite" : "Add favorite"}
          >
            <Heart size={14} />
          </button>
          {study.training && (
            <button type="button" onClick={() => onTrainStudy(study.id)}>
              <Target size={14} />
              Train
            </button>
          )}
          <button
            type="button"
            className="danger"
            onClick={() => onDeleteStudy(study.id)}
            aria-label={`Delete ${study.title}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </article>
    );
  }

  function renderReferenceRow(reference: ReferenceStudy) {
    return (
      <button
        key={reference.id}
        type="button"
        className="library-v2-reference-row"
        onClick={() => openReference(reference)}
      >
        <span className="library-v2-reference-icon">
          {reference.kind === "game" ? (
            <Gamepad2 size={16} />
          ) : (
            <BookOpenCheck size={16} />
          )}
        </span>
        <span>
          <small>{studyKindLabel(reference.kind)}</small>
          <strong>{reference.title}</strong>
          <em>{reference.description}</em>
        </span>
        <ChevronRight size={15} />
      </button>
    );
  }

  function renderGameRow(game: ImportedGame) {
    return (
      <button
        key={game.id}
        type="button"
        className="library-v2-game-row"
        onClick={() => openGame(game)}
      >
        <span className="library-v2-result">{game.result}</span>
        <span>
          <strong>{game.white} — {game.black}</strong>
          <small>
            {Math.ceil(game.moves.length / 2)} moves
            {game.openingName ? ` · ${game.openingName}` : ""}
          </small>
        </span>
        <span>
          <small>{game.reviewStory?.verdict ?? (game.analyzedAt ? "analyzed" : "saved")}</small>
          <strong>
            {game.reviewStory?.moments.length ?? game.criticalMomentIds.length} moments
          </strong>
        </span>
        <ChevronRight size={15} />
      </button>
    );
  }

  if (route.mode === "workspace") {
    return (
      <section className="library-workspace-v2" aria-labelledby="library-workspace-title">
        <header className="library-workspace-head">
          <button
            className="library-v2-back"
            type="button"
            onClick={() => {
              if (route.resourceKind === "game") {
                onNavigate("/library/games");
              } else if (kind === "endgame") {
                onNavigate("/library/endgames");
              } else {
                onNavigate("/library/studies");
              }
            }}
          >
            <ChevronLeft size={15} />
            Library
          </button>

          <div>
            <span>{studyKindLabel(kind)}</span>
            <strong id="library-workspace-title">{title}</strong>
          </div>

          <div className="library-workspace-status">
            {loadedStudyId ? (
              <span>Saved study</span>
            ) : source === "reference" ? (
              <span>Reference</span>
            ) : source === "game" ? (
              <span>Game source</span>
            ) : (
              <span>Unsaved</span>
            )}
          </div>
        </header>

        <div className="library-analysis-v2">
          <div className="library-board-v2">
            <div className="workspace-toolbar">
              <button
                type="button"
                onClick={() => onNavigate("/library/workspace")}
              >
                <Sparkles size={15} />
                New
              </button>
              <button
                type="button"
                disabled={cursor <= 0}
                onClick={() => {
                  setCursor((value) => Math.max(0, value - 1));
                  setEvaluation(null);
                }}
                aria-label="Previous move"
              >
                <Undo2 size={16} />
              </button>
              <button
                type="button"
                disabled={cursor >= line.moves.length}
                onClick={() => {
                  setCursor((value) =>
                    Math.min(line.moves.length, value + 1),
                  );
                  setEvaluation(null);
                }}
                aria-label="Next move"
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
                <RotateCcw size={15} />
                Start
              </button>
              <button
                type="button"
                onClick={() =>
                  setOrientation((value) => (value === "w" ? "b" : "w"))
                }
              >
                <FlipHorizontal2 size={15} />
                Flip
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
                  <small>
                    {move.moveNumber}
                    {move.color === "b" ? "…" : "."}
                  </small>
                  {move.san}
                </button>
              ))}
            </div>
          </div>

          <aside className="library-workspace-controls">
            <section className="library-engine-v2">
              <header>
                <div>
                  <BrainCircuit size={16} />
                  <span>Stockfish</span>
                </div>
                <button
                  type="button"
                  disabled={evaluating}
                  onClick={() => void analyzePosition()}
                >
                  {evaluating ? (
                    <LoaderCircle className="spin" size={14} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {evaluating ? "Analyzing" : "Analyze"}
                </button>
              </header>

              {evaluation ? (
                <div className="library-engine-result">
                  <div>
                    <span>Eval</span>
                    <strong>{evalLabel(evaluation.scoreCp)}</strong>
                  </div>
                  <div>
                    <span>Best</span>
                    <strong>{pvSan[0] ?? evaluation.bestMove}</strong>
                  </div>
                  <p>{pvSan.join(" ") || evaluation.pv.slice(0, 6).join(" ")}</p>
                </div>
              ) : (
                <p className="library-engine-empty">
                  Engine output stays hidden until requested.
                </p>
              )}
            </section>

            <section className="library-study-editor-v2">
              <label>
                <span>Title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label>
                <span>Kind</span>
                <select
                  value={kind}
                  onChange={(event) =>
                    setKind(event.target.value as StudyKind)
                  }
                >
                  {([
                    "position",
                    "game",
                    "opening",
                    "endgame",
                    "tactic",
                    "reference",
                  ] as StudyKind[]).map((item) => (
                    <option key={item} value={item}>
                      {studyKindLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                <span>Notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Why is this worth keeping?"
                />
              </label>
              <label className="wide">
                <span>Tags</span>
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="calculation, rook ending, repertoire…"
                />
              </label>
            </section>

            <details className="library-import-v2">
              <summary>Load FEN / PGN</summary>
              <div>
                <label>
                  <span>FEN</span>
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
                </label>

                <label>
                  <span>PGN</span>
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
                        setLoadError(
                          "Enter a PGN containing at least one legal move.",
                        );
                      }
                    }}
                  >
                    Load game
                  </button>
                </label>
              </div>
            </details>

            <section className="library-training-v2">
              <div>
                <Target size={15} />
                <span>
                  <strong>Recall training</strong>
                  <small>
                    Save the engine best move as a position to remember.
                  </small>
                </span>
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
            </section>

            {loadError && (
              <div className="analysis-error">
                <strong>Workspace issue</strong>
                <span>{loadError}</span>
              </div>
            )}

            <div className="library-workspace-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => saveStudy(false)}
              >
                <Save size={15} />
                Save
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => saveStudy(true)}
              >
                <Target size={15} />
                Save + train
              </button>
              {loadedStudyId && (
                <button
                  type="button"
                  className="library-train-now"
                  onClick={() => onTrainStudy(loadedStudyId)}
                  disabled={!studies.find((study) => study.id === loadedStudyId)?.training}
                >
                  Train now
                </button>
              )}
            </div>
          </aside>
        </div>
      </section>
    );
  }

  if (route.mode === "collection" && route.collection) {
    const collection = route.collection;

    const studiesForCollection =
      collection === "studies"
        ? filteredStudies
        : collection === "positions"
          ? positionStudies
          : collection === "endgames"
            ? endgameStudies
            : [];

    const referencesForCollection =
      collection === "positions"
        ? positionReferences
        : collection === "endgames"
          ? endgameReferences
          : [];

    return (
      <section className="library-v2">
        {archiveRail(collection)}

        <main className="library-v2-collection">
          <header className="library-v2-collection-head">
            <div>
              <p className="eyebrow">{collectionLabel(collection).toUpperCase()}</p>
              <h1>{collectionLabel(collection)}</h1>
              <p>{collectionDescription(collection)}</p>
            </div>

            {collection !== "games" && (
              <label className="library-v2-search">
                <Search size={14} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search library…"
                />
              </label>
            )}
          </header>

          {collection === "games" ? (
            <div className="library-v2-game-list">
              {games.length ? (
                [...games]
                  .sort((a, b) => b.importedAt.localeCompare(a.importedAt))
                  .map(renderGameRow)
              ) : (
                <div className="library-v2-empty">
                  <Gamepad2 size={20} />
                  <strong>No games yet.</strong>
                  <span>Games from Play and Review appear here automatically.</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="library-v2-list">
                {studiesForCollection.length ? (
                  studiesForCollection.map(renderStudyRow)
                ) : (
                  <div className="library-v2-empty">
                    <Bookmark size={20} />
                    <strong>No saved items here yet.</strong>
                    <span>Use the analysis board to keep a position or game.</span>
                  </div>
                )}
              </div>

              {referencesForCollection.length > 0 && (
                <section className="library-v2-reference-section">
                  <header>
                    <span>Reference shelf</span>
                    <strong>{referencesForCollection.length}</strong>
                  </header>
                  <div>{referencesForCollection.map(renderReferenceRow)}</div>
                </section>
              )}
            </>
          )}
        </main>
      </section>
    );
  }

  const recentStudies = sortedStudies.slice(0, 5);
  const recentGames = [...games]
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt))
    .slice(0, 4);

  return (
    <section className="library-v2">
      {archiveRail("index")}

      <main className="library-v2-index" aria-labelledby="library-index-title">
        <header className="library-v2-index-head">
          <div>
            <p className="eyebrow">ARCHIVE</p>
            <h1 id="library-index-title">Library</h1>
          </div>
          <button type="button" onClick={() => onNavigate("/library/workspace")}>
            <BrainCircuit size={15} />
            New study
          </button>
        </header>

        <section className="library-v2-shelf" aria-labelledby="recent-studies-title">
          <header>
            <div>
              <span>Personal studies</span>
              <strong id="recent-studies-title">Recent</strong>
            </div>
            <button type="button" onClick={() => onNavigate("/library/studies")}>
              View all
            </button>
          </header>

          <div className="library-v2-list">
            {recentStudies.length ? (
              recentStudies.map(renderStudyRow)
            ) : (
              <div className="library-v2-empty">
                <Bookmark size={20} />
                <strong>No studies yet.</strong>
                <span>Open the analysis board and save a useful position.</span>
              </div>
            )}
          </div>
        </section>

        <section className="library-v2-index-grid">
          <button
            type="button"
            className="library-v2-index-cell"
            onClick={() => onNavigate("/library/positions")}
          >
            <span>Positions</span>
            <strong>{positionStudies.length + positionReferences.length}</strong>
            <small>Tactics, openings and references</small>
            <ChevronRight size={15} />
          </button>

          <button
            type="button"
            className="library-v2-index-cell"
            onClick={() => onNavigate("/library/endgames")}
          >
            <span>Endgames</span>
            <strong>{endgameStudies.length + endgameReferences.length}</strong>
            <small>Technique and conversion</small>
            <ChevronRight size={15} />
          </button>

          <button
            type="button"
            className="library-v2-index-cell"
            onClick={() => onNavigate("/learn/openings")}
          >
            <span>Repertoire</span>
            <strong>Open</strong>
            <small>Your opening systems</small>
            <ChevronRight size={15} />
          </button>

          <button
            type="button"
            className="library-v2-index-cell"
            onClick={() => onNavigate("/learn/model-games")}
          >
            <span>Model games</span>
            <strong>Study</strong>
            <small>Plans in complete games</small>
            <ChevronRight size={15} />
          </button>
        </section>

        <section className="library-v2-shelf" aria-labelledby="recent-games-title">
          <header>
            <div>
              <span>Played archive</span>
              <strong id="recent-games-title">Recent games</strong>
            </div>
            <button type="button" onClick={() => onNavigate("/library/games")}>
              View all
            </button>
          </header>

          <div className="library-v2-game-list">
            {recentGames.length ? (
              recentGames.map(renderGameRow)
            ) : (
              <div className="library-v2-empty">
                <Gamepad2 size={20} />
                <strong>No games yet.</strong>
                <span>Play or import a game to add it to the archive.</span>
              </div>
            )}
          </div>
        </section>
      </main>

      <aside className="library-v2-context">
        <section>
          <header>
            <Target size={15} />
            <span>Recall queue</span>
          </header>
          <strong>{dueStudies.length}</strong>
          <p>
            {dueStudies.length
              ? "Saved positions currently due for active recall."
              : "Nothing from your library is due right now."}
          </p>
          {dueStudies.slice(0, 3).map((study) => (
            <button
              key={study.id}
              type="button"
              onClick={() => onTrainStudy(study.id)}
            >
              <span>{studyKindLabel(study.kind)}</span>
              <strong>{study.title}</strong>
            </button>
          ))}
        </section>

        <section>
          <header>
            <Heart size={15} />
            <span>Favorites</span>
          </header>
          <strong>{favoriteCount}</strong>
          <p>Quick references you marked as worth returning to.</p>
        </section>

        <section className="library-v2-reference-peek">
          <header>
            <BookOpenCheck size={15} />
            <span>Reference shelf</span>
          </header>
          {referenceStudies.slice(0, 3).map((reference) => (
            <button
              key={reference.id}
              type="button"
              onClick={() => openReference(reference)}
            >
              <span>{studyKindLabel(reference.kind)}</span>
              <strong>{reference.title}</strong>
            </button>
          ))}
        </section>
      </aside>
    </section>
  );
}
