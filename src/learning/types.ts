import type { Square } from "chess.js";

export type BoardTone = "focus" | "good" | "danger" | "hint";

export interface BoardHighlight {
  square: Square;
  tone: BoardTone;
}

export interface BoardArrow {
  from: Square;
  to: Square;
  tone?: BoardTone;
}

export type LessonStep =
  | {
      id: string;
      type: "explain";
      eyebrow?: string;
      title: string;
      body: string;
      fen: string;
      highlights?: BoardHighlight[];
      arrows?: BoardArrow[];
    }
  | {
      id: string;
      type: "move";
      eyebrow?: string;
      title: string;
      prompt: string;
      fen: string;
      acceptedMoves: string[];
      successTitle: string;
      successBody: string;
      hint: string;
      hintHighlights?: BoardHighlight[];
      hintArrows?: BoardArrow[];
    };

export interface LessonScript {
  id: string;
  skillId: string;
  title: string;
  summary: string;
  steps: LessonStep[];
}
