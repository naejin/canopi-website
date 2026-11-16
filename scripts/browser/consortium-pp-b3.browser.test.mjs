// PP-B stream b3 (Your plants and Things to weigh on the palette page; plant-palette-slices section 2,
// row b3): its browser scenarios. PP-B9 and PP-B23 are the slices' rows; PP-B60 (B6) and PP-B61 (P4)
// take numbers clear of the streams running beside b3, PP-B23b holds the 0 and 1 plant rows of the
// chunk 2 drift check, PP-B62 the plants Your plants cannot show (fix round 1, b3r-1 and b3r-6; on paper and counted
// from the rows, fix round 2, b3f-1 and b3f-2) and PP-B63 the water needs not recorded said on their own
// line (b3f-4). B6 is the F1a Balance marker parked by PP-B commit 0
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

useHarness();

const W = (k) => en[`consortium.plants.${k}`];
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
// A plural string's form for n ("one: … | other: …", # the count), as strings.ts P() reads it.
const plural = (s, n, vars = {}) => fill(Object.fromEntries(s.split('|').map((f) => f.trim().match(/^(\w+):\s*(.*)$/).slice(1)))[n === 1 ? 'one' : 'other'].replace(/#/g, String(n)), vars);
// A key's words as a pattern, each placeholder a number.
const keyPattern = (k) => new RegExp(`^${k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{\w+\\?\}/g, '[\\d,.]+')}$`);
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
    const recorded = [...legumes, ...others].filter((t) => t.traits.drought_tolerance || t.traits.moisture_use).length;
    return { ids: [...legumes, ...others].map((t) => t.id), names: legumes.map((t) => t.names.en || t.canonical_name), recorded };
  });
  await paletteOf(page, picked.ids);
  const weigh = await section(page, W('weigh.title'));
  assert.ok(weigh, 'Things to weigh: no section on the palette page');
  assert.ok(weigh.includes(fill(W('weigh.family'), { n: 6, m: 8, family: 'Fabaceae' })), `the family line ("${weigh}")`);
  for (const name of picked.names) assert.ok(weigh.includes(name), `names ${name}`);
  assert.ok(weigh.includes(W('weigh.familyHint')), 'with its hint');
  // The water line from its key: too few recorded (under half) is "not enough to judge", n of 8.
  if (picked.recorded < 4) assert.ok(weigh.includes(fill(W('weigh.waterFew'), { n: picked.recorded, m: 8 })), `the water line, ${picked.recorded} of 8 recorded ("${weigh}")`);
  const water = await page.$eval(`${WEIGH} [data-weigh="water"] strong`, (e) => e.textContent).catch(() => null);
  assert.ok(water === null || [W('weigh.waterFew'), W('weigh.waterMix')].some((k) => keyPattern(k).test(water)), `a water line in its key's words ("${water}")`);
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
// site-marks.ts siteMarks lets pots through as it does small and large (b3 hand-off, applied at the merge).
test('PP-B61b (b3 the height note with "Balcony or pots", F1a-P4 split, A8): with pots a tall plant added shows its height note on its row', () => heightNote('pots'));

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
  // On paper the level too (b3r-3): Slight reads "Mildly toxic", Moderate "Toxic", the words of Your plants.
  await page.evaluate(() => dispatchEvent(new Event('beforeprint'))); // the print sheet is in the page only while printing
  await page.waitForSelector('.ct-print tbody tr', { timeout: 20_000 });
  const printRow = (id) => page.evaluate((x) => {
    const name = document.querySelector(`.ct-plants [data-plant-id="${x}"] .ct-plant-name i`)?.textContent;
    return [...document.querySelectorAll('.ct-print tbody tr')].find((tr) => tr.querySelector('i')?.textContent === name)?.textContent.replace(/\s+/g, ' ') ?? '';
  }, id);
  const [pSlight, pModerate] = [await printRow(pick.slight), await printRow(pick.moderate)];
  assert.ok(pSlight.includes(en['consortium.tox.Slight']), `print: "Mildly toxic" for the Slight plant (${pSlight})`);
  assert.ok(pModerate.includes(fill(en['consortium.details.tox'], { level: en['consortium.tox.Moderate'] })), `print: the Moderate level (${pModerate})`);
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
  // Remove a plant first, then open the fold: the toast still hands the focus back to the next row's
  // Remove, not to the row the fold opened on (b3c-13: unfold is a plain focus, never the toast's opener).
  const [early, afterEarly] = [list[2].id, list[3].id];
  await page.$eval(`${PLANTS} [data-plant-id="${early}"] .button-secondary`, (b) => { b.focus(); b.click(); });
  await page.waitForFunction((x) => !window.__ctTest.store.members.value.includes(x), { timeout: 4000 }, early);
  await frames(page);
  // Pressed on the element, not at a point: a line coming in above after the Remove could move the
  // button between Puppeteer's measure and its click, which then missed (1 in 5, PP-B exit).
  await page.$eval(`${PLANTS} .ct-plants-more`, (b) => { b.focus(); b.click(); });
  await page.waitForFunction((k) => document.querySelectorAll('.ct-plants li[data-plant-id]').length > k, { timeout: 4000 }, shown);
  await frames(page);
  assert.equal(await page.evaluate((k) => document.activeElement === document.querySelectorAll('.ct-plants li[data-plant-id]')[k], shown), true, 'the focus on the first row it shows');
  assert.equal(await page.$(`${PLANTS} .ct-plants-more`), null, 'the fold stays open');
  await page.$eval('.ct-toast button', (b) => b.focus());
  await page.evaluate(() => window.__ctTest.store.hideToast());
  await frames(page);
  assert.equal(await page.evaluate(() => document.activeElement?.closest('[data-plant-id]')?.dataset.plantId ?? null), afterEarly, 'the toast hands the focus back to the next row after the removed plant');
  await page.evaluate((x) => window.__ctTest.store.addMembers([x]), early);
  await page.waitForFunction((k) => document.querySelectorAll('.ct-plants li[data-plant-id]').length === k, { timeout: 4000 }, n);
  await page.evaluate(() => window.__ctTest.store.hideToast());
  list = await rows(page);
  assert.equal(list.length, n, 'every plant once');
  assert.equal(new Set(list.map((r) => r.id)).size, n, 'each plant once');
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

// Fix round 1 (b3r-1, b3c-6, b3r-6): a guest list that could not be read, and a plant on none of the
// climate's lists: Things to weigh counts them in the palette (never "7 of 7" for a ten-plant palette)
// and says they are not checked; Your plants gives each a plain row saying why, with Remove.
test('PP-B62 (b3 plants not shown): with a guest list unread and a plant on no list of this climate, Your plants gives each a row saying why with Remove, Things to weigh counts them as not checked in the whole palette (a guest of the unread list that this climate lists too is checked, not counted), and the print sheet names them with why in the whole count', async () => {
  const pick = await realDb((db) => {
    const ids = (sql, k) => db.prepare(sql).all(k).map((r) => String(r.id));
    const medOnly = "SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Mediterranean' AND p.plant NOT IN (SELECT plant FROM placements WHERE climate_zone = 'Temperate') ORDER BY p.canonical_name LIMIT ?";
    const [guest, stray] = ids(medOnly, 2);
    // On both lists: a guest of the unread list that Temperate holds too (review b3f-1).
    const [both] = ids("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Mediterranean' AND p.plant IN (SELECT plant FROM placements WHERE climate_zone = 'Temperate') ORDER BY p.canonical_name DESC LIMIT ?", 1);
    return { own: ids("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY p.canonical_name LIMIT ?", 8), guest, stray, both };
  });
  const page = await tool();
  await choose(page, 'Temperate');
  await page.evaluate((p) => {
    const { store } = window.__ctTest, src = store.source.value, read = src.pool.bind(src);
    src.pool = (c) => (c === 'Mediterranean' ? Promise.reject(new Error('test: list unreadable')) : read(c));
    store.addMembers([...p.own, p.both, p.guest, p.stray], { [p.guest]: 'Mediterranean', [p.both]: 'Mediterranean' });
    store.loadPool('Mediterranean');
  }, pick);
  await showPalette(page);
  assert.ok(await has(page, `${PLANTS} [data-plant-id="${pick.guest}"]`, 10_000), 'the unread guest has no row');
  const list = await rows(page);
  const row = (id) => list.find((r) => r.id === id)?.text ?? '';
  assert.ok(row(pick.guest).includes(W('notRead')), `the guest's row says its list could not be read (${row(pick.guest)})`);
  assert.ok(row(pick.stray).includes(W('notListed')), `the stray plant's row says it is on none of this climate's lists (${row(pick.stray)})`);
  assert.ok(row(pick.both) && !row(pick.both).includes(W('notRead')), `the plant on both lists is shown as a plant (${row(pick.both)})`);
  await page.waitForFunction((w) => document.querySelector('.ct-weigh')?.textContent.includes(w), { timeout: 8000 }, plural(W('weigh.unchecked'), 2)).catch(() => {});
  const weigh = await section(page, W('weigh.title'));
  assert.ok(weigh && weigh.includes(plural(W('weigh.unchecked'), 2)), `Things to weigh: 2 plants not checked ("${weigh}")`);
  assert.ok(!weigh.includes(W('weigh.checking')), 'never "checking" for a list that failed');
  assert.ok(!/\b\d+ of (?:your )?9\b/.test(weigh), `no line over the 9 shown plants as if they were the palette ("${weigh}")`);
  // On paper too (review b3f-2): the two plants not shown, each with why, and the whole palette's count.
  await page.evaluate(() => dispatchEvent(new Event('beforeprint')));
  await page.waitForSelector('.ct-print tbody tr', { timeout: 20_000 });
  const paper = await page.$eval('.ct-print', (e) => ({ sub: e.querySelector('.ct-print-sub').textContent, rows: [...e.querySelectorAll('tbody tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ')) }));
  assert.ok(paper.sub.includes(plural(en['consortium.start.count'], 11)), `print: the whole palette's 11 plants (${paper.sub})`);
  assert.equal(paper.rows.length, 11, 'print: a row per plant, the two not shown included');
  assert.equal(paper.rows.filter((r) => r.includes(W('notRead'))).length, 1, `print: the guest whose list could not be read, with why (${paper.rows.join(' | ')})`);
  assert.equal(paper.rows.filter((r) => r.includes(W('notListed'))).length, 1, 'print: the plant on none of this climate\'s lists, with why');
  await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  await page.$eval(`${PLANTS} [data-plant-id="${pick.stray}"] .button-secondary`, (b) => { b.focus(); b.click(); });
  await page.waitForFunction((x) => !window.__ctTest.store.members.value.includes(x), { timeout: 4000 }, pick.stray);
  await page.evaluate(() => window.__ctTest.store.hideToast());
  await page.$eval(`${PLANTS} [data-plant-id="${pick.guest}"] .button-secondary`, (b) => b.click());
  await page.waitForFunction((x) => !window.__ctTest.store.members.value.includes(x), { timeout: 4000 }, pick.guest);
  assert.equal((await members(page)).length, 9, 'only the grower removes them, through Remove');
  await done(page);
});

test('PP-B63 (b3 water needs not recorded, no water line): with enough water needs recorded and all of one need, Things to weigh still says how many plants have none recorded, on its own line (review b3f-4)', async () => {
  const pick = await realDb((db) => {
    const ids = (sql) => db.prepare(sql).all().map((r) => String(r.id));
    const at = "FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate'";
    // Four that take a dry summer, from four families, and one with no water need recorded.
    const dry = db.prepare(`SELECT p.id, p.family ${at} AND p.drought_tolerance = 'High' ORDER BY p.canonical_name`).all();
    const four = [], fams = new Set();
    for (const r of dry) if (!fams.has(r.family) && four.length < 4) { fams.add(r.family); four.push(String(r.id)); }
    const [bare] = ids(`SELECT p.id ${at} AND p.drought_tolerance IS NULL AND p.moisture_use IS NULL AND p.family NOT IN (${[...fams].map((f) => `'${f}'`).join(',')}) ORDER BY p.canonical_name LIMIT 1`);
    return [...four, bare];
  });
  assert.equal(pick.length, 5, 'four dry and one unrecorded Temperate plants in the export');
  const page = await tool();
  await choose(page, 'Temperate');
  await paletteOf(page, pick);
  const words = plural(W('weigh.missing'), 1);
  await page.waitForFunction((w) => document.querySelector('.ct-weigh')?.textContent.includes(w), { timeout: 8000 }, words).catch(() => {});
  const weigh = await section(page, W('weigh.title'));
  assert.ok(weigh && weigh.includes(words), `Things to weigh: "${words}" ("${weigh}")`);
  assert.equal(await page.$$eval(`${WEIGH} [data-weigh="water"]`, (e) => e.length), 1, 'one water line');
  await done(page);
});

// Pre-push fix 6 (keyboard focus, C): Undo after a remove in Your plants lands on that plant's row, not
// on the first [data-plant-id] in the page (the Years chart's chip).
test('PP-B64 (b3 focus, C): Undo after a remove in Your plants lands on the restored row in Your plants, not on the chart\'s chip', async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  const ids = await page.evaluate(() => window.__ctTest.store.pool.value.slice(0, 4).map((t) => t.id));
  await paletteOf(page, ids);
  const id = ids[1];
  assert.ok(await has(page, `${PLANTS} [data-plant-id="${id}"] .button-secondary`, 8000), 'the row\'s Remove');
  await page.click(`${PLANTS} [data-plant-id="${id}"] .button-secondary`);
  await frames(page);
  await page.click('.ct-toast-undo');
  await frames(page);
  const at = await page.evaluate(() => { const a = document.activeElement; return { plants: !!a?.closest('.ct-plants'), plant: a?.closest('[data-plant-id]')?.dataset.plantId ?? null, chart: !!a?.closest('.ct-chart') }; });
  await done(page);
  assert.ok(at.plants && at.plant === id && !at.chart, `the restored row in Your plants (${JSON.stringify(at)})`);
});
