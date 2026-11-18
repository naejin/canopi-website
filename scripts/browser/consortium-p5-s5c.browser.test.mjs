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
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadState } from './harness.mjs';
import { ROOT } from './serve.mjs';
import { aria, h, has, realDb, settled, suggestDirect, suggestReady, useHarness } from './helpers.mjs';
import { SITES, pickCard } from './location-fixtures.mjs';
import { tool, atSite, choose, locationControls, locationState, text, ready, search, RANGED, OUTSIDE, EDGE, pickRanged, atNowhere, members } from './p5-helpers.mjs';

useHarness();

// Place with Temperate chosen and a kept guest from Tropical whose list read is held:
// window.__guest.release() lets it through, .fail() fails it (PP-B b1a: the empty matrix's Suggest
// these tests pressed is Place's "Start from a small suggested palette" now).
async function placeGuestHeld(width, { timeouts = null } = {}) {
  const guest = await realDb((db) => String(db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Tropical' ORDER BY 1 LIMIT 1").get().id));
  const page = await tool({ width, timeouts });
  await choose(page, 'Temperate');
  assert.ok(await has(page, '[data-place-suggest]', 15_000), 'Place with "Start from a small suggested palette"');
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

test('P5-14 (S5c nothing fits): where no plant\'s range holds the site: the "nothing fits" state, not an empty matrix', async () => {
  const page = await tool();
  await atNowhere(page);
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Boreal'; });
  assert.ok(await has(page, '[data-pool-empty]', 10_000), 'the nothing-fits state');
  // Strengthened (S5c): the state gives a clear next step, a real control that opens the search of
  // every plant.
  assert.match(await text(page, '[data-pool-empty]') ?? '', /−?-?39\.8 °C/, 'says why: the site\'s coldest month');
  // Review round 1: no Suggest that would only give an empty palette (on Place, PP-B b1a: no "Start from a
  // small suggested palette"); the panel's step is the way on.
  assert.equal(await page.$('[data-place-suggest]'), null, 'no usable Suggest when nothing fits');
  await page.click('[data-pool-empty] button');
  // PP-C commit 0: the step opens Find (store.openFind). Its rows
  // before a query, every plant marked outside, are c1's case (consortium-pp-c1, PP-C2b).
  assert.equal(await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind ?? null, { timeout: 10_000 }).then((r) => r.jsonValue(), () => null), 'find', 'the next step opens Find');
  assert.ok(await has(page, 'dialog.ct-sheet[open]', 10_000), 'a named sheet');
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
  assert.ok(await has(page, '[data-against] [data-note="annual"]', 10_000), 'Details: the annual line');
  assert.match(await text(page, '[data-against] [data-note="annual"]') ?? '', /^An annual, re-sown each year: its winter cold is not checked\.$/);
});

// PP-C commit 0: Add's half (no outside plant listed until typed, then added with nothing asking)
// went with the Add sheet; Find's outside-range group and its one-tap add are c1's (PP-C4).
test('P5-14b (S5c suggestions in range): at Seville a suggestion holds no plant outside its observed range @real-data', async () => {
  const page = await tool();
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  await suggestDirect(page);
  // PP-B b1b: the palette page draws no plant marks until Your plants (b3); the members' verdicts say
  // it (the suggestion reads them too: a candidate outside its range fills no hole).
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.memberVerdicts.value?.size > 0, { timeout: 10_000 }).then(() => true, () => false), 'the members are checked');
  const levels = await page.evaluate(() => [...window.__ctTest.store.memberVerdicts.value.values()].map((v) => v.level));
  assert.ok(levels.length > 0 && !levels.includes('outside'), `no suggested plant is outside its range (${levels.join(', ')})`);
});

// The chunk that holds the range checks (core range.ts): Rollup names it after one of its modules
// ("range" until the site-inputs layer, "future" since range.ts and future.ts share their importers),
// so it is found by its RANGE_BOUNDS table, never by its name.
const ASTRO = () => join(ROOT, h.dir, 'client', '_astro');
function rangeChunk() {
  const files = readdirSync(ASTRO()).filter((f) => f.endsWith('.js') && readFileSync(join(ASTRO(), f), 'utf8').includes('range:"tminCold"'));
  assert.equal(files.length, 1, `one chunk holds the range checks (${files.join(', ')})`);
  return files[0];
}

test('P5-14f (S5c Suggest while the range rule loads): when nothing fits, a Suggest pressed before the rule arrives stays on Place with the nothing-fits state', async () => {
  const page = await tool();
  // Temperate (curated): no count line without a location, so the rule's chunk is not fetched before
  // it; no Temperate plant holds the synthetic site (atNowhere).
  await choose(page, 'Temperate');
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 2500, downloadThroughput: -1, uploadThroughput: -1 });
  await atNowhere(page);
  const suggest = await page.waitForSelector('[data-place-suggest]', { timeout: 5_000 }).catch(() => null);
  assert.ok(suggest, 'Suggest is there while the rule loads');
  assert.equal(await page.evaluate(() => window.__ctTest.store.verdictRule.value), null, 'the rule has not arrived yet');
  await suggest.click();
  assert.ok(await has(page, '[data-pool-empty]', 20_000), 'the nothing-fits state once the rule is in');
  await new Promise((r) => setTimeout(r, 500));
  const state = await page.evaluate(() => { const { store } = window.__ctTest; return { view: store.view.value, members: store.members.value.length }; });
  assert.deepEqual(state, { view: 'start', members: 0 }, 'still on Place, no empty palette');
  assert.equal(await page.$('[data-place-suggest][aria-busy="true"]'), null, 'the pending Suggest is cleared');
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
    return [...document.querySelectorAll('[data-conf]')].map((e) => e.getAttribute('data-conf'));
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
  assert.ok(await has(page, '[data-against] [data-factor="cold"], [data-against] [data-factor="mild"]', 10_000), 'a line per bound passed');
  // The verdict mark of a one-sided plant carries the same state ('cold'), so the line is the one with values.
  const line = await page.$$eval('[data-against] [data-factor="cold"], [data-against] [data-factor="mild"]', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).find((t) => /°C/.test(t)) ?? null);
  assert.match(line, /5,8 °C/, `"${line}" writes the number the French way`);
  // Its edge term says so in French, and "How sure we are" says what the observed ranges include (the
  // dataset hedge, once per surface: PP-C c2 moved it off the edge mark).
  const edges = await page.$$eval('[data-against] [data-conf="edge"]', (els) => els.map((e) => e.textContent));
  assert.ok(edges.some((t) => /en limite de son aire observée/i.test(t)), `the edge term in French (${edges.join(' | ')})`);
  assert.ok(await page.waitForFunction(() => /cultures comprises/.test(document.querySelector('dialog[open] [data-sure]')?.textContent ?? ''), { timeout: 5000 }).then(() => true, () => false), 'Details says observed ranges include cultivation');
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
  assert.ok(await has(page, '[data-conf="estimate"]', 10_000));
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
  assert.match(note ?? '', new RegExp(`come from the ${picked.from} list`, 'i'), 'the Why section says the reasons come from that list');
  assert.match(await text(page, '.ct-details [data-from-list]') ?? '', new RegExp(picked.from), 'the header names the list the placement is from, never claims the visitor\'s climate');
  // A correction made here names both: the list the placement comes from as `climate`, the visitor's
  // own climate as `site_climate`, and that the placement is an estimate (pre-push item B; the payload
  // is tested here, since Correction.tsx builds it inline).
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

test('P5-26 (S5c borrowed list from a link): #v=5&c=subtropical without o= opens with borrowed plants marked "estimate", no location needed', async () => {
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
  assert.ok(await has(page, '[data-conf="estimate"]', 10_000), 'borrowed plants marked "estimate"');
  await page.evaluate(() => { const { store } = window.__ctTest; store.openSheet('details', store.members.value[0]); });
  assert.ok(await has(page, '[data-against] [data-no-site]', 10_000), 'Details says to give a location to check it');
  assert.match(await text(page, '[data-against] [data-no-site]') ?? '', /give your site.s location to check/i);
  await suggestReady(page);
  assert.equal(await page.evaluate(() => window.__ctTest.store.suggestMembers()), false, 'no new suggestion from a borrowed list without a location');
  assert.equal(await page.$('[data-pool-empty]'), null);
});

test('P5-26b (S5c borrowed climate without a location, UX audit fix 1): Start offers no Suggest, no crops and no Start empty, and says the climate needs the site\'s location; a curated climate is as in P2', async () => {
  const page = await tool();
  await pickCard(page, 'subtropical');
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
  await pickCard(page, 'temperate');
  assert.ok(await has(page, '.ct-cta', 10_000), 'Temperate without a location: Suggest as in P2');
  assert.equal(await page.$('[data-needs-site]'), null);
  // With a location the borrowed climate is offered (filtered by the range rule).
  await atSite(page, 'lyon');
  await pickCard(page, 'subtropical');
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
  const suggest = await page.waitForSelector('[data-place-suggest]', { timeout: 5_000 }).catch(() => null);
  assert.ok(suggest, 'Suggest');
  await suggest.click();
  assert.equal(await page.evaluate(() => window.__ctTest.store.view.value), 'start', 'pending');
  await pickCard(page, 'boreal');
  await page.evaluate(() => { window.__ctTest.store.location.value = null; });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  assert.ok(await has(page, '[data-needs-site]', 10_000), 'Boreal needs a location');
  await atSite(page, 'lyon');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.fitPool.value?.length > 0 && window.__ctTest.store.climate.value === 'Boreal', { timeout: 15_000 }).then(() => true, () => false), 'the Boreal pool, filtered');
  await new Promise((r) => setTimeout(r, 800));
  assert.deepEqual(await page.evaluate(() => { const { store } = window.__ctTest; return { view: store.view.value, members: store.members.value.length }; }), { view: 'start', members: 0 }, 'no suggestion the reader did not ask for');
  assert.ok(await has(page, '[data-place-suggest]', 5_000), 'Boreal with a location: Suggest offered');
  assert.equal(await page.$('[data-place-suggest][aria-busy="true"]'), null, 'the old Suggest is no longer pending (it would run at the next pool change)');
});

test('P5-26e (S5c borrowed climate, range chunk offline, fix review 29b709e 2): with a location but no range rule, a borrowed list offers no Suggest and says why', async () => {
  // Subtropical, not Arid: Arid has its own curated list since r-b7fb536f9cfd0700 (canopi-data D9a).
  const page = await tool();
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: [`*/_astro/${rangeChunk()}`] });
  await atSite(page, 'seville');
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Subtropical'; });
  assert.ok(await has(page, '[data-range-unavailable]', 10_000), 'the notice');
  assert.match(await text(page, '[data-range-unavailable]') ?? '', /Subtropical needs them to pick plants/);
  assert.ok(await has(page, '[data-range-unavailable] button'), 'Reload');
  assert.equal(await page.$('.ct-cta'), null, 'no Suggest from the unfiltered borrowed list');
  await suggestReady(page);
  assert.equal(await page.evaluate(async () => { const { store } = window.__ctTest; await store.loadPool('Subtropical'); return store.suggestMembers(); }), false, 'suggestMembers refuses');
});

test('P5-26f (S5c borrowed list without a location, fix review 29b709e 3; on Place, PP-B b1a): its Suggest is the needs-location line, and a location brings it back', async () => {
  const page = await tool();
  await pickCard(page, 'subtropical');
  assert.ok(await has(page, '[data-needs-site]', 15_000), 'the needs-location line');
  assert.equal(await page.$('[data-place-suggest]'), null, 'in place of a silent "Start from a small suggested palette"');
  await atSite(page, 'lyon');
  assert.ok(await has(page, '[data-place-suggest]', 10_000), 'with a location the suggested palette is offered');
  assert.equal(await page.$('[data-needs-site]'), null);
});

test('P5-26c (S5c card pill, UX audit fix 1): a borrowed climate\'s card says "Needs your location" until a location is given', async () => {
  const page = await tool();
  // Board ClimateHand: each climate row's chip at the right of its name.
  const pill = (v) => page.$eval(`input[name="ct-climate"][value="${v}"] ~ .ct-hand-head [data-chip]`, (e) => e.textContent.trim());
  assert.equal(await pill('subtropical'), 'Needs your location');
  assert.equal(await pill('temperate'), 'Ready');
  await atSite(page, 'lyon');
  assert.equal(await pill('subtropical'), 'Ready');
});

test('P5-27a (S5c seam review 1; on Place, PP-B b1a): where nothing fits, Place has no dead "Start from a small suggested palette"; it says why, and its step opens the search', async () => {
  for (const width of [390, 1280]) {
    const page = await tool({ width });
    await atNowhere(page);
    // The test's site is injected without a climate (a real read applies its own): set as P5-14 does.
    await choose(page, 'Boreal');
    assert.ok(await has(page, '[data-pool-empty] button', 10_000), `${width} px: the nothing-fits state`);
    assert.equal(await page.$('[data-place-suggest]'), null, `${width} px: no Suggest that can only refuse`);
    assert.match(await text(page, '[data-pool-empty]') ?? '', /−?-?39\.8 °C/, `${width} px: it says why`);
    await page.click('[data-pool-empty] button');
    // PP-C commit 0: the step opens Find; its search is c1's case.
    assert.equal(await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind ?? null, { timeout: 10_000 }).then((r) => r.jsonValue(), () => null), 'find', `${width} px: the step opens Find`);
  }
});

test('P5-27b (S5c seam review 1; on Place, PP-B b1a): a borrowed climate whose range chunk failed: Place says why instead of a dead "Start from a small suggested palette"', async () => {
  for (const width of [390, 1280]) {
    // The range chunk fails from the first request (A8): blocking it after the page loaded raced its
    // modulepreload, so the test passed or failed by timing.
    const page = await tool({ width, block: { verdict: 404 } });
    await atSite(page, 'seville');
    // Not Arid: curated since r-b7fb536f9cfd0700 (D9a). The test's site is injected without its climate
    // applied (a real read applies Mediterranean), so Subtropical is set as P5-14 does.
    await page.evaluate(() => { window.__ctTest.store.climate.value = 'Subtropical'; });
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.rangeFailed.value, { timeout: 10_000 }).then(() => true, () => false), 'the range chunk failed');
    assert.ok(await has(page, '[data-range-unavailable]', 10_000), `${width} px: the notice`);
    assert.equal(await page.$('[data-place-suggest]'), null, `${width} px: no Suggest that can only refuse`);
    assert.match(await text(page, '[data-range-unavailable]') ?? '', /Subtropical needs them to pick plants/, `${width} px: it says why`);
    assert.ok(await has(page, '[data-range-unavailable] button'), `${width} px: with Reload`);
    assert.ok(page.blocked.some((u) => h.roles.verdict.includes(u)), `${width} px: the verdict chunk (the range rule with it) was requested and refused by the block`);
  }
});

test('P5-27l (S5c seam review round 3, 2; on Place, PP-B b1a): "Start from a small suggested palette" pressed while a kept guest\'s list is still read waits for it, then suggests', async () => {
  for (const width of [390, 1280]) {
    const page = await placeGuestHeld(width);
    await page.click('[data-place-suggest]');
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => window.__guest.release());
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), `${width} px: the press is not lost: a suggestion once the guest list is read`);
  }
});

// PP-C c1 merge: the plant is added through Place's "Add a plant by name", which opens Find: the
// reader searches its name, adds the row, then Done.
test('P5-27m (S5c seam review round 4, 1): a waiting Suggest is dropped when the reader opens Find and adds a plant: the list arriving later changes nothing', async () => {
  const page = await placeGuestHeld(1280);
  await page.click('[data-place-suggest]');
  await page.click('[data-place-add]');
  const FIND = 'dialog.ct-find[open]';
  assert.ok(await has(page, `${FIND} [data-find-search]`, 10_000), 'Find opens to add plants by name');
  await page.locator(`${FIND} [data-find-search]`).fill('Malus domestica');
  const apple = await page.evaluate(() => window.__ctTest.store.pools.value.Temperate.find((t) => t.canonical_name === 'Malus domestica')?.id);
  const row = `${FIND} [data-find-row][data-plant-id="${apple}"]`;
  assert.ok(apple && await has(page, row, 10_000), 'Find lists the apple');
  await page.click(`${row} [data-find-add]`);
  await page.click(`${FIND} ${aria('button', 'Done')}`);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 1, { timeout: 5000 }).then(() => true, () => false), 'the plant added');
  await page.evaluate(() => window.__guest.release());
  await page.waitForFunction(() => window.__ctTest.store.guestsPending.value.length === 0, { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(await members(page), 1, 'no suggestion fills in around the plant the reader added');
});

// PP-B exit (2026-11-16): a failed guest list is no longer the load screen with Retry; it is named on
// the palette page with its plants "not checked" (PP-B21, architecture 9 "Guest lists"), and a press
// made after it suggests around the plants at hand, so a waiting press does too. Its rewrite found
// that the suggestion dropped the guest itself (core suggest.ts kept only the seeds it could read):
// fixed test-first (consortium-pp-b1.test.mjs "PP-B exit").
test('P5-27n (S5c seam review round 4, 1; PP-B exit): a waiting Suggest ends when the kept guest\'s list fails: it suggests around the plants it can read, keeps the guest, names the list as missing with Reload, and is no longer busy', async () => {
  const page = await placeGuestHeld(1280);
  const guest = await page.evaluate(() => { const { store } = window.__ctTest, [id] = Object.keys(store.guests.value); store.addMembers([id], { [id]: 'Tropical' }); return id; });
  await page.click('[data-place-suggest]');
  assert.equal(await page.$eval('[data-place-suggest]', (b) => b.getAttribute('aria-busy')), 'true', 'busy while it waits');
  await page.evaluate(() => window.__guest.fail());
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 1, { timeout: 10_000 }).then(() => true, () => false), 'the wait ends with a suggestion');
  assert.ok(await page.evaluate((id) => window.__ctTest.store.members.value.includes(id), guest), 'the guest stays in the palette');
  assert.equal(await loadState(page), 'ready', 'no load screen');
  const named = () => [...document.querySelectorAll('.ct-notice')].some((n) => /The Tropical list could not be read: 1 plant from it is missing, not checked\./.test(n.textContent) && [...n.querySelectorAll('button')].some((b) => b.textContent === 'Reload'));
  assert.ok(await page.waitForFunction(named, { timeout: 8000 }).then(() => true, () => false), 'the list named as missing, with Reload');
  assert.ok(await has(page, `.ct-plants [data-plant-id="${guest}"][data-missing="failed"]`, 5000), 'Your plants lists the guest as not checked');
  const n = await members(page);
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(await members(page), n, 'nothing runs on its own after');
});

test('P5-27o (S5c seam review round 4, 1): a waiting Suggest whose guest list never arrives ends after 10 s, says so, and is no longer busy', async () => {
  // Suggest's production 10 s wait, shortened (A5).
  const timeouts = { suggest: 1500 };
  const page = await placeGuestHeld(1280, { timeouts });
  await page.click('[data-place-suggest]');
  assert.equal(await page.$eval('[data-place-suggest]', (b) => b.getAttribute('aria-busy')), 'true', 'busy while it waits');
  assert.ok(await page.waitForFunction(() => /took too long/.test(document.querySelector('.ct-toast-text')?.textContent ?? ''), { timeout: timeouts.suggest + 4000 }).then(() => true, () => false), 'after the wait, a message');
  assert.equal(await page.$eval('[data-place-suggest]', (b) => b.getAttribute('aria-busy')), null, 'no longer busy');
  await page.evaluate(() => window.__guest.release());
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(await members(page), 0, 'the list arriving later runs nothing');
});

// P5-27g (phones, marks in the matrix at 320 px) is replaced by PP-B19 for Place
// (consortium-pp-b1.browser.test.mjs; plant-palette-slices table 1b, row PP-B b1a).

// Decision row "Climate ranges fixed before the P5 push" (2026-11-12): the zone from the cell's own means,
// annuals beyond their heat range advised to the cool season, drought tolerance Medium on a dry site.
test('P5-27q (S5c climate ranges): Nairobi proposes Subtropical from its means; at Seville Siberian purslane (a recorded annual) is a cool-season crop in Details; nothing scrolls sideways @real-data', async () => {
  const [lat, lon] = SITES.nairobi;
  for (const width of [320, 390, 1280]) {
    const page = await tool({ width, geolocation: { lat, lon } });
    await locationControls(page);
    await page.click('[data-location-action="geo"]');
    assert.equal(await locationState(page), 'borderline', `${width} px: Nairobi is borderline`);
    const line = await text(page, '[data-location-state]') ?? '';
    assert.match(line, /own average temperatures give Cwb/, 'the class its means give');
    assert.match(line, /The climate map gives Aw here/, 'and the map class');
    assert.match(line, /Between Subtropical and Tropical; we picked Subtropical/);
    assert.match(line, /within 2 °C/);
    // Picked, with one tap to the other (location.tsx borderline: Use Subtropical / Use Tropical).
    assert.equal(await page.evaluate(() => window.__ctTest.store.climate.value), 'Subtropical', 'Subtropical picked');
    assert.ok(await has(page, aria('button', 'Use Tropical')), 'the other one tap away');
    // Seville: Siberian purslane (stored annual, Temperate list, heat limit 31.7 °C against 34.8 °C) stays, for the cool
    // season (Siberian purslane until r-f3c6dd8b3c4391be, recorded perennial since D2d).
    await atSite(page, 'seville');
    await choose(page, 'Temperate');
    // (Its Add row with the cool-season tag went with the Add sheet in PP-C commit 0; Find shows it in c1.)
    const annual = await page.evaluate(() => window.__ctTest.store.pools.value.Temperate.find((t) => t.canonical_name === 'Claytonia sibirica')?.id);
    assert.ok(annual, 'Siberian purslane is on the Temperate list');
    await page.evaluate((id) => window.__ctTest.store.openSheet('details', id), annual);
    assert.ok(await has(page, '[data-against] [data-note="cool-season"]', 10_000), 'Details: the cool-season line');
    assert.equal(await text(page, '[data-against] [data-note="cool-season"]'), 'Too hot in summer here: grow it in the cool season.');
    assert.equal(await page.$('[data-against] [data-note="annual"]'), null, 'not the warm-season note');
    await settled(page, '[data-against] [data-note="cool-season"]'); // the sheet slides in (details.css ct-sheet-in)
    const over = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      marks: [...document.querySelectorAll('#ct-root .ct-tag, #ct-root .ct-flag, dialog .ct-tag, dialog .ct-flag')].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).map((e) => e.textContent) }));
    // doc ≤ 0: with the dialog open on desktop the page's scrollbar is hidden (scrollWidth < clientWidth).
    assert.deepEqual({ doc: Math.max(0, over.doc), marks: over.marks }, { doc: 0, marks: [] }, `${width} px: no sideways scroll, no mark past the edge`);
    assert.deepEqual(page.thirdParty, []);
  }
  // (A dry site's watering line waits for the watering input's rule, F4: no site input says "dry" yet.)
});

// Owner request 2026-11-12: the room answer is advisory ("inform, don't block"; "warn, never hide"): a
// small garden never hides a tall plant in Find or Paste; the plant carries a note. PP-B exit (2026-11-16): the
// matrix cells this test also read went in PP-B 0a' (its "no cell blocked" line went with them; the
// palette's holes and fillers never read the room answer, core holes.ts); the walnut, once added,
// is listed in Your plants with the same note, not hidden.
test('P5-27r (S5c climate ranges, room advisory; PP-C commit 0): in a small garden a walnut pasted by name joins without asking, and Your plants lists it with "grows to … m: too tall for your room" (never "prune", c2 fix round 2 K13) @real-data', async () => {
  for (const width of [390, 1280]) {
    const page = await tool({ width });
    await choose(page, 'Temperate');
    await page.evaluate(() => { const { store } = window.__ctTest; store.room.value = 'small'; store.openSheet('paste'); });
    assert.ok(await has(page, 'dialog.ct-sheet[open] textarea', 10_000), 'the Paste sheet');
    await page.type('dialog.ct-sheet[open] textarea', 'Juglans regia');
    await settled(page, 'dialog.ct-sheet[open] .ct-add-bar .button-primary'); // the sheet slides in (details.css ct-sheet-in)
    await page.locator(aria('button', 'Add 1 plant')).click(); // once the pasted name is matched
    assert.equal(await page.$('dialog[role="alertdialog"]'), null, `${width} px: no warning to confirm`);
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.memberTaxa.value.some((t) => t.canonical_name === 'Juglans regia'), { timeout: 5000 }).then(() => true, () => false), `${width} px: added without asking`);
    await page.evaluate(() => { const { store } = window.__ctTest; store.closeSheet?.(); store.view.value = 'matrix'; });
    const listed = await page.waitForFunction(() => [...document.querySelectorAll('.ct-plants li')].find((li) => li.querySelector('i[lang="la"]')?.textContent === 'Juglans regia')?.querySelector('[data-note="room-tall"]')?.textContent ?? null, { timeout: 8000 }).then((r) => r.jsonValue(), () => null);
    // The row's short form (verdict-line.ts rowLines, c2 fix round 1 A3); Details keeps the full sentence.
    assert.match(listed ?? '', /^grows to [\d.]+ m: too tall for your room/, `${width} px: Your plants lists the walnut with its height note`);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 0, `${width} px: no sideways scroll`);
    assert.deepEqual(page.thirdParty, []);
  }
});
