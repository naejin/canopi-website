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
import { control, done, focused, frames, loadCase, loadPalette200, names, press, says, saysNot, toastText, verdictsSettled } from './pf-helpers.mjs';
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
  if (n > 10) await control(page, 'button', `Show the other plants in ${word}`);
  const rank = await fitRanks(page);
  const ranks = rows.map((r) => rank[r.id]);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), `board: sorted by fit (outside, second look, a mark, fits, not checked): ${ranks.join(' ')}`);
  const first = await page.evaluate((id) => window.__ctTest.store.memberTaxa.value.find((t) => t.id === id), rows[0].id);
  const name = first.names?.en ?? first.canonical_name;
  await control(page, 'checkbox', `Tick ${name}`);
  assert.ok(rows[0].text.includes(first.canonical_name), 'board: the row names the plant\'s scientific name');
  assert.match(rows.map((r) => r.text).join(' | '), /year \d+ to year \d+|from year \d+ on|first year|first \d+/, 'board: rows say when each plant stands');
  if (n > 10) {
    await press(page, 'button', `Show the other plants in ${word}`);
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
  // after it are the engine's: "napier" is a search guess, so it asks (pf decision: never taken unasked;
  // the board draws it found), and the beans the pool holds are the ones named).
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
  const choices = await page.$$eval('dialog[open] [role="group"] button[aria-pressed]', (bs) => bs.map((b) => ({ t: b.textContent.replace(/\s+/g, ' ').trim(), on: b.getAttribute('aria-pressed') })));
  assert.ok(choices.slice(0, 3).every((c) => /\bbean\b/i.test(c.t)), `board: the plants named bean come first (A16): ${choices.slice(0, 3).map((c) => c.t)}`);
  assert.ok(choices.every((c) => c.on === 'false'), 'board: nothing chosen for the grower');
  await press(page, 'button', choices[0].t);
  await press(page, 'button', 'Add 3 plants');
  assert.ok(await page.waitForFunction((n) => window.__ctTest.store.members.value.length === n + 3, { timeout: 8000 }, before).then(() => true, () => false), 'board: Add counts the new and the chosen');
  await done(page);
});

test('PFE12 (pf-e AddMany state 4, F23 F24 F25): 205 names on a palette of 20 are all read with no cap; the groups start closed past 10; choices say their fit; "Skip the N left", "Copy these N names"; one Add takes everything; the toast says "N plants added. Your palette: M plants." with Undo', async () => {
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

failing('PFE14 (pf-e E4, BC1; the place line is main\'s Place.tsx: hand-off): past 40 plants under 960 px the place line says "200 plants: Your plants", the link landing on Your plants\' heading; at 1280 no link', { owner: 'pf-e', reason: /no link "Your plants"/ }, async () => {
  const page = await loadPalette200({ width: 390 });
  const link = await page.evaluate(() => [...document.querySelectorAll('#ct-root [data-place-line] a')].find((a) => a.textContent.trim() === 'Your plants') ? true : false);
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

test('PFE21 (pf-e A15, BC10): "Tick these N" says in place what it did ("N ticked in Your plants."), and "Go to Remove" takes the focus to Remove', async () => {
  const page = await loadPalette200({ width: 390 });
  await openToxic(page);
  const n = await toxicN(page);
  await press(page, 'button', `Tick these ${n}`);
  await says(page, `${n} ticked in Your plants.`);
  const said = await page.evaluate((w) => [...document.querySelectorAll('#ct-root [role="status"]')].some((e) => e.textContent.includes(w)), `${n} ticked in Your plants.`);
  assert.ok(said, 'board: said in a status');
  await press(page, 'button', 'Go to Remove');
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
