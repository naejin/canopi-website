// pf stream e, "Many plants" (chunk 3; v14 spec section 2 'pf-e'): the boards Many and ManyDesk (Your
// plants as a list and a table: search, sort, group, ticks, "Remove 3 plants" with Undo, "Tick these"
// from Warnings and fit, "Add plants" opening the search in place of the list), PaletteMore and Recife
// (the small form), Paste and AddMany state 4 (every line read, three groups, one Add) and the bulk
// toasts, as tests. Each case was written failing in pf-e's commit 0 (scripts/expect-fail.mjs
// failing(), its reason the board's first missing word, pf-helpers.mjs BOARD); its marker went in the
// commit that made it pass. Figures come from the page's own store (the engine on the installed
// release), never from the board. The 200-plant palette is pf-helpers.mjs loadPalette200 (scenario
// case kiambu-200).
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   PP-B9   warnings first, each in words with the icon, Slight and Moderate in their own colours  -> PFE8
//   PP-B61  the height note on a row (small garden)                                               -> PFE9
//   PP-B61b the height note on a row (balcony or pots)                                            -> PFE9
//   PP-B62  plants the page cannot show: a row saying why, with Remove                            -> PFE10
//   PP-B23  200 plants: the list folds, opening moves the focus, Remove with Undo and the focus   -> PFE2, PFE3
//   PP-B23b Your plants at 1 and 0 plants: no fold, no section of nothing                         -> PFE10
//   PP-B64  Undo after a remove in Your plants lands on the restored row                          -> PFE3
// Not carried: per-row Remove in the small form (boards PaletteMore, Recife: a row opens the plant,
// whose Details and Swap keep Remove; decision recorded in pf-e's report).
import assert from 'node:assert/strict';
import test from 'node:test';
import { useHarness, has, en, realDb } from './helpers.mjs';
import { tool, choose, atSite } from './p5-helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { BOARD, control, done, focused, frames, loadCase, loadPalette200, press, says, saysNot, toastText, verdictsSettled } from './pf-helpers.mjs';
import { fitRanks, LIGHT_OF, pasteText, PLANTS, rowsShown, strataCounts } from './pf-e-helpers.mjs';

useHarness();

const SEARCH = (n) => `Search your ${n} plants`;
const firstLevel = async (page) => { const c = await strataCounts(page); const s = ['emergent', 'high', 'medium', 'low'].find((k) => c[k]); return { s, word: LIGHT_OF[s], n: c[s] }; };

failing('PFE1 (pf-e Many at 390): the 200-plant palette shows "Your 200 plants" with its lede, the search under the head, Sort and Group, and every light group closed with its count and "Tick all N"', { owner: 'pf-e', reason: BOARD }, async () => {
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

failing('PFE2 (pf-e Many, PP-B23): a group opens to its first 10 rows sorted by fit, then "+ N more"; each row has its tick, its name, its years and jobs, and its word; opening the rest moves the focus to the first new row', { owner: 'pf-e', reason: BOARD }, async () => {
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

failing('PFE3 (pf-e F22, PP-B23, PP-B64): ticking 3 plants shows "3 ticked" with "Remove 3 plants"; Remove takes them out at once with one Undo ("3 plants removed. 197 plants."), Undo brings them back, and the focus never falls to the page', { owner: 'pf-e', reason: BOARD }, async () => {
  const page = await loadPalette200({ width: 390 });
  const { word, n } = await firstLevel(page);
  await press(page, 'button', `${word} ${n} plants`);
  const picked = (await rowsShown(page)).slice(0, 3);
  for (const r of picked) await page.click(`${PLANTS} [data-plant-id="${r.id}"] input[type="checkbox"]`);
  await control(page, 'group', '3 plants ticked');
  await says(page, '3 ticked');
  // Ticks stay when you sort or regroup.
  await page.selectOption(`${PLANTS} select[data-plants-sort]`, 'name');
  await page.selectOption(`${PLANTS} select[data-plants-group]`, 'none');
  await control(page, 'group', '3 plants ticked');
  await page.selectOption(`${PLANTS} select[data-plants-group]`, 'light');
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

failing('PFE4 (pf-e Many): the search under the head filters Your plants by name, groups and counts following, and clearing it brings the list back', { owner: 'pf-e', reason: BOARD }, async () => {
  const page = await loadPalette200({ width: 390 });
  const target = await page.evaluate(() => { const t = window.__ctTest.store.memberTaxa.value[5]; return { id: t.id, q: t.canonical_name.split(' ')[0] }; });
  const box = await control(page, 'textbox', SEARCH(200));
  assert.ok(box);
  await page.fill(`#ct-root input[aria-label="${SEARCH(200)}"]`, target.q);
  await frames(page);
  const expect = await page.evaluate((q) => window.__ctTest.store.memberTaxa.value.filter((t) => `${t.names?.en ?? ''} ${t.canonical_name}`.toLowerCase().includes(q.toLowerCase())).map((t) => t.id).sort(), target.q);
  assert.ok(await has(page, `${PLANTS} [data-plant-id="${target.id}"]`, 3000), 'board: a search opens the matching groups and shows the plant');
  const shown = (await rowsShown(page)).map((r) => r.id).sort();
  assert.deepEqual(shown, expect, 'board: only the matching plants are listed');
  await page.fill(`#ct-root input[aria-label="${SEARCH(200)}"]`, '');
  await frames(page);
  assert.equal((await rowsShown(page)).length, 0, 'board: cleared, the groups are closed again');
  await done(page);
});

failing('PFE5 (pf-e ManyDesk at 1280): Your plants is a table with its lede, "Add plants", the search, "Group by", the head tick and sortable column heads; a column head sorts it; grouped by job a "Planted in" column says the light level', { owner: 'pf-e', reason: BOARD }, async () => {
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
  await page.selectOption(`${PLANTS} select[data-plants-group]`, 'job');
  await control(page, 'button', 'Planted in');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(over <= 0, 'board: no sideways scroll at 1280');
  await done(page);
});

failing('PFE6 (pf-e F30, ManyDesk): "Add plants" opens the search in place of the list and stays open while adding; Done closes it and the focus goes back to "Add plants"', { owner: 'pf-e', reason: BOARD }, async () => {
  const page = await loadPalette200({ width: 1280 });
  await press(page, 'button', 'Add plants');
  assert.ok(await has(page, `${PLANTS} .ct-find`, 15_000), 'board: the search opens inside Your plants');
  assert.equal(await page.$(`${PLANTS} table`), null, 'board: in place of the list');
  await page.waitForSelector(`${PLANTS} [data-find-add]`, { timeout: 15_000 });
  await page.click(`${PLANTS} [data-find-add]`);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 201, { timeout: 4000 }).then(() => true, () => false), 'board: a plant added');
  assert.ok(await has(page, `${PLANTS} .ct-find`, 1000), 'board: the search stays open while adding');
  await press(page, 'button', 'Done');
  assert.ok(await has(page, `${PLANTS} table`, 3000), 'board: the list is back');
  assert.equal((await focused(page)).name, 'Add plants', 'board: the focus goes back to "Add plants"');
  await done(page);
});

failing('PFE7 (pf-e Many, A15): "Tick these N" on Warnings and fit\'s toxic line ticks the toxic and very toxic plants in Your plants, ready for Remove', { owner: 'pf-e', reason: BOARD }, async () => {
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

failing('PFE8 (pf-e PaletteMore at 390, PP-B9): a small palette lists "Your 8 plants", warned first, each row opening the plant with its light, years, size, jobs and warnings in words; no Sort, Group, tick or fold', { owner: 'pf-e', reason: BOARD }, async () => {
  const page = await loadCase('kiambu-8', { width: 390 });
  await says(page, 'Your 8 plants');
  await says(page, 'Plants with a warning come first.');
  await says(page, /Planted in: (?:Full sun|Mostly sun|Part shade|Shade) · /);
  const rows = await rowsShown(page);
  assert.equal(rows.length, 8, 'board: every row shown');
  const warned = await page.evaluate(() => { const s = window.__ctTest.store; return s.memberTaxa.value.filter((t) => s.flagsOfPlant(t).some((f) => f.kind !== 'conflict' || f.severity !== 'low')).map((t) => t.id); });
  assert.deepEqual(rows.slice(0, warned.length).map((r) => r.id).sort(), [...warned].sort(), 'board: the warned plants first');
  for (const s of ['Sort', 'Group']) assert.equal(await page.$(`${PLANTS} select[data-plants-${s.toLowerCase()}]`), null, `board: no ${s} below 41 plants`);
  assert.equal(await page.$(`${PLANTS} input[type="checkbox"]`), null, 'board: no ticks below 41 plants');
  // Slight and Moderate each in words, in their own colours (PP-B9).
  const marks = await page.$$eval(`${PLANTS} .ct-find-mark[data-kind="toxicity"]`, (els) => els.map((e) => ({ t: e.textContent.trim(), c: getComputedStyle(e).color })));
  const slight = marks.find((m) => m.t === en['consortium.tox.Slight']), mod = marks.find((m) => m.t === en['consortium.tox.Moderate']);
  if (slight && mod) assert.notEqual(slight.c, mod.c, 'board: Mildly toxic and Toxic in their own colours');
  const id = rows[0].id;
  await page.click(`${PLANTS} [data-plant-id="${id}"] a, ${PLANTS} [data-plant-id="${id}"] button`);
  assert.ok(await page.waitForFunction((x) => window.__ctTest.store.sheet.value?.kind === 'details' && window.__ctTest.store.sheet.value.id === x, { timeout: 4000 }, id).then(() => true, () => false), 'board: a row opens the plant');
  await done(page);
});

failing('PFE9 (pf-e Recife pt, PP-B61, PP-B61b): the small form in Portuguese ("Suas 10 plantas", "As plantas com aviso vêm primeiro."); a tall plant in a small garden or in pots keeps its height note on its row', { owner: 'pf-e', reason: BOARD }, async () => {
  const pt = await loadCase('recife-today', { site: 'manaus', lang: 'pt', width: 390 });
  await says(pt, 'Suas 10 plantas');
  await says(pt, 'As plantas com aviso vêm primeiro.');
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

failing('PFE10 (pf-e PP-B62, PP-B23b): a member the page cannot show keeps a row saying why with Remove; at 1 plant one row and no fold; at 0 plants no section of nothing', { owner: 'pf-e', reason: BOARD }, async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  const ids = await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY p.canonical_name LIMIT 1").all().map((r) => String(r.id)));
  await page.evaluate((list) => { const { store } = window.__ctTest; store.members.value = [...list, 'not-a-plant-id']; store.view.value = 'matrix'; }, ids);
  await verdictsSettled(page);
  assert.ok(await has(page, `${PLANTS} [data-plant-id="not-a-plant-id"][data-missing]`, 6000), 'board: the unknown member has its row');
  await says(page, 'Not checked: not on this climate\'s plant lists.');
  await press(page, 'button', 'Remove not-a-plant-id');
  await says(page, 'Your 1 plant');
  await saysNot(page, /\+ \d+ more/);
  await page.evaluate(() => { window.__ctTest.store.members.value = []; });
  await frames(page);
  assert.equal(await page.$(PLANTS), null, 'board: no Your plants at 0 plants');
  await done(page);
});

const SMALL_PASTE = 'corn, beans, sukuma wiki\npigeon pea, avocado, corn\ngrevillea, napier';
failing('PFE11 (pf-e Paste board): every line is read into three groups, Recognised (new, you have, listed twice), Need a choice (a loose word asks, nothing chosen for you) and Not found; the first column of a spreadsheet; Add counts the new and the chosen', { owner: 'pf-e', reason: BOARD }, async () => {
  const page = await loadCase('kiambu-8', { width: 390 });
  await pasteText(page, SMALL_PASTE);
  await says(page, 'One plant a line, or separated by commas. Any of the 11 languages, or scientific names. Every line is read, on your device; nothing is sent.', { inDialog: true });
  await says(page, 'Pasted from a spreadsheet? The names are read from the first column.', { inDialog: true });
  await says(page, '8 names read', { inDialog: true });
  await says(page, /6 recognised, 1 needs a choice, 1 not found/, { inDialog: true });
  await control(page, 'button', /^Recognised: 3 new, 2 you have, 1 listed twice/);
  await control(page, 'button', /^Need a choice/);
  await control(page, 'button', /^Not found/);
  await says(page, '“grevillea” Silk oak Grevillea robusta · new, found by its scientific name', { inDialog: true });
  await says(page, /“beans” Which bean\? \d+ plants are called bean\./, { inDialog: true });
  const choices = await page.$$eval('dialog[open] [role="group"] button[aria-pressed]', (bs) => bs.map((b) => ({ t: b.textContent.trim(), on: b.getAttribute('aria-pressed') })));
  assert.equal(choices.slice(0, 3).map((c) => c.t.split(' ')[0] + ' ' + c.t.split(' ')[1]).join(', '), 'Common bean, Lima bean, Sword bean', 'board: the name-word matches first (A16)');
  assert.ok(choices.every((c) => c.on === 'false' || c.t === 'None'), 'board: nothing chosen for the grower');
  await press(page, 'button', 'Add 3 plants');
  await done(page);
});

failing('PFE12 (pf-e AddMany state 4, F23 F24 F25): 205 names on a palette of 20 are all read with no cap; the groups start closed past 10; choices say their fit; "Skip the N left", "Copy these N names"; one Add takes everything; the toast says "N plants added. Your palette: M plants." with Undo', { owner: 'pf-e', reason: BOARD }, async () => {
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
  await press(page, 'button', (await control(page, 'button', /^Need a choice/)).name);
  await says(page, /\d+ chosen, \d+ to go\. A name you leave is not added\./, { inDialog: true });
  await control(page, 'button', /^Skip the \d+ left$/);
  await press(page, 'button', (await control(page, 'button', /^Not found/)).name);
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
