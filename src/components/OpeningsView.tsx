import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Compass,
  RotateCcw,
  Target,
  Activity,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import { ChessBoard } from "./ChessBoard";
import {
  openingNodes,
  pathToNode,
  repertoireById,
  repertoires,
} from "../openings/repertoire";
import {
  dueOpeningNodes,
  repertoireMastery,
  trainableOpeningNodes,
} from "../openings/progress";
import type {
  OpeningDeviation,
  OpeningProgress,
} from "../openings/types";
import type { ImportedGame } from "../games/types";
import { repertoireHealth } from "../openings/health";

interface OpeningsViewProps {
  progress: Record<string, OpeningProgress>;
  deviations: OpeningDeviation[];
  games: ImportedGame[];
  onTrainNode: (repertoireId: string, nodeId: string) => void;
  onTrainLine: (repertoireId: string, nodeId: string) => void;
  onBack: () => void;
}

export function OpeningsView({
  progress,
  deviations,
  games,
  onTrainNode,
  onTrainLine,
  onBack,
}: OpeningsViewProps) {
  const [repertoireId, setRepertoireId] = useState(repertoires[0].id);
  const repertoire = repertoireById[repertoireId];
  const [selectedNodeId, setSelectedNodeId] = useState(repertoire.rootNodeId);

  const selected = openingNodes[selectedNodeId];
  const path = useMemo(() => pathToNode(selectedNodeId), [selectedNodeId]);
  const due = dueOpeningNodes(repertoire, progress);
  const mastery = repertoireMastery(repertoire, progress);
  const trainable = trainableOpeningNodes(repertoire);
  const health = repertoireHealth(
    repertoire,
    progress,
    deviations,
    games,
  );
  const relevantDeviations = deviations.filter(
    (item) => item.repertoireId === repertoire.id && !item.resolved,
  );
  const hasConceptEvidence = repertoire.nodeIds.some(
    (id) => (progress[id]?.conceptAttempts ?? 0) > 0,
  );
  const hasLineEvidence = repertoire.nodeIds.some(
    (id) => (progress[id]?.lineAttempts ?? 0) > 0,
  );

  function switchRepertoire(nextId: string) {
    const next = repertoireById[nextId];
    setRepertoireId(nextId);
    setSelectedNodeId(next.rootNodeId);
  }

  return (
    <section className="openings-view">
      <header className="learn-subpage-head">
        <button className="learn-v2-back" type="button" onClick={onBack}>
          <ChevronLeft size={16} /> Course
        </button>
        <div>
          <p className="eyebrow">REPERTOIRE</p>
          <h1>Opening plans</h1>
          <p>
            Compact systems, recurring structures and recall from your own games.
          </p>
        </div>
      </header>

      <div className="repertoire-tabs">
        {repertoires.map((item) => (
          <button
            type="button"
            key={item.id}
            className={item.id === repertoire.id ? "active" : ""}
            onClick={() => switchRepertoire(item.id)}
          >
            <span>{item.versus}</span>
            <strong>{item.name}</strong>
          </button>
        ))}
      </div>

      <div className="repertoire-summary-grid">
        <article className="panel repertoire-summary">
          <div className="panel-title">
            <div>
              <p className="eyebrow">CURRENT SYSTEM</p>
              <h3>{repertoire.name}</h3>
            </div>
            <BookOpenCheck size={20} />
          </div>
          <p>{repertoire.summary}</p>

          <div className="repertoire-health-score">
            <Activity size={18} />
            <div>
              <span>Repertoire score</span>
              <strong>{health.health}%</strong>
              <small>
                {health.games
                  ? `${health.games} real games · ${health.deviationRate}% deviation rate`
                  : "No games yet · practice only"}
              </small>
            </div>
          </div>

          <div className="repertoire-metrics">
            <div>
              <span>Move recall</span>
              <strong>{mastery}%</strong>
            </div>
            <div>
              <span>Why recall</span>
              <strong>
                {hasConceptEvidence ? `${health.conceptMastery}%` : "—"}
              </strong>
            </div>
            <div>
              <span>Line rehearsal</span>
              <strong>
                {hasLineEvidence ? `${health.lineMastery}%` : "—"}
              </strong>
            </div>
            <div>
              <span>Due positions</span>
              <strong>{due.length}</strong>
            </div>
          </div>

          {health.weakestBranch && (
            <button
              className="repertoire-repair-row"
              type="button"
              onClick={() =>
                onTrainNode(
                  repertoire.id,
                  health.weakestBranch!.nodeId,
                )
              }
            >
              <ShieldCheck size={16} />
              <div>
                <span>Most missed line</span>
                <strong>{health.weakestBranch.label}</strong>
                <small>
                  {health.weakestBranch.games
                    ? `${health.weakestBranch.deviations}/${health.weakestBranch.games} times off line · ${health.weakestBranch.recall}% recall`
                    : `${health.weakestBranch.recall}% recall · not yet tested in games`}
                </small>
              </div>
              <ChevronRight size={16} />
            </button>
          )}

          <button
            className="primary repertoire-train-button"
            type="button"
            disabled={!due.length}
            onClick={() => {
              const first = due[0];
              if (first) onTrainNode(repertoire.id, first.id);
            }}
          >
            {due.length ? "Train due positions" : "Caught up"} <ChevronRight size={17} />
          </button>
        </article>

        <article className="panel deviation-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">FROM YOUR GAMES</p>
              <h3>{relevantDeviations.length} off-repertoire moments</h3>
            </div>
            <Target size={20} />
          </div>
          <p>
            This list only counts positions where <em>you</em> leave your chosen
            repertoire. Unlisted opponent moves are not marked as mistakes.
          </p>
          {health.branches.length > 0 && (
            <div className="repertoire-branch-health">
              {health.branches.slice(0, 3).map((branch) => (
                <button
                  key={branch.nodeId}
                  type="button"
                  onClick={() =>
                    onTrainNode(
                      repertoire.id,
                      branch.nodeId,
                    )
                  }
                >
                  <div>
                    <strong>{branch.label}</strong>
                    <span>
                      {branch.games
                        ? `${branch.games} games · ${branch.deviationRate}% off line`
                        : "practice only"}
                    </span>
                  </div>
                  <em>{branch.health}%</em>
                </button>
              ))}
            </div>
          )}
          {relevantDeviations.slice(0, 3).map((item) => {
            const node = openingNodes[item.nodeId];
            return (
              <button
                className="deviation-row"
                type="button"
                key={item.id}
                onClick={() => onTrainNode(item.repertoireId, item.nodeId)}
              >
                <div>
                  <strong>{node.name}</strong>
                  <span>Game move {Math.ceil(item.ply / 2)}</span>
                </div>
                <RotateCcw size={15} />
              </button>
            );
          })}
        </article>
      </div>

      <section className="repertoire-explorer">
        <div className="review-section-heading">
          <div>
            <p className="eyebrow">REPERTOIRE EXPLORER</p>
            <h2>Understand the branch.</h2>
          </div>
          <span>Curated tree · no memorization wall</span>
        </div>

        <div className="opening-explorer-grid">
          <article className="opening-tree">
            <div className="opening-path">
              {path.map((node, index) => (
                <button
                  key={node.id}
                  type="button"
                  className={node.id === selected.id ? "active" : ""}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <span>{index === 0 ? "Start" : node.sanFromParent}</span>
                  <strong>{node.name}</strong>
                </button>
              ))}
            </div>

            {selected.children.length > 0 && (
              <div className="opening-children">
                <span>Responses from here</span>
                {selected.children.map((id) => {
                  const child = openingNodes[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedNodeId(id)}
                    >
                      <strong>{child.sanFromParent}</strong>
                      <span>{child.name}</span>
                      {selected.preferredChildId === id && <i>Your move</i>}
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <article className="opening-position-panel">
            <ChessBoard
              fen={selected.fen}
              orientation={repertoire.color}
              disabled
              highlights={selected.keySquares.map((square) => ({
                square: square as never,
                tone: "focus" as const,
              }))}
            />

            <div className="opening-position-copy">
              <div>
                <p className="eyebrow">{selected.eco ?? "REPERTOIRE"}</p>
                <h3>{selected.name}</h3>
                <p>{selected.purpose}</p>
              </div>

              {selected.structure && (
                <div className="opening-structure-panel">
                  <span>Pawn structure</span>
                  <strong>{selected.structure}</strong>
                </div>
              )}

              {selected.tacticalMotifs.length > 0 && (
                <div className="opening-motif-strip">
                  <span>Typical tactics</span>
                  <div>
                    {selected.tacticalMotifs.map((motif) => (
                      <strong key={motif}>{motif}</strong>
                    ))}
                  </div>
                </div>
              )}

              {selected.concepts.length > 0 && (
                <div className="opening-concept-grid">
                  {selected.concepts.map((concept) => (
                    <div key={concept.title}>
                      <strong>{concept.title}</strong>
                      <span>{concept.body}</span>
                    </div>
                  ))}
                </div>
              )}

              {selected.plans.length > 0 && (
                <div className="opening-idea-list">
                  <span>Plans</span>
                  {selected.plans.map((plan) => <strong key={plan}>{plan}</strong>)}
                </div>
              )}

              {selected.commonMistakes.length > 0 && (
                <div className="opening-idea-list warning">
                  <span>Common mistake</span>
                  {selected.commonMistakes.map((mistake) => (
                    <strong key={mistake}>{mistake}</strong>
                  ))}
                </div>
              )}

              <div className="opening-position-actions">
                {selected.sideToMove === repertoire.color &&
                  selected.preferredChildId && (
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => onTrainNode(repertoire.id, selected.id)}
                    >
                      Practice this position
                    </button>
                  )}
                {path.length >= 3 && (
                  <button
                    className="secondary"
                    type="button"
                    onClick={() =>
                      onTrainLine(
                        repertoire.id,
                        selected.id,
                      )
                    }
                  >
                    <GitBranch size={15} />
                    Rehearse branch to here
                  </button>
                )}
              </div>
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}
