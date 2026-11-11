// Stream S2's browser tests (matrix, phone grid and stepper, side view, Jobs, plant list; review C1).
// S2 edits only this file among the browser tests and flips its todo tests as it builds them.
// Design check §7 BT-2, BT-3, BT-4. Run capped: npm run test:browser (see consortium-commit0).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, startHarness } from './harness.mjs';
import { aria, axNodes, countAx, eachVariant, en, findAx, has, realDb } from './helpers.mjs';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

const plain = (ord) => en[`consortium.phase.${['placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax'][ord]}.plain`];
async function suggest(page, climate, { room } = {}) {
  await page.locator(aria('radio', climate)).click();
  if (room) await page.locator(aria('radio', room)).click();
  assert.equal(await loadState(page), 'ready');
  await page.locator(aria('button', 'Suggest plants')).click();
  assert.ok(await findAx(page, { role: 'table' }), 'the matrix');
}

test('BT-2 (S2 matrix): real Temperate gap, Room Small misfits with "Show them anyway", one Tab stop per plant with layer and phase words, phone cells ≥ 40 px and a named, announced stepper', { todo: 'S2' }, async (t) => {
  await eachVariant(t, async (v) => {
    // Real: Temperate low × "First 90 days" has no plant in the list.
    const real = await h.open('/consortium/', v);
    await suggest(real, 'Temperate');
    const gap = await findAx(real, { role: 'cell', name: /No plant in the list for this cell yet/ });
    assert.ok(gap, 'a gap cell');
    assert.match(gap.name, new RegExp(`Low.*${plain(0)}|${plain(0)}.*Low`), 'the gap is Temperate low × "First 90 days"');

    // Fixture, Room Small: every emergent plant is over 6 m.
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(page, 'Temperate', { room: 'Small' });
    assert.ok(await has(page, '::-p-aria(No plant fits your site here)'));
    await page.locator(aria('button', 'Show them anyway')).click();
    assert.ok(await findAx(page, { role: 'dialog', name: /^Add/ }), '"Show them anyway" opens Add');
    await page.keyboard.press('Escape');

    // Tab visits each plant once; each chip's name holds its layer and phase words.
    const chips = (await axNodes(page)).filter((n) => n.role === 'button' && / · /.test(n.name ?? ''));
    assert.ok(chips.length >= 6);
    const seen = [];
    for (let i = 0; i < chips.length * 3 && seen.length < chips.length + 1; i++) {
      await page.keyboard.press('Tab');
      const name = await page.evaluate(() => document.activeElement?.closest('[role="table"], table') ? document.activeElement.getAttribute('aria-label') ?? document.activeElement.textContent : null);
      if (name) seen.push(name);
    }
    assert.equal(new Set(seen).size, seen.length, 'no plant is a Tab stop twice');
    for (const c of chips) assert.match(c.name, /(Emergent|High|Medium|Low).*(days|Months|Years)/, `${c.name}: layer and phase words`);

    if (v.width < 640) {
      const sizes = await page.$$eval('[role="table"] [role="cell"], table td', (cells) => cells.map((c) => { const r = c.getBoundingClientRect(); return [r.width, r.height]; }));
      assert.ok(sizes.length && sizes.every(([w, hgt]) => w >= 40 && hgt >= 40), 'phone cells are at least 40 px');
      const stepper = await findAx(page, { role: 'group', name: /stage|Stage/ });
      assert.ok(stepper, 'the stepper is named');
      assert.ok(await page.$('[aria-live="polite"]'), 'the stepper announces through aria-live');
    }
  });
});

test('BT-3 (S2 side view): the chosen stage, a drawing with role=img and names, the key opens details, "Layer is light, not height"', { todo: 'S2' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(page, 'Temperate');
    await page.locator(aria('radio', 'Side view')).click();
    const img = await findAx(page, { role: 'img', name: /./ });
    assert.ok(img && img.name.length > 20, 'the drawing has role=img and names its plants');
    assert.ok(await findAx(page, { name: new RegExp(plain(2)) }), 'the chosen stage is shown');
    assert.ok(await has(page, '::-p-aria(Layer is light, not height)'));
    const key = (await axNodes(page)).find((n) => n.role === 'button' && img.name.includes((n.name ?? '').split(' · ')[0]) && n.name);
    await page.locator(aria('button', key.name)).click();
    assert.ok(await findAx(page, { role: 'dialog' }), 'the key opens details');
  });
});

test('BT-4 (S2 jobs and list): a 6-row Jobs table whose gaps name their stages; 120 real plants listed once each under their start cell; the warning filter', { todo: 'S2' }, async (t) => {
  // 120 real Temperate plants as a share link, written by the core's state encoder (S1, state.ts).
  const ids = await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' AND x.stratum IS NOT NULL ORDER BY p.canonical_name LIMIT 120").all().map((r) => r.id));
  assert.equal(ids.length, 120);
  const core = await import('../../src/lib/consortium/index.ts');
  assert.equal(typeof core.encodeState, 'function', 'S1 exports encodeState from index.ts');
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(page, 'Temperate');
    await page.locator(aria('radio', 'Jobs')).click();
    const jobs = await findAx(page, { role: 'table', name: /Jobs/ });
    assert.ok(jobs, 'the Jobs table');
    assert.equal(await countAx(page, (n) => n.role === 'rowheader'), 6, 'six jobs');
    assert.ok(await findAx(page, { role: 'cell', name: new RegExp(`${plain(0)}|${plain(1)}|${plain(2)}|${plain(3)}`) }), 'a gap names its stages');

    const real = await h.open(`/consortium/#${core.encodeState({ climate: 'Temperate', members: ids })}`, v);
    assert.equal(await loadState(real), 'ready');
    await real.locator(aria('radio', 'All plants')).click();
    const rows = (await axNodes(real)).filter((n) => n.role === 'row' && n.name);
    const names = rows.map((r) => r.name.split(' · ')[0]);
    assert.equal(names.length, 120, 'each plant listed');
    assert.equal(new Set(names).size, 120, 'each plant once');
    assert.ok((await countAx(real, (n) => n.role === 'rowgroup' || n.role === 'heading')) >= 2, 'grouped under start cells');
    await real.locator(aria('checkbox', 'With a warning')).click();
    const warned = (await axNodes(real)).filter((n) => n.role === 'row' && n.name).length;
    assert.ok(warned > 0 && warned < 120, 'the warning filter keeps the plants with a warning');
  });
});
