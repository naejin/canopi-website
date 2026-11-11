/** @jsxImportSource preact */
// "Where is your site?" (P5 stream S5b; design check §B; owner answers 1, 4, 5), above the climate
// cards. A thin shell in the P2 island: the three controls, each with one line naming what it
// contacts (owner answer 4; the privacy page, /privacy/, says more), and nothing third-party until a
// click. The step itself (lookups, the result line, the map) is the lazy chunk views/location/location.tsx,
// loaded on the first click or Enter (views/location/load.ts). The map button shows only with WebGL
// (probed once, its context released), "Use my location" only with the Geolocation API (checked here,
// not through lib/location/geolocation.ts, which would bring that module into the first run); Enter while
// an input method composes (ja, zh, ko) is not a search (review round 1, 3, 7, 10).
// compact (the result head, once a consortium shows): the result line alone, no probe.
import { location } from '../store.ts';
import { T, pageLang } from '../strings.ts';
import { loadLocationStep, locationStep, looking, type LocationStep } from './location/load.ts';
import { signal } from '@preact/signals';

const broken = signal(false);
// The whole step, chunk load included, counts as a lookup in flight (load.ts `lookups`).
const run = (f: (m: LocationStep) => unknown) => looking(async () => {
  const m = await loadLocationStep().catch(() => { broken.value = true; return null; });
  if (m) await f(m);
});
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

export function LocationSlot({ compact = false }: { compact?: boolean }) {
  const m = locationStep.value, loc = location.value;
  // A link's location before the step has loaded: its lookup is on the way.
  const result = m ? <m.LocationResult compact={compact} /> : loc && !loc.lookup ? <p class="status-line" data-location-state="loading" aria-busy="true">{T('location.state.loading')}</p> : null;
  if (compact) return result;
  const lang = pageLang();
  const row = (action: 'geo' | 'map', label: string, privacy: string) => (
    <p class="ct-location-row">
      <button type="button" class="button button-secondary ct-small" data-location-action={action} onClick={() => run((x) => (action === 'geo' ? x.useMyLocation() : x.openMap()))}>{label}</button>
      {' '}<span class="ct-muted ct-small-text" data-location-privacy>{privacy}</span>
    </p>
  );
  return (
    <section class="ct-step ct-panel ct-location" aria-labelledby="ct-loc-h">
      <h2 class="ct-step-title" id="ct-loc-h">{T('location.title')}</h2>
      <p class="ct-muted ct-step-lede">{T('location.lede')} <a href={`${lang === 'en' ? '' : `/${lang}`}/privacy/`}>{T('location.privacyLink')}</a></p>
      {isSecureContext && navigator.geolocation && row('geo', T('location.geo'), T('location.geoPrivacy'))}
      <p class="ct-location-row">
        <input type="search" data-location-search enterKeyHint="search" aria-label={T('location.search')} placeholder={T('location.searchHint')}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); const q = e.currentTarget.value; void run((x) => x.searchPlace(q)); } }} />
        {' '}<span class="ct-muted ct-small-text" data-location-privacy>{T('location.searchPrivacy')}</span>
      </p>
      {webgl() && row('map', T('location.map'), T('location.mapPrivacy'))}
      {broken.value && <p class="ct-notice" role="alert">{T('details.loadFailed')}</p>}
      {result}
    </section>
  );
}
