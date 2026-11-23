/** @jsxImportSource preact */
// Shared Filters / Filters (N) popover (Slice 3.3, v14/v15).
// Shared by My Palette and All Plants rail: Sun tier, 6-stage Succession, Ecological Role,
// plus 3 agronomy filters (Low chill, Clay / wet-soil, Extreme-hardy). Zero native title="...".
import { useEffect, useRef, useState } from 'preact/hooks';
import { SUCCESSION_STAGES_6, type JobId, type Stratum } from '../../../../lib/consortium/index.ts';
import { T } from '../../strings.ts';
import {
  activeFilterCount,
  EMPTY_STUDIO_FILTERS,
  ROLE_OPTIONS,
  SUN_TIER_OPTIONS,
  type StudioFilterState,
} from '../../rules/studio-filters.ts';

export function useDismissOnOutside(active: boolean, ref: { current: HTMLElement | null }, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [active]);
}

export interface FilterPopoverProps {
  value: StudioFilterState;
  onChange: (next: StudioFilterState) => void;
  label?: string;
}

let filterUidSeq = 0;

export function FilterPopover({ value, onChange, label }: FilterPopoverProps) {
  const triggerLabel = label ?? T('studio.filters');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const uidRef = useRef<string>('');
  if (!uidRef.current) uidRef.current = `ct-flt-${++filterUidSeq}`;
  const uid = uidRef.current;
  const count = activeFilterCount(value);

  useDismissOnOutside(open, wrapRef, () => setOpen(false));

  return (
    <div ref={wrapRef} class="ct-filter-wrap">
      <button
        type="button"
        class={`filter-trigger-btn${count > 0 ? ' has-active' : ''}`}
        data-filter-trigger
        aria-expanded={open ? 'true' : 'false'}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">⚙</span>
        <span>{count > 0 ? `${triggerLabel} (${count})` : triggerLabel}</span>
      </button>

      {open && (
        <div class="ct-filter-panel" data-filter-popover role="dialog" aria-label={triggerLabel}>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label class="fp-label" for={`${uid}-sun`}>{T('studio.filterSun')}</label>
              <select
                id={`${uid}-sun`}
                class="field-select"
                value={value.sun}
                onChange={(e) => onChange({ ...value, sun: (e.currentTarget as HTMLSelectElement).value as Stratum | 'all' })}
              >
                <option value="all">All sun tiers</option>
                {SUN_TIER_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>

            <div style="display:flex; flex-direction:column; gap:4px;">
              <label class="fp-label" for={`${uid}-stage`}>{T('studio.filterStage')}</label>
              <select
                id={`${uid}-stage`}
                class="field-select"
                value={String(value.stage)}
                onChange={(e) => {
                  const raw = (e.currentTarget as HTMLSelectElement).value;
                  onChange({ ...value, stage: raw === 'all' ? 'all' : Number(raw) });
                }}
              >
                <option value="all">All 6 stages</option>
                {SUCCESSION_STAGES_6.map((s, idx) => (
                  <option key={s.id} value={String(idx)}>{s.name} ({s.time})</option>
                ))}
              </select>
            </div>

            <div style="display:flex; flex-direction:column; gap:4px;">
              <label class="fp-label" for={`${uid}-role`}>{T('studio.filterRole')}</label>
              <select
                id={`${uid}-role`}
                class="field-select"
                value={value.role}
                onChange={(e) => onChange({ ...value, role: (e.currentTarget as HTMLSelectElement).value as JobId | 'all' })}
              >
                <option value="all">All roles</option>
                {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px; font-size:13px;">
            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
              <input
                type="checkbox"
                checked={value.lowChill}
                onChange={(e) => onChange({ ...value, lowChill: (e.currentTarget as HTMLInputElement).checked })}
              />
              <span>Low chill (mild-winter friendly)</span>
            </label>
            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
              <input
                type="checkbox"
                checked={value.clayWet}
                onChange={(e) => onChange({ ...value, clayWet: (e.currentTarget as HTMLInputElement).checked })}
              />
              <span>Clay / wet-soil tolerant</span>
            </label>
            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
              <input
                type="checkbox"
                checked={value.extremeHardy}
                onChange={(e) => onChange({ ...value, extremeHardy: (e.currentTarget as HTMLInputElement).checked })}
              />
              <span>⚡ Extreme-hardy (cold, heat, or drought)</span>
            </label>
          </div>

          <div class="pfp-foot">
            <button
              type="button"
              class="link-btn"
              onClick={() => onChange({ ...EMPTY_STUDIO_FILTERS })}
            >
              Reset
            </button>
            <button type="button" class="btn btn-xs btn-primary" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
