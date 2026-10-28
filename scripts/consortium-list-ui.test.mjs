// The consortium tool at scale, chunk B, through its own wiring (scripts/consortium-harness.mjs runs
// src/scripts/consortium/app.js): the Cards/List switch, the dense list at 200 plants, its filters,
// selection with bulk Keep and Remove and Undo, pasting a list, and print and share at 200
// (design-scale.md §1c, §2; mockup v2 states 03, 04, 06–17, 26). The 200-plant tests use the real
// Temperate list (public/data/consortium/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { device, tab } from './consortium-harness.mjs';
import * as core from '../src/lib/consortium/index.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const real = (c) => JSON.parse(read(`public/data/consortium/${c}.json`));
const temperate = real('temperate'), mediterranean = real('mediterranean'), tropical = real('tropical');
const fixture = JSON.parse(read('scripts/fixtures/consortium/temperate.json'));
const ids = temperate.taxa.map((t) => t.id);
const named = (n) => temperate.taxa.find((t) => t.canonical_name === n);
const hashOf = (t) => t.entry().url.hash;
const stateOf = (t) => core.decodeState(new URLSearchParams(hashOf(t).slice(1)), temperate, { tropical, mediterranean }).state;
// The rows in view: a row the filters hide stays in its open group, `hidden` (B2).
const rows = (page) => [...page.$$('.lrow[data-id]')].filter((el) => !('hidden' in el.attribs)).map((el) => el.attribs['data-id']);
const cards = (page) => [...page.$$('.plant[data-id]')].map((el) => el.attribs['data-id']);
const click = async (page, el, init = {}) => {
  el.focus();
  const { Event } = page;
  el.dispatchEvent(new Event('click', { detail: 1, ...init }));
  await page.settle();
};

// A link to all 200 Temperate plants, 190 kept and two main crops, with France or no country.
function link200({ country = 'FR', crops = [] } = {}) {
  const q = core.encodeState({ climate: 'temperate', country, site: { ...core.DEFAULT_SITE }, kept: [...ids.slice(0, 190), ...crops], removed: [], members: ids, plants: [], crops, guests: [] }, temperate);
  return '/consortium/#' + q.toString();
}
async function open200(opts = {}, pageOpts = {}) {
  const dev = device();
  const t = tab(dev, link200(opts), { data: 'real', ...pageOpts });
  const page = await t.load();
  return { t, page, dev };
}

// ---------- The switch ----------
test('the Cards/List switch shows from the first plant: Cards at 9 plants, List at 200, and the reader\'s choice stays', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate' });
  const page = await t.load();
  await page.act('suggest');
  const n = cards(page).length;
  assert.ok(n > 0 && n <= 20);
  const sw = page.$$('[data-act="mode"]');
  assert.equal(sw.length, 2, 'a group of two buttons');
  assert.equal(page.$('[data-act="mode"][data-v="cards"]').attribs['aria-pressed'], 'true');
  assert.ok(page.$('[data-act="mode"]').closest('[role="group"]')?.attribs['aria-label'], 'a labelled group');
  await page.act('mode', 'list');
  assert.equal(cards(page).length, 0);
  assert.equal(rows(page).length, n, 'every plant as a row: 9 plants never fold');
  assert.equal(page.$('[data-act="mode"][data-v="list"]').attribs['aria-pressed'], 'true');
  assert.equal(page.focused().attribs['data-v'], 'list', 'the focus stays on the switch');
  const big = await open200();
  assert.equal(big.page.$('[data-act="mode"][data-v="list"]').attribs['aria-pressed'], 'true', 'List above 20 plants');
  assert.equal(cards(big.page).length, 0);
  await big.page.act('mode', 'cards');
  assert.equal(cards(big.page).length, 200);
});

// ---------- The dense list ----------
test('at 200 plants the list groups rows by layer, closed by default, each head with its count, its select-all box and a named toggle', async () => {
  const { page } = await open200();
  const heads = page.$$('.lgroup-head');
  assert.equal(heads.length, 4);
  assert.equal(rows(page).length, 0, 'groups start closed above 60 plants');
  const toggle = page.$('[data-act="group"][data-v="high"]');
  assert.equal(toggle.attribs['aria-expanded'], 'false');
  assert.match(toggle.attribs['aria-label'], /High.*59 plants/);
  assert.ok(page.$('input[type="checkbox"][data-act="gsel"][data-v="high"]'), 'a select-all box');
  await page.act('group', 'emergent');
  assert.equal(rows(page).length, 10);
  assert.equal(page.$('[data-act="group"][data-v="emergent"]').attribs['aria-expanded'], 'true');
  assert.equal(page.focused().attribs['data-v'], 'emergent', 'the focus stays on the toggle');
  assert.ok(!page.$('aside.aside'), 'above 20 plants the side panel folds into the head');
  assert.ok(page.$('.result-head [data-act="open-place"][data-v="country"]'), 'the country line sits in the head');
});

test('a row: checkbox, kept pin, the name over the scientific name, honest height, stage bar with words, job icons, warnings, Swap and ⋯', async () => {
  const { page } = await open200();
  await page.act('group', 'emergent');
  await page.act('group', 'high');
  const locust = named('Robinia pseudoacacia');
  const row = page.$(`.lrow[data-id="${locust.id}"]`);
  assert.ok(row, 'Black locust is Emergent');
  assert.ok(row.querySelector('input[type="checkbox"][data-act="sel"]'));
  const pin = row.querySelector('[data-act="keep"]');
  assert.equal(pin.attribs['aria-pressed'], 'true');
  assert.equal(pin.attribs['aria-label'], 'Keep Black locust');
  assert.equal(page.text(`.lrow[data-id="${locust.id}"] .lname`), 'Black locust');
  assert.equal(page.text(`.lrow[data-id="${locust.id}"] .lsci`), 'Robinia pseudoacacia');
  assert.match(page.text(`.lrow[data-id="${locust.id}"] .lheight`), /^Height \d+ m$/);
  const bar = row.querySelector('.stagebar');
  assert.match(bar.attribs['aria-label'], /^Leads from/);
  assert.equal(bar.querySelectorAll('i').length, 7);
  assert.ok(page.text(`.lrow[data-id="${locust.id}"] .lstage`).length > 0, 'short stage words on desktop');
  assert.ok(row.querySelector('.warn-chip.warn-inv'), 'invasive in France: the filled chip');
  assert.match(page.text(`.lrow[data-id="${locust.id}"] .warn-inv`), /Invasive in France/);
  assert.equal(row.querySelector('[data-act="swap"]').attribs['aria-label'], 'Swap Black locust');
  const more = row.querySelector('[data-act="rmenu"]');
  assert.equal(more.attribs['aria-expanded'], 'false');
  await page.act('rmenu', locust.id);
  assert.equal(page.$(`[data-act="rmenu"][data-v="${locust.id}"]`).attribs['aria-expanded'], 'true');
  assert.ok(page.$(`.lmenu [data-act="remove"][data-v="${locust.id}"]`), 'Remove is in the ⋯ menu');
  await page.key('Escape');
  assert.equal(page.$(`[data-act="rmenu"][data-v="${locust.id}"]`).attribs['aria-expanded'], 'false', 'Escape closes it');
  assert.equal(page.focused().attribs['data-act'], 'rmenu', 'and gives the focus back to ⋯');
  // Toxic is a red outline, a shared pest a quiet outline naming the pest.
  const toxic = temperate.taxa.find((t) => t.warnings.toxicity?.level === 'Moderate' && t.stratum?.value === 'high');
  if (toxic) assert.ok(page.$(`.lrow[data-id="${toxic.id}"] .warn-chip.warn-tox`));
  assert.ok(page.$('.lrow .warn-chip.warn-pest'), 'a pest chip in High');
});

test('with no country every row has a muted count of countries, the warnings keep only real warnings, and nothing says "not checked" per row', async () => {
  const { page } = await open200({ country: null });
  await page.act('open-place', 'country');
  await page.act('no-country');
  await page.act('group', 'emergent');
  const locust = named('Robinia pseudoacacia');
  assert.match(page.text(`.lrow[data-id="${locust.id}"] .linv`), /\d+ countries/);
  assert.ok(!page.$(`.lrow[data-id="${locust.id}"] .warn-inv`));
  assert.ok(page.$('.lcols .lcol-inv'), 'an "Invasive in" column');
  const fr = await open200({ country: 'FR' });
  await fr.page.act('group', 'high');
  assert.ok(!fr.page.$('.lcols .lcol-inv'), 'no count column once a country is chosen');
});

test('an unchecked country is said once in the view, never per row', async () => {
  const unchecked = Object.entries(JSON.parse(read('public/data/consortium/manifest.json')).countries).find(([, c]) => !c.invasive_checked)?.[0];
  assert.ok(unchecked);
  const { page } = await open200({ country: unchecked });
  await page.act('group', 'high');
  // C16 (scale-b fix): above 20 plants the place chips in the head say the country and its status
  // ("not checked: there is no invasive list for this country"); no sub-line repeats them.
  const all = page.text().split(/not checked: there is no invasive list for this country|invasive status not checked in/).length - 1;
  assert.equal(all, 1, `said ${all} times`);
  assert.ok(!page.$('.result-sub'), 'no sub-line under the title beside the place chips');
  assert.equal([...page.$$('.lrow')].filter((r) => /not checked in/i.test(page.text(`.lrow[data-id="${r.attribs['data-id']}"]`))).length, 0);
});

test('a phone row: one name button, a 44 px Keep and ⋯ on line 1, the stage bar (named) and jobs on line 2, warnings on line 3', async () => {
  const { page } = await open200({}, { width: 390 });
  await page.act('group', 'emergent');
  const locust = named('Robinia pseudoacacia');
  const row = page.$(`.lrow[data-id="${locust.id}"]`);
  const nameBtn = row.querySelector('[data-act="details"]');
  assert.match(nameBtn.attribs['aria-label'], /Black locust.*Leads from/);
  assert.ok(row.querySelector('[data-act="keep"]'));
  assert.ok(row.querySelector('[data-act="rmenu"]'));
  assert.ok(!row.querySelector('[data-act="swap"]'), 'Swap moves into ⋯ on phones');
  assert.ok(!row.querySelector('.lstage'), 'no stage words on a phone row');
  assert.ok(row.querySelector('.lline2 .stagebar') && row.querySelector('.lline3 .warn-inv'));
});

// ---------- Filters ----------
test('filters: the active one is named, first, with ✕; "Showing x of 200" and Clear filters; groups say "n shown of m"', async () => {
  const { page } = await open200();
  await page.act('fmenu', 'warn');
  assert.equal(page.$('[data-act="fmenu"][data-v="warn"]').attribs['aria-expanded'], 'true');
  await page.act('fset', 'warn:any');
  const chips = [...page.$$('.ftools [data-act="fmenu"]')].map((b) => b.attribs['data-v']);
  assert.equal(chips[0], 'warn', 'the active filter comes first');
  assert.match(page.text('[data-act="fmenu"][data-v="warn"]'), /Warning: any/);
  assert.ok(page.$('[data-act="fmenu"][data-v="warn"]').closest('.fchip').attribs.class.includes('is-on'), 'drawn pressed');
  assert.ok(page.$('[data-act="fclear"][data-v="warn"]').attribs['aria-label'], 'its own ✕, named');
  const line = page.text('.fresults');
  const m = /Showing (\d+) of 200 plants/.exec(line);
  assert.ok(m, line);
  const n = Number(m[1]);
  assert.equal(rows(page).length, n, 'the groups open on what matches');
  assert.match(page.text('.lgroup-head'), /\d+ shown of \d+/);
  assert.ok(page.$('[data-act="fclear-all"]'));
  await page.type('[data-input="find"]', 'locust');
  assert.ok(rows(page).length >= 1 && rows(page).length < n, 'the text search narrows it further');
  assert.equal(page.focused().attribs['data-input'], 'find', 'typing keeps the focus');
  await page.act('fclear-all');
  assert.equal(page.text('.fresults'), '');
  assert.equal(rows(page).length, 0, 'back to closed groups');
  assert.equal(page.$('[data-input="find"]').value, '');
});

test('the Kept filter has "Main crops"; it shows only the crops, each tagged "Main crop"', async () => {
  const crops = [named('Cornus mas').id, named('Allium sativum').id];
  const { page } = await open200({ crops });
  await page.act('fmenu', 'kept');
  assert.match(page.text('.fmenu-list'), /Main crops\s*2/);
  await page.act('fset', 'kept:crops');
  assert.deepEqual(rows(page).sort(), [...crops].sort());
  assert.match(page.text('[data-act="fmenu"][data-v="kept"]'), /Kept: main crops/);
  for (const id of crops) assert.match(page.text(`.lrow[data-id="${id}"]`), /Main crop/);
});

test('the warning box above 20 plants has one line per kind, each with "Show n" that sets the Warning filter', async () => {
  const { page } = await open200();
  const show = page.$('.attention [data-act="fset"][data-v="warn:invasive"]');
  assert.ok(show, 'a Show for the invasive line');
  assert.match(page.text('.attention [data-act="fset"][data-v="warn:invasive"]'), /Show 3/);
  await click(page, show);
  assert.equal(rows(page).length, 3);
  assert.equal(page.$$('.attention .att-item').length, 0, 'no per-plant item at this size');
});

// ---------- Selection ----------
test('selection: Shift+click ticks a range; the bar names them; Remove n keeps the filter and the open groups, moves the focus, and Undo brings them back', async () => {
  const { t, page } = await open200();
  await page.act('group', 'high');
  const order = rows(page);
  await click(page, page.$(`[data-act="sel"][data-v="${order[1]}"]`));
  await click(page, page.$(`[data-act="sel"][data-v="${order[3]}"]`), { shiftKey: true });
  const bar = page.$('.selbar');
  assert.ok(bar, 'the selection bar');
  assert.equal(bar.attribs.role, 'group');
  assert.match(page.text('.selbar'), /3 selected/);
  assert.match(page.text('.selbar'), /Keep 3/);
  assert.match(page.text('.selbar'), /Remove 3/);
  const head = page.$('[data-act="gsel"][data-v="high"]');
  assert.equal(head.attribs['data-mixed'], 'true', 'the group box is mixed');
  await page.act('bulk-remove');
  const gone = order.slice(1, 4);
  assert.deepEqual(rows(page).filter((id) => gone.includes(id)), []);
  assert.equal(rows(page)[1], order[4], 'the group stays open');
  assert.equal(page.focused().closest('.lrow')?.attribs['data-id'], order[4], 'the focus moves to the next row');
  const toast = page.$('#ct-toast');
  assert.equal(toast.attribs.role, 'status');
  assert.match(page.text('#ct-toast'), /3 plants removed/);
  assert.equal(stateOf(t).members.length, 197, 'the link has 197');
  assert.ok(!page.$('.selbar'), 'nothing selected any more');
  await page.act('undo', 'bulk');
  assert.equal(stateOf(t).members.length, 200);
  assert.deepEqual(rows(page), order);
});

test('selection: a group\'s box selects the whole layer; Keep n pins them all and the link keeps them', async () => {
  const { t, page } = await open200();
  await page.act('group', 'low');
  await click(page, page.$('[data-act="gsel"][data-v="low"]'));
  const low = temperate.taxa.filter((x) => x.stratum?.value === 'low').map((x) => x.id);
  assert.match(page.text('.selbar'), new RegExp(`${low.length} selected`));
  await page.act('bulk-keep');
  const st = stateOf(t);
  assert.ok(low.every((id) => st.kept.includes(id)));
  assert.match(page.text('#ct-toast'), /kept/);
  await page.act('undo', 'bulk');
  assert.ok(!low.every((id) => stateOf(t).kept.includes(id)), 'Undo unkeeps the ones it kept');
  assert.match(page.text('.selbar'), new RegExp(`${low.length} selected`), 'the selection stays after Undo');
  await page.act('unselect');
  assert.ok(!page.$('.selbar'));
});

// ---------- Paste ----------
test('paste a list: 200 Temperate names over a suggestion read as found and already in; Add all makes a 200-plant list', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate', data: 'real' });
  const page = await t.load();
  await page.act('suggest');
  const before = cards(page).length;
  await page.act('open-add');
  await page.act('add-tab', 'paste');
  assert.equal(page.$('[data-act="add-tab"][data-v="paste"]').attribs['aria-selected'], 'true');
  await page.type('#ct-paste', temperate.taxa.map((x) => `${x.canonical_name}\t${x.names.en ?? ''}\t1`).join('\n'));
  assert.match(page.text('#ct-paste-cols'), /3 columns/);
  assert.match(page.text('#ct-paste-count'), new RegExp(`${200 - before} found`));
  assert.match(page.text('#ct-paste-count'), new RegExp(`${before} already in`));
  assert.match(page.text('.drawer-foot'), new RegExp(`${200 - before} to add`));
  const t0 = performance.now();
  await page.act('paste-add');
  const ms = performance.now() - t0;
  assert.equal(stateOf(t).members.length, 200);
  assert.equal(page.$('[data-act="mode"][data-v="list"]').attribs['aria-pressed'], 'true', 'the list above 20');
  assert.ok(ms < 3000, `added and drawn in ${Math.round(ms)} ms`);
  // Keep on one row at 200 plants stays quick.
  await page.act('group', 'emergent');
  const id = rows(page)[0];
  const t1 = performance.now();
  await page.act('keep', id);
  assert.ok(performance.now() - t1 < 400, `Keep in ${Math.round(performance.now() - t1)} ms`);
});

test('paste a list with mixed results: close spelling, choose, another climate\'s list with Add anyway and its label, and not in any list, said plainly', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate', data: 'real' });
  const page = await t.load();
  await page.act('suggest');
  const persimmon = mediterranean.taxa.find((x) => !temperate.taxa.some((y) => y.id === x.id) && x.names.en);
  await page.act('open-add');
  await page.act('add-tab', 'paste');
  await page.type('#ct-paste', ['Coryllus avellana', 'Rubus', persimmon.canonical_name, 'Juglans nigra'].join('\n'));
  const text = page.text('#ct-dialog');
  assert.match(text, /close spelling: Corylus avellana/i);
  assert.match(text, /Not in any of Canopi’s lists yet/);
  assert.match(text, /Juglans nigra/);
  assert.match(text, /the Mediterranean list/);
  const v = `mediterranean:${persimmon.id}`;
  await page.act('paste-anyway', v);
  if (page.$('[data-act="paste-anyway-yes"]')) await page.act('paste-anyway-yes', v);
  assert.ok(stateOf(t).guests.some((g) => g.id === persimmon.id), 'added as a guest of the Mediterranean list');
  assert.ok(page.$('#ct-dialog').open, 'the sheet stays open');
  assert.match(page.text('#ct-paste-count'), /1 already in/);
  await page.act('paste-add');
  assert.ok(stateOf(t).members.includes(named('Corylus avellana').id), 'the close spelling was ticked and added');
});

test('the Add search marks the plants already in the design', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate' });
  const page = await t.load();
  await page.act('suggest');
  const inside = cards(page)[0];
  const tx = fixture.taxa.find((x) => x.id === inside);
  await page.act('open-add');
  await page.type('#ct-add-q', tx.canonical_name);
  const row = [...page.$$('#ct-add-results .add-row')].find((li) => li.querySelector(`[data-v="${inside}"]`));
  assert.ok(row);
  assert.match(page.text('#ct-add-results'), /In your consortium/);
  const box = row.querySelector('[data-act="atick"]');
  assert.ok('disabled' in box.attribs && 'checked' in box.attribs, 'ticked and disabled for a plant already in');
});

// ---------- Print and share ----------
test('print at 200 plants is one table grouped by layer, every plant once; the share link holds all 200', async () => {
  const { t, page } = await open200();
  await page.act('print');
  const printed = page.$$('#ct-print tbody tr[data-id]');
  assert.equal(printed.length, 200);
  assert.equal(page.$$('#ct-print .print-layer').length, 4, 'a head row per layer');
  assert.equal(page.$$('#ct-print .pkey li').length, 0, 'no 200-item drawing key');
  await page.act('share');
  const shared = new URL(page.clipboard);
  const st = core.decodeState(new URLSearchParams(shared.hash.slice(1)), temperate).state;
  assert.equal(st.members.length, 200);
  assert.equal(st.kept.length, 190);
  assert.ok(shared.hash.length < 2000, `${shared.hash.length} characters`);
  assert.equal(stateOf(t).members.length, 200);
});

// ---------- Scale review B (scale-b-bugs.md, verified; coordinator rulings 2026-10-28) ----------
const tabOf = (page) => page.$('.tabpanel');
test('B2: Keep, a tick, a typed search, a menu and a group patch the list in place; the rest of the result is not written again', async () => {
  const { page } = await open200();
  for (const s of ['emergent', 'high', 'medium', 'low']) await page.act('group', s);
  const panel = tabOf(page), tools = page.$('#ct-ftools'), first = rows(page)[3];
  const other = page.$(`.lrow[data-id="${rows(page)[9]}"]`);
  await page.act('keep', first);
  assert.equal(tabOf(page), panel, 'the drawing stays as it was');
  assert.equal(page.$(`.lrow[data-id="${rows(page)[9]}"]`), other, 'another row stays as it was');
  assert.equal(page.$(`.lrow[data-id="${first}"] [data-act="keep"]`).attribs['aria-pressed'], 'false', 'its row says so');
  assert.equal(page.focused().attribs['data-fk'], 'kp-' + first);
  await page.act('sel', first);
  assert.equal(tabOf(page), panel);
  assert.match(page.text('.selbar'), /1 selected/);
  await page.act('fmenu', 'warn');
  assert.equal(page.$('#ct-ftools'), tools, 'a menu redraws its own chip only');
  assert.ok(page.$('.fmenu-list'));
  await page.act('fmenu', 'warn');
  await page.type('[data-input="find"]', 'cherry');
  assert.equal(tabOf(page), panel);
  assert.equal(page.$('#ct-ftools'), tools, 'the search field is never written again');
  assert.ok(rows(page).length >= 1 && rows(page).length < 20);
  assert.ok(rows(page).every((id) => /cherry/i.test(page.text(`.lrow[data-id="${id}"]`))));
});

test('B4: a filter that hides ticked rows unticks them, so Remove n removes only what shows; Undo focuses a row in view', async () => {
  const { t, page } = await open200();
  const fr = (n) => named(n).id;
  await page.type('[data-input="find"]', 'Prunus');
  const prunus = rows(page);
  assert.ok(prunus.length >= 3);
  for (const id of prunus.slice(0, 3)) await page.act('sel', id);
  await page.type('[data-input="find"]', '');
  await page.type('[data-input="find"]', named('Prunus avium').canonical_name);
  const shown = rows(page);
  assert.deepEqual(shown.filter((id) => prunus.slice(0, 3).includes(id)).length, page.$('.selbar') ? Number(/(\d+) selected/.exec(page.text('.selbar'))?.[1]) : 0, 'the bar counts only what shows');
  if (page.$('[data-act="bulk-remove"]')) {
    const n = Number(/(\d+) selected/.exec(page.text('.selbar'))[1]);
    await page.act('bulk-remove');
    assert.equal(stateOf(t).members.length, 200 - n);
    await page.act('undo', 'bulk');
    assert.equal(stateOf(t).members.length, 200);
    assert.ok(rows(page).includes(page.focused().closest('.lrow')?.attribs['data-id']), 'the focus is on a row in view');
  }
  assert.ok(fr('Prunus avium'));
});

test('B5, B7, C1: Banana and Citrus pasted into Temperate are offered to choose from their list; Add all adds flagged plants and says how many have a warning, with Show', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate', data: 'real' });
  const page = await t.load();
  await page.act('suggest');
  await page.act('open-add');
  await page.act('add-tab', 'paste');
  await page.type('#ct-paste', 'Banana\nCitrus');
  await page.settle();
  const text = page.text('#ct-dialog');
  assert.doesNotMatch(text, /Not in any of Canopi’s lists yet/, 'never "none"');
  assert.ok(page.$$('.paste-choose').length === 2, text);
  assert.ok(page.$$('.paste-choose legend .tag-from').length === 2, 'each tagged with its list');
  const pick = page.$('.paste-choose [data-act="ptick"]').attribs['data-v'];
  await page.act('ptick', pick);
  await page.act('paste-add');
  assert.ok(stateOf(t).guests.some((g) => g.id === pick), 'it joins as a guest of its list');
  // Add all with flagged plants: no question, a count of the warned ones and Show.
  await page.act('open-add');
  await page.act('add-tab', 'paste');
  await page.type('#ct-paste', ['Robinia pseudoacacia', 'Pyrus communis', 'Malus domestica'].join('\n'));
  await page.act('paste-add');
  assert.ok(!page.$('#ct-dialog').open, 'added without asking');
  assert.match(page.text('#ct-toast'), /3 plants added and kept · \d+ with a warning\./);
  await page.act('show-warned');
  assert.equal(page.$('[data-act="fmenu"][data-v="warn"]')?.closest('.fchip').attribs.class.includes('is-on'), true, 'Show sets the Warning filter');
});

test('C2: the Search tab ticks plants, names them in its foot, adds them all and stays open', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate', data: 'real' });
  const page = await t.load();
  await page.act('suggest');
  await page.act('open-add', 'grow');
  assert.equal(page.text('#ct-dlg-title'), 'Add plants');
  assert.match(page.text('#ct-dialog .lede'), /Tick as many as you like/);
  await page.type('#ct-add-q', 'cherry');
  const free = [...page.$$('[data-act="atick"]')].filter((b) => !('disabled' in b.attribs)).map((b) => b.attribs['data-v']);
  assert.ok(free.length >= 2);
  for (const id of free.slice(0, 2)) await page.act('atick', id);
  await page.type('#ct-add-q', 'cherr');
  assert.match(page.text('#ct-add-foot'), /2 to add · .+, .+|2 to add · .+ and .+/);
  assert.match(page.text('#ct-add-foot'), /Add 2 plants/);
  assert.match(page.text('.add-row small'), /·/, 'layer · height · jobs');
  await page.act('add-ticked');
  for (const id of free.slice(0, 2)) assert.ok(stateOf(t).members.includes(id));
  assert.ok(page.$('#ct-dialog').open, 'the sheet stays open');
  for (const id of free.slice(0, 2)) assert.ok('disabled' in page.$(`[data-act="atick"][data-v="${id}"]`).attribs, 'now already in');
});

test('C3, B10: an unchecked country offers no "invasive in"; a country chosen with "invasive somewhere" on turns it to "invasive in"', async () => {
  const unchecked = Object.entries(JSON.parse(read('public/data/consortium/manifest.json')).countries).find(([, c]) => !c.invasive_checked)?.[0];
  const { page } = await open200({ country: unchecked });
  await page.act('fmenu', 'warn');
  assert.ok(!page.$('[data-act="fset"][data-v="warn:invasive"]'));
  assert.ok(!page.$('[data-act="fset"][data-v="warn:somewhere"]'));
  // No country: "invasive somewhere"; France chosen then turns it to "invasive in France".
  const none = await open200({ country: null }, { lang: 'en', languages: ['en'] });
  await none.page.act('open-place', 'country');
  if (none.page.$('[data-act="no-country"]')) await none.page.act('no-country');
  await none.page.act('fmenu', 'warn');
  await none.page.act('fset', 'warn:somewhere');
  await none.page.act('open-place', 'country');
  await none.page.act('country', 'FR');
  assert.match(none.page.text('[data-act="fmenu"][data-v="warn"]'), /invasive in France/i);
});

test('B13: a menu counts what it would show with the search and the other filters as they are', async () => {
  const { page } = await open200();
  await page.type('[data-input="find"]', 'Prunus');
  const n = rows(page).length;
  await page.act('fmenu', 'kept');
  const all = Number(page.text('[data-act="fset"][data-v="kept:"] .fmenu-n'));
  assert.equal(all, n);
});

test('B12, B14: a group the reader closed stays closed after a Remove; the view never flips; Start over then Undo gives the list back as it was', async () => {
  const { page } = await open200();
  await page.act('group', 'high');
  await page.act('group', 'high');
  await page.act('group', 'low');
  await page.act('fmenu', 'layer');
  await page.act('fset', 'layer:low');
  const id = rows(page)[0];
  await page.act('rmenu', id);
  await page.act('remove', id);
  assert.equal(page.$('.lgroup[data-s="high"]').attribs['data-open'], 'false', 'High stays closed');
  assert.equal(page.$('[data-act="mode"][data-v="list"]').attribs['aria-pressed'], 'true');
  await page.act('start-over');
  await page.act('undo', 'start');
  assert.equal(page.$('[data-act="mode"][data-v="list"]').attribs['aria-pressed'], 'true');
  assert.match(page.text('[data-act="fmenu"][data-v="layer"]'), /Low/, 'the filter is back');
});

test('C5: at 9 plants the warning box has one line per kind with Show, and no card says "not checked yet"', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate', data: 'real' });
  const page = await t.load();
  await page.act('suggest');
  assert.ok(cards(page).length <= 20);
  assert.equal(page.$$('.plant .warn-unknown').length, 0);
  if (page.$('.attention')) {
    assert.ok(page.$$('.att-line').length >= 1);
    for (const li of page.$$('.att-line')) assert.ok(li.querySelector('[data-act="fset"]'), 'a Show per line');
  }
});

// The words a toast showed, even once its timer (run at once here) has hidden it.
function toastLog(page) {
  const el = page.$('#ct-toast'), log = [], own = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'innerHTML');
  Object.defineProperty(el, 'innerHTML', { configurable: true, get() { return own.get.call(this); }, set(v) { if (v) log.push(String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()); own.set.call(this, v); } });
  return log;
}
test('B16: the share toast says what the link holds and how it opens; a guessed country is said, with the country to choose', async () => {
  const { page } = await open200();
  const log = toastLog(page);
  await page.act('share');
  assert.match(log.at(-1), /^Link copied: all 200 plants, [\d.]+ kB\. It opens this consortium with warnings for France\.$/);
  // No country in the link (the harness's browser guesses France): said, with France to choose.
  const guessed = await open200({ country: null });
  await guessed.page.act('share');
  assert.match(guessed.page.text('#ct-toast'), /France was only a guess, so the link has no country: it opens with each plant’s count of countries\./);
  await guessed.page.act('share-guess');
  assert.match(new URL(guessed.page.clipboard).hash, /[#&]k=FR/, 'copied again with France');
});
