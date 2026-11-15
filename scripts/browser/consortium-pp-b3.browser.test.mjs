// PP-B stream b3 (Your plants and Things to weigh on the palette page; plant-palette-slices section 2,
// row b3): its browser scenarios. PP-B9 and PP-B23 are the slices' rows; PP-B60 (B6) and PP-B61 (P4)
// take numbers clear of the streams running beside b3, and PP-B23b holds the 0 and 1 plant rows of the
// chunk 2 drift check. B6 is the F1a Balance marker parked by PP-B commit 0
// (scripts/plan/parked-markers.json), restored from 648baf2's consortium-f1a-balance.browser.test.mjs
// as the one scenario of "things to weigh"; P4's height note is the part of F1a-P4 that moved to b3
// (the pots answer stays b1a's). Each asserts the words and state a grower relies on: the palette
// page's sections are found by their headings' words, a plant's row by its data-plant-id.
// Run capped: npm run test:browser (scripts/browser/run.mjs), or this file alone with node --test.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { en, h, has, realDb, useHarness } from './helpers.mjs';
import { atSite, choose, tool } from './p5-helpers.mjs';
import { showPalette } from './seams-helpers.mjs';
import { failing } from '../expect-fail.mjs';

useHarness();

const W = (k) => en[`consortium.plants.${k}`];
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
const done = async (...pages) => { for (const p of pages) await p.browserContext().close().catch(() => {}); };
const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
const PLANTS = '.ct-plants';
const WEIGH = '.ct-weigh';
// The section under a heading's words (never a layout).
const section = (page, words) => page.evaluate((w) => [...document.querySelectorAll('#ct-root section')].find((s) => s.querySelector('h3')?.textContent.trim() === w)?.textContent.replace(/\s+/g, ' ').trim() ?? null, words);
const rows = (page) => page.$$eval(`${PLANTS} li[data-plant-id]`, (els) => els.map((e) => ({ id: e.dataset.plantId, flag: !!e.querySelector('.ct-flag-line svg'), text: e.textContent.replace(/\s+/g, ' ').trim() })));
const members = (page) => page.evaluate(() => window.__ctTest.store.members.value);
const paletteOf = async (page, ids) => {
  await page.evaluate((x) => window.__ctTest.store.addMembers(x), ids);
  await showPalette(page);
  assert.ok(await has(page, PLANTS, 10_000), 'Your plants: not on the palette page');
};

// F1a-B6 at 648baf2 (bal2), rewritten on the palette page's "Things to weigh" (weigh.ts).
test('PP-B60 (b3 legume-heavy Tropical palette, F1a-B6 restored, A20): when six of eight plants share one family, Things to weigh says so in words with the six, and water needs too thinly recorded say "not enough to judge"', async () => {
  const page = await tool();
  await atSite(page, 'manaus');
  await choose(page, 'Tropical');
  const picked = await page.evaluate(() => {
    const { store } = window.__ctTest;
    const legumes = store.pool.value.filter((t) => t.family === 'Fabaceae').slice(0, 6);
    const others = store.pool.value.filter((t) => t.family !== 'Fabaceae').slice(0, 2);
    return { ids: [...legumes, ...others].map((t) => t.id), names: legumes.map((t) => t.names.en || t.canonical_name) };
  });
  await paletteOf(page, picked.ids);
  const weigh = await section(page, W('weigh.title'));
  assert.ok(weigh, 'Things to weigh: no section on the palette page');
  assert.ok(weigh.includes(fill(W('weigh.family'), { n: 6, m: 8, family: 'Fabaceae' })), `the family line ("${weigh}")`);
  for (const name of picked.names) assert.ok(weigh.includes(name), `names ${name}`);
  assert.ok(weigh.includes(W('weigh.familyHint')), 'with its hint');
  assert.ok(/Water needs/.test(weigh), 'a water line');
  assert.deepEqual((await members(page)).length, 8, 'nothing is removed');
  await done(page);
});

// F1a-P4 at 648baf2 (pal1): the card height note, now on Your plants' row (b1a keeps the pots answer).
async function heightNote(room) {
  const page = await tool();
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  const tall = await page.evaluate((r) => {
    const { store } = window.__ctTest;
    store.room.value = r;
    return store.pool.value.find((x) => (x.traits.height_m?.max ?? 0) > 10).id;
  }, room);
  await paletteOf(page, [tall]);
  assert.equal(await page.evaluate(() => window.__ctTest.store.site.value.room), room, `the site keeps the ${room} answer`);
  const note = await has(page, `${PLANTS} [data-plant-id="${tall}"] [data-mark="room"]`, 8000);
  await done(page);
  assert.ok(note, `${room}: the tall plant shows no height note on its row`);
}
test('PP-B61 (b3 the height note on Your plants, F1a-P4 split, A8): in a small garden a tall plant added shows its height note on its row', () => heightNote('small'));
// core site-marks.ts siteMarks (:49) returns no mark unless the room is small or large (or the site
// dry), so "Balcony or pots" never shows the height note on any surface: a one-word fix there, a file
// no chunk-2 stream owns (b3 hand-off to the coordinator, 2026-11-15).
failing('PP-B61b (b3 the height note with "Balcony or pots", F1a-P4 split, A8): with pots a tall plant added shows its height note on its row', { owner: 'b3', reason: /pots: the tall plant shows no height note on its row/ }, () => heightNote('pots'));

// Owner rows: warn, never hide; the grower decides; warnings in words with an icon, never colour alone
// (inventory F5: Slight the warning colour, Moderate and Severe the danger colour).
test('PP-B9 (b3 warnings first): a Slight-toxic, a Moderate-toxic and an invasive plant are listed first in Your plants, each with its warning in words and the icon, Moderate in another colour than Slight; Details says "Mildly toxic" once; they leave only when the grower removes them', async () => {
  const pick = await realDb((db) => {
    const one = (where) => db.prepare(`SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' AND ${where} ORDER BY p.canonical_name LIMIT 1`).get().id;
    const invasive = "p.plant IN (SELECT plant FROM plant_invasive WHERE country = 'FR')";
    const plain = db.prepare(`SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' AND coalesce(p.toxicity, 'None') = 'None' AND p.plant NOT IN (SELECT plant FROM plant_invasive) ORDER BY p.canonical_name LIMIT 4`).all().map((r) => String(r.id));
    return { slight: String(one(`p.toxicity = 'Slight' AND NOT ${invasive}`)), moderate: String(one(`p.toxicity = 'Moderate' AND NOT ${invasive}`)), invasive: String(one(invasive)), plain };
  });
  const page = await tool();
  await choose(page, 'Temperate');
  await page.evaluate(() => { window.__ctTest.store.country.value = { code: 'FR', source: 'chosen' }; });
  await paletteOf(page, [...pick.plain, pick.slight, pick.moderate, pick.invasive]);
  const list = await rows(page);
  const warned = [pick.slight, pick.moderate, pick.invasive];
  const firstPlain = list.findIndex((r) => !r.flag);
  assert.ok(list.slice(0, 3).every((r) => warned.includes(r.id)), `the three warned plants first (${list.map((r) => r.id.slice(0, 8)).join(', ')})`);
  assert.ok(firstPlain === -1 || list.slice(firstPlain).every((r) => !r.flag), 'every warned row before the others');
  const row = (id) => list.find((r) => r.id === id).text;
  assert.ok(row(pick.slight).includes(en['consortium.tox.Slight']), `"Mildly toxic" in words (${row(pick.slight)})`);
  assert.ok(row(pick.moderate).includes(en['consortium.tox.Moderate']), 'Moderate in words');
  assert.ok(row(pick.invasive).includes(en['consortium.d.invHere'].split('{country}')[0].trim()), 'invasive in words');
  for (const id of warned) assert.ok(list.find((r) => r.id === id).flag, `${id}: the warning icon`);
  const colour = (id) => page.$eval(`${PLANTS} [data-plant-id="${id}"] .ct-flag-line`, (e) => getComputedStyle(e).color);
  assert.notEqual(await colour(pick.moderate), await colour(pick.slight), 'Moderate and Slight in their own colours');
  // Details: the Slight level once, as a warning line (its old sentence of its own is gone).
  await page.evaluate((x) => window.__ctTest.openSheet('details', x), pick.slight);
  await page.waitForSelector('dialog[open] .ct-warnlist li', { timeout: 10_000 });
  const lines = await page.$$eval('dialog[open] .ct-warnlist li', (els) => els.map((e) => e.textContent));
  assert.equal(lines.filter((l) => l.includes(en['consortium.tox.Slight'])).length, 1, `"Mildly toxic" once in Details (${lines.join(' | ')})`);
  await page.evaluate(() => window.__ctTest.store.closeSheet());
  // Nothing takes them out but the grower: another plant joins, they stay; Remove takes one out.
  const more = await realDb((db) => String(db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY p.canonical_name DESC LIMIT 1").get().id));
  await page.evaluate((x) => window.__ctTest.store.addMembers([x]), more);
  await frames(page);
  const after = await rows(page);
  assert.ok(warned.every((id) => after.some((r) => r.id === id)) && (await members(page)).filter((id) => warned.includes(id)).length === 3, 'the warned plants stay');
  await page.$eval(`${PLANTS} [data-plant-id="${pick.slight}"] .button-secondary`, (b) => b.click());
  await page.waitForFunction((x) => !window.__ctTest.store.members.value.includes(x), { timeout: 4000 }, pick.slight);
  assert.ok(await page.evaluate(() => !!window.__ctTest.store.toast.value?.undo), 'Remove offers Undo');
  await done(page);
});

// The 200-plant palette (scripts/palette-200.mjs), saved and reopened; the new form of the deleted F1a-P5.
test('PP-B23 (b3 200 plants): Your plants folds to "+ N more", opening it moves the focus to the first row it shows, and Remove takes a plant out with Undo and the focus on the next row', async () => {
  const { savedRecord200 } = await import('../palette-200.mjs');
  const record = await savedRecord200();
  const page = await h.open('/palette/', { width: 1280, hook: true, setup: (p) => p.evaluateOnNewDocument((rec) => {
    if (!sessionStorage.getItem('ct-b3-saved')) { localStorage.setItem('canopi-consortium', rec); sessionStorage.setItem('ct-b3-saved', '1'); }
  }, record) });
  assert.ok(await has(page, `${PLANTS} li[data-plant-id]`, 30_000), 'Your plants: not on the palette page');
  const n = (await members(page)).length;
  assert.equal(n, 200);
  let list = await rows(page);
  const more = await page.$eval(`${PLANTS} .ct-plants-more`, (b) => b.textContent.trim()).catch(() => null);
  assert.ok(list.length < n && more, `folded: ${list.length} rows, then "${more}"`);
  assert.ok(more.includes(String(n - list.length)), `"+ N more" counts the rest (${more})`);
  const shown = list.length;
  await page.click(`${PLANTS} .ct-plants-more`);
  await page.waitForFunction((k) => document.querySelectorAll('.ct-plants li[data-plant-id]').length > k, { timeout: 4000 }, shown);
  await frames(page);
  list = await rows(page);
  assert.equal(list.length, n, 'every plant once');
  assert.equal(new Set(list.map((r) => r.id)).size, n, 'each plant once');
  assert.equal(await page.evaluate((k) => document.activeElement === document.querySelectorAll('.ct-plants li[data-plant-id]')[k], shown), true, 'the focus on the first row it shows');
  // Remove the 13th plant: out of the palette, the focus on the next row's Remove, Undo brings it back.
  const [target, next] = [list[shown].id, list[shown + 1].id];
  await page.$eval(`${PLANTS} [data-plant-id="${target}"] .button-secondary`, (b) => { b.focus(); b.click(); });
  await page.waitForFunction((x) => !window.__ctTest.store.members.value.includes(x), { timeout: 4000 }, target);
  await frames(page);
  assert.equal(await page.evaluate(() => document.activeElement?.closest('[data-plant-id]')?.dataset.plantId ?? null), next, 'the focus on the next row');
  await page.evaluate(() => { const { store } = window.__ctTest; const { undo } = store.toast.value; store.hideToast(); undo(); });
  await page.waitForFunction((x) => window.__ctTest.store.members.value.includes(x), { timeout: 4000 }, target);
  await done(page);
});

// Drift check rows: 0 and 1 plants; the last Remove leaves the section, never the focus on <body>.
test('PP-B23b (b3 Your plants at 1 and 0 plants): one row with no "+ N more"; its Remove leaves no section of nothing, and the focus stays in the tool', async () => {
  const one = await realDb((db) => String(db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY p.canonical_name LIMIT 1").get().id));
  const page = await tool();
  await choose(page, 'Temperate');
  await paletteOf(page, [one]);
  assert.equal((await rows(page)).length, 1);
  assert.equal(await page.$(`${PLANTS} .ct-plants-more`), null, 'no "+ N more"');
  const text = await section(page, W('title'));
  assert.ok(text.includes(W('sizeNone')) || text.includes(W('size').split('{')[0].trim()), `its size, or that none is recorded ("${text}")`);
  await page.$eval(`${PLANTS} .button-secondary`, (b) => { b.focus(); b.click(); });
  await page.waitForFunction(() => window.__ctTest.store.members.value.length === 0, { timeout: 4000 });
  await frames(page);
  assert.equal(await page.$(PLANTS), null, 'Your plants: nothing at 0 plants');
  assert.equal(await page.$(WEIGH), null, 'Things to weigh: nothing at 0 plants');
  assert.equal(await page.evaluate(() => document.activeElement === document.body || !document.activeElement), false, 'the focus never falls to <body>');
  await done(page);
});
