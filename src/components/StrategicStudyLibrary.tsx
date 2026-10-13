import { useState } from "react";
import type { CalculationPosition } from "../calculation/types";

interface Props {
  positions: CalculationPosition[];
  loading: boolean;
  failedCount: number;
  onRetry: () => void;
  onStart: (position: CalculationPosition) => void;
}

/** Reuse original course assets; this selector never records learner grades. */
export function StrategicStudyLibrary({ positions, loading, failedCount, onRetry, onStart }: Props) {
  const [kind, setKind] = useState<"defense" | "strategy">("defense");
  const [choice, setChoice] = useState("");
  const filtered = positions.filter(p => (kind === "defense") === !!p.prophylaxisStudy);
  const theme = (p: CalculationPosition) => p.prophylaxisStudy?.theme ??
    p.strategicImbalanceStudy?.theme ?? "";
  const themes = [...new Set(filtered.map(theme))];
  const selected = themes.includes(choice) ? choice : themes[0];
  const visible = filtered.filter(p => theme(p) === selected);
  return (
    <section className="strategic-library" aria-label="Positional and preventive study">
      <p className="eyebrow">ORIGINAL STUDIES · UNSCORED</p>
      <h2>Anticipate the opponent</h2>
      <p>Calculate both sides, compare defensive alternatives and explain the plan.</p>
      <div className="strategic-library-categories" role="group" aria-label="Study category">
        {(["defense", "strategy"] as const).map(item => (
          <button type="button" key={item} className={kind === item ? "selected" : ""}
            aria-pressed={kind === item}
            onClick={() => { setKind(item); setChoice(""); }}>
            {item === "defense" ? "Defense & prevention" : "Positional plans"} ({positions.filter(p =>
              Boolean(p.prophylaxisStudy) === (item === "defense")).length})
          </button>
        ))}
      </div>
      {selected ? <>
        <label htmlFor="strategy-theme">Specific theme</label>
        <select id="strategy-theme" value={selected} onChange={e => setChoice(e.target.value)}>
          {themes.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        <p role="status">{filtered.length} sourced studies · {visible.length} in this theme</p>
        <div className="strategic-library-list">
          {visible.map((p, i) => <button type="button" key={p.id}
            aria-label={`Open unscored study ${p.title}`} onClick={() => onStart(p)}>
            <span>Position {i + 1}</span>
            <strong>{p.title}</strong>
            <small>{p.prophylaxisStudy?.transferQuestion ??
              p.strategicImbalanceStudy?.transferQuestion}</small>
          </button>)}
        </div>
      </> : <p role="status">{loading ? "Loading chess studies…" : "Study source unavailable."}</p>}
      {failedCount > 0 && <button type="button" className="secondary" onClick={onRetry}>
        Retry {failedCount} missing source {failedCount === 1 ? "file" : "files"}
      </button>}
    </section>
  );
}
