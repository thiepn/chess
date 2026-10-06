import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bookmark,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Clock3,
  ClipboardCheck,
  Compass,
  Library,
  Play,
  RefreshCcw,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import { composeSession, sessionMinutes } from "./domain/composer";
import {
  curriculumStages,
  domainLabels,
  skillById,
} from "./domain/curriculum";
import { applyEvidence, emptyMastery } from "./domain/mastery";
import type {
  CompetitionPlanSettings,
  CompetitionRetrospectiveNote,
  CurriculumStageId,
  LearningEvidence,
  SessionMode,
  TrainingActivity,
  TrainingGoalId,
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
import { GameArena } from "./components/GameArena";
import { StockfishBrowserEngine } from "./engine/stockfish";
import { analyzeImportedGame } from "./games/analyze";
import { timeControlWeight } from "./games/practical";
import {
  mergeReanalyzedDeviations,
  mergeReanalyzedMistakes,
} from "./games/refresh";
import { scenarioById } from "./play/scenarios";
import { aiProfiles, resolveAiProfile } from "./play/profiles";
import type { PlayResult, TrainingScenario } from "./play/types";
import { LibraryView } from "./components/LibraryView";
import { SavedStudyTrainer } from "./components/SavedStudyTrainer";
import type { SavedStudy } from "./library/types";
import { applyStudyAttempt } from "./library/progress";
import { ExperienceProvider } from "./interaction/ExperienceProvider";
import { ExperienceControls } from "./components/ExperienceControls";
import { defaultExperienceSettings } from "./interaction/types";
import { emitExperienceEvent } from "./interaction/events";
import { AssessmentRunner } from "./components/AssessmentRunner";
import {
  applyAssessmentToState,
  buildPlacementAssessment,
  buildStageCheckpoint,
  checkpointAttemptCount,
  courseCurriculumFloor,
  evaluateStageGate,
} from "./assessment/engine";
import type {
  AssessmentItemResult,
  AssessmentSession,
  StageGateEvaluation,
} from "./assessment/types";
import {
  appendEvidenceAnalytics,
  ensureAnalyticsState,
} from "./analytics/record";
import { buildProgressIntelligence } from "./analytics/engine";
import { ProgressView } from "./components/ProgressView";
import {
  fetchLichessProfile,
  fetchRecentLichessGames,
} from "./lichess/api";
import type {
  TrainingPrescriptionAction,
} from "./prescriptions/types";
import {
  markPrescriptionCompleted,
  markPrescriptionStarted,
  syncPrescriptionHistory,
} from "./prescriptions/outcomes";
import {
  appendTrainingLedger,
  trainingGoals,
  trainingPlanForState,
} from "./planning/periodization";
import { recoveryUntil } from "./planning/load";
import { defaultCompetitionPlan } from "./planning/cycle";

const repo = createChessStateRepository();

const modeLabels: Record<SessionMode, string> = {
  quick: "Quick",
  standard: "Standard",
  deep: "Deep",
};

function activityIcon(activity: TrainingActivity) {
  if (activity.source === "prescription") return <ClipboardCheck size={18} />;
  if (activity.source === "weakness") return <Target size={18} />;
  if (activity.source === "review") return <RefreshCcw size={18} />;
  if (activity.source === "assessment") return <ClipboardCheck size={18} />;
  if (activity.activityType === "conceptLesson") return <BookOpen size={18} />;
  if (activity.activityType === "openingRecall") return <Compass size={18} />;
  if (activity.activityType === "savedStudy") return <Bookmark size={18} />;
  if (activity.activityType === "engineGame") return <Swords size={18} />;
  return <BrainCircuit size={18} />;
}

function gateStatusLabel(status: StageGateEvaluation["status"]) {
  if (status === "passed") return "Certified";
  if (status === "ready") return "Checkpoint ready";
  if (status === "placed") return "Placement cleared";
  if (status === "remediation") return "Repair needed";
  if (status === "provisional") return "Evidence pending";
  if (status === "locked") return "Locked";
  return "Building evidence";
}

function gateBlockerLabel(key: keyof StageGateEvaluation["metrics"]) {
  if (key === "coverage") return "breadth";
  if (key === "mastery") return "mastery";
  if (key === "retention") return "retention";
  if (key === "transfer") return "transfer";
  return "checkpoint";
}

function reasonLabel(activity: TrainingActivity) {
  if (activity.source === "prescription") return "FROM YOUR REAL-GAME PLAN";
  if (activity.source === "weakness") return "FROM YOUR WEAKNESSES";
  if (activity.source === "review") return "REVIEW DUE";
  if (activity.source === "curriculum") return "CURRICULUM";
  if (activity.source === "focus") return "CURRENT FOCUS";
  if (activity.source === "library") return "FROM YOUR LIBRARY";
  if (activity.source === "assessment") return "CHECKPOINT REMEDIATION";
  return activity.source.toUpperCase();
}

export default function App() {
  const [state, setState] = useState<UserState>(initialUserState);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<SessionMode>("standard");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [manualActivity, setManualActivity] = useState<TrainingActivity | null>(null);
  const [learnMode, setLearnMode] = useState<"curriculum" | "openings">("curriculum");
  const [replayScenario, setReplayScenario] = useState<TrainingScenario | undefined>();
  const [assessmentSession, setAssessmentSession] =
    useState<AssessmentSession | null>(null);
  const [nav, setNav] = useState("home");
  const [lichessSyncing, setLichessSyncing] = useState(false);
  const lichessSyncInFlight = useRef(false);
  const [lichessSyncMessage, setLichessSyncMessage] = useState<string | null>(null);
  const [lichessSyncError, setLichessSyncError] = useState<string | null>(null);

  useEffect(() => {
    repo.load(initialUserState).then((value) => {
      setState(ensureAnalyticsState(value));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) void repo.save(state);
  }, [state, loaded]);

  useEffect(() => {
    if (!loaded || !state.lichess?.autoSync) return;

    const syncIfDue = () => {
      if (lichessSyncInFlight.current) return;
      const lastSync = state.lichess?.lastSyncAt
        ? new Date(state.lichess.lastSyncAt).getTime()
        : 0;
      const due = Date.now() - lastSync >= 15 * 60 * 1000;
      if (due) void syncLichessGames(true);
    };

    syncIfDue();
    window.addEventListener("focus", syncIfDue);
    return () => window.removeEventListener("focus", syncIfDue);
  }, [
    loaded,
    state.lichess?.autoSync,
    state.lichess?.lastSyncAt,
    state.lichess?.username,
  ]);

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
  const activeStudy =
    active?.studyId
      ? state.savedStudies?.find((study) => study.id === active.studyId)
      : undefined;
  const activeScenarioBase =
    active?.scenarioId ? scenarioById[active.scenarioId] : undefined;
  const activeScenario =
    activeScenarioBase && active?.prescriptionId
      ? {
          ...activeScenarioBase,
          prescriptionId: active.prescriptionId,
          prescriptionActionId:
            active.prescriptionActionId,
        }
      : activeScenarioBase;
  const activeGameProfile =
    active?.adaptivePolicy?.challenge === "recovery"
      ? aiProfiles.gentle
      : active?.adaptivePolicy?.challenge === "supported"
        ? aiProfiles.developing
        : active?.adaptivePolicy?.challenge === "stretch"
          ? aiProfiles.strong
          : active?.adaptivePolicy?.challenge === "maintenance"
            ? aiProfiles.club
            : resolveAiProfile("adaptive", state.mastery);

  const stageGates = useMemo(
    () =>
      Object.fromEntries(
        curriculumStages.map((stage) => [
          stage.id,
          evaluateStageGate(state, stage.id),
        ]),
      ) as Record<CurriculumStageId, StageGateEvaluation>,
    [state],
  );

  const currentCourseStage = useMemo(() => {
    const placementOrder = state.placement
      ? curriculumStages.find(
          (stage) => stage.id === state.placement?.recommendedStageId,
        )?.order ?? 0
      : 0;

    return (
      curriculumStages.find(
        (stage) =>
          stage.order >= placementOrder &&
          stageGates[stage.id].status !== "passed" &&
          stageGates[stage.id].status !== "locked",
      ) ??
      curriculumStages.find(
        (stage) => stageGates[stage.id].status !== "passed",
      ) ??
      curriculumStages[curriculumStages.length - 1]
    );
  }, [stageGates, state.placement]);

  const currentCourseGate = stageGates[currentCourseStage.id];
  const progressIntelligence = useMemo(
    () => buildProgressIntelligence(state),
    [state],
  );
  const topPrescription =
    progressIntelligence.prescriptions[0];

  useEffect(() => {
    if (!loaded) return;

    setState((previous) => {
      const prescriptionHistory =
        syncPrescriptionHistory(
          previous,
          progressIntelligence.prescriptions,
        );

      if (
        prescriptionHistory ===
        previous.prescriptionHistory
      ) {
        return previous;
      }

      return {
        ...previous,
        prescriptionHistory,
      };
    });
  }, [loaded, progressIntelligence.prescriptions]);

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

  async function linkLichess(username: string) {
    setLichessSyncError(null);
    setLichessSyncMessage(null);

    try {
      const profile = await fetchLichessProfile(username);
      if (profile.disabled) {
        throw new Error("That Lichess account is disabled.");
      }

      const linkedAt = new Date().toISOString();
      setState((previous) => ({
        ...previous,
        lichess: {
          username: profile.username,
          linkedAt,
          autoSync: true,
        },
      }));
      setLichessSyncMessage(`Linked @${profile.username}. Syncing recent games…`);

      window.setTimeout(() => {
        void syncLichessGames(false, profile.username);
      }, 0);
    } catch (cause) {
      setLichessSyncError(
        cause instanceof Error ? cause.message : "Could not link Lichess.",
      );
      throw cause;
    }
  }

  function unlinkLichess() {
    setState((previous) => {
      const { lichess: _lichess, ...rest } = previous;
      return rest;
    });
    setLichessSyncMessage(null);
    setLichessSyncError(null);
  }

  async function syncLichessGames(
    silent = false,
    usernameOverride?: string,
  ) {
    if (lichessSyncInFlight.current) return;

    const connection = state.lichess;
    const username = usernameOverride ?? connection?.username;
    if (!username) return;

    lichessSyncInFlight.current = true;
    setLichessSyncing(true);
    setLichessSyncError(null);
    if (!silent) setLichessSyncMessage("Checking Lichess for finished games…");

    try {
      const fetched = await fetchRecentLichessGames(username, {
        max: 12,
        since: usernameOverride ? undefined : connection?.lastSyncAt,
      });

      const existing = new Set(
        (state.games ?? []).map((game) =>
          game.externalId ? `lichess:${game.externalId}` : game.id,
        ),
      );
      const fresh = fetched.filter(
        (game) =>
          !existing.has(
            game.externalId ? `lichess:${game.externalId}` : game.id,
          ),
      );
      const syncedAt = new Date().toISOString();

      setState((previous) => {
        const currentIds = new Set(
          (previous.games ?? []).map((game) =>
            game.externalId ? `lichess:${game.externalId}` : game.id,
          ),
        );
        const uniqueFresh = fresh.filter(
          (game) =>
            !currentIds.has(
              game.externalId ? `lichess:${game.externalId}` : game.id,
            ),
        );

        return {
          ...previous,
          games: [...(previous.games ?? []), ...uniqueFresh],
          lichess: {
            username,
            linkedAt: previous.lichess?.linkedAt ?? syncedAt,
            autoSync: previous.lichess?.autoSync ?? true,
            lastSyncAt: syncedAt,
            lastImportedAt:
              uniqueFresh.at(-1)?.importedAt ??
              previous.lichess?.lastImportedAt,
            lastSyncCount: uniqueFresh.length,
          },
        };
      });

      const message = fresh.length
        ? `Imported ${fresh.length} new human game${fresh.length === 1 ? "" : "s"} into Review.`
        : "Lichess is up to date.";
      setLichessSyncMessage(message);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not sync Lichess games.";
      setLichessSyncError(message);
      if (!silent) setLichessSyncMessage(null);
    } finally {
      lichessSyncInFlight.current = false;
      setLichessSyncing(false);
    }
  }

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

    const currentMastery =
      state.mastery[skillId] ??
      emptyMastery(skillId, Math.min(1, activeSkill.difficulty / 5));
    const projectedMastery = applyEvidence(currentMastery, evidence);
    const crossed90 =
      currentMastery.effectiveMastery < 90 &&
      projectedMastery.effectiveMastery >= 90;
    const crossed75 =
      currentMastery.effectiveMastery < 75 &&
      projectedMastery.effectiveMastery >= 75;
    const crossed60 =
      currentMastery.effectiveMastery < 60 &&
      projectedMastery.effectiveMastery >= 60;

    emitExperienceEvent({
      feedback: outcome.success ? "complete" : "error",
      celebration: outcome.success
        ? crossed90
          ? "large"
          : crossed75
            ? "medium"
            : crossed60 ||
                active.activityType === "personalMistake" ||
                active.activityType === "savedStudy"
              ? "small"
              : undefined
        : undefined,
    });

    setState((previous) => {
      const previousMastery =
        previous.mastery[skillId] ??
        emptyMastery(skillId, Math.min(1, activeSkill.difficulty / 5));

      const puzzleHistory = { ...(previous.puzzleHistory ?? {}) };
      let mistakes = previous.mistakes ?? [];
      const openingProgress = { ...(previous.openingProgress ?? {}) };
      let openingDeviations = previous.openingDeviations ?? [];
      let savedStudies = previous.savedStudies ?? [];

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

      if (outcome.studyId) {
        savedStudies = savedStudies.map((study) => {
          if (study.id !== outcome.studyId || !study.training) return study;
          return {
            ...study,
            training: applyStudyAttempt(
              study.training,
              outcome.success,
              outcome.quality,
              new Date(occurredAt),
            ),
            updatedAt: occurredAt,
          };
        });
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

      const nextMastery = applyEvidence(previousMastery, evidence);
      const prescriptionHistory =
        active.prescriptionId
          ? markPrescriptionCompleted(
              previous.prescriptionHistory,
              active.prescriptionId,
              active.prescriptionActionId ?? active.id,
              outcome.success,
              outcome.quality,
              new Date(occurredAt),
            )
          : previous.prescriptionHistory;

      return {
        ...previous,
        mastery: {
          ...previous.mastery,
          [skillId]: nextMastery,
        },
        analytics: appendEvidenceAnalytics(
          previous.analytics,
          previousMastery,
          nextMastery,
          evidence,
          active.id.startsWith("manual:") ? "manual" : active.source,
        ),
        puzzleHistory,
        mistakes,
        openingProgress,
        openingDeviations,
        savedStudies,
        prescriptionHistory,
        trainingLedger: appendTrainingLedger(
          previous.trainingLedger,
          active,
          activeSkill.domain,
          occurredAt,
        ),
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
      const priorGame = (previous.games ?? []).find((item) => item.id === game.id);
      const alreadyAnalyzed = Boolean(priorGame?.analyzedAt);
      const mistakes = mergeReanalyzedMistakes(
        previous.mistakes ?? [],
        newMistakes,
        game.id,
      );
      const mastery = { ...previous.mastery };
      let analytics = previous.analytics;
      const gameOpeningDeviations = openingDeviationsForGame(
        game,
        new Date(occurredAt),
      );
      const openingDeviations = mergeReanalyzedDeviations(
        previous.openingDeviations ?? [],
        gameOpeningDeviations,
        game.id,
      );
      const openingProgress = { ...(previous.openingProgress ?? {}) };

      if (!alreadyAnalyzed) {
        for (const deviation of gameOpeningDeviations) {
          const current =
            openingProgress[deviation.nodeId] ??
            createOpeningProgress(deviation.nodeId, new Date(occurredAt));
          openingProgress[deviation.nodeId] = {
            ...current,
            nextReviewAt: occurredAt,
          };
        }
      }

      const reviewEvidenceSource: LearningEvidence["source"] =
        game.source === "lichess"
          ? "humanGame"
          : game.source === "training"
            ? "aiGameReview"
            : "realGame";
      const contextWeight = timeControlWeight(game.timeControlCategory);
      const mistakeSkills = new Set(
        newMistakes.flatMap((mistake) => mistake.skillIds),
      );

      for (const mistake of alreadyAnalyzed ? [] : newMistakes) {
        const skillId = mistake.skillIds[0];
        const skill = skillById[skillId];
        if (!skill) continue;

        const base =
          mastery[skillId] ??
          emptyMastery(skillId, Math.min(1, skill.difficulty / 5));

        const evidence: LearningEvidence = {
          skillId,
          source: reviewEvidenceSource,
          success: false,
          quality: 0,
          difficulty: Math.min(1, skill.difficulty / 5),
          gameImpact:
            mistake.severity === "blunder"
              ? 1
              : mistake.severity === "mistake"
                ? .72
                : .45,
          opponentRating: game.opponentRating,
          timeControlWeight: contextWeight,
          occurredAt,
        };
        const nextMastery = applyEvidence(base, evidence);
        mastery[skillId] = nextMastery;
        analytics = appendEvidenceAnalytics(
          analytics,
          base,
          nextMastery,
          evidence,
          "game-review",
        );
      }

      if (!alreadyAnalyzed) {
        for (const validation of game.practicalMetrics?.skillValidations ?? []) {
          if (mistakeSkills.has(validation.skillId)) continue;
          const skill = skillById[validation.skillId];
          if (!skill) continue;

          const base =
            mastery[skill.id] ??
            emptyMastery(skill.id, Math.min(1, skill.difficulty / 5));
          const quality = Math.max(
            .58,
            Math.min(
              .96,
              .68 +
                validation.occurrences * .045 -
                validation.averageCentipawnLoss / 220,
            ),
          );
          const evidence: LearningEvidence = {
            skillId: skill.id,
            source: reviewEvidenceSource,
            success: true,
            quality,
            difficulty: Math.min(1, skill.difficulty / 5),
            gameImpact: Math.min(1, validation.occurrences / 5),
            opponentRating: game.opponentRating,
            timeControlWeight: contextWeight,
            occurredAt,
          };
          const nextMastery = applyEvidence(base, evidence);
          mastery[skill.id] = nextMastery;
          analytics = appendEvidenceAnalytics(
            analytics,
            base,
            nextMastery,
            evidence,
            "game-review",
          );
        }
      }

      return {
        ...previous,
        games,
        mistakes,
        mastery,
        weaknesses: weaknessesFromMistakes(mistakes),
        openingDeviations,
        openingProgress,
        analytics,
      };
    });
  }

  async function handlePlayFinished(result: PlayResult) {
    const occurredAt = result.completedAt;
    const scenario = result.scenarioId ? scenarioById[result.scenarioId] : undefined;
    const trainingSkillId = scenario?.skillId ?? result.trainingSkillId;

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
      let analytics = previous.analytics;

      for (const deviation of gameOpeningDeviations) {
        const current =
          openingProgress[deviation.nodeId] ??
          createOpeningProgress(deviation.nodeId, new Date(occurredAt));
        openingProgress[deviation.nodeId] = {
          ...current,
          nextReviewAt: occurredAt,
        };
      }

      if (trainingSkillId) {
        const skill = skillById[trainingSkillId];
        if (skill) {
          const base =
            mastery[skill.id] ??
            emptyMastery(skill.id, Math.min(1, skill.difficulty / 5));

          const evidence: LearningEvidence = {
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
          };
          const nextMastery = applyEvidence(base, evidence);
          mastery[skill.id] = nextMastery;
          analytics = appendEvidenceAnalytics(
            analytics,
            base,
            nextMastery,
            evidence,
            "play",
          );
        }
      }

      const prescriptionHistory =
        result.prescriptionId
          ? markPrescriptionCompleted(
              previous.prescriptionHistory,
              result.prescriptionId,
              result.prescriptionActionId ??
                result.scenarioId ??
                result.importedGame.id,
              Boolean(result.scenarioSuccess),
              result.outcome === "win"
                ? 1
                : result.outcome === "draw"
                  ? .72
                  : .3,
              new Date(occurredAt),
            )
          : previous.prescriptionHistory;

      return {
        ...previous,
        games,
        mastery,
        openingDeviations,
        openingProgress,
        analytics,
        prescriptionHistory,
        trainingLedger:
          active &&
          active.activityType === "engineGame" &&
          activeSkill
            ? appendTrainingLedger(
                previous.trainingLedger,
                active,
                activeSkill.domain,
                occurredAt,
              )
            : previous.trainingLedger,
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

  function replayMistakePosition(
    mistakeId: string,
    prescriptionId?: string,
    prescriptionActionId?: string,
  ) {
    const mistake = state.mistakes?.find((item) => item.id === mistakeId);
    if (!mistake) return;

    const skillId = mistake.skillIds.find((id) => skillById[id]) ?? mistake.skillIds[0];
    if (!skillId) return;

    const successResults: TrainingScenario["successResults"] =
      mistake.evaluationBefore >= 180 ? ["win"] : ["win", "draw"];

    setReplayScenario({
      id: `replay:${mistake.id}`,
      mode: "replay",
      title: "Replay the critical position",
      subtitle: `From move ${mistake.moveNumber} of your game`,
      description:
        "Start from the exact position before your original decision and prove the improved plan survives against resistance.",
      fen: mistake.positionFen,
      playerColor: mistake.playerColor,
      skillId,
      objective:
        mistake.evaluationBefore >= 180
          ? "Convert the advantage without repeating the original mistake."
          : "Reach a stable result without repeating the original mistake.",
      successResults,
      sourceLabel: "Replay from Review",
      prescriptionId,
      prescriptionActionId,
    });
    setNav("play");
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

  function startOpeningPractice(
    repertoireId: string,
    nodeId: string,
    prescriptionId?: string,
    prescriptionActionId?: string,
  ) {
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
      prescriptionId,
      prescriptionActionId,
    });
  }

  function saveStudy(study: SavedStudy) {
    setState((previous) => ({
      ...previous,
      savedStudies: [
        ...(previous.savedStudies ?? []).filter((item) => item.id !== study.id),
        study,
      ],
    }));
  }

  function deleteStudy(studyId: string) {
    setState((previous) => ({
      ...previous,
      savedStudies: (previous.savedStudies ?? []).filter(
        (study) => study.id !== studyId,
      ),
    }));
  }

  function toggleStudyFavorite(studyId: string) {
    setState((previous) => ({
      ...previous,
      savedStudies: (previous.savedStudies ?? []).map((study) =>
        study.id === studyId
          ? {
              ...study,
              favorite: !study.favorite,
              updatedAt: new Date().toISOString(),
            }
          : study,
      ),
    }));
  }

  function startStudyTraining(studyId: string) {
    const study = state.savedStudies?.find((item) => item.id === studyId);
    const training = study?.training;
    const skill = training ? skillById[training.skillId] : undefined;
    if (!study || !training || !skill) return;

    setManualActivity({
      id: `library:${study.id}`,
      source: "library",
      skillIds: [skill.id],
      activityType: "savedStudy",
      estimatedMinutes: 5,
      priority: 1,
      difficulty: skill.difficulty,
      novelty: 0,
      urgency: .75,
      reason: "Saved from your analysis workspace",
      title: study.title,
      subtitle: "Personal study recall",
      studyId: study.id,
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

  function startManualPractice(
    skillId: string,
    prescriptionId?: string,
    prescriptionActionId?: string,
  ) {
    const skill = skillById[skillId];
    if (!skill) return;

    const activityType =
      skill.trainingModes.includes("mixedPuzzle")
        ? "mixedPuzzle"
        : skill.trainingModes.includes("themedPuzzle")
          ? "themedPuzzle"
          : skill.trainingModes.includes("guidedDemo")
            ? "guidedDemo"
            : skill.trainingModes.includes("conceptLesson")
              ? "conceptLesson"
              : skill.trainingModes.includes("microReview")
                ? "microReview"
                : "conceptLesson";

    setManualActivity({
      id: `practice:${skillId}`,
      source: "focus",
      skillIds: [skillId],
      activityType,
      estimatedMinutes:
        activityType === "mixedPuzzle"
          ? 5
          : activityType === "themedPuzzle"
            ? 4
            : activityType === "guidedDemo"
              ? 4
              : 6,
      priority: 1,
      difficulty: skill.difficulty,
      novelty: 0,
      urgency: .5,
      reason: prescriptionId
        ? "Real-game prescription"
        : "Focused practice",
      title: skill.title,
      subtitle:
        activityType === "mixedPuzzle" ||
        activityType === "themedPuzzle"
          ? "Adaptive retrieval practice"
          : "Guided concept repair",
      prescriptionId,
      prescriptionActionId,
    });
  }

  function runPrescriptionAction(
    prescriptionId: string,
    action: TrainingPrescriptionAction,
  ) {
    const prescription =
      progressIntelligence.prescriptions.find(
        (item) => item.id === prescriptionId,
      );
    if (!prescription) return;

    setState((previous) => ({
      ...previous,
      prescriptionHistory: markPrescriptionStarted(
        previous.prescriptionHistory,
        prescription,
        action.id,
      ),
    }));

    if (
      action.kind === "focused-practice" &&
      action.skillId
    ) {
      startManualPractice(
        action.skillId,
        prescription.id,
        action.id,
      );
      setNav("home");
      return;
    }

    if (
      action.kind === "mistake-replay" &&
      action.mistakeId
    ) {
      replayMistakePosition(
        action.mistakeId,
        prescription.id,
        action.id,
      );
      return;
    }

    if (
      action.kind === "opening-recall" &&
      action.repertoireId &&
      action.openingNodeId
    ) {
      startOpeningPractice(
        action.repertoireId,
        action.openingNodeId,
        prescription.id,
        action.id,
      );
      setNav("home");
      return;
    }

    if (
      action.kind === "scenario" &&
      action.scenarioId
    ) {
      const scenario = scenarioById[action.scenarioId];
      if (!scenario) return;
      setReplayScenario({
        ...scenario,
        prescriptionId: prescription.id,
        prescriptionActionId: action.id,
      });
      setNav("play");
    }
  }

  function startPlacementAssessment() {
    setActiveIndex(null);
    setManualActivity(null);
    setAssessmentSession(buildPlacementAssessment());
  }

  function startStageCheckpoint(stageId: CurriculumStageId) {
    if (stageGates[stageId].status === "locked") return;
    setActiveIndex(null);
    setManualActivity(null);
    setAssessmentSession(
      buildStageCheckpoint(
        stageId,
        checkpointAttemptCount(state, stageId),
      ),
    );
  }

  function completeAssessment(results: AssessmentItemResult[]) {
    if (!assessmentSession) return;

    const applied = applyAssessmentToState(
      state,
      assessmentSession,
      results,
      new Date(),
    );

    setState(applied.state);
    setAssessmentSession(null);

    emitExperienceEvent({
      feedback:
        applied.attempt.score >= 80 || assessmentSession.kind === "placement"
          ? "complete"
          : "error",
      celebration: applied.certification ? "medium" : undefined,
    });
  }

  function updateExperience(settings: typeof defaultExperienceSettings) {
    setState((previous) => ({
      ...previous,
      experience: settings,
    }));
  }


  function updateTrainingPlan(
    patch: Partial<{
      goal: TrainingGoalId;
      weeklyMinutes: number;
      horizonWeeks: 4 | 8 | 12;
      sessionsPerWeek: number;
      autoRecalibrate: boolean;
      autoRecovery: boolean;
      manualRecoveryUntil: string;
      competition: CompetitionPlanSettings;
    }>,
  ) {
    setState((previous) => {
      const current =
        trainingPlanForState(previous);
      const structuralChange =
        "goal" in patch ||
        "weeklyMinutes" in patch ||
        "horizonWeeks" in patch ||
        "sessionsPerWeek" in patch;

      return {
        ...previous,
        trainingPlan: {
          ...current,
          ...patch,
          updatedAt: structuralChange
            ? new Date().toISOString()
            : current.updatedAt,
        },
      };
    });
  }

  function updateCompetitionPlan(
    patch: Partial<CompetitionPlanSettings>,
  ) {
    setState((previous) => {
      const current =
        trainingPlanForState(previous);
      const competition = {
        ...defaultCompetitionPlan(),
        ...(current.competition ?? {}),
        ...patch,
      };

      return {
        ...previous,
        trainingPlan: {
          ...current,
          competition,
        },
      };
    });
  }


  function updateCompetitionRetrospective(
    field:
      | "whatWorked"
      | "whatFailed"
      | "nextCycleFocus",
    value: string,
  ) {
    const eventDate =
      progressIntelligence.trainingHorizon
        .eventRetrospective.eventDate;
    if (!eventDate) return;

    setState((previous) => {
      const existing = (
        previous.competitionRetrospectives ?? []
      ).find(
        (item) => item.eventDate === eventDate,
      );
      const next: CompetitionRetrospectiveNote = {
        id: existing?.id ?? `event:${eventDate}`,
        eventDate,
        updatedAt: new Date().toISOString(),
        ...(existing?.whatWorked
          ? { whatWorked: existing.whatWorked }
          : {}),
        ...(existing?.whatFailed
          ? { whatFailed: existing.whatFailed }
          : {}),
        ...(existing?.nextCycleFocus
          ? {
              nextCycleFocus:
                existing.nextCycleFocus,
            }
          : {}),
        ...(value.trim()
          ? { [field]: value }
          : {}),
      };

      if (!value.trim()) {
        delete next[field];
      }

      return {
        ...previous,
        competitionRetrospectives: [
          ...(previous.competitionRetrospectives ?? [])
            .filter(
              (item) =>
                item.eventDate !== eventDate,
            ),
          next,
        ],
      };
    });
  }

  if (!loaded) {
    return (
      <div className="app-loading-shell" aria-label="Loading chess">
        <div className="app-loading-brand">♞</div>
        <div className="app-loading-copy">
          <span className="loading-shimmer" />
          <span className="loading-shimmer" />
          <span className="loading-shimmer short" />
        </div>
      </div>
    );
  }

  const navItems = [
    ["home", "Home", Sparkles],
    ["learn", "Learn", BookOpen],
    ["play", "Play", Play],
    ["review", "Review", BarChart3],
    ["library", "Library", Library],
  ] as const;

  return (
    <ExperienceProvider
      settings={state.experience ?? defaultExperienceSettings}
      onChange={updateExperience}
    >
      <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">♞</div>
        <nav>
          {navItems.map(([id, label, Icon]) => (
            <button
              key={id}
              className={nav === id ? "nav-item active" : "nav-item"}
              aria-current={nav === id ? "page" : undefined}
              onClick={() => {
                setNav(id);
                emitExperienceEvent({ feedback: "navigate" });
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-experience">
          <ExperienceControls />
        </div>
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

            {!state.placement && (
              <section className="home-placement-card">
                <div className="home-placement-icon">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <p className="eyebrow">PLACEMENT DIAGNOSTIC</p>
                  <strong>Calibrate the course before it teaches too low or too high.</strong>
                  <span>
                    16 mixed positions sample every stage. No hints, no retries,
                    and no stage is falsely marked mastered from placement alone.
                  </span>
                </div>
                <button
                  className="secondary"
                  type="button"
                  onClick={startPlacementAssessment}
                >
                  Start diagnostic
                </button>
              </section>
            )}

            <section className="home-training-horizon">
              <div className="home-training-horizon-head">
                <div>
                  <p className="eyebrow">P21/P22 · TRAINING HORIZON</p>
                  <h2>{progressIntelligence.trainingHorizon.goalLabel}</h2>
                  <p>{progressIntelligence.trainingHorizon.goalDescription}</p>
                </div>
                <span className={`horizon-pace ${progressIntelligence.trainingHorizon.paceStatus}`}>
                  {progressIntelligence.trainingHorizon.paceStatus.replace("-", " ")}
                </span>
              </div>

              <div className="horizon-progress-line">
                <span
                  style={{
                    width: `${Math.min(
                      100,
                      progressIntelligence.trainingHorizon.managedWeeklyMinutes
                        ? progressIntelligence.trainingHorizon.completedMinutes /
                          progressIntelligence.trainingHorizon.managedWeeklyMinutes *
                          100
                        : 0,
                    )}%`,
                  }}
                />
              </div>

              <div className="horizon-summary-grid">
                <div>
                  <span>This week</span>
                  <strong>
                    {progressIntelligence.trainingHorizon.completedMinutes}/
                    {progressIntelligence.trainingHorizon.managedWeeklyMinutes}m
                  </strong>
                </div>
                <div>
                  <span>Next emphasis</span>
                  <strong>{progressIntelligence.trainingHorizon.nextFocusLabel}</strong>
                </div>
                <div>
                  <span>Suggested session</span>
                  <strong>
                    {progressIntelligence.trainingHorizon.recommendedSessionMinutes}m
                  </strong>
                </div>
                <div>
                  <span>{progressIntelligence.trainingHorizon.plan.horizonWeeks}-week horizon</span>
                  <strong>{progressIntelligence.trainingHorizon.horizonTargetMinutes}m</strong>
                </div>
              </div>

              <div className={`home-forecast-strip ${progressIntelligence.trainingPlanForecast.forecast.status}`}>
                <div>
                  <span>Adherence</span>
                  <strong>
                    {progressIntelligence.trainingPlanForecast.adherence.comparableWeeks
                      ? `${progressIntelligence.trainingPlanForecast.adherence.averageAdherence}%`
                      : "Collecting"}
                  </strong>
                  <small>
                    {progressIntelligence.trainingPlanForecast.adherence.comparableWeeks} comparable full week{progressIntelligence.trainingPlanForecast.adherence.comparableWeeks === 1 ? "" : "s"}
                  </small>
                </div>
                <div>
                  <span>Horizon forecast</span>
                  <strong>{progressIntelligence.trainingPlanForecast.forecast.status.replace("-", " ")}</strong>
                  <small>
                    {progressIntelligence.trainingPlanForecast.forecast.status === "insufficient"
                      ? "Needs two full weeks"
                      : `${progressIntelligence.trainingPlanForecast.forecast.projectedCompletion}% of nominal target projected`}
                  </small>
                </div>
                <div>
                  <span>Sustainable pace</span>
                  <strong>{progressIntelligence.trainingPlanForecast.forecast.sustainableWeeklyMinutes}m/week</strong>
                  <small>{progressIntelligence.trainingPlanForecast.adherence.trend.replace("-", " ")} trend</small>
                </div>
                <div>
                  <span>Recalibration</span>
                  <strong>
                    {progressIntelligence.trainingPlanForecast.recalibration.active
                      ? `${progressIntelligence.trainingPlanForecast.recalibration.effectiveWeeklyMinutes}m effective`
                      : "Nominal"}
                  </strong>
                  <small>
                    {progressIntelligence.trainingPlanForecast.recalibration.active
                      ? `${progressIntelligence.trainingPlanForecast.recalibration.nominalWeeklyMinutes}m goal preserved`
                      : `${progressIntelligence.trainingPlanForecast.recalibration.confidence}% confidence`}
                  </small>
                </div>
              </div>

              <div className="horizon-recalibration-control">
                <label>
                  <input
                    type="checkbox"
                    checked={progressIntelligence.trainingHorizon.plan.autoRecalibrate !== false}
                    onChange={(event) =>
                      updateTrainingPlan({
                        autoRecalibrate: event.target.checked,
                      })
                    }
                  />
                  <span>
                    Automatic recalibration
                    <small>
                      Adjust effective load only after sustained adherence evidence; never change the nominal goal.
                    </small>
                  </span>
                </label>
                <p>{progressIntelligence.trainingPlanForecast.recalibration.reason}</p>
              </div>

              <div className={`home-load-management ${progressIntelligence.trainingHorizon.loadManagement.appliedMode}`}>
                <div className="home-load-management-head">
                  <div>
                    <span>P23 · LOAD MANAGEMENT</span>
                    <strong>
                      {progressIntelligence.trainingHorizon.loadManagement.appliedMode === "recovery"
                        ? "Recovery week"
                        : progressIntelligence.trainingHorizon.loadManagement.appliedMode === "watch"
                          ? "Load watch"
                          : "Normal load"}
                    </strong>
                  </div>
                  <small>
                    {progressIntelligence.trainingHorizon.loadManagement.managedWeeklyMinutes}m managed · {progressIntelligence.trainingHorizon.effectiveWeeklyMinutes}m P22 effective
                  </small>
                </div>

                <div className="home-load-metrics">
                  <div>
                    <span>Latest full week</span>
                    <strong>{progressIntelligence.trainingHorizon.loadManagement.latestWeekMinutes}m</strong>
                  </div>
                  <div>
                    <span>Prior baseline</span>
                    <strong>{progressIntelligence.trainingHorizon.loadManagement.baselineWeeklyMinutes}m</strong>
                  </div>
                  <div>
                    <span>Load ramp</span>
                    <strong>{progressIntelligence.trainingHorizon.loadManagement.rampRatio}×</strong>
                  </div>
                  <div>
                    <span>Overload weeks</span>
                    <strong>{progressIntelligence.trainingHorizon.loadManagement.overloadWeeks}/3</strong>
                  </div>
                </div>

                <div className="home-load-controls">
                  <label>
                    <input
                      type="checkbox"
                      checked={progressIntelligence.trainingHorizon.plan.autoRecovery !== false}
                      onChange={(event) =>
                        updateTrainingPlan({
                          autoRecovery: event.target.checked,
                        })
                      }
                    />
                    <span>Automatic recovery</span>
                  </label>

                  {progressIntelligence.trainingHorizon.loadManagement.manualRecoveryActive ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        updateTrainingPlan({
                          manualRecoveryUntil: "",
                        })
                      }
                    >
                      End recovery week
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        updateTrainingPlan({
                          manualRecoveryUntil: recoveryUntil(),
                        })
                      }
                    >
                      Start 7-day recovery
                    </button>
                  )}
                </div>

                <p>{progressIntelligence.trainingHorizon.loadManagement.reason}</p>
              </div>

              <div className={`home-competition-cycle ${progressIntelligence.trainingHorizon.competitionCycle.phase}`}>
                <div className="home-cycle-head">
                  <div>
                    <span>P24 · COMPETITION CYCLE</span>
                    <strong>
                      {progressIntelligence.trainingHorizon.competitionCycle.phaseLabel}
                    </strong>
                    <small>
                      {progressIntelligence.trainingHorizon.competitionCycle.enabled &&
                      progressIntelligence.trainingHorizon.competitionCycle.eventDate
                        ? `${progressIntelligence.trainingHorizon.competitionCycle.eventLabel ?? "Target event"} · ${progressIntelligence.trainingHorizon.competitionCycle.eventDate}`
                        : "Optional event-specific block planning"}
                    </small>
                  </div>
                  <div className={`cycle-readiness ${progressIntelligence.trainingHorizon.competitionCycle.readinessStatus}`}>
                    <span>Prep readiness</span>
                    <strong>{progressIntelligence.trainingHorizon.competitionCycle.readinessScore}%</strong>
                    <small>{progressIntelligence.trainingHorizon.competitionCycle.readinessStatus.replace("-", " ")}</small>
                  </div>
                </div>

                <div className="cycle-controls">
                  <label className="cycle-toggle">
                    <input
                      type="checkbox"
                      checked={progressIntelligence.trainingHorizon.plan.competition?.enabled ?? false}
                      onChange={(event) =>
                        updateCompetitionPlan({
                          enabled: event.target.checked,
                        })
                      }
                    />
                    <span>Competition cycle</span>
                  </label>

                  <label>
                    <span>Event date</span>
                    <input
                      type="date"
                      value={progressIntelligence.trainingHorizon.plan.competition?.eventDate ?? ""}
                      onChange={(event) =>
                        updateCompetitionPlan({
                          eventDate: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Prep window</span>
                    <select
                      value={progressIntelligence.trainingHorizon.plan.competition?.prepWeeks ?? 6}
                      onChange={(event) =>
                        updateCompetitionPlan({
                          prepWeeks: Number(event.target.value) as 4 | 6 | 8 | 12,
                        })
                      }
                    >
                      {[4, 6, 8, 12].map((weeks) => (
                        <option key={weeks} value={weeks}>
                          {weeks} weeks
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Event length</span>
                    <select
                      value={progressIntelligence.trainingHorizon.plan.competition?.eventDays ?? 1}
                      onChange={(event) =>
                        updateCompetitionPlan({
                          eventDays: Number(event.target.value) as 1 | 2 | 3 | 5 | 7,
                        })
                      }
                    >
                      {[1, 2, 3, 5, 7].map((days) => (
                        <option key={days} value={days}>
                          {days} day{days === 1 ? "" : "s"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Reset</span>
                    <select
                      value={progressIntelligence.trainingHorizon.plan.competition?.resetDays ?? 5}
                      onChange={(event) =>
                        updateCompetitionPlan({
                          resetDays: Number(event.target.value) as 3 | 5 | 7,
                        })
                      }
                    >
                      {[3, 5, 7].map((days) => (
                        <option key={days} value={days}>
                          {days} days
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="cycle-summary-grid">
                  <div>
                    <span>Time to event</span>
                    <strong>
                      {progressIntelligence.trainingHorizon.competitionCycle.daysToEvent !== undefined
                        ? `${progressIntelligence.trainingHorizon.competitionCycle.daysToEvent}d`
                        : progressIntelligence.trainingHorizon.competitionCycle.daysFromEvent !== undefined
                          ? `+${progressIntelligence.trainingHorizon.competitionCycle.daysFromEvent}d`
                          : "—"}
                    </strong>
                  </div>
                  <div>
                    <span>Cycle load</span>
                    <strong>{Math.round(progressIntelligence.trainingHorizon.competitionCycle.weeklyLoadMultiplier * 100)}%</strong>
                  </div>
                  <div>
                    <span>Session cap</span>
                    <strong>{progressIntelligence.trainingHorizon.competitionCycle.maxSessionMinutes}m</strong>
                  </div>
                  <div>
                    <span>Managed week</span>
                    <strong>{progressIntelligence.trainingHorizon.competitionCycle.managedWeeklyMinutes}m</strong>
                  </div>
                </div>

                <p>{progressIntelligence.trainingHorizon.competitionCycle.reason}</p>
              </div>

              {progressIntelligence.trainingHorizon.eventRetrospective.eventDate && (
                <div className={`home-event-retrospective ${progressIntelligence.trainingHorizon.eventRetrospective.translationStatus}`}>
                  <div className="home-event-retrospective-head">
                    <div>
                      <span>P25 · EVENT RETROSPECTIVE</span>
                      <strong>
                        {progressIntelligence.trainingHorizon.eventRetrospective.eventLabel ?? "Competition review"}
                      </strong>
                      <small>
                        {progressIntelligence.trainingHorizon.eventRetrospective.eventDate}
                        {progressIntelligence.trainingHorizon.eventRetrospective.eventEndDate &&
                        progressIntelligence.trainingHorizon.eventRetrospective.eventEndDate !==
                          progressIntelligence.trainingHorizon.eventRetrospective.eventDate
                          ? ` → ${progressIntelligence.trainingHorizon.eventRetrospective.eventEndDate}`
                          : ""}
                      </small>
                    </div>
                    <div className="event-translation-badge">
                      <span>Transfer</span>
                      <strong>
                        {progressIntelligence.trainingHorizon.eventRetrospective.translationStatus}
                      </strong>
                    </div>
                  </div>

                  <div className="event-retro-summary-grid">
                    <div>
                      <span>Event games</span>
                      <strong>
                        {progressIntelligence.trainingHorizon.eventRetrospective.event.analyzedGames}/
                        {progressIntelligence.trainingHorizon.eventRetrospective.event.games}
                      </strong>
                      <small>analyzed / matched</small>
                    </div>
                    <div>
                      <span>Quality Δ</span>
                      <strong>
                        {progressIntelligence.trainingHorizon.eventRetrospective.qualityDelta >= 0 ? "+" : ""}
                        {progressIntelligence.trainingHorizon.eventRetrospective.qualityDelta}
                      </strong>
                    </div>
                    <div>
                      <span>Result Δ</span>
                      <strong>
                        {progressIntelligence.trainingHorizon.eventRetrospective.resultDelta >= 0 ? "+" : ""}
                        {progressIntelligence.trainingHorizon.eventRetrospective.resultDelta}
                      </strong>
                    </div>
                    <div>
                      <span>Error-rate Δ</span>
                      <strong>
                        {progressIntelligence.trainingHorizon.eventRetrospective.errorRateDelta >= 0 ? "+" : ""}
                        {progressIntelligence.trainingHorizon.eventRetrospective.errorRateDelta}
                      </strong>
                    </div>
                  </div>

                  {progressIntelligence.trainingHorizon.eventRetrospective.repairPriorities.length > 0 && (
                    <div className="event-retro-priorities">
                      {progressIntelligence.trainingHorizon.eventRetrospective.repairPriorities
                        .slice(0, 3)
                        .map((item) => (
                          <span key={item.skillId}>
                            {item.label} · {item.games} game{item.games === 1 ? "" : "s"}
                          </span>
                        ))}
                    </div>
                  )}

                  <div className="event-retro-notes">
                    <label>
                      <span>What worked?</span>
                      <textarea
                        rows={2}
                        value={
                          progressIntelligence.trainingHorizon.eventRetrospective.note?.whatWorked ?? ""
                        }
                        onChange={(event) =>
                          updateCompetitionRetrospective(
                            "whatWorked",
                            event.target.value,
                          )
                        }
                        placeholder="Stable habits, openings, decisions..."
                      />
                    </label>
                    <label>
                      <span>What failed?</span>
                      <textarea
                        rows={2}
                        value={
                          progressIntelligence.trainingHorizon.eventRetrospective.note?.whatFailed ?? ""
                        }
                        onChange={(event) =>
                          updateCompetitionRetrospective(
                            "whatFailed",
                            event.target.value,
                          )
                        }
                        placeholder="Recurring mistakes, time trouble, preparation gaps..."
                      />
                    </label>
                    <label>
                      <span>Next cycle focus</span>
                      <textarea
                        rows={2}
                        value={
                          progressIntelligence.trainingHorizon.eventRetrospective.note?.nextCycleFocus ?? ""
                        }
                        onChange={(event) =>
                          updateCompetitionRetrospective(
                            "nextCycleFocus",
                            event.target.value,
                          )
                        }
                        placeholder="One or two concrete priorities for the next block..."
                      />
                    </label>
                  </div>

                  <p>{progressIntelligence.trainingHorizon.eventRetrospective.reason}</p>
                </div>
              )}

              <div className="horizon-goal-switch" aria-label="Training goal">
                {(Object.keys(trainingGoals) as TrainingGoalId[]).map((goalId) => (
                  <button
                    type="button"
                    key={goalId}
                    className={
                      progressIntelligence.trainingHorizon.plan.goal === goalId
                        ? "active"
                        : ""
                    }
                    aria-pressed={
                      progressIntelligence.trainingHorizon.plan.goal === goalId
                    }
                    onClick={() => updateTrainingPlan({ goal: goalId })}
                  >
                    {trainingGoals[goalId].label}
                  </button>
                ))}
              </div>

              <div className="horizon-controls">
                <label>
                  <span>Weekly budget</span>
                  <select
                    value={progressIntelligence.trainingHorizon.plan.weeklyMinutes}
                    onChange={(event) =>
                      updateTrainingPlan({
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
                    value={progressIntelligence.trainingHorizon.plan.horizonWeeks}
                    onChange={(event) =>
                      updateTrainingPlan({
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
                  <span>Sessions/week</span>
                  <select
                    value={progressIntelligence.trainingHorizon.plan.sessionsPerWeek}
                    onChange={(event) =>
                      updateTrainingPlan({
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

              <div className="horizon-allocation-strip">
                {progressIntelligence.trainingHorizon.allocations.map((item) => (
                  <div key={item.bucket}>
                    <div>
                      <span>{item.label}</span>
                      <small>
                        {item.completedMinutes}/{item.targetMinutes}m
                      </small>
                    </div>
                    <i>
                      <span
                        style={{
                          width: `${Math.min(100, item.completion)}%`,
                        }}
                      />
                    </i>
                  </div>
                ))}
              </div>
            </section>

            <section className="mode-switch" aria-label="Training duration">
              {(Object.keys(sessionMinutes) as SessionMode[]).map((item) => (
                <button
                  key={item}
                  className={
                    [
                      "mode",
                      mode === item ? "active" : "",
                      progressIntelligence.trainingHorizon.recommendedSessionMode === item
                        ? "recommended"
                        : "",
                    ].filter(Boolean).join(" ")
                  }
                  aria-pressed={mode === item}
                  onClick={() => {
                    setMode(item);
                    setActiveIndex(null);
                  }}
                >
                  <strong>{modeLabels[item]}</strong>
                  <span>
                    {sessionMinutes[item]} min
                    {progressIntelligence.trainingHorizon.recommendedSessionMode === item
                      ? " · suggested"
                      : ""}
                  </span>
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
                      {activity.adaptivePolicy && (
                        <span className="adaptive-activity-note">
                          {activity.adaptivePolicy.challenge} · {activity.activityType.replace(/([A-Z])/g, " $1")}
                        </span>
                      )}
                      {activity.periodization && (
                        <span className="periodization-activity-note">
                          {activity.periodization.bucket} · {activity.periodization.reason}
                        </span>
                      )}
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

            <section className="home-course-gate">
              <div className="home-course-gate-copy">
                <div>
                  <p className="eyebrow">COURSE PROGRESSION</p>
                  <span className={`gate-status ${currentCourseGate.status}`}>
                    {gateStatusLabel(currentCourseGate.status)}
                  </span>
                </div>
                <h2>{currentCourseStage.title}</h2>
                <p>
                  {currentCourseGate.blockers.length
                    ? `Promotion still needs ${currentCourseGate.blockers
                        .map(gateBlockerLabel)
                        .join(", ")} evidence.`
                    : "All promotion requirements are currently satisfied."}
                </p>
              </div>
              <div className="home-course-metrics">
                <div>
                  <span>Mastery</span>
                  <strong>{currentCourseGate.metrics.mastery}%</strong>
                </div>
                <div>
                  <span>Retention</span>
                  <strong>{currentCourseGate.metrics.retention}%</strong>
                </div>
                <div>
                  <span>Transfer</span>
                  <strong>{currentCourseGate.metrics.transfer}%</strong>
                </div>
                <div>
                  <span>Checkpoint</span>
                  <strong>{currentCourseGate.metrics.checkpoint}%</strong>
                </div>
              </div>
              <button
                className="secondary"
                type="button"
                onClick={() => setNav("learn")}
              >
                Open course <ChevronRight size={16} />
              </button>
            </section>

            <button
              className="home-progress-card"
              type="button"
              onClick={() => setNav("progress")}
            >
              <div className="home-progress-icon">
                <BarChart3 size={21} />
              </div>
              <div>
                <p className="eyebrow">PROGRESS INTELLIGENCE</p>
                <strong>
                  Practical {progressIntelligence.practicalStrength.rating} · {progressIntelligence.mastery}% mastery
                </strong>
                <span>
                  {progressIntelligence.realGameDiagnostics.diagnostics[0]
                    ? `Priority signal: ${progressIntelligence.realGameDiagnostics.diagnostics[0].headline}`
                    : progressIntelligence.practicalStrength.humanGames
                      ? `${progressIntelligence.practicalStrength.humanGames} analyzed human game${progressIntelligence.practicalStrength.humanGames === 1 ? "" : "s"} · human transfer ${progressIntelligence.humanTransfer}% · ${progressIntelligence.practicalStrength.confidence}% confidence.`
                      : "Training-only estimate for now. Analyze human games to establish practical strength."}
                </span>
              </div>
              <ChevronRight size={18} />
            </button>

            {topPrescription && (
              <section className="home-prescription-card">
                <div className="home-prescription-top">
                  <div>
                    <p className="eyebrow">NEXT REPAIR PLAN</p>
                    <h3>{topPrescription.title}</h3>
                  </div>
                  <span>
                    {topPrescription.confidence}% confidence
                  </span>
                </div>
                <p>{topPrescription.rationale}</p>
                <div className="home-prescription-cues">
                  {topPrescription.gamePlan.slice(0, 2).map((cue) => (
                    <span key={cue}>{cue}</span>
                  ))}
                </div>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setNav("progress")}
                >
                  Open repair plan <ChevronRight size={16} />
                </button>
              </section>
            )}

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
              gates={stageGates}
              placement={state.placement}
              curriculumFloor={courseCurriculumFloor(state)}
              onStartLesson={startManualLesson}
              onStartPractice={startManualPractice}
              onStartPlacement={startPlacementAssessment}
              onStartCheckpoint={startStageCheckpoint}
              onOpenOpenings={() => setLearnMode("openings")}
            />
          )
        ) : nav === "play" ? (
          <PlayView
            mastery={state.mastery}
            lichess={state.lichess}
            lichessSyncing={lichessSyncing}
            lichessSyncMessage={lichessSyncMessage}
            lichessSyncError={lichessSyncError}
            practicalPlan={topPrescription}
            onLinkLichess={linkLichess}
            onUnlinkLichess={unlinkLichess}
            onSyncLichess={() => syncLichessGames(false)}
            onGameFinished={handlePlayFinished}
            externalScenario={replayScenario}
            onExternalScenarioExit={() => setReplayScenario(undefined)}
          />
        ) : nav === "review" ? (
          <ReviewView
            games={state.games ?? []}
            mistakes={state.mistakes ?? []}
            lichess={state.lichess}
            lichessSyncing={lichessSyncing}
            lichessSyncMessage={lichessSyncMessage}
            lichessSyncError={lichessSyncError}
            onLinkLichess={linkLichess}
            onUnlinkLichess={unlinkLichess}
            onSyncLichess={() => syncLichessGames(false)}
            onAnalyzed={handleAnalyzedGame}
            onTrainMistake={startMistakePractice}
            onReplayMistake={replayMistakePosition}
          />
        ) : nav === "library" ? (
          <LibraryView
            studies={state.savedStudies ?? []}
            games={state.games ?? []}
            onSaveStudy={saveStudy}
            onDeleteStudy={deleteStudy}
            onToggleFavorite={toggleStudyFavorite}
            onTrainStudy={startStudyTraining}
          />
        ) : nav === "progress" ? (
          <ProgressView
            intelligence={progressIntelligence}
            onBack={() => setNav("home")}
            onTrainSkill={(skillId) => {
              startManualPractice(skillId);
              setNav("home");
            }}
            onRunPrescriptionAction={runPrescriptionAction}
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

      <div className="mobile-experience">
        <ExperienceControls />
      </div>

      <nav className="mobile-nav">
        {navItems.map(([id, label, Icon]) => (
          <button
            key={id}
            className={nav === id ? "active" : ""}
            aria-current={nav === id ? "page" : undefined}
            onClick={() => {
              setNav(id);
              emitExperienceEvent({ feedback: "navigate" });
            }}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {assessmentSession && (
        <div
          className="training-overlay assessment-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={
            assessmentSession.kind === "placement"
              ? "Placement diagnostic"
              : "Stage checkpoint"
          }
        >
          <section className="training-sheet assessment-sheet">
            <button
              className="close-button"
              type="button"
              onClick={() => setAssessmentSession(null)}
              aria-label="Close assessment"
            >
              ×
            </button>
            <AssessmentRunner
              session={assessmentSession}
              onComplete={completeAssessment}
              onCancel={() => setAssessmentSession(null)}
            />
          </section>
        </div>
      )}

      {active && activeSkill && (
        <div className="training-overlay" role="dialog" aria-modal="true">
          <section
            className={
              active.activityType === "engineGame"
                ? "training-sheet adaptive-game-sheet"
                : "training-sheet"
            }
          >
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
                {active.adaptivePolicy && (
                  <span className="adaptive-challenge-chip">
                    {active.adaptivePolicy.challenge}
                  </span>
                )}
              </div>
            </div>

            {active.adaptivePolicy && (
              <div className="adaptive-policy-strip">
                <BrainCircuit size={16} />
                <div>
                  <strong>{active.adaptivePolicy.reason}</strong>
                  <span>
                    Target success {active.adaptivePolicy.targetSuccessLow}–{active.adaptivePolicy.targetSuccessHigh}%
                    {active.adaptivePolicy.targetPuzzleRating
                      ? ` · puzzle target ~${active.adaptivePolicy.targetPuzzleRating}`
                      : ""}
                    {active.adaptivePolicy.policyConfidence < .45
                      ? " · low-confidence policy"
                      : ""}
                  </span>
                </div>
              </div>
            )}

            {active.activityType === "engineGame" && activeScenario ? (
              <GameArena
                initialFen={activeScenario.fen}
                playerColor={activeScenario.playerColor}
                profile={activeGameProfile}
                scenario={activeScenario}
                onExit={() => {
                  setActiveIndex(null);
                  setManualActivity(null);
                }}
                onFinished={handlePlayFinished}
                exitLabel="Finish activity"
              />
            ) : active.activityType === "savedStudy" && activeStudy ? (
              <SavedStudyTrainer
                study={activeStudy}
                onComplete={completeActivity}
              />
            ) : active.activityType === "openingRecall" &&
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
    </ExperienceProvider>
  );
}
