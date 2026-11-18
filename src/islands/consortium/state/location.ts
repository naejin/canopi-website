// "Where is your site?": the location step's state and its lookups (P5 stream S5b; design check §B
// and its failure states; owner answers 1, 4, 5; E6 S2 moved it here from views/location/location.tsx
// which now renders and re-exports its three actions). It lives in the lazy location chunk: only
// views/location/location.tsx imports it, and that chunk loads on the reader's first click or Enter
// (views/LocationSlot.tsx) or for a link's `o=` or the saved location (restore.ts). What the first run
// needs of it (the lookups in flight, their line and ownership) is in lookups.ts.
//
// It turns a position into a site (v14 boards Place, LocStates, LocMap, LocDesk; pf-c):
// - Use my location: one read of the device's position (low accuracy), "waiting" while the device
//   answers (asking 'geo', with Stop), denied / timeout / unavailable said in words;
// - the place field: coordinates typed or a pasted map link are read on this device and sent nowhere
//   (the view reads them, views/location/coords.ts readCoords, and hands the result to searchRead: state
//   imports no view; 'bad' says so, and a second Search sends the words as a name);
//   words go to Nominatim on Search only, 1.1 s apart, 5 answers, cached, in the page language, never
//   with an email (src/lib/location): one answer is taken directly, several are offered (choices);
// - pick on a map (the dialog is the view's): its centre is looked up like any position.
// Then the climate reader (src/lib/climate) reads the site's tiles and core site-climate.ts says what it
// means: the climate read is USED AT ONCE (draft.ts chooseClimate; v13: no "Use" button), borderline
// offers both climates, polar chooses none; sea, coast and a failed read each have their own line.
// store.location holds the site; a country from it is "from your location" (locationCountry).
// A link's location is labelled "from the shared link, approximate" and never changes the link's
// climate, answers or country; it lives for the page only: never saved over the reader's own location,
// never a country (review round 1, 1). A lookup's writes are not reader actions (the click was): the
// country goes through persist's quiet write, so a link pasted while tiles load still restores
// (review round 1, 4).
import { batch, signal } from '@preact/signals';
import type { LocationSource, SiteLocation } from '../../../lib/consortium/index.ts';
import { NO_EDITS, siteClimate } from '../../../lib/consortium/index.ts';
import { createTileSource, DEFAULT_RADIUS, lookupSite, siteIndex, type SiteLookup, type TileSource } from '../../../lib/climate/index.ts';
import { createPlaceSearchController, type PlaceSearchController, type PlaceSearchResult } from '../../../lib/location/place-search.ts';
import { defaultGeocoderConfig } from '../../../lib/location/registry.ts';
import { geocodingTransport } from '../../../lib/location/transport.ts';
import { currentPosition, queryGeolocationPermission, PROMPT_CAP_MS, SITE_POSITION_OPTIONS } from '../../../lib/location/geolocation.ts';
import type { Country } from '../store.ts';
import * as store from '../store.ts';
import { pageLang } from '../strings.ts';
import { forgetSavedPlace, memory, pendingLinkClimate, quietly, LOCATION_STORE, PLACE_STORE } from './persist.ts';
import { chooseClimate } from './draft.ts';
import { locationAtStart } from './restore.ts';
import { noteForget } from './save.ts';
import { line, liveLookup, looking, nextLookup, unlessReplaced, unread, type Line } from './lookups.ts';

// ---- the step's own state (pf-c) ----
// What the step is asking, while line is 'loading': the device ('geo', "Waiting for your device…"),
// the place search ('search', "Looking for “q”…"), or nothing (the climate read, "Reading the climate…").
export const asking = signal<'geo' | 'search' | null>(null);
// Several answers to a search: the grower chooses one (board LocStates "3 places answer …").
export interface Choices { query: string; results: readonly PlaceSearchResult[]; attribution: string | null }
export const choices = signal<Choices | null>(null);
// Text that looks like coordinates but could not be read (board: "We could not read “1.17 36” …").
export const badCoords = signal<string | null>(null);
// The site in use came from typed coordinates: "Read on this device. Nothing was sent, so the place has no name."
export const typed = signal(false);
// How long "Use my location" waited before it gave up, in seconds, as the read used it (R10): the
// browser's own timeout once the permission was granted, else the one cap over the prompt and the fix
// (lib/location/geolocation.ts currentPosition).
export const waited = signal(Math.round(PROMPT_CAP_MS / 1000));
// The last ask, for "Try again" (offline search, device timeout, a climate that did not load).
let lastAsk: (() => Promise<void>) | null = null;
export const tryAgain = (): Promise<void> => (lastAsk ? lastAsk() : Promise.resolve());
const clearStep = () => batch(() => { asking.value = null; choices.value = null; badCoords.value = null; });
// Stop: the ask in flight goes (its late answer is dropped), and so does its line.
export function stop(): void {
  nextLookup();
  batch(() => { clearStep(); line.value = null; });
}

// ---- the site location kept on this device, and the country from it ----

export interface SavedLocation { lat: number; lon: number; source: LocationSource; label?: string }
const SOURCES: readonly LocationSource[] = ['geo', 'search', 'map', 'link'];
// A saved location read back, or null when it is not one.
export function readLocation(text: string | null): SavedLocation | null {
  let v: unknown;
  try { v = text ? JSON.parse(text) : null; } catch { return null; }
  if (!v || typeof v !== 'object') return null;
  const { lat, lon, source, label } = v as Record<string, unknown>;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) return null;
  if (!SOURCES.includes(source as LocationSource)) return null;
  const out: SavedLocation = { lat, lon, source: source as LocationSource };
  if (typeof label === 'string' && label && label.length <= 200) out.label = label;
  return out;
}

export const locationRecord = (l: Pick<SiteLocation, 'lat' | 'lon' | 'source' | 'label'>): string =>
  JSON.stringify(l.label ? { lat: l.lat, lon: l.lon, source: l.source, label: l.label } : { lat: l.lat, lon: l.lon, source: l.source });

// The reader's own site location kept on this device (never in a link, never a link's), or removed.
function keepLocation(l: Pick<SiteLocation, 'lat' | 'lon' | 'source' | 'label'> | null): boolean {
  return l ? memory.write(LOCATION_STORE, locationRecord(l)) : memory.remove(LOCATION_STORE);
}

// A lookup's result: its writes (write: the site, its suggestion, its line) in one batch, then the
// country, quiet. Not inside the batch: a batch flushes after quietly() has reset, so the watcher
// would count the country as the reader acting and a restore in flight would not apply (review round 2, 1).
// code undefined: no country from this site (a link's location: its link's country stands).
export function siteFound(write: () => void, code?: string | null): void {
  batch(() => { write(); unread.value = false; });
  if (code !== undefined) locationCountry(code, false);
}

// A country from the site location ("from your location"; null: none there, e.g. offshore). It
// replaces a guess, no country, or an earlier location's; a country the reader chose or a link
// carried stays. reader: the reader's own act (Forget); a lookup's result is quiet, the click having
// been the action, so a restore in flight still applies (review round 1, 4).
export function locationCountry(code: string | null, reader: boolean): void {
  const now = store.country.peek();
  if (now.source === 'chosen' || now.source === 'link') return;
  const next: Country = code ? { code, source: 'location' } : now.source === 'location' ? { code: null, source: null } : now;
  if (next.code === now.code && next.source === now.source) return;
  if (reader) store.country.value = next;
  else quietly(() => { store.country.value = next; });
}

// ---- the climate reader over the installed tiles (#ct-climate, ConsortiumPage.astro) ----
let tiles: TileSource | null = null;
function tileSource(): TileSource {
  tiles ??= createTileSource({ index: siteIndex(JSON.parse(document.getElementById('ct-climate')?.textContent ?? 'null')) });
  return tiles;
}
// A read that has not answered in 15 s fails like any other (review round 2, 3): the reader is told and
// a waiting Suggest is released. (The climate reader takes no AbortSignal; the late answer is dropped.)
const READ_TIMEOUT_MS = 15_000;
async function read(lat: number, lon: number): Promise<SiteLookup | null> {
  let timer = 0;
  // A browser test may shorten it in the test build (window.__ctTimeouts.read; A4, as in
  // data/load.ts); production folds it to READ_TIMEOUT_MS.
  const ms = typeof __CT_TEST_HOOK__ !== 'undefined' && __CT_TEST_HOOK__ ? Number((globalThis as { __ctTimeouts?: { read?: number } }).__ctTimeouts?.read) || READ_TIMEOUT_MS : READ_TIMEOUT_MS;
  try {
    return await Promise.race([
      // No soil tile until something reads it (P5.2's soil likely restores { soil: true }).
      lookupSite(lat, lon, tileSource(), DEFAULT_RADIUS, { soil: false }),
      new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new Error(`no answer in ${ms / 1000} s`)), ms); }),
    ]);
  } catch (err) {
    console.error(`Consortium: the site's climate could not be read: ${(err as Error).message}`);
    return null;
  } finally { clearTimeout(timer); }
}

// A position the reader gave (device, search, map): looked up, then the site, its suggestion and its
// country, in one batch. A failed read or a point at sea changes nothing (seam review 2, 3): a site
// already read stays in use on the page, in storage and as the country's source, and the line names it
// ("still using …"); with none, the manual climate cards, with the line.
// Counted in lookups.ts `lookups` (Suggest waits for it), whichever way it started (the map centre too).
export const locate = (lat: number, lon: number, source: LocationSource, label: string | undefined, extra: Partial<Line> = {}, fromTyped = false): Promise<void> =>
  looking(() => locateNow(lat, lon, source, label, extra, fromTyped));
async function locateNow(lat: number, lon: number, source: LocationSource, label: string | undefined, extra: Partial<Line> = {}, fromTyped = false): Promise<void> {
  const id = nextLookup();
  lastAsk = () => locate(lat, lon, source, label, extra, fromTyped);
  batch(() => { clearStep(); line.value = { state: 'loading', ...extra }; });
  const lookup = await unlessReplaced(read(lat, lon));
  if (!liveLookup(id) || lookup === undefined) return;
  if (!lookup) {
    // A link's location not read yet drives nothing: it goes, as before; a site read stays.
    const keep = !!store.location.peek()?.lookup;
    batch(() => { if (!keep) store.location.value = null; unread.value = false; line.value = { state: 'failed', ...extra }; });
    return;
  }
  const sc = siteClimate(lookup);
  if (sc.state === 'sea') { line.value = { state: 'sea', ...extra }; return; }
  const loc: SiteLocation = { lat, lon, source, ...(label ? { label } : {}), lookup };
  // What the place before this one read (R5): a climate the grower chose by hand ("Use <other>", "Not
  // this climate? Choose another") stays while the new point reads the same climate.
  const before = store.location.peek()?.lookup;
  const readBefore = before ? siteClimate(before).suggested : null;
  siteFound(() => {
    // Another climate cell clears the grower's own values (A7: store.placeAt).
    store.placeAt(loc);
    typed.value = fromTyped;
    line.value = { state: sc.state, ...extra };
  }, lookup.regions.isoA2);
  // The climate read is used at once (v13 Place; borderline: its own class's, the other one tap away;
  // polar: none), suggested once: never over a climate the grower chose, unless the new point reads
  // another climate than the last one did (R5). A link's location never changes the link's climate.
  if (sc.suggested && source !== 'link' && (!store.climate.peek() || sc.suggested !== readBefore)) chooseClimate(sc.suggested);
  keepLocation(loc);
}

// A location the page brings (restore.ts): a link's `o=` (already in store.location, its lookup to
// come; the link's climate, answers and country stay) or the saved one (looked up again; it suggests
// a climate only while none is chosen, and its country is written quietly).
export async function settle(how: 'link' | 'saved', savedText: string | null): Promise<void> {
  const start = how === 'link' ? store.location.peek() : readLocation(savedText);
  if (!start) return;
  const id = nextLookup();
  line.value = { state: 'loading' };
  const lookup = await unlessReplaced(read(start.lat, start.lon));
  if (!liveLookup(id) || lookup === undefined) return;
  const sc = lookup ? siteClimate(lookup) : null;
  if (!lookup || !sc || sc.state === 'sea') {
    batch(() => { if (how === 'link' && store.location.peek() === start) store.location.value = null; unread.value = false; line.value = { state: lookup ? 'sea' : 'failed' }; });
    return;
  }
  // Something else set the site meanwhile (the reader, another link): this lookup's line goes.
  if (how === 'link' ? store.location.peek() !== start : store.location.peek() !== null) { line.value = null; return; }
  const loc: SiteLocation = { lat: start.lat, lon: start.lon, source: start.source, ...(start.label ? { label: start.label } : {}), lookup };
  // A link's location brings no country (its link's country stands).
  siteFound(() => {
    store.location.value = loc;
    // Not under a share link's climate still opening either (seam review 5: a link without o= keeps the
    // saved site); a saved consortium opening still gets it, so a save that fails to open leaves the
    // card proposed (round 2, 2).
    line.value = { state: sc.state };
  }, how === 'saved' ? lookup.regions.isoA2 : undefined);
  // The saved place's climate is used at once while none is chosen (not under a link's climate still
  // opening: seam review 5); quiet, as its country: the page brought it, the reader did not act.
  if (how === 'saved' && sc.suggested && !store.climate.peek() && !pendingLinkClimate.peek()) { const z = sc.suggested; quietly(() => chooseClimate(z)); }
}

// ---- the three ways ----
export async function useMyLocation(): Promise<void> {
  const id = nextLookup();
  lastAsk = useMyLocation;
  batch(() => { clearStep(); asking.value = 'geo'; line.value = { state: 'loading' }; });
  const permission = await unlessReplaced(queryGeolocationPermission());
  if (!liveLookup(id) || permission === undefined) return;
  waited.value = Math.round((permission?.state === 'granted' ? SITE_POSITION_OPTIONS.timeout ?? 15_000 : PROMPT_CAP_MS) / 1000);
  if (permission?.state === 'denied') { batch(() => { asking.value = null; line.value = { state: 'denied' }; }); return; }
  const at = await unlessReplaced(currentPosition(undefined, permission));
  if (!liveLookup(id) || !at) return;
  asking.value = null;
  if ('code' in at) { line.value = { state: at.code === 1 ? 'denied' : at.code === 3 ? 'timeout' : 'unavailable' }; return; }
  await locate(at.lat, at.lon, 'geo', undefined);
}

let search: PlaceSearchController | null = null;
const searcher = (): PlaceSearchController => (search ??= createPlaceSearchController({ transport: geocodingTransport, config: { ...defaultGeocoderConfig(), language: pageLang() }, limit: 5 }));
// The map dialog's own search (board LocDesk): its answers move the map, nothing is located.
export async function findPlaces(q: string): Promise<{ failed: boolean; results: readonly PlaceSearchResult[]; attribution: string | null }> {
  const s = searcher();
  await s.search(q.trim());
  return { failed: s.status.value === 'error', results: s.results.value, attribution: s.attribution.value };
}
// A search answer's name: its own, then the last part of its locality (the country).
export const placeName = (r: PlaceSearchResult) => (r.detail ? `${r.label}, ${r.detail.split(', ').at(-1)}` : r.label);
// The place field's Search (or Enter), with what the view read of it (views/location/location.tsx
// searchPlace): coordinates are taken here and sent nowhere; 'bad' (looks like coordinates but is not
// understood) says so, and the same text searched again comes back as a name (read null).
export type CoordsRead = { lat: number; lon: number } | 'bad' | null;
export async function searchRead(q: string, read: CoordsRead): Promise<void> {
  const query = q.trim();
  if (!query) return;
  if (read === 'bad') { nextLookup(); batch(() => { clearStep(); line.value = null; badCoords.value = query; }); return; }
  if (read) { await locate(read.lat, read.lon, 'map', undefined, {}, true); return; }
  const id = nextLookup();
  lastAsk = () => searchRead(query, null);
  batch(() => { clearStep(); asking.value = 'search'; line.value = { state: 'loading', query }; });
  await unlessReplaced(searcher().search(query));
  if (!liveLookup(id)) return;
  const search = searcher();
  asking.value = null;
  // The name path never takes the controller's own coordinate reading (R2): text the field refused as
  // coordinates ("1.17 36") is never turned into a guessed point; it reads as no place found.
  const status = search.status.value, results = search.results.value.filter((r) => r.source !== 'coordinates'), attribution = search.attribution.value;
  if (status === 'error') { line.value = { state: 'offline', query }; return; }
  if (!results.length) { line.value = { state: 'no-result', query, attribution }; return; }
  if (results.length > 1) { batch(() => { line.value = null; choices.value = { query, results, attribution }; }); return; }
  await choose(results[0], { query, attribution });
}
// One answer taken (the only one, or the grower's choice among several).
export const choose = (r: PlaceSearchResult, extra: Partial<Line> = {}): Promise<void> =>
  locate(r.lat, r.lon, 'search', r.source === 'geocoder' ? placeName(r) : undefined, extra);

// "Forget this location": the site, its suggestion, its country and the saved copy go. A link's
// location goes alone: the reader's own saved location is not the link's to remove.
// "Forget this location" also clears the last place answers (canopi-place) and the open palette's
// place, the grower's own values (plant-palette-architecture 8.3; privacy.tool.device); the tab's place
// follows it, and so does the stored palette (canopi-consortium), held page or not (pre-push fix 3,
// persist.ts forgetSavedPlace): none of those values and no country from the location stay in it; a
// link's own country, the plants, the room and plot size are the palette's and stay. The kept location
// no longer holds Place's climate cards.
export function forget(): void {
  noteForget();
  nextLookup();
  unread.value = false;
  const own = store.location.peek()?.source !== 'link';
  batch(() => {
    store.location.value = null; line.value = null; typed.value = false;
    clearStep();
    if (own) locationCountry(null, true);
    // The grower's own values are of that place: they go with it, as the save's place does.
    store.siteEdits.value = NO_EDITS;
  });
  if (own) { keepLocation(null); locationAtStart.value = false; }
  memory.remove(PLACE_STORE);
  forgetSavedPlace(own);
}

// "Use it" on a link that brings a place (8.3; coordinator row 2026-11-14): the link's cell becomes
// the reader's own location on this device, kept as a map pick (its centre, never a finer point).
// Returns whether it was kept on this device (storage may refuse it).
export function adoptLinkLocation(): boolean {
  const l = store.location.peek();
  if (l?.source !== 'link') return false;
  const mine: SiteLocation = { ...l, source: 'map' };
  quietly(() => { store.location.value = mine; });
  return keepLocation(mine);
}
