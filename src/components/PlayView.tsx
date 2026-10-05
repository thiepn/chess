import { useMemo, useState } from "react";
import type { Color } from "chess.js";
import {
  BrainCircuit,
  ChevronRight,
  Crown,
  Shield,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import type { SkillMastery } from "../domain/types";
import {
  aiProfiles,
  resolveAiProfile,
} from "../play/profiles";
import {
  scenarioById,
  trainingScenarios,
} from "../play/scenarios";
import type {
  AiProfileId,
  PlayResult,
  PlaySetup,
  TrainingScenario,
} from "../play/types";
import { GameArena } from "./GameArena";

interface PlayViewProps {
  mastery: Record<string, SkillMastery>;
  onGameFinished: (result: PlayResult) => Promise<boolean> | boolean;
  externalScenario?: TrainingScenario;
  onExternalScenarioExit?: () => void;
}

const profileOrder: AiProfileId[] = [
  "gentle",
  "developing",
  "club",
  "strong",
  "adaptive",
];

function scenarioIcon(mode: TrainingScenario["mode"]) {
  if (mode === "defense") return <Shield size={20} />;
  if (mode === "conversion") return <Crown size={20} />;
  if (mode === "endgame") return <Target size={20} />;
  return <Swords size={20} />;
}

export function PlayView({
  mastery,
  onGameFinished,
  externalScenario,
  onExternalScenarioExit,
}: PlayViewProps) {
  const [setup, setSetup] = useState<PlaySetup | null>(null);
  const [side, setSide] = useState<Color>("w");
  const [profileId, setProfileId] = useState<AiProfileId>("adaptive");

  const resolvedProfile = useMemo(
    () => resolveAiProfile(profileId, mastery),
    [mastery, profileId],
  );

  if (externalScenario) {
    const profile = resolveAiProfile(profileId, mastery);
    return (
      <GameArena
        initialFen={externalScenario.fen}
        playerColor={externalScenario.playerColor}
        profile={profile}
        scenario={externalScenario}
        onExit={() => onExternalScenarioExit?.()}
        onFinished={onGameFinished}
      />
    );
  }

  if (setup) {
    const scenario = setup.scenarioId
      ? scenarioById[setup.scenarioId]
      : undefined;
    const profile = resolveAiProfile(setup.aiProfileId, mastery);

    return (
      <GameArena
        initialFen={scenario?.fen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}
        playerColor={scenario?.playerColor ?? setup.playerColor}
        profile={profile}
        scenario={scenario}
        onExit={() => setSetup(null)}
        onFinished={onGameFinished}
      />
    );
  }

  return (
    <section className="play-view">
      <header className="section-hero compact">
        <div>
          <p className="eyebrow">PLAY</p>
          <h1>Play games that teach you.</h1>
          <p>
            Use a normal game when you want freedom, or start from a position
            chosen to train a specific chess skill. Every completed game feeds
            directly into Review.
          </p>
        </div>
        <div className="section-hero-icon" aria-hidden="true">
          <Swords size={30} />
        </div>
      </header>

      <section className="play-normal-card">
        <div className="play-normal-copy">
          <span className="pill">
            <Sparkles size={14} /> Full game
          </span>
          <h2>Normal training game</h2>
          <p>
            Start from move one. The opponent is intentionally configurable
            for learning—not presented as a fake precise Elo rating.
          </p>

          <div className="side-choice" aria-label="Choose your color">
            <button
              type="button"
              className={side === "w" ? "active" : ""}
              onClick={() => setSide("w")}
            >
              ♙ White
            </button>
            <button
              type="button"
              className={side === "b" ? "active" : ""}
              onClick={() => setSide("b")}
            >
              ♟ Black
            </button>
          </div>
        </div>

        <div className="play-launch">
          <div className="selected-profile">
            <BrainCircuit size={19} />
            <div>
              <span>Opponent</span>
              <strong>{resolvedProfile.name}</strong>
              <small>{resolvedProfile.accent}</small>
            </div>
          </div>
          <button
            className="primary"
            type="button"
            onClick={() =>
              setSetup({
                mode: "standard",
                playerColor: side,
                aiProfileId: profileId,
              })
            }
          >
            Start game <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <section className="play-section">
        <div className="review-section-heading">
          <div>
            <p className="eyebrow">OPPONENT</p>
            <h2>Choose the pressure.</h2>
          </div>
          <span>Adaptive is the default</span>
        </div>

        <div className="ai-profile-grid">
          {profileOrder.map((id) => {
            const profile =
              id === "adaptive"
                ? resolveAiProfile("adaptive", mastery)
                : aiProfiles[id];
            const active = profileId === id;

            return (
              <button
                type="button"
                key={id}
                className={active ? "ai-profile-card active" : "ai-profile-card"}
                onClick={() => setProfileId(id)}
              >
                <div>
                  <BrainCircuit size={18} />
                  {id === "adaptive" && <i>Recommended</i>}
                </div>
                <strong>{profile.name}</strong>
                <span>{profile.description}</span>
                <small>{profile.accent}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="play-section">
        <div className="review-section-heading">
          <div>
            <p className="eyebrow">TRAINING GAMES</p>
            <h2>Start where the lesson begins.</h2>
          </div>
          <span>Real play from targeted positions</span>
        </div>

        <div className="scenario-grid">
          {trainingScenarios.map((scenario) => (
            <article className="scenario-card" key={scenario.id}>
              <div className="scenario-icon">{scenarioIcon(scenario.mode)}</div>
              <div className="scenario-label">{scenario.sourceLabel}</div>
              <h3>{scenario.title}</h3>
              <strong>{scenario.subtitle}</strong>
              <p>{scenario.description}</p>
              <div className="scenario-objective">
                <span>Objective</span>
                <strong>{scenario.objective}</strong>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSetup({
                    mode: scenario.mode,
                    playerColor: scenario.playerColor,
                    aiProfileId: profileId,
                    scenarioId: scenario.id,
                  })
                }
              >
                Play position <ChevronRight size={16} />
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
