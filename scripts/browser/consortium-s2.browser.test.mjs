// Stream S2's browser tests (matrix, phone grid and stepper, side view, Jobs, plant list; review C1).
// S2 edits only this file among the browser tests and flips its todo tests as it builds them.
// Design check §7 BT-2, BT-3, BT-4. Run capped: npm run test:browser (see consortium-commit0).
//
// The views are reached through stream S4's start screen (climate cards, site radios, "Suggest
// plants") and, for BT-4's 120 plants, S4's share-link restore; "Show them anyway" and the side view's
// key open stream S3's sheets. Those parts stay todo, each naming the stream it waits for, until the
// streams meet on consortium/integration; S2 checked every test against a local merge of S4.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, startHarness } from './harness.mjs';
import { aria, axNodes, countAx, eachVariant, en, findAx, has, realDb } from './helpers.mjs';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

const NEEDS_START = 'S2: built; reaching the matrix needs the S4 start screen (climate, room, Suggest plants)';
const plain = (ord) => en[`consortium.phase.${['placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax'][ord]}.plain`];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const OPEN = en['consortium.matrix.open'];

async function suggest(page, climate, { room } = {}) {
  assert.equal(await loadState(page), 'ready');
  await page.locator(aria('radio', climate)).click();
  if (room) await page.locator(aria('radio', room)).click();
  await page.locator(aria('button', 'Suggest plants')).click();
  assert.ok(await findAx(page, { role: 'tab', name: 'Layers × stages' }, 15_000), 'the views, once the suggestion is made');
}

// The accessible names of a tab panel's Tab stops, from its first focusable element until focus
// leaves it.
async function tabStops(page, panel) {
  await page.evaluate((sel) => {
    const first = document.querySelector(sel)?.querySelector('button, a[href], input, [tabindex="0"]');
    first?.focus();
  }, panel);
  const names = [];
  for (let i = 0; i < 400; i++) {
    const name = await page.evaluate((sel) => {
      const a = document.activeElement;
      if (!a || !a.closest(sel)) return null;
      return (a.getAttribute('aria-label') ?? a.textContent ?? '').trim();
    }, panel);
    if (name === null) break;
    names.push(name);
    await page.keyboard.press('Tab');
  }
  return names;
}

test('BT-2 (S2 matrix): real Temperate gap, Room Small misfits with reasons, one Tab stop per plant with layer and phase words, phone cells ≥ 40 px and a named, announced stepper', { todo: NEEDS_START }, async (t) => {
  await eachVariant(t, async (v) => {
    // Real: Temperate low × "First 90 days" has no plant in the list (a cell on desktop, a grid
    // button on phones).
    const real = await h.open('/consortium/', v);
    await suggest(real, 'Temperate');
    const gap = await findAx(real, { name: new RegExp(`^Low, ${esc(plain(0))}: No plant in the list for this cell yet`) });
    assert.ok(gap, 'the gap is Temperate low × "First 90 days"');

    // Fixture, Room Small: every emergent plant is over 6 m, so emergent's later stages say why.
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(page, 'Temperate', { room: 'Small garden' });
    const misfit = await findAx(page, { name: /^Emergent, .*No plant fits your site here/ });
    assert.ok(misfit, 'a misfit cell');
    if (v.width >= 640) {
      assert.match(misfit.name, /grows? taller than 6 m/, 'the reason is counted and worded');
      assert.ok(await findAx(page, { role: 'button', name: /^Show them anyway: Emergent, / }), '"Show them anyway" names its cell');
    }

    // Tab visits each plant once; each plant's name holds its layer and phase words.
    const chips = (await axNodes(page)).filter((n) => n.role === 'button' && (n.name ?? '').endsWith(OPEN));
    assert.ok(chips.length >= 1, 'plants to visit');
    for (const c of chips) assert.match(c.name, /\. (Emergent|High|Mid|Low), .*(days|Months|Years|years)/, `${c.name}: layer and phase words`);
    const stops = await tabStops(page, '#ct-panel-matrix');
    assert.equal(new Set(stops).size, stops.length, `no Tab stop twice: ${stops.filter((s, i) => stops.indexOf(s) !== i)}`);
    for (const c of chips) assert.equal(stops.filter((s) => s === c.name).length, 1, `${c.name} is one Tab stop`);
    if (v.width >= 640) {
      const ids = await page.$$eval('#ct-panel-matrix table button[aria-label$="Open details"]', (els) => els.map((e) => e.getAttribute('aria-label')));
      assert.equal(new Set(ids).size, ids.length, 'a plant is one button in the matrix, its continuing pieces are text');
    }

    if (v.width < 640) {
      const sizes = await page.$$eval('#ct-overview td', (cells) => cells.map((c) => { const r = c.getBoundingClientRect(); return [r.width, r.height]; }));
      assert.equal(sizes.length, 28, 'a 4 × 7 overview');
      assert.ok(sizes.every(([w, hgt]) => w >= 40 && hgt >= 40), `phone cells are at least 40 px: ${JSON.stringify(sizes.slice(0, 7))}`);
      assert.ok(await findAx(page, { role: 'group', name: 'Stage' }), 'the stepper is named');
      assert.ok(await page.$('.ct-stepper [aria-live="polite"]'), 'the stepper announces through aria-live');
      await page.locator(aria('button', 'Later stage')).click();
      assert.ok(await findAx(page, { name: new RegExp(esc(plain(1))) }), 'Later stage shows the next stage');
    }
  });
});

test('BT-2 (S2 matrix): "Show them anyway" opens Add with the cell\'s plants', { todo: 'S2: the button sets addRequest and opens sheet add; the Add dialog is S3\'s' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(page, 'Temperate', { room: 'Small garden' });
    if (v.width < 640) await page.locator(aria('button', 'Later stage')).click();
    if (v.width < 640) await page.locator(aria('button', 'Later stage')).click();
    const btn = await findAx(page, { role: 'button', name: /^Show them anyway/ });
    await page.locator(aria('button', btn.name)).click();
    assert.ok(await findAx(page, { role: 'dialog', name: /^Add/ }), '"Show them anyway" opens Add');
  });
});

test('BT-3 (S2 side view): the chosen stage, a drawing with role=img and names, "Layer is light, not height"', { todo: NEEDS_START }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(page, 'Temperate');
    await page.locator(aria('tab', 'Side view')).click();
    if (v.width < 640) {
      await page.locator(aria('button', 'Later stage')).click();
      await page.locator(aria('button', 'Later stage')).click();
    } else {
      await page.locator(aria('button', `${plain(2)} · ${en['consortium.phase.placenta_iii.term']}`)).click();
    }
    assert.ok(await findAx(page, { role: 'heading', name: new RegExp(`^Side view: ${esc(plain(2))}`) }), 'the chosen stage is shown');
    const img = await findAx(page, { role: 'img', name: /^Side view: / });
    assert.ok(img && /Emergent: .*High: .*Mid: .*Low: /.test(img.name), `the drawing has role=img and names its plants by layer: ${img?.name}`);
    assert.ok(await findAx(page, { name: /Layer is light, not height/ }), '"Layer is light, not height"');
    const keys = (await axNodes(page)).filter((n) => n.role === 'button' && n.name && img.name.includes(n.name) && n.name.length > 2);
    assert.ok(keys.length >= 1, 'the key repeats the drawing\'s names as buttons');
  });
});

test('BT-3 (S2 side view): a name in the key opens its details', { todo: 'S2: the key sets sheet details; the Details dialog is S3\'s' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(page, 'Temperate');
    await page.locator(aria('tab', 'Side view')).click();
    const img = await findAx(page, { role: 'img', name: /^Side view: / });
    const key = (await axNodes(page)).find((n) => n.role === 'button' && n.name && img.name.includes(n.name) && n.name.length > 2);
    await page.locator(aria('button', key.name)).click();
    assert.ok(await findAx(page, { role: 'dialog' }), 'the key opens details');
  });
});

test('BT-4 (S2 jobs and list): a 6-row Jobs table whose gaps name their stages; 120 real plants listed once each under their start cell; the warning filter', { todo: 'S2: built; needs the S4 start screen and its share-link restore' }, async (t) => {
  // 120 real Temperate plants as a share link, written by the core's link encoder (S1, state.ts).
  const { ids, canon, known } = await realDb((db) => {
    const rows = db.prepare("SELECT p.id, p.canonical_name FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' AND x.stratum IS NOT NULL ORDER BY p.canonical_name LIMIT 120").all();
    const all = db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate'").all().map((r) => r.id);
    return { ids: rows.map((r) => r.id), canon: rows.map((r) => r.canonical_name), known: all };
  });
  assert.equal(ids.length, 120);
  const core = await import('../../src/lib/consortium/index.ts');
  const unsure = { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' };
  const link = core.encodeLink({ climate: 'Temperate', country: null, site: unsure, members: ids, kept: [], removed: [], guests: [], crops: [], stage: null }, { Temperate: known });
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(page, 'Temperate');
    await page.locator(aria('tab', 'Jobs')).click();
    assert.ok(await findAx(page, { role: 'table', name: 'Who does what' }), 'the Jobs table');
    assert.equal(await countAx(page, (n) => n.role === 'rowheader'), 6, 'six jobs');
    assert.ok(await findAx(page, { name: /No one does it (in: |yet)/ }), 'a gap names its stages');

    const real = await h.open(`/consortium/#${link}`, v);
    assert.equal(await loadState(real), 'ready');
    await real.locator(aria('tab', 'All plants')).click();
    const named = async () => (await axNodes(real)).filter((n) => n.role === 'row' && n.name).map((n) => n.name);
    const rows = await named();
    for (const c of canon) assert.equal(rows.filter((r) => r.endsWith(`, ${c}`)).length, 1, `${c} is listed once`);
    assert.ok((await countAx(real, (n) => n.role === 'heading' && n.level === 3)) >= 2, 'grouped under start cells');
    await real.locator(aria('checkbox', 'With a warning')).click();
    const after = await named();
    const warned = canon.filter((c) => after.some((r) => r.endsWith(`, ${c}`))).length;
    assert.ok(warned > 0 && warned < 120, `the warning filter keeps the plants with a warning (${warned})`);
    assert.ok(await has(real, '.ct-list-shown'), 'the count shown');
  });
});
