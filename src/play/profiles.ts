import type { SkillMastery } from "../domain/types";
import type { AiProfile, AiProfileId } from "./types";

export const aiProfiles: Record<Exclude<AiProfileId, "adaptive">, AiProfile> = {
  gentle: {
    id: "gentle",
    name: "Gentle",
    description: "Forgiving practice.",
    skillLevel: 0,
    depth: 5,
    accent: "Gentle pace",
  },
  developing: {
    id: "developing",
    name: "Developing",
    description: "Sees basic mistakes.",
    skillLevel: 3,
    depth: 7,
    accent: "Moderate pressure",
  },
  club: {
    id: "club",
    name: "Club",
    description: "Balanced practice.",
    skillLevel: 7,
    depth: 9,
    accent: "Balanced play",
  },
  strong: {
    id: "strong",
    name: "Strong",
    description: "Tactical challenge.",
    skillLevel: 13,
    depth: 11,
    accent: "Strong play",
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
    description: `Based on ${base.name.toLowerCase()} level.`,
    accent: "Adaptive training",
  };
}

export function resolveAiProfile(
  id: AiProfileId,
  mastery: Record<string, SkillMastery>,
): AiProfile {
  return id === "adaptive" ? adaptiveAiProfile(mastery) : aiProfiles[id];
}
