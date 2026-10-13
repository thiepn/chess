import { useState } from "react";
import type { CalculationPosition } from "../calculation/types";

interface Props {
  positions: CalculationPosition[];
  loading: boolean;
  failedCount: number;
  onRetry: () => void;
  onStart: (position: CalculationPosition) => void;
}

export function StrategicStudyLibrary({ positions, loading, failedCount, onRetry, onStart }: Props) {
  const [defense, setDefense] = useState(true);
  const [choice, setChoice] = useState("");
  const selectedItems = positions.filter(p => !!p.prophylaxisStudy === defense);
  const theme = (p: CalculationPosition) => p.prophylaxisStudy?.theme ??
    p.strategicImbalanceStudy?.theme ?? "";
  const themes = [...new Set(selectedItems.map(theme))];
  const current = themes.includes(choice) ? choice : themes[0];
  const visible = selectedItems.filter(p => theme(p) === current);
  return (
    <section className="strategic-library" aria-label="Strategic chess study">
      <p className="eyebrow">POSITION STUDY · UNSCORED</p>
      <h2>Anticipate the opponent</h2>
      <p>Predict threats, calculate resistance, compare plans.</p>
      <div className="strategic-library-categories" role="group" aria-label="Study category">
        {([true, false] as const).map(value => <button type="button" key={String(value)}
          className={defense === value ? "selected" : ""} aria-pressed={defense === value}
          onClick={() => { setDefense(value); setChoice(""); }}>
          {value ? "Defense" : "Positional plans"} ({positions.filter(p =>
            !!p.prophylaxisStudy === value).length})
        </button>)}
      </div>
      {current ? <>
        <label htmlFor="strategy-theme">Study theme</label>
        <select id="strategy-theme" value={current} onChange={e => setChoice(e.target.value)}>
          {themes.map(name => <option key={name}>{name}</option>)}
        </select>
        <p role="status">{selectedItems.length} studies · {visible.length} in this theme</p>
        <div className="strategic-library-list">
          {visible.map((p, i) => <button type="button" key={p.id} onClick={() => onStart(p)}
            aria-label={`Open unscored study ${p.title}`}>
            <span>Position {i + 1}</span><strong>{p.title}</strong>
            <small>{p.prophylaxisStudy?.transferQuestion ??
              p.strategicImbalanceStudy?.transferQuestion}</small>
          </button>)}
        </div>
      </> : <p role="status">{loading ? "Loading studies…" : "No study source available."}</p>}
      {failedCount > 0 && <button type="button" className="secondary" onClick={onRetry}>
        Retry {failedCount} missing source {failedCount === 1 ? "file" : "files"}
      </button>}
    </section>
  );
}
