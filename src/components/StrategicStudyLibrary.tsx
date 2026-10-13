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
  const [kind, setKind] = useState<"defense" | "strategy" | "endgame">("defense");
  const [choice, setChoice] = useState("");
  const group = (p: CalculationPosition) => p.endgameDecisionStudy ? "endgame" :
    p.prophylaxisStudy ? "defense" : "strategy";
  const selectedItems = positions.filter(p => group(p) === kind);
  const theme = (p: CalculationPosition) => p.endgameDecisionStudy?.family ??
    p.prophylaxisStudy?.theme ??
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
        {(["defense", "strategy", "endgame"] as const).map(value => <button type="button" key={value}
          className={kind === value ? "selected" : ""} aria-pressed={kind === value}
          onClick={() => { setKind(value); setChoice(""); }}>
          {value === "defense" ? "Defense" : value === "strategy" ? "Positional plans" : "Endgame decisions"} ({positions.filter(p => group(p) === value).length})
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
            <span>{p.endgameDecisionStudy ? `Stage ${p.endgameDecisionStudy.stage}/3` : `Position ${i + 1}`}</span><strong>{p.title}</strong>
            <small>{p.endgameDecisionStudy?.transferQuestion ?? p.prophylaxisStudy?.transferQuestion ??
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
