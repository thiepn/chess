import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Clock3,
  Compass,
  Library,
  Play,
  RefreshCcw,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import { composeSession, sessionMinutes } from "./domain/composer";
import { domainLabels, skillById } from "./domain/curriculum";
import { applyEvidence, emptyMastery } from "./domain/mastery";
import type {
  LearningEvidence,
  SessionMode,
  TrainingActivity,
  TrainingOutcome,
  UserState,
} from "./domain/types";
import { initialUserState } from "./data/demo";
import { createChessStateRepository } from "./lib/persistence";
import { LessonRunner } from "./components/LessonRunner";
import { PuzzleRunner } from "./components/PuzzleRunner";
import { LearnView } from "./components/LearnView";
import { ReviewView } from "./components/ReviewView";
import { PersonalMistakeRunner } from "./components/PersonalMistakeRunner";
import { weaknessesFromMistakes } from "./games/weaknesses";
import type { ImportedGame, PersonalMistake } from "./games/types";
import { OpeningsView } from "./components/OpeningsView";
import { OpeningTrainer } from "./components/OpeningTrainer";
import { openingNodes, repertoireById } from "./openings/repertoire";
import { applyOpeningAttempt, createOpeningProgress } from "./openings/progress";
import { openingDeviationsForGame } from "./openings/match";
import { PlayView } from "./components/PlayView";
import { StockfishBrowserEngine } from "./engine/stockfish";
import { analyzeImportedGame } from "./games/analyze";
import { scenarioById } from "./play/scenarios";
import type { PlayResult } from "./play/types";

const repo = createChessStateRepository();

const modeLabels: Record<SessionMode, string> = {
  quick: "Quick",
  standard: "Standard",
  deep: "Deep",
};

function activityIcon(activity: TrainingActivity) {
  if (activity.source === "weakness") return <Target size={18} />;
  if (activity.source === "review") return <RefreshCcw size={18} />;
  if (activity.activityType === "conceptLesson") return <BookOpen size={18} />;
  if (activity.activityType === "openingRecall") return <Compass size={18} />;
  if (activity.activityType === "engineGame") return <Swords size={18} />;
  return <BrainCircuit size={18} />;
}

function reasonLabel(activity: TrainingActivity) {
  if (activity.source === "weakness") return "FROM YOUR WEAKNESSES";
  if (activity.source === "review") return "REVIEW DUE";
  if (activity.source === "curriculum") return "CURRICULUM";
  if (activity.source === "focus") return "CURRENT FOCUS";
  return activity.source.toUpperCase();
}

export default function App() {
  const [state, setState] = useState<UserState>(initialUserState);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<SessionMode>("standard");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [manualActivity, setManualActivity] = useState<TrainingActivity | null>(null);
  const [learnMode, setLearnMode] = useState<"curriculum" | "openings">("curriculum");
  const [nav, setNav] = useState("home");

  useEffect(() => {
    repo.load(initialUserState).then((value) => {
      setState(value);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) void repo.save(state);
  }, [state, loaded]);

  const session = useMemo(() => composeSession(state, mode), [state, mode]);
  const sessionActivity = activeIndex === null ? null : session.activities[activeIndex];
  const active = manualActivity ?? sessionActivity;
  const activeSkill = active ? skillById[active.skillIds[0]] : null;
  const activeMistake =
    active?.mistakeId
      ? state.mistakes?.find((mistake) => mistake.id === active.mistakeId)
      : undefined;
  const activeOpeningNode =
    active?.openingNodeId ? openingNodes[active.openingNodeId] : undefined;
  const activeRepertoire =
    active?.repertoireId ? repertoireById[active.repertoireId] : undefined;

  const topWeakness = useMemo(() => {
    const weakness = [...state.weaknesses]
      .sort((a, b) => b.gameImpact * b.frequency * b.recency - a.gameImpact * a.frequency * a.recency)
      .find((item) => skillById[item.skillId]);
    return weakness
      ? { weakness, skill: skillById[weakness.skillId] }
      : null;
  }, [state.weaknesses]);

  const topDomains = useMemo(() => {
    const grouped = new Map<string, number[]>();
    Object.values(state.mastery).forEach((item) => {
      const domain = skillById[item.skillId]?.domain;
      if (!domain) return;
      grouped.set(domain, [...(grouped.get(domain) ?? []), item.effectiveMastery]);
    });
    return [...grouped.entries()]
      .map(([domain, values]) => ({
        domain,
        value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [state.mastery]);

  function completeActivity(outcome: TrainingOutcome) {
    if (!active || !activeSkill) return;
    const skillId = activeSkill.id;
    const occurredAt = new Date().toISOString();
    const source: LearningEvidence["source"] =
      active.source === "review"
        ? "delayedReview"
        : active.activityType === "themedPuzzle"
          ? "themedPuzzle"
          : active.activityType === "mixedPuzzle"
            ? "mixedPuzzle"
            : active.source === "weakness"
              ? "mixedPuzzle"
              : active.activityType === "conceptLesson"
                ? "lesson"
                : active.activityType === "guidedDemo"
                  ? "guided"
                  : "trainingPosition";

    const evidence: LearningEvidence = {
      skillId,
      source,
      success: outcome.success,
      quality: outcome.quality,
      difficulty: Math.min(1, activeSkill.difficulty / 5),
      hintsUsed: outcome.hintsUsed,
      occurredAt,
    };

    setState((previous) => {
      const previousMastery =
        previous.mastery[skillId] ??
        emptyMastery(skillId, Math.min(1, activeSkill.difficulty / 5));

      const puzzleHistory = { ...(previous.puzzleHistory ?? {}) };
      let mistakes = previous.mistakes ?? [];
      const openingProgress = { ...(previous.openingProgress ?? {}) };
      let openingDeviations = previous.openingDeviations ?? [];

      if (outcome.puzzleId) {
        const prior = puzzleHistory[outcome.puzzleId];
        puzzleHistory[outcome.puzzleId] = {
          puzzleId: outcome.puzzleId,
          attempts: (prior?.attempts ?? 0) + 1,
          successes: (prior?.successes ?? 0) + (outcome.success ? 1 : 0),
          lastAttemptAt: occurredAt,
          lastSuccessAt: outcome.success ? occurredAt : prior?.lastSuccessAt,
          lastQuality: outcome.quality,
          hintsUsed: outcome.hintsUsed,
          wrongAttempts: outcome.wrongAttempts,
        };
      }

      if (active.openingNodeId) {
        const prior =
          openingProgress[active.openingNodeId] ??
          createOpeningProgress(active.openingNodeId, new Date(occurredAt));
        openingProgress[active.openingNodeId] = applyOpeningAttempt(
          prior,
          outcome.success,
          outcome.quality,
          new Date(occurredAt),
        );

        openingDeviations = openingDeviations.map((deviation) =>
          deviation.nodeId === active.openingNodeId &&
          deviation.repertoireId === active.repertoireId
            ? { ...deviation, resolved: outcome.success }
            : deviation,
        );
      }

      if (outcome.mistakeId) {
        mistakes = mistakes.map((mistake) => {
          if (mistake.id !== outcome.mistakeId) return mistake;

          const successes = mistake.successes + (outcome.success ? 1 : 0);
          const attempts = mistake.attempts + 1;
          const intervalDays =
            successes >= 3 ? 30 : successes >= 2 ? 7 : successes >= 1 ? 1 : .25;

          return {
            ...mistake,
            attempts,
            successes,
            lastAttemptAt: occurredAt,
            resolved: successes >= 2,
            nextReviewAt: new Date(
              new Date(occurredAt).getTime() + intervalDays * 86_400_000,
            ).toISOString(),
          };
        });
      }

      return {
        ...previous,
        mastery: {
          ...previous.mastery,
          [skillId]: applyEvidence(previousMastery, evidence),
        },
        puzzleHistory,
        mistakes,
        openingProgress,
        openingDeviations,
      };
    });

    if (manualActivity) {
      setManualActivity(null);
      return;
    }

    if (activeIndex !== null && activeIndex < session.activities.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else {
      setActiveIndex(null);
    }
  }

  function handleAnalyzedGame(game: ImportedGame, newMistakes: PersonalMistake[]) {
    const occurredAt = new Date().toISOString();

    setState((previous) => {
      const games = [
        ...(previous.games ?? []).filter((item) => item.id !== game.id),
        game,
      ];
      const mistakes = [
        ...(previous.mistakes ?? []).filter((item) => item.gameId !== game.id),
        ...newMistakes,
      ];
      const mastery = { ...previous.mastery };
      const gameOpeningDeviations = openingDeviationsForGame(
        game,
        new Date(occurredAt),
      );
      const openingDeviations = [
        ...(previous.openingDeviations ?? []).filter(
          (item) => item.gameId !== game.id,
        ),
        ...gameOpeningDeviations,
      ];
      const openingProgress = { ...(previous.openingProgress ?? {}) };

      for (const deviation of gameOpeningDeviations) {
        const current =
          openingProgress[deviation.nodeId] ??
          createOpeningProgress(deviation.nodeId, new Date(occurredAt));
        openingProgress[deviation.nodeId] = {
          ...current,
          nextReviewAt: occurredAt,
        };
      }

      for (const mistake of newMistakes) {
        const skillId = mistake.skillIds[0];
        const skill = skillById[skillId];
        if (!skill) continue;

        const base =
          mastery[skillId] ??
          emptyMastery(skillId, Math.min(1, skill.difficulty / 5));

        mastery[skillId] = applyEvidence(base, {
          skillId,
          source: "realGame",
          success: false,
          quality: 0,
          difficulty: Math.min(1, skill.difficulty / 5),
          gameImpact:
            mistake.severity === "blunder"
              ? 1
              : mistake.severity === "mistake"
                ? .72
                : .45,
          occurredAt,
        });
      }

      return {
        ...previous,
        games,
        mistakes,
        mastery,
        weaknesses: weaknessesFromMistakes(mistakes),
        openingDeviations,
        openingProgress,
      };
    });
  }

  async function handlePlayFinished(result: PlayResult) {
    const occurredAt = result.completedAt;
    const scenario = result.scenarioId ? scenarioById[result.scenarioId] : undefined;

    setState((previous) => {
      const games = [
        ...(previous.games ?? []).filter((item) => item.id !== result.importedGame.id),
        result.importedGame,
      ];
      const gameOpeningDeviations = openingDeviationsForGame(
        result.importedGame,
        new Date(occurredAt),
      );
      const openingDeviations = [
        ...(previous.openingDeviations ?? []).filter(
          (item) => item.gameId !== result.importedGame.id,
        ),
        ...gameOpeningDeviations,
      ];
      const openingProgress = { ...(previous.openingProgress ?? {}) };
      const mastery = { ...previous.mastery };

      for (const deviation of gameOpeningDeviations) {
        const current =
          openingProgress[deviation.nodeId] ??
          createOpeningProgress(deviation.nodeId, new Date(occurredAt));
        openingProgress[deviation.nodeId] = {
          ...current,
          nextReviewAt: occurredAt,
        };
      }

      if (scenario) {
        const skill = skillById[scenario.skillId];
        if (skill) {
          const base =
            mastery[skill.id] ??
            emptyMastery(skill.id, Math.min(1, skill.difficulty / 5));

          mastery[skill.id] = applyEvidence(base, {
            skillId: skill.id,
            source: "trainingPosition",
            success: Boolean(result.scenarioSuccess),
            quality:
              result.outcome === "win"
                ? 1
                : result.outcome === "draw"
                  ? .72
                  : .3,
            difficulty: Math.min(1, skill.difficulty / 5),
            occurredAt,
          });
        }
      }

      return {
        ...previous,
        games,
        mastery,
        openingDeviations,
        openingProgress,
      };
    });

    let engine: StockfishBrowserEngine | null = null;
    try {
      engine = await StockfishBrowserEngine.create();
      const analyzed = await analyzeImportedGame(result.importedGame, engine, {
        depth: 10,
      });
      handleAnalyzedGame(analyzed.game, analyzed.mistakes);
      return true;
    } catch {
      return false;
    } finally {
      engine?.quit();
    }
  }

  function startMistakePractice(mistakeId: string) {
    const mistake = state.mistakes?.find((item) => item.id === mistakeId);
    if (!mistake) return;

    const skill = mistake.skillIds
      .map((skillId) => skillById[skillId])
      .find(Boolean);
    if (!skill) return;

    setManualActivity({
      id: `mistake:${mistake.id}`,
      source: "game",
      skillIds: [skill.id],
      activityType: "personalMistake",
      estimatedMinutes: 5,
      priority: 1,
      difficulty: skill.difficulty,
      novelty: 0,
      urgency: 1,
      reason: `From move ${mistake.moveNumber}: your own game`,
      title: skill.title,
      subtitle: "Personal mistake repair",
      mistakeId: mistake.id,
    });
  }

  function startOpeningPractice(repertoireId: string, nodeId: string) {
    const skill = skillById["openings.principles"];
    const repertoire = repertoireById[repertoireId];
    const node = openingNodes[nodeId];
    if (!skill || !repertoire || !node?.preferredChildId) return;

    setManualActivity({
      id: `opening:${repertoireId}:${nodeId}`,
      source: "repertoire",
      skillIds: [skill.id],
      activityType: "openingRecall",
      estimatedMinutes: 4,
      priority: 1,
      difficulty: skill.difficulty,
      novelty: 0,
      urgency: .7,
      reason: `${repertoire.versus}: repertoire recall`,
      title: repertoire.name,
      subtitle: node.name,
      openingNodeId: nodeId,
      repertoireId,
    });
  }

  function startManualLesson(skillId: string) {
    const skill = skillById[skillId];
    if (!skill) return;

    setManualActivity({
      id: `manual:${skillId}`,
      source: "curriculum",
      skillIds: [skillId],
      activityType: skill.trainingModes[0] ?? "conceptLesson",
      estimatedMinutes: 6,
      priority: 1,
      difficulty: skill.difficulty,
      novelty: 0,
      urgency: 0,
      reason: "Manual curriculum study",
      title: skill.title,
      subtitle: "Guided curriculum",
    });
  }

  function startManualPractice(skillId: string) {
    const skill = skillById[skillId];
    if (!skill) return;

    setManualActivity({
      id: `practice:${skillId}`,
      source: "focus",
      skillIds: [skillId],
      activityType: "themedPuzzle",
      estimatedMinutes: 4,
      priority: 1,
      difficulty: skill.difficulty,
      novelty: 0,
      urgency: .5,
      reason: "Focused puzzle practice",
      title: skill.title,
      subtitle: "Adaptive themed practice",
    });
  }

  const navItems = [
    ["home", "Home", Sparkles],
    ["learn", "Learn", BookOpen],
    ["play", "Play", Play],
    ["review", "Review", BarChart3],
    ["library", "Library", Library],
  ] as const;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">♞</div>
        <nav>
          {navItems.map(([id, label, Icon]) => (
            <button
              key={id}
              className={nav === id ? "nav-item active" : "nav-item"}
              onClick={() => setNav(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sync-chip">
          <span className="sync-dot" />
          {repo.mode === "supabase" ? "Account sync" : "Local-first"}
        </div>
      </aside>

      <main className="main">
        {nav === "home" ? (
          <>
            <header className="hero">
              <div>
                <p className="eyebrow">YOUR CHESS</p>
                <h1>Train what matters.</h1>
                <p className="hero-copy">
                  Today is weighted toward piece safety, retention and the next
                  curriculum step—not arbitrary puzzle volume.
                </p>
              </div>
              <div className="hero-emblem" aria-hidden="true">♞</div>
            </header>

            <section className="mode-switch" aria-label="Training duration">
              {(Object.keys(sessionMinutes) as SessionMode[]).map((item) => (
                <button
                  key={item}
                  className={mode === item ? "mode active" : "mode"}
                  onClick={() => {
                    setMode(item);
                    setActiveIndex(null);
                  }}
                >
                  <strong>{modeLabels[item]}</strong>
                  <span>{sessionMinutes[item]} min</span>
                </button>
              ))}
            </section>

            <section className="session-card">
              <div className="session-heading">
                <div>
                  <span className="pill"><Sparkles size={14} /> Adaptive session</span>
                  <h2>Today's training</h2>
                  <p>
                    {session.activities.length} focused activities · {session.plannedMinutes} min
                  </p>
                </div>
                <div className="time-orb">
                  <Clock3 size={20} />
                  <strong>{session.plannedMinutes}</strong>
                  <span>min</span>
                </div>
              </div>

              <div className="activity-list">
                {session.activities.map((activity, index) => (
                  <div className="activity-row" key={activity.id}>
                    <div className="activity-index">{index + 1}</div>
                    <div className="activity-icon">{activityIcon(activity)}</div>
                    <div className="activity-copy">
                      <small>{reasonLabel(activity)}</small>
                      <strong>{activity.title}</strong>
                      <span>{activity.subtitle}</span>
                    </div>
                    <div className="activity-time">{activity.estimatedMinutes}m</div>
                  </div>
                ))}
              </div>

              <button
                className="primary"
                onClick={() => setActiveIndex(0)}
                disabled={!session.activities.length}
              >
                Start training <ChevronRight size={18} />
              </button>
            </section>

            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-title">
                  <div>
                    <p className="eyebrow">PLAYER MODEL</p>
                    <h3>Your chess</h3>
                  </div>
                  <BrainCircuit size={20} />
                </div>
                <div className="skill-bars">
                  {topDomains.map(({ domain, value }) => (
                    <div className="skill-bar" key={domain}>
                      <div>
                        <span>{domainLabels[domain as keyof typeof domainLabels]}</span>
                        <strong>{value}</strong>
                      </div>
                      <div className="track"><i style={{ width: `${value}%` }} /></div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel weakness-panel">
                <div className="panel-title">
                  <div>
                    <p className="eyebrow">CURRENT PRIORITY</p>
                    <h3>{topWeakness?.skill.title ?? "Build your player model"}</h3>
                  </div>
                  <Target size={20} />
                </div>
                <p>
                  {topWeakness
                    ? "This skill currently carries the highest combined weight from frequency, recency and game impact."
                    : "Analyze games and complete training so the app can identify the most valuable next weakness."}
                </p>
                <div className="metric-row">
                  <span>Current mastery</span>
                  <strong>
                    {topWeakness
                      ? Math.round(state.mastery[topWeakness.skill.id]?.effectiveMastery ?? 0)
                      : 0}%
                  </strong>
                </div>
                <div className="priority-tag">
                  {topWeakness ? `${topWeakness.weakness.severity} · game evidence` : "Awaiting evidence"}
                </div>
              </article>
            </section>
          </>
        ) : nav === "learn" ? (
          learnMode === "openings" ? (
            <OpeningsView
              progress={state.openingProgress ?? {}}
              deviations={state.openingDeviations ?? []}
              onTrainNode={startOpeningPractice}
              onBack={() => setLearnMode("curriculum")}
            />
          ) : (
            <LearnView
              mastery={state.mastery}
              onStartLesson={startManualLesson}
              onStartPractice={startManualPractice}
              onOpenOpenings={() => setLearnMode("openings")}
            />
          )
        ) : nav === "play" ? (
          <PlayView
            mastery={state.mastery}
            onGameFinished={handlePlayFinished}
          />
        ) : nav === "review" ? (
          <ReviewView
            games={state.games ?? []}
            mistakes={state.mistakes ?? []}
            onAnalyzed={handleAnalyzedGame}
            onTrainMistake={startMistakePractice}
          />
        ) : (
          <section className="placeholder">
            <div className="placeholder-icon">
              <Library />
            </div>
            <p className="eyebrow">{nav.toUpperCase()}</p>
            <h2>{nav[0].toUpperCase() + nav.slice(1)} foundation ready</h2>
            <p>
              This area is reserved for the next specialized product phase.
              P3 now provides the shared interactive board and lesson engine.
            </p>
            <button className="secondary" onClick={() => setNav("home")}>Back home</button>
          </section>
        )}
      </main>

      <nav className="mobile-nav">
        {navItems.map(([id, label, Icon]) => (
          <button key={id} className={nav === id ? "active" : ""} onClick={() => setNav(id)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {active && activeSkill && (
        <div className="training-overlay" role="dialog" aria-modal="true">
          <section className="training-sheet">
            <div className="training-progress">
              <span
                style={{
                  width: manualActivity
                    ? "100%"
                    : `${(((activeIndex ?? 0) + 1) / Math.max(1, session.activities.length)) * 100}%`,
                }}
              />
            </div>
            <button
              className="close-button"
              onClick={() => {
                setActiveIndex(null);
                setManualActivity(null);
              }}
              aria-label="Close session"
            >
              ×
            </button>
            <div className="lesson-shell-heading">
              <div>
                <p className="eyebrow">{reasonLabel(active)}</p>
                <strong>{active.title}</strong>
              </div>
              <div className="lesson-context">
                <span>{domainLabels[activeSkill.domain]}</span>
                <span>{active.estimatedMinutes} min</span>
                <span>Difficulty {activeSkill.difficulty}/5</span>
              </div>
            </div>

            {active.activityType === "openingRecall" &&
            activeOpeningNode &&
            activeRepertoire ? (
              <OpeningTrainer
                repertoire={activeRepertoire}
                node={activeOpeningNode}
                onComplete={completeActivity}
              />
            ) : active.activityType === "personalMistake" && activeMistake ? (
              <PersonalMistakeRunner
                mistake={activeMistake}
                onComplete={completeActivity}
              />
            ) : active.activityType === "themedPuzzle" ||
            active.activityType === "mixedPuzzle" ? (
              <PuzzleRunner
                activity={active}
                skill={activeSkill}
                mastery={state.mastery[activeSkill.id]}
                history={state.puzzleHistory}
                onComplete={completeActivity}
              />
            ) : (
              <LessonRunner
                activity={active}
                skill={activeSkill}
                onComplete={completeActivity}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
