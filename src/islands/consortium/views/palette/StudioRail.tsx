/** @jsxImportSource preact */
// Persistent Collapsible Right Rail (VP-1, v14 1:1 port): Coach | All Plants.
// Stays docked across ALL 4 studio tabs when poolOpen is true.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { jobsOf, type Taxon } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { openFieldDossier, openPlantPool, poolOpen, railPreset, railTab, requestPlantOpen } from '../../state/studio.ts';
import { nameOf, zoneName } from '../kit/names.ts';
import { placeWords } from '../location/shared.ts';
import {
  EMPTY_STUDIO_FILTERS,
  formatHeightRange,
  matchesStudioFilters,
  ROLE_OPTIONS,
  stageSpanOf,
  sunTierLabel,
  sunTierOf,
  type StudioFilterState,
} from '../../rules/studio-filters.ts';
import { FilterPopover } from './FilterPopover.tsx';

type RailIntent = 'winter' | 'gap' | 'soil' | 'early' | null;
type RailSort = 'fit' | 'gap' | 'az';

function phSpanText(t: Taxon): string | null {
  const r = t.traits.soil_ph;
  if (!r || (r.min == null && r.max == null)) return null;
  if (r.min != null && r.max != null) return `pH ${r.min.toFixed(1)}–${r.max.toFixed(1)}`;
  return r.max != null ? `pH ≤${r.max.toFixed(1)}` : `pH ≥${r.min!.toFixed(1)}`;
}

interface CoachCard {
  eyebrow: string;
  taxon: Taxon;
  why: string;
}

export function StudioRail() {
  const tab = railTab.value;
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<StudioFilterState>({ ...EMPTY_STUDIO_FILTERS });
  const [intent, setIntent] = useState<RailIntent>(null);
  const [sort, setSort] = useState<RailSort>('fit');

  const preset = railPreset.value;
  useEffect(() => {
    if (!preset) return;
    setFilters((prev) => ({
      ...EMPTY_STUDIO_FILTERS,
      sun: preset.sun ?? prev.sun,
      stage: preset.stage ?? prev.stage,
      role: (preset.role as StudioFilterState['role']) ?? prev.role,
    }));
    if (preset.intent !== undefined) setIntent(preset.intent);
    railPreset.value = null;
  }, [preset]);

  const memberIds = useMemo(() => new Set(store.members.value), [store.members.value]);
  const members = store.memberTaxa.value;
  const pool = store.fitPool.value ?? store.pool.value ?? [];
  const loc = store.location.value;
  const z = store.climate.value;
  const placeName = loc ? placeWords(loc) : z ? zoneName(z) : 'your site';
  const sitePh = loc?.lookup?.soil?.phH2o ?? store.siteEdits.value.soilPh ?? null;
  const coldC = loc?.lookup?.climate?.periods?.[0]?.tminColdC ?? null;

  const coachCards = useMemo<CoachCard[]>(() => {
    const presentSun = new Set(members.map((t) => sunTierOf(t)));
    const presentRoles = new Set(members.flatMap((t) => jobsOf(t)));
    const missingSun = (['emergent', 'high', 'medium', 'low'] as const).filter((s) => !presentSun.has(s));
    const missingRoles = ROLE_OPTIONS.filter((r) => !presentRoles.has(r.id));

    const candidates = pool.filter((t) => !memberIds.has(t.id));
    const picked = new Set<string>();
    const out: CoachCard[] = [];

    for (const r of missingRoles) {
      if (out.length >= 3) break;
      const hit = candidates.find((t) => !picked.has(t.id) && jobsOf(t).includes(r.id));
      if (hit) {
        picked.add(hit.id);
        out.push({
          eyebrow: `${r.label.toUpperCase()} GAP`,
          taxon: hit,
          why: `Adds ${r.label.toLowerCase()} redundancy · ${stageSpanOf(hit).label}`,
        });
      }
    }
    for (const s of missingSun) {
      if (out.length >= 3) break;
      const hit = candidates.find((t) => !picked.has(t.id) && sunTierOf(t) === s);
      if (hit) {
        picked.add(hit.id);
        out.push({
          eyebrow: `${sunTierLabel(hit).toUpperCase()} EXPOSURE GAP`,
          taxon: hit,
          why: `Fills your open ${sunTierLabel(hit).toLowerCase()} niche · ${stageSpanOf(hit).label}`,
        });
      }
    }
    for (const hit of candidates) {
      if (out.length >= 3) break;
      if (picked.has(hit.id)) continue;
      picked.add(hit.id);
      const rLabel = jobsOf(hit).map((j) => ROLE_OPTIONS.find((r) => r.id === j)?.label).filter(Boolean).slice(0, 2).join(' & ');
      out.push({
        eyebrow: 'COMPLEMENTARY RESILIENCE PICK',
        taxon: hit,
        why: rLabel ? `Strengthens ${rLabel.toLowerCase()} across ${stageSpanOf(hit).label}` : `Well-suited companion for ${placeName}`,
      });
    }
    return out;
  }, [members, pool, memberIds, placeName]);

  const filteredAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = pool.filter((t) => {
      if (!matchesStudioFilters(t, filters)) return false;
      if (intent === 'soil' && !jobsOf(t).includes('feeds_soil')) return false;
      if (intent === 'early' && !jobsOf(t).includes('helpers')) return false;
      if (intent === 'gap' && memberIds.has(t.id)) return false;
      if (intent === 'winter' && (t.traits.height_m?.max ?? 99) > 3) return false;
      if (!q) return true;
      return nameOf(t).toLowerCase().includes(q) || t.canonical_name.toLowerCase().includes(q);
    });
    if (sort === 'az') list.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    else if (sort === 'gap') list.sort((a, b) => Number(memberIds.has(a.id)) - Number(memberIds.has(b.id)));
    return list.slice(0, 60);
  }, [pool, query, filters, intent, sort, memberIds]);

  const coachIds = useMemo(() => coachCards.map((c) => c.taxon.id), [coachCards]);
  const allIds = useMemo(() => filteredAll.map((t) => t.id), [filteredAll]);

  const autoStrengthen = () => {
    const ids = coachCards.map((c) => c.taxon.id).filter((id) => !memberIds.has(id));
    if (ids.length) store.addMembers(ids);
  };

  return (
    <aside class="ct-rail" data-studio-rail aria-label="Coach and plant catalog">
      <div class="ct-rail-head">
        <div class="ct-rail-tabs ct-ink-seg" role="tablist" aria-label="Right rail">
          <button
            type="button"
            role="tab"
            class="ct-rail-tab"
            aria-selected={tab === 'coach' ? 'true' : 'false'}
            onClick={() => { railTab.value = 'coach'; }}
          >
            {T('studio.railCoach')} ({coachCards.length})
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
        <button
          type="button"
          class="ct-rail-close"
          aria-label="Close plant pool rail"
          onClick={() => { poolOpen.value = false; }}
        >
          ✕
        </button>
      </div>

      <div class="ct-rail-body">
        {tab === 'coach' ? (
          <>
            <div class="ct-coach-intro">
              <h3 class="ct-coach-title">Strengthen your palette</h3>
              <p class="ct-muted ct-small-text">
                {coachCards.length} gentle {coachCards.length === 1 ? 'suggestion' : 'suggestions'} for {placeName}
                {coldC != null || sitePh != null ? ` (${[coldC != null ? `${coldC > 0 ? '+' : ''}${coldC.toFixed(0)} °C winter` : '', sitePh != null ? `pH ${sitePh.toFixed(1)}` : ''].filter(Boolean).join(' · ')})` : ''}. Adding updates your studio live.
              </p>
              {coachCards.length > 0 && (
                <button
                  type="button"
                  class="button button-primary ct-auto-strengthen"
                  onClick={autoStrengthen}
                >
                  ✦ Auto-Strengthen (fill top {coachCards.length})
                </button>
              )}
            </div>

            <div class="ct-coach-list">
              {coachCards.map((c) => {
                const t = c.taxon;
                const tier = sunTierOf(t);
                const hText = formatHeightRange(t.traits.height_m);
                const phText = phSpanText(t);
                return (
                  <article
                    key={t.id}
                    class="ct-coach-note"
                    onClick={() => openFieldDossier(t.id, coachIds)}
                  >
                    <div class="ct-coach-gap-k">{c.eyebrow}</div>
                    <div class="ct-coach-top">
                      <div class="ct-rail-row-info">
                        <strong class="ct-coach-name">{nameOf(t)}</strong>
                        <div class="ct-rail-meta">
                          <span><span class="ct-sun-dot" data-sun-tier={tier} aria-hidden="true" />{sunTierLabel(t)}</span>
                          {hText && <><span class="ct-msep" aria-hidden="true">·</span><span>{hText}</span></>}
                          {phText && <><span class="ct-msep" aria-hidden="true">·</span><span>{phText}</span></>}
                        </div>
                      </div>
                      <button
                        type="button"
                        class="ct-card-act"
                        onClick={(e) => { e.stopPropagation(); store.addMembers([t.id]); }}
                      >
                        {T('studio.add')}
                      </button>
                    </div>
                    <div class="ct-coach-why">{c.why}</div>
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              class="ct-rail-explore"
              onClick={() => openPlantPool({ tab: 'all' })}
            >
              Explore all {pool.length} plants in Unified Pool →
            </button>
          </>
        ) : (
          <>
            <input
              type="search"
              class="ct-rail-input"
              aria-label="Search all plants"
              placeholder="Search any plant, Latin, or role…"
              value={query}
              onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            />

            <div class="ct-chip-row">
              {([
                ['winter', '❄ Compact / winter'],
                ['gap', '★ Fills a gap'],
                ['soil', 'Soil builders'],
                ['early', 'Pollinators'],
              ] as const).map(([id, lbl]) => (
                <button
                  key={id}
                  type="button"
                  class="ct-intent-chip"
                  aria-pressed={intent === id ? 'true' : 'false'}
                  onClick={() => setIntent((cur) => (cur === id ? null : id))}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div class="ct-rail-controls">
              <FilterPopover value={filters} onChange={setFilters} />
              <div class="ct-ink-seg" role="group" aria-label="Sort pool">
                {([['fit', 'Best fit'], ['gap', 'Gap'], ['az', 'A–Z']] as const).map(([id, lbl]) => (
                  <button
                    key={id}
                    type="button"
                    class="ct-studio-horizon-btn"
                    aria-pressed={sort === id ? 'true' : 'false'}
                    onClick={() => setSort(id)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <ul class="ct-rail-list">
              {filteredAll.map((t) => {
                const inPalette = memberIds.has(t.id);
                const tier = sunTierOf(t);
                const hText = formatHeightRange(t.traits.height_m);
                const phText = phSpanText(t);
                return (
                  <li
                    key={t.id}
                    class={`ct-pool-item${inPalette ? ' is-in-pal' : ''}`}
                    onClick={() => openFieldDossier(t.id, allIds)}
                  >
                    <div class="ct-rail-row-info">
                      <div class="ct-pool-name-line">
                        <strong class="ct-rail-row-name">{nameOf(t)}</strong>
                        <span class="ct-sci">{t.canonical_name}</span>
                      </div>
                      <div class="ct-rail-meta">
                        <span><span class="ct-sun-dot" data-sun-tier={tier} aria-hidden="true" />{sunTierLabel(t)}</span>
                        {hText && <><span class="ct-msep" aria-hidden="true">·</span><span>{hText}</span></>}
                        {phText && <><span class="ct-msep" aria-hidden="true">·</span><span>{phText}</span></>}
                      </div>
                    </div>
                    {inPalette ? (
                      <span class="ct-small-text ct-muted">{T('studio.inPalette')}</span>
                    ) : (
                      <button
                        type="button"
                        class="ct-card-act"
                        onClick={(e) => { e.stopPropagation(); store.addMembers([t.id]); }}
                      >
                        {T('studio.add')}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <p class="ct-small-text ct-muted ct-rail-request">
              Can&apos;t find a species?{' '}
              <button
                type="button"
                class="link-button ct-link"
                onClick={() => { requestPlantOpen.value = true; }}
              >
                {T('studio.requestPlant')}
              </button>
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
