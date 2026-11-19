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
// - the entries: [data-find-entry="head|bar"] (Sheets.tsx FindEntry) and the empty palette's
//   [data-find-entry="empty"] (NextStep's Empty card); the
//   phone bottom bar is [data-find-entry="bar"]'s container .ct-bar.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aria, en, has, realDb, useHarness } from './helpers.mjs';
import { atSite, choose, temperateLink, tool } from './p5-helpers.mjs';
import { suggestedAt } from './f1a-helpers.mjs';
import { frames, loadCase, openMore } from './pf-helpers.mjs';
import { typeIn } from './pf-e-helpers.mjs';

useHarness();

const FIND = 'dialog.ct-find[open]';
const hasFind = async (page, timeout = 4000) => assert.ok(await has(page, FIND, timeout), 'no Find sheet (dialog.ct-find)');
// The rows of every group shown whole (B2's "Show all N" is display only, never a filter).
const rowIds = async (page) => { await expandAll(page); return page.$$eval(`${FIND} [data-find-row]`, (els) => els.map((e) => e.dataset.plantId).filter(Boolean).sort()); };
const toggle = async (page, id) => {
  const before = await rowIds(page);
  // A DOM click (pf-a v14: at 1280 Find is a panel in the page, which a pointer click scrolls under load).
  await page.$eval(`${FIND} [data-filter="${id}"]`, (b) => b.click());
  await page.waitForFunction((sel, n) => document.querySelectorAll(sel).length !== n, { timeout: 8000 }, `${FIND} [data-find-row]`, before.length).catch(() => {});
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
// Every group's "+ N more" pressed (pf-a N4: each group is a MoreList, the size rule), so each group
// lists all its plants (fix round 1, B2).
const expandAll = (page) => openMore(page, FIND);
// The start lists no plant (board Find, K3): "Every plant on the list" lists them all, a job chip
// (the filter column at 960) its plants, as a grower does.
// None judged (c1r5 W2), "Every plant" is already the choice: the start's "Show N plants" lists them.
const everyPlant = async (page) => {
  // pf-a BC23: the start has no "Show the N plants that fit"; choosing a fit (even the one in force) lists.
  await page.$eval(`${FIND} [data-filter="all"]`, (e) => e.click());
  await has(page, `${FIND} [data-find-row]`, 4000);
};
const byJob = async (page, job = 'feeds_you') => { await page.click(`${FIND} [data-filter="job"][data-value="${job}"]`); await has(page, `${FIND} [data-find-row]`, 4000); };
const visible = (page, sel) => page.$$eval(sel, (els) => els.some((e) => e.checkVisibility()));
// Find opened from the Next step's hole ("See all N plants"), as a grower opens it.
async function findFromHole(page) {
  // "See all N plants" (pf-a v14: the bulk row comes first in the card).
  assert.ok(await has(page, '.ct-next [data-next-seeall]', 10_000), 'the Next step names a hole');
  await page.click('.ct-next [data-next-seeall]');
  await hasFind(page);
}

// Find closed, then opened again plainly (no target), as a grower does from the palette.
async function reopenFind(page) {
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
  await openFind(page);
  await hasFind(page);
}

// Paste (h3 hand-off G3).
const PASTE = 'dialog[open] #ct-paste-text';
const ADD_ALL = 'dialog[open] .ct-paste-foot .button-primary';
// In one task: the box set to `text` (an input event), one frame (well inside the 200 ms pause), then
// Add's label and aria-disabled and the Recognised head (null with no Recognised group), so no reading
// lands between them; press: Add is then focused and pressed in the same task; watch (with press): then,
// still in that task, Add's label in every frame the reading line shows until "N names read" says the
// long text is read (c4 C2: the polling can never start after the slices land).
const typeThenRead = (page, text, { press = false, watch = null } = {}) => page.evaluate(async (add, sel, v, go, until) => {
  const el = document.querySelector(sel);
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => requestAnimationFrame(r));
  const b = document.querySelector(add);
  const out = { label: b.textContent.trim(), aria: b.getAttribute('aria-disabled'), head: document.querySelector('dialog[open] [data-paste-group="rec"] .ct-paste-ghead span')?.textContent.trim() ?? null };
  if (go) { b.focus(); b.click(); }
  if (until) {
    out.reading = [];
    for (let i = 0; i < 1800; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      if (document.querySelector('dialog[open] [data-paste-reading]')) out.reading.push(b.textContent.trim());
      if (new RegExp(until).test(document.querySelector('dialog[open] [data-paste-count]')?.textContent ?? '')) break;
    }
  }
  return out;
}, ADD_ALL, PASTE, text, press, watch?.source ?? null);
// Add refused (nothing to add): the focus stays on Add, aria-disabled, never natively disabled; nothing
// is added and the sheet stays open.
async function addRefused(page, size) {
  await frames(page);
  const add = await page.evaluate((sel) => { const b = document.querySelector(sel); return { focused: document.activeElement === b, disabled: b.disabled, aria: b.getAttribute('aria-disabled') }; }, ADD_ALL);
  assert.deepEqual(add, { focused: true, disabled: false, aria: 'true' }, 'Add keeps the focus, aria-disabled');
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), size, 'nothing added');
  assert.ok(await has(page, PASTE, 500), 'the sheet stays open');
}
const nonsense = (n, from = 0) => Array.from({ length: n }, (_, i) => `qzx${from + i}vk`);
const openPaste = async (page) => {
  await page.evaluate(() => window.__ctTest.store.openSheet('paste'));
  assert.ok(await has(page, PASTE, 15_000), 'Paste opens');
};
const countSays = (page, re, timeout = 20_000) => page.waitForFunction((r) => new RegExp(r).test(document.querySelector('dialog[open] [data-paste-count]')?.textContent.replace(/\s+/g, ' ') ?? ''), { timeout }, re.source).then(() => true, () => false);
// A question's choices (its [role="group"], by the line's name): each chip's words, its common name
// (the chip less its tick, scientific name and fit) and whether it shows the scientific name.
const chipsOf = (page, line) => page.$$eval('dialog[open] [role="group"]', (gs, n) => {
  const g = gs.find((x) => (x.getAttribute('aria-label') ?? '').includes(`“${n}”`));
  return [...(g?.querySelectorAll('button[aria-pressed]') ?? [])].map((b) => {
    const c = b.cloneNode(true);
    for (const x of c.querySelectorAll('.ct-sci, .ct-paste-fit, svg')) x.remove();
    return { text: b.textContent.replace(/\s+/g, ' ').trim(), name: c.textContent.replace(/\s+/g, ' ').trim(), sci: !!b.querySelector('.ct-sci'), on: b.getAttribute('aria-pressed') === 'true' };
  });
}, line);
// M25: a chip shows its scientific name only when another choice of its question has the same name;
// two chips of one question never read the same.
const chipRule = (chips) => {
  const plants = chips.filter((c) => c.name !== en['consortium.paste.choiceNone']);
  for (const c of plants) {
    const shared = plants.filter((x) => x.name === c.name).length > 1;
    assert.equal(c.sci, shared, `"${c.text}": the scientific name ${shared ? 'beside a shared name' : 'left out of a name of its own'}`);
  }
  assert.equal(new Set(plants.map((c) => c.text)).size, plants.length, `no two chips read the same (${plants.map((c) => c.text).join(' | ')})`);
};

// ---- F1a filters restored (P5.1) ----

// pf-a BC9 (boards FillHole, HoleOpen): a hole's sheet has no filters; it lists the plants that fill the
// hole and fit or need a second look, the outside ones behind "Show N outside their climate range".
test('F1a-F1 → PP-C (c1 Lyon food forest, P5.1): Find opened from a hole lists what fits, the outside plants behind their link', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await findFromHole(page);
  const shown = await rowIds(page);
  const levels = await page.evaluate((ids) => { const v = window.__ctTest.store.poolVerdicts.value; return ids.map((id) => v?.get(id)?.level ?? 'unknown'); }, shown);
  assert.ok(shown.length > 0, 'the hole\'s plants are listed');
  assert.ok(!levels.includes('outside'), `no plant outside its range before "Show N outside" (${levels.join(', ')})`);
  assert.equal(await page.$(`${FIND} [data-filter]`), null, 'no filter in a hole\'s sheet');
});

test('F1a-F2 → PP-C (c1 Seville dry garden, P5.1 A14): "Holds up in the future climate" changes the plants offered', async () => {
  const page = await suggestedAt('seville', 'Mediterranean');
  await openFind(page);
  await hasFind(page);
  await everyPlant(page);
  const before = await toggle(page, 'holds');
  assert.notDeepEqual(await rowIds(page), before, '"Holds up" changes the pick at Seville');
});

// pf-a commit 0: "Has edible parts" and Life went with v13 (v14 spec section 2 pf-a, Delete); the
// Nairobi scenario keeps its row through the size and "When it stands" filters.
test('F1a-F3 → PP-C (c1 Nairobi smallholding, P5.1 A14): a size and a time span narrow the plants offered', async () => {
  const page = await suggestedAt('nairobi', 'Subtropical');
  await openFind(page);
  await hasFind(page);
  await everyPlant(page);
  const all = await toggle(page, 'size');
  const small = await rowIds(page);
  assert.ok(small.length && small.length < all.length, `a size narrows the list (${small.length} of ${all.length})`);
  await toggle(page, 'stands');
  const both = await rowIds(page);
  assert.ok(both.length <= small.length && both.every((id) => small.includes(id)), 'a time span narrows it further');
});

test('F1a-F4 → PP-C (c1 unknowns as counts, P5.1): a filter that cannot judge some plants says how many, never hides them silently', async () => {
  const page = await suggestedAt('seville', 'Mediterranean');
  await openFind(page);
  await hasFind(page);
  await everyPlant(page); // every row shown
  await toggle(page, 'size'); // its first chip, "Under 2 m tall" (pf-a commit 0: "Has edible parts" went with v13)
  const n = await page.$eval(`${FIND} [data-filter-unknown="size"]`, (e) => /\d+ not recorded/.test(e.textContent)).catch(() => false);
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

// PP-C3 (Select several) dropped in pf-a commit 0: the v14 review removed "Select several" from the Add
// sheet (one-tap add, the sheet stays open); PFA rows in consortium-pf-a.browser.test.mjs carry the burst.

test('PP-C4 (c1 inform, don\'t block): an invasive plant and a plant outside its range are each added with one tap, the warning in words, no confirm step', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  // Not a member (since R3 Lyon's map pH is a known soil answer, which can bring Robinia into the suggestion).
  await page.evaluate(() => {
    const { store } = window.__ctTest;
    const rob = store.pools.value.Temperate.find((t) => t.canonical_name === 'Robinia pseudoacacia').id;
    store.members.value = store.members.value.filter((x) => x !== rob);
    store.country.value = { code: 'FR', source: 'chosen' };
  });
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
  // pf-a v14 (DeskStates, Q4): at 1280 the message shows in the page, bottom left, beside the Find panel.
  assert.ok(await has(page, `.ct-toast ${aria('button', en['consortium.undo'])}`, 2000), 'with Undo');
});

test('PP-C7 (c1 FillHole): a hole opens Find titled by the hole, best fit first; "+ Add" turns to "Added", a result line with Undo, "Show N outside their climate range", Done; on a dry, shady spot each hole lists what "See all N" counts, the site misfits under "look", never hidden', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  assert.ok(await has(page, '.ct-next-hole', 10_000), 'the Next step names a hole');
  const words = await page.$eval('.ct-next-hole', (e) => e.textContent.trim()).catch(() => null);
  const label = await page.$eval('.ct-next [data-next-seeall]', (e) => e.textContent.trim()).catch(() => '');
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
  // pf-a BC3: "See all N" counts what Find lists before the outside ones unfold (fits, second looks, unchecked).
  assert.equal((await rowIds(page)).length, n, `"${label}" counts the plants Find lists before "Show N outside"`);
  if (folded) await showOutside.click();
  assert.equal((await rowIds(page)).length, n + folded, 'the outside ones join the list once shown');
  // "Show N outside their climate range" (c1: the hole's fillers outside their range, folded behind
  // it; at Lyon's first hole there may be none, so it is checked against the rows it unfolds):
  // shown exactly when some are outside, N of them.
  assert.equal(folded, await page.$$eval(`${FIND} [data-find-group="outside"] [data-find-row]`, (els) => els.length), '"Show N outside their climate range" folds exactly the plants outside');
  const first = `${FIND} [data-find-group="fits"] [data-find-row]:first-of-type`;
  await page.click(`${first} [data-find-add]`);
  assert.ok(await page.$(`${first} [data-find-add][data-added]`), '"+ Add" turns to "Added"');
  // pf-a v14 (DeskStates, Q4): at 1280 the message shows in the page, bottom left, beside the Find panel.
  assert.ok(await has(page, `.ct-toast ${aria('button', en['consortium.undo'])}`, 2000), 'a result line with Undo');
  await page.click(`${FIND} ${aria('button', 'Done')}`);
  assert.equal(await page.$('dialog[open]'), null, 'Done closes Find');
  // PP-B34's shady spot (review c0 round 2, 5a; a dry site waits for watering's rule, F4): for up to 6 holes, Find lists exactly what "See
  // all N" counts once the outside ones are shown, and every site misfit (verdict level 'look') sits
  // in [data-find-group="look"], listed, never hidden.
  await page.evaluate(() => { const { store } = window.__ctTest; store.siteEdits.value = { light: 'shade' }; store.hideToast(); });
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value && document.querySelector('.ct-next')?.dataset.hole, { timeout: 10_000 });
  // pf-a v14: "Not now" always shows; "See all N" only when some plant fits or needs a second look.
  for (let i = 0; i < 6 && await page.$('.ct-next[data-hole] .ct-next-actions .button'); i++) {
    const hole = await page.$eval('.ct-next-hole', (e) => e.textContent.trim());
    if (!await page.$('.ct-next [data-next-seeall]')) { await page.click(`.ct-next-actions ${aria('button', en['consortium.palette.notNow'])}`); continue; }
    const count = Number(/\d+/.exec(await page.$eval('.ct-next [data-next-seeall]', (e) => e.textContent.trim()))?.[0] ?? 1); // "See the plant": one
    await findFromHole(page);
    const more = await page.evaluateHandle((sel) => [...document.querySelectorAll(`${sel} button`)].find((x) => /outside/i.test(x.textContent)) ?? null, FIND);
    const hidden = await more.evaluate((x) => (x ? Number(/\d+/.exec(x.textContent)?.[0] ?? NaN) : 0));
    assert.equal((await rowIds(page)).length, count, `${hole}: Find lists what "See all ${count}" counts (pf-a BC3: the outside ones folded)`);
    if (hidden) await more.click();
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
test('PP-C41 (c1 fix A1 hits kept out are counted): in the palette, hidden by a filter, outside a thin job\'s plants: each said with its way out, never "No plant answers"', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const pick = await page.evaluate(() => {
    const { store } = window.__ctTest, m = new Set(store.members.value);
    const member = store.memberTaxa.value[0]?.canonical_name;
    const plain = store.pool.value.find((t) => !m.has(t.id) && (t.traits.height_m?.max ?? 0) > 2)?.canonical_name;
    return { member, plain };
  });
  assert.ok(pick.member && pick.plain, 'a member and a plant taller than 2 m');
  await openFind(page);
  await hasFind(page);
  await search(page, pick.member);
  assert.equal(await page.$(`${FIND} [data-find-none]`), null, 'a member is no "No plant answers"');
  assert.ok(await page.$(`${FIND} [data-find-inpalette] [data-find-row] [data-find-add][data-added]`), 'the member is a row marked Added, in the palette');
  assert.equal(await page.$(`${FIND} a[data-find-ask]`), null, 'no "Ask us to add" for a plant the release holds');
  await search(page, pick.plain);
  await toggle(page, 'size'); // "Under 2 m tall" (pf-a commit 0: "Has edible parts" went with v13)
  assert.equal(await page.$(`${FIND} [data-find-none]`), null, 'hidden by a filter is no "No plant answers"');
  assert.match(await page.$eval(`${FIND} [data-find-hidden-filters]`, (e) => e.textContent).catch(() => ''), /^1 hidden by your filters/, '"1 hidden by your filters"');
  await page.click(`${FIND} [data-find-hidden-filters] button`);
  assert.ok(await has(page, `${FIND} [data-find-row]`, 2000), 'Clear shows it');
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 });
  // A thin job's sheet (the Add sheet, with its search; a hole's sheet has none, BC9): a plant of the list
  // that does not do the job then.
  await findFromHole(page);
  await page.evaluate(() => { const { store } = window.__ctTest, t = store.sheetTarget.value; store.closeSheet(); store.openFind({ ...t, hole: { ...t.hole, thin: { have: 1 } } }); });
  await page.waitForFunction(() => !!document.querySelector('dialog[open] [data-find-search]'), { timeout: 8000 });
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
  // pf-a BC13: at 1280 Find is the panel beside the chart, its filters checkbox rows (the count in the label).
  const num = (sel) => page.$eval(sel, (e) => Number(/(\d+)\D*$/.exec((e.closest('label') ?? e).textContent.trim())?.[1] ?? NaN));
  const listed = async () => { await expandAll(page); return page.$$eval(`${FIND} [data-find-group] [data-find-row]`, (els) => els.length); };
  const chip = `${FIND} [data-filter="job"][data-value="ground"]`;
  const said = await num(chip);
  await page.$eval(chip, (e) => e.click());
  assert.equal(await listed(), said, `the chip said ${said}`);
  // The count line counts the rows the screen lists (c1r3 T14, c1r4 U2): the palette's plants folded
  // into a line of names are not rows; once "Show" lists them, they are.
  const countSays = async () => Number(/^(\d+) plants?\./.exec(await page.$eval(`${FIND} [data-find-count]`, (e) => e.textContent))?.[1] ?? NaN);
  assert.equal(await countSays(), said, 'the count line says what the chip said');
  assert.equal(await page.$eval(`${FIND} [data-find-filters-show]`, (e) => e.textContent.trim()), `Show ${said} plants`, '"Show N plants" says it too');
  const mine = await page.$eval(`${FIND} [data-find-inpalette-line]`, (e) => Number(/\d+/.exec(e.textContent)?.[0] ?? NaN));
  // A DOM click (M30): a pointer click scrolled the line under the panel's foot bar and pressed the bar.
  await page.$eval(`${FIND} [data-find-inpalette-line] button`, (e) => e.click());
  // The render the click asked for, then the line (a read straight after the click raced it).
  await page.waitForFunction((sel, n) => new RegExp(`^${n} plants?\\.`).test(document.querySelector(sel)?.textContent ?? ''), { timeout: 4000 }, `${FIND} [data-find-count]`, said + mine).catch(() => {});
  assert.equal(await countSays(), said + mine, 'with the palette\'s plants listed as rows, the count line counts them');
  const all = await page.$eval(`${FIND} [data-filter="all"]`, (i) => Number(/(\d+) plants?/.exec(i.closest('label').textContent)?.[1]));
  // (a DOM click: at 1280 the panel's foot bar, "N plants in your palette · Done" (pf-a N2), can sit over
  // the radio where the pointer would land)
  await page.$eval(`${FIND} [data-filter="all"]`, (e) => e.click());
  assert.equal(await listed(), all, `"Every plant on the list" said ${all}`);
  assert.match(await page.$eval(`${FIND} [data-find-count]`, (e) => e.textContent), /Best fit first/, 'ranked: "Best fit first"');
  const nowhere = await suggestedAt(null, 'Temperate');
  await openFind(nowhere);
  await hasFind(nowhere);
  await nowhere.click(`${FIND} [data-filter="all"]`);
  assert.doesNotMatch(await nowhere.$eval(`${FIND} [data-find-count]`, (e) => e.textContent), /Best fit first/, 'no location: no "Best fit first"');
});

// Fix round 1, B2 and B3 (board FindResults; conformance c1 #2, #3): plain Find folds the plants outside
// their range behind one counted button too, lists best first with the line saying so, and (pf-a N4,
// the size rule A14) each group past 12 rows is a count cell: three rows and "+ N more", then all.
test('PP-C42 (c1 fix B2+B3 best first, folded outside; pf-a N4 count cells): plain Find', async () => {
  const page = await plainFind();
  // A list, as a grower asks for one: Part shade and Shade (Lyon's one outside plant, Rubus tricolor, is Shade).
  for (const v of ['medium', 'low']) await page.click(`${FIND} [data-filter="light"][data-value="${v}"]`);
  assert.match(await page.$eval(`${FIND} [data-find-count]`, (e) => e.textContent).catch(() => ''), /^\d+ plants\. Best fit first/, 'the count line, then "Best fit first"');
  assert.equal(await page.$(`${FIND} [data-find-group="outside"]`), null, 'the outside plants are folded in plain Find');
  assert.ok(await page.$(`${FIND} [data-find-outside]`), '"Show N outside their climate range"');
  const total = await page.$eval(`${FIND} [data-find-group="fits"] h3`, (h) => Number(h.textContent.replace(/[^\d]/g, ' ').trim().split(/\s+/).pop()));
  const shown = await page.$$eval(`${FIND} [data-find-group="fits"] [data-find-row]`, (els) => els.length);
  assert.equal(shown, total > 12 ? 3 : total, `N4: three rows past 12, else all (${shown} of ${total})`);
  await expandAll(page);
  assert.equal(await page.$$eval(`${FIND} [data-find-group="fits"] [data-find-row]`, (els) => els.length), total, 'it lists them all');
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
  // pf-a BC26: one reason line says what it does and when; the years are not said again under it.
  const reason = await page.$eval(`${first} [data-find-fills]`, (e) => e.textContent).catch(() => '');
  assert.match(reason, /year|month|days/i, `its years, in its reason line (${reason})`);
  assert.doesNotMatch(meta, /\byear \d|\bmonth \d|first year/i, `the years said once (${meta})`);
  await reopenFind(page);
  await everyPlant(page);
  const out = `${FIND} [data-find-group="outside"] [data-find-row]`;
  assert.ok(await has(page, out, 4000), 'an outside row');
  assert.match(await page.$eval(`${out} [data-find-add]`, (b) => b.textContent), /Add anyway/, '"Add anyway"');
  assert.match(await page.$eval(`${FIND} [data-find-group="outside"]`, (e) => e.textContent), /your ground and your call/, 'the warning stays: your call (FindNone board words)');
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
  // pf-a BC23 (board Find): the subtitle is the climate then the place's count line (the whole list,
  // store.countFits), "Temperate · 205 of the 230 plants on the Temperate list fit your place today".
  const place = await page.evaluate(() => { const c = window.__ctTest.store.countFits.value; return c.fits + c.look; });
  assert.match(await page.$eval(`${FIND} [data-find-fitcount]`, (e) => e.textContent).catch(() => ''), new RegExp(`^Temperate · ${place} of the \\d+ plants .* fit your place today$`), '"<climate> · N of the M plants … fit your place today", the place line');
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
  for (const id of ['size', 'life-cycle', 'light', 'job']) assert.ok(await page.$$eval(`${FIND} [data-filter="${id}"]`, (els) => els.every((e) => /\d$/.test((e.closest('label') ?? e).textContent.trim()))), `${id} chips carry counts`);
  await page.$eval(`${FIND} [data-filter="size"][data-value="small"]`, (e) => e.click());
  assert.ok(await has(page, `${FIND} [data-find-active] [data-active-chip]`, 2000), 'the active filter as a chip under the search');
  await page.click(`${FIND} [data-find-active] [data-active-chip]`);
  assert.equal(await page.$(`${FIND} [data-filter="size"][data-value="small"]:is([aria-pressed="true"], :checked)`), null, 'its × removes it');
  const ph = await page.$eval(`${FIND} [data-find-search]`, (i) => i.placeholder);
  assert.equal(ph, 'Name in any language, or a job', `pf-a BC23: the board's placeholder (${ph})`);
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
test('PP-C46 (c1 fix B14 typo rows; the B9 switch went with "Select several", pf-a commit 0)', async () => {
  const page = await plainFind();
  await byJob(page);
  assert.equal(await page.$(`${FIND} [data-find-mode]`), null, 'no "Select several" switch');
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

// Fix round 1, B10 and B11 (board Paste; conformance c1 #13, #14), retargeted on the v14 three-group
// Paste (h3 M26): Paste opened from Find reads the paste into Recognised, Need a choice and Not found,
// each group in the paste's order, with "N names read" and its parts; a plural common name asks
// "Which …?" ("N plants are called …"), a plant outside its range says so on its row, the note says
// plants come with their warnings, and Cancel goes back to Find with the focus on "Paste a list".
test('PP-C47 (c1 fix B10+B11 Paste as the board, v14 groups): the three groups in pasted order, "N names read" and its parts, Which …?, range warning, note, Cancel back to Find', async () => {
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
  const group = (id) => page.$$eval(`dialog[open] [data-paste-group="${id}"] [data-paste-row]`, (els) => els.map((e) => e.textContent));
  const rec = await group('rec'), ask = await group('choose'), none = await group('none');
  assert.deepEqual(rec.map((t) => [pick.member, pick.outside].findIndex((l) => t.startsWith(`“${l}”`))), [0, 1], 'Recognised: the palette\'s plant, then the outside one, in the paste\'s order');
  assert.match(rec[0], /in your palette/, 'the palette\'s plant says so');
  assert.match(rec[1], /Outside its climate range/, 'the range warning on its row');
  assert.equal(ask.length, 1);
  assert.match(ask[0], new RegExp(`^“${pick.plural}” Which ${pick.plural.slice(0, -1)}\\? \\d+ plants are called ${pick.plural.slice(0, -1)}\\.`), `"${pick.plural}": Which …? (its singular)`);
  assert.equal(none.length, 1);
  assert.match(none[0], /^“zzqx not a plant” Not found\./, 'the line no plant answers says so');
  assert.match(await page.$eval('dialog[open] [data-paste-count]', (e) => e.textContent.replace(/\s+/g, ' ').trim()), /^4 names read 2 recognised, 1 needs a choice, 1 not found$/, 'the count of names read and its parts');
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
  // pf-a BC23: no "Show the N plants that fit" at the start; choosing "Fits your place" lists them.
  assert.equal(await page.$(`${FIND} [data-find-list]`), null, 'no "Show the N plants that fit"');
  await page.click('aria/Filters[role="button"]');
  const n = await page.$eval(`${FIND} [data-filter="fits"]`, (i) => /(\d+) plants?/.exec(i.closest('label').textContent)?.[1]);
  await page.$eval(`${FIND} [data-filter="fits"]`, (e) => e.click());
  await page.click(`${FIND} [data-find-filters-show]`);
  assert.ok(await visible(page, `${FIND} [data-find-row]`), 'the plants are listed');
  assert.match(await page.$eval(`${FIND} [data-find-count]`, (e) => e.textContent), new RegExp(`^${n} plants\\.`), 'the count line says the same');
  await reopenFind(page);
  await page.click('aria/Filters[role="button"]');
  await page.click(`${FIND} [data-find-filters-show]`);
  assert.ok(await visible(page, `${FIND} [data-find-row]`), '"Show N plants" lists them');
});

// c1r3 T2, T12, T13, T16 (review c1r3-02; Chrome K11, K12, K17): Paste reads the list at once on "Read the
// list"; a choice names each plant with its scientific name; a name pasted twice is one row, said so; a
// mark is Find's short pill.
test('PP-C51 (c1 r3 T2+T12+T13+T16; h3 M25, M26): Paste: Read the list, choices with a scientific name only where two share a name, listed twice, short marks', async () => {
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
  const intro = await page.$eval('dialog[open]', (e) => e.textContent);
  assert.ok(intro.includes(en['consortium.find.pasteIntro']), 'the board\'s intro (v14: every line is read)');
  assert.doesNotMatch(intro, /first 200 lines/, 'no cap said (v14 pf-e)');
  await page.$eval('dialog[open] #ct-paste-text', (t, v) => { t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); }, [pick.tox, pick.plural, pick.tox.toLowerCase()].join('\n'));
  await page.click('dialog[open] [data-paste-read]');
  const rows = await page.$$eval('dialog[open] [data-paste-row]', (els) => els.map((e) => e.textContent));
  assert.equal(rows.length, 2, 'a name pasted twice is one row');
  assert.match(rows[0], /listed twice, counted once/, 'said on its row');
  assert.match(rows[0], /toxic/i, 'its toxic mark');
  assert.doesNotMatch(rows[0], /toxicity records/, 'the short pill, not the sentence');
  await openMore(page);
  const chips = await chipsOf(page, pick.plural);
  assert.ok(chips.length >= 2, 'the premise: a question with its choices');
  chipRule(chips);
});

// c1r4 U5 (Chrome T6, board FindResults): at phone width the "Needs a second look" heading is one line
// of text that wraps back under its start, its count and why in the regular weight.
test('PP-C55 (c1 r4 U5): the second-look heading wraps as one line at 390 px, its why in the regular weight', async () => {
  const page = await suggestedAt('lyon', 'Temperate', { width: 390 });
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  await openFind(page);
  await hasFind(page);
  await page.$eval(`${FIND} [data-filter="fits"]`, (e) => e.click()); // pf-a BC23: the fit choice lists
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
  // c1r5 W2: none judged, the plants are listed under "Every plant", in their "Not checked" group
  // (pf-a BC23: no start button; the choice in force lists them when chosen).
  assert.equal(await page.$eval(`${FIND} [data-filter="all"]`, (i) => i.checked), true, '"Every plant" is the choice in force');
  await page.$eval(`${FIND} [data-filter="all"]`, (e) => e.click());
  assert.ok(await has(page, `${FIND} [data-find-group="unchecked"] [data-find-row]`, 4000), 'the plants listed under "Not checked"');
  assert.match(await page.$eval(`${FIND} [data-find-count]`, (e) => e.textContent), new RegExp(`^${/^\d+/.exec(sub)[0]} plants\\.`), 'the count line says the same number');
});

// c1r5 W2: one rule for "fits". With some plants not checked (no range recorded) among judged ones,
// "Fits your place" lists only the plants judged to fit or to need a second look, and its label, the
// subtitle, the start's button and the count line say that number; the unchecked plants are listed
// under "Every plant", in their "Not checked" group.
test('PP-C56 (c1 r5 W2): "Fits your place" lists and counts only judged plants; the unchecked ones under "Every plant"', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await page.waitForFunction(() => window.__ctTest.store.poolVerdicts.value, { timeout: 10_000 });
  // Three plants with no climate range recorded (state no control makes): never judged.
  const blank = await page.evaluate(() => {
    const { store } = window.__ctTest, m = new Set(store.members.value);
    const picked = store.pool.value.filter((t) => !m.has(t.id)).slice(0, 3);
    for (const t of picked) t.climate = null;
    store.location.value = { ...store.location.value };
    return picked.map((t) => t.id);
  });
  await page.waitForFunction((ids) => { const v = window.__ctTest.store.poolVerdicts.value; return v && ids.every((id) => !['fits', 'look', 'outside'].includes(v.get(id)?.level)); }, { timeout: 10_000 }, blank);
  await openFind(page);
  await hasFind(page);
  // The place line counts the judged plants only (pf-a BC23: the subtitle is that line, the whole list).
  const place = await page.evaluate(() => { const c = window.__ctTest.store.countFits.value; return c.fits + c.look; });
  assert.match(await page.$eval(`${FIND} [data-find-fitcount]`, (e) => e.textContent), new RegExp(`· ${place} of the`), 'the subtitle says the place line\'s number');
  const n = await page.evaluate(({ ids, members }) => { const { store } = window.__ctTest, v = store.poolVerdicts.value, m = new Set(store.members.value); return store.pool.value.filter((t) => !m.has(t.id) && ['fits', 'look'].includes(v.get(t.id)?.level)).length; }, { ids: blank });
  assert.match(await page.$eval(`${FIND} [data-filter="fits"]`, (i) => i.closest('label').textContent), new RegExp(`\\D${n} plants`), '"Fits your place" says N');
  await page.$eval(`${FIND} [data-filter="fits"]`, (e) => e.click());
  assert.ok(await has(page, `${FIND} [data-find-row]`, 4000), 'the plants are listed');
  assert.match(await page.$eval(`${FIND} [data-find-count]`, (e) => e.textContent), new RegExp(`^${n} plants\\.`), 'the count line says N');
  const rows = await rowIds(page);
  assert.equal(await page.$(`${FIND} [data-find-group="unchecked"]`), null, 'no "Not checked" group under "Fits your place"');
  assert.ok(blank.every((id) => !rows.includes(id)), 'the unchecked plants are not listed as fitting');
  assert.equal(rows.length, Number(n), 'the rows are the N plants (the outside ones folded)');
  await page.click(`${FIND} [data-filter="all"]`);
  await expandAll(page);
  const unchecked = await page.$$eval(`${FIND} [data-find-group="unchecked"] [data-find-row]`, (els) => els.map((e) => e.dataset.plantId));
  assert.deepEqual(unchecked.sort(), [...blank].sort(), 'under "Every plant" they are listed, under "Not checked"');
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
test('PP-C53 (c1 r4 U4+U6; v14, h3 M26): Paste: "chesnut", in the palette, leads Recognised as "in your palette · Read as …"; "rosmary" on another list asks as a close spelling', async () => {
  const page = await tool({ data: 'fixture' });
  await choose(page, 'Temperate');
  await page.evaluate(() => { const { store } = window.__ctTest; store.addMembers([store.pool.value.find((t) => t.canonical_name === 'Castanea sativa').id]); });
  await page.evaluate(() => window.__ctTest.store.openSheet('paste'));
  assert.ok(await has(page, '#ct-paste-text', 4000), 'Paste opens');
  await page.locator('#ct-paste-text').fill('rosmary\nchesnut');
  await page.click('dialog[open] [data-paste-read]');
  assert.ok(await has(page, 'dialog[open] [data-paste-row]', 4000), 'the list is read');
  const rows = await page.$$eval('dialog[open] [data-paste-row]', (els) => els.map((e) => ({ text: e.textContent, mark: e.querySelector('[data-status]')?.dataset.status, group: e.closest('[data-paste-group]')?.dataset.pasteGroup })));
  assert.deepEqual(rows.map((r) => [r.text.match(/^“([^”]+)”/)?.[1], r.group, r.mark]), [['chesnut', 'rec', 'already'], ['rosmary', 'choose', 'choose']], 'Recognised first, then Need a choice (the question mark ⓘ, not ✓)');
  assert.match(rows[0].text, /in your palette/i, 'European chestnut is in the palette');
  assert.match(rows[0].text, /Read as European chestnut/, `already in the palette, the reading said (${rows[0].text})`);
  assert.match(rows[1].text, /Read as Rosemary/, `on another list, the close spelling asked (${rows[1].text})`);
  assert.ok(await page.$$eval('dialog[open] [data-paste-group="choose"] button[aria-pressed]', (bs) => bs.some((b) => /Read as Rosemary/.test(b.textContent))), 'its choice "Read as Rosemary" to press');
});

// c1r3 T6, T18, T20 (Chrome K1, N4, N6): a job list names the palette's plants that do the job with
// "Show"; a roles list is lower case after its first word; the second-look group says why.
test('PP-C52 (c1 r3 T6+T18+T20, r4 U7): In your palette on a job list, roles in lower case without the job, why a second look', async () => {
  const page = await plainFind();
  assert.ok(await page.evaluate(() => window.__ctTest.store.memberTaxa.value.some((t) => t.role === 'crop')), 'the palette holds a food plant');
  await byJob(page, 'feeds_you');
  const line = await page.$eval(`${FIND} [data-find-inpalette-line]`, (e) => e.textContent).catch(() => '');
  // pf-a BC13 (board FindDesk): "In your palette N" a heading, the names under it with Show.
  assert.match(line, /^In your palette \d+\s*.+ · Show$/, `"In your palette N", then "names · Show" (${line})`);
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

// ---- h3 hand-off (G3: M23, M24, M25) ----

test('PP-C58 (c1 h3 M23, pf-e#1, #4): past 200 names each "Add anyway" adds at once: two plants of another list are both added in turn, the focus on the next row\'s "Add anyway"', { timeout: 120_000 }, async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const two = await realDb((db) => db.prepare("SELECT p.canonical_name c FROM plants p WHERE EXISTS (SELECT 1 FROM placements x WHERE x.plant = p.plant AND x.climate_zone = 'Tropical') AND NOT EXISTS (SELECT 1 FROM placements x WHERE x.plant = p.plant AND x.climate_zone = 'Temperate') ORDER BY p.canonical_name LIMIT 2").all().map((r) => r.c));
  const guests0 = await page.evaluate(() => Object.keys(window.__ctTest.store.guests.value).length);
  await openPaste(page);
  await typeIn(page, PASTE, [...nonsense(299), two[0], ...nonsense(299, 299), two[1]].join('\n'));
  await page.click('dialog[open] [data-paste-read]');
  assert.ok(await countSays(page, /^600 names read/), 'the premise: the 600 names read');
  const anyway = (i) => page.evaluate((label, k) => [...document.querySelectorAll('dialog[open] [data-paste-row] button')].filter((b) => b.textContent.trim() === label)[k]?.click(), en['consortium.addAnyway'], i);
  // h3 r1 R4 (W4): the row turns to "in your palette" as the plant joins, while the re-read of the same
  // text is still under way: every frame from the add on, no "Add anyway" left on it.
  await page.evaluate((n, label, k) => {
    const seen = window.__r4 = { frames: 0, button: 0, text: '' };
    const tick = () => {
      if (Object.keys(window.__ctTest.store.guests.value).length >= k) {
        const r = [...document.querySelectorAll('dialog[open] [data-paste-row]')].find((e) => e.textContent.startsWith(`“${n}”`));
        seen.frames++; seen.text = r?.textContent ?? '';
        if ([...(r?.querySelectorAll('button') ?? [])].some((b) => b.textContent.trim() === label)) seen.button++;
      }
      if (seen.frames < 30) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, two[0], en['consortium.addAnyway'], guests0 + 1);
  await anyway(0);
  assert.ok(await page.waitForFunction((k) => Object.keys(window.__ctTest.store.guests.value).length === k, { timeout: 8000 }, guests0 + 1).then(() => true, () => false), `"${two[0]}" added`);
  await page.waitForFunction(() => window.__r4.frames >= 30, { timeout: 8000 });
  const row0 = await page.evaluate(() => window.__r4);
  assert.match(row0.text, /in your palette/i, `"${two[0]}" says it is in your palette (${row0.text})`);
  assert.equal(row0.button, 0, `"${two[0]}" keeps no "Add anyway" in any frame after the add`);
  const next = (name) => page.waitForFunction((label, n) => { const a = document.activeElement; return a?.textContent.trim() === label && a.closest('[data-paste-row]')?.textContent.startsWith(`“${n}”`); }, { timeout: 4000 }, en['consortium.addAnyway'], name).then(() => true, () => false);
  assert.ok(await next(two[1]), `the focus on "${two[1]}"'s "Add anyway"`);
  // The grower presses it at once (the re-read the first add started still under way).
  await page.evaluate(() => document.activeElement.click());
  assert.ok(await page.waitForFunction((k) => Object.keys(window.__ctTest.store.guests.value).length === k, { timeout: 8000 }, guests0 + 2).then(() => true, () => false), `"${two[1]}" added too: no add waits on a re-read of the same text`);
});

test('PP-C59 (c1 h3 M23, pf-e#6): "Add" pressed within 200 ms of an edit adds once the reading lands (300 names, read in slices); nothing is lost', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const plant = await page.evaluate(() => { const s = window.__ctTest.store, m = new Set(s.members.value), t = s.pool.value.find((x) => !m.has(x.id)); return { id: t.id, name: t.canonical_name }; });
  await openPaste(page);
  await typeIn(page, PASTE, [...nonsense(299), plant.name].join('\n'));
  await page.$eval(ADD_ALL, (b) => b.click());
  assert.ok(await page.waitForFunction((id) => window.__ctTest.store.members.value.includes(id), { timeout: 20_000 }, plant.id).then(() => true, () => false), `"${plant.name}" added once its reading lands`);
});

test('PP-C60 (c1 h3 M23, pf-e#4): a reading with nothing to add keeps the focus on Add (aria-disabled, never a native disabled that drops it)', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const size = await page.evaluate(() => window.__ctTest.store.members.value.length);
  await openPaste(page);
  await typeIn(page, PASTE, 'zzqx not a plant');
  await page.$eval(ADD_ALL, (b) => { b.focus(); b.click(); });
  assert.ok(await countSays(page, /^1 name read/), 'the premise: the line is read');
  await addRefused(page, size);
});

// The first choice of the question on `line` pressed, then "1 chosen, 1 to go." (`premise`).
async function answerFirst(page, line, premise) {
  await page.$$eval('dialog[open] [role="group"]', (gs, n) => gs.find((g) => (g.getAttribute('aria-label') ?? '').includes(`“${n}”`)).querySelector('button[aria-pressed]').click(), line);
  assert.ok(await page.waitForFunction(() => /^1 chosen, 1 to go\./.test(document.querySelector('dialog[open] .ct-paste-progress')?.textContent ?? ''), { timeout: 4000 }).then(() => true, () => false), premise);
}

// The question on `line` asks again: no choice pressed, "0 chosen, 2 to go." (`counted`).
async function asksAgain(page, line, why, counted) {
  assert.deepEqual((await chipsOf(page, line)).filter((c) => c.on).map((c) => c.text), [], `"${line}" asks again${why}`);
  assert.match(await page.$eval('dialog[open] .ct-paste-progress', (e) => e.textContent), /^0 chosen, 2 to go\./, counted);
}

// Select all, then one input of `inputType` puts `v` over the whole text (the browser's beforeinput,
// then input).
const replaceAll = (page, v, inputType) => page.$eval(PASTE, (el, x, type) => {
  el.focus(); el.select();
  el.dispatchEvent(new InputEvent('beforeinput', { inputType: type, bubbles: true, cancelable: true }));
  el.value = x;
  el.dispatchEvent(new InputEvent('input', { inputType: type, bubbles: true }));
}, v, inputType);

// Two genera of two plants or more pasted and read, the first answered ("1 chosen, 1 to go").
async function genusAnswered(page) {
  const genera = await page.evaluate(() => {
    const s = window.__ctTest.store, m = new Set(s.members.value), by = new Map();
    for (const t of s.pool.value) { const g = t.canonical_name.split(' ')[0]; by.set(g, [...(by.get(g) ?? []), t]); }
    return [...by].filter(([, ts]) => ts.length >= 2 && ts.every((t) => !m.has(t.id))).map(([g]) => g).slice(0, 2);
  });
  assert.equal(genera.length, 2, 'the premise: two genera of two plants or more');
  await openPaste(page);
  await typeIn(page, PASTE, genera.join('\n'));
  await page.click('dialog[open] [data-paste-read]');
  assert.ok(await countSays(page, /^2 names read/), 'the first list read');
  await answerFirst(page, genera[0], 'the premise: one answered');
  return genera;
}

test('PP-C61 (c1 h3 M24, pf-e#3): a select-all paste of a new list forgets the last list\'s answers: the same line asks again, counted in "N to go"', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const genera = await genusAnswered(page);
  // Select all, paste a second list naming the same genus (the browser's beforeinput, then input).
  await replaceAll(page, `${genera[0]}\n${genera[1]}\nzzqx not a plant`, 'insertFromPaste');
  assert.ok(await countSays(page, /^3 names read/), 'the second list read');
  await asksAgain(page, genera[0], ': no choice pressed for the new list', 'counted in "N to go"');
  // h3 r1 R2: select all, delete, then paste within the 200 ms pause (the paste lands on an empty box):
  // the box went empty, a new list, so the answer is forgotten too.
  await answerFirst(page, genera[0], 'the premise: one answered again');
  await page.$eval(PASTE, (el, v) => {
    el.focus(); el.select();
    el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteContentBackward', bubbles: true, cancelable: true }));
    el.value = '';
    el.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true }));
    el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertFromPaste', bubbles: true, cancelable: true }));
    el.value = v;
    el.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', bubbles: true }));
  }, `${genera[0]}\n${genera[1]}`);
  assert.ok(await countSays(page, /^2 names read/), 'the third list read');
  await asksAgain(page, genera[0], ' after the delete and the paste', 'counted in "N to go" again');
});

test('PP-C61b (c1 h3 M24, c4 C3 r2 R1.1): a new list typed over the whole old one (select all, then keys; an IME composing over it) forgets the last list\'s answers, as a paste does', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const genera = await genusAnswered(page);
  // Select all, then type the same names by hand: the first key replaces the whole text (insertText),
  // the box is never empty.
  await page.$eval(PASTE, (el) => { el.focus(); el.select(); });
  await page.keyboard.type(`${genera[0]}\n${genera[1]}\nzzqx not a plant`);
  assert.ok(await countSays(page, /^3 names read/), 'the typed list read');
  await asksAgain(page, genera[0], ': no choice pressed for the typed list', 'counted in "N to go"');
  // An IME (or dictation) composing over the whole selection is a new list too.
  await answerFirst(page, genera[0], 'the premise: one answered again');
  await replaceAll(page, `${genera[0]}\n${genera[1]}`, 'insertCompositionText');
  assert.ok(await countSays(page, /^2 names read/), 'the composed list read');
  await asksAgain(page, genera[0], ' after the composition', 'counted in "N to go" after the composition');
  // A key typed inside the list (not over all of it) keeps the answers (c4 R2).
  await answerFirst(page, genera[0], 'the premise: answered once more');
  await page.$eval(PASTE, (el) => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); });
  await page.keyboard.type('\nzzqx');
  assert.ok(await countSays(page, /^3 names read/), 'the edited list read');
  assert.match(await page.$eval('dialog[open] .ct-paste-progress', (e) => e.textContent), /^1 chosen, 1 to go\./, 'a key at the end keeps the answer');
});

test('PP-C62 (c1 h3 M25, pf-e#51; boards Paste, AddMany): "Which bean?" offers Common bean and Lima bean without their scientific names; a name several plants share ("sword bean": the release\'s two Sword beans, as board AddMany\'s Spanish cedars) gives each its scientific name; no two chips read the same', async () => {
  const page = await loadCase('kiambu-8', { width: 390 });
  await openPaste(page);
  await typeIn(page, PASTE, 'beans\nsword bean');
  await page.click('dialog[open] [data-paste-read]');
  assert.ok(await countSays(page, /^2 names read/), 'the list read');
  await openMore(page);
  const beans = await chipsOf(page, 'beans'), swords = await chipsOf(page, 'sword bean');
  for (const n of ['Common bean', 'Lima bean']) assert.deepEqual(beans.filter((c) => c.name === n).map((c) => c.sci), [false], `board Paste: "${n}" alone`);
  chipRule(beans);
  const named = swords.filter((c) => c.name === 'Sword bean');
  assert.ok(named.length >= 2, `the premise: several Sword beans (${swords.map((c) => c.text).join(' | ')})`);
  assert.ok(named.every((c) => c.sci), 'board AddMany: each with its scientific name');
  chipRule(swords);
});

// ---- h3 fix round 1 (G3: R1, R3, R5) ----

test('PP-C63 (c1 h3 r1 R1): "Add" pressed while a long list reads, then one more line typed: the press is cancelled, nothing is added and the sheet stays open', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const plant = await page.evaluate(() => { const s = window.__ctTest.store, m = new Set(s.members.value), t = s.pool.value.find((x) => !m.has(x.id)); return { id: t.id, name: t.canonical_name }; });
  const size = await page.evaluate(() => window.__ctTest.store.members.value.length);
  await openPaste(page);
  const list = [...nonsense(299), plant.name].join('\n');
  await typeIn(page, PASTE, list);
  // The grower edits before the reading lands (in the same task as the press, so it cannot land
  // between them): any edit after the press cancels it.
  await page.evaluate((add, sel, v) => {
    document.querySelector(add).click();
    const el = document.querySelector(sel);
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, ADD_ALL, PASTE, `${list}\nzzqx one more line`);
  assert.ok(await countSays(page, /^301 names read/), 'the edited list read');
  await frames(page);
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), size, 'nothing added');
  assert.ok(await has(page, PASTE, 500), 'the sheet stays open, the text kept');
  assert.match(await page.$eval(PASTE, (e) => e.value), /zzqx one more line$/, 'the paste is still in the box');
});

test('PP-C64 (c1 h3 r1 R3; W4, M23): after "Add anyway" the focus goes to the next "Add anyway", past a close spelling between them (a question, no button)', async () => {
  const page = await tool({ data: 'fixture' });
  await choose(page, 'Temperate');
  await openPaste(page);
  await page.locator(PASTE).fill('Carica papaya\nrosmary\nMangifera indica');
  await page.click('dialog[open] [data-paste-read]');
  assert.ok(await countSays(page, /^3 names read/), 'the list read');
  const rows = await page.$$eval('dialog[open] [data-paste-row]', (els) => els.map((e) => [e.textContent.match(/^“([^”]+)”/)?.[1], e.closest('[data-paste-group]')?.dataset.pasteGroup]));
  assert.deepEqual(rows, [['Carica papaya', 'rec'], ['Mangifera indica', 'rec'], ['rosmary', 'choose']], 'the premise: two plants of another list, a close spelling asking');
  const press = (n) => page.evaluate((name, label) => [...document.querySelectorAll('dialog[open] [data-paste-row]')].find((e) => e.textContent.startsWith(`“${name}”`))?.querySelectorAll('button').forEach((b) => { if (b.textContent.trim() === label) { b.focus(); b.click(); } }), n, en['consortium.addAnyway']);
  await press('Carica papaya');
  const on = (name) => page.waitForFunction((label, n) => { const a = document.activeElement; return a?.textContent.trim() === label && a.closest('[data-paste-row]')?.textContent.startsWith(`“${n}”`); }, { timeout: 4000 }, en['consortium.addAnyway'], name).then(() => true, () => false);
  assert.ok(await on('Mangifera indica'), 'the focus on Mangifera indica\'s "Add anyway", not the count line');
});

test('PP-C65 (c1 h3 r1 R5, r2 B1, B2, C1, C3): up to 200 names Add counts the box as it is, at once: pressed within the 200 ms pause after a short list is replaced it reads the box then and adds its plants; its label is the board\'s "Add N plants" with the box\'s count, never a stale one or a count-free one', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const two = await page.evaluate(() => { const s = window.__ctTest.store, m = new Set(s.members.value); return s.pool.value.filter((x) => !m.has(x.id)).slice(0, 2).map((t) => ({ id: t.id, name: t.canonical_name })); });
  await openPaste(page);
  await typeIn(page, PASTE, two[0].name);
  await page.click('dialog[open] [data-paste-read]');
  assert.ok(await countSays(page, /^1 name read/), 'the first list read');
  assert.match(await page.$eval(ADD_ALL, (b) => b.textContent.trim()), /^Add 1 plant$/, 'the premise: "Add 1 plant"');
  // C3: the edit, the render (one frame, well inside the 200 ms pause), the label read and the press in
  // one task: the reading cannot land between them, and the count is the box's whichever way it does.
  const { label, aria: off } = await typeThenRead(page, `${two[0].name}\n${two[1].name}`, { press: true });
  assert.deepEqual({ label, aria: off }, { label: 'Add 2 plants', aria: null }, 'the box\'s count at once (board "Add N plants"), a press that runs');
  assert.ok(await page.waitForFunction((ids) => ids.every((id) => window.__ctTest.store.members.value.includes(id)), { timeout: 4000 }, two.map((t) => t.id)).then(() => true, () => false), 'both plants of the box added');
});

test('PP-C66 (c1 h3 r2 B1, B2): up to 200 names a box with nothing new says "Add 0 plants", aria-disabled, at once; typing that leaves the count alone leaves the label alone, keystroke by keystroke', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const three = await page.evaluate(() => { const s = window.__ctTest.store, m = new Set(s.members.value); return s.pool.value.filter((x) => !m.has(x.id)).slice(0, 3).map((t) => t.canonical_name); });
  const member = await page.evaluate(() => { const s = window.__ctTest.store; return s.pool.value.find((t) => s.members.value.includes(t.id)).canonical_name; });
  const size = await page.evaluate(() => window.__ctTest.store.members.value.length);
  await openPaste(page);
  // One task each: the text, a frame, the label (B1: never a press that does nothing unsaid).
  const at = async (v) => { const { label, aria: off } = await typeThenRead(page, v); return { label, aria: off }; };
  assert.deepEqual(await at('xyzzy'), { label: 'Add 0 plants', aria: 'true' }, 'a name not found: nothing to add, said at once');
  assert.deepEqual(await at(member), { label: 'Add 0 plants', aria: 'true' }, 'a plant already in: nothing to add, said at once');
  await page.$eval(ADD_ALL, (b) => b.click());
  await frames(page);
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), size, 'nothing added');
  // B2: a 3-name list, then a fourth line not found typed one key at a time, a newline first: the
  // label reads "Add 3 plants" after every key, so the foot bar never moves.
  const list = three.join('\n');
  assert.deepEqual(await at(list), { label: 'Add 3 plants', aria: null }, 'the premise: three to add');
  const labels = await page.evaluate(async (add, sel, base) => {
    const el = document.querySelector(sel), out = [];
    let v = base;
    for (const ch of '\nzzqx') {
      v += ch;
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(r));
      out.push(document.querySelector(add).textContent.trim());
    }
    return out;
  }, ADD_ALL, PASTE, list);
  assert.deepEqual(labels, Array(5).fill('Add 3 plants'), `the label holds while the count holds (${labels.join(' | ')})`);
});

// T4 (chunk 4; h3 G3#1, G3#2; word-map R14 "the head's new is what Add adds"): up to 200 names the
// paste is read once, as it is typed: the Recognised head's "N new" and Add's "Add N plants" come from
// the same reading in every frame, the pause after typing included.
test('PP-C69 (c1 chunk 4 T4; R14): a fourth name typed under "Recognised: 3 new": in the next frame the head and Add say the same N', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const four = await page.evaluate(() => { const s = window.__ctTest.store, m = new Set(s.members.value); return s.pool.value.filter((x) => !m.has(x.id)).slice(0, 4).map((t) => t.canonical_name); });
  await openPaste(page);
  await typeIn(page, PASTE, four.slice(0, 3).join('\n'));
  await page.click('dialog[open] [data-paste-read]');
  assert.ok(await countSays(page, /^3 names read/), 'the premise: three names read');
  const newOf = (head) => Number(/(\d+) new/.exec(head ?? '')?.[1] ?? NaN);
  const before = await typeThenRead(page, four.slice(0, 3).join('\n'));
  assert.deepEqual([newOf(before.head), before.label], [3, 'Add 3 plants'], `the premise: "${before.head}" and "${before.label}"`);
  const seen = await typeThenRead(page, four.join('\n'));
  assert.equal(`${newOf(seen.head)} new · ${seen.label}`, `4 new · Add 4 plants`, `the head ("${seen.head}") and Add ("${seen.label}") from one reading`);
  // The other way: a line deleted.
  const back = await typeThenRead(page, four.slice(0, 2).join('\n'));
  assert.equal(`${newOf(back.head)} new · ${back.label}`, `2 new · Add 2 plants`, `after a delete, the head ("${back.head}") and Add ("${back.label}") agree`);
});

// T8 (chunk 4; h3 G4#2): a sheet closed by Escape whose dialog is shown again before its `close` event
// fires (a part's frame replacing the loading frame in that one-task gap calls showModal) is still
// closed: only the closes the restack itself makes are not closes.
test('PP-C70 (c1 chunk 4 T8): Escape on a sheet whose frame re-shows the dialog before "close" fires still closes it; the store forgets the sheet', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  await openPaste(page);
  // Escape closes the dialog at once and queues `close`; the new frame's showModal runs in the same task.
  await page.$eval('dialog[open]', (d) => { d.close(); d.showModal(); });
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.sheets.value.length === 0 && !document.querySelector('dialog[open]'), { timeout: 3000 }).then(() => true, () => false),
    `the sheet closed (${await page.evaluate(() => window.__ctTest.store.sheets.value.map((x) => x.kind).join(', '))} still open)`);
});

test('PP-C67 (c1 h3 r2 B1, C1): past 200 names Add pressed while the text reads keeps the last reading\'s "Add N plants" (no count-free label); with nothing new it adds nothing, the focus stays on "Add 0 plants" (aria-disabled) and the sheet stays open', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const member = await page.evaluate(() => { const s = window.__ctTest.store; return s.pool.value.find((t) => s.members.value.includes(t.id)).canonical_name; });
  const size = await page.evaluate(() => window.__ctTest.store.members.value.length);
  await openPaste(page);
  // The text, the press and every frame until the reading lands, in one task (C2).
  const { reading: seen } = await typeThenRead(page, [...nonsense(299), member].join('\n'), { press: true, watch: /^300 names read/ });
  assert.ok(await countSays(page, /^300 names read/), 'the premise: the 300 names read');
  assert.ok(seen.length > 0, 'the premise: Add\'s label read in at least one frame while the reading line showed');
  assert.ok(seen.every((l) => /^Add \d+ plants?$/.test(l)), `while it reads, the board's "Add N plants" only (${seen.join(' | ')})`);
  await new Promise((r) => setTimeout(r, 300));
  await addRefused(page, size);
  assert.equal(await page.$eval(ADD_ALL, (b) => b.textContent.trim()), 'Add 0 plants', 'nothing new: said on Add');
});

// Chunk 4 fix round 1 (C3 group): the reading announced once typing pauses (R1), answers kept through
// a passing edit (R2), the reading just shown kept when the box crosses 200 names (R3).
test('PP-C71 (c1 c4 R1): five keys typed within 200 ms change the count line on screen at each name, while the sheet\'s live region changes at most once; no heading inside a live region', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const two = await page.evaluate(() => { const s = window.__ctTest.store, m = new Set(s.members.value); return s.pool.value.filter((x) => !m.has(x.id)).slice(0, 2).map((t) => t.canonical_name); });
  await openPaste(page);
  await typeIn(page, PASTE, `${two.join('\n')}\n`);
  await page.click('dialog[open] [data-paste-read]');
  assert.ok(await countSays(page, /^2 names read/), 'the premise: two names read');
  await new Promise((r) => setTimeout(r, 400));
  const out = await page.evaluate(async (sel, base) => {
    const d = document.querySelector('dialog[open]'), el = document.querySelector(sel);
    const live = () => [...d.querySelectorAll('[role="status"], [aria-live]:not([aria-live="off"])')];
    const text = () => live().map((r) => r.textContent.replace(/\s+/g, ' ').trim()).join(' | ');
    const said = [text()], counts = [];
    const obs = new MutationObserver(() => { const t = text(); if (t !== said.at(-1)) said.push(t); });
    obs.observe(d, { subtree: true, childList: true, characterData: true, attributes: true });
    let v = base;
    for (const ch of 'a\nb\nc') {
      v += ch;
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(r));
      counts.push(d.querySelector('[data-paste-count] strong')?.textContent.trim());
    }
    await new Promise((r) => setTimeout(r, 600));
    obs.disconnect();
    return { said, counts: [...new Set(counts)], headings: live().reduce((n, r) => n + r.querySelectorAll('h1, h2, h3, h4, button').length, 0) };
  }, PASTE, `${two.join('\n')}\n`);
  assert.ok(out.counts.length >= 3, `the premise: the count line on screen follows each name (${out.counts.join(' | ')})`);
  assert.ok(out.said.length <= 2, `the live region changes at most once (${out.said.join(' → ')})`);
  assert.match(out.said.at(-1), /5 names read/, 'what it says is the reading once typing paused');
  assert.equal(out.headings, 0, 'no heading or button inside a live region (PFC39 R8)');
});

test('PP-C72 (c1 c4 R2): an answer survives a passing edit: a line merged into the next and restored keeps its choice, "1 chosen, 1 to go" holds', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const genera = await genusAnswered(page);
  const before = (await chipsOf(page, genera[0])).filter((c) => c.on).map((c) => c.text);
  // Backspace at the start of the second line (the two lines merge), a frame, then undone.
  await page.evaluate(async (sel, merged, back) => {
    const el = document.querySelector(sel);
    for (const v of [merged, back]) {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
    }
  }, PASTE, genera.join(''), genera.join('\n'));
  await frames(page);
  assert.deepEqual((await chipsOf(page, genera[0])).filter((c) => c.on).map((c) => c.text), before, `"${genera[0]}" keeps its choice`);
  assert.match(await page.$eval('dialog[open] .ct-paste-progress', (e) => e.textContent), /^1 chosen, 1 to go\./, 'still one chosen');
});

test('PP-C73 (c1 c4 R3): a 199th name typed, then within 200 ms the box pushed past 200 names: the reading just shown stays (its "Add 1 plant") until the slices land, never an older one', async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const plant = await page.evaluate(() => { const s = window.__ctTest.store, m = new Set(s.members.value); return s.pool.value.find((x) => !m.has(x.id)).canonical_name; });
  await openPaste(page);
  const base = nonsense(198).join('\n');
  await typeIn(page, PASTE, base);
  await page.click('dialog[open] [data-paste-read]');
  assert.ok(await countSays(page, /^198 names read/), 'the premise: 198 names read');
  await new Promise((r) => setTimeout(r, 400));
  const typed = await typeThenRead(page, `${base}\n${plant}`);
  assert.equal(typed.label, 'Add 1 plant', 'the premise: the 199th name read at once');
  const past = await typeThenRead(page, `${base}\n${plant}\n${nonsense(5, 500).join('\n')}`);
  assert.equal(past.label, 'Add 1 plant', `past 200 names the reading just shown stays (${past.label})`);
  assert.ok(await countSays(page, /^204 names read/), 'the slices land');
  assert.equal(await page.$eval(ADD_ALL, (b) => b.textContent.trim()), 'Add 1 plant');
});

test('PP-C68 (c1 h3 r2 B4; W4): "Add anyway" on the last row shown of a folded Recognised list moves the focus forward to its "Show N more", where the next guest is, never back up the sheet', { timeout: 60_000 }, async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const guests = await realDb((db) => db.prepare("SELECT p.canonical_name c FROM plants p WHERE EXISTS (SELECT 1 FROM placements x WHERE x.plant = p.plant AND x.climate_zone = 'Tropical') AND NOT EXISTS (SELECT 1 FROM placements x WHERE x.plant = p.plant AND x.climate_zone = 'Temperate') ORDER BY p.canonical_name LIMIT 2").all().map((r) => r.c));
  const here = await page.evaluate(() => { const s = window.__ctTest.store, m = new Set(s.members.value); return s.pool.value.filter((x) => !m.has(x.id)).slice(0, 12).map((t) => t.canonical_name); });
  const guests0 = await page.evaluate(() => Object.keys(window.__ctTest.store.guests.value).length);
  await openPaste(page);
  // Recognised: two plants of this list, a guest, a second guest, then ten more of this list (14 rows,
  // folded to its first three).
  await typeIn(page, PASTE, [here[0], here[1], guests[0], guests[1], ...here.slice(2)].join('\n'));
  await page.click('dialog[open] [data-paste-read]');
  assert.ok(await countSays(page, /^14 names read/), 'the premise: the 14 names read');
  const head = 'dialog[open] [data-paste-group="rec"] .ct-paste-ghead';
  if (await page.$eval(head, (b) => b.getAttribute('aria-expanded')) !== 'true') await page.click(head);
  const shown = await page.$$eval('dialog[open] [data-paste-group="rec"] [data-paste-row]', (els) => els.map((e) => e.textContent.match(/^“([^”]+)”/)?.[1]));
  assert.deepEqual(shown, [here[0], here[1], guests[0]], 'the premise: folded, the first guest the last row shown');
  await page.evaluate((name, label) => [...document.querySelectorAll('dialog[open] [data-paste-row]')].find((e) => e.textContent.startsWith(`“${name}”`))?.querySelectorAll('button').forEach((b) => { if (b.textContent.trim() === label) { b.focus(); b.click(); } }), guests[0], en['consortium.addAnyway']);
  assert.ok(await page.waitForFunction((k) => Object.keys(window.__ctTest.store.guests.value).length === k, { timeout: 8000 }, guests0 + 1).then(() => true, () => false), `"${guests[0]}" added`);
  assert.ok(await page.waitForFunction(() => document.activeElement?.matches('[data-paste-group="rec"] .ct-more-open'), { timeout: 4000 }).then(() => true, () => false),
    `the focus on Recognised's "Show N more" (${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120))})`);
});
