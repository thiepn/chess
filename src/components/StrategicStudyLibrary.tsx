import { useState } from "react";
import type { CalculationPosition } from "../calculation/types";

interface Props {
  positions: CalculationPosition[];
  loading: boolean;
  failedCount: number;
  onRetry: () => void;
  onStart: (position: CalculationPosition) => void;
}
const kind = (p: CalculationPosition) =>
  p.endgameDecisionStudy ? 2 : p.prophylaxisStudy ? 0 : 1;
const theme = (p: CalculationPosition) =>
  p.endgameDecisionStudy?.family ??
  p.prophylaxisStudy?.theme ?? p.strategicImbalanceStudy?.theme ?? "";

export function StrategicStudyLibrary({ positions, loading, failedCount, onRetry, onStart }: Props) {
  const [choice, setChoice] = useState(0);
  const [topic, setTopic] = useState("");
  const matching = positions.filter(p => kind(p) === choice);
  const groups = [...new Set(matching.map(theme))];
  const selected = groups.includes(topic) ? topic : groups[0];
  return <section className="strategic-library" aria-label="Unscored chess studies">
    <p className="eyebrow">POSITION STUDY · UNSCORED</p>
    <h2>Calculate the next decision</h2>
    <div className="strategic-library-categories" role="group" aria-label="Study category">
      {["Defense", "Positional plans", "Endgame decisions"].map((name, i) =>
        <button key={name} type="button" className={choice === i ? "selected" : ""}
          aria-pressed={choice === i} onClick={() => { setChoice(i); setTopic(""); }}>
          {name} ({positions.filter(p => kind(p) === i).length})
        </button>)}
    </div>
    {selected ? <>
      <label htmlFor="strategy-theme">Study theme</label>
      <select id="strategy-theme" value={selected} onChange={e => setTopic(e.target.value)}>
        {groups.map(group => <option key={group}>{group}</option>)}
      </select>
      <p role="status">{matching.length} studies in this category</p>
      <div className="strategic-library-list">
        {matching.filter(p => theme(p) === selected).map((p, i) =>
          <button type="button" key={p.id} onClick={() => onStart(p)}
            aria-label={`Open unscored study ${p.title}`}>
            <span>{p.endgameDecisionStudy
              ? `Stage ${p.endgameDecisionStudy.stage}/3` : `Position ${i + 1}`}</span>
            <strong>{p.title}</strong>
            <small>{p.endgameDecisionStudy?.transferQuestion ??
              p.prophylaxisStudy?.transferQuestion ??
              p.strategicImbalanceStudy?.transferQuestion}</small>
          </button>)}
      </div>
    </> : <p role="status">{loading ? "Loading studies…" : "Study source unavailable."}</p>}
    {failedCount > 0 && <button type="button" className="secondary" onClick={onRetry}>
      Retry {failedCount} missing {failedCount === 1 ? "file" : "files"}
    </button>}
  </section>;
}
