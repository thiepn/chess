import type { CalculationPosition } from "./types";
import { level456FocusedQuestions } from "../learning/level456Inquiry";
import { level78Guide } from "../learning/level78Pathways";
export interface StudyQuestion { prompt: string; answer: string; repair: string; }
export interface StudyMaterial { theme: string; questions: StudyQuestion[]; reflection?: string; }
export function studyMaterialFor(position: CalculationPosition, focusSkillId?: string): StudyMaterial | null {
  const source = position as unknown as Record<string, unknown>;
  const focused=level456FocusedQuestions(position,focusSkillId);
  const advanced=position.source==="authored" && focusSkillId ? level78Guide(focusSkillId) : null;
  // Advanced self-explanation reuses the native, private, ungraded study panel.
  // Authored reference lines remain examples rather than unique-best certificates.
  if(advanced && position.explanation?.trim()){
    const support=position.defensiveStudy?.defenderIdea?.trim() ||
      position.replyReason?.trim() || position.explanation;
    const misconception=position.defensiveStudy?.misconception?.trim() ||
      position.defensiveStudy?.reflection?.trim() || position.explanation;
    const caveat=" Legally authored illustrative line; other legal moves have not been proved inferior.";
    focused.push(
      {prompt:advanced.prompts[0],answer:position.explanation+caveat,
        repair:"Specify a real board feature or source-pinned continuation rather than repeating a general maxim."},
      {prompt:advanced.prompts[1],answer:support+caveat,
        repair:position.defensiveStudy?.misconception??"Check the recorded opponent resource before accepting the candidate."},
      {prompt:advanced.prompts[2],answer:misconception+caveat,
        repair:"Describe the exact limitation or correction in the original position."},
    );
  }
  let original:StudyMaterial|null=null;
  const groups = ["endgameDecisionStudy", "openingTransitionStudy", "prophylaxisStudy", "strategicImbalanceStudy", "pawnStructureStudy", "pieceCoordinationStudy", "kingAttackStudy", "defensiveTechniqueStudy"];
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
    if (questions.length) { original={ theme: String(group.theme ?? position.title), questions:questions.slice(0,6), reflection:position.defensiveStudy?.reflection }; break; }
  }
  const defensive = position.defensiveStudy;
  const material=original ?? (defensive?.keyQuestion && defensive.defenderIdea ? {
    theme: position.title, questions: [{ prompt: defensive.keyQuestion, answer: defensive.defenderIdea, repair: defensive.misconception }], reflection: defensive.reflection,
  } : null);
  if (!focused.length) return material;
  return {
    theme: material?.theme ?? position.title,
    questions: [...focused,...(material?.questions ?? [])].slice(0,6),
    reflection: material?.reflection,
  };
}
