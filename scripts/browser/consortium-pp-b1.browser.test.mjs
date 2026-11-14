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
// Run capped: npm run test:browser (scripts/browser/run.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { aria, en, h, has, realDb, suggestReady, useHarness } from './helpers.mjs';
import { atSite, choose, tool } from './p5-helpers.mjs';
import { openCards } from './location-fixtures.mjs';
import { liveLog, saidTwice, watchLiveRegions } from './f1a-helpers.mjs';
import { failing } from '../expect-fail.mjs';
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

failing('PP-B5 (b1a shade answer; needs b2\'s verdict rule, owner b2 at the merge): a "shade" answer moves a sun-only plant to "needs a second look", and it stays after reload', { owner: 'b1a', reason: /no verdict for the sun-only plant|no "needs a second look" verdict/ }, async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  const sunOnly = await page.evaluate(() => window.__ctTest.store.pool.value.find((t) => t.traits.light?.length === 1 && t.traits.light[0] === 'full')?.id ?? window.__ctTest.store.pool.value[0].id);
  await page.evaluate((id) => { const s = window.__ctTest.store; s.addMembers([id]); s.spot.value = { ...s.spot.value, light: 'shade' }; }, sunOnly);
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
  await choose(page, 'Temperate');
  await suggestReady(page);
  await page.evaluate(() => { const s = window.__ctTest.store; s.suggestMembers(); s.view.value = 'matrix'; });
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
