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
// link, approximate" and never changes the link's climate, answers or country.
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
import { chooseClimate, keepLocation, locationCountry, type SavedLocation } from '../../memory.ts';
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
async function locate(lat: number, lon: number, source: LocationSource, label: string | undefined, extra: Partial<Line> = {}): Promise<void> {
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
    locationCountry(lookup.regions.isoA2, true);
    line.value = { state: sc.state, ...extra };
  });
  keepLocation(loc);
}

// A location the page brings (memory.ts): a link's `o=` (already in store.location, its lookup to
// come; the link's climate, answers and country stay) or the saved one (looked up again; it suggests
// a climate only while none is chosen, and its country is written quietly).
export async function settle(how: 'link' | 'saved', saved: SavedLocation | null): Promise<void> {
  const start = how === 'link' ? store.location.peek() : saved;
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
  if (how === 'link' ? store.location.peek() !== start : store.location.peek() !== null) return;
  const loc: SiteLocation = { lat: start.lat, lon: start.lon, source: start.source, ...(start.label ? { label: start.label } : {}), lookup };
  batch(() => {
    store.location.value = loc;
    if (how === 'saved' && !store.climate.peek()) store.proposedClimate.value = sc.suggested;
    line.value = { state: sc.state };
  });
  if (how === 'saved') locationCountry(lookup.regions.isoA2, false);
  else keepLocation(loc);
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

// "Forget this location": the site, its suggestion, its country and the saved copy go.
function forget(): void {
  seq++;
  batch(() => { store.location.value = null; store.proposedClimate.value = null; line.value = null; locationCountry(null, true); });
  keepLocation(null);
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
  return (
    <>
      {l && (
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
  const close = () => { mapOpen.value = false; };
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
    <dialog ref={dialog} class="ct-map-dialog" data-location-map aria-labelledby="ct-map-h" onClose={close}
      style="width:min(94vw,760px);max-width:none;padding:1rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text)">
      <h2 class="ct-step-title" id="ct-map-h">{T('location.mapTitle')}</h2>
      <div style="position:relative;height:min(60vh,480px);border:1px solid var(--border)">
        <div ref={box} style="position:absolute;inset:0" />
        <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;color:var(--text)">
          <path d="M16 2v11M16 19v11M2 16h11M19 16h11" stroke="var(--surface)" stroke-width="5" />
          <path d="M16 2v11M16 19v11M2 16h11M19 16h11" stroke="currentColor" stroke-width="2" />
        </svg>
      </div>
      {failed && <p class="ct-notice" role="alert">{T('location.mapFailed')}</p>}
      {(state === 'sea' || state === 'failed') && <p class="ct-notice" role="status">{T(`location.state.${state}`)}</p>}
      <p class="ct-location-row">
        <button type="button" class="button button-primary" data-location-use-centre disabled={state === 'loading'} onClick={() => void use()}>{T('location.useCentre')}</button>
        {' '}<button type="button" class="button button-secondary" onClick={close}>{T('location.close')}</button>
      </p>
    </dialog>
  );
}
