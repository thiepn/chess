import { Chess, type Color, type Square } from "chess.js";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { curriculumStages } from "../domain/curriculum";
import type {
  AssessmentItemResult,
  AssessmentSession,
} from "../assessment/types";
import type { BoardArrow } from "../learning/types";
import { ChessBoard } from "./ChessBoard";

interface AssessmentRunnerProps {
  session: AssessmentSession;
  onComplete: (results: AssessmentItemResult[]) => void;
  onCancel: () => void;
}

function stageTitle(stageId: AssessmentItemResult["stageId"]) {
  return (
    curriculumStages.find((stage) => stage.id === stageId)?.title ??
    stageId
  );
}

export function AssessmentRunner({
  session,
  onComplete,
  onCancel,
}: AssessmentRunnerProps) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<AssessmentItemResult[]>([]);
  const [answered, setAnswered] = useState<AssessmentItemResult | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const item = session.items[index];
  const orientation = useMemo<Color>(
    () => (new Chess(item.fen).turn() === "b" ? "b" : "w"),
    [item.fen],
  );

  const correction: BoardArrow[] =
    answered && !answered.success
      ? [
          {
            from: item.acceptedMoves[0].slice(0, 2) as Square,
            to: item.acceptedMoves[0].slice(2, 4) as Square,
            tone: "good",
          },
        ]
      : [];

  const score = results.length
    ? Math.round(
        (results.filter((result) => result.success).length / results.length) *
          100,
      )
    : 0;

  const stageScores = useMemo(
    () =>
      curriculumStages
        .map((stage) => {
          const stageResults = results.filter(
            (result) => result.stageId === stage.id,
          );
          if (!stageResults.length) return null;
          return {
            stage,
            score: Math.round(
              (stageResults.filter((result) => result.success).length /
                stageResults.length) *
                100,
            ),
          };
        })
        .filter(Boolean) as Array<{
        stage: (typeof curriculumStages)[number];
        score: number;
      }>,
    [results],
  );

  function answer(
    playedMove: string,
    success: boolean,
  ) {
    if (answered) return;

    const result: AssessmentItemResult = {
      itemId: item.id,
      skillId: item.skillId,
      stageId: item.stageId,
      success,
      playedMove,
    };

    setAnswered(result);
    setResults((previous) => [...previous, result]);
  }

  function continueAssessment() {
    if (!answered) return;

    if (index >= session.items.length - 1) {
      setShowSummary(true);
      return;
    }

    setIndex((value) => value + 1);
    setAnswered(null);
  }

  if (showSummary) {
    return (
      <section className="assessment-runner assessment-summary">
        <div className="assessment-summary-mark">
          <ClipboardCheck size={27} />
        </div>
        <p className="eyebrow">
          {session.kind === "placement"
            ? "PLACEMENT COMPLETE"
            : "CHECKPOINT COMPLETE"}
        </p>
        <h2>{score}%</h2>
        <p className="assessment-summary-copy">
          {session.kind === "placement"
            ? "This is a placement signal, not a permanent rating. It seeds the player model and chooses where the course should begin testing you."
            : score >= 80
              ? "The checkpoint score is strong enough. Certification still checks breadth, delayed retention and transfer outside the lesson."
              : "The checkpoint found gaps worth repairing before certification. Those missed skills will be pushed into adaptive training."}
        </p>

        <div className="assessment-breakdown">
          {stageScores.map(({ stage, score: stageScore }) => (
            <div key={stage.id}>
              <span>{stage.shortTitle}</span>
              <strong>{stageScore}%</strong>
              <i>
                <b style={{ width: `${stageScore}%` }} />
              </i>
            </div>
          ))}
        </div>

        <div className="assessment-summary-actions">
          <button className="secondary" type="button" onClick={onCancel}>
            Discard
          </button>
          <button
            className="primary"
            type="button"
            onClick={() => onComplete(results)}
          >
            Apply result <ChevronRight size={17} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="assessment-runner">
      <div className="assessment-head">
        <div>
          <p className="eyebrow">
            {session.kind === "placement"
              ? "PLACEMENT DIAGNOSTIC"
              : `${stageTitle(item.stageId).toUpperCase()} CHECKPOINT`}
          </p>
          <h2>Find the best move.</h2>
          <p>
            No hints and no retries. The first legal move is your assessment
            answer.
          </p>
        </div>
        <div className="assessment-count">
          <strong>{index + 1}</strong>
          <span>/ {session.items.length}</span>
        </div>
      </div>

      <div
        className="assessment-progress"
        role="progressbar"
        aria-label="Assessment progress"
        aria-valuemin={0}
        aria-valuemax={session.items.length}
        aria-valuenow={index + (answered ? 1 : 0)}
      >
        <i
          style={{
            width: `${((index + (answered ? 1 : 0)) / session.items.length) * 100}%`,
          }}
        />
      </div>

      <div className="assessment-stage">
        <div className="assessment-board">
          <ChessBoard
            key={`${session.id}:${item.id}`}
            fen={item.fen}
            orientation={orientation}
            disabled={Boolean(answered)}
            arrows={correction}
            onMove={(move) => {
              const played = `${move.from}${move.to}${move.promotion ?? ""}`;
              const success =
                item.acceptedMoves.includes(played) ||
                item.acceptedMoves.includes(
                  `${move.from}${move.to}`,
                );
              answer(played, success);
              return success;
            }}
          />
          <div className="board-caption">
            <span>{orientation === "w" ? "White" : "Black"} to move</span>
            <span>Assessment · no hints</span>
          </div>
        </div>

        <aside className="assessment-panel">
          {!answered ? (
            <div className="assessment-prompt">
              <ClipboardCheck size={22} />
              <strong>Commit to one move.</strong>
              <p>
                Read the position as if it appeared in a real game. The
                underlying skill is intentionally hidden until after the move.
              </p>
            </div>
          ) : (
            <div
              className={
                answered.success
                  ? "assessment-result correct"
                  : "assessment-result incorrect"
              }
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {answered.success ? (
                <CheckCircle2 size={23} />
              ) : (
                <XCircle size={23} />
              )}
              <div>
                <strong>
                  {answered.success ? "Correct." : "Not this time."}
                </strong>
                <span>
                  Best move: {item.answerSan}
                </span>
              </div>
            </div>
          )}

          {answered && !answered.success && (
            <div className="assessment-correction">
              <CircleAlert size={17} />
              <span>
                The board shows the target move. This answer is recorded as a
                miss; there is no retry inside the assessment.
              </span>
            </div>
          )}

          <div className="assessment-panel-footer">
            <span>
              {session.kind === "placement"
                ? "Placement affects where the course begins, not whether material stays accessible."
                : "Checkpoint results are combined with mastery, retention and transfer evidence."}
            </span>
            <button
              className="primary"
              type="button"
              disabled={!answered}
              onClick={continueAssessment}
            >
              {index === session.items.length - 1 ? "See result" : "Next position"}
              <ChevronRight size={16} />
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
