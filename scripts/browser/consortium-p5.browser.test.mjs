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
import { has, realDb } from './helpers.mjs';
import { EXPECTED, NOMINATIM, SITES, lookupAt } from './location-fixtures.mjs';

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
const storeClimate = (page) => page.evaluate(() => window.__ctTest.store.climate.value);
// The result line ready, the suggested card confirmed (owner answer 1), then a consortium in the matrix.
async function confirmAndSuggest(page) {
  await page.click('[data-location-confirm]');
  await page.evaluate(async () => { const { store } = window.__ctTest; await store.loadPool(store.climate.value); store.suggestMembers(); store.view.value = 'matrix'; });
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

test('P5-0d (commit 0 seams): today the start step shows no location controls, no marks and no likely offers, and calls no third party', async () => {
  const page = await tool({ nominatim: 'fixture', mapTiles: 'stub' });
  assert.equal(await page.$('[data-location-action]'), null);
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await page.waitForFunction(() => document.querySelectorAll('[data-plant-id]').length > 0 && window.__ctTest.store.markProviders.value.length === 3, { timeout: 10_000 }).then(() => true, () => false), 'members in the matrix, and the mark providers loaded for the location');
  assert.equal(await page.$('[data-mark]'), null, 'the mark providers are stubs');
  assert.equal(await page.$('[data-likely]'), null);
  assert.deepEqual(page.thirdParty, []);
  assert.deepEqual(page.nominatim, []);
});

// ---- S5b: Where is your site? ----

test('P5-1 (S5b location granted): "Use my location" fills the result line and the climate card from the reader', { todo: 'S5b: location controls not built' }, async () => {
  const [lat, lon] = SITES.seville;
  const page = await tool({ geolocation: { lat, lon } });
  await locationControls(page);
  assert.ok(await page.$eval('[data-location-action="geo"]', (b) => !!b.parentElement.querySelector(':scope > [data-location-privacy]')), 'a privacy line beside the button, in its own parent');
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'ready');
  const loc = await page.evaluate(() => window.__ctTest.store.location.value);
  assert.equal(loc.source, 'geo');
  assert.equal(loc.lookup.climate.periods[0].koppen, 'Csa');
  assert.equal(await checkedCard(page), 'mediterranean', 'the Mediterranean card is pre-checked');
  assert.equal(await storeClimate(page), null, 'but not chosen until the reader confirms (owner answer 1)');
  await page.click('[data-location-confirm]');
  assert.equal(await storeClimate(page), 'Mediterranean');
  assert.equal(await page.evaluate(() => window.__ctTest.store.country.value.source), 'location', 'the country "from your location"');
});

test('P5-2 (S5b location denied): a denied permission says so and leaves the manual climate cards', { todo: 'S5b: location controls not built' }, async () => {
  const page = await tool({ geolocation: 'denied' });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'denied');
  assert.equal(await page.evaluate(() => window.__ctTest.store.location.value), null);
  assert.ok(await has(page, '.ct-climates input, .ct-climates button'), 'the climate cards stay');
  assert.equal(await checkedCard(page), null, 'no card pre-checked');
});

test('P5-3 (S5b location timeout): a location that never comes ends in "timeout", with search and map offered', { todo: 'S5b: location controls not built' }, async () => {
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

test('P5-4 (S5b search hit): Enter searches Nominatim once, in the page language, without email; the place sets the site', { todo: 'S5b: place search not built' }, async () => {
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

test('P5-5 (S5b search no result / offline): an unknown place and an offline search each say so, nothing changed', { todo: 'S5b: place search not built' }, async () => {
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

test('P5-6 (S5b map pick and ocean click): "Use the map centre" sets the site; the open sea asks for a point on land', { todo: 'S5b: map not built' }, async () => {
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
});

test('P5-7 (S5b no WebGL): without WebGL the map button is hidden, search and location stay', { todo: 'S5b: map not built' }, async () => {
  const page = await tool({ webgl: false });
  await locationControls(page);
  assert.equal(await page.$('[data-location-action="map"]'), null);
  assert.ok(await has(page, 'input[data-location-search]'));
});

test('P5-8 (S5b coast): a point offshore takes the nearest cell\'s climate and says there is no country or soil there', { todo: 'S5b: location result states not built' }, async () => {
  const [lat, lon] = SITES.coast;
  const page = await tool({ geolocation: { lat, lon } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'coast');
  assert.equal(await checkedCard(page), 'temperate', 'Cfb from the nearest cell, pre-checked');
  assert.equal(await storeClimate(page), null, 'not chosen until confirmed');
  const c = await page.evaluate(() => window.__ctTest.store.country.value);
  assert.notEqual(c.source, 'location', 'no country from the location offshore');
  assert.ok(c.code === null || c.source !== 'location', 'no country offshore');
});

test('P5-9 (S5b polar): an ET site has its own state, no curated list claimed', { todo: 'S5b: location result states not built' }, async () => {
  const [lat, lon] = SITES.polar;
  const page = await tool({ geolocation: { lat, lon } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'polar');
  assert.equal(await storeClimate(page), null, 'no climate chosen');
  assert.equal(await checkedCard(page), null, 'no curated card claimed');
});

test('P5-10 (S5b borderline): Lyon says "Borderline: check the climate" and keeps the cards open', { todo: 'S5b: location result states not built' }, async () => {
  const [lat, lon] = SITES.lyon;
  const page = await tool({ geolocation: { lat, lon } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'borderline');
  assert.ok(await has(page, '.ct-climates'), 'the cards stay open');
  assert.equal(await checkedCard(page), null, 'no card pre-checked when borderline');
  assert.equal(await storeClimate(page), null);
  const calm = await tool({ geolocation: { lat: SITES.seville[0], lon: SITES.seville[1] } });
  await locationControls(calm);
  await calm.click('[data-location-action="geo"]');
  assert.equal(await locationState(calm), 'ready', 'Seville is not borderline');
  assert.equal(await checkedCard(calm), 'mediterranean', 'pre-checked');
  assert.equal(await storeClimate(calm), null, 'not committed until confirmed');
});

test('P5-11 (S5b tiles fail): when the climate tiles cannot be read the manual climate stays, with a line saying so', { todo: 'S5b: location result states not built' }, async () => {
  const [lat, lon] = SITES.seville;
  const page = await tool({ geolocation: { lat, lon }, climateTiles: 404 });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'failed');
  assert.equal((await page.evaluate(() => window.__ctTest.store.location.value))?.lookup ?? null, null);
  assert.ok(await has(page, '.ct-climates'));
  assert.equal(await checkedCard(page), null, 'no card pre-checked');
});

test('P5-12 (S5b share without the tick): a link never carries the location, nor its country, unless asked', { todo: 'S5b: share location tick not built' }, async () => {
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

test('P5-13 (S5b share with "include my location"): the link carries the cell centre only, and opens as "from the shared link, approximate"', { todo: 'S5b: share location tick not built' }, async () => {
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

// ---- S5c: filtered pool and nearest placements ----

// The owner's range rule (2026-11-11) in SQL, for picking a plant: coldest-month minimum on both
// sides and warmest-month maximum on the hot side, 2 °C beyond the percentiles "outside", between
// the percentile and the margin "near the edge".
const RANGED = `SELECT p.canonical_name name, n.low nlo, n.high nhi, x.high xhi FROM plants p
  JOIN placements pl ON pl.plant = p.plant AND pl.climate_zone = ?3
  JOIN plant_climate n ON n.plant = p.plant AND n.variable = 'tmin_cold'
  JOIN plant_climate x ON x.plant = p.plant AND x.variable = 'tmax_warm'`;
const OUTSIDE = '(nlo - 2 > ?1 OR ?1 > nhi + 2 OR ?2 > xhi + 2)';
const EDGE = `(NOT ${OUTSIDE} AND (nlo > ?1 OR ?1 > nhi OR ?2 > xhi))`;
const pickRanged = (where, site, zone) => realDb((db) => db.prepare(`SELECT name FROM (${RANGED}) WHERE ${where} ORDER BY name LIMIT 1`).get(site.tminColdC, site.tmaxWarmC, zone)?.name);

test('P5-14 (S5c nothing fits): at Yakutsk no plant\'s range holds the site: the "nothing fits" state, not an empty matrix', { todo: 'S5c: range filter not built' }, async () => {
  const page = await tool();
  await atSite(page, 'yakutsk');
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Boreal'; });
  assert.ok(await has(page, '[data-pool-empty]', 10_000), 'the nothing-fits state');
});

test('P5-15 (S5c near-edge mark): a Mediterranean plant whose range ends within 2 °C of Seville\'s climate carries "near the edge"', { todo: 'S5c: range marks not built' }, async () => {
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

test('P5-16 (S5c outside-range warning on add): typed in Add, a plant whose range misses the site shows "outside", and adding it still makes it a member', { todo: 'S5c: outside-range warning not built' }, async () => {
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

test('P5-17 (S5c estimate label): at Lyon (Subtropical) plants are placed from the nearest list and labelled "estimate"', { todo: 'S5c: nearest placements not built' }, async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  const count = await page.evaluate(async () => {
    const { store } = window.__ctTest;
    store.climate.value = 'Subtropical';
    if (!(await store.loadPool('Subtropical'))) return 0;
    return store.pool.value.filter((t) => t.estimate && t.placedFrom === 'Mediterranean').length;
  });
  assert.ok(count > 0, 'Subtropical borrows Mediterranean placements');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await has(page, '[data-mark="estimate"]', 10_000));
});

test('P5-26 (S5c borrowed list from a link): #v=4&c=subtropical without o= opens with borrowed plants marked "estimate", no location needed', { todo: 'S5c: nearest placements not built' }, async () => {
  const page = await tool({ hash: '#v=4&c=subtropical&a=&e=1' });
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.climate.value === 'Subtropical', { timeout: 10_000 }).then(() => true, () => false), 'the link\'s climate');
  assert.equal(await page.evaluate(() => window.__ctTest.store.location.value), null, 'no location: borrowing depends on the climate only');
  assert.ok(await page.waitForFunction(() => (window.__ctTest.store.pool.value ?? []).some((t) => t.estimate), { timeout: 10_000 }).then(() => true, () => false), 'a borrowed pool');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await has(page, '[data-mark="estimate"]', 10_000), 'borrowed plants marked "estimate"');
  assert.equal(await page.$('[data-pool-empty]'), null);
});

// ---- S5d: future check ----

test('P5-18 (S5d future summary): at Lyon on the Temperate list the panel leads with "n of m outside by 2041–2070" under SSP2-4.5', { todo: 'S5d: future check not built' }, async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await has(page, '[data-future-summary]', 10_000), 'the future panel');
  assert.match(await text(page, '[data-future-summary]'), /\d+ of \d+ .*2041–2070/);
  assert.equal(await page.evaluate(() => window.__ctTest.store.scenario.value), 'ssp245');
});

test('P5-19 (S5d not checked): with no future data for the site the panel says "not checked", never "fine"', { todo: 'S5d: future check not built' }, async () => {
  const page = await tool();
  const full = await lookupAt(...SITES.lyon);
  await atSite(page, 'lyon', { climate: { ...full.climate, periods: full.climate.periods.slice(0, 1) } });
  await choose(page, 'Temperate');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await has(page, '[data-future="not-checked"]', 10_000), 'the future panel says "not checked"');
  assert.equal(await page.$('[data-mark="future"]'), null);
});

// ---- S5e: native here and soil likely ----

test('P5-20 (S5e native here, three states): at Lyon (FRA) Details says native, not recorded native, or unknown', { todo: 'S5e: native here not built' }, async () => {
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

test('P5-21 (S5e soil likely): at Manaus the soil question offers "Likely: acid (pH 4.3, SoilGrids) · Use it" and keeps "Not sure" until used', { todo: 'S5e: soil likely not built' }, async () => {
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

test('P5-22 (S5e soil borderline): at Lyon (pH 5.9, within 0.3 of the acid bound) nothing is offered', { todo: 'S5e: soil likely not built' }, async () => {
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
