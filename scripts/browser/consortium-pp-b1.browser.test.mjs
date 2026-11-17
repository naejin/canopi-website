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
// - each arrival line as [data-place-notice="newer" | "unreadable" | "period" |
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
import { openCards } from './location-fixtures.mjs';
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

// A palette made on Temperate (the store's own suggestion), shown on the palette page.
async function temperatePalette(page) {
  await choose(page, 'Temperate');
  await suggestReady(page);
  await page.evaluate(() => { const s = window.__ctTest.store; s.suggestMembers(); s.view.value = 'matrix'; });
  assert.ok(await has(page, aria('button', W('place.sheet.open')), 8000), 'no "Change your place" on the palette');
}
// "Add a plant by name" on Place, as a grower does: the name given and added; the page has k plants
// then, and stays on Place. The button opens Find (store.openFind): the name searched, its row's Add,
// then Done.
async function addByName(page, name, k) {
  assert.ok(await has(page, '[data-place-add]', 8000), `plant ${k}: "Add a plant by name" on Place`);
  await page.click('[data-place-add]');
  assert.equal(await until(page, () => window.__ctTest.store.sheet.value?.kind === 'find', 10_000), true, 'Find opens');
  assert.ok(await has(page, 'dialog.ct-find[open] [data-find-search]', 10_000), 'Find\'s search, to add plants by name');
  await page.locator('dialog.ct-find[open] [data-find-search]').fill(name);
  const found = await page.waitForFunction((n) => [...document.querySelectorAll('dialog.ct-find[open] [data-find-row]')].find((r) => r.querySelector('.ct-sci')?.textContent.trim() === n)?.querySelector('[data-find-add]'), { timeout: 8000 }, name).catch(() => null);
  assert.ok(found, `plant ${k}: ${name} found`);
  await found.click();
  assert.ok(await until(page, (n) => window.__ctTest.store.members.value.length === n, 8000, k), `plant ${k} added`);
  await page.locator(`dialog.ct-find[open] ${aria('button', 'Done')}`).click();
  assert.equal(await page.evaluate(() => window.__ctTest.store.view.value), 'start', `plant ${k}: adding a plant left Place`);
}
const openPlaceSheet = async (page) => {
  await page.locator(aria('button', W('place.sheet.open'))).click();
  assert.ok(await has(page, 'dialog[open].ct-sheet #ct-place-sheet-h', 4000), 'the "Your place" sheet opens');
};

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
  assert.ok(await until(page, (b) => window.__ctTest?.store?.members.value.slice().sort().join() === b && window.__ctTest.store.climate.value === 'Mediterranean', 30_000, before), 'a reload lost a plant');
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
  assert.ok(await until(page, () => window.__ctTest?.store?.members.value.length === 4, 30_000), 'the reload opens the link');
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => history.back());
  assert.ok(await until(page, (p) => location.hash === p, 8000, P), 'the entry before the link was rewritten with the link');
  assert.ok(await until(page, (k) => window.__ctTest?.store?.members.value.length === k, 30_000, n), 'the palette before the link reopens');
});

// Owner 2026-11-15: plants added on Place are saved on the device at once, so a reload keeps them.
test('PP-B2 (b1a owner 2026-11-15, Place adds saved): a plant added on Place stays after a reload on Place', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  await addByName(page, await temperateName(3), 1);
  assert.ok(await until(page, () => localStorage.getItem('canopi-consortium') !== null, 4000), 'the plant added on Place is not saved on the device');
  await page.reload();
  assert.ok(await until(page, () => window.__ctTest?.store?.members.value.length === 1, 30_000), 'a reload on Place lost the plant');
});

test('PP-B2 (b1a UI hand-off, failed-chunk notice): a sheet whose chunk fails says so with Reload where it covers nothing, at 390, 960 and 1280 px', async () => {
  for (const width of [390, 960, 1280]) {
    const page = await tool({ width, data: 'fixture', block: { find: 404 } }); // Paste is in the find role (PP-C commit 0)
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

test('PP-B14 (b1a guide link): ?plant=…&climate=… opens on /palette/ with the plant as a member (the old /consortium/ address is not forwarded: owner 2026-11-17)', async () => {
  const name = await temperateName(5);
  for (const path of ['/palette/']) {
    const page = await h.open(`${path}?plant=${encodeURIComponent(name)}&climate=temperate`, { hook: true });
    assert.ok(await until(page, () => window.__ctTest?.store?.members.value.length === 1, 20_000), `${path}: the guide's plant is a member`);
    assert.equal(new URL(page.url()).pathname, '/palette/', `${path}: on /palette/`);
    assert.equal(await page.evaluate((n) => window.__ctTest.store.memberTaxa.value[0]?.canonical_name === n, name), true);
  }
});

// ---- b1b: the pool count in Place (plant-palette-slices section 2, row b1b; drift check 2026-11-15) ----

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

// A page at Seville on the Mediterranean list, its "Start from a small suggested palette" ready.
async function sevilleSuggestReady(options) {
  const page = await tool(options);
  await atSite(page, 'seville');
  await page.evaluate(() => { window.__ctTest.store.climate.value = 'Mediterranean'; });
  assert.ok(await has(page, '[data-place-suggest]', 15_000));
  await suggestReady(page);
  return page;
}

test('PP-B1 (b1b Suggest and a refused verdict chunk): a waiting Suggest ends with one toast, places nothing and is no longer busy; without a location Suggest never waits for it', async () => {
  const page = await sevilleSuggestReady({ block: { verdict: 404 } });
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

// Fix round 1 (b1br-3 / b1br-4): a verdict chunk that never answers ends the waiting Suggest with the
// stalled chunk's Reload (Retry could not work: the import is still pending), and that toast goes
// if the chunk comes after all.
test('PP-B1 (b1b Suggest and a stalled verdict chunk): after the wait, a toast with Reload, not Retry; it goes when the chunk comes', async () => {
  const page = await sevilleSuggestReady({ block: { verdict: 'hold' }, timeouts: { suggest: 1500 } });
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

// Pre-push fix 5: a reload of a page that owned its save, after another tab saved a different palette,
// never writes over it: the page opens held, and "Open my saved palette instead" offers the stored one.
test('PP-B71 (b1a reload after another tab saved): the reload leaves the other tab\'s save as it is and offers "Open my saved palette instead"', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  const ids = await temperateIds();
  await page.evaluate((x) => window.__ctTest.store.addMembers(x), ids.slice(0, 5));
  assert.ok(await until(page, () => !!localStorage.getItem('canopi-consortium'), 8000), 'the page owns and writes its save');
  const other = JSON.stringify({ fragment: await v5(2), place: '', at: '2026-11-16T10:00:00.000Z', src: null });
  await page.evaluate((x) => localStorage.setItem('canopi-consortium', x), other);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.ok(await page.waitForFunction(() => window.__ctTest?.store?.members.value.length === 5, { timeout: 20_000 }).then(() => true, () => false), 'the reload restores the page\'s own palette');
  assert.ok(await has(page, '[data-open-saved]', 8000), '"Open my saved palette instead" names the stored palette');
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(await page.evaluate(() => localStorage.getItem('canopi-consortium')), other, 'the other tab\'s save is left as it is');
});
