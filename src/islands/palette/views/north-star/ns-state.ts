// Reactive state layer for the North Star Palette Builder (Stage 2B).
// Bridges existing store.ts signals with computeReport() single source of truth,
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
  locales,
  resolveEffectiveSite,
  selectStarterPalette,
} from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { buildMonthlyV07, buildTier1V07, buildTier2AV07 } from '../../state/climate-v07.ts';
import { pageLang } from '../../strings.ts';

export function currentLocale(): Locale {
  const raw = pageLang();
  return (locales as readonly string[]).includes(raw) ? (raw as Locale) : 'en';
}

export type NsSurface = 'design' | 'plan';
export type NsViewMode = 'job' | 'matrix' | 'grid';
export type NsDrawer =
  | { kind: 'picker'; job: JobId | 'all' }
  | { kind: 'atlas'; tab: 'climate' | 'swaps'; swapFor?: PlantId }
  | { kind: 'dossier'; id: PlantId }
  | null;

export interface NsPresetSite {
  id: string;
  label: string;
  lat: number;
  lon: number;
  zone: ClimateZone;
  country: string;
}

export const NS_PRESETS: readonly NsPresetSite[] = [
  { id: 'montpellier', label: 'Montpellier, FR', lat: 43.61, lon: 3.88, zone: 'Mediterranean', country: 'FR' },
  { id: 'lyon', label: 'Lyon, FR', lat: 45.76, lon: 4.84, zone: 'Temperate', country: 'FR' },
  { id: 'kyoto', label: 'Kyoto, JP', lat: 35.01, lon: 135.77, zone: 'Subtropical', country: 'JP' },
  { id: 'capetown', label: 'Cape Town, ZA', lat: -33.92, lon: 18.42, zone: 'Mediterranean', country: 'ZA' },
  { id: 'briancon', label: 'Briançon, FR', lat: 44.90, lon: 6.64, zone: 'Continental', country: 'FR' },
  { id: 'belem', label: 'Belém, BR', lat: -1.45, lon: -48.50, zone: 'Tropical', country: 'BR' },
];

const EXISTING_KEY = 'canopi-ns-existing';
const CHECKED_KEY = 'canopi-ns-checked';

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

export const nsSurface = signal<NsSurface>('design');
export const nsViewMode = signal<NsViewMode>('job');
export const nsScenario = signal<ReportHorizonId>('today');
export const nsKidsPets = signal<boolean>(false);
export const nsLandOpen = signal<boolean>(true);
export const nsTuneOpen = signal<boolean>(false);
export const nsDrawer = signal<NsDrawer>(null);
export const nsHoveredPlant = signal<PlantId | null>(null);
export const nsJobFilter = signal<JobId | 'all'>('all');
export const nsOverrides = signal<ReportSiteOverrides>({});
const nsExistingIds = signal<ReadonlySet<PlantId>>(readIdSet(EXISTING_KEY));
export const nsCheckedIds = signal<ReadonlySet<PlantId>>(readIdSet(CHECKED_KEY));
export const nsLayerValues = signal<ReadonlyMap<PlantId, readonly LayerValue[]>>(new Map());
export const nsAllNames = signal<readonly PlantNames[] | null>(null);
export const nsSiteLoading = signal<boolean>(false);
export const nsToast = signal<string | null>(null);

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function showNsToast(msg: string): void {
  nsToast.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { nsToast.value = null; }, 3500);
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

export function updateOverrides(patch: Partial<ReportSiteOverrides>): void {
  nsOverrides.value = { ...nsOverrides.peek(), ...patch };
  if (patch.room !== undefined && patch.room !== null) store.room.value = patch.room;
  if (patch.plotM2 !== undefined && patch.plotM2 !== null) store.plot.value = patch.plotM2;
}

export function handlePlotM2Input(e: Event): void {
  const n = Number((e.target as HTMLInputElement).value);
  if (Number.isFinite(n) && n >= 1) updateOverrides({ plotM2: Math.round(n) });
}

export function resetOverrides(): void {
  nsOverrides.value = {};
}

export function setRoomChoice(r: Room): void {
  store.room.value = r;
  nsOverrides.value = { ...nsOverrides.peek(), room: r };
}

export const effectiveOverrides = computed<ReportSiteOverrides>(() => ({
  ...nsOverrides.value,
  room: nsOverrides.value.room ?? store.room.value ?? 'unsure',
  plotM2: nsOverrides.value.plotM2 ?? store.plot.value ?? 150,
}));

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
  const eff = resolveEffectiveSite(store.location.value?.lookup ?? null, 'today', effectiveOverrides.value);
  return selectStarterPalette(pool, eff, { maxPlants: 8 });
});

let watcherStarted = false;
export function startNsWatchers(): void {
  if (watcherStarted) return;
  watcherStarted = true;
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

/** Map Köppen climate class to Canopi curated ClimateZone. */
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

/** Load live canopi-climate v0.7.0 tiles for any lat/lon using the production builders. */
export async function pickCoordinates(
  lat: number,
  lon: number,
  label: string,
  fallbackZone?: ClimateZone,
  fallbackCountry?: string,
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
    }

    const todayKoppen = lookup?.climate?.periods?.find((p) => p.period === '1991-2020')?.koppen ?? '';
    const zone = todayKoppen ? koppenToZone(todayKoppen) : (fallbackZone ?? 'Temperate');
    const country = lookup?.regions?.isoA2 ?? fallbackCountry ?? null;

    batch(() => {
      store.location.value = { lat, lon, source: 'search', label, placeLevel: true, lookup };
      store.climate.value = zone;
      if (country) store.country.value = { code: country, source: 'location' };
    });
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
