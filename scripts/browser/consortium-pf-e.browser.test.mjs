// pf stream e, "Many plants" (chunk 3; v14 spec section 2 'pf-e'): the boards Many and ManyDesk (Your
// plants as a list and a table: search, sort, group, ticks, "Remove 3 plants" with Undo, "Tick these"
// from Warnings and fit, "Add plants" opening the search in place of the list), PaletteMore and Recife
// (the small form), Paste and AddMany state 4 (every line read, three groups, one Add) and the bulk
// toasts, as tests. Each case was written failing in pf-e's commit 0 (scripts/expect-fail.mjs
// failing(), its reason the board's first missing word); its marker went in the commit that made it
// pass. Figures come from the page's own store (the engine on the installed
// release), never from the board. The 200-plant palette is pf-helpers.mjs loadPalette200 (scenario
// case kiambu-200).
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   carries PP-B9   warnings first, each in words with the icon, Slight and Moderate in their own colours  -> PFE8
//   carries PP-B61  the height note on a row (small garden)                                               -> PFE9
//   carries PP-B61b the height note on a row (balcony or pots)                                            -> PFE9
//   carries PP-B62  plants the page cannot show: a row saying why, with Remove                            -> PFE10
//   carries PP-B23  200 plants: the list folds, opening moves the focus, Remove with Undo and the focus   -> PFE2, PFE3
//   carries PP-B23b Your plants at 1 and 0 plants: no fold, no section of nothing                         -> PFE10
//   carries PP-B64  Undo after a remove in Your plants lands on the restored row                          -> PFE3
// Not carried: per-row Remove in the small form (boards PaletteMore, Recife: a row opens the plant,
// whose Details and Swap keep Remove; decision recorded in pf-e's report).
import assert from 'node:assert/strict';
import test from 'node:test';
import { useHarness, has, en, realDb } from './helpers.mjs';
import { tool, choose, atSite } from './p5-helpers.mjs';
import { boxOf, control, dialogText, done, focused, frames, loadCase, loadPalette200, names, press, says, saysNot, sectionBox, toastText, verdictsSettled } from './pf-helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { fitRanks, LIGHT_OF, pasteText, PLANTS, rowsShown, strataCounts, typeIn } from './pf-e-helpers.mjs';

useHarness();

const SEARCH = (n) => `Search your ${n} plants`;
const firstLevel = async (page) => { const c = await strataCounts(page); const s = ['emergent', 'high', 'medium', 'low'].find((k) => c[k]); return { s, word: LIGHT_OF[s], n: c[s] }; };

test('PFE1 (pf-e Many at 390): the 200-plant palette shows "Your 200 plants" with its lede, the search under the head, Sort and Group, and every light group closed with its count and "Tick all N"', async () => {
  const page = await loadPalette200({ width: 390 });
  await says(page, 'Your 200 plants');
  await says(page, 'A compact list: open a plant for its details. The search at the top of the page filters it. Sorted by fit: plants outside their range first, then those that need a second look.');
  await control(page, 'textbox', SEARCH(200));
  await control(page, 'combobox', 'Sort');
  await control(page, 'combobox', 'Group');
  const counts = await strataCounts(page);
  for (const [s, word] of Object.entries(LIGHT_OF)) {
    if (!counts[s]) continue;
    const head = await control(page, 'button', `${word} ${counts[s]} plants`);
    assert.equal(head.expanded ?? false, false, `board: ${word} starts closed`);
    await control(page, 'button', `Tick all ${counts[s]} in ${word}`);
  }
  assert.equal((await rowsShown(page)).length, 0, 'board: every group starts closed (no rows shown)');
  await says(page, 'Groups start closed. Ticks stay when you search, sort or regroup. Remove acts on the ticked plants at once, with Undo. Swap stays on each plant.');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(over <= 0, 'board: no sideways scroll at 390');
  await done(page);
});

test('PFE2 (pf-e Many, PP-B23): a group opens to its first 10 rows sorted by fit, then "+ N more"; each row has its tick, its name, its years and jobs, and its word; opening the rest moves the focus to the first new row', async () => {
  const page = await loadPalette200({ width: 390 });
  const { word, n } = await firstLevel(page);
  await press(page, 'button', `${word} ${n} plants`);
  await frames(page);
  const rows = await rowsShown(page);
  assert.equal(rows.length, Math.min(10, n), `board: ${word} opens to its first 10 rows`);
  if (n > 10) await control(page, 'button', `+ ${n - 10} more (Show the other plants in ${word})`);
  const rank = await fitRanks(page);
  const ranks = rows.map((r) => rank[r.id]);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), `board: sorted by fit (outside, second look, a mark, fits, not checked): ${ranks.join(' ')}`);
  const first = await page.evaluate((id) => window.__ctTest.store.memberTaxa.value.find((t) => t.id === id), rows[0].id);
  const name = first.names?.en ?? first.canonical_name;
  await control(page, 'checkbox', `Tick ${name}`);
  assert.ok(rows[0].text.includes(first.canonical_name), 'board: the row names the plant\'s scientific name');
  assert.match(rows.map((r) => r.text).join(' | '), /year \d+ to year \d+|from year \d+ on|first year|first \d+/, 'board: rows say when each plant stands');
  if (n > 10) {
    await press(page, 'button', `+ ${n - 10} more (Show the other plants in ${word})`);
    await frames(page);
    assert.equal((await rowsShown(page)).length, n, `board: "+ more" shows all ${n}`);
    const f = await focused(page);
    assert.ok(!f.body && f.inTool, 'board: the focus moves to the first new row');
  }
  await done(page);
});

test('PFE3 (pf-e F22, PP-B23, PP-B64): ticking 3 plants shows "3 ticked" with "Remove 3 plants"; Remove takes them out at once with one Undo ("3 plants removed. 197 plants."), Undo brings them back, and the focus never falls to the page', async () => {
  const page = await loadPalette200({ width: 390 });
  const { word, n } = await firstLevel(page);
  await press(page, 'button', `${word} ${n} plants`);
  const picked = (await rowsShown(page)).slice(0, 3);
  for (const r of picked) await page.click(`${PLANTS} [data-plant-id="${r.id}"] input[type="checkbox"]`);
  await control(page, 'group', '3 plants ticked');
  await says(page, '3 ticked');
  // Ticks stay when you sort or regroup.
  await page.select(`${PLANTS} select[data-plants-sort]`, 'name');
  await page.select(`${PLANTS} select[data-plants-group]`, 'none');
  await control(page, 'group', '3 plants ticked');
  await page.select(`${PLANTS} select[data-plants-group]`, 'light');
  await press(page, 'button', 'Remove 3 plants');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 197, { timeout: 4000 }).then(() => true, () => false), 'board: Remove takes the 3 out');
  assert.match(await toastText(page), /^3 plants removed\. 197 plants\./, 'board: the toast says how many and the palette after');
  const f = await focused(page);
  assert.ok(!f.body, 'board: the focus stays in the tool after Remove');
  await saysNot(page, '3 ticked', 'the ticks go with the plants');
  await page.evaluate(() => window.__ctTest.store.toast.value.undo());
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 200, { timeout: 4000 }).then(() => true, () => false), 'board: Undo brings them back');
  await done(page);
});

test('PFE4 (pf-e Many): the search under the head filters Your plants by name, groups and counts following, and clearing it brings the list back', async () => {
  const page = await loadPalette200({ width: 390 });
  const target = await page.evaluate(() => { const t = window.__ctTest.store.memberTaxa.value[5]; return { id: t.id, q: t.canonical_name.split(' ')[0] }; });
  const box = await control(page, 'textbox', SEARCH(200));
  assert.ok(box);
  await typeIn(page, `#ct-root input[aria-label="${SEARCH(200)}"]`, target.q);
  await frames(page);
  const expect = await page.evaluate((q) => window.__ctTest.store.memberTaxa.value.filter((t) => `${t.names?.en ?? ''} ${t.canonical_name}`.toLowerCase().includes(q.toLowerCase())).map((t) => t.id).sort(), target.q);
  assert.ok(await has(page, `${PLANTS} [data-plant-id="${target.id}"]`, 3000), 'board: a search opens the matching groups and shows the plant');
  const shown = (await rowsShown(page)).map((r) => r.id).sort();
  assert.deepEqual(shown, expect, 'board: only the matching plants are listed');
  await typeIn(page, `#ct-root input[aria-label="${SEARCH(200)}"]`, '');
  await frames(page);
  assert.equal((await rowsShown(page)).length, 0, 'board: cleared, the groups are closed again');
  await done(page);
});

test('PFE5 (pf-e ManyDesk at 1280): Your plants is a table with its lede, "Add plants", the search, "Group by", the head tick and sortable column heads; a column head sorts it; grouped by job a "Planted in" column says the light level', async () => {
  const page = await loadPalette200({ width: 1280 });
  await says(page, 'Search and group the list; a column head sorts it. Tick plants to remove several at once.');
  await control(page, 'button', 'Add plants');
  await control(page, 'textbox', SEARCH(200));
  await control(page, 'combobox', 'Group by');
  await control(page, 'checkbox', 'Tick the rows on screen');
  for (const h of ['Plant', 'When it stands', 'Jobs', 'Fit and warnings']) await control(page, 'button', h);
  assert.ok(await has(page, `${PLANTS} table`, 2000), 'board: a table');
  const { word, n } = await firstLevel(page);
  await press(page, 'button', `${word} ${n} plants`);
  await press(page, 'button', 'Plant');
  await frames(page);
  const ids = (await rowsShown(page)).map((r) => r.id);
  const sorted = await page.evaluate((list) => { const by = new Map(window.__ctTest.store.memberTaxa.value.map((t) => [t.id, t.names?.en ?? t.canonical_name])); const c = new Intl.Collator('en'); return [...list].sort((a, b) => c.compare(by.get(a), by.get(b))); }, ids);
  assert.deepEqual(ids, sorted, 'board: "Plant" sorts by name');
  await page.click('#ct-root input[aria-label="Tick the rows on screen"]');
  await control(page, 'group', `${ids.length} plants ticked`);
  await page.select(`${PLANTS} select[data-plants-group]`, 'job');
  await control(page, 'button', 'Planted in');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(over <= 0, 'board: no sideways scroll at 1280');
  await done(page);
});

test('PFE6 (pf-e F30, ManyDesk): "Add plants" opens the search in place of the list and stays open while adding; Done closes it and the focus goes back to "Add plants"', async () => {
  const page = await loadPalette200({ width: 1280 });
  assert.ok(await has(page, `${PLANTS} [data-plants-add]`, 4000), 'board: no "Add plants" in Your plants');
  await page.click(`${PLANTS} [data-plants-add]`);
  assert.ok(await has(page, `${PLANTS} .ct-find`, 15_000), 'board: the search opens inside Your plants');
  assert.equal(await page.$(`${PLANTS} table`), null, 'board: in place of the list');
  const pick = await page.evaluate(() => { const s = window.__ctTest.store, m = new Set(s.members.value); const t = Object.values(s.pools.value).flat().find((x) => x && !m.has(x.id)); return { id: t.id, q: t.canonical_name }; });
  await typeIn(page, `${PLANTS} [data-find-search]`, pick.q);
  const row = `${PLANTS} [data-find-row][data-plant-id="${pick.id}"]`;
  assert.ok(await has(page, row, 10_000), 'board: the search lists the plant');
  await page.click(`${row} [data-find-add]`);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 201, { timeout: 4000 }).then(() => true, () => false), 'board: a plant added');
  assert.ok(await has(page, `${PLANTS} .ct-find`, 1000), 'board: the search stays open while adding');
  await press(page, 'button', 'Done');
  assert.ok(await has(page, `${PLANTS} table`, 3000), 'board: the list is back');
  assert.equal((await focused(page)).name, 'Add plants', 'board: the focus goes back to "Add plants"');
  await done(page);
});

test('PFE7 (pf-e Many, A15): "Tick these N" on Warnings and fit\'s toxic line ticks the toxic and very toxic plants in Your plants, ready for Remove', async () => {
  const page = await loadPalette200({ width: 390 });
  const n = await page.evaluate(() => { const s = window.__ctTest.store; return s.memberTaxa.value.filter((t) => s.flagsOfPlant(t).some((f) => f.kind === 'toxicity' && (f.level === 'Severe' || f.level === 'Moderate')) && s.memberVerdicts.value?.get(t.id)?.level !== 'outside').length; });
  assert.ok(n > 0, 'the premise: toxic plants in the palette');
  await press(page, 'button', (await control(page, 'button', /^Needs a second look/)).name);
  await press(page, 'button', (await control(page, 'button', /^Toxic or very toxic/)).name);
  await press(page, 'button', `Tick these ${n}`);
  await control(page, 'group', `${n} plants ticked`);
  await control(page, 'button', `Remove ${n} plants`);
  await done(page);
});

test('PFE8 (pf-e PaletteMore at 390, PP-B9): a small palette lists "Your 8 plants", warned first, each row opening the plant with its light, years, size, jobs and warnings in words; no Sort, Group, tick or fold', async () => {
  const page = await loadCase('kiambu-8', { width: 390 });
  await says(page, 'Your 8 plants');
  await says(page, 'Plants with a warning come first.');
  await says(page, /Planted in: (?:Full sun|Mostly sun|Part shade|Shade) · /);
  const rows = await rowsShown(page);
  assert.equal(rows.length, 8, 'board: every row shown');
  // BC3: by the big list's fit rank (outside, a second look, marks only, fits, not checked): a
  // Mildly-toxic-only row never comes before a second look (boards PaletteMore, Recife).
  const rank = await fitRanks(page);
  const ranks = rows.map((r) => rank[r.id]);
  assert.deepEqual(ranks, [...ranks].sort((x, y) => x - y), `board: warned first by fit rank: ${rows.map((r, i) => `${r.text.split(' ').slice(0, 2).join(' ')}=${ranks[i]}`).join(', ')}`);
  const lastLook = ranks.lastIndexOf(1), firstMild = ranks.indexOf(2);
  if (lastLook >= 0 && firstMild >= 0) assert.ok(firstMild > lastLook, 'board: a Mildly-toxic-only row never comes before a second look');
  for (const s of ['Sort', 'Group']) assert.equal(await page.$(`${PLANTS} select[data-plants-${s.toLowerCase()}]`), null, `board: no ${s} below 41 plants`);
  assert.equal(await page.$(`${PLANTS} input[type="checkbox"]`), null, 'board: no ticks below 41 plants');
  // Slight and Moderate each in words, in their own colours (PP-B9).
  const marks = await page.$$eval(`${PLANTS} .ct-find-mark[data-kind="toxicity"]`, (els) => els.map((e) => ({ t: e.textContent.trim(), c: getComputedStyle(e).borderTopColor })));
  const slight = marks.find((m) => m.t === en['consortium.tox.Slight']), mod = marks.find((m) => m.t === en['consortium.tox.Moderate']);
  if (slight && mod) assert.notEqual(slight.c, mod.c, 'board: Mildly toxic and Toxic in their own colours');
  const id = rows[0].id;
  await page.click(`${PLANTS} [data-plant-id="${id}"] a, ${PLANTS} [data-plant-id="${id}"] button`);
  assert.ok(await page.waitForFunction((x) => window.__ctTest.store.sheet.value?.kind === 'details' && window.__ctTest.store.sheet.value.id === x, { timeout: 4000 }, id).then(() => true, () => false), 'board: a row opens the plant');
  await done(page);
});

test('PFE9 (pf-e Recife pt, PP-B61, PP-B61b): the small form in Portuguese ("Suas 10 plantas", "As plantas com aviso vêm primeiro."); a tall plant in a small garden or in pots keeps its height note on its row', async () => {
  const pt = await loadCase('recife-today', { site: 'manaus', lang: 'pt', width: 390 });
  await says(pt, 'Suas 10 plantas');
  await says(pt, 'As plantas com aviso vêm primeiro.');
  // BC3 (board Recife): Pitanga and Mulungu (Tóxica, a second look) before Tamarindo and Grevileia
  // (Ligeiramente tóxica, a mark only): the fit rank, never the palette's order.
  const rank = await fitRanks(pt), ranks = (await rowsShown(pt)).map((r) => rank[r.id]);
  assert.deepEqual(ranks, [...ranks].sort((x, y) => x - y), `board: warned first by fit rank: ${ranks.join(' ')}`);
  await done(pt);
  for (const room of ['small', 'pots']) {
    const page = await tool();
    await atSite(page, 'seville');
    await choose(page, 'Mediterranean');
    const tall = await page.evaluate((r) => { const { store } = window.__ctTest; store.room.value = r; return store.pool.value.find((x) => (x.traits.height_m?.max ?? 0) > 10).id; }, room);
    await page.evaluate((x) => { const { store } = window.__ctTest; store.members.value = [x]; store.view.value = 'matrix'; }, tall);
    await verdictsSettled(page);
    assert.ok(await has(page, `${PLANTS} [data-plant-id="${tall}"] [data-note="room-tall"]`, 8000), `board: ${room}: the tall plant's height note on its row`);
    await says(page, 'Your 1 plant');
    await done(page);
  }
});

test('PFE10 (pf-e PP-B62, PP-B23b): a member the page cannot show keeps a row saying why with Remove; at 1 plant one row and no fold; at 0 plants no section of nothing', async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  const ids = await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY p.canonical_name LIMIT 1").all().map((r) => String(r.id)));
  await page.evaluate((list) => { const { store } = window.__ctTest; store.members.value = [...list, 'not-a-plant-id']; store.view.value = 'matrix'; }, ids);
  await verdictsSettled(page);
  assert.ok(await has(page, `${PLANTS} [data-plant-id="not-a-plant-id"][data-missing]`, 6000), 'board: the unknown member has its row');
  await says(page, 'Not checked: not on this climate\'s plant lists.');
  await press(page, 'button', 'Remove not-a-plant-id');
  await says(page, 'Your 1 plant');
  assert.doesNotMatch(await page.$eval(PLANTS, (e) => e.innerText), /\+ \d+ more/, 'board: no fold at 1 plant');
  await page.evaluate(() => { window.__ctTest.store.members.value = []; });
  await frames(page);
  assert.equal(await page.$(PLANTS), null, 'board: no Your plants at 0 plants');
  await done(page);
});

// A Paste group opened (pressed only when closed).
async function openGroup(page, name) {
  const g = await control(page, 'button', name);
  if (!g.expanded) await press(page, 'button', g.name);
}
const SMALL_PASTE = 'corn, beans, sukuma wiki\npigeon pea, avocado, corn\ngrevillea, napier';
test('PFE11 (pf-e Paste board): every line is read into three groups, Recognised (new, you have, listed twice), Need a choice (a loose word asks, nothing chosen for you) and Not found; the first column of a spreadsheet; Add counts the new and the chosen', async () => {
  const page = await loadCase('kiambu-8', { width: 390 });
  // The board's palette: corn and pigeon pea in it, avocado, grevillea and napier not (the figures
  // after it are the engine's: "napier", only the start of the one-word name "Napiergrass", is a search
  // guess, so it asks: pf-decisions row 2026-11-19 (C8, A26), a known board difference, the board
  // drawing it found; and the beans the pool holds are the ones named).
  const before = await page.evaluate(() => {
    const s = window.__ctTest.store, out = new Set(['Persea americana', 'Grevillea robusta', 'Cenchrus purpureus']);
    s.members.value = s.memberTaxa.value.filter((t) => !out.has(t.canonical_name)).map((t) => t.id);
    return s.members.value.length;
  });
  await pasteText(page, SMALL_PASTE);
  await says(page, 'One plant a line, or separated by commas. Any of the 11 languages, or scientific names. Every line is read, on your device; nothing is sent.', { inDialog: true });
  await says(page, 'Pasted from a spreadsheet? The names are read from the first column.', { inDialog: true });
  await says(page, '8 names read', { inDialog: true });
  await says(page, /5 recognised, 2 need a choice, 1 not found/, { inDialog: true });
  assert.equal((await control(page, 'button', /^Recognised: 2 new, 2 you have, 1 listed twice/)).expanded, true, 'board: Recognised opens by itself up to 10 names');
  await control(page, 'button', /^Need a choice/);
  await control(page, 'button', /^Not found/);
  await says(page, '“corn” Corn Zea mays · in your palette · listed twice, counted once', { inDialog: true });
  await says(page, '“grevillea” Silk oak Grevillea robusta · new, found by its scientific name', { inDialog: true });
  await says(page, '“avocado” Avocado Persea americana · new', { inDialog: true });
  await says(page, /“beans” Which bean\? \d+ plants are called bean\./, { inDialog: true });
  await says(page, '“sukuma wiki” Not found. Search by hand', { inDialog: true });
  // The beans question's choices (Common bean, in the palette, says so; pressed, it would add nothing).
  const choices = await page.$$eval('dialog[open] [role="group"]', (gs) => [...gs.find((g) => /beans/.test(g.getAttribute('aria-label') ?? '')).querySelectorAll('button[aria-pressed]')]
    .map((b) => ({ t: b.textContent.replace(/\s+/g, ' ').trim(), on: b.getAttribute('aria-pressed') })));
  assert.ok(choices.slice(0, 3).every((c) => /\bbean\b/i.test(c.t)), `board: the plants named bean come first (A16): ${choices.slice(0, 3).map((c) => c.t)}`);
  assert.ok(choices.every((c) => c.on !== 'true'), 'board: nothing chosen for the grower');
  await press(page, 'button', choices.find((c) => c.on === 'false' && !/in your palette/.test(c.t)).t);
  await press(page, 'button', 'Add 3 plants');
  assert.ok(await page.waitForFunction((n) => window.__ctTest.store.members.value.length === n + 3, { timeout: 8000 }, before).then(() => true, () => false), 'board: Add counts the new and the chosen');
  await done(page);
});

test('PFE12 (pf-e AddMany state 4): 205 names on a palette of 20 are all read with no cap; the groups start closed past 10; choices say their fit; "Skip the N left", "Copy these N names"; one Add takes everything; the toast says "N plants added. Your palette: M plants." with Undo', async () => {
  const page = await loadPalette200({ width: 390 });
  const text = await page.evaluate(() => {
    const s = window.__ctTest.store, have = s.members.value.slice(0, 20);
    const rest = s.memberTaxa.value.slice(20, 210).map((t) => (t.names?.en ?? t.canonical_name).toLowerCase());
    s.members.value = have;
    return [...rest, 'beans', 'spanish cedar', 'sword bean', 'sukuma wiki', 'managu', 'terere', 'mrenda', 'kunde', 'nduma', 'mchicha', 'saga', 'mitoo', 'kanzira', 'nderema', 'thabai'].join('\n');
  });
  await pasteText(page, text);
  await says(page, /\b\d{3} names read\b/, { inDialog: true, timeout: 15_000 });
  const rec = await control(page, 'button', /^Recognised: /);
  assert.equal(rec.expanded ?? false, false, 'board: Recognised starts closed above 10 names');
  await openGroup(page, /^Need a choice/);
  await says(page, /\d+ chosen, \d+ to go\. A name you leave is not added\./, { inDialog: true });
  await control(page, 'button', /^Skip the \d+ left$/);
  await openGroup(page, /^Not found/);
  await control(page, 'button', /^Copy these \d+ names$/);
  const add = await control(page, 'button', /^Add \d+ plants$/);
  const n = Number(add.name.match(/\d+/)[0]);
  await press(page, 'button', add.name);
  assert.ok(await page.waitForFunction((k) => window.__ctTest.store.members.value.length === 20 + k, { timeout: 8000 }, n).then(() => true, () => false), 'board: one Add takes everything');
  assert.match(await toastText(page), new RegExp(`^${n} plants added\\. Your palette: ${20 + n} plants\\.`), 'board: the toast');
  await done(page);
});

test('PFE13 (pf-e E5): the old "Your place" sheet is gone: openSheet("place") opens nothing', async () => {
  const page = await loadCase('kiambu-8', { width: 390 });
  await page.evaluate(() => window.__ctTest.store.openSheet('place'));
  await frames(page);
  assert.equal(await page.$('dialog[open]'), null, 'board: no sheet opens for "place"');
  await done(page);
});

// ---- fix round 1, batch 1 (board check findings BC1 to BC12) ----

// A row ticked as a phone reader does: scrolled to the middle of the screen first, as the sticky tick
// bar covers the rows under it.
async function tickRow(page, id) {
  const sel = `${PLANTS} [data-plant-id="${id}"] input[type="checkbox"]`;
  await page.$eval(sel, (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await frames(page);
  await page.click(sel);
}
// The sunniest light group opened and its first 3 rows ticked; its rows.
async function openFirstTick3(page) {
  const { word, n } = await firstLevel(page);
  await press(page, 'button', `${word} ${n} plants`);
  await frames(page);
  const rows = await rowsShown(page);
  for (const r of rows.slice(0, 3)) await tickRow(page, r.id);
  return rows;
}

// The place line is main's (Place.tsx PlaceLine); pf-e's slot is views/plants/head-link.tsx PlantsCount,
// which main mounts in place of the line's count (hand-off C1); main removes the marker when it lands.
failing('PFE14 (pf-e E4, BC1, C1; hand-off: main mounts head-link.tsx PlantsCount in Place.tsx PlaceLine): past 40 plants under 960 px the place line says "200 plants: Your plants", the link landing on Your plants\' heading; at 1280 no link', { owner: 'pf-e', reason: /no link "Your plants"/ }, async () => {
  const page = await loadPalette200({ width: 390 });
  const link = await page.waitForFunction(() => [...document.querySelectorAll('#ct-root [data-place-line] a')].some((a) => a.textContent.trim() === 'Your plants'), { timeout: 6000 }).then(() => true, () => false);
  assert.ok(link, 'board: no link "Your plants" in the place line');
  await says(page, /200 plants: Your plants · Change/);
  await page.locator('::-p-aria([name="Your plants"][role="link"])').click();
  await frames(page);
  assert.equal((await focused(page)).name, 'Your 200 plants', 'board: the focus lands on Your plants\' heading');
  await done(page);
  const desk = await loadPalette200({ width: 1280 });
  assert.ok(!(await names(desk, 'link')).includes('Your plants'), 'board ManyDesk: no link at 1280');
  await done(desk);
});

test('PFE15 (pf-e E4, BC2; boards Many, Main): on the phone the one search comes directly under the place line, before the steps and the Next step', async () => {
  for (const width of [390, 320]) {
    const page = await loadPalette200({ width });
    await control(page, 'textbox', SEARCH(200));
    const order = await page.evaluate((label) => {
      const search = document.querySelector(`#ct-root input[aria-label="${label}"]`);
      const place = document.querySelector('#ct-root [data-place-line]');
      const next = [...document.querySelectorAll('#ct-root h2, #ct-root h3')].find((h) => /^Next step/.test(h.textContent.trim()));
      const steps = document.querySelector('#ct-root nav[aria-label]');
      const before = (a, b) => !!a && !!b && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return { place: before(place, search), steps: !steps || before(search, steps), next: before(search, next) };
    }, SEARCH(200));
    assert.deepEqual(order, { place: true, steps: true, next: true }, `board at ${width}: the search under the place line, above the steps and the Next step: ${JSON.stringify(order)}`);
    await done(page);
  }
});

failing('PFE15b (pf-e E4, BC2; the head is main\'s ConsortiumPage.astro, shell.css and steps.tsx): the step bar stands above "Plant palette" on the palette step, as on Place', { owner: 'pf-e', reason: /the step bar comes after the title/ }, async () => {
  const page = await loadPalette200({ width: 390 });
  await control(page, 'textbox', SEARCH(200));
  const at = await page.evaluate(() => {
    const visible = (e) => !!e && e.getClientRects().length > 0;
    const steps = [...document.querySelectorAll('main ol, main nav')].find((e) => visible(e) && /Your place/.test(e.textContent) && /Planting plan/.test(e.textContent));
    const title = document.querySelector('main h1');
    return { steps: steps?.getBoundingClientRect().top ?? Infinity, title: title?.getBoundingClientRect().top ?? 0 };
  });
  assert.ok(at.steps < at.title, 'board: the step bar comes after the title');
  await done(page);
});

test('PFE16 (pf-e BC4, v14 section 6): at 320 the tick bar\'s "Remove 3 plants" stays on screen above the bottom bar while the reader scrolls to the open group\'s last row', async () => {
  const page = await loadPalette200({ width: 320 });
  const rows = await openFirstTick3(page);
  await control(page, 'button', 'Remove 3 plants');
  await page.$eval(`${PLANTS} [data-plant-id="${rows[rows.length - 1].id}"]`, (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await frames(page);
  const at = await page.evaluate(() => {
    const b = [...document.querySelectorAll('#ct-root button')].find((x) => x.textContent.trim() === 'Remove 3 plants');
    const bar = [...document.querySelectorAll('#ct-root button')].filter((x) => x.textContent.trim() === 'Add plants' && x.getClientRects().length).map((x) => x.getBoundingClientRect().top);
    const r = b.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, barTop: bar.length ? Math.min(...bar) : innerHeight, vh: innerHeight };
  });
  assert.ok(at.top >= 0 && at.bottom <= at.vh, `board: Remove is on screen after scrolling (top ${Math.round(at.top)}, viewport ${at.vh})`);
  assert.ok(at.bottom <= at.barTop + 1, `board: Remove sits above the bottom bar (${Math.round(at.bottom)} against ${Math.round(at.barTop)})`);
  await done(page);
});

test('PFE17 (pf-e E3, BC5; ManyDesk at 960): the chart\'s column keeps the Jobs title on one line and "Group by" shows "Light level" whole', async () => {
  const page = await loadPalette200({ width: 960 });
  await control(page, 'combobox', 'Group by');
  await control(page, 'heading', /^Jobs/);
  const at = await page.evaluate(() => {
    const jobs = [...document.querySelectorAll('#ct-root h3')].find((h) => h.textContent.trim().startsWith('Jobs'));
    const text = jobs && [...jobs.childNodes].find((c) => c.nodeType === 3 && c.textContent.includes('Job')) || jobs?.firstChild;
    const range = document.createRange(); if (text) range.selectNodeContents(text);
    const lines = text ? new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size : 0;
    const sel = document.querySelector('#ct-root select[data-plants-group]');
    const ctx = document.createElement('canvas').getContext('2d'); ctx.font = getComputedStyle(sel).font;
    return { lines, need: ctx.measureText(sel.selectedOptions[0].text).width, has: sel.clientWidth };
  });
  assert.equal(at.lines, 1, 'board: "Jobs" on one line at 960');
  assert.ok(at.need + 16 <= at.has, `board: "Light level" whole in Group by (${Math.round(at.need)} px of text, ${at.has} px select)`);
  await done(page);
});

test('PFE18 (pf-e BC6, Many at 320): Your plants\' contents stay inside their card with a group open and 3 ticked', async () => {
  const page = await loadPalette200({ width: 320 });
  await openFirstTick3(page);
  await frames(page);
  const w = await page.$eval(PLANTS, (s) => ({ scroll: s.scrollWidth, client: s.clientWidth }));
  assert.ok(w.scroll <= w.client, `board: nothing spills past the card (scrollWidth ${w.scroll}, clientWidth ${w.client})`);
  await done(page);
});

test('PFE19 (pf-e BC8, board Many): an outside plant keeps its toxicity mark on its row, beside the fit word', async () => {
  const page = await loadPalette200({ width: 390 });
  const pick = await page.evaluate(() => {
    const s = window.__ctTest.store, v = s.memberVerdicts.value;
    const t = s.memberTaxa.value.find((x) => v?.get(x.id)?.level === 'outside' && s.flagsOfPlant(x).some((f) => f.kind === 'toxicity'));
    return t ? { id: t.id, q: t.canonical_name, level: s.flagsOfPlant(t).find((f) => f.kind === 'toxicity').level } : null;
  });
  assert.ok(pick, 'the premise: an outside plant with a toxicity mark');
  await typeIn(page, `#ct-root input[aria-label="${SEARCH(200)}"]`, pick.q);
  assert.ok(await has(page, `${PLANTS} [data-plant-id="${pick.id}"]`, 3000));
  const row = (await rowsShown(page)).find((r) => r.id === pick.id);
  assert.match(row.text, /Outside its climate range/, 'its fit word');
  assert.ok(row.text.includes(en[`consortium.tox.${pick.level}`]), `board: the row says "${en[`consortium.tox.${pick.level}`]}" too: ${row.text}`);
  await done(page);
});

const openToxic = async (page) => {
  await press(page, 'button', (await control(page, 'button', /^Needs a second look/)).name);
  await press(page, 'button', (await control(page, 'button', /^Toxic or very toxic/)).name);
};
const toxicN = (page) => page.evaluate(() => { const s = window.__ctTest.store; return s.memberTaxa.value.filter((t) => s.flagsOfPlant(t).some((f) => f.kind === 'toxicity' && (f.level === 'Severe' || f.level === 'Moderate')) && s.memberVerdicts.value?.get(t.id)?.level !== 'outside').length; });

test('PFE20 (pf-e BC9, board Many): the open toxic reason is one paragraph ("Very toxic, N: …. Toxic, N: …") with "+ N more" and "Tick these N" side by side as 44 px pills', async () => {
  for (const width of [390, 1280]) {
    const page = await loadPalette200({ width });
    await openToxic(page);
    const n = await toxicN(page);
    const at = await page.evaluate((label) => {
      const tick = [...document.querySelectorAll('#ct-root button')].find((b) => b.textContent.trim() === label);
      const line = tick.closest('li');
      const more = [...line.querySelectorAll('button')].find((b) => /^\+ \d+ more$/.test(b.textContent.trim()));
      const labels = [...line.querySelectorAll('strong')].filter((x) => /, \d+:$/.test(x.textContent.trim()));
      const text = labels.map((x) => x.textContent.trim());
      const blocks = new Set(labels.map((x) => x.parentElement)).size;
      const r = (e) => { if (!e) return null; const x = e.getBoundingClientRect(); return { top: x.top, height: x.height }; };
      return { tick: r(tick), more: r(more), text, blocks };
    }, `Tick these ${n}`);
    assert.ok(at.more, `board at ${width}: "+ N more" in the toxic reason`);
    assert.ok(Math.abs(at.more.top - at.tick.top) < 4, `board at ${width}: "+ N more" and "Tick these" on one row: ${JSON.stringify([at.more, at.tick])}`);
    assert.ok(at.more.height >= 44 && at.tick.height >= 44 && Math.abs(at.more.height - at.tick.height) < 2, `board at ${width}: both 44 px pills of one size`);
    assert.equal(at.blocks, 1, `board at ${width}: the labels in one paragraph (${at.text.join(' | ')})`);
    await done(page);
  }
});

test('PFE21 (pf-e A15, BC10, R2): "Tick these N" says in place what it did ("N ticked in Your plants.") and takes the focus to Remove', async () => {
  const page = await loadPalette200({ width: 390 });
  await openToxic(page);
  const n = await toxicN(page);
  await press(page, 'button', `Tick these ${n}`);
  await says(page, `${n} ticked in Your plants.`);
  const said = await page.evaluate((w) => [...document.querySelectorAll('#ct-root [role="status"]')].some((e) => e.textContent.includes(w)), `${n} ticked in Your plants.`);
  assert.ok(said, 'board: said in a status');
  await frames(page);
  assert.equal((await focused(page)).name, `Remove ${n} plants`, 'board: the focus on Remove');
  await done(page);
});

test('PFE22 (pf-e BC11, board ManyDesk): at 960 px and wider Your plants\' note says the desk\'s sentences; the phone keeps its own', async () => {
  const page = await loadPalette200({ width: 1280 });
  await says(page, en['consortium.many.footDesk']);
  await saysNot(page, en['consortium.many.foot']);
  await done(page);
});

test('PFE23 (pf-e A22, BC12; F30, ManyDesk): while the search stands in place of the list, the list\'s lede and its "Add plants" give way; Done brings them back with the focus on "Add plants"', async () => {
  const page = await loadPalette200({ width: 1280 });
  await press(page, 'button', 'Add plants');
  assert.ok(await has(page, `${PLANTS} .ct-find`, 15_000), 'board: the search opens inside Your plants');
  await saysNot(page, en['consortium.many.ledeDesk'], 'the lede of a hidden list');
  assert.ok(!(await names(page, 'button')).includes('Add plants'), 'board: no second "Add plants" above the search\'s own head');
  await press(page, 'button', 'Done');
  await says(page, en['consortium.many.ledeDesk']);
  assert.equal((await focused(page)).name, 'Add plants', 'board: the focus goes back to "Add plants"');
  await done(page);
});

// ---- fix round 1, batch 2 (board check findings BC13 to BC24, review R1) ----

// Board Paste's palette: kiambu-8 less avocado, grevillea and napier (corn, common bean and pigeon pea in it).
async function boardPastePage(width) {
  const page = await loadCase('kiambu-8', { width });
  await page.evaluate(() => {
    const s = window.__ctTest.store, out = new Set(['Persea americana', 'Grevillea robusta', 'Cenchrus purpureus']);
    s.members.value = s.memberTaxa.value.filter((t) => !out.has(t.canonical_name)).map((t) => t.id);
  });
  return page;
}
// The 215-name paste of PFE12 (AddMany state 4) on the 200-plant case's first 20 plants.
async function bigPastePage(width) {
  const page = await loadPalette200({ width });
  const text = await page.evaluate(() => {
    const s = window.__ctTest.store, have = s.members.value.slice(0, 20);
    const rest = s.memberTaxa.value.slice(20, 210).map((t) => (t.names?.en ?? t.canonical_name).toLowerCase());
    s.members.value = have;
    return [...rest, 'beans', 'spanish cedar', 'sword bean', 'sukuma wiki', 'managu', 'terere', 'mrenda', 'kunde', 'nduma', 'mchicha', 'saga', 'mitoo', 'kanzira', 'nderema', 'thabai'].join('\n');
  });
  await pasteText(page, text);
  await says(page, /\b\d{3} names read\b/, { inDialog: true, timeout: 15_000 });
  return page;
}
// The box of the smallest element in the open dialog whose text is exactly `words` (or starts with it).
const dialogBox = (page, words, starts = false) => page.evaluate((w, s) => {
  let best = null;
  for (const el of document.querySelectorAll('dialog[open] *')) {
    const t = el.textContent.replace(/\s+/g, ' ').trim();
    if (!(s ? t.startsWith(w) : t === w)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    if (!best || r.width * r.height < best.width * best.height) best = { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  }
  return best;
}, words, starts);

test('PFE24 (pf-e BC13, board Paste): the title "Paste a list" and its subtitle share the head row with ×', async () => {
  for (const width of [390, 1280]) {
    const page = await boardPastePage(width);
    await page.evaluate(() => window.__ctTest.store.openSheet('paste'));
    assert.ok(await has(page, 'dialog[open] #ct-paste-text', 15_000));
    const at = await page.evaluate(() => {
      const d = document.querySelector('dialog[open]'), h = [...d.querySelectorAll('h2')].find((x) => x.textContent.trim() === 'Paste a list');
      const x = d.querySelector('button[aria-label="Close"]');
      const r = (e) => e.getBoundingClientRect();
      return { title: { top: r(h).top, bottom: r(h).bottom }, close: { top: r(x).top, bottom: r(x).bottom } };
    });
    assert.ok(at.close.top < at.title.bottom && at.close.bottom > at.title.top, `board at ${width}: × on the title's row (title ${Math.round(at.title.top)}-${Math.round(at.title.bottom)}, × ${Math.round(at.close.top)}-${Math.round(at.close.bottom)})`);
    await done(page);
  }
});

test('PFE25 (pf-e BC15, A16, board Paste): "beans" offers Common bean, Lima bean, Sword bean first; Common bean says "in your palette"; the count is the choices offered', async () => {
  for (const width of [390, 1280]) {
    const page = await boardPastePage(width);
    await pasteText(page, SMALL_PASTE);
    await says(page, /“beans” Which bean\? \d+ plants are called bean\./, { inDialog: true });
    const choices = () => page.$$eval('dialog[open] [role="group"]', (gs) => {
      const g = gs.find((x) => /beans/.test(x.getAttribute('aria-label') ?? ''));
      return [...g.querySelectorAll('button[aria-pressed]')].map((c) => c.textContent.replace(/\s+/g, ' ').trim());
    });
    const first = await choices();
    assert.deepEqual(first.slice(0, 3).map((t) => t.replace(/ [A-Z][a-z]+ [a-z].*$/, '')), ['Common bean', 'Lima bean', 'Sword bean'], `board: the beans in the board's order (A16): ${first.slice(0, 4).join(' | ')}`);
    assert.match(first[0], /· in your palette$/, 'board AddMany: a plant you have says "· in your palette"');
    // MoreList's sequence: "+ N more" (to 10), then "+ N more" (all).
    for (let k = 0; k < 2; k++) {
      await page.$$eval('dialog[open] [role="group"] .ct-more-open', (bs) => bs.forEach((b) => b.click()));
      await frames(page);
    }
    const all = (await choices()).filter((t) => t !== 'None');
    const n = Number((await dialogText(page)).match(/(\d+) plants are called bean\./)[1]);
    assert.equal(all.length, n, `the count says the choices offered (${n} said, ${all.length} offered)`);
    await done(page);
  }
});

test('PFE26 (pf-e BC17, board Paste at 390): marks inline after "· new"; "8 names read" on one small line; a light field; equal foot buttons; "Skip the N left" a text link', async () => {
  const page = await boardPastePage(390);
  await pasteText(page, SMALL_PASTE);
  await says(page, '8 names read', { inDialog: true });
  const q = await dialogBox(page, '“avocado”'), tox = await dialogBox(page, 'Toxic');
  assert.ok(Math.abs(tox.top + tox.height / 2 - (q.top + q.height / 2)) < 8, `board: "Toxic" sits on the line of “avocado” · new (${Math.round(tox.top)} against ${Math.round(q.top)})`);
  const at = await page.evaluate(() => {
    const d = document.querySelector('dialog[open]');
    const h = [...d.querySelectorAll('h3')].find((x) => x.textContent.trim().startsWith('8 names read'));
    const field = d.querySelector('#ct-paste-text');
    const probe = document.createElement('div'); probe.style.background = 'var(--surface)'; field.parentElement.append(probe);
    const surface = getComputedStyle(probe).backgroundColor; probe.remove();
    const btn = (w) => [...d.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(w));
    const skip = btn('Skip the');
    return {
      lines: (() => { const r = document.createRange(); r.selectNodeContents(h); return new Set([...r.getClientRects()].filter((x) => x.width > 4).map((x) => Math.round(x.bottom))).size; })(), size: getComputedStyle(h).fontSize,
      field: getComputedStyle(field).backgroundColor, surface,
      cancel: btn('Cancel').getBoundingClientRect().width, add: btn('Add').getBoundingClientRect().width,
      skipLink: skip && { deco: getComputedStyle(skip).textDecorationLine, border: getComputedStyle(skip).borderTopColor, bg: getComputedStyle(skip).backgroundColor },
    };
  });
  assert.equal(at.lines, 1, 'board: "8 names read …" on one line');
  assert.equal(at.size, '14px', 'board: the summary line in small type');
  assert.equal(at.field, at.surface, 'board: the field is light (the surface)');
  assert.ok(Math.abs(at.cancel - at.add) <= 2, `board: Cancel and Add of one width (${Math.round(at.cancel)}, ${Math.round(at.add)})`);
  assert.ok(at.skipLink, 'board: "Skip the N left"');
  assert.match(at.skipLink.deco, /underline/, 'board: Skip is a text link');
  assert.match(at.skipLink.bg, /rgba\(0, 0, 0, 0\)|transparent/, 'board: Skip has no button face');
  await done(page);
});

test('PFE27 (pf-e BC17-BC20, boards Paste and AddMany): 215 names: the Need a choice lede in the board\'s words with a loose word of the list; the head counts what the foot counts; "+ N more" a pill; the Not found row and the closing note in the board\'s words', async () => {
  const page = await bigPastePage(390);
  await openGroup(page, /^Need a choice/);
  await says(page, 'Each choice shows its fit, or says it is in your palette. A loose word (“beans”) asks too: nothing is added unasked.', { inDialog: true });
  const head = await control(page, 'button', /^Need a choice \d+$/);
  const n = Number(head.name.match(/\d+$/)[0]);
  await says(page, `0 chosen, ${n} to go. A name you leave is not added.`, { inDialog: true });
  await control(page, 'button', `Skip the ${n} left`);
  const more = await page.evaluate(() => {
    const b = [...document.querySelectorAll('dialog[open] button')].find((x) => /^\+ \d+ more: Show the other questions$/.test(x.getAttribute('aria-label') ?? ''));
    if (!b) return null;
    const r = b.getBoundingClientRect(), s = getComputedStyle(b);
    return { w: r.width, h: r.height, radius: parseFloat(s.borderTopLeftRadius), border: s.borderTopStyle, sheet: b.closest('dialog').getBoundingClientRect().width };
  });
  assert.ok(more, 'board AddMany: "+ N more" questions');
  assert.ok(more.w < more.sheet / 3 && more.h >= 44 && more.radius >= 20 && more.border === 'solid', `board AddMany: "+ N more" a small pill (${JSON.stringify(more)})`);
  await openGroup(page, /^Not found/);
  await says(page, '“sukuma wiki” Not found. Search by hand', { inDialog: true });
  await saysNot(page, 'No climate list in Canopi has these names');
  await says(page, 'A name that fits one plant is taken as that plant, in your palette or not; a name that fits several asks, and each choice says if you have it. The Add button counts what is recognised and new, and what you have chosen. Plants are added as they are, with their warnings. Nothing in your palette is replaced.', { inDialog: true });
  await done(page);
});

test('PFE28 (pf-e BC24, board Recife pt at 390): the first toxic row says why it is kept, the first tall row the small-garden rule; the light icon stays with "Plantada em"', async () => {
  const page = await loadCase('recife-today', { site: 'manaus', lang: 'pt', width: 390 });
  await page.evaluate(() => { window.__ctTest.store.room.value = 'small'; });
  await verdictsSettled(page);
  assert.ok(await has(page, `${PLANTS} [data-note="room-tall"]`, 8000), 'the premise: a tall plant in a small garden');
  const rows = await rowsShown(page);
  const TOX = 'Registrada como tóxica. Nós avisamos; a escolha é sua.';
  const ROOM = 'Num quintal pequeno, avisamos acima de 6 m. A planta fica na lista: a escolha é sua. Alturas são máximas na natureza.';
  const toxic = rows.filter((r) => / Tóxica\b| Muito tóxica\b/.test(r.text));
  assert.ok(toxic.length > 0, 'the premise: a toxic row');
  assert.ok(toxic[0].text.includes(TOX), `board: the first toxic row says "${TOX}": ${toxic[0].text}`);
  assert.equal(rows.filter((r) => r.text.includes(TOX)).length, 1, 'board: said once');
  const tallId = await page.$eval(`${PLANTS} [data-plant-id]:has([data-note="room-tall"])`, (e) => e.dataset.plantId);
  assert.ok(rows.find((r) => r.id === tallId).text.includes(ROOM), 'board: the first tall row says the small-garden rule');
  assert.equal(rows.filter((r) => r.text.includes(ROOM)).length, 1, 'board: said once');
  const apart = await page.$$eval(`${PLANTS} [data-plant-id]`, (els) => els.map((li) => {
    const icon = li.querySelector('svg[data-light]');
    const walk = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
    let text = null;
    while (walk.nextNode()) if (/^\s*Plantada em/.test(walk.currentNode.textContent)) { text = walk.currentNode; break; }
    if (!icon || !text) return null;
    const range = document.createRange(); range.selectNodeContents(text);
    const first = range.getClientRects()[0], i = icon.getBoundingClientRect();
    return Math.abs((i.top + i.bottom) / 2 - (first.top + first.bottom) / 2) < 8 ? null : li.dataset.plantId;
  }).filter(Boolean));
  assert.deepEqual(apart, [], 'board: the light icon on the line of "Plantada em", never alone above it');
  await done(page);
});

test('PFE29 (pf-e R1): past 40 plants every row keeps each warning the small form shows (toxicity, invasive, a site misfit, a serious conflict), whatever its main reason', { timeout: 300_000 }, async () => {
  const page = await loadPalette200({ width: 390 });
  const all = await page.evaluate(() => window.__ctTest.store.members.value.slice());
  // The small form's marks of each plant, 40 plants at a time (the site and country stay; conflicts
  // depend on the palette, so they are left out).
  const small = {};
  for (let k = 0; k < all.length; k += 40) {
    await page.evaluate((ids) => { window.__ctTest.store.members.value = ids; }, all.slice(k, k + 40));
    await verdictsSettled(page);
    assert.ok(await has(page, `${PLANTS} [data-plant-id="${all[k]}"]`, 8000));
    Object.assign(small, await page.$$eval(`${PLANTS} [data-plant-id]`, (els) => Object.fromEntries(els.map((e) => [e.dataset.plantId,
      [...e.querySelectorAll('[data-kind="toxicity"], [data-kind="invasive"], [data-kind="misfit"]')].map((m) => m.textContent.replace(/\s+/g, ' ').trim())]))));
  }
  await page.evaluate((ids) => { window.__ctTest.store.members.value = ids; }, all);
  await verdictsSettled(page);
  await page.select('#ct-root select[data-plants-group]', 'none').catch(() => {});
  await control(page, 'textbox', SEARCH(200));
  const missing = [];
  for (const [id, marks] of Object.entries(small)) {
    if (!marks.length) continue;
    const q = await page.evaluate((x) => window.__ctTest.store.memberTaxa.value.find((t) => t.id === x).canonical_name, id);
    await typeIn(page, `#ct-root input[aria-label="${SEARCH(200)}"]`, q);
    const ok = await has(page, `${PLANTS} [data-plant-id="${id}"]`, 3000);
    const text = ok ? (await rowsShown(page)).find((r) => r.id === id)?.text ?? '' : '';
    for (const m of marks) if (!text.includes(m)) missing.push(`${q}: "${m}" not on "${text}"`);
  }
  // A serious conflict between two of the 200 (the small form's Marks say it with the other plant's name).
  const clashes = await page.evaluate(() => {
    const s = window.__ctTest.store, out = [];
    for (const t of s.memberTaxa.value) for (const f of s.flagsOfPlant(t)) {
      if (f.kind !== 'conflict' || f.severity !== 'high' || !f.other) continue;
      const o = s.taxonOf(f.other);
      if (o) out.push({ id: t.id, q: t.canonical_name, other: o.names?.en ?? o.canonical_name });
    }
    return out;
  });
  assert.ok(clashes.length > 0, 'the premise: a serious conflict among the 200');
  for (const c of clashes) {
    await typeIn(page, `#ct-root input[aria-label="${SEARCH(200)}"]`, c.q);
    const ok = await has(page, `${PLANTS} [data-plant-id="${c.id}"]`, 3000);
    const text = ok ? (await rowsShown(page)).find((r) => r.id === c.id)?.text ?? '' : '';
    if (!text.includes(c.other)) missing.push(`${c.q}: its conflict with ${c.other} not on "${text}"`);
  }
  assert.deepEqual(missing, [], 'R1: a warning the small form shows is never dropped past 40 plants');
  await done(page);
});

// ---- fix round 1, batch 3 (review R2 to R14) ----

// The reader's own reading of what has the focus: its row's plant, whether it is drawn (not a 1 px box).
const focusedAt = (page) => page.evaluate(() => {
  const a = document.activeElement, r = a?.getBoundingClientRect();
  return { body: !a || a === document.body, plant: a?.closest('[data-plant-id]')?.dataset.plantId ?? null, drawn: !!r && r.width > 2 && r.height > 2,
    inView: !!r && r.bottom > 0 && r.top < innerHeight, box: r ? [Math.round(r.top), Math.round(r.bottom), innerHeight, Math.round(scrollY)] : null, name: (a?.getAttribute('aria-label') ?? a?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) };
});
// The page's (smooth) scroll come to rest.
const scrolled = (page) => page.evaluate(() => new Promise((done) => {
  let last = -1, still = 0;
  const tick = () => { if (scrollY === last) still++; else { still = 0; last = scrollY; } if (still > 5) done(); else requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}));
// The palette cut to its first n plants (the 200-plant case's), verdicts settled.
async function paletteOf(n, width) {
  const page = await loadPalette200({ width });
  await page.evaluate((k) => { const s = window.__ctTest.store; s.members.value = s.members.value.slice(0, k); }, n);
  assert.ok(await verdictsSettled(page));
  return page;
}

test('PFE30 (pf-e R2): on the phone "Tick these N" takes the focus to the tick bar\'s Remove, on screen, says it in a status, and opens the groups so every ticked row shows', async () => {
  const page = await loadPalette200({ width: 390 });
  await openToxic(page);
  const n = await toxicN(page);
  await press(page, 'button', `Tick these ${n}`);
  await frames(page);
  await scrolled(page);
  const f = await focusedAt(page);
  assert.equal(f.name, `Remove ${n} plants`, 'R2: the focus goes to the tick bar\'s Remove');
  assert.ok(f.inView, `R2: Remove is on screen (${JSON.stringify(f.box)})`);
  const said = await page.evaluate((w) => [...document.querySelectorAll('#ct-root [role="status"]')].some((e) => e.textContent.includes(w)), `${n} ticked in Your plants.`);
  assert.ok(said, 'R2: said in a polite status');
  assert.equal((await rowsShown(page)).filter((r) => r.ticked).length, n, 'R2: every ticked row is shown');
  await done(page);
});

test('PFE31 (pf-e R3): ticking two closed groups whole, Remove, then Undo lands the focus on a restored row that is drawn, never on a hidden title; a focused palette title is drawn', async () => {
  const page = await loadPalette200({ width: 390 });
  const counts = await strataCounts(page);
  const two = Object.entries(LIGHT_OF).filter(([s]) => counts[s]).sort((a, b) => counts[a[0]] - counts[b[0]]).slice(0, 2);
  for (const [s, word] of two) await press(page, 'button', `Tick all ${counts[s]} in ${word}`);
  const n = counts[two[0][0]] + counts[two[1][0]];
  await press(page, 'button', `Remove ${n} plants`);
  assert.ok(await page.waitForFunction((k) => window.__ctTest.store.members.value.length === 200 - k, { timeout: 4000 }, n).then(() => true, () => false));
  await page.click('.ct-toast-page .ct-toast-undo');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 200, { timeout: 4000 }).then(() => true, () => false));
  await frames(page);
  const f = await focusedAt(page);
  assert.ok(f.plant && f.drawn, `R3: the focus on a restored row, drawn (${JSON.stringify(f)})`);
  await page.evaluate(() => document.querySelector('#ct-root [data-view-heading]').focus());
  assert.ok((await focusedAt(page)).drawn, 'R3: the palette title shows while it has the focus');
  await done(page);
});

test('PFE32 (pf-e R4): a name not found twice counts as 2 not found, never as recognised', async () => {
  const page = await boardPastePage(390);
  await pasteText(page, 'sukuma wiki\nsukuma wiki\npigeon pea');
  await says(page, '3 names read 1 recognised, 2 not found', { inDialog: true });
  await control(page, 'button', /^Not found 2$/);
  await done(page);
});

test('PFE33 (pf-e R5): with the clipboard refused, typing in the paste box keeps the focus there while the names to copy by hand show', async () => {
  const page = await boardPastePage(390);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }));
  await pasteText(page, 'qxzvka\nqxzvkb\nqxzvkc');
  await openGroup(page, /^Not found/);
  await press(page, 'button', 'Copy these 3 names');
  assert.ok(await has(page, 'dialog[open] textarea[readonly]', 3000), 'the names to copy by hand');
  // The field takes the focus once as it shows (F25); the grower then goes back to the paste box.
  assert.ok(await page.waitForFunction(() => document.activeElement?.matches('dialog[open] textarea[readonly]'), { timeout: 3000 }).then(() => true, () => false), 'the names to copy by hand take the focus as they show');
  await page.focus('dialog[open] #ct-paste-text');
  await page.keyboard.type('zz');
  const at = await page.evaluate(() => document.activeElement?.id ?? '');
  assert.equal(at, 'ct-paste-text', 'R5: the focus stays in the paste box while typing');
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(await page.evaluate(() => document.activeElement?.id ?? ''), 'ct-paste-text', 'R5: and after the reading settles');
  assert.match(await page.$eval('dialog[open] #ct-paste-text', (el) => el.value), /qxzvkczz$/);
  await done(page);
});

test('PFE34 (pf-e R6, R12, C5): Not found folds by the size rule (MoreList): three names and "+ N more", then 10, then all, then "Show fewer"; each "+ N more" says its count first and hands the focus to the first name it shows; "Skip the N left" hands it to the progress line', async () => {
  const page = await boardPastePage(390);
  const lost = Array.from({ length: 13 }, (_, i) => `qxzvk${'abcdefghijklm'[i]}`);
  await pasteText(page, [...lost, 'beans', 'napier'].join('\n'));
  await openGroup(page, /^Not found/);
  const shownLost = () => page.$$eval('dialog[open] [data-paste-row][data-status="none"]', (els) => els.length);
  assert.equal(await shownLost(), 3, 'C5: a list of 13 starts with three names');
  const at = async () => page.evaluate(() => document.activeElement?.textContent ?? '');
  await press(page, 'button', (await control(page, 'button', /^\+ 10 more\b/)).name);
  await frames(page);
  assert.equal(await shownLost(), 10, 'C5: then 10');
  assert.ok((await at()).includes(lost[3]), `R6: the focus on the first name "+ 10 more" showed (${await at()})`);
  await press(page, 'button', (await control(page, 'button', /^\+ 3 more\b/)).name);
  await frames(page);
  assert.equal(await shownLost(), 13, 'C5: then all');
  assert.ok((await at()).includes(lost[10]), `R6: the focus on the first name "+ 3 more" showed (${await at()})`);
  await press(page, 'button', 'Show fewer');
  await frames(page);
  assert.equal(await shownLost(), 3, 'C5: "Show fewer" folds it back');
  await openGroup(page, /^Need a choice/);
  await press(page, 'button', 'Skip the 2 left');
  await frames(page);
  assert.match((await focusedAt(page)).name, /^0 chosen, 0 to go\./, 'R6: the focus on the progress line after Skip');
  await done(page);
});

test('PFE35 (pf-e R8): a Toxic (Moderate) plant\'s mark is in the danger colour past 40 plants as at 40 or fewer', async () => {
  const page = await loadPalette200({ width: 390 });
  const q = await page.evaluate(() => { const s = window.__ctTest.store; return s.memberTaxa.value.find((t) => t.warnings?.toxicity?.level === 'Moderate')?.canonical_name ?? null; });
  assert.ok(q, 'the premise: a Moderate plant among the 200');
  await control(page, 'textbox', SEARCH(200));
  await typeIn(page, `#ct-root input[aria-label="${SEARCH(200)}"]`, q);
  assert.ok(await has(page, `${PLANTS} [data-kind="toxicity"]`, 3000));
  const many = await page.$eval(`${PLANTS} [data-kind="toxicity"]`, (el) => [el.dataset.level, getComputedStyle(el).borderTopColor]);
  await page.evaluate((name) => { const s = window.__ctTest.store; s.members.value = s.memberTaxa.value.filter((t) => t.canonical_name === name).map((t) => t.id); }, q);
  assert.ok(await has(page, `${PLANTS} [data-kind="toxicity"]`, 3000));
  const small = await page.$eval(`${PLANTS} [data-kind="toxicity"]`, (el) => [el.dataset.level, getComputedStyle(el).borderTopColor]);
  assert.deepEqual(many, small, 'R8: one level-to-colour map in both forms');
  assert.equal(many[0], 'danger');
  await done(page);
});

test('PFE36 (pf-e R9): ticks belong to the many form: at 40 or fewer they go, and past 40 again no old "Remove N plants" comes back', async () => {
  const page = await paletteOf(45, 390);
  const { word, n } = await firstLevel(page);
  await press(page, 'button', `${word} ${n} plants`);
  const rows = (await rowsShown(page)).slice(0, 3);
  for (const r of rows) await page.click(`${PLANTS} [data-plant-id="${r.id}"] input[type="checkbox"]`);
  await control(page, 'group', '3 plants ticked');
  const ticked = rows.map((r) => r.id);
  await page.evaluate((keep) => { const s = window.__ctTest.store; for (const id of s.members.value.filter((x) => !keep.includes(x)).slice(0, 6)) s.removeMember(id); }, ticked);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 39, { timeout: 4000 }).then(() => true, () => false));
  await frames(page);
  await page.evaluate(() => { const s = window.__ctTest.store, m = new Set(s.members.value); s.addMembers(s.pool.value.filter((t) => !m.has(t.id)).slice(0, 5).map((t) => t.id)); });
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 44, { timeout: 4000 }).then(() => true, () => false));
  await frames(page);
  assert.ok(!(await names(page, 'button')).some((x) => /^Remove \d+ plants?$/.test(x)), 'R9: no old "Remove 3 plants" back');
  await done(page);
});

test('PFE37 (pf-e R10, ManyDesk): with the search open in place of the table, Undo back to 40 or fewer keeps the search open beside the chart', async () => {
  const page = await paletteOf(43, 1280);
  await press(page, 'button', 'Add plants');
  assert.ok(await has(page, `${PLANTS} .ct-find`, 15_000), 'the search opens inside Your plants');
  await page.evaluate(() => { const s = window.__ctTest.store; s.members.value = s.members.value.slice(0, 38); });
  await frames(page);
  assert.ok(await has(page, '#ct-root [data-find-panel]', 3000), 'R10: the search stays open (beside the chart)');
  await done(page);
});

test('PFE38 (pf-e R11, ManyDesk): the head tick is off while no row shows, and part-ticked when some shown rows are ticked', async () => {
  const page = await loadPalette200({ width: 1280 });
  const head = await control(page, 'checkbox', 'Tick the rows on screen');
  assert.ok(head.disabled, 'R11: no rows on screen: the head tick is off');
  const { word, n } = await firstLevel(page);
  await press(page, 'button', `${word} ${n} plants`);
  const first = (await rowsShown(page))[0];
  await page.click(`${PLANTS} [data-plant-id="${first.id}"] input[type="checkbox"]`);
  const state = await page.$eval(`${PLANTS} thead input[type="checkbox"]`, (el) => ({ ind: el.indeterminate, on: el.checked, off: el.disabled }));
  assert.deepEqual(state, { ind: true, on: false, off: false }, 'R11: some shown rows ticked: part-ticked');
  await done(page);
});

test('PFE39 (pf-e R12): Your plants\' "+ N more" starts its spoken name with its visible words', async () => {
  const page = await loadPalette200({ width: 390 });
  const counts = await strataCounts(page);
  const [s, word] = Object.entries(LIGHT_OF).find(([k]) => (counts[k] ?? 0) > 10);
  await press(page, 'button', `${word} ${counts[s]} plants`);
  const more = await control(page, 'button', new RegExp(`^\\+ ${counts[s] - 10} more\\b.*${word}`));
  // C11 (the size rule's sequence, as MoreList): all, then "Show fewer" back to 10, the focus on "+ N more".
  await press(page, 'button', more.name);
  await frames(page);
  assert.equal((await rowsShown(page)).length, counts[s], `all ${counts[s]} rows`);
  await press(page, 'button', 'Show fewer');
  await frames(page);
  assert.equal((await rowsShown(page)).length, 10, 'C11: "Show fewer" folds the group back to its first 10');
  assert.match((await focused(page)).name, new RegExp(`^\\+ ${counts[s] - 10} more`), 'C11: the focus back on "+ N more"');
  await done(page);
});

test('PFE40 (pf-e R13): an open reading follows the verdicts: when they change (a verdict chunk loaded late, another place) its choices take the fresh reading\'s fit order', async () => {
  const page = await loadPalette200({ width: 390 });
  await page.evaluate(() => { const s = window.__ctTest.store; s.members.value = s.members.value.slice(0, 20); });
  const order = () => page.$$eval('dialog[open] [role="group"] .ct-paste-choice', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim().replace(/ ·.*$/, '')));
  await pasteText(page, 'beans');
  await says(page, /“beans” Which bean\?/, { inDialog: true });
  const before = await order();
  // The verdicts change under the open reading: Common bean now needs a second look (a rule whose
  // verdicts say so; every other verdict as the engine gives it).
  await page.evaluate(() => {
    const s = window.__ctTest.store, rule = s.verdictRule.value;
    s.verdictRule.value = { ...rule, verdicts: (ts, ctx) => { const m = rule.verdicts(ts, ctx); for (const t of ts) if (t.canonical_name === 'Phaseolus vulgaris' && m.get(t.id)) m.set(t.id, { ...m.get(t.id), level: 'look' }); return m; } };
  });
  await frames(page);
  const late = await order();
  await pasteText(page, 'beans');
  await says(page, /“beans” Which bean\?/, { inDialog: true });
  await frames(page);
  const fresh = await order();
  assert.notDeepEqual(before, fresh, `the premise: the new verdicts change the beans' fit order (${fresh.slice(0, 3).join(' | ')})`);
  assert.deepEqual(late, fresh, 'R13: the open reading in the fresh reading\'s order');
  await done(page);
});

// ---- fix round 1, batch 4 (review C1 to C12) ----

test('PFE41 (pf-e C6, board AddMany, word-map 10): a choice already in the palette is pressable, says "· in your palette", answers its question and adds nothing', async () => {
  const page = await boardPastePage(390);
  await pasteText(page, SMALL_PASTE);
  await says(page, /“beans” Which bean\?/, { inDialog: true });
  const progress = async () => (await dialogText(page)).match(/(\d+) chosen, (\d+) to go\./)?.slice(1).map(Number) ?? null;
  const [chosen0, left0] = await progress();
  const add0 = (await control(page, 'button', /^Add \d+ plants?$/)).name;
  const mine = (await names(page, 'button')).find((n) => /^Common bean .*· in your palette$/.test(n));
  assert.ok(mine, 'C6: "Common bean … · in your palette" is a button');
  await press(page, 'button', mine);
  assert.equal((await control(page, 'button', mine)).pressed, true, 'C6: pressed, it is the answer');
  assert.deepEqual(await progress(), [chosen0 + 1, left0 - 1], 'C6: the question counts as answered');
  assert.equal((await control(page, 'button', /^Add \d+ plants?$/)).name, add0, 'C6: and it adds nothing');
  await done(page);
});

test('PFE42 (pf-e F23, C3): 0 lines and a header alone say "Nothing to read"; 5,000 lines are read in slices with "N of 5,000 read", the page answering meanwhile (the longest task reported)', async (t) => {
  const page = await boardPastePage(390);
  await page.evaluate(() => window.__ctTest.store.openSheet('paste'));
  assert.ok(await has(page, 'dialog[open] #ct-paste-text', 15_000));
  await says(page, 'Paste or type names above.', { inDialog: true });
  await page.click('dialog[open] [data-paste-read]');
  await says(page, 'Nothing to read.', { inDialog: true });
  await pasteText(page, 'Scientific name\tQty\n');
  await says(page, 'Nothing to read.', { inDialog: true });
  await saysNot(page, 'names read', 'F23: the header is skipped, not read as a name');
  // 5,000 different lines (none a plant: each goes through the whole search).
  const lines = Array.from({ length: 5000 }, (_, i) => `zq${i.toString(36)}xv`).join('\n');
  await page.evaluate(() => {
    window.__paste = { progress: [], long: [] };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__paste.long.push(Math.round(e.duration)); }).observe({ type: 'longtask' });
    new MutationObserver(() => { const p = document.querySelector('dialog[open] [data-paste-reading]'); if (p && window.__paste.progress.at(-1) !== p.textContent) window.__paste.progress.push(p.textContent); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  const t0 = Date.now();
  await pasteText(page, lines);
  await says(page, '5,000 names read', { inDialog: true, timeout: 120_000 });
  const ms = Date.now() - t0;
  const seen = await page.evaluate(() => window.__paste);
  assert.ok(seen.progress.some((p) => /^[\d,]+ of 5,000 read$/.test(p)), `F23: the progress line ("N of 5,000 read"): ${seen.progress.slice(0, 3).join(' | ')}`);
  t.diagnostic(`F23 5,000 lines: read in ${ms} ms; progress steps ${seen.progress.length}; longest task ${Math.max(0, ...seen.long)} ms; tasks over 200 ms: ${seen.long.filter((x) => x > 200).length} (reported, never a failure)`);
  await done(page);
});

test('PFE43 (pf-e F24, C7): while the names file loads, Paste says so and matches on the plants\' own names; when it arrives the reading refreshes and the grower\'s choice stays', async () => {
  const page = await tool({ names: 'hold' });
  await choose(page, 'Tropical');
  // A loose word (the fixture's Ice-cream bean): a search guess stays a question even when it finds one
  // plant (pf-decisions 2026-11-19, C8), to answer before the file arrives.
  const word = 'beans';
  await pasteText(page, `Gombo\n${word}`);
  assert.ok(await has(page, 'dialog[open] [data-paste-names="loading"]', 4000), 'F24: "Names in other languages are still loading."');
  await says(page, '“Gombo” Not found.', { inDialog: true });
  const choice = (await page.$$eval('dialog[open] [role="group"] button[aria-pressed]', (bs) => bs.map((b) => b.textContent.replace(/\s+/g, ' ').trim())))[0];
  await page.click('dialog[open] [role="group"] button[aria-pressed]');
  await page.releaseHeld();
  assert.ok(await page.waitForFunction(() => !document.querySelector('dialog[open] [data-paste-names]'), { timeout: 15_000 }).then(() => true, () => false), 'F24: the line goes when the file is in');
  await saysNot(page, '“Gombo” Not found.', 'F24: the reading refreshes with the file\'s names');
  const kept = await page.$$eval('dialog[open] [role="group"] button[aria-pressed="true"]', (bs) => bs.map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
  assert.deepEqual(kept, [choice], 'F24: the grower\'s choice is kept');
  await done(page);
});

test('PFE44 (pf-e F25, C7, C9): one name not found has its "Copy this name"; a refused copy puts the names in a selected field with Share\'s words under it', async () => {
  const page = await boardPastePage(390);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }));
  await pasteText(page, 'qxzvka\npigeon pea');
  await openGroup(page, /^Not found/);
  await press(page, 'button', 'Copy this name');
  assert.ok(await has(page, 'dialog[open] textarea[readonly]', 3000), 'F25: the names to copy by hand');
  await page.waitForFunction(() => document.activeElement?.matches('dialog[open] textarea[readonly]'), { timeout: 3000 }).catch(() => {});
  const sel = await page.$eval('dialog[open] textarea[readonly]', (el) => ({ v: el.value, all: el.selectionStart === 0 && el.selectionEnd === el.value.length, focus: document.activeElement === el }));
  assert.deepEqual(sel, { v: 'qxzvka', all: true, focus: true }, 'F25: selected, ready to copy');
  await says(page, 'Copy the names above by hand.', { inDialog: true });
  await done(page);
});

failing('PFE45 (pf-e E4, C2; hand-off: main passes Actions into Palette.tsx\'s foot slot and drops App.tsx slot(Actions)): past 40 plants at 1280 the palette\'s foot stands under Balance, in Your plants\' column (boards MainMore, PaletteMore)', { owner: 'pf-e', reason: /the foot is not under Balance/ }, async () => {
  const page = await loadPalette200({ width: 1280 });
  await says(page, 'Your palette is saved on this device.');
  const at = { bal: await sectionBox(page, 'Balance'), foot: await boxOf(page, 'Your palette is saved on this device.') };
  assert.ok(at.bal && at.foot && at.foot.x >= at.bal.x - 1 && at.foot.right <= at.bal.right + 1 && at.foot.y >= at.bal.bottom - 1, `board: the foot is not under Balance (${JSON.stringify(at)})`);
  await done(page);
});

test('PFE46 (pf-e C9, board PaletteMore): a climber with a height and no width reads "Climbs to …, no width recorded" in the small form', async () => {
  const page = await loadCase('kiambu-8', { width: 390 });
  const climber = await page.evaluate(() => {
    const s = window.__ctTest.store, t = (s.pool.value ?? []).find((x) => x.traits?.habit === 'Climber' && x.traits.width_max_m == null && x.traits.height_m?.max != null);
    if (!t) return null;
    s.members.value = [...s.members.value.slice(0, 5), t.id];
    return t.names?.en ?? t.canonical_name;
  });
  assert.ok(climber, 'the premise: a climber with a height and no width on the list');
  await says(page, new RegExp(`${climber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} .*Climbs to [\\d.,]+ (?:m|cm), no width recorded`));
  await done(page);
});
