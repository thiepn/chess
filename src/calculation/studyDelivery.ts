import type { CalculationPosition } from "./types";
export interface StudyQuestion { prompt: string; answer: string; repair: string; }
export interface StudyMaterial { theme: string; questions: StudyQuestion[]; reflection?: string; }
export function studyMaterialFor(position: CalculationPosition): StudyMaterial | null {
  const source = position as unknown as Record<string, unknown>;
  const groups = ["prophylaxisStudy", "strategicImbalanceStudy", "pawnStructureStudy", "pieceCoordinationStudy", "kingAttackStudy", "defensiveTechniqueStudy"];
  for (const name of groups) {
    const group = source[name] as Record<string, unknown> | undefined;
    if (!group || typeof group !== "object") continue;
    const raw = group.exercises ?? group.independentExercises ?? group.practice;
    if (!Array.isArray(raw)) continue;
    const questions: StudyQuestion[] = raw.flatMap((entry: unknown) => {
      if (!entry || typeof entry !== "object") return [];
      const e = entry as Record<string, unknown>;
      const prompt = typeof (e.prompt ?? e.question) === "string" ? String(e.prompt ?? e.question).trim() : "";
      const answer = typeof (e.answer ?? e.model) === "string" ? String(e.answer ?? e.model).trim() : "";
      const repair = typeof (e.repair ?? e.correction ?? e.feedback) === "string" ? String(e.repair ?? e.correction ?? e.feedback) : "";
      return prompt && answer ? [{ prompt, answer, repair }] : [];
    });
    if (questions.length) return { theme: String(group.theme ?? position.title), questions: questions.slice(0, 6), reflection: position.defensiveStudy?.reflection };
  }
  const defensive = position.defensiveStudy;
  return defensive?.keyQuestion && defensive.defenderIdea ? {
    theme: position.title, questions: [{ prompt: defensive.keyQuestion, answer: defensive.defenderIdea, repair: defensive.misconception }], reflection: defensive.reflection,
  } : null;
}
