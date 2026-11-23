/** @jsxImportSource preact */
// My Palette — v14 1:1 Port: Search + Filters + Group + Dark-Pill Cards/List Toggle,
// 3-Layer Editorial Botanical Cards (with sun-tier dot & semantic status), and Compact List.
import { useMemo, useState } from 'preact/hooks';
import { jobsOf, type Taxon } from '../../../../lib/palette/index.ts';
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
  stageSpanOf,
  sunTierLabel,
  sunTierOf,
  type StudioFilterState,
} from '../../rules/studio-filters.ts';
import { ActiveFilterChips, FilterPanel, FilterPopover } from './FilterPopover.tsx';
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
    <span class="mini-spark" role="img" aria-label={T('studio.cards.sparkAria')}>
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

function shortRolesOf(t: Taxon): string[] {
  const jobs = jobsOf(t);
  const out: string[] = [];
  for (const j of jobs) {
    const s = T(`studio.roleShort.${j}`);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= 2) break;
  }
  return out.length ? out : [T('studio.roleShort.companion')];
}

function roleSummary(t: Taxon): string {
  return shortRolesOf(t).join(', ');
}

function compactHeightOf(t: Taxon): string {
  const h = t.traits.height_m;
  if (!h) return '—';
  const val = h.max ?? h.min;
  if (val == null) return '—';
  return `${Number.isInteger(val) ? val : val.toFixed(1)}m`;
}

function verdictMeta(level: string | undefined): { cls: string; icon: string; label: string; key: string } {
  if (level === 'outside') return { cls: 'v-risk', icon: '✕', label: T('studio.status.risk'), key: T('studio.status.risk') };
  if (level === 'look') return { cls: 'v-care', icon: '⚠', label: T('studio.status.care'), key: T('studio.status.care') };
  return { cls: 'v-fit', icon: '✓', label: T('studio.status.fit'), key: T('studio.status.fit') };
}

export function PaletteCards() {
  const members = store.memberTaxa.value;
  const verdicts = store.memberVerdicts.value;
  const sitePh = store.location.value?.lookup?.soil?.phH2o ?? store.siteEdits.value.soilPh ?? null;
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<StudioFilterState>({ ...EMPTY_STUDIO_FILTERS });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const mode = paletteViewMode.value;
  const groupBy = paletteGroupMode.value;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((t) => {
      if (!matchesStudioFilters(t, filters, verdicts?.get(t.id)?.level)) return false;
      if (!q) return true;
      const roles = roleSummary(t).toLowerCase();
      return nameOf(t).toLowerCase().includes(q) || t.canonical_name.toLowerCase().includes(q) || roles.includes(q);
    });
  }, [members, filters, query, verdicts]);

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
              aria-label={T('studio.cards.removeAria', { name: nameOf(t) })}
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
                {T('studio.cards.swap')}
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
    <section data-palette-cards aria-label={T('studio.cards.aria')}>
      <div class="canvas-bar">
        <div class="canvas-search-group">
          <input
            type="search"
            class="field-input"
            style="flex:1; min-width:190px;"
            aria-label={T('studio.cards.searchAria')}
            placeholder={T('studio.cards.searchPh', { n: members.length })}
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          />
          <FilterPopover
            value={filters}
            onChange={setFilters}
            open={filtersOpen}
            onToggle={() => setFiltersOpen((v) => !v)}
          />
          <select
            class="field-select"
            aria-label={T('studio.cards.groupAria')}
            value={groupBy}
            onChange={(e) => { paletteGroupMode.value = (e.currentTarget as HTMLSelectElement).value as PaletteGroupMode; }}
          >
            <option value="none">{T('studio.cards.groupNone')}</option>
            <option value="sun">{T('studio.cards.groupSun')}</option>
            <option value="stage">{T('studio.cards.groupStage')}</option>
            <option value="status">{T('studio.cards.groupStatus')}</option>
          </select>
        </div>

        <div class="ink-seg" role="group" aria-label={T('studio.cards.viewAria')}>
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

      {filtersOpen && (
        <FilterPanel
          value={filters}
          onChange={setFilters}
          onDone={() => setFiltersOpen(false)}
          shownCount={filtered.length}
          totalCount={members.length}
          showFit
        />
      )}
      <ActiveFilterChips value={filters} onChange={setFilters} />

      {!filtered.length ? (
        <p class="ct-muted">{T('studio.cards.noMatch')}</p>
      ) : mode === 'compact' ? (
        <div class="field-table-wrap" data-compact-list>
          <div class="spark-key-bar" aria-label={T('studio.cards.calKeyAria')}>
            <span style="font-weight:600; color:var(--ink);">{T('studio.cards.calKeyTitle')}</span>
            <span style="display:inline-flex; flex-wrap:wrap; gap:10px; align-items:center;">
              <span class="legend-item"><span class="act-swatch"><span class="sw-win" /></span>{T('studio.act.winter')}</span>
              <span class="legend-item"><span class="act-swatch"><span class="sw-sow" /></span>{T('studio.act.sow')}</span>
              <span class="legend-item"><span class="act-swatch"><span class="sw-bloom" /></span>{T('studio.act.bloom')}</span>
              <span class="legend-item"><span class="act-swatch"><span class="sw-harv" /></span>{T('studio.act.harvest')}</span>
              <span style="color:var(--ink-muted);">· {T('studio.cards.calKeyNote')}</span>
            </span>
          </div>
          <table class="field-table">
            <thead>
              <tr>
                <th>{T('studio.cards.colSun')}</th>
                <th>{T('studio.cards.colSpecies')}</th>
                <th>{T('studio.cards.colFit', { horizon: store.period.value === '1991-2020' ? T('studio.horizon.today') : store.period.value === '2071-2099' ? T('studio.horizon.2080s') : T('studio.horizon.2050s') })}</th>
                <th>{T('studio.cards.colRoles')}</th>
                <th>{T('studio.cards.colCal')}<span class="spark-axis">J · · A · · J · · O · D</span></th>
                <th>{T('studio.cards.colHt')}</th>
                <th>{T('studio.cards.colActs')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const tier = sunTierOf(t);
                const v = verdictMeta(verdicts?.get(t.id)?.level);
                const roles = shortRolesOf(t);
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
                    <td>
                      <span class={`verdict-tag ${v.cls}`} style="font-size:12px;">
                        {v.icon} {v.label}
                      </span>
                    </td>
                    <td>
                      {roles.map((r) => (
                        <span key={r} class="role-chip" style="font-size:11px; margin-right:3px;">
                          {r}
                        </span>
                      ))}
                    </td>
                    <td onClick={(e) => { e.stopPropagation(); openFieldDossier(t.id, ids); }}>
                      <Sparkline taxon={t} />
                    </td>
                    <td style="color:var(--ink-soft); font-size:12.5px;">{compactHeightOf(t)}</td>
                    <td>
                      <button
                        type="button"
                        class="link-btn"
                        style="padding:3px 6px; font-size:12.5px;"
                        onClick={(e) => { e.stopPropagation(); openFieldDossier(t.id, ids); }}
                      >
                        {T('studio.dossierShort')}
                      </button>
                      <button
                        type="button"
                        class="link-btn danger"
                        style="padding:3px 6px; font-size:12.5px;"
                        aria-label={T('studio.cards.removeAria', { name: nameOf(t) })}
                        onClick={(e) => { e.stopPropagation(); store.removeMember(t.id); }}
                      >
                        ✕
                      </button>
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
