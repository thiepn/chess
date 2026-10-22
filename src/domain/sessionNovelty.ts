import type { SessionMode } from "./types";

/**
 * The percentage ceiling works for a long session but can exclude every
 * authored 8–10 minute introductory lesson from a 10/25 minute session.
 * Admit one complete short-session lesson without exceeding its budget.
 * Deep sessions retain their original 28% novelty allocation.
 */
export function sessionNoveltyAllowance(mode: SessionMode, budgetMinutes: number): number {
  const proportional = budgetMinutes * .28;
  return mode === "deep"
    ? proportional
    : Math.max(proportional, Math.min(10, budgetMinutes));
}
