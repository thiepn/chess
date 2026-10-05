import { emptyMastery } from "../domain/mastery";
import type { SkillMastery, UserState } from "../domain/types";

function mastery(
  skillId: string,
  value: number,
  confidence = 55,
  attempts = 12,
): SkillMastery {
  const base = emptyMastery(skillId);
  return {
    ...base,
    understanding: Math.min(100, value + 8),
    recognition: Math.min(100, value + 4),
    execution: value,
    mixedRecognition: Math.max(0, value - 3),
    delayedRetention: Math.max(0, value - 6),
    trainingTransfer: Math.max(0, value - 8),
    realGameRecognition: Math.max(0, value - 18),
    realGameExecution: Math.max(0, value - 20),
    effectiveMastery: value,
    confidence,
    attempts,
    successes: Math.round(attempts * value / 100),
    realGameAttempts: Math.max(0, Math.round(attempts / 4)),
    lastSeenAt: new Date(Date.now() - 86_400_000).toISOString(),
    lastSuccessAt: new Date(Date.now() - 86_400_000).toISOString(),
    nextReviewAt: new Date(Date.now() - 3_600_000).toISOString(),
    stabilityDays: 4,
  };
}

export const initialUserState: UserState = {
  mastery: {
    "rules.board": mastery("rules.board", 92, 88, 28),
    "rules.pieces": mastery("rules.pieces", 90, 86, 30),
    "rules.check": mastery("rules.check", 84, 80, 22),
    "rules.mate": mastery("rules.mate", 74, 66, 16),
    "fundamentals.values": mastery("fundamentals.values", 81, 70, 19),
    "fundamentals.attacked": mastery("fundamentals.attacked", 66, 58, 17),
    "fundamentals.hanging": mastery("fundamentals.hanging", 54, 76, 24),
    "openings.principles": mastery("openings.principles", 62, 52, 13),
    "tactics.double-attack": mastery("tactics.double-attack", 67, 56, 15),
    "tactics.knight-fork": mastery("tactics.knight-fork", 71, 61, 17),
    "tactics.pin": mastery("tactics.pin", 48, 43, 10),
    "endgames.queen-mate": mastery("endgames.queen-mate", 76, 60, 11),
    "endgames.opposition": mastery("endgames.opposition", 36, 36, 8),
  },
  weaknesses: [
    {
      skillId: "fundamentals.hanging",
      severity: "critical",
      frequency: .82,
      recency: .96,
      gameImpact: .9,
      recurrence: .88,
      confidence: .86,
    },
    {
      skillId: "tactics.pin",
      severity: "normal",
      frequency: .52,
      recency: .65,
      gameImpact: .55,
      recurrence: .48,
      confidence: .65,
    },
  ],
  recentDomainMinutes: {
    tactics: 42,
    fundamentals: 18,
    openings: 14,
    endgames: 6,
  },
};
