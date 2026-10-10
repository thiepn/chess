import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bookmark,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Library,
  Play,
  RefreshCcw,
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
import { emptyChessState } from "./data/initial";
import { createChessStateRepository, isChessState, type SyncStatus } from "./lib/persistence";
import { CHESS_ACCOUNT_ORIGIN, currentChessAccountClientReadiness } from "./account/onboarding";
import { chessAccountSso, chessAccountLoginError } from "./account/chessSession";

import { ChessBoard } from "./components/ChessBoard";




import { weaknessesFromMistakes } from "./games/weaknesses";
import { legalReviewMistake, recordReviewAttempt } from "./review/practiceLoop";
import type { GameReviewReflection, ImportedGame, PersonalMistake } from "./games/types";

import { openingNodes, repertoireById } from "./openings/repertoire";
import { applyOpeningAttempt, createOpeningProgress } from "./openings/progress";
import { openingDeviationsForGame } from "./openings/match";

import { StockfishBrowserEngine } from "./engine/stockfish";
import { calculationPositionFor, resolveCalculationPosition } from "./calculation/positions";
import { endgamePositionFor, resolveEndgamePosition } from "./endgames/positions";
import { analyzeImportedGame } from "./games/analyze";
import { timeControlWeight } from "./games/practical";
import {
  mergeReanalyzedDeviations,
  mergeReanalyzedMistakes,
} from "./games/refresh";
import { scenarioById } from "./play/scenarios";
import { aiProfiles, resolveAiProfile } from "./play/profiles";
import type { PlayResult, TrainingScenario } from "./play/types";

import type { SavedStudy } from "./library/types";

import { modelGameById, modelGameCheckpointPosition } from "./model-games/games";
import { recordModelGameCheckpoint, recordModelGameCompletion } from "./model-games/progress";
import type { ModelGameCheckpointResult } from "./model-games/types";
import { applyStudyAttempt, createStudyTraining } from "./library/progress";
import { ExperienceProvider } from "./interaction/ExperienceProvider";
import { ExperienceControls } from "./components/ExperienceControls";
import { defaultExperienceSettings } from "./interaction/types";
import { emitExperienceEvent } from "./interaction/events";

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
import { lessonForSkill } from "./learning/lessons";
import { learnSkillPath, resolveLearnRoute } from "./learning/learnRoutes";
import { reviewGamePath } from "./review/reviewRoutes";
import { primaryAppPages } from "./design/appArchitecture";
import { useAppRouter } from "./routing/appRouter";
import "./styles/p47-train-native.css";
import "./styles/p51-train-large.css";

const LearnView = lazy(() =>
  import("./components/LearnView").then((module) => ({
    default: module.LearnView,
  })),
);
const ReviewView = lazy(() =>
  import("./components/ReviewView").then((module) => ({
    default: module.ReviewView,
  })),
);
const OpeningsView = lazy(() =>
  import("./components/OpeningsView").then((module) => ({
    default: module.OpeningsView,
  })),
);
const PlayView = lazy(() =>
  import("./components/PlayView").then((module) => ({
    default: module.PlayView,
  })),
);
const LibraryView = lazy(() =>
  import("./components/LibraryView").then((module) => ({
    default: module.LibraryView,
  })),
);
const ModelGamesView = lazy(() =>
  import("./components/ModelGamesView").then((module) => ({
    default: module.ModelGamesView,
  })),
);
const ProgressView = lazy(() =>
  import("./components/ProgressView").then((module) => ({
    default: module.ProgressView,
  })),
);

// Train loads the active exercise on demand; its queue and preview stay immediate.
const LessonRunner = lazy(() =>
  import("./components/LessonRunner").then((module) => ({
    default: module.LessonRunner,
  })),
);
const PuzzleRunner = lazy(() =>
  import("./components/PuzzleRunner").then((module) => ({
    default: module.PuzzleRunner,
  })),
);
const PersonalMistakeRunner = lazy(() =>
  import("./components/PersonalMistakeRunner").then((module) => ({
    default: module.PersonalMistakeRunner,
  })),
);
const CalculationRunner = lazy(() =>
  import("./components/CalculationRunner").then((module) => ({
    default: module.CalculationRunner,
  })),
);
const EndgameTechniqueRunner = lazy(() =>
  import("./components/EndgameTechniqueRunner").then((module) => ({
    default: module.EndgameTechniqueRunner,
  })),
);
const OpeningTrainer = lazy(() =>
  import("./components/OpeningTrainer").then((module) => ({
    default: module.OpeningTrainer,
  })),
);
const GameArena = lazy(() =>
  import("./components/GameArena").then((module) => ({
    default: module.GameArena,
  })),
);
const SavedStudyTrainer = lazy(() =>
  import("./components/SavedStudyTrainer").then((module) => ({
    default: module.SavedStudyTrainer,
  })),
);
const ModelGameRunner = lazy(() =>
  import("./components/ModelGameRunner").then((module) => ({
    default: module.ModelGameRunner,
  })),
);
const AssessmentRunner = lazy(() =>
  import("./components/AssessmentRunner").then((module) => ({
    default: module.AssessmentRunner,
  })),
);

function RouteLoading() {
  return (
    <section className="route-loading" aria-live="polite" aria-label="Loading view">
      <span className="loading-shimmer" />
      <span className="loading-shimmer" />
      <span className="loading-shimmer short" />
    </section>
  );
}

function preloadNavRoute(id: string) {
  if (id === "learn") {
    void import("./components/LearnView");
  } else if (id === "play") {
    void import("./components/PlayView");
  } else if (id === "review") {
    void import("./components/ReviewView");
  } else if (id === "library") {
    void import("./components/LibraryView");
  } else if (id === "progress") {
    void import("./components/ProgressView");
  }
}

const repo = createChessStateRepository();
const chessAccountReadiness = currentChessAccountClientReadiness();

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
  return <Swords size={18} />;
}

function reasonLabel(activity: TrainingActivity) {
  if (activity.source === "prescription") return "FROM YOUR GAMES";
  if (activity.source === "weakness") return "NEEDS PRACTICE";
  if (activity.source === "review") return "REVIEW DUE";
  if (activity.source === "curriculum") return "COURSE";
  if (activity.source === "focus") return "CURRENT FOCUS";
  if (activity.source === "library") return "FROM YOUR LIBRARY";
  if (activity.source === "assessment") return "CHECKPOINT FOLLOW-UP";
  return activity.source.toUpperCase();
}

export default function App() {
  const [state, setState] = useState<UserState>(emptyChessState);
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => repo.getStatus());
  const [mode, setMode] = useState<SessionMode>("standard");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [manualActivity, setManualActivity] = useState<TrainingActivity | null>(null);
  const [trainingReturnPath, setTrainingReturnPath] = useState("/train");
  const [activeModelGameId, setActiveModelGameId] = useState<string | null>(null);
  const [replayScenario, setReplayScenario] = useState<TrainingScenario | undefined>();
  const [replayReturnPath, setReplayReturnPath] = useState("/review");
  const [assessmentSession, setAssessmentSession] =
    useState<AssessmentSession | null>(null);
  const { route, navigate, navigatePage } = useAppRouter();
  const page = route.page;
  const mainContentRef = useRef<HTMLElement>(null);
  const previousRoutePath = useRef(route.path);
  const learnRoute = resolveLearnRoute(route.path);
  const learnSection = learnRoute.section;
  const learnSkillId = page === "learn" ? learnRoute.skillId : undefined;
  const [lichessSyncing, setLichessSyncing] = useState(false);
  const lichessSyncInFlight = useRef(false);
  const [lichessSyncMessage, setLichessSyncMessage] = useState<string | null>(null);
  const [lichessSyncError, setLichessSyncError] = useState<string | null>(null);

  // Auth changes must swap the entire in-memory profile before any more
  // writes are allowed. Discard stale loads when the account changes twice.
  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const refresh = () => {
      const current = ++generation;
      setLoaded(false);
      void repo.load(emptyChessState).then((value) => {
        if (cancelled || current !== generation) return;
        setState(ensureAnalyticsState(value));
        setLoaded(true);
      });
    };
    const unsubscribe = repo.subscribeIdentity(refresh);
    refresh();
    return () => {
      cancelled = true;
      ++generation;
      unsubscribe();
    };
  }, []);

  useEffect(() => repo.subscribeStatus(setSyncStatus), []);

  useEffect(() => {
    if (loaded) void repo.save(state);
  }, [state, loaded]);

  useEffect(() => {
    if (!loaded || repo.mode !== "supabase") return;
    const retry = () => { void repo.retryPending(); };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") retry();
    };
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loaded]);

  useEffect(() => {
    const routeLabel =
      page === "progress"
        ? "Progress"
        : page === "settings"
          ? "Settings"
          : primaryAppPages.find((item) => item.id === page)?.label ?? "Chess";

    document.title = `${routeLabel} · Chess`;

    if (previousRoutePath.current === route.path) return;
    previousRoutePath.current = route.path;

    window.requestAnimationFrame(() => {
      mainContentRef.current?.focus({ preventScroll: true });
    });
  }, [page, route.path]);


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
  const activeMistake = active?.mistakeId
    ? state.mistakes?.find((mistake) => {
        const game = state.games?.find(g => g.id === mistake.gameId);
        return mistake.id === active.mistakeId &&
          Boolean(game && legalReviewMistake(mistake, game));
      })
    : undefined;
  const activeOpeningNode =
    active?.openingNodeId ? openingNodes[active.openingNodeId] : undefined;
  const activeRepertoire =
    active?.repertoireId ? repertoireById[active.repertoireId] : undefined;
  const activeStudy =
    active?.studyId
      ? state.savedStudies?.find((study) => study.id === active.studyId)
      : undefined;
  const activeModelGame = activeModelGameId
    ? modelGameById[activeModelGameId]
    : undefined;
  const trainingSessionOpen =
    page === "train" && route.path.startsWith("/train/session/");
  const playSessionOpen =
    page === "play" && route.path.startsWith("/play/game/");

  const previousReplayPage = useRef(page);
  useEffect(() => {
    // Clear only after actually leaving Play. External scenario selection may
    // be scheduled before View Transitions commit the move into Play.
    if (previousReplayPage.current === "play" && page !== "play") {
      setReplayScenario(undefined);
    }
    previousReplayPage.current = page;
  }, [page]);

  useEffect(() => {
    // One likely destination is warmed after the current workspace settles.
    // Save-data and slow connections never fetch it speculatively.
    if (!loaded || trainingSessionOpen || playSessionOpen) return;
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (connection?.saveData || /2g/.test(connection?.effectiveType ?? "")) return;
    const likelyNext: Partial<Record<typeof page, string>> = {
      train: "learn",
      play: "review",
      review: "library",
      library: "learn",
    };
    const next = likelyNext[page];
    if (!next) return;
    const timeout = window.setTimeout(() => {
      if (document.visibilityState === "visible") preloadNavRoute(next);
    }, 2400);
    return () => window.clearTimeout(timeout);
  }, [loaded, page, trainingSessionOpen, playSessionOpen]);

  const runtimeReady = Boolean(
    assessmentSession ||
    activeModelGame ||
    (active && activeSkill),
  );
  const activeCalculationPosition =
    active &&
    activeSkill &&
    active.activityType === "calculation"
      ? resolveCalculationPosition(
          state,
          active,
          activeSkill,
        )
      : undefined;
  const activeEndgamePosition =
    active &&
    activeSkill &&
    (active.activityType === "endgameDrill" ||
      active.activityType === "conversionChallenge")
      ? resolveEndgamePosition(
          state,
          active,
          activeSkill,
        )
      : undefined;
  const activeEndgameHistory =
    activeEndgamePosition
      ? state.endgameHistory?.[
          activeEndgamePosition.id
        ]
      : undefined;
  const activeEndgameDelayedRetention =
    Boolean(
      activeEndgameHistory?.lastAttemptAt &&
      Date.now() -
        new Date(
          activeEndgameHistory.lastAttemptAt,
        ).getTime() >=
        86_400_000,
    );
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

  const firstActivity = session.activities[0];
  const boundedPreviewIndex = Math.min(
    previewIndex,
    Math.max(0, session.activities.length - 1),
  );
  const previewActivity = session.activities[boundedPreviewIndex] ?? firstActivity;
  const previewSkill = previewActivity
    ? skillById[previewActivity.skillIds[0]]
    : null;
  const previewLesson = useMemo(
    () =>
      previewActivity && previewSkill
        ? lessonForSkill(
            previewSkill.id,
            previewSkill.title,
            previewSkill.description,
            previewActivity.activityType,
          )
        : null,
    [previewActivity, previewSkill],
  );
  const previewFen = previewLesson?.steps[0]?.fen;

  useEffect(() => {
    if (previewIndex < session.activities.length) return;
    setPreviewIndex(0);
  }, [previewIndex, session.activities.length]);

  function trainingPath(id: string) {
    return `/train/session/${encodeURIComponent(id)}`;
  }

  function closeTrainingRuntime(returnPath = trainingReturnPath) {
    setActiveIndex(null);
    setManualActivity(null);
    setActiveModelGameId(null);
    setAssessmentSession(null);
    window.sessionStorage.removeItem("chess:training-runtime-v1");
    navigate(returnPath || "/train", { replace: true });
  }

  function openAdaptiveActivity(index: number) {
    const activity = session.activities[index];
    if (!activity) return;
    setTrainingReturnPath("/train");
    setManualActivity(null);
    setActiveModelGameId(null);
    setAssessmentSession(null);
    setActiveIndex(index);
    navigate(trainingPath(activity.id), { replace: trainingSessionOpen });
  }

  function openManualActivity(activity: TrainingActivity) {
    setTrainingReturnPath(route.path === "/train" ? "/train" : route.path);
    setActiveIndex(null);
    setActiveModelGameId(null);
    setAssessmentSession(null);
    setManualActivity(activity);
    navigate(trainingPath(activity.id));
  }

  useEffect(() => {
    if (!loaded || !trainingSessionOpen || runtimeReady) return;

    const stored = window.sessionStorage.getItem("chess:training-runtime-v1");
    if (stored) {
      try {
        const snapshot = JSON.parse(stored) as {
          path?: string;
          mode?: SessionMode;
          activeIndex?: number | null;
          manualActivity?: TrainingActivity | null;
          activeModelGameId?: string | null;
          assessmentSession?: AssessmentSession | null;
          trainingReturnPath?: string;
          owner?: string;
        };
        if (snapshot.owner === repo.getProfileId() && snapshot.path === route.path) {
          if (snapshot.mode) setMode(snapshot.mode);
          setActiveIndex(snapshot.activeIndex ?? null);
          setManualActivity(snapshot.manualActivity ?? null);
          setActiveModelGameId(snapshot.activeModelGameId ?? null);
          setAssessmentSession(snapshot.assessmentSession ?? null);
          setTrainingReturnPath(snapshot.trainingReturnPath ?? "/train");
          return;
        }
      } catch {
        window.sessionStorage.removeItem("chess:training-runtime-v1");
      }
    }

    const encodedId = route.path.slice("/train/session/".length);
    const routeId = decodeURIComponent(encodedId);
    const adaptiveIndex = session.activities.findIndex(
      (activity) => activity.id === routeId,
    );
    if (adaptiveIndex >= 0) {
      setActiveIndex(adaptiveIndex);
      return;
    }
  }, [
    active,
    activeModelGame,
    assessmentSession,
    loaded,
    route.path,
    runtimeReady,
    session.activities,
    trainingReturnPath,
    trainingSessionOpen,
  ]);

  useEffect(() => {
    if (!trainingSessionOpen || !runtimeReady) return;
    window.sessionStorage.setItem(
      "chess:training-runtime-v1",
      JSON.stringify({
        path: route.path,
        mode,
        activeIndex,
        manualActivity,
        activeModelGameId,
        assessmentSession,
        trainingReturnPath,
        owner: repo.getProfileId(),
      }),
    );
  }, [
    activeIndex,
    activeModelGameId,
    assessmentSession,
    manualActivity,
    mode,
    route.path,
    runtimeReady,
    trainingReturnPath,
    trainingSessionOpen,
  ]);

  useEffect(() => {
    if (trainingSessionOpen) return;
    if (!runtimeReady) return;
    setActiveIndex(null);
    setManualActivity(null);
    setActiveModelGameId(null);
    setAssessmentSession(null);
    window.sessionStorage.removeItem("chess:training-runtime-v1");
  }, [runtimeReady, trainingSessionOpen]);

  useEffect(() => {
    if (!trainingSessionOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(".chess-board")
      ) {
        return;
      }
      event.preventDefault();
      closeTrainingRuntime();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [trainingSessionOpen, route.path]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (trainingSessionOpen || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.matches("input, textarea, select, [contenteditable='true']") ||
          target.closest("[role='dialog']"))
      ) {
        return;
      }

      if (
        event.key.toLowerCase() === "t" &&
        session.activities.length
      ) {
        event.preventDefault();
        openAdaptiveActivity(0);
        emitExperienceEvent({ feedback: "navigate" });
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () =>
      window.removeEventListener("keydown", handleShortcut);
  }, [trainingSessionOpen, session.activities.length]);

  const homeTrainingReason = !firstActivity
    ? "No training is due right now. Open Learn to choose a concept."
    : firstActivity.source === "prescription"
      ? progressIntelligence.coachBrief.decisions[0]?.title
        ? `${progressIntelligence.coachBrief.decisions[0].title} is the best next focus before starting something new.`
        : "A repeated game problem is worth revisiting before starting something new."
      : firstActivity.source === "weakness"
        ? "Your recent games keep pointing to this area."
        : firstActivity.source === "review"
          ? "Review this now so it stays available in future games."
          : firstActivity.source === "assessment"
            ? "A checkpoint showed a specific gap to revisit."
            : firstActivity.source === "curriculum"
              ? "This is the next useful concept in your current course stage."
              : firstActivity.source === "library"
                ? "A saved position is ready to revisit."
                : "This session focuses on the work most likely to help your next games.";

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
      active.activityType === "calculation"
        ? "calculation"
        : active.activityType === "openingRecall"
          ? "openingRecall"
          : active.activityType === "endgameDrill" ||
            active.activityType === "conversionChallenge"
          ? "endgameTechnique"
          : active.source === "review"
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
      retentionEvidence:
        outcome.endgameEvidence?.delayedRetention,
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
      feedback:
        outcome.success ||
        outcome.lessonEvidence?.completed
          ? "complete"
          : "error",
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
        const openingNodeIds =
          outcome.openingNodeIds?.length
            ? outcome.openingNodeIds
            : [active.openingNodeId];

        for (const nodeId of openingNodeIds) {
          const prior =
            openingProgress[nodeId] ??
            createOpeningProgress(
              nodeId,
              new Date(occurredAt),
            );
          openingProgress[nodeId] =
            applyOpeningAttempt(
              prior,
              outcome.success,
              outcome.quality,
              new Date(occurredAt),
              {
                conceptCorrect:
                  nodeId ===
                  active.openingNodeId
                    ? outcome.openingConceptCorrect
                    : undefined,
                lineCompleted:
                  outcome.openingLineCompleted,
              },
            );
        }

        openingDeviations =
          openingDeviations.map(
            (deviation) =>
              openingNodeIds.includes(
                deviation.nodeId,
              ) &&
              deviation.repertoireId ===
                active.repertoireId
                ? {
                    ...deviation,
                    resolved:
                      outcome.success,
                  }
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

      let reviewPracticeHistory = previous.reviewPracticeHistory ?? [];
      if (outcome.mistakeId && outcome.mistakePractice) {
        const verifiedMistake = mistakes.find(m => m.id === outcome.mistakeId);
        const verifiedGame = (previous.games ?? []).find(g => g.id === verifiedMistake?.gameId);
        if (verifiedMistake && verifiedGame) {
          reviewPracticeHistory = recordReviewAttempt(
            reviewPracticeHistory, verifiedMistake, verifiedGame,
            {
              playedMove: outcome.mistakePractice.playedMove,
              triedMoves: outcome.mistakePractice.triedMoves,
              succeeded: outcome.success,
              quality: outcome.quality,
              hintsUsed: outcome.hintsUsed,
              wrongAttempts: outcome.wrongAttempts,
            },
            new Date(occurredAt),
          );
        }
      }

      if (outcome.mistakeId) {
        mistakes = mistakes.map((mistake) => {
          if (mistake.id !== outcome.mistakeId) return mistake;

          const successes = mistake.successes + (outcome.success ? 1 : 0);
          const attempts = mistake.attempts + 1;
          const intervalDays = !outcome.success
            ? .25 : successes >= 3 ? 30 : successes >= 2 ? 7 : 1;

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

      const calculationHistory = {
        ...(previous.calculationHistory ?? {}),
      };
      if (
        outcome.calculationPositionId &&
        outcome.calculationEvidence
      ) {
        const prior =
          calculationHistory[
            outcome.calculationPositionId
          ];
        const successes =
          (prior?.successes ?? 0) +
          (outcome.success ? 1 : 0);
        const attempts =
          (prior?.attempts ?? 0) + 1;
        const intervalDays =
          outcome.success &&
          outcome.quality >= .85
            ? 7
            : outcome.success
              ? 3
              : .5;

        calculationHistory[
          outcome.calculationPositionId
        ] = {
          positionId:
            outcome.calculationPositionId,
          attempts,
          successes,
          lastAttemptAt: occurredAt,
          lastQuality: outcome.quality,
          lastCandidateScore:
            outcome.calculationEvidence
              .candidateScore,
          lastReplyScore:
            outcome.calculationEvidence
              .replyScore,
          lastContinuationScore:
            outcome.calculationEvidence
              .continuationScore,
          lastLineDepth:
            outcome.calculationEvidence
              .lineDepth,
          nextReviewAt: new Date(
            new Date(occurredAt).getTime() +
              intervalDays * 86_400_000,
          ).toISOString(),
        };
      }

      const endgameHistory = {
        ...(previous.endgameHistory ?? {}),
      };
      if (
        outcome.endgamePositionId &&
        outcome.endgameEvidence
      ) {
        const prior =
          endgameHistory[
            outcome.endgamePositionId
          ];
        const attempts =
          (prior?.attempts ?? 0) + 1;
        const successes =
          (prior?.successes ?? 0) +
          (outcome.success ? 1 : 0);
        const conversionAttempt =
          outcome.endgameEvidence
            .objectiveType === "convert";
        const defenseAttempt =
          outcome.endgameEvidence
            .objectiveType === "hold";
        const intervalDays =
          outcome.success &&
          outcome.quality >= .88
            ? 14
            : outcome.success
              ? 5
              : .5;

        endgameHistory[
          outcome.endgamePositionId
        ] = {
          positionId:
            outcome.endgamePositionId,
          attempts,
          successes,
          recognitionAttempts:
            (prior?.recognitionAttempts ?? 0) +
            1,
          recognitionCorrects:
            (prior?.recognitionCorrects ?? 0) +
            (outcome.endgameEvidence
              .recognitionCorrect
              ? 1
              : 0),
          conversionAttempts:
            (prior?.conversionAttempts ?? 0) +
            (conversionAttempt ? 1 : 0),
          conversionSuccesses:
            (prior?.conversionSuccesses ?? 0) +
            (conversionAttempt &&
            outcome.success
              ? 1
              : 0),
          defenseAttempts:
            (prior?.defenseAttempts ?? 0) +
            (defenseAttempt ? 1 : 0),
          defenseHolds:
            (prior?.defenseHolds ?? 0) +
            (defenseAttempt &&
            outcome.success
              ? 1
              : 0),
          lastAttemptAt: occurredAt,
          lastSuccessAt: outcome.success
            ? occurredAt
            : prior?.lastSuccessAt,
          lastQuality: outcome.quality,
          lastPlies:
            outcome.endgameEvidence.plies,
          nextReviewAt: new Date(
            new Date(occurredAt).getTime() +
              intervalDays * 86_400_000,
          ).toISOString(),
        };
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
        reviewPracticeHistory,
        openingProgress,
        openingDeviations,
        savedStudies,
        prescriptionHistory,
        calculationHistory,
        endgameHistory,
        trainingLedger: appendTrainingLedger(
          previous.trainingLedger,
          active,
          activeSkill.domain,
          occurredAt,
        ),
      };
    });

    if (manualActivity) {
      closeTrainingRuntime();
      return;
    }

    if (activeIndex !== null && activeIndex < session.activities.length - 1) {
      openAdaptiveActivity(activeIndex + 1);
    } else {
      closeTrainingRuntime("/train");
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
      // Replaying a recovered finished game must never credit the same
      // training result or add identical analytics evidence twice.
      if ((previous.games ?? []).some((item) => item.id === result.importedGame.id)) {
        return previous;
      }
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

    setReplayReturnPath(route.path);
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
    navigatePage("play");
  }

  function startMistakePractice(mistakeId: string) {
    const mistake = state.mistakes?.find((item) => item.id === mistakeId);
    const game = state.games?.find(g => g.id === mistake?.gameId);
    if (!mistake || !game || !legalReviewMistake(mistake, game)) return;

    const skill = mistake.skillIds
      .map((skillId) => skillById[skillId])
      .find(Boolean);
    if (!skill) return;

    openManualActivity({
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
      subtitle: "Review your mistake",
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

    openManualActivity({
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

  function startOpeningLinePractice(
    repertoireId: string,
    nodeId: string,
  ) {
    const skill =
      skillById["openings.principles"];
    const repertoire =
      repertoireById[repertoireId];
    const node = openingNodes[nodeId];
    if (
      !skill ||
      !repertoire ||
      !node ||
      nodeId === repertoire.rootNodeId
    ) {
      return;
    }

    openManualActivity({
      id: `opening-line:${repertoireId}:${nodeId}`,
      source: "repertoire",
      skillIds: [skill.id],
      activityType: "openingRecall",
      estimatedMinutes: 7,
      priority: 1,
      difficulty: skill.difficulty,
      novelty: 0,
      urgency: .65,
      reason: `${repertoire.versus}: full-line rehearsal`,
      title: repertoire.name,
      subtitle: `Rehearse to ${node.name}`,
      openingNodeId: nodeId,
      openingLineNodeId: nodeId,
      openingTrainingMode: "line",
      repertoireId,
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

  function startModelGame(gameId: string) {
    if (!modelGameById[gameId]) return;
    setTrainingReturnPath(route.path);
    setActiveIndex(null);
    setManualActivity(null);
    setAssessmentSession(null);
    setActiveModelGameId(gameId);
    navigate(trainingPath(`model-game:${gameId}`));
  }

  function completeModelGameCheckpoint(
    gameId: string,
    result: ModelGameCheckpointResult,
  ) {
    const game = modelGameById[gameId];
    const checkpoint = game?.checkpoints.find(
      (item) => item.id === result.checkpointId,
    );
    const skill = checkpoint
      ? skillById[checkpoint.skillId]
      : undefined;
    if (!game || !checkpoint || !skill) return;

    const occurredAt = new Date().toISOString();
    const evidence: LearningEvidence = {
      skillId: skill.id,
      source: "modelGame",
      success:
        result.moveSolved &&
        !result.revealed,
      quality: result.quality,
      difficulty: Math.min(
        1,
        skill.difficulty / 5,
      ),
      hintsUsed: result.hintsUsed,
      occurredAt,
    };

    setState((previous) => {
      const previousMastery =
        previous.mastery[skill.id] ??
        emptyMastery(
          skill.id,
          Math.min(
            1,
            skill.difficulty / 5,
          ),
        );
      const nextMastery = applyEvidence(
        previousMastery,
        evidence,
      );
      const priorProgress =
        previous.modelGameProgress?.[
          game.id
        ];
      const nextProgress =
        recordModelGameCheckpoint(
          priorProgress,
          game.id,
          result,
          new Date(occurredAt),
        );

      return {
        ...previous,
        mastery: {
          ...previous.mastery,
          [skill.id]: nextMastery,
        },
        analytics: appendEvidenceAnalytics(
          previous.analytics,
          previousMastery,
          nextMastery,
          evidence,
          "manual",
        ),
        modelGameProgress: {
          ...(previous.modelGameProgress ?? {}),
          [game.id]: nextProgress,
        },
      };
    });
  }

  function saveModelGameCheckpoint(
    gameId: string,
    checkpointId: string,
  ) {
    const game = modelGameById[gameId];
    const checkpoint = game?.checkpoints.find(
      (item) => item.id === checkpointId,
    );
    if (!game || !checkpoint) return;

    const position =
      modelGameCheckpointPosition(
        game,
        checkpoint,
      );
    const skill =
      skillById[checkpoint.skillId];
    if (!skill) return;

    setState((previous) => {
      const now = new Date();
      const id =
        `model:${game.id}:${checkpoint.id}`;
      const existing = (
        previous.savedStudies ?? []
      ).find((study) => study.id === id);

      const study: SavedStudy = {
        id,
        title: `Model game · ${checkpoint.title}`,
        kind:
          skill.domain === "openings"
            ? "opening"
            : skill.domain === "tactics"
              ? "tactic"
              : "position",
        fen: position.beforeFen,
        notes: [
          `Recover the move that expresses this plan: ${checkpoint.plan}`,
          `From ${game.players}, ${game.event} ${game.year}.`,
        ].join("\n\n"),
        tags: [
          "model-game",
          skill.domain,
          ...game.tags.slice(0, 3),
        ],
        source: "reference",
        sourceId: `${game.id}:${checkpoint.id}`,
        orientation: game.orientation,
        arrows: [
          {
            from:
              position.expectedMove.slice(
                0,
                2,
              ) as import("chess.js").Square,
            to:
              position.expectedMove.slice(
                2,
                4,
              ) as import("chess.js").Square,
            tone: "good",
          },
        ],
        highlights: [],
        training:
          existing?.training ??
          createStudyTraining(
            skill.id,
            position.expectedMove,
            position.targetSan,
            now,
          ),
        favorite:
          existing?.favorite ?? false,
        createdAt:
          existing?.createdAt ??
          now.toISOString(),
        updatedAt: now.toISOString(),
      };

      return {
        ...previous,
        savedStudies: [
          ...(previous.savedStudies ?? []).filter(
            (item) => item.id !== id,
          ),
          study,
        ],
      };
    });
  }

  function completeModelGame(gameId: string) {
    const game = modelGameById[gameId];
    if (!game) return;

    setState((previous) => ({
      ...previous,
      modelGameProgress: {
        ...(previous.modelGameProgress ?? {}),
        [game.id]:
          recordModelGameCompletion(
            previous.modelGameProgress?.[
              game.id
            ],
            game,
          ),
      },
    }));
    emitExperienceEvent({
      feedback: "complete",
      celebration: "small",
    });
    setActiveModelGameId(null);
    window.sessionStorage.removeItem("chess:training-runtime-v1");
    navigate(trainingReturnPath || "/learn/model-games", { replace: true });
  }

  function updateGameReviewReflection(
    reflection: GameReviewReflection,
  ) {
    setState((previous) => ({
      ...previous,
      gameReviewReflections: {
        ...(previous.gameReviewReflections ?? {}),
        [reflection.momentId]: {
          ...(previous.gameReviewReflections?.[reflection.momentId] ?? {}),
          ...reflection,
        },
      },
    }));
  }

  function retainGameReviewLesson(
    gameId: string,
    momentId: string,
  ) {
    setState((previous) => {
      const game = (previous.games ?? []).find(
        (item) => item.id === gameId,
      );
      const moment = game?.reviewStory?.moments.find(
        (item) => item.id === momentId,
      );
      if (!game || !moment) return previous;

      const skillId =
        moment.skillIds.find((id) => skillById[id]) ??
        moment.skillIds[0];
      if (!skillId) return previous;

      const now = new Date();
      const id = `review:${gameId}:${momentId}`;
      const existing = (previous.savedStudies ?? []).find(
        (study) => study.id === id,
      );
      const reflection =
        previous.gameReviewReflections?.[momentId];
      const domain = skillById[skillId]?.domain;

      const study: SavedStudy = {
        id,
        title: `Game lesson · ${skillById[skillId]?.title ?? "Critical position"}`,
        kind:
          domain === "openings"
            ? "opening"
            : domain === "endgames"
              ? "endgame"
              : domain === "tactics"
                ? "tactic"
                : "position",
        fen: moment.positionFen,
        notes: [
          moment.summary,
          reflection?.thoughtNote
            ? `Your thought: ${reflection.thoughtNote}`
            : "",
          moment.errorReason ?? "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        tags: [
          "game-review",
          moment.errorType ?? "decision",
          domain ?? "chess",
        ],
        source: "game",
        sourceId: moment.id,
        orientation: game.playerColor,
        arrows: [
          {
            from: moment.bestMove.slice(0, 2) as import("chess.js").Square,
            to: moment.bestMove.slice(2, 4) as import("chess.js").Square,
            tone: "good",
          },
        ],
        highlights: [],
        training: existing?.training ?? {
          enabled: true,
          skillId,
          targetMove: moment.bestMove,
          targetSan: moment.bestSan,
          attempts: 0,
          successes: 0,
          streak: 0,
          nextReviewAt: new Date(
            now.getTime() + 86_400_000,
          ).toISOString(),
          lastQuality: 0,
        },
        favorite: existing?.favorite ?? false,
        createdAt: existing?.createdAt ?? now.toISOString(),
        updatedAt: now.toISOString(),
      };

      return {
        ...previous,
        savedStudies: [
          ...(previous.savedStudies ?? []).filter(
            (item) => item.id !== id,
          ),
          study,
        ],
        gameReviewReflections: {
          ...(previous.gameReviewReflections ?? {}),
          [momentId]: {
            ...(reflection ?? {
              momentId,
              gameId,
              ply: moment.ply,
              updatedAt: now.toISOString(),
            }),
            retained: true,
            updatedAt: now.toISOString(),
          },
        },
      };
    });
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

    openManualActivity({
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

    openManualActivity({
      id: `manual:${skillId}`,
      source: "curriculum",
      skillIds: [skillId],
      activityType: skill.trainingModes[0] ?? "conceptLesson",
      estimatedMinutes: 6,
      priority: 1,
      difficulty: skill.difficulty,
      novelty: 0,
      urgency: 0,
      reason: "Course study",
      title: skill.title,
      subtitle: "Guided lesson",
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
      skill.trainingModes.includes("endgameDrill")
        ? "endgameDrill"
        : skill.trainingModes.includes("conversionChallenge")
          ? "conversionChallenge"
          : skill.trainingModes.includes("calculation")
            ? "calculation"
            : skill.trainingModes.includes("mixedPuzzle")
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

    openManualActivity({
      id: `practice:${skillId}`,
      source: "focus",
      skillIds: [skillId],
      activityType,
      estimatedMinutes:
        activityType === "endgameDrill" ||
        activityType === "conversionChallenge"
          ? 12
          : activityType === "mixedPuzzle"
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
        ? "From your recent games"
        : "Focused practice",
      title: skill.title,
      subtitle:
        activityType === "endgameDrill" ||
        activityType === "conversionChallenge"
          ? "Recognition + play-out against resistance"
          : activityType === "calculation"
            ? "Candidate moves & calculation"
            : activityType === "mixedPuzzle" ||
              activityType === "themedPuzzle"
            ? "Recall practice"
            : "Guided practice",
      calculationPositionId:
        activityType === "calculation"
          ? calculationPositionFor(
              state,
              skill.id,
            ).id
          : undefined,
      endgamePositionId:
        activityType === "endgameDrill" ||
        activityType === "conversionChallenge"
          ? endgamePositionFor(
              state,
              skill.id,
            )?.id
          : undefined,
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
      return;
    }

    if (
      action.kind === "scenario" &&
      action.scenarioId
    ) {
      const scenario = scenarioById[action.scenarioId];
      if (!scenario) return;
      setReplayReturnPath(route.path);
      setReplayScenario({
        ...scenario,
        prescriptionId: prescription.id,
        prescriptionActionId: action.id,
      });
      navigatePage("play");
    }
  }

  function startPlacementAssessment() {
    setTrainingReturnPath(route.path);
    setActiveIndex(null);
    setManualActivity(null);
    setActiveModelGameId(null);
    setAssessmentSession(buildPlacementAssessment());
    navigate(trainingPath("assessment:placement"));
  }

  function startStageCheckpoint(stageId: CurriculumStageId) {
    if (stageGates[stageId].status === "locked") return;
    setTrainingReturnPath(route.path);
    setActiveIndex(null);
    setManualActivity(null);
    setActiveModelGameId(null);
    setAssessmentSession(
      buildStageCheckpoint(
        stageId,
        checkpointAttemptCount(state, stageId),
      ),
    );
    navigate(trainingPath(`assessment:checkpoint:${stageId}`));
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
    const returnPath = trainingReturnPath;
    setAssessmentSession(null);
    window.sessionStorage.removeItem("chess:training-runtime-v1");
    navigate(returnPath || "/train", { replace: true });

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

  const navIconById = {
    train: Swords,
    learn: BookOpen,
    play: Play,
    review: BarChart3,
    library: Library,
  } as const;

  const navItems = primaryAppPages.map((item) => ({
    ...item,
    Icon: navIconById[item.id],
  }));

  return (
    <ExperienceProvider
      settings={state.experience ?? defaultExperienceSettings}
      onChange={updateExperience}
    >
      <div
        className={[
          "app-shell",
          "app-shell-v2",
          trainingSessionOpen ? "training-session-open" : "",
          playSessionOpen ? "play-session-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <header className="app-topbar">
          <button
            className="app-brand"
            type="button"
            onClick={() => navigatePage("train")}
            aria-label="Chess · Train"
          >
            <span className="app-brand-piece" aria-hidden="true">♞</span>
            <strong>Chess</strong>
          </button>

          <nav className="app-topnav" aria-label="Primary navigation">
            {navItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={page === id ? "app-nav-link active" : "app-nav-link"}
                aria-current={page === id ? "page" : undefined}
                title={id === "train" ? "Train · keyboard shortcut T" : label}
                onPointerEnter={() => preloadNavRoute(id)}
                onFocus={() => preloadNavRoute(id)}
                onClick={() => {
                  if (id === "learn") {
                    navigate("/learn");
                  } else {
                    navigatePage(id);
                  }
                  emitExperienceEvent({ feedback: "navigate" });
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
                {id === "train" && (
                  <kbd className="nav-shortcut" aria-hidden="true">T</kbd>
                )}
              </button>
            ))}
          </nav>

          <div className="app-top-actions">
            <button
              type="button"
              className={page === "progress" ? "app-progress-link active" : "app-progress-link"}
              aria-current={page === "progress" ? "page" : undefined}
              onPointerEnter={() => preloadNavRoute("progress")}
              onFocus={() => preloadNavRoute("progress")}
              onClick={() => {
                navigatePage("progress");
                emitExperienceEvent({ feedback: "navigate" });
              }}
            >
              <Target size={17} />
              <span>Progress</span>
            </button>
            <div className="topbar-experience">
              <ExperienceControls />
            </div>
            <button
              type="button"
              className="topbar-sync"
              data-phase={syncStatus.phase}
              style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
              title={syncStatus.detail + " · Open data settings"}
              aria-label={"Chess data: " + syncStatus.detail + ". Open data settings"}
              onClick={() => navigatePage("settings")}
            >
              <span className="sync-dot" style={
                syncStatus.phase === "conflict" ? { background: "#c86464" } :
                syncStatus.phase === "pending" ? { background: "#c99c52" } : undefined
              } />
            </button>
          </div>
        </header>

        <main
          id="main-content"
          ref={mainContentRef}
          className="main app-main"
          tabIndex={-1}
        >
        <Suspense fallback={<RouteLoading />}>
        {page === "train" ? (
          trainingSessionOpen ? (
            <section className="train-runtime-page" aria-label="Training workspace">
              <header className="train-runtime-header">
                <button
                  type="button"
                  className="train-runtime-back"
                  onClick={() => closeTrainingRuntime()}
                  aria-label="Leave training workspace"
                >
                  <span aria-hidden="true">←</span>
                  <span>Train</span>
                </button>

                <div className="train-runtime-title">
                  <span>
                    {assessmentSession
                      ? assessmentSession.kind === "placement"
                        ? "Placement check"
                        : "Stage checkpoint"
                      : activeModelGame
                        ? "Model game"
                        : active
                          ? reasonLabel(active)
                          : "Training"}
                  </span>
                  <strong>
                    {assessmentSession
                      ? assessmentSession.kind === "placement"
                        ? "Course placement"
                        : assessmentSession.stageId
                          ? `${curriculumStages.find((stage) => stage.id === assessmentSession.stageId)?.title ?? "Stage"} checkpoint`
                          : "Stage checkpoint"
                      : activeModelGame
                        ? activeModelGame.title
                        : active?.title ?? "Training session"}
                  </strong>
                </div>

                <div className="train-runtime-meta">
                  {active && activeSkill ? (
                    <>
                      <span>{domainLabels[activeSkill.domain]}</span>
                      <span>{active.estimatedMinutes} min</span>
                      <span>
                        {manualActivity
                          ? "Focused"
                          : `${(activeIndex ?? 0) + 1} / ${session.activities.length}`}
                      </span>
                    </>
                  ) : activeModelGame ? (
                    <span>Guided study</span>
                  ) : assessmentSession ? (
                    <span>Assessment</span>
                  ) : null}
                </div>
              </header>

              <div className="train-runtime-progress" aria-hidden="true">
                <span
                  style={{
                    width:
                      active && !manualActivity
                        ? `${(((activeIndex ?? 0) + 1) / Math.max(1, session.activities.length)) * 100}%`
                        : runtimeReady
                          ? "100%"
                          : "0%",
                  }}
                />
              </div>

              <div
                className={[
                  "train-runtime-body",
                  active && active.activityType !== "engineGame"
                    ? "board-first-sheet"
                    : "",
                  active?.activityType === "engineGame"
                    ? "runtime-game adaptive-game-sheet"
                    : "",
                  active?.activityType === "calculation"
                    ? "runtime-calculation calculation-sheet"
                    : "",
                  active?.activityType === "endgameDrill" ||
                  active?.activityType === "conversionChallenge"
                    ? "runtime-endgame endgame-technique-sheet"
                    : "",
                  assessmentSession
                    ? "runtime-assessment assessment-sheet"
                    : "",
                  activeModelGame
                    ? "runtime-model-game model-game-sheet"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {assessmentSession ? (
                  <AssessmentRunner
                    session={assessmentSession}
                    onComplete={completeAssessment}
                    onCancel={() => closeTrainingRuntime()}
                  />
                ) : activeModelGame ? (
                  <ModelGameRunner
                    game={activeModelGame}
                    progress={state.modelGameProgress?.[activeModelGame.id]}
                    savedStudyIds={(state.savedStudies ?? []).map((study) => study.id)}
                    onCheckpointResult={(result) =>
                      completeModelGameCheckpoint(activeModelGame.id, result)
                    }
                    onSaveCheckpoint={saveModelGameCheckpoint}
                    onComplete={completeModelGame}
                    onExit={() => closeTrainingRuntime()}
                  />
                ) : active && activeSkill ? (
                  <>
                    {active.adaptivePolicy && (
                      <div className="train-runtime-policy">
                        <Target size={16} />
                        <div>
                          <strong>{active.adaptivePolicy.reason}</strong>
                          <span>
                            {active.adaptivePolicy.challenge === "recovery"
                              ? "Extra support today"
                              : active.adaptivePolicy.challenge === "supported"
                                ? "Supported practice"
                                : active.adaptivePolicy.challenge === "stretch"
                                  ? "Harder test"
                                  : active.adaptivePolicy.challenge === "maintenance"
                                    ? "Keep it sharp"
                                    : "Normal challenge"}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="train-runtime-runner">
                      {active.activityType === "engineGame" && activeScenario ? (
                        <GameArena
                          initialFen={activeScenario.fen}
                          playerColor={activeScenario.playerColor}
                          profile={activeGameProfile}
                          scenario={activeScenario}
                          onExit={() => closeTrainingRuntime()}
                          onFinished={handlePlayFinished}
                          onOpenReview={(gameId) => closeTrainingRuntime(reviewGamePath(gameId))}
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
                          mode={active.openingTrainingMode}
                          lineNodeId={active.openingLineNodeId}
                          onComplete={completeActivity}
                        />
                      ) : active.activityType === "personalMistake" && activeMistake ? (
                        <PersonalMistakeRunner
                          key={`${repo.getProfileId()}:${activeMistake.id}:${activeMistake.positionFen}`}
                          mistake={activeMistake}
                          storageOwner={repo.getProfileId()}
                          onComplete={completeActivity}
                        />
                      ) : active.activityType === "calculation" &&
                      activeCalculationPosition ? (
                        <CalculationRunner
                          activity={active}
                          skill={activeSkill}
                          position={activeCalculationPosition}
                          onComplete={completeActivity}
                        />
                      ) : (active.activityType === "endgameDrill" ||
                            active.activityType === "conversionChallenge") &&
                          activeEndgamePosition ? (
                        <EndgameTechniqueRunner
                          activity={active}
                          skill={activeSkill}
                          position={activeEndgamePosition}
                          delayedRetention={activeEndgameDelayedRetention}
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
                    </div>
                  </>
                ) : (
                  <div className="train-runtime-recovery" aria-live="polite">
                    <strong>Training session unavailable</strong>
                    <p>
                      This session could not be restored. Return to Train and start it again.
                    </p>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => closeTrainingRuntime("/train")}
                    >
                      Back to Train
                    </button>
                  </div>
                )}
              </div>
            </section>
          ) : (
          <section className="train-room" aria-labelledby="train-room-title">
            <aside className="train-room-rail" aria-label="Training session">
              <div className="train-room-rail-heading">
                <div>
                  <span>Session</span>
                  <strong>{session.plannedMinutes} min</strong>
                </div>
                <span>{session.activities.length} positions</span>
              </div>

              <div className="train-duration-tabs" aria-label="Training duration">
                {(Object.keys(sessionMinutes) as SessionMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={mode === item ? "active" : ""}
                    aria-pressed={mode === item}
                    onClick={() => {
                      setMode(item);
                      setPreviewIndex(0);
                      setActiveIndex(null);
                    }}
                  >
                    <strong>{modeLabels[item]}</strong>
                    <span>{sessionMinutes[item]}m</span>
                  </button>
                ))}
              </div>

              <div className="train-queue" role="list" aria-label="Today's training queue">
                {session.activities.map((activity, index) => (
                  <button
                    key={activity.id}
                    type="button"
                    role="listitem"
                    className={boundedPreviewIndex === index ? "train-queue-item active" : "train-queue-item"}
                    aria-current={boundedPreviewIndex === index ? "true" : undefined}
                    onClick={() => setPreviewIndex(index)}
                  >
                    <span className="train-queue-index">{index + 1}</span>
                    <span className="train-queue-icon">{activityIcon(activity)}</span>
                    <span className="train-queue-copy">
                      <small>{reasonLabel(activity)}</small>
                      <strong>{activity.title}</strong>
                    </span>
                    <span className="train-queue-time">{activity.estimatedMinutes}m</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="train-rail-progress"
                onClick={() => navigatePage("progress")}
              >
                <Target size={15} />
                Training history
              </button>
            </aside>

            <div className="train-room-board-column">
              <div className="train-board-context">
                <span>{previewSkill ? domainLabels[previewSkill.domain] : "Training"}</span>
                <span>{boundedPreviewIndex + 1} / {Math.max(1, session.activities.length)}</span>
              </div>

              <div className="train-preview-board">
                {previewFen ? (
                  <ChessBoard
                    key={`train-preview-${previewActivity?.id ?? "empty"}-${mode}`}
                    fen={previewFen}
                    orientation={previewFen.split(/\s+/)[1] === "b" ? "b" : "w"}
                    disabled
                  />
                ) : (
                  <div className="train-preview-empty" aria-live="polite">
                    No training position is due.
                  </div>
                )}
              </div>

              <div className="train-board-status">
                <span>
                  {previewActivity
                    ? reasonLabel(previewActivity).toLowerCase()
                    : "today’s session"}
                </span>
                <span>
                  {progressIntelligence.trainingHorizon.completedMinutes}/
                  {progressIntelligence.trainingHorizon.managedWeeklyMinutes} min this week
                </span>
              </div>
            </div>

            <aside className="train-room-coach">
              <div className="train-task-copy">
                <p className="eyebrow">
                  {previewActivity ? reasonLabel(previewActivity) : "TRAINING"}
                </p>
                <h1 id="train-room-title">
                  {previewActivity?.title ?? "No training due"}
                </h1>
                <p className="train-task-subtitle">
                  {previewActivity?.subtitle ??
                    "Nothing is due right now. Open Learn to choose a concept."}
                </p>
                {previewActivity && (
                  <p className="train-task-reason">
                    {boundedPreviewIndex === 0
                      ? homeTrainingReason
                      : `Part ${boundedPreviewIndex + 1} of today’s session.`}
                  </p>
                )}
              </div>

              <div className="train-task-actions">
                <button
                  className="primary train-room-start"
                  type="button"
                  onClick={() => openAdaptiveActivity(boundedPreviewIndex)}
                  disabled={!previewActivity}
                >
                  Start training
                  <ChevronRight size={17} />
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => navigatePage("learn")}
                >
                  Study concept
                </button>
              </div>

              <dl className="train-session-facts">
                <div>
                  <dt>Course</dt>
                  <dd>{currentCourseStage.title}</dd>
                </div>
                <div>
                  <dt>Focus</dt>
                  <dd>{progressIntelligence.trainingHorizon.nextFocusLabel}</dd>
                </div>
                <div>
                  <dt>Goal</dt>
                  <dd>{progressIntelligence.trainingHorizon.goalLabel}</dd>
                </div>
              </dl>

              {!state.placement && (
                <button
                  className="train-placement-action"
                  type="button"
                  onClick={startPlacementAssessment}
                >
                  <ClipboardCheck size={16} />
                  <span>
                    <strong>Placement check</strong>
                    <small>Optional · finds your starting point</small>
                  </span>
                </button>
              )}

              <div className="train-coach-note">
                <span>Next focus</span>
                <strong>{progressIntelligence.coachBrief.headline}</strong>
                <p>{progressIntelligence.coachBrief.summary}</p>
              </div>
            </aside>
          </section>
          )
        ) : page === "learn" ? (
          learnSection === "openings" ? (
            <OpeningsView
              progress={state.openingProgress ?? {}}
              deviations={state.openingDeviations ?? []}
              games={state.games ?? []}
              onTrainNode={startOpeningPractice}
              onTrainLine={startOpeningLinePractice}
              onBack={() => navigate("/learn")}
            />
          ) : learnSection === "model-games" ? (
            <ModelGamesView
              progress={state.modelGameProgress ?? {}}
              onStartGame={startModelGame}
              onBack={() => navigate("/learn")}
            />
          ) : (
            <LearnView
              mastery={state.mastery}
              gates={stageGates}
              placement={state.placement}
              curriculumFloor={courseCurriculumFloor(state)}
              selectedSkillId={learnSkillId}
              onOpenSkill={(skillId) => {
                const skill = skillById[skillId];
                if (!skill) return;
                navigate(learnSkillPath(skill));
              }}
              onBackToCourse={() => navigate("/learn")}
              onStartLesson={startManualLesson}
              onStartPractice={startManualPractice}
              onStartPlacement={startPlacementAssessment}
              onStartCheckpoint={startStageCheckpoint}
              onOpenOpenings={() => navigate("/learn/openings")}
              onOpenModelGames={() => navigate("/learn/model-games")}
            />
          )
        ) : page === "play" ? (
          <PlayView
            mastery={state.mastery}
            routePath={route.path}
            storageOwner={repo.getProfileId()}
            onNavigate={navigate}
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
            externalScenarioReturnPath={replayReturnPath}
            onExternalScenarioExit={() => setReplayScenario(undefined)}
          />
        ) : page === "review" ? (
          <ReviewView
            games={state.games ?? []}
            routePath={route.path}
            onNavigate={navigate}
            mistakes={state.mistakes ?? []}
            practiceHistory={state.reviewPracticeHistory ?? []}
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
            reflections={state.gameReviewReflections ?? {}}
            openingDeviations={state.openingDeviations ?? []}
            onUpdateReflection={updateGameReviewReflection}
            onRetainLesson={retainGameReviewLesson}
            onPracticeSkill={startManualPractice}
            onPracticeOpening={startOpeningPractice}
            onContinueTraining={(skillId) => {
              if (skillId && skillById[skillId]) startManualPractice(skillId);
              else navigate("/train");
            }}
            onPlayAgain={() => navigate("/play")}
          />
        ) : page === "library" ? (
          <LibraryView
            studies={state.savedStudies ?? []}
            games={state.games ?? []}
            routePath={route.path}
            onNavigate={navigate}
            onSaveStudy={saveStudy}
            onDeleteStudy={deleteStudy}
            onToggleFavorite={toggleStudyFavorite}
            onTrainStudy={startStudyTraining}
          />
        ) : page === "progress" ? (
          <ProgressView
            intelligence={progressIntelligence}
            onBack={() => navigatePage("train")}
            onTrainSkill={(skillId) => {
              startManualPractice(skillId);
            }}
            onRunPrescriptionAction={runPrescriptionAction}
            onUpdateTrainingPlan={updateTrainingPlan}
            onUpdateCompetitionPlan={updateCompetitionPlan}
            onStartRecovery={() =>
              updateTrainingPlan({
                manualRecoveryUntil: recoveryUntil(),
              })
            }
            onEndRecovery={() =>
              updateTrainingPlan({
                manualRecoveryUntil: "",
              })
            }
            onUpdateCompetitionRetrospective={
              updateCompetitionRetrospective
            }
          />
        ) : (
          <section className="settings-page" aria-labelledby="settings-title">
            <div>
              <p className="eyebrow">SETTINGS</p>
              <h1 id="settings-title">Interaction preferences</h1>
              <p>Sound, haptics, celebrations and motion remain available from the compact app controls.</p>
            </div>
            <ExperienceControls />
            <section className="chess-data-settings" aria-labelledby="chess-data-heading">
              <h2 id="chess-data-heading">Saved chess progress</h2>
              <p role="status" aria-live="polite">{syncStatus.detail}</p>
              <p>Account and guest histories are separate. Unsynced edits stay local.</p>
              <div className="chess-account-onboarding" role="group" aria-label="THIEPN Account connection">
                <h3>THIEPN Account</h3>
                <p>{chessAccountReadiness.reason}</p>
                <p>
                  {chessAccountSso
                    ? "Chess uses its own secure session. Your Account identity is verified before private Chess progress loads."
                    : chessAccountReadiness.status === "configured"
                      ? "Chess sign-in is unavailable because its publishable OAuth configuration is incomplete or invalid. Guest progress stays on this device."
                      : "Signing in on the Account website alone will not connect Chess until its first-party OAuth client is registered."}
                </p>
                {chessAccountLoginError() && (
                  <p role="alert">{chessAccountLoginError()}</p>
                )}
                {chessAccountSso && (
                  <div className="chess-data-actions">
                    {repo.getProfileId() === "guest" ? (
                      <button type="button" className="secondary" onClick={() => {
                        if (!chessAccountSso) return;
                        void chessAccountSso.connect().catch(() => {
                          window.alert("Could not open THIEPN Account sign-in. Guest progress remains on this browser.");
                        });
                      }}>Connect with THIEPN Account</button>
                    ) : (
                      <button type="button" className="secondary" onClick={() => {
                        if (!chessAccountSso) return;
                        chessAccountSso.signOutLocal();
                      }}>Sign out of Chess on this device</button>
                    )}
                  </div>
                )}
                <a href={CHESS_ACCOUNT_ORIGIN + "/"} target="_blank" rel="noopener noreferrer">
                  Manage THIEPN Account
                </a>
              </div>
              <div className="chess-data-actions">
                <button type="button" className="secondary" onClick={() => {
                  const backup = {
                    format: "thiepn-chess-backup-v1",
                    exportedAt: new Date().toISOString(),
                    state,
                  };
                  const url = URL.createObjectURL(new Blob(
                    [JSON.stringify(backup, null, 2)], { type: "application/json" },
                  ));
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = "chess-backup-" + new Date().toISOString().slice(0, 10) + ".json";
                  anchor.click();
                  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
                }}>Export JSON backup</button>
                <label className="chess-backup-import">
                  Restore from JSON backup
                  <input type="file" accept="application/json,.json" onChange={(event) => {
                    const input = event.currentTarget;
                    const uploadProfile = repo.getProfileId();
                    const file = input.files?.[0];
                    if (!file) return;
                    if (file.size > 15_000_000) {
                      window.alert("Backup exceeds the 15 MB safety limit.");
                      input.value = "";
                      return;
                    }
                    void file.text().then((content) => {
                      const parsed: unknown = JSON.parse(content);
                      const value = parsed && typeof parsed === "object" && "state" in parsed
                        ? (parsed as { state: unknown }).state : parsed;
                      if (!isChessState(value)) throw new Error("Invalid chess progress file");
                      if (repo.getProfileId() !== uploadProfile) throw new Error("Account changed during import");
                      if (window.confirm("Replace this profile? Export existing progress first.") &&
                          repo.getProfileId() === uploadProfile) {
                        setState(ensureAnalyticsState(value));
                      }
                    }).catch(() => window.alert("Could not read this chess backup.")).finally(() => {
                      input.value = "";
                    });
                  }} />
                </label>
                {repo.archivedRecovery() && <button type="button" className="secondary" onClick={() => {
                  const archived = repo.archivedRecovery();
                  if (archived && window.confirm("Restore the archived copy? Export progress first.")) {
                    setState(ensureAnalyticsState(archived));
                  }
                }}>Recover archived conflict copy</button>}
                {repo.legacyRecovery() && <button type="button" className="secondary" onClick={() => {
                  const recovered = repo.legacyRecovery();
                  if (recovered && window.confirm("Recover the older local profile? Its archive stays intact.")) {
                    setState(ensureAnalyticsState(recovered));
                  }
                }}>Recover old guest progress</button>}
              </div>
              {syncStatus.phase === "conflict" && (
                <div className="chess-sync-conflict" role="alert">
                  <h3>Cloud and this device disagree</h3>
                  <p>Both versions are preserved. Export a backup, then select which one to keep. A newer cloud edit may still require another decision.</p>
                  <div className="chess-data-actions">
                    <button type="button" onClick={() => { void repo.resolveConflict("keep-local"); }}>
                      Keep this device's progress
                    </button>
                    <button type="button" className="secondary" onClick={() => {
                      if (!window.confirm("Use the cloud version? Your unsynced local copy will be archived on this device.")) return;
                      void repo.resolveConflict("use-cloud").then((recovered) => {
                        if (recovered) setState(ensureAnalyticsState(recovered));
                      });
                    }}>Use cloud version</button>
                  </div>
                </div>
              )}
              {syncStatus.phase === "pending" && repo.mode === "supabase" && (
                <button type="button" className="secondary" onClick={() => { void repo.retryPending(); }}>
                  Retry cloud sync
                </button>
              )}
            </section>
            <button className="secondary" type="button" onClick={() => navigatePage("train")}>
              Back to Train
            </button>
          </section>
        )}
        </Suspense>
      </main>

      {!trainingSessionOpen && !playSessionOpen && (
        <nav className="mobile-nav" aria-label="Primary navigation">
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={page === id ? "active" : ""}
              aria-current={page === id ? "page" : undefined}
              onPointerDown={() => preloadNavRoute(id)}
              onFocus={() => preloadNavRoute(id)}
              onClick={() => {
                if (id === "learn") {
                  navigate("/learn");
                } else {
                  navigatePage(id);
                }
                emitExperienceEvent({ feedback: "navigate" });
              }}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      </div>
    </ExperienceProvider>
  );
}
