// Reactive state layer for the North Star Plant Palette Studio.
// Bridges store.ts signals with computeReport() single source of truth,
// live canopi-climate v0.7.0 tile lookups, and full 761-species SQLite search.
import { batch, computed, effect, signal } from '@preact/signals';
import type {
  ClimateZone,
  JobId,
  LayerValue,
  Locale,
  PaletteReport,
  PlantId,
  PlantNames,
  ReportHorizonId,
  ReportSiteOverrides,
  Room,
  SiteLookup,
  Taxon,
} from '../../../../lib/palette/index.ts';
import {
  computeReport,
  formatAreaName,
  formatCountryName,
  locales,
  resolveEffectiveSite,
  selectStarterPalette,
} from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { buildMonthlyV07, buildTier1V07, buildTier2AV07, loadSiteAnalogues, siteAnalogue } from '../../state/climate-v07.ts';
import { pageLang } from '../../strings.ts';
import type { LightKey } from './ns-helpers.ts';

export function currentLocale(): Locale {
  const raw = pageLang();
  return (locales as readonly string[]).includes(raw) ? (raw as Locale) : 'en';
}

export type NsSurface = 'design' | 'plan';
export type NsViewMode = 'job' | 'matrix' | 'grid';
type NsReturnTarget =
  | { kind: 'picker'; job: JobId | 'all' }
  | { kind: 'atlas'; tab?: 'climate' | 'swaps'; swapFor?: PlantId };
export type NsDrawer =
  | { kind: 'picker'; job: JobId | 'all' }
  | { kind: 'atlas'; tab?: 'climate' | 'swaps'; swapFor?: PlantId }
  | { kind: 'dossier'; id: PlantId; returnTo?: NsReturnTarget }
  | null;

export interface PickerFilterState {
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
  inBloomNow: boolean;
}

export type PickerSortBy = 'fit' | 'gaps' | 'height' | 'az';

function defaultPickerFilters(job: JobId | 'all' = 'all'): PickerFilterState {
  return {
    job,
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
    inBloomNow: false,
  };
}

export interface NsPresetSite {
  id: string;
  label: string;
  sub: string;
  lat: number;
  lon: number;
  zone: ClimateZone;
  country: string;
}

export const NS_PRESETS: readonly NsPresetSite[] = [
  { id: 'montpellier', label: 'Montpellier, France', sub: 'Mediterranean (Csa) · pH 7.7', lat: 43.61, lon: 3.88, zone: 'Mediterranean', country: 'FR' },
  { id: 'lyon', label: 'Lyon, France', sub: 'Temperate (Cfb)', lat: 45.76, lon: 4.84, zone: 'Temperate', country: 'FR' },
  { id: 'kyoto', label: 'Kyoto, Japan', sub: 'Subtropical (Cfa)', lat: 35.01, lon: 135.77, zone: 'Subtropical', country: 'JP' },
  { id: 'capetown', label: 'Cape Town, South Africa', sub: 'Southern Mediterranean (Csb)', lat: -33.92, lon: 18.42, zone: 'Mediterranean', country: 'ZA' },
  { id: 'briancon', label: 'Briançon, France', sub: 'Mountain / Continental (Dfb)', lat: 44.90, lon: 6.64, zone: 'Continental', country: 'FR' },
  { id: 'belem', label: 'Belém, Brazil', sub: 'Tropical (Af)', lat: -1.45, lon: -48.50, zone: 'Tropical', country: 'BR' },
];

const EXISTING_KEY = 'canopi-ns-existing';
const CHECKED_KEY = 'canopi-ns-checked';
const NS_SESSION_KEY = 'canopi-ns-session';

interface NsSessionSnapshot {
  surface?: NsSurface;
  viewMode?: NsViewMode;
  scenario?: ReportHorizonId;
  overrides?: ReportSiteOverrides;
  qtyById?: Record<string, number>;
  pathPct?: number;
  kidsPets?: boolean;
  drawer?: NsDrawer;
  pickerQuery?: string;
  pickerFilters?: PickerFilterState;
  pickerMoreOpen?: boolean;
  pickerSort?: PickerSortBy;
  pickerScrollTop?: number;
  pickerFocusId?: PlantId | null;
  site?: { lat: number; lon: number; label: string; zone?: ClimateZone; country?: string };
}

function readNsSession(): NsSessionSnapshot {
  try {
    if (typeof sessionStorage === 'undefined') return {};
    const raw = sessionStorage.getItem(NS_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as NsSessionSnapshot) : {};
  } catch {
    return {};
  }
}

const initialSession = readNsSession();

function readIdSet(key: string): ReadonlySet<PlantId> {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeIdSet(key: string, set: ReadonlySet<PlantId>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch { /* ignore storage quota */ }
}

export const nsSurface = signal<NsSurface>(initialSession.surface ?? 'design');
export const nsViewMode = signal<NsViewMode>(initialSession.viewMode ?? 'job');
export const nsScenario = signal<ReportHorizonId>(initialSession.scenario ?? 'today');
export const nsKidsPets = signal<boolean>(initialSession.kidsPets ?? false);
export const nsLandOpen = signal<boolean>(true);
export const nsTuneOpen = signal<boolean>(false);
export const nsMoreOpen = signal<boolean>(false);
export const nsDrawer = signal<NsDrawer>(initialSession.drawer ?? null);
export const nsActivePairKey = signal<string | null>(null);
export const nsSearch = signal<string>('');
export const nsPathPct = signal<number>(initialSession.pathPct ?? 20);
export const nsQtyById = signal<Record<string, number>>(initialSession.qtyById ?? {});
export const nsOverrides = signal<ReportSiteOverrides>(initialSession.overrides ?? {});
export const nsPickerQuery = signal<string>(initialSession.pickerQuery ?? '');
export const nsPickerFilters = signal<PickerFilterState>(
  initialSession.pickerFilters ? { ...defaultPickerFilters(), ...initialSession.pickerFilters } : defaultPickerFilters(),
);
export const nsPickerMoreOpen = signal<boolean>(initialSession.pickerMoreOpen ?? false);
export const nsPickerSort = signal<PickerSortBy>(initialSession.pickerSort ?? 'fit');
export const nsPickerScrollTop = signal<number>(initialSession.pickerScrollTop ?? 0);
export const nsPickerFocusId = signal<PlantId | null>(initialSession.pickerFocusId ?? null);

export function resetPickerFilters(): void {
  batch(() => {
    nsPickerQuery.value = '';
    nsPickerFilters.value = defaultPickerFilters('all');
    nsPickerSort.value = 'fit';
    nsPickerScrollTop.value = 0;
    nsPickerFocusId.value = null;
  });
}

function writeNsSessionSnapshot(): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    const loc = store.location.peek();
    const snap: NsSessionSnapshot = {
      surface: nsSurface.peek(),
      viewMode: nsViewMode.peek(),
      scenario: nsScenario.peek(),
      overrides: nsOverrides.peek(),
      qtyById: nsQtyById.peek(),
      pathPct: nsPathPct.peek(),
      kidsPets: nsKidsPets.peek(),
      drawer: nsDrawer.peek(),
      pickerQuery: nsPickerQuery.peek(),
      pickerFilters: nsPickerFilters.peek(),
      pickerMoreOpen: nsPickerMoreOpen.peek(),
      pickerSort: nsPickerSort.peek(),
      pickerScrollTop: nsPickerScrollTop.peek(),
      pickerFocusId: nsPickerFocusId.peek(),
      ...(loc && loc.label
        ? {
            site: {
              lat: loc.lat,
              lon: loc.lon,
              label: loc.label,
              zone: store.climate.peek() ?? undefined,
              country: store.country.peek().code ?? undefined,
            },
          }
        : initialSession.site ? { site: initialSession.site } : {}),
    };
    sessionStorage.setItem(NS_SESSION_KEY, JSON.stringify(snap));
  } catch { /* ignore private-mode quota */ }
}
const nsExistingIds = signal<ReadonlySet<PlantId>>(readIdSet(EXISTING_KEY));
export const nsCheckedIds = signal<ReadonlySet<PlantId>>(readIdSet(CHECKED_KEY));
export const nsLayerValues = signal<ReadonlyMap<PlantId, readonly LayerValue[]>>(new Map());
export const nsAllNames = signal<readonly PlantNames[] | null>(null);
export const nsAllTaxa = signal<readonly Taxon[] | null>(null);
export const nsGuestZoneById = signal<ReadonlyMap<PlantId, ClimateZone>>(new Map());
export const nsSiteLoading = signal<boolean>(false);
export const nsToast = signal<{ message: string; undo?: () => void } | null>(null);

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function showNsToast(message: string, undo?: () => void): void {
  nsToast.value = undo ? { message, undo } : { message };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { nsToast.value = null; }, undo ? 5500 : 3500);
}

export function toggleExisting(id: PlantId): void {
  const next = new Set(nsExistingIds.peek());
  if (next.has(id)) next.delete(id);
  else next.add(id);
  nsExistingIds.value = next;
  writeIdSet(EXISTING_KEY, next);
}

export function toggleChecked(id: PlantId): void {
  const next = new Set(nsCheckedIds.peek());
  if (next.has(id)) next.delete(id);
  else next.add(id);
  nsCheckedIds.value = next;
  writeIdSet(CHECKED_KEY, next);
}

export function stepQty(id: PlantId, delta: number, defaultQty: number): void {
  const cur = nsQtyById.peek();
  const prev = cur[id] ?? defaultQty;
  const next = Math.max(1, Math.min(50, prev + delta));
  nsQtyById.value = { ...cur, [id]: next };
}

export function updateOverrides(patch: Partial<ReportSiteOverrides>): void {
  nsOverrides.value = { ...nsOverrides.peek(), ...patch };
  if (patch.room !== undefined && patch.room !== null) store.room.value = patch.room;
  if (patch.plotM2 !== undefined && patch.plotM2 !== null) store.plot.value = patch.plotM2;
}

export function handlePlotM2Input(e: Event): void {
  const n = Number((e.target as HTMLInputElement).value);
  if (Number.isFinite(n) && n >= 1) updateOverrides({ plotM2: Math.round(n) });
}

export function setRoomChoice(r: Room): void {
  store.room.value = r;
  nsOverrides.value = { ...nsOverrides.peek(), room: r };
}

export const effectiveOverrides = computed<ReportSiteOverrides>(() => ({
  ...nsOverrides.value,
  room: nsOverrides.value.room ?? (store.room.value && store.room.value !== 'unsure' ? store.room.value : 'small'),
  plotM2: nsOverrides.value.plotM2 ?? store.plot.value ?? 150,
}));

export const siteAnalogueLabel = computed<string | null>(() => {
  const m = siteAnalogue.value?.result.matches[0];
  if (!m) return null;
  const loc = currentLocale();
  const area = m.wgsrpd_l3 ? formatAreaName(m.wgsrpd_l3, loc) : null;
  const country = m.iso_a2 ? formatCountryName(m.iso_a2, loc) : null;
  if (area && country && area.toLowerCase() !== country.toLowerCase()) return `${area}, ${country}`;
  return area || country || null;
});

export const activePool = computed<readonly Taxon[]>(() => {
  const z = store.climate.value;
  if (!z) return [];
  return store.pools.value[z] ?? [];
});

const paletteTaxa = computed<readonly Taxon[]>(() => store.memberTaxa.value);

export const nsReport = computed<PaletteReport>(() => {
  const sets = store.interactionSets.value;
  const c = store.climate.value;
  const interactions = (c && sets[c]) ? sets[c]! : Object.values(sets).flatMap((xs) => xs ?? []);
  return computeReport({
    taxa: paletteTaxa.value,
    lookup: store.location.value?.lookup ?? null,
    climateZone: c,
    horizon: nsScenario.value,
    overrides: effectiveOverrides.value,
    interactions,
    layerValuesByPlant: nsLayerValues.value,
    existingIds: nsExistingIds.value,
    plantsPerJob: store.plantsPerJob.value ?? 2,
  });
});

export const starterPreview = computed<readonly Taxon[]>(() => {
  const pool = activePool.value;
  if (!pool.length) return [];
  const lookup = store.location.value?.lookup ?? null;
  const ov = effectiveOverrides.value;
  const eff = resolveEffectiveSite(lookup, 'today', ov);
  const eff2050 = resolveEffectiveSite(lookup, 'y2050', ov);
  return selectStarterPalette(pool, eff, { maxPlants: 8, eff2050 });
});

let watcherStarted = false;
export function startNsWatchers(): void {
  if (watcherStarted) return;
  watcherStarted = true;
  // Restore session site (e.g. after language switch or reload) preserving Tune-site overrides.
  if (initialSession.site && !store.location.peek()?.lookup && !nsSiteLoading.peek()) {
    const s = initialSession.site;
    void pickCoordinates(s.lat, s.lon, s.label, s.zone, s.country, true);
  }
  effect(() => {
    void nsSurface.value;
    void nsViewMode.value;
    void nsScenario.value;
    void nsOverrides.value;
    void nsQtyById.value;
    void nsPathPct.value;
    void nsKidsPets.value;
    void nsDrawer.value;
    void nsPickerQuery.value;
    void nsPickerFilters.value;
    void nsPickerMoreOpen.value;
    void nsPickerSort.value;
    void nsPickerScrollTop.value;
    void nsPickerFocusId.value;
    void store.location.value;
    writeNsSessionSnapshot();
  });
  effect(() => {
    const src = store.source.value;
    const z = store.climate.value;
    const ids = store.members.value;
    if (!src || !z || !ids.length) {
      nsLayerValues.value = new Map();
      return;
    }
    let cancelled = false;
    void src.layerValues(ids, z).then((map) => {
      if (!cancelled) nsLayerValues.value = map;
    }).catch(() => {});
    return () => { cancelled = true; };
  });
}

export async function ensureAllNamesLoaded(): Promise<void> {
  if (nsAllNames.value !== null) return;
  const src = store.source.value;
  if (!src) return;
  try {
    nsAllNames.value = await src.names(currentLocale());
  } catch { /* ignore */ }
}

let catalogLoading = false;
export async function ensureAllCatalogLoaded(): Promise<void> {
  if (nsAllTaxa.value !== null || catalogLoading) return;
  const src = store.source.value;
  if (!src) return;
  catalogLoading = true;
  try {
    const activeZ = store.climate.peek();
    const curated = store.curatedClimates.peek();
    const ordered: ClimateZone[] = activeZ
      ? [activeZ, ...curated.filter((c) => c !== activeZ)]
      : [...curated];
    const pools = await Promise.all(
      ordered.map(async (c) => ({ c, list: store.pools.peek()[c] ?? await src.pool(c).catch(() => [] as Taxon[]) })),
    );
    const seen = new Set<PlantId>();
    const merged: Taxon[] = [];
    const guestZones = new Map<PlantId, ClimateZone>();
    for (const { c, list } of pools) {
      for (const t of list) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        merged.push(t);
        if (activeZ && c !== activeZ) guestZones.set(t.id, c);
      }
    }
    batch(() => {
      nsAllTaxa.value = merged;
      nsGuestZoneById.value = guestZones;
    });
  } finally {
    catalogLoading = false;
  }
}

function koppenToZone(koppen: string | null | undefined): ClimateZone {
  const k = (koppen ?? '').trim();
  if (k.startsWith('Af') || k.startsWith('Am') || k.startsWith('Aw')) return 'Tropical';
  if (k.startsWith('B')) return 'Arid';
  if (k.startsWith('Cs')) return 'Mediterranean';
  if (k.startsWith('Cfa') || k.startsWith('Cwa')) return 'Subtropical';
  if (k.startsWith('Cf') || k.startsWith('Cw')) return 'Temperate';
  if (k.startsWith('Dfc') || k.startsWith('Dfd') || k.startsWith('ET')) return 'Boreal';
  if (k.startsWith('D')) return 'Continental';
  return 'Temperate';
}

export async function pickCoordinates(
  lat: number,
  lon: number,
  label: string,
  fallbackZone?: ClimateZone,
  fallbackCountry?: string,
  preserveOverrides = false,
): Promise<void> {
  nsSiteLoading.value = true;
  try {
    let lookup: SiteLookup | null = null;
    const rawEl = typeof document !== 'undefined' ? document.getElementById('ct-climate')?.textContent : null;
    if (rawEl) {
      const { createTileSource, lookupSite, lookupSiteMonthly, lookupSiteTier2A, siteIndex } = await import('../../../../lib/climate/index.ts');
      const idx = siteIndex(JSON.parse(rawEl));
      const tileSource = createTileSource({ index: idx });
      const raw = await lookupSite(lat, lon, tileSource);
      const tier1V07 = buildTier1V07(raw.tier1);
      const baseLookup: SiteLookup = {
        lat: raw.lat,
        lon: raw.lon,
        climate: raw.climate,
        soil: raw.soil,
        regions: raw.regions,
        v07: { ...tier1V07 },
      };
      const locObj = { lat: raw.lat, lon: raw.lon, source: 'search' as const, label, lookup: baseLookup };
      const [t2aRaw, t2bRaw] = await Promise.all([
        lookupSiteTier2A(raw, tileSource).catch(() => null),
        lookupSiteMonthly(raw, tileSource).catch(() => null),
      ]);
      const tier2AV07 = t2aRaw ? await buildTier2AV07(locObj, t2aRaw, baseLookup.v07).catch(() => ({})) : {};
      const monthlyV07 = t2bRaw ? buildMonthlyV07(t2bRaw) : null;
      lookup = {
        ...baseLookup,
        v07: {
          ...tier1V07,
          ...tier2AV07,
          ...(monthlyV07 ? { monthly: monthlyV07 } : {}),
        },
      };
      void loadSiteAnalogues({ ...locObj, lookup }, '2041-2070');
    }

    const todayKoppen = lookup?.climate?.periods?.find((p) => p.period === '1991-2020')?.koppen ?? '';
    const zone = todayKoppen ? koppenToZone(todayKoppen) : (fallbackZone ?? 'Temperate');
    const country = lookup?.regions?.isoA2 ?? fallbackCountry ?? null;

    batch(() => {
      if (!preserveOverrides) {
        const prevOv = nsOverrides.peek();
        nsOverrides.value = {
          ...(prevOv.room !== undefined ? { room: prevOv.room } : {}),
          ...(prevOv.plotM2 !== undefined ? { plotM2: prevOv.plotM2 } : {}),
        };
      }
      store.location.value = { lat, lon, source: 'search', label, placeLevel: true, lookup };
      store.climate.value = zone;
      if (country) store.country.value = { code: country, source: 'location' };
    });
    writeNsSessionSnapshot();
  } finally {
    nsSiteLoading.value = false;
  }
}

export function launchWithStarter(): void {
  const starter = starterPreview.peek();
  batch(() => {
    store.members.value = starter.map((t) => t.id);
    store.view.value = 'matrix';
    nsSurface.value = 'design';
    nsScenario.value = 'today';
    nsMoreOpen.value = false;
  });
}

export function launchEmpty(): void {
  batch(() => {
    store.members.value = [];
    store.view.value = 'matrix';
    nsSurface.value = 'design';
    nsDrawer.value = { kind: 'picker', job: 'all' };
  });
}

export function addPlantToPalette(id: PlantId, guestZone?: ClimateZone): void {
  const cur = store.members.peek();
  if (cur.includes(id)) return;
  batch(() => {
    store.members.value = [...cur, id];
    if (guestZone && guestZone !== store.climate.peek()) {
      store.guests.value = { ...store.guests.peek(), [id]: guestZone };
    }
  });
}

export function removePlantFromPalette(id: PlantId): void {
  store.members.value = store.members.peek().filter((x) => x !== id);
}

export function swapPlantInPalette(oldId: PlantId, newId: PlantId): void {
  const cur = store.members.peek();
  store.members.value = cur.map((x) => (x === oldId ? newId : x));
  nsDrawer.value = null;
}
