// Field Studio UI & document state (Slice 3.2):
// - Active studio tab ('palette' | 'system' | 'climate' | 'plan')
// - Planting plan config synced with Onboarding Step 2 & store.plot
// - Interactive microclimate sliders (slope, aspect, landform)
// Note: .canopi save/open/dirty/leave-warning live in one canonical path (north-star/ns-state.ts, Wave 7).
// Layer rule (L1-L9): lives in state/, imports only store, lib/palette. Never imports views/.
import { batch, signal } from '@preact/signals';
import type { PlantId, PlantingPlanConfig } from '../../../lib/palette/index.ts';
import { DEFAULT_PLANTING_PLAN_CONFIG } from '../../../lib/palette/index.ts';
import * as store from '../store.ts';

export type MicroAspect = 'flat' | 'south' | 'east' | 'west' | 'north';
export type MicroLandform = 'ridge' | 'mid-slope' | 'valley';

type StudioTab = 'palette' | 'system' | 'climate' | 'plan';
type PaletteViewMode = 'cards' | 'compact';
type PaletteGroupMode = 'none' | 'sun' | 'stage' | 'status';
type RailTab = 'coach' | 'all';
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
  elevOffsetM: number;
  /** True for each field once the user explicitly edits it; false = auto-seeded from v0.7.0 terrain. */
  editedSlope?: boolean;
  editedAspect?: boolean;
  editedLandform?: boolean;
  editedElev?: boolean;
}

const DEFAULT_MICROCLIMATE: MicroclimateState = {
  slopeDeg: 0,
  aspect: 'flat',
  landform: 'mid-slope',
  elevOffsetM: 0,
};

const studioTab = signal<StudioTab>('palette');
const paletteViewMode = signal<PaletteViewMode>('cards');
const paletteGroupMode = signal<PaletteGroupMode>('none');
const railTab = signal<RailTab>('coach');
const poolOpen = signal<boolean>(true);
const wateringMode = signal<WateringMode>('Rain-fed');

export interface PlantPoolPreset {
  tab?: RailTab;
  sun?: 'emergent' | 'high' | 'medium' | 'low' | null;
  stage?: number | null;
  role?: string | null;
  intent?: 'winter' | 'gap' | 'soil' | 'early' | null;
  banner?: string | null;
}

const railPreset = signal<PlantPoolPreset | null>(null);
const mobilePoolOpen = signal<boolean>(false);

export function openPlantPool(preset: PlantPoolPreset = {}): void {
  batch(() => {
    poolOpen.value = true;
    mobilePoolOpen.value = true;
    railTab.value = preset.tab ?? 'all';
    railPreset.value = preset;
  });
}

function closePlantPool(): void {
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
function cycleWateringMode(): void {
  const idx = WATERING_CYCLE.indexOf(wateringMode.peek());
  const next = WATERING_CYCLE[(idx + 1) % WATERING_CYCLE.length];
  batch(() => {
    wateringMode.value = next;
    store.siteEdits.value = { ...store.siteEdits.peek(), watering: WATERING_TO_EDIT[next] };
  });
}
export const designName = signal<string>('');
export const plantingConfig = signal<PlantingPlanConfig>({ ...DEFAULT_PLANTING_PLAN_CONFIG });
export const microclimate = signal<MicroclimateState>({ ...DEFAULT_MICROCLIMATE });
export const dossierId = signal<PlantId | null>(null);
const dossierList = signal<readonly PlantId[]>([]);

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

export function setDesignName(name: string): void {
  const clean = name.slice(0, 120);
  if (clean === designName.peek()) return;
  designName.value = clean;
}

export function setPlantingConfig(patch: Partial<PlantingPlanConfig>): void {
  const next: PlantingPlanConfig = { ...plantingConfig.peek(), ...patch };
  batch(() => {
    plantingConfig.value = next;
    if (Number.isFinite(next.plotAreaM2) && next.plotAreaM2 > 0) {
      store.plot.value = Math.round(next.plotAreaM2);
    }
  });
}

export function setMicroclimate(patch: Partial<MicroclimateState>): void {
  microclimate.value = { ...microclimate.peek(), ...patch };
}
