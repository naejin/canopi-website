// PP-C stream c1, Find (plant-palette-slices section 3.4, c1 browser rows): one browser test per user
// scenario and failure state, written failing in PP-C commit 0, each marked expected-fail
// (scripts/expect-fail.mjs failing(), owner c1 in its title); c1 removes a marker in the commit that
// makes it pass. Until c1 builds Find, store.openFind opens the Paste sheet (no empty modal), so every
// case fails at its first look for Find: "no Find sheet (dialog.ct-find)". The F1a filter markers
// (F1a-F1..F5, from 648baf2:scripts/browser/consortium-f1a-filters.browser.test.mjs) and C6's Find half
// are restored here (scripts/plan/parked-markers.json), retitled "F1a-Xn → PP-C (c1 …" and rewritten
// against Find.
//
// The contract these cases propose (c1 may rename within its chunk, keeping the cases; no layout or
// wording pinned beyond what the slices row names):
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
import { aria, en, has, useHarness } from './helpers.mjs';
import { atSite, choose, temperateLink, tool } from './p5-helpers.mjs';
import { suggestedAt } from './f1a-helpers.mjs';
import { failing } from '../expect-fail.mjs';

useHarness();

const FIND = 'dialog.ct-find[open]';
const NO_FIND = /no Find sheet \(dialog\.ct-find\)/;
const hasFind = async (page, timeout = 4000) => assert.ok(await has(page, FIND, timeout), 'no Find sheet (dialog.ct-find)');
const on = (page, id) => page.$eval(`${FIND} [data-filter="${id}"]`, (e) => e.getAttribute('aria-pressed') === 'true' || e.checked === true).catch(() => null);
const rowIds = (page) => page.$$eval(`${FIND} [data-find-row]`, (els) => els.map((e) => e.dataset.plantId).filter(Boolean).sort());
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
// Find opened from the Next step's hole ("See all N plants"), as a grower opens it.
async function findFromHole(page) {
  assert.ok(await has(page, '.ct-next-actions .button', 10_000), 'the Next step names a hole');
  await page.click('.ct-next-actions .button');
  await hasFind(page);
}

// ---- F1a filters restored (P5.1) ----

failing('F1a-F1 → PP-C (c1 Lyon food forest, P5.1): Find opened from a hole has "Fits your place" on', { owner: 'c1', reason: NO_FIND }, async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await findFromHole(page);
  assert.equal(await on(page, 'fits'), true, '"Fits your place" is on from a hole');
});

failing('F1a-F2 → PP-C (c1 Seville dry garden, P5.1 A14): "Holds up in the future climate" changes the plants offered', { owner: 'c1', reason: NO_FIND }, async () => {
  const page = await suggestedAt('seville', 'Mediterranean');
  await openFind(page);
  await hasFind(page);
  const before = await toggle(page, 'holds');
  assert.notDeepEqual(await rowIds(page), before, '"Holds up" changes the pick at Seville');
});

failing('F1a-F3 → PP-C (c1 Nairobi smallholding, P5.1 A14): "Has edible parts" (edibility_rating) and a life cycle narrow the plants offered', { owner: 'c1', reason: NO_FIND }, async () => {
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

failing('F1a-F4 → PP-C (c1 unknowns as counts, P5.1): a filter that cannot judge some plants says how many, never hides them silently', { owner: 'c1', reason: NO_FIND }, async () => {
  const page = await suggestedAt('seville', 'Mediterranean');
  await openFind(page);
  await hasFind(page);
  await toggle(page, 'edible');
  const n = await page.$eval(`${FIND} [data-filter-unknown="edible"]`, (e) => (e.dataset.count === undefined ? null : Number(e.dataset.count))).catch(() => null);
  assert.ok(Number.isInteger(n) && n >= 0, 'the unknowns are counted');
});

failing('F1a-F5 → PP-C (c1 no location, P5.1): without a location the range and holds filters are not offered, the others are', { owner: 'c1', reason: NO_FIND }, async () => {
  const page = await suggestedAt(null, 'Temperate');
  await openFind(page);
  await hasFind(page);
  assert.equal(await page.$(`${FIND} [data-filter="range"]`), null, 'no range filter without a location');
  assert.equal(await page.$(`${FIND} [data-filter="holds"]`), null, 'no holds filter without a location');
  assert.notEqual(await page.$(`${FIND} [data-filter="fits"]`), null, '"Fits your place" is still offered');
});

failing('F1a-C6 → PP-C (c1 verdict chunk refused, Find half, A16 §5): with the verdict chunk refused, Find\'s plants say "not checked", never a fit', { owner: 'c1', reason: NO_FIND }, async () => {
  const page = await tool({ block: { verdict: 404 } });
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  await openFind(page);
  await hasFind(page);
  assert.ok(await has(page, `${FIND} [data-find-group="unchecked"] [data-find-row]`, 8000), 'the plants are under "Not checked"');
  assert.equal(await page.$(`${FIND} [data-find-group="fits"] [data-find-row]`), null, 'none under "Fits your place"');
});

// ---- scenarios ----

failing('PP-C1 (c1 names file): "Gombo" (French, names file only) on the English page finds okra, labelled French; Lycopersicon esculentum finds the tomato as a synonym', { owner: 'c1', reason: NO_FIND }, async () => {
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

failing('PP-C2 (c1 no result): a query with no plant offers close spellings, the other lists and "Ask us to add it", a link to the contact form with the query', { owner: 'c1', reason: NO_FIND }, async () => {
  const page = await tool({ data: 'fixture' });
  await choose(page, 'Temperate');
  await openFind(page);
  await hasFind(page);
  await search(page, 'Castanea sativx');
  assert.ok(await has(page, `${FIND} [data-find-none]`, 4000), 'the no-result state');
  assert.ok(await has(page, `${FIND} [data-find-close]`, 2000), 'close spellings');
  // A plant only another climate's list holds (the fixture's okra: Tropical only) offers that list.
  await search(page, 'Abelmoschus esculentus');
  assert.ok(await has(page, `${FIND} [data-find-none] [data-find-other]`, 4000), 'the other lists');
  assert.match(await page.$eval(`${FIND} [data-find-other]`, (e) => e.textContent).catch(() => ''), /Tropical/, 'the other list named');
  await search(page, 'Zzyzx plantus');
  const ask = await page.$eval(`${FIND} a[data-find-ask]`, (a) => a.getAttribute('href')).catch(() => null);
  assert.match(ask ?? '', /contact/, 'a link to the contact form');
  assert.match(decodeURIComponent(ask ?? ''), /Zzyzx plantus/, 'carrying the query');
});

failing('PP-C3 (c1 Select several): three plants ticked are added with one toast and one Undo', { owner: 'c1', reason: NO_FIND }, async () => {
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

failing('PP-C4 (c1 inform, don\'t block): an invasive plant and a plant outside its range are each added with one tap, the warning in words, no confirm step', { owner: 'c1', reason: NO_FIND }, async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.evaluate(() => { window.__ctTest.store.country.value = 'FR'; });
  await openFind(page);
  await hasFind(page);
  await search(page, 'Robinia pseudoacacia');
  const row = `${FIND} [data-find-row]`;
  assert.match(await page.$eval(row, (r) => r.textContent).catch(() => ''), /invasive/i, 'the invasive warning in words');
  await page.click(`${row} [data-find-add]`);
  assert.equal(await page.$('dialog[role="alertdialog"]'), null, 'nothing asks');
  assert.ok(await page.$(`${row} [data-find-add][data-added]`), 'added in one tap');
  assert.ok(await has(page, `${FIND} [data-find-group="outside"] [data-find-row]`, 4000), 'a group outside its range');
  await page.click(`${FIND} [data-find-group="outside"] [data-find-row] [data-find-add]`);
  assert.equal(await page.$('dialog[role="alertdialog"]'), null, 'nothing asks for an outside plant either');
});

// BT-6's Add half (consortium-s3, cut with the Add sheet in PP-C commit 0; review c0 1.6): Juglans
// next to Malus is a high conflict (genus allelopathic harm, the fixture's interaction row), said on
// its row, and one tap adds it with Undo (inform, don't block; owner 2026-11-14).
failing('PP-C20 (c1 BT-6 restored, inform, don\'t block): a high conflict adds in one tap with the reason on the row', { owner: 'c1', reason: NO_FIND }, async () => {
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

failing('PP-C7 (c1 FillHole): a hole opens Find titled by the hole, best fit first; "+ Add" turns to "Added", a result line with Undo, "Show N outside their climate range", Done; on a dry, shady spot each hole lists what "See all N" counts, the site misfits under "look", never hidden', { owner: 'c1', reason: NO_FIND }, async () => {
  const page = await suggestedAt('lyon', 'Temperate');
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
  const n = Number(/\d+/.exec(label)?.[0] ?? NaN);
  const showOutside = await page.evaluateHandle((sel) => [...document.querySelectorAll(`${sel} button`)].find((b) => /outside/i.test(b.textContent)) ?? null, FIND);
  if (await showOutside.evaluate((b) => !!b)) await showOutside.click();
  assert.equal((await rowIds(page)).length, n, `"${label}" counts the plants Find lists`);
  const first = `${FIND} [data-find-group="fits"] [data-find-row]:first-of-type`;
  await page.click(`${first} [data-find-add]`);
  assert.ok(await page.$(`${first} [data-find-add][data-added]`), '"+ Add" turns to "Added"');
  assert.ok(await has(page, `${FIND} ${aria('button', en['consortium.undo'])}`, 2000), 'a result line with Undo');
  assert.ok(await showOutside.evaluate((b) => !!b), '"Show N outside their climate range"');
  await page.click(`${FIND} ${aria('button', 'Done')}`);
  assert.equal(await page.$('dialog[open]'), null, 'Done closes Find');
  // PP-B34's dry, shady spot (review c0 round 2, 5a): for up to 6 holes, Find lists exactly what "See
  // all N" counts once the outside ones are shown, and every site misfit (verdict level 'look') sits
  // in [data-find-group="look"], listed, never hidden.
  await page.evaluate(() => { const { store } = window.__ctTest; store.spot.value = { ...store.spot.value, light: 'shade', water: 'dry' }; store.hideToast(); });
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value && document.querySelector('.ct-next')?.dataset.hole, { timeout: 10_000 });
  for (let i = 0; i < 6 && await page.$('.ct-next-actions .button'); i++) {
    const hole = await page.$eval('.ct-next-hole', (e) => e.textContent.trim());
    const count = Number(/\d+/.exec(await page.$eval('.ct-next-actions .button', (e) => e.textContent.trim()))?.[0] ?? NaN);
    await findFromHole(page);
    const more = await page.evaluateHandle((sel) => [...document.querySelectorAll(`${sel} button`)].find((x) => /outside/i.test(x.textContent)) ?? null, FIND);
    if (await more.evaluate((x) => !!x)) await more.click();
    assert.equal((await rowIds(page)).length, count, `${hole}: Find lists what "See all ${count}" counts`);
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

failing('PP-C8 (c1 entries): "Add plants" right of the title at 1280 and in the phone bottom bar at 390, the toast above the bar, the bar hidden while a sheet is open; the empty palette\'s first row "Find plants"', { owner: 'c1', reason: /no "Add plants" beside the title/ }, async () => {
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

failing('PP-C9 (c1 names file held, 4.1): search works on plant_names and canonical names with a "still loading" line; on arrival the results refresh keeping focus and text, with one polite announcement', { owner: 'c1', reason: NO_FIND }, async () => {
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
  assert.equal(await page.$$eval(`${FIND} [aria-live="polite"]`, (els) => els.length), 1, 'one polite live region in Find ([data-find-status])');
  await page.evaluate((sel) => {
    window.__said = [];
    const region = document.querySelector(sel);
    new MutationObserver(() => { const t = region.textContent.trim(); if (t && window.__said.at(-1) !== t) window.__said.push(t); }).observe(region, { subtree: true, childList: true, characterData: true });
  }, `${FIND} [aria-live="polite"]`);
  await page.releaseHeld();
  assert.ok(await page.waitForFunction((sel) => !document.querySelector(sel), { timeout: 8000 }, `${FIND} [data-find-names]`).then(() => true, () => false), 'the names file arrived');
  assert.ok(await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].some((r) => /Abelmoschus esculentus/.test(r.textContent)), { timeout: 4000 }, `${FIND} [data-find-row]`).then(() => true, () => false), 'the results refresh: "Gombo" finds okra');
  assert.equal(await page.evaluate(() => document.activeElement?.matches('[data-find-search]')), true, 'the focus stays in the search');
  assert.equal(await page.$eval(`${FIND} [data-find-search]`, (i) => i.value), 'Gombo', 'the text stays');
  await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
  assert.equal((await page.evaluate(() => window.__said)).length, 1, 'one polite announcement on arrival');
});

failing('PP-C10 (c1 names file 404 or offline, 4.2): one line, and the next focus retries (no cached failed promise)', { owner: 'c1', reason: NO_FIND }, async () => {
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
});

failing('PP-C11 (c1 names file digest mismatch, 4.3): the file is dropped, and not fetched again until a reload', { owner: 'c1', reason: NO_FIND }, async () => {
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

failing('PP-C12 (c1 sheet closed mid-fetch, 4.5; Find from Place, 4.6): reopening uses the one module-level fetch; Find opened from Place before the palette shows starts it', { owner: 'c1', reason: NO_FIND }, async () => {
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
