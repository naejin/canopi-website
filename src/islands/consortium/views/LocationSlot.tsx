/** @jsxImportSource preact */
// "Where is your site?" (P5 stream S5b; design check §B; owner answers 1, 4, 5), above the climate
// cards. A thin shell in the P2 island: the three controls, each with one line naming what it
// contacts (owner answer 4; the privacy page, /privacy/, says more), and nothing third-party until a
// click. The step itself (lookups, the result line, the map) is the lazy chunk views/location/location.tsx,
// loaded on the first click or Enter (views/location/load.ts). The map button shows only with WebGL.
// compact (the result head, once a consortium shows): the result line alone.
import { useMemo } from 'preact/hooks';
import { location } from '../store.ts';
import { T, pageLang } from '../strings.ts';
import { loadLocationStep, locationStep, type LocationStep } from './location/load.ts';
import { signal } from '@preact/signals';

const broken = signal(false);
const run = (f: (m: LocationStep) => unknown) => loadLocationStep().then(f, (err: unknown) => {
  console.error(`Consortium: the location step did not load: ${(err as Error).message}`);
  broken.value = true;
});
const webgl = (): boolean => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') ?? c.getContext('webgl')); } catch { return false; }
};

export function LocationSlot({ compact = false }: { compact?: boolean }) {
  const m = locationStep.value, loc = location.value;
  const map = useMemo(webgl, []);
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
      {row('geo', T('location.geo'), T('location.geoPrivacy'))}
      <p class="ct-location-row">
        <input type="search" data-location-search enterKeyHint="search" aria-label={T('location.search')} placeholder={T('location.searchHint')}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const q = e.currentTarget.value; void run((x) => x.searchPlace(q)); } }} />
        {' '}<span class="ct-muted ct-small-text" data-location-privacy>{T('location.searchPrivacy')}</span>
      </p>
      {map && row('map', T('location.map'), T('location.mapPrivacy'))}
      {broken.value && <p class="ct-notice" role="alert">{T('details.loadFailed')}</p>}
      {result}
    </section>
  );
}
