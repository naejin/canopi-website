// Field Studio UI & document state (Slice 3.2):
// - Active studio tab ('palette' | 'system' | 'climate' | 'plan')
// - Editable design name, dirty tracking, beforeunload guard, optional File System Access auto-save
// - Planting plan config synced with Onboarding Step 2 & store.plot
// - Interactive microclimate sliders (slope, aspect, landform)
// - Request a Plant modal toggle & .canopi v9 open/save helpers
// Layer rule (L1-L9): lives in state/, imports only store, lib/palette, lib/climate/v07. Never imports views/.
import { batch, effect, signal } from '@preact/signals';
import type { CanopiCustomPlant, DesignEnvelope, PlantId, PlantingPlanConfig, Taxon } from '../../../lib/palette/index.ts';
import { canopiFile, canopiFileName, DEFAULT_PLANTING_PLAN_CONFIG, parseCanopiFile } from '../../../lib/palette/index.ts';
import type { MicroAspect, MicroLandform } from '../../../lib/climate/v07.ts';
import * as store from '../store.ts';

export type StudioTab = 'palette' | 'system' | 'climate' | 'plan';
export type PaletteViewMode = 'cards' | 'compact';
export type PaletteGroupMode = 'none' | 'sun' | 'stage' | 'status';
export type RailTab = 'coach' | 'all';
export type WateringMode = 'Rain-fed' | 'Occasional' | 'Irrigated';

export interface ClimateStressState {
  heatDeltaC: number;
  droughtPct: number;
  winterDeltaC: number;
  falseSpringDeltaPct: number;
  windExposure: number;
  extremeRainPct: number;
}

export const DEFAULT_CLIMATE_STRESS: ClimateStressState = {
  heatDeltaC: 0,
  droughtPct: 0,
  winterDeltaC: 0,
  falseSpringDeltaPct: 0,
  windExposure: 0,
  extremeRainPct: 0,
};

export interface MicroclimateState {
  slopeDeg: number;
  aspect: MicroAspect;
  landform: MicroLandform;
}

const DEFAULT_MICROCLIMATE: MicroclimateState = {
  slopeDeg: 0,
  aspect: 'flat',
  landform: 'mid-slope',
};

export const studioTab = signal<StudioTab>('palette');
export const paletteViewMode = signal<PaletteViewMode>('cards');
export const paletteGroupMode = signal<PaletteGroupMode>('none');
export const railTab = signal<RailTab>('coach');
export const poolOpen = signal<boolean>(true);
export const wateringMode = signal<WateringMode>('Rain-fed');

export interface PlantPoolPreset {
  tab?: RailTab;
  sun?: 'emergent' | 'high' | 'medium' | 'low' | null;
  stage?: number | null;
  role?: string | null;
  intent?: 'winter' | 'gap' | 'soil' | 'early' | null;
  banner?: string | null;
}

export const railPreset = signal<PlantPoolPreset | null>(null);
export const mobilePoolOpen = signal<boolean>(false);

export function openPlantPool(preset: PlantPoolPreset = {}): void {
  batch(() => {
    poolOpen.value = true;
    mobilePoolOpen.value = true;
    railTab.value = preset.tab ?? 'all';
    railPreset.value = preset;
  });
}

export function closePlantPool(): void {
  if (typeof window !== 'undefined' && window.innerWidth < 960) {
    mobilePoolOpen.value = false;
  } else {
    batch(() => {
      poolOpen.value = false;
      mobilePoolOpen.value = false;
    });
  }
}

const WATERING_CYCLE: readonly WateringMode[] = ['Rain-fed', 'Occasional', 'Irrigated'];
const WATERING_TO_EDIT: Record<WateringMode, 'rain' | 'first-years' | 'all-year'> = {
  'Rain-fed': 'rain',
  Occasional: 'first-years',
  Irrigated: 'all-year',
};
const EDIT_TO_WATERING: Record<'rain' | 'first-years' | 'all-year', WateringMode> = {
  rain: 'Rain-fed',
  'first-years': 'Occasional',
  'all-year': 'Irrigated',
};
export function cycleWateringMode(): void {
  const idx = WATERING_CYCLE.indexOf(wateringMode.peek());
  const next = WATERING_CYCLE[(idx + 1) % WATERING_CYCLE.length];
  batch(() => {
    wateringMode.value = next;
    store.siteEdits.value = { ...store.siteEdits.peek(), watering: WATERING_TO_EDIT[next] };
  });
}
export const designName = signal<string>('');
export const designDirty = signal<boolean>(false);
export const autoSaveEnabled = signal<boolean>(false);
const lastSavedAt = signal<string | null>(null);
export const plantingConfig = signal<PlantingPlanConfig>({ ...DEFAULT_PLANTING_PLAN_CONFIG });
export const microclimate = signal<MicroclimateState>({ ...DEFAULT_MICROCLIMATE });
export const designEnvelope = signal<DesignEnvelope>('typical');
export const climateStress = signal<ClimateStressState>({ ...DEFAULT_CLIMATE_STRESS });
export const requestPlantOpen = signal<boolean>(false);
const customPlants = signal<readonly CanopiCustomPlant[]>([]);
export const dossierId = signal<PlantId | null>(null);
export const dossierList = signal<readonly PlantId[]>([]);

export function setQuantityOverride(id: PlantId, qty: number | null): void {
  const cur = plantingConfig.peek();
  const nextOverrides: Record<string, number> = { ...cur.quantityOverrides };
  if (qty === null || !Number.isFinite(qty) || qty < 0) {
    delete nextOverrides[id];
  } else {
    nextOverrides[id] = Math.round(qty);
  }
  setPlantingConfig({ quantityOverrides: nextOverrides });
}

export function openFieldDossier(id: PlantId, list?: readonly PlantId[]): void {
  batch(() => {
    dossierId.value = id;
    if (list && list.length) dossierList.value = list;
    else if (!dossierList.peek().includes(id)) dossierList.value = store.members.peek().includes(id) ? store.members.peek() : [id];
  });
}

export function closeFieldDossier(): void {
  dossierId.value = null;
}

export function stepFieldDossier(delta: -1 | 1): void {
  const cur = dossierId.peek();
  const list = dossierList.peek();
  if (!cur || list.length < 2) return;
  const idx = list.indexOf(cur);
  if (idx < 0) return;
  const next = (idx + delta + list.length) % list.length;
  dossierId.value = list[next];
}

interface FileSystemWritableLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}
interface FileSystemFileHandleLike {
  name?: string;
  createWritable(): Promise<FileSystemWritableLike>;
}
let activeFileHandle: FileSystemFileHandleLike | null = null;

export function hasActiveFileHandle(): boolean {
  return activeFileHandle !== null;
}

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === 'function';
}

export function setDesignName(name: string): void {
  const clean = name.slice(0, 120);
  if (clean === designName.peek()) return;
  designName.value = clean;
  if (store.view.peek() !== 'start') designDirty.value = true;
}

export function setPlantingConfig(patch: Partial<PlantingPlanConfig>): void {
  const next: PlantingPlanConfig = { ...plantingConfig.peek(), ...patch };
  batch(() => {
    plantingConfig.value = next;
    if (Number.isFinite(next.plotAreaM2) && next.plotAreaM2 > 0) {
      store.plot.value = Math.round(next.plotAreaM2);
    }
    if (store.view.peek() !== 'start') designDirty.value = true;
  });
}

export function setMicroclimate(patch: Partial<MicroclimateState>): void {
  microclimate.value = { ...microclimate.peek(), ...patch };
  if (store.view.peek() !== 'start') designDirty.value = true;
}

export function markDesignClean(): void {
  designDirty.value = false;
  lastSavedAt.value = new Date().toISOString();
}

export function buildStudioCanopiText(members: readonly Taxon[] = store.memberTaxa.peek()): string {
  const name = designName.peek().trim() || 'My Field Palette';
  const rel = store.source.peek()?.info().releaseId ?? '';
  const z = store.climate.peek() ?? 'Custom';
  return canopiFile(members, {
    name,
    description: `Canopi Field Studio · ${z}${rel ? ` (${rel})` : ''}`,
    at: new Date().toISOString(),
    plantingPlan: plantingConfig.peek(),
    customPlants: customPlants.peek(),
  });
}

/**
 * Save the active palette as a .canopi v9 file.
 * Uses File System Access API when supported and requested/linked; falls back to Blob download.
 */
export async function saveStudioCanopi(opts: { saveAs?: boolean } = {}): Promise<boolean> {
  const text = buildStudioCanopiText();
  const filename = canopiFileName(designName.peek().trim() || 'My Field Palette');

  const picker = typeof window !== 'undefined'
    ? (window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<FileSystemFileHandleLike> }).showSaveFilePicker
    : undefined;

  if (picker && (opts.saveAs || activeFileHandle || autoSaveEnabled.peek())) {
    try {
      if (opts.saveAs || !activeFileHandle) {
        activeFileHandle = await picker({
          suggestedName: filename,
          types: [{ description: 'Canopi design file', accept: { 'application/json': ['.canopi'] } }],
        });
      }
      const writable = await activeFileHandle.createWritable();
      await writable.write(text);
      await writable.close();
      markDesignClean();
      return true;
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return false;
      // Graceful fallback to standard download below if FS Access fails.
    }
  }

  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  markDesignClean();
  return true;
}

export type OpenCanopiResult =
  | { ok: true; name: string; matched: number; custom: number }
  | { ok: false; error: string };

/**
 * Parse a .canopi v9 JSON string and hydrate designName, plantingConfig, customPlants,
 * and catalog members (matching by canonical_name across loaded pools).
 */
export function openStudioCanopiText(text: string): OpenCanopiResult {
  try {
    const parsed = parseCanopiFile(text);
    const byCanon = new Map<string, { id: string; zone?: string }>();
    const allPools = store.pools.peek();
    for (const [z, list] of Object.entries(allPools)) {
      if (!list) continue;
      for (const t of list) {
        const key = t.canonical_name.toLowerCase();
        if (!byCanon.has(key)) byCanon.set(key, { id: t.id, zone: z });
      }
    }

    const matchedIds: string[] = [];
    const unmatchedCustom: CanopiCustomPlant[] = [...parsed.customPlants];
    const seenCustom = new Set(unmatchedCustom.map((c) => c.canonical_name.toLowerCase()));

    for (const entry of parsed.consortiums) {
      const canon = entry.target.canonical_name;
      const hit = byCanon.get(canon.toLowerCase());
      if (hit) {
        if (!matchedIds.includes(hit.id)) matchedIds.push(hit.id);
      } else if (!seenCustom.has(canon.toLowerCase())) {
        seenCustom.add(canon.toLowerCase());
        unmatchedCustom.push({
          canonical_name: canon,
          stratum: entry.stratum,
          start_phase: entry.start_phase,
          end_phase: entry.end_phase,
        });
      }
    }

    batch(() => {
      designName.value = parsed.name || 'Imported Palette';
      if (parsed.plantingPlan) {
        plantingConfig.value = { ...DEFAULT_PLANTING_PLAN_CONFIG, ...parsed.plantingPlan };
        store.plot.value = Math.round(plantingConfig.value.plotAreaM2);
      }
      customPlants.value = unmatchedCustom;
      if (matchedIds.length) store.members.value = matchedIds;
      if (!store.climate.peek()) {
        const firstZone = store.curatedClimates.peek()[0];
        if (firstZone) store.climate.value = firstZone;
      }
      studioTab.value = 'palette';
      store.view.value = 'matrix';
      designDirty.value = false;
    });

    return { ok: true, name: designName.peek(), matched: matchedIds.length, custom: unmatchedCustom.length };
  } catch (err) {
    return { ok: false, error: (err as Error).message || 'Could not read .canopi file.' };
  }
}

let dirtyWatchBound = false;
let unloadGuardBound = false;

/**
 * Watch member/edit changes to mark dirty while in studio, and install a clean
 * beforeunload guard that prompts ONLY when unsaved changes exist.
 */
export function ensureStudioGuards(): void {
  if (!dirtyWatchBound) {
    dirtyWatchBound = true;
    let prevSig = '';
    effect(() => {
      const sig = `${store.members.value.join(',')}|${JSON.stringify(store.siteEdits.value)}|${store.room.value}`;
      if (prevSig && sig !== prevSig && store.view.peek() !== 'start') {
        designDirty.value = true;
        if (autoSaveEnabled.peek() && activeFileHandle) {
          void saveStudioCanopi();
        }
      }
      prevSig = sig;
    });
    effect(() => {
      const w = store.siteEdits.value.watering;
      if (w && EDIT_TO_WATERING[w] !== wateringMode.peek()) {
        wateringMode.value = EDIT_TO_WATERING[w];
      }
    });
  }

  if (!unloadGuardBound && typeof window !== 'undefined') {
    unloadGuardBound = true;
    window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
      if (designDirty.peek() && store.view.peek() !== 'start') {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }
}
