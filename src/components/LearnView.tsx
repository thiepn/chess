import { Chess } from "chess.js";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Compass,
  LockKeyhole,
  Play,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  curriculumStages,
  domainLabels,
  isSkillUnlocked,
  skillById,
  skills,
} from "../domain/curriculum";
import type {
  ChessSkill,
  CurriculumStageId,
  SkillMastery,
} from "../domain/types";
import type {
  PlacementProfile,
  StageGateEvaluation,
  StageGateStatus,
} from "../assessment/types";
import { lessonForSkill } from "../learning/lessons";
import { chapterEvidence, nextCourseLesson, recordedLessonStatus } from "../learning/learnJourney";
import type { LearningAnalyticsEvent } from "../analytics/types";
import type { LessonStep } from "../learning/types";
import { supportsPuzzlePractice } from "../puzzles/support";
import { ChessBoard } from "./ChessBoard";
interface LearnViewProps {
  mastery: Record<string, SkillMastery>;
  lessonEvents?: readonly LearningAnalyticsEvent[];
  gates: Record<CurriculumStageId, StageGateEvaluation>;
  placement?: PlacementProfile;
  curriculumFloor: number;
  selectedSkillId?: string;
  onOpenSkill: (skillId: string) => void;
  onBackToCourse: () => void;
  onStartLesson: (skillId: string) => void;
  onStartPractice: (skillId: string) => void;
  onStartPlacement: () => void;
  onStartCheckpoint: (stageId: CurriculumStageId) => void;
  onOpenOpenings: () => void;
  onOpenModelGames: () => void;
}

function masteryLabel(value: number) {
  if (value >= 85) return "Mastered";
  if (value >= 70) return "Strong";
  if (value >= 40) return "Practicing";
  if (value > 0) return "Learning";
  return "New";
}

function gateLabel(status: StageGateStatus) {
  if (status === "passed") return "Passed";
  if (status === "provisional") return "More results needed";
  if (status === "remediation") return "Review needed";
  if (status === "ready") return "Ready to check";
  if (status === "placed") return "Starting point set";
  if (status === "locked") return "Locked";
  return "Learning";
}

function skillMastery(
  mastery: Record<string, SkillMastery>,
  skillId: string,
) {
  return Math.round(mastery[skillId]?.effectiveMastery ?? 0);
}

function lessonStepCopy(step: LessonStep) {
  if (step.type === "explain") {
    return {
      eyebrow: step.eyebrow ?? step.stage,
      title: step.title,
      body: step.body,
    };
  }

  return {
    eyebrow: step.eyebrow ?? step.stage,
    title: step.title,
    body: step.prompt,
  };
}

function LessonPage({
  skill,
  mastery,
  lessonEvents,
  onBack,
  onStartLesson,
  onStartPractice,
}: {
  skill: ChessSkill;
  mastery: Record<string, SkillMastery>;
  lessonEvents: readonly LearningAnalyticsEvent[];
  onBack: () => void;
  onStartLesson: (skillId: string) => void;
  onStartPractice: (skillId: string) => void;
}) {
  const lesson = useMemo(
    () =>
      lessonForSkill(
        skill.id,
        skill.title,
        skill.description,
        skill.trainingModes[0] ?? "conceptLesson",
      ),
    [skill],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const readingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStepIndex(0);
  }, [skill.id]);

  useEffect(() => {
    if (readingRef.current) readingRef.current.scrollTop = 0;
  }, [stepIndex, skill.id]);

  const step = lesson.steps[Math.min(stepIndex, lesson.steps.length - 1)];
  const copy = lessonStepCopy(step);
  const orientation = new Chess(step.fen).turn() === "b" ? "b" : "w";
  const value = skillMastery(mastery, skill.id);
  const lessonStatus = recordedLessonStatus(lessonEvents, skill.id);
  const practiceAvailable = supportsPuzzlePractice(skill.id) ||
    skill.trainingModes.some(mode=>mode==="calculation" ||
      mode==="endgameDrill" || mode==="conversionChallenge");

  return (
    <section className="learn-v2 lesson-page-v2" aria-labelledby="lesson-page-title">
      <aside className="learn-v2-lesson-rail" aria-label="Lesson outline">
        <button className="learn-v2-back" type="button" onClick={onBack}>
          <ChevronLeft size={16} />
          Course
        </button>

        <div className="learn-v2-lesson-identity">
          <span>{domainLabels[skill.domain]}</span>
          <strong>{lesson.title}</strong>
          <small>{masteryLabel(value)} · {value}% skill mastery</small>
        </div>

        <div className="learn-v2-step-list">
          {lesson.steps.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === stepIndex ? "active" : ""}
              aria-current={index === stepIndex ? "step" : undefined}
              aria-label={`Section ${index + 1} of ${lesson.steps.length}: ${item.title}`}
              onClick={() => setStepIndex(index)}
            >
              <span>{index + 1}</span>
              <div>
                <small>{item.stage}</small>
                <strong>{item.title}</strong>
              </div>
            </button>
          ))}
        </div>

      </aside>

      <div className="learn-v2-board-column">
        <div className="learn-v2-board-context">
          <span>{copy.eyebrow}</span>
          <span>Section {stepIndex + 1} of {lesson.steps.length}</span>
        </div>
        <ChessBoard
          key={`${skill.id}:${step.id}`}
          fen={step.fen}
          orientation={orientation}
          disabled
          highlights={step.type === "explain" ? step.highlights : undefined}
          arrows={step.type === "explain" ? step.arrows : undefined}
        />
        <div className="learn-v2-board-caption">
          {orientation === "w" ? "White" : "Black"} to move · {step.type === "explain" ? "Annotated position" : "Lesson position"}
        </div>
      </div>

      <article className="learn-v2-reading">
        <div className="learn-v2-reading-content" ref={readingRef}>
        <p className="eyebrow">{domainLabels[skill.domain].toUpperCase()} · {step.stage}</p>
        <div className="learn-v2-lesson-evidence" role="status">
          {lessonStatus === "passed" ? "Guided lesson passed" :
            lessonStatus === "attempted" ? "Guided lesson attempted" : "Guided lesson not started"}
        </div>
        <h1 id="lesson-page-title">{copy.title}</h1>
        <p className="learn-v2-reading-body">{copy.body}</p>

        {stepIndex === 0 && (
          <div className="learn-v2-reading-note">
            <span>Skill focus</span>
            <strong>{skill.title}</strong>
            <p>{skill.description}</p>
          </div>
        )}


        </div>

        <footer className="learn-v2-reading-footer">
        <div className="learn-v2-step-progress"
          role="progressbar" aria-label="Reading sections"
          aria-valuemin={0} aria-valuemax={lesson.steps.length}
          aria-valuenow={stepIndex + 1}>
          <span style={{ width: `${((stepIndex + 1) / lesson.steps.length) * 100}%` }} />
        </div>
        <div className="learn-v2-reading-nav">
          <button
            type="button"
            className="secondary"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="secondary"
            disabled={stepIndex >= lesson.steps.length - 1}
            onClick={() =>
              setStepIndex((index) =>
                Math.min(lesson.steps.length - 1, index + 1),
              )
            }
          >
            Next section
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="learn-v2-reading-transfer">
          <button className="primary" type="button" onClick={() => onStartLesson(skill.id)}>
            Start guided lesson <ChevronRight size={17} />
          </button>
          {practiceAvailable && (
            <button className="secondary" type="button" onClick={() => onStartPractice(skill.id)}>
              Practice positions
            </button>
          )}
        </div>
        </footer>
      </article>
    </section>
  );
}

export function LearnView({
  mastery,
  lessonEvents = [],
  gates,
  placement,
  curriculumFloor,
  selectedSkillId,
  onOpenSkill,
  onBackToCourse,
  onStartLesson,
  onStartPractice,
  onStartPlacement,
  onStartCheckpoint,
  onOpenOpenings,
  onOpenModelGames,
}: LearnViewProps) {
  const selectedSkill = selectedSkillId
    ? skillById[selectedSkillId]
    : undefined;

  const continuation = nextCourseLesson(mastery, curriculumFloor);
  const recommendedSkill = continuation?.kind === "next" ? continuation.skill : undefined;

  const placementStage = placement
    ? curriculumStages.find(
        (stage) => stage.id === placement.recommendedStageId,
      )
    : undefined;

  const initialStage =
    selectedSkill?.stage ??
    continuation?.skill.stage ??
    placementStage?.id ??
    curriculumStages[0].id;

  const [selectedStageId, setSelectedStageId] =
    useState<CurriculumStageId>(initialStage);

  useEffect(() => {
    if (selectedSkill?.stage) {
      setSelectedStageId(selectedSkill.stage);
    }
  }, [selectedSkill?.stage]);

  if (selectedSkill) {
    return (
      <LessonPage
        skill={selectedSkill}
        mastery={mastery}
        lessonEvents={lessonEvents}
        onBack={onBackToCourse}
        onStartLesson={onStartLesson}
        onStartPractice={onStartPractice}
      />
    );
  }

  const stage =
    curriculumStages.find((item) => item.id === selectedStageId) ??
    curriculumStages[0];
  const stageSkills = skills.filter((skill) => skill.stage === stage.id);
  const gate = gates[stage.id];
  const evidence = chapterEvidence(stage.id, mastery);
  const { average, mastered } = evidence;
  const stageIndex = curriculumStages.findIndex((item) => item.id === stage.id);
  const previousStage = curriculumStages[stageIndex - 1];
  const nextStage = curriculumStages[stageIndex + 1];

  return (
    <section className="learn-v2" aria-labelledby="learn-course-title">
      <aside className="learn-v2-stage-rail" aria-label="Course chapters">
        <div className="learn-v2-course-mark">
          <BookOpen size={17} />
          <div>
            <span>Course</span>
            <strong>Chess foundations → advanced play</strong>
          </div>
        </div>

        <nav className="learn-v2-stage-nav" aria-label="Curriculum stages">
          {curriculumStages.map((item) => {
            const itemEvidence = chapterEvidence(item.id, mastery);
            const itemGate = gates[item.id];
            return (
              <button
                key={item.id}
                type="button"
                className={item.id === stage.id ? "active" : ""}
                aria-current={item.id === stage.id ? "page" : undefined}
                onClick={() => setSelectedStageId(item.id)}
              >
                <span className="learn-v2-stage-number">{item.order + 1}</span>
                <span className="learn-v2-stage-label">
                  <strong>{item.shortTitle}</strong>
                  <small>{item.targetRating} · {itemEvidence.practiced} practiced</small>
                </span>
                <span
                  className={[
                    "learn-v2-stage-state",
                    itemGate.status === "passed" ? "passed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {itemGate.status === "passed" ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    `${itemEvidence.mastered}/${itemEvidence.total}`
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="learn-v2-tools">
          <button type="button" onClick={onOpenOpenings}>
            <Compass size={15} />
            Repertoire
          </button>
          <button type="button" onClick={onOpenModelGames}>
            <Play size={15} />
            Model games
          </button>
        </div>
      </aside>

      <main className="learn-v2-chapter">
        {continuation && (
          <section className="learn-v2-continue" aria-label="Continue learning">
            <div className="learn-v2-continue-copy">
              <span>{continuation.kind === "next" ? "Continue learning" : "Revisit a lesson"}</span>
              <strong>{continuation.skill.title}</strong>
              <small>{curriculumStages.find((item) => item.id === continuation.skill.stage)?.title} · {masteryLabel(skillMastery(mastery, continuation.skill.id))}</small>
            </div>
            <button type="button" className="primary" onClick={() => onOpenSkill(continuation.skill.id)}>
              {continuation.kind === "next" ? "Continue" : "Read again"}
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </section>
        )}

        <div className="learn-v2-chapter-switcher" role="group" aria-label="Chapter navigation">
          <button type="button" disabled={!previousStage} onClick={() => previousStage && setSelectedStageId(previousStage.id)}>
            <ChevronLeft size={16} aria-hidden="true" />
            {previousStage ? previousStage.shortTitle : "First chapter"}
          </button>
          <span>Chapter {stage.order + 1} of {curriculumStages.length}</span>
          <button type="button" disabled={!nextStage} onClick={() => nextStage && setSelectedStageId(nextStage.id)}>
            {nextStage ? nextStage.shortTitle : "Last chapter"}
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        <header className="learn-v2-chapter-head">
          <div>
            <p className="eyebrow">{stage.targetRating.toUpperCase()}</p>
            <h1 id="learn-course-title">{stage.title}</h1>
            <strong>{stage.promise}</strong>
            <p>{stage.description}</p>
          </div>

          <div className="learn-v2-stage-progress">
            <span>{mastered}/{stageSkills.length} strong skills · {evidence.practiced} practiced</span>
            <strong>{average}%</strong>
            <div className="learn-v2-progress-track" role="progressbar"
              aria-label="Average chapter skill mastery" aria-valuemin={0} aria-valuemax={100} aria-valuenow={average}>
              <i style={{ width: `${average}%` }} />
            </div>
          </div>
        </header>

        <div className="learn-v2-stage-actions">
          <div className="learn-v2-gate-copy">
            <span className={`gate-status ${gate.status}`}>
              {gateLabel(gate.status)}
            </span>
            <div>
              <strong>Stage check</strong>
              <span>
                Understanding {gate.metrics.mastery}% · recall {gate.metrics.retention}% · in games {gate.metrics.transfer}%
              </span>
            </div>
          </div>
          <button
            type="button"
            className="secondary"
            disabled={gate.status === "locked"}
            onClick={() => onStartCheckpoint(stage.id)}
          >
            <ClipboardCheck size={15} />
            {gate.metrics.checkpoint ? "Check again" : "Stage check"}
          </button>
        </div>

        {!placement && (
          <div className="learn-v2-placement">
            <div>
              <ClipboardCheck size={16} />
              <span>
                <strong>Not sure where to begin?</strong>
                <small>A short placement check can skip lessons you already know.</small>
              </span>
            </div>
            <button type="button" onClick={onStartPlacement}>
              Find my level
            </button>
          </div>
        )}

        <div className="learn-v2-skill-list" role="list">
          {stageSkills.map((skill, index) => {
            const value = skillMastery(mastery, skill.id);
            const attempts = mastery[skill.id]?.attempts ?? 0;
            const lessonStatus = recordedLessonStatus(lessonEvents, skill.id);
            const unlocked = isSkillUnlocked(skill, mastery);
            const practiceAvailable = supportsPuzzlePractice(skill.id) ||
    skill.trainingModes.some(mode=>mode==="calculation" ||
      mode==="endgameDrill" || mode==="conversionChallenge");
            const prerequisites = skill.prerequisites
              .map((relation) => skillById[relation.skillId])
              .filter(Boolean);

            return (
              <article
                key={skill.id}
                role="listitem"
                className={[
                  "learn-v2-skill-row",
                  unlocked ? "" : "locked",
                  recommendedSkill?.id === skill.id ? "recommended" : "",
                  value >= 75 ? "strong-skill" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="learn-v2-skill-index">{index + 1}</span>

                <div className="learn-v2-skill-copy">
                  <div>
                    <span>{domainLabels[skill.domain]}</span>
                    {recommendedSkill?.id === skill.id && <small>Next lesson</small>}
                  </div>
                  <strong>{skill.title}</strong>
                  <p>{skill.description}</p>
                  {(lessonStatus !== "not-started" || attempts > 0) && (
                    <small className="learn-v2-skill-evidence">
                      {lessonStatus === "passed" ? "Guided lesson passed" :
                        lessonStatus === "attempted" ? "Guided lesson attempted" : "Skill practice recorded"}
                      {attempts > 0 ? ` · ${attempts} skill attempts` : ""}
                    </small>
                  )}
                  {!unlocked && prerequisites.length > 0 && (
                    <div className="learn-v2-prerequisite">
                      <LockKeyhole size={12} />
                      First: {prerequisites.slice(0, 2).map((item) => item.title).join(" · ")}
                    </div>
                  )}
                </div>

                <div className="learn-v2-skill-mastery">
                  <span>{masteryLabel(value)}</span>
                  <strong>{value}%</strong>
                  <div className="learn-v2-progress-track">
                    <i style={{ width: `${value}%` }} />
                  </div>
                </div>

                <div className="learn-v2-skill-actions">
                  {unlocked ? (
                    <>
                      <button
                        type="button"
                        className="learn-v2-open"
                        onClick={() => onOpenSkill(skill.id)}
                      >
                        Read lesson
                        <ChevronRight size={15} />
                      </button>
                      {practiceAvailable && (
                        <button
                          type="button"
                          className="learn-v2-practice"
                          onClick={() => onStartPractice(skill.id)}
                        >
                          Practice
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="learn-v2-locked-label">
                      <LockKeyhole size={13} />
                      Locked
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </section>
  );
}
