// The consortium's state, declared once (E6 S1; design check §7.1 "Consortium state"): each field
// says what it holds and where it goes, and everything that used to list the fields by hand derives
// from here.
//
// - signal: the field's signal, made here (store.ts re-exports each one under its old name).
// - undo: 'restore' (Undo puts it back: in the Snapshot), 'ends' (a change to it ends the Undo
//   offer: SNAP_KEYS), 'both'.
// - saved: part of the Consortium the save keeps and Change site sets aside. The save is the link's
//   fragment (memory.ts saveRecord), so a saved field has a `link` too.
// - link: how it goes into the core ShareState (`put`, memory.ts shareState) and comes back out of a
//   decoded link or save (`take`, memory.ts applyDecoded). Its ShareState key is the field's name;
//   the core codec (lib/consortium/state.ts encodeLink, decodeLink) writes and reads the #v=4 pairs.
// - watch: 'reader' (a write to it is the reader acting, and the save, the address and Share's link
//   follow it: memory.ts watchStore and shownFragment) or 'save' (the save and the address follow it).
// - plants: one of the plant lists (Change site's draft seeds them, Start over empties them, a change
//   ends a waiting Suggest).
//
// defineState takes the declaration and returns the signals and the lists; a test can define its own
// state with one more field and see it saved, undone and shared with no other change.
import { batch, signal } from '@preact/signals';
import type { Signal } from '@preact/signals';
import type { PlantId, ShareState } from '../../../lib/consortium/index.ts';
import { MAX_CROPS } from '../../../lib/consortium/index.ts';

export interface PutOptions { location: boolean }
export interface TakeOptions { countryFrom: 'link' | 'chosen' }
export interface Field<T> {
  initial: () => T;
  undo?: 'restore' | 'ends' | 'both';
  // What Undo writes back (default: the value before the action).
  undoTo?: (before: T, now: T) => T;
  saved?: boolean;
  watch?: 'reader' | 'save';
  plants?: boolean;
  link?: {
    put: (v: T, o: PutOptions) => unknown;
    // The value a decoded link gives (now: the current value, kept when the link has none).
    take: (s: ShareState, now: T, o: TakeOptions) => T;
  };
}
export const field = <T>(f: Field<T>): Field<T> => f;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fields = Record<string, Field<any>>;
export type ValuesOf<F extends Fields> = { [K in keyof F]: F[K] extends Field<infer T> ? T : never };
type KeysWhere<F extends Fields, P> = { [K in keyof F]: F[K] extends P ? K : never }[keyof F] & string;

export function defineState<F extends Fields>(fields: F) {
  type V = ValuesOf<F>;
  type K = keyof F & string;
  const keys = Object.keys(fields) as K[];
  for (const k of keys) {
    const f = fields[k];
    if (f.saved && !f.link) throw new Error(`state field ${k}: saved, so it needs a link (the save is the link's fragment)`);
    if (f.saved && f.watch !== 'reader') throw new Error(`state field ${k}: saved, so the save must watch it (watch: 'reader')`);
    if (f.plants && !(f.saved && f.undo === 'both')) throw new Error(`state field ${k}: a plant list is saved and undone (undo: 'both')`);
  }
  const signals = Object.fromEntries(keys.map((k) => [k, signal(fields[k].initial())])) as { [P in K]: Signal<V[P]> };
  const where = (test: (f: Field<unknown>) => boolean): K[] => keys.filter((k) => test(fields[k]));
  const lists = {
    snapshot: where((f) => f.undo === 'restore' || f.undo === 'both'),
    endsUndo: where((f) => f.undo === 'ends' || f.undo === 'both'),
    saved: where((f) => !!f.saved),
    linked: where((f) => !!f.link),
    plants: where((f) => !!f.plants),
    reader: where((f) => f.watch === 'reader'),
    save: where((f) => !!f.watch),
  };
  const peek = <L extends K>(list: readonly L[]): Pick<V, L> => Object.fromEntries(list.map((k) => [k, signals[k].peek()])) as Pick<V, L>;
  return {
    fields,
    signals,
    lists,
    peek,
    // The values of a list, read in an effect or a computed so it re-runs when any of them changes.
    track: (list: readonly K[]): unknown[] => list.map((k) => signals[k].value),
    // Undo's snapshot and its restore (in one batch).
    snapshot: () => peek(lists.snapshot),
    restore(s: Partial<V>): void {
      batch(() => {
        for (const k of lists.snapshot) {
          if (!(k in s)) continue;
          const f = fields[k], before = s[k] as V[K];
          signals[k].value = f.undoTo ? f.undoTo(before, signals[k].peek()) : before;
        }
      });
    },
    // Whether anything that ends the Undo offer changed since `then` (a peek of lists.endsUndo).
    changedSince: (then: Partial<V>, now: Partial<V>): boolean => lists.endsUndo.some((k) => now[k] !== then[k]),
    // The link's state from the linked fields' values.
    share(values: Pick<V, KeysWhere<F, { link: object }>>, o: PutOptions): Record<string, unknown> {
      return Object.fromEntries(lists.linked.map((k) => [k, fields[k].link!.put((values as V)[k], o)]));
    },
    // A decoded link or save written into the signals (the caller batches).
    apply(s: ShareState, o: TakeOptions): void {
      for (const k of lists.linked) signals[k].value = fields[k].link!.take(s, signals[k].peek(), o);
    },
  };
}

// ---- the consortium's fields ----

export const CONSORTIUM_FIELDS = {
  // the crop examples the reader ticked (Start), as plant ids
  crops: field<PlantId[]>({
    initial: () => [], undo: 'both', saved: true, watch: 'reader', plants: true,
    link: { put: (v) => v.slice(0, MAX_CROPS), take: (s) => s.crops },
  }),
};

export const state = defineState(CONSORTIUM_FIELDS);
