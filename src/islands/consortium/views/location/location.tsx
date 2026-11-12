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
import { koppenZone, MEANS_MARGIN_C, siteClimate, type LocationSource, type SiteLocation } from '../../../../lib/consortium/index.ts';
import { createTileSource, DEFAULT_RADIUS, lookupSite, siteIndex, type SiteLookup, type TileSource } from '../../../../lib/climate/index.ts';
import { createPlaceSearchController, type PlaceSearchController, type PlaceSearchResult } from '../../../../lib/location/place-search.ts';
import { defaultGeocoderConfig } from '../../../../lib/location/registry.ts';
import { geocodingTransport } from '../../../../lib/location/transport.ts';
import { currentPosition, queryGeolocationPermission } from '../../../../lib/location/geolocation.ts';
import { loadMapLibreModule } from '../../../../lib/location/maplibre.ts';
import * as store from '../../store.ts';
import { T, pageLang } from '../../strings.ts';
import { chooseClimate, pendingClimate, pendingLinkClimate } from '../../memory.ts';
import { keepLocation, locationCountry, readLocation, siteFound } from './keep.ts';
import { line, liveLookup, looking, nextLookup, unlessReplaced, unread, type Line } from './load.ts';
import { zoneLabel } from '../Start.tsx';

// ---- the result line ----
export const mapOpen = signal(false);

// ---- the climate reader over the installed tiles (#ct-climate, ConsortiumPage.astro) ----
let tiles: TileSource | null = null;
function tileSource(): TileSource {
  tiles ??= createTileSource({ index: siteIndex(JSON.parse(document.getElementById('ct-climate')?.textContent ?? 'null')) });
  return tiles;
}
// A read that has not answered in 15 s fails like any other (review round 2, 3): the reader is told and
// a waiting Suggest is released. (The climate reader takes no AbortSignal; the late answer is dropped.)
export const READ_TIMEOUT_MS = 15_000;
async function read(lat: number, lon: number): Promise<SiteLookup | null> {
  let timer = 0;
  try {
    return await Promise.race([
      // No soil tile until something reads it (P5.2's soil likely restores { soil: true }).
      lookupSite(lat, lon, tileSource(), DEFAULT_RADIUS, { soil: false }),
      new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new Error(`no answer in ${READ_TIMEOUT_MS / 1000} s`)), READ_TIMEOUT_MS); }),
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
// Counted in load.ts `lookups` (Suggest waits for it), whichever way it started (the map centre too).
const locate = (lat: number, lon: number, source: LocationSource, label: string | undefined, extra: Partial<Line> = {}): Promise<void> =>
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

// A location the page brings (memory.ts): a link's `o=` (already in store.location, its lookup to
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
const placeName = (r: PlaceSearchResult) => (r.detail ? `${r.label}, ${r.detail.split(', ').at(-1)}` : r.label);
export async function searchPlace(q: string): Promise<void> {
  const query = q.trim();
  if (!query) return;
  search ??= createPlaceSearchController({ transport: geocodingTransport, config: { ...defaultGeocoderConfig(), language: pageLang() }, limit: 5 });
  const id = nextLookup();
  line.value = { state: 'loading', query };
  await unlessReplaced(search.search(query));
  if (!liveLookup(id)) return;
  const status = search.status.peek(), [first, ...others] = search.results.peek(), attribution = search.attribution.peek();
  if (status === 'error') { line.value = { state: 'offline', query }; return; }
  if (!first) { line.value = { state: 'no-result', query, attribution }; return; }
  await locate(first.lat, first.lon, 'search', first.source === 'geocoder' ? placeName(first) : undefined, { query, others, attribution });
}

export function openMap(): void { mapOpen.value = true; }

// "Forget this location": the site, its suggestion, its country and the saved copy go. A link's
// location goes alone: the reader's own saved location is not the link's to remove.
function forget(): void {
  nextLookup();
  unread.value = false;
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
// A line with no site of its own (a refusal, a failure, the sea). After a failed read or a point at sea,
// the site still in use is named (seam review 2, 3: whenever a site drives the pool, marks and future,
// this panel says which).
function stateText(l: Line, loc: SiteLocation | null): string {
  if (loc?.lookup && (l.state === 'sea' || l.state === 'failed')) return T(l.state === 'sea' ? 'location.state.seaKept' : 'location.state.failedKept', { place: placeOf(loc) });
  return l.state === 'no-result' ? T('location.state.no-result', { q: l.query ?? '' }) : T(`location.state.${l.state}`);
}

// ---- views ----
export function LocationResult({ compact = false }: { compact?: boolean }) {
  const l = line.value, loc = store.location.value, sc = loc?.lookup ? siteClimate(loc.lookup) : null;
  const site = l && sc && sc.today && loc && l.state === sc.state;
  const proposed = store.proposedClimate.value;
  // As Start.tsx's cards: a proposal shows only while no climate is chosen or shown from a link.
  const picked = !!sc?.zone && proposed === sc.zone && !(store.climate.value ?? pendingClimate.value);
  // A site line whose site has gone (a link without o= replaced a link's location): nothing to say.
  const gone = !!l && !loc && (l.state === 'ready' || l.state === 'borderline' || l.state === 'polar' || l.state === 'coast');
  return (
    <>
      {unread.value && <p class="ct-notice" role="status" data-location-unread>{T('location.unread')}</p>}
      {l && !gone && (
        <div class="ct-location-result" data-location-state={l.state} role="status" aria-busy={l.state === 'loading' ? 'true' : undefined}>
          {site ? (
            <>
              <p>
                {T('location.why', { place: placeOf(loc), koppen: sc.koppen, words: koppenWords(sc.koppen), tmin: new Intl.NumberFormat(pageLang(), { maximumFractionDigits: 1 }).format(sc.today!.tminColdC) })}
                {' '}
                {/* The class from the cell's own means, when the map's stored class gives another zone (site-climate.ts). */}
                {sc.mapKoppen && `${T('location.means', { map: sc.mapKoppen, koppen: sc.koppen })} `}
                {sc.state === 'polar' ? T('location.state.polar')
                  // Borderline (UX audit fix 2): both climates named, the class's own pre-selected.
                  // "We picked X" only while X is the card Start shows as proposed (none chosen;
                  // review round 4, 2); otherwise both named and a plain "check" (a link's or a saved
                  // location under a chosen climate, or a card chosen since).
                  : sc.state === 'borderline' ? (sc.zone && sc.near
                    ? `${T(picked ? 'location.between' : 'location.betweenCheck', { a: zoneLabel(sc.zone), b: zoneLabel(sc.near) })} ${T(sc.mapKoppen && sc.near === koppenZone(sc.mapKoppen) ? 'location.meansNear' : 'location.state.borderline', { margin: MEANS_MARGIN_C })}`
                    : `${T('location.state.borderline')}${picked ? ` ${T('location.picked', { climate: zoneLabel(sc.zone) })}` : ''}`)
                  : T('location.suggests', { climate: zoneLabel(sc.zone) })}
                {sc.state === 'coast' && ` ${T('location.state.coast')}`}
              </p>
              {/* Not over a link's or save's climate still opening (seam review round 3, 1). */}
              {!compact && proposed && !pendingClimate.value && store.climate.value !== proposed && (
                <p><button type="button" class="button button-primary ct-small" data-location-confirm onClick={() => { chooseClimate(proposed); store.proposedClimate.value = null; }}>{T('location.confirm', { climate: zoneLabel(proposed) })}</button></p>
              )}
            </>
          ) : (
            <p>{stateText(l, loc)}</p>
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
      {(state === 'sea' || state === 'failed') && <p class="ct-notice" role="status">{stateText(line.value!, store.location.value)}</p>}
      <p class="ct-location-row">
        <button type="button" class="button button-primary" data-location-use-centre disabled={state === 'loading'} onClick={() => void use()}>{T('location.useCentre')}</button>
        {' '}<button type="button" class="button button-secondary" data-location-close onClick={close}>{T('location.close')}</button>
      </p>
    </dialog>
  );
}
