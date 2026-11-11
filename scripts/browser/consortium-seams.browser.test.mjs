// The seams between the four P2 streams (hand-off branch: H1–H16, seam review X1–X8, walk-through
// W1–W9, and the reviews of the branch, F1–F7). Every test here drives the page through its real
// controls, as a reader would; the test hook only makes the after-the-matrix chunk fail or wait (F4,
// F5), which no control can. Run capped: npm run test:browser.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, startHarness } from './harness.mjs';
import { aria, axNodes, eachVariant, en, findAx, fixtureDb, has } from './helpers.mjs';
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
  const rows = db.prepare("SELECT p.plant, p.id, p.canonical_name name, p.height_max_m h, p.habit, x.role, x.stratum, x.phase_start a, x.phase_end b FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate'").all();
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

// Start → a climate → (room) → Suggest, through the controls.
async function suggested(v, { room = null } = {}) {
  const page = await h.open('/consortium/', { ...v, data: 'fixture' });
  await page.locator(aria('radio', 'Temperate')).click();
  assert.equal(await loadState(page), 'ready');
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

// The core's room rule (site.ts): a small garden takes plants up to 6 m; a climber or an unrecorded
// height is unknown, never a misfit.
const fitsSmall = (p) => p.habit === 'Climber' || p.h === null || p.h <= 6;

test('X1/X2: "+ Add" in a free cell opens Add for that cell, and lists only its plants that fit (a small garden)', async (t) => {
  const plants = await temperate();
  await eachVariant(t, async (v) => {
    const page = await suggested(v, { room: 'Small garden' });
    const members = new Set(await memberIds(page));
    const inCell = (cell) => plants.filter((p) => p.stratum === cell.stratum && p.a <= cell.to && p.b >= cell.from && !members.has(p.id));
    // A free cell where the room leaves out at least one of its plants, so the filter is seen working.
    let btn = null;
    for (let i = 0; i < 7 && !btn; i++) {
      const adds = (await axNodes(page)).filter((n) => n.role === 'button' && /^Add a plant: /.test(n.name ?? ''));
      btn = adds.find((n) => inCell(cellIn(n.name)).some((p) => !fitsSmall(p))) ?? null;
      if (!btn && v.width < 640) await page.locator(aria('button', 'Later stage')).click();
    }
    assert.ok(btn, 'a free cell with "+ Add" holding a plant too tall for a small garden');
    const cell = cellIn(btn.name);
    await page.locator(aria('button', btn.name)).click();
    const dialog = await findAx(page, { role: 'dialog', name: new RegExp(`^Add to ${esc(en[`consortium.stratum.${cell.stratum}`])} · `) });
    assert.ok(dialog, `"+ Add" opens "Add to {layer} · {phase}" (${btn.name})`);
    const expected = inCell(cell).filter(fitsSmall).map((p) => p.name).sort();
    assert.deepEqual((await addRows(page)).sort(), expected, 'the plants of the cell that fit a small garden, and only those');
    await done(page);
  });
});

test('X1/X2/X7: "Show them anyway" opens Add for the blocked cell or run, every row in it', async (t) => {
  const plants = await temperate();
  await eachVariant(t, async (v) => {
    const page = await suggested(v, { room: 'Small garden' });
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
