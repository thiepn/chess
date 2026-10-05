import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  LockKeyhole,
  Route,
} from "lucide-react";
import {
  curriculumStages,
  domainLabels,
  isSkillUnlocked,
  readyCurriculumSkills,
  skills,
} from "../domain/curriculum";
import type { SkillMastery } from "../domain/types";
import { lessonScripts } from "../learning/lessons";
import { supportsPuzzlePractice } from "../puzzles/support";

interface LearnViewProps {
  mastery: Record<string, SkillMastery>;
  onStartLesson: (skillId: string) => void;
  onStartPractice: (skillId: string) => void;
  onOpenOpenings: () => void;
}

function masteryLabel(value: number) {
  if (value >= 85) return "Mastered";
  if (value >= 70) return "Strong";
  if (value >= 40) return "Practicing";
  if (value > 0) return "Learning";
  return "New";
}

function skillMastery(
  mastery: Record<string, SkillMastery>,
  skillId: string,
) {
  return Math.round(mastery[skillId]?.effectiveMastery ?? 0);
}

export function LearnView({
  mastery,
  onStartLesson,
  onStartPractice,
  onOpenOpenings,
}: LearnViewProps) {
  const mastered = skills.filter(
    (skill) => skillMastery(mastery, skill.id) >= 75,
  ).length;
  const interactive = skills.filter((skill) => lessonScripts[skill.id]).length;
  const recommendedId = readyCurriculumSkills(mastery)[0]?.id;

  return (
    <section className="learn-view">
      <header className="section-hero curriculum-hero">
        <div>
          <p className="eyebrow">GUIDED CURRICULUM</p>
          <h1>From first move to practical chess.</h1>
          <p>
            The course is ordered around what changes games first: legal play,
            piece safety, sound positions, tactics, calculation, attack,
            endings and practical decision-making.
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
          <CheckCircle2 size={18} />
          <span>Interactive lessons</span>
          <strong>{interactive}/{skills.length}</strong>
        </div>
        <div>
          <span className="overview-progress-ring">
            {Math.round((mastered / Math.max(1, skills.length)) * 100)}%
          </span>
          <span>Mastered</span>
          <strong>{mastered} skills</strong>
        </div>
      </div>

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
                </div>
              </header>

              <div className="curriculum-card-grid">
                {stageSkills.map((skill, index) => {
                  const value = skillMastery(mastery, skill.id);
                  const unlocked = isSkillUnlocked(skill, mastery);
                  const practiceAvailable = supportsPuzzlePractice(skill.id);
                  const prerequisites = skill.prerequisites
                    .map((relation) => skills.find((item) => item.id === relation.skillId))
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
