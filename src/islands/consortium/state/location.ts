// "Where is your site?": the location step's state and its lookups (P5 stream S5b; design check §B
// and its failure states; owner answers 1, 4, 5; E6 S2 moved it here from views/location/location.tsx
// which now renders and re-exports its three actions). It lives in the lazy location chunk: only
// views/location/location.tsx imports it, and that chunk loads on the reader's first click or Enter
// (views/LocationSlot.tsx) or for a link's `o=` or the saved location (restore.ts). What the first run
// needs of it (the lookups in flight, their line and ownership) is in lookups.ts.
//
// It turns a position into a site:
// - Use my location: one read of the device's position (low accuracy), denied / timeout / unavailable
//   said in words;
// - search a town: Nominatim on Enter only, 1.1 s apart, 5 answers, cached, in the page language,
//   never with an email (src/lib/location); the first answer is used, the others offered;
// - pick on a map (the dialog is the view's): its centre is looked up like any position.
// Then the climate reader (src/lib/climate) reads the site's tiles and core site-climate.ts says what it
// means: the location SUGGESTS a climate card (store.proposedClimate) and says why, and the reader
// confirms it (confirmProposed); borderline, polar, sea, coast and a failed read each have their own
// line. store.location holds the site; a country from it is "from your location" (locationCountry).
// A link's location is labelled "from the shared link, approximate" and never changes the link's
// climate, answers or country; it lives for the page only: never saved over the reader's own location,
// never a country (review round 1, 1). A lookup's writes are not reader actions (the click was): the
// country goes through persist's quiet write, so a link pasted while tiles load still restores
// (review round 1, 4).
import { batch } from '@preact/signals';
import type { ClimateZone, LocationSource, SiteLocation } from '../../../lib/consortium/index.ts';
import { siteClimate } from '../../../lib/consortium/index.ts';
import { createTileSource, DEFAULT_RADIUS, lookupSite, siteIndex, type SiteLookup, type TileSource } from '../../../lib/climate/index.ts';
import { createPlaceSearchController, type PlaceSearchController, type PlaceSearchResult } from '../../../lib/location/place-search.ts';
import { defaultGeocoderConfig } from '../../../lib/location/registry.ts';
import { geocodingTransport } from '../../../lib/location/transport.ts';
import { currentPosition, queryGeolocationPermission } from '../../../lib/location/geolocation.ts';
import type { Country } from '../store.ts';
import * as store from '../store.ts';
import { pageLang } from '../strings.ts';
import { memory, pendingLinkClimate, quietly, LOCATION_STORE } from './persist.ts';
import { chooseClimate } from './draft.ts';
import { line, liveLookup, looking, nextLookup, unlessReplaced, unread, type Line } from './lookups.ts';

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
function keepLocation(l: Pick<SiteLocation, 'lat' | 'lon' | 'source' | 'label'> | null): void {
  if (l) memory.write(LOCATION_STORE, locationRecord(l));
  else memory.remove(LOCATION_STORE);
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
export const locate = (lat: number, lon: number, source: LocationSource, label: string | undefined, extra: Partial<Line> = {}): Promise<void> =>
  looking(() => locateNow(lat, lon, source, label, extra));
async function locateNow(lat: number, lon: number, source: LocationSource, label: string | undefined, extra: Partial<Line> = {}): Promise<void> {
  const id = nextLookup();
  line.value = { state: 'loading', ...extra };
  const lookup = await unlessReplaced(read(lat, lon));
  if (!liveLookup(id) || lookup === undefined) return;
  if (!lookup) {
    // A link's location not read yet drives nothing: it goes, as before; a site read stays.
    const keep = !!store.location.peek()?.lookup;
    batch(() => { if (!keep) { store.location.value = null; store.proposedClimate.value = null; } unread.value = false; line.value = { state: 'failed', ...extra }; });
    return;
  }
  const sc = siteClimate(lookup);
  if (sc.state === 'sea') { line.value = { state: 'sea', ...extra }; return; }
  const loc: SiteLocation = { lat, lon, source, ...(label ? { label } : {}), lookup };
  siteFound(() => {
    store.location.value = loc;
    store.proposedClimate.value = sc.suggested;
    store.proposedFromSave.value = false;
    line.value = { state: sc.state, ...extra };
  }, lookup.regions.isoA2);
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
    if (how === 'saved' && !store.climate.peek() && !pendingLinkClimate.peek()) { store.proposedClimate.value = sc.suggested; store.proposedFromSave.value = true; }
    line.value = { state: sc.state };
  }, how === 'saved' ? lookup.regions.isoA2 : undefined);
}

// ---- the three ways ----
export async function useMyLocation(): Promise<void> {
  const id = nextLookup();
  line.value = { state: 'loading' };
  const permission = await unlessReplaced(queryGeolocationPermission());
  if (!liveLookup(id) || permission === undefined) return;
  if (permission?.state === 'denied') { line.value = { state: 'denied' }; return; }
  const at = await unlessReplaced(currentPosition(undefined, permission));
  if (!liveLookup(id) || !at) return;
  if ('code' in at) { line.value = { state: at.code === 1 ? 'denied' : at.code === 3 ? 'timeout' : 'unavailable' }; return; }
  await locate(at.lat, at.lon, 'geo', undefined);
}

let search: PlaceSearchController | null = null;
// A search answer's name: its own, then the last part of its locality (the country).
export const placeName = (r: PlaceSearchResult) => (r.detail ? `${r.label}, ${r.detail.split(', ').at(-1)}` : r.label);
export async function searchPlace(q: string): Promise<void> {
  const query = q.trim();
  if (!query) return;
  search ??= createPlaceSearchController({ transport: geocodingTransport, config: { ...defaultGeocoderConfig(), language: pageLang() }, limit: 5 });
  const id = nextLookup();
  line.value = { state: 'loading', query };
  await unlessReplaced(search.search(query));
  if (!liveLookup(id)) return;
  const status = search.status.value, [first, ...others] = search.results.value, attribution = search.attribution.value;
  if (status === 'error') { line.value = { state: 'offline', query }; return; }
  if (!first) { line.value = { state: 'no-result', query, attribution }; return; }
  await locate(first.lat, first.lon, 'search', first.source === 'geocoder' ? placeName(first) : undefined, { query, others, attribution });
}

// The reader confirms the card the location proposed: chosen as any card is (draft.ts chooseClimate).
export function confirmProposed(z: ClimateZone): void {
  chooseClimate(z);
  store.proposedClimate.value = null;
}

// "Forget this location": the site, its suggestion, its country and the saved copy go. A link's
// location goes alone: the reader's own saved location is not the link's to remove.
export function forget(): void {
  nextLookup();
  unread.value = false;
  const own = store.location.peek()?.source !== 'link';
  batch(() => { store.location.value = null; store.proposedClimate.value = null; line.value = null; if (own) locationCountry(null, true); });
  if (own) keepLocation(null);
}
