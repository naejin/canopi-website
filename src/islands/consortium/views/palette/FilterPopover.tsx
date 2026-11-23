/** @jsxImportSource preact */
// Verbatim v14 Multi-Select Filter Popover (.palette-filter-popover, .pfp-grid, .pfp-foot, .active-chip-rm).
// Every group (Site & Climate Fit, Preferred Sun, Ecological Role, Succession Stage, Grower Traits) is multi-select.
import { useEffect, useRef, useState } from 'preact/hooks';
import { SUCCESSION_STAGES_6, type JobId, type Stratum } from '../../../../lib/consortium/index.ts';
import { T } from '../../strings.ts';
import {
  activeFilterCount,
  EMPTY_STUDIO_FILTERS,
  FIT_OPTIONS,
  ROLE_OPTIONS,
  SUN_TIER_OPTIONS,
  type FitFilter,
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

function toggleIn<V>(arr: readonly V[], item: V): V[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export type FilterUpdater = StudioFilterState | ((prev: StudioFilterState) => StudioFilterState);

export interface FilterPanelProps {
  value: StudioFilterState;
  onChange: (next: FilterUpdater) => void;
  onDone: () => void;
  shownCount?: number;
  totalCount?: number;
  showFit?: boolean;
}

export function FilterPanel({ value, onChange, onDone, shownCount, totalCount, showFit = true }: FilterPanelProps) {
  const count = activeFilterCount(value);
  return (
    <div class="palette-filter-popover" data-filter-popover role="region" aria-label="Filter plants">
      <div class="pfp-grid">
        {showFit && (
          <div>
            <div class="fp-label">Site &amp; Climate Fit</div>
            <div class="chip-row">
              {FIT_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  class="filter-chip"
                  aria-pressed={value.fits.includes(o.id) ? 'true' : 'false'}
                  onClick={() => onChange((prev) => ({ ...prev, fits: toggleIn<FitFilter>(prev.fits, o.id) }))}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div class="fp-label">Preferred Sun Exposure</div>
          <div class="chip-row">
            {SUN_TIER_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                class="filter-chip"
                aria-pressed={value.suns.includes(o.id) ? 'true' : 'false'}
                onClick={() => onChange((prev) => ({ ...prev, suns: toggleIn<Stratum>(prev.suns, o.id) }))}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div class="fp-label">Ecological Role</div>
          <div class="chip-row">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                class="filter-chip"
                aria-pressed={value.roles.includes(r.id) ? 'true' : 'false'}
                onClick={() => onChange((prev) => ({ ...prev, roles: toggleIn<JobId>(prev.roles, r.id) }))}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div class="fp-label">Succession Stage (When it stands)</div>
          <div class="chip-row">
            {SUCCESSION_STAGES_6.map((st, idx) => (
              <button
                key={st.id}
                type="button"
                class="filter-chip"
                aria-pressed={value.stages.includes(idx) ? 'true' : 'false'}
                onClick={() => onChange((prev) => ({ ...prev, stages: toggleIn<number>(prev.stages, idx) }))}
              >
                {st.name} · {st.time}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div class="fp-label">Special &amp; Grower Traits</div>
          <div class="chip-row">
            <button
              type="button"
              class="filter-chip"
              aria-pressed={value.winterPlantable ? 'true' : 'false'}
              onClick={() => onChange((prev) => ({ ...prev, winterPlantable: !prev.winterPlantable }))}
            >
              ❄ Winter-plantable
            </button>
            <button
              type="button"
              class="filter-chip"
              aria-pressed={value.lowChill ? 'true' : 'false'}
              onClick={() => onChange((prev) => ({ ...prev, lowChill: !prev.lowChill }))}
            >
              Low chill (mild winters)
            </button>
            <button
              type="button"
              class="filter-chip"
              aria-pressed={value.clayWet ? 'true' : 'false'}
              onClick={() => onChange((prev) => ({ ...prev, clayWet: !prev.clayWet }))}
            >
              Clay / wet-soil tolerant
            </button>
            <button
              type="button"
              class="filter-chip"
              aria-pressed={value.extremeHardy ? 'true' : 'false'}
              onClick={() => onChange((prev) => ({ ...prev, extremeHardy: !prev.extremeHardy }))}
            >
              ⚡ Extreme-hardy
            </button>
          </div>
        </div>
      </div>

      <div class="pfp-foot">
        <span>
          {shownCount != null && totalCount != null ? (
            <>Showing <strong>{shownCount}</strong> of <strong>{totalCount}</strong> plants</>
          ) : (
            <>{count > 0 ? `${count} active filter${count === 1 ? '' : 's'}` : 'Select any combination of filters'}</>
          )}
        </span>
        <div style="display:flex; align-items:center; gap:8px;">
          {count > 0 && (
            <button type="button" class="link-btn" onClick={() => onChange({ ...EMPTY_STUDIO_FILTERS })}>
              Clear all
            </button>
          )}
          <button type="button" class="btn btn-xs btn-primary" onClick={onDone}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function ActiveFilterChips({ value, onChange }: { value: StudioFilterState; onChange: (next: StudioFilterState) => void }) {
  const chips: { key: string; label: string; remove: () => void }[] = [];
  for (const id of value.fits) {
    const lbl = FIT_OPTIONS.find((x) => x.id === id)?.label ?? id;
    chips.push({ key: `fit-${id}`, label: lbl, remove: () => onChange({ ...value, fits: value.fits.filter((x) => x !== id) }) });
  }
  for (const id of value.suns) {
    const lbl = SUN_TIER_OPTIONS.find((x) => x.id === id)?.label ?? id;
    chips.push({ key: `sun-${id}`, label: lbl, remove: () => onChange({ ...value, suns: value.suns.filter((x) => x !== id) }) });
  }
  for (const id of value.roles) {
    const lbl = ROLE_OPTIONS.find((x) => x.id === id)?.label ?? id;
    chips.push({ key: `role-${id}`, label: lbl, remove: () => onChange({ ...value, roles: value.roles.filter((x) => x !== id) }) });
  }
  for (const idx of value.stages) {
    const st = SUCCESSION_STAGES_6[idx];
    if (st) chips.push({ key: `st-${idx}`, label: st.name, remove: () => onChange({ ...value, stages: value.stages.filter((x) => x !== idx) }) });
  }
  if (value.winterPlantable) chips.push({ key: 'win', label: '❄ Winter-plantable', remove: () => onChange({ ...value, winterPlantable: false }) });
  if (value.lowChill) chips.push({ key: 'chill', label: 'Low chill', remove: () => onChange({ ...value, lowChill: false }) });
  if (value.clayWet) chips.push({ key: 'clay', label: 'Clay / wet-soil', remove: () => onChange({ ...value, clayWet: false }) });
  if (value.extremeHardy) chips.push({ key: 'hardy', label: '⚡ Extreme-hardy', remove: () => onChange({ ...value, extremeHardy: false }) });

  if (!chips.length) return null;
  return (
    <div class="active-filters-bar" data-active-filters>
      {chips.map((c) => (
        <button key={c.key} type="button" class="active-chip-rm" onClick={c.remove}>
          {c.label} ✕
        </button>
      ))}
      <button type="button" class="link-btn" style="font-size:12.5px;" onClick={() => onChange({ ...EMPTY_STUDIO_FILTERS })}>
        Clear all
      </button>
    </div>
  );
}

export interface FilterPopoverProps {
  value: StudioFilterState;
  onChange: (next: FilterUpdater) => void;
  label?: string;
  open?: boolean;
  onToggle?: () => void;
}

export function FilterPopover({ value, onChange, label, open: controlledOpen, onToggle }: FilterPopoverProps) {
  const triggerLabel = label ?? T('studio.filters');
  const [internalOpen, setInternalOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const count = activeFilterCount(value);

  useDismissOnOutside(!isControlled && internalOpen, wrapRef, () => setInternalOpen(false));

  return (
    <div ref={wrapRef} class="ct-filter-wrap">
      <button
        type="button"
        class={`filter-trigger-btn${count > 0 ? ' has-active' : ''}`}
        data-filter-trigger
        aria-expanded={isOpen ? 'true' : 'false'}
        onClick={() => (onToggle ? onToggle() : setInternalOpen((v) => !v))}
      >
        <span aria-hidden="true">⚙</span>
        <span>{count > 0 ? `${triggerLabel} (${count})` : triggerLabel}</span>
        <span aria-hidden="true">▾</span>
      </button>

      {!isControlled && internalOpen && (
        <div class="ct-filter-panel" role="dialog" aria-label={triggerLabel}>
          <FilterPanel
            value={value}
            onChange={onChange}
            onDone={() => setInternalOpen(false)}
            showFit={false}
          />
        </div>
      )}
    </div>
  );
}
