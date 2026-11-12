// The seams between the four P2 streams (hand-off branch: H1–H16, seam review X1–X8, walk-through
// W1–W9, and the reviews of the branch, F1–F7). Every test here drives the page through its real
// controls, as a reader would; the test hook only makes the after-the-matrix chunk fail or wait (F4,
// F5), which no control can. Run capped: npm run test:browser.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, startHarness } from './harness.mjs';
import { aria, axNodes, eachVariant, en, findAx, fixtureDb, has, settled } from './helpers.mjs';
import { readFileSync } from 'node:fs';
import { jobOfFunction } from '../../src/lib/consortium/jobs.ts';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

const PHASES = ['placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax'];
const STRATA = ['emergent', 'high', 'medium', 'low'];
const plainOf = Object.fromEntries(PHASES.map((p, i) => [en[`consortium.phase.${p}.plain`], i]));
const stratumOf = Object.fromEntries(STRATA.map((s) => [en[`consortium.stratum.${s}`], s]));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const done = async (...pages) => { for (const p of pages) await p.browserContext().close().catch(() => {}); };

// The fixture's Temperate plants: id, canonical name, stratum, span and jobs.
const temperate = () => fixtureDb((db) => {
  const rows = db.prepare("SELECT p.plant, p.id, p.canonical_name name, p.height_max_m h, p.habit, p.tolerates_full_shade shade, x.role, x.stratum, x.phase_start a, x.phase_end b FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate'").all();
  const fns = db.prepare('SELECT plant, function FROM functions').all();
  // A crop feeds you; the other jobs come from its functions (core jobs.ts).
  return rows.map((r) => ({ ...r, jobs: new Set([...(r.role === 'crop' ? ['feeds_you'] : []), ...fns.filter((f) => f.plant === r.plant).map((f) => jobOfFunction[f.function]).filter(Boolean)]) }));
});

// "Emergent, Years 1–3" or "Emergent, Years 1–3 → Years 15–25": the cell a control's name holds.
function cellIn(name) {
  const m = /:\s*([^,]+),\s*(.+)$/.exec(name);
  assert.ok(m, `a cell in "${name}"`);
  const [a, b = a] = m[2].split(' → ');
  return { stratum: stratumOf[m[1]], from: plainOf[a], to: plainOf[b] };
}

// Start → a climate → (light) → (room) → Suggest, through the controls.
async function suggested(v, { room = null, light = null } = {}) {
  const page = await h.open('/consortium/', { ...v, data: 'fixture' });
  await page.locator(aria('radio', 'Temperate')).click();
  assert.equal(await loadState(page), 'ready');
  if (light) await page.locator(aria('radio', light)).click();
  if (room) await page.locator(aria('radio', room)).click();
  await page.locator(aria('button', 'Suggest plants')).click();
  assert.ok(await has(page, aria('tab', 'Layers × stages'), 8000), 'the matrix');
  return page;
}

// The members shown, as plant ids (chips, phone rows and list rows carry data-plant-id).
const memberIds = (page) => page.$$eval('#ct-root [data-plant-id]', (els) => [...new Set(els.map((e) => e.dataset.plantId))]);

// The Add sheet's own rows (not "In other lists"), every one (after "Show all N").
async function addRows(page) {
  const all = await page.$('.ct-add .ct-add-showall');
  if (all) await all.click();
  return page.$$eval('.ct-add .ct-sheet-body > ul.ct-rows > li .ct-sci', (els) => els.map((e) => e.textContent.trim()));
}

// The core's light rule (site.ts) in shade: a plant recorded as not taking full shade misfits; an
// unrecorded one is unknown, never a misfit. The room is advisory (owner request 2026-11-12): a plant
// taller than a small garden is listed with a note, never left out.
const fitsShade = (p) => p.shade !== 0;

test('X1/X2: "+ Add" in a free cell opens Add for that cell, and lists only its plants that fit (shade; a small garden filters nothing)', async (t) => {
  const plants = await temperate();
  await eachVariant(t, async (v) => {
    const page = await suggested(v, { light: 'Shade', room: 'Small garden' });
    // The members, read at each phone stage (a stage shows only its own); a filled cell's "+" has the
    // same name as a free cell's, so a cell holding a member is skipped.
    const members = new Set(await memberIds(page));
    const span = (cell) => plants.filter((p) => p.stratum === cell.stratum && p.a <= cell.to && p.b >= cell.from);
    const inCell = (cell) => span(cell).filter((p) => !members.has(p.id));
    const free = (cell) => !span(cell).some((p) => members.has(p.id));
    // A free cell where the light leaves out at least one of its plants, so the filter is seen working.
    let btn = null;
    for (let i = 0; i < 7 && !btn; i++) {
      for (const id of await memberIds(page)) members.add(id);
      const adds = (await axNodes(page)).filter((n) => n.role === 'button' && /^Add a plant: /.test(n.name ?? ''));
      btn = adds.find((n) => { const c = cellIn(n.name); return free(c) && inCell(c).some((p) => !fitsShade(p)); }) ?? null;
      if (!btn && v.width < 640) await page.locator(aria('button', 'Later stage')).click();
    }
    assert.ok(btn, 'a free cell with "+ Add" holding a plant that does not take shade');
    const cell = cellIn(btn.name);
    await page.locator(aria('button', btn.name)).click();
    const dialog = await findAx(page, { role: 'dialog', name: new RegExp(`^Add to ${esc(en[`consortium.stratum.${cell.stratum}`])} · `) });
    assert.ok(dialog, `"+ Add" opens "Add to {layer} · {phase}" (${btn.name})`);
    const expected = inCell(cell).filter(fitsShade).map((p) => p.name).sort();
    assert.deepEqual((await addRows(page)).sort(), expected, 'the plants of the cell that take shade, and only those, the tall ones included');
    await done(page);
  });
});

test('X1/X2/X7: "Show them anyway" opens Add for the blocked cell or run, every row in it', async (t) => {
  const plants = await temperate();
  await eachVariant(t, async (v) => {
    const page = await suggested(v, { light: 'Shade' });
    let btn = null;
    for (let i = 0; i < 7 && !btn; i++) {
      btn = await findAx(page, { role: 'button', name: /^Show them anyway: Emergent.* → / }, 600) ?? await findAx(page, { role: 'button', name: /^Show them anyway: Emergent/ }, 300);
      if (!btn && v.width < 640) await page.locator(aria('button', 'Later stage')).click();
    }
    assert.ok(btn, 'a blocked emergent cell');
    const cell = cellIn(btn.name);
    await page.locator(aria('button', btn.name)).click();
    assert.ok(await findAx(page, { role: 'dialog', name: /^Add to Emergent · / }), 'named "Add to Emergent · {phase}"');
    const rows = await addRows(page);
    const inCell = new Set(plants.filter((p) => p.stratum === cell.stratum && p.a <= cell.to && p.b >= cell.from).map((p) => p.name));
    assert.ok(rows.length > 0, 'the cell\'s plants are shown');
    for (const r of rows) assert.ok(inCell.has(r), `${r} grows in ${btn.name}`);
    assert.equal(rows.length, inCell.size, 'every plant of the cell, misfits included');
    // X2: each row's stage bar marks the whole run it was opened for, not only its first stage.
    const marked = await page.$$eval('.ct-add .ct-sheet-body > ul.ct-rows > li .ct-bar', (bars) => bars.map((b) => [...b.children].map((i, n) => (i.classList.contains('cur') ? n : -1)).filter((n) => n >= 0).join()));
    const run = Array.from({ length: cell.to - cell.from + 1 }, (_, k) => cell.from + k).join();
    for (const m of marked) assert.equal(m, run, `the stage bar marks ${btn.name}`);
    await done(page);
  });
});

test('X2: a job\'s "Find a …" opens Add with the plants that do that job', async (t) => {
  const plants = await temperate();
  const findLabels = Object.fromEntries(Object.entries(en).filter(([k]) => /^consortium\.job\.\w+\.find$/.test(k)).map(([k, label]) => [label, k.split('.')[2]]));
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Start empty and search')).click();
    assert.ok(await findAx(page, { role: 'dialog' }), 'the search sheet');
    await page.keyboard.press('Escape');
    await page.locator(aria('tab', 'Jobs')).click();
    const find = (await axNodes(page)).find((n) => n.role === 'button' && findLabels[n.name]);
    assert.ok(find, 'an empty consortium has a job gap with its "Find a …" button');
    const job = findLabels[find.name];
    await page.locator(aria('button', find.name)).click();
    assert.ok(await findAx(page, { role: 'dialog', name: find.name }), `Add is named "${find.name}"`);
    const expected = plants.filter((p) => p.jobs.has(job)).map((p) => p.name).sort();
    assert.ok(expected.length > 0);
    assert.deepEqual((await addRows(page)).sort(), expected, `only the plants that do "${job}"`);
    await done(page);
  });
});

test('X8: a link opened while a sheet is up closes the sheet', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    const before = await page.evaluate(() => location.hash);
    await page.locator(aria('button', 'Add plants')).click();
    assert.ok(await findAx(page, { role: 'dialog', name: 'Add plants' }));
    // Back to the address with one plant fewer: the page's own link, opened as a restore.
    await page.locator('.ct-add input[type="checkbox"]').click();
    await page.locator('.ct-add-bar .button-primary').click();
    await page.waitForFunction((b) => location.hash !== b, {}, before);
    await page.locator(aria('button', 'Add plants')).click();
    assert.ok(await findAx(page, { role: 'dialog', name: 'Add plants' }));
    await page.evaluate((f) => { history.pushState(null, '', f); window.dispatchEvent(new HashChangeEvent('hashchange')); }, before);
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5000 });
    await done(page);
  });
});

test('H16: Remove in All plants takes the plant out with a toast and Undo, which brings it back', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('tab', 'All plants')).click();
    const remove = (await axNodes(page)).find((n) => n.role === 'button' && /^Remove /.test(n.name ?? ''));
    assert.ok(remove);
    const name = remove.name.slice('Remove '.length);
    const n = (await memberIds(page)).length;
    await page.locator(aria('button', remove.name)).click();
    assert.ok(await findAx(page, { name: new RegExp(`^${esc(name)} removed`) }), 'the toast says it');
    assert.equal((await memberIds(page)).length, n - 1);
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 3000 }).catch(() => {});
    assert.notEqual((await focused(page)).tag, 'body', 'focus is not lost with the removed row');
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await findAx(page, { role: 'button', name: remove.name }), 'Undo brings it back');
    await done(page);
  });
});

// The members the share link holds (its `a` list), read from the address.
const linkOf = (page) => page.evaluate(() => location.hash);

test('X3: a list pasted on Start shows its consortium with Share, saved: a reload keeps it', async (t) => {
  const plants = await temperate();
  const names = plants.slice(0, 3).map((p) => p.name);
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(names.join('\n'));
    const add = await findAx(page, { role: 'button', name: /^Add 3 plants$/ });
    assert.ok(add, 'the three names are found');
    await page.locator(aria('button', add.name)).click();
    assert.ok(await has(page, aria('button', 'Share'), 5000), 'the consortium is shown, with Share');
    const link = await linkOf(page);
    assert.match(link, /^#v=4/, 'the address holds it');
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000), 'a reload restores it');
    assert.equal(await linkOf(page), link, 'the same consortium');
    await page.locator(aria('tab', 'All plants')).click();
    assert.equal((await memberIds(page)).length, 3, 'the three pasted plants');
    await done(page);
  });
});

// Review R4-3 changed this seam: a site answer given after Change site is the draft's, and a commit
// (a paste of a plant not in the consortium here) saves it; D1 covers the draft and Back.
test('X3: a site answer made after "Change site" is saved with the commit, and a reload keeps it', async (t) => {
  const plants = await temperate();
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    const ids = new Set(await memberIds(page));
    const other = plants.find((p) => !ids.has(p.id));
    assert.ok(other, 'a Temperate plant not in the consortium');
    await page.locator(aria('button', 'Change site')).click();
    await page.locator(aria('radio', 'Shade')).click();
    await pasteOne(page, other.name);
    const after = await savedFragment(page);
    assert.equal(param(after, 'l'), 'shade', 'the draft\'s answer is saved with the commit');
    assert.equal(await linkOf(page), after, 'and in the address');
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000), 'the consortium is restored');
    assert.equal(await linkOf(page), after, 'with the answer');
    await done(page);
  });
});

test('F1: after "Change site", choosing another climate is not saved over the consortium until the reader goes back to it', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    const before = await linkOf(page);
    await page.locator(aria('button', 'Change site')).click();
    await page.locator(aria('radio', 'Tropical')).click();
    await new Promise((r) => setTimeout(r, 400));
    assert.equal(await linkOf(page), before, 'the address keeps the Temperate consortium');
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000), 'a reload restores the consortium');
    assert.equal(await linkOf(page), before, 'with its own climate, no plant lost');
    // "Back to your consortium" after choosing another card shows it in its own climate.
    await page.locator(aria('button', 'Change site')).click();
    await page.locator(aria('radio', 'Tropical')).click();
    await page.locator(aria('button', 'Back to your consortium')).click();
    assert.ok(await has(page, aria('button', 'Share'), 4000));
    assert.equal(await linkOf(page), before, 'back in Temperate, the same consortium');
    await done(page);
  });
});

test('F2: Undo after a list pasted from "Start over" goes back to Start and keeps nothing saved', async (t) => {
  const plants = await temperate();
  const names = plants.slice(0, 3).map((p) => p.name);
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('button', 'Start over')).click();
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(names.join('\n'));
    await page.locator(aria('button', 'Add 3 plants')).click();
    assert.ok(await has(page, aria('button', 'Share'), 5000), 'the pasted consortium');
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000), 'Undo goes back to Start');
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 3000 }).catch(() => {});
    assert.notEqual((await focused(page)).tag, 'body', 'focus is not lost');
    assert.equal(await linkOf(page), '', 'no consortium in the address');
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000), 'a reload opens Start');
    assert.ok(!(await has(page, aria('button', 'Share'), 800)), 'no empty consortium saved');
    await done(page);
  });
});

// The save as this page's storage holds it.
const saved = (page) => page.evaluate(() => localStorage.getItem('canopi-consortium'));
const savedFragment = async (page) => { const raw = await saved(page); return raw ? `#${JSON.parse(raw).fragment}` : null; };
const tropicalOnly = () => fixtureDb((db) => db.prepare("SELECT p.canonical_name name FROM plants p WHERE EXISTS (SELECT 1 FROM placements x WHERE x.plant = p.plant AND x.climate_zone = 'Tropical') AND NOT EXISTS (SELECT 1 FROM placements x WHERE x.plant = p.plant AND x.climate_zone = 'Temperate')").all().map((r) => r.name));

test('R2-1: a list pasted on Start under another climate starts that climate\'s consortium; Undo brings the old one back, saved', async (t) => {
  const [inga] = await tropicalOnly();
  assert.ok(inga, 'a Tropical-only plant in the fixture');
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    const before = await linkOf(page);
    await page.locator(aria('button', 'Change site')).click();
    await page.locator(aria('radio', 'Tropical')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(inga);
    const add = await findAx(page, { role: 'button', name: /^Add 1 plant$/ });
    assert.ok(add, `${inga} is found in the Tropical list`);
    await page.locator(aria('button', add.name)).click();
    assert.ok(await has(page, aria('button', 'Share'), 5000), 'the pasted consortium is shown');
    await page.locator(aria('tab', 'All plants')).click();
    assert.equal((await memberIds(page)).length, 1, 'only the pasted plant: no Temperate member carried over');
    assert.match(await linkOf(page), /[#&]c=tropical/, 'under Tropical');
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Back to your consortium'), 4000), 'Undo goes back to Start, the old consortium kept');
    assert.equal(await page.$eval('input[name="ct-climate"]:checked', (el) => el.value), 'tropical', 'the picked card stays picked');
    assert.equal(await savedFragment(page), before, 'the old consortium is saved again');
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000), 'a reload restores it');
    assert.equal(await linkOf(page), before, 'the Temperate consortium, whole');
    await done(page);
  });
});

test('R2-2: Undo back to an empty Start leaves alone a save another tab wrote meanwhile', async (t) => {
  const names = (await temperate()).slice(0, 2).map((p) => p.name);
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('button', 'Start over')).click();
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(names.join('\n'));
    await page.locator(aria('button', 'Add 2 plants')).click();
    assert.ok(await has(page, aria('button', 'Share'), 5000));
    const other = JSON.stringify({ fragment: 'v=4&c=tropical&l=unsure&s=unsure&w=unsure&m=unsure&a=', at: '2026-11-11T00:00:00.000Z', src: null });
    await page.evaluate((x) => localStorage.setItem('canopi-consortium', x), other);
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await saved(page), other, 'the other tab\'s save is untouched');
    await done(page);
  });
});

test('R2-3: Undo of a paste on a guide link\'s Start puts back the save of an earlier visit', async (t) => {
  const names = (await temperate()).slice(0, 1).map((p) => p.name);
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    const earlier = await saved(page);
    assert.ok(earlier, 'an earlier visit saved its consortium');
    await page.goto(page.url().split('#')[0].split('?')[0] + '?climate=temperate', { waitUntil: 'domcontentloaded' });
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000), 'the guide link opens Start');
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(names.join('\n'));
    await page.locator(aria('button', 'Add 1 plant')).click();
    assert.ok(await has(page, aria('button', 'Share'), 5000));
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await saved(page), earlier, 'the earlier save is back, as it was');
    await done(page);
  });
});

test('R2-4: crops ticked under another climate card are not carried back by "Back to your consortium"', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    const before = await linkOf(page);
    await page.locator(aria('button', 'Change site')).click();
    await page.locator(aria('radio', 'Tropical')).click();
    assert.equal(await loadState(page), 'ready');
    const chip = await page.waitForSelector('.ct-chips .ct-chip[aria-pressed="false"]', { timeout: 4000 });
    await chip.click();
    await page.locator(aria('button', 'Back to your consortium')).click();
    assert.ok(await has(page, aria('button', 'Share'), 4000));
    assert.equal(await linkOf(page), before, 'the consortium as it was, no Tropical crop in it');
    assert.equal(await savedFragment(page), before, 'and saved so');
    await done(page);
  });
});

const param = (fragment, k) => (fragment ? new URLSearchParams(fragment.slice(1)).get(k) : undefined);
const changeSiteTo = async (page, card) => {
  await page.locator(aria('button', 'Change site')).click();
  await page.locator(aria('radio', card)).click();
  assert.equal(await loadState(page), 'ready');
};

test('T1 (R3-2): crops of the consortium are not the draft\'s under another card: its chips are free and Suggest saves none of them', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    for (let i = 0; i < 3; i++) await (await page.waitForSelector('.ct-chips .ct-chip[aria-pressed="false"]:not([disabled])')).click();
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(page, aria('tab', 'Layers × stages'), 8000));
    assert.ok(param(await savedFragment(page), 'n'), 'three Temperate crops saved');
    await changeSiteTo(page, 'Tropical');
    await page.waitForSelector('.ct-chips .ct-chip');
    assert.deepEqual(await page.$$eval('.ct-chips .ct-chip', (els) => els.filter((e) => e.disabled || e.getAttribute('aria-pressed') === 'true').length), 0, 'no chip pressed or "full"');
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(page, aria('tab', 'Layers × stages'), 8000));
    const f = await savedFragment(page);
    assert.equal(param(f, 'c'), 'tropical');
    assert.deepEqual({ crops: param(f, 'n'), keptOnly: param(f, 'p') }, { crops: null, keptOnly: null }, 'no Temperate crop or pin in the Tropical save');
    await done(page);
  });
});

test('T2 (R3-3): Undo of a paste under another card, then Back, leaves the consortium and its save exactly as before', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    const before = await linkOf(page);
    await changeSiteTo(page, 'Tropical');
    const chip = await page.waitForSelector('.ct-chips .ct-chip[aria-pressed="false"]');
    await chip.click();
    const name = await page.$eval('.ct-chips .ct-chip:last-of-type .ct-sci', (el) => el.textContent.trim());
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(name);
    await page.locator(aria('button', 'Add 1 plant')).click();
    assert.ok(await has(page, aria('button', 'Share'), 5000));
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Back to your consortium'), 4000));
    assert.equal(await savedFragment(page), before, 'Undo: the save is the consortium as before');
    await page.locator(aria('button', 'Back to your consortium')).click();
    assert.ok(await has(page, aria('button', 'Share'), 4000));
    assert.equal(await linkOf(page), before, 'Back: the consortium as before, no Tropical crop');
    assert.equal(await savedFragment(page), before);
    await done(page);
  });
});

test('T3 (R3-1): a consortium the reader emptied stays empty, saved, through Change site', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await hookedPage(v);
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(page, aria('tab', 'Layers × stages'), 8000));
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000), 'the save reopens');
    await page.waitForFunction(() => typeof window.__ctTest === 'object');
    await page.evaluate(() => { const s = window.__ctTest.store; for (const id of s.members.peek()) s.removeMember(id); });
    const emptied = await savedFragment(page);
    assert.equal(param(emptied, 'a'), '', 'every member removed, saved so');
    await page.locator(aria('button', 'Change site')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await savedFragment(page), emptied, 'Change site does not bring the members back');
    await done(page);
  });
});

test('T4 (R3-1): Start empty under another card is the consortium: Change site keeps it saved', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await changeSiteTo(page, 'Tropical');
    await page.locator(aria('button', 'Start empty and search')).click();
    await page.waitForSelector('dialog[open]', { timeout: 8000 });
    await page.keyboard.press('Escape');
    await page.waitForSelector('dialog[open]', { hidden: true, timeout: 4000 });
    const empty = await savedFragment(page);
    assert.deepEqual({ c: param(empty, 'c'), a: param(empty, 'a') }, { c: 'tropical', a: '' });
    await page.locator(aria('button', 'Change site')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await savedFragment(page), empty, 'not the Temperate consortium back');
    await done(page);
  });
});

// Another tab's save, written while this page is open.
const OTHER_TAB = JSON.stringify({ fragment: 'v=4&c=tropical&l=unsure&s=unsure&w=unsure&m=unsure&a=&e=1', at: '2026-11-11T00:00:00.000Z', src: null });
const otherTabSaves = (page) => page.evaluate((x) => localStorage.setItem('canopi-consortium', x), OTHER_TAB);
const pasteOne = async (page, name) => {
  await page.locator(aria('button', 'Paste a list')).click();
  await page.locator('#ct-paste-text').fill(name);
  await page.locator(aria('button', 'Add 1 plant')).click();
  assert.ok(await has(page, aria('button', 'Share'), 5000));
};

test('M1 (R4-1): Undo of a paste on a fresh Start puts back the save another tab wrote before the paste', async (t) => {
  const [first] = await temperate();
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await otherTabSaves(page);
    await pasteOne(page, first.name);
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await saved(page), OTHER_TAB, 'the other tab\'s save is back');
    await done(page);
  });
});

test('M2 (R4-1): on a guide link\'s Start, Undo of a paste puts back the newer save another tab wrote, not the one read at open', async (t) => {
  const [first] = await temperate();
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await page.goto(page.url().split('#')[0].split('?')[0] + '?climate=temperate', { waitUntil: 'domcontentloaded' });
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    await otherTabSaves(page);
    await pasteOne(page, first.name);
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await saved(page), OTHER_TAB);
    await done(page);
  });
});

test('M3 (R4-2): Start over leaves alone a save another tab wrote since', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await otherTabSaves(page);
    await page.locator(aria('button', 'Start over')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await saved(page), OTHER_TAB);
    await done(page);
  });
});

test('D1 (R4-3): site answers changed in the draft are not saved until a commit; Back keeps the old ones, Suggest takes the new', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    const before = await linkOf(page);
    await changeSiteTo(page, 'Tropical');
    await page.locator('input[name="ct-site-water"]:not(:checked)').click();
    assert.equal(await savedFragment(page), before, 'the draft\'s answer is not saved');
    await page.locator(aria('button', 'Back to your consortium')).click();
    assert.ok(await has(page, aria('button', 'Share'), 4000));
    assert.equal(await linkOf(page), before, 'Back: the consortium with its own answers');
    await changeSiteTo(page, 'Temperate');
    await page.locator('input[name="ct-site-water"]:not(:checked)').click();
    const water = await page.$eval('input[name="ct-site-water"]:checked', (el) => el.value);
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(page, aria('tab', 'Layers × stages'), 8000));
    assert.equal(param(await savedFragment(page), 'w'), water, 'Suggest commits the draft\'s answer');
    await done(page);
  });
});

test('pre-push 1: a guest removed from the consortium gives no "no longer in the list" notice after a reload', async (t) => {
  const [guest] = await tropicalOnly();
  await eachVariant(t, async (v) => {
    const page = await hookedPage(v);
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(page, aria('tab', 'Layers × stages'), 8000));
    await page.evaluate(async (name) => {
      const s = window.__ctTest.store;
      const id = (await s.loadPool('Tropical')).find((x) => x.canonical_name === name).id;
      s.addMembers([id], { [id]: 'Tropical' });
      s.removeMember(id);
    }, guest);
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000));
    const notes = await page.$$eval('#ct-root .ct-notice', (els) => els.map((e) => e.textContent));
    assert.ok(!notes.some((x) => /no longer in the list/.test(x)), `no false notice (${notes.join(' | ')})`);
    await done(page);
  });
});

test('F3: Undo of a plant added in the Paste sheet keeps the focus in the sheet', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill('Inga edulis');
    await page.locator(aria('button', 'Add anyway')).click();
    await page.locator('dialog[open] .ct-toast-undo').click();
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 3000 }).catch(() => {});
    const inSheet = await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'));
    assert.ok(inSheet, `focus stays in the open sheet (${JSON.stringify(await focused(page))})`);
    await done(page);
  });
});

// Every visible control in #ct-root (outside an open sheet unless inSheet) with its box.
const controls = (page, inSheet = false) => page.$$eval(inSheet ? 'dialog[open] button, dialog[open] a[href], dialog[open] [role="tab"]' : '#ct-root button, #ct-root a[href], #ct-root [role="tab"]', (els, sheet) => els
  .filter((el) => sheet || !el.closest('dialog'))
  .map((el) => { const r = el.getBoundingClientRect(); return { name: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50), h: Math.round(r.height), w: Math.round(r.width), cls: el.className, inline: el.matches('.ct-explain-btn, a.text-link') } ; })
  .filter((c) => c.h > 0 && c.w > 0), inSheet);
const small = (list) => list.filter((c) => c.h < (c.inline ? 36 : 40)).map((c) => `${c.name} ${c.w}×${c.h} (${c.cls})`);
// "What is a layer?", "Show them anyway" and "+ Add" are primary controls of the matrix: 40 px (W6).
const MATRIX_40 = /^(What is a |Show them anyway|Add a plant: )/;

test('W6: on a phone, primary controls are at least 40 px tall, inline secondary ones at least 36', async (t) => {
  const page = await suggested({ width: 390, theme: 'light' });
  const bad = [];
  const seen = new Set();
  for (let i = 0; i < 7; i++) {
    const list = await controls(page);
    for (const c of list) if (MATRIX_40.test(c.name)) { seen.add(c.name.replace(/:.*/, '')); if (c.h < 40) bad.push(`matrix stage ${i + 1}: ${c.name} ${c.w}×${c.h} (${c.cls})`); }
    bad.push(...small(list).map((s) => `matrix stage ${i + 1}: ${s}`));
    if (await has(page, aria('button', 'Later stage'), 300)) await page.locator(aria('button', 'Later stage')).click().catch(() => {});
  }
  assert.ok([...seen].some((n) => n.startsWith('What is a')) && seen.has('Add a plant'), `the matrix controls were measured (${[...seen]})`);
  await page.locator(aria('tab', 'All plants')).click();
  bad.push(...small(await controls(page)).map((s) => `All plants: ${s}`));
  await page.locator(aria('tab', 'Jobs')).click();
  bad.push(...small(await controls(page)).map((s) => `Jobs: ${s}`));
  await page.locator(aria('tab', 'All plants')).click();
  await page.locator('#ct-root [data-plant-id] button, #ct-root button[data-plant-id]').click();
  assert.ok(await findAx(page, { role: 'dialog' }), 'a plant\'s dialog');
  bad.push(...small(await controls(page, true)).map((s) => `details: ${s}`));
  assert.deepEqual(bad, []);
  await done(page);
});

test('W7: the toast never covers a control', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('tab', 'All plants')).click();
    const remove = (await axNodes(page)).find((n) => n.role === 'button' && /^Remove /.test(n.name ?? ''));
    await page.locator(aria('button', remove.name)).click();
    assert.ok(await has(page, '.ct-toast'), 'the toast');
    // Every control of the page: at the page's end none sits under the toast, and one under it
    // mid-page comes out from under it when it takes focus (Tab).
    const covered = await page.evaluate(() => {
      const box = () => document.querySelector('.ct-toast')?.getBoundingClientRect();
      const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const all = [...document.querySelectorAll('#ct-root button, #ct-root input, #ct-root select, #ct-root a[href], #ct-root [role="tab"]')]
        .filter((el) => !el.closest('.ct-toast') && el.getClientRects().length);
      const name = (el) => (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 40);
      const out = [];
      if (!box()?.height) return ['no toast box'];
      // Measured where a scroll ends (the site scrolls smoothly).
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, document.documentElement.scrollHeight);
      for (const el of all) if (hit(el.getBoundingClientRect(), box())) out.push(`at the end: ${name(el)}`);
      window.scrollTo(0, 0);
      for (const el of all) {
        if (!hit(el.getBoundingClientRect(), box())) continue;
        el.focus();
        if (hit(el.getBoundingClientRect(), box())) out.push(`focused: ${name(el)}`);
        window.scrollTo(0, 0);
      }
      return out;
    });
    assert.deepEqual(covered, [], 'nothing under the toast');
    await done(page);
  });
});

test('W8, W9, X4, X5: bold is 600, CJK headings keep words whole, sheet and page classes do not leak', async (t) => {
  const page = await h.open('/consortium/', { width: 1280, theme: 'light', data: 'fixture' });
  const weights = await page.$$eval('#ct-root strong, #ct-root b', (els) => [...new Set(els.map((e) => getComputedStyle(e).fontWeight))]);
  assert.ok(weights.length > 0, 'the page has bold words');
  assert.deepEqual(weights, ['600'], '<strong> and <b> at 600');
  await page.locator(aria('radio', 'Temperate')).click();
  // Start's crop search is not the Add sheet's search box (X5): no box drawn around it. It draws once
  // the card's list is read, so wait for it.
  const crop = await page.locator('#ct-root input[type="search"]').map((el) => getComputedStyle(el.parentElement).borderTopWidth).wait();
  assert.equal(crop, '0px', 'Start\'s crop search has no sheet search frame');
  await page.locator(aria('button', 'Suggest plants')).click();
  await page.locator(aria('tab', 'All plants')).click();
  await page.locator('#ct-root [data-plant-id] button, #ct-root button[data-plant-id]').click();
  assert.ok(await findAx(page, { role: 'dialog' }));
  // The plant dialog's action row is the sheet's (X4): flex, not the page's actions grid.
  const row = await page.$eval('dialog[open] .ct-actions', (el) => ({ d: getComputedStyle(el).display, m: getComputedStyle(el).marginTop }));
  assert.deepEqual(row, { d: 'flex', m: '0px' }, 'the sheet\'s action row');
  await done(page);
  for (const lang of ['ja', 'zh', 'ko']) {
    const p = await h.open(`/${lang}/consortium/`, { width: 390, theme: 'light', data: 'fixture' });
    const heads = await p.$$eval('h1, #ct-root h2', (els) => els.map((e) => { const s = getComputedStyle(e); return `${s.wordBreak}/${s.lineBreak}`; }));
    assert.ok(heads.length > 0);
    for (const s of heads) assert.match(s, /^keep-all\/|\/strict$/, `${lang}: headings keep words whole (${s})`);
    await done(p);
  }
});

// What has focus: its tag, its name and the plant it is for.
const focused = (page) => page.evaluate(() => {
  const el = document.activeElement;
  return { tag: el?.tagName.toLowerCase(), name: (el?.getAttribute('aria-label') || el?.textContent || '').trim().slice(0, 80), plant: el?.closest('[data-plant-id]')?.dataset.plantId ?? el?.dataset?.plantId ?? null };
});

test('W4: after Suggest plants, focus is on the matrix heading or caption, never on <body>', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(page, aria('tab', 'Layers × stages'), 8000));
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 3000 }).catch(() => {});
    const f = await focused(page);
    assert.notEqual(f.tag, 'body', 'focus is not lost');
    assert.ok(['h2', 'caption', 'table'].includes(f.tag), `on the matrix heading or caption (${JSON.stringify(f)})`);
    await done(page);
  });
});

test('W4: after Undo, focus is on the restored plant', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('tab', 'All plants')).click();
    const remove = (await axNodes(page)).find((n) => n.role === 'button' && /^Remove /.test(n.name ?? ''));
    const id = await page.$eval(`#ct-root button[aria-label="${remove.name}"]`, (el) => el.closest('[data-plant-id]')?.dataset.plantId);
    assert.ok(id, 'the row names its plant');
    await page.locator(aria('button', remove.name)).click();
    await page.locator(aria('button', 'Undo')).click();
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 3000 }).catch(() => {});
    const f = await focused(page);
    assert.notEqual(f.tag, 'body', 'focus is not lost');
    assert.equal(f.plant, id, `on the restored plant (${JSON.stringify(f)})`);
    await done(page);
  });
});

test('W4: the empty matrix\'s "Suggest a start" and Start\'s "Back to your consortium" move focus to the view', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Start empty and search')).click();
    assert.ok(await findAx(page, { role: 'dialog' }));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    await page.locator(aria('button', 'Suggest a start')).click();
    await page.waitForFunction(() => document.querySelector('#ct-root [data-plant-id]'), { timeout: 5000 });
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 3000 }).catch(() => {});
    let f = await focused(page);
    assert.ok(['h2', 'caption', 'table'].includes(f.tag), `after "Suggest a start": the view's heading (${JSON.stringify(f)})`);
    await page.locator(aria('button', 'Change site')).click();
    await page.locator(aria('button', 'Back to your consortium')).click();
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 3000 }).catch(() => {});
    f = await focused(page);
    assert.ok(['h2', 'caption', 'table'].includes(f.tag), `after "Back to your consortium": the view's heading (${JSON.stringify(f)})`);
    await done(page);
  });
});

// The test hook, on a page opened before the island loads (F4, F5).
async function hookedPage(v) {
  const page = await h.open('/consortium/', { ...v, data: 'fixture' });
  await page.evaluateOnNewDocument(() => { window.__ctTest = true; });
  await page.reload();
  assert.ok(await page.waitForFunction(() => typeof window.__ctTest === 'object', { timeout: 20_000 }).then(() => true, () => false), 'a build:browser-test build');
  return page;
}

test('F4: when the after-the-matrix chunk fails, the views, Print and Download say so with Reload, and printing keeps the matrix', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await hookedPage(v);
    const rejections = [];
    page.on('pageerror', (e) => rejections.push(e.message));
    await page.evaluate(() => window.__ctTest.failLater());
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(page, aria('tab', 'Layers × stages'), 8000));
    // Ctrl+P before the print sheet is there: the matrix is printed rather than an empty page.
    await page.emulateMediaType('print');
    const shown = await page.$eval('#ct-root', (el) => el.getBoundingClientRect().height > 100 && getComputedStyle(el).display !== 'none');
    assert.ok(shown, 'printing without the print sheet keeps the tool');
    await page.emulateMediaType('screen');
    for (const label of ['Print', 'Download for Canopi']) {
      await page.locator(aria('button', label)).click();
      assert.ok(await has(page, '.ct-page-actions [role="alert"]', 3000), `${label}: an alert`);
      const text = await page.$eval('.ct-page-actions [role="alert"]', (el) => el.textContent);
      assert.match(text, new RegExp(esc(en['consortium.details.loadFailed'])), `${label}: says the part did not open`);
      assert.ok(await has(page, '.ct-page-actions [role="alert"] button'), `${label}: with Reload`);
    }
    await page.locator(aria('tab', 'All plants')).click();
    assert.ok(await has(page, '.ct-views [role="alert"] button', 3000), 'a view says so with Reload');
    assert.deepEqual(rejections, [], 'no unhandled rejection');
    await done(page);
  });
});

test('F5: a view still loading shows the loading line', async () => {
  const page = await hookedPage({ width: 1280, theme: 'light' });
  await page.evaluate(() => window.__ctTest.holdLater());
  await page.locator(aria('radio', 'Temperate')).click();
  assert.equal(await loadState(page), 'ready');
  await page.locator(aria('button', 'Suggest plants')).click();
  assert.ok(await has(page, aria('tab', 'Layers × stages'), 8000));
  await page.locator(aria('tab', 'All plants')).click();
  const line = await page.$eval('.ct-views .status-line', (el) => el.textContent).catch(() => null);
  assert.equal(line, en['consortium.load.plants'], 'the loading line while the view loads');
  await page.evaluate(() => window.__ctTest.releaseLater());
  assert.ok(await has(page, '.ct-views [data-plant-id]', 5000), 'then the view');
  await done(page);
});

// UX audit fix 3 (decision row "P5 fixes from the UX audit"): the desktop table needs 960 px; below
// it the phone grid and stage stepper show (at 700 px the table cut 38 plant names).
test('UX3: below 960 px the matrix is the phone grid, from 960 px the desktop table; neither overflows or cuts a name', async () => {
  for (const [width, small] of [[700, true], [959, true], [960, false], [1000, false]]) {
    const page = await suggested({ width, theme: 'light' });
    assert.equal(!!(await page.$('.ct-phone #ct-stepper')), small, `${width} px: the phone grid and stepper ${small ? '' : 'not '}shown`);
    assert.equal(!!(await page.$('table.ct-mx')), !small, `${width} px: the desktop table ${small ? 'not ' : ''}shown`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `${width} px: no sideways scroll`);
    if (small) {
      const cut = await page.$$eval('#ct-root .ct-phone .ct-nm', (els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
      assert.deepEqual(cut, [], `${width} px: no plant name cut`);
      const empty = await page.$$eval('.ct-phone .ct-stepper, .ct-phone .ct-pstratum', (els) => els.filter((e) => e.getBoundingClientRect().width < 200).length);
      assert.equal(empty, 0, `${width} px: the stepper and stage rows are laid out full width`);
    }
    await done(page);
  }
});

// Walk-through F2 (P5 seam review): at 960 px the desktop table cut real common names to a few letters
// ("Europea…"). Each start chip's name may wrap to two lines; its 10th character (or its last, if
// shorter) must be drawn inside the name's box, before any ellipsis, on the real Temperate list.
test('UX5 (walk-through F2): at 960 and 1024 px the desktop matrix shows at least the first 10 characters of every plant name', async () => {
  for (const width of [960, 1024]) {
    const page = await h.open('/consortium/', { width, theme: 'light' });
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(page, 'table.ct-mx button.ct-pchip', 10_000), `${width} px: the desktop table`);
    const cut = await page.$$eval('table.ct-mx button.ct-pchip .ct-nm > span', (els) => els.flatMap((e) => {
      const node = e.firstChild, text = e.textContent;
      if (!node || node.nodeType !== 3) return [];
      if (e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1) return []; // drawn whole
      const r = document.createRange();
      const i = Math.min(10, text.length) - 1;
      r.setStart(node, i); r.setEnd(node, i + 1);
      const c = r.getBoundingClientRect(), box = e.getBoundingClientRect();
      // A range gives where a character is laid out, even under the ellipsis: a cut name leaves the
      // ellipsis' width at its end ("Europea…" counts 7). Its glyph box is taller than the line
      // (line-height 1.2), so the line counts by its middle.
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = getComputedStyle(e).font;
      const edge = box.right - ctx.measureText('…').width;
      return c.right <= edge + 0.5 && c.top + c.height / 2 <= box.bottom && c.width > 0 ? [] : [`${text} (${Math.round(box.width)}×${Math.round(box.height)} px)`];
    }));
    assert.deepEqual(cut, [], `${width} px: names cut before their 10th character`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `${width} px: no sideways scroll`);
    await done(page);
  }
});

// UX audit fix 4: the headline counts the jobs done at every stage (it said "6 of 6 jobs are done"
// above a job missing from three stages), and each run of stages where a job is missing gets its own
// "Find…", which opens Add for that job and those stages. The suggestion is unchanged.
test('UX4: Jobs counts the jobs that cover every stage; each stage gap has a "Find…" that opens Add for that job and those stages', async (t) => {
  const plants = await temperate();
  const plain = (i) => en[`consortium.phase.${PHASES[i]}.plain`];
  const jobs = ['feeds_you', 'feeds_soil', 'mulch', 'ground', 'helpers', 'shelter'];
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('tab', 'Jobs')).click();
    await page.waitForSelector('.ct-jobs-note', { timeout: 5000 });
    // Jobs lists every member that does a job (the phone matrix shows one stage at a time); a member
    // doing none changes no count and is in no job's Add.
    const members = new Set(await memberIds(page));
    const doers = (job) => plants.filter((p) => members.has(p.id) && p.jobs.has(job));
    // The stages each job is done in, from the data (each member covers its span).
    const runs = Object.fromEntries(jobs.map((job) => {
      const on = PHASES.map((_, i) => doers(job).some((p) => p.a <= i && i <= p.b));
      const out = [];
      for (let i = 0; i < 7; i++) if (!on[i]) { if (out.length && out.at(-1).to === i - 1) out.at(-1).to = i; else out.push({ from: i, to: i }); }
      return [job, out];
    }));
    const covered = jobs.filter((job) => runs[job].length === 0).length;
    const note = await page.$eval('.ct-jobs-note', (x) => x.textContent.trim());
    assert.match(note, new RegExp(`^${covered} of 6 jobs covers? every stage\\.$`), 'the headline counts the jobs at every stage');
    const gapped = jobs.filter((job) => doers(job).length && runs[job].length);
    assert.ok(gapped.length > 0, 'the suggestion leaves a job missing from some stages');
    const names = (await axNodes(page)).filter((n) => n.role === 'button').map((n) => n.name);
    const label = (job, r) => en['consortium.job.findFor'].replace('{find}', en[`consortium.job.${job}.find`]).replace('{stages}', r.from === r.to ? plain(r.from) : `${plain(r.from)} → ${plain(r.to)}`);
    for (const job of gapped) for (const r of runs[job]) assert.ok(names.includes(label(job, r)), `"${label(job, r)}"`);
    // The longest gap's "Find…": Add named for it, with the plants that do the job in one of those stages.
    const [job, r] = gapped.flatMap((j) => runs[j].map((x) => [j, x])).sort((a, b) => (b[1].to - b[1].from) - (a[1].to - a[1].from))[0];
    await page.locator(aria('button', label(job, r))).click();
    assert.ok(await findAx(page, { role: 'dialog', name: label(job, r) }), `Add is named "${label(job, r)}"`);
    const expected = plants.filter((p) => p.jobs.has(job) && p.a <= r.to && p.b >= r.from && !members.has(p.id)).map((p) => p.name).sort();
    assert.deepEqual((await addRows(page)).sort(), expected, `the plants that do "${job}" in ${label(job, r)}`);
    await done(page);
  });
});

// Owner request (coordinator, item 7): adding a plant to a cell that already has plants is one click.
// Every filled cell (desktop table; each filled layer of the phone stage view) has its own "+" named
// "Add a plant: {cell}", after the cell's plants in the keyboard order, opening Add for that cell as a
// free cell's "+ Add" does; it never cuts a plant name.
test('Item 7: a filled cell has its own "+", which opens Add for that cell, and the plant added lands there; no name is cut by it at 960 or 1280 px', async (t) => {
  const plants = await temperate();
  const byName = new Map(plants.map((p) => [p.name, p]));
  for (const width of [1280, 960]) {
    const page = await suggested({ width, theme: 'light' });
    const filled = await page.$$eval('table.ct-mx td', (tds) => tds.filter((td) => td.querySelector('.ct-pchip')).map((td) => {
      const plus = td.querySelector('[data-add-filled]');
      const chips = [...td.querySelectorAll('button')];
      return { plus: plus?.getAttribute('aria-label') ?? null, last: chips.at(-1) === plus, h: plus ? plus.getBoundingClientRect().height : 0, shown: plus ? getComputedStyle(plus).visibility === 'visible' && Number(getComputedStyle(plus).opacity) > 0.3 : false };
    }));
    assert.ok(filled.length > 0, `${width} px: filled cells`);
    for (const c of filled) {
      assert.match(c.plus ?? '', /^Add a plant: /, `${width} px: every filled cell has its "+"`);
      assert.ok(c.last, `${width} px: "+" after the cell's plants in the keyboard order`);
      assert.ok(c.h >= 24, `${width} px: a target of 24 px at least (${c.h})`);
      assert.ok(c.shown, `${width} px: shown without hover`);
    }
    const cut = () => page.$$eval('.ct-mx .ct-pchip .ct-nm > span:first-child', (els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
    const withPlus = await cut();
    await page.addStyleTag({ content: '[data-add-filled] { display: none !important; }' });
    assert.equal(withPlus, await cut(), `${width} px: the "+" cuts no name`);
    await done(page);
  }
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('tab', 'All plants')).click();
    assert.ok(await has(page, '.ct-views [data-plant-id]', 5000));
    const members = new Set(await memberIds(page));
    await page.locator(aria('tab', 'Layers × stages')).click();
    // A filled cell with a plant still to add (the fixture's site is "not sure": every plant fits).
    const addable = (cell) => plants.filter((p) => p.stratum === cell.stratum && p.a <= cell.to && p.b >= cell.from && !members.has(p.id)).map((p) => p.name).sort();
    let label = null;
    for (let i = 0; i < 7 && !label; i++) {
      const labels = await page.$$eval('[data-add-filled]', (bs) => bs.map((b) => b.getAttribute('aria-label')));
      label = labels.find((l) => addable(cellIn(l)).length > 0) ?? null;
      if (!label && v.width < 960) await page.locator(aria('button', 'Later stage')).click();
      else if (!label) break;
    }
    assert.ok(label, 'a filled cell with its "+" and a plant still to add');
    const cell = cellIn(label);
    await page.click(`[data-add-filled][aria-label="${label}"]`);
    assert.ok(await findAx(page, { role: 'dialog', name: new RegExp(`^Add to ${esc(en[`consortium.stratum.${cell.stratum}`])} · `) }), `"+" opens Add for ${label}`);
    const expected = addable(cell);
    assert.deepEqual((await addRows(page)).sort(), expected, `the plants of ${label}`);
    const name = await page.$eval('.ct-add .ct-sheet-body > ul.ct-rows > li:has(input[type="checkbox"]) .ct-sci', (e) => e.textContent.trim());
    await page.click('.ct-add .ct-sheet-body > ul.ct-rows > li:has(input[type="checkbox"]) input[type="checkbox"]');
    await page.locator(aria('button', 'Add 1 plant')).click();
    const id = byName.get(name).id;
    const where = v.width < 960 ? `.ct-pstratum[aria-label="${en[`consortium.stratum.${cell.stratum}`]}"] [data-plant-id="${id}"]` : `tr[data-stratum-row="${cell.stratum}"] [data-plant-id="${id}"]`;
    assert.ok(await has(page, where, 5000), `${name} lands in ${label}`);
    await done(page);
  });
});

// Item 8 (ho-misc's flake trace): Escape closes a sheet's <dialog> at once and fires its close event a
// task later; a sheet opened in between (another plant, "+") must survive that late event.
test('Item 8: a sheet\'s late close event never closes the next sheet, opened in the same task', async (t) => {
  // The open dialog's name, once the page has had a few tasks to deliver the close event.
  const openName = (page) => page.evaluate(async () => {
    for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 50));
    const d = document.querySelector('dialog.ct-sheet[open]');
    return d ? document.getElementById(d.getAttribute('aria-labelledby'))?.textContent.trim() ?? '' : null;
  });
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('tab', 'All plants')).click();
    const ids = await memberIds(page);
    assert.ok(ids.length >= 2, 'two plants to open');
    await page.locator(`#ct-root [data-plant-id="${ids[0]}"] button, #ct-root button[data-plant-id="${ids[0]}"]`).click();
    await page.waitForSelector('dialog.ct-sheet[open]', { timeout: 8000 });
    const second = await page.evaluate((id) => {
      const b = document.querySelector(`#ct-root [data-plant-id="${CSS.escape(id)}"] button, #ct-root button[data-plant-id="${CSS.escape(id)}"]`);
      document.querySelector('dialog.ct-sheet[open]').close(); // what Escape does
      b.click();
      return b.closest('[data-plant-id]').querySelector('.ct-sci')?.textContent.trim() ?? b.textContent.trim();
    }, ids[1]);
    const name = await openName(page);
    assert.ok(name !== null, 'Details → another plant: the second plant\'s sheet stays open');
    assert.ok(name.includes(second) || second.includes(name), `the second plant's sheet ("${name}", "${second}")`);
    assert.equal(await page.evaluate(() => document.querySelectorAll('dialog.ct-sheet[open]').length), 1);

    // Details → Add: a filled cell's "+" opened as the plant's sheet closes.
    await page.locator('dialog.ct-sheet[open] .ct-sheet-head .ct-icon-button').click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5000 });
    await page.locator(aria('tab', 'Layers × stages')).click();
    await page.click('#ct-root [data-plant-id] button, #ct-root button[data-plant-id]');
    await page.waitForSelector('dialog.ct-sheet[open]', { timeout: 8000 });
    await page.evaluate(() => {
      const plus = document.querySelector('#ct-root [data-add-filled]');
      document.querySelector('dialog.ct-sheet[open]').close();
      plus.click();
    });
    assert.match((await openName(page)) ?? '(none)', /^Add to /, 'Details → "+": Add stays open');
    await done(page);
  });
});

// P5 walk-through 2, N1 (data loss since P2): the Undo toast sat over the Add sheet's "Add N plants"
// when a search left few rows, so the click undid the last add and added nothing. A toast never
// covers a control: in a sheet it sits in the sheet's foot above the action bar, never over it.
test('Walk-through 2 N1: in the Add sheet the Undo toast never covers "Add N plants" nor any other control (320, 390, 700, 960, 1280 px)', async () => {
  const plants = await temperate();
  for (const width of [320, 390, 700, 960, 1280]) {
    const page = await suggested({ width, theme: 'light' });
    const members = new Set(await memberIds(page));
    const candidates = plants.filter((p) => !members.has(p.id) && !plants.some((q) => q !== p && q.name.includes(p.name)));
    const rows = 'dialog.ct-add[open] .ct-sheet-body > ul.ct-rows > li';
    // Opens Add, searches the next candidate listed with a tick (few rows), and ticks it.
    const addOne = async () => {
      await page.click('.ct-viewbar button');
      await page.waitForSelector('dialog.ct-add[open] .ct-search input');
      while (candidates.length) {
        const p = candidates.shift();
        await page.$eval('dialog.ct-add[open] .ct-search input', (i) => { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
        await page.type('dialog.ct-add[open] .ct-search input', p.name);
        const ok = await page.waitForFunction((sel, n) => { const r = [...document.querySelectorAll(sel)]; return r.length <= 3 && r.some((li) => li.querySelector('.ct-sci')?.textContent.trim() === n && li.querySelector('input[type="checkbox"]')); }, { timeout: 1500 }, rows, p.name).then(() => true, () => false);
        if (!ok) continue;
        await page.evaluate((sel, n) => [...document.querySelectorAll(sel)].find((li) => li.querySelector('.ct-sci')?.textContent.trim() === n).querySelector('input[type="checkbox"]').click(), rows, p.name);
        return p;
      }
      assert.fail(`${width} px: no plant to add`);
    };
    const a = await addOne();
    await page.click('dialog.ct-add[open] .ct-add-bar .button-primary');
    assert.ok(await has(page, '.ct-toast-page .ct-toast'), `${width} px: the first add's toast with Undo`);
    const b = await addOne();
    assert.ok(await has(page, 'dialog[open] .ct-toast .ct-toast-undo'), `${width} px: the toast moved into the sheet`);
    // Where the bar lands depends on the rows above it and the window: every window height from 480 to
    // 900 px, so the bar passes through the toast's band (Delhi at 1280 × 800 had it there).
    const covered = [];
    for (let height = 480; height <= 900; height += 20) {
      await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 640, hasTouch: width < 640 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const seen = await page.evaluate(() => {
        const d = document.querySelector('dialog.ct-add[open]');
        const toast = d.querySelector('.ct-toast').getBoundingClientRect();
        const btn = d.querySelector('.ct-add-bar .button-primary');
        const r = btn.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const meets = (x, y) => x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom;
        const under = [...d.querySelectorAll('button, input, a[href], select, textarea')]
          .filter((el) => !el.closest('.ct-toast') && el.getClientRects().length && meets(el.getBoundingClientRect(), toast))
          .map((el) => (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 40));
        return { onButton: btn.contains(hit), hit: hit?.className ?? null, under };
      });
      if (!seen.onButton) covered.push(`${height}: the Add button's centre is ${seen.hit}`);
      for (const u of seen.under) covered.push(`${height}: ${u}`);
    }
    assert.deepEqual(covered, [], `${width} px: no control of the sheet under the toast, at any window height`);
    await page.setViewport({ width, height: width < 640 ? 844 : 900, deviceScaleFactor: 1, isMobile: width < 640, hasTouch: width < 640 });
    await page.locator('dialog.ct-add[open] .ct-add-bar .button-primary').click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5000 });
    await page.click('#ct-tab-list'); // every member (a phone stage shows only its own)
    const now = new Set(await memberIds(page));
    assert.ok(now.has(a.id) && now.has(b.id), `${width} px: both plants are in the consortium (${a.name}: ${now.has(a.id)}, ${b.name}: ${now.has(b.id)})`);
    await done(page);
  }
});

// P5 walk-through 2, N2: "What are these stages?" ran off phones (466 px wide at 390 en). Every pop-up
// of the tool stays inside the viewport with the 16 px gutter: the layer and stage explanations (phone
// matrix and side view), "Add it anyway?" and the map dialog, at 320 and 390 px in en, fr and ja.
const STRINGS = Object.fromEntries(['en', 'fr', 'ja'].map((l) => [l, JSON.parse(readFileSync(new URL(`../../src/i18n/translations/${l}.json`, import.meta.url), 'utf8'))]));
test('Walk-through 2 N2: every pop-up stays within the viewport with a 16 px gutter at 320 and 390 px in en, fr and ja', async () => {
  const GUTTER = 16;
  const within = (page, sel) => page.evaluate((s, g) => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    for (const el of document.querySelectorAll(s)) {
      if (!el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      if (r.left < g - 0.5 || r.right > vw - g + 0.5) out.push(`${s}: ${Math.round(r.left)}–${Math.round(r.right)} of ${vw}`);
    }
    if (document.documentElement.scrollWidth > vw) out.push(`page ${document.documentElement.scrollWidth} px wide`);
    return out;
  }, sel, GUTTER);
  for (const lang of ['en', 'fr', 'ja']) {
    const S = (k) => STRINGS[lang][`consortium.${k}`];
    for (const width of [320, 390]) {
      const at = `${lang} ${width} px`;
      const page = await h.open(`${lang === 'en' ? '' : `/${lang}`}/consortium/`, { width, data: 'fixture', mapTiles: 'stub' });
      const bad = [];
      // The climate first, and the site questions awaited: they show once the database is open and
      // the list read. Until then Start moves: the open database refines the guessed country from the
      // time zone ("Use United States" becomes "Use France" here), and the line's new height shifts
      // every control below it (46 px at en 320 and ja 390), so a click aimed before the shift misses
      // the map button. The radio is clicked in the page, which no shift can miss.
      await page.$eval('input[name="ct-climate"][value="temperate"]', (el) => el.click());
      assert.ok(await has(page, 'input[name="ct-site-light"][value="shade"]', 20_000), `${at}: the site questions (the list is read)`);
      assert.equal(await loadState(page), 'ready');
      // The map dialog (start step).
      if (await has(page, '[data-location-action="map"]', 4000)) {
        await settled(page, '[data-location-action="map"]');
        await page.click('[data-location-action="map"]');
        assert.ok(await has(page, 'dialog[data-location-map][open]', 8000), `${at}: the map dialog`);
        bad.push(...await within(page, 'dialog[data-location-map][open]'));
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5000 });
      } else bad.push('no map button');
      await settled(page, 'input[name="ct-site-light"][value="shade"]');
      await page.click('input[name="ct-site-light"][value="shade"]');
      await page.locator(aria('button', S('start.suggest'))).click();
      assert.ok(await has(page, '#ct-tab-matrix', 8000), `${at}: the matrix`);
      // Each explanation, opened alone (phone matrix, then side view). Suggest moves the focus to the
      // matrix, and the page scrolls there smoothly: each tab is pressed once the page stands still.
      for (const tab of ['matrix', 'side']) {
        await settled(page, `#ct-tab-${tab}`);
        await page.click(`#ct-tab-${tab}`);
        assert.ok(await page.waitForFunction((t) => document.getElementById(`ct-tab-${t}`)?.getAttribute('aria-selected') === 'true', {}, tab).then(() => true, () => false), `${at}: the ${tab} tab is selected`);
        // The side view is in the chunk loaded after the matrix (views/lazy.tsx, later.ts): counted once drawn.
        await has(page, `#ct-panel-${tab} .ct-explain-btn`, 10_000);
        const n = await page.$$eval(`#ct-panel-${tab} .ct-explain-btn`, (bs) => bs.length);
        assert.ok(n > 0, `${at}: the ${tab} view's explanations`);
        for (let i = 0; i < n; i++) {
          await page.evaluate((t, j) => document.querySelectorAll(`#ct-panel-${t} .ct-explain-btn`)[j].click(), tab, i);
          await page.waitForSelector(`#ct-panel-${tab} .ct-pop`);
          bad.push(...(await within(page, `#ct-panel-${tab} .ct-pop`)).map((s) => `${tab} #${i}: ${s}`));
          // Its Escape listener is added after paint (useEffect): two frames, as no reader is faster.
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          await page.keyboard.press('Escape');
          assert.ok(await page.waitForFunction((t) => !document.querySelector(`#ct-panel-${t} .ct-pop`), {}, tab).then(() => true, () => false), `${at}: Escape closes ${tab} #${i}`);
        }
      }
      // "Add it anyway?": a plant that does not take full shade asks first.
      await settled(page, '#ct-tab-matrix');
      await page.click('#ct-tab-matrix');
      await settled(page, '.ct-viewbar button');
      await page.click('.ct-viewbar button');
      const ask = await page.waitForSelector('dialog.ct-add[open] li.flagged > button', { timeout: 5000 }).catch(() => null);
      if (ask) {
        await settled(page, 'dialog.ct-add[open] li.flagged > button'); // the sheet slides in (details.css ct-sheet-in)
        await ask.click();
        assert.ok(await has(page, 'dialog.ct-ask[open]'), `${at}: "Add it anyway?"`);
        bad.push(...await within(page, 'dialog.ct-ask[open]'));
      } else bad.push('no plant asks first in shade');
      assert.deepEqual(bad, [], at);
      await done(page);
    }
  }
});

// Layout stability (P5 flake investigation, N2): nothing on Start moves after its first paint because
// data arrived. The page opens with the browser's languages saying one country and its time zone
// another (a long name, or Puerto Rico, a country GRIIS did not check), so a guess refined when the
// database opens would change the country line's height and shift every control below it (46 px at
// en 320 and ja 390) about a second after load. Each control's box in the first frame it exists is
// compared with its box once the database is open and the guess settled: no movement over 1 px, and
// the layout-shift entries (PerformanceObserver, buffered) add up to 0.01 at most.
const STABLE = ['[data-location-action="geo"]', 'input[data-location-search]', '[data-location-action="map"]', '.ct-card:first-of-type', '.ct-card:last-of-type'];
const MISMATCH = { en: { languages: ['en-US', 'en'], zone: 'Africa/Bangui', guess: 'CF' }, fr: { languages: ['fr-FR', 'fr'], zone: 'America/St_Vincent', guess: 'VC' }, ja: { languages: ['ja-JP', 'ja'], zone: 'America/Puerto_Rico', guess: 'PR' } };
async function stableStart(lang, width) {
  const { languages, zone } = MISMATCH[lang];
  const page = await h.open(`${lang === 'en' ? '' : `/${lang}`}/consortium/`, { width, mapTiles: 'stub' });
  await page.emulateTimezone(zone);
  await page.evaluateOnNewDocument((langs, sels) => {
    window.__ctTest = true;
    Object.defineProperty(Navigator.prototype, 'languages', { get: () => langs, configurable: true });
    Object.defineProperty(Navigator.prototype, 'language', { get: () => langs[0], configurable: true });
    const s = (window.__stable = { shifts: [], first: {} });
    new PerformanceObserver((list) => { for (const e of list.getEntries()) s.shifts.push({ value: e.value, at: Math.round(e.startTime), from: e.sources?.map((x) => x.node?.className || x.node?.nodeName).join(', ') }); }).observe({ type: 'layout-shift', buffered: true });
    // Each control's box in the first frame it exists (a rAF callback runs before that frame paints).
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };
    const look = () => {
      for (const sel of sels) { const el = document.querySelector(sel); if (el && !s.first[sel]) s.first[sel] = box(el); }
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  }, languages, STABLE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  return page;
}
async function moved(page) {
  // The database open, the guess refined (a microtask after the source) and twenty frames with
  // nothing changing.
  await page.waitForFunction(() => !!window.__ctTest?.store?.source.value, { timeout: 20_000 });
  await loadState(page);
  await page.waitForFunction(() => {
    const key = JSON.stringify([window.__ctTest.store.country.value, document.querySelector('#ct-root')?.getBoundingClientRect().height]);
    const w = (window.__still ??= { key, n: 0 });
    if (w.key === key) w.n += 1; else Object.assign(w, { key, n: 0 });
    return w.n >= 20;
  }, { polling: 'raf', timeout: 10_000 });
  return page.evaluate((sels) => {
    const s = window.__stable, out = [];
    for (const sel of sels) {
      const el = document.querySelector(sel), a = s.first[sel];
      if (!el || !a) continue;
      const r = el.getBoundingClientRect(), b = { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
      const d = Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(b[k] - a[k])));
      if (d > 1) out.push(`${sel}: ${['x', 'y', 'w', 'h'].map((k) => `${Math.round(a[k])}→${Math.round(b[k])}`).join(' ')}`);
    }
    const cls = s.shifts.reduce((n, e) => n + e.value, 0);
    return { out, cls, shifts: s.shifts, country: window.__ctTest.store.country.value, seen: sels.filter((x) => s.first[x]) };
  }, STABLE);
}
test('Layout stability (N2): nothing on Start moves after its first paint when the database opens and the guessed country is refined by the time zone, at 320–1280 px in en, fr and ja', async () => {
  const bad = [];
  for (const lang of ['en', 'fr', 'ja']) {
    for (const width of [320, 390, 700, 960, 1280]) {
      const at = `${lang} ${width} px`;
      const page = await stableStart(lang, width);
      const r = await moved(page);
      assert.deepEqual(r.seen, STABLE, `${at}: every control measured`);
      // The time zone's country, not the languages' (the mismatch is real).
      assert.deepEqual(r.country, { code: MISMATCH[lang].guess, source: 'guess' }, `${at}: the time zone's guess`);
      bad.push(...r.out.map((x) => `${at}: ${x}`));
      if (r.cls > 0.01) bad.push(`${at}: CLS ${r.cls.toFixed(3)} (${r.shifts.map((e) => `${e.value.toFixed(3)} at ${e.at} ms by ${e.from}`).join('; ')})`);
      await done(page);
    }
  }
  assert.deepEqual(bad, []);
});

// Review of p5-final (low 1): an explanation placed on open is placed again when the window changes
// (a phone turned, a window narrowed), so it keeps the 16 px gutter without being reopened.
test('Walk-through 2 N2 (review): an open explanation keeps the 16 px gutter when the window narrows from 844 to 390 px', async () => {
  const page = await suggested({ width: 844, theme: 'light' });
  const n = await page.$$eval('#ct-panel-matrix .ct-explain-btn', (bs) => bs.length);
  assert.ok(n > 0, 'the phone matrix\'s explanations');
  const bad = [];
  for (let i = 0; i < n; i++) {
    await page.setViewport({ width: 844, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
    await page.evaluate((j) => document.querySelectorAll('#ct-panel-matrix .ct-explain-btn')[j].click(), i);
    await page.waitForSelector('#ct-panel-matrix .ct-pop');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const r = await page.$eval('#ct-panel-matrix .ct-pop', (el) => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, vw: document.documentElement.clientWidth }; });
    if (r.left < 15.5 || r.right > r.vw - 15.5) bad.push(`#${i}: ${Math.round(r.left)}–${Math.round(r.right)} of ${r.vw}`);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#ct-panel-matrix .ct-pop'));
  }
  assert.deepEqual(bad, [], 'within 16 px of each edge after the resize');
  await done(page);
});

// Review of p5-final (low 2): the sheet's sticky foot (toast above the action bar) covers the sheet's
// bottom, so the sheet keeps that much scroll padding: a control tabbed to near the end is shown above
// the foot, and the foot's empty area beside the toast passes clicks through.
test('Walk-through 2 N1 (review): with a toast in the Add sheet, the last controls tabbed to are fully visible above the foot and clickable (390 × 600)', async () => {
  const plants = await temperate();
  const page = await suggested({ width: 390, theme: 'light' });
  await page.click('.ct-viewbar button');
  await page.waitForSelector('dialog.ct-add[open] .ct-sheet-body > ul.ct-rows > li input[type="checkbox"]');
  await page.click('dialog.ct-add[open] .ct-sheet-body > ul.ct-rows > li input[type="checkbox"]');
  await page.click('dialog.ct-add[open] .ct-add-bar .button-primary');
  assert.ok(await has(page, '.ct-toast-page .ct-toast'), 'the add\'s toast');
  await page.click('.ct-viewbar button');
  assert.ok(await has(page, 'dialog.ct-add[open] .ct-toast'), 'the toast in the sheet');
  await page.setViewport({ width: 390, height: 600, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  assert.ok(plants.length > 3);
  const focusables = 'dialog.ct-add[open] .ct-sheet-body :is(button, input, a[href], select, textarea):not([disabled])';
  const count = await page.$$eval(focusables, (els) => els.filter((e) => e.getClientRects().length).length);
  assert.ok(count >= 4, 'controls to tab through');
  await page.evaluate((sel) => { const els = [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length); els[els.length - 4].focus(); }, focusables);
  const bad = [];
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab');
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const seen = await page.evaluate(() => {
      const el = document.activeElement;
      const foot = document.querySelector('dialog.ct-add[open] .ct-sheet-foot').getBoundingClientRect();
      const toast = document.querySelector('dialog.ct-add[open] .ct-toast')?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const target = el.closest('label') ?? el;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const top = toast ? Math.min(foot.top + (toast.top - foot.top), foot.top) : foot.top;
      return { name: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 40), inFoot: !!el.closest('.ct-sheet-foot'), bottom: r.bottom, top, clickable: target.contains(hit) || el.contains(hit) };
    });
    if (seen.inFoot) break; // past the body: into the toast and the bar
    if (seen.bottom > seen.top + 0.5) bad.push(`${seen.name}: bottom ${Math.round(seen.bottom)} under the foot at ${Math.round(seen.top)}`);
    if (!seen.clickable) bad.push(`${seen.name}: not clickable`);
  }
  assert.deepEqual(bad, [], 'each control tabbed to is above the foot and takes the click');
  // The foot's empty area beside the toast passes a click to what lies under it.
  const through = await page.evaluate(() => {
    const d = document.querySelector('dialog.ct-add[open]');
    const toast = d.querySelector('.ct-toast').getBoundingClientRect();
    const x = Math.max(4, toast.left - 6), y = toast.top + toast.height / 2;
    const hit = document.elementFromPoint(x, y);
    return toast.left > 10 ? !hit?.closest('.ct-sheet-foot') : true;
  });
  assert.ok(through, 'the area beside the toast is not the foot');
  await done(page);
});
