// The consortium's state, declared once (E6 S1; design check §7.1 "Consortium state"): each field
// says what it holds and where it goes, and everything that used to list the fields by hand derives
// from here.
//
// - signal: the field's signal, made here from `initial` (store.ts re-exports each one by name).
// - undo: Undo puts it back (in the Snapshot; undoTo: what Undo writes, when not simply the value
//   before). endsUndo: a change to it ends the Undo offer (SNAP_KEYS). A plant list is both.
// - saved: part of the Consortium the save keeps and Change site sets aside. The save is the link's
//   fragment (memory.ts saveRecord), so a saved field is in the link, under its own name in the core
//   ShareState (lib/consortium/state.ts encodeLink and decodeLink write and read the #v=4 pairs), and
//   watched as 'reader'. link: how it goes in (`put`, default: as it is; memory.ts shareState) and
//   comes back (`take`, default: the link's value, or the current one when the link has none;
//   memory.ts applyDecoded).
// - watch, for a field not saved: 'reader' (a write to it is the reader acting, and the save, the
//   address and Share's link follow it: memory.ts watchStore and shownFragment) or 'save' (the save
//   and the address follow it).
// - plants: one of the plant lists, saved (Change site's draft seeds them, Start over empties them,
//   Undo puts them back, and a change ends the Undo offer and a waiting Suggest).
//
// defineState takes the declaration and returns the signals and the lists; a test defines its own
// state with one more field and sees it saved, undone and shared with no other change. checkFields
// holds the declaration's rules.
import { batch, signal } from '@preact/signals';
import type { Signal } from '@preact/signals';
import type { ClimateZone, PhaseOrd, PlantId, ShareState, Site } from '../../../lib/consortium/index.ts';
import { MAX_CROPS } from '../../../lib/consortium/index.ts';
import type { Country, View } from '../store.ts';

export interface PutOptions { location: boolean }
export interface TakeOptions { countryFrom: 'link' | 'chosen' }
// T: the signal's value; In: what the link's `put` accepts.
export interface Field<T, In = T> {
  initial: () => T;
  undo?: boolean;
  undoTo?: (before: T, now: T) => T;
  endsUndo?: boolean;
  saved?: boolean;
  link?: {
    put?: (v: In, o: PutOptions) => unknown;
    // now: the current value.
    take?: (s: ShareState, now: T, o: TakeOptions) => T;
  };
  watch?: 'reader' | 'save';
  plants?: boolean;
}
// For a declaration outside this file (a test's own state).
export const field = <T, In = T>(f: Field<T, In>): Field<T, In> => f;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fields = Record<string, Field<any, any>>;
export type ValuesOf<F extends Fields> = { [K in keyof F]: F[K] extends { initial: () => infer T } ? T : never };
// What a field's link `put` takes: its own value unless the put says otherwise.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InputsOf<F extends Fields> = { [K in keyof F]: F[K] extends { link: { put: (v: infer I, ...o: any[]) => unknown } } ? I : ValuesOf<F>[K] };

// The rules a declaration holds, checked by scripts/consortium-memory.test.mjs on STATE_FIELDS (not at
// run time, to keep the first run small).
export function checkFields(fields: Fields): void {
  for (const [k, f] of Object.entries(fields)) {
    if (f.link && !f.saved) throw new Error(`state field ${k}: in the link, so saved (the save is the link's fragment)`);
    if (f.saved && f.watch) throw new Error(`state field ${k}: saved, so watched as 'reader' already`);
    if (f.plants && !f.saved) throw new Error(`state field ${k}: a plant list is saved`);
  }
}

export function defineState<F extends Fields>(fields: F) {
  type V = ValuesOf<F>;
  type K = keyof F & string;
  const keys = Object.keys(fields) as K[];
  // The values of a list, each from get.
  const each = <L extends K>(list: readonly L[], get: (k: L) => unknown): Pick<V, L> => Object.fromEntries(list.map((k) => [k, get(k)])) as Pick<V, L>;
  const signals = each(keys, (k) => signal(fields[k].initial())) as unknown as { [P in K]: Signal<V[P]> };
  const where = (test: (f: Field<unknown>) => unknown): K[] => keys.filter((k) => test(fields[k]));
  const lists = {
    snapshot: where((f) => f.undo || f.plants),
    endsUndo: where((f) => f.endsUndo || f.plants),
    saved: where((f) => f.saved),
    plants: where((f) => f.plants),
    reader: where((f) => f.saved || f.watch === 'reader'),
    save: where((f) => f.saved || f.watch),
  };
  const peek = <L extends K>(list: readonly L[]): Pick<V, L> => each(list, (k) => signals[k].peek());
  return {
    signals,
    lists,
    peek,
    // The values of a list, read in an effect or a computed so it re-runs when any of them changes.
    track: <L extends K>(list: readonly L[]): Pick<V, L> => each(list, (k) => signals[k].value),
    // A list's values in `from`, or its start values without one (Start over empties the plant lists).
    valuesOf: <L extends K>(list: readonly L[], from?: Partial<V>): Pick<V, L> => each(list, (k) => (from ? from[k] : fields[k].initial())),
    // Writes the values given (the caller batches several).
    write(values: Partial<V>): void {
      for (const k of Object.keys(values) as K[]) signals[k].value = values[k] as V[K];
    },
    // Undo's snapshot and its restore, in one batch.
    snapshot: () => peek(lists.snapshot),
    restore(s: Partial<V>): void {
      batch(() => {
        for (const k of lists.snapshot) {
          const to = fields[k].undoTo, before = s[k] as V[K];
          signals[k].value = to ? to(before, signals[k].peek()) : before;
        }
      });
    },
    // The link's state (the core ShareState) from the saved fields' values.
    share: (values: Partial<Record<K, unknown>>, o: PutOptions): Record<string, unknown> =>
      each(lists.saved, (k) => { const put = fields[k].link?.put; return put ? put(values[k], o) : values[k]; }),
    // A decoded link or save written into the saved fields (the caller batches).
    apply(s: ShareState, o: TakeOptions): void {
      for (const k of lists.saved) {
        const take = fields[k].link?.take, now = signals[k].peek();
        signals[k].value = take ? take(s, now, o) : (s as unknown as Record<string, V[K] | null>)[k] ?? now;
      }
    },
  };
}

// ---- the consortium's fields ----

// Every site question starts at "unsure" (design check A7): it filters nothing.
export const DEFAULT_SITE: Site = { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' };

// (Each field is checked against Field with `satisfies`, so the declaration costs no code.)
const PLANT_LIST = { initial: (): PlantId[] => [], saved: true, plants: true } as const satisfies Field<PlantId[]>;

// The consortium: every field here is saved (a test checks it).
export const CONSORTIUM_FIELDS = {
  // The chosen climate; a link without one leaves it as it is.
  climate: { initial: (): ClimateZone | null => null, endsUndo: true, saved: true } satisfies Field<ClimateZone | null>,
  // A guessed country is never written (owner row 2026-10-28); a country from the location only with
  // the reader's "include my location" tick (P5 owner answer 5). A link's country is labelled by
  // where it came from.
  country: {
    initial: (): Country => ({ code: null, source: null }), saved: true,
    link: {
      put: (v: Country, { location }: PutOptions) => ((v.source === 'guess' ? false : v.source === 'location' ? location : true) ? v.code : null),
      take: (s: ShareState, now: Country, { countryFrom }: TakeOptions): Country => (s.country ? { code: s.country, source: countryFrom } : now),
    },
  } satisfies Field<Country>,
  site: { initial: (): Site => ({ ...DEFAULT_SITE }), saved: true } satisfies Field<Site>,
  // The consortium, in the order added.
  members: PLANT_LIST,
  // Pinned: a new suggestion keeps them.
  kept: PLANT_LIST,
  // Taken out by the reader: a new suggestion leaves them out.
  removed: PLANT_LIST,
  // Added from another climate's list (A9), with that climate.
  guests: {
    initial: (): Partial<Record<PlantId, ClimateZone>> => ({}), saved: true, plants: true,
    link: {
      put: (v: Partial<Record<PlantId, ClimateZone>>) => Object.entries(v).flatMap(([id, from]) => (from ? [{ id, from }] : [])),
      take: (s: ShareState) => Object.fromEntries(s.guests.map((g) => [g.id, g.from])),
    },
  } satisfies Field<Partial<Record<PlantId, ClimateZone>>>,
  // The crop examples the reader ticked (Start), as plant ids; a link keeps three.
  crops: { ...PLANT_LIST, link: { put: (v: PlantId[]) => v.slice(0, MAX_CROPS) } } satisfies Field<PlantId[]>,
  // The stage the side view, stepper and print show; a link without one leaves it as it is.
  stage: { initial: (): PhaseOrd => 0, saved: true } satisfies Field<PhaseOrd>,
};

// The consortium as the save keeps it and Change site sets it aside, with a climate.
export type Consortium = Omit<ValuesOf<typeof CONSORTIUM_FIELDS>, 'climate'> & { climate: ClimateZone };
// What memory.ts shareState takes (a share input may leave the stage unset: the link then has none).
export type ShareInput = Omit<InputsOf<typeof CONSORTIUM_FIELDS>, 'stage'> & { stage: PhaseOrd | null };

// The page's state: the consortium, and what is not saved.
export const STATE_FIELDS = {
  ...CONSORTIUM_FIELDS,
  // Which view fills the main area (Start comes first). Not saved: a restore opens the matrix. Undo
  // goes back to Start, or away from it, but never between two views of a consortium.
  view: {
    initial: (): View => 'start', undo: true, watch: 'reader',
    undoTo: (before: View, now: View) => (before === 'start' || now === 'start' ? before : now),
  } satisfies Field<View>,
  // While Start shows, the consortium shown before Change site, with its own site answers, country
  // and stage (null: none). Undo of a list pasted on Start brings it back with Start's draft; the save
  // follows it.
  setAside: { initial: (): Consortium | null => null, undo: true, watch: 'save' } satisfies Field<Consortium | null>,
};

export const state = defineState(STATE_FIELDS);
