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
//   that label; a visit with no link opens it. A guide preset (?plant=&climate=, A5) wins over it. A
//   save readRecord cannot read (the old beta tool's, a newer or unreadable one) opens nothing and is
//   left untouched; the next change overwrites it (owner 2026-11-17: no backward compatibility work).
// - PLACE_STORE (canopi-place): the reader's last place answers `m z l w q r h s`, written on every
//   place change the reader makes, read only to seed a palette that starts with no place of its own
//   (arrival.ts startMemory).
// - The page's own address: replaceState writes history.state { ct: fragment, src, pl: place }, so a
//   reload of the page's own link opens as the save (its country label and this tab's place kept),
//   not as a link someone shared (v1 bca954c). A link pasted into the open tab (hashchange) is opened
//   (arrival.ts). Two flags, each written from its own source and read only as itself (fix round 4,
//   s-3): ask: 1 while a link's place waits on the reader (linkPlace, with the link's cell `o` in pl),
//   so a reload asks again; hold: 1 while the page holds the save (state/save.ts held), so a reload or
//   Back/Forward holds it again (plant-palette-architecture 8.3: arriving by a link writes nothing
//   until the reader acts). A plant added while the place question is open writes ask without hold.
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
// When the save is written: state/save.ts `held` (this page's palette is not the save); not held,
// every change of the palette is written; held, the save is left as it is.
//
// Also here, below restore.ts and the location step so that neither imports the other: the restore
// in flight (what Start shows while a link opens) and the count of the reader's actions, which the
// store watcher (watchStore) keeps.
import { computed, effect, signal, untracked } from '@preact/signals';
import type { ClimateZone, LinkOrigin, PlantId, ShareState, SiteEdits } from '../../../lib/consortium/index.ts';
import { encodeLink, encodePlace, linkVersionStatus } from '../../../lib/consortium/index.ts';
import type { Country, CountrySource } from '../store.ts';
import * as store from '../store.ts';
import { state as schema } from './schema.ts';
import type { Consortium, ShareInput } from './schema.ts';
import { attempt, forgets, held, lastSave, memory, SAVE_FRAGMENT_MAX, STORE } from './save.ts';

export { attempt, guarded, memory, STORE, type StorageLike } from './save.ts';
export const COUNTRY_STORE = 'canopi-country';
export const SITE_CLIMATE = 'canopi-climate';
export const LOCATION_STORE = 'canopi-location';
export const PLACE_STORE = 'canopi-place';
export const NO_COUNTRY = '-';

// ---- storage ----

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
// A record read back, or null when it is not one: the old beta format, a fragment that is not of the
// current link version (newer, unreadable, or no `v` at all: core linkVersionStatus), damaged
// JSON. A record without `place` reads with every place answer unsure ('').
export function readRecord(text: string | null): SavedRecord | null {
  const v = parsed(text);
  if (!v) return null;
  const { fragment, place, at, src, country } = v;
  if (typeof fragment !== 'string' || !fragment.length || fragment.length >= SAVE_FRAGMENT_MAX || typeof at !== 'string') return null;
  if (linkVersionStatus(versionOf(fragment)) !== 'current') return null;
  const from = fromOf(src);
  const pl = typeof place === 'string' && place.length < 2_000 ? place : '';
  return BESIDE.includes(from) && typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? { fragment, place: pl, at, src: from, country } : { fragment, place: pl, at, src: from };
}

// ---- the share state ----

// The state a link or the save holds, each field as state/schema.ts puts it. place: the reader's
// "Include my place" tick: the country (never a guess) and the grower's own values go in only with it.
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
// The climate Place shows: the reader's choice, else a link's still opening.
export const climateChosen = computed(() => store.climate.value ?? pendingClimate.value);

// The reader acts on Start while a link loads: the climate the link shows becomes the chosen one
// (that write is the reader acting, so the restore in flight will not apply).
export function adoptPending(): void {
  const shown = pendingClimate.peek();
  if (shown) store.climate.value = shown;
}

// ---- the palette and the save ----
// The save always encodes the palette as the page shows it (Place's answers and plants included: owner
// 2026-11-15), written on every change while the page owns it (state/save.ts held); Undo restores
// the palette and the flag, so it rewrites the save too.

// The page's palette (null: no climate yet). A guest the chosen climate's list holds, once read, is
// left out: it is one of the list's own (a card clicked before its list was read marks each member
// of the list it left a guest; r3-3).
export function palette(): Consortium | null {
  const climate = store.climate.peek();
  if (!climate) return null;
  const now = schema.peek(schema.lists.saved) as Consortium;
  const list = store.pools.peek()[climate];
  const own = list && Object.keys(now.guests).filter((id) => list.some((t) => t.id === id));
  if (!own?.length) return now;
  const guests = { ...now.guests };
  for (const id of own) delete guests[id];
  return { ...now, guests };
}
// Whether the page shows a palette of its own the address keeps: a climate, and the save owned, the
// palette page shown or any plant on Place.
export function shows(): boolean {
  if (!store.climate.peek()) return false;
  const p = schema.peek(schema.lists.plants);
  return !held.peek() || store.view.peek() !== 'start' || p.members.length > 0 || p.removed.length > 0 || Object.keys(p.guests).length > 0;
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
// The palette as a fragment, against the climate's and the guest lists' ids. origin: the site's cell
// centre, given only with Share's tick: the link then carries `o=`. place: the "Include my place" tick
// (by default, whether an origin is given: Share's tick until b1a words it), which adds the country,
// the place name (name, written beside `o`: D6)
// and the grower's own values; the address bar and the save's fragment never pass it.
export function currentFragment({ origin = null, place = origin !== null, name = null }: { origin?: LinkOrigin | null; place?: boolean; name?: string | null } = {}): string | null {
  const now = palette();
  if (!now) return null;
  return encodeLink(shareState(now, { place }), knownOf(now), { origin, place, name });
}
// Beside the place answers, never in a link: whether the palette is the last suggestion untouched
// (store.untouchedSuggestion, v14 A19), so a reload keeps not nagging it (restore.ts reads it back).
export const SUGGESTED_KEY = 'sg';
const suggestedPart = (): string => (store.untouchedSuggestion.peek() ? `${SUGGESTED_KEY}=1` : '');
const joined = (...parts: string[]): string => parts.filter(Boolean).join('&');
// A palette's private place answers, as the save's `place` and history.state.pl keep them: the
// grower's own values, without the country and the cell (core encodePlace), then the
// untouched-suggestion mark.
export function currentPlace(of: Consortium | null = null): string {
  const now = of ?? palette();
  if (!now) return '';
  return joined(encodePlace({ ...shareState(now, { place: true }), country: null }), suggestedPart());
}
// history.state.pl: the tab's place, with a link's country (`k`) too, so a reload of a link's page keeps
// the country "from the shared link" (the address holds none of `k o f b p i d`; the reader's own
// country is kept on the device, COUNTRY_STORE, and in the save record's `country`).
// While a link's place waits on the reader, its cell (`o`) too, so "Use it" after a reload still has it
// (per tab, never in the save).
function addressPlace(): string {
  const now = palette();
  if (!now) return '';
  const at = store.location.peek();
  const o = linkPlace.peek() && at?.source === 'link' ? { lat: at.lat, lon: at.lon } : null;
  return joined(encodePlace({ ...shareState(now, { place: true }), country: now.country.source === 'link' ? now.country.code : null }, o), suggestedPart());
}
// The canopi-place seed: room and plot size (`m z`), without the country.
export function placeSeed(): string {
  const s = schema.peek(['room', 'plot']);
  return [`m=${s.room}`, ...(s.plot !== null ? [`z=${s.plot}`] : [])].join('&');
}

// ---- a link that brings a place, and the save held until the reader acts (plant-palette-architecture 8.3) ----

// A link that brings a place applies it to this page only, with the notice "Use it" / "Use my own
// place" (restore.ts sets it; draft.ts useLinkPlace / useOwnPlace end it). own: the reader's place,
// country and site cell (location: their own, never a link's) just before the link applied; the save
// keeps them until the reader chooses.
export interface OwnPlace { siteEdits: SiteEdits; country: Country; location: LinkOrigin | null }
export const linkPlace = signal<{ own: OwnPlace } | null>(null);
// What the last answer to an arrival notice did, for Place's status line (draft.ts answered: the
// notice's button leaves the page with its line, so the focus moves on and this says what happened:
// A25). '' for nothing. Kept here, below restore.ts, so the reader's next action (watchStore) and the
// next arrival (restore.ts restore) clear it (review round 2, 4).
export const placeSaid = signal('');
// Arriving by a link or a guide preset, the page holds the save (restore.ts, and for a reload or
// Back/Forward of that page: history.state hold); a restore of the save, or a plant change, lets it go.
export const holdSave = (on: boolean): void => { held.value = on; };

// The palette written as the save, unless it is the save already (the same fragment, place and
// country source: its time alone never rewrites it).
const sameSave = (a: string | null, b: string | null): boolean => {
  const x = readRecord(a), y = readRecord(b);
  return x && y ? x.fragment === y.fragment && x.place === y.place && x.src === y.src : a === b;
};
function writeSave(next: string): void {
  if (sameSave(next, lastSave.peek())) return;
  if (memory.write(STORE, next)) lastSave.value = next;
}

// "Forget this location" (location.ts forget; privacy.tool.device): the stored record keeps none of the
// grower's own values and no country from the location, held page or not (pre-push fix 3: a held page
// writes nothing, so its save kept them and "Open my saved palette instead" or a plain visit brought
// them back). A link's own country (src 'link'), the plants, the room and the plot (the fragment) stay.
// own: the reader's own location was forgotten (a link's location goes alone, so the country the
// reader's kept location gave stays with that location).
// The scrubbed record becomes this page's lastSave only when what it scrubbed was this page's: another
// tab's save, scrubbed, stays another tab's, so storageMoved and putSave keep protecting it (second-round
// review 1).
export function forgetSavedPlace(own: boolean): void {
  const raw = memory.read(STORE);
  const r = readRecord(raw);
  if (!r) return;
  const fromLocation = own && r.src === 'location';
  if (!r.place && !fromLocation) return;
  const next = saveRecord(r.fragment, r.at, fromLocation ? null : r.src, fromLocation ? null : r.country ?? null, '');
  const mine = raw === lastSave.peek();
  if (memory.write(STORE, next) && mine) lastSave.value = next;
}

// The address bar holds the consortium's link (replaceState, no history entry). Same address:
// nothing written (browsers drop replaceState calls past a rate limit).
// The fragment this page last wrote into the address bar ('' for none): a hashchange onto it is the
// page's own (a Back landing on an entry main.ts just rewrote), never a link to open.
let written = '';
export const lastWritten = (): string => written;
export function writeAddress(force = false): void {
  if (typeof location === 'undefined') return;
  const fragment = shows() || force ? currentFragment() : null;
  const next = fragment ? shareUrl(location.href, fragment) : `${location.origin}${location.pathname}${location.search}`;
  // history.state marks the address as the page's own, so a reload opens it as the save (review 1),
  // with this tab's place (pl: the save is shared by every tab; plant-palette-architecture 8.3).
  // ask: a link's place waits on the reader (linkPlace); hold: the page holds the save (held). Each
  // from its own source, so a page that owns its save while the place question is open reloads owned.
  // fg: the Forgets this tab had seen when the entry was written; an entry from before the last one
  // brings no answers back (arrival.ts ownOf; second-round review 2).
  const fg = forgets();
  const ownState = fragment ? { ct: fragment, src: countryFrom(), pl: addressPlace(), ...(linkPlace.peek() ? { ask: 1 } : {}), ...(held.peek() ? { hold: 1 } : {}), ...(fg ? { fg } : {}) } : null;
  // `pp`: the page's history entries up to this one (store.ts), kept through every rewrite and reload;
  // `st`: the entry's start (store.ts startId), so a move off a link opened in the tab is known.
  const pp = attempt(() => (history.state as { pp?: unknown } | null)?.pp), st = store.startId();
  const state = pp || st ? { ...(ownState ?? {}), ...(pp ? { pp } : {}), ...(st ? { st } : {}) } : ownState;
  written = fragment ?? '';
  if (next !== location.href || JSON.stringify(attempt(() => history.state)) !== JSON.stringify(state)) attempt(() => history.replaceState(state, '', next));
}

// The address bar follows the palette, and the save too while the page owns it. While a link's place
// waits on the reader's choice, the save keeps the reader's own place and country.
function persist(): void {
  if (store.view.peek() !== 'start' && !store.pool.peek()) return;
  // A link or the save still opening, with no palette of the page's own yet: the address keeps the
  // link (a reload in that second opens it again; the restore writes the address when it applies).
  if (inFlight.peek() && !shows()) return;
  writeAddress();
  const now = held.peek() ? null : palette();
  if (!now) return;
  const pending = linkPlace.peek()?.own;
  const kept = pending ? { ...now, country: pending.country, siteEdits: pending.siteEdits } : now;
  writeSave(saveRecord(currentFragment() ?? '', new Date().toISOString(), countryFrom(kept.country), kept.country.code, currentPlace(kept)));
}

// The shown consortium's link, recomputed on every change of what the link holds (Share's field).
export const shownFragment = computed(() => {
  void [schema.track(schema.lists.reader), store.pools.value];
  return currentFragment();
});
// "Open my saved palette instead" / "Back to mine" (draft.ts openSavedInstead): the reader's readable
// save, offered on every held page whose palette is not it (owner 2026-11-15, decision 3). Derived, so
// a plant change that replaces the save hides it and its Undo brings it back. Read from storage, not
// from what this page last wrote, so it names another tab's save too (fix round 4, s-5): read again on
// each write of this page (lastSave), and on the `storage` event (another tab's write; watchStore).
const storageTick = signal(0);
export const savedInstead = computed((): SavedRecord | null => {
  void [lastSave.value, storageTick.value];
  const r = held.value ? readRecord(memory.read(STORE)) : null;
  return r && r.fragment !== shownFragment.value ? r : null;
});

let watching = false;
// The save and the address bar follow every change of the palette, and any write to it that is not a
// restore applying counts as the reader acting. Set up once (startMemory; the unit tests).
// (It reads the signals themselves, not shownFragment: the view is not in the link, so a computed
// fragment would not change when the result first shows.)
export function watchStore(): void {
  if (watching) return;
  watching = true;
  attempt(() => globalThis.addEventListener?.('storage', (e: StorageEvent) => { if (e.key === STORE || e.key === null) storageTick.value++; }));
  let first = true;
  effect(() => {
    void schema.track(schema.lists.reader);
    if (!first && !quiet) {
      actions++;
      // What an earlier notice's answer did is said no more (a later answer sets it again after this).
      placeSaid.value = '';
      // The reader acted during a first-visit restore (any Start write: a country, a site answer, a
      // crop, Suggest): the restore will not apply, and the link's climate Start showed stays, now
      // chosen, so what Start shows never vanishes without the reader choosing.
      untracked(() => {
        const shown = inFlight.peek()?.climate;
        inFlight.value = null;
        if (shown && !store.climate.peek()) store.climate.value = shown;
      });
    }
    first = false;
    untracked(persist);
  });
  effect(() => {
    void store.pools.value;
    void linkPlace.value;
    void held.value;
    untracked(persist);
  });
  // canopi-place follows the room and plot the reader gives (a restore applying a link's or a save's
  // place is not the reader: it seeds nothing).
  let firstPlace = true;
  effect(() => {
    void schema.track(['room', 'plot']);
    if (firstPlace) { firstPlace = false; return; }
    if (quiet) return;
    untracked(() => memory.write(PLACE_STORE, placeSeed()));
  });
}

