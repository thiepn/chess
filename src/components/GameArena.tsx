import { Chess, type Color, type Square } from "chess.js";
import {
  Clock3,
  Flag,
  LoaderCircle,
  RotateCcw,
  Shield,
  CheckCircle2,
  Target,
  Swords,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { StockfishBrowserEngine } from "../engine/stockfish";
import { opponentThinkBudgetMs } from "../play/opponentSearch";
import { useExperience } from "../interaction/ExperienceProvider";
import { importPgn } from "../games/import";
import { advanceClock, completeMoveClock, makeCheckpoint, restoreCheckpoint, type GameCheckpoint, type RunningClock, type CompletedGame } from "../play/gameRecovery";
import type {
  AiProfile,
  PlayResult,
  TimeControlId,
  TrainingScenario,
} from "../play/types";
import { ChessBoard } from "./ChessBoard";
import { ChessPiece } from "./ChessPiece";

interface GameArenaProps {
  initialFen: string;
  checkpoint?: GameCheckpoint;
  onCheckpoint?: (snapshot: GameCheckpoint) => void;
  playerColor: Color;
  profile: AiProfile;
  scenario?: TrainingScenario;
  onExit: () => void;
  onFinished: (result: PlayResult) => Promise<boolean> | boolean;
  onOpenReview?: (gameId: string) => void;
  exitLabel?: string;
  timeControl?: TimeControlId;
}

function uciMove(chess: Chess, encoded: string) {
  return chess.move({
    from: encoded.slice(0, 2),
    to: encoded.slice(2, 4),
    promotion: encoded.slice(4, 5) || "q",
  });
}

function outcomeFor(chess: Chess, playerColor: Color) {
  if (chess.isCheckmate()) {
    return chess.turn() === playerColor ? "loss" : "win";
  }
  return "draw";
}

function reasonFor(chess: Chess): PlayResult["reason"] {
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isInsufficientMaterial()) return "insufficient";
  if (chess.isThreefoldRepetition()) return "threefold";
  if (chess.isDrawByFiftyMoves()) return "fifty-move";
  return "draw";
}

function resultHeader(
  outcome: PlayResult["outcome"],
  playerColor: Color,
) {
  if (outcome === "draw") return "1/2-1/2";
  if (outcome === "resigned") return playerColor === "w" ? "0-1" : "1-0";
  const playerWon = outcome === "win";
  const whiteWon =
    (playerColor === "w" && playerWon) ||
    (playerColor === "b" && !playerWon);
  return whiteWon ? "1-0" : "0-1";
}

function timeControlConfig(id: TimeControlId) {
  if (id === "10+0") return { initialMs: 10 * 60_000, incrementMs: 0, label: "10+0" };
  if (id === "15+10") return { initialMs: 15 * 60_000, incrementMs: 10_000, label: "15+10" };
  return { initialMs: 0, incrementMs: 0, label: "Untimed" };
}

function clockLabel(ms: number) {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function outcomeLabel(outcome: PlayResult["outcome"]) {
  if (outcome === "win") return "You won";
  if (outcome === "draw") return "Draw";
  if (outcome === "resigned") return "You resigned";
  return "You lost";
}

export function GameArena({
  initialFen,
  checkpoint,
  onCheckpoint,
  playerColor,
  profile,
  scenario,
  onExit,
  onFinished,
  onOpenReview,
  exitLabel = "Back to Play",
  timeControl = "untimed",
}: GameArenaProps) {
  const [recovered] = useState(() => restoreCheckpoint(initialFen, checkpoint, timeControl, Date.now()));
  const gameRef = useRef(recovered.chess);
  const engineRef = useRef<StockfishBrowserEngine | null>(null);
  const finishedRef = useRef(Boolean(recovered.finished));
  const [fen, setFen] = useState(recovered.chess.fen());
  const [moves, setMoves] = useState<string[]>(() => recovered.chess.history());
  const clockRef = useRef<RunningClock>(recovered.clock);
  const [clock, setClock] = useState<RunningClock>(recovered.clock);
  const [engineNonce, setEngineNonce] = useState(0);
  const recoveryAttemptsRef = useRef(0);
  const [presentationMove, setPresentationMove] = useState<
    { from: Square; to: Square } | undefined
  >();
  const [thinking, setThinking] = useState(false);
  const [engineStatus, setEngineStatus] = useState("Loading opponent…");
  const [engineReady, setEngineReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyResult, setEmptyResult] = useState<CompletedGame | null>(
    recovered.finished && recovered.chess.history().length === 0 ? recovered.finished : null,
  );
  const [result, setResult] = useState<PlayResult | null>(() => {
    if (!recovered.finished || recovered.chess.history().length === 0) return null;
    const chess = recovered.chess;
    // Reconstruct the exact header order used by finalize(); otherwise the
    // PGN hash / saved game ID changes after a reload.
    chess.setHeader("Event", scenario ? "THIEPN Chess — " + scenario.title : "THIEPN Chess — Training Game");
    chess.setHeader("White", playerColor === "w" ? "You" : profile.name);
    chess.setHeader("Black", playerColor === "b" ? "You" : profile.name);
    chess.setHeader("Site", "chess.thiepn.dev");
    if (initialFen !== new Chess().fen()) {
      chess.setHeader("SetUp", "1");
      chess.setHeader("FEN", initialFen);
    }
    chess.setHeader("Result", resultHeader(recovered.finished.outcome, playerColor));
    const pgn = chess.pgn({ maxWidth: 80, newline: "\n" });
    return {
      ...recovered.finished,
      pgn,
      importedGame: importPgn(pgn, playerColor, recovered.finished.completedAt, { source: "training" }),
      aiProfileId: profile.id,
      scenarioId: scenario?.id,
      scenarioSuccess: scenario ? scenario.successResults.includes(recovered.finished.outcome as "win" | "draw" | "loss") : undefined,
      trainingSkillId: scenario?.skillId,
      prescriptionId: scenario?.prescriptionId,
      prescriptionActionId: scenario?.prescriptionActionId,
    };
  });
  const [sendingReview, setSendingReview] = useState(false);
  const [reviewSent, setReviewSent] = useState(Boolean(recovered.finished?.reviewSent));
  const clockConfig = useMemo(() => timeControlConfig(timeControl), [timeControl]);
  const whiteMs = clock.whiteMs;
  const blackMs = clock.blackMs;
  const { feedback, celebrate, settings } = useExperience();

  // Keep a worker only after it becomes necessary. A recovered untimed
  // position where the human is to move must not allocate Stockfish merely
  // because earlier moves exist. Once requested, keep it for the game lifetime.
  const [engineRequested, setEngineRequested] = useState(() =>
    timeControl !== "untimed" ||
    (!recovered.finished && recovered.chess.turn() !== playerColor));
  useEffect(() => {
    if (!engineRequested && !finishedRef.current &&
        gameRef.current.turn() !== playerColor) {
      setEngineRequested(true);
    }
  }, [engineRequested, fen, playerColor]);

  useEffect(() => {
    const chess = gameRef.current;
    chess.setHeader(
      "Event",
      scenario ? `THIEPN Chess — ${scenario.title}` : "THIEPN Chess — Training Game",
    );
    chess.setHeader("White", playerColor === "w" ? "You" : profile.name);
    chess.setHeader("Black", playerColor === "b" ? "You" : profile.name);
    chess.setHeader("Site", "chess.thiepn.dev");
    if (initialFen !== new Chess().fen()) {
      chess.setHeader("SetUp", "1");
      chess.setHeader("FEN", initialFen);
    }

    if (recovered.finished || !engineRequested) {
      setEngineStatus("Opponent starts after your first move");
      return;
    }
    let cancelled = false;
    setError(null);
    setEngineStatus(recoveryAttemptsRef.current ? "Reconnecting opponent…" : "Loading opponent…");

    StockfishBrowserEngine.create()
      .then((engine) => {
        if (cancelled) {
          engine.quit();
          return;
        }
        engineRef.current = engine;
        setEngineReady(true);
        setEngineStatus(`${profile.name} ready`);
      })
      .catch((cause) => {
        if (!cancelled) recoverOpponent(cause instanceof Error
          ? cause.message : "Opponent failed to load.");
      });

    return () => {
      cancelled = true;
      engineRef.current?.quit();
      engineRef.current = null;
      setEngineReady(false);
    };
  }, [initialFen, playerColor, profile.name, scenario, engineNonce, engineRequested]);

  const opponentColor: Color = playerColor === "w" ? "b" : "w";

  function recoverOpponent(message: string) {
    if (recoveryAttemptsRef.current < 1 && !finishedRef.current &&
      /worker|timed out|illegal move|did not return/i.test(message)) {
      recoveryAttemptsRef.current += 1;
      setEngineReady(false);
      setEngineStatus("Reconnecting…");
      setEngineNonce((count) => count + 1);
    } else {
      setError(message);
      setEngineStatus("Opponent unavailable");
    }
  }

  const playerToMove =
    !finishedRef.current && gameRef.current.turn() === playerColor && !gameRef.current.isGameOver();

  // Real elapsed wall time, not a setInterval counter, is authoritative.
  // This continues correctly after background throttling, sleep or reload.
  useEffect(() => {
    if (timeControl === "untimed" || result || finishedRef.current) return;
    if (!engineReady || error) {
      // Neither player loses time because a local Stockfish worker is
      // loading, crashed, or awaiting an explicit retry.
      clockRef.current = { ...clockRef.current, updatedAt: Date.now() };
      setClock(clockRef.current);
      return;
    }
    const tick = () => {
      const next = advanceClock(clockRef.current, Date.now(), true);
      clockRef.current = next;
      setClock(next);
      if (next.whiteMs <= 0 || next.blackMs <= 0) {
        const timedOut = next.whiteMs <= 0 ? "w" : "b";
        void finalize(playerColor === timedOut ? "loss" : "win", "timeout");
      }
    };
    tick();
    const interval = window.setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [fen, result, timeControl, playerColor, engineReady, error]);

  function finishMoveClock(mover: Color): boolean {
    const next = completeMoveClock(clockRef.current, mover, timeControl, Date.now());
    if (!next) return false;
    clockRef.current = next;
    setClock(next);
    return true;
  }

  useEffect(() => {
    onCheckpoint?.(makeCheckpoint(gameRef.current, initialFen, clock,
      emptyResult ?? (result ? {
        outcome: result.outcome,
        reason: result.reason,
        completedAt: result.completedAt,
        reviewSent,
      } : undefined)));
  }, [fen, clock, result, emptyResult, reviewSent, initialFen, onCheckpoint]);

  const lastMove = useMemo(() => moves.at(-1), [moves]);
  const moveRows = useMemo(() => {
    const rows = new Map<number, { number: number; w?: string; b?: string }>();

    for (const move of gameRef.current.history({ verbose: true })) {
      const number =
        Number(move.before.split(/\s+/)[5]) || Math.floor(rows.size / 2) + 1;
      const row = rows.get(number) ?? { number };
      row[move.color] = move.san;
      rows.set(number, row);
    }

    return [...rows.values()].sort((a, b) => a.number - b.number);
  }, [moves]);

  async function finalize(
    outcome: PlayResult["outcome"],
    reason: PlayResult["reason"],
  ) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // Abort pending opponent search on resignation, timeout or checkmate.
    engineRef.current?.quit();
    engineRef.current = null;
    setEngineReady(false);

    const chess = gameRef.current;
    const completedAt = new Date().toISOString();
    if (chess.history().length === 0) {
      // An expired game without moves has no importable PGN, but its terminal
      // state still needs to survive a refresh without inventing a game.
      const terminal: CompletedGame = { outcome, reason, completedAt, reviewSent: false };
      onCheckpoint?.(makeCheckpoint(chess, initialFen, clockRef.current, terminal));
      setEmptyResult(terminal);
      return;
    }
    chess.setHeader("Result", resultHeader(outcome, playerColor));
    const pgn = chess.pgn({ maxWidth: 80, newline: "\n" });
    const importedGame = importPgn(pgn, playerColor, completedAt, {
      source: "training",
    });
    const scenarioSuccess =
      scenario && outcome !== "resigned"
        ? scenario.successResults.includes(outcome)
        : undefined;

    const finished: PlayResult = {
      outcome,
      reason,
      pgn,
      importedGame,
      scenarioId: scenario?.id,
      scenarioSuccess,
      aiProfileId: profile.id,
      trainingSkillId: scenario?.skillId,
      prescriptionId: scenario?.prescriptionId,
      prescriptionActionId: scenario?.prescriptionActionId,
      completedAt,
    };

    // Durable record precedes review/engine work; a reload must never
    // replace this completed game with a fresh starting position.
    onCheckpoint?.(makeCheckpoint(chess, initialFen, clockRef.current, {
      outcome, reason, completedAt, reviewSent: false,
    }));
    setResult(finished);
    setSendingReview(true);

    if (reason === "checkmate") feedback("mate");
    else feedback(outcome === "win" ? "complete" : outcome === "draw" ? "success" : "error");

    if (outcome === "win") celebrate(scenario ? "small" : "medium");
    else if (scenarioSuccess) celebrate("small");

    try {
      const analyzed = await onFinished(finished);
      setReviewSent(analyzed);
    } catch {
      // Review may still open a saved game and retry its analysis.
      setReviewSent(false);
    } finally {
      setSendingReview(false);
    }
  }

  function finishIfNeeded() {
    const chess = gameRef.current;
    if (!chess.isGameOver()) return false;
    void finalize(outcomeFor(chess, playerColor), reasonFor(chess));
    return true;
  }

  useEffect(() => {
    if (result || error || thinking || !engineRef.current || finishedRef.current) return;
    if (timeControl !== "untimed" && (clockRef.current.whiteMs <= 0 || clockRef.current.blackMs <= 0)) return;

    const chess = gameRef.current;
    if (chess.isGameOver()) {
      finishIfNeeded();
      return;
    }

    if (chess.turn() === playerColor) return;

    let cancelled = false;
    const requestedFen = chess.fen();
    setThinking(true);
    setEngineStatus(`${profile.name} is thinking…`);

    engineRef.current
      .chooseMove(chess.fen(), {
        skillLevel: profile.skillLevel,
        depth: profile.depth,
        moveTimeMs: opponentThinkBudgetMs(profile, timeControl, clockRef.current, opponentColor),
      })
      .then((evaluation) => {
        if (cancelled || finishedRef.current || chess.fen() !== requestedFen) return;
        if (!evaluation.bestMove || evaluation.bestMove === "(none)") {
          if (chess.isGameOver()) finishIfNeeded();
          else recoverOpponent("Opponent returned no legal move.");
          return;
        }

        const mover = chess.turn();
        const move = uciMove(chess, evaluation.bestMove);
        if (move && !finishMoveClock(mover)) {
          chess.undo();
          void finalize(mover === playerColor ? "loss" : "win", "timeout");
          return;
        }
        if (!move) {
          recoverOpponent("Opponent returned an illegal move.");
          return;
        }

        setMoves((previous) => [...previous, move.san]);
        setPresentationMove({
          from: move.from as Square,
          to: move.to as Square,
        });
        if (chess.inCheck()) feedback("check");
        else if (move.captured) feedback("capture");
        else feedback("move");
        setFen(chess.fen());
        recoveryAttemptsRef.current = 0;
        setEngineStatus(`${profile.name} ready`);
        finishIfNeeded();
      })
      .catch((cause) => {
        if (cancelled) return;
        recoverOpponent(
          cause instanceof Error ? cause.message : "Opponent calculation failed.",
        );
      })
      .finally(() => {
        if (!cancelled) setThinking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    fen,
    playerColor,
    profile.skillLevel,
    profile.depth,
    profile.name,
    profile.accent,
    result,
    error,
    engineReady,
  ]);

  return (
    <section className="game-arena">
      <div className="game-topbar">
        <button className="back-link" type="button" onClick={onExit}>
          <RotateCcw size={15} /> Exit game
        </button>
        <div className="game-opponent" aria-live="polite">
          <Swords size={15} />
          <span>{engineStatus}</span>
        </div>
      </div>

      <div className="game-layout">
        <div className="game-board-column">
          <div className="game-player-strip opponent">
            <div>
              <span className="game-player-mark" aria-hidden="true">
                <Swords size={15} />
              </span>
              <span>
                <strong>{profile.name}</strong>
                <small>{playerColor === "w" ? "Black" : "White"} · {profile.accent}</small>
              </span>
            </div>
            <div
              className={gameRef.current.turn() !== playerColor && !result ? "game-clock active" : "game-clock"}
              role="timer"
              aria-live="off"
              aria-label={`${profile.name} clock, ${timeControl === "untimed"
                  ? "—:—"
                  : clockLabel(playerColor === "w" ? blackMs : whiteMs)}`}
            >
              <Clock3 size={14} aria-hidden="true" />
              <strong>
                {timeControl === "untimed"
                  ? "—:—"
                  : clockLabel(playerColor === "w" ? blackMs : whiteMs)}
              </strong>
            </div>
          </div>

          <ChessBoard
            fen={fen}
            orientation={playerColor}
            disabled={!playerToMove || thinking || Boolean(result)}
            presentationMove={presentationMove}
            onMove={(boardMove) => {
              if (!playerToMove || thinking || result || finishedRef.current) return false;
              const chess = gameRef.current;
              const mover = chess.turn();

              let move;
              try {
                move = chess.move({
                  from: boardMove.from,
                  to: boardMove.to,
                  promotion: boardMove.promotion || "q",
                });
              } catch {
                move = null;
              }

              if (!move) return false;
              if (!finishMoveClock(mover)) {
                chess.undo();
                void finalize(mover === playerColor ? "loss" : "win", "timeout");
                return false;
              }

              setMoves((previous) => [...previous, move.san]);
              setPresentationMove(undefined);
              setFen(chess.fen());
              finishIfNeeded();
              return true;
            }}
          />

          <div className="game-player-strip player">
            <div>
              <span className="game-player-mark you" aria-hidden="true">
                <ChessPiece
                  color={playerColor}
                  type="p"
                  styleVariant={settings.pieceStyle}
                />
              </span>
              <span>
                <strong>You</strong>
                <small>{playerColor === "w" ? "White" : "Black"} · {clockConfig.label}</small>
              </span>
            </div>
            <div
              className={playerToMove && !result ? "game-clock active" : "game-clock"}
              role="timer"
              aria-live="off"
              aria-label={`Your clock, ${timeControl === "untimed"
                  ? "—:—"
                  : clockLabel(playerColor === "w" ? whiteMs : blackMs)}`}
            >
              <Clock3 size={14} aria-hidden="true" />
              <strong>
                {timeControl === "untimed"
                  ? "—:—"
                  : clockLabel(playerColor === "w" ? whiteMs : blackMs)}
              </strong>
            </div>
          </div>

          <div className="game-turn-line" aria-live="polite">
            <span>
              {result || emptyResult
                ? outcomeLabel((result ?? emptyResult)!.outcome)
                : thinking
                  ? "Opponent thinking"
                  : playerToMove
                    ? "Your move"
                    : "Opponent to move"}
            </span>
            {lastMove && <strong>Last: {lastMove}</strong>}
          </div>
        </div>

        <aside className="game-side-panel">
          <div className="game-mode-header">
            <div className="game-mode-icon">
              {scenario ? <TargetIcon mode={scenario.mode} /> : <Swords size={20} />}
            </div>
            <div>
              <p className="eyebrow">
                {scenario ? scenario.sourceLabel : "NORMAL GAME"}
              </p>
              <h2>{scenario?.title ?? "Training game"}</h2>
            </div>
          </div>

          <p className="game-description">
            {scenario?.description ??
              "Play a complete game against the selected training opponent. The finished PGN will be sent directly into your Review pipeline."}
          </p>

          {scenario && (
            <div className="game-objective">
              <span>Objective</span>
              <strong>{scenario.objective}</strong>
            </div>
          )}

          <div className="game-profile-card">
            <span>Game</span>
            <strong>{clockConfig.label} · {profile.name}</strong>
            <p>{profile.description}</p>
          </div>

          <div className="move-sheet">
            <div className="move-sheet-title">
              <span>Moves</span>
              <strong>{moves.length} plies</strong>
            </div>
            <div className="move-list">
              {moveRows.length ? (
                moveRows.map((row) => (
                  <div key={row.number}>
                    <span>{row.number}.</span>
                    <strong>{row.w ?? ""}</strong>
                    <strong>{row.b ?? ""}</strong>
                  </div>
                ))
              ) : (
                <p>No moves yet.</p>
              )}
            </div>
          </div>

          {error && (
            <div className="analysis-error">
              <strong>Game engine unavailable</strong>
              <span>{error}</span>
              {!result && <button type="button" className="secondary" onClick={() => {
                setError(null);
                recoveryAttemptsRef.current = 0;
                setEngineReady(false);
                setEngineStatus("Restarting…");
                setEngineNonce((count) => count + 1);
              }}>Retry opponent</button>}
            </div>
          )}

          {!result && !emptyResult && (
            <button
              className="resign-button"
              type="button"
              disabled={!moves.length}
              onClick={() => void finalize("resigned", "resignation")}
            >
              <Flag size={15} /> Resign
            </button>
          )}

          {emptyResult && (
            <div className="game-result-card" role="status">
              <p className="eyebrow">GAME COMPLETE</p>
              <h3>{outcomeLabel(emptyResult.outcome)}</h3>
              <p>The game ended before a legal move was recorded. No PGN was created.</p>
              <button className="secondary" type="button" onClick={onExit}>{exitLabel}</button>
            </div>
          )}

          {result && (
            <div className="game-result-card">
              <div className="game-result-symbol">
                {result.outcome === "win" ? (
                  <CheckCircle2 size={24} />
                ) : result.outcome === "draw" ? (
                  <Shield size={24} />
                ) : (
                  <Flag size={24} />
                )}
              </div>
              <div>
                <p className="eyebrow">GAME COMPLETE</p>
                <h3>{outcomeLabel(result.outcome)}</h3>
                {scenario && (
                  <span>
                    {result.scenarioSuccess
                      ? "Training objective achieved."
                      : "This scenario remains useful practice."}
                  </span>
                )}
              </div>

              <div className="review-transfer">
                {sendingReview ? (
                  <>
                    <LoaderCircle className="spin" size={16} />
                    <span>Sending to Review…</span>
                  </>
                ) : reviewSent ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Saved and analyzed for Review</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Game preserved · Review transfer may need retry</span>
                  </>
                )}
              </div>

              {!reviewSent && <button type="button" className="secondary" disabled={sendingReview}
                onClick={() => {
                  setSendingReview(true);
                  void Promise.resolve().then(() => onFinished(result))
                    .then((analyzed) => setReviewSent(analyzed))
                    .catch(() => setReviewSent(false))
                    .finally(() => setSendingReview(false));
                }}>Retry Review transfer</button>}
              {onOpenReview && (
                <button
                  className="primary"
                  type="button"
                  disabled={sendingReview}
                  onClick={() => onOpenReview(result.importedGame.id)}
                >
                  {reviewSent ? "Review game" : "Open game in Review"}
                </button>
              )}
              <button className={onOpenReview ? "secondary" : "primary"} type="button" onClick={onExit}>
                {exitLabel}
              </button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function TargetIcon({ mode }: { mode: TrainingScenario["mode"] }) {
  if (mode === "defense") return <Shield size={20} />;
  if (mode === "conversion") return <Target size={20} />;
  return <Swords size={20} />;
}
