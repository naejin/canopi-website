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
// buttons, and the map dialog, stand outside it. The field mirrors the place in use (R4, C10).
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

const SAMPLE_PLOTS: readonly { id: string; label: string; fullName: string; lat: number; lon: number }[] = [
  { id: 'montpellier', label: 'Montpellier, FR', fullName: 'Montpellier, South of France', lat: 43.6108, lon: 3.8767 },
  { id: 'lyon', label: 'Lyon, FR', fullName: 'Lyon, France', lat: 45.764, lon: 4.8357 },
  { id: 'lisbon', label: 'Lisbon, PT', fullName: 'Lisbon, Portugal', lat: 38.7223, lon: -9.1393 },
  { id: 'kyoto', label: 'Kyoto, JP', fullName: 'Kyoto, Japan', lat: 35.0116, lon: 135.7681 },
];

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
  // The field mirrors the place in use (board Place, PlaceDesk; R4, C10): its name once found; a place
  // with no name (a map point, the device, a link's) or none at all (Forget) empties it, so it never
  // names a place no longer in use; typed coordinates (the place's own mark, state/location.ts Place)
  // keep the text the grower typed. The effect is keyed on the place's identity (where it is, how it
  // was found, its name), never on each re-read of the same place (its lookup arriving). The grower's
  // own acts (state/location.ts acts) always set it; anything else the page does (a saved place or a
  // link read) changes it only while it still holds what was last written there, never what the
  // grower has typed since (final1 N1).
  const label = loc?.source !== 'link' ? loc?.label : undefined;
  const place = loc ? `${loc.lat},${loc.lon},${loc.source},${label ?? ''}` : '';
  const act = m ? m.acts.value : 0;
  const seenAct = useRef(act);
  const written = useRef('');
  useEffect(() => {
    const f = field.current;
    if (!f) return;
    const mine = act !== seenAct.current;
    seenAct.current = act;
    if (!mine && f.value !== written.current) return;
    const next = label ?? (m?.typed.peek() ? f.value : '');
    f.value = next;
    written.current = next;
  }, [place, act]);
  const geoIcon = <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M10 2v3M10 15v3M2 10h3M15 10h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>;
  const showWays = !(frame && loc?.lookup);
  const search = (q: string) => { if (q.trim()) void run((x) => x.searchPlace(q)); };
  const pickSample = (s: typeof SAMPLE_PLOTS[number]) => {
    void run((x) => x.settle('saved', JSON.stringify({ lat: s.lat, lon: s.lon, source: 'search', label: s.fullName })));
  };
  return (
    <section aria-labelledby="ct-loc-h">
      <h2 id="ct-loc-h">Where are you planting?</h2>
      <form style="display:flex; gap:8px; margin-bottom:10px;" role="search" aria-label={T('location.title')} onSubmit={(e) => { e.preventDefault(); if (searching) return; search((e.currentTarget.elements.namedItem('ct-place-q') as HTMLInputElement).value); }}>
        <input ref={field} type="text" name="ct-place-q" class="field-input" style="flex:1;" data-location-search enterKeyHint="search" autoComplete="off" aria-label={T('location.field')} placeholder={T('location.field')}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) e.preventDefault(); }} />
        {searching
          ? <button type="button" class="btn" onClick={() => m?.stop()}>{T('location.stop')}</button>
          : <button type="submit" class="btn">Look up</button>}
        {geo && showWays && !wide && (
          <button type="button" class="btn" data-location-action="geo" aria-label={T('location.geo')} onClick={() => run((x) => x.useMyLocation())}>{geoIcon}</button>
        )}
      </form>
      {showWays && (
        <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; font-size:13px; color:var(--ink-muted);">
          <span>Sample plots:</span>
          {SAMPLE_PLOTS.map((s) => (
            <button
              key={s.id}
              type="button"
              class="filter-chip"
              aria-pressed={loc?.label === s.fullName ? 'true' : 'false'}
              onClick={() => pickSample(s)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      {showWays && (
        <div class="ct-loc-quick">
          {geo && <button type="button" class="ct-loc-link" data-location-action="geo" onClick={() => run((x) => x.useMyLocation())}>{T('location.geo')}</button>}
          {geo && webgl() && <span aria-hidden="true">·</span>}
          {webgl() && <button type="button" class="ct-loc-link" data-location-action="map" onClick={() => run((x) => x.openMap())}>{T('location.map')}</button>}
          {(geo || webgl()) && children && <span aria-hidden="true">·</span>}
          {children}
        </div>
      )}
      {broken.value && <p class="ct-muted" role="alert">{T('details.loadFailed')}</p>}
      <p class="ct-sr" role="status">{m ? m.said() : loc && !loc.lookup ? T('location.state.loading') : ''}</p>
      {(!loc?.lookup || !!m?.choices.value) && result}
      {m && m.mapOpen.value && <m.MapDialog />}
    </section>
  );
}
