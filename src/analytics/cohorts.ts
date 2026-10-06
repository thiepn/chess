import { skillById } from "../domain/curriculum";
import type { UserState } from "../domain/types";
import type {
  GamePhase,
  ImportedGame,
  PersonalMistake,
} from "../games/types";
import { openingIdentityForGame } from "../openings/match";
import type {
  CohortDimension,
  HumanGameCohortInsight,
  MistakeFamilyInsight,
  PhasePerformanceInsight,
  PracticalDiagnostic,
  RealGameDiagnostics,
  RecentFormInsight,
} from "./types";

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function humanGames(state: UserState) {
  return [...(state.games ?? [])]
    .filter(
      (game) =>
        game.source === "lichess" &&
        Boolean(game.analyzedAt) &&
        Boolean(game.practicalMetrics),
    )
    .sort((a, b) => a.importedAt.localeCompare(b.importedAt));
}

export function practicalScoreForGame(game: ImportedGame) {
  const metrics = game.practicalMetrics;
  if (!metrics) return 0;

  return (
    metrics.qualityScore * .68 +
    metrics.resultScore * .2 +
    Math.max(0, 100 - metrics.criticalErrorRate) * .12
  );
}

function cohortMetrics(
  dimension: CohortDimension,
  key: string,
  label: string,
  games: ImportedGame[],
  baseline: number,
): HumanGameCohortInsight {
  const metrics = games
    .map((game) => game.practicalMetrics)
    .filter(Boolean);

  const quality = average(
    metrics.map((item) => item!.qualityScore),
  );
  const resultPerformance = average(
    metrics.map((item) => item!.resultScore),
  );
  const averageCentipawnLoss = average(
    metrics.map((item) => item!.averageCentipawnLoss),
  );
  const criticalErrorRate = average(
    metrics.map((item) => item!.criticalErrorRate),
  );
  const blunderRate = average(
    metrics.map((item) => item!.blunderRate),
  );
  const score = average(games.map(practicalScoreForGame));

  return {
    dimension,
    key,
    label,
    games: games.length,
    quality: Math.round(quality),
    resultPerformance: Math.round(resultPerformance),
    averageCentipawnLoss: Math.round(averageCentipawnLoss),
    criticalErrorRate: round(criticalErrorRate),
    blunderRate: round(blunderRate),
    practicalScore: Math.round(score),
    deltaVsBaseline: round(score - baseline),
    confidence: Math.round(
      Math.min(100, games.length / 6 * 100),
    ),
  };
}

function buildCohorts(
  games: ImportedGame[],
  dimension: CohortDimension,
  identify: (game: ImportedGame) => { key: string; label: string },
  baseline: number,
) {
  const grouped = new Map<
    string,
    { label: string; games: ImportedGame[] }
  >();

  for (const game of games) {
    const identity = identify(game);
    const current = grouped.get(identity.key) ?? {
      label: identity.label,
      games: [],
    };
    current.games.push(game);
    grouped.set(identity.key, current);
  }

  return [...grouped.entries()]
    .map(([key, item]) =>
      cohortMetrics(
        dimension,
        key,
        item.label,
        item.games,
        baseline,
      ),
    )
    .sort(
      (a, b) =>
        b.games - a.games ||
        a.practicalScore - b.practicalScore,
    );
}

export function opponentCohortForGame(game: ImportedGame) {
  if (
    typeof game.playerRating !== "number" ||
    typeof game.opponentRating !== "number"
  ) {
    return { key: "unknown", label: "Unknown rating" };
  }

  const delta = game.opponentRating - game.playerRating;
  if (delta >= 125) {
    return { key: "stronger", label: "Stronger opponents" };
  }
  if (delta <= -125) {
    return { key: "weaker", label: "Lower-rated opponents" };
  }
  return { key: "peer", label: "Similar-rated opponents" };
}

export function positionTypeForGame(game: ImportedGame) {
  const phases = game.reviewStory?.phases ?? [];
  const opening = phases.find((phase) => phase.phase === "opening");
  const middlegame = phases.find(
    (phase) => phase.phase === "middlegame",
  );
  const endgame = phases.find((phase) => phase.phase === "endgame");
  const tacticalMoments = (game.reviewStory?.moments ?? []).filter(
    (moment) =>
      moment.kind === "critical" &&
      moment.skillIds.some(
        (skillId) =>
          skillId.startsWith("tactics.") ||
          skillId.startsWith("calculation.") ||
          skillId === "fundamentals.hanging",
      ),
  ).length;

  const otherPhaseLoss = Math.min(
    ...[middlegame, endgame]
      .filter(Boolean)
      .map((phase) => phase!.averageCentipawnLoss)
      .concat([999]),
  );

  if (
    opening &&
    opening.criticalCount > 0 &&
    opening.averageCentipawnLoss >= otherPhaseLoss + 30
  ) {
    return {
      key: "opening-sensitive",
      label: "Opening-sensitive games",
    };
  }

  if (
    tacticalMoments >= 2 ||
    (game.practicalMetrics?.blunderRate ?? 0) >= 6
  ) {
    return { key: "tactical", label: "Tactical games" };
  }

  if (
    endgame &&
    endgame.endPly - endgame.startPly >= 14
  ) {
    return { key: "endgame-heavy", label: "Endgame-heavy games" };
  }

  if (
    middlegame &&
    middlegame.endPly - middlegame.startPly >= 28
  ) {
    return {
      key: "long-middlegame",
      label: "Long middlegames",
    };
  }

  return { key: "balanced", label: "Balanced games" };
}

function phaseInsights(
  games: ImportedGame[],
): PhasePerformanceInsight[] {
  const phases: GamePhase[] = [
    "opening",
    "middlegame",
    "endgame",
  ];

  return phases
    .map((phase) => {
      const samples = games
        .map((game) =>
          game.reviewStory?.phases.find(
            (item) => item.phase === phase,
          ),
        )
        .filter(Boolean);

      if (!samples.length) return null;

      const averageCentipawnLoss = average(
        samples.map((item) => item!.averageCentipawnLoss),
      );
      const criticalPerGame = average(
        samples.map((item) => item!.criticalCount),
      );

      return {
        phase,
        games: samples.length,
        averageCentipawnLoss: Math.round(
          averageCentipawnLoss,
        ),
        criticalPerGame: round(criticalPerGame),
        quality: Math.round(
          Math.max(
            0,
            Math.min(
              100,
              100 -
                averageCentipawnLoss * .5 -
                criticalPerGame * 12,
            ),
          ),
        ),
      } satisfies PhasePerformanceInsight;
    })
    .filter(
      (value): value is PhasePerformanceInsight =>
        Boolean(value),
    );
}

function mistakeFamilyInsights(
  state: UserState,
  games: ImportedGame[],
): MistakeFamilyInsight[] {
  const humanIds = new Set(games.map((game) => game.id));
  const mistakes = (state.mistakes ?? []).filter(
    (mistake) =>
      humanIds.has(mistake.gameId) ||
      mistake.gameSource === "lichess",
  );
  const grouped = new Map<string, PersonalMistake[]>();

  for (const mistake of mistakes) {
    for (const skillId of mistake.skillIds) {
      grouped.set(skillId, [
        ...(grouped.get(skillId) ?? []),
        mistake,
      ]);
    }
  }

  const impact = (mistake: PersonalMistake) =>
    mistake.severity === "blunder"
      ? 1
      : mistake.severity === "mistake"
        ? .7
        : .4;

  return [...grouped.entries()]
    .map(([skillId, items]) => {
      const gameCount = new Set(
        items.map((item) => item.gameId),
      ).size;
      return {
        skillId,
        label: skillById[skillId]?.title ?? skillId,
        games: gameCount,
        occurrences: items.length,
        averageImpact: round(
          average(items.map(impact)) * 100,
        ),
        recurrenceRate: round(
          games.length
            ? gameCount / games.length * 100
            : 0,
        ),
      };
    })
    .sort(
      (a, b) =>
        b.recurrenceRate * b.averageImpact -
        a.recurrenceRate * a.averageImpact,
    )
    .slice(0, 8);
}

function recentForm(
  games: ImportedGame[],
): RecentFormInsight {
  const recent = games.slice(-5);
  const previous = games.slice(
    Math.max(0, games.length - 10),
    Math.max(0, games.length - 5),
  );

  const recentQuality = average(
    recent.map(
      (game) => game.practicalMetrics?.qualityScore ?? 0,
    ),
  );
  const previousQuality = average(
    previous.map(
      (game) => game.practicalMetrics?.qualityScore ?? 0,
    ),
  );
  const recentResultPerformance = average(
    recent.map(
      (game) => game.practicalMetrics?.resultScore ?? 0,
    ),
  );
  const previousResultPerformance = average(
    previous.map(
      (game) => game.practicalMetrics?.resultScore ?? 0,
    ),
  );
  const qualityDelta =
    previous.length >= 3
      ? recentQuality - previousQuality
      : 0;
  const resultDelta =
    previous.length >= 3
      ? recentResultPerformance -
        previousResultPerformance
      : 0;

  const direction: RecentFormInsight["direction"] =
    recent.length < 3 || previous.length < 3
      ? "insufficient"
      : qualityDelta >= 7 || resultDelta >= 12
        ? "improving"
        : qualityDelta <= -7 || resultDelta <= -12
          ? "declining"
          : "stable";

  return {
    recentGames: recent.length,
    previousGames: previous.length,
    recentQuality: Math.round(recentQuality),
    previousQuality: Math.round(previousQuality),
    qualityDelta: round(qualityDelta),
    recentResultPerformance: Math.round(
      recentResultPerformance,
    ),
    previousResultPerformance: Math.round(
      previousResultPerformance,
    ),
    resultDelta: round(resultDelta),
    direction,
  };
}

function cohortDiagnostics(
  cohorts: HumanGameCohortInsight[],
): PracticalDiagnostic[] {
  const eligible = cohorts.filter(
    (item) => item.games >= 3,
  );
  const weakest = [...eligible]
    .sort(
      (a, b) =>
        a.deltaVsBaseline - b.deltaVsBaseline,
    )[0];
  const strongest = [...eligible]
    .sort(
      (a, b) =>
        b.deltaVsBaseline - a.deltaVsBaseline,
    )[0];
  const result: PracticalDiagnostic[] = [];

  if (weakest && weakest.deltaVsBaseline <= -7) {
    result.push({
      id: `cohort:${weakest.dimension}:${weakest.key}:weak`,
      severity:
        weakest.deltaVsBaseline <= -14
          ? "priority"
          : "watch",
      headline: `${weakest.label} are underperforming`,
      detail: `${weakest.games} games score ${Math.abs(
        Math.round(weakest.deltaVsBaseline),
      )} points below your human-game baseline, with ${weakest.quality}% engine quality.`,
      dimension: weakest.dimension,
      cohortKey: weakest.key,
      games: weakest.games,
      confidence: weakest.confidence,
    });
  }

  if (
    strongest &&
    strongest.deltaVsBaseline >= 8 &&
    strongest.key !== weakest?.key
  ) {
    result.push({
      id: `cohort:${strongest.dimension}:${strongest.key}:strong`,
      severity: "strength",
      headline: `${strongest.label} are a current strength`,
      detail: `${strongest.games} games score ${Math.round(
        strongest.deltaVsBaseline,
      )} points above your human-game baseline.`,
      dimension: strongest.dimension,
      cohortKey: strongest.key,
      games: strongest.games,
      confidence: strongest.confidence,
    });
  }

  return result;
}

function buildDiagnostics(
  cohorts: HumanGameCohortInsight[][],
  phases: PhasePerformanceInsight[],
  mistakes: MistakeFamilyInsight[],
  form: RecentFormInsight,
  baselineQuality: number,
): PracticalDiagnostic[] {
  const diagnostics = cohorts.flatMap(cohortDiagnostics);

  const weakPhase = [...phases]
    .filter((phase) => phase.games >= 3)
    .sort((a, b) => a.quality - b.quality)[0];

  if (
    weakPhase &&
    weakPhase.quality <= baselineQuality - 9
  ) {
    diagnostics.push({
      id: `phase:${weakPhase.phase}`,
      severity:
        weakPhase.quality <= baselineQuality - 16
          ? "priority"
          : "watch",
      headline: `Your ${weakPhase.phase} is leaking practical value`,
      detail: `${weakPhase.games} human games average ${weakPhase.averageCentipawnLoss} ACPL and ${weakPhase.criticalPerGame} critical errors per game in this phase.`,
      dimension: "phase",
      cohortKey: weakPhase.phase,
      games: weakPhase.games,
      confidence: Math.round(
        Math.min(100, weakPhase.games / 6 * 100),
      ),
    });
  }

  const recurring = mistakes.find(
    (item) =>
      item.games >= 3 &&
      item.recurrenceRate >= 30,
  );

  if (recurring) {
    diagnostics.push({
      id: `mistake:${recurring.skillId}`,
      severity:
        recurring.recurrenceRate >= 50
          ? "priority"
          : "watch",
      headline: `${recurring.label} keeps recurring against humans`,
      detail: `It appeared in ${recurring.games} games (${recurring.recurrenceRate}% of analyzed human games) across ${recurring.occurrences} mistakes.`,
      dimension: "form",
      cohortKey: recurring.skillId,
      games: recurring.games,
      confidence: Math.round(
        Math.min(100, recurring.games / 6 * 100),
      ),
    });
  }

  if (form.direction === "declining") {
    diagnostics.push({
      id: "form:declining",
      severity: "watch",
      headline: "Recent human-game form is down",
      detail: `The latest ${form.recentGames} games are ${Math.abs(
        Math.round(form.qualityDelta),
      )} quality points below the prior sample.`,
      dimension: "form",
      games: form.recentGames,
      confidence: Math.round(
        Math.min(
          100,
          Math.min(
            form.recentGames,
            form.previousGames,
          ) / 5 * 100,
        ),
      ),
    });
  } else if (form.direction === "improving") {
    diagnostics.push({
      id: "form:improving",
      severity: "strength",
      headline: "Recent human-game form is improving",
      detail: `The latest ${form.recentGames} games improved by ${Math.round(
        form.qualityDelta,
      )} quality points versus the prior sample.`,
      dimension: "form",
      games: form.recentGames,
      confidence: Math.round(
        Math.min(
          100,
          Math.min(
            form.recentGames,
            form.previousGames,
          ) / 5 * 100,
        ),
      ),
    });
  }

  return diagnostics
    .sort((a, b) => {
      const severity = {
        priority: 3,
        watch: 2,
        strength: 1,
      };
      return (
        severity[b.severity] -
          severity[a.severity] ||
        b.confidence - a.confidence
      );
    })
    .slice(0, 8);
}

export function buildRealGameDiagnostics(
  state: UserState,
): RealGameDiagnostics {
  const games = humanGames(state);
  const baselineQuality = average(
    games.map(
      (game) =>
        game.practicalMetrics?.qualityScore ?? 0,
    ),
  );
  const baselineResultPerformance = average(
    games.map(
      (game) =>
        game.practicalMetrics?.resultScore ?? 0,
    ),
  );
  const baselinePracticalScore = average(
    games.map(practicalScoreForGame),
  );

  const colors = buildCohorts(
    games,
    "color",
    (game) => ({
      key: game.playerColor,
      label: game.playerColor === "w" ? "White" : "Black",
    }),
    baselinePracticalScore,
  );

  const timeControls = buildCohorts(
    games,
    "timeControl",
    (game) => ({
      key: game.timeControlCategory ?? "unknown",
      label:
        game.timeControlCategory === "unknown" ||
        !game.timeControlCategory
          ? "Unknown time control"
          : game.timeControlCategory[0].toUpperCase() +
            game.timeControlCategory.slice(1),
    }),
    baselinePracticalScore,
  );

  const opponents = buildCohorts(
    games,
    "opponent",
    opponentCohortForGame,
    baselinePracticalScore,
  );

  const openings = buildCohorts(
    games,
    "opening",
    (game) => {
      const identity = openingIdentityForGame(game);
      return {
        key: identity.key,
        label: identity.label,
      };
    },
    baselinePracticalScore,
  );

  const positionTypes = buildCohorts(
    games,
    "positionType",
    positionTypeForGame,
    baselinePracticalScore,
  );

  const phases = phaseInsights(games);
  const mistakeFamilies = mistakeFamilyInsights(
    state,
    games,
  );
  const form = recentForm(games);

  return {
    sampleCount: games.length,
    baselineQuality: Math.round(baselineQuality),
    baselineResultPerformance: Math.round(
      baselineResultPerformance,
    ),
    baselinePracticalScore: Math.round(
      baselinePracticalScore,
    ),
    colors,
    timeControls,
    opponents,
    openings,
    positionTypes,
    phases,
    mistakeFamilies,
    recentForm: form,
    diagnostics: buildDiagnostics(
      [
        colors,
        timeControls,
        opponents,
        openings,
        positionTypes,
      ],
      phases,
      mistakeFamilies,
      form,
      baselineQuality,
    ),
  };
}
