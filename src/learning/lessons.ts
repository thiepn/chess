import { Chess, type Square } from "chess.js";
import type { TrainingMode } from "../domain/types";
import type { LessonScript } from "./types";

interface LessonSeed {
  title: string;
  summary: string;
  body: string;
  fen: string;
  move: string;
  prompt: string;
  hint: string;
  success?: string;
}

interface LessonTransferSeed {
  fen: string;
  acceptedMoves: string[];
  prompt: string;
  success: string;
  hints: string[];
}
interface LessonCorpus {
  version: number;
  seeds: Record<string, LessonSeed>;
  transferSeeds: Record<string, LessonTransferSeed>;
}
const LESSON_ASSET = `${import.meta.env.BASE_URL}data/lessons/p116-lesson-content-v1.json`;
// Keep the original fully-authored corpus available to isolated Vitest source
// checks without forcing Node to fetch a relative HTTP URL.
const lessonPayload: unknown = import.meta.env.MODE === "test"
  ? (await import("../../public/data/lessons/p116-lesson-content-v1.json")).default
  : await fetch(LESSON_ASSET).then((response) => {
      if (!response.ok) throw new Error("Authored lesson content is unavailable.");
      return response.json() as Promise<unknown>;
    });
if (!lessonPayload || typeof lessonPayload !== "object" ||
    (lessonPayload as LessonCorpus).version !== 1 ||
    !(lessonPayload as LessonCorpus).seeds ||
    !(lessonPayload as LessonCorpus).transferSeeds) {
  throw new Error("Authored lesson source is incomplete or outdated.");
}
const { seeds, transferSeeds } = lessonPayload as LessonCorpus;

export const deepTransferSkillIds = Object.freeze(
  Object.keys(transferSeeds),
);

function moveSquares(move: string) {
  return {
    from: move.slice(0, 2) as Square,
    to: move.slice(2, 4) as Square,
  };
}

function moveHints(
  seed: LessonSeed,
  move: string,
  conceptual = seed.summary,
) {
  const { from, to } = moveSquares(move);
  return [
    {
      text: conceptual,
    },
    {
      text: seed.hint,
      highlights: [{ square: from, tone: "hint" as const }],
    },
    {
      text: `The move starts on ${from} and finishes on ${to}.`,
      highlights: [
        { square: from, tone: "hint" as const },
        { square: to, tone: "good" as const },
      ],
      arrows: [
        {
          from,
          to,
          tone: "hint" as const,
        },
      ],
    },
  ];
}

function transferHints(
  transfer: LessonTransferSeed,
) {
  const move = transfer.acceptedMoves[0];
  const { from, to } = moveSquares(move);
  return [
    {
      text:
        transfer.hints[0] ??
        "Name the concept before calculating moves.",
    },
    {
      text:
        transfer.hints[1] ??
        "Compare the strongest candidate with the opponent's best reply.",
      highlights: [{ square: from, tone: "hint" as const }],
    },
    {
      text:
        transfer.hints[2] ??
        `Consider the move from ${from} to ${to}.`,
      highlights: [
        { square: from, tone: "hint" as const },
        { square: to, tone: "good" as const },
      ],
      arrows: [
        {
          from,
          to,
          tone: "hint" as const,
        },
      ],
    },
  ];
}

function misconceptionOptions(seed: LessonSeed) {
  return [
    {
      id: "principle",
      text: seed.summary,
      feedback:
        "Correct. That is the reusable idea; the board move is only one example of it.",
    },
    {
      id: "automatic",
      text:
        "Once you recognize the pattern, the same move should be played automatically in every similar position.",
      feedback:
        "Pattern recognition starts the search, but legality, tactics and the opponent's best reply still decide whether the move works.",
    },
    {
      id: "hope",
      text:
        "If the idea looks attractive, you can ignore the opponent's strongest response and calculate only your own plan.",
      feedback:
        "That is hope, not chess calculation. A concept is useful only when it survives the opponent's best response.",
    },
  ];
}

// Retrieval must not simply repeat the same three options shown during contrast.
function retrievalOptions(seed: LessonSeed) {
  return [
    {
      id: "principle",
      text: seed.summary + " Verify legality and the opponent's best reply first.",
      feedback: "Correct. You must recognize when the principle applies, not copy the model move.",
    },
    {
      id: "automatic",
      text: "Remember the exact squares from the example, then copy that move whenever the board looks similar.",
      feedback: "A recalled coordinate is not an explanation. The pieces and opponent's threats can change.",
    },
    {
      id: "hope",
      text: "Once you remember a useful principle, the opponent's strongest response no longer matters.",
      feedback: "A principle guides candidate generation, but a concrete reply can refute the move.",
    },
  ];
}

function makeScript(
  skillId: string,
  seed: LessonSeed,
): LessonScript {
  const { from, to } = moveSquares(seed.move);
  const transfer =
    transferSeeds[skillId] ?? {
      fen: seed.fen,
      acceptedMoves: [seed.move],
      prompt:
        `Solve the position again without the demonstration. ${seed.prompt}`,
      success:
        seed.success ?? seed.summary,
      hints: [
        "Name the concept and the opponent's strongest reply before touching a piece.",
        seed.hint,
        `The key move runs from ${from} to ${to}.`,
      ],
    };

  return {
    id: `lesson-${skillId}`,
    skillId,
    title: seed.title,
    summary: seed.summary,
    steps: [
      {
        id: "model",
        type: "explain",
        stage: "model",
        eyebrow: "MODEL",
        title: seed.title,
        body: seed.body,
        fen: seed.fen,
        highlights: [
          { square: from, tone: "focus" },
          { square: to, tone: "good" },
        ],
      },
      {
        id: "worked-example",
        type: "explain",
        stage: "example",
        eyebrow: "WORKED EXAMPLE",
        title: "See the idea before you have to find it.",
        body:
          `${seed.prompt} The reusable lesson is: ${seed.summary} First understand why the move works; memorizing the coordinates is not the goal.`,
        fen: seed.fen,
        highlights: [
          { square: from, tone: "focus" },
          { square: to, tone: "good" },
        ],
        arrows: [
          {
            from,
            to,
            tone: "good",
          },
        ],
      },
      {
        id: "misconception",
        type: "choice",
        stage: "contrast",
        support: "retrieval",
        eyebrow: "CONTRAST",
        title: "Which rule should you carry to another position?",
        prompt:
          "Choose the statement that captures the chess idea rather than the memorized move.",
        fen: seed.fen,
        options: misconceptionOptions(seed),
        correctOptionId: "principle",
        successTitle: "Concept separated from coordinates",
        successBody:
          "Good. You identified the transferable principle instead of treating one board position as a recipe.",
      },
      {
        id: "guided",
        type: "move",
        stage: "guided",
        support: "guided",
        eyebrow: "GUIDED PRACTICE",
        title: "Apply it with support.",
        prompt: seed.prompt,
        fen: seed.fen,
        acceptedMoves: [seed.move],
        successTitle: seed.title,
        successBody:
          seed.success ?? seed.summary,
        hints: moveHints(seed, seed.move),
      },
      {
        id: "retrieval-check",
        type: "choice",
        stage: "retrieval",
        support: "retrieval",
        eyebrow: "RETRIEVAL",
        title: "Rebuild the idea from memory.",
        prompt:
          "Before moving again, which statement should guide your search?",
        fen: seed.fen,
        options: retrievalOptions(seed),
        correctOptionId: "principle",
        successTitle: "You retrieved the principle",
        successBody:
          "Now use that principle without relying on the worked-example arrow.",
      },
      {
        id: "independent",
        type: "move",
        stage: "retrieval",
        support: "retrieval",
        eyebrow: "INDEPENDENT",
        title: "Find it without the demonstration.",
        prompt: seed.prompt,
        fen: seed.fen,
        acceptedMoves: [seed.move],
        successTitle: "Independent retrieval",
        successBody:
          "You reproduced the idea after the visual support was removed.",
        hints: moveHints(
          seed,
          seed.move,
          "Name the concept first. Only then compare candidate moves.",
        ),
      },
      {
        id: "transfer",
        type: "move",
        stage: "transfer",
        // Repeating the worked position is retrieval, not transfer to new geometry.
        support: transfer.fen === seed.fen ? "retrieval" : "transfer",
        eyebrow: "TRANSFER",
        title:
          transfer.fen === seed.fen
            ? "Prove you can retrieve it again."
            : "Use the idea in a different position.",
        prompt: transfer.prompt,
        fen: transfer.fen,
        acceptedMoves:
          transfer.acceptedMoves,
        successTitle: "Transfer complete",
        successBody: transfer.success,
        hints: transferHints(transfer),
      },
      {
        id: "takeaway",
        type: "explain",
        stage: "takeaway",
        eyebrow: "TAKEAWAY",
        title: "Keep the rule, not the coordinates.",
        body:
          `${seed.summary} In a real game, recognize the condition first, check the opponent's strongest reply, and only then commit to the move.`,
        fen: transfer.fen,
      },
    ],
  };
}

export const lessonScripts: Record<
  string,
  LessonScript
> = Object.fromEntries(
  Object.entries(seeds).map(
    ([skillId, seed]) => [
      skillId,
      makeScript(skillId, seed),
    ],
  ),
);

export function lessonForSkill(
  skillId: string,
  _title: string,
  _description: string,
  _mode?: TrainingMode,
): LessonScript {
  const lesson = lessonScripts[skillId];
  if (!lesson) {
    throw new Error(
      `Missing authored lesson for curriculum skill: ${skillId}`,
    );
  }
  return lesson;
}

export function lessonCatalogIssues() {
  const issues: string[] = [];

  for (
    const [skillId, lesson] of
    Object.entries(lessonScripts)
  ) {
    const stepIds = new Set<string>();
    const stages = new Set(
      lesson.steps.map((step) => step.stage),
    );

    if (lesson.steps.length < 7) {
      issues.push(
        `${skillId}: only ${lesson.steps.length} lesson steps`,
      );
    }
    for (
      const stage of [
        "model",
        "contrast",
        "guided",
        "retrieval",
        "transfer",
        "takeaway",
      ] as const
    ) {
      if (!stages.has(stage)) {
        issues.push(
          `${skillId}: missing ${stage} stage`,
        );
      }
    }

    for (const step of lesson.steps) {
      if (stepIds.has(step.id)) {
        issues.push(
          `${skillId}:${step.id}: duplicate step id`,
        );
      }
      stepIds.add(step.id);

      try {
        new Chess(step.fen);
      } catch {
        issues.push(
          `${skillId}:${step.id}: invalid FEN`,
        );
        continue;
      }

      if (step.type === "choice") {
        const optionIds = new Set(
          step.options.map(
            (option) => option.id,
          ),
        );
        if (optionIds.size !== step.options.length) {
          issues.push(
            `${skillId}:${step.id}: duplicate option ids`,
          );
        }
        if (
          !optionIds.has(
            step.correctOptionId,
          )
        ) {
          issues.push(
            `${skillId}:${step.id}: missing correct option`,
          );
        }
        if (step.options.length < 3) {
          issues.push(
            `${skillId}:${step.id}: too few misconception options`,
          );
        }
        continue;
      }

      if (step.type !== "move") {
        continue;
      }

      if (step.hints.length < 2) {
        issues.push(
          `${skillId}:${step.id}: needs escalating hints`,
        );
      }

      for (
        const encoded of
        step.acceptedMoves
      ) {
        try {
          const chess = new Chess(
            step.fen,
          );
          const move = chess.move({
            from: encoded.slice(0, 2),
            to: encoded.slice(2, 4),
            promotion:
              encoded.slice(4, 5) ||
              "q",
          });
          if (!move) {
            issues.push(
              `${skillId}:${step.id}: illegal move ${encoded}`,
            );
          }
        } catch {
          issues.push(
            `${skillId}:${step.id}: illegal move ${encoded}`,
          );
        }
      }
    }

    if (
      deepTransferSkillIds.includes(
        skillId,
      )
    ) {
      const transferStep =
        lesson.steps.find(
          (step) =>
            step.stage === "transfer",
        );
      const modelStep =
        lesson.steps.find(
          (step) =>
            step.stage === "model",
        );
      if (
        !transferStep ||
        !modelStep ||
        transferStep.fen === modelStep.fen
      ) {
        issues.push(
          `${skillId}: deep lesson requires a distinct transfer position`,
        );
      }
    }
  }

  return issues;
}
