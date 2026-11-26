/** @jsxImportSource preact */
// Reusable text-based numeric input with local draft state while focused so mobile & desktop
// users can freely clear fields, type `-`, decimal `.` or `,`, or partial digits with zero
// snap-back or cursor jump. Commits live only on complete in-range numbers; clamps & announces
// on blur/Enter; cancels draft on Escape without closing parent dialogs.
import { useEffect, useRef, useState } from 'preact/hooks';
import { pageLang, T } from '../../strings.ts';
import { fmtNum, normalizeNumericInput } from './ns-helpers.ts';

export interface NumericFieldProps {
  id: string;
  class?: string;
  value: number | null;
  min: number;
  max: number;
  allowDecimal?: boolean;
  allowNegative?: boolean;
  /** When true, clearing the field and blurring commits `null` (resetting the optional override). */
  optional?: boolean;
  /** For optional fields, whether an explicit override is currently active (so Escape reverts unedited fields back to null). */
  isEdited?: boolean;
  /** Explicit inputMode; omit for signed fields so iOS Safari keeps the minus `-` key accessible. */
  inputMode?: 'numeric' | 'decimal';
  /** Unit suffix for the clamped-value status note (e.g. '°C', 'm²', 'm', '°', 'd'). */
  unit?: string;
  /** Incrementing or changing this key (e.g. on Reset, Reset all, or location change) clears draft & clamp note. */
  resetKey?: string | number;
  onCommit: (next: number | null) => void;
}

function isCompleteNumeric(norm: string, allowNegative: boolean, allowDecimal: boolean): boolean {
  if (!norm) return false;
  if (allowNegative && allowDecimal) return /^-?\d+(?:\.\d+)?$/.test(norm);
  if (!allowNegative && allowDecimal) return /^\d+(?:\.\d+)?$/.test(norm);
  if (allowNegative && !allowDecimal) return /^-?\d+$/.test(norm);
  return /^\d+$/.test(norm);
}

export function NumericField({
  id,
  class: className = 'tuner-input',
  value,
  min,
  max,
  allowDecimal = false,
  allowNegative = false,
  optional = false,
  isEdited = false,
  inputMode,
  unit,
  resetKey,
  onCommit,
}: NumericFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [clampNote, setClampNote] = useState<string | null>(null);
  const startValRef = useRef<number | null>(value);
  const startedEditedRef = useRef<boolean>(isEdited);
  const didLiveCommitRef = useRef<boolean>(false);

  useEffect(() => {
    setDraft(null);
    setClampNote(null);
    didLiveCommitRef.current = false;
  }, [resetKey]);

  const displayed = draft !== null ? draft : (value != null && Number.isFinite(value) ? String(value) : '');

  function handleFocus() {
    if (draft === null) {
      startValRef.current = value;
      startedEditedRef.current = isEdited;
      didLiveCommitRef.current = false;
    }
  }

  function handleInput(e: Event) {
    if (draft === null) {
      startValRef.current = value;
      startedEditedRef.current = isEdited;
      didLiveCommitRef.current = false;
    }
    const raw = (e.currentTarget as HTMLInputElement).value;
    setDraft(raw);
    if (clampNote) setClampNote(null);
    const norm = normalizeNumericInput(raw, pageLang(), allowDecimal);
    if (!isCompleteNumeric(norm, allowNegative, allowDecimal)) return;
    const parsed = Number(norm);
    if (!Number.isFinite(parsed)) return;
    if (parsed < min || parsed > max) return;
    const rawCommit = allowDecimal ? Math.round(parsed * 10) / 10 : Math.round(parsed);
    const committed = rawCommit === 0 ? 0 : rawCommit;
    didLiveCommitRef.current = true;
    onCommit(committed);
  }

  function finalizeDraft() {
    if (draft === null) return;
    didLiveCommitRef.current = false;
    const norm = normalizeNumericInput(draft, pageLang(), allowDecimal);
    if (norm === '') {
      setDraft(null);
      setClampNote(null);
      if (optional) onCommit(null);
      return;
    }
    const parsed = Number(norm);
    if (!Number.isFinite(parsed)) {
      setDraft(null);
      setClampNote(null);
      return;
    }
    const rounded = allowDecimal ? Math.round(parsed * 10) / 10 : Math.round(parsed);
    const rawClamped = Math.max(min, Math.min(max, rounded));
    const clamped = rawClamped === 0 ? 0 : rawClamped;
    if (clamped !== rounded) {
      const numText = fmtNum(clamped, allowDecimal ? 1 : 0);
      setClampNote(T('ns.land.clampedUsed', { val: unit ? `${numText} ${unit}` : numText }));
    } else {
      setClampNote(null);
    }
    setDraft(null);
    onCommit(clamped);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      finalizeDraft();
      return;
    }
    if (e.key === 'Escape' && draft !== null) {
      e.preventDefault();
      e.stopPropagation();
      setDraft(null);
      setClampNote(null);
      if (didLiveCommitRef.current) {
        didLiveCommitRef.current = false;
        onCommit(optional && !startedEditedRef.current ? null : startValRef.current);
      }
    }
  }

  return (
    <>
      <input
        id={id}
        class={className}
        type="text"
        inputMode={inputMode}
        autocomplete="off"
        spellcheck={false}
        value={displayed}
        onFocus={handleFocus}
        onInput={handleInput}
        onBlur={finalizeDraft}
        onKeyDown={handleKeyDown}
      />
      {clampNote && (
        <span class="small muted" role="status" data-clamp-note={id}>
          {clampNote}
        </span>
      )}
    </>
  );
}
