import { lazy, Suspense, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Compass,
  RefreshCcw,
  Target,
} from "lucide-react";
import { domainLabels, skillById } from "../domain/curriculum";
import { repertoireById } from "../openings/repertoire";
import {
  modelGames,
} from "../model-games/games";
import {
  currentModelGameScore,
} from "../model-games/progress";
import type {
  ModelGameProgress,
} from "../model-games/types";

const MasterGameLibrary = lazy(() => import("./MasterGameLibrary").then((module) => ({ default: module.MasterGameLibrary })));

interface ModelGamesViewProps {
  owner: string;
  progress: Record<string, ModelGameProgress>;
  onStartGame: (gameId: string) => void;
  onBack: () => void;
  focusSkillId?:string;
}

export function ModelGamesView({
  owner,
  progress,
  onStartGame,
  onBack,
  focusSkillId,
}: ModelGamesViewProps) {
  const [openMaster, setOpenMaster] = useState(Boolean(focusSkillId));
  // Once opened, keep the original workspace mounted across simple collapse.
  // The owner-keyed subtree still discards all in-memory private work on Account change.
  const [masterMounted, setMasterMounted] = useState(Boolean(focusSkillId));
  const completed = modelGames.filter(
    (game) =>
      (progress[game.id]?.completions ?? 0) > 0,
  ).length;
  const checkpoints = modelGames.reduce(
    (sum, game) => sum + game.checkpoints.length,
    0,
  );
  const learned = modelGames.reduce(
    (sum, game) =>
      sum +
      (progress[game.id]?.completedCheckpointIds
        .length ?? 0),
    0,
  );

  return (
    <section className="model-games-view">
      <header className="learn-subpage-head">
        <button className="learn-v2-back" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Course
        </button>
        <div>
          <p className="eyebrow">MODEL GAMES</p>
          <h1>Plans in complete games</h1>
          <p>
            Pause at the critical decisions, name the plan, then find the move.
          </p>
          {focusSkillId && <p>Course focus: {skillById[focusSkillId]?.title ?? "Advanced decisions"}. Historical comparisons are unscored instruction, not certified skill mastery.</p>}
        </div>
      </header>

      <div className="model-game-metrics">
        <div>
          <BookOpen size={18} />
          <span>Curated games</span>
          <strong>{modelGames.length}</strong>
        </div>
        <div>
          <Target size={18} />
          <span>Active decisions</span>
          <strong>{learned}/{checkpoints}</strong>
        </div>
        <div>
          <RefreshCcw size={18} />
          <span>Games completed</span>
          <strong>{completed}/{modelGames.length}</strong>
        </div>
      </div>

      <div className="model-game-grid">
        {modelGames.map((game) => {
          const gameProgress = progress[game.id];
          const score = currentModelGameScore(
            gameProgress,
            game,
          );
          const completeCount =
            gameProgress?.completedCheckpointIds
              .length ?? 0;
          const repertoire = game.repertoireId
            ? repertoireById[game.repertoireId]
            : undefined;

          return (
            <article className="model-game-card" key={game.id}>
              <div className="model-game-card-top">
                <span>{game.year}</span>
                <strong>{game.result}</strong>
              </div>

              <p className="eyebrow">{game.event}</p>
              <h2>{game.title}</h2>
              <strong className="model-game-players">
                {game.players}
              </strong>
              <p>{game.summary}</p>

              {repertoire && (
                <div className="model-game-repertoire">
                  <Compass size={15} />
                  <div>
                    <span>YOUR REPERTOIRE</span>
                    <strong>{repertoire.name}</strong>
                  </div>
                </div>
              )}

              <div className="model-game-skills">
                {game.skillIds.slice(0, 4).map((skillId) => {
                  const skill = skillById[skillId];
                  return skill ? (
                    <span key={skillId}>
                      {domainLabels[skill.domain]} · {skill.title}
                    </span>
                  ) : null;
                })}
              </div>

              <div className="model-game-progress">
                <div>
                  <span>
                    {completeCount}/{game.checkpoints.length} decisions
                  </span>
                  <strong>
                    {score > 0 ? `${score}%` : "New"}
                  </strong>
                </div>
                <div className="track">
                  <i
                    style={{
                      width: `${(completeCount / game.checkpoints.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <button
                className="model-game-start"
                type="button"
                onClick={() => onStartGame(game.id)}
              >
                {completeCount === 0
                  ? "Study game"
                  : completeCount < game.checkpoints.length
                    ? "Continue"
                    : "Study again"}
                <ChevronRight size={16} />
              </button>
            </article>
          );
        })}
      </div>

      <section className="model-game-method">
        <div>
          <p className="eyebrow">HOW THIS TEACHES</p>
          <h2>Strategy becomes a decision, not a paragraph.</h2>
        </div>
        <p>
          Each checkpoint asks for the plan first. Only then do you play
          the historical move. Hints lower the score for that decision, and
          any useful position can be saved for later practice.
        </p>
      </section>
      <section className="p113-launch" aria-label="P113 historical complete game lab">
        <p className="eyebrow">P113 · NEXT STAGE</p>
        <h2>Study complete master games</h2>
        <p>Eight additional source-grounded historical scores, 32 independent decision points, move-by-move replay, local legal variations and unscored writing. The four existing scored model games above remain unchanged.</p>
        <button className="secondary" type="button" aria-expanded={openMaster}
          aria-controls={openMaster ? "historical-master-workspace" : undefined}
          onClick={() => {
            if (!openMaster) setMasterMounted(true);
            setOpenMaster(!openMaster);
          }}>
          {openMaster ? "Hide master-game workspace" : "Open master-game workspace"}
        </button>
      </section>
      {masterMounted && <div id="historical-master-workspace" hidden={!openMaster}
        style={{ display: openMaster ? "block" : "none" }}>
        <Suspense fallback={<p role="status">Opening master-game workspace…</p>}>
          <MasterGameLibrary key={owner} owner={owner} focusSkillId={focusSkillId}/>
        </Suspense>
      </div>}
    </section>
  );
}
