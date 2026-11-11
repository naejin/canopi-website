// P5 stream S5b ("Where is your site?"): the rules behind the location step that Node can run. The
// page paths (controls, failure lines, map, share tick) are browser specs P5-1…P5-13
// (scripts/browser/consortium-p5.browser.test.mjs). S5b owns this file; no other stream edits it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lyon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const sc = await import('../src/lib/consortium/site-climate.ts');
const view = (f) => readFileSync(new URL(`../src/islands/consortium/views/${f}`, import.meta.url), 'utf8');

// A lookup as the core sees it, from Lyon's with one period replaced.
const at = (period, { regions = lyon.lookup.regions, climate = true } = {}) => ({
  ...lyon.lookup,
  regions,
  climate: climate ? { ...lyon.lookup.climate, periods: [{ ...lyon.lookup.climate.periods[0], koppenTemperatureMarginC: 0, ...period }] } : null,
});

test('site-climate koppenZone: the Köppen families of src/data/climates.ts, polar and unknown classes none', () => {
  const want = {
    Af: 'Tropical', Am: 'Tropical', Aw: 'Tropical', BWh: 'Arid', BSk: 'Arid', Csa: 'Mediterranean', Csb: 'Mediterranean', Cwa: 'Subtropical', Cwb: 'Subtropical',
    Cfa: 'Subtropical', Cfb: 'Temperate', Cfc: 'Temperate', Dfa: 'Continental', Dsb: 'Continental', Dwb: 'Continental', Dfc: 'Boreal', Dfd: 'Boreal', Dwc: 'Boreal',
    ET: null, EF: null, '': null,
  };
  for (const [k, z] of Object.entries(want)) assert.equal(sc.koppenZone(k), z, k);
});

test('site-climate siteClimate: a location suggests a climate only when it is clear (owner answer 1)', () => {
  // Lyon: Cfa with its warmest month 0.4 °C above 22 °C: borderline with Temperate, nothing suggested.
  assert.deepEqual(({ ...sc.siteClimate(lyon.lookup), today: null }), { state: 'borderline', today: null, zone: 'Subtropical', near: 'Temperate', suggested: null });
  // Seville-like Csa: ready, the Mediterranean card suggested.
  const seville = sc.siteClimate(at({ koppen: 'Csa', tmeanColdC: 10.6, tmeanWarmC: 27.4, tminColdC: 5.2 }, { regions: { wgsrpdL3: 'SPA', isoA2: 'ES' } }));
  assert.equal(seville.state, 'ready');
  assert.equal(seville.suggested, 'Mediterranean');
  // A bound that changes no zone (Csa/Csb at 22 °C) is not borderline.
  assert.equal(sc.siteClimate(at({ koppen: 'Csa', tmeanColdC: 9, tmeanWarmC: 22.2 })).state, 'ready');
  // Cold side: C/D at 0 °C (Cfb next to Dfb: Temperate/Continental) and A/C at 18 °C.
  assert.deepEqual([sc.siteClimate(at({ koppen: 'Cfb', tmeanColdC: 0.3, tmeanWarmC: 17 })).state, sc.siteClimate(at({ koppen: 'Cfb', tmeanColdC: 0.3, tmeanWarmC: 17 })).near], ['borderline', 'Continental']);
  assert.equal(sc.siteClimate(at({ koppen: 'Aw', tmeanColdC: 18.2, tmeanWarmC: 28 })).near, 'Subtropical');
  // Review round 1 (8): an A class near 18 °C names the C class it would be: a highland Af whose warmest
  // month stays under 22 °C is Cfb across the bound (Temperate), not Subtropical; As is Cs.
  assert.equal(sc.siteClimate(at({ koppen: 'Af', tmeanColdC: 18.2, tmeanWarmC: 19.5 })).near, 'Temperate', 'highland Af → Cfb');
  assert.equal(sc.siteClimate(at({ koppen: 'Am', tmeanColdC: 17.8, tmeanWarmC: 24 })).near, 'Subtropical', 'Am → Cfa');
  assert.equal(sc.siteClimate(at({ koppen: 'Aw', tmeanColdC: 18.3, tmeanWarmC: 20 })).near, 'Subtropical', 'Aw → Cwb, still Subtropical');
  assert.equal(sc.siteClimate(at({ koppen: 'As', tmeanColdC: 18.1, tmeanWarmC: 26 })).near, 'Mediterranean', 'As → Csa');
  // Near the tundra bound (10 °C warmest month), or the class disagreeing with its means: borderline, no zone across.
  assert.deepEqual([sc.siteClimate(at({ koppen: 'Dfc', tmeanColdC: -20, tmeanWarmC: 10.3 })).state, sc.siteClimate(at({ koppen: 'Dfc', tmeanColdC: -20, tmeanWarmC: 10.3 })).near], ['borderline', null]);
  assert.equal(sc.siteClimate(at({ koppen: 'Cfb', tmeanColdC: 5, tmeanWarmC: 17, koppenTemperatureMarginC: 0.3 })).state, 'borderline');
  // B classes are set by rainfall: never borderline on temperature.
  assert.equal(sc.siteClimate(at({ koppen: 'BSh', tmeanColdC: 18.1, tmeanWarmC: 30 })).state, 'ready');
});

test('site-climate siteClimate: polar, sea and coast have their own states', () => {
  assert.deepEqual(sc.siteClimate(at({ koppen: 'ET', tmeanColdC: -12, tmeanWarmC: 6 })).suggested, null);
  assert.equal(sc.siteClimate(at({ koppen: 'ET', tmeanColdC: -12, tmeanWarmC: 6 })).state, 'polar');
  assert.equal(sc.siteClimate(at({}, { climate: false, regions: { wgsrpdL3: null, isoA2: null } })).state, 'sea');
  const coast = sc.siteClimate(at({ koppen: 'Cfb', tmeanColdC: 8, tmeanWarmC: 16 }, { regions: { wgsrpdL3: null, isoA2: null } }));
  assert.deepEqual([coast.state, coast.suggested], ['coast', 'Temperate'], 'offshore: the nearest cell\'s climate, still suggested');
  assert.deepEqual(core.cellCentre(lyon.lookup), { lat: 45.75, lon: 4.85 });
  assert.equal(core.cellCentre(null), null);
});

test('state.ts o=: the cell centre only when given, just before e=1; v=4 decoders ignore it', () => {
  const s = { climate: 'Mediterranean', country: 'ES', site: { light: 'sun', soil: 'unsure', water: 'unsure', room: 'unsure' }, members: [], kept: [], removed: [], guests: [], crops: [], stage: null };
  const plain = core.encodeLink(s, {});
  assert.doesNotMatch(plain, /[&?]o=/);
  assert.equal(core.encodeLink(s, {}, { origin: null }), plain);
  const withO = core.encodeLink(s, {}, { origin: { lat: 37.35, lon: -5.95 } });
  assert.equal(withO, plain.replace(/&e=1$/, '&o=37.35,-5.95&e=1'), 'a literal comma, before the end key');
  assert.deepEqual(core.linkOrigin(withO), { lat: 37.35, lon: -5.95 });
  assert.deepEqual(core.decodeLink(withO, {}), core.decodeLink(plain, {}), 'the decoder reads the same state');
  assert.deepEqual(core.linkOrigin('v=4&c=temperate&o=37.35%2C-5.95&e=1'), { lat: 37.35, lon: -5.95 });
  for (const bad of ['o=91,0', 'o=0,181', 'o=abc', 'o=1;2', 'o=', 'c=temperate']) assert.equal(core.linkOrigin(`v=4&${bad}&e=1`), null, bad);
});

test('memory.ts: a location country goes into a link only with the tick; the saved location record', async () => {
  const m = await import('../src/islands/consortium/memory.ts');
  const input = { climate: 'Mediterranean', country: { code: 'ES', source: 'location' }, site: { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' }, members: [], kept: [], removed: [], guests: {}, crops: [], stage: null };
  assert.equal(m.shareState(input).country, null);
  assert.equal(m.shareState(input, { location: true }).country, 'ES');
  const keep = await import('../src/islands/consortium/views/location/keep.ts');
  const rec = keep.locationRecord({ lat: 37.3891, lon: -5.9845, source: 'geo' });
  assert.deepEqual(keep.readLocation(rec), { lat: 37.3891, lon: -5.9845, source: 'geo' });
  assert.deepEqual(keep.readLocation(keep.locationRecord({ lat: 45.7, lon: 4.8, source: 'search', label: 'Lyon, France' })).label, 'Lyon, France');
  for (const bad of [null, '', '{', '{"lat":1}', '{"lat":95,"lon":0,"source":"geo"}', '{"lat":1,"lon":2,"source":"gps"}']) assert.equal(keep.readLocation(bad), null, String(bad));
});

test('location/keep.ts locationCountry: replaces a guess or none, never a chosen or linked country; none offshore clears only its own', async () => {
  const m = await import('../src/islands/consortium/views/location/keep.ts');
  const store = await import('../src/islands/consortium/store.ts');
  const before = store.country.value;
  try {
    const run = (from, code) => { store.country.value = from; m.locationCountry(code, true); return store.country.value; };
    assert.deepEqual(run({ code: 'US', source: 'guess' }, 'ES'), { code: 'ES', source: 'location' });
    assert.deepEqual(run({ code: null, source: null }, 'ES'), { code: 'ES', source: 'location' });
    assert.deepEqual(run({ code: 'FR', source: 'chosen' }, 'ES'), { code: 'FR', source: 'chosen' });
    assert.deepEqual(run({ code: 'FR', source: 'link' }, 'ES'), { code: 'FR', source: 'link' });
    assert.deepEqual(run({ code: 'ES', source: 'location' }, null), { code: null, source: null });
    assert.deepEqual(run({ code: 'US', source: 'guess' }, null), { code: 'US', source: 'guess' });
  } finally { store.country.value = before; }
});

test('registry and place search (copied from canopi): Nominatim on request only, 5 answers, page language, no email, paced 1.1 s, cached', async () => {
  const reg = await import('../src/lib/location/registry.ts');
  const ps = await import('../src/lib/location/place-search.ts');
  const url = new URL(reg.getGeocodingProvider('nominatim').buildForwardUrl({ ...reg.defaultGeocoderConfig(), language: 'fr' }, 'Lyon', { limit: 5 }));
  assert.equal(url.origin + url.pathname, 'https://nominatim.openstreetmap.org/search');
  assert.deepEqual([url.searchParams.get('limit'), url.searchParams.get('accept-language'), url.searchParams.has('email')], ['5', 'fr', false]);
  assert.equal(reg.NOMINATIM_MIN_INTERVAL_MS, 1100);
  assert.deepEqual(ps.parseCoordinates('48.85N 2.35W'), { lat: 48.85, lon: -2.35 });
  assert.equal(ps.parseCoordinates('89, 10'), null, 'beyond Web Mercator');
  assert.deepEqual(ps.shortPlaceLabel('Lyon, Métropole de Lyon, Rhône, Auvergne-Rhône-Alpes, France métropolitaine, France'), { label: 'Lyon', detail: 'Rhône, Auvergne-Rhône-Alpes, France' });

  ps.resetPlaceSearchPacingForTests();
  const sent = [], waits = [];
  let clock = 1000;
  const transport = async (u) => { sent.push(u); return u.includes('Nowhere') ? [] : [{ lat: '45.76', lon: '4.83', display_name: 'Lyon, France' }]; };
  const ctl = ps.createPlaceSearchController({ transport, config: { ...reg.defaultGeocoderConfig(), language: 'en' }, now: () => clock, sleep: async (ms) => { waits.push(ms); clock += ms; } });
  await ctl.search('Lyon');
  assert.deepEqual([ctl.status.value, ctl.results.value[0].label, sent.length], ['results', 'Lyon', 1]);
  await ctl.search('Lyon');
  assert.equal(sent.length, 1, 'the same place again: from the cache, nothing sent');
  clock += 200;
  await ctl.search('Nowhere');
  assert.deepEqual([ctl.status.value, sent.length, waits.at(-1)], ['no-results', 2, 900], 'the next request waits until 1.1 s after the last');
  const failing = ps.createPlaceSearchController({ transport: async () => { throw new TypeError('Failed to fetch'); }, sleep: async () => {} });
  await failing.search('Lyon');
  assert.equal(failing.status.value, 'error');
});

test('the location step stays off the first run: the shell imports its chunk only through import()', () => {
  const shell = view('LocationSlot.tsx'), loader = view('location/load.ts');
  assert.doesNotMatch(shell, /from '\.\/location\/location\.tsx'/);
  assert.match(loader, /import\('\.\/location\.tsx'\)/);
  assert.doesNotMatch(view('location/location.tsx'), /from 'maplibre-gl'/, 'MapLibre only through lib/location/maplibre.ts, its own chunk');
  for (const f of ['registry.ts', 'place-search.ts', 'transport.ts', 'geolocation.ts', 'maplibre.ts']) {
    const src = readFileSync(new URL(`../src/lib/location/${f}`, import.meta.url), 'utf8');
    assert.match(src, /GNU Affero General Public License/, `${f}: AGPL header`);
    assert.match(src, /copied from canopi desktop\/web\/src\/\S+ at [0-9a-f]{40}/, `${f}: the "copied from canopi" line`);
  }
  assert.match(readFileSync(new URL('../src/lib/location/registry.ts', import.meta.url), 'utf8'), /Qiusheng Wu\. MIT License/, 'the GeoLibre MIT header kept');
});
