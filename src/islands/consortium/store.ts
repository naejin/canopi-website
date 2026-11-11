// The consortium page's one store (frozen seam, design check §6): every piece of state is a signal,
// and pool, matrix and flags are computed from them, so views re-render by reading, with no hand
// render loop. Views read and set these signals; only the actions a stream adds write several at once.
// Renaming or removing a signal is a seam change for the coordinator; streams may add actions and,
// inside the computed bodies, the core calls they own (matrix: S1 lib/consortium/matrix.ts; flags:
// S1 conflicts and site).
import { computed, signal } from '@preact/signals';
import type { ClimateZone, Flag, Matrix, PhaseOrd, PlantId, Site, Taxon } from '../../lib/consortium/index.ts';
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

// ---- computed ----
// The plants of the chosen climate, or null until they are read.
export const pool = computed<Taxon[] | null>(() => {
  const c = climate.value;
  return c ? pools.value[c] ?? null : null;
});
// The strata × phases matrix of the members on this site (S1 fills the body with the core's matrix).
export const matrix = computed<Matrix | null>(() => {
  if (!pool.value) return null;
  return null;
});
// The warnings on members: conflicts, site misfits, invasive and toxicity (S1 fills the body).
export const flags = computed<Flag[]>(() => {
  if (!pool.value) return [];
  return [];
});
