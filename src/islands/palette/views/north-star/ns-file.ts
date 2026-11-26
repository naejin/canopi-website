// Single canonical .canopi v9 save/open/link/auto-save/dirty/leave-warning engine (Wave 7).
// Hard rule: NEVER auto-save unless linked with a .canopi file (activeFileHandle !== null && writeGranted).
// Lossless round-trip: preserves baseDoc top-level keys, existing species consortiums entries,
// non-species entries (genus/family), and unrecognized species verbatim.
// Old versions (version !== 9): never overwritten in place; Save writes a new v9 file.
import { batch, signal } from '@preact/signals';
import type {
  CanopiCustomPlant,
  CanopiNonSpeciesEntry,
  CanopiPaletteStudioMeta,
  ClimateZone,
  PlantId,
  ReportSiteOverrides,
  Taxon,
} from '../../../../lib/palette/index.ts';
import {
  CANOPI_FILE_VERSION,
  canopiFile,
  canopiFileName,
  parseCanopiFile,
} from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { isLeaveWarningSuppressed } from '../../state/save.ts';
import { T } from '../../strings.ts';

interface FileSystemWritableLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export interface FileSystemFileHandleLike {
  name?: string;
  getFile?: () => Promise<{ text(): Promise<string>; name?: string }>;
  requestPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
  createWritable(): Promise<FileSystemWritableLike>;
}

export type NsFileStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; reason: string };

export type OpenCanopiOutcome =
  | { ok: true; name: string; matched: number; unrecognized: number; nonSpecies: number; version: number }
  | { ok: false; error: string };

export const nsDirty = signal<boolean>(false);
export const nsFileName = signal<string | null>(null);
export const nsFileLinked = signal<boolean>(false);
export const nsFileWriteGranted = signal<boolean>(false);
export const nsFileStatus = signal<NsFileStatus>({ kind: 'idle' });
export const nsUnrecognizedPlants = signal<readonly CanopiCustomPlant[]>([]);
export const nsNonSpeciesEntries = signal<readonly CanopiNonSpeciesEntry[]>([]);

let activeFileHandle: FileSystemFileHandleLike | null = null;
let baseCanopiDoc: Record<string, unknown> | null = null;
let preservedEntries: readonly Record<string, unknown>[] = [];
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let unloadBound = false;

function supportsFileSystemSave(): boolean {
  return typeof window !== 'undefined'
    && typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === 'function';
}

function supportsFileSystemOpen(): boolean {
  return typeof window !== 'undefined'
    && typeof (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker === 'function';
}

function cancelAutoSaveTimer(): void {
  if (autoSaveTimer !== null) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
}

export function resetCanopiFileState(): void {
  cancelAutoSaveTimer();
  activeFileHandle = null;
  baseCanopiDoc = null;
  preservedEntries = [];
  batch(() => {
    nsDirty.value = false;
    nsFileName.value = null;
    nsFileLinked.value = false;
    nsFileWriteGranted.value = false;
    nsFileStatus.value = { kind: 'idle' };
    nsUnrecognizedPlants.value = [];
    nsNonSpeciesEntries.value = [];
  });
}

export function hydrateFileSession(snap: {
  dirty?: boolean;
  fileName?: string | null;
  unrecognizedPlants?: readonly CanopiCustomPlant[];
  nonSpeciesEntries?: readonly CanopiNonSpeciesEntry[];
}): void {
  batch(() => {
    if (typeof snap.dirty === 'boolean') nsDirty.value = snap.dirty;
    if (typeof snap.fileName === 'string' && snap.fileName) nsFileName.value = snap.fileName;
    if (Array.isArray(snap.unrecognizedPlants)) nsUnrecognizedPlants.value = snap.unrecognizedPlants;
    if (Array.isArray(snap.nonSpeciesEntries)) nsNonSpeciesEntries.value = snap.nonSpeciesEntries;
  });
}

export interface StudioFilePayloadContext {
  overrides: ReportSiteOverrides;
  qtyById: Record<string, number>;
  existingIds: ReadonlySet<PlantId>;
  pathPct: number;
}

let getStudioContext: (() => StudioFilePayloadContext) | null = null;
let applyStudioContext: ((meta: CanopiPaletteStudioMeta | null, fallbackName: string) => void) | null = null;
let ensureCatalogFn: (() => Promise<void>) | null = null;
let allCatalogTaxaFn: (() => readonly Taxon[]) | null = null;
let guestZoneByIdFn: (() => ReadonlyMap<PlantId, ClimateZone>) | null = null;

export function registerStudioFileHooks(hooks: {
  getContext: () => StudioFilePayloadContext;
  applyContext: (meta: CanopiPaletteStudioMeta | null, fallbackName: string) => void;
  ensureCatalog: () => Promise<void>;
  allCatalogTaxa: () => readonly Taxon[];
  guestZoneById: () => ReadonlyMap<PlantId, ClimateZone>;
}): void {
  getStudioContext = hooks.getContext;
  applyStudioContext = hooks.applyContext;
  ensureCatalogFn = hooks.ensureCatalog;
  allCatalogTaxaFn = hooks.allCatalogTaxa;
  guestZoneByIdFn = hooks.guestZoneById;
}

export function buildCurrentCanopiText(): string {
  const members = store.memberTaxa.peek();
  const loc = store.location.peek();
  const z = store.climate.peek();
  const country = store.country.peek().code;
  const rel = store.source.peek()?.info().releaseId ?? '';
  const ctx = getStudioContext?.();
  const baseName = (typeof baseCanopiDoc?.name === 'string' && baseCanopiDoc.name.trim())
    || (nsFileName.peek()?.replace(/\.canopi$/i, ''))
    || loc?.label
    || z
    || 'My Plant Palette';

  const paletteStudio: CanopiPaletteStudioMeta = {
    site: {
      ...(loc?.lat != null ? { lat: loc.lat } : {}),
      ...(loc?.lon != null ? { lon: loc.lon } : {}),
      ...(loc?.label ? { label: loc.label } : {}),
      ...(z ? { climate: z } : {}),
      ...(country ? { country } : {}),
    },
    ...(ctx ? {
      overrides: { ...ctx.overrides } as Record<string, unknown>,
      qtyById: { ...ctx.qtyById },
      existingIds: [...ctx.existingIds],
      pathPct: ctx.pathPct,
    } : {}),
  };

  return canopiFile(members, {
    name: baseName,
    description: baseCanopiDoc && typeof baseCanopiDoc.description === 'string'
      ? baseCanopiDoc.description
      : `Canopi Plant Palette · ${z ?? 'Custom'}${rel ? ` (${rel})` : ''}`,
    at: new Date().toISOString(),
    customPlants: nsUnrecognizedPlants.peek(),
    paletteStudio,
    baseDoc: baseCanopiDoc,
    preservedEntries: preservedEntries.length ? preservedEntries : undefined,
  });
}

async function writeToHandle(handle: FileSystemFileHandleLike, text: string): Promise<void> {
  if (typeof handle.requestPermission === 'function' && !nsFileWriteGranted.peek()) {
    const perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') throw new Error('Write permission denied');
  }
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

export function markNsDirty(): void {
  if (store.view.peek() !== 'matrix') return;
  nsDirty.value = true;
  // Hard rule: NEVER auto-save unless linked to a .canopi file with write consent.
  if (!activeFileHandle || !nsFileWriteGranted.peek()) return;
  cancelAutoSaveTimer();
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null;
    if (!activeFileHandle || !nsFileWriteGranted.peek() || !nsDirty.peek()) return;
    void saveCanopiFile({ silent: true });
  }, 1200);
}

export async function saveCanopiFile(opts: { saveAs?: boolean; silent?: boolean } = {}): Promise<boolean> {
  cancelAutoSaveTimer();
  const text = buildCurrentCanopiText();
  const loc = store.location.peek();
  const defaultName = nsFileName.peek()
    || canopiFileName((typeof baseCanopiDoc?.name === 'string' && baseCanopiDoc.name.trim()) || loc?.label || store.climate.peek() || 'palette');

  const picker = typeof window !== 'undefined'
    ? (window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<FileSystemFileHandleLike> }).showSaveFilePicker
    : undefined;

  // Use File System Access API when available (or when a linked handle exists).
  if (picker || (activeFileHandle && !opts.saveAs)) {
    try {
      let target = opts.saveAs ? null : activeFileHandle;
      if (!target && picker) {
        target = await picker({
          suggestedName: defaultName,
          types: [{ description: 'Canopi design file', accept: { 'application/json': ['.canopi'] } }],
        });
      }
      if (target) {
        nsFileStatus.value = { kind: 'saving' };
        await writeToHandle(target, text);
        activeFileHandle = target;
        batch(() => {
          nsFileLinked.value = true;
          nsFileWriteGranted.value = true;
          if (target?.name) nsFileName.value = target.name;
          else if (!nsFileName.peek()) nsFileName.value = defaultName;
          nsDirty.value = false;
          nsFileStatus.value = { kind: 'saved' };
        });
        return true;
      }
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === 'AbortError') {
        nsFileStatus.value = { kind: 'idle' };
        return false;
      }
      const msg = (err as Error)?.message || 'Write failed';
      batch(() => {
        if (opts.silent) nsFileWriteGranted.value = false;
        nsFileStatus.value = { kind: 'error', reason: msg };
      });
      return false;
    }
  }

  // Fallback for Firefox/Safari: clean Blob download (unlinked — never auto-saves).
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName.endsWith('.canopi') ? defaultName : canopiFileName(defaultName);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  batch(() => {
    nsFileName.value = a.download;
    nsDirty.value = false;
    nsFileStatus.value = { kind: 'saved' };
  });
  return true;
}

export async function openCanopiText(
  text: string,
  opts: { fileName?: string; handle?: FileSystemFileHandleLike | null } = {},
): Promise<OpenCanopiOutcome> {
  cancelAutoSaveTimer();
  let parsed;
  try {
    parsed = parseCanopiFile(text);
  } catch (err) {
    return { ok: false, error: (err as Error).message || T('ns.file.readError') };
  }

  if (ensureCatalogFn) await ensureCatalogFn();

  const byCanon = new Map<string, { id: PlantId; zone?: ClimateZone }>();
  const catalogTaxa = allCatalogTaxaFn?.() ?? [];
  const guestZones = guestZoneByIdFn?.() ?? new Map<PlantId, ClimateZone>();
  const activeZ = (parsed.paletteStudio?.site?.climate as ClimateZone | undefined) ?? store.climate.peek();

  for (const t of catalogTaxa) {
    const key = t.canonical_name.trim().toLowerCase();
    if (!byCanon.has(key)) byCanon.set(key, { id: t.id, zone: guestZones.get(t.id) });
  }
  const allPools = store.pools.peek();
  for (const [z, list] of Object.entries(allPools)) {
    if (!list) continue;
    for (const t of list) {
      const key = t.canonical_name.trim().toLowerCase();
      if (!byCanon.has(key)) byCanon.set(key, { id: t.id, zone: z as ClimateZone });
    }
  }

  const customMetaByCanon = new Map<string, CanopiCustomPlant>();
  for (const cp of parsed.customPlants) {
    const key = cp.canonical_name.trim().toLowerCase();
    if (key && !customMetaByCanon.has(key)) customMetaByCanon.set(key, cp);
  }

  const matchedIds: PlantId[] = [];
  const matchedSet = new Set<PlantId>();
  const nextGuests: Record<PlantId, ClimateZone> = {};
  const unrecognized: CanopiCustomPlant[] = [];
  const seenUnrec = new Set<string>();

  const considerSpecies = (canonRaw: string, stratum?: string, startPhase?: number, endPhase?: number) => {
    const canon = canonRaw.trim();
    if (!canon) return;
    const key = canon.toLowerCase();
    const hit = byCanon.get(key);
    if (hit) {
      if (!matchedSet.has(hit.id)) {
        matchedSet.add(hit.id);
        matchedIds.push(hit.id);
        if (hit.zone && activeZ && hit.zone !== activeZ) {
          nextGuests[hit.id] = hit.zone;
        }
      }
      return;
    }
    if (seenUnrec.has(key)) return;
    seenUnrec.add(key);
    const extra = customMetaByCanon.get(key);
    unrecognized.push({
      ...(extra ?? {}),
      canonical_name: canon,
      ...(stratum ? { stratum } : {}),
      ...(typeof startPhase === 'number' ? { start_phase: startPhase } : {}),
      ...(typeof endPhase === 'number' ? { end_phase: endPhase } : {}),
    });
  };

  for (const entry of parsed.consortiums) {
    considerSpecies(entry.target.canonical_name, entry.stratum, entry.start_phase, entry.end_phase);
  }
  for (const placedCanon of parsed.placedSpecies) {
    considerSpecies(placedCanon);
  }
  for (const cp of parsed.customPlants) {
    considerSpecies(cp.canonical_name, cp.stratum, cp.start_phase, cp.end_phase);
  }

  // Rule 3: If opened file version !== 9, NEVER overwrite it in place.
  const canLinkInPlace = parsed.version === CANOPI_FILE_VERSION && Boolean(opts.handle);
  activeFileHandle = canLinkInPlace ? (opts.handle ?? null) : null;
  baseCanopiDoc = parsed.baseDoc;
  preservedEntries = parsed.rawConsortiums;

  batch(() => {
    nsFileName.value = opts.fileName || canopiFileName(parsed.name);
    nsFileLinked.value = canLinkInPlace;
    // Open starts read-only: first explicit Save asks write permission, then edits auto-save.
    nsFileWriteGranted.value = false;
    nsFileStatus.value = { kind: 'idle' };
    nsUnrecognizedPlants.value = unrecognized;
    nsNonSpeciesEntries.value = parsed.nonSpeciesEntries;
    store.members.value = matchedIds;
    store.guests.value = nextGuests;
    if (!store.climate.peek()) {
      const targetZ = (parsed.paletteStudio?.site?.climate as ClimateZone | undefined)
        ?? store.curatedClimates.peek()[0]
        ?? 'Temperate';
      store.climate.value = targetZ;
    }
    store.view.value = 'matrix';
    nsDirty.value = false;
  });

  applyStudioContext?.(parsed.paletteStudio, parsed.name);

  return {
    ok: true,
    name: parsed.name,
    matched: matchedIds.length,
    unrecognized: unrecognized.length,
    nonSpecies: parsed.nonSpeciesEntries.length,
    version: parsed.version,
  };
}

export async function openCanopiFilePicker(): Promise<OpenCanopiOutcome | null> {
  const picker = typeof window !== 'undefined'
    ? (window as unknown as {
        showOpenFilePicker?: (o: unknown) => Promise<FileSystemFileHandleLike[]>;
      }).showOpenFilePicker
    : undefined;

  if (picker) {
    try {
      const [handle] = await picker({
        multiple: false,
        types: [{ description: 'Canopi design file', accept: { 'application/json': ['.canopi', '.json'] } }],
      });
      if (!handle || !handle.getFile) return null;
      const file = await handle.getFile();
      const text = await file.text();
      return await openCanopiText(text, { fileName: handle.name ?? file.name, handle });
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return null;
      return { ok: false, error: (err as Error)?.message || T('ns.file.readError') };
    }
  }

  // Fallback for Firefox/Safari: hidden <input type="file">
  if (typeof document === 'undefined') return null;
  return new Promise<OpenCanopiOutcome | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.canopi,application/json';
    input.style.display = 'none';
    const cleanup = () => input.remove();
    input.addEventListener('cancel', () => { cleanup(); resolve(null); });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      cleanup();
      if (!file) { resolve(null); return; }
      try {
        const text = await file.text();
        resolve(await openCanopiText(text, { fileName: file.name, handle: null }));
      } catch (err) {
        resolve({ ok: false, error: (err as Error)?.message || T('ns.file.readError') });
      }
    });
    document.body.appendChild(input);
    input.click();
  });
}

export function removeUnrecognizedPlant(canonicalName: string): CanopiCustomPlant | null {
  const cur = nsUnrecognizedPlants.peek();
  const target = cur.find((p) => p.canonical_name === canonicalName) ?? null;
  if (!target) return null;
  nsUnrecognizedPlants.value = cur.filter((p) => p.canonical_name !== canonicalName);
  markNsDirty();
  return target;
}

export function restoreUnrecognizedPlant(plant: CanopiCustomPlant): void {
  const cur = nsUnrecognizedPlants.peek();
  if (cur.some((p) => p.canonical_name === plant.canonical_name)) return;
  nsUnrecognizedPlants.value = [...cur, plant];
  markNsDirty();
}

export function ensureBeforeUnloadGuard(): void {
  if (unloadBound || typeof window === 'undefined') return;
  unloadBound = true;
  window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
    if (store.view.peek() === 'matrix' && nsDirty.peek() && !isLeaveWarningSuppressed()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
