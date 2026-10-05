import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Compass,
  LockKeyhole,
  Route,
  ShieldCheck,
} from "lucide-react";
import {
  curriculumStageOrder,
  curriculumStages,
  domainLabels,
  isSkillUnlocked,
  readyCurriculumSkills,
  skills,
} from "../domain/curriculum";
import type {
  CurriculumStageId,
  SkillMastery,
} from "../domain/types";
import type {
  PlacementProfile,
  StageGateEvaluation,
  StageGateStatus,
} from "../assessment/types";
import { lessonScripts } from "../learning/lessons";
import { supportsPuzzlePractice } from "../puzzles/support";

interface LearnViewProps {
  mastery: Record<string, SkillMastery>;
  gates: Record<CurriculumStageId, StageGateEvaluation>;
  placement?: PlacementProfile;
  onStartLesson: (skillId: string) => void;
  onStartPractice: (skillId: string) => void;
  onStartPlacement: () => void;
  onStartCheckpoint: (stageId: CurriculumStageId) => void;
  onOpenOpenings: () => void;
}

function masteryLabel(value: number) {
  if (value >= 85) return "Mastered";
  if (value >= 70) return "Strong";
  if (value >= 40) return "Practicing";
  if (value > 0) return "Learning";
  return "New";
}

function gateLabel(status: StageGateStatus) {
  if (status === "passed") return "Certified";
  if (status === "provisional") return "Evidence pending";
  if (status === "remediation") return "Repair needed";
  if (status === "ready") return "Checkpoint ready";
  if (status === "placed") return "Placement cleared";
  if (status === "locked") return "Locked";
  return "Learning";
}

function skillMastery(
  mastery: Record<string, SkillMastery>,
  skillId: string,
) {
  return Math.round(mastery[skillId]?.effectiveMastery ?? 0);
}

function GateMetric({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number;
}) {
  const met = value >= target;
  return (
    <div className={met ? "gate-metric met" : "gate-metric"}>
      <span>{label}</span>
      <strong>{value}%</strong>
      <small>need {target}%</small>
    </div>
  );
}

export function LearnView({
  mastery,
  gates,
  placement,
  onStartLesson,
  onStartPractice,
  onStartPlacement,
  onStartCheckpoint,
  onOpenOpenings,
}: LearnViewProps) {
  const mastered = skills.filter(
    (skill) => skillMastery(mastery, skill.id) >= 75,
  ).length;
  const interactive = skills.filter((skill) => lessonScripts[skill.id]).length;
  const recommendedId = readyCurriculumSkills(
    mastery,
    curriculumStageOrder(placement?.recommendedStageId),
  )[0]?.id;
  const certified = curriculumStages.filter(
    (stage) => gates[stage.id]?.status === "passed",
  ).length;
  const placementStage = placement
    ? curriculumStages.find(
        (stage) => stage.id === placement.recommendedStageId,
      )
    : undefined;

  return (
    <section className="learn-view">
      <header className="section-hero curriculum-hero">
        <div>
          <p className="eyebrow">GUIDED CURRICULUM</p>
          <h1>From first move to practical chess.</h1>
          <p>
            Lessons build knowledge. Checkpoints certify whether the skill
            survives mixed positions, delayed recall and transfer into play.
          </p>
        </div>
        <div className="section-hero-icon" aria-hidden="true">
          <BookOpen size={30} />
        </div>
      </header>

      <div className="curriculum-overview">
        <div>
          <Route size={18} />
          <span>Course</span>
          <strong>{curriculumStages.length} stages</strong>
        </div>
        <div>
          <BookOpen size={18} />
          <span>Atomic skills</span>
          <strong>{skills.length}</strong>
        </div>
        <div>
          <ShieldCheck size={18} />
          <span>Certified stages</span>
          <strong>{certified}/{curriculumStages.length}</strong>
        </div>
        <div>
          <span className="overview-progress-ring">
            {Math.round((mastered / Math.max(1, skills.length)) * 100)}%
          </span>
          <span>Skill mastery</span>
          <strong>{mastered} / {interactive}</strong>
        </div>
      </div>

      <section className="placement-card">
        <div className="placement-card-icon">
          <ClipboardCheck size={23} />
        </div>
        <div>
          <p className="eyebrow">COURSE PLACEMENT</p>
          <strong>
            {placementStage
              ? `Placed at: ${placementStage.title}`
              : "Find the right starting point"}
          </strong>
          <span>
            {placementStage
              ? "Placement unlocks the appropriate part of the course, but stage certification still requires a real checkpoint plus retention and transfer evidence."
              : "A 16-position mixed diagnostic samples every stage without hints. It seeds the player model without pretending two positions are full mastery."}
          </span>
        </div>
        <button className="secondary" type="button" onClick={onStartPlacement}>
          {placement ? "Re-run diagnostic" : "Take diagnostic"}
        </button>
      </section>

      <button
        className="opening-entry-card"
        type="button"
        onClick={onOpenOpenings}
      >
        <div className="opening-entry-icon"><Compass size={23} /></div>
        <div>
          <p className="eyebrow">YOUR OPENINGS</p>
          <strong>Concept-first repertoire</strong>
          <span>
            Repertoire recall stays connected to the course but remains compact:
            Italian, Alapin, Caro-Kann and QGD structures rather than an opening
            encyclopedia.
          </span>
        </div>
        <ChevronRight size={19} />
      </button>

      <div className="curriculum-stage-list">
        {curriculumStages.map((stage) => {
          const stageSkills = skills.filter((skill) => skill.stage === stage.id);
          const stageMastered = stageSkills.filter(
            (skill) => skillMastery(mastery, skill.id) >= 75,
          ).length;
          const average = stageSkills.length
            ? Math.round(
                stageSkills.reduce(
                  (sum, skill) => sum + skillMastery(mastery, skill.id),
                  0,
                ) / stageSkills.length,
              )
            : 0;
          const gate = gates[stage.id];

          return (
            <section className="curriculum-stage" key={stage.id}>
              <header className="curriculum-stage-heading">
                <div className="stage-number">{stage.order + 1}</div>
                <div className="stage-copy">
                  <div className="stage-title-row">
                    <div>
                      <p className="eyebrow">{stage.targetRating}</p>
                      <h2>{stage.title}</h2>
                    </div>
                    <div className="stage-mastery">
                      <span>{stageMastered}/{stageSkills.length} mastered</span>
                      <strong>{average}%</strong>
                    </div>
                  </div>
                  <strong className="stage-promise">{stage.promise}</strong>
                  <p>{stage.description}</p>
                  <div className="track stage-track">
                    <i style={{ width: `${average}%` }} />
                  </div>

                  <div className="stage-gate-panel">
                    <div className="stage-gate-heading">
                      <div>
                        <span className={`gate-status ${gate.status}`}>
                          {gateLabel(gate.status)}
                        </span>
                        <strong>Promotion gate</strong>
                      </div>
                      <button
                        type="button"
                        className="stage-checkpoint-button"
                        disabled={gate.status === "locked"}
                        onClick={() => onStartCheckpoint(stage.id)}
                      >
                        <ClipboardCheck size={15} />
                        {gate.metrics.checkpoint
                          ? "Retake checkpoint"
                          : "Take checkpoint"}
                      </button>
                    </div>

                    <div className="gate-metrics">
                      <GateMetric
                        label="Breadth"
                        value={gate.metrics.coverage}
                        target={gate.requirements.coverage}
                      />
                      <GateMetric
                        label="Mastery"
                        value={gate.metrics.mastery}
                        target={gate.requirements.mastery}
                      />
                      <GateMetric
                        label="Retention"
                        value={gate.metrics.retention}
                        target={gate.requirements.retention}
                      />
                      <GateMetric
                        label="Transfer"
                        value={gate.metrics.transfer}
                        target={gate.requirements.transfer}
                      />
                      <GateMetric
                        label="Checkpoint"
                        value={gate.metrics.checkpoint}
                        target={gate.requirements.checkpoint}
                      />
                    </div>
                  </div>
                </div>
              </header>

              <div className="curriculum-card-grid">
                {stageSkills.map((skill, index) => {
                  const value = skillMastery(mastery, skill.id);
                  const unlocked = isSkillUnlocked(skill, mastery);
                  const practiceAvailable = supportsPuzzlePractice(skill.id);
                  const prerequisites = skill.prerequisites
                    .map((relation) =>
                      skills.find((item) => item.id === relation.skillId),
                    )
                    .filter(Boolean);

                  return (
                    <article
                      className={
                        unlocked
                          ? "curriculum-card"
                          : "curriculum-card unavailable"
                      }
                      key={skill.id}
                    >
                      <div className="curriculum-card-top">
                        <div className="curriculum-sequence">
                          <span>{index + 1}</span>
                          <small>{domainLabels[skill.domain]}</small>
                        </div>
                        <div className="curriculum-card-state">
                          {recommendedId === skill.id && (
                            <span className="recommended-next">Next</span>
                          )}
                          <span className="mastery-state">
                            {masteryLabel(value)}
                          </span>
                        </div>
                      </div>

                      <h3>{skill.title}</h3>
                      <p>{skill.description}</p>

                      {prerequisites.length > 0 && !unlocked && (
                        <div className="curriculum-prereqs">
                          <LockKeyhole size={13} />
                          <span>
                            First: {prerequisites
                              .slice(0, 2)
                              .map((item) => item!.title)
                              .join(" · ")}
                          </span>
                        </div>
                      )}

                      <div className="curriculum-progress">
                        <div>
                          <span>Mastery</span>
                          <strong>{value}%</strong>
                        </div>
                        <div className="track">
                          <i style={{ width: `${value}%` }} />
                        </div>
                      </div>

                      {unlocked ? (
                        <div className="curriculum-actions">
                          <button
                            className="curriculum-start"
                            type="button"
                            onClick={() => onStartLesson(skill.id)}
                          >
                            Study <ChevronRight size={16} />
                          </button>
                          {practiceAvailable && (
                            <button
                              className="curriculum-practice"
                              type="button"
                              onClick={() => onStartPractice(skill.id)}
                            >
                              Practice
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="curriculum-locked">
                          <LockKeyhole size={14} /> Build the prerequisite first
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
