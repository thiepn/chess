import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Compass,
  RotateCcw,
  Target,
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

interface OpeningsViewProps {
  progress: Record<string, OpeningProgress>;
  deviations: OpeningDeviation[];
  onTrainNode: (repertoireId: string, nodeId: string) => void;
  onBack: () => void;
}

export function OpeningsView({
  progress,
  deviations,
  onTrainNode,
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
  const relevantDeviations = deviations.filter(
    (item) => item.repertoireId === repertoire.id && !item.resolved,
  );

  function switchRepertoire(nextId: string) {
    const next = repertoireById[nextId];
    setRepertoireId(nextId);
    setSelectedNodeId(next.rootNodeId);
  }

  return (
    <section className="openings-view">
      <button className="back-link" type="button" onClick={onBack}>
        <ChevronLeft size={16} /> Learn
      </button>

      <header className="section-hero compact opening-hero">
        <div>
          <p className="eyebrow">YOUR REPERTOIRE</p>
          <h1>Know plans, not move dumps.</h1>
          <p>
            Three compact systems cover your default White game and your main
            Black responses. Lines stay short until repeated games prove you
            actually need more depth.
          </p>
        </div>
        <div className="section-hero-icon" aria-hidden="true">
          <Compass size={30} />
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

          <div className="repertoire-metrics">
            <div>
              <span>Recall mastery</span>
              <strong>{mastery}%</strong>
            </div>
            <div>
              <span>Due positions</span>
              <strong>{due.length}</strong>
            </div>
            <div>
              <span>Tracked positions</span>
              <strong>{trainable.length}</strong>
            </div>
          </div>

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
              <h3>{relevantDeviations.length} deviations</h3>
            </div>
            <Target size={20} />
          </div>
          <p>
            A deviation is only counted when <em>you</em> leave your chosen
            repertoire. Unmodeled opponent moves are not treated as errors.
          </p>
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
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}
