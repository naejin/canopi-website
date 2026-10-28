// The consortium tool at scale, chunk B, through its own wiring (scripts/consortium-harness.mjs runs
// src/scripts/consortium/app.js): the Cards/List switch, the dense list at 200 plants, its filters,
// selection with bulk Keep and Remove and Undo, pasting a list, and print and share at 200
// (design-scale.md §1c, §2; mockup v2 states 03, 04, 06–17, 26). The 200-plant tests use the real
// Temperate list (public/data/consortium/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFragment } from 'parse5';
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

// H4, H7 (coordinator, 2026-10-28) replace B4's pruning: a filter never unticks; Keep n and Remove n
// count and act on the ticked rows it shows.
test('B4: with ticked rows hidden by a filter, Remove n removes only what shows; Undo focuses a row in view', async () => {
  const { t, page } = await open200();
  const fr = (n) => named(n).id;
  await page.type('[data-input="find"]', 'Prunus');
  const prunus = rows(page);
  assert.ok(prunus.length >= 3);
  for (const id of prunus.slice(0, 3)) await page.act('sel', id);
  await page.type('[data-input="find"]', '');
  await page.type('[data-input="find"]', named('Prunus avium').canonical_name);
  const shown = rows(page);
  assert.deepEqual(shown.filter((id) => prunus.slice(0, 3).includes(id)).length, page.$('[data-act="bulk-remove"]') ? Number(/Remove (\d+)/.exec(page.text('.selbar'))?.[1]) : 0, 'Remove counts only what shows');
  if (page.$('[data-act="bulk-remove"]')) {
    const n = Number(/Remove (\d+)/.exec(page.text('.selbar'))[1]);
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

// ---------- Scale chunk B fix review (scale-b-fix-review.md, verified; coordinator rulings 2026-10-28) ----------
// Markup with its attributes sorted and runs of white space as one space (the patch adds `hidden`
// last, a full render writes it first); `data-flash` is the flash a row gets, never part of a render.
function norm(html) {
  const walk = (n) => {
    if (n.nodeName === '#text') return n.value.replace(/\s+/g, ' ');
    if (!n.tagName) return '';
    const attrs = n.attrs.filter((a) => a.name !== 'data-flash').map((a) => ` ${a.name}="${a.value}"`).sort().join('');
    return `<${n.tagName}${attrs}>${(n.content?.childNodes ?? n.childNodes ?? []).map(walk).join('')}</${n.tagName}>`;
  };
  return parseFragment(html).childNodes.map(walk).join('').replace(/>\s+</g, '><').trim();
}
// H1, H15: the list as patched is the list a full render writes, and every row the cache holds is
// the row as it would be written now (the cache, not only the DOM, must follow the state).
function sameAsFullRender(page, what) {
  assert.deepEqual(page.app.__test.staleRows(), [], `${what}: a cached row differs from the row as written now`);
  const a = norm(page.$('#ct-lbody').innerHTML), b = norm(page.app.__test.freshListBody());
  if (a !== b) {
    let i = 0; while (a[i] === b[i]) i++;
    assert.fail(`${what}: the patched list differs from a full render at ${i}:\n  patched: …${a.slice(Math.max(0, i - 160), i + 160)}\n  full:    …${b.slice(Math.max(0, i - 160), i + 160)}`);
  }
}
const menuOpen = (page, id) => !!page.$(`#ct-rm-${id}`) && page.$(`[data-act="rmenu"][data-v="${id}"]`).attribs['aria-expanded'] === 'true';
const textOf = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

test('H1, H15: after each list action the patched list is a full render and the row cache matches it; a row menu opens again after Escape, a tick or a click elsewhere', async () => {
  const { page } = await open200();
  for (const s of ['emergent', 'high', 'medium', 'low']) await page.act('group', s);
  sameAsFullRender(page, 'groups opened');
  const r = rows(page);
  await page.act('keep', r[2]); sameAsFullRender(page, 'Keep');
  await page.act('sel', r[4]); sameAsFullRender(page, 'tick');
  await page.act('rmenu', r[5]);
  assert.ok(menuOpen(page, r[5])); sameAsFullRender(page, 'menu open');
  await page.key('Escape');
  assert.ok(!menuOpen(page, r[5])); sameAsFullRender(page, 'Escape');
  await page.act('rmenu', r[5]);
  assert.ok(menuOpen(page, r[5]), 'the menu opens again after Escape');
  await page.act('sel', r[6]);
  assert.ok(!menuOpen(page, r[5]), 'a tick elsewhere closes it'); sameAsFullRender(page, 'tick elsewhere');
  await page.act('rmenu', r[5]);
  assert.ok(menuOpen(page, r[5]), 'it opens again after a tick elsewhere');
  await click(page, page.$('#ct-summary'));
  assert.ok(!menuOpen(page, r[5]), 'a click elsewhere closes it'); sameAsFullRender(page, 'click elsewhere');
  await page.act('rmenu', r[5]);
  assert.ok(menuOpen(page, r[5]), 'it opens again after a click elsewhere');
  await page.act('rmenu', r[5]);
  assert.ok(!menuOpen(page, r[5]), '⋯ again closes it'); sameAsFullRender(page, 'menu closed by ⋯');
  await page.act('fmenu', 'warn'); sameAsFullRender(page, 'filter menu open');
  await page.act('fset', 'warn:any'); sameAsFullRender(page, 'filter');
  await page.type('[data-input="find"]', 'a'); sameAsFullRender(page, 'find');
  await page.type('[data-input="find"]', ''); sameAsFullRender(page, 'find cleared');
  await page.act('sel', rows(page)[0]);
  await page.act('bulk-keep'); sameAsFullRender(page, 'bulk Keep');
  await page.act('undo', 'bulk'); sameAsFullRender(page, 'Undo of Keep');
  await page.act('sel', rows(page)[1]);
  await page.act('bulk-remove'); sameAsFullRender(page, 'bulk Remove');
  await page.act('undo', 'bulk'); sameAsFullRender(page, 'Undo of Remove');
  const id = rows(page)[0];
  await page.act('rmenu', id); await page.key('Escape'); await page.act('rmenu', id);
  assert.ok(menuOpen(page, id), 'after all that, a menu still opens again');
});

test('H2, H13: one flagged plant ticked in Search asks first, as Add does; several join at once; each row opens its details; a tick announces its facts and warnings', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate', data: 'real' });
  const page = await t.load();
  await page.act('suggest');
  const before = stateOf(t).members.length;
  await page.act('open-add', 'grow');
  const free = (flagged) => [...page.$$(`.add-row[data-flagged="${flagged}"] [data-act="atick"]`)].filter((b) => !('disabled' in b.attribs)).map((b) => b.attribs['data-v']);
  const [a, b] = free(true), [c, d] = free(false);
  assert.ok(a && b && c && d, 'flagged and unflagged plants to tick');
  for (const row of page.$$('#ct-add-results .add-row')) {
    const id = row.querySelector('[data-act="atick"]').attribs['data-v'];
    assert.ok(row.querySelector(`[data-act="details-from"][data-v="${id}"]`), 'each Search row opens its plant\'s details');
    assert.ok(!row.querySelector('label [data-act="details-from"]'), 'outside the tick\'s label');
  }
  // H13: the tick is named by the plant and described by its facts and every warning chip.
  const box = page.$(`[data-act="atick"][data-v="${a}"]`);
  const described = (box.attribs['aria-describedby'] ?? '').split(/\s+/).filter(Boolean).map((id) => textOf(page.$(`[id="${id}"]`))).join(' ');
  assert.match(described, / · /, 'layer · height · jobs');
  const warns = textOf(box.closest('.add-row').querySelector('.add-warns'));
  assert.ok(warns && described.includes(warns), `the warnings are announced: ${described}`);
  // One flagged plant: the confirmation Add asks, in the sheet's foot.
  await page.act('atick', a);
  await page.act('add-ticked');
  assert.equal(stateOf(t).members.length, before, 'not added before Yes');
  assert.ok(page.$('#ct-add-foot [data-act="add-ticked-yes"]'), 'Add asks first');
  assert.match(page.text('#ct-add-foot'), /has a warning/);
  assert.equal(page.focused().attribs['data-fk'], 'confirm-yes');
  await page.act('confirm-no');
  assert.equal(stateOf(t).members.length, before);
  assert.equal(page.focused().attribs['data-fk'], 'add-ticked', 'No goes back to the button');
  await page.act('add-ticked');
  await page.act('add-ticked-yes', a);
  assert.ok(stateOf(t).members.includes(a), 'Yes adds it');
  assert.ok(page.$('#ct-dialog').open, 'the sheet stays open');
  // Several plants, one of them flagged: no question (decision b49117c).
  await page.act('atick', b); await page.act('atick', c);
  await page.act('add-ticked');
  assert.ok(!page.$('[data-act="add-ticked-yes"]'));
  assert.ok(stateOf(t).members.includes(b) && stateOf(t).members.includes(c));
  // Details from a row, and back to the search with the ticks as they were.
  await page.act('atick', d);
  await page.act('details-from', d);
  assert.equal(page.$('#ct-dialog').attribs['data-kind'], 'details');
  await page.act('close');
  assert.equal(page.$('#ct-dialog').attribs['data-kind'], 'add');
  assert.ok(page.$(`[data-act="atick"][data-v="${d}"]`).checked, 'the tick stays');
});

test('H3, H14: edits never freeze the count\'s default into a choice; a pin near 20 holds through small edits; Show n at 9 plants shows the filtered list and Clear gives the cards back', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate', data: 'real' });
  const page = await t.load();
  await page.act('suggest');
  const listOn = () => page.$('[data-act="mode"][data-v="list"]').attribs['aria-pressed'] === 'true';
  await page.act('remove', cards(page)[0]);
  assert.ok(!listOn());
  await page.act('open-add');
  await page.act('add-tab', 'paste');
  await page.type('#ct-paste', temperate.taxa.map((x) => x.canonical_name).join('\n'));
  await page.settle();
  await page.act('paste-add');
  assert.equal(stateOf(t).members.length, 200);
  assert.ok(listOn(), 'a paste to 200 shows the List');
  assert.equal(cards(page).length, 0);
  // Search ticks from 9 past 20 plants: the List; small edits near 20 then hold it.
  const s = tab(device(), '/consortium/', { siteClimate: 'temperate', data: 'real' });
  const p2 = await s.load();
  await p2.act('suggest');
  await p2.act('remove', cards(p2)[0]);
  await p2.act('open-add', 'grow');
  const free = [...p2.$$('[data-act="atick"]')].filter((b) => !('disabled' in b.attribs)).map((b) => b.attribs['data-v']).slice(0, 13);
  for (const id of free) await p2.act('atick', id);
  await p2.act('add-ticked');
  await p2.act('close');
  assert.equal(stateOf(s).members.length, 21);
  assert.equal(p2.$('[data-act="mode"][data-v="list"]').attribs['aria-pressed'], 'true', 'Search ticks past 20 show the List');
  for (const g of ['emergent', 'high', 'medium', 'low']) if (p2.$(`[data-act="group"][data-v="${g}"][aria-expanded="false"]`)) await p2.act('group', g);
  const gone = rows(p2)[0];
  await p2.act('rmenu', gone);
  await click(p2, p2.$(`.lmenu [data-act="remove"][data-v="${gone}"]`), { detail: 0 }); // a key press: never read as a double click
  assert.equal(stateOf(s).members.length, 20);
  assert.equal(p2.$('[data-act="mode"][data-v="list"]').attribs['aria-pressed'], 'true', 'a Remove to 20 keeps the List (B14)');
  // H14: Show n at 9 plants shows the filtered list; clearing the filter gives the cards back.
  const u = tab(device(), '/consortium/', { siteClimate: 'temperate', data: 'real' });
  const p3 = await u.load();
  await p3.act('suggest');
  const n = cards(p3).length, show = p3.$('.att-line [data-act="fset"]');
  assert.ok(show, 'a warning line with Show');
  await click(p3, show);
  assert.equal(p3.$('[data-act="mode"][data-v="list"]').attribs['aria-pressed'], 'true');
  assert.ok(p3.$('.fresults') && /Showing/.test(p3.text('.fresults')));
  await p3.act('fclear-all');
  assert.equal(p3.$('[data-act="mode"][data-v="cards"]').attribs['aria-pressed'], 'true', 'Clear filters: the default again');
  assert.equal(cards(p3).length, n);
  // A List the reader chose stays after Clear.
  await p3.act('mode', 'list');
  await click(p3, p3.$('.att-line [data-act="fset"]'));
  await p3.act('fclear-all');
  assert.equal(p3.$('[data-act="mode"][data-v="list"]').attribs['aria-pressed'], 'true');
});

test('H4, H7: filters and Find never untick; the bar says how many are not shown; Keep and Remove act on the shown ticks only; a Keep that hides its row moves the focus on', async () => {
  const { t, page } = await open200();
  const find = '[data-input="find"]';
  await page.type(find, 'Prunus');
  const three = rows(page).slice(0, 3);
  for (const id of three) await page.act('sel', id);
  await page.type(find, 'Prunus a');
  await page.type(find, 'Prunus');
  assert.match(page.text('.selbar'), /^3 selected /, 'a keystroke unticks nothing');
  assert.doesNotMatch(page.text('.selbar'), /not shown/);
  await page.type(find, temperate.taxa.find((x) => x.id === three[0]).canonical_name);
  const k = rows(page).filter((id) => three.includes(id)).length;
  assert.ok(k >= 1 && k < 3, `${k} of the 3 shown`);
  assert.match(page.text('.selbar'), new RegExp(`^3 selected · ${3 - k} not shown`));
  assert.match(page.text('.selbar'), new RegExp(`Keep ${k}(?!\\d).*Remove ${k}(?!\\d)`));
  await page.act('bulk-remove');
  assert.equal(stateOf(t).members.length, 200 - k, 'only the shown ticks go');
  assert.match(page.text('#ct-toast'), new RegExp(`^${k} plants? removed`));
  await page.type(find, '');
  assert.match(page.text('.selbar'), new RegExp(`^${3 - k} selected `), 'the hidden ticks are still ticked');
  // Kept: not kept. A pin hides its row: the tick stays, said as not shown, and the focus moves on.
  const b = await open200();
  await b.page.act('fmenu', 'kept');
  await b.page.act('fset', 'kept:notKept');
  const r = rows(b.page);
  assert.equal(r.length, 10);
  await b.page.act('sel', r[0]); await b.page.act('sel', r[1]);
  await b.page.act('keep', r[0]);
  assert.ok(!rows(b.page).includes(r[0]));
  assert.match(b.page.text('.selbar'), /^2 selected · 1 not shown/);
  assert.match(b.page.text('.selbar'), /Keep 1(?!\d).*Remove 1(?!\d)/);
  assert.equal(b.page.focused().attribs['data-fk'], 'kp-' + r[1], 'the focus goes to the next row shown');
  for (const id of rows(b.page).slice(1)) await b.page.act('sel', id);
  assert.match(b.page.text('.selbar'), /Keep 9(?!\d)/);
  await b.page.act('bulk-keep');
  assert.equal(rows(b.page).length, 0);
  assert.match(b.page.text('#ct-toast'), /^9 plants kept/);
  assert.match(b.page.text('.selbar'), /^10 selected · 10 not shown/);
  assert.ok(!b.page.$('[data-act="bulk-remove"]') && !b.page.$('[data-act="bulk-keep"]'), 'nothing shown to Keep or Remove');
  assert.equal(b.page.focused().attribs['data-fk'], 'unselect', 'the focus goes to the bar');
  assert.equal(stateOf(b.t).members.length, 200);
});

test('H5: with the Add sheet open, an add is said and its Undo and Show are reachable inside the sheet; the toast goes back to the page once it closes', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate', data: 'real' });
  const page = await t.load();
  await page.act('suggest');
  const before = stateOf(t).members.length;
  await page.act('open-add', 'grow');
  const dlg = page.$('#ct-dialog');
  assert.ok(dlg.querySelector('#ct-say'), 'the live line is in the sheet while it is open');
  const ids = [...page.$$('.add-row[data-flagged="true"] [data-act="atick"]')].filter((b) => !('disabled' in b.attribs)).slice(0, 2).map((b) => b.attribs['data-v']);
  for (const id of ids) await page.act('atick', id);
  await page.act('add-ticked');
  const toastIn = dlg.querySelector('#ct-toast');
  assert.ok(toastIn && !toastIn.hidden, 'the toast is inside the open sheet');
  assert.match(textOf(toastIn), /2 plants added and kept · 2 with a warning\./);
  assert.ok(toastIn.querySelector('[data-act="undo"]') && toastIn.querySelector('[data-act="show-warned"]'));
  await page.act('undo', 'bulk');
  assert.equal(stateOf(t).members.length, before);
  assert.ok(dlg.open && dlg.contains(page.focused()), 'the focus stays in the sheet');
  await page.act('close');
  assert.ok(!dlg.querySelector('#ct-toast') && !dlg.querySelector('#ct-say'), 'back on the page');
  assert.ok(page.$('main #ct-toast') && page.$('main #ct-say'));
});

test('H6: on a phone an open filter sheet draws above the toast and clears the bottom safe area', () => {
  const css = read('src/styles/consortium.css');
  const toastZ = Number(/\.ct \.toast \{ position: fixed; z-index: (\d+)/.exec(css)[1]);
  const phone = css.slice(css.indexOf('B1: the chips scroll sideways'));
  const lifted = /\.ct \.ftools:has\(\.fmenu-list\) \{ z-index: (\d+); \}/.exec(phone);
  assert.ok(lifted && Number(lifted[1]) > toastZ, 'the filter row, and its sheet, above the toast');
  assert.match(phone.slice(0, phone.indexOf('.ct .fmenu-head')), /env\(safe-area-inset-bottom/);
});

test('H8: Start over, No country, then Undo: the Warning filter is one the country offers, never "invasive in null"', async () => {
  const { page } = await open200();
  await page.act('fmenu', 'warn');
  await page.act('fset', 'warn:invasive');
  await page.act('start-over');
  await page.act('open-place', 'country');
  await page.act('no-country');
  await page.act('undo', 'start');
  const chip = page.text('[data-act="fmenu"][data-v="warn"]');
  assert.doesNotMatch(chip, /null/);
  assert.match(chip, /invasive in \d+ countries/);
  assert.doesNotMatch(page.text('.fresults'), /Showing 0 of/);
});

test('C4: with no country, the invasive line and filter name the count of countries in every language, never "somewhere" or "elsewhere"', async () => {
  const vague = /somewhere|elsewhere|quelque part|ailleurs|algún|algum|qualche|irgendwo|ergens|где-то|どこか|어딘가|某些/i;
  for (const l of ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru']) {
    const j = JSON.parse(read(`src/i18n/translations/${l}.json`));
    for (const key of ['consortium.fw.somewhere', 'consortium.att.somewhere']) {
      assert.match(j[key], /#/, `${l} ${key} names the count`);
      assert.doesNotMatch(j[key], vague, `${l} ${key}`);
    }
  }
  const fr = JSON.parse(read('src/i18n/translations/fr.json'));
  assert.equal(fr['consortium.att.somewhere'], 'one: Envahissante dans # pays | other: Envahissante dans # pays');
  const { page } = await open200({ country: null });
  await page.act('open-place', 'country');
  await page.act('no-country');
  const n = new Set(temperate.taxa.flatMap((x) => (x.warnings.invasive_in ?? []).map((c) => c.country))).size;
  assert.equal(page.text('.att-somewhere strong'), `Invasive in ${n} countries`);
  const frPage = await open200({ country: null }, { lang: 'fr' });
  await frPage.page.act('open-place', 'country');
  await frPage.page.act('no-country');
  assert.equal(frPage.page.text('.att-somewhere strong'), `Envahissante dans ${n} pays`);
});

const linkN = (n) => '/consortium/#' + core.encodeState({ climate: 'temperate', country: 'FR', site: { ...core.DEFAULT_SITE }, kept: ids.slice(0, n), removed: [], members: ids.slice(0, n), plants: [], crops: [], guests: [] }, temperate).toString();
const listOn = (page) => page.$('[data-act="mode"][data-v="list"]')?.attribs['aria-pressed'] === 'true';
const openGroups = async (page) => { for (const g of ['emergent', 'high', 'medium', 'low']) if (page.$(`[data-act="group"][data-v="${g}"][aria-expanded="false"]`)) await page.act('group', g); };

test('K1: a Remove never changes the view shown: a bulk Remove from 31 plants to 20 keeps the List, rows and focus', async () => {
  const t = tab(device(), linkN(31), { data: 'real' });
  const page = await t.load();
  assert.ok(listOn(page));
  await openGroups(page);
  for (const id of rows(page).slice(0, 11)) await page.act('sel', id);
  await page.act('bulk-remove');
  assert.equal(stateOf(t).members.length, 20);
  assert.ok(listOn(page), 'still the List');
  assert.equal(cards(page).length, 0);
  assert.equal(rows(page).length, 20);
  assert.match(page.focused()?.attribs?.['data-fk'] ?? '', /^sel-/, 'the focus on the next row');
  // And on down: a Remove to 9 keeps it too.
  for (const id of rows(page).slice(0, 11)) await page.act('sel', id);
  await page.act('bulk-remove');
  assert.ok(listOn(page) && rows(page).length === 9);
  // From Cards, a Remove keeps the Cards.
  const c = tab(device(), linkN(15), { data: 'real' });
  const p2 = await c.load();
  await p2.act('remove', cards(p2)[0]);
  assert.ok(!listOn(p2) && cards(p2).length === 14);
});

test('K2: every Undo pressed in an open sheet leaves the focus in the sheet', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate', data: 'real' });
  const page = await t.load();
  await page.act('suggest');
  const n = stateOf(t).members.length;
  await page.act('remove', cards(page)[0]);
  await page.act('open-add', 'grow');
  const dlg = page.$('#ct-dialog');
  assert.ok(dlg.querySelector('#ct-toast [data-act="undo"]'));
  await page.act('undo');
  assert.equal(stateOf(t).members.length, n);
  assert.ok(dlg.open && dlg.contains(page.focused()), 'a single Remove\'s Undo');
  await page.act('close');
  await page.act('start-over');
  await page.act('open-place', 'country');
  assert.ok(dlg.querySelector('#ct-toast [data-act="undo"]'));
  await page.act('undo', 'start');
  assert.ok(dlg.open && dlg.contains(page.focused()), 'Start over\'s Undo');
});

test('K3: when the Find text was the last filter, deleting it gives the count\'s default view back', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate', data: 'real' });
  const page = await t.load();
  await page.act('suggest');
  await click(page, page.$('.att-line [data-act="fset"]'));
  assert.ok(listOn(page));
  await page.type('[data-input="find"]', 'a');
  const chip = page.$('.fchip.is-on [data-act="fclear"]') ?? page.$('[data-act="fclear"]');
  await click(page, chip);
  assert.ok(listOn(page), 'the Find text still filters');
  await page.type('[data-input="find"]', '');
  assert.ok(!listOn(page), 'no filter left: the Cards again');
  assert.ok(cards(page).length > 0);
});

test('the list row grid fits the list at every width, so warning chips wrap and are never clipped (with the side panel too)', () => {
  const css = read('src/styles/consortium.css');
  assert.match(css, /\.ct \.plants-sec \{[^}]*container: plants \/ inline-size/, 'the list sizes its columns to its own width, not the window');
  // The narrowest width each column set is used at: a row needs the sum of its columns' minimums,
  // its gaps (10 px) and padding and border (26 px).
  const need = (cols) => {
    const tracks = cols.trim().split(/\s+(?![^(]*\))/);
    const min = tracks.reduce((s, tr) => s + Number((/^(\d+)px/.exec(tr) ?? /^minmax\((\d+)px/.exec(tr) ?? [0, 0])[1]), 0);
    return min + 10 * (tracks.length - 1) + 26;
  };
  const block = (head) => { const i = css.indexOf(head); assert.ok(i >= 0, head); return css.slice(i, css.indexOf('\n}', i)); };
  const colsIn = (text) => [...text.matchAll(/--lcols: ([^;]+);/g)].map((m) => m[1]);
  const full = colsIn(css.slice(css.indexOf('/* The row grid'), css.indexOf('.ct .lcols {\n')));
  const compact = colsIn(block('@container plants (max-width: 1159px)'));
  const wrap = block('@container plants (max-width: 899px)');
  for (const c of full) assert.ok(need(c) <= 1160, `full columns need ${need(c)} px`);
  for (const c of compact) assert.ok(need(c) <= 900, `compact columns need ${need(c)} px`);
  for (const c of colsIn(wrap)) assert.ok(need(c) <= 560, `narrow columns need ${need(c)} px`);
  assert.match(wrap, /\.lwarns \{[^}]*grid-row: 2; grid-column: 3 \/ -1/, 'below 900 px the warnings take a line of their own');
  assert.match(css, /\.ct \.warn-chip \{[^}]*max-width: 100%/, 'a chip never runs past its cell');
  assert.match(css, /\.ct \.lwarns, \.ct \.lline3 \{[^}]*min-width: 0/);
  // The Kept head ("Gehouden", "Сохранено") is wider than its 44 px column: it spans the tick's column too.
  assert.match(css, /\.ct \.lcols > span:nth-child\(2\) \{ grid-column: 1 \/ 3;/);
});

test('pest chips name the data\'s sourced common names (agent_names) in en, fr and nl, else the scientific name; details keep the scientific name and cite the name sources', async () => {
  const rowsWith = (list) => list.interactions.filter((i) => ['shared_pest', 'alternate_host'].includes(i.type) && i.agent);
  const all = rowsWith(temperate);
  assert.ok(all.some((i) => i.agent_names), 'the installed export carries agent_names');
  for (const lang of ['en', 'fr', 'nl']) {
    const allowed = new Set(all.map((i) => (i.agent_names?.names?.[lang] ?? i.agent).toLocaleLowerCase(lang)));
    const sourced = new Set(all.filter((i) => i.agent_names?.names?.[lang]).map((i) => i.agent_names.names[lang].toLocaleLowerCase(lang)));
    const { page } = await open200({}, { lang });
    for (const g of ['emergent', 'high', 'medium', 'low']) if (page.$(`[data-act="group"][data-v="${g}"][aria-expanded="false"]`)) await page.act('group', g);
    const chips = [...page.$$('.lrow .warn-chip.warn-pest')].map((c) => textOf(c));
    assert.ok(chips.length, `${lang}: pest chips`);
    const parts = chips.flatMap((c) => c.split(' · ')).map((x) => x.toLocaleLowerCase(lang));
    for (const x of parts) assert.ok(allowed.has(x), `${lang}: "${x}" comes from the data`);
    if (sourced.size) assert.ok(parts.some((x) => sourced.has(x)), `${lang}: a sourced name shows`);
  }
  // Details: the scientific name and, in Sources, the EPPO page and the usage page.
  const i = all.find((x) => x.agent_names?.names?.en);
  const host = temperate.taxa.find((t) => t.canonical_name === i.subject.name || t.genus === i.subject.name);
  const { page } = await open200();
  await page.act('details', host.id);
  const d = page.$('#ct-dialog');
  assert.ok(textOf(d).includes(`Cause: ${i.agent}`), 'the details name the scientific name');
  const cited = [...d.querySelectorAll('.srcs li')].map((li) => textOf(li));
  for (const id of i.agent_names.sources) assert.ok(cited.some((c) => c.includes(temperate.sources[id].label)), `Sources cite ${id}`);
});
