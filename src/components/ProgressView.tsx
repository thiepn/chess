import {
  ArrowLeft,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
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
import type {
  CompetitionPlanSettings,
  TrainingGoalId,
  TrainingPlanSettings,
} from "../domain/types";
import { trainingGoals } from "../planning/periodization";
import { skillTitle, stageTitle } from "../analytics/engine";

type TrainingPlanPatch = Partial<
  Pick<
    TrainingPlanSettings,
    | "goal"
    | "weeklyMinutes"
    | "horizonWeeks"
    | "sessionsPerWeek"
    | "autoRecalibrate"
    | "autoRecovery"
    | "manualRecoveryUntil"
    | "competition"
  >
>;

interface ProgressViewProps {
  intelligence: ProgressIntelligence;
  onBack: () => void;
  onTrainSkill?: (skillId: string) => void;
  onRunPrescriptionAction?: (
    prescriptionId: string,
    action: TrainingPrescriptionAction,
  ) => void;
  onUpdateTrainingPlan?: (
    patch: TrainingPlanPatch,
  ) => void;
  onUpdateCompetitionPlan?: (
    patch: Partial<CompetitionPlanSettings>,
  ) => void;
  onStartRecovery?: () => void;
  onEndRecovery?: () => void;
  onUpdateCompetitionRetrospective?: (
    field:
      | "whatWorked"
      | "whatFailed"
      | "nextCycleFocus",
    value: string,
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
  onUpdateTrainingPlan,
  onUpdateCompetitionPlan,
  onStartRecovery,
  onEndRecovery,
  onUpdateCompetitionRetrospective,
}: ProgressViewProps) {
  const calibrated = intelligence.calibration.sampleCount >= 5;
  const strongestIntervention = intelligence.interventions[0];

  return (
    <section className="progress-view">
      <button className="back-link" type="button" onClick={onBack}>
        <ArrowLeft size={16} /> Train
      </button>

      <header className="section-hero progress-hero">
        <div>
          <p className="eyebrow">YOUR PROGRESS</p>
          <h1>Are you actually getting better?</h1>
          <p>
            This view separates short-term success from retained skill,
            what is improving, what still needs work, and whether the coach’s recommendations are helping in real games.
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

      <details className="progress-plan-controls">
        <summary>
          <div>
            <Gauge size={18} />
            <span>
              <strong>Plan & competition settings</strong>
              <small>
                The coach uses these quietly in the background. Change them only when your real study goal changes.
              </small>
            </span>
          </div>
          <ChevronRight size={17} />
        </summary>

        <div className="progress-plan-controls-body">
          <section>
            <div className="planning-control-heading">
              <span>Training goal</span>
              <small>{intelligence.trainingHorizon.goalDescription}</small>
            </div>
            <div className="planning-goal-options">
              {(Object.keys(trainingGoals) as TrainingGoalId[]).map((goalId) => (
                <button
                  type="button"
                  key={goalId}
                  className={
                    intelligence.trainingHorizon.plan.goal === goalId
                      ? "active"
                      : ""
                  }
                  aria-pressed={
                    intelligence.trainingHorizon.plan.goal === goalId
                  }
                  onClick={() =>
                    onUpdateTrainingPlan?.({
                      goal: goalId,
                    })
                  }
                >
                  {trainingGoals[goalId].label}
                </button>
              ))}
            </div>

            <div className="planning-select-grid">
              <label>
                <span>Weekly budget</span>
                <select
                  value={intelligence.trainingHorizon.plan.weeklyMinutes}
                  onChange={(event) =>
                    onUpdateTrainingPlan?.({
                      weeklyMinutes: Number(
                        event.target.value,
                      ),
                    })
                  }
                >
                  {[90, 150, 240, 360].map((minutes) => (
                    <option value={minutes} key={minutes}>
                      {minutes} min
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Horizon</span>
                <select
                  value={intelligence.trainingHorizon.plan.horizonWeeks}
                  onChange={(event) =>
                    onUpdateTrainingPlan?.({
                      horizonWeeks: Number(
                        event.target.value,
                      ) as 4 | 8 | 12,
                    })
                  }
                >
                  {[4, 8, 12].map((weeks) => (
                    <option value={weeks} key={weeks}>
                      {weeks} weeks
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Sessions/week</span>
                <select
                  value={intelligence.trainingHorizon.plan.sessionsPerWeek}
                  onChange={(event) =>
                    onUpdateTrainingPlan?.({
                      sessionsPerWeek: Number(
                        event.target.value,
                      ),
                    })
                  }
                >
                  {[3, 4, 5, 6, 7].map((count) => (
                    <option value={count} key={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="planning-toggle-grid">
              <label>
                <input
                  type="checkbox"
                  checked={
                    intelligence.trainingHorizon.plan.autoRecalibrate !== false
                  }
                  onChange={(event) =>
                    onUpdateTrainingPlan?.({
                      autoRecalibrate:
                        event.target.checked,
                    })
                  }
                />
                <span>
                  Automatic adherence adjustment
                  <small>
                    Changes operational load only after repeated full-week evidence.
                  </small>
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={
                    intelligence.trainingHorizon.plan.autoRecovery !== false
                  }
                  onChange={(event) =>
                    onUpdateTrainingPlan?.({
                      autoRecovery:
                        event.target.checked,
                    })
                  }
                />
                <span>
                  Automatic recovery
                  <small>
                    Keeps short-term overload from forcing more volume.
                  </small>
                </span>
              </label>
            </div>

            <div className="planning-recovery-row">
              <div>
                <span>Manual recovery</span>
                <small>
                  {intelligence.trainingHorizon.loadManagement.manualRecoveryActive
                    ? "A seven-day recovery period is active."
                    : "Optional. Essential review and repair remain protected."}
                </small>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={
                  intelligence.trainingHorizon.loadManagement.manualRecoveryActive
                    ? onEndRecovery
                    : onStartRecovery
                }
                disabled={
                  intelligence.trainingHorizon.loadManagement.manualRecoveryActive
                    ? !onEndRecovery
                    : !onStartRecovery
                }
              >
                {intelligence.trainingHorizon.loadManagement.manualRecoveryActive
                  ? "End recovery"
                  : "Start 7-day recovery"}
              </button>
            </div>
          </section>

          <section>
            <div className="planning-control-heading">
              <span>Competition mode</span>
              <small>
                Keep this off unless you are preparing for a concrete event.
              </small>
            </div>

            <label className="planning-competition-toggle">
              <input
                type="checkbox"
                checked={
                  intelligence.trainingHorizon.plan.competition?.enabled ?? false
                }
                onChange={(event) =>
                  onUpdateCompetitionPlan?.({
                    enabled: event.target.checked,
                  })
                }
              />
              <span>Use event-specific preparation and tapering</span>
            </label>

            {intelligence.trainingHorizon.plan.competition?.enabled && (
              <>
                <div className="planning-select-grid competition">
                  <label>
                    <span>Event date</span>
                    <input
                      type="date"
                      value={
                        intelligence.trainingHorizon.plan.competition?.eventDate ?? ""
                      }
                      onChange={(event) =>
                        onUpdateCompetitionPlan?.({
                          eventDate:
                            event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Prep window</span>
                    <select
                      value={
                        intelligence.trainingHorizon.plan.competition?.prepWeeks ?? 6
                      }
                      onChange={(event) =>
                        onUpdateCompetitionPlan?.({
                          prepWeeks: Number(
                            event.target.value,
                          ) as 4 | 6 | 8 | 12,
                        })
                      }
                    >
                      {[4, 6, 8, 12].map((weeks) => (
                        <option value={weeks} key={weeks}>
                          {weeks} weeks
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Event length</span>
                    <select
                      value={
                        intelligence.trainingHorizon.plan.competition?.eventDays ?? 1
                      }
                      onChange={(event) =>
                        onUpdateCompetitionPlan?.({
                          eventDays: Number(
                            event.target.value,
                          ) as 1 | 2 | 3 | 5 | 7,
                        })
                      }
                    >
                      {[1, 2, 3, 5, 7].map((days) => (
                        <option value={days} key={days}>
                          {days} day{days === 1 ? "" : "s"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Reset</span>
                    <select
                      value={
                        intelligence.trainingHorizon.plan.competition?.resetDays ?? 5
                      }
                      onChange={(event) =>
                        onUpdateCompetitionPlan?.({
                          resetDays: Number(
                            event.target.value,
                          ) as 3 | 5 | 7,
                        })
                      }
                    >
                      {[3, 5, 7].map((days) => (
                        <option value={days} key={days}>
                          {days} days
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {intelligence.trainingHorizon.eventRetrospective.eventDate && (
                  <div className="planning-retrospective-notes">
                    <label>
                      <span>What worked?</span>
                      <textarea
                        rows={2}
                        value={
                          intelligence.trainingHorizon.eventRetrospective.note?.whatWorked ?? ""
                        }
                        onChange={(event) =>
                          onUpdateCompetitionRetrospective?.(
                            "whatWorked",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>What failed?</span>
                      <textarea
                        rows={2}
                        value={
                          intelligence.trainingHorizon.eventRetrospective.note?.whatFailed ?? ""
                        }
                        onChange={(event) =>
                          onUpdateCompetitionRetrospective?.(
                            "whatFailed",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Next cycle focus</span>
                      <textarea
                        rows={2}
                        value={
                          intelligence.trainingHorizon.eventRetrospective.note?.nextCycleFocus ?? ""
                        }
                        onChange={(event) =>
                          onUpdateCompetitionRetrospective?.(
                            "nextCycleFocus",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </details>

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

      <section className={`progress-panel coach-brief-panel ${intelligence.coachBrief.evidenceState}`}>
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">COACH</p>
            <h2>{intelligence.coachBrief.headline}</h2>
          </div>
          <BrainCircuit size={20} />
        </div>

        <div className="coach-brief-status">
          <span>{intelligence.coachBrief.confidenceLabel}</span>
          <strong>
            {intelligence.coachBrief.evidenceState === "cold-start"
              ? `${intelligence.coachBrief.humanGames}/3 human games`
              : intelligence.coachBrief.confidence
                ? `${intelligence.coachBrief.confidence}% confidence`
                : "Evidence building"}
          </strong>
        </div>

        <p className="coach-brief-summary">
          {intelligence.coachBrief.summary}
        </p>

        <div className="coach-decision-list">
          {intelligence.coachBrief.decisions.map((decision, index) => (
            <article
              className={index === 0 ? "coach-decision primary" : "coach-decision"}
              key={decision.id}
            >
              <div className="coach-decision-head">
                <div>
                  <span>{index === 0 ? "WORK ON THIS FIRST" : "NEXT"}</span>
                  <strong>{decision.title}</strong>
                </div>
                <small>{decision.evidenceLabel}</small>
              </div>

              <p>{decision.why}</p>

              {decision.nextGameCue && (
                <div className="coach-next-game-cue">
                  <Target size={15} />
                  <div>
                    <span>Next-game cue</span>
                    <strong>{decision.nextGameCue}</strong>
                  </div>
                </div>
              )}

              {decision.action && decision.prescriptionId && (
                <button
                  type="button"
                  className="secondary"
                  disabled={!onRunPrescriptionAction}
                  onClick={() =>
                    onRunPrescriptionAction?.(
                      decision.prescriptionId!,
                      decision.action!,
                    )
                  }
                >
                  {decision.action.label}
                  <ChevronRight size={15} />
                </button>
              )}
            </article>
          ))}
        </div>

        <div className={`coach-behavior-check ${intelligence.coachBrief.behaviorCheck.state}`}>
          <div className="coach-behavior-icon">
            {intelligence.coachBrief.behaviorCheck.state === "helping" ? (
              <CheckCircle2 size={18} />
            ) : intelligence.coachBrief.behaviorCheck.state === "worsening" ? (
              <TrendingDown size={18} />
            ) : intelligence.coachBrief.behaviorCheck.state === "waiting" ? (
              <Clock3 size={18} />
            ) : (
              <Activity size={18} />
            )}
          </div>
          <div>
            <span>DID THE TRAINING HELP IN REAL GAMES?</span>
            <strong>{intelligence.coachBrief.behaviorCheck.label}</strong>
            <p>{intelligence.coachBrief.behaviorCheck.detail}</p>
            {intelligence.coachBrief.behaviorCheck.target && (
              <small>
                Watching: {intelligence.coachBrief.behaviorCheck.target}
                {intelligence.coachBrief.behaviorCheck.postGames
                  ? ` · ${intelligence.coachBrief.behaviorCheck.postGames} later matching game${intelligence.coachBrief.behaviorCheck.postGames === 1 ? "" : "s"}`
                  : ""}
              </small>
            )}
          </div>
        </div>

        <details className="coach-method-details">
          <summary>How the coach decides</summary>
          <p>
            The coach combines your course progress, spaced recall, mistakes,
            opening deviations and analyzed human games. It does not treat
            training completion as proof of improvement. Recommendations are
            judged again only when later matching human games exist.
          </p>
        </details>
      </section>

      <section className="progress-panel training-horizon-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">TRAINING PLAN</p>
            <h2>Turn the weekly budget into the right mix of work.</h2>
          </div>
          <Gauge size={20} />
        </div>

        <div className="training-horizon-kpis">
          <div>
            <span>Goal</span>
            <strong>{intelligence.trainingHorizon.goalLabel}</strong>
          </div>
          <div>
            <span>Weekly budget</span>
            <strong>
              {intelligence.trainingHorizon.completedMinutes}/
              {intelligence.trainingHorizon.managedWeeklyMinutes}m
            </strong>
          </div>
          <div>
            <span>Pace</span>
            <strong>{intelligence.trainingHorizon.paceStatus.replace("-", " ")}</strong>
          </div>
          <div>
            <span>Next emphasis</span>
            <strong>{intelligence.trainingHorizon.nextFocusLabel}</strong>
          </div>
          <div>
            <span>Suggested session</span>
            <strong>{intelligence.trainingHorizon.recommendedSessionMinutes}m</strong>
          </div>
        </div>

        <div className="training-allocation-grid">
          {intelligence.trainingHorizon.allocations.map((item) => (
            <article
              className={
                item.bucket === intelligence.trainingHorizon.nextFocus
                  ? "training-allocation-card priority"
                  : "training-allocation-card"
              }
              key={item.bucket}
            >
              <div>
                <strong>{item.label}</strong>
                <span>{Math.round(item.share * 100)}% of week</span>
              </div>
              <div className="training-allocation-meter">
                <span
                  style={{
                    width: `${Math.min(100, item.completion)}%`,
                  }}
                />
              </div>
              <small>
                {item.completedMinutes}/{item.targetMinutes}m · {item.remainingMinutes}m remaining
              </small>
            </article>
          ))}
        </div>

        <div className="training-horizon-note">
          <BrainCircuit size={16} />
          <span>
            The weekly plan uses completed training, not planned sessions. Missed days do not break the plan:
            the remaining budget is redistributed through the next generated sessions. Urgent review,
            human-game repair and failed prescriptions stay protected even when their weekly bucket is full.
          </span>
        </div>
      </section>

      <section className="progress-panel plan-forecast-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">ADHERENCE & FORECAST</p>
            <h2>Is the current training horizon actually sustainable?</h2>
          </div>
          <TrendingUp size={20} />
        </div>

        <div className="plan-forecast-kpis">
          <div>
            <span>Adherence</span>
            <strong>
              {intelligence.trainingPlanForecast.adherence.comparableWeeks
                ? `${intelligence.trainingPlanForecast.adherence.averageAdherence}%`
                : "—"}
            </strong>
            <small>
              {intelligence.trainingPlanForecast.adherence.comparableWeeks} comparable week{intelligence.trainingPlanForecast.adherence.comparableWeeks === 1 ? "" : "s"}
            </small>
          </div>
          <div>
            <span>Consistency</span>
            <strong>
              {intelligence.trainingPlanForecast.adherence.comparableWeeks >= 2
                ? `${intelligence.trainingPlanForecast.adherence.consistency}%`
                : "—"}
            </strong>
            <small>{intelligence.trainingPlanForecast.adherence.trend.replace("-", " ")}</small>
          </div>
          <div>
            <span>Sustainable pace</span>
            <strong>{intelligence.trainingPlanForecast.forecast.sustainableWeeklyMinutes}m</strong>
            <small>per week</small>
          </div>
          <div className={`forecast-status ${intelligence.trainingPlanForecast.forecast.status}`}>
            <span>Forecast</span>
            <strong>{intelligence.trainingPlanForecast.forecast.status.replace("-", " ")}</strong>
            <small>
              {intelligence.trainingPlanForecast.forecast.status === "insufficient"
                ? "More history needed"
                : `${intelligence.trainingPlanForecast.forecast.projectedCompletion}% projected`}
            </small>
          </div>
          <div>
            <span>Effective load</span>
            <strong>{intelligence.trainingPlanForecast.recalibration.effectiveWeeklyMinutes}m</strong>
            <small>
              nominal {intelligence.trainingPlanForecast.recalibration.nominalWeeklyMinutes}m
            </small>
          </div>
        </div>

        {intelligence.trainingPlanForecast.adherence.weeks.length > 0 ? (
          <div className="adherence-history">
            {intelligence.trainingPlanForecast.adherence.weeks.map((week) => (
              <article key={week.weekStart}>
                <div>
                  <span>
                    {new Date(week.weekStart).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <strong>{week.adherence}%</strong>
                </div>
                <div className="adherence-week-meter">
                  <span
                    style={{
                      width: `${Math.min(100, week.adherence)}%`,
                    }}
                  />
                </div>
                <small>
                  {week.completedMinutes}/{week.targetMinutes}m · {week.activeDays} active day{week.activeDays === 1 ? "" : "s"}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <div className="cohort-insufficient-note">
            <Clock3 size={17} />
            <span>
              Forecasting starts only after full weeks under the current plan. Current-week activity still counts toward the weekly budget, but partial weeks are not treated as adherence evidence.
            </span>
          </div>
        )}

        <div className={`recalibration-card ${intelligence.trainingPlanForecast.recalibration.active ? "active" : ""}`}>
          <BrainCircuit size={17} />
          <div>
            <strong>
              {intelligence.trainingPlanForecast.recalibration.active
                ? "Effective load recalibrated"
                : intelligence.trainingPlanForecast.recalibration.enabled
                  ? "Automatic recalibration standing by"
                  : "Automatic recalibration disabled"}
            </strong>
            <span>{intelligence.trainingPlanForecast.recalibration.reason}</span>
          </div>
        </div>

        {intelligence.trainingPlanForecast.forecast.status !== "insufficient" && (
          <div className="forecast-detail-grid">
            <div>
              <span>Nominal horizon</span>
              <strong>{intelligence.trainingPlanForecast.forecast.nominalTargetMinutes}m</strong>
            </div>
            <div>
              <span>Projected total</span>
              <strong>{intelligence.trainingPlanForecast.forecast.projectedTotalMinutes}m</strong>
            </div>
            <div>
              <span>Projected shortfall</span>
              <strong>{intelligence.trainingPlanForecast.forecast.projectedShortfallMinutes}m</strong>
            </div>
            <div>
              <span>Forecast confidence</span>
              <strong>{intelligence.trainingPlanForecast.forecast.confidence}%</strong>
            </div>
          </div>
        )}

        <p className="coach-policy-note">
          Recalibration changes only the operational weekly allocation used by the composer. It never edits the selected goal, nominal weekly target, or horizon length, so the forecast remains an honest comparison against the plan you chose.
        </p>
      </section>

      <section className="progress-panel load-management-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">LOAD MANAGEMENT</p>
            <h2>Keep the training plan sustainable without dropping essential work.</h2>
          </div>
          <RefreshCcw size={20} />
        </div>

        <div className="load-management-kpis">
          <div>
            <span>Mode</span>
            <strong>{intelligence.trainingHorizon.loadManagement.appliedMode}</strong>
            <small>
              recommended {intelligence.trainingHorizon.loadManagement.recommendation}
            </small>
          </div>
          <div>
            <span>Managed week</span>
            <strong>{intelligence.trainingHorizon.loadManagement.managedWeeklyMinutes}m</strong>
            <small>
              adherence-adjusted {intelligence.trainingHorizon.effectiveWeeklyMinutes}m
            </small>
          </div>
          <div>
            <span>Latest load</span>
            <strong>{intelligence.trainingHorizon.loadManagement.latestWeekMinutes}m</strong>
            <small>
              baseline {intelligence.trainingHorizon.loadManagement.baselineWeeklyMinutes}m
            </small>
          </div>
          <div>
            <span>Ramp</span>
            <strong>{intelligence.trainingHorizon.loadManagement.rampRatio}×</strong>
            <small>
              {intelligence.trainingHorizon.loadManagement.recentActiveDays} active day{intelligence.trainingHorizon.loadManagement.recentActiveDays === 1 ? "" : "s"}
            </small>
          </div>
          <div>
            <span>Overload weeks</span>
            <strong>{intelligence.trainingHorizon.loadManagement.overloadWeeks}/3</strong>
            <small>
              {intelligence.trainingHorizon.loadManagement.confidence}% evidence confidence
            </small>
          </div>
        </div>

        <div className="load-bucket-policy-grid">
          {Object.entries(
            intelligence.trainingHorizon.loadManagement.bucketMultipliers,
          ).map(([bucket, multiplier]) => (
            <article
              key={bucket}
              className={
                multiplier > 1
                  ? "protected"
                  : multiplier < 1
                    ? "reduced"
                    : ""
              }
            >
              <span>{bucket}</span>
              <strong>
                {multiplier === 1
                  ? "100%"
                  : `${Math.round(multiplier * 100)}%`}
              </strong>
            </article>
          ))}
        </div>

        <div className={`recalibration-card ${intelligence.trainingHorizon.loadManagement.active ? "active" : ""}`}>
          <Gauge size={17} />
          <div>
            <strong>
              {intelligence.trainingHorizon.loadManagement.manualRecoveryActive
                ? "Manual recovery week active"
                : intelligence.trainingHorizon.loadManagement.appliedMode === "recovery"
                  ? "Automatic recovery week active"
                  : intelligence.trainingHorizon.loadManagement.appliedMode === "watch"
                    ? "Load watch active"
                    : "No recovery adjustment"}
            </strong>
            <span>{intelligence.trainingHorizon.loadManagement.reason}</span>
          </div>
        </div>

        <p className="coach-policy-note">
          Load management uses recorded training behavior, not medical fatigue. Recovery mode shortens sessions and reduces optional work while retention and repair remain protected. Automatic adjustments can never reduce managed weekly load below 70% of the nominal target.
        </p>
      </section>

      <section className="progress-panel competition-cycle-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">COMPETITION CYCLE</p>
            <h2>Shift from general growth toward event-specific readiness at the right time.</h2>
          </div>
          <Target size={20} />
        </div>

        <div className="competition-cycle-kpis">
          <div>
            <span>Phase</span>
            <strong>{intelligence.trainingHorizon.competitionCycle.phaseLabel}</strong>
          </div>
          <div>
            <span>Prep readiness</span>
            <strong>{intelligence.trainingHorizon.competitionCycle.readinessScore}%</strong>
            <small>{intelligence.trainingHorizon.competitionCycle.readinessStatus.replace("-", " ")}</small>
          </div>
          <div>
            <span>Event</span>
            <strong>{intelligence.trainingHorizon.competitionCycle.eventDate ?? "—"}</strong>
            <small>{intelligence.trainingHorizon.competitionCycle.eventLabel ?? "No named event"}</small>
          </div>
          <div>
            <span>Cycle load</span>
            <strong>{Math.round(intelligence.trainingHorizon.competitionCycle.weeklyLoadMultiplier * 100)}%</strong>
            <small>{intelligence.trainingHorizon.competitionCycle.managedWeeklyMinutes}m managed</small>
          </div>
          <div>
            <span>Session cap</span>
            <strong>{intelligence.trainingHorizon.competitionCycle.maxSessionMinutes}m</strong>
            <small>
              {intelligence.trainingHorizon.competitionCycle.suppressedByRecovery
                ? "recovery takes precedence"
                : "cycle-specific"}
            </small>
          </div>
        </div>

        <div className="cycle-phase-track">
          {["base", "build", "sharpen", "taper", "event", "reset"].map((phase) => (
            <div
              key={phase}
              className={
                intelligence.trainingHorizon.competitionCycle.phase === phase
                  ? "active"
                  : ""
              }
            >
              <span>{phase}</span>
            </div>
          ))}
        </div>

        <div className="load-bucket-policy-grid competition-buckets">
          {Object.entries(
            intelligence.trainingHorizon.competitionCycle.bucketMultipliers,
          ).map(([bucket, multiplier]) => (
            <article
              key={bucket}
              className={
                multiplier > 1
                  ? "protected"
                  : multiplier < 1
                    ? "reduced"
                    : ""
              }
            >
              <span>{bucket}</span>
              <strong>{Math.round(multiplier * 100)}%</strong>
            </article>
          ))}
        </div>

        <div className={`recalibration-card ${intelligence.trainingHorizon.competitionCycle.active ? "active" : ""}`}>
          <Target size={17} />
          <div>
            <strong>
              {intelligence.trainingHorizon.competitionCycle.enabled
                ? intelligence.trainingHorizon.competitionCycle.phaseLabel
                : "Competition cycle disabled"}
            </strong>
            <span>{intelligence.trainingHorizon.competitionCycle.reason}</span>
          </div>
        </div>

        <p className="coach-policy-note">
          Preparation readiness is not a rating or win-probability prediction. It combines adherence, consistency, plan risk and current load status. Recovery remains authoritative: an upcoming event can reduce or redirect work, but it cannot force intensity upward through an active recovery state.
        </p>
      </section>

      <section className="progress-panel event-retrospective-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">EVENT RETROSPECTIVE</p>
            <h2>Did preparation transfer when the games actually mattered?</h2>
          </div>
          <ListChecks size={20} />
        </div>

        <div className="event-retro-kpis">
          <div>
            <span>Event sample</span>
            <strong>
              {intelligence.trainingHorizon.eventRetrospective.event.analyzedGames}/
              {intelligence.trainingHorizon.eventRetrospective.event.games}
            </strong>
            <small>analyzed / matched</small>
          </div>
          <div>
            <span>Prep baseline</span>
            <strong>{intelligence.trainingHorizon.eventRetrospective.preparation.analyzedGames}</strong>
            <small>analyzed pre-event games</small>
          </div>
          <div className={`event-translation-status ${intelligence.trainingHorizon.eventRetrospective.translationStatus}`}>
            <span>Translation</span>
            <strong>{intelligence.trainingHorizon.eventRetrospective.translationStatus}</strong>
          </div>
          <div>
            <span>Quality Δ</span>
            <strong>
              {intelligence.trainingHorizon.eventRetrospective.qualityDelta >= 0 ? "+" : ""}
              {intelligence.trainingHorizon.eventRetrospective.qualityDelta}
            </strong>
          </div>
          <div>
            <span>Error-rate Δ</span>
            <strong>
              {intelligence.trainingHorizon.eventRetrospective.errorRateDelta >= 0 ? "+" : ""}
              {intelligence.trainingHorizon.eventRetrospective.errorRateDelta}
            </strong>
          </div>
        </div>

        <div className="event-baseline-comparison">
          <article>
            <span>Preparation games</span>
            <div>
              <strong>{intelligence.trainingHorizon.eventRetrospective.preparation.quality}</strong>
              <small>quality</small>
            </div>
            <div>
              <strong>{intelligence.trainingHorizon.eventRetrospective.preparation.resultPerformance}</strong>
              <small>result</small>
            </div>
            <div>
              <strong>{intelligence.trainingHorizon.eventRetrospective.preparation.averageCentipawnLoss}</strong>
              <small>ACPL</small>
            </div>
            <div>
              <strong>{intelligence.trainingHorizon.eventRetrospective.preparation.criticalErrorRate}%</strong>
              <small>critical errors</small>
            </div>
          </article>
          <article>
            <span>Event games</span>
            <div>
              <strong>{intelligence.trainingHorizon.eventRetrospective.event.quality}</strong>
              <small>quality</small>
            </div>
            <div>
              <strong>{intelligence.trainingHorizon.eventRetrospective.event.resultPerformance}</strong>
              <small>result</small>
            </div>
            <div>
              <strong>{intelligence.trainingHorizon.eventRetrospective.event.averageCentipawnLoss}</strong>
              <small>ACPL</small>
            </div>
            <div>
              <strong>{intelligence.trainingHorizon.eventRetrospective.event.criticalErrorRate}%</strong>
              <small>critical errors</small>
            </div>
          </article>
        </div>

        {intelligence.trainingHorizon.eventRetrospective.repairPriorities.length > 0 && (
          <div className="event-repair-grid">
            {intelligence.trainingHorizon.eventRetrospective.repairPriorities.map((item) => (
              <article key={item.skillId}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.games} event game{item.games === 1 ? "" : "s"}</span>
                </div>
                <small>
                  {item.occurrences} occurrence{item.occurrences === 1 ? "" : "s"} · avg impact {item.averageImpact}cp
                </small>
              </article>
            ))}
          </div>
        )}

        {intelligence.trainingHorizon.eventRetrospective.strengthSkillIds.length > 0 && (
          <div className="event-strength-strip">
            <span>Event-stable skills</span>
            <div>
              {intelligence.trainingHorizon.eventRetrospective.strengthSkillIds.map((skillId) => (
                <strong key={skillId}>{skillTitle(skillId)}</strong>
              ))}
            </div>
          </div>
        )}

        <div className={`recalibration-card ${intelligence.trainingHorizon.eventRetrospective.followUpActive ? "active" : ""}`}>
          <RefreshCcw size={17} />
          <div>
            <strong>
              {intelligence.trainingHorizon.eventRetrospective.followUpActive
                ? "Post-event repair loop active"
                : "No active post-event boost"}
            </strong>
            <span>
              {intelligence.trainingHorizon.eventRetrospective.followUpActive
                ? `Until ${intelligence.trainingHorizon.eventRetrospective.followUpUntil}, event-proven repair skills receive a bounded ${Math.round(intelligence.trainingHorizon.eventRetrospective.priorityMultiplier * 100)}% post-event priority multiplier.`
                : intelligence.trainingHorizon.eventRetrospective.reason}
            </span>
          </div>
        </div>

        {intelligence.trainingHorizon.eventRetrospective.note && (
          <div className="event-retro-note-grid">
            <article>
              <span>What worked</span>
              <p>{intelligence.trainingHorizon.eventRetrospective.note.whatWorked || "—"}</p>
            </article>
            <article>
              <span>What failed</span>
              <p>{intelligence.trainingHorizon.eventRetrospective.note.whatFailed || "—"}</p>
            </article>
            <article>
              <span>Next cycle</span>
              <p>{intelligence.trainingHorizon.eventRetrospective.note.nextCycleFocus || "—"}</p>
            </article>
          </div>
        )}

        <p className="coach-policy-note">
          The event review compares analyzed event games with analyzed preparation games from the configured competition block. It requires at least two event games and three preparation games before claiming improved/stable/regressed transfer. Unanalyzed or missing games remain visible as incomplete evidence instead of being silently ignored.
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
                ? "Analyze at least three human games before real-game diagnostics declare a cohort meaningfully stronger or weaker."
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
              : "History will build as new learning evidence arrives."}
          </span>
        </div>
      </section>
    </section>
  );
}
