/** @jsxImportSource preact */
// Clean 2-Tab Right Rail (Slice 3.3, v14/v15): Coach | All Plants.
// - Coach: crisp ecological balance & gap guidance with 1-click + Add and Dossier ->
// - All Plants: fast search + shared Filters (N) + zero-pill-soup species rows + Request a plant link
import { useMemo, useState } from 'preact/hooks';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { openFieldDossier, railTab, requestPlantOpen } from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import {
  EMPTY_STUDIO_FILTERS,
  matchesStudioFilters,
  stageSpanOf,
  sunTierLabel,
  type StudioFilterState,
} from '../../rules/studio-filters.ts';
import { FilterPopover } from './FilterPopover.tsx';

export function StudioRail() {
  const tab = railTab.value;
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<StudioFilterState>({ ...EMPTY_STUDIO_FILTERS });

  const memberIds = useMemo(() => new Set(store.members.value), [store.members.value]);
  const pool = store.fitPool.value ?? store.pool.value ?? [];
  const holes = store.paletteHoles.value;

  const coachCandidates = useMemo(() => {
    const out = pool.filter((t) => !memberIds.has(t.id)).slice(0, 8);
    return out;
  }, [pool, memberIds]);

  const filteredAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool.filter((t) => {
      if (!matchesStudioFilters(t, filters)) return false;
      if (!q) return true;
      return nameOf(t).toLowerCase().includes(q) || t.canonical_name.toLowerCase().includes(q);
    }).slice(0, 60);
  }, [pool, query, filters]);

  const coachIds = useMemo(() => coachCandidates.map((t) => t.id), [coachCandidates]);
  const allIds = useMemo(() => filteredAll.map((t) => t.id), [filteredAll]);

  return (
    <aside class="ct-rail" data-studio-rail aria-label="Coach and plant catalog">
      <div class="ct-rail-tabs" role="tablist" aria-label="Right rail">
        <button
          type="button"
          role="tab"
          class="ct-rail-tab"
          aria-selected={tab === 'coach' ? 'true' : 'false'}
          onClick={() => { railTab.value = 'coach'; }}
        >
          {T('studio.railCoach')}
        </button>
        <button
          type="button"
          role="tab"
          class="ct-rail-tab"
          aria-selected={tab === 'all' ? 'true' : 'false'}
          onClick={() => { railTab.value = 'all'; }}
        >
          {T('studio.railAll')} ({pool.length})
        </button>
      </div>

      {tab === 'coach' ? (
        <>
          <p class="ct-muted ct-small-text">
            {holes.length > 0
              ? `${holes.length} open ecological gap${holes.length === 1 ? '' : 's'} detected. Add complementary species below.`
              : 'Your palette covers the core ecological roles. Explore resilient companions below.'}
          </p>
          <ul class="ct-rail-list">
            {coachCandidates.map((t) => (
              <li key={t.id} class="ct-rail-row">
                <div class="ct-rail-row-info">
                  <span class="ct-rail-row-name">{nameOf(t)}</span>
                  <span class="ct-rail-row-sub">
                    {sunTierLabel(t)} · {stageSpanOf(t).label}
                  </span>
                </div>
                <span class="ct-card-acts">
                  <button
                    type="button"
                    class="ct-card-act is-primary-link"
                    onClick={() => openFieldDossier(t.id, coachIds)}
                  >
                    Dossier →
                  </button>
                  <button
                    type="button"
                    class="ct-card-act"
                    onClick={() => store.addMembers([t.id])}
                  >
                    + Add
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div class="ct-rail-search">
            <input
              type="search"
              class="ct-rail-input"
              aria-label="Search all plants"
              placeholder="Search species…"
              value={query}
              onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            />
            <FilterPopover value={filters} onChange={setFilters} />
          </div>

          <ul class="ct-rail-list">
            {filteredAll.map((t) => {
              const inPalette = memberIds.has(t.id);
              return (
                <li key={t.id} class="ct-rail-row">
                  <div class="ct-rail-row-info">
                    <span class="ct-rail-row-name">{nameOf(t)}</span>
                    <span class="ct-rail-row-sub">
                      <span class="ct-sci">{t.canonical_name}</span> · {sunTierLabel(t)}
                    </span>
                  </div>
                  <span class="ct-card-acts">
                    <button
                      type="button"
                      class="ct-card-act is-primary-link"
                      onClick={() => openFieldDossier(t.id, allIds)}
                    >
                      {T('studio.dossier')}
                    </button>
                    {inPalette ? (
                      <span class="ct-small-text ct-muted">{T('studio.inPalette')}</span>
                    ) : (
                      <button
                        type="button"
                        class="ct-card-act"
                        onClick={() => store.addMembers([t.id])}
                      >
                        {T('studio.add')}
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {(query.trim() !== '' || filteredAll.length === 0) && (
            <p class="ct-small-text ct-muted">
              Can&apos;t find a species?{' '}
              <button
                type="button"
                class="link-button ct-link"
                onClick={() => { requestPlantOpen.value = true; }}
              >
                Request a plant
              </button>
            </p>
          )}
        </>
      )}
    </aside>
  );
}
