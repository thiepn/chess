import { useMemo, useState } from "react";
import type { CalculationPosition } from "../calculation/types";

interface Props {
  positions: CalculationPosition[];
  loading: boolean;
  failedCount: number;
  onRetry: () => void;
  onStart: (position: CalculationPosition) => void;
}

/** Original calculation catalog discovery; no duplicate progress or training engine. */
export function StrategicStudyLibrary({ positions, loading, failedCount, onRetry, onStart }: Props) {
  const groups = useMemo(() => [...new Set(positions.map(p =>
    p.strategicImbalanceStudy?.theme).filter((theme): theme is string => !!theme))], [positions]);
  const [theme, setTheme] = useState("");
  const chosen = groups.includes(theme) ? theme : groups[0];
  const visible = positions.filter(p => p.strategicImbalanceStudy?.theme === chosen);
  return (
    <section className="strategic-library" aria-label="Positional imbalance studies">
      <p className="eyebrow">P109 · STRATEGIC STUDIES</p>
      <h2>Choose a plan to investigate</h2>
      <p>Position-specific questions and defensive branches. Authored examples are
        unscored, not engine-certified solutions.</p>
      {groups.length > 0 ? (
        <>
          <label htmlFor="strategy-theme">Strategic theme</label>
          <select id="strategy-theme" value={chosen} onChange={event => setTheme(event.target.value)}>
            {groups.map(name => <option value={name} key={name}>{name}</option>)}
          </select>
          <p className="strategic-library-count">{positions.length} sourced studies · {visible.length} in this theme</p>
          <div className="strategic-library-list">
            {visible.map((position, index) => (
              <button type="button" key={position.id}
                onClick={() => onStart(position)}
                aria-label={`Start unscored study: ${position.title}`}>
                <span>Study {index + 1}</span>
                <strong>{position.title}</strong>
                <small>{position.strategicImbalanceStudy?.transferQuestion}</small>
              </button>
            ))}
          </div>
        </>
      ) : <div role="status">
        <p>{loading
          ? "Loading strategic positions from original chess-study assets…"
          : "No source-qualified strategic position available."}</p>
        {failedCount > 0 && (
          <button type="button" className="secondary" onClick={onRetry}>
            Retry {failedCount} unavailable strategic source {failedCount === 1 ? "file" : "files"}
          </button>
        )}
      </div>}
    </section>
  );
}
