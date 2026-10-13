import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { studyMaterialFor } from "../calculation/studyDelivery";
import type { CalculationPosition } from "../calculation/types";

type SelfMark = "understood" | "needs-review" | null;
interface Entry { response: string; revealed: boolean; mark: SelfMark }
interface Draft { step: number; entries: Entry[] }
interface Props { position: CalculationPosition; storageOwner: string }
const LIMIT = 1200;
function fresh(count: number): Draft {
  return { step: 0, entries: Array.from({ length: count }, () => ({ response: "", revealed: false, mark: null })) };
}
function storageKey(owner: string, id: string) {
  return "chess:p107:study-draft:" + encodeURIComponent(owner) + ":" + encodeURIComponent(id);
}
function restore(owner: string, id: string, count: number): Draft {
  const empty = fresh(count);
  if (!owner) return empty;
  try {
    const raw = sessionStorage.getItem(storageKey(owner, id));
    if (!raw || raw.length > 15000) return empty;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return empty;
    const v = data as { version?: number; id?: string; saved?: number; step?: number; entries?: Entry[] };
    if (v.version !== 1 || v.id !== id || typeof v.saved !== "number" ||
        v.saved > Date.now() + 60000 || Date.now() - v.saved > 86400000 ||
        !Array.isArray(v.entries) || v.entries.length !== count) return empty;
    return {
      step: typeof v.step === "number" && Number.isInteger(v.step) && v.step >= 0 && v.step < count ? v.step : 0,
      entries: v.entries.map(item => ({
        response: typeof item?.response === "string" ? item.response.slice(0, LIMIT) : "",
        revealed: item?.revealed === true,
        mark: item?.mark === "understood" || item?.mark === "needs-review" ? item.mark : null,
      })),
    };
  } catch { return empty; }
}
export function CalculationStudyPanel({ position, storageOwner }: Props) {
  const material = useMemo(() => studyMaterialFor(position), [position]);
  const count = material?.questions.length ?? 0;
  const [draft, setDraft] = useState(() => restore(storageOwner, position.id, count));
  useEffect(() => {
    if (!storageOwner || !count) return;
    try {
      sessionStorage.setItem(storageKey(storageOwner, position.id), JSON.stringify({
        version: 1, id: position.id, saved: Date.now(), ...draft,
      }));
    } catch { /* Quota/private-mode failures must not block learning. */ }
  }, [storageOwner, position.id, draft, count]);
  if (!material || !count) return null;
  const index = Math.min(draft.step, count - 1);
  const exercise = material.questions[index];
  const entry = draft.entries[index];
  const compared = draft.entries.filter(value => value.revealed).length;
  const marked = draft.entries.filter(value => value.mark).length;
  function update(patch: Partial<Entry>) {
    setDraft(previous => ({ ...previous, entries: previous.entries.map((value, i) =>
      i === index ? { ...value, ...patch } : value) }));
  }
  function go(step: number) { setDraft(previous => ({ ...previous, step })); }
  function clear() {
    try { sessionStorage.removeItem(storageKey(storageOwner, position.id)); } catch { /* ignored */ }
    setDraft(fresh(count));
  }
  return (
    <section className="calculation-study" aria-label="Independent study">
      <header className="calculation-study-header">
        <div><p className="eyebrow">INDEPENDENT POSITION STUDY · UNSCORED</p>
          <h3>{material.theme}</h3>
          <p>Answer from the board before revealing the authored model. These self-checks
            do not change verified chess mastery or award solved positions.</p></div>
        <span>{compared}/{count} compared</span>
      </header>
      <nav className="calculation-study-tabs" aria-label="Questions">
        {material.questions.map((question, i) => (
          <button type="button" key={i} className={i === index ? "selected" : ""}
            aria-current={i === index ? "step" : undefined}
            aria-label={`Question ${i + 1}: ${question.prompt}`}
            onClick={() => go(i)}>{i + 1}{draft.entries[i].mark ? "✓" : ""}</button>
        ))}
      </nav>
      <div className="calculation-study-question">
        <strong>Question {index + 1} / {count}</strong>
        <p>{exercise.prompt}</p>
        <label htmlFor="p107-study-answer">Your independent explanation</label>
        <textarea id="p107-study-answer" rows={4} maxLength={LIMIT}
          value={entry.response} placeholder="Describe the concrete move, opponent's response and reason."
          aria-describedby="p107-study-hint"
          onChange={event => update({ response: event.target.value, revealed: false, mark: null })}/>
        <small id="p107-study-hint">Session-only draft · {entry.response.length}/{LIMIT} characters</small>
        {!entry.revealed && <button type="button" className="secondary"
          disabled={entry.response.trim().length < 8}
          onClick={() => update({ revealed: true })}>Compare with model answer</button>}
        {entry.revealed && <section className="calculation-study-feedback" aria-live="polite">
          <strong>Authored model answer</strong><p>{exercise.answer}</p>
          {exercise.repair && <div className="calculation-study-repair">
            <strong>Specific misconception / repair</strong><p>{exercise.repair}</p>
          </div>}
          <div className="calculation-study-assessment" role="group" aria-label="Self-assessment">
            <button type="button" aria-pressed={entry.mark === "needs-review"}
              className={entry.mark === "needs-review" ? "selected" : ""}
              onClick={() => update({ mark: "needs-review" })}>Needs another attempt</button>
            <button type="button" aria-pressed={entry.mark === "understood"}
              className={entry.mark === "understood" ? "selected" : ""}
              onClick={() => update({ mark: "understood" })}>Understood</button>
          </div>
        </section>}
      </div>
      <footer className="calculation-study-footer">
        <button type="button" className="secondary" disabled={index === 0}
          onClick={() => go(index - 1)}><ChevronLeft size={15}/> Previous</button>
        <span role="status">{marked}/{count} self-assessed</span>
        <button type="button" className="secondary" disabled={index === count - 1}
          onClick={() => go(index + 1)}>Next <ChevronRight size={15}/></button>
      </footer>
      {(position.defensiveStudy?.variations.length || material.reflection) && (
        <details className="calculation-study-branches">
          <summary>Authored defensive alternatives & reflection</summary>
          <p>Reference branches are instructional and are not unique-best-move certificates.</p>
          {position.defensiveStudy?.variations.map((variant, i) => (
            <article key={i}>
              <strong>{variant.label}</strong>
              <code>{variant.moves.join(" ")}</code>
              <p>{variant.explanation}</p>
            </article>
          ))}
          {material.reflection && <p>{material.reflection}</p>}
        </details>
      )}
      <button type="button" className="calculation-study-clear" onClick={clear}>
        <RotateCcw size={14}/> Clear written draft</button>
    </section>
  );
}
