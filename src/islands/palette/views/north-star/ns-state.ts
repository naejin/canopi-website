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
  type CanopiCustomPlant,
  type CanopiNonSpeciesEntry,
  type CanopiPaletteStudioMeta,
} from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { buildMonthlyV07, buildTier1V07, buildTier2AV07, clearSiteV07Caches, loadSiteAnalogues, siteAnalogue } from '../../state/climate-v07.ts';
import { pageLang, T } from '../../strings.ts';
import type { LightKey } from './ns-helpers.ts';
import {
  ensureBeforeUnloadGuard,
  getFileSessionState,
  hydrateFileSession,
  markNsDirty,
  nsDirty,
  nsFileLinked,
  nsFileName,
  nsFileStatus,
  nsNonSpeciesEntries,
  nsOpenedVersion,
  nsUnrecognizedPlants,
  openCanopiFilePicker,
  registerStudioFileHooks,
  resetCanopiFileState,
  saveCanopiFile,
  type NsFileSessionSnapshot,
} from './ns-file.ts';

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
  | { kind: 'share' }
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

export type PickerSortBy = 'recommended' | 'fit' | 'gaps' | 'height' | 'az';

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
  city: string;
  koppen: string;
  phHint?: string;
  lat: number;
  lon: number;
  zone: ClimateZone;
  country: string;
}

export const NS_PRESETS: readonly NsPresetSite[] = [
  { id: 'montpellier', city: 'Montpellier', koppen: 'Csa', phHint: '7.7', lat: 43.61, lon: 3.88, zone: 'Mediterranean', country: 'FR' },
  { id: 'lyon', city: 'Lyon', koppen: 'Cfb', lat: 45.76, lon: 4.84, zone: 'Temperate', country: 'FR' },
  { id: 'kyoto', city: 'Kyoto', koppen: 'Cfa', lat: 35.01, lon: 135.77, zone: 'Subtropical', country: 'JP' },
  { id: 'capetown', city: 'Cape Town', koppen: 'Csb', lat: -33.92, lon: 18.42, zone: 'Mediterranean', country: 'ZA' },
  { id: 'briancon', city: 'Briançon', koppen: 'Dfb', lat: 44.90, lon: 6.64, zone: 'Continental', country: 'FR' },
  { id: 'belem', city: 'Belém', koppen: 'Af', lat: -1.45, lon: -48.50, zone: 'Tropical', country: 'BR' },
];

export function presetCityName(p: NsPresetSite): string {
  return T(`ns.preset.city.${p.id}`);
}

export function presetSiteLabel(p: NsPresetSite): string {
  const city = presetCityName(p);
  const country = formatCountryName(p.country, currentLocale());
  return country ? `${city}, ${country}` : city;
}

const NS_SESSION_KEY = 'canopi-ns-session';

interface NsSessionSnapshot extends NsFileSessionSnapshot {
  surface?: NsSurface;
  viewMode?: NsViewMode;
  scenario?: ReportHorizonId;
  overrides?: ReportSiteOverrides;
  qtyById?: Record<string, number>;
  existingIds?: PlantId[];
  checkedIds?: PlantId[];
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

function idSetFromSession(ids: readonly PlantId[] | undefined): ReadonlySet<PlantId> {
  return new Set(Array.isArray(ids) ? ids.filter((x): x is PlantId => typeof x === 'string') : []);
}

export const nsSurface = signal<NsSurface>(initialSession.surface ?? 'design');
export const nsViewMode = signal<NsViewMode>(initialSession.viewMode ?? 'job');
export const nsScenario = signal<ReportHorizonId>(initialSession.scenario ?? 'today');
export const nsKidsPets = signal<boolean>(initialSession.kidsPets ?? false);
export const nsLandOpen = signal<boolean>(false);
export const nsMoreOpen = signal<boolean>(false);
export const nsDrawer = signal<NsDrawer>(initialSession.drawer ?? null);
export const nsPickerNotice = signal<string | null>(null);
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
export const nsPickerSort = signal<PickerSortBy>(initialSession.pickerSort ?? 'recommended');
export const nsPickerScrollTop = signal<number>(initialSession.pickerScrollTop ?? 0);
export const nsPickerFocusId = signal<PlantId | null>(initialSession.pickerFocusId ?? null);

export function resetPickerFilters(): void {
  batch(() => {
    nsPickerQuery.value = '';
    nsPickerNotice.value = null;
    nsPickerFilters.value = defaultPickerFilters('all');
    nsPickerSort.value = 'recommended';
    nsPickerScrollTop.value = 0;
    nsPickerFocusId.value = null;
  });
}

hydrateFileSession(initialSession);

function writeNsSessionSnapshot(): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    const loc = store.location.peek();
    const fileSnap = getFileSessionState();
    const snap: NsSessionSnapshot = {
      surface: nsSurface.peek(),
      viewMode: nsViewMode.peek(),
      scenario: nsScenario.peek(),
      overrides: nsOverrides.peek(),
      qtyById: nsQtyById.peek(),
      existingIds: [...nsExistingIds.peek()],
      checkedIds: [...nsCheckedIds.peek()],
      pathPct: nsPathPct.peek(),
      kidsPets: nsKidsPets.peek(),
      drawer: nsDrawer.peek(),
      pickerQuery: nsPickerQuery.peek(),
      pickerFilters: nsPickerFilters.peek(),
      pickerMoreOpen: nsPickerMoreOpen.peek(),
      pickerSort: nsPickerSort.peek(),
      pickerScrollTop: nsPickerScrollTop.peek(),
      pickerFocusId: nsPickerFocusId.peek(),
      dirty: nsDirty.peek(),
      fileName: nsFileName.peek(),
      unrecognizedPlants: nsUnrecognizedPlants.peek(),
      nonSpeciesEntries: nsNonSpeciesEntries.peek(),
      baseDoc: fileSnap.baseDoc,
      preservedEntries: fileSnap.preservedEntries,
      wasLinked: fileSnap.wasLinked,
      openedVersion: fileSnap.openedVersion,
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
const nsExistingIds = signal<ReadonlySet<PlantId>>(idSetFromSession(initialSession.existingIds));
export const nsCheckedIds = signal<ReadonlySet<PlantId>>(idSetFromSession(initialSession.checkedIds));
export const nsLayerValues = signal<ReadonlyMap<PlantId, readonly LayerValue[]>>(new Map());
export const nsAllNames = signal<readonly PlantNames[] | null>(null);
export const nsAllTaxa = signal<readonly Taxon[] | null>(null);
export const nsGuestZoneById = signal<ReadonlyMap<PlantId, ClimateZone>>(new Map());
export const nsSiteLoading = signal<boolean>(false);
export const nsSiteError = signal<string | null>(null);
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
  markNsDirty();
}

export function toggleChecked(id: PlantId): void {
  const next = new Set(nsCheckedIds.peek());
  if (next.has(id)) next.delete(id);
  else next.add(id);
  nsCheckedIds.value = next;
}

export function stepQty(id: PlantId, delta: number, defaultQty: number): void {
  const cur = nsQtyById.peek();
  const prev = cur[id] ?? defaultQty;
  const next = Math.max(1, Math.min(50, prev + delta));
  nsQtyById.value = { ...cur, [id]: next };
  markNsDirty();
}

export function setPathPct(pct: number): void {
  if (!Number.isFinite(pct)) return;
  nsPathPct.value = Math.max(0, Math.min(50, Math.round(pct)));
  markNsDirty();
}

export async function saveCanopiAndToast(saveAs = false): Promise<boolean> {
  const ok = await saveCanopiFile({ saveAs });
  if (ok) {
    const savedName = nsFileName.peek();
    showNsToast(savedName ? T('ns.file.savedTo', { name: savedName }) : T('ns.file.saved'));
  } else {
    const st = nsFileStatus.peek();
    if (st.kind === 'error') showNsToast(T('ns.file.notSaved', { reason: st.reason }));
  }
  return ok;
}

export async function openCanopiAndToast() {
  const res = await openCanopiFilePicker();
  if (!res) return null;
  if (!res.ok) {
    showNsToast(res.error);
    return res;
  }
  showNsToast(
    res.placedAdded > 0
      ? T('ns.file.openedWithPlaced', { name: res.name, n: res.placedAdded })
      : T('ns.file.opened', { name: res.name }),
  );
  return res;
}

export function updateOverrides(patch: Partial<ReportSiteOverrides>): void {
  batch(() => {
    nsOverrides.value = { ...nsOverrides.peek(), ...patch };
    if (patch.room !== undefined && patch.room !== null) store.room.value = patch.room;
    if (patch.plotM2 !== undefined && patch.plotM2 !== null) store.plot.value = patch.plotM2;
    if (patch.watering !== undefined) {
      store.siteEdits.value = { ...store.siteEdits.peek(), watering: patch.watering ?? undefined };
    }
  });
  markNsDirty();
}

export function resetAllSiteOverrides(): void {
  const cur = nsOverrides.peek();
  batch(() => {
    nsOverrides.value = {
      ...(cur.room !== undefined ? { room: cur.room } : {}),
      ...(cur.plotM2 !== undefined ? { plotM2: cur.plotM2 } : {}),
      ...(cur.watering !== undefined ? { watering: cur.watering } : {}),
    };
  });
  markNsDirty();
}

export function setRoomChoice(r: Room): void {
  batch(() => {
    store.room.value = r;
    nsOverrides.value = { ...nsOverrides.peek(), room: r };
  });
  markNsDirty();
}

export const effectiveOverrides = computed<ReportSiteOverrides>(() => {
  const ov = nsOverrides.value;
  const sharedWatering = ov.watering ?? store.siteEdits.value.watering ?? undefined;
  return {
    ...ov,
    ...(sharedWatering ? { watering: sharedWatering } : {}),
    room: ov.room ?? (store.room.value && store.room.value !== 'unsure' ? store.room.value : 'small'),
    plotM2: ov.plotM2 ?? store.plot.value ?? 150,
  };
});

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
  const c = store.climate.value;
  const sets = store.interactionSets.value;
  const interactions = (c && sets[c]) ? sets[c]! : Object.values(sets).flatMap((xs) => xs ?? []);
  return selectStarterPalette(pool, eff, {
    maxPlants: 8,
    eff2050,
    lookup,
    overrides: ov,
    climateZone: c,
    interactions,
    layerValuesByPlant: nsLayerValues.value,
  });
});

const VALID_CLIMATE_ZONES: ReadonlySet<string> = new Set<ClimateZone>([
  'Tropical', 'Arid', 'Mediterranean', 'Subtropical', 'Temperate', 'Continental', 'Boreal',
]);

export function parseValidClimate(raw: unknown): ClimateZone | null {
  return typeof raw === 'string' && VALID_CLIMATE_ZONES.has(raw) ? (raw as ClimateZone) : null;
}

function finiteClamp(raw: unknown, min: number, max: number): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return Math.max(min, Math.min(max, raw));
}

function validEnum<T extends string>(raw: unknown, allowed: readonly T[]): T | undefined {
  return typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

export function sanitizeStudioOverrides(raw: unknown): Partial<ReportSiteOverrides> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<ReportSiteOverrides> = {};
  const room = validEnum(r.room, ['pots', 'small', 'large', 'field', 'unsure'] as const);
  if (room) out.room = room;
  const plotM2 = finiteClamp(r.plotM2, 20, 50000);
  if (plotM2 !== undefined) out.plotM2 = Math.round(plotM2);
  const watering = validEnum(r.watering, ['rain', 'first-years', 'all-year'] as const);
  if (watering) out.watering = watering;
  const soilPh = finiteClamp(r.soilPh, 3.5, 9.5);
  if (soilPh !== undefined) out.soilPh = soilPh;
  const drainage = validEnum(r.drainage, ['drains', 'wet', 'sandy', 'clay'] as const);
  if (drainage) out.drainage = drainage;
  const stonesPct = finiteClamp(r.stonesPct, 0, 100);
  if (stonesPct !== undefined) out.stonesPct = Math.round(stonesPct);
  const freeze10 = finiteClamp(r.freeze10, -60, 25);
  if (freeze10 !== undefined) out.freeze10 = freeze10;
  const heat10 = finiteClamp(r.heat10, 10, 60);
  if (heat10 !== undefined) out.heat10 = heat10;
  const cddDays = finiteClamp(r.cddDays, 0, 365);
  if (cddDays !== undefined) out.cddDays = Math.round(cddDays);
  const wind = validEnum(r.wind, ['sheltered', 'moderate', 'windy', 'sea'] as const);
  if (wind) out.wind = wind;
  const siteLight = validEnum(r.siteLight, ['full_sun', 'part_shade', 'shade'] as const);
  if (siteLight) out.siteLight = siteLight;
  const elevM = finiteClamp(r.elevM, -430, 6000);
  if (elevM !== undefined) out.elevM = Math.round(elevM);
  const slopeDeg = finiteClamp(r.slopeDeg, 0, 75);
  if (slopeDeg !== undefined) out.slopeDeg = Math.round(slopeDeg);
  const aspect = validEnum(r.aspect, ['neutral', 'south', 'north'] as const);
  if (aspect) out.aspect = aspect;
  const coldAir = validEnum(r.coldAir, ['normal', 'hollow', 'higher'] as const);
  if (coldAir) out.coldAir = coldAir;
  return out;
}

let watcherStarted = false;
export function startNsWatchers(): void {
  if (watcherStarted) return;
  watcherStarted = true;
  ensureBeforeUnloadGuard();
  registerStudioFileHooks({
    getContext: () => ({
      overrides: effectiveOverrides.peek(),
      qtyById: nsQtyById.peek(),
      existingIds: nsExistingIds.peek(),
      pathPct: nsPathPct.peek(),
    }),
    applyContext: (meta: CanopiPaletteStudioMeta | null, fallbackName: string) => {
      if (!meta) return;
      batch(() => {
        if (meta.overrides) {
          const ov = sanitizeStudioOverrides(meta.overrides);
          nsOverrides.value = ov;
          if (ov.room) store.room.value = ov.room;
          if (ov.plotM2 !== undefined) store.plot.value = ov.plotM2;
          if (ov.watering !== undefined) {
            store.siteEdits.value = { ...store.siteEdits.peek(), watering: ov.watering ?? undefined };
          }
        }
        if (meta.qtyById && typeof meta.qtyById === 'object') {
          const cleanQty: Record<string, number> = {};
          for (const [k, v] of Object.entries(meta.qtyById)) {
            if (typeof v === 'number' && Number.isFinite(v) && v >= 1) {
              cleanQty[k] = Math.min(999, Math.round(v));
            }
          }
          nsQtyById.value = cleanQty;
        }
        if (Array.isArray(meta.existingIds)) {
          nsExistingIds.value = new Set<PlantId>(meta.existingIds.filter((x): x is PlantId => typeof x === 'string'));
        }
        if (typeof meta.pathPct === 'number' && Number.isFinite(meta.pathPct)) {
          nsPathPct.value = Math.max(0, Math.min(50, Math.round(meta.pathPct)));
        }
      });
      if (
        meta.site
        && typeof meta.site.lat === 'number' && Number.isFinite(meta.site.lat) && Math.abs(meta.site.lat) <= 90
        && typeof meta.site.lon === 'number' && Number.isFinite(meta.site.lon) && Math.abs(meta.site.lon) <= 180
      ) {
        void pickCoordinates(
          meta.site.lat,
          meta.site.lon,
          meta.site.label || fallbackName,
          parseValidClimate(meta.site.climate) ?? undefined,
          meta.site.country ?? undefined,
          true,
        );
      }
    },
    ensureCatalog: ensureAllCatalogLoaded,
    allCatalogTaxa: () => nsAllTaxa.peek() ?? activePool.peek(),
    guestZoneById: () => nsGuestZoneById.peek(),
  });
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
    void nsExistingIds.value;
    void nsCheckedIds.value;
    void nsPathPct.value;
    void nsKidsPets.value;
    void nsDrawer.value;
    void nsPickerQuery.value;
    void nsPickerFilters.value;
    void nsPickerMoreOpen.value;
    void nsPickerSort.value;
    void nsPickerScrollTop.value;
    void nsPickerFocusId.value;
    void nsDirty.value;
    void nsFileName.value;
    void nsFileLinked.value;
    void nsOpenedVersion.value;
    void nsUnrecognizedPlants.value;
    void nsNonSpeciesEntries.value;
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

function koppenToZone(koppen: string | null | undefined): ClimateZone | null {
  const k = (koppen ?? '').trim();
  if (!k) return null;
  if (k.startsWith('Af') || k.startsWith('Am') || k.startsWith('Aw')) return 'Tropical';
  if (k.startsWith('B')) return 'Arid';
  if (k.startsWith('Cs')) return 'Mediterranean';
  if (k.startsWith('Cfa') || k.startsWith('Cwa')) return 'Subtropical';
  if (k.startsWith('Cf') || k.startsWith('Cw')) return 'Temperate';
  if (k.startsWith('Dfc') || k.startsWith('Dfd') || k.startsWith('ET') || k.startsWith('EF')) return 'Boreal';
  if (k.startsWith('D')) return 'Continental';
  return null;
}

let pickSeq = 0;

export async function pickCoordinates(
  lat: number,
  lon: number,
  label: string,
  fallbackZone?: ClimateZone,
  fallbackCountry?: string,
  preserveOverrides = false,
): Promise<void> {
  const seq = ++pickSeq;
  nsSiteLoading.value = true;
  nsSiteError.value = null;
  clearSiteV07Caches();
  try {
    let lookup: SiteLookup | null = null;
    const rawEl = typeof document !== 'undefined' ? document.getElementById('ct-climate')?.textContent : null;
    if (rawEl) {
      const { createTileSource, lookupSite, lookupSiteMonthly, lookupSiteTier2A, siteIndex } = await import('../../../../lib/climate/index.ts');
      if (seq !== pickSeq) return;
      const idx = siteIndex(JSON.parse(rawEl));
      const tileSource = createTileSource({ index: idx });
      const raw = await lookupSite(lat, lon, tileSource);
      if (seq !== pickSeq) return;
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
      if (seq !== pickSeq) return;
      const tier2AV07 = t2aRaw ? await buildTier2AV07(locObj, t2aRaw, baseLookup.v07).catch(() => ({})) : {};
      if (seq !== pickSeq) return;
      const monthlyV07 = t2bRaw ? buildMonthlyV07(t2bRaw) : null;
      lookup = {
        ...baseLookup,
        v07: {
          ...tier1V07,
          ...tier2AV07,
          ...(monthlyV07 ? { monthly: monthlyV07 } : {}),
        },
      };
    }

    const todayKoppen = lookup?.climate?.periods?.find((p) => p.period === '1991-2020')?.koppen ?? '';
    const zone = koppenToZone(todayKoppen) ?? fallbackZone ?? null;
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
    if (lookup) {
      void loadSiteAnalogues({ lat: lookup.lat, lon: lookup.lon, source: 'search', label, lookup }, '2041-2070');
    }
    if (!preserveOverrides) markNsDirty();
    writeNsSessionSnapshot();
  } catch {
    if (seq === pickSeq) {
      nsSiteError.value = T('ns.site.loadError');
    }
  } finally {
    if (seq === pickSeq) nsSiteLoading.value = false;
  }
}

export function launchWithStarter(): void {
  const starter = starterPreview.peek();
  resetCanopiFileState();
  batch(() => {
    store.members.value = starter.map((t) => t.id);
    store.view.value = 'matrix';
    nsSurface.value = 'design';
    nsScenario.value = 'today';
    nsMoreOpen.value = false;
  });
}

export function launchEmpty(): void {
  resetCanopiFileState();
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
  markNsDirty();
}

export function removePlantFromPalette(id: PlantId): void {
  store.members.value = store.members.peek().filter((x) => x !== id);
  markNsDirty();
}

export function swapPlantInPalette(oldId: PlantId, newId: PlantId): void {
  const cur = store.members.peek();
  store.members.value = cur.map((x) => (x === oldId ? newId : x));
  nsDrawer.value = null;
  markNsDirty();
}

export async function openPickerForGenus(canonicalName: string): Promise<void> {
  const genus = canonicalName.trim().split(/\s+/)[0] ?? '';
  await ensureAllCatalogLoaded();
  const taxa = nsAllTaxa.peek() ?? activePool.peek();
  const low = genus.toLowerCase();
  const hasGenus = Boolean(low) && taxa.some(
    (t) => (t.genus ?? '').toLowerCase() === low || t.canonical_name.toLowerCase().startsWith(`${low} `),
  );
  batch(() => {
    nsPickerFilters.value = defaultPickerFilters('all');
    nsPickerScrollTop.value = 0;
    if (hasGenus) {
      nsPickerQuery.value = genus;
      nsPickerNotice.value = null;
    } else {
      nsPickerQuery.value = '';
      nsPickerNotice.value = T('ns.unrec.noGenusMatch', { genus: genus || canonicalName });
    }
    nsDrawer.value = { kind: 'picker', job: 'all' };
  });
}
