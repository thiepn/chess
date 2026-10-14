import { useState } from "react";
import type { CalculationPosition } from "../calculation/types";
import { sourceStudyKind, sourceStudyTheme } from "../calculation/studySkillAlignment";
import { skillById } from "../domain/curriculum";

interface Props {
  positions: CalculationPosition[];
  loading: boolean;
  failedCount: number;
  onRetry: () => void;
  onStart: (position: CalculationPosition, focusSkillId?: string) => void;
}

const categories = [
  ["prophylaxisStudy", "Prevention and threats"],
  ["strategicImbalanceStudy", "Positional plans"],
  ["endgameDecisionStudy", "Endgame decisions"],
  ["pawnStructureStudy", "Pawn structures"],
  ["pieceCoordinationStudy", "Piece coordination"],
  ["kingAttackStudy", "King attacks"],
  ["defensiveTechniqueStudy", "Active defense"],
  ["openingTransitionStudy", "Opening transitions"],
] as const;

export function StrategicStudyLibrary({ positions, loading, failedCount, onRetry, onStart }: Props) {
  const [choice, setChoice] = useState<string>(categories[0][0]);
  const [topic, setTopic] = useState("");
  const [requestedSkill, setRequestedSkill] = useState("");
  const grouped = positions.filter(p => sourceStudyKind(p) === choice);
  const groups = [...new Set(grouped.map(sourceStudyTheme))].filter(Boolean);
  const selected = groups.includes(topic) ? topic : groups[0] ?? "";
  const topical = grouped.filter(p => sourceStudyTheme(p) === selected);
  const skills = [...new Set(topical.flatMap(p => p.skillIds))]
    .filter(id => !!skillById[id] && !id.startsWith("calculation."));
  const focusSkill = skills.includes(requestedSkill) ? requestedSkill : "";
  const visible = focusSkill ? topical.filter(p => p.skillIds.includes(focusSkill)) : topical;

  return <section className="strategic-library" aria-label="Unscored chess studies">
    <p className="eyebrow">POSITION STUDY · UNSCORED</p>
    <h2>Calculate, defend, and compare the plan</h2>
    <p>Original legal teaching lines and independent questions; not scored or engine-certified best moves.</p>
    <label htmlFor="study-family">Study subject</label>
    <select id="study-family" value={choice}
      onChange={event => { setChoice(event.target.value); setTopic(""); setRequestedSkill(""); }}>
      {categories.map(([kind, name]) => <option value={kind} key={kind}>
        {name} ({positions.filter(p => sourceStudyKind(p) === kind).length})
      </option>)}
    </select>
    {selected ? <>
      <label htmlFor="strategy-theme">Study theme</label>
      <select id="strategy-theme" value={selected}
        onChange={event => { setTopic(event.target.value); setRequestedSkill(""); }}>
        {groups.map(group => <option key={group} value={group}>{group}</option>)}
      </select>
      {skills.length > 1 && <>
        <label htmlFor="strategy-skill">Practice a particular skill</label>
        <select id="strategy-skill" value={focusSkill}
          onChange={event => setRequestedSkill(event.target.value)}>
          <option value="">All linked skills</option>
          {skills.map(id => <option value={id} key={id}>{skillById[id].title}</option>)}
        </select>
      </>}
      <p role="status">{visible.length} original, unscored studies for this selection</p>
      <div className="strategic-library-list">
        {visible.map((p, i) =>
          <button type="button" key={p.id} onClick={() => onStart(p, focusSkill || undefined)}
            aria-label={`Open unscored study ${p.title}`}>
            <span>{p.endgameDecisionStudy
              ? `Stage ${p.endgameDecisionStudy.stage}/${p.endgameDecisionStudy.stageCount}`
              : `Position ${i + 1}`}</span>
            <strong>{p.title}</strong>
            <small>{p.endgameDecisionStudy?.transferQuestion ??
              p.prophylaxisStudy?.transferQuestion ??
              p.strategicImbalanceStudy?.transferQuestion ??
              p.openingTransitionStudy?.transferQuestion ??
              p.prompt}</small>
          </button>)}
      </div>
    </> : <p role="status">{loading ? "Loading study sources…" : "No verified studies in this subject yet."}</p>}
    {failedCount > 0 && <button type="button" className="secondary" onClick={onRetry}>
      Retry {failedCount} missing {failedCount === 1 ? "file" : "files"}
    </button>}
  </section>;
}
