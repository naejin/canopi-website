// What the consortium tool keeps on this device and in the address bar (Wave 7.1):
// - The share link: link v5 in the address's fragment (core state.ts encodeLink / decodeLink), so it
//   never reaches a server log. The address bar holds its public form only (no k o l w q r h s).
// - The page's own address: replaceState writes history.state { ct: fragment, src, pl: place }, so a
//   same-tab reload restores the tab's palette and place.
// - Non-palette device preferences in localStorage: COUNTRY_STORE (canopi-country), SITE_CLIMATE
//   (canopi-climate), and LOCATION_STORE (canopi-location). Palettes are never auto-saved to
//   localStorage; users save .canopi files explicitly.
import { batch, computed, effect, signal, untracked } from '@preact/signals';
import type { ClimateZone, LinkOrigin, PlantId, ShareState, SiteEdits, SiteLocation } from '../../../lib/palette/index.ts';
import { encodeLink, encodePlace, NO_EDITS } from '../../../lib/palette/index.ts';
import type { Country, CountrySource } from '../store.ts';
import * as store from '../store.ts';
import { state as schema } from './schema.ts';
import type { Consortium, ShareInput } from './schema.ts';
import { attempt, forgets } from './save.ts';

export { attempt, guarded, memory, type StorageLike } from './save.ts';
export const COUNTRY_STORE = 'canopi-country';
export const SITE_CLIMATE = 'canopi-climate';
export const LOCATION_STORE = 'canopi-location';
export const NO_COUNTRY = '-';

// ---- where the country came from ----

// One country-source enum: store.ts CountrySource (where the reader's country came from).
// history.state keeps it without 'guess' (a guess is never written): CountryFrom, null for none.
export type CountryFrom = Exclude<CountrySource, 'guess'> | null;
const KEPT_SOURCES: readonly CountrySource[] = ['link', 'chosen', 'location'];
export const fromOf = (v: unknown): CountryFrom => (KEPT_SOURCES.includes(v as CountrySource) ? (v as Exclude<CountrySource, 'guess'>) : null);
const countryFrom = (c: Country = store.country.peek()): CountryFrom =>
  (!c.code || c.source === 'guess' ? null : fromOf(c.source) ?? 'chosen');

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
// Whether the page shows a palette of its own the address keeps: a climate, and either the palette
// page shown or any plant on Place.
export function shows(): boolean {
  if (!store.climate.peek()) return false;
  const p = schema.peek(schema.lists.plants);
  return store.view.peek() !== 'start' || p.members.length > 0 || p.removed.length > 0 || Object.keys(p.guests).length > 0;
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
// The place name a share link may carry beside the cell (`n`, D6): the site's label only when it names
// a town or a wider area (SiteLocation placeLevel: a search answer or a reverse lookup of a town-level
// kind, or a link's own `n`), never a road, a building or a farm's name (h2 R4: the link holds no
// more than the cell says).
export const linkName = (l: SiteLocation | null): string | null => (l?.placeLevel && l.label ? l.label : null);
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
// ---- a link that brings a place ----

// A link that brings a place applies it to this page only, with the notice "Use it" / "Use my own
// place" (restore.ts sets it; draft.ts useLinkPlace / useOwnPlace end it). own: the reader's place,
// country and site cell (location: their own, never a link's) just before the link applied.
export interface OwnPlace { siteEdits: SiteEdits; country: Country; location: LinkOrigin | null }
export const linkPlace = signal<{ own: OwnPlace } | null>(null);
export function changeOwnPlace(patch: Partial<OwnPlace>): void {
  const w = linkPlace.peek();
  if (w) linkPlace.value = { own: { ...w.own, ...patch } };
}
export function placeAt(loc: SiteLocation): void {
  batch(() => {
    store.placeAt(loc);
    if (store.editsCleared.peek()) changeOwnPlace({ siteEdits: NO_EDITS });
  });
}
export const placeSaid = signal('');

// The address bar holds the consortium's link (replaceState, no history entry). Same address:
// nothing written (browsers drop replaceState calls past a rate limit).
// The fragment this page last wrote into the address bar ('' for none): a hashchange onto it is the
// page's own (a Back landing on an entry main.ts just rewrote), never a link to open.
let written = '';
export const lastWritten = (): string => written;
export function ownAddressState(fragment: string | null = currentFragment()): Record<string, unknown> | null {
  if (!fragment) return null;
  const fg = forgets();
  return { ct: fragment, src: countryFrom(), pl: addressPlace(), ...(linkPlace.peek() ? { ask: 1 } : {}), ...(fg ? { fg } : {}) };
}
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
  const ownState = ownAddressState(fragment);
  // `pp`: the page's history entries up to this one (store.ts), kept through every rewrite and reload;
  // `st`: the entry's start (store.ts startId), so a move off a link opened in the tab is known.
  const pp = attempt(() => (history.state as { pp?: unknown } | null)?.pp), st = store.startId();
  const state = pp || st ? { ...(ownState ?? {}), ...(pp ? { pp } : {}), ...(st ? { st } : {}) } : ownState;
  written = fragment ?? '';
  if (next !== location.href || JSON.stringify(attempt(() => history.state)) !== JSON.stringify(state)) attempt(() => history.replaceState(state, '', next));
}

// The address bar follows the palette (never writes palette state to localStorage; Wave 7.1).
function persist(): void {
  if (store.view.peek() !== 'start' && !store.pool.peek()) return;
  // A link still opening, with no palette of the page's own yet: the address keeps the link.
  if (inFlight.peek() && !shows()) return;
  writeAddress();
}

// The shown consortium's link, recomputed on every change of what the link holds (Share's field).
export const shownFragment = computed(() => {
  void [schema.track(schema.lists.reader), store.pools.value];
  return currentFragment();
});

let watching = false;
// The address bar follows every change of the palette, and any write to it that is not a
// restore applying counts as the reader acting. Set up once (startMemory; the unit tests).
export function watchStore(): void {
  if (watching) return;
  watching = true;
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
    untracked(persist);
  });
}

