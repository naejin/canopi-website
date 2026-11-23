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
    setFilters(() => ({
      ...EMPTY_STUDIO_FILTERS,
      suns: preset.sun ? [preset.sun] : [],
      stages: preset.stage != null ? [preset.stage] : [],
      roles: preset.role ? [preset.role as StudioFilterState['roles'][number]] : [],
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

  const SUN_DOT: Record<string, string> = {
    emergent: 'var(--sun-full)',
    high: 'var(--sun-mostly)',
    medium: 'var(--sun-part)',
    low: 'var(--sun-shade)',
  };

  return (
    <aside class="studio-rail" data-studio-rail aria-label="Coach and plant catalog">
      <div class="rail-head">
        <div class="ink-seg" role="tablist" aria-label="Right rail">
          <button
            type="button"
            role="tab"
            class="ink-seg-btn"
            aria-pressed={tab === 'coach' ? 'true' : 'false'}
            aria-selected={tab === 'coach' ? 'true' : 'false'}
            onClick={() => { railTab.value = 'coach'; }}
          >
            {T('studio.railCoach')} ({coachCards.length})
          </button>
          <button
            type="button"
            role="tab"
            class="ink-seg-btn"
            aria-pressed={tab === 'all' ? 'true' : 'false'}
            aria-selected={tab === 'all' ? 'true' : 'false'}
            onClick={() => { railTab.value = 'all'; }}
          >
            {T('studio.railAll')} ({pool.length})
          </button>
        </div>
        <button
          type="button"
          class="btn-quiet"
          aria-label="Close plant pool rail"
          onClick={() => { poolOpen.value = false; }}
        >
          ✕
        </button>
      </div>

      <div class="rail-body">
        {tab === 'coach' ? (
          <>
            <div>
              <h3 style="font-size:17px; margin-bottom:3px;">Strengthen your palette</h3>
              <p style="margin:0 0 10px; font-size:13.5px; color:var(--ink-soft);">
                {coachCards.length} gentle {coachCards.length === 1 ? 'suggestion' : 'suggestions'} for {placeName}
                {coldC != null || sitePh != null ? ` (${[coldC != null ? `${coldC > 0 ? '+' : ''}${coldC.toFixed(0)} °C winter` : '', sitePh != null ? `pH ${sitePh.toFixed(1)}` : ''].filter(Boolean).join(' · ')})` : ''}. Adding updates your studio live.
              </p>
              {coachCards.length > 0 && (
                <button
                  type="button"
                  class="btn btn-primary"
                  style="width:100%;"
                  onClick={autoStrengthen}
                >
                  ✦ Auto-Strengthen (fill top {coachCards.length})
                </button>
              )}
            </div>

            {coachCards.map((c) => {
              const t = c.taxon;
              const tier = sunTierOf(t);
              const hText = formatHeightRange(t.traits.height_m);
              const phText = phSpanText(t);
              return (
                <article
                  key={t.id}
                  class="coach-note clickable"
                  onClick={() => openFieldDossier(t.id, coachIds)}
                >
                  <div class="coach-gap-k">{c.eyebrow}</div>
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <div style="min-width:0;">
                      <strong style="font-family:var(--font-display); font-size:15.5px;">{nameOf(t)}</strong>
                      <div class="rail-meta-line">
                        <span><span class="sun-dot-inline" style={{ background: SUN_DOT[tier] }} aria-hidden="true" />{sunTierLabel(t)}</span>
                        {hText && <><span class="msep" aria-hidden="true">·</span><span>{hText}</span></>}
                        {phText && <><span class="msep" aria-hidden="true">·</span><span>{phText}</span></>}
                      </div>
                    </div>
                    <button
                      type="button"
                      class="btn btn-xs"
                      onClick={(e) => { e.stopPropagation(); store.addMembers([t.id]); }}
                    >
                      {T('studio.add')}
                    </button>
                  </div>
                  <div class="coach-why-text">{c.why}</div>
                </article>
              );
            })}

            <button
              type="button"
              class="btn-quiet"
              style="width:100%; border:1px solid var(--border);"
              onClick={() => openPlantPool({ tab: 'all' })}
            >
              Explore all {pool.length} plants in Unified Pool →
            </button>
          </>
        ) : (
          <>
            <input
              type="search"
              class="field-input"
              aria-label="Search all plants"
              placeholder="Search any plant, Latin, or role…"
              value={query}
              onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            />

            <div class="chip-row">
              {([
                ['winter', '❄ Compact / winter'],
                ['gap', '★ Fills a gap'],
                ['soil', 'Soil builders'],
                ['early', 'Pollinators'],
              ] as const).map(([id, lbl]) => (
                <button
                  key={id}
                  type="button"
                  class="filter-chip"
                  aria-pressed={intent === id ? 'true' : 'false'}
                  onClick={() => setIntent((cur) => (cur === id ? null : id))}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:6px;">
              <FilterPopover value={filters} onChange={setFilters} />
              <div class="ink-seg" role="group" aria-label="Sort pool">
                {([['fit', 'Best fit'], ['gap', 'Gap'], ['az', 'A–Z']] as const).map(([id, lbl]) => (
                  <button
                    key={id}
                    type="button"
                    class="ink-seg-btn"
                    style="padding:3px 8px; font-size:12px;"
                    aria-pressed={sort === id ? 'true' : 'false'}
                    onClick={() => setSort(id)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:8px;">
              {filteredAll.map((t) => {
                const inPalette = memberIds.has(t.id);
                const tier = sunTierOf(t);
                const hText = formatHeightRange(t.traits.height_m);
                const phText = phSpanText(t);
                return (
                  <div
                    key={t.id}
                    class={`pool-item${inPalette ? ' in-pal' : ''}`}
                    onClick={() => openFieldDossier(t.id, allIds)}
                  >
                    <div style="flex:1; min-width:0;">
                      <div style="display:flex; flex-wrap:wrap; align-items:baseline; gap:5px;">
                        <strong style="font-size:14.5px;">{nameOf(t)}</strong>
                        <span style="font-size:12px; font-style:italic; color:var(--ink-muted);">{t.canonical_name}</span>
                      </div>
                      <div class="rail-meta-line">
                        <span><span class="sun-dot-inline" style={{ background: SUN_DOT[tier] }} aria-hidden="true" />{sunTierLabel(t)}</span>
                        {hText && <><span class="msep" aria-hidden="true">·</span><span>{hText}</span></>}
                        {phText && <><span class="msep" aria-hidden="true">·</span><span>{phText}</span></>}
                      </div>
                    </div>
                    {inPalette ? (
                      <span class="btn btn-xs">{T('studio.inPalette')}</span>
                    ) : (
                      <button
                        type="button"
                        class="btn btn-xs btn-primary"
                        onClick={(e) => { e.stopPropagation(); store.addMembers([t.id]); }}
                      >
                        {T('studio.add')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p style="font-size:12.5px; color:var(--ink-muted); margin:4px 0 0;">
              Can&apos;t find a species?{' '}
              <button
                type="button"
                class="link-btn"
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
