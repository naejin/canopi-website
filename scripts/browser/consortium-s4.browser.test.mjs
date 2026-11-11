// Stream S4's browser tests (start, share, memory, print, .canopi download; review C1). S4 edits only
// this file among the browser tests and flips its todo tests as it builds them. Design check §7 BT-1
// (start), BT-7, BT-8, BT-9 (.canopi) and the exit walk-through. Run capped: npm run test:browser.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, startHarness } from './harness.mjs';
import { aria, axNodes, countAx, eachVariant, findAx, fixtureDb, has } from './helpers.mjs';
import { encodeLink } from '../../src/lib/consortium/state.ts';
import { CANOPI_FILE_SCHEMA, CURRENT_CANOPI_FILE_VERSION } from '../vendor/canopi-design-format/canopi-design-format.ts';
import { validate } from '../vendor/canopi-design-format/validate.mjs';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

// Choose a climate and press Suggest. Without S2's matrix yet, the result is seen through S4's own
// action row (Share, Print, Download for Canopi), which App.tsx shows once the plant list is ready.
async function suggest(page, climate = 'Temperate') {
  await page.locator(aria('radio', climate)).click();
  assert.equal(await loadState(page), 'ready');
  await page.locator(aria('button', 'Suggest plants')).click();
  assert.ok(await has(page, aria('button', 'Share'), 8000), 'the result and its actions');
}
const memberNames = async (page) => (await axNodes(page)).filter((n) => n.role === 'button' && / · /.test(n.name ?? '')).map((n) => n.name).sort();
const shareLink = async (page) => {
  await page.locator(aria('button', 'Share')).click();
  const field = await findAx(page, { role: 'textbox', name: /link/i });
  assert.ok(field?.value?.includes('#v=4'), 'the share field holds a #v=4 link');
  return field.value;
};
const hashOf = (url) => new URL(url).hash;
// A #v=4 link holding every Temperate plant of the fixture (21: above the print drawing's limit).
const allTemperateLink = () => fixtureDb((db) => {
  const ids = db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY 1").all().map((r) => String(r.id));
  const site = { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' };
  return { count: ids.length, fragment: encodeLink({ climate: 'Temperate', country: null, site, members: ids, kept: [], removed: [], guests: [], crops: [], stage: null }, { Temperate: ids }) };
});

test('BT-1 (S4 start): nothing chosen at start, the country line above the climate cards, real Temperate crops, Arid asks', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', v);
    assert.ok(await has(page, aria('radio', 'Temperate'), 8000), 'the climate cards');
    const radios = (await axNodes(page)).filter((n) => n.role === 'radio');
    assert.ok(radios.length >= 7, 'every climate is a choice');
    assert.ok(radios.every((r) => !r.checked), 'nothing chosen at start');
    const [country, card] = await page.evaluate(() => {
      const top = (el) => el?.getBoundingClientRect().top ?? NaN;
      return [top(document.querySelector('[data-ct="country"]')), top(document.querySelector('[role="radio"], input[type="radio"]'))];
    });
    assert.ok(country < card, 'the country line sits above the cards');
    await page.locator(aria('radio', 'Temperate')).click();
    for (const crop of ['Onion', 'European chestnut', 'Sunflower', 'Bilberry']) assert.ok(await findAx(page, { role: 'button', name: new RegExp(crop) }), `Temperate crop example: ${crop} (real)`);
    assert.equal(await loadState(page), 'ready');
    const arid = await h.open('/consortium/', v);
    await arid.locator(aria('radio', 'Arid')).click();
    assert.ok(await has(arid, aria('link', 'Ask for this climate')), 'Arid shows "Ask for this climate"');
  });
});

test('BT-1 (S4 start, matrix half): Suggest gives a captioned 4 × 7 matrix with the fill meter', { todo: 'S4 matrix half: needs S2 matrix view (Matrix.tsx is null until S2 merges)' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', v);
    await suggest(page);
    const table = await findAx(page, { role: 'table' });
    assert.ok(table?.name, 'the table has a caption');
    assert.equal(await countAx(page, (n) => n.role === 'rowheader'), 4, 'four strata');
    assert.equal(await countAx(page, (n) => n.role === 'columnheader'), 7, 'seven phases');
    assert.ok(await findAx(page, { role: 'meter' }) ?? await findAx(page, { role: 'progressbar' }), 'the fill meter');
  });
});

test('BT-7 (S4 share): a copied link opened as a new document restores the same consortium; an unknown token and an outdated link give their notices; a reload restores the last consortium', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    const crop = (await axNodes(page)).find((n) => n.role === 'button' && n.pressed === false);
    assert.ok(crop, 'a crop example to keep');
    await page.locator(aria('button', crop.name)).click();
    await page.locator(aria('radio', 'Small garden')).click();
    await suggest(page);
    const link = await shareLink(page);
    assert.match(link, /&m=small&/, 'the site is in the link');
    assert.match(link, /&a=[^&]*\*/, 'the kept crop is marked in the link');

    // A new document: a unique query before the fragment, so nothing is reused from the first page.
    // The restored consortium writes back the very same link (members, kept, crops, site, stage).
    const copy = await h.open(`/consortium/?run=${Date.now()}${hashOf(link)}`, { ...v, data: 'fixture' });
    assert.equal(await loadState(copy), 'ready');
    assert.equal(hashOf(await shareLink(copy)), hashOf(link), 'the same consortium');

    // An unknown token: the rest restores, with the notice.
    const unknown = await h.open(`/consortium/?run=${Date.now()}${hashOf(link).replace('&a=', '&a=zzzzzz')}`, { ...v, data: 'fixture' });
    assert.ok(await findAx(unknown, { name: /no longer in the list; the rest is restored/ }), 'the unknown-plant notice');
    // An outdated link (another version): calm copy, nothing restored.
    const old = await h.open(`/consortium/?run=${Date.now()}${hashOf(link).replace('v=4', 'v=3')}`, { ...v, data: 'fixture' });
    assert.ok(await findAx(old, { name: /from an older version of the tool/ }), 'the outdated-link notice');

    // A reload with no fragment restores the last consortium (storage works).
    await page.goto(new URL('/consortium/', page.url()).href);
    assert.equal(await loadState(page), 'ready');
    assert.equal(hashOf(await shareLink(page)), hashOf(link), 'the last consortium is restored');
  });
});

test('BT-7 (S4 share, blocked storage): everything works and Share says the link keeps it', { todo: 'S4 blocked storage: the sqlite-wasm bootstrap in S1 data/load.ts throws SecurityError when localStorage access throws, so the page shows the WebAssembly screen (hand-off)' }, async (t) => {
  await eachVariant(t, async (v) => {
    const blocked = await h.open('/consortium/', { ...v, data: 'fixture', storage: false });
    await suggest(blocked);
    await blocked.locator(aria('button', 'Share')).click();
    assert.ok(await findAx(blocked, { name: /This browser does not keep your consortium; your link does/ }));
  });
});

test('BT-7 (S4 share, views): the restored members and the kept pin as S2 and S3 show them', { todo: 'S4 views half: needs S2 member chips and S3 Keep (the link itself is checked above)' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(page);
    const first = (await memberNames(page))[0];
    await page.locator(aria('button', first)).click();
    await page.locator(aria('button', 'Keep')).click();
    await page.keyboard.press('Escape');
    const members = await memberNames(page);
    const copy = await h.open(`/consortium/?run=${Date.now()}${hashOf(await shareLink(page))}`, { ...v, data: 'fixture' });
    assert.deepEqual(await memberNames(copy), members, 'the same members');
    assert.ok(await findAx(copy, { role: 'button', name: /Kept|Unpin/ }), 'the kept pin');
  });
});

// The captions of the tables shown (the accessibility snapshot's interesting-only tree drops tables).
const shownTables = (page) => page.$$eval('#ct-root table', (els) => els.filter((el) => el.getBoundingClientRect().height > 0).map((el) => el.querySelector('caption')?.textContent?.trim() ?? ''));
const printedControls = (page) => page.$$eval('#ct-root button, #ct-root [role="button"], #ct-root input, #ct-root select, #ct-root a', (els) => els.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }).length);

test('BT-8 (S4 print): > 20 plants print "At a glance" and the table, ≤ 20 the table; no controls are printed', async (t) => {
  const all = await allTemperateLink();
  assert.ok(all.count > 20, 'the fixture has more than 20 Temperate plants');
  await eachVariant(t, async (v) => {
    const small = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(small);
    const pdf = await h.pdf(small);
    assert.ok(pdf.length > 1000, 'it prints');
    assert.deepEqual(await shownTables(small), ['The plants'], '≤ 20 plants: the table, no "At a glance"');
    assert.equal(await printedControls(small), 0, 'no controls printed');

    const big = await h.open(`/consortium/?run=${Date.now()}#${all.fragment}`, { ...v, data: 'fixture' });
    assert.equal(await loadState(big), 'ready');
    assert.ok(await has(big, aria('button', 'Share'), 8000), 'the restored consortium');
    await h.pdf(big);
    assert.ok(await has(big, '::-p-aria(At a glance)'), '> 20 plants: "At a glance"');
    assert.deepEqual(await shownTables(big), ['At a glance', 'The plants'], 'the table after "At a glance"');
    assert.equal(await printedControls(big), 0, 'no controls printed');
  });
});

test('BT-8 (S4 print, drawing): ≤ 20 plants print the side view drawing', { todo: 'S4 drawing: needs S2 side view; PrintSheet.tsx Drawing is null until it is wired' }, async (t) => {
  await eachVariant(t, async (v) => {
    const small = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(small);
    await h.pdf(small);
    assert.ok(await findAx(small, { role: 'img' }), '≤ 20 plants: the drawing');
  });
});

test('BT-9 (S4 .canopi): the download validates against the app schema (canopi 0c425fb07), version 9', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(page);
    await page.locator(aria('button', 'Download for Canopi')).click();
    let files = [];
    for (let i = 0; i < 40 && !files.length; i++) { await new Promise((r) => setTimeout(r, 150)); files = page.capturedDownloads(); }
    assert.equal(files.length, 1, 'one file downloaded');
    assert.match(files[0].name, /\.canopi$/);
    const doc = JSON.parse(files[0].bytes.toString('utf8'));
    assert.equal(doc.version, CURRENT_CANOPI_FILE_VERSION);
    assert.deepEqual(validate(CANOPI_FILE_SCHEMA, doc), [], 'valid against the app schema');
    assert.ok(doc.consortiums.length > 0, 'the members are in it');
  });
});

test('Exit walk-through (S4, every stream): on the real install, keyboard only: start → adjust → share → print → download', { todo: 'S4 last, after S1–S3' }, async () => {
  const page = await h.open('/consortium/');
  // Keyboard only: Tab to the Temperate choice, Space, Tab to Suggest, Enter.
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Temperate' || document.activeElement?.labels?.[0]?.textContent?.includes('Temperate'))) break;
  }
  await page.keyboard.press('Space');
  assert.equal(await loadState(page), 'ready');
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.textContent?.trim() === 'Suggest plants')) break;
  }
  await page.keyboard.press('Enter');
  assert.ok(await findAx(page, { role: 'table' }), 'the matrix, reached by keyboard');
  for (const name of ['Share', 'Print', 'Download for Canopi']) assert.ok(await has(page, aria('button', name)), `${name} is reachable`);
});
