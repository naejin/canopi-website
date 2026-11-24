/** @jsxImportSource preact */
// Persistent Collapsible Right Rail (VP-1, v14 1:1 port): Coach | All Plants.
// Stays docked across ALL 4 studio tabs when poolOpen is true.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { jobsOf, type Taxon } from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import {
  climateStress,
  designEnvelope,
  microclimate,
  openFieldDossier,
  openPlantPool,
  plantingConfig,
  poolOpen,
  railPreset,
  railTab,
  requestPlantOpen,
  wateringMode,
} from '../../state/studio.ts';
import { formatFreezeTag, siteClimateProfile } from '../../rules/climate-words.ts';
import { evaluateStudioCatalog } from '../../rules/studio-fit.ts';
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
import { ActiveFilterChips, FilterPanel, FilterPopover } from './FilterPopover.tsx';

type RailIntent = 'winter' | 'gap' | 'soil' | 'early' | null;
type RailSort = 'fit' | 'gap' | 'az';

const FIT_RANK: Record<string, number> = { fits: 0, look: 1, unknown: 2, outside: 3 };

function matchesQuery(t: Taxon, q: string): boolean {
  if (nameOf(t).toLowerCase().includes(q)) return true;
  if (t.canonical_name.toLowerCase().includes(q)) return true;
  for (const val of Object.values(t.names)) {
    if (typeof val === 'string' && val.toLowerCase().includes(q)) return true;
    if (Array.isArray(val) && val.some((s) => typeof s === 'string' && s.toLowerCase().includes(q))) return true;
  }
  return false;
}

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
  const [filterOpen, setFilterOpen] = useState(false);
  const [intent, setIntent] = useState<RailIntent>(null);
  const [sort, setSort] = useState<RailSort>('fit');

  // Warm every curated climate pool so full-DB search & climate-fit recommendations see all ~761+ species.
  useEffect(() => {
    if (store.source.value) void store.loadAllPools();
  }, [store.source.value]);

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
  const searchCatalog = store.allCatalog.value.length ? store.allCatalog.value : (store.pool.value ?? []);
  const loc = store.location.value;
  const z = store.climate.value;
  const period = store.period.value;
  const envelope = designEnvelope.value;
  const stress = climateStress.value;
  const mc = microclimate.value;
  const edits = store.siteEdits.value;
  const water = wateringMode.value;
  const roomVal = store.room.value;
  const plotAreaM2 = plantingConfig.value.plotAreaM2;
  const baseVerdicts = store.allVerdicts.value ?? store.poolVerdicts.value;

  const studioEval = useMemo(
    () => evaluateStudioCatalog(searchCatalog, {
      loc,
      climate: z,
      period,
      envelope,
      stress,
      microclimate: mc,
      siteEdits: edits,
      wateringMode: water,
      room: roomVal,
      plotAreaM2,
      baseVerdicts,
    }),
    [searchCatalog, loc, z, period, envelope, stress, mc, edits, water, roomVal, plotAreaM2, baseVerdicts],
  );

  const coachPool = studioEval.fitPool.length ? studioEval.fitPool : (store.allFitPool.value.length ? store.allFitPool.value : searchCatalog);
  const verdictMap = studioEval.fitMap;

  const activeConditionTags = useMemo(() => {
    const tags: string[] = [];
    if (period === '2041-2070') tags.push(T('studio.horizon.2050s'));
    else if (period === '2071-2099') tags.push(T('studio.horizon.2080s'));
    if (envelope === 'extreme10') tags.push(T('studio.climExtreme'));
    if (stress.heatDeltaC > 0) tags.push(`+${stress.heatDeltaC} °C`);
    if (stress.droughtPct > 0) tags.push(`+${stress.droughtPct}%`);
    if (stress.winterDeltaC < 0) tags.push(`${stress.winterDeltaC} °C`);
    if (stress.falseSpringDeltaPct > 0) tags.push(`+${stress.falseSpringDeltaPct}%`);
    if (stress.windExposure > 0) tags.push(`${stress.windExposure}/3`);
    if (water !== 'Rain-fed') tags.push(T(water === 'Irrigated' ? 'studio.water.irrigated' : 'studio.water.occasional'));
    return tags;
  }, [period, envelope, stress, water]);
  const placeName = loc ? placeWords(loc) : z ? zoneName(z) : T('studio.common.yourSite');
  const profile = siteClimateProfile(loc, z, mc, edits);
  const coachSiteMeta = [
    profile.coldFreeze10yrC != null
      ? T('studio.tuner.freezeFoot', { freeze: formatFreezeTag(profile.coldFreeze10yrC, profile.coldFreezeIsEst) })
      : null,
    profile.ph != null ? `pH ${profile.ph.toFixed(1)}` : null,
  ].filter(Boolean).join(' · ');

  const coachCards = useMemo<CoachCard[]>(() => {
    const presentSun = new Set(members.map((t) => sunTierOf(t)));
    const presentRoles = new Set(members.flatMap((t) => jobsOf(t)));
    const missingSun = (['emergent', 'high', 'medium', 'low'] as const).filter((s) => !presentSun.has(s));
    const missingRoles = ROLE_OPTIONS.filter((r) => !presentRoles.has(r.id));

    const candidates = coachPool.filter((t) => !memberIds.has(t.id));
    const picked = new Set<string>();
    const out: CoachCard[] = [];

    for (const r of missingRoles) {
      if (out.length >= 3) break;
      const hit = candidates.find((t) => !picked.has(t.id) && jobsOf(t).includes(r.id));
      if (hit) {
        picked.add(hit.id);
        const rName = T(`studio.role.${r.id}`);
        out.push({
          eyebrow: T('studio.rail.roleGap', { role: rName.toUpperCase() }),
          taxon: hit,
          why: T('studio.rail.roleWhy', { role: rName.toLowerCase(), span: stageSpanOf(hit).label }),
        });
      }
    }
    for (const s of missingSun) {
      if (out.length >= 3) break;
      const hit = candidates.find((t) => !picked.has(t.id) && sunTierOf(t) === s);
      if (hit) {
        picked.add(hit.id);
        const sName = sunTierLabel(hit);
        out.push({
          eyebrow: T('studio.rail.sunGap', { sun: sName.toUpperCase() }),
          taxon: hit,
          why: T('studio.rail.sunWhy', { sun: sName.toLowerCase(), span: stageSpanOf(hit).label }),
        });
      }
    }
    for (const hit of candidates) {
      if (out.length >= 3) break;
      if (picked.has(hit.id)) continue;
      picked.add(hit.id);
      const rLabel = jobsOf(hit).map((j) => T(`studio.role.${j}`)).filter(Boolean).slice(0, 2).join(' & ');
      out.push({
        eyebrow: T('studio.rail.compEyebrow'),
        taxon: hit,
        why: rLabel ? T('studio.rail.compWhy', { roles: rLabel.toLowerCase(), span: stageSpanOf(hit).label }) : T('studio.rail.compFallback', { place: placeName }),
      });
    }
    return out;
  }, [members, coachPool, memberIds, placeName]);

  const filteredAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = searchCatalog.filter((t) => {
      const vl = verdictMap?.get(t.id)?.level;
      if (!matchesStudioFilters(t, filters, vl)) return false;
      if (intent === 'soil' && !jobsOf(t).includes('feeds_soil')) return false;
      if (intent === 'early' && !jobsOf(t).includes('helpers')) return false;
      if (intent === 'gap' && memberIds.has(t.id)) return false;
      if (intent === 'winter' && (t.traits.height_m?.max ?? 99) > 3) return false;
      if (!q) return true;
      return matchesQuery(t, q);
    });
    if (sort === 'az') {
      list.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    } else if (sort === 'gap') {
      list.sort((a, b) => Number(memberIds.has(a.id)) - Number(memberIds.has(b.id)));
    } else if (verdictMap) {
      list.sort((a, b) => {
        const fa = verdictMap.get(a.id);
        const fb = verdictMap.get(b.id);
        const ra = FIT_RANK[fa?.level ?? 'unknown'] ?? 2;
        const rb = FIT_RANK[fb?.level ?? 'unknown'] ?? 2;
        if (ra !== rb) return ra - rb;
        const sa = fa?.score ?? 0;
        const sb = fb?.score ?? 0;
        return sa !== sb ? sb - sa : nameOf(a).localeCompare(nameOf(b));
      });
    }
    return list;
  }, [searchCatalog, verdictMap, query, filters, intent, sort, memberIds]);

  const visibleAll = useMemo(() => filteredAll.slice(0, 60), [filteredAll]);
  const coachIds = useMemo(() => coachCards.map((c) => c.taxon.id), [coachCards]);
  const allIds = useMemo(() => visibleAll.map((t) => t.id), [visibleAll]);

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
    <aside class="studio-rail" data-studio-rail aria-label={T('studio.rail.aria')}>
      <div class="rail-head">
        <div class="ink-seg" role="tablist" aria-label={T('studio.rail.tablistAria')}>
          <button
            type="button"
            role="tab"
            class="ink-seg-btn"
            aria-selected={tab === 'coach' ? 'true' : 'false'}
            onClick={() => { railTab.value = 'coach'; }}
          >
            {T('studio.railCoach')} ({coachCards.length})
          </button>
          <button
            type="button"
            role="tab"
            class="ink-seg-btn"
            aria-selected={tab === 'all' ? 'true' : 'false'}
            onClick={() => { railTab.value = 'all'; }}
          >
            {T('studio.railAll')} ({searchCatalog.length})
          </button>
        </div>
        <button
          type="button"
          class="btn-quiet"
          aria-label={T('studio.rail.closeAria')}
          onClick={() => { poolOpen.value = false; }}
        >
          ✕
        </button>
      </div>

      <div class="rail-body">
        {tab === 'coach' ? (
          <>
            <div>
              <h3 style="font-size:17px; margin-bottom:3px;">{T('studio.rail.coachTitle')}</h3>
              <p style="margin:0 0 10px; font-size:13.5px; color:var(--ink-soft);">
                {T('studio.rail.coachSub', { n: coachCards.length, place: placeName, meta: coachSiteMeta ? ` (${coachSiteMeta})` : '' })}
              </p>
              {activeConditionTags.length > 0 && (
                <div class="why-tag is-live" style="margin:0 0 10px; display:inline-flex; flex-wrap:wrap; gap:4px;" data-coach-active-conditions>
                  {T('studio.rail.activeCond', { cond: activeConditionTags.join(' · ') })}
                </div>
              )}
              {coachCards.length > 0 && (
                <button
                  type="button"
                  class="btn btn-primary"
                  style="width:100%;"
                  onClick={autoStrengthen}
                >
                  {T('studio.rail.autoStrengthen', { n: coachCards.length })}
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
              {T('studio.rail.exploreAll', { n: searchCatalog.length })}
            </button>
          </>
        ) : (
          <>
            <input
              type="search"
              class="field-input"
              aria-label={T('studio.rail.searchAria')}
              placeholder={T('studio.rail.searchPh')}
              value={query}
              onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            />

            <div class="chip-row">
              {(['winter', 'gap', 'soil', 'early'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  class="filter-chip"
                  aria-pressed={intent === id ? 'true' : 'false'}
                  onClick={() => setIntent((cur) => (cur === id ? null : id))}
                >
                  {T(`studio.rail.intent.${id}`)}
                </button>
              ))}
            </div>

            <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:6px;">
              <FilterPopover
                value={filters}
                onChange={setFilters}
                open={filterOpen}
                onToggle={() => setFilterOpen((o) => !o)}
              />
              <div class="ink-seg" role="group" aria-label={T('studio.rail.sortAria')}>
                {(['fit', 'gap', 'az'] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    class="ink-seg-btn"
                    style="padding:3px 8px; font-size:12px;"
                    aria-pressed={sort === id ? 'true' : 'false'}
                    onClick={() => setSort(id)}
                  >
                    {T(`studio.rail.sort.${id}`)}
                  </button>
                ))}
              </div>
            </div>

            <ActiveFilterChips value={filters} onChange={setFilters} />

            {filterOpen && (
              <FilterPanel
                value={filters}
                onChange={setFilters}
                onDone={() => setFilterOpen(false)}
                shownCount={filteredAll.length}
                totalCount={searchCatalog.length}
                showFit={Boolean(verdictMap)}
              />
            )}

            <div style="display:flex; flex-direction:column; gap:8px;">
              {visibleAll.map((t) => {
                const inPalette = memberIds.has(t.id);
                const tier = sunTierOf(t);
                const hText = formatHeightRange(t.traits.height_m);
                const phText = phSpanText(t);
                const vl = verdictMap?.get(t.id)?.level;
                const fitBadge = vl === 'fits'
                  ? { cls: 'v-fit', text: T('studio.fit.fit') }
                  : vl === 'look'
                    ? { cls: 'v-care', text: T('studio.fit.care') }
                    : vl === 'outside'
                      ? { cls: 'v-risk', text: T('studio.fit.risk') }
                      : null;
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
                        {fitBadge && <span class={`v-badge rail-fit-badge ${fitBadge.cls}`}>{fitBadge.text}</span>}
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
              {T('studio.rail.cantFind')}{' '}
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
