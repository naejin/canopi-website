// The consortium's state, declared once (E6 S1; design check §7.1 "Consortium state"): each field
// says what it holds and where it goes, and everything that used to list the fields by hand derives
// from here. A field has an `initial` value (its signal is made here; store.ts re-exports each one
// by name) and any of:
//
// - undo: Undo puts it back (in the Snapshot); a function says what Undo writes from the value
//   before and the value now. endsUndo: a change to it ends the Undo offer (SNAP_KEYS).
// - saved: part of the Consortium the save keeps and Change site sets aside. The save is the link's
//   public fragment plus its private place (persist.ts saveRecord), so a saved field is in the link,
//   under its own name in the core ShareState (lib/consortium/state.ts encodeLink and decodeLink write
//   and read the link v5 pairs), and watched as 'reader'. link: how it goes in (`put`, default: as it is; persist.ts shareState) and
//   comes back (`take`, default: the link's value, or the current one when the link has none;
//   restore.ts applyDecoded).
// - watched, for a field not saved: 'reader' (a write to it is the reader acting, and the save, the
//   address and Share's link follow it: persist.ts watchStore and shownFragment) or 'save' (the save
//   and the address follow it).
// - plants: one of the plant lists. It is saved, Undo puts it back and a change ends the Undo offer;
//   Change site's draft seeds it, Start over empties it, and a change ends a waiting Suggest.
//
// defineState takes the declaration and returns the signals and the lists; a test defines its own
// state with one more field and sees it round-trip through the schema.
import { batch, signal } from '@preact/signals';
import type { Signal } from '@preact/signals';
import type { ClimateZone, PeriodId, PhaseOrd, PlantId, Room, ShareState, Site, SoilAnswer, Spot } from '../../../lib/consortium/index.ts';
import { emptyPlace, periodIds } from '../../../lib/consortium/index.ts';
import type { Country, CountrySource, View } from '../store.ts';

// What the link's put and take may read: the reader's "Include my place" tick (share: place), where a
// decoded link or save came from (apply: countryFrom) and whether it brings a place (apply:
// bringsPlace, core state.ts bringsPlace: its cell, or a spot or soil answer; plant-palette-architecture 8.3).
export interface LinkOptions { place?: boolean; countryFrom?: Extract<CountrySource, 'link' | 'chosen'>; bringsPlace?: boolean }
export interface Field<T> {
  initial: () => T;
  undo?: true | ((before: T, now: T) => T);
  endsUndo?: boolean;
  saved?: boolean;
  link?: { put?: (v: T, o: LinkOptions) => unknown; take?: (s: ShareState, now: T, o: LinkOptions) => T };
  watched?: 'reader' | 'save';
  plants?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fields = Record<string, Field<any>>;
export type ValuesOf<F extends Fields> = { [K in keyof F]: F[K] extends { initial: () => infer T } ? T : never };

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
    saved: where((f) => f.saved || f.plants),
    plants: where((f) => f.plants),
    reader: where((f) => f.saved || f.plants || f.watched === 'reader'),
    save: where((f) => f.saved || f.plants || f.watched),
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
          const to = fields[k].undo, before = s[k] as V[K];
          signals[k].value = typeof to === 'function' ? to(before, signals[k].peek()) : before;
        }
      });
    },
    // The link's state (the core ShareState) from the saved fields' values.
    share: (values: Partial<Record<K, unknown>>, o: LinkOptions): Record<string, unknown> =>
      each(lists.saved, (k) => { const put = fields[k].link?.put; return put ? put(values[k], o) : values[k]; }),
    // A decoded link or save written into the saved fields (the caller batches).
    apply(s: ShareState, o: LinkOptions): void {
      for (const k of lists.saved) {
        const take = fields[k].link?.take, now = signals[k].peek();
        signals[k].value = take ? take(s, now, o) : (s as unknown as Record<string, V[K] | null>)[k] ?? now;
      }
    },
  };
}

// ---- the consortium's fields ----

// The Site the old site questions read (site.ts fits()), every answer "unsure" (design check A7). Not
// stored since PP-B commit 0: store.ts derives `site` from room, spot and soil (place.ts siteFor).
export const DEFAULT_SITE: Site = { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' };

// (Each field is checked against Field with `satisfies`, so the declaration costs no code.)
const PLANT_LIST = { initial: (): PlantId[] => [], plants: true } as const satisfies Field<PlantId[]>;
const TODAY: PeriodId = periodIds[0];

// The consortium: every field here is saved, or a plant list (a test checks it).
export const CONSORTIUM_FIELDS = {
  // The chosen climate; a link without one leaves it as it is.
  climate: { initial: (): ClimateZone | null => null, endsUndo: true, saved: true } satisfies Field<ClimateZone | null>,
  // In a link only with "Include my place" (`k`, plant-palette-architecture 8.1), and only from a
  // chosen, location or link source, never a guess (owner row 2026-10-28). A link's country applies
  // only when the link brings a place (`k` alone keeps the reader's), labelled by where it came from.
  country: {
    initial: (): Country => ({ code: null, source: null }), saved: true,
    link: {
      put: (v: Country, o: LinkOptions) => (o.place && v.source !== null && v.source !== 'guess' ? v.code : null),
      take: (s: ShareState, now: Country, o: LinkOptions): Country => (s.country && o.bringsPlace ? { code: s.country, source: o.countryFrom ?? 'chosen' } : now),
    },
  } satisfies Field<Country>,
  // The place (plant-palette-architecture 3.6): room (`m`) and plot size (`z`) are the palette's,
  // always in the link and the save, and a link's win; the spot and the soil go in a link only with
  // "Include my place" and the save keeps them as its private `place`. A link that brings a place
  // gives its whole place; one that brings none is judged against the open palette's.
  room: { initial: (): Room => 'unsure', saved: true } satisfies Field<Room>,
  plot: { initial: (): number | null => null, saved: true, link: { take: (s: ShareState) => s.plot } } satisfies Field<number | null>,
  spot: {
    initial: (): Spot => ({ ...emptyPlace.spot }), saved: true,
    link: {
      put: (v: Spot, o: LinkOptions) => (o.place ? v : null),
      take: (s: ShareState, now: Spot, o: LinkOptions): Spot => s.spot ?? (o.bringsPlace ? { ...emptyPlace.spot } : now),
    },
  } satisfies Field<Spot>,
  soil: {
    initial: (): SoilAnswer => ({ from: 'map' }), saved: true,
    link: {
      put: (v: SoilAnswer, o: LinkOptions) => (o.place ? v : null),
      take: (s: ShareState, now: SoilAnswer, o: LinkOptions): SoilAnswer => s.soil ?? (o.bringsPlace ? { from: 'map' } : now),
    },
  } satisfies Field<SoilAnswer>,
  // The period the page is shown for (`y`; saved and shared, not in Undo); a link's wins (absent: today).
  period: { initial: (): PeriodId => TODAY, saved: true, link: { take: (s: ShareState) => s.period } } satisfies Field<PeriodId>,
  // The consortium, in the order added.
  members: PLANT_LIST,
  // Taken out by the reader: a new suggestion leaves them out.
  removed: PLANT_LIST,
  // Added from another climate's list (A9), with that climate.
  guests: {
    initial: (): Partial<Record<PlantId, ClimateZone>> => ({}), plants: true,
    link: {
      put: (v: Partial<Record<PlantId, ClimateZone>>) => Object.entries(v).flatMap(([id, from]) => (from ? [{ id, from }] : [])),
      take: (s: ShareState) => Object.fromEntries(s.guests.map((g) => [g.id, g.from])),
    },
  } satisfies Field<Partial<Record<PlantId, ClimateZone>>>,
};

// The consortium as the save keeps it and Change site sets it aside, with a climate.
export type Consortium = Omit<ValuesOf<typeof CONSORTIUM_FIELDS>, 'climate'> & { climate: ClimateZone };
// What persist.ts shareState takes.
export type ShareInput = ValuesOf<typeof CONSORTIUM_FIELDS>;

// The page's state: the consortium, and what is not saved.
export const STATE_FIELDS = {
  ...CONSORTIUM_FIELDS,
  // Which view fills the main area (Start comes first; 'matrix' is the empty palette slot since PP-B
  // commit 0a', until b2's 'place' | 'palette' | 'plan'). Not saved: a restore opens the palette slot.
  // Undo goes back to Start, or away from it, but never between two views of a consortium.
  view: {
    initial: (): View => 'start', watched: 'reader',
    undo: (before: View, now: View) => (before === 'start' || now === 'start' ? before : now),
  } satisfies Field<View>,
  // While Start shows, the consortium shown before Change site, with its own site answers and country
  // (null: none). Undo of a list pasted on Start brings it back with Start's draft; the save
  // follows it.
  setAside: { initial: (): Consortium | null => null, undo: true, watched: 'save' } satisfies Field<Consortium | null>,
  // The stage print draws the side drawing at (unsaved, not in Undo; nothing on the page sets it since
  // the stepper went in PP-B commit 0a'): b2 points print at the year step of Through the years (PP-B18)
  // and removes it.
  stage: { initial: (): PhaseOrd => 0 } satisfies Field<PhaseOrd>,
};

export const state = defineState(STATE_FIELDS);
