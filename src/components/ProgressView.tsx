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
  Activity,
  CircleAlert,
  Layers3,
  ListChecks,
  FlaskConical,
  TrendingDown,
} from "lucide-react";
import type {
  HumanGameCohortInsight,
  ProgressIntelligence,
  TrendPoint,
} from "../analytics/types";
import type {
  TrainingPrescriptionAction,
} from "../prescriptions/types";
import { skillTitle, stageTitle } from "../analytics/engine";

interface ProgressViewProps {
  intelligence: ProgressIntelligence;
  onBack: () => void;
  onTrainSkill?: (skillId: string) => void;
  onRunPrescriptionAction?: (
    prescriptionId: string,
    action: TrainingPrescriptionAction,
  ) => void;
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

function cohortDelta(item: HumanGameCohortInsight) {
  if (Math.abs(item.deltaVsBaseline) < 1) return "≈ baseline";
  return `${item.deltaVsBaseline > 0 ? "+" : ""}${Math.round(
    item.deltaVsBaseline,
  )} vs baseline`;
}

function CohortRows({
  items,
  empty,
}: {
  items: HumanGameCohortInsight[];
  empty: string;
}) {
  if (!items.length) {
    return <div className="progress-empty"><span>{empty}</span></div>;
  }

  return (
    <div className="cohort-list">
      {items.slice(0, 6).map((item) => (
        <div className="cohort-row" key={`${item.dimension}:${item.key}`}>
          <div>
            <strong>{item.label}</strong>
            <span>
              {item.games} game{item.games === 1 ? "" : "s"} · quality {item.quality}% · result {item.resultPerformance}%
            </span>
          </div>
          <div className={item.deltaVsBaseline >= 0 ? "cohort-delta positive" : "cohort-delta negative"}>
            <strong>{cohortDelta(item)}</strong>
            <small>{item.confidence}% confidence</small>
          </div>
        </div>
      ))}
    </div>
  );
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
  onTrainSkill,
  onRunPrescriptionAction,
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

      <section className="progress-panel prescription-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">P18 · TRAINING PRESCRIPTIONS</p>
            <h2>Turn the diagnosis into the next repair plan.</h2>
          </div>
          <ListChecks size={20} />
        </div>

        {intelligence.prescriptions.length ? (
          <div className="prescription-list">
            {intelligence.prescriptions.map((prescription, index) => (
              <article
                className={
                  index === 0
                    ? "prescription-card primary"
                    : "prescription-card"
                }
                key={prescription.id}
              >
                <div className="prescription-card-head">
                  <div>
                    <span>
                      {index === 0 ? "TOP PLAN" : prescription.kind.replace("-", " ")}
                    </span>
                    <strong>{prescription.title}</strong>
                  </div>
                  <small>
                    {prescription.evidenceGames} games · {prescription.confidence}% confidence
                  </small>
                </div>

                <p>{prescription.rationale}</p>

                <div className="prescription-game-plan">
                  <span>Next-game plan</span>
                  <ol>
                    {prescription.gamePlan.map((cue) => (
                      <li key={cue}>{cue}</li>
                    ))}
                  </ol>
                </div>

                <div className="prescription-actions">
                  {prescription.actions.map((action) => (
                    <button
                      type="button"
                      key={action.id}
                      onClick={() =>
                        onRunPrescriptionAction?.(
                          prescription.id,
                          action,
                        )
                      }
                      disabled={!onRunPrescriptionAction}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>

                <div className="prescription-outcome-strip">
                  {prescription.outcome?.status === "collecting" ? (
                    <span>
                      Post-treatment evidence: {prescription.outcome.postGames}/3 matching human games
                    </span>
                  ) : prescription.outcome?.status === "unchanged" ? (
                    <span>
                      No clear effect yet · {prescription.outcome.delta !== undefined && prescription.outcome.delta >= 0 ? "+" : ""}{prescription.outcome.delta ?? 0} vs baseline
                    </span>
                  ) : prescription.outcome?.status === "worsened" ? (
                    <span className="negative">
                      Escalated · {prescription.outcome.delta ?? 0} vs baseline
                    </span>
                  ) : (
                    <span>
                      {prescription.composerEligible
                        ? "High-confidence: this plan may contribute one activity to the next generated session."
                        : "Suggestion only until more human-game evidence accumulates."}
                    </span>
                  )}
                </div>
                {prescription.policy && (
                  <div className={`prescription-policy-strip ${prescription.policy.stance}`}>
                    <BrainCircuit size={14} />
                    <span>
                      Learned policy {prescription.policy.multiplier >= 1 ? "+" : ""}
                      {Math.round((prescription.policy.multiplier - 1) * 100)}% · {prescription.policy.reason}
                    </span>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="cohort-insufficient-note">
            <ListChecks size={17} />
            <span>
              P18 will create repair plans once P17 finds a repeatable human-game problem with enough evidence.
            </span>
          </div>
        )}
      </section>

      <section className="progress-panel coach-effectiveness-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">P19 · COACH EFFECTIVENESS</p>
            <h2>Did the prescription survive the next human games?</h2>
          </div>
          <FlaskConical size={20} />
        </div>

        <div className="coach-effectiveness-grid">
          <div><span>Issued</span><strong>{intelligence.coachEffectiveness.issued}</strong></div>
          <div><span>Completed</span><strong>{intelligence.coachEffectiveness.completed}</strong></div>
          <div><span>Evaluated</span><strong>{intelligence.coachEffectiveness.evaluated}</strong></div>
          <div>
            <span>Validated</span>
            <strong>{intelligence.coachEffectiveness.evaluated ? `${intelligence.coachEffectiveness.validationRate}%` : "—"}</strong>
          </div>
          <div>
            <span>Average effect</span>
            <strong>{intelligence.coachEffectiveness.evaluated ? `${intelligence.coachEffectiveness.averageDelta >= 0 ? "+" : ""}${intelligence.coachEffectiveness.averageDelta}` : "—"}</strong>
          </div>
        </div>

        {intelligence.coachEffectiveness.history.length ? (
          <div className="coach-history">
            {intelligence.coachEffectiveness.history.slice(0, 8).map((item) => (
              <article key={item.recordId} className={`coach-history-row ${item.status}`}>
                <div className="coach-history-icon">
                  {item.status === "improved" ? (
                    <CheckCircle2 size={16} />
                  ) : item.status === "worsened" ? (
                    <TrendingDown size={16} />
                  ) : item.status === "collecting" ? (
                    <Clock3 size={16} />
                  ) : (
                    <Activity size={16} />
                  )}
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.targetLabel} · baseline {item.baselineScore}
                    {item.postScore !== undefined ? ` → ${item.postScore}` : ""}
                    {item.delta !== undefined ? ` · ${item.delta >= 0 ? "+" : ""}${item.delta}` : ""}
                  </span>
                  <small>
                    {item.status.replace("-", " ")} · {item.postGames} post-game sample{item.postGames === 1 ? "" : "s"}
                    {item.completions ? ` · ${item.completions} completed intervention${item.completions === 1 ? "" : "s"}` : " · not completed yet"}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="cohort-insufficient-note">
            <FlaskConical size={17} />
            <span>Complete a P18 prescription, then analyze later matching human games. P19 needs three post-treatment games before claiming an effect.</span>
          </div>
        )}

        {intelligence.coachEffectiveness.byKind.length > 0 && (
          <div className="coach-kind-grid">
            {intelligence.coachEffectiveness.byKind.map((item) => (
              <div key={item.kind}>
                <span>{item.kind.replace("-", " ")}</span>
                <strong>{item.improved}/{item.evaluated} improved</strong>
                <small>avg {item.averageDelta >= 0 ? "+" : ""}{item.averageDelta}</small>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="progress-panel coach-policy-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">P20 · COACH POLICY LEARNING</p>
            <h2>Which interventions should the coach prefer next?</h2>
          </div>
          <BrainCircuit size={20} />
        </div>

        <div className="coach-policy-grid">
          <div>
            <span>Policy mode</span>
            <strong>{intelligence.coachPolicy.mode.replace("-", " ")}</strong>
          </div>
          <div>
            <span>Validated episodes</span>
            <strong>{intelligence.coachPolicy.evaluatedEpisodes}</strong>
          </div>
          <div>
            <span>Learning confidence</span>
            <strong>{intelligence.coachPolicy.learningConfidence}%</strong>
          </div>
          <div>
            <span>Preferred plan</span>
            <strong>
              {intelligence.coachPolicy.preferredKind
                ? intelligence.coachPolicy.preferredKind.replace("-", " ")
                : "Exploring"}
            </strong>
          </div>
          <div>
            <span>Preferred action</span>
            <strong>
              {intelligence.coachPolicy.preferredAction
                ? intelligence.coachPolicy.preferredAction.replace("-", " ")
                : "Exploring"}
            </strong>
          </div>
        </div>

        {(intelligence.coachPolicy.kindSignals.length > 0 ||
          intelligence.coachPolicy.actionSignals.length > 0) ? (
          <div className="coach-policy-signals">
            {intelligence.coachPolicy.kindSignals.length > 0 && (
              <div>
                <span className="coach-policy-label">Plan families</span>
                <div className="coach-policy-signal-grid">
                  {intelligence.coachPolicy.kindSignals.map((item) => (
                    <article key={item.key} className={`coach-policy-signal ${item.stance}`}>
                      <strong>{item.label}</strong>
                      <span>
                        {item.multiplier >= 1 ? "+" : ""}
                        {Math.round((item.multiplier - 1) * 100)}% policy weight
                      </span>
                      <small>
                        {item.evaluated} validated · {item.improvedRate}% improved · avg {item.averageDelta >= 0 ? "+" : ""}{item.averageDelta}
                      </small>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {intelligence.coachPolicy.actionSignals.length > 0 && (
              <div>
                <span className="coach-policy-label">Action families</span>
                <div className="coach-policy-signal-grid">
                  {intelligence.coachPolicy.actionSignals.map((item) => (
                    <article key={item.key} className={`coach-policy-signal ${item.stance}`}>
                      <strong>{item.label}</strong>
                      <span>
                        {item.multiplier >= 1 ? "+" : ""}
                        {Math.round((item.multiplier - 1) * 100)}% policy weight
                      </span>
                      <small>
                        {item.evaluated} attributed · {item.confidence}% confidence
                      </small>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="cohort-insufficient-note">
            <BrainCircuit size={17} />
            <span>
              P20 stays neutral until P19 has validated real before→after outcomes. It never treats clicks or training completion alone as proof that an intervention works.
            </span>
          </div>
        )}

        <p className="coach-policy-note">
          Policy adjustments are deterministic, recency-weighted and deliberately small. One result cannot create a preference; weak or unseen action families remain available so the coach can keep learning instead of locking into an early guess.
        </p>
      </section>

      <section className="progress-panel real-game-diagnostics-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">REAL-GAME DIAGNOSTICS</p>
            <h2>Where your human chess changes with the conditions.</h2>
          </div>
          <Activity size={20} />
        </div>

        <div className="cohort-baseline-strip">
          <div>
            <span>Analyzed humans</span>
            <strong>{intelligence.realGameDiagnostics.sampleCount}</strong>
          </div>
          <div>
            <span>Baseline quality</span>
            <strong>{intelligence.realGameDiagnostics.baselineQuality}%</strong>
          </div>
          <div>
            <span>Practical score</span>
            <strong>{intelligence.realGameDiagnostics.baselinePracticalScore}</strong>
          </div>
          <div>
            <span>Recent form</span>
            <strong>{intelligence.realGameDiagnostics.recentForm.direction}</strong>
          </div>
        </div>

        {intelligence.realGameDiagnostics.diagnostics.length ? (
          <div className="diagnostic-callouts">
            {intelligence.realGameDiagnostics.diagnostics.map((item) => (
              <article
                className={`diagnostic-callout ${item.severity}`}
                key={item.id}
              >
                <div>
                  {item.severity === "priority" ? (
                    <CircleAlert size={17} />
                  ) : item.severity === "strength" ? (
                    <Sparkles size={17} />
                  ) : (
                    <Target size={17} />
                  )}
                </div>
                <div>
                  <span>{item.severity}</span>
                  <strong>{item.headline}</strong>
                  <p>{item.detail}</p>
                  <small>
                    {item.games} game{item.games === 1 ? "" : "s"} · {item.confidence}% confidence
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="cohort-insufficient-note">
            <Layers3 size={17} />
            <span>
              {intelligence.realGameDiagnostics.sampleCount < 3
                ? "Analyze at least three human games before P17 declares a cohort meaningfully stronger or weaker."
                : "No human-game cohort is currently far enough from your baseline to deserve a separate warning."}
            </span>
          </div>
        )}

        <div className="real-game-cohort-grid">
          <article>
            <div className="cohort-heading">
              <span>OPENING PERFORMANCE</span>
              <strong>Families, not tiny variations</strong>
            </div>
            <CohortRows
              items={intelligence.realGameDiagnostics.openings}
              empty="Opening cohorts will appear after analyzed human games."
            />
          </article>

          <article>
            <div className="cohort-heading">
              <span>PLAYING CONDITIONS</span>
              <strong>Time control and opponent level</strong>
            </div>
            <CohortRows
              items={[
                ...intelligence.realGameDiagnostics.timeControls,
                ...intelligence.realGameDiagnostics.opponents,
              ]}
              empty="More human-game context is needed."
            />
          </article>

          <article>
            <div className="cohort-heading">
              <span>COLOR & POSITION TYPE</span>
              <strong>Where the game tends to go wrong</strong>
            </div>
            <CohortRows
              items={[
                ...intelligence.realGameDiagnostics.colors,
                ...intelligence.realGameDiagnostics.positionTypes,
              ]}
              empty="More analyzed games are needed."
            />
          </article>

          <article>
            <div className="cohort-heading">
              <span>PHASE PERFORMANCE</span>
              <strong>Opening → middlegame → endgame</strong>
            </div>
            <div className="phase-diagnostic-list">
              {intelligence.realGameDiagnostics.phases.map((phase) => (
                <div key={phase.phase}>
                  <span>{phase.phase}</span>
                  <strong>{phase.quality}%</strong>
                  <small>
                    {phase.games} games · {phase.averageCentipawnLoss} ACPL · {phase.criticalPerGame} critical/game
                  </small>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="real-game-bottom-grid">
          <article className="recent-form-card">
            <span>RECENT FORM</span>
            <strong>
              {intelligence.realGameDiagnostics.recentForm.direction === "insufficient"
                ? "Building a comparison window"
                : intelligence.realGameDiagnostics.recentForm.direction}
            </strong>
            <p>
              Latest {intelligence.realGameDiagnostics.recentForm.recentGames} games:
              {" "}{intelligence.realGameDiagnostics.recentForm.recentQuality}% quality
              {intelligence.realGameDiagnostics.recentForm.previousGames >= 3
                ? ` · ${intelligence.realGameDiagnostics.recentForm.qualityDelta >= 0 ? "+" : ""}${Math.round(intelligence.realGameDiagnostics.recentForm.qualityDelta)} vs prior sample`
                : ""}
            </p>
          </article>

          <article className="mistake-family-card">
            <span>RECURRING HUMAN-GAME FAMILIES</span>
            {intelligence.realGameDiagnostics.mistakeFamilies.length ? (
              intelligence.realGameDiagnostics.mistakeFamilies.slice(0, 5).map((item) => (
                <div key={item.skillId}>
                  <div>
                    <strong>{item.label}</strong>
                    <small>
                      {item.games} games · {item.recurrenceRate}% recurrence · impact {item.averageImpact}
                    </small>
                  </div>
                  {onTrainSkill && (
                    <button
                      type="button"
                      onClick={() => onTrainSkill(item.skillId)}
                    >
                      Train
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p>No recurring human-game mistake family has enough evidence yet.</p>
            )}
          </article>
        </div>
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
