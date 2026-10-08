import { lazy, useEffect, useMemo, useState } from "react";
import { DEFAULT_POSITION, type Color } from "chess.js";
import {
  ChevronRight,
  Clock3,
  Compass,
  Link2,
  Shield,
  Swords,
  Target,
} from "lucide-react";
import type { SkillMastery } from "../domain/types";
import type { LichessConnection } from "../lichess/types";
import type { TrainingPrescription } from "../prescriptions/types";
import {
  aiProfiles,
  resolveAiProfile,
} from "../play/profiles";
import {
  scenarioById,
  trainingScenarios,
} from "../play/scenarios";
import {
  playGamePath,
  playReturnPath,
  resolvePlayRoute,
  setupFromGameKey,
} from "../play/playRoutes";
import type {
  AiProfileId,
  PlayResult,
  PlaySetup,
  TimeControlId,
  TrainingScenario,
} from "../play/types";
import { ChessBoard } from "./ChessBoard";
const GameArena = lazy(() =>
  import("./GameArena").then((module) => ({ default: module.GameArena })),
);
import { LichessSyncCard } from "./LichessSyncCard";
import { reviewGamePath } from "../review/reviewRoutes";
import { restoreCheckpoint, type GameCheckpoint } from "../play/gameRecovery";
import "../styles/p47-play-native.css";
import "../styles/p51-play-large.css";

interface PlayViewProps {
  mastery: Record<string, SkillMastery>;
  lichess?: LichessConnection;
  lichessSyncing: boolean;
  lichessSyncMessage?: string | null;
  lichessSyncError?: string | null;
  practicalPlan?: TrainingPrescription;
  routePath: string;
  storageOwner: string;
  onNavigate: (path: string, options?: { replace?: boolean }) => void;
  onLinkLichess: (username: string) => Promise<void> | void;
  onUnlinkLichess: () => void;
  onSyncLichess: () => Promise<void> | void;
  onGameFinished: (result: PlayResult) => Promise<boolean> | boolean;
  externalScenario?: TrainingScenario;
  externalScenarioReturnPath?: string;
  onExternalScenarioExit?: () => void;
}

interface PlaySessionSnapshot {
  path: string;
  setup: PlaySetup;
  scenario?: TrainingScenario;
  returnPath?: string;
  checkpoint?: GameCheckpoint;
}

const playStoragePrefix = "chess:play-session-v2:";
function storageKey(owner: string) { return playStoragePrefix + encodeURIComponent(owner); }

const profileOrder: AiProfileId[] = [
  "gentle",
  "developing",
  "club",
  "strong",
  "adaptive",
];

const timeControls: Array<{
  id: TimeControlId;
  label: string;
  description: string;
}> = [
  { id: "untimed", label: "Untimed", description: "Study pace" },
  { id: "10+0", label: "10+0", description: "Rapid" },
  { id: "15+10", label: "15+10", description: "Training" },
];

function readPlaySnapshot(owner: string): PlaySessionSnapshot | undefined {
  try {
    const raw = window.localStorage.getItem(storageKey(owner));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PlaySessionSnapshot;
    if (!parsed || typeof parsed.path !== "string" || !parsed.setup) return undefined;
    return parsed;
  } catch {
    // Preserve an unreadable snapshot for manual recovery; never delete it.
    return undefined;
  }
}
function writePlaySnapshot(owner: string, snapshot: PlaySessionSnapshot): boolean {
  try {
    window.localStorage.setItem(storageKey(owner), JSON.stringify(snapshot));
    return true;
  } catch { return false; }
}
function clearPlaySnapshot(owner: string) {
  try { window.localStorage.removeItem(storageKey(owner)); } catch { /* Storage blocked */ }
}

export function PlayView({
  mastery,
  lichess,
  lichessSyncing,
  lichessSyncMessage,
  lichessSyncError,
  practicalPlan,
  routePath,
  storageOwner,
  onNavigate,
  onLinkLichess,
  onUnlinkLichess,
  onSyncLichess,
  onGameFinished,
  externalScenario,
  externalScenarioReturnPath,
  onExternalScenarioExit,
}: PlayViewProps) {
  const [side, setSide] = useState<Color>("w");
  const [profileId, setProfileId] = useState<AiProfileId>("adaptive");
  const [timeControl, setTimeControl] = useState<TimeControlId>("15+10");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const route = resolvePlayRoute(routePath);
  const resolvedProfile = useMemo(
    () => resolveAiProfile(profileId, mastery),
    [mastery, profileId],
  );

  const latestSnapshot = readPlaySnapshot(storageOwner);
  const snapshot = route.mode === "game" && latestSnapshot?.path === routePath
    ? latestSnapshot
    : undefined;

  const routeSetup = route.gameKey
    ? setupFromGameKey(route.gameKey)
    : undefined;

  const activeSetup = snapshot?.setup ?? routeSetup;
  const activeScenario =
    snapshot?.scenario ??
    (activeSetup?.scenarioId
      ? scenarioById[activeSetup.scenarioId]
      : undefined);

  const selectedScenario = selectedScenarioId
    ? scenarioById[selectedScenarioId]
    : undefined;

  useEffect(() => {
    if (!externalScenario || route.mode === "game") return;

    const setup: PlaySetup = {
      mode: externalScenario.mode,
      playerColor: externalScenario.playerColor,
      aiProfileId: profileId,
      timeControl: "untimed",
      scenarioId: externalScenario.id,
    };
    const path = playGamePath(setup);
    const nextSnapshot: PlaySessionSnapshot = {
      path,
      setup,
      scenario: externalScenario,
      returnPath: externalScenarioReturnPath,
    };
    if (!writePlaySnapshot(storageOwner, nextSnapshot)) setSaveFailed(true);
    // Replay is one routed action: do not leave a temporary Play setup in history.
    onNavigate(path, { replace: true });
  }, [externalScenario, externalScenarioReturnPath, onNavigate, profileId, route.mode, storageOwner]);

  function startGame(setup: PlaySetup, scenario?: TrainingScenario) {
    const path = playGamePath(setup);
    const nextSnapshot: PlaySessionSnapshot = {
      path,
      setup,
      scenario,
    };
    if (!writePlaySnapshot(storageOwner, nextSnapshot)) setSaveFailed(true);
    onNavigate(path);
  }

  function exitGame() {
    if (!snapshot?.checkpoint?.finished && (snapshot?.checkpoint?.moves.length ?? 0) > 0 &&
        !window.confirm("Discard this unfinished game?")) return;
    const destination = playReturnPath(snapshot?.returnPath);
    clearPlaySnapshot(storageOwner);
    if (externalScenario || activeScenario?.mode === "replay") {
      onExternalScenarioExit?.();
    }
    onNavigate(destination, { replace: true });
  }

  function openFinishedGameReview(gameId: string) {
    clearPlaySnapshot(storageOwner);
    onExternalScenarioExit?.();
    // Browser Back must never restart a completed game.
    onNavigate(reviewGamePath(gameId), { replace: true });
  }

  if (route.mode === "game") {
    const missingDynamicScenario =
      Boolean(activeSetup?.scenarioId) &&
      !activeScenario &&
      !scenarioById[activeSetup!.scenarioId!];

    if (!snapshot || !activeSetup || missingDynamicScenario) {
      return (
        <section className="play-game-recovery">
          <strong>Game session unavailable</strong>
          <p>
            This game could not be restored. Return to Play and start a new one.
          </p>
          <button className="secondary" type="button" onClick={exitGame}>
            Back to Play
          </button>
        </section>
      );
    }

    const scenario = activeScenario ??
      (activeSetup.scenarioId
        ? scenarioById[activeSetup.scenarioId]
        : undefined);
    const profile = resolveAiProfile(activeSetup.aiProfileId, mastery);
    const playerColor = scenario?.playerColor ?? activeSetup.playerColor;
    const initialFen = scenario?.fen ?? DEFAULT_POSITION;
    let recoveryError: string | null = null;
    try {
      restoreCheckpoint(initialFen, snapshot.checkpoint,
        scenario ? "untimed" : activeSetup.timeControl ?? "untimed", Date.now());
    } catch (error) {
      recoveryError = error instanceof Error ? error.message : "The saved game cannot be restored.";
    }
    if (recoveryError) return (
      <section className="play-game-recovery" role="alert">
        <strong>Saved game needs recovery</strong>
        <p>{recoveryError}</p>
        <button className="secondary" type="button" onClick={() => {
          const raw = localStorage.getItem(storageKey(storageOwner));
          if (!raw) return;
          const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = "chess-unfinished-game.json";
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>Export recovery file</button>
        <button className="secondary" type="button" onClick={() => onNavigate("/play", { replace: true })}>Back to Play</button>
      </section>
    );

    return (
      <section className="play-game-page">
        {saveFailed && <p role="alert">Game cannot be saved on this browser. Do not close this tab.</p>}
        <GameArena
          initialFen={initialFen}
          checkpoint={snapshot.checkpoint}
          onCheckpoint={(checkpoint) => {
            const current = readPlaySnapshot(storageOwner);
            if (current?.path !== routePath) return;
            if (!writePlaySnapshot(storageOwner, { ...current, checkpoint })) setSaveFailed(true);
          }}
          playerColor={playerColor}
          profile={profile}
          scenario={scenario}
          timeControl={scenario ? "untimed" : activeSetup.timeControl}
          onExit={exitGame}
          onFinished={onGameFinished}
          onOpenReview={openFinishedGameReview}
          exitLabel={snapshot?.returnPath ? "Return to previous page" : "Back to Play"}
        />
      </section>
    );
  }

  return (
    <section className="play-v2" aria-labelledby="play-setup-title">
      {saveFailed && <p role="alert">Game storage is unavailable. Check browser storage settings before playing.</p>}
      {latestSnapshot?.checkpoint && !latestSnapshot.checkpoint.finished && (
        <div className="play-resume-notice">
          <strong>Unfinished game</strong>
          <button type="button" className="secondary" onClick={() => onNavigate(latestSnapshot.path)}>
            Resume saved game
          </button>
        </div>
      )}
      <div className="play-v2-board-column">
        <div className="play-v2-board-label">
          <span>{selectedScenario ? selectedScenario.sourceLabel : "STANDARD GAME"}</span>
          <span>{selectedScenario ? "Practice position" : "Starting position"}</span>
        </div>
        <ChessBoard
          key={selectedScenario?.id ?? "standard-preview"}
          fen={selectedScenario?.fen ?? DEFAULT_POSITION}
          orientation={selectedScenario?.playerColor ?? side}
          disabled
        />
        <div className="play-v2-board-note">
          {selectedScenario
            ? selectedScenario.objective
            : "Play a full game. When it ends, the game is ready in Review."}
        </div>
      </div>

      <aside className="play-v2-setup">
        <div className="play-v2-setup-head">
          <p className="eyebrow">PLAY</p>
          <h1 id="play-setup-title">
            {selectedScenario ? selectedScenario.title : "New game"}
          </h1>
          <p>
            {selectedScenario
              ? selectedScenario.description
              : "Choose your color, time, and opponent, then play."}
          </p>
        </div>

        {!selectedScenario && (
          <>
            <fieldset className="play-v2-control-group">
              <legend>Color</legend>
              <div className="play-v2-segmented">
                <button
                  type="button"
                  className={side === "w" ? "active" : ""}
                  aria-pressed={side === "w"}
                  onClick={() => setSide("w")}
                >
                  White
                </button>
                <button
                  type="button"
                  className={side === "b" ? "active" : ""}
                  aria-pressed={side === "b"}
                  onClick={() => setSide("b")}
                >
                  Black
                </button>
              </div>
            </fieldset>

            <fieldset className="play-v2-control-group">
              <legend>Time</legend>
              <div className="play-v2-time-list">
                {timeControls.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={timeControl === item.id ? "active" : ""}
                    aria-pressed={timeControl === item.id}
                    onClick={() => setTimeControl(item.id)}
                  >
                    <Clock3 size={14} />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <fieldset className="play-v2-control-group">
          <legend>Opponent</legend>
          <div className="play-v2-opponent-list">
            {profileOrder.map((id) => {
              const profile =
                id === "adaptive"
                  ? resolveAiProfile("adaptive", mastery)
                  : aiProfiles[id];
              return (
                <button
                  key={id}
                  type="button"
                  className={profileId === id ? "active" : ""}
                  aria-pressed={profileId === id}
                  onClick={() => setProfileId(id)}
                >
                  <Shield size={14} />
                  <span>
                    <strong>{profile.name}</strong>
                    <small>{profile.accent}</small>
                  </span>
                  {id === "adaptive" && <em>Your level</em>}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="play-v2-start-block">
          <div>
            <span>Opponent</span>
            <strong>{resolvedProfile.name}</strong>
          </div>
          <button
            className="primary"
            type="button"
            onPointerEnter={() => void import("./GameArena")}
            onFocus={() => void import("./GameArena")}
            onClick={() => {
              if (selectedScenario) {
                startGame(
                  {
                    mode: selectedScenario.mode,
                    playerColor: selectedScenario.playerColor,
                    aiProfileId: profileId,
                    timeControl: "untimed",
                    scenarioId: selectedScenario.id,
                  },
                  selectedScenario,
                );
              } else {
                startGame({
                  mode: "standard",
                  playerColor: side,
                  aiProfileId: profileId,
                  timeControl,
                });
              }
            }}
          >
            {selectedScenario ? "Play position" : "Start game"}
            <ChevronRight size={17} />
          </button>
        </div>
      </aside>

      <section className="play-v2-scenarios" aria-labelledby="scenario-heading">
        <header>
          <div>
            <p className="eyebrow">PRACTICE POSITIONS</p>
            <h2 id="scenario-heading">Start where the decision matters</h2>
          </div>
          {selectedScenario && (
            <button type="button" onClick={() => setSelectedScenarioId(null)}>
              Standard game
            </button>
          )}
        </header>

        <div className="play-v2-scenario-list">
          {trainingScenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className={selectedScenarioId === scenario.id ? "active" : ""}
              aria-pressed={selectedScenarioId === scenario.id}
              onClick={() => setSelectedScenarioId(scenario.id)}
            >
              <span className="play-v2-scenario-icon">
                {scenario.mode === "defense" ? (
                  <Shield size={16} />
                ) : scenario.mode === "endgame" ? (
                  <Target size={16} />
                ) : scenario.mode === "opening" ? (
                  <Compass size={16} />
                ) : (
                  <Swords size={16} />
                )}
              </span>
              <span>
                <small>{scenario.sourceLabel}</small>
                <strong>{scenario.title}</strong>
                <em>{scenario.subtitle}</em>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      </section>

      <section className="play-v2-human" aria-labelledby="human-play-title">
        <header>
          <Link2 size={17} />
          <div>
            <p className="eyebrow">HUMAN GAMES</p>
            <h2 id="human-play-title">Lichess connection</h2>
          </div>
        </header>

        {practicalPlan && (
          <div className="play-v2-game-plan">
            <span>Next-game focus</span>
            <strong>{practicalPlan.title}</strong>
            <p>{practicalPlan.rationale}</p>
          </div>
        )}

        <LichessSyncCard
          connection={lichess}
          syncing={lichessSyncing}
          message={lichessSyncMessage}
          error={lichessSyncError}
          onLink={onLinkLichess}
          onUnlink={onUnlinkLichess}
          onSync={onSyncLichess}
        />
      </section>
    </section>
  );
}
