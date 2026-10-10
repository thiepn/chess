import type { SkillMastery } from "../domain/types";
import type { AiProfile, AiProfileId } from "./types";

export const aiProfiles: Record<Exclude<AiProfileId, "adaptive">, AiProfile> = {
  gentle: {
    id: "gentle",
    name: "Gentle",
    description: "Forgiving play for beginners.",
    skillLevel: 0,
    depth: 5,
    accent: "Learning pace",
  },
  developing: {
    id: "developing",
    name: "Developing",
    description: "Notices simple mistakes.",
    skillLevel: 3,
    depth: 7,
    accent: "Forgiving pressure",
  },
  club: {
    id: "club",
    name: "Club",
    description: "Balanced training games.",
    skillLevel: 7,
    depth: 9,
    accent: "Balanced challenge",
  },
  strong: {
    id: "strong",
    name: "Strong",
    description: "Challenges tactics and strategy.",
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
    description: `Based on ${base.name.toLowerCase()} practice.`,
    accent: "Based on your practice progress",
  };
}

export function resolveAiProfile(
  id: AiProfileId,
  mastery: Record<string, SkillMastery>,
): AiProfile {
  return id === "adaptive" ? adaptiveAiProfile(mastery) : aiProfiles[id];
}
