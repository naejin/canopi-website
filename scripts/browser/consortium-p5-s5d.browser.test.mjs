// The P5 browser specs of stream S5d: future summary (§C): n of m outside by 2041–2070, not checked, its layout. Split from consortium-p5 by owner tag
// (E1 design check A6); each test is "P5-n (S5d …)".
//
// No network: Nominatim and OpenFreeMap are stubbed (harness.mjs nominatim / mapTiles), the device
// location is emulated through CDP (geolocation), and any other request off the site is aborted and
// listed in page.thirdParty. The places and what the climate reader answers there are in
// ./location-fixtures.mjs; the specs' shared helpers in ./p5-helpers.mjs. The page contract the
// specs read is written at the top of ./p5-helpers.mjs. scripts/browser-tests.test.mjs enforces the
// layout. Headless Chrome on dist-test, capped:
//   timeout 600 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 \
//     node --experimental-strip-types --disable-warning=ExperimentalWarning --test scripts/browser/consortium-p5-s5d.browser.test.mjs
// (npm run test:browser runs every file in shards: scripts/browser/run.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { h, useHarness, has } from './helpers.mjs';
import { SITES, lookupAt } from './location-fixtures.mjs';
import { tool, atSite, choose, text, members } from './p5-helpers.mjs';

useHarness();

// ---- S5d: future check ----

// At Seville on the Mediterranean list: on the schema 3 ranges (heat limit at Q99) Lyon's Temperate list
// has 1 plant of 101 outside by 2041–2070, too few for a suggestion to hold one.
test('P5-18 (S5d future summary): at Seville on the Mediterranean list the panel leads with "n of m outside by 2041–2070" under SSP2-4.5', async () => {
  const page = await tool();
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await has(page, '[data-future-summary]', 10_000), 'the future panel');
  assert.match(await text(page, '[data-future-summary]'), /\d+ of \d+ .*2041–2070/);
  assert.equal(await page.evaluate(() => window.__ctTest.store.scenario.value), 'ssp245');
  assert.equal(await page.$eval('input[name="ct-scenario"]:checked', (e) => e.value), 'ssp245', 'SSP2-4.5 checked by default');
  // The lede says what is compared: constrained CMIP6 changes on CHELSA v2.1, ranges with cultivation included, not reviewed.
  assert.match(await text(page, '#ct-future-h + p'), /CMIP6 model ensemble \(Beck et al\., 2023\).*CHELSA v2\.1.*1981–2010.*cultivation included.*not reviewed/);
  // The members not counted in "n of m" are counted on their own line, so the numbers add up.
  const lines = await page.$$eval('[data-future-verdict]', (els) => els.map((e) => e.getAttribute('data-future-verdict')));
  const uncounted = lines.filter((v) => v === 'not-checked').length;
  const said = ((await text(page, '[data-future-uncounted]')) ?? '').match(/\d+/g)?.reduce((n, d) => n + Number(d), 0) ?? 0;
  assert.equal(said, uncounted, 'the uncounted line adds up to the members outside "n of m"');
  // Each member has its line; one outside carries an ink mark (a note, not the ochre warning) on its chip.
  const verdicts = await page.$$eval('[data-future-verdict]', (els) => els.map((e) => e.getAttribute('data-future-verdict')));
  const members = await page.evaluate(() => window.__ctTest.store.members.value.length);
  assert.equal(verdicts.length, members, 'one line per member');
  assert.ok(verdicts.includes('outside'), `Seville's suggestion has a member outside by its period (${verdicts})`);
  // Drier is a note, never a loss (walk-through 2 N3): no "too dry" anywhere, and the note says watering.
  assert.doesNotMatch(await text(page, '[data-future]'), /too dry|dry by/i);
  const drier = await text(page, '[data-future-drier]');
  if (drier) assert.match(drier, /^Drier than where they are recorded by 20\d\d–20\d\d, may need watering: /);
  assert.ok(await has(page, '[data-mark="future"][data-mark-surface="chip"]', 10_000), 'a future mark on a chip');
  assert.equal(await page.$('[data-mark="future"].ct-flag'), null, 'drawn in ink, apart from the ochre warnings');
  // The scenario control: a real radio; SSP5-8.5 never puts fewer plants outside than SSP2-4.5.
  const outside = () => page.$$eval('[data-future-verdict="outside"]', (els) => els.length);
  const before = await outside();
  await page.click('input[name="ct-scenario"][value="ssp585"]');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.scenario.value === 'ssp585', { timeout: 5000 }).then(() => true, () => false), 'the radio writes store.scenario');
  assert.ok(await outside() >= before);
  const named = await page.$$eval('[data-future-verdict="inside"], [data-future-verdict="edge"], [data-future-verdict="outside"]', (els) => els.map((e) => e.textContent));
  assert.ok(named.length > 0 && named.every((t) => t.includes('SSP5-8.5')), `every checked line names the chosen scenario (${named.join(' | ')})`);
  // Without a location nothing shows.
  await page.evaluate(() => { window.__ctTest.store.location.value = null; });
  assert.ok(await page.waitForFunction(() => !document.querySelector('[data-future]') && !document.querySelector('[data-mark="future"]'), { timeout: 5000 }).then(() => true, () => false), 'no location: no panel and no future mark');
});

test('P5-19 (S5d not checked): with no future data for the site the panel says "not checked", never "fine"', async () => {
  const page = await tool();
  const full = await lookupAt(...SITES.lyon);
  await atSite(page, 'lyon', { climate: { ...full.climate, periods: full.climate.periods.slice(0, 1) } });
  await choose(page, 'Temperate');
  await page.evaluate(() => { const { store } = window.__ctTest; store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await has(page, '[data-future="not-checked"]', 10_000), 'the future panel says "not checked"');
  assert.match(await text(page, '[data-future="not-checked"]'), /not checked/);
  assert.equal(await page.$('[data-future-summary]'), null, 'no count that could read as "fine"');
  assert.equal(await page.$('[data-mark="future"]'), null);
});

test('P5-19b (S5d future panel, hand-off layout shift): the panel lands below Share, Print and Download, and nothing above it moves when it arrives', async () => {
  for (const width of [1280, 390]) {
    const page = await tool({ width });
    await atSite(page, 'lyon');
    // The after-the-matrix chunk (the panel's shell) waits, so the page is measured before the panel lands.
    await page.evaluate(() => window.__ctTest.holdLater());
    await page.click('input[name="ct-climate"][value="temperate"]');
    const suggest = await page.waitForFunction(() => [...document.querySelectorAll('.ct-cta button')].find((b) => b.textContent.trim() === 'Suggest plants'), { timeout: 10_000 });
    await suggest.click();
    assert.ok(await has(page, '.ct-action-row button', 10_000), `${width} px: the action row`);
    // Document positions of what a reader may be clicking: the tabs, Add plants, the action row's buttons.
    const spots = () => page.evaluate(() => [...document.querySelectorAll('.ct-tab, .ct-viewbar button, .ct-action-row button')].map((e) => Math.round(e.getBoundingClientRect().top + scrollY)));
    const before = await spots();
    assert.equal(await page.$('[data-future]'), null, `${width} px: measured before the panel`);
    await page.evaluate(() => window.__ctTest.releaseLater());
    assert.ok(await has(page, '[data-future-summary]', 10_000), `${width} px: the future panel lands`);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    assert.deepEqual(await spots(), before, `${width} px: the tabs and the actions stay where they were`);
    const [row, panel] = await page.evaluate(() => [document.querySelector('.ct-action-row').getBoundingClientRect().bottom, document.querySelector('[data-future]').getBoundingClientRect().top]);
    assert.ok(panel >= row, `${width} px: the panel is below the action row (${panel} < ${row})`);
    await page.browserContext().close().catch(() => {});
  }
});
