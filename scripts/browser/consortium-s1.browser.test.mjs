// Stream S1's browser tests (core, data, loader; review C1). Every test runs and must pass
// (scripts/browser-tests.test.mjs). Design check §7 BT-1 (data half).
// Run: timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 npm run test:browser
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, startHarness } from './harness.mjs';
import { aria, axNodes, behaviour, findAx, index, realDb } from './helpers.mjs';
import { openCards } from './location-fixtures.mjs';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

// The data half the S1 stream can show alone: the built loader chunk opens the real database with
// SQLite-WASM in Chrome, and its PlantSource (data/sqlite-source.ts) gives each climate's plants,
// self-hosted photos only, against node:sqlite on the same file. The 9-plant
// suggestion on that list is checked in Node (scripts/consortium-source.test.mjs, real install).
test('BT-1 (S1 data, in the page): the loader opens the real database and its PlantSource gives every climate\'s list, photos from the index map @real-data', async (t) => {
  const oracle = await realDb((db) => {
    const out = {};
    for (const c of index.climates) {
      out[c] = {
        names: db.prepare('SELECT p.canonical_name n FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = ? ORDER BY 1').all(c).map((r) => r.n),
      };
    }
    return out;
  });
  await behaviour(t, async (v) => {
    const page = await h.open('/palette/', v);
    assert.equal(await loadState(page), 'ready');
    const got = await page.evaluate(async () => {
      const chunk = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/_astro\/load\.[\w-]+\.js$/.test(n));
      if (!chunk) throw new Error('the loader chunk was not loaded');
      const data = JSON.parse(document.getElementById('ct-data').textContent);
      const mod = await import(chunk);
      const zone = (c) => c.charAt(0).toUpperCase() + c.slice(1);
      const { db } = await mod.openDatabase(data.db, { releaseId: data.releaseId, climates: data.climates.map(zone) });
      try {
        const src = mod.createSqliteSource(db, { images: data.images });
        const out = {};
        for (const c of src.info().climates) {
          const pool = await src.pool(c);
          out[c] = {
            names: pool.map((p) => p.canonical_name).sort(),
            photos: pool.filter((p) => p.image).map((p) => p.image.url),
            mapped: pool.filter((p) => data.images[p.id]).length,
          };
        }
        return { info: src.info(), out };
      } finally { db.close(); }
    });
    assert.equal(got.info.releaseId, index.release_id);
    assert.deepEqual(got.info.climates, index.climates);
    for (const c of index.climates) {
      assert.deepEqual(got.out[c].names, [...oracle[c].names].sort(), c);
      assert.ok(got.out[c].photos.every((u) => u.startsWith('/data/consortium/images/')), `${c}: self-hosted photos only`);
      assert.ok(got.out[c].photos.length > 0 && got.out[c].photos.length <= got.out[c].mapped, `${c}: a photo only where the index maps one`);
    }
  });
});

// The full BT-1 data path through the page: Start's climate radio and Suggest, then the palette page's
// chips (the matrix and its All plants tab went in PP-B commit 0a'; the cell counts went with cellCounts).
test('BT-1 (S1 data): on the real Temperate list with every site answer unsure, Suggest picks 9 plants placed in Temperate, from the database @real-data', async (t) => {
  const temperate = new Set(await realDb((db) => db.prepare(
    "SELECT coalesce(n.name, p.canonical_name) name FROM placements x JOIN plants p USING (plant) LEFT JOIN plant_names n ON n.plant = p.plant AND n.locale = 'en' WHERE x.climate_zone = 'Temperate'").all().map((r) => r.name)));
  assert.equal(index.names.Temperate.length, temperate.size);
  await behaviour(t, async (v) => {
    const page = await h.open('/palette/', v);
    await openCards(page);
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator('[data-place-suggest], .ct-cta .button-primary').click();
    // Through the years shows every member at every width (one lane per light level; the phone shows one
    // time step, so each member's chip is read by id); each chip starts with the plant's name.
    await page.waitForSelector('#ct-root .ct-years [data-plant-id]');
    const rows = await page.$$eval('#ct-root .ct-chart [data-plant-id]', (els) => [...new Map(els.map((e) => [e.dataset.plantId, e.textContent.trim()])).values()]);
    assert.equal(rows.length, 9, 'A7: an unsure room suggests 9 plants');
    for (const r of rows) assert.ok([...temperate].some((name) => r.startsWith(name)), `${r} is placed in Temperate`);
    await page.browserContext().close().catch(() => {});
  });
});
