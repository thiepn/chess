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
import { CalculationRunner } from "./components/CalculationRunner";
import { EndgameTechniqueRunner } from "./components/EndgameTechniqueRunner";
import { weaknessesFromMistakes } from "./games/weaknesses";
import type { GameReviewReflection, ImportedGame, PersonalMistake } from "./games/types";
import { OpeningsView } from "./components/OpeningsView";
import { OpeningTrainer } from "./components/OpeningTrainer";
import { openingNodes, repertoireById } from "./openings/repertoire";
import { applyOpeningAttempt, createOpeningProgress } from "./openings/progress";
import { openingDeviationsForGame } from "./openings/match";
import { PlayView } from "./components/PlayView";
import { GameArena } from "./components/GameArena";
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
import { LibraryView } from "./components/LibraryView";
import { SavedStudyTrainer } from "./components/SavedStudyTrainer";
import type { SavedStudy } from "./library/types";
import { ModelGamesView } from "./components/ModelGamesView";
import { ModelGameRunner } from "./components/ModelGameRunner";
import { modelGameById, modelGameCheckpointPosition } from "./model-games/games";
import { recordModelGameCheckpoint, recordModelGameCompletion } from "./model-games/progress";
import type { ModelGameCheckpointResult } from "./model-games/types";
import { applyStudyAttempt, createStudyTraining } from "./library/progress";
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
  const [learnMode, setLearnMode] = useState<"curriculum" | "openings" | "model-games">("curriculum");
  const [activeModelGameId, setActiveModelGameId] = useState<string | null>(null);
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
  const activeModelGame = activeModelGameId
    ? modelGameById[activeModelGameId]
    : undefined;
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

  const firstActivity = session.activities[0];
  const homeTrainingReason = !firstActivity
    ? "No adaptive activity is due right now. Open the course to choose the next concept."
    : firstActivity.source === "prescription"
      ? progressIntelligence.coachBrief.decisions[0]?.title
        ? `${progressIntelligence.coachBrief.decisions[0].title} is the most useful repair before adding more material.`
        : "A repeated game problem is worth repairing before adding more material."
      : firstActivity.source === "weakness"
        ? "Your recent games keep pointing to this weakness."
        : firstActivity.source === "review"
          ? "This material is due now so it survives beyond short-term practice."
          : firstActivity.source === "assessment"
            ? "A checkpoint exposed a specific gap worth repairing."
            : firstActivity.source === "curriculum"
              ? "This is the next useful concept in your current course stage."
              : firstActivity.source === "library"
                ? "A saved position is due for retrieval."
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

    setManualActivity({
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
    setActiveIndex(null);
    setManualActivity(null);
    setActiveModelGameId(gameId);
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
    setLearnMode("model-games");
    setNav("learn");
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

    setManualActivity({
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
        ? "Real-game prescription"
        : "Focused practice",
      title: skill.title,
      subtitle:
        activityType === "endgameDrill" ||
        activityType === "conversionChallenge"
          ? "Recognition + play-out against resistance"
          : activityType === "calculation"
            ? "Candidate generation & line calculation"
            : activityType === "mixedPuzzle" ||
              activityType === "themedPuzzle"
            ? "Adaptive retrieval practice"
            : "Guided concept repair",
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
    ["home", "Train", Sparkles],
    ["learn", "Learn", BookOpen],
    ["play", "Play", Play],
    ["review", "Review", BarChart3],
    ["library", "Library", Library],
    ["progress", "Progress", Target],
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
            <header className="train-home-hero">
              <div className="train-home-copy">
                <span className="train-now-kicker">
                  <Sparkles size={14} /> Recommended now
                </span>
                <h1>{firstActivity?.title ?? "Train what matters."}</h1>
                <p>{homeTrainingReason}</p>

                <div className="train-home-actions">
                  <button
                    className="primary train-now-button"
                    type="button"
                    onClick={() => setActiveIndex(0)}
                    disabled={!session.activities.length}
                  >
                    Train now
                    <span>{session.plannedMinutes} min</span>
                    <ChevronRight size={18} />
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setNav("learn")}
                  >
                    Browse course
                  </button>
                </div>

                <div className="train-home-context">
                  <span>
                    <strong>{session.activities.length}</strong> focused activit{session.activities.length === 1 ? "y" : "ies"}
                  </span>
                  <span>
                    <strong>{progressIntelligence.trainingHorizon.nextFocusLabel}</strong> emphasis
                  </span>
                  <span>
                    <strong>{progressIntelligence.trainingHorizon.completedMinutes}/{progressIntelligence.trainingHorizon.managedWeeklyMinutes}m</strong> this week
                  </span>
                </div>
              </div>

              <div className="train-home-orb" aria-hidden="true">
                <Clock3 size={22} />
                <strong>{session.plannedMinutes}</strong>
                <span>min</span>
              </div>
            </header>

            <section className="mode-switch train-mode-switch" aria-label="Training duration">
              {(Object.keys(sessionMinutes) as SessionMode[]).map((item) => (
                <button
                  key={item}
                  className={[
                    "mode",
                    mode === item ? "active" : "",
                    progressIntelligence.trainingHorizon.recommendedSessionMode === item
                      ? "recommended"
                      : "",
                  ].filter(Boolean).join(" ")}
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

            <section className="train-session-preview">
              <div className="train-session-preview-head">
                <div>
                  <p className="eyebrow">TODAY'S SESSION</p>
                  <h2>Know what you are doing before you start.</h2>
                </div>
                <button
                  type="button"
                  className="text-action"
                  onClick={() => setNav("progress")}
                >
                  Why this session? <ChevronRight size={15} />
                </button>
              </div>

              <div className="train-session-activities">
                {session.activities.slice(0, 4).map((activity, index) => (
                  <article key={activity.id}>
                    <div className="activity-index">{index + 1}</div>
                    <div className="activity-icon">{activityIcon(activity)}</div>
                    <div>
                      <small>{reasonLabel(activity)}</small>
                      <strong>{activity.title}</strong>
                      <span>{activity.subtitle}</span>
                    </div>
                    <em>{activity.estimatedMinutes}m</em>
                  </article>
                ))}
              </div>

              <div className="train-session-footer">
                <p>{homeTrainingReason}</p>
                <button
                  className="primary"
                  type="button"
                  onClick={() => setActiveIndex(0)}
                  disabled={!session.activities.length}
                >
                  Start session <ChevronRight size={18} />
                </button>
              </div>
            </section>

            {!state.placement && (
              <section className="home-placement-card train-secondary-card">
                <div className="home-placement-icon">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <p className="eyebrow">OPTIONAL PLACEMENT</p>
                  <strong>Calibrate the course before studying deeply.</strong>
                  <span>
                    The diagnostic samples the full course, but it never blocks you from training now.
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

            <section className="train-plan-strip">
              <div>
                <span>Current goal</span>
                <strong>{progressIntelligence.trainingHorizon.goalLabel}</strong>
              </div>
              <div>
                <span>Course stage</span>
                <strong>{currentCourseStage.title}</strong>
              </div>
              <div>
                <span>Weekly progress</span>
                <strong>
                  {progressIntelligence.trainingHorizon.completedMinutes}/
                  {progressIntelligence.trainingHorizon.managedWeeklyMinutes}m
                </strong>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setNav("progress")}
              >
                Plan & progress <ChevronRight size={15} />
              </button>
            </section>

            {progressIntelligence.trainingHorizon.competitionCycle.enabled && (
              <section className="train-competition-summary">
                <Target size={18} />
                <div>
                  <span>Competition preparation</span>
                  <strong>
                    {progressIntelligence.trainingHorizon.competitionCycle.phaseLabel}
                    {progressIntelligence.trainingHorizon.competitionCycle.daysToEvent !== undefined
                      ? ` · ${progressIntelligence.trainingHorizon.competitionCycle.daysToEvent}d to event`
                      : ""}
                  </strong>
                </div>
                <small>
                  preparation readiness {progressIntelligence.trainingHorizon.competitionCycle.readinessScore}%
                </small>
              </section>
            )}

            <section className="home-course-gate">
              <div className="home-course-gate-copy">
                <div>
                  <p className="eyebrow">COURSE</p>
                  <span className={`gate-status ${currentCourseGate.status}`}>
                    {gateStatusLabel(currentCourseGate.status)}
                  </span>
                </div>
                <h2>{currentCourseStage.title}</h2>
                <p>
                  {currentCourseGate.blockers.length
                    ? `Next promotion still needs ${currentCourseGate.blockers
                        .map(gateBlockerLabel)
                        .join(", ")} evidence.`
                    : "You are ready for the next checkpoint."}
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

            <section className={`home-coach-brief ${progressIntelligence.coachBrief.evidenceState}`}>
              <div className="home-coach-brief-head">
                <div>
                  <p className="eyebrow">COACH</p>
                  <h3>{progressIntelligence.coachBrief.headline}</h3>
                </div>
                <span>
                  {progressIntelligence.coachBrief.confidenceLabel}
                </span>
              </div>

              <p>{progressIntelligence.coachBrief.summary}</p>

              <div className="home-coach-brief-evidence">
                <span>
                  {progressIntelligence.coachBrief.decisions[0]?.evidenceLabel ??
                    `${progressIntelligence.coachBrief.humanGames} human games analyzed`}
                </span>
                <span className={`coach-behavior-state ${progressIntelligence.coachBrief.behaviorCheck.state}`}>
                  {progressIntelligence.coachBrief.behaviorCheck.label}
                </span>
              </div>

              <button
                className="secondary"
                type="button"
                onClick={() => setNav("progress")}
              >
                See coach reasoning <ChevronRight size={16} />
              </button>
            </section>
          </>
        ) : nav === "learn" ? (
          learnMode === "openings" ? (
            <OpeningsView
              progress={state.openingProgress ?? {}}
              deviations={state.openingDeviations ?? []}
              games={state.games ?? []}
              onTrainNode={startOpeningPractice}
              onTrainLine={startOpeningLinePractice}
              onBack={() => setLearnMode("curriculum")}
            />
          ) : learnMode === "model-games" ? (
            <ModelGamesView
              progress={state.modelGameProgress ?? {}}
              onStartGame={startModelGame}
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
              onOpenModelGames={() => setLearnMode("model-games")}
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
            reflections={state.gameReviewReflections ?? {}}
            openingDeviations={state.openingDeviations ?? []}
            onUpdateReflection={updateGameReviewReflection}
            onRetainLesson={retainGameReviewLesson}
            onPracticeSkill={startManualPractice}
            onPracticeOpening={startOpeningPractice}
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
          <section className="placeholder">
            <div className="placeholder-icon">
              <Library />
            </div>
            <p className="eyebrow">{nav.toUpperCase()}</p>
            <h2>{nav[0].toUpperCase() + nav.slice(1)} foundation ready</h2>
            <p>
              This area is reserved for the next specialized product phase.
              The shared board and lesson engine are ready.
            </p>
            <button className="secondary" onClick={() => setNav("home")}>Back to Train</button>
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

      {activeModelGame && (
        <div
          className="training-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Model game: ${activeModelGame.title}`}
        >
          <section className="training-sheet model-game-sheet">
            <button
              className="close-button"
              type="button"
              onClick={() => setActiveModelGameId(null)}
              aria-label="Close model game"
            >
              ×
            </button>
            <ModelGameRunner
              game={activeModelGame}
              progress={state.modelGameProgress?.[activeModelGame.id]}
              savedStudyIds={(state.savedStudies ?? []).map((study) => study.id)}
              onCheckpointResult={(result) =>
                completeModelGameCheckpoint(activeModelGame.id, result)
              }
              onSaveCheckpoint={saveModelGameCheckpoint}
              onComplete={completeModelGame}
              onExit={() => setActiveModelGameId(null)}
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
                : active.activityType === "calculation"
                  ? "training-sheet calculation-sheet"
                  : active.activityType === "endgameDrill" ||
                      active.activityType === "conversionChallenge"
                    ? "training-sheet endgame-technique-sheet"
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
                    {active.adaptivePolicy.challenge === "recovery"
                      ? "Extra support"
                      : active.adaptivePolicy.challenge === "supported"
                        ? "Supported"
                        : active.adaptivePolicy.challenge === "stretch"
                          ? "Harder"
                          : active.adaptivePolicy.challenge === "maintenance"
                            ? "Keep sharp"
                            : "Normal"}
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
                mode={active.openingTrainingMode}
                lineNodeId={active.openingLineNodeId}
                onComplete={completeActivity}
              />
            ) : active.activityType === "personalMistake" && activeMistake ? (
              <PersonalMistakeRunner
                mistake={activeMistake}
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
          </section>
        </div>
      )}
      </div>
    </ExperienceProvider>
  );
}
