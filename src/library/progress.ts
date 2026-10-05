import type { SavedStudy, StudyTraining } from "./types";

export function createStudyTraining(
  skillId: string,
  targetMove: string,
  targetSan: string,
  now = new Date(),
): StudyTraining {
  return {
    enabled: true,
    skillId,
    targetMove,
    targetSan,
    attempts: 0,
    successes: 0,
    streak: 0,
    nextReviewAt: now.toISOString(),
    lastQuality: 0,
  };
}

export function applyStudyAttempt(
  training: StudyTraining,
  success: boolean,
  quality: number,
  now = new Date(),
): StudyTraining {
  const streak = success ? training.streak + 1 : 0;
  const intervalDays = success
    ? streak >= 5
      ? 45
      : streak === 4
        ? 21
        : streak === 3
          ? 7
          : streak === 2
            ? 3
            : 1
    : .2;

  return {
    ...training,
    attempts: training.attempts + 1,
    successes: training.successes + (success ? 1 : 0),
    streak,
    lastAttemptAt: now.toISOString(),
    lastQuality: quality,
    nextReviewAt: new Date(
      now.getTime() + intervalDays * 86_400_000,
    ).toISOString(),
  };
}

export function dueStudyTraining(
  studies: SavedStudy[],
  now = new Date(),
) {
  return studies
    .filter((study) => study.training?.enabled)
    .filter(
      (study) =>
        new Date(study.training!.nextReviewAt).getTime() <= now.getTime(),
    )
    .sort((a, b) => {
      const at = a.training!;
      const bt = b.training!;
      if (at.streak !== bt.streak) return at.streak - bt.streak;
      return (
        new Date(at.nextReviewAt).getTime() -
        new Date(bt.nextReviewAt).getTime()
      );
    });
}
