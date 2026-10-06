import type { UserWeakness } from "../domain/types";
import type { PersonalMistake } from "./types";

const severityValue: Record<PersonalMistake["severity"], number> = {
  blunder: 1,
  mistake: .72,
  inaccuracy: .45,
};

function sourceWeight(mistake: PersonalMistake) {
  if (mistake.gameSource === "lichess") return 1;
  if (mistake.gameSource === "training") return .68;
  if (mistake.gameSource === "manual") return .88;
  return .82;
}

export function weaknessesFromMistakes(
  mistakes: PersonalMistake[],
  now = new Date(),
): UserWeakness[] {
  const grouped = new Map<string, PersonalMistake[]>();

  for (const mistake of mistakes) {
    for (const skillId of mistake.skillIds) {
      grouped.set(skillId, [...(grouped.get(skillId) ?? []), mistake]);
    }
  }

  return [...grouped.entries()]
    .map(([skillId, items]) => {
      const count = items.length;
      const gameImpact =
        items.reduce(
          (sum, item) =>
            sum +
            severityValue[item.severity] * sourceWeight(item),
          0,
        ) / count;
      const newest = Math.max(
        ...items.map((item) => new Date(item.createdAt).getTime()),
      );
      const ageDays = Math.max(0, (now.getTime() - newest) / 86_400_000);
      const recency = Math.exp(-ageDays / 21);
      const maxSeverity = Math.max(
        ...items.map(
          (item) =>
            severityValue[item.severity] * sourceWeight(item),
        ),
      );

      return {
        skillId,
        severity:
          maxSeverity >= .95
            ? "critical"
            : maxSeverity >= .7
              ? "high"
              : count >= 2
                ? "normal"
                : "low",
        frequency: Math.min(1, count / 3),
        recency,
        gameImpact,
        recurrence: Math.min(1, count / 2),
        confidence: Math.min(.96, .58 + count * .1),
      } satisfies UserWeakness;
    })
    .sort(
      (a, b) =>
        b.gameImpact * b.frequency * b.recency -
        a.gameImpact * a.frequency * a.recency,
    );
}
