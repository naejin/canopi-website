/** @jsxImportSource preact */
// Question 1, "Where is your place?" (P5 stream S5b; v14 boards Place, PlaceDesk, LocStates,
// SiteKiambu; pf-c). A thin shell in the first run: the field ("Town, region or coordinates") with
// Search (Stop while it looks), "Use my location" (an icon button by the field), "Pick on a map", and the link Place hands in ("No
// location? Choose a climate"), with nothing third-party until a press. The step itself (its lookups
// in state/location.ts, the result and the map in views/location/location.tsx) is a lazy chunk,
// loaded on the first press (views/location/load.ts). A button that cannot work is not shown
// (LocStates): the map only with WebGL (probed once, its context released), "Use my location" only
// with the Geolocation API (checked here, not through lib/location/geolocation.ts, which would bring
// that module into the first run). Enter while an input method composes (ja, zh, ko) is not a search.
// frame: the return from the palette (board SiteKiambu): the place row with its ways out.
// On the laptop (PlaceDesk) "Use my location" and "Pick on a map" are labelled buttons under the field
// (BC6); on the phone the location is an icon button by the field. The field holds the place found
// (BC18). The status line says only the step's short sentence (R7): the result with its answers and
// buttons, and the map dialog, stand outside it.
import type { ComponentChildren } from 'preact';
import { location } from '../store.ts';
import { T } from '../strings.ts';
import { loadLocationStep, locationStep, type LocationStep } from './location/load.ts';
import { lookingThrough } from '../state/lookups.ts';
import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { desk } from './location/shared.ts';

const broken = signal(false);
// The whole step, chunk load included, counts as a lookup in flight (state/lookups.ts `lookups`).
const run = (f: (m: LocationStep) => unknown) => lookingThrough(() => loadLocationStep().then((m) => { broken.value = false; return m; }, () => { broken.value = true; return null; }), async (m) => { if (m) await f(m); });
let gl: boolean | undefined;
const webgl = (): boolean => {
  if (gl === undefined) {
    try {
      const c = document.createElement('canvas').getContext('webgl');
      gl = !!c;
      c?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch { gl = false; }
  }
  return gl;
};

export function LocationSlot({ frame = false, children }: { frame?: boolean; children?: ComponentChildren }) {
  const m = locationStep.value, loc = location.value;
  // A place already read (restored, or set by the store) shows its row: the step's chunk loads for it.
  useEffect(() => { if (!m && loc?.lookup) void loadLocationStep().catch(() => { broken.value = true; }); }, [m, !!loc?.lookup]);
  const searching = m?.asking.value === 'search';
  // A link's or the saved location before the step has loaded: its lookup is on the way.
  const result = m ? <m.LocationResult frame={frame} /> : loc && !loc.lookup ? <p class="status-line" data-location-state="loading" aria-busy="true">{T('location.state.loading')}</p> : null;
  const geo = isSecureContext && !!navigator.geolocation;
  const wide = desk.value;
  const field = useRef<HTMLInputElement>(null);
  // The place found, in the field (board Place, PlaceDesk): its name; a point with no name leaves it.
  const label = loc?.source !== 'link' ? loc?.label : undefined;
  useEffect(() => { if (label && field.current) field.current.value = label; }, [label]);
  const geoIcon = <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M10 2v3M10 15v3M2 10h3M15 10h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>;
  const showWays = !(frame && loc?.lookup);
  const search = (q: string) => { if (q.trim()) void run((x) => x.searchPlace(q)); };
  return (
    <section class="ct-q ct-location" aria-labelledby="ct-loc-h">
      <h2 class="ct-q-title" id="ct-loc-h"><span class="ct-q-n" aria-hidden="true">1</span> {T('location.title')}</h2>
      <p class="ct-muted ct-q-lede">{T('location.lede')}</p>
      <form class="ct-field-row" role="search" aria-label={T('location.title')} onSubmit={(e) => { e.preventDefault(); if (searching) return; search((e.currentTarget.elements.namedItem('ct-place-q') as HTMLInputElement).value); }}>
        <input ref={field} type="text" name="ct-place-q" class="ct-place-field" data-location-search enterKeyHint="search" autoComplete="off" aria-label={T('location.field')} placeholder={T('location.field')}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) e.preventDefault(); }} />
        {searching
          ? <button type="button" class="button button-secondary" onClick={() => m?.stop()}>{T('location.stop')}</button>
          : <button type="submit" class="button button-primary">{T('location.searchButton')}</button>}
        {geo && showWays && !wide && (
          <button type="button" class="ct-icon-button" data-location-action="geo" aria-label={T('location.geo')} title={T('location.geo')} onClick={() => run((x) => x.useMyLocation())}>{geoIcon}</button>
        )}
      </form>
      {showWays && wide && (geo || webgl()) && (
        <p class="ct-q-ways">
          {geo && <button type="button" class="button button-secondary" data-location-action="geo" onClick={() => run((x) => x.useMyLocation())}>{geoIcon}{T('location.geo')}</button>}
          {webgl() && <button type="button" class="button button-secondary" data-location-action="map" onClick={() => run((x) => x.openMap())}>{T('location.map')}</button>}
        </p>
      )}
      {/* The frame (SiteKiambu) keeps the field; its place row carries the other ways out. A link
          handed in as null leaves no separator behind (BC14). */}
      {showWays && ((webgl() && !wide) || children) && (
        <p class="ct-q-links">
          {webgl() && !wide && <button type="button" class="link-button ct-link" data-location-action="map" onClick={() => run((x) => x.openMap())}>{T('location.map')}</button>}
          {webgl() && !wide && children && <span class="ct-sep" aria-hidden="true"> · </span>}
          {children}
        </p>
      )}
      {broken.value && <p class="ct-notice" role="alert">{T('details.loadFailed')}</p>}
      {/* Always on the page (A25): a status region is there before its message, words only (R7). */}
      <p class="ct-sr" role="status">{m ? m.said() : loc && !loc.lookup ? T('location.state.loading') : ''}</p>
      {result}
      {m && m.mapOpen.value && <m.MapDialog />}
    </section>
  );
}
