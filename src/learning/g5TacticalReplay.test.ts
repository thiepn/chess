import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import tacticsSource from "../../public/data/learning/g2-tactical-transfer-v1.json";
import historicalSource from "../../public/data/learning/transfer-v1.json";
import { assembleVerifiedLesson } from "./assembleVerifiedLesson";
import { g2ReplyComparison } from "./g2ReplyComparison";
import { g2TacticalSkillIds, validateG2TacticalTransfer } from "./g2TacticalTransfer";
import { g4DefenseStudy } from "./g4DefenseStudy";
import { g5ReplayIndex, g5TacticalReplay } from "./g5TacticalReplay";
import { lessonForSkill } from "./lessons";
import { validateTransferCatalog } from "./transferCompletion";

describe("G5 — original tactical first move and opponent response replay", () => {
  const tactics = validateG2TacticalTransfer(tacticsSource);
  const historical = validateTransferCatalog(historicalSource);

  it("replays all 36 authored legal two-ply branches with exactly three original-derived frames", () => {
    let checked = 0;
    for (const skillId of g2TacticalSkillIds) {
      const entry = tactics.get(skillId)!;
      const original = lessonForSkill(skillId, "Original", "Original");
      const lesson = assembleVerifiedLesson(original, {
        transfer: historical.get(skillId), tactical: entry,
      });
      for (let caseNo = 1; caseNo <= 3; caseNo++) {
        for (let replyNo = 1; replyNo <= 2; replyNo++) {
          const replyId = `g2-tactical-${caseNo}-reply-${replyNo}`;
          const comparison = g2ReplyComparison(lesson, replyId)!;
          const source = entry.cases[caseNo - 1];
          const line = g5TacticalReplay(entry, comparison, replyId);
          expect(line, replyId).not.toBeNull();
          if (!line) continue;

          const [setup, tacticalMove, response] = line.frames;
          expect(line.sourceStepId).toBe(`g2-tactical-${caseNo}`);
          expect(line.replyStepId).toBe(replyId);
          expect(line.frames.map(frame => frame.id)).toEqual(["setup", "tactic", "reply"]);
          expect(setup.fen).toBe(source.fen);
          expect(setup.arrows).toEqual([]);
          expect(setup.explanation).toBe(source.prompt);
          expect(tacticalMove.explanation).toBe(source.successByMove[source.acceptedMoves[0]]);
          expect(response.explanation).toBe(source.replies[replyNo - 1].explanation);
          expect(response.fen).toBe(comparison.options[replyNo].step.fen);
          expect(tacticalMove.fen).not.toBe(setup.fen);
          expect(response.fen).not.toBe(tacticalMove.fen);

          // Independently replay the original UCI strings with the same
          // pinned chess.js used by the app. No invented third continuation.
          const board = new Chess(source.fen);
          const first = source.acceptedMoves[0];
          const moved = board.move({ from: first.slice(0, 2), to: first.slice(2, 4) });
          expect(tacticalMove.label).toBe(`White: ${moved.san}`);
          expect(tacticalMove.fen).toBe(board.fen());
          expect(tacticalMove.arrows[0]).toMatchObject({ from: moved.from, to: moved.to });
          const reply = source.replies[replyNo - 1].uci;
          const defended = board.move({ from: reply.slice(0, 2), to: reply.slice(2, 4) });
          expect(response.label).toBe(`Black: ${defended.san}`);
          expect(response.fen).toBe(board.fen());
          expect(response.arrows[0]).toMatchObject({ from: defended.from, to: defended.to });
          checked++;
        }
      }
    }
    expect(checked).toBe(36);
  });

  it("does not build replay for mismatched, unverified or forged lesson content", () => {
    const skillId = g2TacticalSkillIds[0];
    const entry = tactics.get(skillId)!;
    const lesson = assembleVerifiedLesson(lessonForSkill(skillId, "Original", "Original"), {
      transfer: historical.get(skillId), tactical: entry,
    });
    const group = g2ReplyComparison(lesson, "g2-tactical-1-reply-1")!;
    expect(g5TacticalReplay(entry, group, "g2-tactical-1-reply-1")).not.toBeNull();
    expect(g5TacticalReplay(entry, group, "g2-tactical-2-reply-1")).toBeNull();
    expect(g5TacticalReplay(entry, group, "g2-tactical-1-reply-3")).toBeNull();
    expect(g5TacticalReplay({ ...entry, cases: [] }, group, group.options[1].id)).toBeNull();
    expect(g5TacticalReplay(entry, {
      ...group,
      options: group.options.map((option, i) => i === 1
        ? { ...option, step: { ...option.step, fen: group.options[0].step.fen } } : option),
    }, group.options[1].id)).toBeNull();
  });

  it("does not offer unrevealed G4 defenses to the replay interface", () => {
    const skillId = g2TacticalSkillIds[0];
    const entry = tactics.get(skillId)!;
    const lesson = assembleVerifiedLesson(lessonForSkill(skillId, "Original", "Original"), {
      transfer: historical.get(skillId), tactical: entry,
    });
    const group = g2ReplyComparison(lesson, "g2-tactical-1-reply-1")!;
    const chosen = group.options[1].id;
    const hidden = g4DefenseStudy(group, chosen, []);
    expect(hidden.isRevealed).toBe(false);
    expect(hidden.frame.id).toBe(group.options[0].id);
    const visible = g4DefenseStudy(group, chosen, [chosen]);
    expect(visible.isRevealed).toBe(true);
    expect(g5TacticalReplay(entry, group, chosen)?.frames).toHaveLength(3);
  });

  it("bounds learner replay navigation to the authored two plies", () => {
    expect(g5ReplayIndex(0, -1)).toBe(0);
    expect(g5ReplayIndex(0, 1)).toBe(1);
    expect(g5ReplayIndex(1, 1)).toBe(2);
    expect(g5ReplayIndex(2, 1)).toBe(2);
    expect(g5ReplayIndex(2, -1)).toBe(1);
    expect(g5ReplayIndex(1, -1)).toBe(0);
  });
});
