import { useMemo, useState } from "react";
import type { CalculationPosition } from "../calculation/types";

interface Props {
  positions: CalculationPosition[];
  loading: boolean;
  failedCount: number;
  onRetry: () => void;
  onStart: (position: CalculationPosition) => void;
}
type StudyFamily = "strategy" | "defense";
function family(position: CalculationPosition): StudyFamily {
  return position.prophylaxisStudy ? "defense" : "strategy";
}
function theme(position: CalculationPosition): string {
  return position.prophylaxisStudy?.theme ??
    position.strategicImbalanceStudy?.theme ?? "Other study";
}
function transfer(position: CalculationPosition): string {
  return position.prophylaxisStudy?.transferQuestion ??
    position.strategicImbalanceStudy?.transferQuestion ?? position.prompt;
}

/** P109–P110: owner-safe discovery of original, unscored calculation assets. */
export function StrategicStudyLibrary({
  positions, loading, failedCount, onRetry, onStart,
}: Props) {
  const [chosenFamily, setFamily] = useState<StudyFamily>("defense");
  const [chosenTheme, setTheme] = useState("");
  const category = useMemo(() =>
    positions.filter(item => family(item) === chosenFamily), [positions, chosenFamily]);
  const themes = [...new Set(category.map(theme))];
  const selectedTheme = themes.includes(chosenTheme) ? chosenTheme : themes[0];
  const visible = category.filter(p => theme(p) === selectedTheme);
  const strategyCount = positions.filter(p => family(p) === "strategy").length;
  const defenseCount = positions.length - strategyCount;

  return (
    <section className="strategic-library" aria-label="Strategy and prophylaxis studies">
      <p className="eyebrow">POSITION STUDY · ORIGINAL SOURCES · UNSCORED</p>
      <h2>Plan ahead of your opponent</h2>
      <p>Choose a board, predict the opponent's resource, calculate their response
        and compare the authored alternatives without creating a mastery grade.</p>
      <div className="strategic-library-categories" role="group" aria-label="Choose study type">
        <button type="button" className={chosenFamily === "defense" ? "selected" : ""}
          aria-pressed={chosenFamily === "defense"} onClick={() => { setFamily("defense"); setTheme(""); }}>
          Defense & prevention ({defenseCount})
        </button>
        <button type="button" className={chosenFamily === "strategy" ? "selected" : ""}
          aria-pressed={chosenFamily === "strategy"} onClick={() => { setFamily("strategy"); setTheme(""); }}>
          Positional plans ({strategyCount})
        </button>
      </div>
      {themes.length ? <>
        <label htmlFor="strategy-theme">Specific theme</label>
        <select id="strategy-theme" value={selectedTheme}
          onChange={event => setTheme(event.target.value)}>
          {themes.map(name => <option value={name} key={name}>{name}</option>)}
        </select>
        <p role="status">{category.length} available studies · {visible.length} in this theme</p>
        <div className="strategic-library-list">
          {visible.map((position, index) => (
            <button type="button" key={position.id}
              aria-label={`Open unscored study ${position.title}`}
              onClick={() => onStart(position)}>
              <span>Position {index + 1} of {visible.length}</span>
              <strong>{position.title}</strong>
              <small>{transfer(position)}</small>
            </button>
          ))}
        </div>
      </> : <p role="status">{loading
        ? "Loading study source files; this category is not yet ready."
        : "No source-qualified positions available for this category."}</p>}
      {failedCount > 0 && <button type="button" className="secondary" onClick={onRetry}>
        Retry {failedCount} unavailable P109–P110 study {failedCount === 1 ? "file" : "files"}
      </button>}
    </section>
  );
}
