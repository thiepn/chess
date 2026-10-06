import { useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  FileUp,
  LoaderCircle,
  RotateCcw,
  Swords,
  Target,
  Upload,
  Link2,
} from "lucide-react";
import { StockfishBrowserEngine } from "../engine/stockfish";
import { analyzeImportedGame } from "../games/analyze";
import { importPgn, playerMoveCount } from "../games/import";
import { fetchLichessPgn } from "../games/lichess";
import type { LichessConnection } from "../lichess/types";
import { LichessSyncCard } from "./LichessSyncCard";
import type {
  GameAnalysisProgress,
  GameReviewReflection,
  ImportedGame,
  PersonalMistake,
} from "../games/types";
import { GameStoryView } from "./GameStoryView";
import type { OpeningDeviation } from "../openings/types";

interface ReviewViewProps {
  games: ImportedGame[];
  mistakes: PersonalMistake[];
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
}

function severityLabel(value: PersonalMistake["severity"]) {
  if (value === "blunder") return "Blunder";
  if (value === "mistake") return "Mistake";
  return "Inaccuracy";
}

export function ReviewView({
  games,
  mistakes,
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
}: ReviewViewProps) {
  const [pgn, setPgn] = useState("");
  const [lichessUrl, setLichessUrl] = useState("");
  const [fetchingLichess, setFetchingLichess] = useState(false);
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [progress, setProgress] = useState<GameAnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [reanalyzingGameId, setReanalyzingGameId] = useState<string | null>(null);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const unresolved = useMemo(
    () => mistakes.filter((mistake) => !mistake.resolved),
    [mistakes],
  );

  const latestStoryGame = useMemo(
    () =>
      [...games]
        .reverse()
        .find((game) => Boolean(game.reviewStory)),
    [games],
  );

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
      setSelectedGameId(result.game.id);
      setPgn("");
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
      setSelectedGameId(result.game.id);
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

    const pending = [...games]
      .filter((game) => game.source === "lichess" && !game.analyzedAt)
      .sort((a, b) => b.importedAt.localeCompare(a.importedAt))
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

  const selectedGame = selectedGameId
    ? games.find((game) => game.id === selectedGameId)
    : undefined;

  if (selectedGame) {
    return (
      <GameStoryView
        game={selectedGame}
        mistakes={mistakes.filter((mistake) => mistake.gameId === selectedGame.id)}
        onBack={() => setSelectedGameId(null)}
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
      />
    );
  }

  return (
    <section className="review-view">
      <header className="section-hero compact">
        <div>
          <p className="eyebrow">GAME REVIEW</p>
          <h1>Turn your games into training.</h1>
          <p>
            Import a finished PGN. Stockfish checks your moves, but only
            meaningful learning moments are promoted into the mistake bank.
          </p>
        </div>
        <div className="section-hero-icon" aria-hidden="true">
          <BrainCircuit size={30} />
        </div>
      </header>

      <section className="review-lichess-section">
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
            className="review-batch-analyze"
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
              <LoaderCircle className="spin" size={16} />
            ) : (
              <BrainCircuit size={16} />
            )}
            {batchAnalyzing ? "Analyzing synced games…" : "Analyze new human games"}
          </button>
        )}

        {batchStatus && <span className="review-batch-status">{batchStatus}</span>}
      </section>

      <div className="review-grid">
        <article className="panel import-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">IMPORT</p>
              <h3>Analyze a game</h3>
            </div>
            <FileUp size={20} />
          </div>

          <div className="lichess-import-row">
            <input
              value={lichessUrl}
              onChange={(event) => setLichessUrl(event.target.value)}
              placeholder="Lichess game URL or ID"
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
              {fetchingLichess ? <LoaderCircle className="spin" size={15} /> : <Link2 size={15} />}
              Fetch
            </button>
          </div>

          <div className="import-divider"><span>or paste/upload PGN</span></div>

          <div className="color-picker" aria-label="Your color">
            <button
              className={playerColor === "w" ? "active" : ""}
              onClick={() => setPlayerColor("w")}
              type="button"
            >
              ♙ I was White
            </button>
            <button
              className={playerColor === "b" ? "active" : ""}
              onClick={() => setPlayerColor("b")}
              type="button"
            >
              ♟ I was Black
            </button>
          </div>

          <textarea
            className="pgn-input"
            value={pgn}
            onChange={(event) => setPgn(event.target.value)}
            placeholder={"Paste PGN here…\n\n1. e4 e5 2. Nf3 Nc6 …"}
            spellCheck={false}
          />

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

          <div className="import-actions">
            <button
              className="secondary"
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={analyzing || batchAnalyzing}
            >
              <Upload size={16} /> PGN file
            </button>
            <button
              className="primary"
              type="button"
              onClick={analyze}
              disabled={!pgn.trim() || analyzing || batchAnalyzing}
            >
              {analyzing ? <LoaderCircle className="spin" size={17} /> : <BrainCircuit size={17} />}
              {analyzing ? "Analyzing…" : "Analyze my game"}
            </button>
          </div>

          {progress && analyzing && (
            <div className="analysis-progress">
              <div>
                <span>
                  {progress.phase === "loading-engine"
                    ? "Loading Stockfish"
                    : progress.phase === "classifying"
                      ? "Selecting learning moments"
                      : "Analyzing your moves"}
                </span>
                <strong>
                  {progress.total
                    ? `${progress.completed}/${progress.total}`
                    : "…"}
                </strong>
              </div>
              <div className="track">
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
            <div className="analysis-error">
              <strong>Analysis unavailable</strong>
              <span>{error}</span>
            </div>
          )}
        </article>

        <article className="panel mistake-summary-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">PERSONAL BANK</p>
              <h3>{unresolved.length} positions to repair</h3>
            </div>
            <Target size={20} />
          </div>
          <p>
            These are not every engine disagreement. They are positions with
            enough practical impact to justify future training.
          </p>

          <div className="bank-stats">
            <div>
              <span>Games analyzed</span>
              <strong>{games.filter((game) => game.analyzedAt).length}</strong>
            </div>
            <div>
              <span>Blunders</span>
              <strong>{unresolved.filter((item) => item.severity === "blunder").length}</strong>
            </div>
            <div>
              <span>Repaired</span>
              <strong>{mistakes.filter((item) => item.resolved).length}</strong>
            </div>
          </div>
        </article>
      </div>

      {latestStoryGame?.reviewStory && (
        <button
          className="latest-story-card"
          type="button"
          onClick={() => setSelectedGameId(latestStoryGame.id)}
        >
          <div className="latest-story-kicker">
            <BrainCircuit size={18} />
            <span>LATEST GAME STORY</span>
          </div>
          <div>
            <h2>{latestStoryGame.reviewStory.headline}</h2>
            <p>{latestStoryGame.reviewStory.summary}</p>
          </div>
          <div className="latest-story-meta">
            <span>{latestStoryGame.white} — {latestStoryGame.black}</span>
            <strong>{latestStoryGame.reviewStory.moments.length} moments</strong>
          </div>
        </button>
      )}

      <section className="mistake-bank">
        <div className="review-section-heading">
          <div>
            <p className="eyebrow">CRITICAL MOMENTS</p>
            <h2>Mistake bank</h2>
          </div>
          <span>Highest-impact positions first</span>
        </div>

        {mistakes.length ? (
          <div className="mistake-card-grid">
            {[...mistakes]
              .sort((a, b) => {
                const severity = { blunder: 3, mistake: 2, inaccuracy: 1 };
                return (
                  severity[b.severity] - severity[a.severity] ||
                  b.centipawnLoss - a.centipawnLoss
                );
              })
              .map((mistake) => (
                <article
                  key={mistake.id}
                  className={`mistake-card ${mistake.severity} ${mistake.resolved ? "resolved" : ""}`}
                >
                  <div className="mistake-card-top">
                    <span>{severityLabel(mistake.severity)}</span>
                    <strong>Move {mistake.moveNumber}</strong>
                  </div>
                  <h3>{mistake.actualSan}</h3>
                  <p>{mistake.explanation}</p>
                  <div className="mistake-tags">
                    {mistake.skillIds.slice(0, 2).map((skillId) => (
                      <span key={skillId}>{skillId.split(".").at(-1)?.replaceAll("-", " ")}</span>
                    ))}
                  </div>
                  <div className="mistake-card-footer">
                    <span>−{(mistake.centipawnLoss / 100).toFixed(1)}</span>
                    <button type="button" onClick={() => onTrainMistake(mistake.id)}>
                      {mistake.resolved ? <RotateCcw size={15} /> : <Swords size={15} />}
                      {mistake.resolved ? "Train again" : "Repair"}
                    </button>
                  </div>
                </article>
              ))}
          </div>
        ) : (
          <div className="empty-bank">
            <Target size={24} />
            <strong>No personal mistakes yet.</strong>
            <span>Import a game above. Only meaningful moments will appear here.</span>
          </div>
        )}
      </section>

      {games.length > 0 && (
        <section className="game-history">
          <div className="review-section-heading">
            <div>
              <p className="eyebrow">HISTORY</p>
              <h2>Analyzed games</h2>
            </div>
          </div>
          <div className="game-history-list">
            {[...games].reverse().slice(0, 8).map((game) => (
              <button
                className="game-history-row"
                type="button"
                key={game.id}
                onClick={() => {
                  if (game.reviewStory) {
                    setSelectedGameId(game.id);
                  } else {
                    void reanalyzeStoredGame(game);
                  }
                }}
                disabled={reanalyzingGameId === game.id}
              >
                <div>
                  <strong>{game.white} — {game.black}</strong>
                  <span>
                    {game.result} · {game.moves.length} plies
                    {game.source === "lichess" ? " · Lichess human game" : ""}
                    {game.timeControlCategory && game.timeControlCategory !== "unknown"
                      ? ` · ${game.timeControlCategory}`
                      : ""}
                    {game.opponentRating ? ` · opp ${game.opponentRating}` : ""}
                  </span>
                </div>
                <div>
                  <span>
                    {reanalyzingGameId === game.id
                      ? "Generating story…"
                      : game.reviewStory
                        ? "Visual review"
                        : "Upgrade review"}
                  </span>
                  <strong>
                    {reanalyzingGameId === game.id
                      ? "Stockfish"
                      : game.practicalMetrics
                        ? `Quality ${game.practicalMetrics.qualityScore}% · ACPL ${game.practicalMetrics.averageCentipawnLoss}`
                        : game.reviewStory
                          ? `${game.reviewStory.moments.length} story moments`
                          : "Generate P8 story"}
                  </strong>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
