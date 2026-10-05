import type { SkillMastery } from "../domain/types";
import type { AiProfile, AiProfileId } from "./types";

export const aiProfiles: Record<Exclude<AiProfileId, "adaptive">, AiProfile> = {
  gentle: {
    id: "gentle",
    name: "Gentle",
    description: "Leaves tactical chances and plays shallowly enough for newer learners.",
    skillLevel: 0,
    depth: 5,
    accent: "Learning pace",
  },
  developing: {
    id: "developing",
    name: "Developing",
    description: "Punishes obvious mistakes but still allows recoverable positions.",
    skillLevel: 3,
    depth: 7,
    accent: "Forgiving pressure",
  },
  club: {
    id: "club",
    name: "Club",
    description: "A steady practical opponent for normal training games.",
    skillLevel: 7,
    depth: 9,
    accent: "Balanced challenge",
  },
  strong: {
    id: "strong",
    name: "Strong",
    description: "Accurate enough to expose strategic and calculation weaknesses.",
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

export function adaptiveAiProfile(
  mastery: Record<string, SkillMastery>,
): AiProfile {
  const score = averageRelevantMastery(mastery);

  if (score < 35) {
    return {
      ...aiProfiles.gentle,
      id: "adaptive",
      name: "Adaptive",
      description: "Currently matched to a gentle training level.",
      accent: "Matched to your player model",
    };
  }

  if (score < 55) {
    return {
      ...aiProfiles.developing,
      id: "adaptive",
      name: "Adaptive",
      description: "Currently matched to a developing training level.",
      accent: "Matched to your player model",
    };
  }

  if (score < 72) {
    return {
      ...aiProfiles.club,
      id: "adaptive",
      name: "Adaptive",
      description: "Currently matched to a club-style training level.",
      accent: "Matched to your player model",
    };
  }

  return {
    ...aiProfiles.strong,
    id: "adaptive",
    name: "Adaptive",
    description: "Currently matched to strong practical resistance.",
    accent: "Matched to your player model",
  };
}

export function resolveAiProfile(
  id: AiProfileId,
  mastery: Record<string, SkillMastery>,
): AiProfile {
  return id === "adaptive" ? adaptiveAiProfile(mastery) : aiProfiles[id];
}
