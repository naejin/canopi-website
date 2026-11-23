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

function Sparkline({ taxon }: { taxon: Taxon }) {
  const levels = useMemo(() => activityMonthsOf(taxon), [taxon]);
  return (
    <span class="ct-spark" role="img" aria-label="12-month activity">
      {MONTH_INITIALS.map((_, i) => (
        <span
          key={i}
          class="ct-spark-dot"
          data-lvl={levels[i]}
          data-stratum={levels[i] === 'peak' ? 'high' : undefined}
          aria-hidden="true"
        />
      ))}
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
  if (level === 'outside') return { cls: 'is-risk', icon: '✕', label: 'At risk', key: 'At risk' };
  if (level === 'look') return { cls: 'is-care', icon: '⚠', label: 'Needs care', key: 'Needs care' };
  return { cls: 'is-fit', icon: '✓', label: 'Thrives', key: 'Thrives' };
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
        class="ct-card"
        data-plant-card={t.id}
        data-plant-id={t.id}
        onClick={() => openFieldDossier(t.id, ids)}
      >
        {/* Layer 1: Common + Latin on left; semantic status + quiet × remove on right */}
        <div class="ct-card-top">
          <div class="ct-card-names">
            <span class="ct-card-common">{nameOf(t)}</span>
            <span class="ct-sci">{t.canonical_name}</span>
          </div>
          <div class="ct-card-top-right">
            <span class={`ct-status-pill ${v.cls}`} data-stratum={v.cls === 'is-fit' ? 'high' : undefined}>
              {v.icon} {v.label}
            </span>
            <button
              type="button"
              class="ct-card-rm"
              aria-label={`Remove ${nameOf(t)}`}
              onClick={(e) => { e.stopPropagation(); store.removeMember(t.id); }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Layer 2: Pure-typography middot metadata with colored sun-tier dot */}
        <p class="ct-card-meta">
          <span><span class="ct-sun-dot" data-sun-tier={tier} aria-hidden="true" />{sunTierLabel(t)}</span>
          <span class="ct-msep" aria-hidden="true">·</span>
          <span>{stageSpanOf(t).label}</span>
          {h && <><span class="ct-msep" aria-hidden="true">·</span><span>{h}</span></>}
          <span class="ct-msep" aria-hidden="true">·</span>
          <span>{roleSummary(t)}</span>
          {phMismatch && ph && (
            <>
              <span class="ct-msep" aria-hidden="true">·</span>
              <span class="ct-ph-alert">pH {ph.min?.toFixed(1) ?? '?'}–{ph.max?.toFixed(1) ?? '?'}</span>
            </>
          )}
        </p>

        {/* Layer 3: 12-month sparkline + conditional Swap + Dossier → */}
        <div class="ct-card-foot">
          <Sparkline taxon={t} />
          <span class="ct-card-acts">
            {v.cls !== 'is-fit' && (
              <button
                type="button"
                class="ct-card-act"
                onClick={(e) => { e.stopPropagation(); store.openSheet('swap', t.id); }}
              >
                ⇄ Swap
              </button>
            )}
            <button
              type="button"
              class="ct-card-act is-primary-link"
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
    <section class="ct-studio-main" data-palette-cards aria-label="My palette species">
      <div class="ct-toolbar">
        <div class="ct-toolbar-group">
          <input
            type="search"
            class="ct-pal-search"
            aria-label="Search within your plants"
            placeholder={`Search your ${members.length} plants (name, Latin, role)…`}
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          />
          <FilterPopover value={filters} onChange={setFilters} />
          <select
            class="ct-group-select"
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

        <div class="ct-seg-switch ct-ink-seg" role="group" aria-label="Palette view mode">
          <button
            type="button"
            class="ct-seg-btn"
            aria-pressed={mode === 'cards' ? 'true' : 'false'}
            onClick={() => { paletteViewMode.value = 'cards'; }}
          >
            {T('studio.viewCards')}
          </button>
          <button
            type="button"
            class="ct-seg-btn"
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
        <div class="ct-compact-wrap" data-compact-list>
          <table class="ct-compact-table">
            <thead>
              <tr>
                <th>Species</th>
                <th>Sun</th>
                <th>Succession</th>
                <th>Role</th>
                <th>12-mo activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} data-plant-id={t.id} onClick={() => openFieldDossier(t.id, ids)}>
                  <td>
                    <strong>{nameOf(t)}</strong>{' '}
                    <span class="ct-sci">{t.canonical_name}</span>
                  </td>
                  <td>
                    <span class="ct-sun-dot" data-sun-tier={sunTierOf(t)} aria-hidden="true" />
                    {sunTierLabel(t)}
                  </td>
                  <td>{stageSpanOf(t).label}</td>
                  <td>{roleSummary(t)}</td>
                  <td><Sparkline taxon={t} /></td>
                  <td>
                    <span class="ct-card-acts">
                      <button
                        type="button"
                        class="ct-card-act is-primary-link"
                        onClick={(e) => { e.stopPropagation(); openFieldDossier(t.id, ids); }}
                      >
                        {T('studio.dossier')}
                      </button>
                      <button
                        type="button"
                        class="ct-card-act"
                        aria-label={`Remove ${nameOf(t)}`}
                        onClick={(e) => { e.stopPropagation(); store.removeMember(t.id); }}
                      >
                        {T('studio.remove')}
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : groupBy === 'none' ? (
        <div class="ct-cards">
          {filtered.map(renderCard)}
        </div>
      ) : (
        <div class="ct-groups">
          {groups.map((g) => (
            <details key={g.label} class="ct-group-details" open>
              <summary class="ct-group-summary">
                <span>{g.label}</span>
                <span class="ct-muted ct-small-text">{g.items.length}</span>
              </summary>
              <div class="ct-cards ct-group-cards">
                {g.items.map(renderCard)}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
