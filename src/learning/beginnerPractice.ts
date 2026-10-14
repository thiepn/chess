import { Chess } from "chess.js";
import type { LessonScript, LessonStep } from "./types";

export interface BeginnerPosition {
  fen: string;
  acceptedMoves: string[];
  prompt: string;
  success: string;
  misconception: string;
  successByMove: Record<string, string>;
  hints: string[];
  wrongMoveFeedback?: Record<string, string>;
}
export interface BeginnerPracticeEntry {
  skillId: string;
  exercises: BeginnerPosition[];
}
export const beginnerSkillIds = [
  "rules.board", "rules.pieces", "rules.capture", "rules.check",
  "rules.check-responses", "rules.mate", "rules.castling", "rules.promotion",
  "rules.draws", "fundamentals.values", "fundamentals.attacked",
  "fundamentals.defended", "fundamentals.hanging", "fundamentals.trades",
  "fundamentals.blunder-check", "defense.threats",
] as const;
const skillSet: ReadonlySet<string> = new Set(beginnerSkillIds);
const requiredPositionsPerSkill = 8;
let cached: Promise<ReadonlyMap<string, BeginnerPracticeEntry>> | undefined;

function legalMove(fen: string, uci: string) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
  try {
    const chess = new Chess(fen);
    const beforeCheck = chess.isCheck();
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4),
      promotion: uci.slice(4) || "q" });
    if (!move || move.from + move.to + (move.promotion ?? "") !== uci) return null;
    return { chess, move, beforeCheck };
  } catch { return null; }
}

/** Source validation, not an engine claim that every other legal move is inferior. */
export function validateBeginnerPractice(raw: unknown): ReadonlyMap<string, BeginnerPracticeEntry> {
  if (!raw || typeof raw !== "object") throw Error("Invalid beginner source");
  const data = raw as { schema?: unknown; version?: unknown; items?: unknown };
  if (data.schema !== "thiepn.chess.beginner-practice.v1" ||
      data.version !== 2 || !Array.isArray(data.items) ||
      data.items.length !== beginnerSkillIds.length) throw Error("Missing beginner source");
  const result = new Map<string, BeginnerPracticeEntry>();
  const seenFens = new Set<string>();
  for (const record of data.items) {
    if (!record || typeof record !== "object") throw Error("Malformed beginner record");
    const row = record as BeginnerPracticeEntry;
    if (typeof row.skillId !== "string" || !skillSet.has(row.skillId) ||
        result.has(row.skillId) || !Array.isArray(row.exercises) ||
        row.exercises.length !== requiredPositionsPerSkill)
      throw Error("Invalid beginner skill record");
    for (const item of row.exercises) {
      if (!item || typeof item.fen !== "string" || seenFens.has(item.fen) ||
          ![item.prompt, item.success, item.misconception].every(text =>
            typeof text === "string" && text.trim().length >= 45) ||
          !Array.isArray(item.acceptedMoves) || item.acceptedMoves.length !== 1 ||
          !item.successByMove || typeof item.successByMove !== "object" ||
          Object.keys(item.successByMove).length !== item.acceptedMoves.length ||
          !Array.isArray(item.hints) || item.hints.length !== 3 ||
          item.hints.some(hint => typeof hint !== "string" || hint.trim().length < 20))
        throw Error("Invalid beginner practice position");
      const uci = item.acceptedMoves[0];
      const checked = legalMove(item.fen, uci);
      if (!checked || typeof item.successByMove[uci] !== "string" ||
          item.successByMove[uci].trim().length < 45)
        throw Error("Unverified original beginner move");
      const { chess, move, beforeCheck } = checked;
      if ((row.skillId === "rules.mate" && !chess.isCheckmate()) ||
          (row.skillId === "rules.check" && !chess.isCheck()) ||
          (row.skillId === "rules.check-responses" && (!beforeCheck || chess.isCheck())) ||
          (row.skillId === "rules.draws" && !chess.isInsufficientMaterial()) ||
          (row.skillId === "rules.castling" && move.san !== "O-O" && move.san !== "O-O-O") ||
          (row.skillId === "rules.promotion" && move.promotion !== "q"))
        throw Error("Beginner exercise goal not demonstrated by source");
      if (item.wrongMoveFeedback && (typeof item.wrongMoveFeedback !== "object" ||
          Object.entries(item.wrongMoveFeedback).some(([wrong, feedback]) =>
            wrong === uci || !legalMove(item.fen, wrong) ||
            typeof feedback !== "string" || feedback.trim().length < 45)))
        throw Error("Unverified position-specific mistake feedback");
      seenFens.add(item.fen);
    }
    result.set(row.skillId, row);
  }
  if (result.size !== beginnerSkillIds.length) throw Error("Incomplete beginner practice");
  return result;
}

export function withBeginnerPractice(lesson: LessonScript, entry: BeginnerPracticeEntry): LessonScript {
  if (entry.skillId !== lesson.skillId) throw Error("Different beginner skill");
  const steps: LessonStep[] = entry.exercises.map((item, i) => ({
    id: `g1-practice-${i + 1}`,
    stage: "transfer",
    type: "move",
    // Preserve G1's historic fourth transfer and add a second transfer
    // at the eighth case. Never downgrade previously recorded transfer work.
    support: i === 3 || i === entry.exercises.length - 1 ? "transfer" : "retrieval",
    eyebrow: i === 3 ? "ORIGINAL TRANSFER CHECK" :
      i === entry.exercises.length - 1 ? "ADDITIONAL NEW TRANSFER" : "INDEPENDENT PRACTICE",
    title: `Recognize and apply · ${i + 1} of ${entry.exercises.length}`,
    prompt: item.prompt,
    fen: item.fen,
    acceptedMoves: item.acceptedMoves,
    successTitle: "Position completed",
    successBody: item.success,
    successByMove: item.successByMove,
    misconceptionFeedback: item.misconception,
    wrongMoveFeedback: item.wrongMoveFeedback,
    hints: item.hints.map(text => ({ text })),
  }));
  const after = lesson.steps.some(step => step.id === "transfer-depth") ? "transfer-depth" : "transfer";
  return { ...lesson, steps: lesson.steps.flatMap(step => step.id === after ? [step, ...steps] : [step]) };
}

export function loadBeginnerPractice(): Promise<ReadonlyMap<string, BeginnerPracticeEntry>> {
  return cached ??= fetch(`${import.meta.env.BASE_URL}data/learning/g1-beginner-practice-v1.json`)
    .then(response => { if (!response.ok) throw Error("Original beginner practice unavailable"); return response.json(); })
    .then(validateBeginnerPractice)
    .catch(error => { cached = undefined; throw error; });
}
