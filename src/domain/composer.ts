import { readyCurriculumSkills, skillById } from "./curriculum";
import { retentionProbability, weaknessPriority } from "./mastery";
import { mistakePriority } from "../games/classify";
import { dueOpeningNodes } from "../openings/progress";
import { openingNodes, repertoires } from "../openings/repertoire";
import { dueStudyTraining } from "../library/progress";
import { assessmentRemediationSkillIds } from "../assessment/engine";
import type {
  CandidateSource,
  ChessSkill,
  SessionMode,
  TrainingActivity,
  TrainingCandidate,
  TrainingMode,
  TrainingSession,
  UserState,
} from "./types";

export const sessionMinutes: Record<SessionMode, number> = {
  quick: 10,
  standard: 25,
  deep: 60,
};

const durations: Partial<Record<TrainingMode, number>> = {
  microReview: 2,
  conceptLesson: 6,
  guidedDemo: 4,
  themedPuzzle: 4,
  mixedPuzzle: 5,
  personalMistake: 5,
  calculation: 8,
  openingRecall: 4,
  openingPosition: 7,
  endgameDrill: 7,
  conversionChallenge: 10,
  defenseChallenge: 10,
  engineGame: 15,
  gameReview: 7,
  boardVision: 4,
  savedStudy: 5,
};

function activityTypeFor(skill: ChessSkill, source: CandidateSource): TrainingMode {
  if (source === "review") {
    if (skill.trainingModes.includes("mixedPuzzle")) return "mixedPuzzle";
    if (skill.trainingModes.includes("themedPuzzle")) return "themedPuzzle";
    return "microReview";
  }
  if (source === "weakness" && skill.trainingModes.includes("mixedPuzzle")) return "mixedPuzzle";
  if (source === "game") return "personalMistake";
  if (source === "repertoire") return "openingRecall";
  if (source === "library") return "savedStudy";
  if (source === "assessment") {
    if (skill.trainingModes.includes("mixedPuzzle")) return "mixedPuzzle";
    if (skill.trainingModes.includes("themedPuzzle")) return "themedPuzzle";
    return skill.trainingModes[0] ?? "conceptLesson";
  }
  if (source === "calibration" && skill.trainingModes.includes("mixedPuzzle")) return "mixedPuzzle";
  return skill.trainingModes[0] ?? "conceptLesson";
}

function candidate(
  skill: ChessSkill,
  source: CandidateSource,
  urgency: number,
  priority: number,
  reason: string,
): TrainingCandidate {
  const activityType = activityTypeFor(skill, source);
  return {
    id: `${source}:${skill.id}`,
    source,
    skillIds: [skill.id],
    activityType,
    estimatedMinutes: durations[activityType] ?? 5,
    priority,
    difficulty: skill.difficulty,
    novelty: source === "curriculum" ? 1 : .15,
    urgency,
    reason,
  };
}

export function buildCandidatePool(
  state: UserState,
  now = new Date(),
): TrainingCandidate[] {
  const result: TrainingCandidate[] = [];

  for (const mastery of Object.values(state.mastery)) {
    const skill = skillById[mastery.skillId];
    if (!skill) continue;

    const retention = retentionProbability(mastery, now);
    const isDue = !mastery.nextReviewAt || new Date(mastery.nextReviewAt) <= now;
    if (isDue && mastery.attempts > 0) {
      const urgency = Math.max(.25, 1 - retention);
      result.push(candidate(skill, "review", urgency, skill.importance * urgency, "Review due"));
    }

    if (mastery.confidence < 35 && mastery.attempts > 1) {
      result.push(candidate(skill, "calibration", .35, skill.importance * .45, "Mastery estimate needs calibration"));
    }
  }

  for (const weakness of state.weaknesses) {
    const skill = skillById[weakness.skillId];
    if (!skill) continue;
    const priority = weaknessPriority(weakness, skill, state.mastery[skill.id]);
    result.push(
      candidate(
        skill,
        "weakness",
        weakness.severity === "critical" ? 1 : .72,
        priority * 2.2,
        weakness.severity === "critical" ? "Critical recurring weakness" : "Recent game weakness",
      ),
    );
  }

  for (const mistake of (state.mistakes ?? [])
    .filter((item) => new Date(item.nextReviewAt) <= now)
    .sort((a, b) => mistakePriority(b, now) - mistakePriority(a, now))
    .slice(0, 5)) {
    const skill = mistake.skillIds
      .map((skillId) => skillById[skillId])
      .find(Boolean);
    if (!skill) continue;

    const item = candidate(
      skill,
      "game",
      mistake.severity === "blunder" ? 1 : mistake.severity === "mistake" ? .8 : .58,
      mistakePriority(mistake, now) * 1.8,
      `From move ${mistake.moveNumber}: your own game`,
    );
    item.mistakeId = mistake.id;
    result.push(item);
  }

  const openingSkill = skillById["openings.principles"];
  if (openingSkill) {
    const progress = state.openingProgress ?? {};
    const deviations = state.openingDeviations ?? [];

    for (const repertoire of repertoires) {
      const due = dueOpeningNodes(repertoire, progress, now);
      const deviation = deviations.find(
        (item) =>
          !item.resolved &&
          item.repertoireId === repertoire.id &&
          repertoire.nodeIds.includes(item.nodeId),
      );
      const deviationNode = deviation ? openingNodes[deviation.nodeId] : undefined;
      const node =
        deviationNode?.preferredChildId &&
        deviationNode.sideToMove === repertoire.color
          ? deviationNode
          : due[0];

      if (!node) continue;

      const item = candidate(
        openingSkill,
        "repertoire",
        deviation ? .9 : .48,
        deviation ? .9 : .48,
        deviation ? "Opening deviation from your game" : `${repertoire.versus}: repertoire recall`,
      );
      item.id = `repertoire:${repertoire.id}:${node.id}`;
      item.openingNodeId = node.id;
      item.repertoireId = repertoire.id;
      result.push(item);
    }
  }

  for (const study of dueStudyTraining(state.savedStudies ?? [], now).slice(0, 5)) {
    const training = study.training;
    if (!training) continue;
    const skill = skillById[training.skillId];
    if (!skill) continue;

    const urgency =
      training.attempts === 0
        ? .62
        : Math.min(1, .5 + Math.max(0, 2 - training.streak) * .18);

    const item = candidate(
      skill,
      "library",
      urgency,
      skill.importance * urgency * 1.25,
      "Saved from your analysis workspace",
    );
    item.id = `library:${study.id}`;
    item.studyId = study.id;
    result.push(item);
  }

  for (const skillId of assessmentRemediationSkillIds(state)) {
    const skill = skillById[skillId];
    if (!skill) continue;
    const current = state.mastery[skill.id]?.effectiveMastery ?? 0;
    result.push(
      candidate(
        skill,
        "assessment",
        .88,
        skill.importance * (1 - current / 120) * 1.7,
        "Checkpoint remediation",
      ),
    );
  }

  for (const skill of readyCurriculumSkills(state.mastery).slice(0, 8)) {
    const current = state.mastery[skill.id]?.effectiveMastery ?? 0;
    const priority = skill.curriculumPriority * (1 - current / 100);
    result.push(candidate(skill, "curriculum", .42, priority, current ? "Continue curriculum" : "New concept"));
  }

  if (state.focus) {
    for (const skill of Object.values(skillById).filter((item) => item.domain === state.focus?.domain)) {
      const current = state.mastery[skill.id]?.effectiveMastery ?? 0;
      result.push(candidate(skill, "focus", .55, skill.importance * (1 - current / 120) * 1.35, "Current focus"));
    }
  }

  return result;
}

function scoreCandidate(item: TrainingCandidate, state: UserState): number {
  const skill = skillById[item.skillIds[0]];
  if (!skill) return -1;

  const recentMinutes = state.recentDomainMinutes[skill.domain] ?? 0;
  const fatiguePenalty = Math.min(.42, recentMinutes / 180);
  const focusModifier = state.focus?.domain === skill.domain ? 1.3 : 1;
  const transferValue =
    item.source === "game" || item.source === "weakness"
      ? 1.22
      : item.source === "library"
        ? 1.12
        : 1;
  const repetitionPenalty = recentMinutes > 60 ? .82 : 1;

  return (
    (item.priority * .55 + item.urgency * .45) *
    focusModifier *
    transferValue *
    repetitionPenalty *
    (1 - fatiguePenalty)
  );
}

function toActivity(item: TrainingCandidate, state: UserState): TrainingActivity {
  const skill = skillById[item.skillIds[0]];
  const repertoire = item.repertoireId
    ? repertoires.find((entry) => entry.id === item.repertoireId)
    : undefined;

  const study = item.studyId
    ? (state.savedStudies ?? []).find((entry) => entry.id === item.studyId)
    : undefined;

  return {
    ...item,
    title:
      study?.title ??
      repertoire?.name ??
      skill?.title ??
      "Training",
    subtitle: item.reason,
  };
}

export function composeSession(
  state: UserState,
  mode: SessionMode,
  now = new Date(),
): TrainingSession {
  const budget = sessionMinutes[mode];
  const pool = buildCandidatePool(state, now)
    .map((item) => ({ item, score: scoreCandidate(item, state) }))
    .sort((a, b) => b.score - a.score);

  const selected: TrainingCandidate[] = [];
  const usedSkills = new Set<string>();
  const domainCount = new Map<string, number>();
  let usedMinutes = 0;
  let noveltyMinutes = 0;
  const noveltyCap = budget * .28;

  const mandatory = [
    ...pool.filter(
      ({ item }) => item.source === "assessment" && item.urgency >= .85,
    ).slice(0, 1),
    ...pool.filter(
      ({ item }) => item.source === "game" && item.urgency >= .95,
    ).slice(0, 1),
    ...pool.filter(
      ({ item }) => item.source === "weakness" && item.urgency >= .95,
    ).slice(0, 1),
  ];

  for (const { item } of mandatory) {
    if (
      item.estimatedMinutes <= budget - usedMinutes &&
      !usedSkills.has(item.skillIds[0])
    ) {
      selected.push(item);
      usedSkills.add(item.skillIds[0]);
      usedMinutes += item.estimatedMinutes;
      const domain = skillById[item.skillIds[0]]?.domain;
      if (domain) domainCount.set(domain, (domainCount.get(domain) ?? 0) + 1);
    }
  }

  for (const { item } of pool) {
    const skillId = item.skillIds[0];
    const domain = skillById[skillId]?.domain;
    if (!domain || usedSkills.has(skillId)) continue;
    if (usedMinutes + item.estimatedMinutes > budget + 1) continue;
    if (item.novelty > .8 && noveltyMinutes + item.estimatedMinutes > noveltyCap) continue;

    const count = domainCount.get(domain) ?? 0;
    if (count >= (mode === "deep" ? 2 : 1)) continue;

    selected.push(item);
    usedSkills.add(skillId);
    domainCount.set(domain, count + 1);
    usedMinutes += item.estimatedMinutes;
    if (item.novelty > .8) noveltyMinutes += item.estimatedMinutes;

    if (usedMinutes >= budget * .86) break;
  }

  const ordered = [...selected].sort((a, b) => {
    const order: Record<CandidateSource, number> = {
      review: 0,
      weakness: 1,
      game: 2,
      assessment: 3,
      curriculum: 4,
      calibration: 5,
      repertoire: 6,
      library: 7,
      focus: 8,
    };
    return order[a.source] - order[b.source];
  });

  return {
    id: `${mode}-${now.toISOString().slice(0, 10)}`,
    generatedAt: now.toISOString(),
    plannedMinutes: usedMinutes || budget,
    mode,
    focus: state.focus?.domain,
    activities: ordered.map((item) => toActivity(item, state)),
  };
}
