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
const rows = (page) => [...page.$$('.lrow[data-id]')].map((el) => el.attribs['data-id']);
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
  const where = new Intl.DisplayNames(['en'], { type: 'region' }).of(unchecked);
  const all = page.text().split(`not checked in ${where}`).length - 1;
  assert.ok(all >= 1 && all <= 2, `said ${all} times`);
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
  const row = [...page.$$('#ct-add-results .alt')].find((li) => li.querySelector(`[data-v="${inside}"]`));
  assert.ok(row);
  assert.match(page.text('#ct-add-results'), /In your consortium/);
  assert.ok(!row.querySelector('[data-act="add"]'), 'no Add for a plant already in');
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
