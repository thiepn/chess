import type { SkillMastery } from "../domain/types";
import type { AiProfile, AiProfileId } from "./types";

export const aiProfiles: Record<Exclude<AiProfileId, "adaptive">, AiProfile> = {
  gentle: {
    id: "gentle",
    name: "Gentle",
    description: "Shallow searches offer chances to practice basics.",
    skillLevel: 0,
    depth: 5,
    accent: "Learning pace",
  },
  developing: {
    id: "developing",
    name: "Developing",
    description: "Punishes missed pieces but leaves chances.",
    skillLevel: 3,
    depth: 7,
    accent: "Forgiving pressure",
  },
  club: {
    id: "club",
    name: "Club",
    description: "Balanced resistance for complete training games.",
    skillLevel: 7,
    depth: 9,
    accent: "Balanced challenge",
  },
  strong: {
    id: "strong",
    name: "Strong",
    description: "Stronger search exposes tactical and positional mistakes.",
    skillLevel: 13,
    depth: 11,
    accent: "Serious resistance",
  },
};

function averageRelevantMastery(mastery: Record<string, SkillMastery>) {
  const relevant = [
    "fundamentals.hanging",
    "fundamentals.blunder-check",
    "tactics.double-attack",
    "tactics.pin",
    "calculation.candidates",
    "calculation.reply",
    "openings.principles",
    "endgames.opposition",
    "defense.threats",
    "conversion.simplify",
  ]
    .map((id) => mastery[id]?.effectiveMastery)
    .filter((value): value is number => typeof value === "number");

  if (!relevant.length) return 35;
  return relevant.reduce((sum, value) => sum + value, 0) / relevant.length;
}

export function adaptiveAiProfile(mastery: Record<string, SkillMastery>): AiProfile {
  const score = averageRelevantMastery(mastery);
  const base = score < 35 ? aiProfiles.gentle
    : score < 55 ? aiProfiles.developing
      : score < 72 ? aiProfiles.club : aiProfiles.strong;
  return {
    ...base,
    id: "adaptive",
    name: "Adaptive",
    description: `Matched to ${base.name.toLowerCase()} practice.`,
    accent: "Matched to your player model",
  };
}

export function resolveAiProfile(
  id: AiProfileId,
  mastery: Record<string, SkillMastery>,
): AiProfile {
  return id === "adaptive" ? adaptiveAiProfile(mastery) : aiProfiles[id];
}
