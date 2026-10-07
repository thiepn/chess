import { Chess, type Square } from "chess.js";
import {
  ArrowLeft,
  BrainCircuit,
  ChevronLeft,
  Play,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { skillById } from "../domain/curriculum";
import type {
  GamePhase,
  GameReviewReflection,
  GameStoryMoment,
  ImportedGame,
  PersonalMistake,
} from "../games/types";
import type { BoardArrow } from "../learning/types";
import type { OpeningDeviation } from "../openings/types";
import { ChessBoard } from "./ChessBoard";
import { GameReviewCoach } from "./GameReviewCoach";

interface GameStoryViewProps {
  game: ImportedGame;
  mistakes: PersonalMistake[];
  onBack: () => void;
  onTrainMistake: (mistakeId: string) => void;
  onReplayMistake: (mistakeId: string) => void;
  reflections: Record<string, GameReviewReflection>;
  openingDeviations: OpeningDeviation[];
  onUpdateReflection: (reflection: GameReviewReflection) => void;
  onRetainLesson: (gameId: string, momentId: string) => void;
  onPracticeSkill: (skillId: string) => void;
  onPracticeOpening: (repertoireId: string, nodeId: string) => void;
}

type PreviewMode = "position" | "actual" | "better";

function phaseLabel(phase: GamePhase) {
  if (phase === "opening") return "Opening";
  if (phase === "middlegame") return "Middlegame";
  return "Endgame";
}

function verdictLabel(verdict: NonNullable<ImportedGame["reviewStory"]>["verdict"]) {
  if (verdict === "clean") return "Controlled";
  if (verdict === "competitive") return "Competitive";
  if (verdict === "uneven") return "Uneven";
  return "Costly";
}

function evaluationLabel(cp: number) {
  if (Math.abs(cp) > 90_000) return cp > 0 ? "Winning" : "Lost";
  const value = cp / 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function applyUci(fen: string, uci: string) {
  if (!uci || uci === "(none)") return fen;
  try {
    const chess = new Chess(fen);
    chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4, 5) || "q",
    });
    return chess.fen();
  } catch {
    return fen;
  }
}

function pvToSan(fen: string, pv: string[]) {
  const chess = new Chess(fen);
  const sans: string[] = [];

  for (const uci of pv.slice(0, 4)) {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4, 5) || "q",
      });
      if (!move) break;
      sans.push(move.san);
    } catch {
      break;
    }
  }

  return sans;
}

function moveArrow(uci: string, tone: BoardArrow["tone"]): BoardArrow[] {
  if (!uci || uci === "(none)") return [];
  return [
    {
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      tone,
    },
  ];
}

export function GameStoryView({
  game,
  mistakes,
  onBack,
  onTrainMistake,
  onReplayMistake,
  reflections,
  openingDeviations,
  onUpdateReflection,
  onRetainLesson,
  onPracticeSkill,
  onPracticeOpening,
}: GameStoryViewProps) {
  const story = game.reviewStory;
  const firstMomentPly = story?.moments[0]?.ply ?? game.moves[0]?.ply ?? 1;
  const [selectedPly, setSelectedPly] = useState(firstMomentPly);
  const [preview, setPreview] = useState<PreviewMode>("position");
  const [boardFen, setBoardFen] = useState(
    story?.moments[0]?.positionFen ?? game.moves[0]?.beforeFen ?? new Chess().fen(),
  );
  const [presentationMove, setPresentationMove] = useState<
    { from: Square; to: Square } | undefined
  >();
  const [coachMomentId, setCoachMomentId] = useState<string | null>(null);

  const selectedMove = useMemo(
    () => game.moves.find((move) => move.ply === selectedPly),
    [game.moves, selectedPly],
  );
  const selectedMoment = useMemo(
    () => story?.moments.find((moment) => moment.ply === selectedPly),
    [selectedPly, story],
  );
  const selectedMistake = useMemo(
    () =>
      selectedMoment?.mistakeId
        ? mistakes.find((mistake) => mistake.id === selectedMoment.mistakeId)
        : undefined,
    [mistakes, selectedMoment],
  );
  const selectedReflection = selectedMoment
    ? reflections[selectedMoment.id]
    : undefined;
  const coachMoment = coachMomentId
    ? story?.moments.find((moment) => moment.id === coachMomentId)
    : undefined;
  const coachMistake = coachMoment?.mistakeId
    ? mistakes.find((mistake) => mistake.id === coachMoment.mistakeId)
    : undefined;
  const coachDeviation = coachMoment
    ? openingDeviations.find((deviation) => deviation.ply === coachMoment.ply)
    : undefined;

  const moveRows = useMemo(() => {
    const rows = new Map<
      number,
      { number: number; w?: ImportedGame["moves"][number]; b?: ImportedGame["moves"][number] }
    >();

    for (const move of game.moves) {
      const row = rows.get(move.moveNumber) ?? { number: move.moveNumber };
      row[move.color] = move;
      rows.set(move.moveNumber, row);
    }

    return [...rows.values()].sort((a, b) => a.number - b.number);
  }, [game.moves]);

  useEffect(() => {
    const base =
      selectedMoment?.positionFen ??
      selectedMove?.beforeFen ??
      game.moves[0]?.beforeFen ??
      new Chess().fen();

    setPresentationMove(undefined);
    setBoardFen(base);

    if (!selectedMoment || preview === "position") return;

    const uci =
      preview === "actual" ? selectedMoment.actualMove : selectedMoment.bestMove;
    const timer = window.setTimeout(() => {
      setBoardFen(applyUci(base, uci));
      setPresentationMove({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [game.moves, preview, selectedMoment, selectedMove]);

  useEffect(() => {
    setPreview("position");
  }, [selectedPly]);

  if (!story) {
    return (
      <section className="story-empty">
        <button className="back-link" type="button" onClick={onBack}>
          <ChevronLeft size={16} /> Review
        </button>
        <div className="empty-bank">
          <BrainCircuit size={24} />
          <strong>This game has no P8 story yet.</strong>
          <span>Analyze it again to generate the visual review.</span>
        </div>
      </section>
    );
  }

  const arrows =
    selectedMoment && preview === "actual"
      ? moveArrow(selectedMoment.actualMove, "danger")
      : selectedMoment && preview === "better"
        ? moveArrow(selectedMoment.bestMove, "good")
        : [];

  const selectedPhase =
    story.phases.find(
      (phase) =>
        selectedPly >= phase.startPly &&
        selectedPly <= phase.endPly,
    ) ?? story.phases[0];

  return (
    <section className="review-workstation" aria-labelledby="review-game-title">
      <header className="review-workstation-head">
        <button className="review-v2-back" type="button" onClick={onBack}>
          <ChevronLeft size={15} /> Games
        </button>

        <div className="review-workstation-identity">
          <div>
            <span className={`story-verdict ${story.verdict}`}>
              {verdictLabel(story.verdict)}
            </span>
            <span>{game.result}</span>
            <span>{game.openingName ?? "Reviewed game"}</span>
          </div>
          <strong id="review-game-title">
            {game.white} — {game.black}
          </strong>
        </div>

        <div className="review-workstation-priority">
          <Target size={15} />
          <span>
            {story.prioritySkillId
              ? skillById[story.prioritySkillId]?.title ?? story.prioritySkillId
              : "No urgent weakness"}
          </span>
        </div>
      </header>

      <div className="review-phase-strip" aria-label="Game phases">
        {story.phases.map((phase) => (
          <button
            type="button"
            key={phase.phase}
            className={selectedPhase?.phase === phase.phase ? "active" : ""}
            onClick={() => {
              const move = game.moves.find(
                (item) =>
                  item.ply >= phase.startPly &&
                  item.ply <= phase.endPly,
              );
              if (move) setSelectedPly(move.ply);
            }}
          >
            <span>{phaseLabel(phase.phase)}</span>
            <strong>{phase.headline}</strong>
            <small>
              {(phase.averageCentipawnLoss / 100).toFixed(1)} avg loss · {phase.criticalCount} critical
            </small>
          </button>
        ))}
      </div>

      <section className="review-workspace-v2">
        <div className="review-board-v2">
          <ChessBoard
            key={`${selectedPly}-${preview}-${boardFen}`}
            fen={boardFen}
            orientation={game.playerColor}
            disabled
            arrows={arrows}
            presentationMove={presentationMove}
          />

          <div className="story-preview-controls">
            <button
              type="button"
              className={preview === "position" ? "active" : ""}
              onClick={() => setPreview("position")}
            >
              Position
            </button>
            {selectedMoment && (
              <>
                <button
                  type="button"
                  className={preview === "actual" ? "active actual" : ""}
                  onClick={() => setPreview("actual")}
                >
                  Your move
                </button>
                {(!selectedMistake || selectedReflection?.bestRevealed) && (
                  <button
                    type="button"
                    className={preview === "better" ? "active better" : ""}
                    onClick={() => setPreview("better")}
                  >
                    Better move
                  </button>
                )}
              </>
            )}
          </div>

          <div className="review-board-story">
            <strong>{story.headline}</strong>
            <span>{story.summary}</span>
          </div>
        </div>

        <aside className="review-notation-v2" aria-label="Move notation">
          <header>
            <span>Moves</span>
            <strong>{game.moves.length} plies</strong>
          </header>

          <div className="review-notation-list">
            {moveRows.map((row) => (
              <div className="review-notation-row" key={row.number}>
                <span>{row.number}.</span>
                {([row.w, row.b] as const).map((move, colorIndex) => {
                  if (!move) return <span key={colorIndex} />;
                  const moment = story.moments.find(
                    (item) => item.ply === move.ply,
                  );
                  return (
                    <button
                      key={move.ply}
                      type="button"
                      className={[
                        selectedPly === move.ply ? "active" : "",
                        moment ? "moment" : "",
                        moment?.severity ?? "",
                        moment?.kind ?? "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setSelectedPly(move.ply)}
                    >
                      {move.san}
                      {moment && <i />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        <aside className="review-insight-v2">
          {selectedMoment ? (
            <MomentDetails
              moment={selectedMoment}
              mistake={selectedMistake}
              onTrainMistake={onTrainMistake}
              onReplayMistake={onReplayMistake}
              reflection={selectedReflection}
              onCoach={() => setCoachMomentId(selectedMoment.id)}
            />
          ) : selectedMove ? (
            <div className="ordinary-move">
              <p className="eyebrow">
                {phaseLabel(selectedPhase?.phase ?? "middlegame")} · MOVE {selectedMove.moveNumber}
              </p>
              <h2>{selectedMove.san}</h2>
              <p>
                This move was not promoted into the critical-moment set. Use the notation to continue through the game.
              </p>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="review-eval-strip" aria-label="Critical moment evaluation trace">
        <div className="review-eval-label">
          <span>Critical moments</span>
          <strong>{story.moments.length}</strong>
        </div>
        <div className="review-eval-track">
          {story.moments.map((moment, index) => {
            const normalized = Math.max(
              -6,
              Math.min(6, moment.evaluationAfter / 100),
            );
            const top = 50 - (normalized / 6) * 38;
            return (
              <button
                key={moment.id}
                type="button"
                className={[
                  selectedPly === moment.ply ? "active" : "",
                  moment.severity ?? "",
                  moment.kind,
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  left: `${story.moments.length <= 1 ? 50 : (index / (story.moments.length - 1)) * 100}%`,
                  top: `${top}%`,
                }}
                aria-label={`${phaseLabel(moment.phase)}, move ${moment.moveNumber}: ${moment.title}`}
                onClick={() => setSelectedPly(moment.ply)}
              />
            );
          })}
        </div>
      </section>

      {coachMoment && (
        <GameReviewCoach
          game={game}
          moment={coachMoment}
          mistake={coachMistake}
          reflection={reflections[coachMoment.id]}
          openingDeviation={coachDeviation}
          onClose={() => setCoachMomentId(null)}
          onUpdateReflection={onUpdateReflection}
          onRetainLesson={onRetainLesson}
          onPracticeSkill={onPracticeSkill}
          onPracticeOpening={onPracticeOpening}
        />
      )}
    </section>
  );
}

function MomentDetails({
  moment,
  mistake,
  onTrainMistake,
  onReplayMistake,
  reflection,
  onCoach,
}: {
  moment: GameStoryMoment;
  mistake?: PersonalMistake;
  onTrainMistake: (mistakeId: string) => void;
  onReplayMistake: (mistakeId: string) => void;
  reflection?: GameReviewReflection;
  onCoach: () => void;
}) {
  return (
    <>
      <div className="moment-heading">
        <div className={`moment-symbol ${moment.kind}`}>
          {moment.kind === "strong" ? <Sparkles size={20} /> : <BrainCircuit size={20} />}
        </div>
        <div>
          <p className="eyebrow">
            {phaseLabel(moment.phase)} · MOVE {moment.moveNumber}
          </p>
          <h2>{moment.title}</h2>
        </div>
      </div>

      <p className="moment-summary">{moment.summary}</p>

      <div className="moment-comparison">
        <div>
          <span>Your move</span>
          <strong>{moment.actualSan}</strong>
        </div>
        <ArrowLeft size={14} />
        <div>
          <span>Better</span>
          <strong>
            {!mistake || reflection?.bestRevealed
              ? moment.bestSan
              : "Hidden until retry"}
          </strong>
        </div>
      </div>

      <div className="moment-eval">
        <div>
          <span>Before</span>
          <strong>{evaluationLabel(moment.evaluationBefore)}</strong>
        </div>
        <div>
          <span>After</span>
          <strong>{evaluationLabel(moment.evaluationAfter)}</strong>
        </div>
        <div>
          <span>Cost</span>
          <strong>{(moment.centipawnLoss / 100).toFixed(1)}</strong>
        </div>
      </div>

      {moment.skillIds.length > 0 && (
        <div className="moment-skills">
          {moment.skillIds.map((skillId) => (
            <span key={skillId}>{skillById[skillId]?.title ?? skillId}</span>
          ))}
        </div>
      )}

      {moment.principalVariation.length > 1 &&
        (!mistake || reflection?.continuationRevealed) && (
          <div className="moment-line">
            <span>Engine continuation</span>
            <strong>{pvToSan(moment.positionFen, moment.principalVariation).join(" ")}</strong>
          </div>
        )}

      {mistake && (
        <div className="moment-coach-summary">
          <span>{moment.errorType?.replaceAll("-", " ") ?? "decision error"}</span>
          {moment.moveTimeSeconds !== undefined && (
            <strong>{moment.moveTimeSeconds.toFixed(1)}s on move</strong>
          )}
        </div>
      )}

      {mistake && (
        <button className="moment-coach-primary" type="button" onClick={onCoach}>
          <BrainCircuit size={16} /> Review this decision first
        </button>
      )}

      {mistake && reflection?.bestRevealed && (
        <div className="moment-actions">
          <button
            className="secondary"
            type="button"
            onClick={() => onReplayMistake(mistake.id)}
          >
            <Play size={16} /> Replay position
          </button>
          <button
            className="primary"
            type="button"
            onClick={() => onTrainMistake(mistake.id)}
          >
            <Swords size={16} /> Repair now
          </button>
        </div>
      )}

      {!mistake && (
        <div className="strong-moment-note">
          <Sparkles size={15} />
          <span>
            This is a positive reference point. There is nothing to add to the
            mistake bank here.
          </span>
        </div>
      )}
    </>
  );
}
