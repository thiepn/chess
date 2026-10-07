import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gauge,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type {
  HumanGameCohortInsight,
  ProgressIntelligence,
  TrendPoint,
} from "../analytics/types";
import { skillTitle, stageTitle } from "../analytics/engine";
import type {
  CompetitionPlanSettings,
  TrainingGoalId,
  TrainingPlanSettings,
} from "../domain/types";
import { trainingGoals } from "../planning/periodization";
import type { TrainingPrescriptionAction } from "../prescriptions/types";
import "../styles/progress-v2.css";
import "../styles/p47-progress-native.css";
import "../styles/p51-progress-large.css";

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
  onUpdateTrainingPlan?: (patch: TrainingPlanPatch) => void;
  onUpdateCompetitionPlan?: (
    patch: Partial<CompetitionPlanSettings>,
  ) => void;
  onStartRecovery?: () => void;
  onEndRecovery?: () => void;
  onUpdateCompetitionRetrospective?: (
    field: "whatWorked" | "whatFailed" | "nextCycleFocus",
    value: string,
  ) => void;
}

function deltaLabel(value: number) {
  if (Math.abs(value) < 0.1) return "No measured change";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} / 30d`;
}

function calibrationText(
  label: ProgressIntelligence["calibration"]["label"],
) {
  if (label === "well-calibrated") {
    return "Your current level estimate matches recent stage checks.";
  }
  if (label === "overconfident") {
    return "Recent stage checks are below your current level estimate.";
  }
  if (label === "underconfident") {
    return "Recent stage checks are above your current level estimate.";
  }
  return "Complete more placement or stage checks before comparing the estimate.";
}

function estimateMatchLabel(
  label: ProgressIntelligence["calibration"]["label"],
) {
  if (label === "well-calibrated") return "Matches checks";
  if (label === "overconfident") return "Estimate is high";
  if (label === "underconfident") return "Estimate is low";
  return "More checks needed";
}

function coachBasisLabel(value: string) {
  if (value === "grounded") return "Recent games + training";
  if (value === "building") return "Still learning your play";
  return "Getting started";
}

function coachModeLabel(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function interventionLabel(value: string) {
  const labels: Record<string, string> = {
    review: "Review",
    weakness: "Focused practice",
    game: "Own-game positions",
    curriculum: "Course lessons",
    repertoire: "Opening practice",
    library: "Saved positions",
    assessment: "Stage-check follow-up",
    calibration: "Level check",
    focus: "Focused practice",
    manual: "Chosen study",
    placement: "Placement check",
    checkpoint: "Stage check",
    play: "Practice games",
    "game-review": "Game review",
  };
  return labels[value] ?? value;
}

function cohortDelta(item: HumanGameCohortInsight) {
  if (Math.abs(item.deltaVsBaseline) < 1) return "≈ baseline";
  return `${item.deltaVsBaseline > 0 ? "+" : ""}${Math.round(
    item.deltaVsBaseline,
  )}`;
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const width = 760;
  const height = 220;
  const padX = 30;
  const padY = 18;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2 - 16;

  function pathFor(key: "mastery" | "retention" | "transfer") {
    return points
      .map((point, index) => {
        const x =
          padX +
          (points.length <= 1
            ? innerWidth / 2
            : (index / (points.length - 1)) * innerWidth);
        const y = padY + (1 - point[key] / 100) * innerHeight;
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div className="progress-v2-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Eight-week skill level, recall and game-use trend"
      >
        {[25, 50, 75, 100].map((value) => {
          const y = padY + (1 - value / 100) * innerHeight;
          return (
            <g key={value}>
              <line
                className="progress-v2-grid"
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
              />
              <text className="progress-v2-grid-label" x={3} y={y + 3}>
                {value}
              </text>
            </g>
          );
        })}

        <polyline
          className="progress-v2-line mastery"
          points={pathFor("mastery")}
        />
        <polyline
          className="progress-v2-line retention"
          points={pathFor("retention")}
        />
        <polyline
          className="progress-v2-line transfer"
          points={pathFor("transfer")}
        />

        {points.map((point, index) => {
          const x =
            padX +
            (points.length <= 1
              ? innerWidth / 2
              : (index / (points.length - 1)) * innerWidth);
          return (
            <text
              key={point.at}
              className="progress-v2-axis-label"
              x={x}
              y={height - 2}
              textAnchor="middle"
            >
              {point.label}
            </text>
          );
        })}
      </svg>

      <div className="progress-v2-chart-legend">
        <span><i className="mastery" />Skill level</span>
        <span><i className="retention" />Recall</span>
        <span><i className="transfer" />In games</span>
      </div>
    </div>
  );
}

function CohortRows({
  items,
  empty,
}: {
  items: HumanGameCohortInsight[];
  empty: string;
}) {
  if (!items.length) {
    return <div className="progress-v2-empty">{empty}</div>;
  }

  return (
    <div className="progress-v2-cohorts">
      {items.slice(0, 6).map((item) => (
        <div key={`${item.dimension}:${item.key}`}>
          <span>
            <strong>{item.label}</strong>
            <small>
              {item.games} game{item.games === 1 ? "" : "s"} · {item.confidence}% confidence
            </small>
          </span>
          <span>
            <strong>{item.quality}%</strong>
            <small className={item.deltaVsBaseline >= 0 ? "positive" : "negative"}>
              {cohortDelta(item)}
            </small>
          </span>
        </div>
      ))}
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
  const practical = intelligence.practicalStrength;
  const horizon = intelligence.trainingHorizon;
  const forecast = intelligence.trainingPlanForecast;

  return (
    <section className="progress-v2" aria-labelledby="progress-v2-title">
      <header className="progress-v2-head">
        <button type="button" className="progress-v2-back" onClick={onBack}>
          <ArrowLeft size={15} />
          Train
        </button>

        <div>
          <span>Player development</span>
          <strong id="progress-v2-title">Progress</strong>
        </div>

        <div className="progress-v2-evidence">
          <BarChart3 size={14} />
          <span>{intelligence.evidenceCount30} tracked results · 30d</span>
        </div>
      </header>

      <section className="progress-v2-overview" aria-label="Practical strength">
        <aside className="progress-v2-rating">
          <span>Practical strength</span>
          <strong>{practical.rating}</strong>
          <small>{practical.status}</small>

          <div className="progress-v2-rating-meta">
            <div>
              <span>Confidence</span>
              <strong>{practical.confidence}%</strong>
            </div>
            <div>
              <span>Your games</span>
              <strong>{practical.humanGames}</strong>
            </div>
            <div>
              <span>Consistency</span>
              <strong>{practical.consistency}%</strong>
            </div>
            {practical.averageOpponentRating !== undefined && (
              <div>
                <span>Avg. opponent</span>
                <strong>{practical.averageOpponentRating}</strong>
              </div>
            )}
          </div>
        </aside>

        <div className="progress-v2-trajectory">
          <header>
            <div>
              <span>8-week development</span>
              <strong>{deltaLabel(intelligence.masteryDelta30)}</strong>
            </div>
            <small>
              {intelligence.activeDays28}/28 active days
            </small>
          </header>
          <TrendChart points={intelligence.trend} />
        </div>
      </section>

      <section className="progress-v2-metric-strip" aria-label="Core development metrics">
        <div>
          <span>Skill level</span>
          <strong>{intelligence.mastery}%</strong>
          <small>{deltaLabel(intelligence.masteryDelta30)}</small>
        </div>
        <div>
          <span>Recall</span>
          <strong>{intelligence.retention}%</strong>
          <small>Expected recall</small>
        </div>
        <div>
          <span>In games</span>
          <strong>{intelligence.transfer}%</strong>
          <small>
            Games {intelligence.humanTransfer}% · Practice {intelligence.aiTransfer}%
          </small>
        </div>
        <div>
          <span>Estimate match</span>
          <strong>
            {calibrated ? `${intelligence.calibration.score}%` : "—"}
          </strong>
          <small>
            {calibrated
              ? estimateMatchLabel(intelligence.calibration.label)
              : `${intelligence.calibration.sampleCount}/5 samples`}
          </small>
        </div>
      </section>

      <section className="progress-v2-development">
        <div className="progress-v2-stage-record">
          <header>
            <div>
              <span>Course progress</span>
              <strong>Stage pace</strong>
            </div>
            <Clock3 size={16} />
          </header>

          <div className="progress-v2-stage-list">
            {intelligence.stages.map((stage) => (
              <div
                key={stage.stageId}
                className={stage.certifiedAt ? "certified" : ""}
              >
                <span className="progress-v2-stage-mark">
                  {stage.certifiedAt ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    <i />
                  )}
                </span>
                <span className="progress-v2-stage-copy">
                  <strong>{stageTitle(stage.stageId)}</strong>
                  <small>
                    {stage.certifiedAt
                      ? `${stage.days}d to pass`
                      : stage.startedAt
                        ? `${stage.days}d active`
                        : "Not started"}
                  </small>
                </span>
                <span className="progress-v2-stage-scores">
                  <strong>{stage.mastery}%</strong>
                  <small>Recall {stage.retention}% · Games {stage.transfer}%</small>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="progress-v2-skills">
          <section>
            <header>
              <div>
                <span>Moving up</span>
                <strong>Improving</strong>
              </div>
              <TrendingUp size={16} />
            </header>
            <div>
              {intelligence.improving.length ? (
                intelligence.improving.slice(0, 6).map((item) => (
                  <div className="progress-v2-skill-row" key={item.skillId}>
                    <span>
                      <strong>{skillTitle(item.skillId)}</strong>
                      <small>
                        games {item.humanTransfer}% · recall {item.retention}%
                      </small>
                    </span>
                    <strong className="positive">
                      +{Math.max(0, item.delta30).toFixed(1)}
                    </strong>
                  </div>
                ))
              ) : (
                <div className="progress-v2-empty">
                  More recent training or game results are needed.
                </div>
              )}
            </div>
          </section>

          <section>
            <header>
              <div>
                <span>Not showing in games</span>
                <strong>Needs attention</strong>
              </div>
              <TrendingDown size={16} />
            </header>
            <div>
              {intelligence.needsAttention.slice(0, 7).map((item) => (
                <div className="progress-v2-skill-row" key={item.skillId}>
                  <span>
                    <strong>{skillTitle(item.skillId)}</strong>
                    <small>
                      skill {item.current}% · games {item.humanTransfer}%
                    </small>
                  </span>
                  {onTrainSkill ? (
                    <button
                      type="button"
                      onClick={() => onTrainSkill(item.skillId)}
                    >
                      Train
                    </button>
                  ) : (
                    <strong>{item.current}%</strong>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="progress-v2-coach">
          <header>
            <div>
              <span>Training focus</span>
              <strong>{intelligence.coachBrief.headline}</strong>
            </div>
            <Gauge size={16} />
          </header>

          <p>{intelligence.coachBrief.summary}</p>

          <div className="progress-v2-coach-state">
            <span>Basis</span>
            <strong>{coachBasisLabel(intelligence.coachBrief.evidenceState)}</strong>
            <small>
              {intelligence.coachBrief.confidence}% confidence · {intelligence.coachBrief.humanGames} of your games
            </small>
          </div>

          <div className="progress-v2-prescriptions">
            {intelligence.prescriptions.slice(0, 4).map((prescription) => (
              <article key={prescription.id}>
                <div>
                  <span>{prescription.target.label}</span>
                  <strong>{prescription.title}</strong>
                  <p>{prescription.rationale}</p>
                </div>
                <small>
                  {prescription.evidenceGames} games · {prescription.confidence}% confidence
                </small>
                {prescription.actions.length > 0 && onRunPrescriptionAction && (
                  <button
                    type="button"
                    onClick={() =>
                      onRunPrescriptionAction(
                        prescription.id,
                        prescription.actions[0],
                      )
                    }
                  >
                    {prescription.actions[0].label}
                    <ChevronRight size={13} />
                  </button>
                )}
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="progress-v2-real-games">
        <header>
          <div>
            <span>Your games</span>
            <strong>How training shows up</strong>
          </div>
          <div>
            <small>{intelligence.realGameDiagnostics.sampleCount} analyzed</small>
            <Activity size={16} />
          </div>
        </header>

        <div className="progress-v2-real-baseline">
          <div>
            <span>Quality</span>
            <strong>{intelligence.realGameDiagnostics.baselineQuality}%</strong>
          </div>
          <div>
            <span>Game score</span>
            <strong>{intelligence.realGameDiagnostics.baselinePracticalScore}</strong>
          </div>
          <div>
            <span>Recent form</span>
            <strong>{intelligence.realGameDiagnostics.recentForm.direction}</strong>
          </div>
          <div>
            <span>Results</span>
            <strong>{intelligence.realGameDiagnostics.baselineResultPerformance}%</strong>
          </div>
        </div>

        <div className="progress-v2-phase-performance">
          {intelligence.realGameDiagnostics.phases.map((phase) => (
            <div key={phase.phase}>
              <span>
                <strong>{phase.phase}</strong>
                <small>
                  {phase.games} games · avg loss {(phase.averageCentipawnLoss / 100).toFixed(2)}
                </small>
              </span>
              <div>
                <i style={{ width: `${phase.quality}%` }} />
              </div>
              <strong>{phase.quality}%</strong>
            </div>
          ))}
        </div>

        <div className="progress-v2-real-grid">
          <section>
            <header>
              <span>Opening families</span>
              <strong>Where structure matters</strong>
            </header>
            <CohortRows
              items={intelligence.realGameDiagnostics.openings}
              empty="Analyze more of your games to compare openings."
            />
          </section>

          <section>
            <header>
              <span>Playing conditions</span>
              <strong>Time, color and opposition</strong>
            </header>
            <CohortRows
              items={[
                ...intelligence.realGameDiagnostics.timeControls,
                ...intelligence.realGameDiagnostics.colors,
                ...intelligence.realGameDiagnostics.opponents,
              ]}
              empty="Analyze more games to compare time controls, colors, and opponents."
            />
          </section>
        </div>

        <section className="progress-v2-mistake-families">
          <header>
            <span>Patterns in your games</span>
            <strong>{intelligence.realGameDiagnostics.mistakeFamilies.length}</strong>
          </header>

          <div>
            {intelligence.realGameDiagnostics.mistakeFamilies.length ? (
              intelligence.realGameDiagnostics.mistakeFamilies
                .slice(0, 7)
                .map((item) => (
                  <div key={item.skillId}>
                    <span>
                      <strong>{item.label}</strong>
                      <small>
                        {item.games} games · {item.recurrenceRate}% recurrence · {item.averageImpact}cp
                      </small>
                    </span>
                    {onTrainSkill && (
                      <button
                        type="button"
                        onClick={() => onTrainSkill(item.skillId)}
                      >
                        Repair
                      </button>
                    )}
                  </div>
                ))
            ) : (
              <div className="progress-v2-empty">
                No repeated mistake pattern yet.
              </div>
            )}
          </div>
        </section>
      </section>

      <details className="progress-v2-plan">
        <summary>
          <div>
            <Gauge size={16} />
            <span>
              <strong>Training plan & competition cycle</strong>
              <small>
                {horizon.completedMinutes}/{horizon.managedWeeklyMinutes} min this week · {horizon.paceStatus}
              </small>
            </span>
          </div>
          <ChevronRight size={16} />
        </summary>

        <div className="progress-v2-plan-body">
          <section className="progress-v2-week">
            <header>
              <span>Current week</span>
              <strong>{horizon.goalLabel}</strong>
            </header>

            <div className="progress-v2-week-line">
              <div>
                <i
                  style={{
                    width: `${Math.min(
                      100,
                      (horizon.completedMinutes /
                        Math.max(1, horizon.managedWeeklyMinutes)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
              <span>
                {horizon.completedMinutes} / {horizon.managedWeeklyMinutes} min
              </span>
            </div>

            <div className="progress-v2-week-facts">
              <div>
                <span>Next focus</span>
                <strong>{horizon.nextFocusLabel}</strong>
              </div>
              <div>
                <span>Next session</span>
                <strong>{horizon.recommendedSessionMinutes} min</strong>
              </div>
              <div>
                <span>Remaining</span>
                <strong>{horizon.remainingMinutes} min</strong>
              </div>
              <div>
                <span>Forecast</span>
                <strong>{forecast.forecast.status}</strong>
              </div>
            </div>

            <div className="progress-v2-allocations">
              {horizon.allocations.map((item) => (
                <div key={item.bucket}>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.completedMinutes}/{item.targetMinutes} min</small>
                  </span>
                  <div>
                    <i style={{ width: `${Math.min(100, item.completion)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="progress-v2-plan-settings">
            <header>
              <span>Plan settings</span>
              <small>{horizon.goalDescription}</small>
            </header>

            <div className="progress-v2-goals">
              {(Object.keys(trainingGoals) as TrainingGoalId[]).map((goalId) => (
                <button
                  key={goalId}
                  type="button"
                  className={horizon.plan.goal === goalId ? "active" : ""}
                  aria-pressed={horizon.plan.goal === goalId}
                  onClick={() => onUpdateTrainingPlan?.({ goal: goalId })}
                >
                  {trainingGoals[goalId].label}
                </button>
              ))}
            </div>

            <div className="progress-v2-select-grid">
              <label>
                <span>Weekly budget</span>
                <select
                  value={horizon.plan.weeklyMinutes}
                  onChange={(event) =>
                    onUpdateTrainingPlan?.({
                      weeklyMinutes: Number(event.target.value),
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
                  value={horizon.plan.horizonWeeks}
                  onChange={(event) =>
                    onUpdateTrainingPlan?.({
                      horizonWeeks: Number(event.target.value) as 4 | 8 | 12,
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
                <span>Sessions / week</span>
                <select
                  value={horizon.plan.sessionsPerWeek}
                  onChange={(event) =>
                    onUpdateTrainingPlan?.({
                      sessionsPerWeek: Number(event.target.value),
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

            <div className="progress-v2-toggle-grid">
              <label>
                <input
                  type="checkbox"
                  checked={horizon.plan.autoRecalibrate !== false}
                  onChange={(event) =>
                    onUpdateTrainingPlan?.({
                      autoRecalibrate: event.target.checked,
                    })
                  }
                />
                <span>Automatic adherence adjustment</span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={horizon.plan.autoRecovery !== false}
                  onChange={(event) =>
                    onUpdateTrainingPlan?.({
                      autoRecovery: event.target.checked,
                    })
                  }
                />
                <span>Automatic lighter weeks</span>
              </label>
            </div>

            <div className="progress-v2-recovery">
              <span>
                <strong>
                  {horizon.loadManagement.manualRecoveryActive
                    ? "Lighter week active"
                    : horizon.loadManagement.appliedMode === "recovery"
                      ? "Automatic lighter week active"
                      : horizon.loadManagement.appliedMode === "watch"
                        ? "Training load is high"
                        : "Normal training"}
                </strong>
                <small>{horizon.loadManagement.reason}</small>
              </span>
              <button
                type="button"
                onClick={
                  horizon.loadManagement.manualRecoveryActive
                    ? onEndRecovery
                    : onStartRecovery
                }
                disabled={
                  horizon.loadManagement.manualRecoveryActive
                    ? !onEndRecovery
                    : !onStartRecovery
                }
              >
                {horizon.loadManagement.manualRecoveryActive
                  ? "End lighter week"
                  : "Start 7 lighter days"}
              </button>
            </div>
          </section>

          <section className="progress-v2-competition">
            <header>
              <span>Competition cycle</span>
              <strong>{horizon.competitionCycle.phaseLabel}</strong>
            </header>

            <label className="progress-v2-competition-toggle">
              <input
                type="checkbox"
                checked={horizon.plan.competition?.enabled ?? false}
                onChange={(event) =>
                  onUpdateCompetitionPlan?.({ enabled: event.target.checked })
                }
              />
              <span>Use event-specific preparation</span>
            </label>

            {horizon.plan.competition?.enabled && (
              <div className="progress-v2-select-grid competition">
                <label>
                  <span>Event date</span>
                  <input
                    type="date"
                    value={horizon.plan.competition?.eventDate ?? ""}
                    onChange={(event) =>
                      onUpdateCompetitionPlan?.({
                        eventDate: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Prep window</span>
                  <select
                    value={horizon.plan.competition?.prepWeeks ?? 6}
                    onChange={(event) =>
                      onUpdateCompetitionPlan?.({
                        prepWeeks: Number(event.target.value) as 4 | 6 | 8 | 12,
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
                  <span>Event days</span>
                  <select
                    value={horizon.plan.competition?.eventDays ?? 1}
                    onChange={(event) =>
                      onUpdateCompetitionPlan?.({
                        eventDays: Number(event.target.value) as 1 | 2 | 3 | 5 | 7,
                      })
                    }
                  >
                    {[1, 2, 3, 5, 7].map((days) => (
                      <option value={days} key={days}>
                        {days}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Reset</span>
                  <select
                    value={horizon.plan.competition?.resetDays ?? 5}
                    onChange={(event) =>
                      onUpdateCompetitionPlan?.({
                        resetDays: Number(event.target.value) as 3 | 5 | 7,
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
            )}

            {horizon.competitionCycle.enabled && (
              <div className="progress-v2-readiness">
                <div>
                  <span>Readiness</span>
                  <strong>{horizon.competitionCycle.readinessScore}%</strong>
                  <small>{horizon.competitionCycle.readinessStatus}</small>
                </div>
                <div>
                  <span>Managed load</span>
                  <strong>{horizon.competitionCycle.managedWeeklyMinutes}m</strong>
                  <small>{Math.round(horizon.competitionCycle.weeklyLoadMultiplier * 100)}%</small>
                </div>
                <p>{horizon.competitionCycle.reason}</p>
              </div>
            )}

            {horizon.eventRetrospective.available && (
              <div className="progress-v2-retro">
                <header>
                  <span>Event retrospective</span>
                  <strong>{horizon.eventRetrospective.translationStatus}</strong>
                </header>

                <div className="progress-v2-retro-metrics">
                  <span>
                    <strong>
                      {horizon.eventRetrospective.event.analyzedGames}/
                      {horizon.eventRetrospective.event.games}
                    </strong>
                    event games
                  </span>
                  <span>
                    <strong>
                      {horizon.eventRetrospective.qualityDelta >= 0 ? "+" : ""}
                      {horizon.eventRetrospective.qualityDelta}
                    </strong>
                    quality Δ
                  </span>
                  <span>
                    <strong>
                      {horizon.eventRetrospective.errorRateDelta >= 0 ? "+" : ""}
                      {horizon.eventRetrospective.errorRateDelta}
                    </strong>
                    error Δ
                  </span>
                </div>

                <div className="progress-v2-retro-notes">
                  <label>
                    <span>What worked?</span>
                    <textarea
                      rows={2}
                      value={horizon.eventRetrospective.note?.whatWorked ?? ""}
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
                      value={horizon.eventRetrospective.note?.whatFailed ?? ""}
                      onChange={(event) =>
                        onUpdateCompetitionRetrospective?.(
                          "whatFailed",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>Next cycle</span>
                    <textarea
                      rows={2}
                      value={
                        horizon.eventRetrospective.note?.nextCycleFocus ?? ""
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
              </div>
            )}
          </section>
        </div>
      </details>

      <details className="progress-v2-evidence-details">
        <summary>
          <div>
            <ShieldCheck size={16} />
            <span>
              <strong>How progress is estimated</strong>
              <small>
                Level checks, training results and recommendation history
              </small>
            </span>
          </div>
          <ChevronRight size={16} />
        </summary>

        <div className="progress-v2-evidence-body">
          <section>
            <header>
              <span>Estimate match</span>
              <strong>
                {calibrated
                  ? `${intelligence.calibration.score}%`
                  : "Not enough checks yet"}
              </strong>
            </header>
            <p>{calibrationText(intelligence.calibration.label)}</p>
            <small>
              {intelligence.calibration.sampleCount} stage checks · estimate offset {intelligence.calibration.bias.toFixed(1)}
            </small>
          </section>

          <section>
            <header>
              <span>Training suggestions</span>
              <strong>{intelligence.coachEffectiveness.validationRate}%</strong>
            </header>
            <div className="progress-v2-evidence-facts">
              <span>{intelligence.coachEffectiveness.issued} suggested</span>
              <span>{intelligence.coachEffectiveness.completed} completed</span>
              <span>{intelligence.coachEffectiveness.evaluated} checked</span>
              <span>{intelligence.coachEffectiveness.improved} improved</span>
            </div>
            <p>
              Mode: {coachModeLabel(intelligence.coachPolicy.mode)} · {intelligence.coachPolicy.learningConfidence}% confidence.
            </p>
          </section>

          <section>
            <header>
              <span>Training methods</span>
              <strong>{intelligence.interventions.length}</strong>
            </header>
            <div className="progress-v2-interventions">
              {intelligence.interventions.slice(0, 8).map((item) => (
                <div key={item.intervention}>
                  <span>
                    <strong>{interventionLabel(item.intervention)}</strong>
                    <small>{item.attempts} attempts · {item.successRate}% success</small>
                  </span>
                  <strong>
                    {item.averageMasteryGain >= 0 ? "+" : ""}
                    {item.averageMasteryGain.toFixed(1)}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <section>
            <header>
              <span>History</span>
              <strong>{intelligence.evidenceCount} tracked results</strong>
            </header>
            <p>
              {intelligence.historyStartedAt
                ? `Tracking from ${new Date(
                    intelligence.historyStartedAt,
                  ).toLocaleDateString()}.`
                : "Progress tracking has started."}
            </p>
            <small>
              {intelligence.resolvedMistakeCount} positions practiced · {intelligence.unresolvedMistakeCount} still open
            </small>
          </section>
        </div>
      </details>
    </section>
  );
}
