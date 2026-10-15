import { Chess } from "chess.js";
import type { LessonScript, LessonStep } from "./types";

export const g2TacticalSkillIds = [
  "tactics.skewer",
  "tactics.removing-defender",
  "tactics.deflection",
  "tactics.decoy",
  "tactics.overload",
  "tactics.clearance",
] as const;

export interface G2Reply {
  uci: string;
  explanation: string;
}
export interface G2Case {
  fen: string;
  acceptedMoves: string[];
  prompt: string;
  success: string;
  misconception: string;
  successByMove: Record<string, string>;
  hints: string[];
  replies: G2Reply[];
  wrongMoveFeedback: Record<string, string>;
}
export interface G2Entry {
  skillId: string;
  cases: G2Case[];
}

const allowed: ReadonlySet<string> = new Set(g2TacticalSkillIds);
let cached: Promise<ReadonlyMap<string, G2Entry>> | undefined;

function applyUci(chess: Chess, uci: string) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
  try {
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4) || "q",
    });
    return move && move.from + move.to + (move.promotion ?? "") === uci ? move : null;
  } catch {
    return null;
  }
}

/**
 * Authored source validity only: legal moves and differentiated legal replies.
 * No move is asserted to be the unique engine-best continuation.
 */
export function validateG2TacticalTransfer(raw: unknown): ReadonlyMap<string, G2Entry> {
  if (!raw || typeof raw !== "object") throw Error("Missing original tactical source");
  const source = raw as { schema?: unknown; version?: unknown; items?: unknown };
  if (source.schema !== "thiepn.chess.g2-tactical-transfer.v1" ||
      source.version !== 1 || !Array.isArray(source.items) ||
      source.items.length !== g2TacticalSkillIds.length)
    throw Error("Unexpected tactical source identity");
  const result = new Map<string, G2Entry>();
  const seenBoards = new Set<string>();
  for (const row of source.items) {
    if (!row || typeof row !== "object") throw Error("Malformed tactical source entry");
    const entry = row as G2Entry;
    if (typeof entry.skillId !== "string" || !allowed.has(entry.skillId) ||
        result.has(entry.skillId) || !Array.isArray(entry.cases) ||
        entry.cases.length !== 3)
      throw Error("Invalid original tactical skill or depth");
    for (const item of entry.cases) {
      if (!item || typeof item.fen !== "string" || seenBoards.has(item.fen) ||
          ![item.prompt, item.success, item.misconception].every(text =>
            typeof text === "string" && text.trim().length >= 45) ||
          !Array.isArray(item.acceptedMoves) || item.acceptedMoves.length !== 1 ||
          !item.successByMove || typeof item.successByMove !== "object" ||
          Object.keys(item.successByMove).length !== 1 ||
          !Array.isArray(item.hints) || item.hints.length !== 3 ||
          item.hints.some(hint => typeof hint !== "string" || hint.trim().length < 25) ||
          !Array.isArray(item.replies) || item.replies.length !== 2 ||
          !item.wrongMoveFeedback || typeof item.wrongMoveFeedback !== "object" ||
          Object.keys(item.wrongMoveFeedback).length !== 1)
        throw Error("Invalid original tactical position");
      const answer = item.acceptedMoves[0];
      if (typeof item.successByMove[answer] !== "string" ||
          item.successByMove[answer].trim().length < 45)
        throw Error("Missing position-specific success reason");
      const first = new Chess(item.fen);
      // All original G2 tactics are White to move. Conditional follow-ups
      // must be genuine Black replies, never a flipped-side demonstration.
      if (first.turn() !== "w" || first.isCheck() || !applyUci(first, answer))
        throw Error("Original tactical first move is invalid");
      // Check and clearance must demonstrate the relevant king-first line;
      // these are authored conditions, not engine/tablebase conclusions.
      if ((entry.skillId === "tactics.skewer" ||
           entry.skillId === "tactics.clearance") && !first.isCheck())
        throw Error("Tactical checking line not demonstrated");
      const seenReplies = new Set<string>();
      for (const reply of item.replies) {
        if (!reply || typeof reply.uci !== "string" ||
            seenReplies.has(reply.uci) ||
            typeof reply.explanation !== "string" ||
            reply.explanation.trim().length < 55 ||
            !applyUci(new Chess(first.fen()), reply.uci))
          throw Error("Invalid differentiated opponent reply");
        seenReplies.add(reply.uci);
      }
      for (const [wrong, feedback] of Object.entries(item.wrongMoveFeedback)) {
        if (wrong === answer || typeof feedback !== "string" ||
            feedback.trim().length < 55 ||
            !applyUci(new Chess(item.fen), wrong))
          throw Error("Invalid source-specific wrong-move feedback");
      }
      seenBoards.add(item.fen);
    }
    result.set(entry.skillId, entry);
  }
  if (result.size !== g2TacticalSkillIds.length) throw Error("Incomplete tactical source");
  return result;
}

export function withG2TacticalTransfer(lesson: LessonScript, entry: G2Entry): LessonScript {
  if (lesson.skillId !== entry.skillId || !allowed.has(entry.skillId) ||
      lesson.steps.filter(step => step.id === "transfer").length !== 1)
    throw Error("Original P88 transfer anchor missing or mismatched");
  const originalBoards = new Set(lesson.steps.map(step => step.fen));
  if (entry.cases.some(item => originalBoards.has(item.fen)) ||
      new Set(entry.cases.map(item => item.fen)).size !== entry.cases.length)
    throw Error("G2 reused an original transfer board");
  const additions: LessonStep[] = entry.cases.flatMap((item, i) => {
    const promptStep: LessonStep = {
      id: `g2-tactical-${i + 1}`,
      type: "move", stage: "transfer", support: "transfer",
      eyebrow: "UNFAMILIAR TACTICAL POSITION",
      title: `Apply the motif · ${i + 1} of ${entry.cases.length}`,
      prompt: item.prompt,
      fen: item.fen,
      acceptedMoves: item.acceptedMoves,
      successTitle: "Tactical idea identified",
      successBody: item.success,
      successByMove: item.successByMove,
      wrongMoveFeedback: item.wrongMoveFeedback,
      misconceptionFeedback: item.misconception,
      hints: item.hints.map(text => ({ text })),
    };
    const chess = new Chess(item.fen);
    if (!applyUci(chess, item.acceptedMoves[0]))
      throw Error("Invalid original G2 main line");
    const afterMain = chess.fen();
    const replySteps: LessonStep[] = item.replies.map((reply, j) => {
      const branch = new Chess(afterMain);
      const played = applyUci(branch, reply.uci);
      if (!played) throw Error("Invalid original G2 reply line");
      return {
        id: `g2-tactical-${i + 1}-reply-${j + 1}`,
        type: "explain", stage: "example",
        eyebrow: `CONDITIONAL OPPONENT REPLY ${j + 1} OF ${item.replies.length}`,
        title: `If Black responds ${played.san}`,
        fen: branch.fen(),
        body: reply.explanation,
      };
    });
    return [promptStep, ...replySteps];
  });
  // Keep historical P88 step keys and the original Review/mastery writer;
  // no source ID migration, parallel practice engine or recorded opponent game.
  return { ...lesson, steps: lesson.steps.flatMap(step =>
    step.id === "transfer" ? [step, ...additions] : [step]) };
}

export function loadG2TacticalTransfer(): Promise<ReadonlyMap<string, G2Entry>> {
  return cached ??= fetch(`${import.meta.env.BASE_URL}data/learning/g2-tactical-transfer-v1.json`)
    .then(response => {
      if (!response.ok) throw Error("Original tactical transfer is unavailable");
      return response.json();
    })
    .then(validateG2TacticalTransfer)
    .catch(error => { cached = undefined; throw error; });
}
