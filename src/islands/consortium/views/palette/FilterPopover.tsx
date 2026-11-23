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
        class={`ct-filter-btn${count > 0 ? ' is-active' : ''}`}
        data-filter-trigger
        aria-expanded={open ? 'true' : 'false'}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">⚙</span>
        <span>{count > 0 ? `${triggerLabel} (${count})` : triggerLabel}</span>
      </button>

      {open && (
        <div class="ct-filter-pop" data-filter-popover role="dialog" aria-label={triggerLabel}>
          <div class="ct-filter-grid">
            <div class="ct-filter-field">
              <label for={`${uid}-sun`}>{T('studio.filterSun')}</label>
              <select
                id={`${uid}-sun`}
                value={value.sun}
                onChange={(e) => onChange({ ...value, sun: (e.currentTarget as HTMLSelectElement).value as Stratum | 'all' })}
              >
                <option value="all">All sun tiers</option>
                {SUN_TIER_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>

            <div class="ct-filter-field">
              <label for={`${uid}-stage`}>{T('studio.filterStage')}</label>
              <select
                id={`${uid}-stage`}
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

            <div class="ct-filter-field">
              <label for={`${uid}-role`}>{T('studio.filterRole')}</label>
              <select
                id={`${uid}-role`}
                value={value.role}
                onChange={(e) => onChange({ ...value, role: (e.currentTarget as HTMLSelectElement).value as JobId | 'all' })}
              >
                <option value="all">All roles</option>
                {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div class="ct-filter-checks">
            <label class="ct-filter-check">
              <input
                type="checkbox"
                checked={value.lowChill}
                onChange={(e) => onChange({ ...value, lowChill: (e.currentTarget as HTMLInputElement).checked })}
              />
              <span>Low chill (mild-winter friendly)</span>
            </label>
            <label class="ct-filter-check">
              <input
                type="checkbox"
                checked={value.clayWet}
                onChange={(e) => onChange({ ...value, clayWet: (e.currentTarget as HTMLInputElement).checked })}
              />
              <span>Clay / wet-soil tolerant</span>
            </label>
            <label class="ct-filter-check">
              <input
                type="checkbox"
                checked={value.extremeHardy}
                onChange={(e) => onChange({ ...value, extremeHardy: (e.currentTarget as HTMLInputElement).checked })}
              />
              <span>⚡ Extreme-hardy (cold, heat, or drought)</span>
            </label>
          </div>

          <div class="ct-filter-foot">
            <button
              type="button"
              class="link-button ct-link"
              onClick={() => onChange({ ...EMPTY_STUDIO_FILTERS })}
            >
              Reset
            </button>
            <button type="button" class="button button-secondary ct-small" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
