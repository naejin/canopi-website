// PP-B streams b1a (your place, arriving and sharing) and b1b (the pool count into Place): their
// browser tests (plant-palette-slices section 2, rows b1a and b1b). Scenario tests: they assert the
// text and state a grower relies on (through the test hook's store and the words of en.json), never
// layout. Expected-fail markers (scripts/expect-fail.mjs failing(), the owner stream in the title) are
// removed in the commit that makes each pass.
//
// The page contract b1a's Place keeps (views/place/**):
// - "Where is your place?" (#ct-loc-h) first, the climate cards (#ct-climates) behind
//   [data-place-climates] ("No location? Choose a climate" / "Not this climate? Choose another");
// - the room answers as input[name="ct-site-room"] (pots among them); "Show my palette"
//   [data-place-show]; "Start from a small suggested palette" [data-place-suggest]; the own-plants
//   step [data-place-plants] with its "Add a plant" [data-place-add];
// - each arrival line as [data-place-notice="outdated" | "oldSave" | "newer" | "unreadable" | "period" |
//   "guide" | "linkPlace" | …], "Open my saved palette instead" [data-open-saved], "Back to mine"
//   [data-back-mine] on the newer and unreadable lines over a saved palette, "Use it"
//   [data-use-link-place] and "Use my own place" [data-use-own-place]; Start over [data-start-over];
// - Share's "Include my place" tick input[data-share-location].
// The count line b1b folds into Place (views/pool/pool.tsx, lazy, shown in the Place form and the
// "Your place" sheet): [data-pool-count] is the always-present status line under the climate cards,
// its value 'checking' | 'count' | 'failed' | 'offline' (never a "0 of m": nothing fits shows
// [data-pool-empty]); [data-pool-borrowed] the borrowed-lists sentence with "Ask for this climate".
// Run capped: npm run test:browser (scripts/browser/run.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { aria, en, h, has, realDb, suggestReady, useHarness } from './helpers.mjs';
import { atSite, choose, search, tool } from './p5-helpers.mjs';
import { openCards, pickCard } from './location-fixtures.mjs';
import { placeTo } from './seams-helpers.mjs';
import { liveLog, saidTwice, watchLiveRegions } from './f1a-helpers.mjs';
import { encodeLink } from '../../src/lib/consortium/state.ts';

useHarness();

const W = (k) => en[`consortium.${k}`];
const PLACE_KEYS = ['k', 'o', 'l', 'w', 'q', 'r', 'h', 's'];
const placeKeysIn = (hash) => { const q = new URLSearchParams(hash.replace(/^#/, '')); return PLACE_KEYS.filter((k) => q.has(k)); };
const members = (page) => page.evaluate(() => window.__ctTest.store.members.value.length);
const until = (page, fn, timeout = 15_000, ...args) => page.waitForFunction(fn, { timeout }, ...args).then(() => true, () => false);
const words = (page, sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
const temperateIds = () => realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY 1").all().map((r) => String(r.id)));
const temperateName = (n = 3) => realDb((db) => db.prepare("SELECT p.canonical_name name FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY 1 LIMIT 1 OFFSET ?").get(n).name);
const v5 = async (n, extra = {}, opts = {}) => {
  const ids = await temperateIds();
  return encodeLink({ climate: 'Temperate', country: null, room: 'unsure', plot: null, period: '1991-2020', spot: null, soil: null, members: ids.slice(0, n), removed: [], guests: [], ...extra }, { Temperate: ids }, opts);
};
// A page whose storage already holds `items` (set once per tab, before the island reads it).
const withStorage = (items, path = '/palette/', opts = {}) => tool({ ...opts, hash: path.replace('/palette/', ''), setup: (pg) => pg.evaluateOnNewDocument((all) => {
  if (sessionStorage.getItem('seeded')) return;
  sessionStorage.setItem('seeded', '1');
  for (const [k, v] of Object.entries(all)) localStorage.setItem(k, v);
}, items) });
// "Start from a small suggested palette", pressed as a grower would, once the climate is read.
async function suggestFromPlace(page) {
  assert.ok(await has(page, '[data-place-suggest]', 8000), 'no "Start from a small suggested palette" on Place');
  await suggestReady(page);
  await page.click('[data-place-suggest]');
  assert.ok(await until(page, () => window.__ctTest.store.members.value.length > 0), 'the suggestion placed plants');
}

test('F1a-P4 → PP-B (b1a Seville pots, A8): "Pots or a balcony" suggests plants within its height', async () => {
  const page = await tool();
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  assert.ok(await has(page, 'input[name="ct-site-room"][value="pots"]', 4000), 'no "Pots or a balcony" room answer on Place');
  await page.click('input[name="ct-site-room"][value="pots"]');
  await suggestFromPlace(page);
  const tallest = await page.evaluate(() => Math.max(...window.__ctTest.store.memberTaxa.value.map((t) => t.traits.height_m?.max ?? 0)));
  assert.equal(await page.evaluate(() => window.__ctTest.store.room.value), 'pots', 'the palette keeps the pots answer');
  assert.ok(tallest <= 6, `the suggested plants stay within pots' height (tallest ${tallest} m)`);
  assert.ok(await page.evaluate(() => window.__ctTest.store.members.value.length <= 6), 'pots get a small palette');
});

// The live regions of Place (restored from 648baf2's F1a-P9, retargeted on Place: its loading line,
// its notices and the location line); the palette page's regions are b2's A2. Titled under PP-B3
// (its journey): plan-owners.test.mjs refuses a parked id at the start of a title, and
// browser-tests.test.mjs wants F1a-Xn → PP-B or PP-Bn there.
test('PP-B3 (b1a status regions on Place, F1a-P9 restored, A25): from Place to the suggested palette, every live region is on the page before its message, and each line is announced once per reader\'s event', async () => {
  const page = await tool({ setup: watchLiveRegions });
  await choose(page, 'Temperate');
  await suggestFromPlace(page);
  const live = await liveLog(page);
  assert.deepEqual(live.inserted, [], `a live region was inserted with its message (${live.inserted.length}: ${live.inserted.slice(0, 3).join(' | ')})`);
  assert.deepEqual(saidTwice(live.said), [], 'each line is announced once per reader\'s event');
});

// Place first (owner drop 10; decision row 127 (4); boards Place, PlaceDesk, ClimateHand): the location
// question comes first and can be skipped; the climate cards are one link away.
const OPEN_CARDS = '[data-place-climates]';
const cardsShown = (page) => page.evaluate(() => [...document.querySelectorAll('input[name="ct-climate"]')].some((r) => r.checkVisibility()));
test('PP-B2 (b1a no location, Place first): "Where is your place?" comes first; the climate cards sit behind "No location? Choose a climate", which opens them with what a grower without a location loses; then the grower\'s own plants', async () => {
  const page = await tool();
  assert.ok(await has(page, 'input[data-location-search]', 8000), 'the location step');
  await page.waitForSelector('input[name="ct-climate"]', { timeout: 8000 }).catch(() => {});
  assert.equal(await cardsShown(page), false, 'the climate cards show before the grower asks for them');
  assert.equal(await words(page, '#ct-loc-h'), 'Where is your place?');
  assert.doesNotMatch(await words(page, '.ct-location .ct-step-lede'), /^Optional/, 'the location step is not called "Optional"');
  assert.ok(await page.$eval('#ct-loc-h', (h, sel) => !!(h.compareDocumentPosition(document.querySelector(sel)) & Node.DOCUMENT_POSITION_FOLLOWING), OPEN_CARDS), 'the location question comes before the climate link');
  assert.equal(await words(page, OPEN_CARDS), 'No location? Choose a climate');
  await page.click(OPEN_CARDS);
  assert.ok(await until(page, () => [...document.querySelectorAll('input[name="ct-climate"]')].some((r) => r.checkVisibility()), 4000), 'the link opens the cards');
  assert.match(await words(page, '.ct-climates'), /Without a location you still get a palette/, 'what a grower without a location loses (ClimateHand)');
  assert.doesNotMatch(W('start.climate.lede'), /needed/i, 'the climate is not the required first step');
  await page.locator(aria('radio', 'Temperate')).click();
  assert.ok(await has(page, '[data-place-plants]', 8000), 'no own-plants step on Place');
  assert.match(await words(page, '[data-place-plants]'), new RegExp(W('place.plants.lede').slice(0, 20)));
  assert.ok(await has(page, '[data-place-add]'), 'add a plant by name');
  assert.ok(await has(page, '[data-place-show]'), '"Show my palette"');
  assert.ok(await has(page, '[data-place-suggest]'), 'the suggested palette is one link away');
  assert.equal(await cardsShown(page), true, 'the cards stay open once chosen');
  await page.click('[data-place-show]');
  assert.ok(await until(page, () => window.__ctTest.store.view.value !== 'start'), 'the palette opens with the grower\'s own plants (none yet)');
  assert.equal(await members(page), 0, 'nothing is chosen for the grower');
});

test('PP-B2 (b1a place first with a location): with a location the cards stay hidden until "Not this climate? Choose another" is pressed', async () => {
  const page = await tool();
  await atSite(page, 'seville');
  await page.evaluate(() => { window.__ctTest.store.proposedClimate.value = 'Mediterranean'; });
  await page.waitForSelector('input[name="ct-climate"]', { timeout: 8000 }).catch(() => {});
  assert.equal(await cardsShown(page), false, 'the climate cards show before the grower asks for them, with a location');
  assert.equal(await words(page, OPEN_CARDS), 'Not this climate? Choose another');
  await page.click(OPEN_CARDS);
  assert.ok(await until(page, () => [...document.querySelectorAll('input[name="ct-climate"]')].some((r) => r.checkVisibility()), 4000), 'the link opens the cards');
  assert.doesNotMatch(await words(page, '.ct-climates'), /Without a location/, 'with a location, no "without a location" line');
});

test('PP-B2 (b1a place first, a climate already chosen): with no location, a climate kept on this device leaves the cards open', async () => {
  const page = await withStorage({ 'canopi-climate': 'temperate' });
  assert.ok(await until(page, () => window.__ctTest.store.climate.value === 'Temperate', 8000), 'the kept climate');
  assert.ok(await until(page, () => [...document.querySelectorAll('input[name="ct-climate"]')].some((r) => r.checkVisibility()), 4000), 'the cards were hidden although a climate was chosen and there is no location');
  assert.equal(await page.$(OPEN_CARDS), null, 'no link to open what is open');
});

// r2-1 (review round 2): a climate kept on this device and a saved location: the cards are decided from
// what the page knows at start (the saved location counts as a place), so the saved location's lookup,
// which returns about a second later, never closes them under the grower's thumb.
test('PP-B2 (b1a r2-1 a kept climate and a saved location): the cards\' visibility does not change when the saved location\'s lookup returns', async () => {
  const rec = JSON.stringify({ lat: 37.3891, lon: -5.9845, source: 'search', label: 'Sevilla' });
  const page = await h.open('/palette/', { hook: true, mapTiles: 'stub', setup: (pg) => pg.evaluateOnNewDocument((r) => {
    if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('canopi-climate', 'temperate'); localStorage.setItem('canopi-location', r); }
    let open = null;
    const gate = new Promise((res) => { open = res; });
    window.__releaseTiles = () => open?.();
    const f = window.fetch;
    window.fetch = (input, init) => (/\/data\/climate\//.test(String(input?.url ?? input)) ? gate.then(() => f(input, init)) : f(input, init));
  }, rec) });
  assert.ok(await until(page, () => window.__ctTest?.store?.source.value && window.__ctTest.store.climate.value === 'Temperate' && !!document.querySelector('input[name="ct-climate"]'), 20_000), 'the kept climate on Place');
  assert.equal(await page.evaluate(() => window.__ctTest.store.location.value), null, 'the saved location is still being looked up');
  const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await frames();
  const before = await cardsShown(page);
  await page.evaluate(() => window.__releaseTiles());
  assert.ok(await until(page, () => !!window.__ctTest.store.location.value?.lookup), 'the saved location was read');
  await frames();
  const after = await cardsShown(page);
  assert.equal(after, before, `the cards' visibility changed when the saved location's lookup returned (${before} then ${after})`);
  assert.equal(before, false, 'with a saved location the cards wait behind the link');
  assert.equal(await words(page, OPEN_CARDS), 'Not this climate? Choose another');
});

// r2-3 (review round 2): the link's words and the "without a location" line follow a climate read from
// the location, not a location object (tiles that fail, a lookup still loading).
test('PP-B2 (b1a r2-3 a location with no climate read): the link says "No location? Choose a climate" and the cards say what a grower without one loses', async () => {
  const page = await tool();
  const [lat, lon] = [37.3891, -5.9845];
  await page.evaluate((at) => { window.__ctTest.store.location.value = { ...at, source: 'map', lookup: null }; }, { lat, lon });
  assert.ok(await has(page, OPEN_CARDS, 8000), 'the link to the cards');
  assert.equal(await words(page, OPEN_CARDS), 'No location? Choose a climate', 'the link says "Not this climate?" for a location with no climate read');
  await page.click(OPEN_CARDS);
  assert.ok(await until(page, () => [...document.querySelectorAll('input[name="ct-climate"]')].some((r) => r.checkVisibility()), 4000), 'the link opens the cards');
  assert.match(await words(page, '.ct-climates') ?? '', /Without a location you still get a palette/, 'no "without a location" line for a location with no climate read');
});

// r3-1 (review round 3): Forget after the saved location was read leaves a climate chosen and no
// location, so the cards open, as on any page with a climate and no place.
test('PP-B2 (b1a r3-1 Forget with a kept climate): after the saved location is read and forgotten, the climate cards open', async () => {
  const rec = JSON.stringify({ lat: 37.3891, lon: -5.9845, source: 'search', label: 'Sevilla' });
  // Opened without tool()'s ready wait, which also waits out the lookup's busy line (slow on a loaded
  // machine): the store says when the lookup is read.
  const page = await h.open('/palette/', { mapTiles: 'stub', hook: true, setup: (pg) => pg.evaluateOnNewDocument((all) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [k, v] of Object.entries(all)) localStorage.setItem(k, v);
  }, { 'canopi-climate': 'temperate', 'canopi-location': rec }) });
  assert.ok(await until(page, () => !!window.__ctTest?.store.location.value?.lookup && window.__ctTest.store.climate.value === 'Temperate', 60_000), 'the saved location was read');
  assert.equal(await cardsShown(page), false, 'with the saved location the cards wait behind the link');
  assert.ok(await has(page, aria('button', W('location.forget')), 4000), 'Forget this location');
  await page.locator(aria('button', W('location.forget'))).click();
  assert.ok(await until(page, () => window.__ctTest.store.location.value === null, 4000), 'the location goes');
  assert.ok(await until(page, () => [...document.querySelectorAll('input[name="ct-climate"]')].some((r) => r.checkVisibility()), 4000), 'the cards stay hidden after Forget although a climate is chosen and there is no location');
});

// A palette made on Temperate (the store's own suggestion), shown on the palette page.
async function temperatePalette(page) {
  await choose(page, 'Temperate');
  await suggestReady(page);
  await page.evaluate(() => { const s = window.__ctTest.store; s.suggestMembers(); s.view.value = 'matrix'; });
  assert.ok(await has(page, aria('button', W('place.sheet.open')), 8000), 'no "Change your place" on the palette');
}
// "Add a plant by name" on Place, as a grower does: the name searched, ticked and added; the page has
// k plants then, and stays on Place.
async function addByName(page, name, k) {
  assert.ok(await has(page, '[data-place-add]', 8000), `plant ${k}: "Add a plant by name" on Place`);
  await page.click('[data-place-add]');
  assert.ok(await has(page, 'dialog[open].ct-sheet input[type="search"]', 10_000), 'the search sheet');
  await page.locator('dialog[open].ct-sheet input[type="search"]').fill(name);
  assert.ok(await until(page, (nm) => [...document.querySelectorAll('dialog[open] .ct-tick input')].some((b) => b.getAttribute('aria-label').endsWith(`, ${nm}`)), 8000, name), `${name} in the search`);
  await page.evaluate((nm) => [...document.querySelectorAll('dialog[open] .ct-tick input')].find((b) => b.getAttribute('aria-label').endsWith(`, ${nm}`)).click(), name);
  await page.locator(aria('button', 'Add 1 plant')).click();
  assert.ok(await until(page, (n) => window.__ctTest.store.members.value.length === n, 8000, k), `plant ${k} added`);
  assert.equal(await page.evaluate(() => window.__ctTest.store.view.value), 'start', `plant ${k}: adding a plant left Place`);
}
const openPlaceSheet = async (page) => {
  await page.locator(aria('button', W('place.sheet.open'))).click();
  assert.ok(await has(page, 'dialog[open].ct-sheet #ct-place-sheet-h', 4000), 'the "Your place" sheet opens');
};

// conformance-2 (b1a review r1; boards Place, PlaceDesk): the grower lists the plants already growing
// there on Place; each added plant joins the list and the rest of Place stays.
test('PP-B2 (b1a conformance-2 own plants on Place): two plants added by name from Place both show under "What grows there already", and Your spot and "Show my palette" stay', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  for (const [i, n] of [3, 7].entries()) {
    await addByName(page, await temperateName(n), i + 1);
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
  }
  assert.equal(await page.$$eval('[data-place-plants] .ct-own-chip', (l) => l.length), 2, 'both plants listed on Place');
  assert.ok(await has(page, '#ct-site-h'), 'Your spot stays');
  assert.ok(await has(page, '[data-place-show]'), '"Show my palette" stays');
});

// conformance-4 (b1a review r1; board ChangePlace, owner drop 11): "Your place" opens a sheet that
// changes the place in place: the palette follows, no plant is removed, and Back closes it. "Change
// site" and "Back to your palette" are gone.
test('PP-B2 (b1a conformance-4 Your place sheet): the palette\'s place changes in a sheet that keeps every plant; Back closes it', async () => {
  const page = await tool();
  await temperatePalette(page);
  const before = await page.evaluate(() => window.__ctTest.store.members.value.join());
  assert.ok(before, 'a palette');
  assert.equal(await page.$(aria('button', 'Change site')), null, '"Change site" is still on the page');
  await page.locator(aria('button', W('place.sheet.open'))).click();
  assert.ok(await has(page, 'dialog[open].ct-sheet', 4000), 'the sheet opens');
  assert.equal(await words(page, 'dialog[open] h2[data-autofocus]'), W('place.sheet.title'));
  assert.match(await words(page, 'dialog[open]') ?? '', /never removes a plant/, 'the sheet says the palette keeps its plants');
  await page.click('dialog[open] input[name="ct-site-room"][value="large"]');
  assert.ok(await until(page, () => window.__ctTest.store.room.value === 'large', 4000), 'the room answer');
  assert.ok(await until(page, () => /(^|[#&])m=large(&|$)/.test(location.hash), 4000), 'the palette follows the room at once');
  await page.click('dialog[open] input[name="ct-climate"][value="mediterranean"]');
  assert.ok(await until(page, () => window.__ctTest.store.climate.value === 'Mediterranean', 4000), 'another climate');
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.join()), before, 'another climate removed plants');
  assert.equal(await page.evaluate(() => window.__ctTest.store.view.value), 'matrix', 'the palette stays');
  await page.goBack();
  assert.ok(await until(page, () => !document.querySelector('dialog[open]'), 4000), 'Back closes the sheet');
  assert.equal(await page.evaluate(() => window.__ctTest.store.view.value), 'matrix', 'Back left the palette');
  assert.equal(await page.$(aria('button', 'Back to your palette')), null, '"Back to your palette" is still on the page');
});

// Fix round 2, C (8.3): each history entry carries what Back needs: `pp`, and its start `st` (new on
// each link opened in the tab). A Back onto another start's entry reopens that entry's own palette.
const pasteLink = async (page, link, n) => {
  await page.evaluate((f) => { location.hash = f; }, link);
  assert.ok(await until(page, (k) => window.__ctTest.store.members.value.length === k && !window.__ctTest.store.restoring?.value, 15_000, n), 'the pasted link opens');
  await new Promise((r) => setTimeout(r, 300));
};
// A Temperate palette on a fresh page, its address P and its plant count n, before a link is pasted.
const paletteBeforeLink = async () => {
  const page = await tool();
  await temperatePalette(page);
  await new Promise((r) => setTimeout(r, 300));
  return { page, P: await page.evaluate(() => location.hash), n: await members(page) };
};
test('PP-B2 (b1a fix round 2, r2-6 Back off a pasted link through a sheet): paste L, open a plant, Back, Back: the palette before L reopens, its entry not rewritten', async () => {
  const { page, P, n } = await paletteBeforeLink();
  const L = `#${await v5(4)}`;
  assert.notEqual(n, 4, 'the palette is not the link\'s');
  await pasteLink(page, L, 4);
  await page.evaluate(() => { const s = window.__ctTest.store; s.openSheet('details', s.members.value[0]); });
  assert.ok(await has(page, 'dialog[open].ct-sheet', 8000), 'the plant\'s details');
  await page.evaluate(() => history.back());
  assert.ok(await until(page, () => !document.querySelector('dialog[open]'), 6000), 'Back closes the details');
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => history.back());
  assert.ok(await until(page, (p) => location.hash === p, 8000, P), 'the entry before the link was rewritten with the link');
  assert.ok(await until(page, (k) => window.__ctTest.store.members.value.length === k, 8000, n), 'the palette before the link reopens');
});
test('PP-B2 (b1a fix round 2, r2-7 Back to Place past a pasted link): Place, palette, paste L, Back, Back: Place shows', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  await suggestFromPlace(page);
  assert.ok(await until(page, () => window.__ctTest.store.view.value === 'matrix', 8000), 'the palette');
  await new Promise((r) => setTimeout(r, 300));
  const P = await page.evaluate(() => location.hash);
  await pasteLink(page, `#${await v5(4)}`, 4);
  await page.evaluate(() => history.back());
  assert.ok(await until(page, (p) => location.hash === p, 8000, P), 'Back reopens the palette before the link');
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => history.back());
  assert.ok(await until(page, () => window.__ctTest.store.view.value === 'start', 8000), 'the second Back does not return to Place');
});

// b1a2-1 (fix round 1): changing the place never removes a plant; each kept plant is still drawn and
// saved, so a reload keeps it.
test('PP-B2 (b1a fix round 1, b1a2-1 a climate changed in the sheet): a Temperate-only plant stays through Temperate → Mediterranean and a reload', async () => {
  const page = await tool();
  await temperatePalette(page);
  const only = await page.evaluate(async () => {
    const s = window.__ctTest.store, med = new Set((await s.loadPool('Mediterranean')).map((t) => t.id));
    return s.members.value.filter((id) => !med.has(id));
  });
  assert.ok(only.length, 'a plant only Temperate lists');
  const before = await page.evaluate(() => window.__ctTest.store.members.value.slice().sort().join());
  await openPlaceSheet(page);
  await page.click('dialog[open] input[name="ct-climate"][value="mediterranean"]');
  assert.ok(await until(page, () => window.__ctTest.store.climate.value === 'Mediterranean', 4000), 'another climate');
  assert.ok(await until(page, (ids) => ids.every((id) => window.__ctTest.store.memberTaxa.value.some((t) => t.id === id)), 8000, only), 'the Temperate-only plants are drawn');
  await page.reload();
  assert.ok(await until(page, (b) => window.__ctTest?.store.members.value.slice().sort().join() === b && window.__ctTest.store.climate.value === 'Mediterranean', 30_000, before), 'a reload lost a plant');
});

// b1a2-2 (fix round 1): a climate with no list of its own here says why in the sheet, with what Place
// offers.
test('PP-B2 (b1a fix round 1, b1a2-2 the sheet says why): Subtropical with no location says "needs your location" in the sheet', async () => {
  const page = await tool();
  await temperatePalette(page);
  await openPlaceSheet(page);
  await page.click('dialog[open] input[name="ct-climate"][value="subtropical"]');
  assert.ok(await has(page, 'dialog[open] [data-needs-site]', 8000), 'the sheet says nothing about the borrowed list');
});

// b1a2-3 (fix round 1): a map left with its sheet is closed.
test('PP-B2 (b1a fix round 1, b1a2-3 map gone with its sheet): the sheet\'s map, Back, the sheet again, then Start over: no map opens', async () => {
  const page = await tool();
  await temperatePalette(page);
  await openPlaceSheet(page);
  await page.click('dialog[open] [data-location-action="map"]');
  assert.ok(await has(page, '[data-location-map] canvas', 10_000), 'the map draws');
  await page.evaluate(() => history.back());
  assert.ok(await until(page, () => !document.querySelector('dialog[open]'), 6000), 'Back closed the sheet');
  await openPlaceSheet(page);
  assert.equal(await page.$('[data-location-map]'), null, 'the map opened by itself with the sheet');
  await page.click('dialog[open] [data-place-sheet-foot] .link-button');
  assert.ok(await until(page, () => window.__ctTest.store.view.value === 'start', 6000), 'Start over');
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(await page.$('[data-location-map]'), null, 'the map opened by itself on Place');
});

// b1a2-6 (fix round 1; moved in fix round 3, since "Show my palette" offers no Undo any more): an Undo
// that goes back to Place pressed in the sheet's foot, here the suggestion's from Place: the sheet goes
// with the palette, and the focus lands on the page.
test('PP-B2 (b1a fix round 3, b1a2-6 Undo in the sheet): the suggestion\'s Undo pressed in the "Your place" sheet leaves no sheet open, one set of climate cards, and the focus on the page', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  await suggestFromPlace(page);
  assert.ok(await has(page, aria('button', W('place.sheet.open')), 8000), 'the palette');
  await openPlaceSheet(page);
  assert.ok(await has(page, 'dialog[open] .ct-toast-undo', 4000), 'the Undo in the sheet');
  // The sheet closes in the same update as the view goes back to Place (not later, by Back's popstate).
  const same = await page.evaluate(() => {
    document.querySelector('dialog[open] .ct-toast-undo').click();
    const s = window.__ctTest.store;
    return { view: s.view.value, sheet: s.sheet.value };
  });
  assert.deepEqual(same, { view: 'start', sheet: null }, 'Undo went back to Place with the sheet still open');
  assert.ok(await until(page, () => !document.querySelector('dialog[open]'), 4000), 'a sheet is still open');
  assert.equal(await page.$$eval('#ct-climates', (l) => l.length), 1, 'one set of climate cards');
  assert.ok(await until(page, () => document.activeElement && document.activeElement !== document.body, 4000), 'the focus fell to the body');
});

// r3-4 (fix round 3): entries the code before start ids wrote have no `st`. P's entry, a link pasted on
// it, both without st, a reload on the link (the new code), Back: the entry before opens its own palette,
// never rewritten with the link.
test('PP-B2 (b1a fix round 3, r3-4 entries without st from before the deploy): a reload on a pasted link, then Back: the palette before reopens, its entry not rewritten', async () => {
  const { page, P, n } = await paletteBeforeLink();
  const strip = () => page.evaluate(() => { const { st: _, ...rest } = history.state ?? {}; history.replaceState(rest, '', location.href); });
  await strip();
  await pasteLink(page, `#${await v5(4)}`, 4);
  await strip();
  await page.reload();
  assert.ok(await until(page, () => window.__ctTest?.store.members.value.length === 4, 30_000), 'the reload opens the link');
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => history.back());
  assert.ok(await until(page, (p) => location.hash === p, 8000, P), 'the entry before the link was rewritten with the link');
  assert.ok(await until(page, (k) => window.__ctTest?.store.members.value.length === k, 30_000, n), 'the palette before the link reopens');
});

// c-4 (board ChangePlace): the sheet's foot has "Start over" and "Done"; Done closes it.
test('PP-B2 (b1a fix round 1, c-4 the sheet\'s foot): "Start over" and "Done", and Done closes the sheet on the palette', async () => {
  const page = await tool();
  await temperatePalette(page);
  await openPlaceSheet(page);
  assert.equal(await words(page, 'dialog[open] [data-place-sheet-foot] .link-button'), W('start.over'));
  await page.locator(aria('button', W('place.sheet.done'))).click();
  assert.ok(await until(page, () => !document.querySelector('dialog[open]'), 4000), 'Done closes the sheet');
  assert.equal(await page.evaluate(() => window.__ctTest.store.view.value), 'matrix', 'Done left the palette');
});

// Owner 2026-11-15: plants added on Place are saved on the device at once, so a reload keeps them.
test('PP-B2 (b1a owner 2026-11-15, Place adds saved): a plant added on Place stays after a reload on Place', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  await addByName(page, await temperateName(3), 1);
  assert.ok(await until(page, () => localStorage.getItem('canopi-consortium') !== null, 4000), 'the plant added on Place is not saved on the device');
  await page.reload();
  assert.ok(await until(page, () => window.__ctTest?.store.members.value.length === 1, 30_000), 'a reload on Place lost the plant');
});

test('PP-B2 (b1a UI hand-off, failed-chunk notice): a sheet whose chunk fails says so with Reload where it covers nothing, at 390, 960 and 1280 px', async () => {
  for (const width of [390, 960, 1280]) {
    const page = await tool({ width, data: 'fixture', block: { sheets: 404 } });
    await openCards(page);
    await page.locator(aria('radio', 'Temperate')).click();
    await page.locator(aria('button', 'Paste a list')).click();
    assert.ok(await has(page, '.ct-toast', 6000), `${width}: the notice`);
    const seen = await page.evaluate(() => {
      const card = document.querySelector('.ct-toast');
      if (!card) return { gone: true };
      const t = card.getBoundingClientRect();
      const meets = (r) => r.width > 0 && r.height > 0 && r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top;
      const under = [...document.querySelectorAll('#ct-root :is(button, a[href], input, label, h2, h3, p, li)')]
        .filter((el) => !card.contains(el) && !el.contains(card) && !el.closest('dialog') && meets(el.getBoundingClientRect()))
        .map((el) => `${el.tagName} ${(el.textContent || '').trim().slice(0, 30)}`);
      return { gone: false, under, reload: !!card.querySelector('button') };
    });
    assert.equal(seen.gone, false, `${width}: the notice`);
    assert.ok(seen.reload, `${width}: the notice has Reload`);
    assert.deepEqual(seen.under, [], `${width}: the notice covers nothing of the page`);
    await page.browserContext().close().catch(() => {});
  }
});

test('PP-B3 (b1a suggested palette): "Start from a small suggested palette" adds plants, and one Undo takes them all away', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  await suggestFromPlace(page);
  const n = await members(page);
  assert.ok(n > 0 && n <= 9);
  assert.ok(await has(page, aria('button', W('undo')), 4000), 'the toast offers Undo');
  await page.locator(aria('button', W('undo'))).click();
  assert.ok(await until(page, () => window.__ctTest.store.members.value.length === 0), 'one Undo removes them all');
  assert.equal(await page.evaluate(() => window.__ctTest.store.view.value), 'start', 'back on Place');
});

test('PP-B4 (b1a older save): a v4 saved palette says the older line once, and the tool is empty', async () => {
  const save = JSON.stringify({ fragment: 'v=4&c=temperate&m=large&a=dhUvw6&e=1', at: '2026-11-12T10:00:00.000Z', src: 'chosen' });
  const page = await withStorage({ 'canopi-consortium': save });
  assert.ok(await has(page, '[data-place-notice="oldSave"]', 8000), 'no older-save line on Place');
  assert.equal(await words(page, '[data-place-notice="oldSave"]'), W('start.oldSave'));
  assert.doesNotMatch(W('start.oldSave'), /consortium/i, 'the grower reads "palette"');
  assert.equal(await members(page), 0, 'nothing restored');
  assert.equal(await page.evaluate(() => localStorage.getItem('canopi-consortium')), null, 'the older save is removed');
  await page.reload();
  await openCards(page);
  assert.ok(await has(page, aria('radio', 'Temperate'), 8000));
  assert.equal(await page.$('[data-place-notice="oldSave"]'), null, 'said once');
});

test('PP-B5 (b1a reloads): three reloads keep the room and spot answers while the address holds none of k o l w q r h s', async () => {
  const page = await tool();
  await openCards(page);
  await page.locator(aria('radio', 'Temperate')).click();
  assert.ok(await has(page, '[data-place-plants]', 8000), 'no own-plants step on Place');
  await page.click('input[name="ct-site-room"][value="large"]');
  await page.click('input[name="ct-site-light"][value="shade"]');
  const answers = () => page.evaluate(() => { const s = window.__ctTest.store; return [s.room.value, s.spot.value.light]; });
  const reload = async (label) => {
    await page.reload();
    assert.ok(await until(page, () => window.__ctTest?.store?.source.value), `${label}: the tool loads`);
    await page.waitForFunction(() => window.__ctTest.store.room.value !== 'unsure', { timeout: 5000 }).catch(() => {});
    assert.deepEqual(await answers(), ['large', 'shade'], `${label}: lost the room or spot answer`);
    assert.deepEqual(placeKeysIn(await page.evaluate(() => location.hash)), [], `${label}: the address holds no place answer`);
  };
  await reload('before any plant');
  if (!(await page.evaluate(() => window.__ctTest.store.climate.value))) { await openCards(page); await page.locator(aria('radio', 'Temperate')).click(); }
  await suggestFromPlace(page);
  assert.deepEqual(placeKeysIn(await page.evaluate(() => location.hash)), [], 'with plants: the address holds no place answer');
  await reload('with plants');
  assert.ok(await has(page, '[data-start-over]', 8000), 'Start over');
  await page.click('[data-start-over]');
  await reload('after Start over');
});

test('PP-B5 (b1a shade answer): a "shade" answer moves a sun-only plant to "needs a second look", and it stays after reload', async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  const sunOnly = await page.evaluate(() => window.__ctTest.store.pool.value.find((t) => t.traits.light?.length === 1 && t.traits.light[0] === 'full')?.id ?? window.__ctTest.store.pool.value[0].id);
  await page.evaluate((id) => { const s = window.__ctTest.store; s.addMembers([id]); s.spot.value = { ...s.spot.value, light: 'shade' }; }, sunOnly);
  // A plant added on Place stays there (conformance-2): "Show my palette" makes it the palette, saved.
  await page.click('[data-place-show]');
  assert.ok(await until(page, (id) => !!window.__ctTest.store.memberVerdicts.value?.get(id), 8000, sunOnly), 'no verdict for the sun-only plant');
  assert.equal(await page.evaluate((id) => window.__ctTest.store.memberVerdicts.value.get(id).level, sunOnly), 'look', 'no "needs a second look" verdict for a sun-only plant in shade');
  await page.reload();
  assert.ok(await until(page, (id) => window.__ctTest?.store?.memberVerdicts.value?.get(id)?.level === 'look', 15_000, sunOnly), 'still "needs a second look" after reload');
});

test('PP-B10 (b1a share): with "Include my place" off the link holds none of k o l w q r h s; on, it holds them and the sheet says so in words', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  await suggestReady(page);
  await page.evaluate(() => { const s = window.__ctTest.store; s.suggestMembers(); s.view.value = 'matrix'; s.spot.value = { ...s.spot.value, light: 'sun' }; s.country.value = { code: 'FR', source: 'chosen' }; });
  assert.ok(await has(page, aria('button', W('share.button')), 8000), 'Share');
  await page.locator(aria('button', W('share.button'))).click();
  assert.ok(await has(page, 'input[data-share-location]', 4000), 'no "Include my place" tick');
  assert.equal(await page.$eval('input[data-share-location]', (e) => e.checked), false, 'off by default');
  const link = () => page.$eval('#ct-share-field', (e) => new URL(e.value).hash);
  assert.deepEqual(placeKeysIn(await link()), [], 'unticked: none of k o l w q r h s');
  assert.match(await words(page, '.ct-share'), new RegExp(W('share.location')));
  await page.click('input[data-share-location]');
  assert.ok(await until(page, () => /[#&]l=sun/.test(document.querySelector('#ct-share-field').value), 4000), 'ticked: the spot answer travels');
  assert.ok(placeKeysIn(await link()).includes('k'), 'ticked: the chosen country travels');
  assert.match(await words(page, '.ct-share'), /spot answers/, 'the sheet says what travels, in words');
});

test('PP-B11 (b1a Start over): Start over shows a toast with Undo, and Undo brings the palette back', async () => {
  const page = await tool();
  await temperatePalette(page);
  const before = await page.evaluate(() => window.__ctTest.store.members.value.join());
  assert.ok(await has(page, aria('button', W('start.over')), 8000), 'Start over');
  await page.locator(aria('button', W('start.over'))).click();
  assert.ok(await until(page, () => window.__ctTest.store.members.value.length === 0), 'the palette is cleared');
  assert.ok(await has(page, aria('button', W('undo')), 4000), 'no Undo after Start over');
  await page.locator(aria('button', W('undo'))).click();
  assert.ok(await until(page, (b) => window.__ctTest.store.members.value.join() === b, 4000, before), 'Undo brings the palette back');
});

test('PP-B12 (b1a guide over a save): a guide link with a saved palette offers "Open my saved palette instead", which restores it', async () => {
  const fragment = await v5(4);
  const name = await temperateName(10);
  const page = await withStorage({ 'canopi-consortium': JSON.stringify({ fragment, place: '', at: '2026-11-13', src: null }) }, `/palette/?plant=${encodeURIComponent(name)}&climate=temperate`);
  assert.ok(await until(page, () => window.__ctTest.store.members.value.length === 1), 'the guide\'s plant is the palette');
  assert.ok(await has(page, '[data-open-saved]', 8000), 'no "Open my saved palette instead"');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('canopi-consortium')).fragment), fragment, 'the save is untouched');
  await page.click('[data-open-saved]');
  assert.ok(await until(page, () => window.__ctTest.store.members.value.length === 4), 'the saved palette is back');
});

test('PP-B13 (b1a newer and unreadable links): v=6 and an unreadable link each say their line, the tool stays empty and the save untouched, and "Back to mine" opens the saved palette', async () => {
  const save = JSON.stringify({ fragment: await v5(3), place: '', at: '2026-11-13', src: null });
  for (const [hash, kind, key] of [['#v=6&c=temperate&a=abcdef&e=1', 'newer', 'place.newer'], ['#v=x5&c=temperate&a=abcdef&e=1', 'unreadable', 'place.unreadable']]) {
    const page = await withStorage({ 'canopi-consortium': save }, `/palette/${hash}`);
    assert.ok(await has(page, `[data-place-notice="${kind}"]`, 8000), kind === 'newer' ? 'no newer-version line' : 'no could-not-be-read line');
    assert.match(await words(page, `[data-place-notice="${kind}"]`), new RegExp(W(key).slice(0, 24)));
    assert.equal(await members(page), 0, `${kind}: nothing restored`);
    assert.equal(await page.evaluate(() => localStorage.getItem('canopi-consortium')), save, `${kind}: the save untouched`);
    assert.ok(await has(page, `[data-place-notice="${kind}"] [data-back-mine]`, 4000), `${kind}: no "Back to mine" for the saved palette`);
    await page.click(`[data-place-notice="${kind}"] [data-back-mine]`);
    assert.ok(await until(page, () => window.__ctTest.store.members.value.length === 3), `${kind}: "Back to mine" opens the saved palette`);
  }
});

// Keyboard and screen-reader growers (bugs-6; section 9 A25): the notice's button leaves the page with
// its line, so the focus moves on (never to <body>) and the status line says what happened.
test('PP-B12 (b1a keyboard answers): Enter on "Use my own place" or "Open my saved palette instead" leaves the focus on the page and the status line says what happened', async () => {
  const focusOnBody = (page) => page.evaluate(() => !document.activeElement || document.activeElement === document.body);
  const link = await v5(3, { spot: { light: 'shade', water: 'unsure', wind: 'unsure', ground: 'unsure', height: 'unsure' } }, { place: true });
  const page = await tool({ hash: `#${link}` });
  assert.ok(await has(page, '[data-use-own-place]', 15_000), 'no link-place notice');
  await page.focus('[data-use-own-place]');
  await page.keyboard.press('Enter');
  assert.ok(await until(page, () => !document.querySelector('[data-use-own-place]'), 4000), 'the notice goes');
  await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 2000 }).catch(() => {});
  assert.equal(await focusOnBody(page), false, 'the focus fell to <body> after "Use my own place"');
  assert.equal(await words(page, '.ct-place-status'), W('place.usedMine'), 'the status line says the grower\'s own place is back');

  const fragment = await v5(4);
  const guide = await withStorage({ 'canopi-consortium': JSON.stringify({ fragment, place: '', at: '2026-11-13', src: null }) }, `/palette/?plant=${encodeURIComponent(await temperateName(10))}&climate=temperate`);
  assert.ok(await has(guide, '[data-open-saved]', 8000), 'no "Open my saved palette instead"');
  await guide.focus('[data-open-saved]');
  await guide.keyboard.press('Enter');
  assert.ok(await until(guide, () => window.__ctTest.store.members.value.length === 4), 'the saved palette is back');
  await guide.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 2000 }).catch(() => {});
  assert.equal(await focusOnBody(guide), false, 'the focus fell to <body> after "Open my saved palette instead"');
  assert.equal(await words(guide, '.ct-place-status'), W('place.openedSaved'));
});

test('PP-B14 (b1a guide link): ?plant=…&climate=… opens on /palette/ (also from the old /consortium/ address) with the plant as a member', async () => {
  const name = await temperateName(5);
  for (const path of ['/palette/', '/consortium/']) {
    const page = await h.open(`${path}?plant=${encodeURIComponent(name)}&climate=temperate`, { hook: true });
    assert.ok(await until(page, () => window.__ctTest?.store?.members.value.length === 1, 20_000), `${path}: the guide's plant is a member`);
    assert.equal(new URL(page.url()).pathname, '/palette/', `${path}: on /palette/`);
    assert.equal(await page.evaluate((n) => window.__ctTest.store.memberTaxa.value[0]?.canonical_name === n, name), true);
  }
});

// Place at 320 px (WCAG 1.4.10): nothing scrolls sideways and no control or plant name passes the
// right edge, in en, de, ru and ja (long words, Cyrillic, CJK).
test('PP-B19 (b1a Place at 320 px): in en, de, ru and ja nothing scrolls sideways and no control passes the right edge', async () => {
  for (const lang of ['en', 'de', 'ru', 'ja']) {
    const page = await tool({ lang, width: 320 });
    await choose(page, 'Temperate');
    await page.waitForSelector('input[name="ct-site-room"]', { timeout: 8000 });
    const over = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const bad = [...document.querySelectorAll('.ct button, .ct input, .ct select, .ct label, .ct a, .ct h2, .ct legend')]
        .filter((e) => e.getClientRects().length && e.getBoundingClientRect().right > w + 0.5)
        .map((e) => `${e.tagName} ${(e.textContent || e.getAttribute('aria-label') || e.name || '').trim().slice(0, 30)}`);
      return { scroll: document.documentElement.scrollWidth - w, bad };
    });
    assert.ok(over.scroll <= 0, `${lang}: the page scrolls sideways by ${over.scroll} px`);
    assert.deepEqual(over.bad, [], `${lang}: controls pass the right edge`);
  }
});

// ---- b1b: the pool count in Place (plant-palette-slices section 2, row b1b; drift check 2026-11-15) ----
const COUNT = '[data-pool-count]';
// A plural string of en.json for n (the 'other' form past one), as strings.ts P() writes it in en.
const plural = (k, n, vars = {}) => {
  const forms = Object.fromEntries(W(k).split(' | ').map((f) => { const i = f.indexOf(':'); return [f.slice(0, i).trim(), f.slice(i + 1).trim()]; }));
  return Object.entries(vars).reduce((t, [a, b]) => t.split(`{${a}}`).join(String(b)), (n === 1 ? forms.one : forms.other).replace(/#/g, String(n)));
};
const countIs = (page, want, timeout = 15_000) => until(page, (sel, w) => document.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim() === w, timeout, COUNT, want);
const countState = (page) => page.$eval(COUNT, (e) => e.dataset.poolCount).catch(() => null);

// Kiambu's cell reads Cfb (highland), so the location proposes Temperate: the reader's honest answer
// (coordinator 2026-11-15). Kiambu stays the "Not this climate? Choose another" case: the concept's
// grower (P1) overrides it to Subtropical, the climate that borrows the nearest lists: 305 of 515.
test('PP-B1 (b1b Kiambu, concept P1): search Kiambu, which proposes Temperate (Cfb); "Not this climate? Choose another" overrides it to Subtropical: Place says 305 of the 515 plants on the nearest lists fit today, with the borrowed lists and "Ask for this climate" @real-data', async () => {
  const page = await tool({ nominatim: 'fixture' });
  await search(page, 'Kiambu');
  assert.ok(await has(page, '[data-location-confirm]', 15_000), 'Kiambu read, its climate proposed');
  assert.equal(await page.evaluate(() => window.__ctTest.store.proposedClimate.value), 'Temperate', 'Kiambu (Cfb) proposes Temperate, the honest answer');
  // "Not this climate? Choose another": the reader overrides the proposal.
  await pickCard(page, 'subtropical');
  assert.equal(await page.evaluate(() => window.__ctTest.store.climate.value), 'Subtropical', 'Subtropical, a climate that borrows the nearest lists');
  const want = plural('range.pool.count', 305, { total: 515 });
  assert.ok(await countIs(page, want), `the count line says "${want}" (it says "${await words(page, COUNT)}")`);
  assert.ok(await has(page, '[data-pool-borrowed] a', 2000), 'the borrowed lists, with "Ask for this climate"');
  assert.equal(await page.$('[data-pool-empty]'), null);
  // In the "Your place" sheet over the palette: the same line; Head keeps only the needs lines.
  await page.click('[data-place-show]');
  assert.ok(await until(page, () => window.__ctTest.store.step.value === 'palette'), 'the palette');
  assert.equal(await page.$(`.ct-result-head ${COUNT}`), null, 'no count line in the head');
  await page.evaluate(() => window.__ctTest.store.openSheet('place'));
  assert.ok(await until(page, (sel, w) => document.querySelector(`dialog[open] ${sel}`)?.textContent.replace(/\s+/g, ' ').trim() === w, 15_000, COUNT, want), 'the sheet says it too');
});

test('PP-B1 (b1b count line in the sheet): changing the climate updates the count, in the curated list\'s own words; a spot answer leaves it (fits and second looks both count) @real-data', async () => {
  const page = await tool();
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  const med = plural('place.count.own', 198, { total: 200, list: W('list.mediterranean') });
  assert.ok(await countIs(page, med), `"${med}" (it says "${await words(page, COUNT)}")`);
  await page.click('[data-place-show]');
  await page.evaluate(() => window.__ctTest.store.openSheet('place'));
  assert.ok(await has(page, 'dialog[open] [data-place-climates], dialog[open] #ct-climates:not([hidden])', 8000), 'the sheet');
  await pickCard(page, 'temperate');
  const tem = plural('place.count.own', 135, { total: 200, list: W('list.temperate') });
  assert.ok(await countIs(page, tem), `the sheet's count follows the climate: "${tem}" (it says "${await words(page, `dialog[open] ${COUNT}`)}")`);
  await page.evaluate(() => { const { store } = window.__ctTest; store.site.value = { ...store.site.value, light: 'shade' }; });
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await words(page, `dialog[open] ${COUNT}`), tem, 'a shade answer moves plants between fits and a second look, both counted');
});

test('PP-B1 (b1b count line states): checking while the verdict chunk loads (the line already there), then the count; no line without a location on a curated climate', async () => {
  const page = await tool({ block: { verdict: 'hold' } });
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Mediterranean'; });
  assert.ok(await has(page, '[data-place-suggest]', 15_000), 'Place, Mediterranean, no location');
  assert.equal(await page.$(COUNT), null, 'no count line without a location (every verdict would be "unknown")');
  await atSite(page, 'seville');
  assert.ok(await until(page, (sel) => document.querySelector(sel)?.dataset.poolCount === 'checking', 15_000, COUNT), `"Checking…" while the verdict chunk is held (${await countState(page)})`);
  assert.equal(await words(page, COUNT), W('place.count.checking'));
  await page.releaseHeld();
  assert.ok(await countIs(page, plural('place.count.own', 198, { total: 200, list: W('list.mediterranean') })), 'then the count');
});

test('PP-B1 (b1b count line, verdict chunk refused): "Could not check" with Retry, never "0 of m"; offline it needs a connection', async () => {
  const page = await tool({ block: { verdict: 404 } });
  await atSite(page, 'seville');
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Mediterranean'; });
  assert.ok(await until(page, (sel) => document.querySelector(sel)?.dataset.poolCount === 'failed', 15_000, COUNT), `the failed line (${await countState(page)})`);
  assert.match(await words(page, COUNT), new RegExp(`^${W('place.count.failed').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.doesNotMatch(await words(page, COUNT), /^0 /, 'never "0 of m"');
  assert.ok(await has(page, `${COUNT} ${aria('button', W('load.retry'))}`, 2000), 'Retry (load.retry)');
  await page.setOfflineMode(true);
  assert.ok(await until(page, (sel) => document.querySelector(sel)?.dataset.poolCount === 'offline', 4000, COUNT), 'offline: needs a connection');
  assert.equal(await words(page, COUNT), W('load.needsConnection'));
  await page.setOfflineMode(false);
});

test('F1a-P7 → PP-B (b1b Suggest waits for the verdict chunk, owner Q2): with a location, Suggest places nothing until the verdict chunk comes, then suggests', async () => {
  const page = await tool({ block: { verdict: 'hold' } });
  await atSite(page, 'seville');
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Mediterranean'; });
  assert.ok(await has(page, '[data-place-suggest]', 15_000), 'Place with "Start from a small suggested palette"');
  await suggestReady(page);
  await page.click('[data-place-suggest]');
  await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 1000 }).catch(() => {});
  const early = await members(page);
  assert.equal(early, 0, `Suggest placed ${early} plants before the verdict chunk came`);
  await page.releaseHeld();
  assert.ok(await until(page, () => window.__ctTest.store.members.value.length > 0), 'then it suggests');
});

test('PP-B1 (b1b Suggest and a refused verdict chunk): a waiting Suggest ends with one toast, places nothing and is no longer busy; without a location Suggest never waits for it', async () => {
  const page = await tool({ block: { verdict: 404 } });
  await atSite(page, 'seville');
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Mediterranean'; });
  assert.ok(await has(page, '[data-place-suggest]', 15_000));
  await suggestReady(page);
  const toasts = await page.evaluate(() => { const { store } = window.__ctTest; window.__toasts = []; store.toast.subscribe((t) => { if (t) window.__toasts.push(t.text); }); return true; });
  assert.ok(toasts);
  await page.click('[data-place-suggest]');
  assert.ok(await until(page, () => window.__toasts.length > 0, 10_000), 'a toast says so');
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(await page.evaluate(() => window.__toasts.length), 1, 'one toast');
  assert.equal(await members(page), 0, 'nothing placed');
  assert.equal(await page.$('[data-place-suggest][aria-busy="true"]'), null, 'no longer busy');
  // Without a location (Forget): no verdict needed, so Suggest runs at once.
  const fresh = await tool({ block: { verdict: 'hold' } });
  await fresh.evaluate(() => { window.__ctTest.store.climate.value = 'Mediterranean'; });
  assert.ok(await has(fresh, '[data-place-suggest]', 15_000));
  await suggestReady(fresh);
  await fresh.click('[data-place-suggest]');
  assert.ok(await until(fresh, () => window.__ctTest.store.members.value.length > 0, 5000), 'without a location, Suggest does not wait for the verdict chunk');
});

test('PP-B1 (b1b count line, a later period from a link): the line names the period, never "today" for 2041–2070', async () => {
  const page = await tool();
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  assert.ok(await until(page, (sel) => document.querySelector(sel)?.dataset.poolCount === 'count', 15_000, COUNT), 'the count');
  await page.evaluate(() => { window.__ctTest.store.period.value = '2041-2070'; });
  assert.ok(await until(page, (sel) => /2041–2070/.test(document.querySelector(sel)?.textContent ?? ''), 8000, COUNT), `the period named (it says "${await words(page, COUNT)}")`);
  assert.doesNotMatch(await words(page, COUNT), /today/, 'not "today"');
});

// Fix round 1 (b1br-5 / b1bc-6): Swap ranks its alternatives on the same open holes as Suggest, so both
// alternatives() calls (in range and outside) get the page period's verdicts (store.poolVerdicts).
test('PP-B1 (b1b Swap counts holes as Suggest does): both of Swap\'s alternatives() calls get the pool verdicts @real-data', async () => {
  const page = await tool();
  await atSite(page, 'seville');
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Temperate'; });
  assert.ok(await has(page, '[data-place-suggest]', 15_000));
  await suggestReady(page);
  await page.click('[data-place-suggest]');
  assert.ok(await until(page, () => window.__ctTest.store.members.value.length > 0 && !!window.__ctTest.store.poolVerdicts.value), 'a suggestion, with the verdicts in');
  await page.evaluate(() => {
    const { store } = window.__ctTest, algo = store.suggestRule.value;
    window.__alts = [];
    store.suggestRule.value = { ...algo, alternatives: (...a) => { window.__alts.push(a[3]); return algo.alternatives(...a); } };
    store.openSheet('swap', store.members.value[0]);
  });
  assert.ok(await has(page, 'dialog.ct-swap[open] .ct-rows li', 10_000), 'Swap lists alternatives');
  const calls = await page.evaluate(() => window.__alts.slice(-2).map((o) => ({ same: o.verdicts === window.__ctTest.store.poolVerdicts.value, has: !!o.verdicts })));
  assert.equal(calls.length, 2, 'Swap asked for both groups (Seville under Temperate has plants outside)');
  assert.deepEqual(calls, [{ same: true, has: true }, { same: true, has: true }], 'each call passes store.poolVerdicts');
});

// Fix round 1 (b1br-1 / b1bc-11): "0 of m" never renders. A later period with no climate figures for
// the place leaves every plant "not checked": the line says so instead of counting none. (The lookup
// keeps only an SSP5-8.5 slot: a plant is judged on the years it stands in, today or 2041–2070 for a
// shorter-lived one, so the page's SSP2-4.5 must have no slot for any period.)
test('PP-B1 (b1b count line, nothing checked for a later period): never "0 of m"; it says the plants could not be checked @real-data', async () => {
  const page = await tool();
  const lookup = await atSite(page, 'seville');
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Mediterranean'; });
  assert.ok(await countIs(page, plural('place.count.own', 198, { total: 200, list: W('list.mediterranean') })), 'today\'s count first');
  await page.evaluate((lk) => {
    const { store } = window.__ctTest;
    store.location.value = { ...store.location.value, lookup: { ...lk, climate: { ...lk.climate, periods: lk.climate.periods.filter((p) => p.period === '2071-2099' && p.scenario === 'ssp585') } } };
    store.period.value = '2071-2099';
  }, lookup);
  assert.ok(await until(page, (sel) => document.querySelector(sel)?.dataset.poolCount === 'unchecked', 15_000, COUNT), `the not-checked state (${await countState(page)}: "${await words(page, COUNT)}")`);
  const text = await words(page, COUNT);
  assert.doesNotMatch(text ?? '', /^0 /, 'never "0 of m"');
  assert.equal(text, plural('place.count.uncheckedOwn', 200, { total: 200, list: W('list.mediterranean') }), 'the list named, no period blamed (a missing range is a cause too)');
});

// Fix round 1 (b1bc-10, inform, don't block): one sentence under the count says the plants left out
// can still be found and added, with a warning.
test('PP-B1 (b1b count line, the plants left out): a sentence under the count says they can still be found and added, with a warning @real-data', async () => {
  const page = await tool();
  await atSite(page, 'seville');
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Mediterranean'; });
  assert.ok(await until(page, (sel) => document.querySelector(sel)?.dataset.poolCount === 'count', 15_000, COUNT), 'the count');
  assert.equal(await words(page, '[data-pool-left]'), W('place.count.left'));
});

// Fix round 1 (b1br-3 / b1br-4): a verdict chunk that never answers ends the waiting Suggest with the
// stalled chunk's Reload (Retry could not work: the import is still pending), and that toast goes
// if the chunk comes after all.
test('PP-B1 (b1b Suggest and a stalled verdict chunk): after the wait, a toast with Reload, not Retry; it goes when the chunk comes', async () => {
  const page = await tool({ block: { verdict: 'hold' }, timeouts: { suggest: 1500 } });
  await atSite(page, 'seville');
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Mediterranean'; });
  assert.ok(await has(page, '[data-place-suggest]', 15_000));
  await suggestReady(page);
  await page.click('[data-place-suggest]');
  assert.ok(await until(page, () => !!window.__ctTest.store.toast.value, 8000), 'a toast once the wait is up');
  const toast = await page.evaluate(() => { const t = window.__ctTest.store.toast.value; return { text: t.text, label: t.action?.label ?? null }; });
  assert.deepEqual(toast, { text: W('details.loadFailed'), label: W('details.reload') }, 'the stalled chunk\'s Reload');
  assert.equal(await members(page), 0, 'nothing placed');
  await page.releaseHeld();
  assert.ok(await until(page, () => !!window.__ctTest.store.verdictRule.value, 10_000), 'the chunk comes');
  assert.ok(await until(page, () => !window.__ctTest.store.toast.value, 5000), 'its toast goes');
  assert.equal(await members(page), 0, 'and the ended wait runs no suggestion');
});

// Fix round 2 (b1bf-8, b1bc-8a): back online, a verdict chunk refused meanwhile is asked for again by
// the store's one 'online' listener (store.ts start()), with no view of its own mounted: no climate is
// chosen, so Place has no count line, and the palette page is not open.
test('PP-B1 (b1b back online): with the verdict chunk refused, an "online" event starts a new load of it', async () => {
  const page = await tool({ block: { verdict: 404 } });
  const asked = [];
  page.on('request', (r) => { if (/\/_astro\/verdict\./.test(r.url())) asked.push(r.url()); });
  await atSite(page, 'seville');
  assert.ok(await until(page, () => window.__ctTest.store.verdictFailed.value, 15_000), 'the verdict chunk refused');
  assert.equal(await page.$('[data-pool-count], .ct-palette-page'), null, 'no count line or palette page mounted');
  const before = asked.length;
  await page.evaluate(() => dispatchEvent(new Event('online')));
  const deadline = Date.now() + 5000;
  while (asked.length === before && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
  assert.ok(asked.length > before, `a new load of the verdict chunk after "online" (${asked.length - before} requests)`);
});

// Fix round 3 (b1bg-1): "failed" always means the current load failed. After a refused load (a return
// visit's fetchAhead offline, say), the next one (start()'s effect once a site climate arrives) clears
// it as it starts, so the count line (which reads the flag) says "Checking…" meanwhile, not "Could not check".
test('PP-B1 (b1b a new verdict load after a refused one): verdictFailed clears as the load starts', async () => {
  const page = await tool({ block: { verdict: 404 } });
  await atSite(page, 'seville');
  assert.ok(await until(page, () => window.__ctTest.store.verdictFailed.value, 15_000), 'the first load refused');
  const during = await page.evaluate(() => { const { store } = window.__ctTest; store.wantVerdict(); return store.verdictFailed.value; });
  assert.equal(during, false, 'a load in flight is not "failed"');
});
