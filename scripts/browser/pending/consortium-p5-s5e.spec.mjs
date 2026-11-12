// The S5e specs (native here, soil likely), todo since S5e moved to P5.2 after the P5 push. Their
// bodies ran in every full run, each waiting for an element that is never built (~35 s), so they sit
// here, outside the browser test glob (E1 design check A6). F1a's soil and native stream moves them
// back into a consortium-p5-*.browser.test.mjs file and removes the todos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { useHarness, has, realDb } from '../helpers.mjs';
import { tool, atSite, choose, text } from '../p5-helpers.mjs';

useHarness();

// ---- S5e: native here and soil likely ----

test('P5-20 (S5e native here, three states): at Lyon (FRA) Details says native, not recorded native, or unknown', { todo: 'S5e: moved to P5.2, after the P5 push; native here not built' }, async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  const pick = await realDb((db) => ({
    native: db.prepare("SELECT p.canonical_name n FROM plants p JOIN plant_areas a USING (plant) JOIN placements pl ON pl.plant = p.plant AND pl.climate_zone = 'Mediterranean' WHERE a.area = 'FRA' AND a.introduced = 0 ORDER BY n LIMIT 1").get()?.n,
    not_recorded: db.prepare("SELECT p.canonical_name n FROM plants p JOIN placements pl ON pl.plant = p.plant AND pl.climate_zone = 'Mediterranean' WHERE p.wcvp_match IS NOT NULL AND p.plant NOT IN (SELECT plant FROM plant_areas WHERE area = 'FRA' AND introduced = 0) ORDER BY n LIMIT 1").get()?.n,
    unknown: db.prepare("SELECT p.canonical_name n FROM plants p JOIN placements pl ON pl.plant = p.plant AND pl.climate_zone = 'Mediterranean' WHERE p.wcvp_match IS NULL ORDER BY n LIMIT 1").get()?.n,
  }));
  await choose(page, 'Mediterranean');
  for (const [state, name] of Object.entries(pick)) {
    assert.ok(name, `a Mediterranean plant for "${state}"`);
    await page.evaluate((n) => { const { store } = window.__ctTest; const t = store.pool.value.find((x) => x.canonical_name === n); store.openSheet('details', t.id); }, name);
    assert.ok(await has(page, `[data-native="${state}"]`, 10_000), `${name}: ${state}`);
  }
});

test('P5-21 (S5e soil likely): at Manaus the soil question offers "Likely: acid (pH 4.3, SoilGrids) · Use it" and keeps "Not sure" until used', { todo: 'S5e: moved to P5.2, after the P5 push; soil likely not built' }, async () => {
  const page = await tool();
  await atSite(page, 'manaus');
  await choose(page, 'Tropical');
  assert.ok(await has(page, '[data-likely="soil"]', 10_000), 'the soil question offers what SoilGrids makes likely');
  assert.match(await text(page, '[data-likely="soil"]'), /4\.3/);
  assert.equal(await page.evaluate(() => window.__ctTest.store.site.value.soil), 'unsure', 'never prefilled');
  await page.click('[data-likely="soil"] [data-likely-use]');
  assert.equal(await page.evaluate(() => window.__ctTest.store.site.value.soil), 'acid');
  for (const q of ['light', 'room']) assert.equal(await page.$(`[data-likely="${q}"]`), null, `${q} is never offered`);
});

test('P5-22 (S5e soil borderline): at Lyon (pH 5.9, within 0.3 of the acid bound) nothing is offered', { todo: 'S5e: moved to P5.2, after the P5 push; soil likely not built' }, async () => {
  const page = await tool();
  await atSite(page, 'manaus');
  await choose(page, 'Tropical');
  assert.ok(await has(page, '[data-likely="soil"]', 10_000), 'the offer exists where the soil is clear (Manaus)');
  await atSite(page, 'lyon');
  await choose(page, 'Temperate');
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(await page.$('[data-likely="soil"]'), null);
});
