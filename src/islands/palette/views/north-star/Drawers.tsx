/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html renderSwapDiff (L3553) & renderDrawer (L3589-4425):
// 1. Power Botanical Picker (ALL 761 species, 6 quick chips, live facet counts, 7-category filter panel, active pills, Sort)
// 2. Visual Climate & Guild Atlas (Shift Passport + analogue, 4-Pillar Ring & Grid, Walter-Lieth SVG, 10-Scenario Matrix, Water Tank + Dual-Depth pH + Frost-Free + SSP disclosure, Like-for-like Swaps + Diff)
// 3. Visual Botanical Field Dossier (Plant Passport Hero + Gallery switcher/credit + Native badge, Unified Site Fit Plate, Scale & Root SVG, 12-Month Phenology Gantt, 7-Phase Strip, Field Facts with Weed/Wind/Fertility/Water-tank, Schema 4.11 citations with ZERO PFAF)
// Preserves Blocker A fix: useLayoutEffect Escape + dialog focus move/restore.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type {
  Details,
  JobId,
  PaletteReport,
  PlantId,
  Taxon,
} from '../../../../lib/palette/index.ts';
import {
  evaluatePlantVerdict,
  findCompatibleSwaps,
  formatAreaName,
  formatCountryName,
  jobIds,
  jobsOf,
  months as MONTHS,
  preferredFrostC,
  toxicityStatusOf,
} from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { Glyph } from '../kit/Glyph.tsx';
import { PlantThumb, ScaleRootSvg, WalterLiethSvg } from './GuildVisuals.tsx';
import { computeTrackCaps, localizedMonthLabels, MiniYearRibbon } from './PhenologyRibbon.tsx';
import {
  doyToDateLabel,
  fmtNum,
  frostSourceLabel,
  jobLabel,
  lightKeyLabel,
  lightSpanLabel,
  localizedReason,
  PHASE_LIST,
  PHASE_SHORT_NAMES,
  phaseLabel,
  phaseOrd,
  plantCoversPhase,
  plantLightKey,
  plantMatchesSunLevel,
  pollinationNote,
  pollinationShortWarn,
  sanitizeSourceLabel,
  scenarioLabel,
  scenarioShort,
  shortSiteName,
  SUN_ORDER,
  taxCommonName,
  toxBadgeInfo,
  traitFieldLabel,
  verdictBadgeClass,
  verdictSymbolLabel,
  type LightKey,
} from './ns-helpers.ts';
import {
  activePool,
  addPlantToPalette,
  currentLocale,
  ensureAllCatalogLoaded,
  ensureAllNamesLoaded,
  nsAllNames,
  nsAllTaxa,
  nsDrawer,
  nsGuestZoneById,
  nsLayerValues,
  nsScenario,
  removePlantFromPalette,
  siteAnalogueLabel,
  swapPlantInPalette,
  toggleExisting,
} from './ns-state.ts';

function sizeClassLabel(t: Taxon): string {
  const h = (t.traits.habit ?? '').toLowerCase();
  if (h.includes('tree')) return 'Tree';
  if (h.includes('shrub') || h.includes('bush')) return 'Shrub';
  if (h.includes('climb') || h.includes('vine')) return 'Vine';
  if (h.includes('ground')) return 'Groundcover';
  return t.traits.habit || 'Herb';
}

function toxDossierText(t: Taxon, details: Details | null = null): string {
  const tx = toxicityStatusOf(t);
  if (tx.status === 'not_toxic') return T('ns.tox.none');
  if (tx.status === 'unknown') return T('ns.tox.unknown');
  const parts = details?.toxicityParts?.map((tp) => tp.part.replace(/_/g, ' ')) ?? [];
  const uniq = [...new Set(parts)];
  return `${tx.level ?? T('ns.tox.caution')}${uniq.length ? ` (${uniq.slice(0, 3).join(', ')})` : ''}`;
}

interface PickerFilterState {
  job: JobId | 'all';
  sun: LightKey | 'all';
  habit: string;
  phaseIdx: number | null;
  fillsGap: boolean;
  thrivesToday: boolean;
  thrives2050: boolean;
  survivesExtremes: boolean;
  droughtAdapted: boolean;
  winterCrop: boolean;
  windTolerant: boolean;
  windbreak: boolean;
  nonToxic: boolean;
  fitsPh: boolean;
  selfFertile: boolean;
  edible: boolean;
  nitrogenFixer: boolean;
  fitsRoom: boolean;
  annual: boolean;
}

function defaultPickerFilters(initialJob: JobId | 'all'): PickerFilterState {
  return {
    job: initialJob,
    sun: 'all',
    habit: 'all',
    phaseIdx: null,
    fillsGap: false,
    thrivesToday: false,
    thrives2050: false,
    survivesExtremes: false,
    droughtAdapted: false,
    winterCrop: false,
    windTolerant: false,
    windbreak: false,
    nonToxic: false,
    fitsPh: false,
    selfFertile: false,
    edible: false,
    nitrogenFixer: false,
    fitsRoom: false,
    annual: false,
  };
}

function isWinterCrop(t: Taxon): boolean {
  const agp = (t.traits.active_growth_period ?? '').toLowerCase();
  if (agp.includes('winter') || agp.includes('autumn') || agp.includes('fall')) return true;
  if ((t.traits.is_annual || t.traits.grown_as_annual) && (t.climate?.tminCold?.low ?? 10) <= 5) return true;
  return false;
}

function isWindbreak(t: Taxon): boolean {
  return t.functions?.some((fn) => fn.function === 'windbreak') ?? false;
}

/** Verbatim port of mockup-v73.html renderSwapDiff (L3553). */
function SwapDiffTable({ curPlant, candPlant, rep }: { curPlant: Taxon; candPlant: Taxon; rep: PaletteReport }) {
  const cmpEff = nsScenario.value === 'today' ? rep.eff2050 : rep.eff;
  const cmpTag = nsScenario.value === 'today' ? '2050s' : scenarioShort(nsScenario.value);
  const vcT = evaluatePlantVerdict(curPlant, rep.effToday);
  const vcC = evaluatePlantVerdict(curPlant, cmpEff);
  const vnT = evaluatePlantVerdict(candPlant, rep.effToday);
  const vnC = evaluatePlantVerdict(candPlant, cmpEff);

  const extStr = (p: Taxon) => (p.extremes?.tminExtreme?.low != null && p.extremes?.tmaxExtreme?.high != null)
    ? `${fmtNum(p.extremes.tminExtreme.low)} – ${fmtNum(p.extremes.tmaxExtreme.high)} °C`
    : T('ns.notRecorded');
  const matStr = (p: Taxon) => {
    const m = p.traits.age_of_maturity_years;
    if (m == null) return T('ns.unknown');
    return m <= 0 ? T('ns.plan.ltOneYr') : `${fmtNum(m)} yr`;
  };
  const sizeStr = (p: Taxon) => `${p.traits.height_m?.max != null ? `${fmtNum(p.traits.height_m.max)} m` : '—'} × ${p.traits.width_max_m != null ? `${fmtNum(p.traits.width_max_m)} m` : '—'}`;
  const waterStr = (p: Taxon) => T('ns.swaps.waterPair', {
    drought: p.traits.drought_tolerance ?? T('ns.notRecorded'),
    moisture: p.traits.moisture_use ?? T('ns.notRecorded'),
  });
  const curJobs = jobsOf(curPlant);
  const candJobs = jobsOf(candPlant);
  const jobsKept = curJobs.filter((j) => candJobs.includes(j)).map(jobLabel);

  return (
    <div class="swap-diff">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <strong>{T('ns.swaps.diffTitle')} ({sizeClassLabel(curPlant)} → {sizeClassLabel(candPlant)})</strong>
        <button
          type="button"
          class="btn-primary"
          style={{ minHeight: '44px', padding: '0 12px' }}
          onClick={() => swapPlantInPalette(curPlant.id, candPlant.id)}
        >
          {T('ns.swaps.use')}
        </button>
      </div>
      <table class="swap-diff-table">
        <thead>
          <tr>
            <th>{T('ns.swaps.colTrait')}</th>
            <th>{taxCommonName(curPlant)}</th>
            <th>{taxCommonName(candPlant)}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>{T('ns.today')} / {cmpTag}</th>
            <td>{verdictSymbolLabel(vcT.level)} / {verdictSymbolLabel(vcC.level)}</td>
            <td>{verdictSymbolLabel(vnT.level)} / {verdictSymbolLabel(vnC.level)}</td>
          </tr>
          <tr><th>{T('ns.swaps.rowExtremes')}</th><td>{extStr(curPlant)}</td><td>{extStr(candPlant)}</td></tr>
          <tr><th>{T('ns.field.height')} × {T('ns.field.width')}</th><td>{sizeStr(curPlant)}</td><td>{sizeStr(candPlant)}</td></tr>
          <tr><th>{T('ns.swaps.rowMaturity')}</th><td>{matStr(curPlant)}</td><td>{matStr(candPlant)}</td></tr>
          <tr><th>{T('ns.swaps.rowWater')}</th><td>{waterStr(curPlant)}</td><td>{waterStr(candPlant)}</td></tr>
          <tr><th>{T('ns.field.toxicity')}</th><td>{toxDossierText(curPlant)}</td><td>{toxDossierText(candPlant)}</td></tr>
          <tr>
            <th>{T('ns.swaps.rowJobsKept')}</th>
            <td colSpan={2}>{jobsKept.length > 0 ? jobsKept.join(', ') : candJobs.map(jobLabel).join(', ')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Verbatim port of mockup-v73.html Picker Drawer (L3815-4032) over ALL 761 catalog species with live facet counts. */
function PickerDrawer({ rep, initialJob }: { rep: PaletteReport; initialJob: JobId | 'all' }) {
  const [query, setQuery] = useState('');
  const [f, setF] = useState<PickerFilterState>(() => defaultPickerFilters(initialJob));
  const [moreOpen, setMoreOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'fit' | 'gaps' | 'height' | 'az'>('fit');

  useEffect(() => {
    void ensureAllNamesLoaded();
    void ensureAllCatalogLoaded();
  }, []);

  const pool = activePool.value;
  const allTaxa = nsAllTaxa.value;
  const guestZones = nsGuestZoneById.value;
  const allNames = nsAllNames.value;

  // Full 761-species catalog ordered with active climate's pool first
  const catalog = useMemo(() => {
    if (!allTaxa || allTaxa.length === 0) return pool;
    const seen = new Set(pool.map((t) => t.id));
    const merged = [...pool];
    for (const t of allTaxa) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        merged.push(t);
      }
    }
    return merged;
  }, [pool, allTaxa]);

  const inPalette = useMemo(() => new Set(store.members.value), [store.members.value]);
  const neededJobs = useMemo(() => new Set([...rep.missingJobs, ...rep.noBackupJobs]), [rep.missingJobs, rep.noBackupJobs]);

  const verdictsToday = useMemo(
    () => new Map(catalog.map((t) => [t.id, evaluatePlantVerdict(t, rep.effToday)])),
    [catalog, rep.effToday],
  );
  const verdictsActive = useMemo(
    () => new Map(catalog.map((t) => [t.id, evaluatePlantVerdict(t, rep.eff)])),
    [catalog, rep.eff],
  );
  const verdicts2050 = useMemo(
    () => new Map(catalog.map((t) => [t.id, evaluatePlantVerdict(t, rep.eff2050)])),
    [catalog, rep.eff2050],
  );

  const q = query.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!q) return catalog;
    const matchedIds = new Set<PlantId>();
    if (allNames) {
      for (const n of allNames) {
        const vals = Object.values(n.names).filter((nm): nm is string => typeof nm === 'string');
        if (n.canonical.toLowerCase().includes(q) || vals.some((nm) => nm.toLowerCase().includes(q))) {
          matchedIds.add(n.id);
        }
      }
    }
    return catalog.filter((t) =>
      matchedIds.has(t.id)
      || t.canonical_name.toLowerCase().includes(q)
      || taxCommonName(t).toLowerCase().includes(q),
    );
  }, [catalog, allNames, q]);

  const matchesFilters = (t: Taxon, st: PickerFilterState): boolean => {
    if (st.job !== 'all' && !jobsOf(t).includes(st.job)) return false;
    if (st.sun !== 'all' && !plantMatchesSunLevel(t, st.sun)) return false;
    if (st.habit !== 'all') {
      const h = (t.traits.habit ?? '').toLowerCase();
      if (st.habit === 'vine') {
        if (!h.includes('vine') && !h.includes('climb')) return false;
      } else if (!h.includes(st.habit)) return false;
    }
    if (st.phaseIdx !== null && !plantCoversPhase(t, st.phaseIdx)) return false;
    if (st.fillsGap && !jobsOf(t).some((j) => neededJobs.has(j))) return false;
    if (st.thrivesToday && verdictsToday.get(t.id)?.level !== 'fits') return false;
    if (st.thrives2050 && verdicts2050.get(t.id)?.level !== 'fits') return false;
    if (st.survivesExtremes) {
      const v = verdictsActive.get(t.id);
      if (!v || v.reasons.some((r) => r.code.startsWith('extreme_'))) return false;
    }
    if (st.droughtAdapted && !/high|very|mod/i.test(t.traits.drought_tolerance ?? '')) return false;
    if (st.winterCrop && !isWinterCrop(t)) return false;
    if (st.windTolerant && t.windTolerant !== true) return false;
    if (st.windbreak && !isWindbreak(t)) return false;
    if (st.nonToxic && toxicityStatusOf(t).status !== 'not_toxic') return false;
    if (st.fitsPh) {
      const ph = t.traits.soil_ph;
      const sitePh = rep.eff.soilPh;
      if (sitePh != null && ph && ((ph.min != null && sitePh < ph.min) || (ph.max != null && sitePh > ph.max))) return false;
    }
    if (st.selfFertile && t.traits.self_fertile !== true) return false;
    if (st.edible && (t.traits.edibility_rating ?? 0) < 3) return false;
    if (st.nitrogenFixer && t.traits.nitrogen_fixer !== true) return false;
    if (st.fitsRoom && rep.eff.roomLimitM != null && (t.traits.height_m?.max ?? 0) > rep.eff.roomLimitM) return false;
    if (st.annual && !(t.traits.is_annual === true || t.traits.grown_as_annual === true)) return false;
    return true;
  };

  const filtered = useMemo(() => {
    const out = searchMatches.filter((t) => matchesFilters(t, f));
    const rank = { fits: 0, check: 1, unknown: 2, at_risk: 3 };
    return out.sort((a, b) => {
      const ia = inPalette.has(a.id) ? 1 : 0, ib = inPalette.has(b.id) ? 1 : 0;
      if (ia !== ib) return ia - ib;
      if (sortBy === 'gaps') {
        const ga = jobsOf(a).filter((j) => neededJobs.has(j)).length;
        const gb = jobsOf(b).filter((j) => neededJobs.has(j)).length;
        if (ga !== gb) return gb - ga;
      } else if (sortBy === 'height') {
        const ha = a.traits.height_m?.max ?? 999, hb = b.traits.height_m?.max ?? 999;
        if (ha !== hb) return ha - hb;
      } else if (sortBy === 'az') {
        return taxCommonName(a).localeCompare(taxCommonName(b));
      }
      const va = verdictsActive.get(a.id)?.level ?? 'unknown';
      const vb = verdictsActive.get(b.id)?.level ?? 'unknown';
      return (rank[va] - rank[vb]) || taxCommonName(a).localeCompare(taxCommonName(b));
    });
  }, [searchMatches, f, sortBy, inPalette, neededJobs, verdictsActive, verdictsToday, verdicts2050, rep.eff.roomLimitM, rep.eff.soilPh]);

  const toggleBool = (key: keyof PickerFilterState) => {
    setF((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const cntWith = (patch: Partial<PickerFilterState>): number => {
    const testState = { ...f, ...patch };
    let n = 0;
    for (const t of searchMatches) {
      if (matchesFilters(t, testState)) n++;
    }
    return n;
  };

  const facetChip = (key: string, label: string, on: boolean, cnt: number, onClick: () => void) => {
    const isZero = !on && cnt === 0;
    return (
      <button
        key={key}
        type="button"
        class="pf-chip"
        data-zero={isZero ? 'true' : 'false'}
        aria-pressed={on ? 'true' : 'false'}
        onClick={onClick}
      >
        {label}
        {isZero ? <span class="sr-only"> (0)</span> : <> <span class="pf-chip-cnt">({cnt})</span></>}
      </button>
    );
  };

  const boolChip = (key: keyof PickerFilterState, label: string) =>
    facetChip(String(key), label, Boolean(f[key]), cntWith({ [key]: true } as Partial<PickerFilterState>), () => toggleBool(key));

  const roomChipLabel = rep.eff.roomLimitM != null
    ? T('ns.picker.fFitsRoom', { m: `${fmtNum(rep.eff.roomLimitM, 0)} m` })
    : T('ns.picker.fFitsRoom', { m: '∞' });

  const boolLabels: { key: keyof PickerFilterState; label: string }[] = [
    { key: 'fillsGap', label: T('ns.picker.fFillsGap') },
    { key: 'thrivesToday', label: T('ns.picker.fThrivesToday') },
    { key: 'thrives2050', label: T('ns.picker.fThrives2050') },
    { key: 'survivesExtremes', label: T('ns.picker.fExtremes') },
    { key: 'droughtAdapted', label: T('ns.picker.fDrought') },
    { key: 'winterCrop', label: T('ns.picker.fWinterCrop') },
    { key: 'windTolerant', label: T('ns.picker.fWindTol') },
    { key: 'windbreak', label: T('ns.picker.fWindbreak') },
    { key: 'nonToxic', label: T('ns.picker.fNonToxic') },
    { key: 'fitsPh', label: T('ns.picker.fFitsPh', { ph: fmtNum(rep.eff.soilPh) }) },
    { key: 'selfFertile', label: T('ns.picker.fSelfFertile') },
    { key: 'edible', label: T('ns.picker.fEdible') },
    { key: 'nitrogenFixer', label: T('ns.picker.fNfix') },
    { key: 'fitsRoom', label: roomChipLabel },
    { key: 'annual', label: T('ns.picker.fAnnual') },
  ];

  const activeFilterCount = (f.job !== 'all' ? 1 : 0)
    + (f.sun !== 'all' ? 1 : 0)
    + (f.habit !== 'all' ? 1 : 0)
    + (f.phaseIdx !== null ? 1 : 0)
    + boolLabels.filter((b) => Boolean(f[b.key])).length;

  function clearFilters() {
    setQuery('');
    setF(defaultPickerFilters('all'));
  }

  return (
    <div class="drawer-body">
      <label class="sr-only" for="picker-search">{T('ns.picker.searchPlaceholder', { n: catalog.length })}</label>
      <input
        id="picker-search"
        class="tuner-input"
        type="search"
        placeholder={T('ns.picker.searchPlaceholder', { n: catalog.length })}
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />

      <div class="pf-chips" aria-label={T('ns.picker.moreFilters')}>
        {boolChip('fillsGap', T('ns.picker.fFillsGap'))}
        {boolChip('thrives2050', T('ns.picker.fThrives2050'))}
        {boolChip('droughtAdapted', T('ns.picker.fDrought'))}
        {boolChip('winterCrop', T('ns.picker.fWinterCrop'))}
        {boolChip('nonToxic', T('ns.picker.fNonToxic'))}
        {boolChip('edible', T('ns.picker.fEdible'))}
      </div>

      <div class="picker-toolbar">
        <span class="small muted">
          {T('ns.picker.ofPlants', { shown: filtered.length, total: catalog.length })}
        </span>
        <div class="picker-controls">
          <button
            type="button"
            class="proto-btn"
            aria-expanded={moreOpen ? 'true' : 'false'}
            onClick={() => setMoreOpen(!moreOpen)}
          >
            {moreOpen ? T('ns.picker.hideFilters') : T('ns.picker.moreFilters')}
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          {(activeFilterCount > 0 || q) && (
            <button type="button" class="link-button small tap-link" onClick={clearFilters}>
              {T('ns.picker.clear')}
            </button>
          )}
          <label class="sr-only" for="picker-sort">{T('ns.picker.sortFit')}</label>
          <select
            id="picker-sort"
            class="picker-sort"
            value={sortBy}
            onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as 'fit' | 'gaps' | 'height' | 'az')}
          >
            <option value="fit">{T('ns.picker.sortFit')}</option>
            <option value="gaps">{T('ns.picker.sortGaps')}</option>
            <option value="height">{T('ns.picker.sortHeight')}</option>
            <option value="az">{T('ns.picker.sortName')}</option>
          </select>
        </div>
      </div>

      {moreOpen && (
        <div class="picker-filter-panel" role="region" aria-label={T('ns.picker.moreFilters')}>
          {/* 1. Site fit & future */}
          <div class="pf-group">
            <div class="pf-label">{T('ns.picker.grpFit')}</div>
            <div class="pf-chips">
              {boolChip('thrivesToday', T('ns.picker.fThrivesToday'))}
              {boolChip('thrives2050', T('ns.picker.fThrives2050'))}
              {boolChip('survivesExtremes', T('ns.picker.fExtremes'))}
            </div>
          </div>

          {/* 2. Ecological job */}
          <div class="pf-group">
            <div class="pf-label">{T('ns.picker.grpJob')}</div>
            <div class="pf-chips">
              {boolChip('fillsGap', T('ns.picker.fFillsGap'))}
              {jobIds.map((j) =>
                facetChip(j, jobLabel(j), f.job === j, cntWith({ job: j }), () => setF((prev) => ({ ...prev, job: prev.job === j ? 'all' : j }))),
              )}
            </div>
          </div>

          {/* 3. Sun / light */}
          <div class="pf-group">
            <div class="pf-label">{T('ns.picker.grpSun')}</div>
            <div class="pf-chips">
              {SUN_ORDER.map((s) =>
                facetChip(s, lightKeyLabel(s), f.sun === s, cntWith({ sun: s }), () => setF((prev) => ({ ...prev, sun: prev.sun === s ? 'all' : s }))),
              )}
            </div>
          </div>

          {/* 4. Habit / layer / size */}
          <div class="pf-group">
            <div class="pf-label">{T('ns.picker.grpHabit')}</div>
            <div class="pf-chips">
              {[
                ['tree', 'Tree / Canopy'],
                ['shrub', 'Shrub'],
                ['herb', 'Perennial / Herb'],
                ['ground', 'Groundcover'],
                ['vine', 'Vine'],
              ].map(([k, lbl]) =>
                facetChip(k, lbl, f.habit === k, cntWith({ habit: k }), () => setF((prev) => ({ ...prev, habit: prev.habit === k ? 'all' : k }))),
              )}
              {boolChip('annual', T('ns.picker.fAnnual'))}
              {boolChip('fitsRoom', roomChipLabel)}
            </div>
          </div>

          {/* 5. Succession phase */}
          <div class="pf-group">
            <div class="pf-label">{T('ns.picker.grpPhase')}</div>
            <div class="pf-chips">
              {PHASE_LIST.map((ph, i) =>
                facetChip(ph, phaseLabel(ph), f.phaseIdx === i, cntWith({ phaseIdx: i }), () => setF((prev) => ({ ...prev, phaseIdx: prev.phaseIdx === i ? null : i }))),
              )}
            </div>
          </div>

          {/* 6. Water, climate & wind */}
          <div class="pf-group">
            <div class="pf-label">{T('ns.picker.grpWater')}</div>
            <div class="pf-chips">
              {boolChip('droughtAdapted', T('ns.picker.fDrought'))}
              {boolChip('winterCrop', T('ns.picker.fWinterCrop'))}
              {boolChip('windTolerant', T('ns.picker.fWindTol'))}
              {boolChip('windbreak', T('ns.picker.fWindbreak'))}
            </div>
          </div>

          {/* 7. Safety, pollination & food */}
          <div class="pf-group">
            <div class="pf-label">{T('ns.picker.grpSafety')}</div>
            <div class="pf-chips">
              {boolChip('nonToxic', T('ns.picker.fNonToxic'))}
              {boolChip('fitsPh', T('ns.picker.fFitsPh', { ph: fmtNum(rep.eff.soilPh) }))}
              {boolChip('selfFertile', T('ns.picker.fSelfFertile'))}
              {boolChip('edible', T('ns.picker.fEdible'))}
              {boolChip('nitrogenFixer', T('ns.picker.fNfix'))}
            </div>
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <div class="active-pills" role="region" aria-label={T('ns.picker.moreFilters')}>
          {f.job !== 'all' && <button type="button" class="active-pill" onClick={() => setF((p) => ({ ...p, job: 'all' }))}>{jobLabel(f.job)} <span aria-hidden="true">✕</span></button>}
          {f.sun !== 'all' && <button type="button" class="active-pill" onClick={() => setF((p) => ({ ...p, sun: 'all' }))}>{lightKeyLabel(f.sun)} <span aria-hidden="true">✕</span></button>}
          {f.habit !== 'all' && <button type="button" class="active-pill" onClick={() => setF((p) => ({ ...p, habit: 'all' }))}>{f.habit} <span aria-hidden="true">✕</span></button>}
          {f.phaseIdx !== null && <button type="button" class="active-pill" onClick={() => setF((p) => ({ ...p, phaseIdx: null }))}>{phaseLabel(PHASE_LIST[f.phaseIdx])} <span aria-hidden="true">✕</span></button>}
          {boolLabels.filter((b) => Boolean(f[b.key])).map((b) => (
            <button key={String(b.key)} type="button" class="active-pill" onClick={() => toggleBool(b.key)}>
              {b.label} <span aria-hidden="true">✕</span>
            </button>
          ))}
        </div>
      )}

      <div class="picker-list">
        {filtered.length === 0 ? (
          <div class="metric-box">
            <p class="small">{T('ns.picker.noMatches')}</p>
          </div>
        ) : (
          filtered.slice(0, 48).map((p) => {
            const v = verdictsActive.get(p.id);
            const added = inPalette.has(p.id);
            const tox = toxBadgeInfo(p);
            const pollWarn = pollinationShortWarn(p);
            const hMax = p.traits.height_m?.max ?? null;
            const guestZ = guestZones.get(p.id);
            const pTrack = rep.growingYear.tracks.get(p.id);
            return (
              <div key={p.id} class="picker-row-v7">
                <button
                  type="button"
                  class="picker-row-open"
                  onClick={() => { nsDrawer.value = { kind: 'dossier', id: p.id }; }}
                >
                  <PlantThumb taxon={p} size={44} />
                  <div style={{ minWidth: 0 }}>
                    <div>
                      <strong>{taxCommonName(p)}</strong>{' '}
                      <span class="small muted" style={{ fontStyle: 'italic' }}>{p.canonical_name}</span>
                    </div>
                    <div class="plant-badges" style={{ marginTop: '4px' }}>
                      {v && <span class={`badge ${verdictBadgeClass(v.level)}`}>{verdictSymbolLabel(v.level)}</span>}
                      <span class="badge">{lightSpanLabel(p)}{hMax != null ? ` · ${fmtNum(hMax)} m` : ''}</span>
                      {p.traits.edibility_rating != null && p.traits.edibility_rating >= 3 && <span class="badge badge-ok">{T('ns.dossier.edibility')} {p.traits.edibility_rating}/5</span>}
                      {p.traits.nitrogen_fixer && <span class="badge">{T('ns.picker.fNfix')}</span>}
                      {tox && <span class={`badge ${tox.cls}`}>{tox.text}</span>}
                      {pollWarn && <span class="badge badge-warn">{pollWarn}</span>}
                    </div>
                    {pTrack && (pTrack.bloom.length > 0 || pTrack.fruiting.length > 0) && (
                      <MiniYearRibbon bloom={pTrack.bloom} fruiting={pTrack.fruiting} compact />
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  class={added ? 'btn-ghost' : 'btn-primary'}
                  style={{ minHeight: '44px', padding: '0 12px' }}
                  onClick={() => (added ? removePlantFromPalette(p.id) : addPlantToPalette(p.id, guestZ))}
                >
                  {added ? T('ns.picker.added') : `+ ${T('ns.add')}`}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Verbatim port of mockup-v73.html Climate & Guild Atlas Drawer (L3593-3813). */
function AtlasDrawer({ rep, swapFor }: { rep: PaletteReport; swapFor?: PlantId }) {
  const stressed = rep.taxa.filter((t) => rep.verdicts.get(t.id)?.level !== 'fits');
  const [targetId, setTargetId] = useState<PlantId>(swapFor ?? stressed[0]?.id ?? rep.taxa[0]?.id ?? '');
  const [compareId, setCompareId] = useState<PlantId | null>(null);

  const eff = rep.eff;
  const effToday = rep.effToday;
  const eff2050 = rep.eff2050;
  const rob = rep.robustness;
  const inPalette = useMemo(() => new Set(store.members.value), [store.members.value]);
  const pool = activePool.value;
  const targetTaxon = rep.taxa.find((t) => t.id === targetId) ?? rep.taxa[0] ?? null;
  const swaps = useMemo(() => {
    if (!targetTaxon) return [];
    return findCompatibleSwaps(targetTaxon, pool, eff, inPalette, 5);
  }, [targetTaxon, pool, eff, inPalette]);
  const cmpCand = compareId ? pool.find((x) => x.id === compareId) ?? null : null;

  const activeScenShort = scenarioShort(nsScenario.value);
  const analogue = siteAnalogueLabel.value;
  const dFreeze = eff2050.freeze10C != null && effToday.freeze10C != null ? eff2050.freeze10C - effToday.freeze10C : null;
  const dHeat = eff2050.heat10C != null && effToday.heat10C != null ? eff2050.heat10C - effToday.heat10C : null;
  const dDry = eff2050.dryMonths != null && effToday.dryMonths != null ? eff2050.dryMonths - effToday.dryMonths : null;
  const fmtDelta = (v: number | null, unit: string) => v == null ? '—' : `${v > 0 ? '+' : ''}${fmtNum(v, 1)} ${unit}`;

  const strongCount = rob.strongPillars;
  const famColors = ['var(--pal-ok)', 'var(--accent)', 'var(--winter-ink)', 'var(--soil-2)', 'var(--border-strong)'];
  const tankDays = eff.tankDays ?? 0;
  const cddDays = eff.cddDays ?? 0;
  const maxTankScale = Math.max(tankDays, cddDays, 30);
  const tankPct = Math.min(100, Math.round((tankDays / maxTankScale) * 100));
  const dryPct = Math.min(100, Math.round((cddDays / maxTankScale) * 100));
  const waterBuffer = eff.tankDays != null && eff.cddDays != null ? eff.tankDays - eff.cddDays : null;
  const pctPh = (val: number) => Math.max(0, Math.min(100, ((val - 4.0) / 5.0) * 100));
  const topFamily = rob.familiesSorted[0] ?? ['—', 0];
  const activeMonthsSet = new Set(rep.growingYear.activeMonths);
  const texture = store.location.value?.lookup?.soil?.texture ?? 'loam';
  const terrain = store.location.value?.lookup?.v07?.terrain ?? null;
  const frostCal = store.location.value?.lookup?.v07?.frostCalendar ?? null;
  const springP90Date = doyToDateLabel(frostCal?.lastSpringP90Doy);
  const frostWindowText = frostCal?.frostFree
    ? T('ns.arrival.frostFreeDays', { n: 365 })
    : frostCal?.frostFreeDays != null
      ? `${T('ns.arrival.frostFreeDays', { n: frostCal.frostFreeDays })}${springP90Date ? ` (${T('ns.arrival.lateSpringFrost', { date: springP90Date })})` : ''}`
      : T('ns.unknown');

  return (
    <div class="drawer-body">
      {/* 1. Future Climate Shift Passport */}
      <section class="shift-passport" aria-label={T('ns.atlas.shiftHead', { scen: scenarioLabel('y2050') })}>
        <div class="shift-banner">
          <div>
            <div class="shift-dial-k">{T('ns.atlas.shiftHead', { scen: scenarioLabel('y2050') })}</div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '2px' }}>
              {T('ns.today')} ({effToday.koppen || '—'}{effToday.usdaZone ? ` / ${effToday.usdaZone}` : ''}) → {eff2050.koppen || effToday.koppen || '—'}{eff2050.usdaZone ? ` / ${eff2050.usdaZone}` : ''}
              {analogue ? <> · <strong>{T('ns.arrival.resembles', { place: analogue })}</strong></> : null}
            </div>
          </div>
        </div>
        <div class="shift-dials">
          <div class="shift-dial">
            <span class="shift-dial-k">{T('ns.land.freeze10')}</span>
            <span class="shift-dial-v">{fmtNum(effToday.freeze10C)} → {fmtNum(eff2050.freeze10C)} °C</span>
            <span class="shift-dial-d">{fmtDelta(dFreeze, '°C')}</span>
          </div>
          <div class="shift-dial">
            <span class="shift-dial-k">{T('ns.land.heat10')}</span>
            <span class="shift-dial-v">{fmtNum(effToday.heat10C)} → {fmtNum(eff2050.heat10C)} °C</span>
            <span class="shift-dial-d">{fmtDelta(dHeat, '°C')}</span>
          </div>
          <div class="shift-dial">
            <span class="shift-dial-k">{T('ns.land.drySpell')}</span>
            <span class="shift-dial-v">{effToday.dryMonths ?? '—'} → {eff2050.dryMonths ?? '—'} / 12</span>
            <span class="shift-dial-d">{dDry == null ? '—' : dDry === 0 ? '0' : `${dDry > 0 ? '+' : ''}${dDry}`}</span>
          </div>
        </div>
      </section>

      {/* 2. Four-Pillar Agroecological Robustness */}
      <section class="atlas-card" aria-label={T('ns.atlas.pillarsHead')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <p class="pulse-kicker">{T('ns.atlas.pillarsHead')}</p>
            <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '2px' }}>{T('ns.atlas.pillarsStrong', { n: strongCount })}</div>
          </div>
          <svg width="46" height="46" viewBox="0 0 46 46" role="img" aria-label={T('ns.atlas.pillarsStrong', { n: strongCount })}>
            <circle cx="23" cy="23" r="18" fill="none" stroke="var(--border)" stroke-width="5" />
            <circle
              cx="23"
              cy="23"
              r="18"
              fill="none"
              stroke={strongCount === 4 ? 'var(--pal-ok)' : 'var(--accent)'}
              stroke-width="5"
              stroke-dasharray={`${((strongCount / 4) * 113.1).toFixed(1)} 113.1`}
              transform="rotate(-90 23 23)"
              stroke-linecap="round"
            />
            <text x="23" y="27" text-anchor="middle" font-size="12" font-weight="600" fill="var(--text)">{strongCount}/4</text>
          </svg>
        </div>

        <div class="pillar-grid">
          <div class="pillar-box" data-tone={rob.redundancyOk ? 'ok' : 'warn'}>
            <span class="robust-k">1. {T('ns.pillar.jobs')}</span>
            <span class="robust-v">{rob.redundancyOk ? '✓ ' : '▲ '}{rep.coveredJobs}/6 · {6 - rep.missingJobs.length - rep.noBackupJobs.length}/6</span>
            <div class="pillar-segs" aria-hidden="true">
              {rep.jobStats.map((j) => (
                <span key={j.job} class="pillar-seg" data-st={j.status === 'backed_up' ? 'ok' : j.status === 'no_backup' ? 'low' : 'gap'} title={`${jobLabel(j.job)}: ${j.total}`} />
              ))}
            </div>
          </div>
          <div class="pillar-box" data-tone={rob.familyDiversityOk ? 'ok' : 'warn'}>
            <span class="robust-k">2. {T('ns.pillar.families')}</span>
            <span class="robust-v">{rob.familyDiversityOk ? '✓ ' : '⚠ '}{rob.familyCount} · max {topFamily[1]}/{rep.taxa.length} {topFamily[0]}</span>
            <div class="fam-bar" aria-hidden="true">
              {rob.familiesSorted.slice(0, 5).map(([fam, cnt], idx) => (
                <span key={fam} class="fam-seg" style={{ width: `${Math.max(8, Math.round((cnt / Math.max(1, rep.taxa.length)) * 100))}%`, background: famColors[idx % famColors.length] }} title={`${fam}: ${cnt}`} />
              ))}
            </div>
          </div>
          <div class="pillar-box" data-tone={rob.shockSurvivalOk ? 'ok' : 'warn'}>
            <span class="robust-k">3. {T('ns.pillar.shocks')}</span>
            <span class="robust-v">{rob.shockSurvivalOk ? '✓ ' : '▲ '}{rob.survivesAllCore}/{rep.taxa.length}</span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }} aria-hidden="true">
              {rob.coreScenarioBreaks.map((sb) => (
                <span
                  key={sb.id}
                  class="badge"
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    background: 'var(--surface)',
                    borderColor: sb.brokenCount === 0 ? 'var(--pal-ok)' : 'var(--accent)',
                    color: sb.brokenCount === 0 ? 'var(--pal-ok)' : 'var(--pal-warn)',
                  }}
                >
                  {sb.brokenCount === 0 ? '✓' : '▲'} {scenarioShort(sb.id)}
                </span>
              ))}
            </div>
          </div>
          <div class="pillar-box" data-tone={rob.seasonalityOk ? 'ok' : 'warn'}>
            <span class="robust-k">4. {T('ns.pillar.months')}</span>
            <span class="robust-v">{rob.seasonalityOk ? '✓ ' : '▲ '}{rep.growingYear.activeMonths.length}/12</span>
            <div class="spark-12" aria-hidden="true">
              {MONTHS.map((m) => (
                <span key={m} class="spark-m" data-on={activeMonthsSet.has(m) ? 'true' : 'false'}>{m[0]}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Walter-Lieth Climate Rhythm */}
      <section class="atlas-card" aria-label={T('ns.atlas.wlTitle')}>
        <div class="viz-head">
          <span>{T('ns.atlas.wlTitle')} ({activeScenShort} vs {nsScenario.value === 'today' ? '2050s' : T('ns.today')})</span>
          <span class="small muted">❄ · ●</span>
        </div>
        <WalterLiethSvg eff={eff} rep={rep} />
      </section>

      {/* 4. Interactive 10-Scenario Stress-Test Matrix */}
      <section class="atlas-card" aria-label={T('ns.atlas.scenariosTitle')}>
        <div class="viz-head">
          <span>{T('ns.atlas.scenariosTitle')}</span>
          <span class="small muted">{T('ns.atlas.clickHorizon')}</span>
        </div>
        <div class="scen-matrix">
          {rob.allScenarioBreaks.map((sb) => {
            const okPct = rep.taxa.length > 0 ? Math.round((sb.fitsCount / rep.taxa.length) * 100) : 100;
            const active = nsScenario.value === sb.id;
            return (
              <button
                key={sb.id}
                type="button"
                class="scen-row"
                aria-pressed={active ? 'true' : 'false'}
                onClick={() => { nsScenario.value = sb.id; }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{active ? '● ' : ''}{scenarioShort(sb.id)}</span>
                <span class="scen-bar-track" aria-hidden="true">
                  <span class="scen-bar-ok" style={{ width: `${okPct}%` }} />
                  {sb.brokenCount > 0 && <span class="scen-bar-bad" style={{ width: `${100 - okPct}%` }} />}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, textAlign: 'right', color: sb.brokenCount > 0 ? 'var(--pal-warn)' : 'var(--pal-ok)' }}>
                  {sb.brokenCount === 0 ? '✓' : '▲'} {sb.fitsCount}/{rep.taxa.length}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Soil Water Tank (Today), Dual-Depth pH, Frost-Free Window & Terrain */}
      <section class="atlas-card" aria-label={T('ns.land.waterTank')}>
        <div class="viz-head">
          <span>{T('ns.land.waterTank')} ({T('ns.today')}), pH</span>
          {waterBuffer != null && (
            <span class={`badge ${waterBuffer >= 0 ? 'badge-ok' : 'badge-warn'}`}>
              {waterBuffer >= 0 ? `✓ +${waterBuffer} ${T('ns.unit.dayShort')}` : `▲ ${Math.abs(waterBuffer)} ${T('ns.unit.dayShort')}`}
            </span>
          )}
        </div>
        {eff.tankDays != null && eff.cddDays != null && (
          <div class="tank-gauge">
            <div class="tank-bar-row">
              <span class="muted">{T('ns.land.waterTank')} ({T('ns.today')})</span>
              <div class="tank-track"><div class="tank-fill-ok" style={{ width: `${tankPct}%` }} /></div>
              <strong style={{ textAlign: 'right' }}>~{eff.tankDays} {T('ns.unit.dayShort')}</strong>
            </div>
            <div class="tank-bar-row">
              <span class="muted">{T('ns.land.drySpell')}</span>
              <div class="tank-track"><div class="tank-fill-dry" style={{ width: `${dryPct}%` }} /></div>
              <strong style={{ textAlign: 'right' }}>~{eff.cddDays} {T('ns.unit.dayShort')}</strong>
            </div>
          </div>
        )}
        {eff.soilPh != null && (
          <div style={{ display: 'grid', gap: '4px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <strong>{T('ns.atlas.dualPh')}</strong>
              <span class="muted">
                0–30 cm: {fmtNum(eff.soilPh)}{eff.subsoilPh != null ? ` · 30–100 cm: ${fmtNum(eff.subsoilPh)}` : ''}
              </span>
            </div>
            <div class="ph-track bullet-track-pad" style={{ marginBlock: '14px 4px' }}>
              <div class="ph-pin" style={{ left: `${pctPh(eff.soilPh).toFixed(1)}%` }} title={`0–30 cm pH ${fmtNum(eff.soilPh)}`}>
                <span class="pin-tag">Top</span>
              </div>
              {eff.subsoilPh != null && (
                <div class="ph-pin ph-pin-sub" style={{ left: `${pctPh(eff.subsoilPh).toFixed(1)}%` }} title={`30–100 cm pH ${fmtNum(eff.subsoilPh)}`}>
                  <span class="pin-tag" style={{ top: '17px' }}>Sub</span>
                </div>
              )}
            </div>
            <div class="bullet-scale" style={{ marginTop: '8px' }}>
              <span>4.0</span>
              <span>{texture}{eff.stonesPct != null ? ` · ${T('ns.land.rockPct', { n: Math.round(eff.stonesPct) })}` : ''}</span>
              <span>9.0</span>
            </div>
          </div>
        )}
        <div class="terrain-grid">
          <div class="terrain-cell">
            <span class="shift-dial-k">{T('ns.atlas.frostWindow')}</span>
            <strong class="small">{frostWindowText}</strong>
          </div>
          {terrain && (
            <div class="terrain-cell">
              <span class="shift-dial-k">{T('ns.atlas.terrainCell')}</span>
              <strong class="small">
                {terrain.elevM != null ? `${terrain.elevM} m` : '—'}
                {terrain.reliefM != null ? ` · ${terrain.reliefM} m` : ''}
                {terrain.slopeDeg != null ? ` · ${fmtNum(terrain.slopeDeg)}°` : ''}
                {terrain.handM != null ? ` · HAND ${fmtNum(terrain.handM)} m` : ''}
              </strong>
            </div>
          )}
        </div>
        <details class="tune-details">
          <summary><span>{T('ns.atlas.sspDisclosure')}</span><span aria-hidden="true">▾</span></summary>
          <div class="tune-body"><p class="small">{T('ns.atlas.sspBody')}</p></div>
        </details>
      </section>

      {/* 6. Like-for-like Climate-Proof Swaps */}
      <section class="atlas-card" aria-label={T('ns.swaps.title', { scen: activeScenShort })}>
        <div class="viz-head">
          <span>{T('ns.swaps.title', { scen: activeScenShort })}</span>
        </div>
        <p class="small muted">{T('ns.swaps.intro')}</p>
        {rep.taxa.length > 0 && (
          <div class="tuner-group">
            <label class="tuner-label" for="swap-target">{T('ns.swaps.forPlant')}</label>
            <select
              id="swap-target"
              class="tuner-select"
              value={targetTaxon?.id ?? ''}
              onChange={(e) => {
                setTargetId((e.target as HTMLSelectElement).value);
                setCompareId(null);
              }}
            >
              {rep.taxa.map((t) => (
                <option key={t.id} value={t.id}>{taxCommonName(t)} ({t.canonical_name})</option>
              ))}
            </select>
          </div>
        )}
        <div class="picker-list">
          {swaps.length > 0 ? swaps.map((sw) => (
            <div key={sw.taxon.id} class="picker-row">
              <PlantThumb taxon={sw.taxon} size={44} />
              <div style={{ minWidth: 0 }}>
                <div>
                  <strong>{taxCommonName(sw.taxon)}</strong>{' '}
                  <span class="small muted" style={{ fontStyle: 'italic' }}>{sw.taxon.canonical_name}</span>
                </div>
                <div class="plant-badges" style={{ marginTop: '4px' }}>
                  <span class={`badge ${verdictBadgeClass(sw.verdict.level)}`}>{activeScenShort}: {verdictSymbolLabel(sw.verdict.level)}</span>
                  <span class="badge">{lightSpanLabel(sw.taxon)}{sw.taxon.traits.height_m?.max != null ? ` · ${fmtNum(sw.taxon.traits.height_m.max)} m` : ''}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  class="btn-ghost"
                  style={{ minHeight: '44px', padding: '0 10px' }}
                  onClick={() => setCompareId(compareId === sw.taxon.id ? null : sw.taxon.id)}
                >
                  {T('ns.swaps.compare')}
                </button>
                <button
                  type="button"
                  class="btn-primary"
                  style={{ minHeight: '44px', padding: '0 12px' }}
                  onClick={() => targetTaxon && swapPlantInPalette(targetTaxon.id, sw.taxon.id)}
                >
                  {T('ns.swaps.use')}
                </button>
              </div>
            </div>
          )) : <p class="small muted">{T('ns.swaps.none')}</p>}
        </div>
        {cmpCand && targetTaxon && <SwapDiffTable curPlant={targetTaxon} candPlant={cmpCand} rep={rep} />}
      </section>
    </div>
  );
}

/** Verbatim port of mockup-v73.html Visual Botanical Field Dossier (L4034-4423). ZERO PFAF. */
function DossierDrawer({ rep, id }: { rep: PaletteReport; id: PlantId }) {
  const [details, setDetails] = useState<Details | null>(null);
  const [roleIdx, setRoleIdx] = useState(0);
  const taxon = useMemo(
    () => rep.taxa.find((t) => t.id === id)
      ?? activePool.value.find((t) => t.id === id)
      ?? nsAllTaxa.value?.find((t) => t.id === id)
      ?? null,
    [rep.taxa, activePool.value, nsAllTaxa.value, id],
  );

  useEffect(() => {
    let cancelled = false;
    const src = store.source.value;
    const z = store.climate.value;
    if (!src || !z) return;
    setDetails(null);
    setRoleIdx(0);
    void src.details(id, z, currentLocale()).then((d) => {
      if (!cancelled) setDetails(d);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  if (!taxon) return <div class="drawer-body"><p class="small muted">{T('ns.loadingPlants')}</p></div>;

  const v = rep.verdicts.get(taxon.id) ?? evaluatePlantVerdict(taxon, rep.eff);
  const vToday = evaluatePlantVerdict(taxon, rep.effToday);
  const v2050 = evaluatePlantVerdict(taxon, rep.eff2050);
  const frost = preferredFrostC(details?.frost ?? taxon.frost);
  const poll = pollinationNote(taxon);
  const pollWarn = pollinationShortWarn(taxon);
  const tox = toxBadgeInfo(taxon);
  const inPalette = useMemo(() => new Set(store.members.value), [store.members.value]);
  const swapCand = useMemo(() => findCompatibleSwaps(taxon, activePool.value, rep.eff, inPalette, 1)[0]?.taxon ?? null, [taxon, activePool.value, rep.eff, inPalette]);

  // Photo gallery switcher (overall + Schema 4.10 gallery roles) + photo credit
  const galleryItems = useMemo(() => {
    const out: { role: string; url: string | null; credit: string | null; licence: string | null }[] = [];
    if (taxon.image?.url) {
      out.push({ role: 'overall', url: taxon.image.url, credit: taxon.image.credit, licence: taxon.image.licence });
    }
    if (details?.gallery?.length) {
      for (const g of details.gallery) {
        if (!out.some((x) => x.role === g.role)) {
          out.push({ role: g.role, url: g.url, credit: g.credit, licence: g.licence });
        }
      }
    }
    if (!out.length) {
      out.push({ role: 'overall', url: null, credit: null, licence: null });
    }
    return out;
  }, [taxon.image, details?.gallery]);
  const activePhoto = galleryItems[roleIdx] ?? galleryItems[0];

  const pct = (val: number, min: number, max: number) => Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  const coldMin = -35, coldMax = 15, heatMin = 15, heatMax = 50;
  const ex = taxon.extremes;
  const ph = taxon.traits.soil_ph;
  const phLeft = ph?.min != null ? pct(ph.min, 4.0, 9.0) : null;
  const phRight = ph?.max != null ? pct(ph.max, 4.0, 9.0) : null;

  const track = rep.growingYear.tracks.get(taxon.id);
  const sowSet = new Set<string>(track?.sowing ?? []);
  const blmSet = new Set<string>(track?.bloom ?? []);
  const frtSet = new Set<string>(track?.fruiting ?? []);
  const winMonths = new Set(rep.eff.hemisphere === 'S' ? [5, 6, 7, 8] : [11, 12, 1, 2]);
  const siteShort = shortSiteName(store.location.value?.label) || store.climate.value || 'Site';
  const jobsSummary = jobsOf(taxon).map(jobLabel).join(' · ');
  const phaseRangeLabel = taxon.phases
    ? (taxon.phases.start === taxon.phases.end ? phaseLabel(taxon.phases.start) : `${phaseLabel(taxon.phases.start)} → ${phaseLabel(taxon.phases.end)}`)
    : T('ns.board.stageUnknown');

  const byId = new Map(rep.taxa.map((t) => [t.id, t]));
  const ints = rep.interactions.filter((it) => it.a === taxon.id || it.b === taxon.id);
  const areaCode = rep.eff.wgsrpdL3;
  const areaName = areaCode ? formatAreaName(areaCode, currentLocale()) : null;
  const countryCode = rep.eff.country;
  const countryName = countryCode ? formatCountryName(countryCode, currentLocale()) : null;
  const areas = details?.areas ?? taxon.areas ?? null;
  const nativeStatus = areaCode && areas
    ? (areas.native.includes(areaCode) ? 'native' : areas.introduced.includes(areaCode) ? 'introduced' : null)
    : null;
  const invasiveHere = countryCode ? (taxon.warnings.invasive_in?.some((r) => r.country === countryCode) ?? false) : false;

  const windText = taxon.windTolerant === true
    ? T('ns.picker.fWindTol')
    : taxon.windTolerant === false
      ? T('ns.reason.windSensitive')
      : isWindbreak(taxon)
        ? T('ns.picker.fWindbreak')
        : T('ns.notRecorded');

  const scaleRoomStr = rep.eff.roomLimitM != null
    ? T('ns.dossier.scaleRoom', { m: `${fmtNum(rep.eff.roomLimitM, 0)} m` })
    : '';

  const monthLabels = localizedMonthLabels();
  const isSouth = rep.eff.hemisphere === 'S';
  const mwRangeText = isSouth
    ? `${monthLabels[4]}–${monthLabels[7]}`
    : `${monthLabels[10]}–${monthLabels[1]}`;

  const renderPhenoRow = (label: string, mSet: Set<string>, k: 'sow' | 'bloom' | 'fruit') => {
    const active = MONTHS.map((m) => mSet.has(m));
    const caps = computeTrackCaps(active);
    const toneCls = k === 'fruit' ? 'yr-c-fruit' : 'yr-c-bloom';
    return (
      <>
        <div class="pheno-lbl">
          <Glyph name={k} size={14} class={toneCls} /> {label}
        </div>
        {mSet.size === 0 ? (
          <div style={{ gridColumn: '2 / 14', paddingLeft: '6px' }} class="small muted">{T('ns.unknown')}</div>
        ) : (
          MONTHS.map((m, i) => {
            const on = active[i];
            const barCls = on ? `pheno-bar ${caps[i]}`.trim() : 'pheno-bar';
            return (
              <div key={m} class="pheno-bar-cell" title={on ? `${monthLabels[i]}: ${label}` : undefined}>
                <div class={barCls} data-k={on ? k : 'none'} />
                {on && <span class="sr-only">{monthLabels[i]}: {label}</span>}
              </div>
            );
          })
        )}
      </>
    );
  };

  return (
    <div class="drawer-body">
      {/* Plant Passport Hero — Herbarium Photo Plate (1 px ink keyline + margin credit) */}
      <div class="dossier-hero">
        <figure class="herbarium-plate">
          <div class="herbarium-frame">
            {activePhoto.url ? (
              <img class="dossier-img" src={activePhoto.url} width={112} height={112} alt={`${taxCommonName(taxon)} (${activePhoto.role})`} />
            ) : (
              <span class="dossier-img plant-thumb-fb" aria-hidden="true">{(taxCommonName(taxon)[0] ?? '?').toUpperCase()}</span>
            )}
          </div>
          <figcaption class="herbarium-credit">
            {activePhoto.credit
              ? T('ns.dossier.photoCredit', { author: activePhoto.credit })
              : T('ns.dossier.sourceCurated')}
            {activePhoto.licence && (
              <> <span class="nowrap">({activePhoto.licence})</span></>
            )}
          </figcaption>
        </figure>
        <div style={{ display: 'grid', gap: '8px', flex: 1, minWidth: '200px' }}>
          <div class="passport-dials">
            <div class="passport-dial" data-lvl={vToday.level}>
              <span class="passport-dial-k">{T('ns.today')}</span>
              <span class="passport-dial-v">{verdictSymbolLabel(vToday.level)}</span>
            </div>
            <div class="passport-dial" data-lvl={v2050.level}>
              <span class="passport-dial-k">{T('ns.dossier.pin2050')}</span>
              <span class="passport-dial-v">{verdictSymbolLabel(v2050.level)}</span>
            </div>
            <div class="passport-dial">
              <span class="passport-dial-k">{T('ns.dossier.edibility')}</span>
              <span class="passport-dial-v">
                {taxon.traits.edibility_rating != null ? (
                  <>
                    {taxon.traits.edibility_rating}/5{' '}
                    <span class="edib-pips" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((n) => <span key={n} class="edib-pip" data-on={n <= taxon.traits.edibility_rating! ? 'true' : 'false'} />)}
                    </span>
                  </>
                ) : T('ns.notRecorded')}
              </span>
            </div>
          </div>
          <p class="small"><strong>{T('ns.dossier.givesGuild')}</strong> {jobsSummary || T('ns.unknown')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            {tox && <span class={`badge ${tox.cls}`}>{tox.text}</span>}
            {invasiveHere && countryName && <span class="badge badge-warn">{T('ns.dossier.invasiveHere', { country: countryName })}</span>}
            {pollWarn && <span class="badge badge-warn">{pollWarn}</span>}
            {nativeStatus === 'native' && areaName && <span class="badge badge-ok">{T('ns.dossier.nativeHere', { area: areaName })}</span>}
            {nativeStatus === 'introduced' && areaName && <span class="badge">{T('ns.dossier.introducedHere', { area: areaName })}</span>}
            <button
              type="button"
              class="onsite-btn"
              aria-pressed={v.alreadyOnSite ? 'true' : 'false'}
              onClick={() => toggleExisting(taxon.id)}
            >
              {v.alreadyOnSite ? `✓ ${T('ns.alreadyOnSite')}` : T('ns.alreadyOnSite')}
            </button>
          </div>
          {galleryItems.length > 1 && (
            <div class="pulse-chips" role="group" aria-label={T('ns.dossier.title')}>
              {galleryItems.map((g, i) => (
                <button
                  key={g.role}
                  type="button"
                  class="proto-btn"
                  aria-pressed={i === roleIdx ? 'true' : 'false'}
                  onClick={() => setRoleIdx(i)}
                >
                  {g.role}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {v.reasons.length > 0 && (
        <div class="land-alert">
          <strong>{T('ns.dossier.verdictNotes')}</strong>
          {v.reasons.map((r, i) => (
            <span key={i}>• {localizedReason(r, rep.eff, taxon)}</span>
          ))}
        </div>
      )}

      {/* 1. Unified Site Fit Plate (pin icons with words — no cryptic T / 50 / ◆ letters) */}
      <div class="unified-plate">
        <div class="viz-head">
          <span>{T('ns.dossier.fitPlate', { site: siteShort })}</span>
          <span class="small muted">{T('ns.dossier.fitLegend')}</span>
        </div>

        <div class="plate-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <strong>{T('ns.dossier.coldestNight')}</strong>
            <span class="muted">
              {ex?.tminExtreme?.low != null
                ? T('ns.dossier.recordedDownTo', { t: `${fmtNum(ex.tminExtreme.low)} °C` })
                : T('ns.notRecorded')}
            </span>
          </div>
          <div class="bullet-track" aria-label={T('ns.dossier.coldestNight')}>
            {ex?.tminExtreme?.low != null && ex?.tminExtreme?.high != null && (
              <div class="bullet-range" style={{ left: `${pct(ex.tminExtreme.low, coldMin, coldMax)}%`, width: `${Math.max(2, pct(ex.tminExtreme.high, coldMin, coldMax) - pct(ex.tminExtreme.low, coldMin, coldMax))}%` }} />
            )}
            {frost?.valueC != null && (
              <div class="bullet-frost" style={{ left: `${pct(frost.valueC, coldMin, coldMax)}%` }} title={`${T('ns.dossier.pinFrost')} (${frostSourceLabel(frost.kind)}): ${fmtNum(frost.valueC)} °C`} />
            )}
            {rep.effToday.freeze10C != null && (
              <div class="bullet-pin" style={{ left: `${pct(rep.effToday.freeze10C, coldMin, coldMax)}%` }} title={`${T('ns.dossier.pinToday')}: ${fmtNum(rep.effToday.freeze10C)} °C`} />
            )}
            {rep.eff2050.freeze10C != null && (
              <div class="bullet-pin bullet-pin-50" style={{ left: `${pct(rep.eff2050.freeze10C, coldMin, coldMax)}%` }} title={`${T('ns.dossier.pin2050')}: ${fmtNum(rep.eff2050.freeze10C)} °C`} />
            )}
          </div>
          <div class="fp-pins-row">
            <span class="fp-pin-item"><span class="fp-ico fp-ico-today" aria-hidden="true" />{T('ns.dossier.pinToday')}: <strong>{fmtNum(rep.effToday.freeze10C)} °C</strong></span>
            <span class="fp-pin-item"><span class="fp-ico fp-ico-2050" aria-hidden="true" />{T('ns.dossier.pin2050')}: <strong>{fmtNum(rep.eff2050.freeze10C)} °C</strong></span>
            {frost?.valueC != null && (
              <span class="fp-pin-item" title={frostSourceLabel(frost.kind)}><span class="fp-ico fp-ico-frost" aria-hidden="true" />{T('ns.dossier.pinFrost')}: <strong>{fmtNum(frost.valueC)} °C</strong></span>
            )}
          </div>
          <div class="bullet-scale">
            <span>−35 °C</span>
            <span>+15 °C</span>
          </div>
        </div>

        <div class="plate-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <strong>{T('ns.dossier.hottestDay')}</strong>
            <span class="muted">
              {ex?.tmaxExtreme?.high != null
                ? T('ns.dossier.recordedUpTo', { t: `${fmtNum(ex.tmaxExtreme.high)} °C` })
                : T('ns.notRecorded')}
            </span>
          </div>
          <div class="bullet-track" aria-label={T('ns.dossier.hottestDay')}>
            {ex?.tmaxExtreme?.low != null && ex?.tmaxExtreme?.high != null && (
              <div class="bullet-range" style={{ left: `${pct(ex.tmaxExtreme.low, heatMin, heatMax)}%`, width: `${Math.max(2, pct(ex.tmaxExtreme.high, heatMin, heatMax) - pct(ex.tmaxExtreme.low, heatMin, heatMax))}%` }} />
            )}
            {rep.effToday.heat10C != null && (
              <div class="bullet-pin" style={{ left: `${pct(rep.effToday.heat10C, heatMin, heatMax)}%` }} title={`${T('ns.dossier.pinToday')}: ${fmtNum(rep.effToday.heat10C)} °C`} />
            )}
            {rep.eff2050.heat10C != null && (
              <div class="bullet-pin bullet-pin-50" style={{ left: `${pct(rep.eff2050.heat10C, heatMin, heatMax)}%` }} title={`${T('ns.dossier.pin2050')}: ${fmtNum(rep.eff2050.heat10C)} °C`} />
            )}
          </div>
          <div class="fp-pins-row">
            <span class="fp-pin-item"><span class="fp-ico fp-ico-today" aria-hidden="true" />{T('ns.dossier.pinToday')}: <strong>{fmtNum(rep.effToday.heat10C)} °C</strong></span>
            <span class="fp-pin-item"><span class="fp-ico fp-ico-2050" aria-hidden="true" />{T('ns.dossier.pin2050')}: <strong>{fmtNum(rep.eff2050.heat10C)} °C</strong></span>
          </div>
          <div class="bullet-scale">
            <span>15 °C</span>
            <span>50 °C</span>
          </div>
        </div>

        <div class="plate-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <strong>{T('ns.atlas.dualPh')}</strong>
            <span class="muted">{ph?.min != null ? `${fmtNum(ph.min)}–${fmtNum(ph.max)}` : T('ns.notRecorded')}</span>
          </div>
          <div class="ph-track">
            {phLeft != null && phRight != null && (
              <div class="ph-band" style={{ left: `${phLeft}%`, width: `${Math.max(3, phRight - phLeft)}%` }} />
            )}
            {rep.eff.soilPh != null && (
              <span class="ph-marker" style={{ left: `${pct(rep.eff.soilPh, 4.0, 9.0)}%` }} title={`${T('ns.dossier.pinTopsoil')}: ${fmtNum(rep.eff.soilPh)}`}>
                <svg viewBox="0 0 12 12" aria-hidden="true"><polygon points="6,1 11,11 1,11" fill="var(--accent)" stroke="var(--surface)" stroke-width="1" /></svg>
              </span>
            )}
            {rep.eff.subsoilPh != null && (
              <span class="ph-marker" style={{ left: `${pct(rep.eff.subsoilPh, 4.0, 9.0)}%` }} title={`${T('ns.dossier.pinSubsoil')}: ${fmtNum(rep.eff.subsoilPh)}`}>
                <svg viewBox="0 0 12 12" aria-hidden="true"><polygon points="1,1 11,1 6,11" fill="var(--surface)" stroke="var(--text)" stroke-width="1.8" /></svg>
              </span>
            )}
          </div>
          <div class="fp-pins-row">
            <span class="fp-pin-item">
              <svg class="fp-ico-tri" viewBox="0 0 12 12" aria-hidden="true"><polygon points="6,1 11,11 1,11" fill="var(--accent)" /></svg>
              {T('ns.dossier.pinTopsoil')}: <strong>{fmtNum(rep.eff.soilPh)}</strong>
            </span>
            {rep.eff.subsoilPh != null && (
              <span class="fp-pin-item">
                <svg class="fp-ico-tri" viewBox="0 0 12 12" aria-hidden="true"><polygon points="1,1 11,1 6,11" fill="var(--surface)" stroke="var(--text)" stroke-width="1.8" /></svg>
                {T('ns.dossier.pinSubsoil')}: <strong>{fmtNum(rep.eff.subsoilPh)}</strong>
              </span>
            )}
          </div>
          <div class="bullet-scale">
            <span>4.0</span>
            <span>9.0</span>
          </div>
        </div>

        <div class="plate-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <strong>{T('ns.dossier.sunTolerance')}</strong>
            <span class="muted">{lightSpanLabel(taxon)}</span>
          </div>
          <div class="sun-spec">
            {SUN_ORDER.map((lvl) => {
              const on = plantMatchesSunLevel(taxon, lvl);
              const pref = plantLightKey(taxon) === lvl;
              return (
                <div key={lvl} class="sun-step" data-lvl={lvl} data-active={on ? 'true' : 'false'} data-pref={pref ? 'true' : 'false'}>
                  {lightKeyLabel(lvl)}{pref ? ' ★' : on ? ' ✓' : ''}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Mature Scale & Root Depth */}
      <div class="viz-card">
        <div class="viz-head">
          <span>{T('ns.dossier.scaleTitle')}</span>
          <span class="small muted">{T('ns.dossier.scaleSub', { room: scaleRoomStr })}</span>
        </div>
        <ScaleRootSvg taxon={taxon} roomLimitM={rep.eff.roomLimitM} />
      </div>

      {/* 3. 12-Month Phenology Gantt */}
      <div class="viz-card">
        <div class="viz-head">
          <span>{T('ns.dossier.phenoTitle', { site: siteShort })}</span>
          {rep.eff.isMildWinter && (
            <span class="cal-mw-note">
              <span class="cal-mw-swatch" aria-hidden="true" />
              {T('ns.cal.mildWinterWindow', { months: mwRangeText })}
            </span>
          )}
        </div>
        <div class="pheno-grid">
          <div />
          {MONTHS.map((m, i) => {
            const isMw = rep.eff.isMildWinter && winMonths.has(i + 1);
            return <div key={m} class="pheno-m" data-mw={isMw ? 'true' : 'false'}>{monthLabels[i]}</div>;
          })}
          {renderPhenoRow(T('studio.act.sow'), sowSet, 'sow')}
          {renderPhenoRow(T('ns.cal.bloom'), blmSet, 'bloom')}
          {renderPhenoRow(T('ns.cal.fruit'), frtSet, 'fruit')}
        </div>
      </div>

      {/* 4. 7-Phase Succession Strip */}
      <div class="viz-card">
        <div class="viz-head">
          <span>{T('ns.dossier.succTitle')}</span>
          <span>{phaseRangeLabel}</span>
        </div>
        <div class="succ-strip-7">
          {PHASE_SHORT_NAMES.map((sh, i) => {
            const on = plantCoversPhase(taxon, i);
            return <div key={sh} class="succ-stage" data-on={on ? 'true' : 'false'} title={phaseLabel(PHASE_LIST[i])}>{sh}{on ? ' ✓' : ''}</div>;
          })}
          {taxon.phases && (
            <div class="succ-span-bar" style={{ gridColumn: `${phaseOrd(taxon.phases.start) + 1} / ${phaseOrd(taxon.phases.end) + 2}` }} aria-hidden="true" />
          )}
        </div>
        <div class="plant-badges">
          <span class="badge">
            {taxon.traits.age_of_maturity_years != null
              ? (taxon.traits.age_of_maturity_years <= 0 ? T('ns.plan.ltOneYr') : `${fmtNum(taxon.traits.age_of_maturity_years)} yr`)
              : T('ns.notRecorded')}
          </span>
          <span class="badge">{taxon.traits.growth_rate ?? T('ns.notRecorded')}</span>
          <span class="badge">{taxon.traits.lifespan ?? T('ns.notRecorded')}</span>
        </div>
      </div>

      {/* 5. Field Facts Grid (words, never symbols alone — R2-2) */}
      <details class="tune-details" open>
        <summary><span>{T('ns.dossier.fieldFacts')}</span><span aria-hidden="true">▾</span></summary>
        <div class="tune-body">
          <div class="facts-grid">
            <div class="fact-card">
              <div class="fact-card-title">{T('ns.dossier.grpPollination')}</div>
              <span><strong>{T('ns.picker.fSelfFertile')}:</strong> {poll ?? T('ns.notRecorded')}</span>
              <span><strong>System:</strong> {taxon.traits.sexual_system ?? T('ns.notRecorded')}</span>
              <span><strong>Pollinators:</strong> {taxon.traits.pollinators?.length ? taxon.traits.pollinators.join(', ') : T('ns.notRecorded')}</span>
            </div>
            <div class="fact-card">
              <div class="fact-card-title">{T('ns.dossier.grpToxicity')}</div>
              <span>{toxDossierText(taxon, details)}</span>
              <span>
                <strong>Allelopathy:</strong>{' '}
                {taxon.warnings.allelopathic === true ? T('ns.dossier.yesRecorded') : taxon.warnings.allelopathic === false ? T('ns.dossier.noRecorded') : T('ns.notRecorded')}
              </span>
              <span>
                <strong>{T('ns.dossier.weedPotential')}:</strong>{' '}
                {taxon.warnings.weed_potential === true ? T('ns.dossier.weedFlagged') : taxon.warnings.weed_potential === false ? T('ns.dossier.weedLow') : T('ns.notRecorded')}
              </span>
            </div>
            <div class="fact-card">
              <div class="fact-card-title">{T('ns.dossier.grpWater')}</div>
              <span><strong>{T('ns.picker.fDrought')}:</strong> {taxon.traits.drought_tolerance ?? T('ns.notRecorded')}</span>
              <span><strong>{T('ns.field.water')}:</strong> {taxon.traits.moisture_use ?? T('ns.notRecorded')}</span>
              <span><strong>{T('ns.dossier.wind')}:</strong> {windText}</span>
              {rep.eff.tankDays != null && rep.eff.cddDays != null && (
                <span class="small muted">
                  {T('ns.arrival.waterTankSub', { tank: rep.eff.tankDays, cdd: rep.eff.cddDays, d: T('ns.unit.dayShort') })}
                </span>
              )}
            </div>
            <div class="fact-card">
              <div class="fact-card-title">{T('ns.dossier.grpSoil')}</div>
              <span>
                <strong>{T('ns.land.drainage')}:</strong>{' '}
                {taxon.traits.well_drained === true ? T('ns.dossier.wellDrained') : T('ns.notRecorded')}
              </span>
              <span><strong>{T('ns.dossier.fertility')}:</strong> {taxon.traits.fertility_requirement ?? T('ns.notRecorded')}</span>
              <span><strong>Mycorrhizae:</strong> {taxon.traits.mycorrhizal_type ?? T('ns.notRecorded')}</span>
              <span>
                <strong>{T('ns.picker.fNfix')}:</strong>{' '}
                {taxon.traits.nitrogen_fixer === true ? T('ns.dossier.yesRecorded') : taxon.traits.nitrogen_fixer === false ? T('ns.dossier.no') : T('ns.notRecorded')}
              </span>
            </div>
          </div>
        </div>
      </details>

      {swapCand && <SwapDiffTable curPlant={taxon} candPlant={swapCand} rep={rep} />}

      <div>
        <p class="pulse-kicker" style={{ marginBottom: '6px' }}>{T('ns.dossier.interactionsHead')}</p>
        {ints.length > 0 ? ints.map((it, idx) => {
          const other = byId.get(it.a === taxon.id ? it.b : it.a);
          return (
            <div key={idx} class="land-alert" style={{ marginBottom: '6px' }}>
              <strong>{it.positive ? '✓' : '⚠'} {other ? taxCommonName(other) : ''}</strong>
              {it.interaction.agent && <span>{it.interaction.agent}</span>}
            </div>
          );
        }) : (
          <p class="small muted">{T('ns.dossier.noInteractions')}</p>
        )}
      </div>

      {/* Provenance, Region & Sources (ZERO raw quotes, ZERO PFAF — R2-3) */}
      <div class="viz-card">
        <div class="viz-head">
          <span>{T('ns.dossier.sources')}</span>
          <span class="small muted">
            {taxon.climate?.cells != null
              ? T('ns.dossier.gbifCells', { n: taxon.climate.cells.toLocaleString() })
              : T('ns.dossier.gbifUnrecorded')}
          </span>
        </div>
        <span class="small">
          {areaName && (
            <>
              <strong>{T('ns.dossier.regionLine', { area: areaName })}</strong>{' '}
              {nativeStatus ?? T('ns.notRecorded')}
              {' · '}
            </>
          )}
          <strong>{T('ns.dossier.invasiveLine')}</strong>{' '}
          {invasiveHere && countryName
            ? T('ns.dossier.invasiveListed', { country: countryName })
            : (taxon.warnings.invasive_in?.length ?? 0) > 0 && countryName
              ? T('ns.dossier.invasiveOther', { country: countryName, n: taxon.warnings.invasive_in?.length ?? 0 })
              : T('ns.dossier.invasiveNone')}
        </span>
        {details && details.traitSources.length > 0 ? (
          <ul class="small" style={{ margin: 0, paddingLeft: '18px', display: 'grid', gap: '4px' }}>
            {details.traitSources.slice(0, 8).map((ts, idx) => (
              <li key={idx}>
                <strong>{traitFieldLabel(ts.field)}:</strong>{' '}
                {sanitizeSourceLabel(ts.source, details.sources[ts.source]?.label)}
                {ts.sourceUrl && (
                  <a href={ts.sourceUrl} target="_blank" rel="noopener noreferrer" class="tap-link">
                    {' '}{T('ns.dossier.sourceLink')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p class="small muted">{T('ns.dossier.sourceCurated')}</p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
        <a class="small tap-link" href="/contact/">{T('ns.dossier.suggestCorrection')}</a>
        <button class="btn-primary" type="button" onClick={() => { nsDrawer.value = null; }}>
          {T('ns.close')}
        </button>
      </div>
    </div>
  );
}

export function Drawers({ rep }: { rep: PaletteReport }) {
  const drawer = nsDrawer.value;
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Blocker A fix preserved: synchronous layout effect for Escape + focus move/restore
  useLayoutEffect(() => {
    if (!drawer) return;
    const prev = document.activeElement;
    if (prev instanceof HTMLElement && !prev.closest('.drawer')) {
      openerRef.current = prev;
    }
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nsDrawer.value = null;
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (!nsDrawer.value) {
        const opener = openerRef.current;
        openerRef.current = null;
        if (opener && opener.isConnected) opener.focus();
      }
    };
  }, [drawer]);

  if (!drawer) return null;

  const siteLabel = store.location.value?.label ?? store.climate.value ?? 'Site';
  const catalogCount = nsAllTaxa.value?.length ?? activePool.value.length;
  const dossierTaxon = drawer.kind === 'dossier'
    ? (rep.taxa.find((t) => t.id === drawer.id)
      ?? activePool.value.find((t) => t.id === drawer.id)
      ?? nsAllTaxa.value?.find((t) => t.id === drawer.id)
      ?? null)
    : null;

  const kicker = drawer.kind === 'picker'
    ? T('ns.picker.kickerLive', { n: catalogCount })
    : drawer.kind === 'atlas'
      ? `${T('ns.atlas.title')} · ${rep.eff.koppen || '—'}${rep.eff.usdaZone ? ` · USDA ${rep.eff.usdaZone}` : ''}`
      : dossierTaxon?.family && dossierTaxon?.traits.habit
        ? T('ns.dossier.specimenLabel', { family: dossierTaxon.family, habit: dossierTaxon.traits.habit })
        : (dossierTaxon?.family ?? dossierTaxon?.traits.habit ?? '');

  const title = drawer.kind === 'picker'
    ? T('ns.picker.title')
    : drawer.kind === 'atlas'
      ? siteLabel
      : dossierTaxon ? taxCommonName(dossierTaxon) : T('ns.dossier.title');

  void nsLayerValues.value;

  return (
    <div
      class="drawer-backdrop"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) nsDrawer.value = null; }}
    >
      <div
        class="drawer drawer-wide"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => { if (e.key === 'Escape') nsDrawer.value = null; }}
      >
        <div class="drawer-handle" />
        <header class="drawer-head">
          <div>
            {kicker && (
              drawer.kind === 'dossier'
                ? <p class="herbarium-label">{kicker}</p>
                : <p class="pulse-kicker">{kicker}</p>
            )}
            <h2 style={{ fontSize: '24px', marginTop: '2px' }}>{title}</h2>
            {dossierTaxon && <p class="muted" style={{ fontStyle: 'italic' }}>{dossierTaxon.canonical_name}</p>}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            class="drawer-close"
            aria-label={T('ns.close')}
            onClick={() => { nsDrawer.value = null; }}
          >
            {T('ns.close')}
          </button>
        </header>
        {drawer.kind === 'picker' && <PickerDrawer rep={rep} initialJob={drawer.job} />}
        {drawer.kind === 'atlas' && <AtlasDrawer rep={rep} swapFor={drawer.swapFor} />}
        {drawer.kind === 'dossier' && <DossierDrawer rep={rep} id={drawer.id} />}
      </div>
    </div>
  );
}
