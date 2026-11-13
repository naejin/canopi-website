// P5 stream S5b ("Where is your site?"): the rules behind the location step that Node can run. The
// page paths (controls, failure lines, map, share tick) are browser specs P5-1…P5-13
// (scripts/browser/consortium-p5-s5b.browser.test.mjs). S5b owns this file; no other stream edits it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
  // Lyon: Cfa with its warmest month 0.4 °C above 22 °C: borderline with Temperate; its own class's
  // climate, Subtropical, is pre-selected for the reader to check (UX audit fix 2, review round 3).
  assert.deepEqual(({ ...sc.siteClimate(lyon.lookup), today: null }), { state: 'borderline', today: null, zone: 'Subtropical', near: 'Temperate', suggested: 'Subtropical', koppen: 'Cfa', mapKoppen: null });
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
  assert.equal(sc.siteClimate(at({ koppen: 'Dfc', tmeanColdC: -20, tmeanWarmC: 10.3 })).suggested, 'Boreal', 'borderline with no zone across: its own climate, still pre-selected');
  assert.equal(sc.siteClimate(at({ koppen: 'Cfb', tmeanColdC: 0.3, tmeanWarmC: 17 })).suggested, 'Temperate');
  assert.equal(sc.siteClimate(at({ koppen: 'Cfb', tmeanColdC: 5, tmeanWarmC: 17, koppenTemperatureMarginC: 0.3 })).state, 'borderline');
  // B classes are set by rainfall: never borderline on temperature.
  assert.equal(sc.siteClimate(at({ koppen: 'BSh', tmeanColdC: 18.1, tmeanWarmC: 30 })).state, 'ready');
  assert.equal(sc.siteClimate(at({ koppen: 'BWk', tmeanColdC: 0.2, tmeanWarmC: 22.1 })).state, 'ready', 'arid: never borderline, at 0 °C or 22 °C either');
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

test('state/persist.ts and state/location.ts: a location country goes into a link only with the tick; the saved location record', async () => {
  const m = await import('../src/islands/consortium/state/persist.ts');
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

test('registry: Nominatim is the only geocoder; no unused provider or endpoint ships (pre-push review 4)', async () => {
  const reg = await import('../src/lib/location/registry.ts');
  const src = readFileSync(new URL('../src/lib/location/registry.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''), /pelias|geocode\.earth|api_key|apiKey/i, 'in the code (the header says it was dropped)');
  assert.equal(reg.getGeocodingProvider('pelias').id, 'nominatim');
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

test('review round 2 (1): a lookup\'s writes are quiet even in a batch: a restore in flight survives them', async () => {
  const m = { ...await import('../src/islands/consortium/state/persist.ts'), ...await import('../src/islands/consortium/state/restore.ts') };
  const store = await import('../src/islands/consortium/store.ts');
  const keep = await import('../src/islands/consortium/views/location/keep.ts');
  const { batch } = await import('@preact/signals');
  m.watchStore();
  const before = { country: store.country.peek(), location: store.location.peek(), source: store.source.peek() };
  try {
    store.source.value = null;
    store.country.value = { code: null, source: null };
    // A restore waiting for the plant source: in flight until it comes.
    void m.restore('v=4&c=temperate&e=1', { from: 'link' });
    assert.equal(m.restoring.peek(), true, 'the restore is in flight');
    // The bug: a quiet write inside a batch flushes after quietly() has reset, and counts as an action.
    batch(() => { keep.locationCountry('DE', false); });
    const counted = !m.restoring.peek();
    assert.equal(counted, true, 'reproduces: a quiet write inside batch() is counted (this is why siteFound exists)');
    store.country.value = { code: null, source: null };
    void m.restore('v=4&c=temperate&e=1', { from: 'link' });
    assert.equal(m.restoring.peek(), true);
    keep.siteFound(() => { store.location.value = { lat: 37.39, lon: -5.98, source: 'geo', lookup: null }; }, 'ES');
    assert.equal(m.restoring.peek(), true, 'siteFound: the site and its country written, the restore still in flight');
    assert.deepEqual(store.country.peek(), { code: 'ES', source: 'location' });
  } finally {
    batch(() => { store.country.value = before.country; store.location.value = before.location; });
  }
});

test('review round 2 (2): one pending lookup from the chunk load through its settle, no gap for Suggest', async () => {
  const load = await import('../src/islands/consortium/views/location/load.ts');
  const { effect } = await import('@preact/signals');
  const seen = [];
  const stop = effect(() => { seen.push(load.lookups.value); });
  try {
    const tick = () => new Promise((r) => setTimeout(r, 5));
    // The old shape, looking(load).then(looking(settle)), drops to 0 between the two.
    await load.looking(tick).then(() => load.looking(tick));
    assert.ok(seen.slice(1, -1).includes(0), 'reproduces: the old chain shows a gap');
    seen.length = 0;
    await load.lookingThrough(tick, tick);
    assert.deepEqual(seen, [1, 0], 'lookingThrough: one lookup from load to settle');
  } finally { stop(); }
  // settleLocation (state/restore.ts), in code (comments left out), not in a comment.
  const code = ['state/restore.ts'].map((f) => new URL(`../src/islands/consortium/${f}`, import.meta.url)).filter((u) => existsSync(u))
    .map((u) => readFileSync(u, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')).join('\n');
  assert.match(code, /lookingThrough\(/, 'settleLocation holds one lookup through load and settle');
});

test('review round 2 (3): a geocoder request unanswered in 15 s fails as an error (a failed search), not as a silent abort', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { geocodingTransport, GEOCODER_TIMEOUT_MS } = await import('../src/lib/location/transport.ts');
  const real = globalThis.fetch;
  globalThis.fetch = (_u, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
  try {
    const caller = new AbortController();
    const p = geocodingTransport('https://example.test/search', caller.signal);
    t.mock.timers.tick(GEOCODER_TIMEOUT_MS);
    await assert.rejects(p, (e) => !(e instanceof DOMException) && /15 s/.test(e.message));
    // The caller's own abort stays an AbortError (a newer search replaced it).
    const c2 = new AbortController();
    const p2 = geocodingTransport('https://example.test/search', c2.signal);
    c2.abort();
    await assert.rejects(p2, (e) => e instanceof DOMException && e.name === 'AbortError');
  } finally { globalThis.fetch = real; }
});

test('review round 3 (1): the Suggest cap is 10 s per press: an earlier press\'s timer never releases a later one', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const m = await import('../src/islands/consortium/state/suggest-wait.ts');
  const store = await import('../src/islands/consortium/store.ts');
  const load = await import('../src/islands/consortium/views/location/load.ts');
  assert.equal(store.pool.peek(), null, 'no plant list read: Suggest stays pending');
  try {
    load.lookups.value = 1;
    m.requestSuggest(); // press during lookup A, t = 0
    load.lookups.value = 0; m.pendingSuggest.value = false; // A settles, the Suggest runs
    t.mock.timers.tick(5000);
    load.lookups.value = 1;
    m.requestSuggest(); // Change site, lookup B, press at t = 5
    t.mock.timers.tick(5000); // t = 10: A's timer, if it were still live
    assert.equal(m.waited.peek(), false, "A's timer does not release B's press");
    t.mock.timers.tick(5000); // t = 15: B's own 10 s
    assert.equal(m.waited.peek(), true, "B's press waits its own 10 s");
  } finally { load.lookups.value = 0; m.pendingSuggest.value = false; }
});

test('review round 3 (2, 3): Start over, Change site and Start empty drop a link\'s lookup (its hold, its line, its later writes) and the "not read" note', async (t) => {
  const m = await import('../src/islands/consortium/state/draft.ts');
  const store = await import('../src/islands/consortium/store.ts');
  const load = await import('../src/islands/consortium/views/location/load.ts');
  const raf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame ??= () => 0; // Start empty opens the search sheet (its focus waits a frame)
  t.after(() => { globalThis.requestAnimationFrame = raf; store.closeSheet(); });
  for (const act of ['startOver', 'changeSite', 'startEmpty']) {
    store.location.value = { lat: 45.75, lon: 4.85, source: 'link', lookup: null };
    void load.lookingThrough(() => new Promise(() => {}), async () => {}); // a link's lookup on a network that never answers
    const id = load.nextLookup?.();
    load.line.value = { state: 'loading' };
    load.unread.value = true;
    m[act]();
    assert.equal(load.lookups.peek(), 0, `${act}: the dead lookup holds no Suggest`);
    assert.equal(load.line.peek(), null, `${act}: no "loading" line left`);
    assert.equal(load.liveLookup(id), false, `${act}: its later answer (or timeout) writes nothing`);
    assert.equal(store.location.peek(), null, act);
    assert.equal(load.unread.peek(), false, `${act}: the "not read" note goes`);
  }
  // The reader's own location stays (only its note goes).
  store.location.value = { lat: 45.75, lon: 4.85, source: 'geo', lookup: null };
  load.unread.value = true;
  m.changeSite();
  assert.equal(store.location.peek()?.source, 'geo');
  assert.equal(load.unread.peek(), false);
  store.location.value = null;
});

test('review round 3 (4): an answered permission prompt leaves the fix to the browser\'s own timeout; an ignored one times out', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const geo = await import('../src/lib/location/geolocation.ts');
  const hadWindow = 'window' in globalThis;
  globalThis.window ??= { isSecureContext: true };
  const realGeo = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
  let pending = null;
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (ok, fail) => { pending = { ok, fail }; } } });
  const status = () => Object.assign(new EventTarget(), { state: 'prompt' });
  try {
    // Answered at 12 s, a fix 9 s later (21 s): the position, not a timeout.
    const s1 = status();
    let got = null;
    void geo.currentPosition(geo.SITE_POSITION_OPTIONS, s1).then((r) => { got = r; });
    t.mock.timers.tick(12_000);
    s1.state = 'granted'; s1.dispatchEvent(new Event('change'));
    t.mock.timers.tick(9_000);
    pending.ok({ coords: { latitude: 45.75, longitude: 4.85 } });
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(got, { lat: 45.75, lon: 4.85 }, 'a 12 s answer and a 9 s fix give the position');
    // Never answered: a timeout once the prompt cap passes, so nothing waits on it forever.
    const s2 = status();
    got = null;
    void geo.currentPosition(geo.SITE_POSITION_OPTIONS, s2).then((r) => { got = r; });
    t.mock.timers.tick(geo.PROMPT_CAP_MS);
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(got, { code: 3 }, 'an ignored prompt ends as a timeout');
    // No Permissions API: the same one cap, which covers a prompt and the browser's 15 s (round 4, 3).
    assert.ok(geo.PROMPT_CAP_MS >= 30_000 + 15_000);
    got = null;
    void geo.currentPosition(geo.SITE_POSITION_OPTIONS, null).then((r) => { got = r; });
    t.mock.timers.tick(geo.PROMPT_CAP_MS - 1_000);
    await new Promise((r) => setImmediate(r));
    assert.equal(got, null, 'no permission signal: still waiting within the cap');
    t.mock.timers.tick(1_000);
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(got, { code: 3 });
  } finally {
    if (realGeo) Object.defineProperty(navigator, 'geolocation', realGeo); else delete navigator.geolocation;
    if (!hadWindow) delete globalThis.window;
  }
});

test('review round 4 (3): a one-time Allow that fires no change event still gets the browser\'s 15 s for the fix; granted at the press: 15 s + 5 s', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const geo = await import('../src/lib/location/geolocation.ts');
  const hadWindow = 'window' in globalThis;
  globalThis.window ??= { isSecureContext: true };
  const realGeo = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
  let pending = null;
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (ok, fail) => { pending = { ok, fail }; } } });
  const flush = () => new Promise((r) => setImmediate(r));
  try {
    // Allowed once at 25 s with no change event (Firefox without Remember, Safari Ask), a fix 10 s later.
    let got = null;
    void geo.currentPosition(geo.SITE_POSITION_OPTIONS, Object.assign(new EventTarget(), { state: 'prompt' })).then((r) => { got = r; });
    t.mock.timers.tick(35_000);
    await flush();
    assert.equal(got, null, 'still waiting at 35 s');
    pending.ok({ coords: { latitude: 45.75, longitude: 4.85 } });
    await flush();
    assert.deepEqual(got, { lat: 45.75, lon: 4.85 });
    // Granted at the press: the browser's 15 s, a backstop 5 s after it.
    got = null;
    void geo.currentPosition(geo.SITE_POSITION_OPTIONS, Object.assign(new EventTarget(), { state: 'granted' })).then((r) => { got = r; });
    t.mock.timers.tick(19_000);
    await flush();
    assert.equal(got, null);
    t.mock.timers.tick(1_000);
    await flush();
    assert.deepEqual(got, { code: 3 });
  } finally {
    if (realGeo) Object.defineProperty(navigator, 'geolocation', realGeo); else delete navigator.geolocation;
    if (!hadWindow) delete globalThis.window;
  }
});

test('review round 4 (1): a lookup replaced while it waits (a prompt nobody answers) lets its hold go at once', async () => {
  const load = await import('../src/islands/consortium/views/location/load.ts');
  const first = load.looking(async () => { load.nextLookup(); await load.unlessReplaced(new Promise(() => {})); });
  assert.equal(load.lookups.peek(), 1);
  await load.looking(async () => { load.nextLookup(); });
  await first;
  assert.equal(load.lookups.peek(), 0, 'the replaced wait ended with its replacement');
  // Dropped (letGo) the same way.
  const held = load.looking(async () => { load.nextLookup(); await load.unlessReplaced(new Promise(() => {})); });
  load.letGo(true);
  await held;
  assert.equal(load.lookups.peek(), 0);
});
