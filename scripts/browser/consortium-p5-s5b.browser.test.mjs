// The P5 browser specs of stream S5b: location input (§B): device location, search, map, coast, polar, borderline, tiles failing, sharing. Split from consortium-p5 by owner tag
// (E1 design check A6); each test is "P5-n (S5b …)".
//
// No network: Nominatim and OpenFreeMap are stubbed (harness.mjs nominatim / mapTiles), the device
// location is emulated through CDP (geolocation), and any other request off the site is aborted and
// listed in page.thirdParty. The places and what the climate reader answers there are in
// ./location-fixtures.mjs; the specs' shared helpers in ./p5-helpers.mjs. The page contract the
// specs read is written at the top of ./p5-helpers.mjs. scripts/browser-tests.test.mjs enforces the
// layout. Headless Chrome on dist-test, capped:
//   timeout 600 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 \
//     node --experimental-strip-types --disable-warning=ExperimentalWarning --test scripts/browser/consortium-p5-s5b.browser.test.mjs
// (npm run test:browser runs every file in shards: scripts/browser/run.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState } from './harness.mjs';
import { h, has, suggestReady, useHarness } from './helpers.mjs';
import { SITES, lookupAt, openCards, pickCard } from './location-fixtures.mjs';
import { tool, choose, locationControls, locationState, text, checkedCard, savedLocation, ready, storeClimate, confirmAndSuggest, search, slowTiles, releaseTiles, watchFirstMembers, withSavedSite, temperateLink, ownSite, savedOpening, savedFailing, climateAsk, members } from './p5-helpers.mjs';

useHarness();

// ---- S5b: Where is your site? ----

test('P5-1 (S5b location granted): "Use my location" fills the result line and uses the climate read at once; the soil map is asked only once the place is in use', async () => {
  const [lat, lon] = SITES.seville;
  const page = await tool({ geolocation: { lat, lon } });
  const tileRequests = [];
  page.on('request', (r) => { if (/\/data\/climate\//.test(r.url())) tileRequests.push(new URL(r.url()).pathname); });
  await locationControls(page);
  // When the place is in use (the store's location with its lookup), on the page's clock.
  await page.evaluate(() => {
    performance.setResourceTimingBufferSize(5000);
    window.__placeAt = null;
    window.__ctTest.store.location.subscribe((v) => { if (v?.lookup && window.__placeAt === null) window.__placeAt = performance.now(); });
  });
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'ready');
  assert.ok(tileRequests.some((u) => /\/tiles\//.test(u)), `the climate tile was read (${tileRequests.join(', ')})`);
  // M8, h3 G1 R1 (location.ts soilLater): "Your place in figures" reads the soil map, asked after the
  // place is in use, so a slow or failed soil tile never holds the place.
  const soilAt = () => page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /\/soil\//.test(e.name)).map((e) => e.startTime));
  for (const end = Date.now() + 10_000; Date.now() < end && !(await soilAt()).length;) await new Promise((r) => setTimeout(r, 100));
  const soil = await soilAt();
  assert.ok(soil.length > 0, `the soil map is read for the figures (${tileRequests.join(', ')})`);
  const order = { place: await page.evaluate(() => window.__placeAt), soil: Math.min(...soil) };
  assert.ok(order.place !== null && order.soil >= order.place, `the place in use (${order.place} ms) before any soil tile is asked (${order.soil} ms)`);
  const loc = await page.evaluate(() => window.__ctTest.store.location.value);
  assert.equal(loc.source, 'geo');
  assert.equal(loc.lookup.climate.periods[0].koppen, 'Csa');
  // v14 board Place ("We read … used at once"): no proposal to confirm.
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.climate.value === 'Mediterranean', { timeout: 5000 }).then(() => true, () => false), 'Mediterranean, read and used at once');
  assert.equal(await page.evaluate(() => window.__ctTest.store.country.value.source), 'location', 'the country "from your location"');
});

test('P5-1c (S5b review round 1, 4): a lookup ending while a pasted link restores is not a reader action: the link still opens', async () => {
  const maker = await tool();
  await choose(maker, 'Temperate');
  await suggestReady(maker);
  await maker.evaluate(() => { window.__ctTest.store.suggestMembers(); window.__ctTest.store.view.value = 'matrix'; });
  assert.ok(await maker.waitForFunction(() => /[#&]v=5/.test(location.hash) && /[#&]a=[^&]/.test(location.hash), { timeout: 10_000 }).then(() => true, () => false), 'the address holds the palette');
  const link = await maker.evaluate(() => location.hash);
  const page = await tool({ geolocation: { lat: SITES.seville[0], lon: SITES.seville[1] } });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  // The ask has begun (its chunk loaded, the line "loading"), then the link is pasted: the link is the
  // newer act, so its climate stands when the lookup ends.
  assert.ok(await page.waitForSelector('[data-location-state="loading"]', { timeout: 10_000 }).then(() => true, () => false), 'the lookup has begun');
  await page.evaluate((l) => { location.hash = l; }, link);
  assert.ok(await page.waitForFunction(() => !!window.__ctTest.store.location.value?.lookup, { timeout: 15_000 }).then(() => true, () => false), 'the lookup ends');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.climate.value === 'Temperate' && window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'the link restored, its climate standing over the lookup\'s');
});

test('P5-1d (S5b review round 1 addendum): Suggest pressed while a location lookup is pending waits for it, so the range filter sees the site', async () => {
  // The climate tiles held until the test releases them: the lookup is surely pending when Suggest is pressed.
  const page = await slowTiles('held');
  await pickCard(page, 'mediterranean');
  assert.ok(await has(page, '[data-place-suggest]', 15_000), 'Suggest shows');
  await watchFirstMembers(page);
  await page.click('[data-location-action="geo"]');
  await page.click('[data-place-suggest]');
  await releaseTiles(page);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 20_000 }).then(() => true, () => false), 'the suggestion comes');
  assert.equal(await page.evaluate(() => window.__firstMembers), true, 'members were built only once the site was read');
});

test('P5-1e (S5b review round 2, 2): Suggest pressed while the saved location is looked up again waits for the site', async () => {
  const page = await slowTiles('held', { saved: JSON.stringify({ lat: SITES.seville[0], lon: SITES.seville[1], source: 'geo' }) });
  await pickCard(page, 'mediterranean');
  assert.ok(await has(page, '[data-place-suggest]', 15_000));
  await watchFirstMembers(page);
  assert.ok(await page.waitForFunction(() => !!document.querySelector('[data-location-state="loading"]'), { timeout: 10_000 }).then(() => true, () => false), 'the saved site is being looked up (its tiles held)');
  await page.click('[data-place-suggest]');
  await releaseTiles(page);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 20_000 }).then(() => true, () => false));
  assert.equal(await page.evaluate(() => window.__firstMembers), true, 'members built once the saved site was read');
});

test('P5-1f (S5b review round 2, 3): tiles that never answer hold Suggest at most ~10 s, which then says the climate was not read; the read fails after ~15 s', async () => {
  // The production 10 s and 15 s, shortened in the test build (E1 design check A5): the order and the
  // states are what is checked, not the clock. The read fails 4.5 s after Suggest's cap (less the
  // time from the location click to the Suggest click), so the "not read" line is up for seconds,
  // even on a loaded machine.
  const timeouts = { suggest: 1500, read: 6000 };
  const page = await slowTiles('never', { timeouts });
  await pickCard(page, 'mediterranean');
  assert.ok(await has(page, '[data-place-suggest]', 15_000));
  await page.click('[data-location-action="geo"]');
  const t0 = Date.now();
  await page.click('[data-place-suggest]');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: timeouts.suggest + 4000 }).then(() => true, () => false), 'Suggest ran within the cap');
  assert.ok(Date.now() - t0 >= timeouts.suggest * 0.8, 'after waiting for the site first');
  assert.ok(await page.waitForFunction(() => /not read in time/.test(document.querySelector('.ct-toast-region')?.textContent ?? ''), { timeout: 4000 }).then(() => true, () => false), 'a message says the climate was not read (board Loading)');
  // h2 R1: one toast, the suggestion's: its words, the "not read" sentence, its Undo kept, and the
  // board's "Read it again" beside it (a second toast would take the Undo the Empty card promises).
  const toast = await page.evaluate(() => { const r = document.querySelector('.ct-toast-region'); return { text: r?.textContent.replace(/\s+/g, ' ') ?? '', buttons: [...(r?.querySelectorAll('button') ?? [])].map((b) => b.textContent.trim()) }; });
  assert.match(toast.text, /A starting palette of \d+ plants was added, each marked “suggested”\. Plants were suggested without your place’s climate: it was not read in time\./, 'the suggestion and the unread sentence in one toast');
  assert.ok(toast.buttons.includes('Undo'), `the suggestion's Undo stays (${toast.buttons.join(', ')})`);
  assert.ok(toast.buttons.includes('Read it again'), `board Loading: "Read it again" (${toast.buttons.join(', ')})`);
  await page.evaluate(() => [...document.querySelectorAll('.ct-toast-region button')].find((b) => b.textContent.trim() === 'Undo').click());
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 0, { timeout: 4000 }).then(() => true, () => false), 'Undo takes the suggested palette back');
  // Undo went back to Place (the view is an undo field); else its step.
  if (!(await has(page, '[data-location-state]', 2000))) assert.ok(await page.waitForSelector('#ct-steps [data-step-place]', { visible: true, timeout: 5000 }).then((b) => b.click()).then(() => true, () => false), 'the "Your place" step');
  assert.ok(await page.waitForFunction(() => document.querySelector('[data-location-state]')?.getAttribute('data-location-state') === 'failed', { timeout: timeouts.read + 4000 }).then(() => true, () => false), 'the stalled read ends as failed, on Place');
  assert.equal(await page.$('[data-location-unread]'), null, 'review round 3 (3): no "not read" note left beside the failed line');
});

test('P5-1g (S5b review round 4, 1): a "Use my location" left at its permission prompt and replaced by a search holds nothing: Suggest runs at once, no "not read"', async () => {
  // A prompt nobody answers: the position never comes, the permission stays "prompt".
  const page = await tool({ nominatim: 'fixture', setup: (pg) => pg.evaluateOnNewDocument(() => {
    Geolocation.prototype.getCurrentPosition = function () {};
    const q = Permissions.prototype.query;
    Permissions.prototype.query = function (d) { return d?.name === 'geolocation' ? Promise.resolve(Object.assign(new EventTarget(), { state: 'prompt', name: 'geolocation' })) : q.call(this, d); };
  }) });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  await search(page, 'Seville');
  assert.equal(await locationState(page), 'ready', 'Seville read');
  assert.ok(await has(page, '[data-place-suggest]', 15_000));
  const t0 = Date.now();
  await page.click('[data-place-suggest]');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 8000 }).then(() => true, () => false), 'Suggest ran');
  assert.ok(Date.now() - t0 < 5000, `at once, not after the 10 s cap (${Date.now() - t0} ms)`);
  assert.equal(await page.$('[data-location-unread]'), null, 'Seville was read: no "not read" note');
});

test('P5-13d (S5b review round 3, 2): the palette\'s "Your place" step drops a link\'s lookup on a stalled network: no loading line, no later "failed", no Suggest hold', async () => {
  const [lat, lon] = SITES.seville;
  const maker = await tool({ geolocation: { lat, lon } });
  await locationControls(maker);
  await maker.click('[data-location-action="geo"]');
  assert.equal(await locationState(maker), 'ready');
  await confirmAndSuggest(maker);
  await maker.waitForSelector('input[data-share-location]', { visible: true, timeout: 10_000 });
  await maker.click('input[data-share-location]');
  const link = new URL(await maker.$eval('#ct-share-field', (e) => e.value));
  // The read's production 15 s, shortened (A5). The test waits for that timer to fire (the read's
  // console line, location.tsx read()), not for the clock, so it cannot pass before the dead lookup
  // has had its chance to write.
  const READ = 5000;
  const page = await slowTiles('never', { timeouts: { read: READ } });
  await page.evaluate(() => {
    window.__readTimedOut = false;
    const error = console.error;
    console.error = (...a) => { if (/site's climate could not be read: no answer/.test(String(a[0]))) window.__readTimedOut = true; error.apply(console, a); };
  });
  await page.evaluate((hash) => { location.hash = hash; }, link.hash);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.location.value?.source === 'link' && window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'the link opens, its lookup stalled');
  // The read itself has started (its timer armed): the location chunk's own loading line, not the
  // slot's placeholder while that chunk loads. Pressed earlier, Start over drops the lookup before any
  // read, and no timer is left to fire (seen on CI, push B).
  assert.ok(await page.waitForFunction(() => window.__tileAsks > 0, { timeout: 15_000 }).then(() => true, () => false), 'the stalled read has started');
  await page.waitForSelector('#ct-steps [data-step-place]', { visible: true, timeout: 5000 }).catch(() => null);
  const started = await page.evaluate(() => { const b = document.querySelector('#ct-steps [data-step-place]'); b?.click(); return { clicked: !!b, early: window.__readTimedOut }; });
  assert.ok(started.clicked, 'the "Your place" step');
  assert.equal(started.early, false, `pressed while the read was still pending (before its ${READ} ms timer)`);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.view.value === 'start' && window.__ctTest.store.location.value === null, { timeout: 5000 }).then(() => true, () => false), 'Place, the link\'s location gone');
  const LINE = '[data-location-state]:not([data-location-state="none"])';
  assert.equal(await page.$(LINE), null, 'no "loading" line on Place');
  // Any result line from now on is the dead lookup's.
  await page.evaluate(() => { window.__lateLine = false; new MutationObserver(() => { if (document.querySelector('[data-location-state]:not([data-location-state="none"])')) window.__lateLine = true; }).observe(document.body, { subtree: true, childList: true }); });
  assert.ok(await page.waitForFunction(() => window.__readTimedOut, { timeout: READ + 5000 }).then(() => true, () => false), 'the stalled read\'s timer fired');
  // Its rejection settles in microtasks and Preact renders on the next tick: half a second covers both.
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(await page.evaluate(() => window.__lateLine), false, 'the dead lookup wrote no line after its timeout');
  assert.equal(await page.$(LINE), null, 'no later "failed" line');
  // Suggest is not held by it (Place's Start over first: with a palette Place offers no Suggest).
  await page.click('[data-start-over]');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 0, { timeout: 5000 }).then(() => true, () => false), 'Start over');
  await pickCard(page, 'mediterranean');
  assert.ok(await has(page, '[data-place-suggest]', 15_000));
  const t0 = Date.now();
  await page.click('[data-place-suggest]');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0 && window.__ctTest.store.view.value === 'matrix', { timeout: 8000 }).then(() => true, () => false), 'Suggest runs at once');
  assert.ok(Date.now() - t0 < 8000);
});

test('P5-2 (S5b location denied): a denied permission says so and leaves the manual climate cards', async () => {
  const page = await tool({ geolocation: 'denied' });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'denied');
  assert.equal(await page.evaluate(() => window.__ctTest.store.location.value), null);
  assert.ok(await has(page, '[data-place-climates]'), 'the climate cards stay, one link away');
  assert.equal(await text(page, '[data-place-climates]'), 'No location? Choose a climate');
  assert.equal(await checkedCard(page), null, 'no card pre-checked');
});

test('P5-3 (S5b location timeout): a location that never comes ends in "timeout", with search and map offered', async () => {
  // The browser's TIMEOUT after 300 ms rather than the call's 15 s (A5).
  const page = await tool({ geolocation: 'timeout', geoTimeoutMs: 300 });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page, 5000), 'timeout');
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
  await new Promise((r) => setTimeout(r, 1000));
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
  const page = await h.open('/palette/', { hook: true, mapTiles: 'stub', geolocation: { lat: SITES.seville[0], lon: SITES.seville[1] }, setup: (pg) => pg.evaluateOnNewDocument(() => {
    window.__gl = [];
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
      const c = get.call(this, kind, ...rest);
      if (/webgl/.test(kind) && c && !this.isConnected) window.__gl.push(c);
      return c;
    };
  }) });
  await ready(page);
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'ready');
  await confirmAndSuggest(page);
  const gl = await page.evaluate(() => window.__gl.map((c) => c.isContextLost()));
  assert.equal(gl.length, 1, 'one probe, though Place and the palette page both draw location controls');
  assert.deepEqual(gl, [true], 'its context released (WEBGL_lose_context)');
});

test('P5-7 (S5b no WebGL): without WebGL the map button is hidden, search and location stay', async () => {
  const page = await tool({ webgl: false });
  await locationControls(page);
  assert.equal(await page.$('[data-location-action="map"]'), null);
  assert.ok(await has(page, 'input[data-location-search]'));
});

test('P5-7b (S5b review round 1, 10): without the Geolocation API "Use my location" is hidden, search stays', async () => {
  const page = await h.open('/palette/', { hook: true, mapTiles: 'stub', setup: (pg) => pg.evaluateOnNewDocument(() => { delete Navigator.prototype.geolocation; }) });
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
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.climate.value === 'Temperate', { timeout: 5000 }).then(() => true, () => false), 'Cfb from the nearest cell, used');
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

test('P5-11 (S5b tiles fail): when the climate tiles cannot be read the manual climate stays, with a line saying so', async () => {
  const [lat, lon] = SITES.seville;
  const page = await tool({ geolocation: { lat, lon }, climateTiles: 404 });
  await locationControls(page);
  await page.click('[data-location-action="geo"]');
  assert.equal(await locationState(page), 'failed');
  assert.equal((await page.evaluate(() => window.__ctTest.store.location.value))?.lookup ?? null, null);
  assert.ok(await has(page, '[data-place-climates]'), 'the manual climate cards, one link away');
  assert.equal(await text(page, '[data-place-climates]'), 'No location? Choose a climate', 'no climate came from the location: the link never says "Not this climate?"');
  assert.equal(await checkedCard(page), null, 'no card pre-checked');
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
  const opened = await h.open(new URL(link).pathname + new URL(link).search + new URL(link).hash, { hook: true });
  assert.equal(await loadState(opened), 'ready');
  assert.ok(await opened.waitForFunction((a, b) => { const l = window.__ctTest.store.location.value; return l?.source === 'link' && l.lat === a && l.lon === b; }, { timeout: 15_000 }, cell.cellLat, cell.cellLon).then(() => true, () => false), 'the link\'s location: the cell centre, from the shared link');
});

test('P5-13c (S5b review round 2, 4): a link\'s location goes with its consortium: the palette\'s "Your place" step clears it (v14: Place\'s Start over is only reached through that step)', async () => {
  const [lat, lon] = SITES.seville;
  const maker = await tool({ geolocation: { lat, lon } });
  await locationControls(maker);
  await maker.click('[data-location-action="geo"]');
  assert.equal(await locationState(maker), 'ready');
  await confirmAndSuggest(maker);
  await maker.waitForSelector('input[data-share-location]', { visible: true, timeout: 10_000 });
  await maker.click('input[data-share-location]');
  const link = new URL(await maker.$eval('#ct-share-field', (e) => e.value));
  for (const label of ['Your place']) {
    const page = await tool({ hash: link.hash });
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.location.value?.source === 'link' && window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'the link opens with its location');
    assert.ok(await page.evaluate((l) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === l || (x.matches('[data-step-place]') && x.textContent.trim().endsWith(l))); b?.click(); return !!b; }, label), label);
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
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.location.value?.source === 'link', { timeout: 15_000 }).then(() => true, () => false), 'the link\'s location, from the shared link');
  assert.deepEqual(await savedLocation(page), mine, 'the reader\'s saved location is untouched');
  assert.notDeepEqual(await page.evaluate(() => window.__ctTest.store.country.value), { code: 'FR', source: 'location' }, 'no country "from your location" from the link\'s cell (Lyon, FR); the reader\'s own may stay');
  // A link without o= pasted into the tab: the link's location goes, with its line, and the reader's
  // own saved site comes back, as a fresh open of that link gives (seam review 5).
  await page.evaluate((h) => { location.hash = h; }, link.hash.replace(/&o=[^&]+/, ''));
  assert.ok(await page.waitForFunction((a, b) => { const l = window.__ctTest.store.location.value; return l?.lookup && l.lat === a && l.lon === b && l.source === 'geo'; }, { timeout: 15_000 }, lat, lon).then(() => true, () => false), 'the link\'s location replaced by the reader\'s own');
  // A later plain visit: the reader's own site again.
  await page.goto(`${new URL(page.url()).origin}/palette/`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  assert.ok(await page.waitForFunction((a, b) => { const l = window.__ctTest.store.location.value; return l?.lookup && l.lat === a && l.lon === b && l.source === 'geo'; }, { timeout: 15_000 }, lat, lon).then(() => true, () => false), 'the saved location comes back');
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

test('P5-27k (S5b seam review round 3, 1): the saved site looked up while the saved consortium opens proposes nothing over it, and none comes back back on Place (the palette\'s "Your place" step)', async () => {
  // The lookup first (the restore's list read waits for it).
  const first = await savedOpening({ list: 'open' });
  assert.ok(await ownSite(first), 'the saved site is read');
  assert.ok(await first.waitForFunction(() => window.__ctTest.store.climate.value === 'Temperate' && window.__ctTest.store.members.value.length === 5, { timeout: 15_000 }).then(() => true, () => false), 'the save opens');
  assert.deepEqual(await climateAsk(first), { climate: 'Temperate', seen: false, shown: false }, 'lookup first: no "Use Mediterranean" over the opening save, no proposal left');
  for (const page of [first]) {
    assert.ok(await page.waitForSelector('#ct-steps [data-step-place]', { visible: true, timeout: 5000 }).then((b) => b.click()).then(() => true, () => false), 'the "Your place" step');
    await new Promise((r) => setTimeout(r, 300));
    assert.deepEqual(await climateAsk(page), { climate: 'Temperate', seen: false, shown: false }, 'back on Place: no stale proposal');
  }
});

test('P5-27j (S5b seam review round 2, 3): a fresh link without o= looks the reader\'s saved site up once', async () => {
  const reads = async (hash) => {
    const page = await h.open(`/palette/${hash}`, { hook: true, mapTiles: 'stub', setup: (pg) => pg.evaluateOnNewDocument((rec) => {
      if (!localStorage.getItem('canopi-location')) localStorage.setItem('canopi-location', rec);
      window.__ownReads = 0;
      const get = Storage.prototype.getItem;
      Storage.prototype.getItem = function (k) { if (k === 'canopi-location') window.__ownReads++; return get.call(this, k); };
    }, JSON.stringify({ lat: SITES.seville[0], lon: SITES.seville[1], source: 'geo' })) });
    await ready(page);
    assert.ok(await ownSite(page));
    await new Promise((r) => setTimeout(r, 1000));
    return page.evaluate(() => window.__ownReads);
  };
  const plain = await reads('');
  const linked = await reads(await temperateLink());
  assert.equal(linked, plain, `the saved site is read as often as on a plain open (${plain}), not twice over`);
});

