// Stream S1's browser tests (core, data, loader; review C1). S1 edits only this file among the
// browser tests and flips its todo tests as it builds them. Design check §7 BT-1 (data half).
// Run: timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 npm run test:browser
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, startHarness } from './harness.mjs';
import { aria, axNodes, eachVariant, findAx, index, realDb } from './helpers.mjs';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

test('BT-1 (S1 data): on the real Temperate list with every site answer unsure, Suggest picks 9 plants placed in Temperate, from the database', { todo: 'S1' }, async (t) => {
  const temperate = new Set(await realDb((db) => db.prepare(
    "SELECT coalesce(n.name, p.canonical_name) name FROM placements x JOIN plants p USING (plant) LEFT JOIN plant_names n ON n.plant = p.plant AND n.locale = 'en' WHERE x.climate_zone = 'Temperate'").all().map((r) => r.name)));
  assert.equal(index.names.Temperate.length, temperate.size);
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', v);
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await findAx(page, { role: 'table' }), 'the matrix');
    // Chips are buttons inside the table; their names start with the plant's name (S2 adds layer and phase words).
    const chips = (await axNodes(page)).filter((n) => n.role === 'button' && [...temperate].some((name) => (n.name ?? '').startsWith(name)));
    assert.equal(new Set(chips.map((c) => c.name)).size, 9, 'A7: an unsure room suggests 9 plants');
  });
});
