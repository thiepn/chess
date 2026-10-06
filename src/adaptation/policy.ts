import type { LearningAnalyticsEvent } from "../analytics/types";
import type {
  CandidateSource,
  ChessSkill,
  SkillMastery,
  TrainingMode,
  UserState,
} from "../domain/types";
import { retentionProbability } from "../domain/mastery";
import type {
  AdaptiveTrainingPolicy,
  ChallengeBand,
} from "./types";
import { trainingScenarios } from "../play/scenarios";

const DAY = 86_400_000;

const evidenceModeMap: Partial<Record<string, TrainingMode>> = {
  lesson: "conceptLesson",
  guided: "guidedDemo",
  themedPuzzle: "themedPuzzle",
  mixedPuzzle: "mixedPuzzle",
  calculation: "calculation",
  delayedReview: "microReview",
  trainingPosition: "engineGame",
  engineGame: "engineGame",
};

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function recentSkillEvents(
  state: UserState,
  skillId: string,
  now: Date,
  days = 45,
) {
  const cutoff = now.getTime() - days * DAY;
  return (state.analytics?.events ?? []).filter(
    (event) =>
      event.kind === "evidence" &&
      event.skillId === skillId &&
      new Date(event.occurredAt).getTime() >= cutoff,
  );
}

function transferValue(mastery?: SkillMastery) {
  if (!mastery) return 0;

  const human = Math.max(
    mastery.humanGameRecognition ?? 0,
    mastery.humanGameExecution ?? 0,
  );
  const ai = Math.max(
    mastery.trainingTransfer,
    mastery.aiGameTransfer ?? 0,
  );
  const legacy = Math.max(
    mastery.realGameRecognition,
    mastery.realGameExecution,
  );

  return Math.max(
    human,
    ai * .88,
    legacy * .9,
  );
}

function modePerformance(
  events: LearningAnalyticsEvent[],
  mode: TrainingMode,
) {
  const matching = events.filter(
    (event) => evidenceModeMap[event.evidenceSource ?? ""] === mode,
  );

  if (!matching.length) return null;

  const successRate =
    matching.filter((event) => event.success).length / matching.length;
  const averageGain = average(
    matching.map((event) => event.masteryAfter - event.masteryBefore),
  );

  return {
    attempts: matching.length,
    successRate,
    averageGain,
    score:
      successRate * .65 +
      clamp(averageGain / 10, -.2, 1) * .35,
  };
}

function availableTransferMode(skill: ChessSkill) {
  if (trainingScenarios.some((scenario) => scenario.skillId === skill.id)) {
    return "engineGame" as TrainingMode;
  }
  if (skill.trainingModes.includes("mixedPuzzle")) return "mixedPuzzle";
  if (skill.trainingModes.includes("themedPuzzle")) return "themedPuzzle";
  if (skill.trainingModes.includes("guidedDemo")) return "guidedDemo";
  if (skill.trainingModes.includes("conceptLesson")) return "conceptLesson";
  return skill.trainingModes[0];
}

function availableRecognitionMode(skill: ChessSkill) {
  if (skill.trainingModes.includes("themedPuzzle")) return "themedPuzzle";
  if (skill.trainingModes.includes("guidedDemo")) return "guidedDemo";
  if (skill.trainingModes.includes("mixedPuzzle")) return "mixedPuzzle";
  return skill.trainingModes[0] ?? "conceptLesson";
}

function availableMixedMode(skill: ChessSkill) {
  if (skill.trainingModes.includes("mixedPuzzle")) return "mixedPuzzle";
  if (skill.trainingModes.includes("calculation")) return "calculation";
  if (skill.trainingModes.includes("themedPuzzle")) return "themedPuzzle";
  return skill.trainingModes[0] ?? "conceptLesson";
}

function modeForSource(
  skill: ChessSkill,
  source: CandidateSource,
): TrainingMode | null {
  if (source === "game") return "personalMistake";
  if (source === "repertoire") return "openingRecall";
  if (source === "library") return "savedStudy";
  return null;
}

function challengeBand(
  mastery: SkillMastery | undefined,
  recentSuccessRate: number | undefined,
  retention: number,
  transfer: number,
): ChallengeBand {
  if (!mastery || mastery.attempts === 0) return "supported";

  if (
    mastery.effectiveMastery >= 86 &&
    retention >= .78 &&
    transfer >= 60
  ) {
    return "maintenance";
  }

  if (recentSuccessRate !== undefined) {
    if (recentSuccessRate < .5) return "recovery";
    if (recentSuccessRate < .68) return "supported";
    if (recentSuccessRate > .9 && mastery.confidence >= 55) return "stretch";
  }

  return "productive";
}

function puzzleTarget(
  mastery: SkillMastery | undefined,
  skill: ChessSkill,
  band: ChallengeBand,
  recentSuccessRate?: number,
) {
  const masteryValue = mastery?.effectiveMastery ?? 0;
  const base = 650 + masteryValue * 11 + skill.difficulty * 45;
  const bandAdjust: Record<ChallengeBand, number> = {
    recovery: -180,
    supported: -70,
    productive: 40,
    stretch: 190,
    maintenance: 100,
  };
  const performanceAdjust =
    recentSuccessRate === undefined
      ? 0
      : recentSuccessRate > .85
        ? 90
        : recentSuccessRate < .55
          ? -90
          : 0;

  return Math.round(
    Math.max(
      600,
      Math.min(2400, base + bandAdjust[band] + performanceAdjust),
    ),
  );
}

function bestModeFromHistory(
  skill: ChessSkill,
  events: LearningAnalyticsEvent[],
  candidates: TrainingMode[],
) {
  return candidates
    .map((mode) => ({
      mode,
      performance: modePerformance(events, mode),
    }))
    .filter(
      (item) =>
        skill.trainingModes.includes(item.mode) &&
        item.performance &&
        item.performance.attempts >= 2,
    )
    .sort(
      (a, b) =>
        (b.performance?.score ?? -1) -
        (a.performance?.score ?? -1),
    )[0]?.mode;
}

function chooseMode(
  skill: ChessSkill,
  source: CandidateSource,
  mastery: SkillMastery | undefined,
  events: LearningAnalyticsEvent[],
  retention: number,
  transfer: number,
) {
  const forced = modeForSource(skill, source);
  if (forced) return {
    mode: forced,
    reason: source === "game"
      ? "Repair a concrete mistake from your own game."
      : source === "repertoire"
        ? "Rehearse the exact repertoire position that is due."
        : "Retrieve the saved position you chose to train.",
  };

  if (!mastery || mastery.attempts === 0) {
    const mode = skill.trainingModes.includes("conceptLesson")
      ? "conceptLesson"
      : skill.trainingModes.includes("guidedDemo")
        ? "guidedDemo"
        : skill.trainingModes[0] ?? "conceptLesson";
    return {
      mode,
      reason: "New skill: build the concept before testing transfer.",
    };
  }

  if (
    mastery.understanding < 45 &&
    skill.trainingModes.includes("conceptLesson")
  ) {
    return {
      mode: "conceptLesson" as TrainingMode,
      reason: "Understanding is the weakest dimension, so explanation comes before harder retrieval.",
    };
  }

  if (mastery.recognition < 52) {
    const mode = availableRecognitionMode(skill);
    return {
      mode,
      reason: "Recognition is weak, so use a visible pattern-focused intervention.",
    };
  }

  if (
    mastery.mixedRecognition < 56 &&
    mastery.recognition >= 50
  ) {
    const mode = availableMixedMode(skill);
    return {
      mode,
      reason: "The pattern works in isolation but is weaker in mixed positions.",
    };
  }

  if (
    skill.domain === "calculation" &&
    skill.trainingModes.includes("calculation") &&
    (mastery?.understanding ?? 0) >= 45
  ) {
    return {
      mode: "calculation" as TrainingMode,
      reason:
        "The concept is established; train candidate generation and multi-ply calculation directly.",
    };
  }

  if (
    transfer < 45 &&
    mastery.effectiveMastery >= 48
  ) {
    const mode = availableTransferMode(skill);
    if (mode) {
      return {
        mode,
        reason: "Knowledge is ahead of transfer, so prove the skill in a resistant position.",
      };
    }
  }

  if (
    retention < .62 &&
    mastery.attempts > 1
  ) {
    if (skill.trainingModes.includes("mixedPuzzle")) {
      return {
        mode: "mixedPuzzle" as TrainingMode,
        reason: "Recall is decaying, so use retrieval without revealing the motif.",
      };
    }
    if (skill.trainingModes.includes("microReview")) {
      return {
        mode: "microReview" as TrainingMode,
        reason: "Recall is decaying, so use a short spaced retrieval.",
      };
    }
  }

  const historicalBest = bestModeFromHistory(skill, events, [
    "themedPuzzle",
    "mixedPuzzle",
    "calculation",
    "guidedDemo",
    "conceptLesson",
  ]);

  if (historicalBest) {
    return {
      mode: historicalBest,
      reason: "This intervention has the strongest recent personal learning signal for this skill.",
    };
  }

  if (source === "review") {
    const mode = skill.trainingModes.includes("mixedPuzzle")
      ? "mixedPuzzle"
      : skill.trainingModes.includes("themedPuzzle")
        ? "themedPuzzle"
        : skill.trainingModes.includes("microReview")
          ? "microReview"
          : skill.trainingModes[0] ?? "conceptLesson";
    return {
      mode,
      reason: "Scheduled review: retrieve the skill with minimal guidance.",
    };
  }

  if (source === "assessment") {
    const mode = availableMixedMode(skill);
    return {
      mode,
      reason: "Checkpoint evidence was weak, so repair the skill with active retrieval.",
    };
  }

  return {
    mode: skill.trainingModes[0] ?? "conceptLesson",
    reason: "Use the skill's default next training mode.",
  };
}

export function trainingPolicyFor(
  state: UserState,
  skill: ChessSkill,
  source: CandidateSource,
  now = new Date(),
): AdaptiveTrainingPolicy {
  const mastery = state.mastery[skill.id];
  const events = recentSkillEvents(state, skill.id, now);
  const scoredEvents = events.filter(
    (event) => typeof event.success === "boolean",
  );
  const recentSuccessRate = scoredEvents.length
    ? scoredEvents.filter((event) => event.success).length /
      scoredEvents.length
    : undefined;
  const retention = mastery
    ? retentionProbability(mastery, now)
    : 0;
  const transfer = transferValue(mastery);
  const chosen = chooseMode(
    skill,
    source,
    mastery,
    events,
    retention,
    transfer,
  );
  const band = challengeBand(
    mastery,
    recentSuccessRate,
    retention,
    transfer,
  );

  const stopPressure = clamp(
    ((mastery?.effectiveMastery ?? 0) / 100) * .38 +
      retention * .34 +
      (transfer / 100) * .28,
  );

  const sampleConfidence = clamp(events.length / 10);
  const masteryConfidence = (mastery?.confidence ?? 0) / 100;
  const policyConfidence = clamp(
    sampleConfidence * .55 + masteryConfidence * .45,
  );

  const targetRange: Record<
    ChallengeBand,
    [number, number]
  > = {
    recovery: [72, 88],
    supported: [68, 84],
    productive: [62, 78],
    stretch: [52, 70],
    maintenance: [60, 78],
  };

  const [targetSuccessLow, targetSuccessHigh] =
    targetRange[band];

  const puzzleLike = [
    "themedPuzzle",
    "mixedPuzzle",
    "calculation",
  ].includes(chosen.mode);

  let priorityMultiplier = 1;
  if (band === "recovery") priorityMultiplier *= 1.18;
  if (band === "stretch") priorityMultiplier *= 1.06;
  if (band === "maintenance") priorityMultiplier *= .48;
  if (
    transfer < 35 &&
    (mastery?.effectiveMastery ?? 0) >= 55
  ) {
    priorityMultiplier *= 1.16;
  }

  return {
    mode: chosen.mode,
    challenge: band,
    targetSuccessLow,
    targetSuccessHigh,
    targetPuzzleRating: puzzleLike
      ? puzzleTarget(
          mastery,
          skill,
          band,
          recentSuccessRate,
        )
      : undefined,
    priorityMultiplier,
    policyConfidence,
    recentAttempts: events.length,
    recentSuccessRate:
      recentSuccessRate === undefined
        ? undefined
        : Math.round(recentSuccessRate * 100),
    stopPressure,
    reason: chosen.reason,
  };
}
