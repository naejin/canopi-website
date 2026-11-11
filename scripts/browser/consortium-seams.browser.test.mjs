// The seams between the four P2 streams (hand-off branch: H1–H16, seam review X1–X8, walk-through
// W1–W9). Every test here drives the page through its real controls, as a reader would: no test hook.
// Run capped: npm run test:browser.
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
  const rows = db.prepare("SELECT p.plant, p.id, p.canonical_name name, x.role, x.stratum, x.phase_start a, x.phase_end b FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate'").all();
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

test('X1/X2: "+ Add" in a free cell opens Add for that cell, and lists only its plants that fit', async (t) => {
  const plants = await temperate();
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    let btn = null;
    for (let i = 0; i < 7 && !btn; i++) {
      btn = await findAx(page, { role: 'button', name: /^Add a plant: / }, 600);
      if (!btn && v.width < 640) await page.locator(aria('button', 'Later stage')).click();
    }
    assert.ok(btn, 'a free cell with "+ Add"');
    const cell = cellIn(btn.name);
    await page.locator(aria('button', btn.name)).click();
    const dialog = await findAx(page, { role: 'dialog', name: new RegExp(`^Add to ${esc(en[`consortium.stratum.${cell.stratum}`])} · `) });
    assert.ok(dialog, `"+ Add" opens "Add to {layer} · {phase}" (${btn.name})`);
    const members = new Set(await memberIds(page));
    const expected = plants.filter((p) => p.stratum === cell.stratum && p.a <= cell.to && p.b >= cell.from && !members.has(p.id)).map((p) => p.name).sort();
    assert.deepEqual((await addRows(page)).sort(), expected, 'every plant of the cell, and only those (every site answer unsure: all fit)');
    await done(page);
  });
});

test('X1/X2/X7: "Show them anyway" opens Add for the blocked cell or run, every row in it', async (t) => {
  const plants = await temperate();
  await eachVariant(t, async (v) => {
    const page = await suggested(v, { room: 'Small garden' });
    let btn = null;
    for (let i = 0; i < 7 && !btn; i++) {
      btn = await findAx(page, { role: 'button', name: /^Show them anyway: Emergent/ }, 600);
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
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await findAx(page, { role: 'button', name: remove.name }), 'Undo brings it back');
    await done(page);
  });
});
