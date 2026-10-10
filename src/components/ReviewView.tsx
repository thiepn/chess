import { lazy, useEffect, useMemo, useRef, useState } from "react";
import { nextVisibleCount, HISTORY_PAGE_SIZE } from "../routing/pageWindow";
import "../styles/review-v2.css";
import "../styles/p47-review-native.css";
import "../styles/p51-review-large.css";
import {
  ChevronRight,
  FileUp,
  Link2,
  LoaderCircle,
  RotateCcw,
  Swords,
  Target,
  Upload,
} from "lucide-react";
import { StockfishBrowserEngine } from "../engine/stockfish";
import { analyzeImportedGame } from "../games/analyze";
import { importPgn, playerMoveCount } from "../games/import";
import { fetchLichessPgn } from "../games/lichess";
import type {
  GameAnalysisProgress,
  GameReviewReflection,
  ImportedGame,
  PersonalMistake,
} from "../games/types";
import type { LichessConnection } from "../lichess/types";
import type { OpeningDeviation } from "../openings/types";
import { resolveReviewRoute, reviewGamePath } from "../review/reviewRoutes";
const GameStoryView = lazy(() =>
  import("./GameStoryView").then((module) => ({ default: module.GameStoryView })),
);
import { ChessBoard } from "./ChessBoard";
import { LichessSyncCard } from "./LichessSyncCard";

interface ReviewViewProps {
  games: ImportedGame[];
  mistakes: PersonalMistake[];
  routePath: string;
  onNavigate: (path: string) => void;
  lichess?: LichessConnection;
  lichessSyncing: boolean;
  lichessSyncMessage?: string | null;
  lichessSyncError?: string | null;
  onLinkLichess: (username: string) => Promise<void> | void;
  onUnlinkLichess: () => void;
  onSyncLichess: () => Promise<void> | void;
  onAnalyzed: (game: ImportedGame, mistakes: PersonalMistake[]) => void;
  onTrainMistake: (mistakeId: string) => void;
  onReplayMistake: (mistakeId: string) => void;
  reflections: Record<string, GameReviewReflection>;
  openingDeviations: OpeningDeviation[];
  onUpdateReflection: (reflection: GameReviewReflection) => void;
  onRetainLesson: (gameId: string, momentId: string) => void;
  onPracticeSkill: (skillId: string) => void;
  onPracticeOpening: (repertoireId: string, nodeId: string) => void;
  onContinueTraining: (skillId?: string) => void;
  onPlayAgain: () => void;
}

function severityLabel(value: PersonalMistake["severity"]) {
  if (value === "blunder") return "Blunder";
  if (value === "mistake") return "Mistake";
  return "Inaccuracy";
}

export function ReviewView({
  games,
  mistakes,
  routePath,
  onNavigate,
  lichess,
  lichessSyncing,
  lichessSyncMessage,
  lichessSyncError,
  onLinkLichess,
  onUnlinkLichess,
  onSyncLichess,
  onAnalyzed,
  onTrainMistake,
  onReplayMistake,
  reflections,
  openingDeviations,
  onUpdateReflection,
  onRetainLesson,
  onPracticeSkill,
  onPracticeOpening,
  onContinueTraining,
  onPlayAgain,
}: ReviewViewProps) {
  const [pgn, setPgn] = useState("");
  const [lichessUrl, setLichessUrl] = useState("");
  const [fetchingLichess, setFetchingLichess] = useState(false);
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [progress, setProgress] = useState<GameAnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [reanalyzingGameId, setReanalyzingGameId] = useState<string | null>(null);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [visibleGames, setVisibleGames] = useState(HISTORY_PAGE_SIZE);
  useEffect(() => setVisibleGames(HISTORY_PAGE_SIZE), [games.length]);

  const route = resolveReviewRoute(routePath);
  const selectedGame = route.gameId
    ? games.find((game) => game.id === route.gameId)
    : undefined;

  const unresolved = useMemo(
    () =>
      mistakes
        .filter((mistake) => !mistake.resolved)
        .sort((a, b) => {
          const severity = { blunder: 3, mistake: 2, inaccuracy: 1 };
          return (
            severity[b.severity] - severity[a.severity] ||
            b.centipawnLoss - a.centipawnLoss
          );
        }),
    [mistakes],
  );

  const sortedGames = useMemo(
    () => [...games].sort((a, b) => b.importedAt.localeCompare(a.importedAt)),
    [games],
  );
  const latestAnalyzedGame = sortedGames.find((game) => game.reviewStory);
  const nextUnanalyzedGame = sortedGames.find((game) => !game.reviewStory);
  const featuredMoment = latestAnalyzedGame?.reviewStory?.moments[0];
  const featuredFen = latestAnalyzedGame
    ? featuredMoment?.positionFen ??
      latestAnalyzedGame.moves[latestAnalyzedGame.moves.length - 1]?.afterFen ??
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    : null;

  async function analyze() {
    if (!pgn.trim() || analyzing || batchAnalyzing) return;

    let engine: StockfishBrowserEngine | null = null;
    setError(null);
    setAnalyzing(true);

    try {
      const game = importPgn(
        pgn,
        playerColor,
        new Date().toISOString(),
        { source: "manual" },
      );
      setProgress({
        completed: 0,
        total: playerMoveCount(game),
        phase: "loading-engine",
      });

      engine = await StockfishBrowserEngine.create();
      const result = await analyzeImportedGame(game, engine, {
        depth: 11,
        onProgress: setProgress,
      });

      onAnalyzed(result.game, result.mistakes);
      setPgn("");
      onNavigate(reviewGamePath(result.game.id));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The game could not be imported or analyzed.",
      );
    } finally {
      engine?.quit();
      setAnalyzing(false);
    }
  }

  async function reanalyzeStoredGame(game: ImportedGame) {
    if (analyzing || batchAnalyzing) return;

    let engine: StockfishBrowserEngine | null = null;
    setError(null);
    setAnalyzing(true);
    setReanalyzingGameId(game.id);
    setProgress({
      completed: 0,
      total: playerMoveCount(game),
      phase: "loading-engine",
    });

    try {
      engine = await StockfishBrowserEngine.create();
      const result = await analyzeImportedGame(game, engine, {
        depth: 11,
        onProgress: setProgress,
      });
      onAnalyzed(result.game, result.mistakes);
      onNavigate(reviewGamePath(result.game.id));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The stored game could not be upgraded to a visual review.",
      );
    } finally {
      engine?.quit();
      setAnalyzing(false);
      setReanalyzingGameId(null);
    }
  }

  async function analyzeSyncedGames() {
    if (analyzing || batchAnalyzing) return;

    const pending = sortedGames
      .filter((game) => game.source === "lichess" && !game.analyzedAt)
      .slice(0, 5);

    if (!pending.length) {
      setBatchStatus("All synced Lichess games are already analyzed.");
      return;
    }

    let engine: StockfishBrowserEngine | null = null;
    setError(null);
    setBatchAnalyzing(true);

    try {
      engine = await StockfishBrowserEngine.create();

      for (let index = 0; index < pending.length; index += 1) {
        const game = pending[index];
        setBatchStatus(
          `Analyzing human game ${index + 1}/${pending.length}: ${game.white} — ${game.black}`,
        );
        setProgress({
          completed: 0,
          total: playerMoveCount(game),
          phase: "analyzing",
        });

        const result = await analyzeImportedGame(game, engine, {
          depth: 10,
          onProgress: setProgress,
        });
        onAnalyzed(result.game, result.mistakes);
      }

      setBatchStatus(
        `Analyzed ${pending.length} synced human game${pending.length === 1 ? "" : "s"}.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Synced games could not be analyzed.",
      );
    } finally {
      engine?.quit();
      setBatchAnalyzing(false);
      setProgress(null);
    }
  }

  if (route.mode === "game") {
    if (!selectedGame) {
      return (
        <section className="review-v2-recovery">
          <strong>Game not found</strong>
          <p>This review is no longer available in local history.</p>
          <button className="secondary" type="button" onClick={() => onNavigate("/review")}>
            Back to Review
          </button>
        </section>
      );
    }

    if (!selectedGame.reviewStory) {
      return (
        <section className="review-v2-upgrade">
          <button className="review-v2-back" type="button" onClick={() => onNavigate("/review")}>
            ← Review
          </button>
          <div>
            <p className="eyebrow">ANALYSIS REQUIRED</p>
            <h1>{selectedGame.white} — {selectedGame.black}</h1>
            <p>
              This game is saved, but it does not yet have the structured visual review.
            </p>
            <button
              className="primary"
              type="button"
              disabled={reanalyzingGameId === selectedGame.id}
              onClick={() => void reanalyzeStoredGame(selectedGame)}
            >
              {reanalyzingGameId === selectedGame.id ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Target size={16} />
              )}
              Analyze game
            </button>
            {error && <p className="review-v2-analysis-error" role="alert">{error} Your game is still saved. Retry analysis when the engine is available.</p>}
          </div>
        </section>
      );
    }

    return (
      <GameStoryView
        game={selectedGame}
        mistakes={mistakes.filter((mistake) => mistake.gameId === selectedGame.id)}
        onBack={() => onNavigate("/review")}
        onTrainMistake={onTrainMistake}
        onReplayMistake={onReplayMistake}
        reflections={reflections}
        openingDeviations={openingDeviations.filter(
          (deviation) => deviation.gameId === selectedGame.id,
        )}
        onUpdateReflection={onUpdateReflection}
        onRetainLesson={onRetainLesson}
        onPracticeSkill={onPracticeSkill}
        onPracticeOpening={onPracticeOpening}
        onContinueTraining={onContinueTraining}
        onPlayAgain={onPlayAgain}
      />
    );
  }

  return (
    <section className="review-v2" aria-labelledby="review-title">
      <aside className="review-v2-history" aria-label="Game history">
        <div className="review-v2-history-head">
          <div>
            <span>Review</span>
            <strong id="review-title">Games</strong>
          </div>
          <small>{games.length}</small>
        </div>

        <div className="review-v2-game-list">
          {sortedGames.length ? (
            sortedGames.slice(0, visibleGames).map((game) => (
              <button
                key={game.id}
                type="button"
                onPointerEnter={() => {
                  if (game.reviewStory) void import("./GameStoryView");
                }}
                onFocus={() => {
                  if (game.reviewStory) void import("./GameStoryView");
                }}
                onClick={() =>
                  game.reviewStory
                    ? onNavigate(reviewGamePath(game.id))
                    : void reanalyzeStoredGame(game)
                }
                disabled={reanalyzingGameId === game.id}
              >
                <span className="review-v2-result">{game.result}</span>
                <span className="review-v2-game-copy">
                  <strong>{game.white} — {game.black}</strong>
                  <small>
                    {game.openingName ?? game.event ?? "Chess game"}
                    {game.source === "lichess" ? " · Lichess" : ""}
                  </small>
                </span>
                <span className="review-v2-game-state">
                  {reanalyzingGameId === game.id
                    ? "Analyzing"
                    : game.reviewStory
                      ? `${game.reviewStory.moments.length} moments`
                      : "Analyze"}
                </span>
              </button>
            ))
          ) : (
            <div className="review-v2-empty-list">
              <Swords size={18} />
              <span>No games yet.</span>
            </div>
          )}
        </div>
        {sortedGames.length > visibleGames && (
          <button
            type="button"
            className="secondary"
            onClick={() => setVisibleGames((count) => nextVisibleCount(sortedGames.length, count))}
          >
            Show more games ({sortedGames.length - visibleGames} remaining)
          </button>
        )}
      </aside>

      <main className="review-v2-main">
        <header className="review-v2-main-head">
          <div>
            <p className="eyebrow">ANALYSIS DESK</p>
            <h1>{latestAnalyzedGame ? "Game review" : "Import a game"}</h1>
            <p>
              {latestAnalyzedGame
                ? "Return to your last analyzed game, study its turning points, or import another."
                : "Analyze the game, inspect critical moments, and save positions you want to practice."}
            </p>
          </div>
          <div className="review-v2-summary">
            <span>
              <strong>{games.filter((game) => game.analyzedAt).length}</strong>
              analyzed
            </span>
            <span>
              <strong>{unresolved.length}</strong>
              to revisit
            </span>
          </div>
        </header>

        {!latestAnalyzedGame && (
          <section className="review-v2-first-step" aria-label="Start learning from a game">
            {nextUnanalyzedGame ? (
              <>
                <p className="eyebrow">CONTINUE YOUR GAME</p>
                <h2>Your saved game is ready to study</h2>
                <p>
                  {nextUnanalyzedGame.white} — {nextUnanalyzedGame.black}. Your moves are preserved.
                  Analyze them to find a useful position to practice.
                </p>
                <button type="button" className="primary"
                  disabled={analyzing || batchAnalyzing}
                  onClick={() => onNavigate(reviewGamePath(nextUnanalyzedGame.id))}>
                  <Target size={16} /> Review saved game
                </button>
                <button type="button" className="secondary" onClick={onPlayAgain}>
                  <Swords size={16} /> Play another game
                </button>
              </>
            ) : (
              <>
                <p className="eyebrow">YOUR FIRST REVIEW</p>
                <h2>Learn from your own moves</h2>
                <p>Play a game against the computer, then come back to review key decisions.
                   Or start with a short lesson. You can also import a game below.</p>
                <button type="button" className="primary" onClick={onPlayAgain}>
                  <Swords size={16} /> Play a game
                </button>
                <button type="button" className="secondary" onClick={() => onContinueTraining()}>
                  <Target size={16} /> Start training
                </button>
              </>
            )}
          </section>
        )}

        {latestAnalyzedGame?.reviewStory && featuredFen && (
          <section className="review-v2-feature" aria-labelledby="review-feature-title">
            <div className="review-v2-feature-board" aria-label="Position from last analyzed game">
              <ChessBoard fen={featuredFen} disabled />
              <span>
                {featuredMoment
                  ? `Critical position · move ${featuredMoment.moveNumber}`
                  : "Analyzed game · final position"}
              </span>
            </div>
            <div className="review-v2-feature-detail">
              <p className="eyebrow">CONTINUE REVIEWING</p>
              <h2 id="review-feature-title">
                {latestAnalyzedGame.white} — {latestAnalyzedGame.black}
              </h2>
              <p className="review-v2-feature-opening">
                {latestAnalyzedGame.openingName ?? latestAnalyzedGame.event ?? "Chess game"}
              </p>
              <div className="review-v2-feature-insight">
                <span>{latestAnalyzedGame.reviewStory.moments.length} key moments</span>
                <strong>{featuredMoment?.title ?? latestAnalyzedGame.reviewStory.headline}</strong>
                <p>{featuredMoment?.summary ?? latestAnalyzedGame.reviewStory.summary}</p>
              </div>
              <button
                className="primary review-v2-feature-action"
                type="button"
                onPointerEnter={() => { void import("./GameStoryView"); }}
                onFocus={() => { void import("./GameStoryView"); }}
                onClick={() => onNavigate(reviewGamePath(latestAnalyzedGame.id))}
              >
                Open game review
                <ChevronRight size={16} />
              </button>
            </div>
          </section>
        )}

        <details
          key={latestAnalyzedGame ? "review-with-games" : "review-empty"}
          className="review-v2-import-drawer"
          // Keep the import form immediately usable for first-time users.
          // A saved analyzed game makes this secondary, not unavailable.
          open={!latestAnalyzedGame}
        >
          <summary>
            <span>{latestAnalyzedGame ? "Import another game" : "Import a game"}</span>
            <span>{latestAnalyzedGame ? "PGN · Lichess · File" : "Start an analysis"}</span>
          </summary>
        <section className="review-v2-import">
          <div className="review-v2-import-source">
            <label htmlFor="review-lichess-url">Lichess game</label>
            <div>
              <input
                id="review-lichess-url"
                value={lichessUrl}
                onChange={(event) => setLichessUrl(event.target.value)}
                placeholder="Game URL or ID"
                disabled={analyzing || batchAnalyzing || fetchingLichess}
              />
              <button
                type="button"
                disabled={!lichessUrl.trim() || analyzing || batchAnalyzing || fetchingLichess}
                onClick={async () => {
                  setError(null);
                  setFetchingLichess(true);
                  try {
                    setPgn(await fetchLichessPgn(lichessUrl));
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Could not fetch the Lichess game.",
                    );
                  } finally {
                    setFetchingLichess(false);
                  }
                }}
              >
                {fetchingLichess ? (
                  <LoaderCircle className="spin" size={14} />
                ) : (
                  <Link2 size={14} />
                )}
                Fetch
              </button>
            </div>
          </div>

          <div className="review-v2-import-source">
            <label htmlFor="review-pgn">PGN</label>
            <textarea
              id="review-pgn"
              value={pgn}
              onChange={(event) => setPgn(event.target.value)}
              placeholder="Paste PGN…"
              spellCheck={false}
            />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pgn,text/plain"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setPgn(await file.text());
              event.target.value = "";
            }}
          />

          <div className="review-v2-import-footer">
            <div className="review-v2-color" role="group" aria-label="Your color">
              <button
                className={playerColor === "w" ? "active" : ""}
                onClick={() => setPlayerColor("w")}
                type="button"
                aria-pressed={playerColor === "w"}
              >
                White
              </button>
              <button
                className={playerColor === "b" ? "active" : ""}
                onClick={() => setPlayerColor("b")}
                type="button"
                aria-pressed={playerColor === "b"}
              >
                Black
              </button>
            </div>

            <div>
              <button
                className="secondary"
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={analyzing || batchAnalyzing}
              >
                <Upload size={15} /> PGN file
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => void analyze()}
                disabled={!pgn.trim() || analyzing || batchAnalyzing}
              >
                {analyzing ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <FileUp size={16} />
                )}
                {analyzing ? "Analyzing" : "Analyze"}
              </button>
            </div>
          </div>

          {progress && analyzing && (
            <div className="analysis-progress" role="status" aria-live="polite" aria-atomic="true">
              <div>
                <span>
                  {progress.phase === "loading-engine"
                    ? "Loading Stockfish"
                    : progress.phase === "classifying"
                      ? "Selecting learning moments"
                      : "Analyzing moves"}
                </span>
                <strong>{progress.total ? `${progress.completed}/${progress.total}` : "…"}</strong>
              </div>
              <div
                className="track"
                role="progressbar"
                aria-label="Game analysis progress"
                aria-valuemin={0}
                aria-valuemax={progress.total || 1}
                aria-valuenow={progress.total ? progress.completed : 0}
              >
                <i
                  style={{
                    width: progress.total
                      ? `${(progress.completed / progress.total) * 100}%`
                      : "8%",
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="analysis-error" role="alert">
              <strong>Analysis unavailable</strong>
              <span>{error}</span>
            </div>
          )}
        </section>
        </details>

        <section className="review-v2-sync">
          <LichessSyncCard
            connection={lichess}
            syncing={lichessSyncing}
            message={lichessSyncMessage}
            error={lichessSyncError}
            compact
            onLink={onLinkLichess}
            onUnlink={onUnlinkLichess}
            onSync={onSyncLichess}
          />
          {lichess && (
            <button
              type="button"
              disabled={
                batchAnalyzing ||
                !games.some(
                  (game) => game.source === "lichess" && !game.analyzedAt,
                )
              }
              onClick={() => void analyzeSyncedGames()}
            >
              {batchAnalyzing ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Target size={15} />
              )}
              {batchAnalyzing ? "Analyzing…" : "Analyze new synced games"}
            </button>
          )}
          {batchStatus && <span role="status" aria-live="polite">{batchStatus}</span>}
        </section>
      </main>

      <aside className="review-v2-repair" aria-labelledby="repair-title">
        <header>
          <div>
            <p className="eyebrow">PRACTICE AGAIN</p>
            <h2 id="repair-title">{unresolved.length} positions</h2>
          </div>
          <Target size={17} />
        </header>

        <div className="review-v2-repair-list">
          {unresolved.length ? (
            unresolved.slice(0, 12).map((mistake) => (
              <div key={mistake.id} className={`review-v2-repair-row ${mistake.severity}`}>
                <div>
                  <span>{severityLabel(mistake.severity)} · move {mistake.moveNumber}</span>
                  <strong>{mistake.actualSan}</strong>
                  <p>{mistake.explanation}</p>
                </div>
                <div>
                  <span>−{(mistake.centipawnLoss / 100).toFixed(1)}</span>
                  <button type="button" onClick={() => onTrainMistake(mistake.id)}>
                    <Swords size={14} />
                    Practice
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="review-v2-repair-empty">
              <Target size={18} />
              <strong>No positions to revisit</strong>
              <span>Critical positions from analyzed games will appear here.</span>
            </div>
          )}
        </div>

        {mistakes.some((mistake) => mistake.resolved) && (
          <div className="review-v2-repaired">
            <RotateCcw size={14} />
            {mistakes.filter((mistake) => mistake.resolved).length} practiced positions
          </div>
        )}
      </aside>
    </section>
  );
}
