import { useEffect, useMemo, useState } from "react";
import { DEFAULT_POSITION, type Color } from "chess.js";
import {
  BrainCircuit,
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
import { GameArena } from "./GameArena";
import { LichessSyncCard } from "./LichessSyncCard";

interface PlayViewProps {
  mastery: Record<string, SkillMastery>;
  lichess?: LichessConnection;
  lichessSyncing: boolean;
  lichessSyncMessage?: string | null;
  lichessSyncError?: string | null;
  practicalPlan?: TrainingPrescription;
  routePath: string;
  onNavigate: (path: string) => void;
  onLinkLichess: (username: string) => Promise<void> | void;
  onUnlinkLichess: () => void;
  onSyncLichess: () => Promise<void> | void;
  onGameFinished: (result: PlayResult) => Promise<boolean> | boolean;
  externalScenario?: TrainingScenario;
  onExternalScenarioExit?: () => void;
}

interface PlaySessionSnapshot {
  path: string;
  setup: PlaySetup;
  scenario?: TrainingScenario;
}

const playSessionStorageKey = "chess:play-session-v1";

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

function readPlaySnapshot(path: string) {
  try {
    const raw = window.sessionStorage.getItem(playSessionStorageKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PlaySessionSnapshot;
    return parsed.path === path ? parsed : undefined;
  } catch {
    window.sessionStorage.removeItem(playSessionStorageKey);
    return undefined;
  }
}

export function PlayView({
  mastery,
  lichess,
  lichessSyncing,
  lichessSyncMessage,
  lichessSyncError,
  practicalPlan,
  routePath,
  onNavigate,
  onLinkLichess,
  onUnlinkLichess,
  onSyncLichess,
  onGameFinished,
  externalScenario,
  onExternalScenarioExit,
}: PlayViewProps) {
  const [side, setSide] = useState<Color>("w");
  const [profileId, setProfileId] = useState<AiProfileId>("adaptive");
  const [timeControl, setTimeControl] = useState<TimeControlId>("15+10");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const route = resolvePlayRoute(routePath);
  const resolvedProfile = useMemo(
    () => resolveAiProfile(profileId, mastery),
    [mastery, profileId],
  );

  const snapshot = route.mode === "game"
    ? readPlaySnapshot(routePath)
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
    };
    window.sessionStorage.setItem(
      playSessionStorageKey,
      JSON.stringify(nextSnapshot),
    );
    onNavigate(path);
  }, [externalScenario, onNavigate, profileId, route.mode]);

  function startGame(setup: PlaySetup, scenario?: TrainingScenario) {
    const path = playGamePath(setup);
    const nextSnapshot: PlaySessionSnapshot = {
      path,
      setup,
      scenario,
    };
    window.sessionStorage.setItem(
      playSessionStorageKey,
      JSON.stringify(nextSnapshot),
    );
    onNavigate(path);
  }

  function exitGame() {
    window.sessionStorage.removeItem(playSessionStorageKey);
    if (externalScenario || activeScenario?.mode === "replay") {
      onExternalScenarioExit?.();
    }
    onNavigate("/play");
  }

  if (route.mode === "game") {
    if (!activeSetup) {
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

    return (
      <section className="play-game-page">
        <GameArena
          initialFen={scenario?.fen ?? DEFAULT_POSITION}
          playerColor={playerColor}
          profile={profile}
          scenario={scenario}
          timeControl={scenario ? "untimed" : activeSetup.timeControl}
          onExit={exitGame}
          onFinished={onGameFinished}
          exitLabel="Back to Play"
        />
      </section>
    );
  }

  return (
    <section className="play-v2" aria-labelledby="play-setup-title">
      <div className="play-v2-board-column">
        <div className="play-v2-board-label">
          <span>{selectedScenario ? selectedScenario.sourceLabel : "STANDARD GAME"}</span>
          <span>{selectedScenario ? "Training position" : "Starting position"}</span>
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
            : "A complete training game. The finished PGN is saved directly into Review."}
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
              : "Choose the conditions, then play. No dashboard between you and the board."}
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
                  <BrainCircuit size={14} />
                  <span>
                    <strong>{profile.name}</strong>
                    <small>{profile.accent}</small>
                  </span>
                  {id === "adaptive" && <em>Recommended</em>}
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
            <p className="eyebrow">TRAINING POSITIONS</p>
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
