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
  RecommendReason,
  Taxon,
} from '../../../../lib/palette/index.ts';
import {
  cellCentre,
  computeGrowingYear,
  evaluatePlantVerdict,
  findCompatibleSwaps,
  formatAreaName,
  formatCountryName,
  isLongLink,
  isStructuralVine,
  jobIds,
  jobsOf,
  months as MONTHS,
  preferredFrostC,
  rankCandidatesForGuild,
  toxicityStatusOf,
  vineSupportTree,
} from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { soilTextureLabel } from '../../rules/soil-labels.ts';
import { currentFragment, linkName, shareUrl, shownFragment } from '../../state/persist.ts';
import { T } from '../../strings.ts';
import { Glyph } from '../kit/Glyph.tsx';
import { PlantThumb, ScaleRootSvg, WalterLiethSvg } from './GuildVisuals.tsx';
import { computeTrackCaps, localizedMonthLabels, MiniYearRibbon } from './PhenologyRibbon.tsx';
import { licenceUrlFor, PhotoLightbox, safeHttpHref, type LightboxPhoto } from './PhotoLightbox.tsx';
import {
  doyToDateLabel,
  fmtNum,
  frostSourceLabel,
  habitLabel,
  jobLabel,
  lightKeyLabel,
  lightSpanLabel,
  localizedReason,
  PHASE_LIST,
  phaseLabel,
  phaseOrd,
  phaseYearLabel,
  plantCoversPhase,
  plantLightKey,
  plantMatchesSunLevel,
  pollinationNote,
  pollinationShortWarn,
  quatrefoilPetalScale,
  sanitizeSourceLabel,
  scenarioLabel,
  scenarioShort,
  shortSiteName,
  SUN_ORDER,
  taxCommonName,
  toxBadgeInfo,
  traitFieldLabel,
  verdictBadgeClass,
  verdictStampText,
  verdictSymbolLabel,
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
  nsPickerFilters,
  nsPickerFocusId,
  nsPickerMoreOpen,
  nsPickerNotice,
  nsPickerQuery,
  nsPickerScrollTop,
  nsPickerSort,
  nsScenario,
  removePlantFromPalette,
  resetPickerFilters,
  showNsToast,
  siteAnalogueLabel,
  swapPlantInPalette,
  toggleExisting,
  type PickerFilterState,
  type PickerSortBy,
} from './ns-state.ts';
import { nsFileName, nsNonSpeciesEntries, nsUnrecognizedPlants, saveCanopiFile } from './ns-file.ts';

function localizedHabit(habit: string | null | undefined): string {
  const h = (habit ?? '').toLowerCase();
  if (h.includes('tree')) return T('ns.habit.tree');
  if (h.includes('shrub') || h.includes('bush')) return T('ns.habit.shrub');
  if (h.includes('climb') || h.includes('vine') || h.includes('liana')) return T('ns.habit.vine');
  if (h.includes('ground') || h.includes('prostrate') || h.includes('mat')) return T('ns.habit.groundcover');
  if (h.includes('grass') || h.includes('sedge') || h.includes('bamboo') || h.includes('rush')) return T('ns.habit.grass');
  return T('ns.habit.herb');
}

function sizeClassLabel(t: Taxon): string {
  return localizedHabit(t.traits.habit);
}

function localizedTraitLevel(raw: string | null | undefined): string {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return T('ns.notRecorded');
  if (s === 'very high') return T('ns.val.veryHigh');
  if (s === 'high') return T('ns.val.high');
  if (s === 'medium' || s === 'moderate') return T('ns.val.medium');
  if (s === 'low') return T('ns.val.low');
  if (s === 'very low') return T('ns.val.veryLow');
  if (s === 'none') return T('ns.val.none');
  if (s === 'slow') return T('ns.val.slow');
  if (s === 'fast' || s === 'rapid') return T('ns.val.fast');
  if (s === 'short' || s === 'short-lived') return T('ns.val.short');
  if (s === 'long' || s === 'long-lived') return T('ns.val.long');
  return raw!.trim();
}

function localizedSexualSystem(raw: string | null | undefined): string {
  const s = (raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!s) return T('ns.notRecorded');
  if (s === 'hermaphrodite' || s === 'bisexual' || s === 'perfect') return T('ns.val.sex.hermaphrodite');
  if (s === 'monoecious') return T('ns.val.sex.monoecious');
  if (s === 'dioecious') return T('ns.val.sex.dioecious');
  if (s === 'gynodioecious') return T('ns.val.sex.gynodioecious');
  if (s === 'androdioecious') return T('ns.val.sex.androdioecious');
  if (s === 'polygamous') return T('ns.val.sex.polygamous');
  return raw!.trim();
}

function localizedPollinator(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (s === 'insects' || s === 'insect') return T('ns.val.poll.insects');
  if (s === 'bees' || s === 'bee') return T('ns.val.poll.bees');
  if (s === 'wind') return T('ns.val.poll.wind');
  if (s === 'birds' || s === 'bird') return T('ns.val.poll.birds');
  if (s === 'bats' || s === 'bat') return T('ns.val.poll.bats');
  if (s === 'flies' || s === 'fly') return T('ns.val.poll.flies');
  if (s === 'moths' || s === 'moth') return T('ns.val.poll.moths');
  if (s === 'butterflies' || s === 'butterfly') return T('ns.val.poll.butterflies');
  if (s === 'beetles' || s === 'beetle') return T('ns.val.poll.beetles');
  if (s === 'wasps' || s === 'wasp') return T('ns.val.poll.wasps');
  if (s === 'self') return T('ns.val.poll.self');
  if (s === 'water') return T('ns.val.poll.water');
  return raw.trim();
}

function localizedToxLevel(raw: string | null | undefined): string {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return T('ns.tox.caution');
  if (s === 'slight' || s === 'low' || s === 'mild') return T('ns.val.tox.slight');
  if (s === 'moderate' || s === 'medium') return T('ns.val.tox.moderate');
  if (s === 'high' || s === 'severe' || s === 'fatal') return T('ns.val.tox.high');
  return raw!.trim();
}

function localizedPlantPart(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (s === 'leaves' || s === 'leaf' || s === 'foliage') return T('ns.val.part.leaves');
  if (s === 'seeds' || s === 'seed') return T('ns.val.part.seeds');
  if (s === 'fruits' || s === 'fruit' || s === 'berries') return T('ns.val.part.fruits');
  if (s === 'roots' || s === 'root') return T('ns.val.part.roots');
  if (s === 'bark') return T('ns.val.part.bark');
  if (s === 'sap' || s === 'latex') return T('ns.val.part.sap');
  if (s === 'stems' || s === 'stem') return T('ns.val.part.stems');
  if (s === 'flowers' || s === 'flower') return T('ns.val.part.flowers');
  if (s === 'bulbs' || s === 'bulb') return T('ns.val.part.bulbs');
  if (s === 'all_parts' || s === 'all' || s === 'whole_plant') return T('ns.val.part.allParts');
  return raw.replace(/_/g, ' ').trim();
}

function localizedMycorrhizae(raw: string | null | undefined): string {
  const s = (raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!s) return T('ns.notRecorded');
  if (s === 'am' || s === 'arbuscular' || s === 'arbuscular_mycorrhizal') return T('ns.val.myco.am');
  if (s === 'ecm' || s === 'ecto' || s === 'ectomycorrhizal') return T('ns.val.myco.ecm');
  if (s === 'ericoid') return T('ns.val.myco.ericoid');
  if (s === 'orchid') return T('ns.val.myco.orchid');
  if (s === 'both' || s === 'am_ecm' || s === 'am+ecm') return T('ns.val.myco.both');
  if (s === 'none' || s === 'nm' || s === 'non_mycorrhizal') return T('ns.val.none');
  return raw!.trim();
}

function toxDossierText(t: Taxon, details: Details | null = null): string {
  const tx = toxicityStatusOf(t);
  if (tx.status === 'not_toxic') return T('ns.tox.none');
  if (tx.status === 'unknown') return T('ns.tox.unknown');
  const parts = details?.toxicityParts?.map((tp) => localizedPlantPart(tp.part)) ?? [];
  const uniq = [...new Set(parts)];
  return `${localizedToxLevel(tx.level)}${uniq.length ? ` (${uniq.slice(0, 3).join(', ')})` : ''}`;
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
  const cmpTag = nsScenario.value === 'today' ? T('ns.scen.y2050.short') : scenarioShort(nsScenario.value);
  const vcT = evaluatePlantVerdict(curPlant, rep.effToday);
  const vcC = evaluatePlantVerdict(curPlant, cmpEff);
  const vnT = evaluatePlantVerdict(candPlant, rep.effToday);
  const vnC = evaluatePlantVerdict(candPlant, cmpEff);
  const yrUnit = T('ns.unit.yr');
  const mUnit = T('ns.unit.m');

  const extStr = (p: Taxon) => (p.extremes?.tminExtreme?.low != null && p.extremes?.tmaxExtreme?.high != null)
    ? `${fmtNum(p.extremes.tminExtreme.low)} – ${fmtNum(p.extremes.tmaxExtreme.high)} °C`
    : T('ns.notRecorded');
  const matStr = (p: Taxon) => {
    const m = p.traits.age_of_maturity_years;
    if (m == null) return T('ns.unknown');
    return m <= 0 ? T('ns.plan.ltOneYr') : `${fmtNum(m)} ${yrUnit}`;
  };
  const sizeStr = (p: Taxon) => `${p.traits.height_m?.max != null ? `${fmtNum(p.traits.height_m.max)} ${mUnit}` : '—'} × ${p.traits.width_max_m != null ? `${fmtNum(p.traits.width_max_m)} ${mUnit}` : '—'}`;
  const waterStr = (p: Taxon) => T('ns.swaps.waterPair', {
    drought: localizedTraitLevel(p.traits.drought_tolerance),
    moisture: localizedTraitLevel(p.traits.moisture_use),
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
            <td colSpan={2}>{jobsKept.length > 0 ? jobsKept.join(', ') : T('ns.swaps.noJobsKept')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Verbatim port of mockup-v73.html Picker Drawer (L3815-4032) over ALL 761 catalog species with live facet counts & remembered filters (Wave 5 N11). */
function PickerDrawer({ rep, initialJob }: { rep: PaletteReport; initialJob: JobId | 'all' }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const query = nsPickerQuery.value;
  const f = nsPickerFilters.value;
  const moreOpen = nsPickerMoreOpen.value;
  const sortBy = nsPickerSort.value;

  const setQuery = (next: string) => { nsPickerQuery.value = next; };
  const setF = (next: PickerFilterState | ((prev: PickerFilterState) => PickerFilterState)) => {
    nsPickerFilters.value = typeof next === 'function' ? next(nsPickerFilters.peek()) : next;
  };
  const setMoreOpen = (next: boolean) => { nsPickerMoreOpen.value = next; };
  const setSortBy = (next: PickerSortBy) => { nsPickerSort.value = next; };

  // Gap CTA sets only the target job while preserving remembered query & other filters.
  useEffect(() => {
    if (initialJob !== 'all' && nsPickerFilters.peek().job !== initialJob) {
      nsPickerFilters.value = { ...nsPickerFilters.peek(), job: initialJob };
    }
  }, [initialJob]);

  // Restore scroll position and focus to the previously opened plant row when returning from Dossier.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el && nsPickerScrollTop.peek() > 0) {
      el.scrollTop = nsPickerScrollTop.peek();
    }
    const focusId = nsPickerFocusId.peek();
    if (el && focusId) {
      nsPickerFocusId.value = null;
      const btn = el.querySelector<HTMLButtonElement>(`button[data-picker-plant-id="${focusId}"]`);
      if (btn) btn.focus();
    }
  }, []);

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

  const effSig = `${rep.horizon}|${rep.eff.lat}|${rep.eff.lon}|${rep.eff.soilPh}|${rep.eff.watering}|${rep.eff.drainage}|${rep.eff.wind}|${rep.eff.siteLight}|${rep.eff.roomLimitM}|${rep.eff.plotM2}`;
  const verdictsToday = useMemo(
    () => new Map(catalog.map((t) => [t.id, evaluatePlantVerdict(t, rep.effToday)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, effSig],
  );
  const verdictsActive = useMemo(
    () => new Map(catalog.map((t) => [t.id, evaluatePlantVerdict(t, rep.eff)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, effSig],
  );
  const verdicts2050 = useMemo(
    () => new Map(catalog.map((t) => [t.id, evaluatePlantVerdict(t, rep.eff2050)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, effSig],
  );
  const pickerTracks = useMemo(() => {
    const gy = computeGrowingYear(
      catalog,
      nsLayerValues.value,
      { lat: rep.eff.lat, country: rep.eff.country, zone: store.climate.value },
      rep.eff.hemisphere,
    );
    return gy.tracks;
  }, [catalog, nsLayerValues.value, rep.eff.lat, rep.eff.country, rep.eff.hemisphere, store.climate.value]);
  const nowMonth = MONTHS[new Date().getMonth()];

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
    if (st.inBloomNow) {
      const tr = pickerTracks.get(t.id) ?? rep.growingYear.tracks.get(t.id);
      if (!tr || !tr.bloom.includes(nowMonth)) return false;
    }
    return true;
  };

  const allInteractions = useMemo(() => {
    const sets = store.interactionSets.value;
    const c = store.climate.value;
    return (c && sets[c]) ? sets[c]! : Object.values(sets).flatMap((xs) => xs ?? []);
  }, [store.interactionSets.value, store.climate.value]);

  const recommendations = useMemo(
    () => rankCandidatesForGuild(searchMatches, rep.taxa, {
      effToday: rep.effToday,
      eff2050: rep.eff2050,
      lookup: store.location.value?.lookup ?? null,
      climateZone: store.climate.value,
      interactions: allInteractions,
      layerValuesByPlant: nsLayerValues.value,
    }),
    [searchMatches, rep.taxa, rep.effToday, rep.eff2050, store.location.value?.lookup, store.climate.value, allInteractions, nsLayerValues.value],
  );

  const guildById = useMemo(() => new Map(rep.taxa.map((t) => [t.id, t])), [rep.taxa]);

  const formatRationale = (reasons: readonly RecommendReason[]): string | null => {
    const parts: string[] = [];
    for (const r of reasons) {
      if (parts.length >= 2) break;
      const partner = r.partnerId ? guildById.get(r.partnerId) : null;
      const pName = partner ? taxCommonName(partner) : r.partnerName;
      if (r.code === 'fills_gap' && r.job) parts.push(T('ns.rec.fillsGap', { job: jobLabel(r.job) }));
      else if (r.code === 'backs_up_2050' && r.job) parts.push(T('ns.rec.backsUp2050', { job: jobLabel(r.job) }));
      else if (r.code === 'yield_gain' && pName) parts.push(T('ns.rec.yieldGain', { name: pName }));
      else if (r.code === 'shared_pest' && pName) parts.push(T('ns.rec.sharedPest', { name: pName }));
      else if (r.code === 'conflict' && pName) parts.push(T('ns.rec.conflict', { name: pName }));
      else if (r.code === 'understory_shade') parts.push(T('ns.rec.understoryShade'));
      else if (r.code === 'fits_2050') parts.push(T('ns.rec.fits2050'));
      else if (r.code === 'unknown_2050') parts.push(T('ns.rec.unknown2050'));
    }
    return parts.length ? parts.join(' · ') : null;
  };

  const filtered = useMemo(() => {
    const out = searchMatches.filter((t) => matchesFilters(t, f));
    const rank = { fits: 0, check: 1, unknown: 2, at_risk: 3 };
    const effectiveSort = sortBy === 'recommended' && rep.taxa.length === 0 ? 'gaps' : sortBy;
    return out.sort((a, b) => {
      const ia = inPalette.has(a.id) ? 1 : 0, ib = inPalette.has(b.id) ? 1 : 0;
      if (ia !== ib) return ia - ib;
      if (effectiveSort === 'recommended') {
        const va = verdictsActive.get(a.id)?.level ?? 'unknown';
        const vb = verdictsActive.get(b.id)?.level ?? 'unknown';
        if (rank[va] !== rank[vb]) return rank[va] - rank[vb];
        const sa = recommendations.get(a.id)?.score ?? 0;
        const sb = recommendations.get(b.id)?.score ?? 0;
        if (sa !== sb) return sb - sa;
      } else if (effectiveSort === 'gaps') {
        const ga = jobsOf(a).filter((j) => neededJobs.has(j)).length;
        const gb = jobsOf(b).filter((j) => neededJobs.has(j)).length;
        if (ga !== gb) return gb - ga;
      } else if (effectiveSort === 'height') {
        const ha = a.traits.height_m?.max ?? 999, hb = b.traits.height_m?.max ?? 999;
        if (ha !== hb) return ha - hb;
      } else if (effectiveSort === 'az') {
        return taxCommonName(a).localeCompare(taxCommonName(b));
      }
      const va = verdictsActive.get(a.id)?.level ?? 'unknown';
      const vb = verdictsActive.get(b.id)?.level ?? 'unknown';
      return (rank[va] - rank[vb]) || taxCommonName(a).localeCompare(taxCommonName(b));
    });
  }, [searchMatches, f, sortBy, rep.taxa.length, inPalette, neededJobs, recommendations, verdictsActive, verdictsToday, verdicts2050, rep.eff.roomLimitM, rep.eff.soilPh]);

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
    { key: 'inBloomNow', label: T('ns.picker.fInBloom') },
  ];

  const activeFilterCount = (f.job !== 'all' ? 1 : 0)
    + (f.sun !== 'all' ? 1 : 0)
    + (f.habit !== 'all' ? 1 : 0)
    + (f.phaseIdx !== null ? 1 : 0)
    + boolLabels.filter((b) => Boolean(f[b.key])).length;

  function clearFilters() {
    resetPickerFilters();
  }

  return (
    <div
      ref={bodyRef}
      class="drawer-body"
      onScroll={(e) => { nsPickerScrollTop.value = (e.currentTarget as HTMLDivElement).scrollTop; }}
    >
      {nsPickerNotice.value && (
        <div class="land-alert picker-notice" role="status">
          <span>{nsPickerNotice.value}</span>
          <button type="button" class="edit-reset" onClick={() => { nsPickerNotice.value = null; }}>
            {T('ns.close')}
          </button>
        </div>
      )}
      <label class="sr-only" for="picker-search">{T('ns.picker.searchPlaceholder', { n: catalog.length })}</label>
      <input
        id="picker-search"
        class="tuner-input"
        type="search"
        placeholder={T('ns.picker.searchPlaceholder', { n: catalog.length })}
        value={query}
        onInput={(e) => {
          if (nsPickerNotice.value) nsPickerNotice.value = null;
          setQuery((e.target as HTMLInputElement).value);
        }}
      />

      <div class="pf-chips" aria-label={T('ns.picker.moreFilters')}>
        {boolChip('fillsGap', T('ns.picker.fFillsGap'))}
        {boolChip('thrives2050', T('ns.picker.fThrives2050'))}
        {boolChip('inBloomNow', T('ns.picker.fInBloom'))}
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
            onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as 'recommended' | 'fit' | 'gaps' | 'height' | 'az')}
          >
            <option value="recommended">{T('ns.picker.sortRecommended')}</option>
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
              {(['tree', 'shrub', 'herb', 'ground', 'vine'] as const).map((k) =>
                facetChip(k, habitLabel(k), f.habit === k, cntWith({ habit: k }), () => setF((prev) => ({ ...prev, habit: prev.habit === k ? 'all' : k }))),
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
          {f.habit !== 'all' && <button type="button" class="active-pill" onClick={() => setF((p) => ({ ...p, habit: 'all' }))}>{habitLabel(f.habit)} <span aria-hidden="true">✕</span></button>}
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
            const pTrack = pickerTracks.get(p.id) ?? rep.growingYear.tracks.get(p.id);
            const recEval = recommendations.get(p.id);
            const recLine = !added && recEval ? formatRationale(recEval.reasons) : null;
            return (
              <div key={p.id} class="picker-row-v7">
                <button
                  type="button"
                  class="picker-row-open"
                  data-picker-plant-id={p.id}
                  onClick={() => {
                    if (bodyRef.current) nsPickerScrollTop.value = bodyRef.current.scrollTop;
                    nsPickerFocusId.value = p.id;
                    nsDrawer.value = { kind: 'dossier', id: p.id, returnTo: { kind: 'picker', job: f.job } };
                  }}
                >
                  <PlantThumb taxon={p} size={44} />
                  <div style={{ minWidth: 0 }}>
                    <div>
                      <strong>{taxCommonName(p)}</strong>{' '}
                      <span class="plant-bot">{p.canonical_name}</span>
                    </div>
                    {recLine && <div class="small muted picker-rationale">{recLine}</div>}
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
    const sets = store.interactionSets.value;
    const c = store.climate.value;
    const interactions = (c && sets[c]) ? sets[c]! : Object.values(sets).flatMap((xs) => xs ?? []);
    const others = rep.taxa.filter((t) => t.id !== targetTaxon.id);
    return findCompatibleSwaps(
      targetTaxon,
      pool,
      eff,
      inPalette,
      5,
      { eff2050: rep.eff2050, lookup: store.location.value?.lookup ?? null, climateZone: c, interactions },
      others,
    );
  }, [targetTaxon, pool, eff, inPalette, rep.eff2050, rep.taxa, store.interactionSets.value, store.climate.value, store.location.value?.lookup]);
  const cmpCand = compareId ? pool.find((x) => x.id === compareId) ?? null : null;

  const activeScenShort = scenarioShort(nsScenario.value);
  const analogue = siteAnalogueLabel.value;
  const dFreeze = eff2050.freeze10C != null && effToday.freeze10C != null ? eff2050.freeze10C - effToday.freeze10C : null;
  const dHeat = eff2050.heat10C != null && effToday.heat10C != null ? eff2050.heat10C - effToday.heat10C : null;
  const dDry = eff2050.dryMonths != null && effToday.dryMonths != null ? eff2050.dryMonths - effToday.dryMonths : null;
  const fmtDelta = (v: number | null, unit: string) => v == null ? '—' : `${v > 0 ? '+' : ''}${fmtNum(v, 1)} ${unit}`;

  const strongCount = rob.strongPillars;
  const tankDays = eff.tankDays ?? 0;
  const cddDays = eff.cddDays ?? 0;
  const maxTankScale = Math.max(tankDays, cddDays, 30);
  const tankPct = Math.min(100, Math.round((tankDays / maxTankScale) * 100));
  const dryPct = Math.min(100, Math.round((cddDays / maxTankScale) * 100));
  const waterBuffer = eff.tankDays != null && eff.cddDays != null ? eff.tankDays - eff.cddDays : null;
  const pctPh = (val: number) => Math.max(0, Math.min(100, ((val - 4.0) / 5.0) * 100));
  const topFamily = rob.familiesSorted[0] ?? ['—', 0];

  // A6 Quatrefoil: area-proportional 0..1 petal scores (sqrt(v), no floor) + weakest pillar identification
  const backedUpJobs = 6 - rep.missingJobs.length - rep.noBackupJobs.length;
  const jobsScale = quatrefoilPetalScale((rep.coveredJobs + backedUpJobs) / 12);
  const famScale = rep.taxa.length === 0
    ? 0
    : quatrefoilPetalScale(rob.monocultureWarn ? Math.min(0.55, rob.familyCount / Math.max(1, rep.taxa.length)) : Math.min(1, rob.familyCount / Math.min(rep.taxa.length, 6)));
  const shockScale = rep.taxa.length === 0 ? 0 : quatrefoilPetalScale(rob.survivesAllCore / rep.taxa.length);
  const monthScale = quatrefoilPetalScale(rep.growingYear.activeMonths.length / 12);

  type PillarKey = 'jobs' | 'families' | 'shocks' | 'months';
  const pillarScores: { key: PillarKey; ok: boolean; scale: number }[] = [
    { key: 'jobs', ok: rob.redundancyOk, scale: jobsScale },
    { key: 'families', ok: rob.familyDiversityOk, scale: famScale },
    { key: 'shocks', ok: rob.shockSurvivalOk, scale: shockScale },
    { key: 'months', ok: rob.seasonalityOk, scale: monthScale },
  ];
  const weakestPillar: PillarKey | null = strongCount >= 4
    ? null
    : ([...pillarScores].filter((p) => !p.ok).sort((a, b) => a.scale - b.scale)[0]?.key ?? null);

  // Aggregate unique bloom & fruiting months across the palette for Q4 A1b ribbon
  const aggBloom = MONTHS.filter((m) =>
    rep.taxa.some((t) => rep.growingYear.tracks.get(t.id)?.bloom.includes(m)),
  );
  const aggFruit = MONTHS.filter((m) =>
    rep.taxa.some((t) => rep.growingYear.tracks.get(t.id)?.fruiting.includes(m)),
  );

  // Leader elbow geometry from weakest petal tip to its quadrant edge (hidden below 639px via .qf-leader CSS)
  const leaderCoords = (k: PillarKey | null): { cx: number; cy: number; pts: string } | null => {
    if (k === 'jobs') {
      const r = Math.max(0.32, jobsScale);
      const tipX = 108 - 64 * r, tipY = 102 - 64 * r;
      return { cx: tipX, cy: tipY, pts: `${tipX.toFixed(1)},${tipY.toFixed(1)} ${Math.max(18, tipX - 16).toFixed(1)},46 2,46` };
    }
    if (k === 'families') {
      const r = Math.max(0.32, famScale);
      const tipX = 108 + 64 * r, tipY = 102 - 64 * r;
      return { cx: tipX, cy: tipY, pts: `${tipX.toFixed(1)},${tipY.toFixed(1)} ${Math.min(198, tipX + 16).toFixed(1)},46 214,46` };
    }
    if (k === 'shocks') {
      const r = Math.max(0.32, shockScale);
      const tipX = 108 + 64 * r, tipY = 102 + 64 * r;
      return { cx: tipX, cy: tipY, pts: `${tipX.toFixed(1)},${tipY.toFixed(1)} ${Math.min(198, tipX + 16).toFixed(1)},158 214,158` };
    }
    if (k === 'months') {
      const r = Math.max(0.32, monthScale);
      const tipX = 108 - 64 * r, tipY = 102 + 64 * r;
      return { cx: tipX, cy: tipY, pts: `${tipX.toFixed(1)},${tipY.toFixed(1)} ${Math.max(18, tipX - 16).toFixed(1)},158 2,158` };
    }
    return null;
  };
  const weakLeader = leaderCoords(weakestPillar);

  const texture = soilTextureLabel(store.location.value?.lookup?.soil?.texture);
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
            <span class="shift-dial-v">
              {effToday.freeze10C != null || eff2050.freeze10C != null
                ? `${fmtNum(effToday.freeze10C)} → ${fmtNum(eff2050.freeze10C)} °C`
                : T('ns.unknown')}
            </span>
            <span class="shift-dial-d">{fmtDelta(dFreeze, '°C')}</span>
          </div>
          <div class="shift-dial">
            <span class="shift-dial-k">{T('ns.land.heat10')}</span>
            <span class="shift-dial-v">
              {effToday.heat10C != null || eff2050.heat10C != null
                ? `${fmtNum(effToday.heat10C)} → ${fmtNum(eff2050.heat10C)} °C`
                : T('ns.unknown')}
            </span>
            <span class="shift-dial-d">{fmtDelta(dHeat, '°C')}</span>
          </div>
          <div class="shift-dial">
            <span class="shift-dial-k">{T('ns.land.drySpell')}</span>
            <span class="shift-dial-v">
              {effToday.dryMonths != null || eff2050.dryMonths != null
                ? `${effToday.dryMonths ?? '—'} → ${eff2050.dryMonths ?? '—'} / 12`
                : T('ns.unknown')}
            </span>
            <span class="shift-dial-d">{dDry == null ? '—' : dDry === 0 ? '0' : `${dDry > 0 ? '+' : ''}${dDry}`}</span>
          </div>
        </div>
      </section>

      {/* 2. A6 Four-Pillar Agroecological Robustness Quatrefoil */}
      <section class="atlas-card" aria-label={T('ns.atlas.pillarsHead')}>
        <div>
          <p class="pulse-kicker">{T('ns.atlas.pillarsHead')}</p>
          <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '2px' }}>{T('ns.atlas.pillarsStrong', { n: strongCount })}</div>
        </div>

        <div class="qf-layout">
          {/* Q1: Top-left (Jobs) */}
          <div class={`qf-quad qf-q1 ${weakestPillar === 'jobs' ? 'weak' : ''}`.trim()}>
            <div class="qf-q-head">
              <span>1. {T('ns.pillar.jobs')}</span>
              <span class={`stamp stamp-${rob.redundancyOk ? 'ok' : 'warn'}`}>
                {verdictStampText(rob.redundancyOk ? 'fits' : 'check')}
              </span>
            </div>
            <div class="qf-q-score tnum">{T('ns.pillar.score.jobs', { cov: rep.coveredJobs, bak: backedUpJobs })}</div>
            {weakestPillar === 'jobs' && <p class="qf-weak-sent">{T('ns.pillar.weak.jobs')}</p>}
          </div>

          {/* Q2: Top-right (Families) */}
          <div class={`qf-quad qf-q2 ${weakestPillar === 'families' ? 'weak' : ''}`.trim()}>
            <div class="qf-q-head">
              <span>2. {T('ns.pillar.families')}</span>
              <span class={`stamp stamp-${rob.familyDiversityOk ? 'ok' : 'warn'}`}>
                {verdictStampText(rob.familyDiversityOk ? 'fits' : 'check')}
              </span>
            </div>
            <div class="qf-q-score tnum">
              {rep.taxa.length > 0
                ? T('ns.pillar.score.families', { n: rob.familyCount, fam: topFamily[0], top: topFamily[1], total: rep.taxa.length })
                : T('ns.pillar.score.familiesEmpty')}
            </div>
            {weakestPillar === 'families' && <p class="qf-weak-sent">{T('ns.pillar.weak.families')}</p>}
          </div>

          {/* Center: Proportional 4-Petal Quatrefoil SVG (area-proportional sqrt(v), 0 = dashed outline only) */}
          <div class="qf-center">
            <svg width="216" height="204" viewBox="0 0 216 204" role="img" aria-label={T('ns.atlas.pillarsStrong', { n: strongCount })}>
              <line x1="108" y1="16" x2="108" y2="188" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 3" />
              <line x1="22" y1="102" x2="194" y2="102" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 3" />
              <g fill="none" stroke="var(--border-strong)" stroke-width="1.2" stroke-dasharray="3 2">
                <path d="M108 102 C80 102 38 76 44 38 C82 32 108 74 108 102 Z" />
                <path d="M108 102 C108 74 134 32 172 38 C178 76 136 102 108 102 Z" />
                <path d="M108 102 C136 102 178 128 172 166 C134 172 108 130 108 102 Z" />
                <path d="M108 102 C108 130 82 172 44 166 C38 128 80 102 108 102 Z" />
              </g>
              {/* NW: Jobs */}
              {jobsScale > 0 && (
                <g transform={`translate(108 102) scale(${jobsScale.toFixed(3)}) translate(-108 -102)`}>
                  <path
                    d="M108 102 C80 102 38 76 44 38 C82 32 108 74 108 102 Z"
                    fill={weakestPillar === 'jobs' ? 'var(--accent)' : 'var(--plant-green)'}
                    fill-opacity={weakestPillar === 'jobs' ? '0.28' : '0.24'}
                    stroke={weakestPillar === 'jobs' ? 'var(--accent)' : 'var(--plant-green)'}
                    stroke-width={weakestPillar === 'jobs' ? '2' : '1.8'}
                  />
                </g>
              )}
              {/* NE: Families */}
              {famScale > 0 && (
                <g transform={`translate(108 102) scale(${famScale.toFixed(3)}) translate(-108 -102)`}>
                  <path
                    d="M108 102 C108 74 134 32 172 38 C178 76 136 102 108 102 Z"
                    fill={weakestPillar === 'families' ? 'var(--accent)' : 'var(--plant-green)'}
                    fill-opacity={weakestPillar === 'families' ? '0.28' : '0.24'}
                    stroke={weakestPillar === 'families' ? 'var(--accent)' : 'var(--plant-green)'}
                    stroke-width={weakestPillar === 'families' ? '2' : '1.8'}
                  />
                </g>
              )}
              {/* SE: Climate shocks */}
              {shockScale > 0 && (
                <g transform={`translate(108 102) scale(${shockScale.toFixed(3)}) translate(-108 -102)`}>
                  <path
                    d="M108 102 C136 102 178 128 172 166 C134 172 108 130 108 102 Z"
                    fill={weakestPillar === 'shocks' ? 'var(--accent)' : 'var(--plant-green)'}
                    fill-opacity={weakestPillar === 'shocks' ? '0.28' : '0.24'}
                    stroke={weakestPillar === 'shocks' ? 'var(--accent)' : 'var(--plant-green)'}
                    stroke-width={weakestPillar === 'shocks' ? '2' : '1.8'}
                  />
                </g>
              )}
              {/* SW: Active months */}
              {monthScale > 0 && (
                <g transform={`translate(108 102) scale(${monthScale.toFixed(3)}) translate(-108 -102)`}>
                  <path
                    d="M108 102 C108 130 82 172 44 166 C38 128 80 102 108 102 Z"
                    fill={weakestPillar === 'months' ? 'var(--accent)' : 'var(--plant-green)'}
                    fill-opacity={weakestPillar === 'months' ? '0.28' : '0.24'}
                    stroke={weakestPillar === 'months' ? 'var(--accent)' : 'var(--plant-green)'}
                    stroke-width={weakestPillar === 'months' ? '2' : '1.8'}
                  />
                </g>
              )}
              {weakLeader && (
                <g class="qf-leader" aria-hidden="true">
                  <polyline points={weakLeader.pts} fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                  <circle cx={weakLeader.cx.toFixed(1)} cy={weakLeader.cy.toFixed(1)} r="3.5" fill="var(--accent)" />
                </g>
              )}
              <circle cx="108" cy="102" r="16" fill="var(--surface)" stroke="var(--border-strong)" stroke-width="1.4" />
              <text x="108" y="106.5" text-anchor="middle" font-size="12.5" font-weight="600" fill="var(--text)">{strongCount}/4</text>
            </svg>
          </div>

          {/* Q3: Bottom-right (Climate shocks) */}
          <div class={`qf-quad qf-q3 ${weakestPillar === 'shocks' ? 'weak' : ''}`.trim()}>
            <div class="qf-q-head">
              <span>3. {T('ns.pillar.shocks')}</span>
              <span class={`stamp stamp-${rob.shockSurvivalOk ? 'ok' : 'warn'}`}>
                {verdictStampText(rob.shockSurvivalOk ? 'fits' : 'check')}
              </span>
            </div>
            <div class="qf-q-score tnum">{T('ns.pillar.score.shocks', { ok: rob.survivesAllCore, total: rep.taxa.length })}</div>
            {weakestPillar === 'shocks' && <p class="qf-weak-sent">{T('ns.pillar.weak.shocks')}</p>}
          </div>

          {/* Q4: Bottom-left (Active months — reuses A1b MiniYearRibbon with bloom & fruit glyphs) */}
          <div class={`qf-quad qf-q4 ${weakestPillar === 'months' ? 'weak' : ''}`.trim()}>
            <div class="qf-q-head">
              <span>4. {T('ns.pillar.months')}</span>
              <span class={`stamp stamp-${rob.seasonalityOk ? 'ok' : 'warn'}`}>
                {verdictStampText(rob.seasonalityOk ? 'fits' : 'check')}
              </span>
            </div>
            <div class="qf-q-score tnum">{T('ns.pillar.score.months', { n: rep.growingYear.activeMonths.length })}</div>
            {(aggBloom.length > 0 || aggFruit.length > 0) && (
              <div style={{ marginTop: '3px' }}>
                <MiniYearRibbon bloom={aggBloom} fruiting={aggFruit} />
              </div>
            )}
            {weakestPillar === 'months' && <p class="qf-weak-sent">{T('ns.pillar.weak.months')}</p>}
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
                <span class="pin-tag">{T('ns.atlas.phTop')}</span>
              </div>
              {eff.subsoilPh != null && (
                <div class="ph-pin ph-pin-sub" style={{ left: `${pctPh(eff.subsoilPh).toFixed(1)}%` }} title={`30–100 cm pH ${fmtNum(eff.subsoilPh)}`}>
                  <span class="pin-tag" style={{ top: '17px' }}>{T('ns.atlas.phSub')}</span>
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
  const swapCand = useMemo(() => {
    const sets = store.interactionSets.value;
    const c = store.climate.value;
    const interactions = (c && sets[c]) ? sets[c]! : Object.values(sets).flatMap((xs) => xs ?? []);
    const others = rep.taxa.filter((t) => t.id !== taxon.id);
    return findCompatibleSwaps(
      taxon,
      activePool.value,
      rep.eff,
      inPalette,
      1,
      { eff2050: rep.eff2050, lookup: store.location.value?.lookup ?? null, climateZone: c, interactions },
      others,
    )[0]?.taxon ?? null;
  }, [taxon, activePool.value, rep.eff, rep.eff2050, rep.taxa, inPalette, store.interactionSets.value, store.climate.value, store.location.value?.lookup]);

  // Photo gallery switcher (local-only URLs: zero third-party requests; Wave 5 N8-N9) + photo credit
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const zoomBtnRef = useRef<HTMLButtonElement>(null);
  const galleryItems = useMemo(() => {
    const out: { role: string; url: string | null; credit: string | null; licence: string | null; sourcePageUrl: string | null }[] = [];
    if (taxon.image?.url && taxon.image.url.startsWith('/')) {
      out.push({
        role: 'overall',
        url: taxon.image.url,
        credit: taxon.image.credit,
        licence: taxon.image.licence,
        sourcePageUrl: taxon.image.source_page_url,
      });
    }
    if (details?.gallery?.length) {
      for (const g of details.gallery) {
        if (g.url && g.url.startsWith('/') && !out.some((x) => x.role === g.role)) {
          out.push({
            role: g.role,
            url: g.url,
            credit: g.credit,
            licence: g.licence,
            sourcePageUrl: g.source_page_url,
          });
        }
      }
    }
    if (!out.length) {
      out.push({ role: 'overall', url: null, credit: null, licence: null, sourcePageUrl: null });
    }
    return out;
  }, [taxon.image, details?.gallery]);
  const activePhoto = galleryItems[roleIdx] ?? galleryItems[0];
  const lightboxItems: LightboxPhoto[] = useMemo(
    () => galleryItems.filter((g): g is LightboxPhoto => typeof g.url === 'string' && g.url.length > 0),
    [galleryItems],
  );
  const activeSourceHref = safeHttpHref(activePhoto.sourcePageUrl);
  const activeLicHref = licenceUrlFor(activePhoto.licence);
  const vineSupport = isStructuralVine(taxon) ? vineSupportTree(taxon, rep.taxa) : null;
  const vineNote = isStructuralVine(taxon)
    ? (vineSupport ? T('ns.vine.climbsTree', { tree: taxCommonName(vineSupport) }) : T('ns.vine.needsTrellis'))
    : null;

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
      {/* Plant Passport Hero — Herbarium Photo Plate (1 px ink keyline + margin credit + Botanical Lightbox) */}
      <div class="dossier-hero">
        <figure class="herbarium-plate">
          <div class="herbarium-frame">
            {activePhoto.url ? (
              <button
                ref={zoomBtnRef}
                type="button"
                class="herbarium-zoom-btn"
                aria-label={T('ns.lightbox.openAria', { plant: taxCommonName(taxon) })}
                onClick={() => setLightboxOpen(true)}
              >
                <img class="dossier-img" src={activePhoto.url} width={112} height={112} alt={`${taxCommonName(taxon)} (${activePhoto.role})`} />
                <span class="herbarium-zoom-cue" aria-hidden="true">⤢</span>
              </button>
            ) : (
              <span class="dossier-img plant-thumb-fb" aria-hidden="true">
                <Glyph
                  name={(taxon.traits.habit ?? '').toLowerCase().includes('tree') ? 'phase-canopy' : (taxon.traits.habit ?? '').toLowerCase().includes('shrub') ? 'phase-shrub' : 'phase-seedling'}
                  size={44}
                />
              </span>
            )}
          </div>
          <figcaption class="herbarium-credit">
            {activePhoto.credit
              ? T('ns.dossier.photoCredit', { author: activePhoto.credit })
              : T('ns.dossier.sourceCurated')}
            {activePhoto.licence && (
              <>
                {' '}
                {activeLicHref ? (
                  <a class="herbarium-credit-link nowrap" href={activeLicHref} target="_blank" rel="noopener noreferrer">
                    ({activePhoto.licence})
                  </a>
                ) : (
                  <span class="nowrap">({activePhoto.licence})</span>
                )}
              </>
            )}
            {activeSourceHref && (
              <>
                {' '}
                <a class="herbarium-credit-link nowrap" href={activeSourceHref} target="_blank" rel="noopener noreferrer">
                  {T('ns.lightbox.sourceLink')} ↗
                </a>
              </>
            )}
          </figcaption>
        </figure>
        {lightboxOpen && lightboxItems.length > 0 && (
          <PhotoLightbox
            items={lightboxItems}
            initialIdx={Math.min(roleIdx, lightboxItems.length - 1)}
            taxonName={taxCommonName(taxon)}
            canonicalName={taxon.canonical_name}
            onClose={() => setLightboxOpen(false)}
            returnFocusTo={zoomBtnRef.current}
          />
        )}
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
            {vineNote && <span class="badge">{vineNote}</span>}
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
        <div class="pheno-scroll" tabIndex={0} role="region" aria-label={T('ns.dossier.phenoTitle', { site: siteShort })}>
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
      </div>

      {/* 4. 7-Phase Succession Strip */}
      <div class="viz-card">
        <div class="viz-head">
          <span>{T('ns.dossier.succTitle')}</span>
          <span>{phaseRangeLabel}</span>
        </div>
        <div class="succ-strip-7">
          {PHASE_LIST.map((ph, i) => {
            const on = plantCoversPhase(taxon, i);
            return <div key={ph} class="succ-stage tnum" data-on={on ? 'true' : 'false'} title={phaseLabel(ph)}>{phaseYearLabel(ph)}{on ? ' ✓' : ''}</div>;
          })}
          {taxon.phases && (
            <div class="succ-span-bar" style={{ gridColumn: `${phaseOrd(taxon.phases.start) + 1} / ${phaseOrd(taxon.phases.end) + 2}` }} aria-hidden="true" />
          )}
        </div>
        <div class="plant-badges">
          <span class="badge">
            {taxon.traits.age_of_maturity_years != null
              ? (taxon.traits.age_of_maturity_years <= 0 ? T('ns.plan.ltOneYr') : `${fmtNum(taxon.traits.age_of_maturity_years)} ${T('ns.unit.yr')}`)
              : T('ns.notRecorded')}
          </span>
          <span class="badge">{localizedTraitLevel(taxon.traits.growth_rate)}</span>
          <span class="badge">{localizedTraitLevel(taxon.traits.lifespan)}</span>
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
              <span><strong>{T('ns.dossier.system')}:</strong> {localizedSexualSystem(taxon.traits.sexual_system)}</span>
              <span><strong>{T('ns.dossier.pollinators')}:</strong> {taxon.traits.pollinators?.length ? taxon.traits.pollinators.map(localizedPollinator).join(', ') : T('ns.notRecorded')}</span>
            </div>
            <div class="fact-card">
              <div class="fact-card-title">{T('ns.dossier.grpToxicity')}</div>
              <span>{toxDossierText(taxon, details)}</span>
              <span>
                <strong>{T('ns.dossier.allelopathy')}:</strong>{' '}
                {taxon.warnings.allelopathic === true ? T('ns.dossier.yesRecorded') : taxon.warnings.allelopathic === false ? T('ns.dossier.noRecorded') : T('ns.notRecorded')}
              </span>
              <span>
                <strong>{T('ns.dossier.weedPotential')}:</strong>{' '}
                {taxon.warnings.weed_potential === true ? T('ns.dossier.weedFlagged') : taxon.warnings.weed_potential === false ? T('ns.dossier.weedLow') : T('ns.notRecorded')}
              </span>
            </div>
            <div class="fact-card">
              <div class="fact-card-title">{T('ns.dossier.grpWater')}</div>
              <span><strong>{T('ns.picker.fDrought')}:</strong> {localizedTraitLevel(taxon.traits.drought_tolerance)}</span>
              <span><strong>{T('ns.field.water')}:</strong> {localizedTraitLevel(taxon.traits.moisture_use)}</span>
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
                {taxon.traits.well_drained === true
                  ? T('ns.dossier.wellDrained')
                  : taxon.traits.well_drained === false
                    ? T('ns.dossier.notWellDrained')
                    : T('ns.notRecorded')}
              </span>
              <span><strong>{T('ns.dossier.fertility')}:</strong> {localizedTraitLevel(taxon.traits.fertility_requirement)}</span>
              <span><strong>{T('ns.dossier.mycorrhizae')}:</strong> {localizedMycorrhizae(taxon.traits.mycorrhizal_type)}</span>
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
        <a class="small tap-link" href={currentLocale() === 'en' ? '/contact/' : `/${currentLocale()}/contact/`}>{T('ns.dossier.suggestCorrection')}</a>
        <button class="btn-primary" type="button" onClick={() => { nsDrawer.value = null; }}>
          {T('ns.close')}
        </button>
      </div>
    </div>
  );
}

function ShareDrawer() {
  const [withPlace, setWithPlace] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = shownFragment.value;
  const loc = store.location.value;
  const origin = cellCentre(loc?.lookup ?? null);
  const c = store.country.value;
  const hasPlace = origin !== null || (c.code !== null && c.source !== 'guess');
  const fragment = withPlace && hasPlace
    ? (currentFragment({ origin, place: true, name: linkName(loc) }) ?? shown)
    : shown;
  const href = typeof window !== 'undefined' ? window.location.href : 'https://projectcanopi.com/palette/';
  const url = fragment ? shareUrl(href, fragment) : href;
  const isCopied = copiedUrl === url;
  const longLink = isLongLink(url);
  const unrecCount = nsUnrecognizedPlants.value.length;
  const nonSpeciesCount = nsNonSpeciesEntries.value.length;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function onCopy() {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      showNsToast(T('ns.plan.linkCopied'));
    } catch {
      inputRef.current?.select();
      setCopyFailed(true);
    }
  }

  async function onNativeShare() {
    try {
      await navigator.share({ title: T('ns.share.title'), url });
    } catch { /* user cancelled */ }
  }

  async function onSaveFromShare() {
    const ok = await saveCanopiFile();
    if (ok) {
      const savedName = nsFileName.peek();
      showNsToast(savedName ? T('ns.file.savedTo', { name: savedName }) : T('ns.file.saved'));
    }
  }

  return (
    <div class="drawer-body share-drawer-body">
      <p class="muted">{T('ns.share.lede')}</p>

      <div class="share-url-row">
        <label class="sr-only" for="ns-share-url">{T('ns.share.urlLabel')}</label>
        <input
          id="ns-share-url"
          ref={inputRef}
          class="place-input share-url-input"
          type="text"
          readOnly
          value={url}
          onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
        />
        <button type="button" class="btn-primary" onClick={() => void onCopy()}>
          {isCopied ? `✓ ${T('ns.plan.linkCopied')}` : T('ns.share.copyBtn')}
        </button>
      </div>

      {copyFailed && (
        <p class="small muted" role="status">{T('ns.share.copyManual')}</p>
      )}

      {canNativeShare && (
        <div>
          <button type="button" class="btn-ghost" onClick={() => void onNativeShare()}>
            {T('ns.share.nativeBtn')}
          </button>
        </div>
      )}

      {hasPlace && (
        <label class="share-place-toggle">
          <input
            type="checkbox"
            checked={withPlace}
            onChange={(e) => setWithPlace((e.currentTarget as HTMLInputElement).checked)}
          />
          <span>
            <strong>{T('ns.share.includePlace')}</strong>
            <span class="small muted share-toggle-sub">
              {withPlace ? T('ns.share.includePlaceOn') : T('ns.share.includePlaceOff')}
            </span>
          </span>
        </label>
      )}

      {longLink && (
        <div class="land-alert">
          <span>{T('ns.share.longWarn')}</span>
          <button type="button" class="btn-ghost btn-sm" onClick={() => void onSaveFromShare()}>
            {T('ns.file.saveCanopi')}
          </button>
        </div>
      )}

      {(unrecCount > 0 || nonSpeciesCount > 0) && (
        <div class="land-alert">
          <span>{T('ns.share.unrecWarn', { n: unrecCount + nonSpeciesCount })}</span>
          <button type="button" class="btn-ghost btn-sm" onClick={() => void onSaveFromShare()}>
            {T('ns.file.saveCanopi')}
          </button>
        </div>
      )}

      <p class="small muted">{T('ns.share.privacyFoot')}</p>
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
    // When returning to Picker from Dossier, PickerDrawer's own useLayoutEffect runs first (child
    // before parent), focuses `button[data-picker-plant-id]`, and clears `nsPickerFocusId` — don't
    // overwrite that restored row focus with Close.
    const restoredPickerRow =
      drawer.kind === 'picker'
      && (Boolean(nsPickerFocusId.peek()) || (prev instanceof HTMLElement && prev.hasAttribute('data-picker-plant-id')));
    if (!restoredPickerRow) {
      closeBtnRef.current?.focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const cur = nsDrawer.peek();
        if (cur?.kind === 'dossier' && cur.returnTo) {
          nsDrawer.value = cur.returnTo;
        } else {
          nsDrawer.value = null;
        }
      }
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
      : drawer.kind === 'share'
        ? T('ns.share.kicker')
        : dossierTaxon?.family && dossierTaxon?.traits.habit
          ? T('ns.dossier.specimenLabel', { family: dossierTaxon.family, habit: localizedHabit(dossierTaxon.traits.habit) })
          : (dossierTaxon?.family ?? (dossierTaxon?.traits.habit ? localizedHabit(dossierTaxon.traits.habit) : ''));

  const title = drawer.kind === 'picker'
    ? T('ns.picker.title')
    : drawer.kind === 'atlas'
      ? siteLabel
      : drawer.kind === 'share'
        ? T('ns.share.title')
        : dossierTaxon ? taxCommonName(dossierTaxon) : T('ns.dossier.title');

  const dossierInPalette = dossierTaxon ? store.members.value.includes(dossierTaxon.id) : false;
  const dossierGuestZone = dossierTaxon ? nsGuestZoneById.value.get(dossierTaxon.id) : undefined;
  const returnLabel = drawer.kind === 'dossier' && drawer.returnTo
    ? (drawer.returnTo.kind === 'picker' ? T('ns.dossier.backToSearch') : T('ns.dossier.backToAtlas'))
    : null;

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
      >
        <div class="drawer-handle" />
        <header class="drawer-head">
          <div style={{ minWidth: 0 }}>
            {drawer.kind === 'dossier' && drawer.returnTo && returnLabel && (
              <button
                type="button"
                class="drawer-back-btn"
                onClick={() => { nsDrawer.value = drawer.returnTo!; }}
              >
                ← {returnLabel}
              </button>
            )}
            {kicker && (
              drawer.kind === 'dossier'
                ? <p class="herbarium-label">{kicker}</p>
                : <p class="pulse-kicker">{kicker}</p>
            )}
            <h2 style={{ fontSize: '24px', marginTop: '2px' }}>{title}</h2>
            {dossierTaxon && <p class="muted" style={{ fontStyle: 'italic' }}>{dossierTaxon.canonical_name}</p>}
          </div>
          <div class="drawer-head-acts">
            {drawer.kind === 'dossier' && dossierTaxon && (
              <button
                type="button"
                class={dossierInPalette ? 'btn-ghost drawer-add-btn is-added' : 'btn-primary drawer-add-btn'}
                aria-pressed={dossierInPalette ? 'true' : 'false'}
                onClick={() => {
                  if (dossierInPalette) {
                    const restoreId = dossierTaxon.id;
                    const restoreZone = dossierGuestZone;
                    removePlantFromPalette(restoreId);
                    showNsToast(
                      T('ns.dossier.removedToast', { plant: taxCommonName(dossierTaxon) }),
                      () => addPlantToPalette(restoreId, restoreZone),
                    );
                  } else {
                    addPlantToPalette(dossierTaxon.id, dossierGuestZone);
                    showNsToast(T('ns.dossier.addedToast', { plant: taxCommonName(dossierTaxon) }));
                  }
                }}
              >
                {dossierInPalette ? `✓ ${T('ns.picker.inPalette')}` : `+ ${T('ns.picker.add')}`}
              </button>
            )}
            <button
              ref={closeBtnRef}
              type="button"
              class="drawer-close"
              aria-label={T('ns.close')}
              onClick={() => { nsDrawer.value = null; }}
            >
              {T('ns.close')}
            </button>
          </div>
        </header>
        {drawer.kind === 'picker' && <PickerDrawer rep={rep} initialJob={drawer.job} />}
        {drawer.kind === 'atlas' && <AtlasDrawer rep={rep} swapFor={drawer.swapFor} />}
        {drawer.kind === 'dossier' && <DossierDrawer rep={rep} id={drawer.id} />}
        {drawer.kind === 'share' && <ShareDrawer />}
      </div>
    </div>
  );
}
