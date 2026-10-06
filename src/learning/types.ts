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

export type LessonStage =
  | "model"
  | "example"
  | "contrast"
  | "check"
  | "guided"
  | "retrieval"
  | "transfer"
  | "takeaway";

export type LessonSupport = "guided" | "retrieval" | "transfer";

export interface LessonHint {
  text: string;
  highlights?: BoardHighlight[];
  arrows?: BoardArrow[];
}

export interface LessonChoiceOption {
  id: string;
  text: string;
  feedback: string;
}

export type LessonStep =
  | {
      id: string;
      type: "explain";
      stage: LessonStage;
      eyebrow?: string;
      title: string;
      body: string;
      fen: string;
      highlights?: BoardHighlight[];
      arrows?: BoardArrow[];
    }
  | {
      id: string;
      type: "choice";
      stage: "contrast" | "check" | "retrieval";
      support: "retrieval";
      eyebrow?: string;
      title: string;
      prompt: string;
      fen: string;
      options: LessonChoiceOption[];
      correctOptionId: string;
      successTitle: string;
      successBody: string;
    }
  | {
      id: string;
      type: "move";
      stage: "guided" | "retrieval" | "transfer";
      support: LessonSupport;
      eyebrow?: string;
      title: string;
      prompt: string;
      fen: string;
      acceptedMoves: string[];
      successTitle: string;
      successBody: string;
      hints: LessonHint[];
      wrongMoveFeedback?: Record<string, string>;
    };

export interface LessonScript {
  id: string;
  skillId: string;
  title: string;
  summary: string;
  steps: LessonStep[];
}

export interface LessonStepResult {
  stepId: string;
  support: LessonSupport;
  correct: boolean;
  firstTry: boolean;
  hintsUsed: number;
  wrongAttempts: number;
}

export interface LessonMasterySummary {
  completed: boolean;
  assessedSteps: number;
  independentSteps: number;
  firstTryCorrect: number;
  transferSteps: number;
  transferFirstTryCorrect: number;
  masteryQuality: number;
  masteryPassed: boolean;
}
