// The consortium page's one store (frozen seam, design check §6): every piece of state is a signal,
// and pool, matrix and flags are computed from them, so views re-render by reading, with no hand
// render loop. Views read and set these signals; only the actions a stream adds write several at once.
// Renaming or removing a signal is a seam change for the coordinator; streams may add actions and,
// inside the computed bodies, the core calls they own (matrix: S1 lib/consortium/matrix.ts; flags:
// S1 conflicts and site).
import { computed, effect, signal } from '@preact/signals';
import type { ClimateZone, Flag, FlagContext, Interaction, Matrix, PhaseOrd, PlantId, Site, Taxon } from '../../lib/consortium/index.ts';
import { buildMatrix, countryStatus, flagsOf, suggest } from '../../lib/consortium/index.ts';
import type { LoadFailure, PlantSource } from '../../lib/consortium/source.ts';

// Where the country came from: the reader chose it, a link carried it, or the page guessed it from
// the browser's language (shown as a guess, never assumed).
export type CountrySource = 'chosen' | 'link' | 'guess';
export interface Country { code: string | null; source: CountrySource | null }
// Which view fills the main area once a climate is chosen (Start comes first).
export type View = 'start' | 'matrix' | 'side' | 'jobs' | 'list';
// The open dialog, if any: what it shows and for which plant (null for sheets about no one plant).
export type SheetKind = 'details' | 'swap' | 'add' | 'search' | 'paste' | 'share' | 'download';
export interface Sheet { kind: SheetKind; id: PlantId | null }
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed';
export interface Load { status: LoadStatus; error: LoadFailure | null }

// Every site question starts at "unsure" (design check A7): it filters nothing.
export const DEFAULT_SITE: Site = { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' };

// ---- state ----
export const climate = signal<ClimateZone | null>(null);
export const country = signal<Country>({ code: null, source: null });
export const site = signal<Site>({ ...DEFAULT_SITE });
export const crops = signal<string[]>([]); // the crop examples the reader ticked (Start), as plant ids
export const members = signal<PlantId[]>([]); // the consortium, in the order added
export const kept = signal<PlantId[]>([]); // pinned: a new suggestion keeps them
export const removed = signal<PlantId[]>([]); // taken out by the reader: a new suggestion leaves them out
export const guests = signal<Partial<Record<PlantId, ClimateZone>>>({}); // added from another climate's list (A9)
export const view = signal<View>('start');
export const stage = signal<PhaseOrd>(0); // the stage the side view, stepper and print show
export const sheet = signal<Sheet | null>(null);
export const load = signal<Load>({ status: 'idle', error: null });

// ---- data (set once the database is open; S1's load fills them) ----
export const source = signal<PlantSource | null>(null);
// Each climate's plants as PlantSource.pool returned them, cached by climate once read.
export const pools = signal<Partial<Record<ClimateZone, Taxon[]>>>({});
// Each climate's interactions (PlantSource.interactions), read with its pool (S1).
export const interactionSets = signal<Partial<Record<ClimateZone, Interaction[]>>>({});

// ---- computed ----
// The plants of the chosen climate, or null until they are read.
export const pool = computed<Taxon[] | null>(() => {
  const c = climate.value;
  return c ? pools.value[c] ?? null : null;
});
// The guests as plants: each with its home climate's placement and `from` set (A9), once that
// climate's pool is read.
export const guestTaxa = computed<Taxon[]>(() => {
  const out: Taxon[] = [];
  for (const [id, from] of Object.entries(guests.value)) {
    const t = from ? pools.value[from]?.find((x) => x.id === id) : undefined;
    if (t && from) out.push({ ...t, from });
  }
  return out;
});
// The guest climates whose plant list is not read yet: while any is, guests from it are missing from
// memberTaxa, the matrix and the flags, and "Suggest plants" waits (suggestMembers returns false).
export const guestsPending = computed<ClimateZone[]>(() => {
  const out: ClimateZone[] = [];
  for (const from of Object.values(guests.value)) if (from && !pools.value[from] && !out.includes(from)) out.push(from);
  return out;
});
// Members memberTaxa leaves out, never silently: `loading` while their list is read (a guest climate
// in guestsPending, or the chosen climate's pool), `unlisted` once read and not in it.
export const missingMembers = computed<{ loading: PlantId[]; unlisted: PlantId[] }>(() => {
  const own = pool.value, loading: PlantId[] = [], unlisted: PlantId[] = [];
  const found = new Set(memberTaxa.value.map((t) => t.id));
  for (const id of members.value) {
    if (found.has(id)) continue;
    const from = guests.value[id];
    if (!own || (from && !pools.value[from])) loading.push(id);
    else unlisted.push(id);
  }
  return { loading, unlisted };
});
// The members as plants, in order: the climate's own, or a guest's home record. Ids not at hand are
// left out here and listed in missingMembers (the views say so).
export const memberTaxa = computed<Taxon[]>(() => {
  const own = pool.value;
  if (!own) return [];
  const byId = new Map<PlantId, Taxon>(own.map((t) => [t.id, t]));
  for (const g of guestTaxa.value) if (!byId.has(g.id)) byId.set(g.id, g);
  return members.value.flatMap((id) => byId.get(id) ?? []);
});
// What the flags read: the site, the climate's interactions and the chosen country with its
// countryStatus ('none', 'checked' or 'unchecked': no country is not "not checked").
export const flagContext = computed<FlagContext>(() => {
  const code = country.value.code;
  return {
    site: site.value,
    interactions: (climate.value && interactionSets.value[climate.value]) || [],
    country: code,
    countryStatus: countryStatus(code, source.value?.countries() ?? new Map()),
  };
});
// The strata × phases matrix of the members on this site (core matrix.ts).
export const matrix = computed<Matrix | null>(() => {
  const c = climate.value, p = pool.value;
  if (!c || !p) return null;
  return buildMatrix(c, p, memberTaxa.value, site.value);
});
// The warnings on members: conflicts, site misfits, invasive and toxicity (core suggest.ts flagsOf).
export const flags = computed<Flag[]>(() => {
  if (!pool.value) return [];
  return flagsOf(memberTaxa.value, flagContext.value);
});

// ---- actions (S1) ----

// Reads a climate's pool and interactions once (later calls share the first read). A read that
// fails after the database opened is damage: the §5 screen, never a partial matrix; a later call
// tries again. Signals are read with peek(), so an effect calling this does not re-run per load.
const reading = new Map<ClimateZone, Promise<Taxon[] | null>>();
export function loadPool(c: ClimateZone): Promise<Taxon[] | null> {
  const src = source.peek();
  if (!src) return Promise.resolve(null);
  const have = pools.peek()[c];
  if (have) return Promise.resolve(have);
  let p = reading.get(c);
  if (!p) {
    // A read of a source replaced meanwhile (Retry) neither writes nor fails the new load.
    p = Promise.all([src.pool(c), src.interactions(c)]).then(([plants, rows]) => {
      if (source.peek() !== src) return null;
      pools.value = { ...pools.peek(), [c]: plants };
      interactionSets.value = { ...interactionSets.peek(), [c]: rows };
      return plants;
    }).catch((err: unknown) => {
      if (source.peek() !== src) return null;
      reading.delete(c);
      console.error(`Consortium data ${src.info().releaseId}: ${c}: ${(err as Error).message}`);
      load.value = { status: 'failed', error: 'damaged' };
      return null;
    });
    reading.set(c, p);
  }
  return p;
}

// Sets the open database's PlantSource, closing the one before it first (Retry opens a new
// database; the old one is never left open). null closes the current one and leaves none.
let closeCurrent: (() => void) | null = null;
export function setSource(next: PlantSource | null, close: (() => void) | null = null): void {
  const prev = closeCurrent;
  closeCurrent = null;
  source.value = null;
  reading.clear();
  try { prev?.(); } catch (err) { console.error(`Consortium data: closing the previous database: ${(err as Error).message}`); }
  source.value = next;
  closeCurrent = next ? close : null;
}

// Keeps the chosen climate's pool and every guest list's pool read as soon as the database is open,
// so Start works while the plant list loads. Re-runs only when the source, the climate or the guests
// change (never on a pool arriving, so a failed read is not retried in a loop). Returns the disposer.
export function watchPools(): () => void {
  return effect(() => {
    if (!source.value) return;
    const c = climate.value;
    if (c) void loadPool(c);
    for (const from of new Set(Object.values(guests.value))) if (from) void loadPool(from);
  });
}

// "Suggest plants": a new suggestion around the kept plants and Main crops (which become kept),
// leaving out removed plants (core suggest.ts). Needs the climate's pool and every guest climate's
// (a kept guest must count); false, changing nothing, while any is not read (guestsPending).
export function suggestMembers(): boolean {
  const p = pool.value;
  if (!p || guestsPending.value.length) return false;
  const keep = [...new Set([...crops.value, ...kept.value])];
  const s = suggest(p, { ...flagContext.value, kept: keep, crops: crops.value, removed: removed.value, guests: guestTaxa.value });
  kept.value = keep;
  members.value = s.members;
  return true;
}
