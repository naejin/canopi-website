// PP-C stream c1, Find (plant-palette-slices section 3.4, c1 browser rows): one browser test per user
// scenario and failure state, written failing in PP-C commit 0 and unmarked by c1 as Find made each
// pass. The F1a filter cases (F1a-F1..F5, from 648baf2:scripts/browser/consortium-f1a-filters.browser.test.mjs)
// and C6's Find half are restored here (scripts/plan/parked-markers.json), retitled "F1a-Xn → PP-C (c1 …"
// and rewritten against Find.
//
// The contract (no layout or wording pinned beyond what the slices row names):
// - Find is one sheet, dialog.ct-find, opened by store.openFind(target?: SheetFor) from every entry;
//   its search field is [data-find-search] (type search); its rows are [data-find-row] with
//   data-plant-id, inside [data-find-group="fits|look|outside|unchecked"]; a row's add button is
//   [data-find-add] (data-added once added); why a row matched is [data-find-why] (data-lang for a
//   name in another language, data-kind="synonym" for a synonym);
// - a filter is [data-filter="<id>"] (fits, range, holds, life-cycle, edible, ...), its state
//   aria-pressed or :checked; [data-filter-unknown="<id>"] data-count is the number it cannot judge;
// - no result: [data-find-none] with the close spellings [data-find-close], the other climates' lists
//   that hold the query [data-find-other] (a button per list) and a link a[data-find-ask]
//   to the contact form carrying the query; "Select several" is [data-find-select], which gives each
//   row a checkbox and shows [data-find-bar] with "Add N plants" (its .button-primary);
// - the names file: [data-find-names="loading|failed"] while it is not used; Find's one polite live
//   region is [data-find-status] (aria-live="polite");
// - the entries: [data-find-entry="head|bar|empty"] (Sheets.tsx FindEntry, mounted by commit 0); the
//   phone bottom bar is [data-find-entry="bar"]'s container .ct-bar.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aria, en, has, useHarness } from './helpers.mjs';
import { atSite, choose, temperateLink, tool } from './p5-helpers.mjs';
import { suggestedAt } from './f1a-helpers.mjs';

useHarness();

const FIND = 'dialog.ct-find[open]';
const hasFind = async (page, timeout = 4000) => assert.ok(await has(page, FIND, timeout), 'no Find sheet (dialog.ct-find)');
const on = (page, id) => page.$eval(`${FIND} [data-filter="${id}"]`, (e) => e.getAttribute('aria-pressed') === 'true' || e.checked === true).catch(() => null);
// The rows of every group shown whole (B2's "Show all N" is display only, never a filter).
const rowIds = async (page) => { await expandAll(page); return page.$$eval(`${FIND} [data-find-row]`, (els) => els.map((e) => e.dataset.plantId).filter(Boolean).sort()); };
const toggle = async (page, id) => {
  const before = await rowIds(page);
  await page.click(`${FIND} [data-filter="${id}"]`);
  await page.waitForFunction((sel, n) => document.querySelectorAll(sel).length !== n, { timeout: 4000 }, `${FIND} [data-find-row]`, before.length).catch(() => {});
  return before;
};
const search = async (page, q) => {
  await page.locator(`${FIND} [data-find-search]`).fill(q);
  await page.waitForFunction((sel) => document.querySelector(sel), { timeout: 4000 }, `${FIND} [data-find-row], ${FIND} [data-find-none]`).catch(() => {});
};
// Node-side wait for a condition on values the test collects (request logs).
const waitFor = async (ok, ms) => { for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 50))) if (ok()) return true; return ok(); };
const openFind = async (page, target) => page.evaluate((t) => window.__ctTest.openFind(t ?? undefined), target ?? null);
// Every "Show all N" of Find pressed, so each group lists all its plants (fix round 1, B2).
const expandAll = async (page) => { for (let i = 0; i < 8 && await page.$(`${FIND} [data-find-showall]`); i++) await page.click(`${FIND} [data-find-showall]`); };
// Find opened from the Next step's hole ("See all N plants"), as a grower opens it.
async function findFromHole(page) {
  assert.ok(await has(page, '.ct-next-actions .button', 10_000), 'the Next step names a hole');
  await page.click('.ct-next-actions .button');
  await hasFind(page);
}

// ---- F1a filters restored (P5.1) ----

test('F1a-F1 → PP-C (c1 Lyon food forest, P5.1): Find opened from a hole has "Fits your place" on', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await findFromHole(page);
  assert.equal(await on(page, 'fits'), true, '"Fits your place" is on from a hole');
});

test('F1a-F2 → PP-C (c1 Seville dry garden, P5.1 A14): "Holds up in the future climate" changes the plants offered', async () => {
  const page = await suggestedAt('seville', 'Mediterranean');
  await openFind(page);
  await hasFind(page);
  const before = await toggle(page, 'holds');
  assert.notDeepEqual(await rowIds(page), before, '"Holds up" changes the pick at Seville');
});

test('F1a-F3 → PP-C (c1 Nairobi smallholding, P5.1 A14): "Has edible parts" (edibility_rating) and a life cycle narrow the plants offered', async () => {
  const page = await suggestedAt('nairobi', 'Subtropical');
  await openFind(page);
  await hasFind(page);
  const all = await toggle(page, 'edible');
  const edible = await rowIds(page);
  assert.ok(edible.length && edible.length < all.length, `"Has edible parts" narrows the list (${edible.length} of ${all.length})`);
  await toggle(page, 'life-cycle');
  const both = await rowIds(page);
  assert.ok(both.length <= edible.length && both.every((id) => edible.includes(id)), 'a life cycle narrows it further');
});

test('F1a-F4 → PP-C (c1 unknowns as counts, P5.1): a filter that cannot judge some plants says how many, never hides them silently', async () => {
  const page = await suggestedAt('seville', 'Mediterranean');
  await openFind(page);
  await hasFind(page);
  await toggle(page, 'edible');
  const n = await page.$eval(`${FIND} [data-filter-unknown="edible"]`, (e) => (e.dataset.count === undefined ? null : Number(e.dataset.count))).catch(() => null);
  assert.ok(Number.isInteger(n) && n >= 0, 'the unknowns are counted');
  // Fix round 1, A3 (review c1-04): a hide filter says how many it hid, beside "not recorded, still shown".
  if (await page.$(`${FIND} [data-find-outside]`)) await page.click(`${FIND} [data-find-outside]`); // every row shown
  const shown = (await rowIds(page)).length;
  await toggle(page, 'toxic');
  const hid = await page.$eval(`${FIND} [data-filter-hidden="toxic"]`, (e) => Number(e.dataset.count)).catch(() => null);
  assert.ok(Number.isInteger(hid), '"N hidden as toxic" is said');
  assert.equal((await rowIds(page)).length, shown - hid, 'it counts exactly the plants it hid');
  assert.ok(await page.$(`${FIND} [data-filter-unknown="toxic"]`), 'beside "N not recorded, still shown"');
});

test('F1a-F5 → PP-C (c1 no location, P5.1): without a location the range and holds filters are not offered, the others are', async () => {
  const page = await suggestedAt(null, 'Temperate');
  await openFind(page);
  await hasFind(page);
  assert.equal(await page.$(`${FIND} [data-filter="range"]`), null, 'no range filter without a location');
  assert.equal(await page.$(`${FIND} [data-filter="holds"]`), null, 'no holds filter without a location');
  assert.notEqual(await page.$(`${FIND} [data-filter="fits"]`), null, '"Fits your place" is still offered');
});

test('F1a-C6 → PP-C (c1 verdict chunk refused, Find half, A16 §5): with the verdict chunk refused, Find\'s plants say "not checked", never a fit', async () => {
  const page = await tool({ block: { verdict: 404 } });
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  await openFind(page);
  await hasFind(page);
  assert.ok(await has(page, `${FIND} [data-find-group="unchecked"] [data-find-row]`, 8000), 'the plants are under "Not checked"');
  assert.equal(await page.$(`${FIND} [data-find-group="fits"] [data-find-row]`), null, 'none under "Fits your place"');
  // Fix round 1, A4 (review c1-05): the range and holds filters need the verdict rule; refused, they
  // are not offered (never "N not recorded, not shown" blamed on the plants' data).
  await page.click(`${FIND} .ct-find-filters-btn`).catch(() => {});
  assert.equal(await page.$(`${FIND} [data-filter="range"]`), null, 'no range filter while the verdict rule is refused');
  assert.equal(await page.$(`${FIND} [data-filter="holds"]`), null, 'no holds filter while the verdict rule is refused');
});

// ---- scenarios ----

test('PP-C1 (c1 names file): "Gombo" (French, names file only) on the English page finds okra, labelled French; Lycopersicon esculentum finds the tomato as a synonym', async () => {
  const page = await tool({ data: 'fixture' });
  await choose(page, 'Tropical');
  await openFind(page);
  await hasFind(page);
  await search(page, 'Gombo');
  const okra = await page.$eval(`${FIND} [data-find-row]`, (r) => ({ text: r.textContent, lang: r.querySelector('[data-find-why]')?.dataset.lang ?? null })).catch(() => null);
  assert.match(okra?.text ?? '', /Abelmoschus esculentus/, 'okra found');
  assert.equal(okra.lang, 'fr', 'labelled as a French name');
  await search(page, 'Lycopersicon esculentum');
  const tomato = await page.$eval(`${FIND} [data-find-row]`, (r) => ({ text: r.textContent, kind: r.querySelector('[data-find-why]')?.dataset.kind ?? null })).catch(() => null);
  assert.match(tomato?.text ?? '', /Solanum lycopersicum/, 'the tomato found');
  assert.equal(tomato.kind, 'synonym');
});

test('PP-C2 (c1 no result): a query with no plant offers close spellings, the other lists and "Ask us to add it", a link to the contact form with the query', async () => {
  const page = await tool({ data: 'fixture' });
  await choose(page, 'Temperate');
  await openFind(page);
  await hasFind(page);
  await search(page, 'Castanea sativx');
  assert.ok(await has(page, `${FIND} [data-find-none]`, 4000), 'the no-result state');
  assert.ok(await has(page, `${FIND} [data-find-close]`, 2000), 'close spellings');
  // A plant only another climate's list holds (the fixture's okra: Tropical only) offers that list.
  await search(page, 'Abelmoschus esculentus');
  assert.ok(await has(page, `${FIND} [data-find-other]`, 4000), 'the other lists');
  // Fix round 1, A1: the release holds it, so no "No plant answers" and no "Ask us to add".
  assert.equal(await page.$(`${FIND} [data-find-none]`), null, 'a plant of another list is no "No plant answers"');
  assert.equal(await page.$(`${FIND} a[data-find-ask]`), null, 'no "Ask us to add" for a plant the release holds');
  assert.match(await page.$eval(`${FIND} [data-find-other]`, (e) => e.textContent).catch(() => ''), /Tropical/, 'the other list named');
  await search(page, 'Zzyzx plantus');
  const ask = await page.$eval(`${FIND} a[data-find-ask]`, (a) => a.getAttribute('href')).catch(() => null);
  assert.match(ask ?? '', /contact/, 'a link to the contact form');
  assert.match(decodeURIComponent(ask ?? ''), /Zzyzx plantus/, 'carrying the query');
});

test('PP-C3 (c1 Select several): three plants ticked are added with one toast and one Undo', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const before = await page.evaluate(() => window.__ctTest.store.members.value.length);
  await openFind(page);
  await hasFind(page);
  await page.click(`${FIND} [data-find-select]`);
  const boxes = await page.$$(`${FIND} [data-find-row] input[type="checkbox"]`);
  assert.ok(boxes.length >= 3, 'three plants to tick');
  for (const b of boxes.slice(0, 3)) await b.click();
  await page.locator(aria('button', 'Add 3 plants')).click();
  assert.ok(await page.waitForFunction((n) => window.__ctTest.store.members.value.length === n + 3, { timeout: 4000 }, before).then(() => true, () => false), 'three added');
  assert.equal(await page.$$eval('.ct-toast', (t) => t.length), 1, 'one toast');
  await page.click(aria('button', en['consortium.undo']));
  assert.ok(await page.waitForFunction((n) => window.__ctTest.store.members.value.length === n, { timeout: 4000 }, before).then(() => true, () => false), 'one Undo removes the three');
});

test('PP-C4 (c1 inform, don\'t block): an invasive plant and a plant outside its range are each added with one tap, the warning in words, no confirm step', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.evaluate(() => { window.__ctTest.store.country.value = { code: 'FR', source: 'chosen' }; });
  await openFind(page);
  await hasFind(page);
  await search(page, 'Robinia pseudoacacia');
  const row = `${FIND} [data-find-row]`;
  assert.match(await page.$eval(row, (r) => r.textContent).catch(() => ''), /invasive/i, 'the invasive warning in words');
  await page.click(`${row} [data-find-add]`);
  assert.equal(await page.$('dialog[role="alertdialog"]'), null, 'nothing asks');
  assert.ok(await page.$(`${row} [data-find-add][data-added]`), 'added in one tap');
  // The whole list (c1: Robinia's query holds no plant outside its range).
  await page.$eval(`${FIND} [data-find-search]`, (i) => { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); }); // as the field's clear button
  await page.click(`${FIND} [data-find-outside]`); // plain Find folds them too (fix round 1, B3)
  assert.ok(await has(page, `${FIND} [data-find-group="outside"] [data-find-row]`, 4000), 'a group outside its range');
  await page.click(`${FIND} [data-find-group="outside"] [data-find-row] [data-find-add]`);
  assert.equal(await page.$('dialog[role="alertdialog"]'), null, 'nothing asks for an outside plant either');
});

// BT-6's Add half (consortium-s3, cut with the Add sheet in PP-C commit 0; review c0 1.6): Juglans
// next to Malus is a high conflict (genus allelopathic harm, the fixture's interaction row), said on
// its row, and one tap adds it with Undo (inform, don't block; owner 2026-11-14).
test('PP-C20 (c1 BT-6 restored, inform, don\'t block): a high conflict adds in one tap with the reason on the row', async () => {
  const page = await tool({ data: 'fixture', hook: true });
  await choose(page, 'Temperate');
  await page.locator('[data-place-suggest]').click();
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'Suggest placed plants');
  await page.evaluate(() => {
    const { store } = window.__ctTest;
    const id = (n) => store.pools.value.Temperate.find((t) => t.canonical_name === n).id;
    store.members.value = [...store.members.value.filter((x) => x !== id('Juglans regia')), ...(store.members.value.includes(id('Malus domestica')) ? [] : [id('Malus domestica')])];
  });
  await openFind(page);
  await hasFind(page);
  await search(page, 'Juglans regia');
  const row = `${FIND} [data-find-row]`;
  assert.ok(await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].some((r) => /Juglans regia/.test(r.textContent) && /hold back|serious/i.test(r.textContent)), { timeout: 4000 }, row).then(() => true, () => false), 'the row names the conflict');
  await page.click(`${row} [data-find-add]`);
  assert.equal(await page.$('dialog[role="alertdialog"]'), null, 'a high conflict does not ask');
  assert.ok(await page.waitForFunction(() => { const { store } = window.__ctTest; return store.members.value.includes(store.pools.value.Temperate.find((t) => t.canonical_name === 'Juglans regia').id); }, { timeout: 4000 }).then(() => true, () => false), 'Juglans is added in one tap');
  assert.ok(await has(page, `${FIND} ${aria('button', en['consortium.undo'])}`, 2000), 'with Undo');
});

test('PP-C7 (c1 FillHole): a hole opens Find titled by the hole, best fit first; "+ Add" turns to "Added", a result line with Undo, "Show N outside their climate range", Done; on a dry, shady spot each hole lists what "See all N" counts, the site misfits under "look", never hidden', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  assert.ok(await has(page, '.ct-next-hole', 10_000), 'the Next step names a hole');
  const words = await page.$eval('.ct-next-hole', (e) => e.textContent.trim()).catch(() => null);
  const label = await page.$eval('.ct-next-actions .button', (e) => e.textContent.trim()).catch(() => '');
  await findFromHole(page);
  assert.equal(await page.$eval(`${FIND} h2`, (e) => e.textContent.trim()), words, 'titled by the hole in words');
  // Best fit first: the groups in the order fits, look, outside (unchecked last).
  const groups = await page.$$eval(`${FIND} [data-find-group]`, (els) => els.map((e) => e.dataset.findGroup));
  const ORDER = ['fits', 'look', 'outside', 'unchecked'];
  assert.deepEqual(groups, [...groups].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)), `best fit first (${groups.join(', ')})`);
  // Folded from PP-B34 (review c0 4.4): Find lists exactly the plants "See all N" counts once the
  // outside ones are shown, the site misfits flagged under "look", never hidden.
  const n = Number(/\d+/.exec(label)?.[0] ?? 1); // "See the plant": one
  const showOutside = await page.evaluateHandle((sel) => [...document.querySelectorAll(`${sel} button`)].find((b) => /outside/i.test(b.textContent)) ?? null, FIND);
  const folded = await showOutside.evaluate((b) => (b ? Number(/\d+/.exec(b.textContent)?.[0] ?? NaN) : 0));
  if (folded) await showOutside.click();
  assert.equal((await rowIds(page)).length, n, `"${label}" counts the plants Find lists`);
  // "Show N outside their climate range" (c1: the hole's fillers outside their range, folded behind
  // it; at Lyon's first hole there may be none, so it is checked against the rows it unfolds):
  // shown exactly when some are outside, N of them.
  assert.equal(folded, await page.$$eval(`${FIND} [data-find-group="outside"] [data-find-row]`, (els) => els.length), '"Show N outside their climate range" folds exactly the plants outside');
  const first = `${FIND} [data-find-group="fits"] [data-find-row]:first-of-type`;
  await page.click(`${first} [data-find-add]`);
  assert.ok(await page.$(`${first} [data-find-add][data-added]`), '"+ Add" turns to "Added"');
  assert.ok(await has(page, `${FIND} ${aria('button', en['consortium.undo'])}`, 2000), 'a result line with Undo');
  await page.click(`${FIND} ${aria('button', 'Done')}`);
  assert.equal(await page.$('dialog[open]'), null, 'Done closes Find');
  // PP-B34's dry, shady spot (review c0 round 2, 5a): for up to 6 holes, Find lists exactly what "See
  // all N" counts once the outside ones are shown, and every site misfit (verdict level 'look') sits
  // in [data-find-group="look"], listed, never hidden.
  await page.evaluate(() => { const { store } = window.__ctTest; store.spot.value = { ...store.spot.value, light: 'shade', water: 'dry' }; store.hideToast(); });
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value && document.querySelector('.ct-next')?.dataset.hole, { timeout: 10_000 });
  for (let i = 0; i < 6 && await page.$('.ct-next-actions .button'); i++) {
    const hole = await page.$eval('.ct-next-hole', (e) => e.textContent.trim());
    const count = Number(/\d+/.exec(await page.$eval('.ct-next-actions .button', (e) => e.textContent.trim()))?.[0] ?? 1); // "See the plant": one
    await findFromHole(page);
    const more = await page.evaluateHandle((sel) => [...document.querySelectorAll(`${sel} button`)].find((x) => /outside/i.test(x.textContent)) ?? null, FIND);
    const hidden = await more.evaluate((x) => (x ? Number(/\d+/.exec(x.textContent)?.[0] ?? NaN) : 0));
    if (hidden) await more.click();
    assert.equal((await rowIds(page)).length, count, `${hole}: Find lists what "See all ${count}" counts`);
    assert.equal(hidden, await page.$$eval(`${FIND} [data-find-group="outside"] [data-find-row]`, (els) => els.length), `${hole}: "Show N outside" folds exactly the plants outside`);
    const misplaced = await page.$$eval(`${FIND} [data-find-row]`, (els) => {
      const v = window.__ctTest.store.poolVerdicts.value;
      return els.filter((e) => v.get(e.dataset.plantId)?.level === 'look' && !e.closest('[data-find-group="look"]')).map((e) => e.dataset.plantId);
    });
    assert.deepEqual(misplaced, [], `${hole}: every site misfit sits under "look"`);
    await page.evaluate(() => window.__ctTest.store.closeSheet());
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
    await page.click(`.ct-next-actions ${aria('button', en['consortium.palette.notNow'])}`);
  }
});

// Fix round 1, A9 (plan check c1-3): a hole with known outside fillers, opened as the Next step opens
// one (store.openFind with the hole and its test): "Show N outside their climate range" is there and
// folds exactly those N, unconditionally. The hole: the light level whose plants at Lyon have the most
// outside their range.
test('PP-C7b (c1 FillHole, fix A9): a hole with outside fillers shows "Show N outside their climate range", folding exactly those N', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  const n = await page.evaluate(() => {
    const { store } = window.__ctTest, v = store.poolVerdicts.value, m = new Set(store.members.value);
    const offer = store.offerPool.value.filter((t) => !m.has(t.id));
    const out = (s) => offer.filter((t) => t.stratum?.value === s && v.get(t.id)?.level === 'outside').length;
    const s = ['emergent', 'high', 'medium', 'low'].sort((a, b) => out(b) - out(a))[0];
    window.__hole = { id: `light:${s}:0-60`, kind: 'light', stratum: s, rank: 2, fromYear: 0, toYear: 60, state: 'open' };
    window.__ctTest.openFind({ hole: window.__hole, fits: (t) => t.stratum?.value === s, job: null });
    return out(s);
  });
  assert.ok(n > 0, 'the fixture hole has plants outside their range');
  await hasFind(page);
  const btn = `${FIND} [data-find-outside]`;
  assert.ok(await has(page, btn, 4000), '"Show N outside their climate range" is there');
  assert.equal(await page.$eval(btn, (b) => Number(/\d+/.exec(b.textContent)?.[0])), n, `it says ${n}`);
  assert.equal(await page.$(`${FIND} [data-find-group="outside"]`), null, 'folded until pressed');
  await page.click(btn);
  await expandAll(page);
  assert.equal(await page.$$eval(`${FIND} [data-find-group="outside"] [data-find-row]`, (els) => els.length), n, 'it folds exactly those plants');
});

test('PP-C8 (c1 entries): "Add plants" right of the title at 1280 and in the phone bottom bar at 390, the toast above the bar, the bar hidden while a sheet is open; the empty palette\'s first row "Find plants"', async () => {
  const wide = await suggestedAt('lyon', 'Temperate');
  assert.ok(await has(wide, '[data-find-entry="head"]', 4000), 'no "Add plants" beside the title (data-find-entry="head")');
  await wide.click('[data-find-entry="head"]');
  await hasFind(wide);
  const phone = await suggestedAt('lyon', 'Temperate', { width: 390 });
  assert.ok(await has(phone, '.ct-bar [data-find-entry="bar"]', 4000), 'the phone bottom bar with "Add plants"');
  await phone.click('.ct-bar [data-find-entry="bar"]');
  await hasFind(phone);
  assert.equal(await phone.$eval('.ct-bar', (b) => getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().height > 0).catch(() => false), false, 'the bar hidden while a sheet is open');
  // The toast above the bar: a removal's Undo toast, its bottom at or above the bar's top.
  await phone.keyboard.press('Escape');
  await phone.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
  await phone.evaluate(() => { const { store } = window.__ctTest; store.removeMember(store.members.value[0]); });
  assert.ok(await has(phone, '.ct-toast-page .ct-toast', 4000), 'the removal\'s toast');
  const [toast, bar] = await phone.evaluate(() => ['.ct-toast-page .ct-toast', '.ct-bar'].map((s) => document.querySelector(s).getBoundingClientRect().toJSON()));
  assert.ok(toast.bottom <= bar.top + 0.5, `the toast above the bar (toast bottom ${Math.round(toast.bottom)}, bar top ${Math.round(bar.top)})`);
  // The empty palette (review c0-6: through the page, as PP-B36: every plant of a link taken out).
  const empty = await tool({ width: 390, hash: await temperateLink() });
  assert.ok(await empty.waitForFunction(() => window.__ctTest?.store?.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'the link\'s palette');
  await empty.evaluate(() => { const { store } = window.__ctTest; for (const id of store.members.value.slice()) store.removeMember(id); });
  assert.ok(await has(empty, '[data-find-entry="empty"]', 4000), 'the empty palette\'s first row "Find plants"');
});

// ---- the names file failing (4.1-4.6) ----

test('PP-C9 (c1 names file held, 4.1): search works on plant_names and canonical names with a "still loading" line; on arrival the results refresh keeping focus and text, with one polite announcement', async () => {
  const page = await tool({ names: 'hold' });
  await choose(page, 'Tropical');
  await openFind(page);
  await hasFind(page);
  assert.ok(await has(page, `${FIND} [data-find-names="loading"]`, 2000), 'a "still loading" line');
  await search(page, 'Abelmoschus');
  assert.ok(await has(page, `${FIND} [data-find-row]`, 4000), 'canonical names searched meanwhile');
  await search(page, 'Okra');
  assert.ok(await has(page, `${FIND} [data-find-row]`, 4000), 'plant_names (the core file\'s English name) searched meanwhile');
  // "Gombo" is in the names file only: nothing yet, then okra once the file arrives, with no retyping.
  await search(page, 'Gombo');
  assert.deepEqual(await rowIds(page), [], 'a names-file-only name finds nothing before the file');
  // c1: the open sheet's toast region (views/Toast.tsx, in every sheet's foot) is polite too; Find adds one.
  assert.equal(await page.$$eval(`${FIND} [aria-live="polite"]:not(.ct-toast-region *)`, (els) => els.length), 1, 'one polite live region of Find\'s own ([data-find-status])');
  await page.evaluate((sel) => {
    window.__said = [];
    const region = document.querySelector(sel);
    new MutationObserver(() => { const t = region.textContent.trim(); if (t && window.__said.at(-1) !== t) window.__said.push(t); }).observe(region, { subtree: true, childList: true, characterData: true });
  }, `${FIND} [data-find-status]`);
  await page.releaseHeld();
  assert.ok(await page.waitForFunction((sel) => !document.querySelector(sel), { timeout: 8000 }, `${FIND} [data-find-names]`).then(() => true, () => false), 'the names file arrived');
  assert.ok(await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].some((r) => /Abelmoschus esculentus/.test(r.textContent)), { timeout: 4000 }, `${FIND} [data-find-row]`).then(() => true, () => false), 'the results refresh: "Gombo" finds okra');
  assert.equal(await page.evaluate(() => document.activeElement?.matches('[data-find-search]')), true, 'the focus stays in the search');
  assert.equal(await page.$eval(`${FIND} [data-find-search]`, (i) => i.value), 'Gombo', 'the text stays');
  await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
  assert.equal((await page.evaluate(() => window.__said)).length, 1, 'one polite announcement on arrival');
});

test('PP-C10 (c1 names file 404 or offline, 4.2): one line, and the next focus retries (no cached failed promise)', async () => {
  for (const names of [404, 'offline']) {
    const page = await tool({ names });
    await choose(page, 'Tropical');
    await openFind(page);
    await hasFind(page);
    assert.ok(await has(page, `${FIND} [data-find-names="failed"]`, 4000), `${names}: one line`);
    const retried = page.waitForRequest((r) => /\/data\/consortium\/.*names/.test(r.url()), { timeout: 4000 }).then(() => true, () => false);
    await page.focus(`${FIND} [data-find-search]`);
    assert.ok(await retried, `${names}: the next focus retries`);
  }
  // Fix round 1, A7 (review c1-09): a stalled download is aborted (load.ts's stall, shortened by the
  // test build) and the next focus tries again, never "still loading" for the page's life.
  const page = await tool({ names: 'hold', timeouts: { stall: 600 } });
  await choose(page, 'Tropical');
  await openFind(page);
  await hasFind(page);
  assert.ok(await has(page, `${FIND} [data-find-names="failed"]`, 6000), 'stalled: aborted, one line');
  const retried = page.waitForRequest((r) => /\/data\/consortium\/.*names/.test(r.url()), { timeout: 4000 }).then(() => true, () => false);
  await page.focus(`${FIND} [data-find-search]`);
  assert.ok(await retried, 'stalled: the next focus retries');
});

test('PP-C11 (c1 names file digest mismatch, 4.3): the file is dropped, and not fetched again until a reload', async () => {
  const page = await tool({ names: 'digest' });
  await choose(page, 'Tropical');
  await openFind(page);
  await hasFind(page);
  assert.ok(await has(page, `${FIND} [data-find-names="failed"]`, 4000), 'dropped');
  let again = 0;
  page.on('request', (r) => { if (/names/.test(r.url())) again++; });
  // Focus and type, then wait as long as a retry would take (PP-C10's retry is asked for within 4 s).
  await page.focus(`${FIND} [data-find-search]`);
  await search(page, 'Gombo');
  await page.waitForRequest((r) => /names/.test(r.url()), { timeout: 4000 }).catch(() => {});
  assert.equal(again, 0, 'no retry until reload');
});

test('PP-C12 (c1 sheet closed mid-fetch, 4.5; Find from Place, 4.6): reopening uses the one module-level fetch; Find opened from Place before the palette shows starts it', async () => {
  const page = await tool({ names: 'hold' });
  const asked = [];
  page.on('request', (r) => { if (/names/.test(r.url())) asked.push(r.url()); });
  await choose(page, 'Tropical');
  await page.click('[data-place-add]');
  await hasFind(page);
  assert.ok(await waitFor(() => asked.length >= 1, 4000), 'Find opened from Place starts the fetch');
  await page.keyboard.press('Escape');
  await openFind(page);
  await hasFind(page);
  // As long as a second fetch would take to be asked for, then count (the first is still held).
  await page.waitForRequest((r) => /names/.test(r.url()) && asked.length >= 1, { timeout: 2000 }).catch(() => {});
  assert.equal(asked.length, 1, 'nothing refetched');
});

// Fix round 1, A8 (review c1-11): Paste reads the release-wide index and the release's plants, as Find
// does: opening it loads no other climate's list; a pool loads only when its plant is added.
test('PP-C c1 fix A8 (Paste, one index): Paste loads no other list on opening; a plant only another list holds is found and its list loads only on add', async () => {
  const page = await tool({ data: 'fixture' });
  await choose(page, 'Temperate');
  const pools = () => page.evaluate(() => Object.keys(window.__ctTest.store.pools.value).sort());
  const before = await pools();
  await page.evaluate(() => window.__ctTest.store.openSheet('paste'));
  assert.ok(await has(page, '#ct-paste-text', 4000), 'Paste opens');
  await page.locator('#ct-paste-text').fill('Abelmoschus esculentus');
  assert.ok(await page.waitForFunction(() => [...document.querySelectorAll('dialog[open] li')].some((li) => /Abelmoschus esculentus/.test(li.textContent)), { timeout: 4000 }).then(() => true, () => false), 'okra (Tropical only) is found');
  assert.deepEqual(await pools(), before, 'no other list loaded by opening Paste or reading the list');
  await page.click(`dialog[open] ${aria('button', en['consortium.addAnyway'])}`);
  assert.ok(await page.waitForFunction(() => { const { store } = window.__ctTest; return store.members.value.some((id) => store.guests.value[id] === 'Tropical'); }, { timeout: 6000 }).then(() => true, () => false), 'added as a guest of the Tropical list');
  assert.ok((await pools()).includes('Tropical'), 'the Tropical list loads on add');
});

// Fix round 1, A1 (review c1-02): "No plant answers" only when nothing answers at all; a hit the
// filters, the hole or the palette keeps out is counted on one line with its way out, and the release
// never gets "Ask us to add" for a plant it holds.
test('PP-C c1 fix A1 (hits kept out are counted): in the palette, hidden by a filter, outside the hole: each said with its way out, never "No plant answers"', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const pick = await page.evaluate(() => {
    const { store } = window.__ctTest, m = new Set(store.members.value);
    const member = store.memberTaxa.value[0]?.canonical_name;
    const plain = store.pool.value.find((t) => !m.has(t.id) && t.traits.edibility_rating === 0)?.canonical_name;
    return { member, plain };
  });
  assert.ok(pick.member && pick.plain, 'a member and a plant with no edible part');
  await openFind(page);
  await hasFind(page);
  await search(page, pick.member);
  assert.equal(await page.$(`${FIND} [data-find-none]`), null, 'a member is no "No plant answers"');
  assert.ok(await page.$(`${FIND} [data-find-inpalette] [data-find-row] [data-find-add][data-added]`), 'the member is a row marked Added, in the palette');
  assert.equal(await page.$(`${FIND} a[data-find-ask]`), null, 'no "Ask us to add" for a plant the release holds');
  await search(page, pick.plain);
  await toggle(page, 'edible');
  assert.equal(await page.$(`${FIND} [data-find-none]`), null, 'hidden by a filter is no "No plant answers"');
  assert.equal(await page.$eval(`${FIND} [data-find-hidden-filters]`, (e) => Number(e.dataset.count)).catch(() => null), 1, '"1 hidden by your filters"');
  await page.click(`${FIND} [data-find-hidden-filters] button`);
  assert.ok(await has(page, `${FIND} [data-find-row]`, 2000), 'Clear shows it');
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
  // A hole: a plant of the list that does not fill it.
  await findFromHole(page);
  const away = await page.evaluate(() => {
    const { store } = window.__ctTest, { fits } = store.sheetTarget.value, m = new Set(store.members.value);
    return store.pool.value.find((t) => !m.has(t.id) && !fits(t))?.canonical_name ?? null;
  });
  assert.ok(away, 'a plant outside the hole');
  await search(page, away);
  assert.equal(await page.$(`${FIND} [data-find-none]`), null, 'outside the hole is no "No plant answers"');
  assert.equal(await page.$eval(`${FIND} [data-find-outside-hole]`, (e) => Number(e.dataset.count)).catch(() => null), 1, '"1 on your list but outside this hole"');
  await page.click(`${FIND} [data-find-outside-hole] button`);
  assert.ok(await page.waitForFunction((sel, n) => [...document.querySelectorAll(sel)].some((r) => r.textContent.includes(n)), { timeout: 2000 }, `${FIND} [data-find-row]`, away).then(() => true, () => false), 'Show lists it');
});

// Fix round 1, B2 and B3 (board FindResults; conformance c1 #2, #3): plain Find folds the plants outside
// their range behind one counted button too, lists best first (the holes a plant fills, said on the
// row) with the line saying so, and shows at most a screenful per group behind "Show all N".
test('PP-C c1 fix B2+B3 (best first, folded outside, Show all): plain Find', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  await openFind(page);
  await hasFind(page);
  assert.ok(await has(page, `${FIND} [data-find-best]`, 4000), 'the "Best first" line');
  assert.equal(await page.$(`${FIND} [data-find-group="outside"]`), null, 'the outside plants are folded in plain Find');
  assert.ok(await page.$(`${FIND} [data-find-outside]`), '"Show N outside their climate range"');
  const fills = await page.$$eval(`${FIND} [data-find-group="fits"] [data-find-row]`, (els) => els.map((e) => Number(e.dataset.fills)));
  assert.ok(fills.length > 0 && fills.length <= 20, `a screenful at most (${fills.length})`);
  assert.ok(fills.every((n, i) => i === 0 || n <= fills[i - 1]), `best first: ${fills.join(',')}`);
  const all = await page.$eval(`${FIND} [data-find-group="fits"] [data-find-showall]`, (b) => Number(/\d+/.exec(b.textContent)?.[0])).catch(() => null);
  assert.ok(all > 20, '"Show all N"');
  await page.click(`${FIND} [data-find-group="fits"] [data-find-showall]`);
  assert.equal(await page.$$eval(`${FIND} [data-find-group="fits"] [data-find-row]`, (els) => els.length), all, 'it lists them all');
});

// Fix round 1, B1, B5, B13 (boards FindResults, FillHole, AddAnyway; conformance c1 #1, #8, #16): a row
// says what it fills, its light, size and years; an outside row says "Add anyway" and that the warning
// stays (no question asked); a toxic plant carries the short mark, the full wording in Details only.
test('PP-C c1 fix B1+B5+B13 (row content): fills, light, size, years; Add anyway; short toxic mark', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  await findFromHole(page);
  const first = `${FIND} [data-find-row]`;
  assert.ok(await has(page, `${first} [data-find-fills]`, 4000), 'a row in a hole says it fills it');
  const meta = await page.$eval(`${first} [data-find-meta]`, (e) => e.textContent).catch(() => '');
  assert.match(meta, /wide|tall|no size recorded/, `its size (${meta})`);
  assert.match(meta, /year|month|days|All the years/i, `its years (${meta})`);
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
  await openFind(page);
  await hasFind(page);
  await page.click(`${FIND} [data-find-outside]`);
  const out = `${FIND} [data-find-group="outside"] [data-find-row]`;
  assert.ok(await has(page, out, 4000), 'an outside row');
  assert.match(await page.$eval(`${out} [data-find-add]`, (b) => b.textContent), /Add anyway/, '"Add anyway"');
  assert.match(await page.$eval(`${FIND} [data-find-group="outside"]`, (e) => e.textContent), /your call/, 'the warning stays: your call');
  const tox = await page.evaluate(() => window.__ctTest.store.pool.value.find((t) => t.warnings.toxicity && t.warnings.toxicity.level !== 'None' && !window.__ctTest.store.members.value.includes(t.id))?.canonical_name);
  assert.ok(tox, 'a toxic plant');
  await search(page, tox);
  const text = await page.$eval(`${FIND} [data-find-row]`, (r) => r.textContent);
  assert.match(text, /toxic/i, 'the toxic mark');
  assert.doesNotMatch(text, /toxicity records/, 'not the full sentence on the row');
});

// Fix round 1, B4 and B6 (boards Find, FindJob; conformance c1 #4, #9): the start says how many plants fit
// the place, lists the palette's holes (each opens Find for it) and offers the jobs as chips; a job word's
// card says what the job means, what the palette already has for it, and the job words understood.
test('PP-C c1 fix B4+B6 (start state, job card): fit count, holes block, job chips; the job card explains', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.countFits.value, { timeout: 10_000 });
  const n = await page.evaluate(() => { const c = window.__ctTest.store.countFits.value; return c.fits + c.look; });
  await openFind(page);
  await hasFind(page);
  assert.match(await page.$eval(`${FIND} [data-find-fitcount]`, (e) => e.textContent).catch(() => ''), new RegExp(`${n} of the`), `"${n} of the M plants … fit your place today"`);
  assert.ok(await page.$(`${FIND} [data-find-byjob] [data-job-chip]`), '"Or look by job" chips');
  const holes = await page.evaluate(() => window.__ctTest.store.memberTaxa.value.length);
  assert.ok(holes > 0);
  const hole = `${FIND} [data-find-holes] [data-find-hole]`;
  if (await page.$(`${FIND} [data-find-holes]`)) {
    const title = await page.$eval(hole, (b) => b.dataset.title);
    await page.click(hole);
    assert.ok(await page.waitForFunction((t) => document.querySelector('dialog.ct-find h2')?.textContent === t, { timeout: 3000 }, title).then(() => true, () => false), 'a hole opens Find for it');
    await page.evaluate(() => window.__ctTest.store.closeSheet());
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
    await openFind(page);
    await hasFind(page);
  }
  await page.click(`${FIND} [data-find-byjob] [data-job-chip="ground"]`);
  assert.ok(await page.$(`${FIND} [data-filter="job"][data-value="ground"][aria-pressed="true"]`), 'a job chip filters by its job');
  await search(page, 'windbreak');
  const card = await page.$eval(`${FIND} .ct-find-job`, (e) => e.textContent).catch(() => '');
  assert.match(card, /wind/i, 'what the job means');
  assert.match(card, /Your palette has/, 'what the palette has for it');
  assert.match(await page.$eval(`${FIND} [data-find-jobwords]`, (e) => e.textContent).catch(() => ''), /mulch/, 'the job words understood');
});

// Fix round 1, B7, B8, B15, B16 (boards FindFilters, Find; conformance c1 #10, #11, #17, #19): the active
// filters are removable chips under the search with Clear; below 960 px "Filters" opens the filters as
// their own view with "Clear all / Show N plants"; the fit filter is one three-way choice with counts, and
// size and life chips carry counts; the field has a clear button and a short placeholder; the title is
// said once; on desktop no "Filters" button beside the open column.
test('PP-C c1 fix B7+B8+B15+B16 (filters and field): chips, phone filters view, three-way fit, clear ×, title once', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await openFind(page);
  await hasFind(page);
  assert.equal(await page.$eval(`${FIND} .ct-find-filters-btn`, (b) => getComputedStyle(b).display).catch(() => 'none'), 'none', 'no Filters button beside the open column');
  assert.equal((await page.$$eval(`${FIND}`, (d) => (d[0].textContent.match(/Add plants/g) ?? []).length)), 1, 'the title said once');
  const fit = await page.$$eval(`${FIND} input[name="ct-find-fit"]`, (els) => els.map((e) => e.value));
  assert.deepEqual(fit, ['fits', 'inside', 'all'], 'one three-way fit choice');
  assert.ok(await page.$$eval(`${FIND} [data-fit-count]`, (els) => els.length === 3 && els.every((e) => /\d/.test(e.textContent))), 'each with its count');
  assert.ok(await page.$(`${FIND} [data-filter="size"] .ct-muted`), 'size chips carry counts');
  assert.ok(await page.$(`${FIND} [data-filter="life-cycle"] .ct-muted`), 'life chips carry counts');
  await page.click(`${FIND} [data-filter="size"][data-value="small"]`);
  assert.ok(await has(page, `${FIND} [data-find-active] [data-active-chip]`, 2000), 'the active filter as a chip under the search');
  await page.click(`${FIND} [data-find-active] [data-active-chip]`);
  assert.equal(await page.$(`${FIND} [data-filter="size"][data-value="small"][aria-pressed="true"]`), null, 'its × removes it');
  const ph = await page.$eval(`${FIND} [data-find-search]`, (i) => i.placeholder);
  assert.ok(ph.length <= 20, `a short placeholder (${ph})`);
  await search(page, 'apple');
  await page.click(`${FIND} [data-find-clear]`);
  assert.equal(await page.$eval(`${FIND} [data-find-search]`, (i) => i.value), '', 'the clear button empties the field');
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 }); // a phone's width (isMobile would reload)
  await openFind(page);
  await hasFind(page);
  await page.click(`${FIND} .ct-find-filters-btn`);
  assert.ok(await has(page, `${FIND} [data-find-filters-view]`, 2000), 'the filters as their own view');
  assert.equal(await page.$(`${FIND} [data-find-row]`), null, 'no results under it');
  const show = `${FIND} [data-find-filters-show]`;
  assert.match(await page.$eval(show, (b) => b.textContent).catch(() => ''), /Show \d+ plants/, '"Show N plants"');
  assert.ok(await page.$(`${FIND} [data-find-filters-clear]`), '"Clear all"');
  await page.click(show);
  assert.ok(await has(page, `${FIND} [data-find-row]`, 2000), 'Show returns to the results');
});

// Fix round 1, B9, B12, B14 (boards FindMulti, FillHole, FindNone; conformance c1 #7, #12, #15): a "One by
// one / Select several" switch with its line; adding a plant that fills a hole says the result in the
// toast; a typing slip (one letter missing, extra or swapped) gives the close names as rows with Add.
test('PP-C c1 fix B9+B12+B14 (switch, toast result, typo rows)', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  await openFind(page);
  await hasFind(page);
  const modes = await page.$$eval(`${FIND} [data-find-mode]`, (els) => els.map((e) => [e.dataset.findMode, e.getAttribute('aria-pressed')]));
  assert.deepEqual(modes, [['one', 'true'], ['several', 'false']], 'One by one / Select several, its state shown');
  await page.click(`${FIND} [data-find-mode="several"]`);
  assert.match(await page.$eval(`${FIND} [data-find-ticks]`, (e) => e.textContent).catch(() => ''), /ticks stay/, 'the ticks stay line');
  await page.click(`${FIND} [data-find-mode="one"]`);
  const slip = await page.evaluate(() => {
    const { store } = window.__ctTest, m = new Set(store.members.value);
    const t = store.pool.value.find((x) => !m.has(x.id) && /^[a-z]{6,}$/i.test(x.names.en ?? ''));
    const n = t.names.en; return { id: t.id, q: n.slice(0, 2) + n[3] + n[2] + n.slice(4) };
  });
  await search(page, slip.q);
  const row = `${FIND} [data-find-close-rows] [data-find-row][data-plant-id="${slip.id}"]`;
  assert.ok(await has(page, row, 3000), `a swapped letter ("${slip.q}") gives the plant as a row`);
  assert.ok(await page.$(`${row} [data-find-add]`), 'with Add');
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
  await findFromHole(page);
  const filler = await page.$eval(`${FIND} [data-find-row]`, (r) => r.dataset.plantId);
  await page.click(`${FIND} [data-find-row][data-plant-id="${filler}"] [data-find-add]`);
  const toast = await page.waitForFunction(() => document.querySelector('dialog.ct-find [role="status"], dialog.ct-find .ct-toast')?.textContent, { timeout: 3000 }).then((h) => h.jsonValue(), () => '');
  assert.match(toast, /is filled|now nobody/, `the toast says the hole's result (${toast})`);
});

// Fix round 1, B10 and B11 (board Paste; conformance c1 #13, #14): Paste opened from Find reads the
// paste in its order with the count of names read, a plural common name asks "Which …?", a plant outside
// its range says so on its row, the note says plants come with their warnings, and Cancel goes back to
// Find with the focus on "Paste a list".
test('PP-C c1 fix B10+B11 (Paste as the board): pasted order, count, Which …?, range warning, note, Cancel back to Find', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  const pick = await page.evaluate(() => {
    const { store } = window.__ctTest, m = new Set(store.members.value), v = store.poolVerdicts.value, pool = store.pool.value;
    const outside = pool.find((t) => !m.has(t.id) && v.get(t.id)?.level === 'outside').canonical_name;
    const by = new Map();
    for (const t of pool) { const w = (t.names.en ?? '').toLowerCase().split(' ').pop(); if (/^[a-z]{4,}$/.test(w) && !w.endsWith('s')) by.set(w, (by.get(w) ?? 0) + 1); }
    const word = [...by].filter(([w, n]) => n >= 2 && !pool.some((t) => (t.names.en ?? '').toLowerCase() === `${w}s`)).sort((a, b) => b[1] - a[1])[0][0];
    return { outside, plural: `${word}s`, member: store.memberTaxa.value[0].canonical_name };
  });
  await openFind(page);
  await hasFind(page);
  await page.click(`${FIND} [data-find-paste]`);
  assert.ok(await has(page, 'dialog[open] #ct-paste-text', 3000), 'Paste opens in the sheet');
  await page.locator('dialog[open] #ct-paste-text').fill([pick.member, 'zzqx not a plant', pick.plural, pick.outside].join('\n'));
  await page.waitForFunction(() => document.querySelectorAll('dialog[open] [data-paste-row]').length === 4, { timeout: 4000 });
  assert.deepEqual(await page.$$eval('dialog[open] [data-paste-row]', (els) => els.map((e) => e.dataset.status)), ['already', 'none', 'choose', 'found'], 'the paste in its order');
  assert.match(await page.$eval('dialog[open] [data-paste-count]', (e) => e.textContent), /4 names read/, 'the count of names read');
  assert.match(await page.$eval('dialog[open] [data-paste-row][data-status="choose"]', (e) => e.textContent), /Which/, `"${pick.plural}": Which …?`);
  assert.match(await page.$eval('dialog[open] [data-paste-row][data-status="found"]', (e) => e.textContent), /Outside its climate range/, 'the range warning on its row');
  assert.ok(await page.$('dialog[open] [data-paste-note]'), 'added as they are, with their warnings');
  await page.click('dialog[open] [data-paste-cancel]');
  assert.ok(await has(page, `${FIND} [data-find-paste]`, 3000), 'Cancel goes back to Find');
  assert.ok(await page.waitForFunction(() => document.activeElement?.matches('[data-find-paste]'), { timeout: 2000 }).then(() => true, () => false), 'the focus on "Paste a list"');
});
