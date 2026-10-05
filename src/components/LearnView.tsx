import { BookOpen, ChevronRight, LockKeyhole } from "lucide-react";
import { domainLabels, skills } from "../domain/curriculum";
import type { DomainId, SkillMastery } from "../domain/types";
import { lessonScripts } from "../learning/lessons";
import { supportsPuzzlePractice } from "../puzzles/support";

interface LearnViewProps {
  mastery: Record<string, SkillMastery>;
  onStartLesson: (skillId: string) => void;
  onStartPractice: (skillId: string) => void;
}

const domainOrder: DomainId[] = [
  "rules",
  "fundamentals",
  "tactics",
  "calculation",
  "openings",
  "endgames",
  "strategy",
  "pawns",
  "attack",
  "defense",
  "conversion",
  "practical",
];

function masteryLabel(value: number) {
  if (value >= 85) return "Mastered";
  if (value >= 70) return "Strong";
  if (value >= 40) return "Practicing";
  if (value > 0) return "Learning";
  return "New";
}

export function LearnView({ mastery, onStartLesson, onStartPractice }: LearnViewProps) {
  return (
    <section className="learn-view">
      <header className="section-hero">
        <div>
          <p className="eyebrow">GUIDED CURRICULUM</p>
          <h1>Learn chess in the right order.</h1>
          <p>
            Use this when you want to explore deliberately. Your daily adaptive
            session still decides what deserves priority.
          </p>
        </div>
        <div className="section-hero-icon" aria-hidden="true">
          <BookOpen size={30} />
        </div>
      </header>

      <div className="curriculum-domains">
        {domainOrder.map((domain) => {
          const domainSkills = skills.filter((skill) => skill.domain === domain);
          if (!domainSkills.length) return null;

          return (
            <section className="curriculum-domain" key={domain}>
              <div className="curriculum-domain-heading">
                <div>
                  <p className="eyebrow">{domainLabels[domain]}</p>
                  <h2>{domainLabels[domain]}</h2>
                </div>
                <span>
                  {domainSkills.filter((skill) => lessonScripts[skill.id]).length} interactive
                </span>
              </div>

              <div className="curriculum-card-grid">
                {domainSkills.map((skill) => {
                  const value = Math.round(mastery[skill.id]?.effectiveMastery ?? 0);
                  const available = Boolean(lessonScripts[skill.id]);
                  const practiceAvailable = supportsPuzzlePractice(skill.id);

                  return (
                    <article
                      className={available ? "curriculum-card" : "curriculum-card unavailable"}
                      key={skill.id}
                    >
                      <div className="curriculum-card-top">
                        <div className="curriculum-piece" aria-hidden="true">
                          {domain === "tactics" ? "♞" : domain === "endgames" ? "♔" : "♟"}
                        </div>
                        <span className="mastery-state">{masteryLabel(value)}</span>
                      </div>

                      <h3>{skill.title}</h3>
                      <p>{skill.description}</p>

                      <div className="curriculum-progress">
                        <div>
                          <span>Mastery</span>
                          <strong>{value}%</strong>
                        </div>
                        <div className="track">
                          <i style={{ width: `${value}%` }} />
                        </div>
                      </div>

                      {available || practiceAvailable ? (
                        <div className="curriculum-actions">
                          {available && (
                            <button
                              className="curriculum-start"
                              type="button"
                              onClick={() => onStartLesson(skill.id)}
                            >
                              Study <ChevronRight size={16} />
                            </button>
                          )}
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
                          <LockKeyhole size={14} /> Content expansion
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
