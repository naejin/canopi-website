// What the consortium tool keeps on this device and in the address bar (stream S4; E6 S2 split it
// out of memory.ts; owner row "Memory", 2026-10-27: the shared site climate plus the last consortium
// on this device; sharing is a link that restores the exact state, with no list of saved designs).
//
// - The share link: link v5 in the address's fragment (core state.ts encodeLink / decodeLink), so it
//   never reaches a server log. The address bar holds its public form only (no k o l w q r h s,
//   plant-palette-architecture 8.3): the page keeps it on the palette shown, so a reload restores it,
//   and rewrites it after a link with plants no longer in the list (§5).
// - The last consortium: localStorage STORE, { fragment, place, at, src, country? }, written on each
//   change: fragment the public v5 form (room `m` and plot `z` live there), place the private place
//   answers `l w q r h s` (no k, no o), src whether its country came from a shared link, so it keeps
//   that label; a visit with no link opens it. A guide preset (?plant=&climate=, A5) wins over it. An
//   older save (v1's { q, at, src }, or a v1–v4 fragment: core linkVersionStatus 'older') gives the
//   "older version" notice once and is removed; a newer or unreadable one is left untouched.
// - PLACE_STORE (canopi-place): the reader's last place answers `m z l w q r h s`, written on every
//   place change the reader makes, read only to seed a palette that starts with no place of its own
//   (arrival.ts startMemory).
// - The page's own address: replaceState writes history.state { ct: fragment, src, pl: place }, so a
//   reload of the page's own link opens as the save (its country label and this tab's place kept),
//   not as a link someone shared (v1 bca954c). A link pasted into the open tab (hashchange) is opened
//   (arrival.ts). While a link's place waits on the reader (ask: 1, with the link's cell `o` in pl) or
//   the save is held for a link the reader has not acted on (hold: 1), a reload or Back/Forward keeps
//   it so (plant-palette-architecture 8.3: arriving by a link writes nothing until the reader acts).
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
import type { ClimateZone, LinkOrigin, PlantId, ShareState, SoilAnswer, Spot } from '../../../lib/consortium/index.ts';
import { encodeLink, encodePlace, linkVersionStatus } from '../../../lib/consortium/index.ts';
import type { Country, CountrySource } from '../store.ts';
import * as store from '../store.ts';
import { state as schema } from './schema.ts';
import type { Consortium, ShareInput } from './schema.ts';

export const STORE = 'canopi-consortium';
export const COUNTRY_STORE = 'canopi-country';
export const SITE_CLIMATE = 'canopi-climate';
export const LOCATION_STORE = 'canopi-location';
export const PLACE_STORE = 'canopi-place';
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
// the site location (P5 owner answer 5); null: none). country: a location's or a link's country, kept
// beside the fragment, never in it (the fragment is public: `k` goes only in a link with "Include my
// place"). place: the private place answers (core encodePlace without k and o; '' for none).
export interface SavedRecord { fragment: string; place: string; at: string; src: CountryFrom; country?: string }
const BESIDE: readonly CountryFrom[] = ['location', 'link'];
export const saveRecord = (fragment: string, at: string, src: CountryFrom, country: string | null = null, place = ''): string =>
  JSON.stringify(BESIDE.includes(src) && country ? { fragment, place, at, src, country } : { fragment, place, at, src });
const versionOf = (fragment: string): string | null => new URLSearchParams(fragment).get('v');
const parsed = (text: string | null): Record<string, unknown> | null => {
  if (!text) return null;
  const v = attempt(() => JSON.parse(text) as unknown);
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
};
// A record read back, or null when it is not one: an older format, a fragment that is not of the
// current link version (older, newer, unreadable, or no `v` at all: core linkVersionStatus), damaged
// JSON. A record without `place` reads with every place answer unsure ('').
export function readRecord(text: string | null): SavedRecord | null {
  const v = parsed(text);
  if (!v) return null;
  const { fragment, place, at, src, country } = v;
  if (typeof fragment !== 'string' || !fragment.length || fragment.length >= 20_000 || typeof at !== 'string') return null;
  if (linkVersionStatus(versionOf(fragment)) !== 'current') return null;
  const from = fromOf(src);
  const pl = typeof place === 'string' && place.length < 2_000 ? place : '';
  return BESIDE.includes(from) && typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? { fragment, place: pl, at, src: from, country } : { fragment, place: pl, at, src: from };
}
// A save from an older version of the tool, said once and removed: v1's { q, at, src }, or a record
// whose fragment is v1–v4 (owner 2026-11-14). A newer or unreadable one is not older: left untouched.
export function oldRecord(text: string | null): boolean {
  const v = parsed(text);
  if (!v) return false;
  if (typeof v.q === 'string') return true;
  if (typeof v.fragment !== 'string') return false;
  return linkVersionStatus(versionOf(v.fragment)) === 'older';
}

// ---- the share state ----

// The state a link or the save holds, each field as state/schema.ts puts it. place: the reader's
// "Include my place" tick: the country (never a guess), the spot and the soil go in only with it.
export function shareState(s: ShareInput, { place = false }: { place?: boolean } = {}): ShareState {
  return schema.share(s, { place }) as unknown as ShareState;
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
// climateChosen: its zone when not a proposal (the reader's choice, else the link's), null otherwise.
export const climateChosen = computed(() => store.climate.value ?? pendingClimate.value);
export const climateShown = computed((): { zone: ClimateZone | null; proposed: boolean } => {
  const chosen = climateChosen.value;
  return chosen ? { zone: chosen, proposed: false } : { zone: store.proposedClimate.value, proposed: store.proposedClimate.value !== null };
});

// The reader acts on Start while a link loads: the climate the link shows becomes the chosen one
// (that write is the reader acting, so the restore in flight will not apply).
export function adoptPending(): void {
  const shown = pendingClimate.peek();
  if (shown) store.climate.value = shown;
}

// ---- the consortium and the save ----
// Two states: the consortium, and Start's draft (the picked card and its answers) while Start shows.
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

// The ids a palette's links are matched against: its climate's and each guest list's.
function knownOf(now: Consortium): Partial<Record<ClimateZone, PlantId[]>> {
  const known: Partial<Record<ClimateZone, PlantId[]>> = {};
  for (const z of new Set<ClimateZone>([now.climate, ...Object.values(now.guests).filter((x): x is ClimateZone => !!x)])) {
    const p = store.pools.peek()[z];
    if (p) known[z] = p.map((t) => t.id);
  }
  return known;
}
// The current state as a fragment, against the climate's and the guest lists' ids.
// of: a consortium set aside (Start's draft shows), in place of the store's. origin: the site's cell
// centre, given only with Share's tick: the link then carries `o=`. place: the "Include my place" tick
// (by default, whether an origin is given: Share's tick until b1a words it), which adds the country,
// the spot and the soil; the address bar and the save's fragment never pass it.
export function currentFragment(of: Consortium | null = null, { origin = null, place = origin !== null }: { origin?: LinkOrigin | null; place?: boolean } = {}): string | null {
  const now = of ?? own(true);
  if (!now) return null;
  return encodeLink(shareState(now, { place }), knownOf(now), { origin, place });
}
// A palette's private place answers, as the save's `place` and history.state.pl keep them: the spot
// and the soil, without the country and the cell (core encodePlace).
export function currentPlace(of: Consortium | null = null): string {
  const now = of ?? own(true);
  if (!now) return '';
  return encodePlace({ ...shareState(now, { place: true }), country: null });
}
// history.state.pl: the tab's place, with a link's country (`k`) too, so a reload of a link's page keeps
// the country "from the shared link" (the address holds none of `k o l w q r h s`; the reader's own
// country is kept on the device, COUNTRY_STORE, and in the save record's `country`).
// While a link's place waits on the reader, its cell (`o`) too, so "Use it" after a reload still has it
// (per tab, never in the save).
function addressPlace(of: Consortium | null): string {
  const now = of ?? own(true);
  if (!now) return '';
  const at = store.location.peek();
  const o = linkPlace.peek() && at?.source === 'link' ? { lat: at.lat, lon: at.lon } : null;
  return encodePlace({ ...shareState(now, { place: true }), country: now.country.source === 'link' ? now.country.code : null }, o);
}
// The canopi-place seed: room, plot size, spot and soil (`m z l w q r h s`), without the country.
// answers: the spot and soil to seed in place of the store's (the reader's own while a link's place waits).
export function placeSeed(answers: { spot: Spot; soil: SoilAnswer } | null = null): string {
  const s = schema.peek(['room', 'plot', 'spot', 'soil']);
  const { spot, soil } = answers ?? s;
  const pairs = [`m=${s.room}`, ...(s.plot !== null ? [`z=${s.plot}`] : []), encodePlace({ country: null, spot, soil })].filter(Boolean);
  return pairs.join('&');
}

// ---- a link that brings a place, and the save held until the reader acts (plant-palette-architecture 8.3) ----

// A link that brings a place applies it to this page only, with the notice "Use it" / "Use my own
// place" (restore.ts sets it; draft.ts useLinkPlace / useOwnPlace end it). own: the reader's place,
// country and site cell (location: their own, never a link's) just before the link applied; the save
// keeps them until the reader chooses.
export interface OwnPlace { spot: Spot; soil: SoilAnswer; country: Country; location: LinkOrigin | null }
export const linkPlace = signal<{ own: OwnPlace } | null>(null);
// The reader's readable save when the page opened on something else (a guide preset, a newer or
// unreadable link): "Open my saved palette instead" / "Back to mine" (draft.ts openSavedInstead)
// restores it. null once used, once the reader works on the page shown (watchStore), or when there is
// none. Kept here, below restore.ts, so the watcher can end it.
export const savedInstead = signal<SavedRecord | null>(null);
// Arriving by a link writes no save until the reader acts (8.3): restore.ts holds it when a link
// applies (and for a reload or Back/Forward of that page: history.state hold); the reader's next
// action (watchStore) or a restore of the save lets it go.
let held = false;
export const holdSave = (on: boolean): void => { held = on; };

// The save as this page last wrote it, or read it when it opened (openedWith).
let lastSave: string | null = null;
export const openedWith = (raw: string | null): void => { lastSave = raw; };
// What the save held just before this page's first write over it, or the newer save another tab
// wrote there since (undefined: nothing to put back). Undo back to a Start with no consortium of the
// page's own puts it back (R2-3, R4-1).
let beneath: string | null | undefined;
const sameSave = (a: string | null, b: string | null): boolean => {
  const x = readRecord(a), y = readRecord(b);
  return x && y ? x.fragment === y.fragment && x.place === y.place && x.src === y.src : a === b;
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
  // history.state marks the address as the page's own, so a reload opens it as the save (review 1),
  // with this tab's place (pl: the save is shared by every tab; plant-palette-architecture 8.3).
  // ask: a link's place waits on the reader; hold: the save is held for a link they have not acted on.
  const state = fragment ? { ct: fragment, src: countryFrom(mine?.country), pl: addressPlace(mine), ...(linkPlace.peek() ? { ask: 1 } : held ? { hold: 1 } : {}) } : null;
  if (next !== location.href || JSON.stringify(attempt(() => history.state)) !== JSON.stringify(state)) attempt(() => history.replaceState(state, '', next));
}

// The save and the address bar follow the consortium; with none of the page's own, the save goes back.
// While a link's place waits on the reader's choice, the save keeps the reader's own place and country.
function persist(): void {
  if (store.view.peek() !== 'start' && !store.pool.peek()) return;
  // A link or the save still opening, with no consortium of the page's own yet: the address keeps the
  // link (a reload in that second opens it again; the restore writes the address when it applies).
  if (inFlight.peek() && !own()) return;
  writeAddress();
  if (held) return;
  const mine = own();
  if (!mine) { writeSave('back'); return; }
  const pending = linkPlace.peek()?.own;
  const kept = pending ? { ...mine, spot: pending.spot, soil: pending.soil, country: pending.country } : mine;
  writeSave(saveRecord(currentFragment(mine) ?? '', new Date().toISOString(), countryFrom(kept.country), kept.country.code, currentPlace(kept)));
}
// A reader's choice made outside the store's fields (a notice's button): the save is no longer held.
export function release(): void {
  held = false;
  persist();
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
    held = false;
    savedInstead.value = null;
    // The reader acted during a first-visit restore (any Start write: a country, a site answer, a
    // crop, Suggest): the restore will not apply, and the link's climate Start showed stays, now
    // chosen, so what Start shows never vanishes without the reader choosing.
    untracked(() => {
      const shown = inFlight.peek()?.climate;
      inFlight.value = null;
      if (shown && !store.climate.peek()) store.climate.value = shown;
    });
  });
  // A change the reader made (not quiet) lets a held save go, here as well as in the watcher above,
  // since the two effects run in no set order for one write.
  let firstSave = true;
  effect(() => {
    void schema.track(schema.lists.save);
    if (!firstSave && !quiet) held = false;
    firstSave = false;
    untracked(persist);
  });
  effect(() => {
    void store.pools.value;
    void linkPlace.value;
    untracked(persist);
  });
  // canopi-place follows the place the reader gives (a restore applying a link's or a save's place is
  // not the reader: it seeds nothing). While a link's place waits on the reader's choice, a room or
  // plot change seeds the reader's own spot and soil with it, never the link's (8.3: the link's place
  // is for this page only); a spot or soil answer the reader gives makes the place shown theirs.
  // (Below: that answer ends the notice, and the save takes that place.)
  let firstPlace = true, lastAnswers = '';
  effect(() => {
    const now = schema.track(['room', 'plot', 'spot', 'soil']);
    const answers = JSON.stringify([now.spot, now.soil]), answered = answers !== lastAnswers;
    lastAnswers = answers;
    if (firstPlace) { firstPlace = false; return; }
    if (quiet) return;
    untracked(() => { const waiting = linkPlace.peek(); memory.write(PLACE_STORE, placeSeed(waiting && !answered ? waiting.own : null)); });
  });
  let firstSpot = true;
  effect(() => {
    void schema.track(['spot', 'soil']);
    if (firstSpot) { firstSpot = false; return; }
    if (!quiet && untracked(() => linkPlace.peek())) linkPlace.value = null;
  });
}

