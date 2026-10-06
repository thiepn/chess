import type { UserState } from "../domain/types";
import type { ImportedGame } from "../games/types";
import {
  opponentCohortForGame,
  positionTypeForGame,
  practicalScoreForGame,
} from "../analytics/cohorts";
import { openingIdentityForGame } from "../openings/match";
import type {
  CoachEffectivenessInsight,
  PrescriptionOutcomeEvaluation,
  PrescriptionTarget,
  PrescriptionTrackingRecord,
  TrainingPrescription,
} from "./types";

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function humanGamesAfter(
  state: UserState,
  after?: string,
) {
  return [...(state.games ?? [])]
    .filter(
      (game) =>
        game.source === "lichess" &&
        Boolean(game.analyzedAt) &&
        Boolean(game.practicalMetrics) &&
        (!after ||
          new Date(game.importedAt).getTime() >
            new Date(after).getTime()),
    )
    .sort((a, b) =>
      a.importedAt.localeCompare(b.importedAt),
    );
}

function matchesTarget(
  game: ImportedGame,
  target: PrescriptionTarget,
) {
  if (target.dimension === "color") {
    return game.playerColor === target.key;
  }

  if (target.dimension === "timeControl") {
    return (
      (game.timeControlCategory ?? "unknown") ===
      target.key
    );
  }

  if (target.dimension === "opponent") {
    return (
      opponentCohortForGame(game).key ===
      target.key
    );
  }

  if (target.dimension === "opening") {
    return (
      openingIdentityForGame(game).key ===
      target.key
    );
  }

  if (target.dimension === "positionType") {
    return (
      positionTypeForGame(game).key ===
      target.key
    );
  }

  return true;
}

function scoreForTarget(
  state: UserState,
  target: PrescriptionTarget,
  after?: string,
) {
  const games = humanGamesAfter(state, after);

  if (target.dimension === "phase") {
    const phaseScores = games
      .map((game) =>
        game.reviewStory?.phases.find(
          (phase) => phase.phase === target.key,
        ),
      )
      .filter(Boolean)
      .map((phase) => phase!.quality);

    return {
      games: phaseScores.length,
      score: average(phaseScores),
    };
  }

  if (target.dimension === "mistake") {
    const humanIds = new Set(
      games.map((game) => game.id),
    );
    const affectedGameIds = new Set(
      (state.mistakes ?? [])
        .filter(
          (mistake) =>
            humanIds.has(mistake.gameId) &&
            mistake.skillIds.includes(target.key),
        )
        .map((mistake) => mistake.gameId),
    );

    const recurrenceRate = games.length
      ? affectedGameIds.size / games.length * 100
      : 0;

    return {
      games: games.length,
      score: 100 - recurrenceRate,
    };
  }

  if (target.dimension === "form") {
    return {
      games: games.length,
      score: average(
        games.map(
          (game) =>
            game.practicalMetrics?.qualityScore ?? 0,
        ),
      ),
    };
  }

  const matched = games.filter((game) =>
    matchesTarget(game, target),
  );

  return {
    games: matched.length,
    score: average(
      matched.map(practicalScoreForGame),
    ),
  };
}

export function evaluatePrescriptionRecord(
  state: UserState,
  record: PrescriptionTrackingRecord,
  now = new Date(),
): PrescriptionOutcomeEvaluation {
  if (!record.lastCompletedAt || record.completions < 1) {
    return {
      status: "untested",
      postGames: 0,
      confidence: 0,
      evaluatedAt: now.toISOString(),
    };
  }

  const post = scoreForTarget(
    state,
    record.target,
    record.lastCompletedAt,
  );

  if (post.games < 3) {
    return {
      status: "collecting",
      postGames: post.games,
      postScore:
        post.games > 0
          ? Math.round(post.score * 10) / 10
          : undefined,
      delta:
        post.games > 0
          ? Math.round(
              (post.score - record.baseline.score) * 10,
            ) / 10
          : undefined,
      confidence: Math.round(
        Math.min(100, post.games / 6 * 100),
      ),
      evaluatedAt: now.toISOString(),
    };
  }

  const delta =
    post.score - record.baseline.score;
  const status: PrescriptionOutcomeEvaluation["status"] =
    delta >= 8
      ? "improved"
      : delta <= -6
        ? "worsened"
        : "unchanged";

  return {
    status,
    postGames: post.games,
    postScore: Math.round(post.score * 10) / 10,
    delta: Math.round(delta * 10) / 10,
    confidence: Math.round(
      Math.min(100, post.games / 6 * 100),
    ),
    evaluatedAt: now.toISOString(),
  };
}

function newTrackingRecord(
  prescription: TrainingPrescription,
  now: Date,
): PrescriptionTrackingRecord {
  const issuedAt = now.toISOString();

  return {
    id: `${prescription.id}:${issuedAt}`,
    prescriptionId: prescription.id,
    kind: prescription.kind,
    title: prescription.title,
    target: prescription.target,
    issuedAt,
    baseline: {
      ...prescription.baseline,
      capturedAt: issuedAt,
    },
    starts: 0,
    completions: 0,
    completedActionIds: [],
    trainingSuccesses: 0,
    trainingQualityTotal: 0,
  };
}

export function syncPrescriptionHistory(
  state: UserState,
  prescriptions: TrainingPrescription[],
  now = new Date(),
) {
  const history = [...(state.prescriptionHistory ?? [])];
  const activeIds = new Set(
    prescriptions.map((item) => item.id),
  );
  let changed = false;

  for (const prescription of prescriptions) {
    const open = history.find(
      (record) =>
        record.prescriptionId === prescription.id &&
        !record.retiredAt,
    );
    if (open) continue;

    history.push(newTrackingRecord(prescription, now));
    changed = true;
  }

  for (let index = 0; index < history.length; index += 1) {
    const record = history[index];
    if (
      record.retiredAt ||
      activeIds.has(record.prescriptionId)
    ) {
      continue;
    }

    const evaluation = evaluatePrescriptionRecord(
      state,
      record,
      now,
    );
    history[index] = {
      ...record,
      retiredAt: now.toISOString(),
      retirementReason:
        evaluation.status === "improved"
          ? "improved"
          : "resolved",
    };
    changed = true;
  }

  return changed ? history : state.prescriptionHistory ?? [];
}

export function markPrescriptionStarted(
  history: PrescriptionTrackingRecord[] | undefined,
  prescription: TrainingPrescription,
  actionId: string,
  now = new Date(),
) {
  const records = [...(history ?? [])];
  let index = records.findIndex(
    (record) =>
      record.prescriptionId === prescription.id &&
      !record.retiredAt,
  );

  if (index < 0) {
    records.push(newTrackingRecord(prescription, now));
    index = records.length - 1;
  }

  const current = records[index];
  records[index] = {
    ...current,
    starts: current.starts + 1,
    lastStartedAt: now.toISOString(),
  };

  return records;
}

export function markPrescriptionCompleted(
  history: PrescriptionTrackingRecord[] | undefined,
  prescriptionId: string,
  actionId: string,
  success: boolean,
  quality: number,
  now = new Date(),
) {
  const records = [...(history ?? [])];
  const index = [...records]
    .map((record, recordIndex) => ({
      record,
      recordIndex,
    }))
    .reverse()
    .find(
      ({ record }) =>
        record.prescriptionId === prescriptionId &&
        !record.retiredAt,
    )?.recordIndex;

  if (index === undefined) return records;

  const current = records[index];
  const alreadyCounted =
    current.completedActionIds.includes(actionId);

  records[index] = {
    ...current,
    completions:
      current.completions +
      (alreadyCounted ? 0 : 1),
    lastCompletedAt: now.toISOString(),
    completedActionIds: alreadyCounted
      ? current.completedActionIds
      : [...current.completedActionIds, actionId],
    trainingSuccesses:
      current.trainingSuccesses +
      (!alreadyCounted && success ? 1 : 0),
    trainingQualityTotal:
      current.trainingQualityTotal +
      (!alreadyCounted ? quality : 0),
  };

  return records;
}

export function buildCoachEffectiveness(
  state: UserState,
  now = new Date(),
): CoachEffectivenessInsight {
  const records = [...(state.prescriptionHistory ?? [])];
  const rows = records
    .map((record) => {
      const outcome = evaluatePrescriptionRecord(
        state,
        record,
        now,
      );
      const trainingSuccessRate = record.completions
        ? Math.round(
            record.trainingSuccesses /
              record.completions *
              100,
          )
        : undefined;

      return {
        recordId: record.id,
        prescriptionId: record.prescriptionId,
        kind: record.kind,
        title: record.title,
        targetLabel: record.target.label,
        status: outcome.status,
        baselineScore: record.baseline.score,
        postScore: outcome.postScore,
        delta: outcome.delta,
        postGames: outcome.postGames,
        confidence: outcome.confidence,
        completions: record.completions,
        trainingSuccessRate,
        issuedAt: record.issuedAt,
        completedAt: record.lastCompletedAt,
      };
    })
    .sort((a, b) =>
      b.issuedAt.localeCompare(a.issuedAt),
    );

  const evaluated = rows.filter(
    (row) =>
      row.status === "improved" ||
      row.status === "unchanged" ||
      row.status === "worsened",
  );
  const improved = evaluated.filter(
    (row) => row.status === "improved",
  ).length;
  const unchanged = evaluated.filter(
    (row) => row.status === "unchanged",
  ).length;
  const worsened = evaluated.filter(
    (row) => row.status === "worsened",
  ).length;
  const deltas = evaluated
    .map((row) => row.delta)
    .filter(
      (value): value is number =>
        typeof value === "number",
    );

  const byKind = [...new Set(
    evaluated.map((row) => row.kind),
  )].map((kind) => {
    const matching = evaluated.filter(
      (row) => row.kind === kind,
    );
    const kindDeltas = matching
      .map((row) => row.delta)
      .filter(
        (value): value is number =>
          typeof value === "number",
      );

    return {
      kind,
      evaluated: matching.length,
      improved: matching.filter(
        (row) => row.status === "improved",
      ).length,
      averageDelta: kindDeltas.length
        ? Math.round(average(kindDeltas) * 10) / 10
        : 0,
    };
  });

  return {
    issued: records.length,
    started: records.filter(
      (record) => record.starts > 0,
    ).length,
    completed: records.filter(
      (record) => record.completions > 0,
    ).length,
    evaluated: evaluated.length,
    improved,
    unchanged,
    worsened,
    validationRate: evaluated.length
      ? Math.round(improved / evaluated.length * 100)
      : 0,
    averageDelta: deltas.length
      ? Math.round(average(deltas) * 10) / 10
      : 0,
    byKind,
    history: rows.slice(0, 20),
  };
}
