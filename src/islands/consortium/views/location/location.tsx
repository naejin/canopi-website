/** @jsxImportSource preact */
// "Where is your site?" (P5 stream S5b; design check §B and its failure states; owner answers 1, 4, 5):
// the location step's chunk, loaded by views/LocationSlot.tsx on the reader's first click (or by
// memory.ts for a link's `o=` or the saved location). It turns a position into a site:
// - Use my location: one read of the device's position (low accuracy), denied / timeout / unavailable
//   said in words;
// - search a town: Nominatim on Enter only, 1.1 s apart, 5 answers, cached, in the page language,
//   never with an email (src/lib/location); the first answer is used, the others offered;
// - pick on a map: MapLibre (its own lazy chunk with its worker and CSS) in a dialog with a centre
//   cross and "Use the map centre"; OpenFreeMap positron or dark by the theme; jumpTo only.
// Then the climate reader (src/lib/climate) reads the site's tiles and core site-climate.ts says what it
// means: the location SUGGESTS a climate card (store.proposedClimate: shown checked) and says why, and
// the reader confirms it ([data-location-confirm]); borderline, polar, sea, coast and a failed read
// each have their own line ([data-location-state]). store.location holds the site; a country from it
// is "from your location" (memory.locationCountry). A link's location is labelled "from the shared
// link, approximate" and never changes the link's climate, answers or country; it lives for the page
// only: never saved over the reader's own location, never a country (review round 1, 1). A lookup's
// writes are not reader actions (the click was): the country goes through memory's quiet write, so a
// link pasted while tiles load still restores (review round 1, 4).
import { batch, signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import { siteClimate, type LocationSource, type SiteLocation, type SiteState } from '../../../../lib/consortium/index.ts';
import { createTileSource, lookupSite, siteIndex, type SiteLookup, type TileSource } from '../../../../lib/climate/index.ts';
import { createPlaceSearchController, type PlaceSearchController, type PlaceSearchResult } from '../../../../lib/location/place-search.ts';
import { defaultGeocoderConfig } from '../../../../lib/location/registry.ts';
import { geocodingTransport } from '../../../../lib/location/transport.ts';
import { currentPosition, queryGeolocationPermission } from '../../../../lib/location/geolocation.ts';
import { loadMapLibreModule } from '../../../../lib/location/maplibre.ts';
import * as store from '../../store.ts';
import { T, pageLang } from '../../strings.ts';
import { chooseClimate } from '../../memory.ts';
import { keepLocation, locationCountry, readLocation } from './keep.ts';
import { looking } from './load.ts';
import { zoneLabel } from '../Start.tsx';

// ---- the result line ----
export type LineState = 'loading' | 'denied' | 'timeout' | 'unavailable' | 'no-result' | 'offline' | 'failed' | SiteState;
interface Line { state: LineState; query?: string; others?: readonly PlaceSearchResult[]; attribution?: string | null }
export const line = signal<Line | null>(null);
export const mapOpen = signal(false);
// The newest request: an older one that ends later changes nothing.
let seq = 0;

// ---- the climate reader over the installed tiles (#ct-climate, ConsortiumPage.astro) ----
let tiles: TileSource | null = null;
function tileSource(): TileSource {
  tiles ??= createTileSource({ index: siteIndex(JSON.parse(document.getElementById('ct-climate')?.textContent ?? 'null')) });
  return tiles;
}
async function read(lat: number, lon: number): Promise<SiteLookup | null> {
  try {
    return await lookupSite(lat, lon, tileSource());
  } catch (err) {
    console.error(`Consortium: the site's climate could not be read: ${(err as Error).message}`);
    return null;
  }
}

// A position the reader gave (device, search, map): looked up, then the site, its suggestion and its
// country, in one batch. A failed read clears the site (the manual climate stays, with a line).
// Counted in load.ts `lookups` (Suggest waits for it), whichever way it started (the map centre too).
const locate = (lat: number, lon: number, source: LocationSource, label: string | undefined, extra: Partial<Line> = {}): Promise<void> =>
  looking(() => locateNow(lat, lon, source, label, extra));
async function locateNow(lat: number, lon: number, source: LocationSource, label: string | undefined, extra: Partial<Line> = {}): Promise<void> {
  const id = ++seq;
  line.value = { state: 'loading', ...extra };
  const lookup = await read(lat, lon);
  if (id !== seq) return;
  if (!lookup) {
    batch(() => { store.location.value = null; store.proposedClimate.value = null; line.value = { state: 'failed', ...extra }; });
    return;
  }
  const sc = siteClimate(lookup);
  if (sc.state === 'sea') { line.value = { state: 'sea', ...extra }; return; }
  const loc: SiteLocation = { lat, lon, source, ...(label ? { label } : {}), lookup };
  batch(() => {
    store.location.value = loc;
    store.proposedClimate.value = sc.suggested;
    locationCountry(lookup.regions.isoA2, false);
    line.value = { state: sc.state, ...extra };
  });
  keepLocation(loc);
}

// A location the page brings (memory.ts): a link's `o=` (already in store.location, its lookup to
// come; the link's climate, answers and country stay) or the saved one (looked up again; it suggests
// a climate only while none is chosen, and its country is written quietly).
export async function settle(how: 'link' | 'saved', savedText: string | null): Promise<void> {
  const start = how === 'link' ? store.location.peek() : readLocation(savedText);
  if (!start) return;
  const id = ++seq;
  line.value = { state: 'loading' };
  const lookup = await read(start.lat, start.lon);
  if (id !== seq) return;
  const sc = lookup ? siteClimate(lookup) : null;
  if (!lookup || !sc || sc.state === 'sea') {
    batch(() => { if (how === 'link' && store.location.peek() === start) store.location.value = null; line.value = { state: lookup ? 'sea' : 'failed' }; });
    return;
  }
  // Something else set the site meanwhile (the reader, another link): this lookup's line goes.
  if (how === 'link' ? store.location.peek() !== start : store.location.peek() !== null) { line.value = null; return; }
  const loc: SiteLocation = { lat: start.lat, lon: start.lon, source: start.source, ...(start.label ? { label: start.label } : {}), lookup };
  batch(() => {
    store.location.value = loc;
    if (how === 'saved' && !store.climate.peek()) store.proposedClimate.value = sc.suggested;
    line.value = { state: sc.state };
  });
  if (how === 'saved') locationCountry(lookup.regions.isoA2, false);
}

// ---- the three ways ----
export async function useMyLocation(): Promise<void> {
  const id = ++seq;
  line.value = { state: 'loading' };
  if ((await queryGeolocationPermission())?.state === 'denied') { if (id === seq) line.value = { state: 'denied' }; return; }
  const at = await currentPosition();
  if (id !== seq) return;
  if ('code' in at) { line.value = { state: at.code === 1 ? 'denied' : at.code === 3 ? 'timeout' : 'unavailable' }; return; }
  await locate(at.lat, at.lon, 'geo', undefined);
}

let search: PlaceSearchController | null = null;
const placeName = (r: PlaceSearchResult) => (r.detail ? `${r.label}, ${r.detail.split(', ').at(-1)}` : r.label);
export async function searchPlace(q: string): Promise<void> {
  const query = q.trim();
  if (!query) return;
  search ??= createPlaceSearchController({ transport: geocodingTransport, config: { ...defaultGeocoderConfig(), language: pageLang() }, limit: 5 });
  const id = ++seq;
  line.value = { state: 'loading', query };
  await search.search(query);
  if (id !== seq) return;
  const status = search.status.peek(), [first, ...others] = search.results.peek(), attribution = search.attribution.peek();
  if (status === 'error') { line.value = { state: 'offline', query }; return; }
  if (!first) { line.value = { state: 'no-result', query, attribution }; return; }
  await locate(first.lat, first.lon, 'search', first.source === 'geocoder' ? placeName(first) : undefined, { query, others, attribution });
}

export function openMap(): void { mapOpen.value = true; }

// "Forget this location": the site, its suggestion, its country and the saved copy go. A link's
// location goes alone: the reader's own saved location is not the link's to remove.
function forget(): void {
  seq++;
  const own = store.location.peek()?.source !== 'link';
  batch(() => { store.location.value = null; store.proposedClimate.value = null; line.value = null; if (own) locationCountry(null, true); });
  if (own) keepLocation(null);
}

// ---- words ----
const coords = (lat: number, lon: number): string => {
  const n = new Intl.NumberFormat(pageLang(), { maximumFractionDigits: 2 });
  return T('location.coords', { lat: n.format(Math.abs(lat)), lon: n.format(Math.abs(lon)), ns: T(lat < 0 ? 'location.dir.s' : 'location.dir.n'), ew: T(lon < 0 ? 'location.dir.w' : 'location.dir.e') });
};
// The class in plain words: its type (Af, BW, Cs, Df, ET…), then its temperature letter where it has one.
function koppenWords(k: string): string {
  const type = k[0] === 'A' || k[0] === 'E' ? k : k.slice(0, 2), temp = k[0] === 'A' || k[0] === 'E' ? '' : k.slice(2);
  const words = T(`location.k.${type}`);
  return temp ? T('location.koppen', { type: words, temp: T(`location.t.${temp}`) }) : words;
}
function placeOf(l: SiteLocation): string {
  const where = l.label ?? (l.source === 'geo' ? T('location.here') : coords(l.lat, l.lon));
  return l.source === 'link' ? `${where} (${T('location.fromLink')})` : where;
}

// ---- views ----
export function LocationResult({ compact = false }: { compact?: boolean }) {
  const l = line.value, loc = store.location.value, sc = loc?.lookup ? siteClimate(loc.lookup) : null;
  const site = l && sc && sc.today && loc && l.state === sc.state;
  const proposed = store.proposedClimate.value;
  // A site line whose site has gone (a link without o= replaced a link's location): nothing to say.
  const gone = !!l && !loc && (l.state === 'ready' || l.state === 'borderline' || l.state === 'polar' || l.state === 'coast');
  return (
    <>
      {l && !gone && (
        <div class="ct-location-result" data-location-state={l.state} role="status" aria-busy={l.state === 'loading' ? 'true' : undefined}>
          {site ? (
            <>
              <p>
                {T('location.why', { place: placeOf(loc), koppen: sc.today!.koppen, words: koppenWords(sc.today!.koppen), tmin: new Intl.NumberFormat(pageLang(), { maximumFractionDigits: 1 }).format(sc.today!.tminColdC) })}
                {' '}
                {sc.state === 'polar' ? T('location.state.polar') : sc.state === 'borderline' ? T('location.state.borderline') : T('location.suggests', { climate: zoneLabel(sc.zone) })}
                {sc.state === 'borderline' && sc.near && ` ${T('location.near', { climate: zoneLabel(sc.near) })}`}
                {sc.state === 'coast' && ` ${T('location.state.coast')}`}
              </p>
              {!compact && proposed && store.climate.value !== proposed && (
                <p><button type="button" class="button button-primary ct-small" data-location-confirm onClick={() => { chooseClimate(proposed); store.proposedClimate.value = null; }}>{T('location.confirm', { climate: zoneLabel(proposed) })}</button></p>
              )}
            </>
          ) : (
            <p>{l.state === 'no-result' ? T('location.state.no-result', { q: l.query ?? '' }) : T(`location.state.${l.state}`)}</p>
          )}
          {!compact && !!l.others?.length && (
            <p class="ct-muted ct-small-text">{T('location.others')}{' '}
              {l.others.map((r) => <button type="button" class="link-button ct-link" onClick={() => void locate(r.lat, r.lon, 'search', placeName(r), { ...l, others: l.others?.filter((x) => x !== r) })}>{placeName(r)}</button>)}
            </p>
          )}
          {!compact && l.attribution && <p class="ct-muted ct-small-text">{l.attribution}</p>}
          {!compact && loc && l.state !== 'loading' && <p><button type="button" class="link-button ct-link" onClick={forget}>{T('location.forget')}</button></p>}
        </div>
      )}
      {!compact && mapOpen.value && <MapDialog />}
    </>
  );
}

// The map dialog: the map under a centre cross; "Use the map centre" looks that point up. The dialog
// stays open on the open sea (its line asks for a point on land) and closes once a site is found.
interface MapLike { getCenter(): { lat: number; lng: number; wrap(): { lat: number; lng: number } }; jumpTo(o: { center: [number, number]; zoom?: number }): void; remove(): void }
function MapDialog() {
  const dialog = useRef<HTMLDialogElement>(null), box = useRef<HTMLDivElement>(null), map = useRef<MapLike | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    let gone = false;
    loadMapLibreModule().then((ml) => {
      if (gone || !box.current) return;
      const loc = store.location.peek(), theme = document.documentElement.dataset.theme;
      const dark = theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme: dark)').matches);
      const m = new ml.Map({
        container: box.current, style: `https://tiles.openfreemap.org/styles/${dark ? 'dark' : 'positron'}`,
        center: loc ? [loc.lon, loc.lat] : [10, 25], zoom: loc ? 8 : 1.2, dragRotate: false, touchPitch: false,
        attributionControl: { compact: matchMedia('(max-width: 639px)').matches },
      });
      map.current = m;
      if (__CT_TEST_HOOK__) {
        const hook = (globalThis as { __ctTest?: unknown }).__ctTest;
        if (hook && typeof hook === 'object') (hook as Record<string, unknown>).mapCentre = ({ lat, lon }: { lat: number; lon: number }) => m.jumpTo({ center: [lon, lat] });
      }
    }).catch((err: unknown) => { console.error(`Consortium: the map did not load: ${(err as Error).message}`); if (!gone) setFailed(true); });
    return () => { gone = true; map.current?.remove(); map.current = null; };
  }, []);
  // Closed through the dialog itself, as Escape does, so the browser returns focus to the map button
  // (review round 1, 5); its close event then unmounts it.
  const close = () => { const d = dialog.current; if (d?.open) d.close(); else mapOpen.value = false; };
  const use = async () => {
    const m = map.current;
    if (!m) return;
    const c = m.getCenter().wrap();
    await locate(c.lat, c.lng, 'map', undefined);
    const s = line.peek()?.state;
    if (s !== 'sea' && s !== 'failed') close();
  };
  const state = line.value?.state;
  return (
    <dialog ref={dialog} class="ct-map-dialog" data-location-map aria-labelledby="ct-map-h" onClose={() => { mapOpen.value = false; }}>
      <h2 class="ct-step-title" id="ct-map-h">{T('location.mapTitle')}</h2>
      <div class="ct-map-frame">
        <div ref={box} class="ct-map-canvas" />
        {/* The site pin at the centre (design check §B): ink cross, ochre point. */}
        <svg class="ct-map-pin" aria-hidden="true" width="40" height="40" viewBox="0 0 40 40">
          <path class="ct-map-pin-halo" d="M20 3v12M20 25v12M3 20h12M25 20h12" />
          <path class="ct-map-pin-cross" d="M20 3v12M20 25v12M3 20h12M25 20h12" />
          <circle class="ct-map-pin-dot" cx="20" cy="20" r="4" />
        </svg>
      </div>
      {failed && <p class="ct-notice" role="alert">{T('location.mapFailed')}</p>}
      {(state === 'sea' || state === 'failed') && <p class="ct-notice" role="status">{T(`location.state.${state}`)}</p>}
      <p class="ct-location-row">
        <button type="button" class="button button-primary" data-location-use-centre disabled={state === 'loading'} onClick={() => void use()}>{T('location.useCentre')}</button>
        {' '}<button type="button" class="button button-secondary" data-location-close onClick={close}>{T('location.close')}</button>
      </p>
    </dialog>
  );
}
