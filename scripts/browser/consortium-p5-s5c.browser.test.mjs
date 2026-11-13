// The P5 browser specs of stream S5c: range-filtered pool and nearest placements (§C): nothing fits, near the edge, outside, estimate, borrowed lists. Split from consortium-p5 by owner tag
// (E1 design check A6); each test is "P5-n (S5c …)".
//
// No network: Nominatim and OpenFreeMap are stubbed (harness.mjs nominatim / mapTiles), the device
// location is emulated through CDP (geolocation), and any other request off the site is aborted and
// listed in page.thirdParty. The places and what the climate reader answers there are in
// ./location-fixtures.mjs; the specs' shared helpers in ./p5-helpers.mjs. The page contract the
// specs read is written at the top of ./p5-helpers.mjs. scripts/browser-tests.test.mjs enforces the
// layout. Headless Chrome on dist-test, capped:
//   timeout 600 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 \
//     node --experimental-strip-types --disable-warning=ExperimentalWarning --test scripts/browser/consortium-p5-s5c.browser.test.mjs
// (npm run test:browser runs every file in shards: scripts/browser/run.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState } from './harness.mjs';
import { aria, h, has, realDb, settled, suggestDirect, suggestReady, useHarness } from './helpers.mjs';
import { SITES } from './location-fixtures.mjs';
import { encodeLink } from '../../src/lib/consortium/state.ts';
import { tool, atSite, choose, locationControls, locationState, ADD_OPEN, text, proposedCard, ready, search, RANGED, OUTSIDE, EDGE, pickRanged, atNowhere, emptyMatrix, guestHeld, members } from './p5-helpers.mjs';

useHarness();

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

test('P5-14h (S5c annuals at a cold site, owner "Annuals skip the winter-cold check"): at Yakutsk the Boreal pool keeps its annual crops, Suggest uses them, and an annual is tagged "annual", no season claimed (decision row "Growing months") @real-data', async () => {
  const page = await tool();
  await atSite(page, 'yakutsk');
  await page.evaluate(async () => { const { store } = window.__ctTest; store.climate.value = 'Boreal'; await store.loadPool('Boreal'); });
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.fitPool.value?.length > 0, { timeout: 10_000 }).then(() => true, () => false), 'the pool keeps plants');
  const kept = await page.evaluate(() => { const p = window.__ctTest.store.fitPool.value; const ann = (t) => t.traits.is_annual === true || t.traits.grown_as_annual === true; return { all: p.length, annual: p.filter(ann).length, perennial: p.filter((t) => !ann(t)).map((t) => [t.canonical_name, t.climate.tminCold.weak]) }; });
  assert.ok(kept.annual >= 50, `annual crops kept (${kept.annual})`);
  // A disputed (weak) row is a bound as any other (coordinator decision 2026-11-12): the 13 Boreal
  // perennials with weak cold rows (loquat, Scots pine, ...) are gone.
  assert.deepEqual(kept.perennial, [], 'no perennial holds a −39.8 °C winter');
  assert.equal(await page.$('[data-pool-empty]'), null, 'not "nothing fits"');
  await suggestReady(page);
  assert.equal(await page.evaluate(() => { const { store } = window.__ctTest; const ok = store.suggestMembers(); store.view.value = 'matrix'; return ok && store.members.value.length > 0; }), true, 'Suggest gives a consortium');
  const id = await page.evaluate(() => window.__ctTest.store.members.value[0]);
  await page.evaluate((m) => window.__ctTest.openSheet('details', m), id);
  assert.ok(await has(page, '[data-mark-surface="details"][data-mark-state="annual"]', 10_000), 'Details: the annual line');
  assert.match(await text(page, '[data-mark-surface="details"][data-mark-state="annual"]') ?? '', /^An annual, re-sown each year: its winter cold is not checked\.$/);
});

test('P5-14b (S5c suggestions in range): at Seville a suggestion holds no plant outside its observed range, and Add lists none until one is typed, which then asks first @real-data', async () => {
  const page = await tool();
  const lookup = await atSite(page, 'seville');
  const outside = await pickRanged(OUTSIDE, lookup.climate.periods[0], 'Mediterranean');
  await choose(page, 'Mediterranean');
  await suggestDirect(page);
  assert.ok(await has(page, '[data-mark]', 10_000), 'the marks are loaded (Seville has plants near the edge)');
  assert.equal(await page.$('[data-mark="outside"]'), null, 'no suggested plant is outside its range');
  await page.evaluate(() => window.__ctTest.store.openSheet('add'));
  assert.ok(await has(page, ADD_OPEN, 10_000) && await has(page, '.ct-add .ct-rows li', 10_000), 'the Add list');
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
  // The range rule loads with its chunk (core loadRangeRule) once the site has a climate; the pool waits for it.
  await page.waitForFunction(() => window.__ctTest.store.matrix.value !== null, { timeout: 10_000 });
  const within = await sum();
  assert.ok(within < before, `fewer plants counted at Seville (${within} cell entries) than without a location (${before})`);
  const counted = await page.evaluate(() => { const { store } = window.__ctTest; return store.fitPool.value.length; });
  assert.equal(counted, 198, 'the matrix counts the 198 of 200 Mediterranean plants kept at Seville (design check §C: 101; 117 on the schema 2 export, before the heat limit at Q99)');
  await page.evaluate(() => { window.__ctTest.store.location.value = null; });
  assert.equal(await sum(), before, 'without a location the counts are P2\'s');
});

test('P5-14e (S5c range chunk offline): if the range chunk cannot load, the tool falls back to the unfiltered pool with a notice, and Suggest, Start crops, a link and Swap all work @real-data', async () => {
  const page = await tool();
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/_astro/range.*'] });
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
  cdp.on('Network.loadingFailed', (e) => { if (/\/_astro\/range\./.test(urls.get(e.requestId) ?? '')) failed.push(e.blockedReason); });
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/_astro/range.*'] });
  await page.evaluate(() => { window.__toasts = new Set(); window.__ctTest.store.toast.subscribe((t) => { if (t) window.__toasts.add(t.id); }); });
  await choose(page, 'Mediterranean');
  await atSite(page, 'seville');
  assert.ok(await has(page, '[data-range-unavailable]', 10_000), 'the notice');
  await new Promise((r) => setTimeout(r, 1000));
  // The store's rule and the Mediterranean panel import the same chunk: Chrome 155 reuses the first
  // failure for the second import, the CI runner's Chrome sends a second request. Either way it is
  // one or two requests at the first location, and none more after a new one.
  const before = failed.length;
  assert.ok(before >= 1 && before <= 2, `the chunk was requested at Seville (${before})`);
  await atSite(page, 'lyon');
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(failed.length, before, 'a new location does not import the chunk again');
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

test('P5-15 (S5c near-edge mark): a Mediterranean plant whose range ends within 2 °C of Seville\'s climate carries "near the edge" @real-data', async () => {
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

test('P5-15b (S5c range lines in Details, page language): in French, a plant near the edge at Seville says why with the site\'s values written "5,8" @real-data', async () => {
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

test('P5-16 (S5c outside-range warning on add): typed in Add, a plant whose range misses the site shows "outside", and adding it still makes it a member @real-data', async () => {
  const page = await tool();
  const lookup = await atSite(page, 'seville');
  const outside = await pickRanged(OUTSIDE, lookup.climate.periods[0], 'Mediterranean');
  assert.ok(outside, 'a Mediterranean plant outside its range at Seville');
  await choose(page, 'Mediterranean');
  await page.evaluate(() => { window.__ctTest.store.view.value = 'matrix'; window.__ctTest.store.openSheet('add'); });
  assert.ok(await has(page, ADD_OPEN, 10_000), 'the Add sheet');
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
    // The range rule loads with its chunk (core loadRangeRule) once the site has a climate; the pool waits for it.
    for (let i = 0; i < 200 && !store.pool.value; i++) await new Promise((r) => setTimeout(r, 50));
    return store.pool.value.filter((t) => t.origin?.kind === 'borrowed' && t.origin.list === 'Mediterranean').length;
  });
  assert.ok(count > 0, 'Subtropical borrows Mediterranean placements');
  await suggestDirect(page);
  assert.ok(await has(page, '[data-mark="estimate"]', 10_000));
});

test('P5-17b (S5c borrowed Details, pre-push review 1): at a Subtropical site a plant\'s Details reads the list it was placed from: its reasons, with a note naming that list; a correction sends both climates', async () => {
  const page = await tool({ correction: 'ok' });
  await atSite(page, 'lyon');
  await suggestReady(page);
  const picked = await page.evaluate(async () => {
    const { store } = window.__ctTest;
    store.climate.value = 'Subtropical';
    if (!(await store.loadPool('Subtropical'))) return null;
    for (let i = 0; i < 200 && !store.pool.value; i++) await new Promise((r) => setTimeout(r, 50));
    if (!store.suggestMembers()) return null;
    store.view.value = 'matrix';
    // A borrowed member whose source list gives reasons (the visitor's climate has none of its own).
    for (const t of store.memberTaxa.value) {
      const from = t.origin?.kind === 'borrowed' ? t.origin.list : null;
      if (!from) continue;
      const own = await store.source.value.details(t.id, 'Subtropical', 'en');
      const d = await store.source.value.details(t.id, from, 'en');
      if (d.reasons.length && !own.reasons.length) return { id: t.id, from };
    }
    return null;
  });
  assert.ok(picked, 'a Subtropical member borrowed from a curated list that gives reasons');
  await page.evaluate((id) => window.__ctTest.store.openSheet('details', id), picked.id);
  assert.ok(await has(page, '.ct-details .ct-reasons li', 10_000), 'the Why section lists the source list\'s reasons, not "no source"');
  const note = await text(page, `.ct-details [data-why-borrowed="${picked.from.toLowerCase()}"]`);
  assert.match(note ?? '', new RegExp(`placed as on the ${picked.from} list`, 'i'), 'the Why section says the reasons come from that list');
  assert.match(await text(page, '#ct-d-place') ?? '', new RegExp(picked.from), '"Placed for" names the list the placement is from, never claims the visitor\'s climate');
  // A correction made here names both: the list the placement comes from as `climate`, the visitor's
  // own climate as `site_climate`, and that the placement is an estimate (pre-push item B; the payload
  // is tested here, since Correction.tsx builds it inline to stay in the island's 62 KB budget).
  await page.locator(aria('button', 'Suggest a correction')).click();
  await page.waitForSelector('dialog select option[value]:not([value=""])');
  await page.select('dialog select', await page.evaluate(() => document.querySelector('dialog select option:not([value=""])').value));
  await page.locator('#ct-corr-proposed').fill('A suggested value');
  await page.locator('#ct-corr-consent').click();
  await page.locator(aria('button', 'Send suggestion')).click();
  assert.ok(await page.waitForFunction(() => /^Thank you/.test(document.querySelector('.ct-corr-sent p')?.textContent ?? ''), { timeout: 10_000 }).then(() => true, () => false), 'sent');
  const sent = JSON.parse(page.correctionPosts[0]);
  assert.equal(sent.climate, picked.from, 'climate: the list the placement comes from');
  assert.equal(sent.site_climate, 'Subtropical', 'site_climate: the visitor\'s own climate');
  assert.equal(sent.placement_estimate, true, 'the placement is an estimate');
});

test('P5-26 (S5c borrowed list from a link): #v=4&c=subtropical without o= opens with borrowed plants marked "estimate", no location needed', async () => {
  // A consortium made at Lyon on the borrowed Subtropical list, then opened from its link without a location.
  const maker = await tool();
  await atSite(maker, 'lyon');
  await maker.evaluate(async () => { const { store } = window.__ctTest; store.climate.value = 'Subtropical'; await store.loadPool('Subtropical'); });
  await suggestReady(maker);
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
  await suggestReady(page);
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
  // Each press once the page stands still: the button scrolls the step to the centre, smoothly
  // (global.css), and a click aimed during that scroll lands beside the button.
  await settled(page, '[data-needs-site] button');
  await page.click('[data-needs-site] button');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'ct-test-first', 'focus on the step\'s first control');
  await page.evaluate(() => { document.getElementById('ct-test-first').remove(); });
  await settled(page, '[data-needs-site] button');
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
  await cdp.send('Network.setBlockedURLs', { urls: ['*/_astro/range.*'] });
  await atSite(page, 'seville');
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Arid'; });
  assert.ok(await has(page, '[data-range-unavailable]', 10_000), 'the notice');
  assert.match(await text(page, '[data-range-unavailable]') ?? '', /Arid needs them to pick plants/);
  assert.ok(await has(page, '[data-range-unavailable] button'), 'Reload');
  assert.equal(await page.$('.ct-cta'), null, 'no Suggest from the unfiltered borrowed list');
  await suggestReady(page);
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
    // The range chunk fails from the first request (A8): blocking it after the page loaded raced its
    // modulepreload, so the test passed or failed by timing.
    const page = await tool({ width, hash: '#v=4&c=arid&a=&e=1', block: { range: 404 } });
    await atSite(page, 'seville');
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.rangeFailed.value, { timeout: 10_000 }).then(() => true, () => false), 'the range chunk failed');
    const { buttons, words } = await emptyMatrix(page);
    assert.equal(buttons.includes('Suggest a start'), false, `${width} px: no Suggest that can only refuse (${buttons.join(', ')})`);
    assert.match(words, /Arid needs them to pick plants/, `${width} px: it says why`);
    assert.ok(buttons.includes('Reload'), `${width} px: with Reload`);
    assert.ok(page.blocked.some((u) => h.roles.range.includes(u)), `${width} px: the range chunk was requested and refused by the block`);
  }
});

test('P5-27f (S5c seam review 6): if the plant-marks chunk fails, the range warnings it would show are replaced by a notice with Reload', async () => {
  for (const width of [390, 1280]) {
    const page = await tool({ width });
    const cdp = await page.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs', { urls: ['*/_astro/mark-providers.*'] });
    await atSite(page, 'seville');
    await choose(page, 'Mediterranean');
    await suggestDirect(page);
    assert.ok(await has(page, '[data-plant-id]', 10_000), 'the matrix');
    assert.ok(await has(page, '[data-marks-unavailable]', 10_000), `${width} px: a notice that the marks did not load`);
    assert.match(await text(page, '[data-marks-unavailable]') ?? '', /Reload/);
  }
});

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
  // Suggest's production 10 s wait, shortened (A5).
  const timeouts = { suggest: 1500 };
  const page = await guestHeld(1280, { timeouts });
  await page.click('.ct-mx-empty .button-primary');
  assert.equal(await page.$eval('.ct-mx-empty .button-primary', (b) => b.getAttribute('aria-busy')), 'true', 'busy while it waits');
  assert.ok(await page.waitForFunction(() => /took too long/.test(document.querySelector('.ct-toast-text')?.textContent ?? ''), { timeout: timeouts.suggest + 4000 }).then(() => true, () => false), 'after the wait, a message');
  assert.equal(await page.$eval('.ct-mx-empty .button-primary', (b) => b.getAttribute('aria-busy')), null, 'no longer busy');
  await page.evaluate(() => window.__guest.release());
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(await members(page), 0, 'the list arriving later runs nothing');
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
test('P5-27q (S5c climate ranges): Nairobi proposes Subtropical from its means; at Seville Good-King-Henry (a recorded annual) is a cool-season crop in Add and Details; a dry site marks drought tolerance Medium; nothing scrolls sideways @real-data', async () => {
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
    assert.ok(await has(page, ADD_OPEN, 10_000), 'the Add sheet');
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
test('P5-27r (S5c climate ranges, room advisory): in a small garden no cell is blocked for height, and Add lists a walnut with "grows to … m: prune", never behind "show anyway" @real-data', async () => {
  for (const width of [390, 1280]) {
    const page = await tool({ width });
    await choose(page, 'Temperate');
    await page.evaluate(() => { const { store } = window.__ctTest; store.site.value = { ...store.site.value, room: 'small' }; store.view.value = 'matrix'; });
    assert.equal(await page.evaluate(() => window.__ctTest.store.matrix.value.rows.flatMap((r) => r.cells).some((c) => c.empty === 'misfit')), false, `${width} px: no cell "can't be filled"`);
    await page.evaluate(() => window.__ctTest.store.openSheet('add'));
    assert.ok(await has(page, ADD_OPEN, 10_000), 'the Add sheet');
    // A miss says what the sheet showed then.
    const sheet = () => page.evaluate(() => JSON.stringify({ query: document.querySelector('.ct-add .ct-search input')?.value, focus: document.activeElement?.outerHTML.slice(0, 80),
      bar: document.querySelector('.ct-add-bar .button-primary')?.outerHTML, dialogs: [...document.querySelectorAll('dialog[open]')].map((d) => d.className) }));
    await page.type('.ct-add .ct-search input', 'Juglans regia');
    const row = '.ct-add .ct-rows li';
    assert.ok(await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].some((li) => li.querySelector('.ct-sci')?.textContent === 'Juglans regia' && li.querySelector('[data-mark="room"]')), { timeout: 10_000 }, row).then(() => true, () => false), `${width} px: the walnut with its height note (${await sheet()})`);
    const tag = await page.evaluate((sel) => [...document.querySelectorAll(sel)].find((li) => li.querySelector('.ct-sci')?.textContent === 'Juglans regia' && li.querySelector('[data-mark="room"]')).querySelector('[data-mark="room"]').textContent, row);
    assert.match(tag, /^grows to [\d.]+ m: prune$/);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 0, `${width} px: no sideways scroll`);
    // Its Add does not ask first (a height is never a misfit): the walnut joins at once. Each step waits
    // for what the last one causes (no fixed pause, no optional click).
    const control = await page.evaluate((sel) => {
      const li = [...document.querySelectorAll(sel)].find((x) => x.querySelector('.ct-sci')?.textContent === 'Juglans regia' && x.querySelector('[data-mark="room"]'));
      const c = li?.querySelector(':scope > .ct-tick input[type="checkbox"]') ?? li?.querySelector(':scope > button');
      c?.click();
      return c ? c.tagName.toLowerCase() : null;
    }, row);
    assert.equal(control, 'input', `${width} px: the walnut's row has a tick, not an asking button (${await sheet()})`);
    const state = await page.waitForFunction(() => (document.querySelector('dialog.ct-ask[open]') ? 'asked' : document.querySelector('.ct-add-bar .button-primary:not([disabled])') ? 'ticked' : null), { timeout: 5000 }).then((r) => r.jsonValue(), () => null);
    assert.equal(state, 'ticked', `${width} px: ticked, no warning to confirm (${await sheet()})`);
    await settled(page, '.ct-add-bar .button-primary'); // the sheet slides in (details.css ct-sheet-in)
    await page.click('.ct-add-bar .button-primary');
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.memberTaxa.value.some((t) => t.canonical_name === 'Juglans regia'), { timeout: 5000 }).then(() => true, () => false), `${width} px: added without asking (${await sheet()})`);
    assert.deepEqual(page.thirdParty, []);
  }
});
