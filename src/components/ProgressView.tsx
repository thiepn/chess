import {
  ArrowLeft,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Gauge,
} from "lucide-react";
import type { ProgressIntelligence, TrendPoint } from "../analytics/types";
import { skillTitle, stageTitle } from "../analytics/engine";

interface ProgressViewProps {
  intelligence: ProgressIntelligence;
  onBack: () => void;
}

function deltaLabel(value: number) {
  if (Math.abs(value) < .1) return "No measured change";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} in 30 days`;
}

function interventionLabel(value: string) {
  const labels: Record<string, string> = {
    review: "Spaced review",
    weakness: "Weakness training",
    game: "Personal mistakes",
    curriculum: "Curriculum",
    repertoire: "Opening recall",
    library: "Saved studies",
    assessment: "Checkpoint repair",
    calibration: "Calibration",
    focus: "Manual focus",
    manual: "Manual study",
    placement: "Placement",
    checkpoint: "Checkpoint",
    play: "Training games",
    "game-review": "Game review",
  };
  return labels[value] ?? value;
}

function calibrationText(
  label: ProgressIntelligence["calibration"]["label"],
) {
  if (label === "well-calibrated") {
    return "The player model is predicting assessment performance reasonably well.";
  }
  if (label === "overconfident") {
    return "The model currently expects more success than checkpoints are showing.";
  }
  if (label === "underconfident") {
    return "Assessment performance is stronger than the current mastery estimates predict.";
  }
  return "More placement/checkpoint samples are needed before calibration is meaningful.";
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const width = 720;
  const height = 230;
  const padX = 30;
  const padY = 24;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;

  function pathFor(key: "mastery" | "retention" | "transfer") {
    return points
      .map((point, index) => {
        const x =
          padX +
          (points.length <= 1
            ? 0
            : (index / (points.length - 1)) * innerWidth);
        const y =
          padY +
          (1 - point[key] / 100) * innerHeight;
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div className="progress-chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Eight-week mastery, retention and transfer trend"
      >
        {[0, 25, 50, 75, 100].map((value) => {
          const y = padY + (1 - value / 100) * innerHeight;
          return (
            <g key={value}>
              <line
                className="progress-grid-line"
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
              />
              <text
                className="progress-grid-label"
                x={4}
                y={y + 3}
              >
                {value}
              </text>
            </g>
          );
        })}

        <polyline
          className="progress-line mastery"
          points={pathFor("mastery")}
        />
        <polyline
          className="progress-line retention"
          points={pathFor("retention")}
        />
        <polyline
          className="progress-line transfer"
          points={pathFor("transfer")}
        />

        {points.map((point, index) => {
          const x =
            padX +
            (points.length <= 1
              ? 0
              : (index / (points.length - 1)) * innerWidth);
          return (
            <text
              key={point.at}
              className="progress-axis-label"
              x={x}
              y={height - 3}
              textAnchor="middle"
            >
              {point.label}
            </text>
          );
        })}
      </svg>

      <div className="progress-chart-legend">
        <span><i className="mastery" /> Mastery</span>
        <span><i className="retention" /> Retention</span>
        <span><i className="transfer" /> Transfer</span>
      </div>
    </div>
  );
}

export function ProgressView({
  intelligence,
  onBack,
}: ProgressViewProps) {
  const calibrated = intelligence.calibration.sampleCount >= 5;
  const strongestIntervention = intelligence.interventions[0];

  return (
    <section className="progress-view">
      <button className="back-link" type="button" onClick={onBack}>
        <ArrowLeft size={16} /> Home
      </button>

      <header className="section-hero progress-hero">
        <div>
          <p className="eyebrow">PROGRESS INTELLIGENCE</p>
          <h1>Are you actually getting better?</h1>
          <p>
            This view separates short-term success from retained skill,
            transfer into play, assessment calibration and recurring game
            weaknesses.
          </p>
        </div>
        <div className="section-hero-icon" aria-hidden="true">
          <TrendingUp size={30} />
        </div>
      </header>

      <div className="progress-kpi-grid">
        <article>
          <div><BrainCircuit size={18} /><span>Effective mastery</span></div>
          <strong>{intelligence.mastery}%</strong>
          <small>{deltaLabel(intelligence.masteryDelta30)}</small>
        </article>
        <article>
          <div><RefreshCcw size={18} /><span>Retention health</span></div>
          <strong>{intelligence.retention}%</strong>
          <small>Expected recall from current stability</small>
        </article>
        <article>
          <div><Target size={18} /><span>Transfer</span></div>
          <strong>{intelligence.transfer}%</strong>
          <small>
            Human {intelligence.humanTransfer}% · AI {intelligence.aiTransfer}%
          </small>
        </article>
        <article>
          <div><ShieldCheck size={18} /><span>Calibration</span></div>
          <strong>
            {calibrated ? `${intelligence.calibration.score}%` : "—"}
          </strong>
          <small>
            {calibrated
              ? intelligence.calibration.label.replace("-", " ")
              : `${intelligence.calibration.sampleCount}/5 samples`}
          </small>
        </article>
      </div>

      <section className="progress-panel practical-strength-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">PRACTICAL STRENGTH</p>
            <h2>Human-game performance, separated from training.</h2>
          </div>
          <Gauge size={20} />
        </div>

        <div className="practical-strength-grid">
          <div className="practical-rating-card">
            <span>THIEPN practical rating</span>
            <strong>{intelligence.practicalStrength.rating}</strong>
            <small>
              {intelligence.practicalStrength.status} · {intelligence.practicalStrength.confidence}% confidence
            </small>
          </div>

          <div className="practical-signal-grid">
            <div>
              <span>Human transfer</span>
              <strong>{intelligence.practicalStrength.humanTransfer}%</strong>
            </div>
            <div>
              <span>AI / training transfer</span>
              <strong>{intelligence.practicalStrength.aiTransfer}%</strong>
            </div>
            <div>
              <span>Human-game quality</span>
              <strong>{intelligence.practicalStrength.quality}%</strong>
            </div>
            <div>
              <span>Consistency</span>
              <strong>{intelligence.practicalStrength.consistency}%</strong>
            </div>
          </div>
        </div>

        <div className="practical-context-row">
          <div>
            <Users size={16} />
            <span>
              {intelligence.practicalStrength.humanGames} analyzed human game{intelligence.practicalStrength.humanGames === 1 ? "" : "s"}
              {intelligence.practicalStrength.averageOpponentRating
                ? ` · avg opponent ${intelligence.practicalStrength.averageOpponentRating}`
                : ""}
            </span>
          </div>
          <div>
            <Target size={16} />
            <span>
              result performance {intelligence.practicalStrength.resultPerformance}%
            </span>
          </div>
        </div>

        {intelligence.practicalStrength.timeControls.length > 0 && (
          <div className="practical-time-controls">
            {intelligence.practicalStrength.timeControls.map((item) => (
              <div key={item.category}>
                <span>{item.category}</span>
                <strong>{item.quality}%</strong>
                <small>{item.games} game{item.games === 1 ? "" : "s"}</small>
              </div>
            ))}
          </div>
        )}

        <p className="practical-rating-note">
          This is an internal learning-strength estimate, not a Lichess Elo clone.
          Opponent rating only adds modest context; engine quality, consistency,
          curriculum mastery and demonstrated human transfer carry most of the model.
        </p>
      </section>

      <section className="progress-panel progress-trajectory">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">8-WEEK TRAJECTORY</p>
            <h2>Learning that survives the lesson.</h2>
          </div>
          <div className="progress-evidence-chip">
            <BarChart3 size={15} />
            <span>{intelligence.evidenceCount30} evidence events · 30d</span>
          </div>
        </div>

        <TrendChart points={intelligence.trend} />

        <div className="progress-calibration-note">
          <ShieldCheck size={18} />
          <div>
            <strong>
              Calibration: {calibrated
                ? intelligence.calibration.label.replace("-", " ")
                : "collecting evidence"}
            </strong>
            <span>{calibrationText(intelligence.calibration.label)}</span>
          </div>
        </div>
      </section>

      <div className="progress-two-column">
        <section className="progress-panel">
          <div className="progress-section-heading">
            <div>
              <p className="eyebrow">WHAT IS IMPROVING</p>
              <h2>Skills moving in the right direction.</h2>
            </div>
            <TrendingUp size={19} />
          </div>

          <div className="progress-skill-list">
            {intelligence.improving.length ? (
              intelligence.improving.map((item) => (
                <div className="progress-skill-row" key={item.skillId}>
                  <div>
                    <strong>{skillTitle(item.skillId)}</strong>
                    <span>
                      {item.evidenceCount30} recent evidence · human {item.humanTransfer}% · AI {item.aiTransfer}%
                    </span>
                  </div>
                  <div className="progress-skill-value positive">
                    +{Math.max(0, item.delta30).toFixed(1)}
                  </div>
                </div>
              ))
            ) : (
              <div className="progress-empty">
                <span>New history will appear here as you train.</span>
              </div>
            )}
          </div>
        </section>

        <section className="progress-panel">
          <div className="progress-section-heading">
            <div>
              <p className="eyebrow">NEEDS ATTENTION</p>
              <h2>Low retention or weak transfer.</h2>
            </div>
            <Target size={19} />
          </div>

          <div className="progress-skill-list">
            {intelligence.needsAttention.map((item) => (
              <div className="progress-skill-row" key={item.skillId}>
                <div>
                  <strong>{skillTitle(item.skillId)}</strong>
                  <span>
                    mastery {item.current}% · retention {item.retention}% · human {item.humanTransfer}% · AI {item.aiTransfer}%
                  </span>
                </div>
                <div className="progress-skill-value">
                  {item.current}%
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="progress-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">STAGE VELOCITY</p>
            <h2>How quickly competence becomes certified.</h2>
          </div>
          <Clock3 size={19} />
        </div>

        <div className="stage-velocity-grid">
          {intelligence.stages.map((stage) => (
            <article
              className={stage.certifiedAt ? "stage-velocity certified" : "stage-velocity"}
              key={stage.stageId}
            >
              <div className="stage-velocity-top">
                <span>{stageTitle(stage.stageId)}</span>
                {stage.certifiedAt ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <Clock3 size={15} />
                )}
              </div>
              <strong>
                {stage.certifiedAt
                  ? `${stage.days}d to certify`
                  : stage.startedAt
                    ? `${stage.days}d active`
                    : "Not started"}
              </strong>
              <div>
                <span>M {stage.mastery}%</span>
                <span>R {stage.retention}%</span>
                <span>T {stage.transfer}%</span>
              </div>
              <small>{stage.evidenceCount} evidence events</small>
            </article>
          ))}
        </div>
      </section>

      <div className="progress-two-column">
        <section className="progress-panel">
          <div className="progress-section-heading">
            <div>
              <p className="eyebrow">WHAT WORKS FOR YOU</p>
              <h2>Intervention effectiveness.</h2>
            </div>
            <Sparkles size={19} />
          </div>

          {strongestIntervention && (
            <div className="best-intervention">
              <span>Best current signal</span>
              <strong>{interventionLabel(strongestIntervention.intervention)}</strong>
              <small>
                {strongestIntervention.successRate}% success across {strongestIntervention.attempts} recent attempts
              </small>
            </div>
          )}

          <div className="intervention-table">
            {intelligence.interventions.slice(0, 6).map((item) => (
              <div key={item.intervention}>
                <span>{interventionLabel(item.intervention)}</span>
                <strong>{item.successRate}%</strong>
                <small>
                  ΔM {item.averageMasteryGain >= 0 ? "+" : ""}
                  {item.averageMasteryGain.toFixed(1)}
                </small>
                <small>{item.attempts} samples</small>
              </div>
            ))}
            {!intelligence.interventions.length && (
              <div className="progress-empty">
                <span>Complete more training to compare interventions.</span>
              </div>
            )}
          </div>
        </section>

        <section className="progress-panel">
          <div className="progress-section-heading">
            <div>
              <p className="eyebrow">GAME WEAKNESSES</p>
              <h2>Recurring versus repaired.</h2>
            </div>
            <RefreshCcw size={19} />
          </div>

          <div className="weakness-resolution-grid">
            <div>
              <span>Unresolved mistakes</span>
              <strong>{intelligence.unresolvedMistakeCount}</strong>
            </div>
            <div>
              <span>Repaired mistakes</span>
              <strong>{intelligence.resolvedMistakeCount}</strong>
            </div>
          </div>

          <div className="recurring-weakness-list">
            <span>Recurring signals</span>
            {intelligence.recurringWeaknesses.length ? (
              intelligence.recurringWeaknesses.map((skillId) => (
                <strong key={skillId}>{skillTitle(skillId)}</strong>
              ))
            ) : (
              <small>No recurring game weakness has enough evidence yet.</small>
            )}
          </div>
        </section>
      </div>

      <section className="progress-history-note">
        <BarChart3 size={18} />
        <div>
          <strong>
            {intelligence.evidenceCount
              ? `${intelligence.evidenceCount} longitudinal evidence events`
              : "Longitudinal history has started"}
          </strong>
          <span>
            {intelligence.historyStartedAt
              ? `Tracking from ${new Date(intelligence.historyStartedAt).toLocaleDateString()} · active on ${intelligence.activeDays28}/28 recent days.`
              : "P13 will build history as new learning evidence arrives."}
          </span>
        </div>
      </section>
    </section>
  );
}
