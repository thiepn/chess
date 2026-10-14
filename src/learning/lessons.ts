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
  templates: string[];
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
    !(lessonPayload as LessonCorpus).transferSeeds ||
    !Array.isArray((lessonPayload as LessonCorpus).templates)) {
  throw new Error("Authored lesson source is incomplete or outdated.");
}
const { seeds, transferSeeds, templates: lessonText } = lessonPayload as LessonCorpus;

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
        lessonText[0],
    },
    {
      text:
        transfer.hints[1] ??
        lessonText[1],
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
        lessonText[2],
    },
    {
      id: "automatic",
      text:
        lessonText[3],
      feedback:
        lessonText[4],
    },
    {
      id: "hope",
      text:
        lessonText[5],
      feedback:
        lessonText[6],
    },
  ];
}

// Retrieval must not simply repeat the same three options shown during contrast.
function retrievalOptions(seed: LessonSeed) {
  return [
    {
      id: "principle",
      text: seed.summary + lessonText[7],
      feedback: lessonText[8],
    },
    {
      id: "automatic",
      text: lessonText[9],
      feedback: lessonText[10],
    },
    {
      id: "hope",
      text: lessonText[11],
      feedback: lessonText[12],
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
        lessonText[13],
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
        title: lessonText[14],
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
        title: lessonText[15],
        prompt:
          lessonText[16],
        fen: seed.fen,
        options: misconceptionOptions(seed),
        correctOptionId: "principle",
        successTitle: lessonText[17],
        successBody:
          lessonText[18],
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
        title: lessonText[19],
        prompt:
          lessonText[20],
        fen: seed.fen,
        options: retrievalOptions(seed),
        correctOptionId: "principle",
        successTitle: lessonText[21],
        successBody:
          lessonText[22],
      },
      {
        id: "independent",
        type: "move",
        stage: "retrieval",
        support: "retrieval",
        eyebrow: "INDEPENDENT",
        title: lessonText[23],
        prompt: seed.prompt,
        fen: seed.fen,
        acceptedMoves: [seed.move],
        successTitle: "Independent retrieval",
        successBody:
          lessonText[24],
        hints: moveHints(
          seed,
          seed.move,
          lessonText[25],
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
            ? lessonText[26]
            : lessonText[27],
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
        title: lessonText[28],
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
