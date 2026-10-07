import type { ChessSkill } from "../domain/types";

export type LearnSection = "course" | "openings" | "model-games";

export interface LearnRouteState {
  section: LearnSection;
  skillId?: string;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function resolveLearnRoute(path: string): LearnRouteState {
  const normalized = path.replace(/\/$/, "") || "/learn";

  if (normalized === "/learn/openings") {
    return { section: "openings" };
  }

  if (normalized === "/learn/model-games") {
    return { section: "model-games" };
  }

  const parts = normalized.split("/").filter(Boolean);
  if (parts[0] === "learn" && parts.length >= 3) {
    return {
      section: "course",
      skillId: safeDecode(parts.slice(2).join("/")),
    };
  }

  return { section: "course" };
}

export function learnSkillPath(
  skill: Pick<ChessSkill, "id" | "domain">,
) {
  return `/learn/${skill.domain}/${encodeURIComponent(skill.id)}`;
}
