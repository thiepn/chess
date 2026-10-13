import { useState } from "react";
import type { CalculationPosition } from "../calculation/types";

interface Props {
  positions: CalculationPosition[];
  loading: boolean;
  failedCount: number;
  onRetry: () => void;
  onStart: (position: CalculationPosition) => void;
}

/** Discover the original teaching assets; never create another progress authority. */
export function StrategicStudyLibrary({ positions, loading, failedCount, onRetry, onStart }: Props) {
  const themes = [...new Set(positions.map(p => p.strategicImbalanceStudy?.theme).filter(
    (name): name is string => !!name))];
  const [choice, setChoice] = useState("");
  const selected = themes.includes(choice) ? choice : themes[0];
  const visible = positions.filter(p => p.strategicImbalanceStudy?.theme === selected);
  return (
    <section className="strategic-library" aria-label="Positional imbalance studies">
      <p className="eyebrow">P109 · STRATEGY LAB · UNSCORED</p>
      <h2>Choose a strategic problem</h2>
      <p>Original explanations, independent answers and noncooperative defenses.</p>
      {themes.length ? <>
        <label htmlFor="strategy-theme">Strategic theme</label>
        <select id="strategy-theme" value={selected} onChange={event => setChoice(event.target.value)}>
          {themes.map(name => <option key={name}>{name}</option>)}
        </select>
        <p>{positions.length} positions · {visible.length} in this theme</p>
        <div className="strategic-library-list">
          {visible.map((position, index) => <button key={position.id} type="button"
            aria-label={`Open unscored study ${position.title}`} onClick={() => onStart(position)}>
            <span>Study {index + 1}</span><strong>{position.title}</strong>
            <small>{position.strategicImbalanceStudy?.transferQuestion}</small>
          </button>)}
        </div>
      </> : <div role="status">
        <p>{loading ? "Loading source-backed studies…" : "Strategic source unavailable."}</p>
        {failedCount > 0 && <button type="button" className="secondary" onClick={onRetry}>
          Retry {failedCount} missing source {failedCount === 1 ? "file" : "files"}
        </button>}
      </div>}
    </section>
  );
}
