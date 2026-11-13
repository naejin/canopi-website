// What the consortium tool keeps on this device and in the address bar (stream S4; E6 S2 split it
// out of memory.ts; owner row "Memory", 2026-10-27: the shared site climate plus the last consortium
// on this device; sharing is a link that restores the exact state, with no list of saved designs).
//
// - The share link: #v=4 in the address's fragment (core state.ts encodeLink / decodeLink), so it
//   never reaches a server log. The page keeps the address bar on it while a consortium is shown, so
//   a reload restores it, and rewrites it after a link with plants no longer in the list (§5).
// - The last consortium: localStorage STORE, { fragment, at, src }, written on each change (src: whether
//   its country came from a shared link, so it keeps that label); a visit with no link opens it. A
//   guide preset (?plant=&climate=, A5) wins over it. An older save (v1's { q, at, src }, or another
//   link version) gives the "older version" notice once and is removed.
// - The page's own address: replaceState writes history.state { ct: fragment, src }, so a reload of
//   the page's own link opens as the save (its country label kept), not as a link someone shared
//   (v1 bca954c). A link pasted into the open tab (hashchange) is opened (arrival.ts).
// - The reader's country choice: localStorage COUNTRY_STORE ('FR', or '-' for "No country"), apart
//   from the consortium. A guess from the browser is shown as a guess, used for the warnings, and
//   never written, neither here nor in a link (owner row "Climate first, details").
// - The shared site climate: localStorage SITE_CLIMATE (knowledge/decisions/climate-ux.md), written
//   when the reader picks a climate on Start (draft.ts), and read when nothing else names one. A
//   link's or a guide's climate never writes it.
// - The site location (P5 S5b): localStorage LOCATION_STORE { lat, lon, source, label } (location.ts),
//   apart from the consortium and never in a link or the address; a link carries the climate cell's
//   centre (`o=`) only when the reader ticks "include my location" in Share (owner answer 5).
// Every storage call may throw (private mode, blocked cookies): each one is caught, and the tool
// works without it; Share then says the link keeps the consortium (§5 "Storage unavailable").
//
// Also here, below restore.ts and the location step so that neither imports the other: the restore
// in flight (what Start shows while a link opens) and the count of the reader's actions, which the
// store watcher (watchStore) keeps.
import { computed, effect, signal, untracked } from '@preact/signals';
import type { ClimateZone, LinkOrigin, PlantId, ShareState } from '../../../lib/consortium/index.ts';
import { encodeLink, LINK_VERSION } from '../../../lib/consortium/index.ts';
import type { Consortium, Country, CountrySource } from '../store.ts';
import * as store from '../store.ts';
import { state as schema } from './schema.ts';
import type { ShareInput } from './schema.ts';

export const STORE = 'canopi-consortium';
export const COUNTRY_STORE = 'canopi-country';
export const SITE_CLIMATE = 'canopi-climate';
export const LOCATION_STORE = 'canopi-location';
export const NO_COUNTRY = '-';

// ---- storage, guarded ----

export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
export const attempt = <T>(f: () => T): T | null => { try { return f(); } catch { return null; } };

// A storage whose every call is caught. get() may itself throw (a blocked localStorage getter).
export function guarded(get: () => StorageLike | null | undefined) {
  return {
    read: (k: string): string | null => attempt(() => get()?.getItem(k) ?? null),
    write: (k: string, v: string): boolean => attempt(() => { const s = get(); if (!s) return false; s.setItem(k, v); return true; }) ?? false,
    remove: (k: string): boolean => attempt(() => { const s = get(); if (!s) return false; s.removeItem(k); return true; }) ?? false,
    // Whether this browser keeps anything: a probe key written, read back and removed.
    works(): boolean {
      return attempt(() => {
        const s = get();
        if (!s) return false;
        const key = `${STORE}-probe`;
        s.setItem(key, '1');
        const ok = s.getItem(key) === '1';
        s.removeItem(key);
        return ok;
      }) ?? false;
    },
  };
}

export const memory = guarded(() => (typeof localStorage === 'undefined' ? null : localStorage));
// Whether this browser keeps the consortium (false: Share says the link does).
export const storageWorks = signal(true);

// ---- where the country came from ----

// One country-source enum: store.ts CountrySource (where the reader's country came from). The save
// and history.state keep it without 'guess' (a guess is never written): CountryFrom, null for none.
export type CountryFrom = Exclude<CountrySource, 'guess'> | null;
const KEPT_SOURCES: readonly CountrySource[] = ['link', 'chosen', 'location'];
export const fromOf = (v: unknown): CountryFrom => (KEPT_SOURCES.includes(v as CountrySource) ? (v as Exclude<CountrySource, 'guess'>) : null);
// Where a country came from, as the save and history.state keep it.
const countryFrom = (c: Country = store.country.peek()): CountryFrom =>
  (!c.code || c.source === 'guess' ? null : fromOf(c.source) ?? 'chosen');

// ---- the save record ----

// src: where the saved consortium's country came from ('link': a shared link; 'chosen'; 'location':
// the site location (P5 owner answer 5), kept as `country` beside the fragment, never in it; null: none).
export interface SavedRecord { fragment: string; at: string; src: CountryFrom; country?: string }
export const saveRecord = (fragment: string, at: string, src: CountryFrom, country: string | null = null): string =>
  JSON.stringify(src === 'location' && country ? { fragment, at, src, country } : { fragment, at, src });
const versionOf = (fragment: string): string | null => new URLSearchParams(fragment).get('v');
const parsed = (text: string | null): Record<string, unknown> | null => {
  if (!text) return null;
  const v = attempt(() => JSON.parse(text) as unknown);
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
};
// A record read back, or null when it is not one (an older format, another link version, damaged JSON).
export function readRecord(text: string | null): SavedRecord | null {
  const v = parsed(text);
  if (!v) return null;
  const { fragment, at, src, country } = v;
  if (typeof fragment !== 'string' || !fragment.length || fragment.length >= 20_000 || typeof at !== 'string') return null;
  const ver = versionOf(fragment);
  if (ver !== null && ver !== String(LINK_VERSION)) return null;
  const from = fromOf(src);
  return from === 'location' && typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? { fragment, at, src: from, country } : { fragment, at, src: from };
}
// A save from an older version of the tool: v1's { q, at, src }, or a record of another link version.
export function oldRecord(text: string | null): boolean {
  const v = parsed(text);
  if (!v) return false;
  if (typeof v.q === 'string') return true;
  if (typeof v.fragment !== 'string') return false;
  const ver = versionOf(v.fragment);
  return ver !== null && ver !== String(LINK_VERSION);
}

// ---- climates at the island edge (the site's lowercase ids) ----

export const siteId = (z: ClimateZone): string => z.toLowerCase();

// ---- the share state ----

// The state a link or the save holds, each field as state/schema.ts puts it. A guessed country is
// never written (owner row 2026-10-28); a country from the location only with the reader's "include
// my location" tick (P5 owner answer 5; S5b passes { location: true }).
export function shareState(s: ShareInput, { location = false }: { location?: boolean } = {}): ShareState {
  return schema.share(s, { location }) as unknown as ShareState;
}

// The address of a link: the page without its query (a guide preset is used once) and the fragment.
export const shareUrl = (href: string, fragment: string): string => {
  const u = new URL(href);
  return `${u.origin}${u.pathname}#${fragment}`;
};

// ---- the restore in flight and the reader's actions ----
// A restore (restore.ts) reads everything first and changes no store signal until it applies, in one
// batch, and only if it is still the newest restore and the reader has not acted since it began.

// Every write to the consortium's signals that is not a restore applying or a guessed country (an
// edit, Suggest, Start empty, a climate, Start over): the reader acted.
let actions = 0;
export const actionCount = (): number => actions;
let quiet = false;
// (Only outside an effect: a write made in an effect reaches the watcher after the effect ends.)
export const quietly = (fn: () => void): void => { quiet = true; try { fn(); } finally { quiet = false; } };
// The newest restore in flight, for display only: Start's "reading" line, and the link's climate on
// Start at once while the plants are read (first visit). Ended by that restore, or by the reader acting.
export const inFlight = signal<{ id: number; climate: ClimateZone | null; from: 'link' | 'saved' } | null>(null);
export const restoring = computed(() => inFlight.value !== null);
export const pendingClimate = computed(() => (store.climate.value ? null : inFlight.value?.climate ?? null));
// A share link's climate shown on Start while it opens (not the reader's own save): the reader's saved
// site then proposes no card over it (location.ts settle; seam review round 2, 2).
export const pendingLinkClimate = computed(() => (inFlight.value?.from === 'link' ? pendingClimate.value : null));
// The climate Start shows, from its four sources, one computed (design check §7.1 "Which climate
// now"): the reader's choice, else a link's still opening, else the card a location proposes
// (proposed: shown as a suggestion, not chosen). The four signals stay (owner answer 1).
export const climateShown = computed((): { zone: ClimateZone | null; proposed: boolean } => {
  const chosen = store.climate.value ?? pendingClimate.value;
  return chosen ? { zone: chosen, proposed: false } : { zone: store.proposedClimate.value, proposed: store.proposedClimate.value !== null };
});

// The reader acts on Start while a link loads: the climate the link shows becomes the chosen one
// (that write is the reader acting, so the restore in flight will not apply).
export function adoptPending(): void {
  const shown = pendingClimate.peek();
  if (shown) store.climate.value = shown;
}

// ---- the consortium and the save ----
// Two states: the consortium, and Start's draft (the picked card and its crops) while Start shows.
// Change site sets the consortium aside (store.setAside) and opens a draft seeded from it; the draft
// never changes the consortium or the save. Only Suggest, Start empty, a paste and Back to your
// consortium (which discards the draft) end it. The save always encodes the consortium, written on
// every change of it; Undo restores the consortium (and the view), so it rewrites the save too.
// Every write of the save goes through writeSave, which holds the one multi-tab rule.

// The consortium this page shows or set aside on Start (null: none of its own). shown: the store's
// consortium fields whatever the view (Start's draft too), as a link of them reads.
export function own(shown = false): Consortium | null {
  if (shown || store.view.peek() !== 'start') {
    const climate = store.climate.peek();
    return climate && (schema.peek(schema.lists.saved) as Consortium);
  }
  return store.setAside.peek();
}

// The current state as a fragment, against the climate's and the guest lists' ids.
// of: a consortium set aside (Start's draft shows), in place of the store's. origin: the site's cell
// centre, given only for Share's "include my location" tick: the link then carries `o=` and a country
// from the location (owner answer 5); the address bar and the save never pass it.
export function currentFragment(of: Consortium | null = null, { origin = null }: { origin?: LinkOrigin | null } = {}): string | null {
  const now = of ?? own(true);
  if (!now) return null;
  const known: Partial<Record<ClimateZone, PlantId[]>> = {};
  for (const z of new Set<ClimateZone>([now.climate, ...Object.values(now.guests).filter((x): x is ClimateZone => !!x)])) {
    const p = store.pools.peek()[z];
    if (p) known[z] = p.map((t) => t.id);
  }
  return encodeLink(shareState(now, { location: origin !== null }), known, { origin });
}

// The save as this page last wrote it, or read it when it opened (openedWith).
let lastSave: string | null = null;
export const openedWith = (raw: string | null): void => { lastSave = raw; };
// What the save held just before this page's first write over it, or the newer save another tab
// wrote there since (undefined: nothing to put back). Undo back to a Start with no consortium of the
// page's own puts it back (R2-3, R4-1).
let beneath: string | null | undefined;
const sameSave = (a: string | null, b: string | null): boolean => {
  const x = readRecord(a), y = readRecord(b);
  return x && y ? x.fragment === y.fragment && x.src === y.src : a === b;
};
// next: this page's consortium as a record; null: the save removed (Start over, an older save);
// 'back': the page has no consortium of its own any more, so the save goes back to `beneath`.
// The rule: a remove or a put-back happens only while the save is still what this page last wrote
// or read, so another tab's save, or an earlier visit's, is never lost (R2-2, R4-1, R4-2); the
// page's own consortium is written whenever it changes (the reader acted here).
export function writeSave(next: string | null | 'back'): void {
  const now = memory.read(STORE);
  if (next === 'back' || next === null) {
    const to = next === 'back' ? beneath : null;
    beneath = undefined;
    if (to === undefined || now !== lastSave) return;
    if (to === null ? memory.remove(STORE) : memory.write(STORE, to)) lastSave = to;
    return;
  }
  if (sameSave(next, lastSave)) return;
  if (beneath === undefined || now !== lastSave) beneath = now;
  if (memory.write(STORE, next)) lastSave = next;
}

// The address bar holds the consortium's link (replaceState, no history entry). Same address:
// nothing written (browsers drop replaceState calls past a rate limit).
export function writeAddress(force = false): void {
  if (typeof location === 'undefined') return;
  const mine = own();
  const fragment = mine ? currentFragment(mine) : force ? currentFragment() : null;
  const next = fragment ? shareUrl(location.href, fragment) : `${location.origin}${location.pathname}${location.search}`;
  // history.state marks the address as the page's own, so a reload opens it as the save (review 1).
  const state = fragment ? { ct: fragment, src: countryFrom(mine?.country) } : null;
  if (next !== location.href || JSON.stringify(attempt(() => history.state)) !== JSON.stringify(state)) attempt(() => history.replaceState(state, '', next));
}

// The save and the address bar follow the consortium; with none of the page's own, the save goes back.
function persist(): void {
  if (store.view.peek() !== 'start' && !store.pool.peek()) return;
  // A link or the save still opening, with no consortium of the page's own yet: the address keeps the
  // link (a reload in that second opens it again; the restore writes the address when it applies).
  if (inFlight.peek() && !own()) return;
  writeAddress();
  const mine = own();
  writeSave(mine ? saveRecord(currentFragment(mine) ?? '', new Date().toISOString(), countryFrom(mine.country), mine.country.code) : 'back');
}

// The shown consortium's link, recomputed on every change of what the link holds (Share's field).
export const shownFragment = computed(() => {
  void [schema.track(schema.lists.reader), store.pools.value];
  return currentFragment();
});

let watching = false;
// The save and the address bar follow every change of the consortium (persist: nothing on a fresh
// Start, where the last consortium stays until another replaces it), and any write to the consortium that
// is not a restore applying counts as the reader acting. Set up once (startMemory; the unit tests).
// (It reads the signals themselves, not shownFragment: the view is not in the link, so a computed
// fragment would not change when the result first shows.)
export function watchStore(): void {
  if (watching) return;
  watching = true;
  let first = true;
  effect(() => {
    void schema.track(schema.lists.reader);
    if (first) { first = false; return; }
    if (quiet) return;
    actions++;
    // The reader acted during a first-visit restore (any Start write: a country, a site answer, a
    // crop, Suggest): the restore will not apply, and the link's climate Start showed stays, now
    // chosen, so what Start shows never vanishes without the reader choosing.
    untracked(() => {
      const shown = inFlight.peek()?.climate;
      inFlight.value = null;
      if (shown && !store.climate.peek()) store.climate.value = shown;
    });
  });
  effect(() => {
    void [schema.track(schema.lists.save), store.pools.value];
    untracked(persist);
  });
}

