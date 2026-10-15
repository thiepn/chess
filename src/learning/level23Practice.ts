import { Chess } from "chess.js";
import { openingNodes } from "../openings/repertoire";
import { loadPuzzlesForSkill } from "../puzzles/repository";
import type { PuzzleRecord } from "../puzzles/types";
import type { LessonScript, LessonStep } from "./types";

export const level23SkillIds = [
  "openings.principles",
  "openings.development",
  "openings.center",
  "openings.king-safety",
  "openings.queen-timing",
  "openings.tempo",
  "strategy.piece-activity",
  "strategy.worst-piece",
  "tactics.double-attack",
  "tactics.knight-fork",
  "tactics.pin",
  "tactics.skewer",
  "tactics.discovered",
  "tactics.removing-defender",
  "tactics.deflection",
  "tactics.decoy",
  "tactics.back-rank",
  "tactics.overload",
  "tactics.clearance"
] as const;
const level23Set: ReadonlySet<string> = new Set(level23SkillIds);
export function isLevel23Skill(skillId: string): boolean { return level23Set.has(skillId); }

export interface Level23Plan {
  skillId: string; kind: "repertoire" | "puzzle"; sourceIds: string[];
  goal: string; misconception: string; hint: string;
}
export interface Level23Catalog {
  schema: string; version: number; authority: string; items: Level23Plan[];
}
let pending: Promise<ReadonlyMap<string, Level23Plan>> | undefined;
const expectedPracticeCount = 6;

export function validateLevel23Catalog(raw: unknown): ReadonlyMap<string, Level23Plan> {
  if (!raw || typeof raw !== "object") throw Error("Level 2–3 practice source is missing");
  const catalog = raw as Level23Catalog;
  if (catalog.schema !== "thiepn.chess.level23-practice.v1" ||
      catalog.version !== 1 || !Array.isArray(catalog.items) ||
      catalog.items.length !== level23SkillIds.length) throw Error("Incompatible level practice catalogue");
  const result = new Map<string, Level23Plan>();
  for (const row of catalog.items) {
    if (!row || !level23Set.has(row.skillId) || result.has(row.skillId) ||
        (row.kind !== (row.skillId.startsWith("tactics.") ? "puzzle" : "repertoire")) ||
        ![row.goal,row.misconception,row.hint].every(s => typeof s === "string" && s.trim().length >= 55) ||
        !Array.isArray(row.sourceIds) || (row.kind === "repertoire" && row.sourceIds.length < 8) ||
        new Set(row.sourceIds).size !== row.sourceIds.length) throw Error("Invalid level practice entry");
    if (row.kind === "repertoire" && row.sourceIds.some(id => !openingNodes[id]?.moveFromParent ||
        !openingNodes[id].parentId)) throw Error("Unknown original repertoire position");
    result.set(row.skillId,row);
  }
  return result;
}

function readCatalog(): Promise<ReadonlyMap<string, Level23Plan>> {
  return pending ??= fetch(`${import.meta.env.BASE_URL}data/learning/l23-practice-v1.json`)
    .then(response => { if (!response.ok) throw Error("Level 2–3 practice asset unavailable"); return response.json(); })
    .then(validateLevel23Catalog)
    .catch(error => { pending = undefined; throw error; });
}

function playUci(board: Chess, uci: string) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
  try {
    const move = board.move({
      from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci.slice(4) || "q",
    });
    return move && move.from + move.to + (move.promotion ?? "") === uci ? move : null;
  } catch { return null; }
}

interface PracticeSource {
  id: string; fen: string; move: string; prompt: string;
  success: string; misconception: string; hints: string[];
}

function repertoireSources(plan: Level23Plan, excluded: Set<string>): PracticeSource[] {
  const used = new Set(excluded);
  const cases: PracticeSource[] = [];
  for (const id of plan.sourceIds) {
    const node = openingNodes[id];
    const parent = node?.parentId ? openingNodes[node.parentId] : undefined;
    if (!node?.moveFromParent || !parent?.fen || used.has(parent.fen) || !node.purpose) continue;
    const board = new Chess(parent.fen);
    const move = playUci(board, node.moveFromParent);
    if (!move || board.fen() !== node.fen) continue; // exact historical repertoire authority
    used.add(parent.fen);
    const reason = node.purpose.trim();
    const mistake = node.commonMistakes?.[0] ?? plan.misconception;
    cases.push({
      id: node.id, fen: parent.fen, move: node.moveFromParent,
      prompt: `${plan.goal} Position: ${node.name}. Consider the opponent's reply before moving.`,
      success: `${move.san}: ${reason} ${node.plans?.[0] ? "Next plan: " + node.plans[0] + "." : ""} The original repertoire move is illustrative; another legal move is not automatically losing.`,
      misconception: `Watch for this actual source-specific pitfall: ${mistake}. ${plan.misconception} A different legal move may also be playable.`,
      hints: [plan.hint, `Original repertoire context: ${node.name}. ${reason}`,
        `Inspect the move from ${node.moveFromParent.slice(0,2)} to ${node.moveFromParent.slice(2,4)}.`],
    });
    if (cases.length === expectedPracticeCount) break;
  }
  return cases;
}

function puzzleSource(puzzle: PuzzleRecord, plan: Level23Plan, excluded: Set<string>): PracticeSource | null {
  if (puzzle.source !== "lichess" || !puzzle.skillIds.includes(plan.skillId) ||
      !Array.isArray(puzzle.solutionMoves) || puzzle.solutionMoves.length < 2 ||
      !Number.isFinite(puzzle.rating) || puzzle.rating < 600 || puzzle.rating > 1800) return null;
  try {
    const board = new Chess(puzzle.initialFen);
    const trigger = playUci(board,puzzle.solutionMoves[0]);
    if (!trigger) return null;
    const fen = board.fen();
    if (excluded.has(fen)) return null;
    const answer = playUci(board,puzzle.solutionMoves[1]);
    if (!answer) return null;
    const defender = puzzle.solutionMoves[2] ? playUci(board,puzzle.solutionMoves[2]) : null;
    if (puzzle.solutionMoves.length >= 3 && !defender) return null;
    const continuation = puzzle.solutionMoves[3] ? playUci(board,puzzle.solutionMoves[3]) : null;
    if (puzzle.solutionMoves.length >= 4 && !continuation) return null;
    return {
      id: puzzle.id, fen, move: puzzle.solutionMoves[1],
      prompt: `After the opponent's ${trigger.san}, ${plan.goal} Verify checks, captures and the opponent's strongest practical resource.`,
      success: `Lichess source continuation: ${answer.san}${defender ? " " + defender.san : ""}${continuation ? " " + continuation.san : ""}. ${defender ? "The recorded defender reply is " + defender.san + "; reassess the attack after it." : "Check that no defensive escape invalidates your idea."} The recorded line is not proof that every other legal move is inferior.`,
      misconception: `${plan.misconception} The actual source line starts ${answer.san}${defender ? " " + defender.san : ""}; alternative legal moves have not been judged universally wrong.`,
      hints: [plan.hint, `Start from the exact board after ${trigger.san}; list checks, captures and threats before selecting a move.`,
        `Test the move from ${puzzle.solutionMoves[1].slice(0,2)} to ${puzzle.solutionMoves[1].slice(2,4)}.`],
    };
  } catch { return null; }
}

function puzzleSources(plan: Level23Plan, puzzles: PuzzleRecord[], excluded: Set<string>): PracticeSource[] {
  // Spread difficulty while retaining source-only motif qualifications. Never promote seed fallbacks.
  const targets = [725,825,925,1025,1125,1225];
  const chosen: PracticeSource[] = [];
  const usedIds = new Set<string>();
  const usedFens = new Set(excluded);
  for (const target of targets) {
    const sorted = [...puzzles].filter(p => !usedIds.has(p.id))
      .sort((a,b) => Math.abs(a.rating-target)-Math.abs(b.rating-target) || a.id.localeCompare(b.id));
    let candidate: {p:PuzzleRecord;item:PracticeSource} | undefined;
    for (const p of sorted) {
      const item = puzzleSource(p,plan,usedFens);
      if (item) { candidate = {p,item}; break; }
    }
    if (!candidate?.item) break;
    usedIds.add(candidate.p.id);
    usedFens.add(candidate.item.fen);
    chosen.push(candidate.item);
  }
  return chosen;
}

/** Appends original-source situations to the same LessonRunner and mastery writer. */
export function withLevel23Practice(lesson: LessonScript, plan: Level23Plan, puzzles: PuzzleRecord[] = []): LessonScript {
  if (plan.skillId !== lesson.skillId) throw Error("Level practice belongs to another skill");
  const anchor = lesson.steps.some(step => step.id === "transfer-depth") ? "transfer-depth" : "transfer";
  if (lesson.steps.filter(step => step.id === anchor).length !== 1)
    throw Error("Missing or duplicated native lesson transfer anchor");
  const priorBoards = new Set(lesson.steps.map(step => step.fen));
  const cases = plan.kind === "repertoire"
    ? repertoireSources(plan,priorBoards) : puzzleSources(plan,puzzles,priorBoards);
  if (cases.length !== expectedPracticeCount ||
      new Set(cases.map(item=>item.fen)).size !== expectedPracticeCount ||
      cases.some(item=>priorBoards.has(item.fen))) throw Error("Insufficient independent source positions for Level 2–3");
  const steps: LessonStep[] = cases.map((item,i) => ({
    id: `l23-practice-${i+1}`, type:"move", stage:"transfer",
    support: i === 2 || i === expectedPracticeCount-1 ? "transfer" : "retrieval",
    eyebrow: i === 2 || i === expectedPracticeCount-1 ? "UNFAMILIAR-BOARD TRANSFER" : "INDEPENDENT POSITION",
    title: `Position ${i+1}/${expectedPracticeCount} · ${item.id}`,
    prompt:item.prompt, fen:item.fen, acceptedMoves:[item.move],
    successTitle:"Source position completed", successBody:item.success,
    successByMove:{[item.move]:item.success}, misconceptionFeedback:item.misconception,
    // Original lesson board already offers position-specific off-task correction.
    // A legal but non-source alternative does not prove objectively losing chess.
    hints:item.hints.map(text=>({text})),
  }));
  return {...lesson,steps:lesson.steps.flatMap(step=>step.id===anchor?[step,...steps]:[step])};
}

export async function prepareLevel23Practice(lesson: LessonScript): Promise<LessonScript> {
  const plan = (await readCatalog()).get(lesson.skillId);
  if (!plan) throw Error("Skill has no original Level 2–3 practice");
  const puzzles = plan.kind === "puzzle" ? await loadPuzzlesForSkill(plan.skillId) : [];
  return withLevel23Practice(lesson,plan,puzzles);
}
