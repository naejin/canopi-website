// The P5 browser specs (P5 commit 0; .local/consortium/v2/p5-owners.md): the user paths and failure
// states of p5-design-check.md §B (location input) and §C (data and UX), one spec per path, each
// named "P5-n (S5x …)" for the stream that owns it and todo for that stream until it builds it (the
// stream then removes its own todos; they must pass). "P5-0… (commit 0 …)" checks the harness and the
// fixtures and runs now. scripts/browser-tests.test.mjs enforces the layout.
//
// No network: Nominatim and OpenFreeMap are stubbed (harness.mjs nominatim / mapTiles), the device
// location is emulated through CDP (geolocation), and any other request off the site is aborted and
// listed in page.thirdParty. The places and what the climate reader answers there are in
// ./location-fixtures.mjs.
//
// The page contract the specs read (the streams implement it; marks already render data-mark):
// - S5b: [data-location-action="geo" | "search" | "map"] controls, input[data-location-search], the
//   result line [data-location-state] ("ready", "denied", "timeout", "unavailable", "no-result",
//   "offline", "sea", "coast", "polar", "borderline", "failed"), [data-location-privacy] beside each
//   control (in the same parent), the suggested climate card checked through store.proposedClimate and
//   committed by [data-location-confirm] (owner answer 1), the map dialog [data-location-map] with [data-location-use-centre] (the test hook gains
//   mapCentre({ lat, lon }) to move it), the share tick input[data-share-location], and
//   store.country.value.source 'location' (never in a link without the tick: owner answer 5);
// - S5c: [data-mark="edge" | "outside" | "estimate" | "unknown"] (views/PlantMarks.tsx), the empty
//   pool [data-pool-empty], borrowed lists through views/PoolSlot.tsx;
// - S5d: [data-future-summary], [data-future="not-checked"] (views/FutureSlot.tsx);
// - S5e: [data-native="native" | "not_recorded" | "unknown"] in Details (views/NativeSlot.tsx), [data-likely="soil"] with its
//   "Use it" button [data-likely-use];
// - S5f: /privacy/ in every locale, the footer link to it, the /data-sources/ credits [data-credit].
// Headless Chrome on dist-test, capped:
//   timeout 3000 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 npm run test:browser
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, startHarness } from './harness.mjs';
import { aria, has, realDb } from './helpers.mjs';
import { EXPECTED, NOMINATIM, SITES, lookupAt } from './location-fixtures.mjs';
import { encodeLink } from '../../src/lib/consortium/state.ts';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

// The tool, loaded, with the test hook (store access) unless hook is false. Map tiles are stubbed for
// every spec (any other third-party request is aborted and listed in page.thirdParty); hash is a link.
async function tool({ lang = 'en', hook = true, width = 1280, mapTiles = 'stub', hash = '', ...opts } = {}) {
  const page = await h.open(`${lang === 'en' ? '' : `/${lang}`}/consortium/${hash}`, { width, mapTiles, ...opts });
  if (hook) {
    await page.evaluateOnNewDocument(() => { window.__ctTest = true; });
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  assert.equal(await loadState(page), 'ready');
  if (hook) assert.ok(await page.waitForFunction(() => window.__ctTest?.store?.source.value, { timeout: 20_000 }).then(() => true, () => false), 'no test hook: build with npm run build:browser-test');
  return page;
}
// Sets store.location as S5b would after a lookup (S5c–S5e specs need no location UI).
async function atSite(page, name, over = {}) {
  const [lat, lon] = SITES[name];
  const lookup = { ...(await lookupAt(lat, lon)), ...over };
  await page.evaluate((loc) => { window.__ctTest.store.location.value = loc; }, { lat, lon, source: 'map', label: name, lookup });
  return lookup;
}
// The store's climate and pool, as the matrix would show them.
async function choose(page, climate) {
  const ok = await page.evaluate(async (c) => {
    const { store } = window.__ctTest;
    store.climate.value = c;
    return store.loadPool(c);
  }, climate);
  assert.ok(ok, `the ${climate} pool loads`);
}
const LOCATION_UI = 'S5b: the start step has no "Where is your site?" controls (LocationSlot renders nothing)';
async function locationControls(page) {
  assert.ok(await has(page, '[data-location-action="geo"]', 4000), LOCATION_UI);
}
async function locationState(page, timeout = 15_000) {
  await page.waitForSelector('[data-location-state]:not([data-location-state="loading"])', { timeout }).catch(() => {});
  return page.$eval('[data-location-state]', (e) => e.getAttribute('data-location-state')).catch(() => null);
}
const text = (page, sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
const checkedCard = (page) => page.$eval('input[name="ct-climate"]:checked', (e) => e.value).catch(() => null);
// The card a location suggests: shown as proposed (review round 1, 6), never as a checked radio.
const proposedCard = (page) => page.$eval('[data-proposed] input[name="ct-climate"]', (e) => e.value).catch(() => null);
const savedLocation = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('canopi-location') ?? 'null'));
// After page.goto, loadState's wait can end with the navigation (a destroyed context) before the page
// settles, so it is asked again until ready or 20 s.
const ready = async (page) => {
  let st = 'loading';
  for (const end = Date.now() + 20_000; st !== 'ready' && Date.now() < end;) { st = await loadState(page, 5000); if (st !== 'ready') await new Promise((r) => setTimeout(r, 250)); }
  assert.equal(st, 'ready');
  assert.ok(await page.waitForFunction(() => window.__ctTest?.store?.source.value, { timeout: 20_000 }).then(() => true, () => false));
};
const storeClimate = (page) => page.evaluate(() => window.__ctTest.store.climate.value);
// The result line ready, the suggested card confirmed (owner answer 1), then a consortium in the matrix
// and its Share panel open (S5b: the panel opens on its button; the specs read its field).
async function confirmAndSuggest(page) {
  await page.click('[data-location-confirm]');
  await page.evaluate(async () => { const { store } = window.__ctTest; await store.loadPool(store.climate.value); store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await has(page, '.ct-action-row button', 10_000), 'the matrix\'s actions');
  // The future panel (S5d, views/FutureSlot.tsx; idle, about 150 ms after the matrix) mounts above the
  // action row and pushes Share down by ~720 px: clicking before it lands can hit a tick Puppeteer had
  // scrolled into view a frame earlier ("Node is either not clickable"; P5-13b/13d flake, 2026-11-11).
  assert.ok(await has(page, '[data-future]', 10_000), 'the future panel has landed');
  await page.click('.ct-action-row button');
  assert.ok(await has(page, '#ct-share-field', 10_000), 'the Share panel');
}
const search = async (page, q) => {
  await page.type('input[data-location-search]', q);
  await page.keyboard.press('Enter');
};

// ---- commit 0: the harness and the fixtures (these run) ----

test('P5-0a (commit 0 fixtures): the reader on the built tiles answers each site as the specs expect', async () => {
  for (const [name, want] of Object.entries(EXPECTED)) {
    const l = await lookupAt(...SITES[name]);
    const p = l.climate?.periods[0];
    if ('climate' in want) assert.equal(l.climate, want.climate, name);
    if (want.koppen) assert.equal(p?.koppen, want.koppen, name);
    if (want.tmeanWarmC !== undefined) assert.equal(p?.tmeanWarmC, want.tmeanWarmC, name);
    if (want.distanceCells !== undefined) assert.equal(l.climate?.distanceCells, want.distanceCells, name);
    if ('soil' in want) assert.equal(l.soil, want.soil, name);
    if (want.ph !== undefined) assert.equal(l.soil?.phH2o, want.ph, name);
    assert.equal(l.regions.wgsrpdL3, want.l3, `${name} level 3`);
    assert.equal(l.regions.isoA2, want.iso, `${name} country`);
  }
});

test('P5-0b (commit 0 harness): geolocation granted, denied, unavailable and timeout reach the page as the browser reports them', async () => {
  const ask = (page) => page.evaluate(() => new Promise((resolve) => navigator.geolocation.getCurrentPosition(
    (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }), (e) => resolve({ code: e.code }), { timeout: 800, maximumAge: 600_000, enableHighAccuracy: false })));
  const [lat, lon] = SITES.lyon;
  assert.deepEqual(await ask(await tool({ hook: false, geolocation: { lat, lon } })), { lat, lon });
  assert.deepEqual(await ask(await tool({ hook: false, geolocation: 'denied' })), { code: 1 });
  assert.deepEqual(await ask(await tool({ hook: false, geolocation: 'unavailable' })), { code: 2 });
  assert.deepEqual(await ask(await tool({ hook: false, geolocation: 'timeout' })), { code: 3 });
});

test('P5-0c (commit 0 harness): Nominatim and OpenFreeMap are stubbed, WebGL can be off, climate tiles can fail, nothing else leaves the site', async () => {
  const page = await tool({ hook: false, nominatim: 'fixture', mapTiles: 'stub', webgl: false, climateTiles: 404 });
  const seen = await page.evaluate(async () => {
    const json = async (u) => (await fetch(u)).json();
    const status = async (u) => (await fetch(u)).status;
    const fails = async (u) => fetch(u).then(() => false, () => true);
    const tile = '/data/climate/stub/tiles/n50e000.tif';
    return {
      lyon: (await json('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=Lyon'))[0]?.name,
      none: await json('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=Nowhereville'),
      style: (await json('https://tiles.openfreemap.org/styles/positron')).version,
      tileStatus: await status('https://tiles.openfreemap.org/planet/20250101/0/0/0.pbf'),
      webgl: document.createElement('canvas').getContext('webgl2'),
      canvas2d: !!document.createElement('canvas').getContext('2d'),
      climateTile: await status(tile),
      elsewhere: await fails('https://example.org/'),
    };
  });
  assert.deepEqual(seen, { lyon: 'Lyon', none: [], style: 8, tileStatus: 204, webgl: null, canvas2d: true, climateTile: 404, elsewhere: true });
  assert.equal(page.nominatim.length, 2);
  assert.deepEqual(page.thirdParty, ['https://example.org/']);
  assert.ok(NOMINATIM.lyon[0].display_name.includes('France'));
  const offline = await tool({ hook: false, nominatim: 'offline', mapTiles: 'offline' });
  assert.deepEqual(await offline.evaluate(async () => [
    await fetch('https://nominatim.openstreetmap.org/search?q=Lyon').then(() => 'ok', () => 'failed'),
    await fetch('https://tiles.openfreemap.org/styles/positron').then(() => 'ok', () => 'failed'),
  ]), ['failed', 'failed']);
});

test('P5-0d (commit 0 seams): without a location, on a covered climate, no range, future or native mark shows, marks render only through PlantMarks, and nothing calls a third party before a click (S5b: its controls show, nothing fetched)', async () => {
  const page = await tool({ nominatim: 'fixture', mapTiles: 'stub' });
  assert.ok(await has(page, '[data-location-action="search"], [data-location-search]', 4000), 'S5b: the location controls show');
  assert.deepEqual(await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /maplibre|\/data\/climate\//.test(n))), [], 'no MapLibre and no climate tile before a click');
  await choose(page, 'Temperate');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await page.waitForFunction(() => document.querySelectorAll('[data-plant-id]').length > 0, { timeout: 10_000 }).then(() => true, () => false), 'members in the matrix');
  const marks = () => page.$$eval('[data-mark]', (els) => els.map((e) => ({ kind: e.getAttribute('data-mark'), surface: e.getAttribute('data-mark-surface') })));
  const promised = (list) => list.filter((m) => ['outside', 'edge', 'future', 'native'].includes(m.kind));
  assert.deepEqual(promised(await marks()), [], 'no range, future or native mark without a location');
  assert.deepEqual(await page.evaluate(() => window.__ctTest.store.markProviders.value.length), 0, 'the providers do not even load without a location on a covered climate');
  // With a location the providers load; whatever marks they give carry a PlantMarks surface.
  await atSite(page, 'lyon');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.markProviders.value.length === 3, { timeout: 10_000 }).then(() => true, () => false), 'the providers load for a location');
  for (const m of await marks()) assert.ok(['chip', 'row', 'add', 'details'].includes(m.surface), `the ${m.kind} mark is drawn by PlantMarks on a surface`);
  assert.deepEqual(page.thirdParty, []);
  assert.deepEqual(page.nominatim, []);
});

// ---- S5b: Where is your site? ----

test('P5-1 (S5b location granted): "Use my location" fills the result line and the climate card from the reader', async () => {
  const [lat, lon] = SITES.seville;
  const page = await tool({ geolocation: { lat, lon } });
  await locationControls(page);
  assert.ok(await page.$eval('[data-location-action="geo"]', (b) => !!b.parentElement.querySelector(':scope > [data-location-privacy]')), 'a privacy line beside the button, in its own parent');
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'ready');
  const loc = await page.evaluate(() => window.__ctTest.store.location.value);
  assert.equal(loc.source, 'geo');
  assert.equal(loc.lookup.climate.periods[0].koppen, 'Csa');
  assert.equal(await proposedCard(page), 'mediterranean', 'the Mediterranean card is shown as proposed');
  assert.equal(await checkedCard(page), null, 'not as a checked radio (review round 1, 6)');
  assert.equal(await storeClimate(page), null, 'and not chosen until the reader confirms (owner answer 1)');
  await page.click('[data-location-confirm]');
  assert.equal(await storeClimate(page), 'Mediterranean');
  assert.equal(await page.evaluate(() => window.__ctTest.store.country.value.source), 'location', 'the country "from your location"');
});
test('P5-1b (S5b review round 1, 6): clicking the proposed card confirms it, like the "Use" button', async () => {
  const page = await tool({ geolocation: { lat: SITES.seville[0], lon: SITES.seville[1] } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'ready');
  await page.click('[data-proposed]');
  assert.equal(await storeClimate(page), 'Mediterranean', 'the click chose it');
  assert.equal(await checkedCard(page), 'mediterranean');
  assert.equal(await page.$('[data-location-confirm]'), null, 'nothing left to confirm');
});
test('P5-1c (S5b review round 1, 4): a lookup ending while a pasted link restores is not a reader action: the link still opens', async () => {
  const maker = await tool();
  await choose(maker, 'Temperate');
  await maker.evaluate(() => { window.__ctTest.store.suggestMembers(); window.__ctTest.store.view.value = 'matrix'; });
  assert.ok(await maker.waitForFunction(() => /[#&]v=4/.test(location.hash) && /[#&]a=[^&]/.test(location.hash), { timeout: 10_000 }).then(() => true, () => false), 'the address holds the consortium');
  const link = await maker.evaluate(() => location.hash);
  const page = await tool({ geolocation: { lat: SITES.seville[0], lon: SITES.seville[1] } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  await page.evaluate((l) => { location.hash = l; }, link);
  assert.equal(await locationState(page), 'ready', 'the lookup ends');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.climate.value === 'Temperate' && window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'the link restored');
});

test('P5-1d (S5b review round 1 addendum): Suggest pressed while a location lookup is pending waits for it, so the range filter sees the site', async () => {
  const page = await h.open('/consortium/', { mapTiles: 'stub', geolocation: { lat: SITES.seville[0], lon: SITES.seville[1] } });
  // Slow climate tiles: every /data/climate/ fetch waits 3 s.
  await page.evaluateOnNewDocument(() => {
    window.__ctTest = true;
    const f = window.fetch;
    window.fetch = (input, init) => (/\/data\/climate\//.test(String(input?.url ?? input)) ? new Promise((r) => setTimeout(r, 3000)).then(() => f(input, init)) : f(input, init));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.click('input[name="ct-climate"][value="mediterranean"]');
  assert.ok(await has(page, '.ct-cta .button-primary', 15_000), 'Suggest shows');
  await page.evaluate(() => { const { store } = window.__ctTest; window.__firstMembers = undefined; store.members.subscribe((m) => { if (m.length && window.__firstMembers === undefined) window.__firstMembers = !!store.location.peek()?.lookup; }); });
  await page.click('[data-location-action="geo"]');
  await page.click('.ct-cta .button-primary');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 20_000 }).then(() => true, () => false), 'the suggestion comes');
  assert.equal(await page.evaluate(() => window.__firstMembers), true, 'members were built only once the site was read');
});
// A page whose /data/climate/ fetches wait `ms` (Infinity: never answer), optionally with a saved location.
async function slowTiles(ms, { saved = null, geolocation = { lat: SITES.seville[0], lon: SITES.seville[1] } } = {}) {
  const page = await h.open('/consortium/', { mapTiles: 'stub', geolocation });
  await page.evaluateOnNewDocument((wait, rec) => {
    window.__ctTest = true;
    if (rec && !localStorage.getItem('canopi-location')) localStorage.setItem('canopi-location', rec);
    const f = window.fetch;
    window.fetch = (input, init) => (/\/data\/climate\//.test(String(input?.url ?? input))
      ? (wait === null ? new Promise(() => {}) : new Promise((r) => setTimeout(r, wait)).then(() => f(input, init)))
      : f(input, init));
  }, Number.isFinite(ms) ? ms : null, saved);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  return page;
}
const watchFirstMembers = (page) => page.evaluate(() => { const { store } = window.__ctTest; window.__firstMembers = undefined; store.members.subscribe((m) => { if (m.length && window.__firstMembers === undefined) window.__firstMembers = !!store.location.peek()?.lookup; }); });
test('P5-1e (S5b review round 2, 2): Suggest pressed while the saved location is looked up again waits for the site', async () => {
  const page = await slowTiles(3000, { saved: JSON.stringify({ lat: SITES.seville[0], lon: SITES.seville[1], source: 'geo' }) });
  await page.click('input[name="ct-climate"][value="mediterranean"]');
  assert.ok(await has(page, '.ct-cta .button-primary', 15_000));
  await watchFirstMembers(page);
  await page.click('.ct-cta .button-primary');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 20_000 }).then(() => true, () => false));
  assert.equal(await page.evaluate(() => window.__firstMembers), true, 'members built once the saved site was read');
});
test('P5-1f (S5b review round 2, 3): tiles that never answer hold Suggest at most ~10 s, which then says the climate was not read; the read fails after ~15 s', async () => {
  const page = await slowTiles(Infinity);
  await page.click('input[name="ct-climate"][value="mediterranean"]');
  assert.ok(await has(page, '.ct-cta .button-primary', 15_000));
  await page.click('[data-location-action="geo"]');
  const t0 = Date.now();
  await page.click('.ct-cta .button-primary');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 14_000 }).then(() => true, () => false), 'Suggest ran within the cap');
  assert.ok(Date.now() - t0 >= 8000, 'after waiting for the site first');
  assert.ok(await has(page, '[data-location-unread]', 4000), 'a line says the climate was not read');
  assert.ok(await page.waitForFunction(() => document.querySelector('[data-location-state]')?.getAttribute('data-location-state') === 'failed', { timeout: 15_000 }).then(() => true, () => false), 'the stalled read ends as failed');
  assert.equal(await page.$('[data-location-unread]'), null, 'review round 3 (3): the failed line replaces the "not read" note');
});
test('P5-1g (S5b review round 4, 1): a "Use my location" left at its permission prompt and replaced by a search holds nothing: Suggest runs at once, no "not read"', async () => {
  const page = await tool({ nominatim: 'fixture' });
  // A prompt nobody answers: the position never comes, the permission stays "prompt".
  await page.evaluateOnNewDocument(() => {
    Geolocation.prototype.getCurrentPosition = function () {};
    const q = Permissions.prototype.query;
    Permissions.prototype.query = function (d) { return d?.name === 'geolocation' ? Promise.resolve(Object.assign(new EventTarget(), { state: 'prompt', name: 'geolocation' })) : q.call(this, d); };
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  await search(page, 'Seville');
  assert.equal(await locationState(page), 'ready', 'Seville read');
  await page.click('[data-location-confirm]');
  assert.ok(await has(page, '.ct-cta .button-primary', 15_000));
  const t0 = Date.now();
  await page.click('.ct-cta .button-primary');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 8000 }).then(() => true, () => false), 'Suggest ran');
  assert.ok(Date.now() - t0 < 5000, `at once, not after the 10 s cap (${Date.now() - t0} ms)`);
  assert.equal(await page.$('[data-location-unread]'), null, 'Seville was read: no "not read" note');
});
test('P5-13d (S5b review round 3, 2): Start over drops a link\'s lookup on a stalled network: no loading line, no later "failed", no Suggest hold', async () => {
  const [lat, lon] = SITES.seville;
  const maker = await tool({ geolocation: { lat, lon } });
  await locationControls(maker);
  await maker.click('[data-location-action="geo"]');
  assert.equal(await locationState(maker), 'ready');
  await confirmAndSuggest(maker);
  await maker.waitForSelector('input[data-share-location]', { visible: true, timeout: 10_000 });
  await maker.click('input[data-share-location]');
  const link = new URL(await maker.$eval('#ct-share-field', (e) => e.value));
  const page = await slowTiles(Infinity);
  await page.evaluate((hash) => { location.hash = hash; }, link.hash);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.location.value?.source === 'link' && window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'the link opens, its lookup stalled');
  assert.ok(await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Start over'); b?.click(); return !!b; }));
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.view.value === 'start', { timeout: 5000 }).then(() => true, () => false));
  assert.equal(await page.$('[data-location-state]'), null, 'no "loading" line left on Start');
  // Past the read's 15 s timeout: the dead lookup writes nothing.
  await new Promise((r) => setTimeout(r, 16_000));
  assert.equal(await page.$('[data-location-state]'), null, 'no later "failed" line');
  // Suggest is not held by it.
  await page.click('input[name="ct-climate"][value="mediterranean"]');
  assert.ok(await has(page, '.ct-cta .button-primary', 15_000));
  const t0 = Date.now();
  await page.click('.ct-cta .button-primary');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0 && window.__ctTest.store.view.value === 'matrix', { timeout: 8000 }).then(() => true, () => false), 'Suggest runs at once');
  assert.ok(Date.now() - t0 < 8000);
});
test('P5-2 (S5b location denied): a denied permission says so and leaves the manual climate cards', async () => {
  const page = await tool({ geolocation: 'denied' });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'denied');
  assert.equal(await page.evaluate(() => window.__ctTest.store.location.value), null);
  assert.ok(await has(page, '.ct-climates input, .ct-climates button'), 'the climate cards stay');
  assert.equal(await checkedCard(page), null, 'no card pre-checked');
  assert.equal(await proposedCard(page), null, 'no card pre-checked: none proposed either');
});

test('P5-3 (S5b location timeout): a location that never comes ends in "timeout", with search and map offered', async () => {
  const page = await tool({ geolocation: 'timeout' });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page, 30_000), 'timeout');
  assert.ok(await has(page, 'input[data-location-search]'));
  const unavailable = await tool({ geolocation: 'unavailable' });
  await locationControls(unavailable);
  await unavailable.click('[data-location-action="geo"]');
  assert.equal(await locationState(unavailable), 'unavailable');
});

test('P5-4 (S5b search hit): Enter searches Nominatim once, in the page language, without email; the place sets the site', async () => {
  const page = await tool({ lang: 'fr', nominatim: 'fixture' });
  await locationControls(page);
  assert.equal(page.nominatim.length, 0, 'nothing is sent before the reader asks');
  await search(page, 'Lyon');
  assert.equal(await locationState(page), 'borderline', 'Lyon is Cfa 0.4 °C from Cfb: borderline');
  assert.equal(page.nominatim.length, 1, 'one request, on Enter only');
  const url = new URL(page.nominatim[0].url);
  assert.equal(url.searchParams.get('accept-language'), 'fr');
  assert.equal(url.searchParams.get('limit'), '5');
  assert.equal(url.searchParams.has('email'), false);
  assert.match(await text(page, '.ct-location') ?? '', /Nominatim.*OpenStreetMap/);
  assert.equal((await page.evaluate(() => window.__ctTest.store.location.value)).source, 'search');
});

test('P5-4b (S5b review round 1, 3): Enter while an input method is composing (ja, zh, ko) never searches', async () => {
  const page = await tool({ lang: 'ja', nominatim: 'fixture' });
  await locationControls(page);
  await page.type('input[data-location-search]', 'Lyon');
  await page.$eval('input[data-location-search]', (i) => {
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }));
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true }));
  });
  await new Promise((r) => setTimeout(r, 1500));
  assert.deepEqual(page.nominatim, [], 'composition Enter is not a search');
  assert.equal(await page.$('[data-location-state]'), null);
  await page.keyboard.press('Enter');
  assert.equal(await locationState(page), 'borderline', 'a plain Enter still searches');
  assert.equal(page.nominatim.length, 1);
});
test('P5-5 (S5b search no result / offline): an unknown place and an offline search each say so, nothing changed', async () => {
  const page = await tool({ nominatim: 'fixture' });
  await locationControls(page);
  await search(page, 'Nowhereville');
  assert.equal(await locationState(page), 'no-result');
  const offline = await tool({ nominatim: 'offline' });
  await locationControls(offline);
  await search(offline, 'Lyon');
  assert.equal(await locationState(offline), 'offline');
  assert.equal(await offline.evaluate(() => window.__ctTest.store.location.value), null);
});

test('P5-6 (S5b map pick and ocean click): "Use the map centre" sets the site; the open sea asks for a point on land', async () => {
  const page = await tool({ mapTiles: 'stub' });
  await locationControls(page);
  await page.click('[data-location-action="map"]');
  assert.ok(await has(page, '[data-location-map] canvas', 10_000), 'the map dialog draws');
  const pick = async (lat, lon) => {
    assert.ok(await page.evaluate((c) => (window.__ctTest.mapCentre ? (window.__ctTest.mapCentre(c), true) : false), { lat, lon }), 'the test hook moves the map (S5b adds mapCentre to test-hook.ts)');
    await page.click('[data-location-use-centre]');
  };
  await pick(...SITES.ocean);
  assert.equal(await locationState(page), 'sea');
  await pick(...SITES.seville);
  assert.equal(await locationState(page), 'ready');
  assert.equal((await page.evaluate(() => window.__ctTest.store.location.value)).source, 'map');
  assert.ok(page.thirdParty.every((u) => !u.includes('openfreemap')), 'map requests go to the stub');
  // Review round 1 (5): the dialog closes as Escape would, and focus goes back to the map button.
  const focusBack = () => page.waitForFunction(() => !document.querySelector('[data-location-map]') && document.activeElement?.getAttribute('data-location-action') === 'map', { timeout: 5000 }).then(() => true, () => false);
  assert.ok(await focusBack(), '"Use the map centre" closes the dialog and returns focus to the map button');
  await page.click('[data-location-action="map"]');
  assert.ok(await has(page, '[data-location-map] canvas', 10_000));
  await page.click('[data-location-close]');
  assert.ok(await focusBack(), 'Close returns focus to the map button');
  await page.click('[data-location-action="map"]');
  assert.ok(await has(page, '[data-location-map] canvas', 10_000));
  await page.keyboard.press('Escape');
  assert.ok(await focusBack(), 'Escape returns focus to the map button');
});
test('P5-7c (S5b review round 1, 7): the WebGL probe runs once, outside the result head, and releases its context', async () => {
  const page = await h.open('/consortium/', { mapTiles: 'stub', geolocation: { lat: SITES.seville[0], lon: SITES.seville[1] } });
  await page.evaluateOnNewDocument(() => {
    window.__ctTest = true;
    window.__gl = [];
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
      const c = get.call(this, kind, ...rest);
      if (/webgl/.test(kind) && c && !this.isConnected) window.__gl.push(c);
      return c;
    };
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'ready');
  await confirmAndSuggest(page);
  assert.ok(await has(page, '.ct-result-head [data-location-state], [data-location-state]', 10_000));
  const gl = await page.evaluate(() => window.__gl.map((c) => c.isContextLost()));
  assert.equal(gl.length, 1, 'one probe, though the result head shows the location line too');
  assert.deepEqual(gl, [true], 'its context released (WEBGL_lose_context)');
});

test('P5-7 (S5b no WebGL): without WebGL the map button is hidden, search and location stay', async () => {
  const page = await tool({ webgl: false });
  await locationControls(page);
  assert.equal(await page.$('[data-location-action="map"]'), null);
  assert.ok(await has(page, 'input[data-location-search]'));
});
test('P5-7b (S5b review round 1, 10): without the Geolocation API "Use my location" is hidden, search stays', async () => {
  const page = await h.open('/consortium/', { mapTiles: 'stub' });
  await page.evaluateOnNewDocument(() => { window.__ctTest = true; delete Navigator.prototype.geolocation; });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  assert.ok(await has(page, 'input[data-location-search]', 4000), 'search shows');
  assert.equal(await page.$('[data-location-action="geo"]'), null, 'no location button');
});

test('P5-8 (S5b coast): a point offshore takes the nearest cell\'s climate and says there is no country or soil there', async () => {
  const [lat, lon] = SITES.coast;
  const page = await tool({ geolocation: { lat, lon } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'coast');
  assert.equal(await proposedCard(page), 'temperate', 'Cfb from the nearest cell, proposed');
  assert.equal(await storeClimate(page), null, 'not chosen until confirmed');
  const c = await page.evaluate(() => window.__ctTest.store.country.value);
  assert.notEqual(c.source, 'location', 'no country from the location offshore');
  assert.ok(c.code === null || c.source !== 'location', 'no country offshore');
});

test('P5-9 (S5b polar): an ET site has its own state, no curated list claimed', async () => {
  const [lat, lon] = SITES.polar;
  const page = await tool({ geolocation: { lat, lon } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'polar');
  assert.equal(await storeClimate(page), null, 'no climate chosen');
  assert.equal(await checkedCard(page), null, 'no curated card claimed');
});

test('P5-10 (S5b borderline, UX audit fix 2): Lyon pre-selects Subtropical, says "between Subtropical and Temperate", and applies nothing until confirmed', async () => {
  const [lat, lon] = SITES.lyon;
  const page = await tool({ geolocation: { lat, lon } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'borderline');
  assert.equal(await proposedCard(page), 'subtropical', 'the class\'s own climate is pre-selected (proposed)');
  const text = await page.$eval('[data-location-state]', (e) => e.textContent);
  assert.match(text, /Between Subtropical and Temperate/, 'both names, in plain words');
  assert.match(text, /we picked Subtropical/i);
  assert.match(text, /Cfa/, 'the Köppen code stays in the line');
  assert.equal(await checkedCard(page), null, 'proposed, not checked');
  assert.equal(await storeClimate(page), null, 'nothing applied until confirmed');
  assert.equal(await page.evaluate(() => window.__ctTest.store.country.value?.source ?? null), 'location', 'the country from the location (quiet), as for a clear site');
  assert.ok(await has(page, '.ct-climates'), 'the cards stay open');
  assert.equal(await page.$$eval('input[name="ct-climate"]', (r) => r.filter((x) => !x.disabled).length), await page.$$eval('input[name="ct-climate"]', (r) => r.length), 'every other card one tap away');
  await page.click('input[name="ct-climate"][value="temperate"]');
  assert.equal(await storeClimate(page), 'Temperate', 'the other climate, one tap');
  assert.equal(await proposedCard(page), null);
  // Review round 4 (2): with nothing proposed, the line no longer says "we picked".
  const after = await page.$eval('[data-location-state]', (e) => e.textContent);
  assert.doesNotMatch(after, /we picked/i, 'no "we picked" once no card is proposed');
  assert.match(after, /Between Subtropical and Temperate: check that your climate is right/);
  // Confirming the pre-selected card instead.
  const other = await tool({ geolocation: { lat, lon } });
  await locationControls(other);
  await other.click('[data-location-action="geo"]');
  assert.equal(await locationState(other), 'borderline');
  await other.click('[data-location-confirm]');
  assert.equal(await storeClimate(other), 'Subtropical', 'confirmed by the reader');
  const calm = await tool({ geolocation: { lat: SITES.seville[0], lon: SITES.seville[1] } });
  await locationControls(calm);
  await calm.click('[data-location-action="geo"]');
  assert.equal(await locationState(calm), 'ready', 'Seville is not borderline');
  assert.equal(await proposedCard(calm), 'mediterranean', 'proposed');
  assert.doesNotMatch(await calm.$eval('[data-location-state]', (e) => e.textContent), /Between/, 'a clear site names one climate');
  assert.equal(await storeClimate(calm), null, 'not committed until confirmed');
});

test('P5-10b (S5b review round 2, 5): with a card proposed and none checked, Tab lands on it; arrows move without choosing; Space chooses', async () => {
  const page = await tool({ geolocation: { lat: SITES.seville[0], lon: SITES.seville[1] } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'ready');
  // From the last control before the cards (the result line's Forget), Tab enters the card group.
  await page.evaluate(() => [...document.querySelectorAll('.ct-location button')].at(-1).focus());
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('value')), 'mediterranean', 'Tab lands on the proposed card');
  await page.keyboard.press('ArrowRight');
  const moved = await page.evaluate(() => document.activeElement?.getAttribute('value'));
  assert.ok(moved && moved !== 'mediterranean', 'the arrow moves the focus');
  assert.equal(await storeClimate(page), null, 'without choosing');
  assert.equal(await checkedCard(page), null);
  await page.keyboard.press('Space');
  assert.equal(await checkedCard(page), moved, 'Space chooses the focused card');
  assert.notEqual(await storeClimate(page), null);
});
test('P5-11 (S5b tiles fail): when the climate tiles cannot be read the manual climate stays, with a line saying so', async () => {
  const [lat, lon] = SITES.seville;
  const page = await tool({ geolocation: { lat, lon }, climateTiles: 404 });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'failed');
  assert.equal((await page.evaluate(() => window.__ctTest.store.location.value))?.lookup ?? null, null);
  assert.ok(await has(page, '.ct-climates'));
  assert.equal(await checkedCard(page), null, 'no card pre-checked');
  assert.equal(await proposedCard(page), null, 'no card pre-checked: none proposed either');
});

test('P5-12 (S5b share without the tick): a link never carries the location, nor its country, unless asked', async () => {
  const [lat, lon] = SITES.seville;
  const page = await tool({ geolocation: { lat, lon } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'ready');
  await confirmAndSuggest(page);
  assert.equal(await page.evaluate(() => window.__ctTest.store.country.value.source), 'location');
  assert.ok(await has(page, 'input[data-share-location]', 10_000), 'the "include my location" tick');
  assert.equal(await page.$eval('input[data-share-location]', (e) => e.checked), false);
  const link = await page.$eval('#ct-share-field', (e) => e.value);
  assert.doesNotMatch(link, /[?&#]o=/, 'no o=');
  assert.doesNotMatch(link, /[?&#]k=/, 'no k=: the country from the location stays on the device (owner answer 5)');
  assert.doesNotMatch(await page.evaluate(() => location.hash), /[?&#]k=/, 'nor in the address bar');
});

test('P5-13 (S5b share with "include my location"): the link carries the cell centre only, and opens as "from the shared link, approximate"', async () => {
  const [lat, lon] = SITES.seville;
  const page = await tool({ geolocation: { lat, lon } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'ready');
  await confirmAndSuggest(page);
  await page.click('input[data-share-location]');
  const link = await page.$eval('#ct-share-field', (e) => e.value);
  const o = link.match(/[?&#]o=(-?[\d.]+),(-?[\d.]+)/);
  assert.ok(o, 'o= in the link');
  assert.match(link, /[?&#]k=ES(&|$)/, 'and k=, with the tick');
  const cell = (await lookupAt(lat, lon)).climate;
  assert.deepEqual([Number(o[1]), Number(o[2])], [cell.cellLat, cell.cellLon], 'the cell centre, not the device position');
  const opened = await h.open(new URL(link).pathname + new URL(link).search + new URL(link).hash);
  assert.equal(await loadState(opened), 'ready');
  assert.match(await text(opened, '[data-location-state]') ?? '', /approximate/i);
});
test('P5-13c (S5b review round 2, 4): a link\'s location goes with its consortium: Start over and Change site clear it', async () => {
  const [lat, lon] = SITES.seville;
  const maker = await tool({ geolocation: { lat, lon } });
  await locationControls(maker);
  await maker.click('[data-location-action="geo"]');
  assert.equal(await locationState(maker), 'ready');
  await confirmAndSuggest(maker);
  await maker.waitForSelector('input[data-share-location]', { visible: true, timeout: 10_000 });
  await maker.click('input[data-share-location]');
  const link = new URL(await maker.$eval('#ct-share-field', (e) => e.value));
  for (const label of ['Start over', 'Change site']) {
    const page = await tool({ hash: link.hash });
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.location.value?.source === 'link' && window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'the link opens with its location');
    assert.ok(await page.evaluate((l) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === l); b?.click(); return !!b; }, label), label);
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.location.value === null, { timeout: 5000 }).then(() => true, () => false), `${label} clears the link's location`);
  }
});
test('P5-13b (S5b review round 1, 1 and 2): a link\'s o= lives for the page only: never saved, never a country "from your location"; a link without o= clears it and the reader\'s own site returns', async () => {
  const [lat, lon] = SITES.seville;
  const page = await tool({ geolocation: { lat, lon } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'ready');
  await confirmAndSuggest(page);
  await page.click('input[data-share-location]');
  const link = new URL(await page.$eval('#ct-share-field', (e) => e.value));
  const mine = await savedLocation(page);
  assert.deepEqual([mine.lat, mine.lon, mine.source], [lat, lon, 'geo'], 'the reader\'s own location is saved');
  // The same device opens a link with o= and no k= (someone else's site).
  const other = `${link.pathname}#${link.hash.slice(1).replace(/&k=[A-Z]{2}/, '').replace(/o=[^&]+/, 'o=45.75,4.85')}`;
  await page.goto(`${new URL(page.url()).origin}${other}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await locationState(page);
  assert.match(await text(page, '[data-location-state]') ?? '', /approximate/i);
  assert.equal((await page.evaluate(() => window.__ctTest.store.location.value)).source, 'link');
  assert.deepEqual(await savedLocation(page), mine, 'the reader\'s saved location is untouched');
  assert.notDeepEqual(await page.evaluate(() => window.__ctTest.store.country.value), { code: 'FR', source: 'location' }, 'no country "from your location" from the link\'s cell (Lyon, FR); the reader\'s own may stay');
  // A link without o= pasted into the tab: the link's location goes, with its line, and the reader's
  // own saved site comes back, as a fresh open of that link gives (seam review 5).
  await page.evaluate((h) => { location.hash = h; }, link.hash.replace(/&o=[^&]+/, ''));
  assert.ok(await page.waitForFunction((a, b) => { const l = window.__ctTest.store.location.value; return l?.lookup && l.lat === a && l.lon === b && l.source === 'geo'; }, { timeout: 15_000 }, lat, lon).then(() => true, () => false), 'the link\'s location replaced by the reader\'s own');
  await locationState(page);
  assert.doesNotMatch(await text(page, '[data-location-state]') ?? '', /approximate/i, 'no stale "from the shared link" line');
  // A later plain visit: the reader's own site again.
  await page.goto(`${new URL(page.url()).origin}/consortium/`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  assert.ok(await page.waitForFunction((a, b) => { const l = window.__ctTest.store.location.value; return l?.lookup && l.lat === a && l.lon === b && l.source === 'geo'; }, { timeout: 15_000 }, lat, lon).then(() => true, () => false), 'the saved location comes back');
});

// ---- S5c: filtered pool and nearest placements ----

// The owner's range rule (2026-11-11) in SQL, for picking a plant: coldest-month minimum on both
// sides and warmest-month maximum on the hot side, 2 °C beyond the percentiles "outside", between
// the percentile and the margin "near the edge".
// An annual skips the winter-cold check (owner, "Annuals skip the winter-cold check").
const RANGED = `SELECT p.canonical_name name, n.low nlo, n.high nhi, x.high xhi, coalesce(p.is_annual, 0) annual FROM plants p
  JOIN placements pl ON pl.plant = p.plant AND pl.climate_zone = ?3
  JOIN plant_climate n ON n.plant = p.plant AND n.variable = 'tmin_cold'
  JOIN plant_climate x ON x.plant = p.plant AND x.variable = 'tmax_warm'`;
const OUTSIDE = '((NOT annual AND (nlo - 2 > ?1 OR ?1 > nhi + 2)) OR ?2 > xhi + 2)';
const EDGE = `(NOT ${OUTSIDE} AND ((NOT annual AND (nlo > ?1 OR ?1 > nhi)) OR ?2 > xhi))`;
const pickRanged = (where, site, zone) => realDb((db) => db.prepare(`SELECT name FROM (${RANGED}) WHERE ${where} ORDER BY name LIMIT 1`).get(site.tminColdC, site.tmaxWarmC, zone)?.name);

// Since annuals skip the winter-cold check and, beyond their heat range, are advised to the cool season
// (decision row "Climate ranges fixed before the P5 push"), an annual is never outside, so every real
// list keeps its annuals anywhere. "Nothing fits" is shown for a list without annuals (the page's
// pools have their annuals taken out as they load), at Yakutsk's coordinates with a warmest month of
// 46 °C, above every recorded summer maximum + 2 °C.
async function atNowhere(page) {
  await page.evaluate(() => {
    const { store } = window.__ctTest;
    const perennials = (p) => Object.fromEntries(Object.entries(p).map(([k, list]) => [k, list?.filter((t) => t.traits.is_annual !== true && t.traits.grown_as_annual !== true)]));
    store.pools.subscribe((p) => { if (Object.values(p).some((list) => list?.some((t) => t.traits.is_annual === true || t.traits.grown_as_annual === true))) store.pools.value = perennials(p); });
  });
  const l = await lookupAt(...SITES.yakutsk);
  const periods = l.climate.periods.map((p) => (p.scenario === 'historical' ? { ...p, tmaxWarmC: 46 } : p));
  return atSite(page, 'yakutsk', { climate: { ...l.climate, periods } });
}

test('P5-14 (S5c nothing fits): where no plant\'s range holds the site: the "nothing fits" state, not an empty matrix', async () => {
  const page = await tool();
  await atNowhere(page);
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Boreal'; });
  assert.ok(await has(page, '[data-pool-empty]', 10_000), 'the nothing-fits state');
  // Strengthened (S5c): the state gives a clear next step, a real control that opens the search of
  // every plant.
  assert.match(await text(page, '[data-pool-empty]') ?? '', /−?-?39\.8 °C/, 'says why: the site\'s coldest month');
  // Review round 1: no "Suggest plants" that would only give an empty matrix; the panel's step is the way on.
  const ctas = await page.$$eval('.ct-cta button', (els) => els.filter((e) => !e.disabled).map((e) => e.textContent.trim()));
  assert.equal(ctas.includes('Suggest plants'), false, `no usable "Suggest plants" when nothing fits (${ctas.join(', ')})`);
  await page.click('[data-pool-empty] button');
  assert.ok(await has(page, '.ct-add .ct-search input', 10_000), 'the next step opens the plant search');
  // Review round 1: before anything is typed it lists every plant (each marked outside), never "No plant matches".
  await page.click('.ct-add-showall').catch(() => {});
  assert.ok(await has(page, '.ct-add .ct-rows li', 10_000), 'the search lists plants before a query');
  assert.ok(await has(page, '.ct-add .ct-rows li [data-mark="outside"]', 10_000), 'each one marked outside its range');
});

test('P5-14h (S5c annuals at a cold site, owner "Annuals skip the winter-cold check"): at Yakutsk the Boreal pool keeps its annual crops, Suggest uses them, and an annual is tagged "annual", no season claimed (decision row "Growing months")', async () => {
  const page = await tool();
  await atSite(page, 'yakutsk');
  await page.evaluate(async () => { const { store } = window.__ctTest; store.climate.value = 'Boreal'; await store.loadPool('Boreal'); });
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.fitPool.value?.length > 0, { timeout: 10_000 }).then(() => true, () => false), 'the pool keeps plants');
  const kept = await page.evaluate(() => { const p = window.__ctTest.store.fitPool.value; const ann = (t) => t.traits.is_annual === true || t.traits.grown_as_annual === true; return { all: p.length, annual: p.filter(ann).length, perennial: p.filter((t) => !ann(t)).map((t) => [t.canonical_name, t.climate.tminCold.weak]) }; });
  assert.ok(kept.annual >= 50, `annual crops kept (${kept.annual})`);
  // Export r-b958a4239cc68f73: a perennial kept here has a weak winter-cold row (TreeGOER disputes it),
  // so it is near the edge, never outside; the weak cap has no distance limit (raised with the coordinator).
  assert.deepEqual(kept.perennial.filter(([, weak]) => !weak), [], 'no perennial with a firm cold limit holds a −39.8 °C winter');
  assert.equal(await page.$('[data-pool-empty]'), null, 'not "nothing fits"');
  assert.equal(await page.evaluate(() => { const { store } = window.__ctTest; const ok = store.suggestMembers(); store.view.value = 'matrix'; return ok && store.members.value.length > 0; }), true, 'Suggest gives a consortium');
  const id = await page.evaluate(() => window.__ctTest.store.members.value[0]);
  await page.evaluate((m) => window.__ctTest.openSheet('details', m), id);
  assert.ok(await has(page, '[data-mark-surface="details"][data-mark-state="annual"]', 10_000), 'Details: the annual line');
  assert.match(await text(page, '[data-mark-surface="details"][data-mark-state="annual"]') ?? '', /^An annual, re-sown each year: its winter cold is not checked\.$/);
});

test('P5-14b (S5c suggestions in range): at Seville a suggestion holds no plant outside its observed range, and Add lists none until one is typed, which then asks first', async () => {
  const page = await tool();
  const lookup = await atSite(page, 'seville');
  const outside = await pickRanged(OUTSIDE, lookup.climate.periods[0], 'Mediterranean');
  await choose(page, 'Mediterranean');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await has(page, '[data-mark]', 10_000), 'the marks are loaded (Seville has plants near the edge)');
  assert.equal(await page.$('[data-mark="outside"]'), null, 'no suggested plant is outside its range');
  await page.evaluate(() => window.__ctTest.store.openSheet('add'));
  assert.ok(await has(page, '.ct-add .ct-rows li', 10_000), 'the Add list');
  await page.click('.ct-add-showall').catch(() => {});
  assert.equal(await page.$('.ct-add [data-mark="outside"]'), null, 'Add without a query lists no plant outside its range');
  await page.type('.ct-add .ct-search input', outside);
  const row = '.ct-add .ct-rows li';
  assert.ok(await page.waitForFunction((sel, name) => [...document.querySelectorAll(sel)].some((li) => li.querySelector('.ct-sci')?.textContent === name && li.querySelector('[data-mark="outside"]') && li.querySelector('button')), { timeout: 10_000 }, row, outside).then(() => true, () => false), `${outside} is found by name, marked "outside", with an Add that asks`);
  await page.evaluate((sel, name) => [...document.querySelectorAll(sel)].find((li) => li.querySelector('.ct-sci')?.textContent === name).querySelector('button').click(), row, outside);
  assert.ok(await has(page, 'dialog.ct-ask[open]', 5000), 'Add asks first');
  assert.match(await text(page, 'dialog.ct-ask[open]') ?? '', /outside its observed range/i);
});

test('P5-14c (S5c matrix counts): a cell\'s "N fit" leaves out plants outside their range at the site, and counts them all again without a location', async () => {
  const page = await tool();
  await choose(page, 'Mediterranean');
  const sum = () => page.evaluate(() => window.__ctTest.store.matrix.value.rows.flatMap((r) => r.cells).reduce((a, c) => a + c.inList, 0));
  const before = await sum();
  await atSite(page, 'seville');
  // The range rule loads with the pool chunk once the site has a climate; the pool waits for it.
  await page.waitForFunction(() => window.__ctTest.store.matrix.value !== null, { timeout: 10_000 });
  const within = await sum();
  assert.ok(within < before, `fewer plants counted at Seville (${within} cell entries) than without a location (${before})`);
  const counted = await page.evaluate(() => { const { store } = window.__ctTest; return store.fitPool.value.length; });
  assert.equal(counted, 198, 'the matrix counts the 198 of 200 Mediterranean plants kept at Seville (design check §C: 101; 117 on the schema 2 export, before the heat limit at Q99)');
  await page.evaluate(() => { window.__ctTest.store.location.value = null; });
  assert.equal(await sum(), before, 'without a location the counts are P2\'s');
});

test('P5-14e (S5c range chunk offline): if the pool chunk cannot load, the tool falls back to the unfiltered pool with a notice, and Suggest, Start crops, a link and Swap all work', async () => {
  const page = await tool();
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/_astro/pool.*'] });
  await choose(page, 'Mediterranean');
  await atSite(page, 'seville');
  assert.ok(await has(page, '[data-range-unavailable]', 10_000), 'a notice on Start: range checks unavailable');
  assert.match(await text(page, '[data-range-unavailable]') ?? '', /Reload/);
  assert.match(await text(page, '.ct-toast') ?? '', /range/i, 'and a toast with Reload');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.pool.value?.length === 200, { timeout: 10_000 }).then(() => true, () => false), 'the unfiltered pool (P2)');
  assert.ok(await has(page, '.ct-chips', 10_000), 'Start\'s crops are listed');
  const suggest = await page.waitForFunction(() => [...document.querySelectorAll('.ct-cta button')].find((b) => b.textContent.trim() === 'Suggest plants'), { timeout: 10_000 }).catch(() => null);
  assert.ok(suggest, 'Suggest plants');
  await suggest.click();
  assert.ok(await has(page, '[data-plant-id]', 10_000), 'Suggest gives a matrix');
  const id = await page.evaluate(() => window.__ctTest.store.members.value[0]);
  await page.evaluate((m) => window.__ctTest.openSheet('swap', m), id);
  assert.ok(await has(page, '.ct-swap .ct-rows li', 10_000), 'Swap lists alternatives');
  await page.keyboard.press('Escape');
  const ids = await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY 1").all().map((r) => String(r.id)));
  const link = `#${encodeLink({ climate: 'Temperate', country: null, site: { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' }, members: ids.slice(0, 5), kept: [], removed: [], guests: [], crops: [], stage: null }, { Temperate: ids })}`;
  await page.evaluate((h) => { location.hash = h; }, link);
  assert.ok(await page.waitForFunction((want) => { const { store } = window.__ctTest; return store.climate.value === 'Temperate' && store.view.value === 'matrix' && want.every((x) => store.members.value.includes(x)); }, { timeout: 15_000 }, ids.slice(0, 5)).then(() => true, () => false), 'a pasted link opens its consortium');
});

test('P5-14g (S5c range chunk offline, fix review 231bead 1–2): Reload is the only retry, one toast per failure, and the notice goes with the location', async () => {
  const page = await tool();
  const cdp = await page.createCDPSession();
  const urls = new Map(), failed = [];
  cdp.on('Network.requestWillBeSent', (e) => urls.set(e.requestId, e.request.url));
  cdp.on('Network.loadingFailed', (e) => { if (/\/_astro\/pool\./.test(urls.get(e.requestId) ?? '')) failed.push(e.blockedReason); });
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/_astro/pool.*'] });
  await page.evaluate(() => { window.__toasts = new Set(); window.__ctTest.store.toast.subscribe((t) => { if (t) window.__toasts.add(t.id); }); });
  await choose(page, 'Mediterranean');
  await atSite(page, 'seville');
  assert.ok(await has(page, '[data-range-unavailable]', 10_000), 'the notice');
  await atSite(page, 'lyon');
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(failed.length, 1, 'a new location does not import the chunk the browser remembers as failed');
  assert.equal(await page.evaluate(() => window.__toasts.size), 1, 'never a second toast for the same failure');
  assert.ok(await has(page, '[data-range-unavailable]'), 'the notice stays, with Reload');
  await page.evaluate(() => { window.__ctTest.store.location.value = null; });
  assert.ok(await page.waitForFunction(() => !document.querySelector('[data-range-unavailable]') && !window.__ctTest.store.rangeFailed.value, { timeout: 5_000 }).then(() => true, () => false), 'location cleared: plain P2, no notice');
});

test('P5-14f (S5c Suggest while the range rule loads): when nothing fits, a Suggest pressed before the rule arrives stays on Start with the nothing-fits state', async () => {
  const page = await tool();
  // Temperate (curated): no panel, so the rule's chunk is not fetched before the location; no
  // Temperate plant holds the synthetic site (atNowhere).
  await choose(page, 'Temperate');
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 2500, downloadThroughput: -1, uploadThroughput: -1 });
  await atNowhere(page);
  const suggest = await page.waitForFunction(() => [...document.querySelectorAll('.ct-cta button')].find((b) => b.textContent.trim() === 'Suggest plants'), { timeout: 5_000 }).catch(() => null);
  assert.ok(suggest, 'Suggest is there while the rule loads');
  assert.equal(await page.evaluate(() => window.__ctTest.store.rangeRule.value), null, 'the rule has not arrived yet');
  await suggest.click();
  assert.ok(await has(page, '[data-pool-empty]', 20_000), 'the nothing-fits state once the rule is in');
  await new Promise((r) => setTimeout(r, 500));
  const state = await page.evaluate(() => { const { store } = window.__ctTest; return { view: store.view.value, members: store.members.value.length }; });
  assert.deepEqual(state, { view: 'start', members: 0 }, 'still on Start, no empty matrix');
  assert.equal(await page.$('.ct-cta button[aria-busy="true"]'), null, 'the pending Suggest is cleared');
});

test('P5-15 (S5c near-edge mark): a Mediterranean plant whose range ends within 2 °C of Seville\'s climate carries "near the edge"', async () => {
  const page = await tool();
  const lookup = await atSite(page, 'seville');
  const edge = await pickRanged(EDGE, lookup.climate.periods[0], 'Mediterranean');
  assert.ok(edge, 'a Mediterranean plant near the edge at Seville');
  await choose(page, 'Mediterranean');
  const marks = await page.evaluate(async (name) => {
    const { store } = window.__ctTest;
    const t = store.pool.value.find((x) => x.canonical_name === name);
    store.members.value = [t.id];
    store.view.value = 'matrix';
    await new Promise((r) => setTimeout(r, 300));
    return [...document.querySelectorAll('[data-mark]')].map((e) => e.getAttribute('data-mark'));
  }, edge);
  assert.ok(marks.includes('edge'), `${edge} is marked near the edge`);
});

test('P5-15b (S5c range lines in Details, page language): in French, a plant near the edge at Seville says why with the site\'s values written "5,8"', async () => {
  const page = await tool({ lang: 'fr' });
  const lookup = await atSite(page, 'seville');
  const p = lookup.climate.periods[0];
  // A plant past its coldest-month bound at Seville (so the line quotes the site's 5.8 °C).
  const name = await realDb((db) => db.prepare(`SELECT name FROM (${RANGED}) WHERE NOT ${OUTSIDE} AND (nlo > ?1 OR ?1 > nhi) ORDER BY name LIMIT 1`).get(p.tminColdC, p.tmaxWarmC, 'Mediterranean')?.name);
  assert.ok(name, 'a Mediterranean plant near its coldest-month bound at Seville');
  await choose(page, 'Mediterranean');
  await page.evaluate((n) => { const { store } = window.__ctTest; store.view.value = 'matrix'; store.openSheet('details', store.pool.value.find((x) => x.canonical_name === n).id); }, name);
  assert.ok(await has(page, '[data-mark-surface="details"][data-mark-state="cold"], [data-mark-surface="details"][data-mark-state="mild"]', 10_000), 'a line per bound passed');
  // The verdict mark of a one-sided plant carries the same state ('cold'), so the line is the one with values.
  const line = await page.$$eval('[data-mark-surface="details"][data-mark-state="cold"], [data-mark-surface="details"][data-mark-state="mild"]', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).find((t) => /°C/.test(t)) ?? null);
  assert.match(line, /5,8 °C/, `"${line}" writes the number the French way`);
  // One of its edge marks (the verdict; the side lines carry values) says what the ranges include.
  const edges = await page.$$eval('[data-mark-surface="details"][data-mark="edge"]', (els) => els.map((e) => e.textContent));
  assert.ok(edges.some((t) => /cultures comprises/.test(t)), `the Details mark says observed ranges include cultivation (${edges.join(' | ')})`);
});

test('P5-16 (S5c outside-range warning on add): typed in Add, a plant whose range misses the site shows "outside", and adding it still makes it a member', async () => {
  const page = await tool();
  const lookup = await atSite(page, 'seville');
  const outside = await pickRanged(OUTSIDE, lookup.climate.periods[0], 'Mediterranean');
  assert.ok(outside, 'a Mediterranean plant outside its range at Seville');
  await choose(page, 'Mediterranean');
  await page.evaluate(() => { window.__ctTest.store.view.value = 'matrix'; window.__ctTest.store.openSheet('add'); });
  assert.ok(await has(page, '.ct-add .ct-search input', 10_000), 'the Add sheet');
  await page.type('.ct-add .ct-search input', outside);
  const row = `.ct-add .ct-rows li:has(.ct-sci)`;
  assert.ok(await page.waitForFunction((sel, name) => [...document.querySelectorAll(sel)].some((li) => li.querySelector('.ct-sci')?.textContent === name && li.querySelector('[data-mark="outside"]')), { timeout: 10_000 }, row, outside).then(() => true, () => false), `${outside}'s row shows "outside"`);
  await page.evaluate((sel, name) => {
    const li = [...document.querySelectorAll(sel)].find((x) => x.querySelector('.ct-sci')?.textContent === name);
    (li.querySelector('input[type="checkbox"]') ?? li.querySelector('button')).click();
  }, row, outside);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 100)));
  const ask = await page.$('dialog.ct-ask[open] .button-primary') ?? await page.$('.ct-add-bar .button-primary:not([disabled])');
  assert.ok(ask, 'the warning\'s "Add anyway", or Add selected');
  await ask.click();
  const id = await page.evaluate((name) => window.__ctTest.store.pool.value.find((t) => t.canonical_name === name)?.id, outside);
  assert.ok(await page.waitForFunction((x) => window.__ctTest.store.members.value.includes(x), { timeout: 5000 }, id).then(() => true, () => false), `${outside} joins the members`);
});

test('P5-17 (S5c estimate label): at Lyon (Subtropical) plants are placed from the nearest list and labelled "estimate"', async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  const count = await page.evaluate(async () => {
    const { store } = window.__ctTest;
    store.climate.value = 'Subtropical';
    if (!(await store.loadPool('Subtropical'))) return 0;
    // The range rule loads with the pool chunk once the site has a climate; the pool waits for it.
    for (let i = 0; i < 200 && !store.pool.value; i++) await new Promise((r) => setTimeout(r, 50));
    return store.pool.value.filter((t) => t.estimate && t.placedFrom === 'Mediterranean').length;
  });
  assert.ok(count > 0, 'Subtropical borrows Mediterranean placements');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await has(page, '[data-mark="estimate"]', 10_000));
});

test('P5-26 (S5c borrowed list from a link): #v=4&c=subtropical without o= opens with borrowed plants marked "estimate", no location needed', async () => {
  // A consortium made at Lyon on the borrowed Subtropical list, then opened from its link without a location.
  const maker = await tool();
  await atSite(maker, 'lyon');
  await maker.evaluate(async () => { const { store } = window.__ctTest; store.climate.value = 'Subtropical'; await store.loadPool('Subtropical'); });
  assert.equal(await maker.evaluate(() => { const { store } = window.__ctTest; const ok = store.suggestMembers(); store.view.value = 'matrix'; return ok; }), true, 'with a location, Subtropical suggests');
  assert.ok(await maker.waitForFunction(() => /[#&]c=subtropical/.test(location.hash) && /[#&]m=|[#&]a=./.test(location.hash), { timeout: 10_000 }).then(() => true, () => false), 'the address bar holds the link');
  const hash = await maker.evaluate(() => location.hash);
  const members = await maker.evaluate(() => [...window.__ctTest.store.members.value].sort());
  const page = await tool({ hash });
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.climate.value === 'Subtropical', { timeout: 10_000 }).then(() => true, () => false), 'the link\'s climate');
  assert.equal(await page.evaluate(() => window.__ctTest.store.location.value), null, 'no location: borrowing depends on the climate only');
  assert.ok(await page.waitForFunction((want) => JSON.stringify([...window.__ctTest.store.members.value].sort()) === JSON.stringify(want), { timeout: 10_000 }, members).then(() => true, () => false), 'UX audit fix (1): the link\'s plants are all restored, no data loss');
  await page.evaluate(() => { window.__ctTest.store.view.value = 'matrix'; });
  assert.ok(await has(page, '[data-mark="estimate"]', 10_000), 'borrowed plants marked "estimate"');
  await page.evaluate(() => { const { store } = window.__ctTest; store.openSheet('details', store.members.value[0]); });
  assert.ok(await has(page, '[data-mark-surface="details"][data-mark-state="no-site"]', 10_000), 'Details says to give a location to check it');
  assert.match(await text(page, '[data-mark-surface="details"][data-mark-state="no-site"]') ?? '', /give your site.s location to check/i);
  assert.equal(await page.evaluate(() => window.__ctTest.store.suggestMembers()), false, 'no new suggestion from a borrowed list without a location');
  assert.equal(await page.$('[data-pool-empty]'), null);
});

test('P5-26b (S5c borrowed climate without a location, UX audit fix 1): Start offers no Suggest, no crops and no Start empty, and says the climate needs the site\'s location; a curated climate is as in P2', async () => {
  const page = await tool();
  await page.click('input[name="ct-climate"][value="subtropical"]');
  assert.ok(await has(page, '[data-needs-site]', 10_000), 'the needs-location line');
  assert.match(await text(page, '[data-needs-site]') ?? '', /needs your site.s location to pick plants/);
  assert.ok(await has(page, '[data-needs-site] button'), 'a control to the location step');
  // Fix review 29b709e (3): it lands focus on the location step's first control (S5b's markup, stood in
  // for here), else on its heading made focusable.
  await page.evaluate(() => { const s = document.createElement('section'); s.innerHTML = '<h2 id="ct-loc-h">Where is your site?</h2><p>text</p><button type="button" id="ct-test-first">Use my location</button>'; document.querySelector('.ct-start').prepend(s); });
  await page.click('[data-needs-site] button');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'ct-test-first', 'focus on the step\'s first control');
  await page.evaluate(() => { document.getElementById('ct-test-first').remove(); });
  await page.click('[data-needs-site] button');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'ct-loc-h', 'no control yet: the heading, focusable');
  await page.evaluate(() => { document.getElementById('ct-loc-h').parentElement.remove(); });
  assert.equal(await page.$('.ct-cta'), null, 'no Suggest, Start empty or Paste for it');
  assert.equal(await page.$('.ct-chips'), null, 'no crops from an unfiltered borrowed list');
  await page.click('input[name="ct-climate"][value="temperate"]');
  assert.ok(await has(page, '.ct-cta', 10_000), 'Temperate without a location: Suggest as in P2');
  assert.equal(await page.$('[data-needs-site]'), null);
  // With a location the borrowed climate is offered (filtered by the range rule).
  await atSite(page, 'lyon');
  await page.click('input[name="ct-climate"][value="subtropical"]');
  assert.ok(await has(page, '.ct-cta', 10_000), 'Subtropical with a location: Suggest');
  assert.equal(await page.$('[data-needs-site]'), null);
});

test('P5-26d (S5c stale Suggest, fix review 29b709e 1): a Suggest pressed while Temperate waits, then Boreal chosen, never runs later when a location arrives', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  // The range rule's chunk is slow, so the pool waits for it and a Suggest pressed now is pending.
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 2500, downloadThroughput: -1, uploadThroughput: -1 });
  await atSite(page, 'lyon');
  const suggest = await page.waitForFunction(() => [...document.querySelectorAll('.ct-cta button')].find((b) => b.textContent.trim() === 'Suggest plants'), { timeout: 5_000 }).catch(() => null);
  assert.ok(suggest, 'Suggest');
  await suggest.click();
  assert.equal(await page.evaluate(() => window.__ctTest.store.view.value), 'start', 'pending');
  await page.click('input[name="ct-climate"][value="boreal"]');
  await page.evaluate(() => { window.__ctTest.store.location.value = null; });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  assert.ok(await has(page, '[data-needs-site]', 10_000), 'Boreal needs a location');
  await atSite(page, 'lyon');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.fitPool.value?.length > 0 && window.__ctTest.store.climate.value === 'Boreal', { timeout: 15_000 }).then(() => true, () => false), 'the Boreal pool, filtered');
  await new Promise((r) => setTimeout(r, 800));
  assert.deepEqual(await page.evaluate(() => { const { store } = window.__ctTest; return { view: store.view.value, members: store.members.value.length }; }), { view: 'start', members: 0 }, 'no suggestion the reader did not ask for');
  assert.ok(await has(page, '.ct-cta', 5_000), 'Boreal with a location: Suggest offered');
  assert.equal(await page.$('.ct-cta button[aria-busy="true"]'), null, 'the old Suggest is no longer pending (it would run at the next pool change)');
});

test('P5-26e (S5c borrowed climate, range chunk offline, fix review 29b709e 2): with a location but no range rule, a borrowed list offers no Suggest and says why', async () => {
  const page = await tool();
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/_astro/pool.*'] });
  await atSite(page, 'seville');
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Arid'; });
  assert.ok(await has(page, '[data-range-unavailable]', 10_000), 'the notice');
  assert.match(await text(page, '[data-range-unavailable]') ?? '', /Arid needs them to pick plants/);
  assert.ok(await has(page, '[data-range-unavailable] button'), 'Reload');
  assert.equal(await page.$('.ct-cta'), null, 'no Suggest from the unfiltered borrowed list');
  assert.equal(await page.evaluate(async () => { const { store } = window.__ctTest; await store.loadPool('Arid'); return store.suggestMembers(); }), false, 'suggestMembers refuses');
});

test('P5-26f (S5c empty matrix on a borrowed list without a location, fix review 29b709e 3): its Suggest is the needs-location line', async () => {
  const page = await tool({ hash: '#v=4&c=subtropical&a=&e=1' });
  assert.ok(await has(page, '.ct-mx-empty', 15_000), 'the empty matrix');
  assert.ok(await has(page, '.ct-mx-empty [data-needs-site]', 5_000), 'the needs-location line in place of a silent Suggest');
});

test('P5-26c (S5c card pill, UX audit fix 1): a borrowed climate\'s card says "Needs your location" until a location is given', async () => {
  const page = await tool();
  const pill = (v) => page.$eval(`input[name="ct-climate"][value="${v}"] ~ .ct-card-desc .ct-pill`, (e) => e.textContent.trim());
  assert.equal(await pill('subtropical'), 'Needs your location');
  assert.equal(await pill('temperate'), 'Ready');
  await atSite(page, 'lyon');
  assert.equal(await pill('subtropical'), 'Ready');
});

// ---- P5 seam review (branch consortium/p5-seam): one test per finding, written to fail first ----

// The empty matrix's buttons and words, at both widths.
const emptyMatrix = async (page) => {
  assert.ok(await has(page, '.ct-mx-empty', 15_000), 'the empty matrix');
  return { buttons: await page.$$eval('.ct-mx-empty button', (els) => els.map((e) => e.textContent.trim())), words: await text(page, '.ct-mx-empty') ?? '' };
};
test('P5-27a (S5c seam review 1): where nothing fits, the empty matrix left by "Search all plants" has no dead "Suggest a start"; it says why', async () => {
  for (const width of [390, 1280]) {
    const page = await tool({ width });
    await atNowhere(page);
    await page.click('input[name="ct-climate"][value="boreal"]');
    assert.ok(await has(page, '[data-pool-empty] button', 10_000), 'the nothing-fits state');
    await page.click('[data-pool-empty] button');
    assert.ok(await has(page, 'dialog.ct-sheet .ct-icon-button', 10_000), 'the plant search');
    await page.click('dialog.ct-sheet .ct-icon-button');
    await page.waitForFunction(() => !document.querySelector('dialog.ct-sheet'), { timeout: 5000 });
    const { buttons, words } = await emptyMatrix(page);
    assert.equal(buttons.includes('Suggest a start'), false, `${width} px: no Suggest that can only refuse (${buttons.join(', ')})`);
    assert.match(words, /nothing to suggest/, `${width} px: the empty matrix says why`);
  }
});
test('P5-27b (S5c seam review 1): a borrowed climate whose range chunk failed: the empty matrix says why instead of a dead "Suggest a start"', async () => {
  for (const width of [390, 1280]) {
    const page = await tool({ width, hash: '#v=4&c=arid&a=&e=1' });
    const cdp = await page.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs', { urls: ['*/_astro/pool.*'] });
    await atSite(page, 'seville');
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.rangeFailed.value, { timeout: 10_000 }).then(() => true, () => false), 'the range chunk failed');
    const { buttons, words } = await emptyMatrix(page);
    assert.equal(buttons.includes('Suggest a start'), false, `${width} px: no Suggest that can only refuse (${buttons.join(', ')})`);
    assert.match(words, /Arid needs them to pick plants/, `${width} px: it says why`);
    assert.ok(buttons.includes('Reload'), `${width} px: with Reload`);
  }
});
test('P5-27c (S5b seam review 2): a map centre on the sea keeps the site in use, and the line names it', async () => {
  const page = await tool({ nominatim: 'fixture', mapTiles: 'stub' });
  await locationControls(page);
  await search(page, 'Lyon');
  assert.equal(await locationState(page), 'borderline');
  const label = (await page.evaluate(() => window.__ctTest.store.location.value)).label;
  assert.match(label, /^Lyon/);
  await page.click('[data-location-action="map"]');
  assert.ok(await has(page, '[data-location-map] canvas', 10_000));
  await page.evaluate((c) => window.__ctTest.mapCentre(c), { lat: SITES.ocean[0], lon: SITES.ocean[1] });
  await page.click('[data-location-use-centre]');
  assert.equal(await locationState(page), 'sea');
  await page.click('[data-location-close]');
  await page.waitForFunction(() => !document.querySelector('[data-location-map]'), { timeout: 5000 });
  assert.equal((await page.evaluate(() => window.__ctTest.store.location.value)).label, label, 'Lyon still drives the pool and marks');
  assert.ok((await text(page, '.ct-location [data-location-state]') ?? '').includes(label), `the line names the site in use (${await text(page, '.ct-location [data-location-state]')})`);
});
test('P5-27d (S5b seam review 3): a failed tile read keeps the site in use on the page and in storage, says so, and a reload agrees', async () => {
  const page = await tool({ nominatim: 'fixture' });
  await locationControls(page);
  await search(page, 'Lyon');
  assert.equal(await locationState(page), 'borderline');
  const before = await page.evaluate(() => ({ loc: window.__ctTest.store.location.value.label, country: window.__ctTest.store.country.value }));
  assert.deepEqual(before.country, { code: 'FR', source: 'location' });
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/data/climate/*'] });
  await page.$eval('input[data-location-search]', (i) => { i.value = ''; });
  await search(page, 'Seville');
  assert.equal(await locationState(page), 'failed');
  const after = await page.evaluate(() => ({ loc: window.__ctTest.store.location.value?.label ?? null, country: window.__ctTest.store.country.value }));
  assert.deepEqual(after, before, 'the page keeps Lyon and its country');
  assert.equal((await savedLocation(page))?.label, before.loc, 'storage keeps Lyon too');
  assert.ok((await text(page, '.ct-location [data-location-state]') ?? '').includes(before.loc), 'the line says Lyon is still in use');
  await cdp.send('Network.setBlockedURLs', { urls: [] });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  assert.ok(await page.waitForFunction((l) => window.__ctTest.store.location.value?.label === l && window.__ctTest.store.location.value.lookup, { timeout: 15_000 }, before.loc).then(() => true, () => false), 'after a reload: Lyon, as the page showed');
});
// A page with the reader's own saved location (Seville, geo) on this device, opened at `hash`.
async function withSavedSite(hash = '') {
  const page = await h.open(`/consortium/${hash}`, { mapTiles: 'stub' });
  await page.evaluateOnNewDocument((rec) => {
    window.__ctTest = true;
    if (!localStorage.getItem('canopi-location')) localStorage.setItem('canopi-location', rec);
  }, JSON.stringify({ lat: SITES.seville[0], lon: SITES.seville[1], source: 'geo' }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  return page;
}
const temperateLink = async (origin = null, n = 5) => {
  const ids = await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY 1").all().map((r) => String(r.id)));
  return `#${encodeLink({ climate: 'Temperate', country: null, site: { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' }, members: ids.slice(0, n), kept: [], removed: [], guests: [], crops: [], stage: null }, { Temperate: ids }, { origin })}`;
};
const ownSite = (page) => page.waitForFunction((a, b) => { const l = window.__ctTest.store.location.value; return !!l?.lookup && l.lat === a && l.lon === b && l.source === 'geo'; }, { timeout: 15_000 }, ...SITES.seville).then(() => true, () => false);
test('P5-27e (S5b seam review 5): a link without o= keeps the reader\'s own saved site, opened fresh or pasted into the open tab, and after a reload', async () => {
  const link = await temperateLink();
  const fresh = await withSavedSite(link);
  assert.ok(await fresh.waitForFunction(() => window.__ctTest.store.climate.value === 'Temperate' && window.__ctTest.store.members.value.length === 5, { timeout: 15_000 }).then(() => true, () => false), 'the link opens');
  assert.ok(await ownSite(fresh), 'fresh open: the reader\'s own site applies');
  assert.equal(await fresh.evaluate(() => window.__ctTest.store.climate.value), 'Temperate', 'the link\'s climate stands');
  await fresh.reload({ waitUntil: 'domcontentloaded' });
  await ready(fresh);
  assert.ok(await ownSite(fresh), 'after a reload: the same');
  const pasted = await withSavedSite();
  assert.ok(await ownSite(pasted), 'the saved site is read');
  await pasted.evaluate((hsh) => { location.hash = hsh; }, link);
  assert.ok(await pasted.waitForFunction(() => window.__ctTest.store.members.value.length === 5, { timeout: 15_000 }).then(() => true, () => false), 'the pasted link opens');
  assert.ok(await ownSite(pasted), 'pasted: the reader\'s own site stays');
  // A link with o= then one without (pasted): the link's location goes and the reader's own comes back.
  await pasted.evaluate((hsh) => { location.hash = hsh; }, await temperateLink({ lat: 45.75, lon: 4.85 }));
  assert.ok(await pasted.waitForFunction(() => window.__ctTest.store.location.value?.source === 'link', { timeout: 15_000 }).then(() => true, () => false));
  await pasted.evaluate((hsh) => { location.hash = hsh; }, await temperateLink(null, 4));
  assert.ok(await ownSite(pasted), 'the reader\'s own site again, as a reload would give');
});
test('P5-27f (S5c seam review 6): if the plant-marks chunk fails, the range warnings it would show are replaced by a notice with Reload', async () => {
  for (const width of [390, 1280]) {
    const page = await tool({ width });
    const cdp = await page.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs', { urls: ['*/_astro/mark-providers.*'] });
    await atSite(page, 'seville');
    await choose(page, 'Mediterranean');
    await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
    assert.ok(await has(page, '[data-plant-id]', 10_000), 'the matrix');
    assert.ok(await has(page, '[data-marks-unavailable]', 10_000), `${width} px: a notice that the marks did not load`);
    assert.match(await text(page, '[data-marks-unavailable]') ?? '', /Reload/);
  }
});
// A saved Temperate consortium and a saved site at Seville (which proposes Mediterranean). list: the
// restore's first list read waits until the saved site is looked up, then 'fail's or 'open's.
// window.__confirmSeen: whether the location line's "Use …" ever showed.
async function savedOpening({ list = null } = {}) {
  const q = (await temperateLink()).slice(1);
  const page = await h.open('/consortium/', { mapTiles: 'stub' });
  await page.evaluateOnNewDocument((save, rec, outcome) => {
    if (!localStorage.getItem('canopi-consortium')) localStorage.setItem('canopi-consortium', save);
    if (!localStorage.getItem('canopi-location')) localStorage.setItem('canopi-location', rec);
    window.__confirmSeen = false;
    new MutationObserver(() => { if (document.querySelector('[data-location-confirm]')) window.__confirmSeen = true; }).observe(document, { subtree: true, childList: true });
    let hook = true;
    Object.defineProperty(window, '__ctTest', { configurable: true, get: () => hook, set: (v) => {
      hook = v;
      if (!v?.store || !outcome) return;
      v.store.source.subscribe((src) => {
        if (!src || src.wrapped) return;
        src.wrapped = true;
        const read = src.interactions.bind(src);
        let once = true; // the restore's read only; later reads (a card chosen) work
        src.interactions = (z) => {
          if (!once) return read(z);
          once = false;
          return new Promise((resolve, reject) => { v.store.location.subscribe((l) => { if (l?.lookup) setTimeout(() => (outcome === 'fail' ? reject(new Error('test: list unreadable')) : resolve(read(z))), 50); }); });
        };
      });
    } });
  }, JSON.stringify({ fragment: q, at: '2026-11-01', src: 'chosen' }), JSON.stringify({ lat: SITES.seville[0], lon: SITES.seville[1], source: 'geo' }), list);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  return page;
}
const savedFailing = () => savedOpening({ list: 'fail' });
const proposal = (page) => page.evaluate(() => ({ proposed: window.__ctTest.store.proposedClimate.value, climate: window.__ctTest.store.climate.value, seen: window.__confirmSeen, shown: !!document.querySelector('[data-location-confirm]') }));
test('P5-27k (S5b seam review round 3, 1): the saved site looked up while the saved consortium opens proposes nothing over it, and none comes back after Change site', async () => {
  // The lookup first (the restore's list read waits for it).
  const first = await savedOpening({ list: 'open' });
  assert.ok(await ownSite(first), 'the saved site is read');
  assert.ok(await first.waitForFunction(() => window.__ctTest.store.climate.value === 'Temperate' && window.__ctTest.store.members.value.length === 5, { timeout: 15_000 }).then(() => true, () => false), 'the save opens');
  assert.deepEqual(await proposal(first), { proposed: null, climate: 'Temperate', seen: false, shown: false }, 'lookup first: no "Use Mediterranean" over the opening save, no proposal left');
  for (const page of [first]) {
    assert.ok(await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Change site'); b?.click(); return !!b; }), 'Change site');
    await new Promise((r) => setTimeout(r, 300));
    assert.deepEqual(await proposal(page), { proposed: null, climate: 'Temperate', seen: false, shown: false }, 'after Change site: no stale proposal');
  }
});
test('P5-27i (S5b seam review round 2, 2): a saved consortium that fails to open still lets the reader\'s saved site propose its climate card', async () => {
  const page = await savedFailing();
  assert.ok(await ownSite(page), 'the saved site is read');
  assert.ok(await page.waitForFunction(() => !window.__ctTest.store.climate.value && document.querySelector('[data-location-state]'), { timeout: 15_000 }).then(() => true, () => false));
  await new Promise((r) => setTimeout(r, 500));
  const { proposed, climate } = await page.evaluate(() => ({ proposed: window.__ctTest.store.proposedClimate.value, climate: window.__ctTest.store.climate.value }));
  assert.equal(climate, null, 'the saved consortium did not open');
  assert.ok(proposed, 'the saved site proposes its climate card');
});
test('P5-27j (S5b seam review round 2, 3): a fresh link without o= looks the reader\'s saved site up once', async () => {
  const reads = async (hash) => {
    const page = await h.open(`/consortium/${hash}`, { mapTiles: 'stub' });
    await page.evaluateOnNewDocument((rec) => {
      window.__ctTest = true;
      if (!localStorage.getItem('canopi-location')) localStorage.setItem('canopi-location', rec);
      window.__ownReads = 0;
      const get = Storage.prototype.getItem;
      Storage.prototype.getItem = function (k) { if (k === 'canopi-location') window.__ownReads++; return get.call(this, k); };
    }, JSON.stringify({ lat: SITES.seville[0], lon: SITES.seville[1], source: 'geo' }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready(page);
    assert.ok(await ownSite(page));
    await new Promise((r) => setTimeout(r, 1000));
    return page.evaluate(() => window.__ownReads);
  };
  const plain = await reads('');
  const linked = await reads(await temperateLink());
  assert.equal(linked, plain, `the saved site is read as often as on a plain open (${plain}), not twice over`);
});
// An empty Temperate matrix with a kept guest from Tropical whose list read is held: window.__guest
// .release() lets it through, .fail() fails it (as after Start empty, which keeps guests).
async function guestHeld(width) {
  const guest = await realDb((db) => String(db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Tropical' ORDER BY 1 LIMIT 1").get().id));
  const page = await tool({ width, hash: '#v=4&c=temperate&a=&e=1' });
  assert.ok(await has(page, '.ct-mx-empty .button-primary', 15_000), 'the empty matrix with "Suggest a start"');
  await page.evaluate((id) => {
    const { store } = window.__ctTest, src = store.source.value;
    const pool = src.pool.bind(src), rows = src.interactions.bind(src);
    let release, fail; const held = new Promise((r, j) => { release = r; fail = j; });
    held.catch(() => {});
    window.__guest = { release, fail: () => fail(new Error('test: guest list unreadable')) };
    src.pool = (z) => (z === 'Tropical' ? held.then(() => pool(z)) : pool(z));
    src.interactions = (z) => (z === 'Tropical' ? held.then(() => rows(z)) : rows(z));
    store.guests.value = { [id]: 'Tropical' };
  }, guest);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.guestsPending.value.length === 1, { timeout: 5000 }).then(() => true, () => false), 'the guest list is being read');
  return page;
}
const members = (page) => page.evaluate(() => window.__ctTest.store.members.value.length);
test('P5-27l (S5c seam review round 3, 2): the empty matrix\'s "Suggest a start" pressed while a kept guest\'s list is still read waits for it, then suggests', async () => {
  for (const width of [390, 1280]) {
    const page = await guestHeld(width);
    await page.click('.ct-mx-empty .button-primary');
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => window.__guest.release());
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), `${width} px: the press is not lost: a suggestion once the guest list is read`);
  }
});
test('P5-27m (S5c seam review round 4, 1): a waiting Suggest is dropped when the reader opens Add and adds a plant: the list arriving later changes nothing', async () => {
  const page = await guestHeld(1280);
  await page.click('.ct-mx-empty .button-primary');
  await page.locator(aria('button', 'Add a plant')).click();
  assert.ok(await has(page, 'dialog.ct-sheet .ct-tick input', 10_000), 'Add');
  await page.click('dialog.ct-sheet .ct-tick input');
  await page.locator(aria('button', 'Add 1 plant')).click();
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 1, { timeout: 5000 }).then(() => true, () => false), 'the plant added');
  await page.evaluate(() => window.__guest.release());
  await page.waitForFunction(() => window.__ctTest.store.guestsPending.value.length === 0, { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(await members(page), 1, 'no suggestion fills in around the plant the reader added');
});
test('P5-27n (S5c seam review round 4, 1): a waiting Suggest ends when the guest list fails (the load screen says so), and Retry runs nothing unasked', async () => {
  const page = await guestHeld(1280);
  await page.click('.ct-mx-empty .button-primary');
  await page.evaluate(() => window.__guest.fail());
  assert.ok(await has(page, aria('button', 'Retry'), 10_000), 'the load screen with Retry');
  await page.locator(aria('button', 'Retry')).click();
  assert.equal(await loadState(page), 'ready');
  await page.waitForFunction(() => window.__ctTest.store.source.value && window.__ctTest.store.guestsPending.value.length === 0, { timeout: 15_000 });
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(await members(page), 0, 'no suggestion runs on its own after Retry');
});
test('P5-27o (S5c seam review round 4, 1): a waiting Suggest whose guest list never arrives ends after 10 s, says so, and is no longer busy', async () => {
  const page = await guestHeld(1280);
  await page.click('.ct-mx-empty .button-primary');
  assert.equal(await page.$eval('.ct-mx-empty .button-primary', (b) => b.getAttribute('aria-busy')), 'true', 'busy while it waits');
  assert.ok(await page.waitForFunction(() => /took too long/.test(document.querySelector('.ct-toast-text')?.textContent ?? ''), { timeout: 14_000 }).then(() => true, () => false), 'after 10 s, a message');
  assert.equal(await page.$eval('.ct-mx-empty .button-primary', (b) => b.getAttribute('aria-busy')), null, 'no longer busy');
  await page.evaluate(() => window.__guest.release());
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(await members(page), 0, 'the list arriving later runs nothing');
});
test('P5-27p (S5b seam review round 4, 2): a card the reader\'s own location proposed stays when a link opens', async () => {
  const [lat, lon] = SITES.lyon;
  const page = await tool({ geolocation: { lat, lon } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'borderline');
  const before = await page.evaluate(() => window.__ctTest.store.proposedClimate.value);
  assert.ok(before, 'the location proposes a card');
  await page.evaluate((hsh) => { location.hash = hsh; }, await temperateLink());
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 5, { timeout: 15_000 }).then(() => true, () => false), 'the link opens');
  assert.equal(await page.evaluate(() => window.__ctTest.store.proposedClimate.value), before, 'the reader\'s own proposal stays');
});

test('P5-27g (S5c walk-through F1): on phones a member\'s marks wrap or fit: with an annual in the matrix at 320 and 390 px, in en, fr and ja, nothing scrolls sideways', async () => {
  const [lat, lon] = SITES.lyon;
  for (const lang of ['en', 'fr', 'ja']) {
    for (const width of [320, 390]) {
      const page = await tool({ lang, width, geolocation: { lat, lon } });
      await locationControls(page);
      await page.click('[data-location-action="geo"]');
      assert.equal(await locationState(page), 'borderline');
      await page.click('[data-location-confirm]');
      assert.ok(await has(page, '.ct-cta .button-primary', 15_000));
      await page.click('.ct-cta .button-primary');
      assert.ok(await has(page, '.ct-prow [data-mark-state="annual"]', 15_000), `${lang} ${width} px: an annual's row mark`);
      const over = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        marks: [...document.querySelectorAll('#ct-root .ct-tag, #ct-root .ct-flag')].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).map((e) => e.textContent) }));
      assert.deepEqual(over, { doc: 0, marks: [] }, `${lang} ${width} px: no sideways scroll, no mark past the edge`);
    }
  }
});

// Decision row "Climate ranges fixed before the P5 push" (2026-11-12): the zone from the cell's own means,
// annuals beyond their heat range advised to the cool season, drought tolerance Medium on a dry site.
test('P5-27q (S5c climate ranges): Nairobi proposes Subtropical from its means; at Seville Good-King-Henry (a recorded annual) is a cool-season crop in Add and Details; a dry site marks drought tolerance Medium; nothing scrolls sideways', async () => {
  const [lat, lon] = SITES.nairobi;
  for (const width of [320, 390, 1280]) {
    const page = await tool({ width, geolocation: { lat, lon } });
    await locationControls(page);
    await page.click('[data-location-action="geo"]');
    assert.equal(await locationState(page), 'borderline', `${width} px: Nairobi is borderline`);
    const line = await text(page, '[data-location-state]') ?? '';
    assert.match(line, /Köppen class Cwb/, 'the class its means give');
    assert.match(line, /The climate map gives Aw here/, 'and the map class');
    assert.match(line, /Between Subtropical and Tropical; we picked Subtropical/);
    assert.match(line, /within 2 °C/);
    assert.equal(await proposedCard(page), 'subtropical', 'Subtropical proposed');
    // Seville: Good-King-Henry (stored annual, Temperate list, heat limit 30.2 °C against 34.8 °C) stays, for the cool season.
    await atSite(page, 'seville');
    await choose(page, 'Temperate');
    await page.evaluate(() => { window.__ctTest.store.view.value = 'matrix'; window.__ctTest.store.openSheet('add'); });
    assert.ok(await has(page, '.ct-add .ct-search input', 10_000), 'the Add sheet');
    await page.type('.ct-add .ct-search input', 'Chenopodium bonus-henricus');
    const row = '.ct-add .ct-rows li';
    assert.ok(await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].some((li) => li.querySelector('.ct-sci')?.textContent === 'Chenopodium bonus-henricus' && li.querySelector('[data-mark="season"]')), { timeout: 10_000 }, row).then(() => true, () => false), `${width} px: Good-King-Henry in Add with its cool-season tag`);
    const tag = await page.evaluate((sel) => [...document.querySelectorAll(sel)].find((li) => li.querySelector('.ct-sci')?.textContent === 'Chenopodium bonus-henricus').querySelector('[data-mark="season"]').textContent, row);
    assert.equal(tag, 'grow in the cool season');
    assert.equal(await page.evaluate((sel) => !![...document.querySelectorAll(sel)].find((li) => li.querySelector('.ct-sci')?.textContent === 'Chenopodium bonus-henricus').querySelector('[data-mark="outside"]'), row), false, 'not outside');
    const over = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      marks: [...document.querySelectorAll('#ct-root .ct-tag, #ct-root .ct-flag, dialog .ct-tag, dialog .ct-flag')].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).map((e) => e.textContent) }));
    // doc ≤ 0: with the dialog open on desktop the page's scrollbar is hidden (scrollWidth < clientWidth).
    assert.deepEqual({ doc: Math.max(0, over.doc), marks: over.marks }, { doc: 0, marks: [] }, `${width} px: no sideways scroll, no mark past the edge`);
    const annual = await page.evaluate(() => window.__ctTest.store.pools.value.Temperate.find((t) => t.canonical_name === 'Chenopodium bonus-henricus')?.id);
    assert.ok(annual, 'Good-King-Henry is on the Temperate list');
    await page.evaluate((id) => window.__ctTest.store.openSheet('details', id), annual);
    assert.ok(await has(page, '[data-mark-surface="details"][data-mark="season"]', 10_000), 'Details: the cool-season line');
    assert.equal(await text(page, '[data-mark-surface="details"][data-mark="season"]'), 'Too hot in summer here: grow it in the cool season.');
    assert.equal(await page.$('[data-mark-surface="details"][data-mark-state="annual"]'), null, 'not the warm-season note');
  }
  // A dry site, no location: drought tolerance Medium (lemon) says to water in the dry months.
  const page = await tool({ width: 390 });
  await choose(page, 'Mediterranean');
  const lemon = await page.evaluate(() => window.__ctTest.store.pools.value.Mediterranean.find((t) => t.canonical_name === 'Citrus limon')?.id);
  assert.ok(lemon, 'lemon is on the Mediterranean list');
  await page.evaluate((id) => { const { store } = window.__ctTest; store.site.value = { ...store.site.value, water: 'dry' }; store.openSheet('details', id); }, lemon);
  assert.ok(await has(page, '[data-mark-surface="details"][data-mark="water"]', 10_000), 'Details: the watering line');
  assert.equal(await text(page, '[data-mark-surface="details"][data-mark="water"]'), 'Needs watering in the dry months.');
  assert.deepEqual(page.thirdParty, []);
});

// Owner request 2026-11-12: the room answer is advisory. The matrix layers are relative sun exposure,
// so a small garden never blocks a cell nor hides a tall plant in Add; the plant carries a note.
test('P5-27r (S5c climate ranges, room advisory): in a small garden no cell is blocked for height, and Add lists a walnut with "grows to … m: prune", never behind "show anyway"', async () => {
  for (const width of [390, 1280]) {
    const page = await tool({ width });
    await choose(page, 'Temperate');
    await page.evaluate(() => { const { store } = window.__ctTest; store.site.value = { ...store.site.value, room: 'small' }; store.view.value = 'matrix'; });
    assert.equal(await page.evaluate(() => window.__ctTest.store.matrix.value.rows.flatMap((r) => r.cells).some((c) => c.empty === 'misfit')), false, `${width} px: no cell "can't be filled"`);
    await page.evaluate(() => window.__ctTest.store.openSheet('add'));
    assert.ok(await has(page, '.ct-add .ct-search input', 10_000), 'the Add sheet');
    await page.type('.ct-add .ct-search input', 'Juglans regia');
    const row = '.ct-add .ct-rows li';
    assert.ok(await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].some((li) => li.querySelector('.ct-sci')?.textContent === 'Juglans regia' && li.querySelector('[data-mark="room"]')), { timeout: 10_000 }, row).then(() => true, () => false), `${width} px: the walnut with its height note`);
    const tag = await page.evaluate((sel) => [...document.querySelectorAll(sel)].find((li) => li.querySelector('.ct-sci')?.textContent === 'Juglans regia').querySelector('[data-mark="room"]').textContent, row);
    assert.match(tag, /^grows to [\d.]+ m: prune$/);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 0, `${width} px: no sideways scroll`);
    // Its Add does not ask first (a height is never a misfit): the walnut joins at once.
    await page.evaluate((sel) => { const li = [...document.querySelectorAll(sel)].find((x) => x.querySelector('.ct-sci')?.textContent === 'Juglans regia'); (li.querySelector('input[type="checkbox"]') ?? li.querySelector('button')).click(); }, row);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 100)));
    assert.equal(await page.$('dialog.ct-ask[open]'), null, 'no warning to confirm');
    const bar = await page.$('.ct-add-bar .button-primary:not([disabled])');
    if (bar) await bar.click();
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.memberTaxa.value.some((t) => t.canonical_name === 'Juglans regia'), { timeout: 5000 }).then(() => true, () => false), 'added without asking');
    assert.deepEqual(page.thirdParty, []);
  }
});

// ---- S5d: future check ----

// At Seville on the Mediterranean list: on the schema 3 ranges (heat limit at Q99) Lyon's Temperate list
// has 1 plant of 101 outside by 2041–2070, too few for a suggestion to hold one.
test('P5-18 (S5d future summary): at Seville on the Mediterranean list the panel leads with "n of m outside by 2041–2070" under SSP2-4.5', async () => {
  const page = await tool();
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await has(page, '[data-future-summary]', 10_000), 'the future panel');
  assert.match(await text(page, '[data-future-summary]'), /\d+ of \d+ .*2041–2070/);
  assert.equal(await page.evaluate(() => window.__ctTest.store.scenario.value), 'ssp245');
  assert.equal(await page.$eval('input[name="ct-scenario"]:checked', (e) => e.value), 'ssp245', 'SSP2-4.5 checked by default');
  // The lede says what is compared: constrained CMIP6 changes on CHELSA v2.1, ranges with cultivation included, not reviewed.
  assert.match(await text(page, '#ct-future-h + p'), /CMIP6 model ensemble \(Beck et al\., 2023\).*CHELSA v2\.1.*1981–2010.*cultivation included.*not reviewed/);
  // The members not counted in "n of m" are counted on their own line, so the numbers add up.
  const lines = await page.$$eval('[data-future-verdict]', (els) => els.map((e) => e.getAttribute('data-future-verdict')));
  const uncounted = lines.filter((v) => v === 'not-checked').length;
  const said = ((await text(page, '[data-future-uncounted]')) ?? '').match(/\d+/g)?.reduce((n, d) => n + Number(d), 0) ?? 0;
  assert.equal(said, uncounted, 'the uncounted line adds up to the members outside "n of m"');
  // Each member has its line; one outside carries an ink mark (a note, not the ochre warning) on its chip.
  const verdicts = await page.$$eval('[data-future-verdict]', (els) => els.map((e) => e.getAttribute('data-future-verdict')));
  const members = await page.evaluate(() => window.__ctTest.store.members.value.length);
  assert.equal(verdicts.length, members, 'one line per member');
  assert.ok(verdicts.includes('outside'), `Seville's suggestion has a member outside by its period (${verdicts})`);
  assert.ok(await has(page, '[data-mark="future"][data-mark-surface="chip"]', 10_000), 'a future mark on a chip');
  assert.equal(await page.$('[data-mark="future"].ct-flag'), null, 'drawn in ink, apart from the ochre warnings');
  // The scenario control: a real radio; SSP5-8.5 never puts fewer plants outside than SSP2-4.5.
  const outside = () => page.$$eval('[data-future-verdict="outside"]', (els) => els.length);
  const before = await outside();
  await page.click('input[name="ct-scenario"][value="ssp585"]');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.scenario.value === 'ssp585', { timeout: 5000 }).then(() => true, () => false), 'the radio writes store.scenario');
  assert.ok(await outside() >= before);
  const named = await page.$$eval('[data-future-verdict="inside"], [data-future-verdict="edge"], [data-future-verdict="outside"]', (els) => els.map((e) => e.textContent));
  assert.ok(named.length > 0 && named.every((t) => t.includes('SSP5-8.5')), `every checked line names the chosen scenario (${named.join(' | ')})`);
  // Without a location nothing shows.
  await page.evaluate(() => { window.__ctTest.store.location.value = null; });
  assert.ok(await page.waitForFunction(() => !document.querySelector('[data-future]') && !document.querySelector('[data-mark="future"]'), { timeout: 5000 }).then(() => true, () => false), 'no location: no panel and no future mark');
});

test('P5-19 (S5d not checked): with no future data for the site the panel says "not checked", never "fine"', async () => {
  const page = await tool();
  const full = await lookupAt(...SITES.lyon);
  await atSite(page, 'lyon', { climate: { ...full.climate, periods: full.climate.periods.slice(0, 1) } });
  await choose(page, 'Temperate');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await has(page, '[data-future="not-checked"]', 10_000), 'the future panel says "not checked"');
  assert.match(await text(page, '[data-future="not-checked"]'), /not checked/);
  assert.equal(await page.$('[data-future-summary]'), null, 'no count that could read as "fine"');
  assert.equal(await page.$('[data-mark="future"]'), null);
});

test('P5-19b (S5d future panel, hand-off layout shift): the panel lands below Share, Print and Download, and nothing above it moves when it arrives', async () => {
  for (const width of [1280, 390]) {
    const page = await tool({ width });
    await atSite(page, 'lyon');
    // The after-the-matrix chunk (the panel's shell) waits, so the page is measured before the panel lands.
    await page.evaluate(() => window.__ctTest.holdLater());
    await page.click('input[name="ct-climate"][value="temperate"]');
    const suggest = await page.waitForFunction(() => [...document.querySelectorAll('.ct-cta button')].find((b) => b.textContent.trim() === 'Suggest plants'), { timeout: 10_000 });
    await suggest.click();
    assert.ok(await has(page, '.ct-action-row button', 10_000), `${width} px: the action row`);
    // Document positions of what a reader may be clicking: the tabs, Add plants, the action row's buttons.
    const spots = () => page.evaluate(() => [...document.querySelectorAll('.ct-tab, .ct-viewbar button, .ct-action-row button')].map((e) => Math.round(e.getBoundingClientRect().top + scrollY)));
    const before = await spots();
    assert.equal(await page.$('[data-future]'), null, `${width} px: measured before the panel`);
    await page.evaluate(() => window.__ctTest.releaseLater());
    assert.ok(await has(page, '[data-future-summary]', 10_000), `${width} px: the future panel lands`);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    assert.deepEqual(await spots(), before, `${width} px: the tabs and the actions stay where they were`);
    const [row, panel] = await page.evaluate(() => [document.querySelector('.ct-action-row').getBoundingClientRect().bottom, document.querySelector('[data-future]').getBoundingClientRect().top]);
    assert.ok(panel >= row, `${width} px: the panel is below the action row (${panel} < ${row})`);
    await page.browserContext().close().catch(() => {});
  }
});

// ---- S5e: native here and soil likely ----

test('P5-20 (S5e native here, three states): at Lyon (FRA) Details says native, not recorded native, or unknown', { todo: 'S5e: moved to P5.2, after the P5 push; native here not built' }, async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  const pick = await realDb((db) => ({
    native: db.prepare("SELECT p.canonical_name n FROM plants p JOIN plant_areas a USING (plant) JOIN placements pl ON pl.plant = p.plant AND pl.climate_zone = 'Mediterranean' WHERE a.area = 'FRA' AND a.introduced = 0 ORDER BY n LIMIT 1").get()?.n,
    not_recorded: db.prepare("SELECT p.canonical_name n FROM plants p JOIN placements pl ON pl.plant = p.plant AND pl.climate_zone = 'Mediterranean' WHERE p.wcvp_match IS NOT NULL AND p.plant NOT IN (SELECT plant FROM plant_areas WHERE area = 'FRA' AND introduced = 0) ORDER BY n LIMIT 1").get()?.n,
    unknown: db.prepare("SELECT p.canonical_name n FROM plants p JOIN placements pl ON pl.plant = p.plant AND pl.climate_zone = 'Mediterranean' WHERE p.wcvp_match IS NULL ORDER BY n LIMIT 1").get()?.n,
  }));
  await choose(page, 'Mediterranean');
  for (const [state, name] of Object.entries(pick)) {
    assert.ok(name, `a Mediterranean plant for "${state}"`);
    await page.evaluate((n) => { const { store } = window.__ctTest; const t = store.pool.value.find((x) => x.canonical_name === n); store.openSheet('details', t.id); }, name);
    assert.ok(await has(page, `[data-native="${state}"]`, 10_000), `${name}: ${state}`);
  }
});

test('P5-21 (S5e soil likely): at Manaus the soil question offers "Likely: acid (pH 4.3, SoilGrids) · Use it" and keeps "Not sure" until used', { todo: 'S5e: moved to P5.2, after the P5 push; soil likely not built' }, async () => {
  const page = await tool();
  await atSite(page, 'manaus');
  await choose(page, 'Tropical');
  assert.ok(await has(page, '[data-likely="soil"]', 10_000), 'the soil question offers what SoilGrids makes likely');
  assert.match(await text(page, '[data-likely="soil"]'), /4\.3/);
  assert.equal(await page.evaluate(() => window.__ctTest.store.site.value.soil), 'unsure', 'never prefilled');
  await page.click('[data-likely="soil"] [data-likely-use]');
  assert.equal(await page.evaluate(() => window.__ctTest.store.site.value.soil), 'acid');
  for (const q of ['light', 'room']) assert.equal(await page.$(`[data-likely="${q}"]`), null, `${q} is never offered`);
});

test('P5-22 (S5e soil borderline): at Lyon (pH 5.9, within 0.3 of the acid bound) nothing is offered', { todo: 'S5e: moved to P5.2, after the P5 push; soil likely not built' }, async () => {
  const page = await tool();
  await atSite(page, 'manaus');
  await choose(page, 'Tropical');
  assert.ok(await has(page, '[data-likely="soil"]', 10_000), 'the offer exists where the soil is clear (Manaus)');
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(await page.$('[data-likely="soil"]'), null);
});

// ---- S5f: credits and privacy ----

const PRIVACY_LANGS = { fr: 'fr', ja: 'ja' };
test('P5-23 (S5f privacy page in fr and ja): /fr/privacy/ and /ja/privacy/ name what the location step sends and to whom', async () => {
  for (const [lang, attr] of Object.entries(PRIVACY_LANGS)) {
    const res = await fetch(`${h.url}/${lang}/privacy/`);
    assert.equal(res.status, 200, `/${lang}/privacy/`);
    const page = await h.open(`/${lang}/privacy/`);
    assert.equal(await page.$eval('html', (e) => e.lang), attr);
    const body = await text(page, 'main');
    for (const who of ['Nominatim', 'OpenFreeMap']) assert.ok(body.includes(who), `${lang}: names ${who}`);
    // Each service's own privacy policy is one click away.
    for (const policy of ['https://osmfoundation.org/wiki/Privacy_Policy', 'https://openfreemap.org/privacy/']) {
      assert.ok(await page.$(`main a[href="${policy}"]`), `${lang}: links ${policy}`);
    }
    assert.ok(await page.$('h1'), `${lang}: a title`);
  }
  assert.equal((await fetch(`${h.url}/privacy/`)).status, 200, 'and in English at /privacy/');
});

test('P5-24 (S5f footer link): every page\'s footer links to its locale\'s privacy page', async () => {
  for (const [path, href] of [['/', '/privacy/'], ['/fr/consortium/', '/fr/privacy/'], ['/ja/data-sources/', '/ja/privacy/']]) {
    const page = await h.open(path);
    assert.ok(await page.$(`footer a[href="${href}"]`), `${path}: footer link to ${href}`);
  }
});

test('P5-25 (S5f credits): /data-sources/ credits the climate, soil, region, occurrence, map and search sources', async () => {
  const page = await h.open('/data-sources/');
  const credits = await page.$$eval('[data-credit]', (els) => els.map((e) => e.getAttribute('data-credit')));
  for (const id of ['canopi-climate', 'chelsa', 'koppen-beck', 'soilgrids', 'wgsrpd', 'natural-earth', 'gbif', 'openfreemap', 'nominatim']) {
    assert.ok(credits.includes(id), `credits ${id}`);
  }
  assert.match(await text(page, '[data-credit="gbif"]'), /GBIF\.org/);
});
