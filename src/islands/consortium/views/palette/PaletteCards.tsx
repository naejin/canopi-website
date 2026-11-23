/** @jsxImportSource preact */
// My Palette — v14 1:1 Port: Search + Filters + Group + Dark-Pill Cards/List Toggle,
// 3-Layer Editorial Botanical Cards (with sun-tier dot & semantic status), and Compact List.
import { useMemo, useState } from 'preact/hooks';
import { jobsOf, type Taxon } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import {
  openFieldDossier,
  paletteGroupMode,
  paletteViewMode,
  type PaletteGroupMode,
} from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import { T } from '../../strings.ts';
import {
  activityMonthsOf,
  EMPTY_STUDIO_FILTERS,
  formatHeightRange,
  matchesStudioFilters,
  MONTH_INITIALS,
  ROLE_OPTIONS,
  stageSpanOf,
  sunTierLabel,
  sunTierOf,
  type StudioFilterState,
} from '../../rules/studio-filters.ts';
import { FilterPopover } from './FilterPopover.tsx';
import { SunIcon } from './SunIcon.tsx';

const SUN_COLOR: Record<string, string> = {
  emergent: 'var(--sun-full)',
  high: 'var(--sun-mostly)',
  medium: 'var(--sun-part)',
  low: 'var(--sun-shade)',
};

const SUN_CLS: Record<string, string> = {
  emergent: 'sun-full',
  high: 'sun-mostly',
  medium: 'sun-part',
  low: 'sun-shade',
};

function Sparkline({ taxon }: { taxon: Taxon }) {
  const levels = useMemo(() => activityMonthsOf(taxon), [taxon]);
  const isAnnual = taxon.traits.is_annual === true;
  return (
    <span class="mini-spark" role="img" aria-label="12-month activity">
      {MONTH_INITIALS.map((_, i) => {
        const m = i + 1;
        const w = (m <= 3 || m >= 11) && levels[i] !== 'dormant';
        const s = isAnnual ? (m === 3 || m === 4) : (m === 3 || m === 10);
        const b = levels[i] !== 'dormant' && m >= 4 && m <= 6;
        const h = levels[i] === 'peak';
        const any = w || s || b || h;
        return (
          <span key={i} class="ms-col" aria-hidden="true">
            {w && <i class="ms-w" />}
            {s && <i class="ms-s" />}
            {b && <i class="ms-b" />}
            {h && <i class="ms-h" />}
            {!any && <i class="ms-e" />}
          </span>
        );
      })}
    </span>
  );
}

function roleSummary(t: Taxon): string {
  const jobs = jobsOf(t);
  const labels = jobs
    .map((j) => ROLE_OPTIONS.find((r) => r.id === j)?.label)
    .filter(Boolean)
    .slice(0, 2);
  return labels.length ? labels.join(', ') : 'Companion';
}

function verdictMeta(level: string | undefined): { cls: string; icon: string; label: string; key: string } {
  if (level === 'outside') return { cls: 'v-risk', icon: '✕', label: 'At risk', key: 'At risk' };
  if (level === 'look') return { cls: 'v-care', icon: '⚠', label: 'Needs care', key: 'Needs care' };
  return { cls: 'v-fit', icon: '✓', label: 'Thrives', key: 'Thrives' };
}

export function PaletteCards() {
  const members = store.memberTaxa.value;
  const verdicts = store.memberVerdicts.value;
  const sitePh = store.location.value?.lookup?.soil?.phH2o ?? store.siteEdits.value.soilPh ?? null;
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<StudioFilterState>({ ...EMPTY_STUDIO_FILTERS });
  const mode = paletteViewMode.value;
  const groupBy = paletteGroupMode.value;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((t) => {
      if (!matchesStudioFilters(t, filters)) return false;
      if (!q) return true;
      const roles = roleSummary(t).toLowerCase();
      return nameOf(t).toLowerCase().includes(q) || t.canonical_name.toLowerCase().includes(q) || roles.includes(q);
    });
  }, [members, filters, query]);

  const ids = useMemo(() => filtered.map((t) => t.id), [filtered]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ label: '', items: filtered }];
    const map = new Map<string, Taxon[]>();
    for (const t of filtered) {
      const key = groupBy === 'sun'
        ? sunTierLabel(t)
        : groupBy === 'stage'
          ? stageSpanOf(t).label
          : verdictMeta(verdicts?.get(t.id)?.level).key;
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return [...map.entries()].map(([label, items]) => ({ label, items }));
  }, [filtered, groupBy, verdicts]);

  if (!members.length) return null;

  const renderCard = (t: Taxon) => {
    const tier = sunTierOf(t);
    const v = verdictMeta(verdicts?.get(t.id)?.level);
    const h = formatHeightRange(t.traits.height_m);
    const ph = t.traits.soil_ph;
    const phMismatch = sitePh != null && ph && ((ph.min != null && sitePh < ph.min - 0.3) || (ph.max != null && sitePh > ph.max + 0.3));
    return (
      <article
        key={t.id}
        class="plant-card"
        data-plant-card={t.id}
        data-plant-id={t.id}
        onClick={() => openFieldDossier(t.id, ids)}
      >
        <div class="pc-top-row">
          <div class="pc-titles">
            <div class="pc-name">{nameOf(t)}</div>
            <div class="pc-latin">{t.canonical_name}</div>
          </div>
          <div class="pc-top-right">
            <span class={`pc-status-inline ${v.cls}`}>
              {v.icon} {v.label}
            </span>
            <button
              type="button"
              class="pc-rm-btn"
              aria-label={`Remove ${nameOf(t)}`}
              onClick={(e) => { e.stopPropagation(); store.removeMember(t.id); }}
            >
              ×
            </button>
          </div>
        </div>

        <div class="pc-meta-line">
          <span><span class="sun-dot-inline" style={{ background: SUN_COLOR[tier] }} aria-hidden="true" />{sunTierLabel(t)}</span>
          <span class="msep" aria-hidden="true">·</span>
          <span>{stageSpanOf(t).label}</span>
          {h && <><span class="msep" aria-hidden="true">·</span><span>{h}</span></>}
          <span class="msep" aria-hidden="true">·</span>
          <span>{roleSummary(t)}</span>
          {phMismatch && ph && (
            <>
              <span class="msep" aria-hidden="true">·</span>
              <span style="color:var(--warn-ink); font-weight:600;">pH {ph.min?.toFixed(1) ?? '?'}–{ph.max?.toFixed(1) ?? '?'}</span>
            </>
          )}
        </div>

        <div class="pc-foot">
          <Sparkline taxon={t} />
          <span class="pc-actions">
            {v.cls !== 'v-fit' && (
              <button
                type="button"
                class="link-btn"
                onClick={(e) => { e.stopPropagation(); store.openSheet('swap', t.id); }}
              >
                ⇄ Swap
              </button>
            )}
            <button
              type="button"
              class="link-btn"
              onClick={(e) => { e.stopPropagation(); openFieldDossier(t.id, ids); }}
            >
              {T('studio.dossier')}
            </button>
          </span>
        </div>
      </article>
    );
  };

  return (
    <section data-palette-cards aria-label="My palette species">
      <div class="canvas-bar">
        <div class="canvas-search-group">
          <input
            type="search"
            class="field-input"
            style="flex:1; min-width:190px;"
            aria-label="Search within your plants"
            placeholder={`Search your ${members.length} plants (name, Latin, role)…`}
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          />
          <FilterPopover value={filters} onChange={setFilters} />
          <select
            class="field-select"
            aria-label="Group plants by"
            value={groupBy}
            onChange={(e) => { paletteGroupMode.value = (e.currentTarget as HTMLSelectElement).value as PaletteGroupMode; }}
          >
            <option value="none">Group: None</option>
            <option value="sun">By Sun Exposure</option>
            <option value="stage">By Succession</option>
            <option value="status">By Status</option>
          </select>
        </div>

        <div class="ink-seg" role="group" aria-label="Palette view mode">
          <button
            type="button"
            class="ink-seg-btn"
            aria-pressed={mode === 'cards' ? 'true' : 'false'}
            onClick={() => { paletteViewMode.value = 'cards'; }}
          >
            {T('studio.viewCards')}
          </button>
          <button
            type="button"
            class="ink-seg-btn"
            aria-pressed={mode === 'compact' ? 'true' : 'false'}
            onClick={() => { paletteViewMode.value = 'compact'; }}
          >
            {T('studio.viewCompact')}
          </button>
        </div>
      </div>

      {!filtered.length ? (
        <p class="ct-muted">No species in your palette match the current filters.</p>
      ) : mode === 'compact' ? (
        <div class="field-table-wrap" data-compact-list>
          <table class="field-table">
            <thead>
              <tr>
                <th>Sun</th>
                <th>Species</th>
                <th>Succession</th>
                <th>Role</th>
                <th>12-mo activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const tier = sunTierOf(t);
                return (
                  <tr key={t.id} data-plant-id={t.id} onClick={() => openFieldDossier(t.id, ids)}>
                    <td>
                      <span class="ft-sun">
                        <span class={`ft-sun-icon ${SUN_CLS[tier]}`} aria-hidden="true">
                          <SunIcon tier={tier} size={14} />
                        </span>
                        {sunTierLabel(t)}
                      </span>
                    </td>
                    <td class="ft-species">
                      <span class="ft-name">{nameOf(t)}</span>
                      <span class="ft-latin">{t.canonical_name}</span>
                    </td>
                    <td>{stageSpanOf(t).label}</td>
                    <td>{roleSummary(t)}</td>
                    <td><Sparkline taxon={t} /></td>
                    <td>
                      <span class="pc-actions">
                        <button
                          type="button"
                          class="link-btn"
                          onClick={(e) => { e.stopPropagation(); openFieldDossier(t.id, ids); }}
                        >
                          {T('studio.dossier')}
                        </button>
                        <button
                          type="button"
                          class="link-btn danger"
                          aria-label={`Remove ${nameOf(t)}`}
                          onClick={(e) => { e.stopPropagation(); store.removeMember(t.id); }}
                        >
                          ✕
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : groupBy === 'none' ? (
        <div class="botanical-grid">
          {filtered.map(renderCard)}
        </div>
      ) : (
        <div>
          {groups.map((g) => (
            <details key={g.label} class="group-details" open>
              <summary>
                <span>{g.label}</span>
                <span class="nav-count">{g.items.length}</span>
              </summary>
              <div class="group-inner">
                <div class="botanical-grid">{g.items.map(renderCard)}</div>
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
