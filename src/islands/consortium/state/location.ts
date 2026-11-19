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
import { batch, computed, signal } from '@preact/signals';
import type { LocationSource, SiteLocation } from '../../../lib/consortium/index.ts';
import { NO_EDITS, siteClimate, snapOrigin } from '../../../lib/consortium/index.ts';
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
// "Look up its name" on typed coordinates (M26): asking, none found, or no answer; cleared with the step.
export const naming = signal<'asking' | 'none' | 'failed' | null>(null);
// The grower's own acts on the place (locate, Forget, "Use it" on a link's place), counted: the place
// field (views/LocationSlot.tsx) follows these and leaves the grower's typing to anything else the
// page does (a restore, a link, a re-read).
export const acts = signal(0);
// A place read from typed coordinates carries the mark itself (final1 N2): "Read on this device.
// Nothing was sent, so the place has no name." holds for that very place and no other, whichever path
// replaces it (a link's place, one adopted from a link, the saved one read again).
export type Place = SiteLocation & { typed?: true };
export const typed = computed(() => !!(store.location.value as Place | null)?.typed);
// How long "Use my location" waited before it gave up, in seconds, as the read used it (R10;
// devicePosition).
export const waited = signal(Math.round(PROMPT_CAP_MS / 1000));
// The last ask, for "Try again" (offline search, device timeout, a climate that did not load).
let lastAsk: (() => Promise<void>) | null = null;
export const tryAgain = (): Promise<void> => (lastAsk ? lastAsk() : Promise.resolve());
const clearStep = () => batch(() => { asking.value = null; choices.value = null; badCoords.value = null; naming.value = null; });
// Stop: the ask in flight goes (its late answer is dropped), and so does its line.
export function stop(): void {
  nextLookup();
  batch(() => { clearStep(); line.value = null; });
}

// ---- the site location kept on this device, and the country from it ----

export interface SavedLocation { lat: number; lon: number; source: LocationSource; label?: string; placeLevel?: true }
const SOURCES: readonly LocationSource[] = ['geo', 'search', 'map', 'link'];
// A saved location read back, or null when it is not one.
export function readLocation(text: string | null): SavedLocation | null {
  let v: unknown;
  try { v = text ? JSON.parse(text) : null; } catch { return null; }
  if (!v || typeof v !== 'object') return null;
  const { lat, lon, source, label, placeLevel } = v as Record<string, unknown>;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) return null;
  if (!SOURCES.includes(source as LocationSource)) return null;
  const out: SavedLocation = { lat, lon, source: source as LocationSource };
  if (typeof label === 'string' && label && label.length <= 200) { out.label = label; if (placeLevel === true) out.placeLevel = true; }
  return out;
}

type Kept = Pick<SiteLocation, 'lat' | 'lon' | 'source' | 'label' | 'placeLevel'>;
export const locationRecord = (l: Kept): string =>
  JSON.stringify(l.label ? { lat: l.lat, lon: l.lon, source: l.source, label: l.label, ...(l.placeLevel ? { placeLevel: true } : {}) } : { lat: l.lat, lon: l.lon, source: l.source });

// The reader's own site location kept on this device (never in a link, never a link's), or removed.
function keepLocation(l: Kept | null): boolean {
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
      // No soil here: the place never waits on an optional layer (R1); soilLater() adds it.
      lookupSite(lat, lon, tileSource(), DEFAULT_RADIUS, { soil: false }),
      new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new Error(`no answer in ${ms / 1000} s`)), ms); }),
    ]);
  } catch (err) {
    console.error(`Consortium: the site's climate could not be read: ${(err as Error).message}`);
    return null;
  } finally { clearTimeout(timer); }
}

// The soil map's reading for a site just read, best effort (R1): "Your place in figures" (pf-d) reads
// its pH and texture (SiteInputs.soilPh, site-inputs.ts soilTextureOf), and says "not known" while it
// is missing. Asked after the place is in use, so a slow or failed soil tile (about 147 KB each; up to 8
// neighbours where the point's own cell is empty) never costs the grower the place. The climate and
// regions tiles it reads again are the tile source's cached ones. Patched in quietly (the page found
// it, the reader did not act), and only onto the same site's lookup: a newer place drops it.
function soilLater(site: SiteLocation): void {
  const was = site.lookup;
  if (!was) return;
  lookupSite(site.lat, site.lon, tileSource(), DEFAULT_RADIUS, { soil: true }).then((l) => {
    const now = store.location.peek();
    if (!l.soil || !now || now.lookup !== was) return;
    quietly(() => { store.location.value = { ...now, lookup: { ...was, soil: l.soil } }; });
  }, (err: unknown) => { console.error(`Consortium: the site's soil could not be read: ${(err as Error).message}`); });
}

// A position the reader gave (device, search, map): looked up, then the site, its suggestion and its
// country, in one batch. A failed read or a point at sea changes nothing (seam review 2, 3): a site
// already read stays in use on the page, in storage and as the country's source, and the line names it
// ("still using …"); with none, the manual climate cards, with the line.
// Counted in lookups.ts `lookups` (Suggest waits for it), whichever way it started (the map centre too).
// asked: the climate when the reader's ask began, given by the asks that wait before locate (the
// device's position, the place search's one answer), so a climate chosen while they waited stays. It
// travels with that one call, never in shared state: an ask that ends without locating (refused,
// timed out, no answer, offline, several answers) leaves nothing behind for a later locate.
type Ask = { climate: ReturnType<typeof store.climate.peek> };
// name: the place's label, and whether it is town-level (SiteLocation placeLevel), for a search answer.
type Named = { label: string; placeLevel?: true };
export const locate = (lat: number, lon: number, source: LocationSource, name: Named | undefined, extra: Partial<Line> = {}, fromTyped = false, asked: Ask | null = null): Promise<void> =>
  looking(() => locateNow(lat, lon, source, name, extra, fromTyped, asked));
async function locateNow(lat: number, lon: number, source: LocationSource, name: Named | undefined, extra: Partial<Line> = {}, fromTyped = false, asked: Ask | null = null): Promise<void> {
  const id = nextLookup();
  lastAsk = () => locate(lat, lon, source, name, extra, fromTyped);
  batch(() => { clearStep(); line.value = { state: 'loading', ...extra }; });
  // The climate when the reader asked (a device position or a search can take seconds before this
  // read): one chosen since (by hand, or a pasted link's palette) is newer than this read and stays (P5-1c).
  const before = asked ? asked.climate : store.climate.peek();
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
  const loc: Place = { lat, lon, source, ...(name ? { label: name.label, ...(name.placeLevel ? { placeLevel: true as const } : {}) } : {}), ...(fromTyped ? { typed: true as const } : {}), lookup };
  // A climate the grower chose by hand ("Use <other>", "Not this climate? Choose another") overrides
  // the read of one cell (R5, R3, C7): it stays while the new point is in the same climate cell as the
  // grower's own place before it ("Adjust on the map" within the cell), and goes with any other cell,
  // even one that reads the same climate. A shared link's place is never the grower's own "before".
  const was = store.location.peek();
  const sameCell = !!was?.lookup && was.source !== 'link' && store.cellKey(was.lookup.climate) === store.cellKey(lookup.climate);
  siteFound(() => {
    // Another climate cell clears the grower's own values (A7: store.placeAt).
    store.placeAt(loc);
    acts.value++;
    line.value = { state: sc.state, ...extra };
  }, lookup.regions.isoA2);
  // The climate read is used at once (v13 Place; borderline: its own class's, the other one tap away;
  // polar: none), never over a climate kept for this same cell. A link's location never changes the
  // link's climate. Nor over a climate chosen while it was read (by hand, or a link's palette opened meanwhile).
  if (sc.suggested && source !== 'link' && store.climate.peek() === before && !pendingLinkClimate.peek() && (!store.climate.peek() || !sameCell)) chooseClimate(sc.suggested);
  keepLocation(loc);
  soilLater(loc);
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
  const loc: SiteLocation = { lat: start.lat, lon: start.lon, source: start.source, ...(start.label ? { label: start.label } : {}), ...(start.placeLevel ? { placeLevel: true as const } : {}), lookup };
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
  soilLater(loc);
}

// ---- the three ways ----
// One read of the device's position with the wait it ran (R10; R7, C6 of fix round 2): the browser's
// own timeout once the permission is granted, else the one cap over the prompt and the fix
// (lib/location/geolocation.ts currentPosition). "Use my location" and the map's "Centre on my
// location" both read through it, so the seconds a timeout names are the ones it waited.
type Read = Awaited<ReturnType<typeof currentPosition>>;
export async function devicePosition(): Promise<{ at: Read; seconds: number }> {
  const permission = await queryGeolocationPermission();
  const seconds = Math.round((permission?.state === 'granted' ? SITE_POSITION_OPTIONS.timeout ?? 15_000 : PROMPT_CAP_MS) / 1000);
  if (permission?.state === 'denied') return { at: { code: 1 }, seconds };
  return { at: await currentPosition(undefined, permission), seconds };
}
export async function useMyLocation(): Promise<void> {
  const id = nextLookup();
  lastAsk = useMyLocation;
  const asked = { climate: store.climate.peek() };
  batch(() => { clearStep(); asking.value = 'geo'; line.value = { state: 'loading' }; });
  const read = await unlessReplaced(devicePosition());
  if (!liveLookup(id) || !read) return;
  const { at, seconds } = read;
  waited.value = seconds;
  asking.value = null;
  if ('code' in at) { line.value = { state: at.code === 1 ? 'denied' : at.code === 3 ? 'timeout' : 'unavailable' }; return; }
  await locate(at.lat, at.lon, 'geo', undefined, {}, false, asked);
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
  const asked = { climate: store.climate.peek() };
  lastAsk = () => searchRead(query, null);
  batch(() => { clearStep(); asking.value = 'search'; line.value = { state: 'loading', query }; });
  await unlessReplaced(searcher().search(query, { asName: true }));
  if (!liveLookup(id)) return;
  const search = searcher();
  asking.value = null;
  // The name path never takes the controller's own coordinate reading (R2; asName, M26): text the field refused as
  // coordinates ("1.17 36") is never turned into a guessed point; it reads as no place found.
  const status = search.status.value, results = search.results.value.filter((r) => r.source !== 'coordinates'), attribution = search.attribution.value;
  if (status === 'error') { line.value = { state: 'offline', query }; return; }
  if (!results.length) { line.value = { state: 'no-result', query, attribution }; return; }
  if (results.length > 1) { batch(() => { line.value = null; choices.value = { query, results, attribution }; }); return; }
  await take(results[0], { query, attribution }, asked);
}
// "Look up its name" (M26): typed coordinates have no name until the grower asks; then one reverse
// lookup, on that press only, of the centre of the point's climate-grid square (snapOrigin, as a link's
// `o`): the lookup asks for a town (zoom 10), so the precise point is never sent (h2 R3; the privacy
// lines say so). The answer names the place where it stands ("Near Kiambu, Kenya"), kept on this
// device as the location was; none found or no answer is said beside the row (naming). A press while
// one is asked does nothing (the link is busy); a lookup cut short by another ask (a place search, a
// new place) is no failure: what replaced it speaks. "Still that place" is the same typed, unnamed
// point, not the same object: the soil reading patched on later (soilLater) copies the place, and must
// neither drop the name nor be dropped by it (h3 G1 round 2, B1.1, C2.1).
const stillUnnamed = (l: Place): Place | null => {
  const now = store.location.peek() as Place | null;
  return now?.typed && !now.label && now.lat === l.lat && now.lon === l.lon && now.source === l.source ? now : null;
};
// Each ask is numbered (nameAsk): only the latest ask writes `naming`, so an earlier one answered or
// cut short after the grower moved on never clears a newer ask's busy state (h3 G1#1).
let nameAsk = 0;
export async function lookUpName(): Promise<void> {
  const l = store.location.peek() as Place | null;
  if (!l?.typed || l.label || naming.peek() === 'asking') return;
  const at = snapOrigin({ lat: l.lat, lon: l.lon });
  if (!at) return;
  const ask = ++nameAsk;
  const mine = () => ask === nameAsk;
  naming.value = 'asking';
  try {
    const r = await searcher().nameOf(at.lat, at.lon);
    if (!mine()) return;
    const now = stillUnnamed(l);
    if (!now) { naming.value = null; return; }
    if (!r) { naming.value = 'none'; return; }
    const next: Place = { ...now, label: placeName(r), ...(r.placeType ? { placeLevel: true as const } : {}) };
    batch(() => { store.location.value = next; naming.value = null; });
    keepLocation(next);
  } catch (err) {
    if (!mine()) return;
    if (err instanceof DOMException && err.name === 'AbortError') { naming.value = null; return; }
    if (stillUnnamed(l)) naming.value = 'failed';
  }
}

// One answer taken: the only one (take, the search's ask), or the grower's choice among several (a new ask).
const take = (r: PlaceSearchResult, extra: Partial<Line> = {}, asked: Ask | null = null): Promise<void> =>
  locate(r.lat, r.lon, 'search', r.source === 'geocoder' ? { label: placeName(r), ...(r.placeType ? { placeLevel: true as const } : {}) } : undefined, extra, false, asked);
export const choose = (r: PlaceSearchResult, extra: Partial<Line> = {}): Promise<void> => take(r, extra);

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
    store.location.value = null; line.value = null; acts.value++;
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
  const { typed: _, ...rest } = l as Place;
  const mine: SiteLocation = { ...rest, source: 'map' };
  quietly(() => { store.location.value = mine; });
  acts.value++;
  return keepLocation(mine);
}
