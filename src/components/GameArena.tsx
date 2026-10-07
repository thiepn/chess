import { Chess, type Color, type Square } from "chess.js";
import {
  BrainCircuit,
  Clock3,
  Flag,
  LoaderCircle,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { StockfishBrowserEngine } from "../engine/stockfish";
import { useExperience } from "../interaction/ExperienceProvider";
import { importPgn } from "../games/import";
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
  playerColor: Color;
  profile: AiProfile;
  scenario?: TrainingScenario;
  onExit: () => void;
  onFinished: (result: PlayResult) => Promise<boolean> | boolean;
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
  playerColor,
  profile,
  scenario,
  onExit,
  onFinished,
  exitLabel = "Back to Play",
  timeControl = "untimed",
}: GameArenaProps) {
  const gameRef = useRef(new Chess(initialFen));
  const engineRef = useRef<StockfishBrowserEngine | null>(null);
  const finishedRef = useRef(false);
  const [fen, setFen] = useState(initialFen);
  const [moves, setMoves] = useState<string[]>([]);
  const [presentationMove, setPresentationMove] = useState<
    { from: Square; to: Square } | undefined
  >();
  const [thinking, setThinking] = useState(false);
  const [engineStatus, setEngineStatus] = useState("Loading opponent…");
  const [engineReady, setEngineReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [sendingReview, setSendingReview] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const clockConfig = useMemo(() => timeControlConfig(timeControl), [timeControl]);
  const [whiteMs, setWhiteMs] = useState(clockConfig.initialMs);
  const [blackMs, setBlackMs] = useState(clockConfig.initialMs);
  const { feedback, celebrate } = useExperience();

  useEffect(() => {
    setWhiteMs(clockConfig.initialMs);
    setBlackMs(clockConfig.initialMs);
  }, [clockConfig.initialMs, initialFen, playerColor]);

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

    let cancelled = false;

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
        setError(
          cause instanceof Error
            ? cause.message
            : "The AI opponent could not be loaded.",
        );
        setEngineStatus("Opponent unavailable");
      });

    return () => {
      cancelled = true;
      engineRef.current?.quit();
      engineRef.current = null;
      setEngineReady(false);
    };
  }, [initialFen, playerColor, profile.name, scenario]);

  const playerToMove =
    gameRef.current.turn() === playerColor && !gameRef.current.isGameOver();

  useEffect(() => {
    if (timeControl === "untimed" || result || gameRef.current.isGameOver()) return;

    const interval = window.setInterval(() => {
      const active = gameRef.current.turn();
      if (active === "w") {
        setWhiteMs((current) => Math.max(0, current - 1000));
      } else {
        setBlackMs((current) => Math.max(0, current - 1000));
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [fen, result, timeControl]);

  useEffect(() => {
    if (timeControl === "untimed" || result || finishedRef.current) return;
    if (whiteMs <= 0) {
      void finalize(playerColor === "w" ? "loss" : "win", "timeout");
    } else if (blackMs <= 0) {
      void finalize(playerColor === "b" ? "loss" : "win", "timeout");
    }
  }, [blackMs, playerColor, result, timeControl, whiteMs]);

  function applyIncrement(color: Color) {
    if (!clockConfig.incrementMs) return;
    if (color === "w") {
      setWhiteMs((current) => current + clockConfig.incrementMs);
    } else {
      setBlackMs((current) => current + clockConfig.incrementMs);
    }
  }

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

    const chess = gameRef.current;
    chess.setHeader("Result", resultHeader(outcome, playerColor));
    const pgn = chess.pgn({ maxWidth: 80, newline: "\n" });
    const completedAt = new Date().toISOString();
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

    setResult(finished);
    setSendingReview(true);

    if (reason === "checkmate") feedback("mate");
    else feedback(outcome === "win" ? "complete" : outcome === "draw" ? "success" : "error");

    if (outcome === "win") celebrate(scenario ? "small" : "medium");
    else if (scenarioSuccess) celebrate("small");

    try {
      const analyzed = await onFinished(finished);
      setReviewSent(analyzed);
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
    if (result || error || thinking || !engineRef.current) return;

    const chess = gameRef.current;
    if (chess.isGameOver()) {
      finishIfNeeded();
      return;
    }

    if (chess.turn() === playerColor) return;

    let cancelled = false;
    setThinking(true);
    setEngineStatus(`${profile.name} is thinking…`);

    engineRef.current
      .chooseMove(chess.fen(), {
        skillLevel: profile.skillLevel,
        depth: profile.depth,
      })
      .then((evaluation) => {
        if (cancelled || finishedRef.current) return;

        if (!evaluation.bestMove || evaluation.bestMove === "(none)") {
          finishIfNeeded();
          return;
        }

        const move = uciMove(chess, evaluation.bestMove);
        if (!move) {
          setError("The AI returned an illegal move.");
          return;
        }

        setMoves((previous) => [...previous, move.san]);
        applyIncrement(move.color);
        setPresentationMove({
          from: move.from as Square,
          to: move.to as Square,
        });
        if (chess.inCheck()) feedback("check");
        else if (move.captured) feedback("capture");
        else feedback("move");
        setFen(chess.fen());
        setEngineStatus(`${profile.name} · ${profile.accent}`);
        finishIfNeeded();
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "The AI move could not be calculated.",
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
          <BrainCircuit size={15} />
          <span>{engineStatus}</span>
        </div>
      </div>

      <div className="game-layout">
        <div className="game-board-column">
          <div className="game-player-strip opponent">
            <div>
              <span className="game-player-mark" aria-hidden="true">
                <BrainCircuit size={15} />
              </span>
              <span>
                <strong>{profile.name}</strong>
                <small>{playerColor === "w" ? "Black" : "White"} · {profile.accent}</small>
              </span>
            </div>
            <div className={gameRef.current.turn() !== playerColor && !result ? "game-clock active" : "game-clock"}>
              <Clock3 size={14} />
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
              if (!playerToMove || thinking || result) return false;
              const chess = gameRef.current;

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

              setMoves((previous) => [...previous, move.san]);
              applyIncrement(move.color);
              setPresentationMove(undefined);
              setFen(chess.fen());
              finishIfNeeded();
              return true;
            }}
          />

          <div className="game-player-strip player">
            <div>
              <span className="game-player-mark you" aria-hidden="true">
                <ChessPiece color={playerColor} type="p" />
              </span>
              <span>
                <strong>You</strong>
                <small>{playerColor === "w" ? "White" : "Black"} · {clockConfig.label}</small>
              </span>
            </div>
            <div className={playerToMove && !result ? "game-clock active" : "game-clock"}>
              <Clock3 size={14} />
              <strong>
                {timeControl === "untimed"
                  ? "—:—"
                  : clockLabel(playerColor === "w" ? whiteMs : blackMs)}
              </strong>
            </div>
          </div>

          <div className="game-turn-line" aria-live="polite">
            <span>
              {result
                ? outcomeLabel(result.outcome)
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
            </div>
          )}

          {!result && (
            <button
              className="resign-button"
              type="button"
              disabled={!moves.length}
              onClick={() => void finalize("resigned", "resignation")}
            >
              <Flag size={15} /> Resign
            </button>
          )}

          {result && (
            <div className="game-result-card">
              <div className="game-result-symbol">
                {result.outcome === "win" ? (
                  <Sparkles size={24} />
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
                    <BrainCircuit size={16} />
                    <span>Saved and analyzed for Review</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit size={16} />
                    <span>Saved to Review · analysis can be retried</span>
                  </>
                )}
              </div>

              <button className="primary" type="button" onClick={onExit}>
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
  if (mode === "conversion") return <Sparkles size={20} />;
  return <Swords size={20} />;
}
