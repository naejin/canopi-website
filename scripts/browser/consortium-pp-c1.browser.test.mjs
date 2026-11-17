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
// Plain Find at Lyon on the Temperate list, the verdicts in.
const plainFind = async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  await openFind(page);
  await hasFind(page);
  return page;
};
// Every "Show all N" of Find pressed, so each group lists all its plants (fix round 1, B2).
const expandAll = async (page) => { for (let i = 0; i < 8 && await page.$(`${FIND} [data-find-showall]`); i++) await page.click(`${FIND} [data-find-showall]`); };
// The start lists no plant (board Find, K3): "Every plant on the list" lists them all, a job chip
// (the filter column at 960) its plants, as a grower does.
const everyPlant = async (page) => { await page.click(`${FIND} [data-filter="all"]`); await has(page, `${FIND} [data-find-row]`, 4000); };
const byJob = async (page, job = 'feeds_you') => { await page.click(`${FIND} [data-filter="job"][data-value="${job}"]`); await has(page, `${FIND} [data-find-row]`, 4000); };
const visible = (page, sel) => page.$$eval(sel, (els) => els.some((e) => e.checkVisibility()));
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
  await everyPlant(page);
  const before = await toggle(page, 'holds');
  assert.notDeepEqual(await rowIds(page), before, '"Holds up" changes the pick at Seville');
});

test('F1a-F3 → PP-C (c1 Nairobi smallholding, P5.1 A14): "Has edible parts" (edibility_rating) and a life cycle narrow the plants offered', async () => {
  const page = await suggestedAt('nairobi', 'Subtropical');
  await openFind(page);
  await hasFind(page);
  await everyPlant(page);
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
  await everyPlant(page); // every row shown
  await toggle(page, 'edible');
  const n = await page.$eval(`${FIND} [data-filter-unknown="edible"]`, (e) => /\d+ not recorded/.test(e.textContent)).catch(() => false);
  assert.ok(n, 'the unknowns are counted ("N not recorded")');
  // Fix round 1, A3 (review c1-04): a hide filter says how many it hides (its count on the right),
  // beside "not recorded, still shown".
  const shown = (await rowIds(page)).length;
  const hid = await page.$eval(`${FIND} [data-filter-count="toxic"]`, (e) => Number(e.textContent.replace(/\D/g, ''))).catch(() => null);
  assert.ok(Number.isInteger(hid), 'how many "Hide toxic" hides is said');
  await toggle(page, 'toxic');
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
  await everyPlant(page);
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
  await byJob(page);
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
  await everyPlant(page); // plain Find folds them; "Every plant on the list" shows them (fix round 1, B3)
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
test('PP-C40 (c1 fix A8 Paste, one index): Paste loads no other list on opening; a plant only another list holds is found and its list loads only on add', async () => {
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
test('PP-C41 (c1 fix A1 hits kept out are counted): in the palette, hidden by a filter, outside the hole: each said with its way out, never "No plant answers"', async () => {
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
  assert.match(await page.$eval(`${FIND} [data-find-hidden-filters]`, (e) => e.textContent).catch(() => ''), /^1 hidden by your filters/, '"1 hidden by your filters"');
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
  assert.match(await page.$eval(`${FIND} [data-find-outside-hole]`, (e) => e.textContent).catch(() => ''), /^1 on your list but outside this hole/, '"1 on your list but outside this hole"');
  await page.click(`${FIND} [data-find-outside-hole] button`);
  assert.ok(await page.waitForFunction((sel, n) => [...document.querySelectorAll(sel)].some((r) => r.textContent.includes(n)), { timeout: 2000 }, `${FIND} [data-find-row]`, away).then(() => true, () => false), 'Show lists it');
  // The whole list holds for that search only (r2-11): another search, the hole's plants again.
  await search(page, 'zzqx');
  await search(page, away);
  assert.ok(await has(page, `${FIND} [data-find-outside-hole]`, 2000), 'searched again, the hole\'s preset is back');
});

// Fix round 2, r2-10 and r2-08: every number Find shows is the rows it then lists (a chip's, a fit
// choice's, the count line's); "Best first" only when the list is ranked (a location's verdicts in).
test('PP-C49 (c1 fix round 2 r2-10 + r2-08): a chip\'s and a fit choice\'s counts are the rows they list; "Best first" only with a location', async () => {
  const page = await plainFind();
  const num = (sel) => page.$eval(sel, (e) => Number(/(\d+)\D*$/.exec(e.textContent.trim())?.[1] ?? NaN));
  const listed = async () => { await expandAll(page); return page.$$eval(`${FIND} [data-find-group] [data-find-row]`, (els) => els.length); };
  const chip = `${FIND} [data-filter="job"][data-value="ground"]`;
  const said = await num(chip);
  await page.click(chip);
  assert.equal(await listed(), said, `the chip said ${said}`);
  // The count line counts the rows the screen lists (c1r3 T14, c1r4 U2): the palette's plants folded
  // into a line of names are not rows; once "Show" lists them, they are.
  const countSays = async () => Number(/^(\d+) plants?\./.exec(await page.$eval(`${FIND} [data-find-count]`, (e) => e.textContent))?.[1] ?? NaN);
  assert.equal(await countSays(), said, 'the count line says what the chip said');
  assert.equal(await page.$eval(`${FIND} [data-find-filters-show]`, (e) => e.textContent.trim()), `Show ${said} plants`, '"Show N plants" says it too');
  const mine = await page.$eval(`${FIND} [data-find-inpalette-line]`, (e) => Number(/\d+/.exec(e.textContent)?.[0] ?? NaN));
  await page.click(`${FIND} [data-find-inpalette-line] button`);
  assert.equal(await countSays(), said + mine, 'with the palette\'s plants listed as rows, the count line counts them');
  const all = await page.$eval(`${FIND} [data-filter="all"]`, (i) => Number(/(\d+) plants?/.exec(i.closest('label').textContent)?.[1]));
  await page.click(`${FIND} [data-filter="all"]`);
  assert.equal(await listed(), all, `"Every plant on the list" said ${all}`);
  assert.match(await page.$eval(`${FIND} [data-find-count]`, (e) => e.textContent), /Best first/, 'ranked: "Best first"');
  const nowhere = await suggestedAt(null, 'Temperate');
  await openFind(nowhere);
  await hasFind(nowhere);
  await nowhere.click(`${FIND} [data-filter="all"]`);
  assert.doesNotMatch(await nowhere.$eval(`${FIND} [data-find-count]`, (e) => e.textContent), /Best first/, 'no location: no "Best first"');
});

// Fix round 1, B2 and B3 (board FindResults; conformance c1 #2, #3): plain Find folds the plants outside
// their range behind one counted button too, lists best first (the years in range; the palette's holes
// wait for a store seam, pf) with the line saying so, and shows at most a screenful per group behind "Show all N".
test('PP-C42 (c1 fix B2+B3 best first, folded outside, Show all): plain Find', async () => {
  const page = await plainFind();
  await page.click(`${FIND} [data-filter="light"][data-value="sun"]`); // a list, as a grower asks for one
  assert.match(await page.$eval(`${FIND} [data-find-count]`, (e) => e.textContent).catch(() => ''), /^\d+ plants\. Best first/, 'the count line, then "Best first"');
  assert.equal(await page.$(`${FIND} [data-find-group="outside"]`), null, 'the outside plants are folded in plain Find');
  assert.ok(await page.$(`${FIND} [data-find-outside]`), '"Show N outside their climate range"');
  const shown = await page.$$eval(`${FIND} [data-find-group="fits"] [data-find-row]`, (els) => els.length);
  assert.ok(shown > 0 && shown <= 20, `a screenful at most (${shown})`);
  const all = await page.$eval(`${FIND} [data-find-group="fits"] [data-find-showall]`, (b) => Number(/\d+/.exec(b.textContent)?.[0])).catch(() => null);
  assert.ok(all > 20, '"Show all N"');
  await page.click(`${FIND} [data-find-group="fits"] [data-find-showall]`);
  assert.equal(await page.$$eval(`${FIND} [data-find-group="fits"] [data-find-row]`, (els) => els.length), all, 'it lists them all');
});

// Fix round 1, B1, B5, B13 (boards FindResults, FillHole, AddAnyway; conformance c1 #1, #8, #16): a row
// says what it fills, its light, size and years; an outside row says "Add anyway" and that the warning
// stays (no question asked); a toxic plant carries the short mark, the full wording in Details only.
test('PP-C43 (c1 fix B1+B5+B13 row content): fills, light, size, years; Add anyway; short toxic mark', async () => {
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
  await everyPlant(page);
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
// the place and offers the jobs as chips (the holes block waits for a store seam, pf); a job word's
// card says what the job means, what the palette already has for it, and the job words understood.
test('PP-C44 (c1 fix B4+B6 start state, job card): fit count, job chips; the job card explains', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.countFits.value, { timeout: 10_000 });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 }); // the start's job chips (at 960, the filter column's)
  await openFind(page);
  await hasFind(page);
  assert.equal(await visible(page, `${FIND} [data-find-row]`), false, 'the start lists no plant (K3)');
  // The subtitle and the fit choice say one number (c1r3 T14).
  const n = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} label`)].map((l) => /^Fits your place(\d+) plants?/.exec(l.textContent)?.[1]).find(Boolean), FIND);
  assert.ok(n, 'the fit choice says how many fit');
  assert.match(await page.$eval(`${FIND} [data-find-fitcount]`, (e) => e.textContent).catch(() => ''), new RegExp(`^${n} of the \\d+ plants .* fit your place today`), `"${n} of the M plants … fit your place today", as the fit choice`);
  assert.ok(await page.$(`${FIND} [data-find-byjob] [data-job-chip]`), '"Or look by job" chips');
  await page.click(`${FIND} [data-find-byjob] [data-job-chip="ground"]`);
  assert.ok(await page.$(`${FIND} [data-filter="job"][data-value="ground"][aria-pressed="true"]`), 'a job chip filters by its job');
  assert.ok(await visible(page, `${FIND} [data-find-row]`), 'and lists its plants');
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
test('PP-C45 (c1 fix B7+B8+B15+B16 filters and field): chips, phone filters view, three-way fit, clear ×, title once', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await openFind(page);
  await hasFind(page);
  assert.equal(await page.$eval(`${FIND} .ct-find-filters-btn`, (b) => getComputedStyle(b).display).catch(() => 'none'), 'none', 'no Filters button beside the open column');
  assert.equal((await page.$$eval(`${FIND}`, (d) => (d[0].textContent.match(/Add plants/g) ?? []).length)), 1, 'the title said once');
  // The fit choice by its words (c1r3 T5): each choice with its count.
  const labels = await page.$$eval(`${FIND} label`, (els) => els.map((e) => e.textContent));
  for (const label of [en['consortium.find.fits'], en['consortium.find.range'], en['consortium.find.fitAll']]) assert.ok(labels.some((l) => new RegExp(`^${label}\\d+ plants`).test(l)), `"${label}" with its count`);
  for (const id of ['size', 'life-cycle', 'light', 'job']) assert.ok(await page.$$eval(`${FIND} [data-filter="${id}"]`, (els) => els.every((e) => /\d$/.test(e.textContent.trim()))), `${id} chips carry counts`);
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
  await search(page, 'apple');
  // Every row the results list, the palette's and the other lists' included (c1r3 T14).
  const results = await page.$$eval(`${FIND} [data-find-row]`, (els) => els.length);
  const focusText = () => page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
  // The "Filters" button by its role and name (c1r3 T5): the heading also reads "Filters".
  const filtersButton = async () => (await page.$('aria/Filters[role="button"]'))?.evaluate((b) => b === document.activeElement) ?? false;
  await page.click('aria/Filters[role="button"]');
  assert.equal(await focusText(), 'Filters', 'the focus on the filters\' heading');
  assert.equal(await visible(page, `${FIND} [data-find-row]`), false, 'the filters in place of the results');
  const show = `${FIND} [data-find-filters-show]`;
  assert.equal(await page.$eval(show, (b) => b.textContent.trim()), `Show ${results} plant${results === 1 ? '' : 's'}`, '"Show N plants": the rows the results list');
  assert.ok(await page.$(`${FIND} [data-find-filters-clear]`), '"Clear all"');
  await page.click(show);
  assert.ok(await visible(page, `${FIND} [data-find-row]`), 'Show returns to the results');
  assert.ok(await filtersButton(), 'the focus back on "Filters"');
  // Escape in the filters returns to the results, Find open, the query kept (r2-02).
  await page.click('aria/Filters[role="button"]');
  await page.keyboard.press('Escape');
  assert.ok(await page.$(FIND), 'Find stays open');
  assert.ok(await visible(page, `${FIND} [data-find-row]`), 'Escape returns to the results');
  assert.equal(await page.$eval(`${FIND} [data-find-search]`, (i) => i.value), 'apple', 'the query kept');
  assert.ok(await filtersButton(), 'the focus back on "Filters"');
});

// Fix round 1, B9, B14 (boards FindMulti, FindNone; conformance c1 #7, #12): a "One by
// one / Select several" switch with its line; a typing slip (one letter missing, extra or swapped) gives the close names as rows with Add.
test('PP-C46 (c1 fix B9+B14 switch, typo rows)', async () => {
  const page = await plainFind();
  await byJob(page);
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
});

// Fix round 1, B10 and B11 (board Paste; conformance c1 #13, #14): Paste opened from Find reads the
// paste in its order with the count of names read, a plural common name asks "Which …?", a plant outside
// its range says so on its row, the note says plants come with their warnings, and Cancel goes back to
// Find with the focus on "Paste a list".
test('PP-C47 (c1 fix B10+B11 Paste as the board): pasted order, count, Which …?, range warning, note, Cancel back to Find', async () => {
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
  const lines = [pick.member, 'zzqx not a plant', pick.plural, pick.outside];
  const texts = await page.$$eval('dialog[open] [data-paste-row]', (els) => els.map((e) => e.textContent));
  assert.deepEqual(texts.map((t) => lines.findIndex((l) => t.startsWith(`“${l}”`))), [0, 1, 2, 3], 'the paste in its order, each line by its name');
  assert.match(texts[1], /Not found/i, 'the line no plant answers says so');
  assert.match(await page.$eval('dialog[open] [data-paste-count]', (e) => e.textContent), /4 names read/, 'the count of names read');
  assert.match(texts[2], new RegExp(`Which ${pick.plural.slice(0, -1)}\\? \\d+ plants match`), `"${pick.plural}": Which …? (its singular)`);
  assert.match(texts[3], /Outside its climate range/, 'the range warning on its row');
  assert.ok((await page.$eval('dialog[open]', (e) => e.textContent)).includes(en['consortium.paste.note']), 'added as they are, with their warnings');
  await page.click('dialog[open] [data-paste-cancel]');
  assert.ok(await has(page, `${FIND} [data-find-paste]`, 3000), 'Cancel goes back to Find');
  assert.ok(await page.waitForFunction(() => document.activeElement?.matches('[data-find-paste]'), { timeout: 2000 }).then(() => true, () => false), 'the focus on "Paste a list"');
});

// c1r3 T3 + T14 (review c1r3-03, Chrome K14): the start offers the list ("Show the N plants that fit",
// the subtitle's and the fit choice's number) and "Show N plants" in the phone filters lists the plants.
test('PP-C50 (c1 r3 T3+T14): the start lists its plants on asking; "Show N plants" lists them', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await openFind(page);
  await hasFind(page);
  const link = await page.$eval(`${FIND} [data-find-count] button`, (b) => b.textContent).catch(() => '');
  const n = /^Show the (\d+) plants that fit$/.exec(link)?.[1];
  assert.ok(n, `the start's "Show the N plants that fit" (${link})`);
  assert.match(await page.$eval(`${FIND} [data-find-fitcount]`, (e) => e.textContent), new RegExp(`^${n} of the`), 'the subtitle says the same number');
  await page.click(`${FIND} [data-find-count] button`);
  assert.ok(await visible(page, `${FIND} [data-find-row]`), 'the plants are listed');
  assert.match(await page.$eval(`${FIND} [data-find-count]`, (e) => e.textContent), new RegExp(`^${n} plants\\.`), 'the count line says the same');
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
  await openFind(page);
  await hasFind(page);
  await page.click('aria/Filters[role="button"]');
  await page.click(`${FIND} [data-find-filters-show]`);
  assert.ok(await visible(page, `${FIND} [data-find-row]`), '"Show N plants" lists them');
});

// c1r3 T2, T12, T13, T16 (review c1r3-02; Chrome K11, K12, K17): Paste reads the list at once on "Read the
// list"; a choice names each plant with its scientific name; a name pasted twice is one row, said so; a
// mark is Find's short pill.
test('PP-C51 (c1 r3 T2+T12+T13+T16): Paste: Read the list, choices with their scientific names, listed twice, short marks', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  const pick = await page.evaluate(() => {
    const { store } = window.__ctTest, m = new Set(store.members.value), pool = store.pool.value;
    const by = new Map();
    for (const t of pool) { const w = (t.names.en ?? '').toLowerCase().split(' ').pop(); if (/^[a-z]{4,}$/.test(w) && !w.endsWith('s')) by.set(w, (by.get(w) ?? 0) + 1); }
    const word = [...by].filter(([w, n]) => n >= 2 && !pool.some((t) => (t.names.en ?? '').toLowerCase() === `${w}s`)).sort((a, b) => b[1] - a[1])[0][0];
    const tox = pool.find((t) => !m.has(t.id) && t.warnings.toxicity && t.warnings.toxicity.level !== 'None').canonical_name;
    return { plural: `${word}s`, tox };
  });
  await openFind(page);
  await hasFind(page);
  await page.click(`${FIND} [data-find-paste]`);
  assert.ok(await has(page, 'dialog[open] #ct-paste-text', 3000), 'Paste opens');
  assert.match(await page.$eval('dialog[open]', (e) => e.textContent), /The first 200 lines are read, on your device; nothing is sent\./, 'the board\'s intro');
  await page.$eval('dialog[open] #ct-paste-text', (t, v) => { t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); }, [pick.tox, pick.plural, pick.tox.toLowerCase()].join('\n'));
  await page.click('dialog[open] [data-paste-read]');
  const rows = await page.$$eval('dialog[open] [data-paste-row]', (els) => els.map((e) => e.textContent));
  assert.equal(rows.length, 2, 'a name pasted twice is one row');
  assert.match(rows[0], /listed twice, counted once/, 'said on its row');
  assert.match(rows[0], /toxic/i, 'its toxic mark');
  assert.doesNotMatch(rows[0], /toxicity records/, 'the short pill, not the sentence');
  const chips = await page.$$eval('dialog[open] [data-paste-row] button[aria-pressed]', (els) => els.map((b) => b.textContent));
  const sci = await page.evaluate(() => window.__ctTest.store.pool.value.map((t) => t.canonical_name));
  assert.ok(chips.filter((c) => c !== 'None').every((c) => sci.some((s) => c.endsWith(s))), `each choice names its scientific name (${chips.join(' | ')})`);
});

// c1r4 U5 (Chrome T6, board FindResults): at phone width the "Needs a second look" heading is one line
// of text that wraps back under its start, its count and why in the regular weight.
test('PP-C55 (c1 r4 U5): the second-look heading wraps as one line at 390 px, its why in the regular weight', async () => {
  const page = await suggestedAt('lyon', 'Temperate', { width: 390 });
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  await openFind(page);
  await hasFind(page);
  await page.click(`${FIND} [data-find-list]`);
  assert.ok(await has(page, `${FIND} [data-find-group="look"] h3`, 4000), 'a second-look group');
  const h = await page.$eval(`${FIND} [data-find-group="look"] h3`, (e) => {
    const why = e.querySelector('span'), lines = [...why.getClientRects()], head = e.getBoundingClientRect();
    return { lines: lines.length, last: lines.at(-1).left - head.left, first: lines[0].left - head.left, weight: getComputedStyle(why).fontWeight };
  });
  assert.ok(h.first > 0, 'the why follows the words on their line');
  assert.ok(h.lines > 1 && h.last < 2, `the why wraps back under the heading's start (${JSON.stringify(h)})`);
  assert.equal(h.weight, '400', 'regular weight');
});

// c1r4 U3: a later period with no climate figures for the place leaves every plant unchecked: Find never
// says they fit ("N of N fit your place in 2071–2099"); its subtitle is the plain count. (As PP-B1: the
// lookup keeps only an SSP5-8.5 slot, so the page's SSP2-4.5 has none for any period.)
test('PP-C54 (c1 r4 U3): a later period without figures: the plain subtitle, no plant said to fit', async () => {
  const page = await tool();
  const lookup = await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  const periods = lookup.climate.periods.filter((p) => p.period === '2071-2099' && p.scenario === 'ssp585');
  await page.evaluate((only) => {
    const { store } = window.__ctTest, at = store.location.value;
    store.location.value = { ...at, lookup: { ...at.lookup, climate: { ...at.lookup.climate, periods: only } } };
    store.period.value = '2071-2099';
  }, periods);
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  await openFind(page);
  await hasFind(page);
  const sub = await page.$eval(`${FIND} [data-find-fitcount]`, (e) => e.textContent.trim());
  assert.match(sub, /^\d+ plants on .+ not yet in your palette$/, `the plain count (${sub})`);
  assert.doesNotMatch(sub, /fit/, 'no plant said to fit');
  const fits = await page.$eval(`${FIND} [data-filter="fits"]`, (i) => i.closest('label').textContent);
  assert.match(fits, /\D0 plants/, `"Fits your place" counts none of the unchecked plants (${fits})`);
});

// c1r5 W3: the roles line leaves out the filtered job only on a row that does it: a palette plant a
// search lists under a job filter, which may not do the job, says its own roles, never "Also …".
test('PP-C57 (c1 r5 W3): a searched palette plant that does not do the filtered job keeps its roles line', async () => {
  const page = await plainFind();
  const pick = await page.evaluate(() => window.__ctTest.store.memberTaxa.value.find((t) => t.role !== 'crop' && t.functions?.length)?.canonical_name ?? null);
  assert.ok(pick, 'the palette holds a plant that does not feed you but has roles');
  await byJob(page, 'feeds_you');
  await search(page, pick);
  const meta = await page.$eval(`${FIND} [data-find-inpalette] [data-find-row] [data-find-meta]`, (e) => e.textContent.split(' · ')[0]).catch(() => null);
  assert.ok(meta, `its row in "In your palette" (${pick})`);
  assert.doesNotMatch(meta, /^Also /, `its own roles, not "Also …" (${meta})`);
});

// c1r4 U4 + U6 (Chrome T21): a close spelling says how it was read wherever the plant is: on another
// climate's list (with the question mark, "Add anyway" adds that reading) and already in the palette.
test('PP-C53 (c1 r4 U4+U6): Paste: "rosmary" on another list and "chesnut" already in the palette say "Read as …"', async () => {
  const page = await tool({ data: 'fixture' });
  await choose(page, 'Temperate');
  await page.evaluate(() => { const { store } = window.__ctTest; store.addMembers([store.pool.value.find((t) => t.canonical_name === 'Castanea sativa').id]); });
  await page.evaluate(() => window.__ctTest.store.openSheet('paste'));
  assert.ok(await has(page, '#ct-paste-text', 4000), 'Paste opens');
  await page.locator('#ct-paste-text').fill('rosmary\nchesnut');
  await page.click('dialog[open] [data-paste-read]');
  assert.ok(await has(page, 'dialog[open] [data-paste-row]', 4000), 'the list is read');
  const rows = await page.$$eval('dialog[open] [data-paste-row]', (els) => els.map((e) => ({ text: e.textContent, mark: e.querySelector('[data-status]')?.dataset.status })));
  assert.match(rows[0].text, /Read as Rosemary/, `on another list, the reading said (${rows[0].text})`);
  assert.equal(rows[0].mark, 'choose', 'with the question mark (ⓘ), not ✓');
  assert.match(rows[1].text, /in your palette/i, 'European chestnut is in the palette');
  assert.match(rows[1].text, /Read as European chestnut/, `already in the palette, the reading said (${rows[1].text})`);
});

// c1r3 T6, T18, T20 (Chrome K1, N4, N6): a job list names the palette's plants that do the job with
// "Show"; a roles list is lower case after its first word; the second-look group says why.
test('PP-C52 (c1 r3 T6+T18+T20, r4 U7): In your palette on a job list, roles in lower case without the job, why a second look', async () => {
  const page = await plainFind();
  assert.ok(await page.evaluate(() => window.__ctTest.store.memberTaxa.value.some((t) => t.role === 'crop')), 'the palette holds a food plant');
  await byJob(page, 'feeds_you');
  const line = await page.$eval(`${FIND} [data-find-inpalette-line]`, (e) => e.textContent).catch(() => '');
  assert.match(line, /^In your palette \d+ · .+ · Show$/, `"In your palette N · names · Show" (${line})`);
  await page.click(`${FIND} [data-find-inpalette-line] button`);
  assert.ok(await has(page, `${FIND} [data-find-inpalette] [data-find-row]`, 2000), 'Show lists them');
  const metas = await page.$$eval(`${FIND} [data-find-meta]`, (els) => els.map((e) => e.textContent.split(' · ')[0]));
  assert.ok(metas.some((m) => m.includes(', ')), 'a row with several roles');
  assert.ok(metas.every((m) => !/, [A-Z]/.test(m)), `roles in lower case after the first (${metas.find((m) => /, [A-Z]/.test(m))})`);
  // c1r4 U7: on a job list every row does the job; its roles line says the others, "Also …".
  assert.ok(metas.every((m) => !/feeds you/i.test(m)), `the filtered job left out (${metas.find((m) => /feeds you/i.test(m))})`);
  assert.ok(metas.some((m) => /^Also /.test(m)), 'the other roles as "Also …"');
  await page.click(`${FIND} [data-filter="all"]`);
  const look = await page.$eval(`${FIND} [data-find-group="look"] h3`, (e) => e.textContent).catch(() => '');
  assert.match(look, /\d+: a warning, or near the edge of its range/, 'why a second look');
});

// Fix round 1, B17 (conformance c1 #18): at 320 px nothing on the palette page scrolls sideways with
// Find's ways in (the phone bar) showing.
test('PP-C48 (c1 fix B17): the palette page at 320 px, the Find bar showing, scrolls no wider than the window', async () => {
  const page = await suggestedAt('nairobi', 'Subtropical'); // the board check's place (Kiambu, Subtropical)
  await page.setViewport({ width: 320, height: 700, deviceScaleFactor: 1 });
  await page.waitForFunction(() => document.querySelector('.ct-find-phonebar:not([hidden])'), { timeout: 6000 });
  await new Promise((r) => setTimeout(r, 300));
  const wide = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const over = [...document.querySelectorAll('#ct-root *')].filter((e) => e.getBoundingClientRect().right > w + 0.5 && getComputedStyle(e).position !== 'fixed')
      .map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} ${Math.round(e.getBoundingClientRect().right)}`).slice(0, 6);
    return { scroll: document.documentElement.scrollWidth, w, over };
  });
  assert.ok(wide.scroll <= wide.w, `scrollWidth ${wide.scroll} > ${wide.w}: ${wide.over.join(' | ')}`);
});
