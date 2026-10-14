import type { MasterDraft } from "./masterGames";
import type { TransferCaseStudy } from "./crossGameTransfer";
import { replayCounterfactual } from "./counterfactualBranches";

const fields = ["plan", "defense", "transfer", "branchNoteA", "branchNoteB", "branchPlanA", "branchPlanB"] as const;
const lines = ["branchA", "branchB", "branchAltA", "branchAltB"] as const;
const identity = (study: TransferCaseStudy) => [study.first, study.second].map((side) =>
  [side.game.game.id, side.game.game.checkpoints.find((entry) =>
    entry.ply === side.game.fens.indexOf(side.fen))?.id, side.game.fens.indexOf(side.fen)]);
export function exportPairNotes(study: TransferCaseStudy, draft: MasterDraft) {
  const notes: Record<string, unknown> = {
    revealed: draft.revealed, mark: draft.mark,
  };
  for (const key of fields) notes[key] = (draft[key] ?? "").slice(0, 1200);
  for (const key of lines) notes[key] = (draft[key] ?? []).slice(0, 6);
  return JSON.stringify({
    kind: "chess-p117-pair", version: 1, id: study.source.id,
    anchors: identity(study), savedAt: Date.now(), notes,
  }, null, 2);
}
/** Manual owner-approved portability, not Account sync. Never accept unverified SAN or source drift. */
export function importPairNotes(text: string, study: TransferCaseStudy): MasterDraft {
  if (text.length > 16000) throw new Error("The pasted study note is too long.");
  const payload = JSON.parse(text) as {
    kind?: string; version?: number; id?: string; anchors?: unknown;
    savedAt?: number; notes?: Record<string, unknown>;
  };
  const now = Date.now();
  if (!payload || payload.kind !== "chess-p117-pair" || payload.version !== 1 ||
    payload.id !== study.source.id ||
    JSON.stringify(payload.anchors) !== JSON.stringify(identity(study)) ||
    typeof payload.savedAt !== "number" || payload.savedAt > now + 60000 ||
    now - payload.savedAt > 30 * 86400000 ||
    !payload.notes || typeof payload.notes !== "object") {
    throw new Error("Different source, expired note, or unsupported format.");
  }
  const values: Record<string, string> = {};
  for (const key of fields) {
    const item = payload.notes[key] ?? (key === "branchPlanA" || key === "branchPlanB" ? "" : undefined);
    if (typeof item !== "string" || item.length > 1200) throw new Error("Invalid writing field.");
    values[key] = item;
  }
  const moveLines: Record<string, string[]> = {};
  for (const [index, key] of lines.entries()) {
    const source = index % 2 === 0 ? study.first : study.second;
    const value = payload.notes[key];
    if (!Array.isArray(value) || value.length > 6 ||
      value.some((entry) => typeof entry !== "string" || entry.length > 12) ||
      replayCounterfactual(source.fen, value).invalid) {
      throw new Error("A saved candidate line is not legal in this exact source position.");
    }
    moveLines[key] = value;
  }
  const mark = payload.notes.mark;
  if (mark !== null && mark !== "understood" && mark !== "retry") throw new Error("Invalid self-check.");
  if (typeof payload.notes.revealed !== "boolean") throw new Error("Invalid reveal state.");
  return {
    ...values, ...moveLines, revealed: payload.notes.revealed,
    mark,
  } as MasterDraft;
}
