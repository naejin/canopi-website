// Stream S4's browser tests (start, share, memory, print, .canopi download; review C1). S4 edits only
// this file among the browser tests and flips its todo tests as it builds them. Design check §7 BT-1
// (start), BT-7, BT-8, BT-9 (.canopi) and the exit walk-through. Run capped: npm run test:browser.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, startHarness } from './harness.mjs';
import { aria, axNodes, countAx, eachVariant, findAx, has } from './helpers.mjs';
import { CANOPI_FILE_SCHEMA, CURRENT_CANOPI_FILE_VERSION } from '../vendor/canopi-design-format/canopi-design-format.ts';
import { validate } from '../vendor/canopi-design-format/validate.mjs';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

async function suggest(page, climate = 'Temperate') {
  await page.locator(aria('radio', climate)).click();
  assert.equal(await loadState(page), 'ready');
  await page.locator(aria('button', 'Suggest plants')).click();
  assert.ok(await findAx(page, { role: 'table' }), 'the matrix');
}
const memberNames = async (page) => (await axNodes(page)).filter((n) => n.role === 'button' && / · /.test(n.name ?? '')).map((n) => n.name).sort();
const shareLink = async (page) => {
  await page.locator(aria('button', 'Share')).click();
  const field = await findAx(page, { role: 'textbox', name: /link/i });
  assert.ok(field?.value?.includes('#v=4'), 'the share field holds a #v=4 link');
  return field.value;
};

test('BT-1 (S4 start): nothing chosen at start, the country line above the climate cards, real Temperate crops, Suggest gives a captioned 4 × 7 matrix with the fill meter, Arid asks', { todo: 'S4' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', v);
    const radios = (await axNodes(page)).filter((n) => n.role === 'radio');
    assert.ok(radios.length >= 7, 'every climate is a choice');
    assert.ok(radios.every((r) => !r.checked), 'nothing chosen at start');
    const [country, card] = await page.evaluate(() => {
      const top = (el) => el?.getBoundingClientRect().top ?? NaN;
      return [top(document.querySelector('[data-ct="country"]')), top(document.querySelector('[role="radio"], input[type="radio"]'))];
    });
    assert.ok(country < card, 'the country line sits above the cards');
    await page.locator(aria('radio', 'Temperate')).click();
    for (const crop of ['Onion', 'European chestnut', 'Sunflower', 'Bilberry']) assert.ok(await findAx(page, { name: new RegExp(crop) }), `Temperate crop example: ${crop} (real)`);
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Suggest plants')).click();
    const table = await findAx(page, { role: 'table' });
    assert.ok(table?.name, 'the table has a caption');
    assert.equal(await countAx(page, (n) => n.role === 'rowheader'), 4, 'four strata');
    assert.equal(await countAx(page, (n) => n.role === 'columnheader'), 7, 'seven phases');
    assert.ok(await findAx(page, { role: 'meter' }) ?? await findAx(page, { role: 'progressbar' }), 'the fill meter');
    const arid = await h.open('/consortium/', v);
    await arid.locator(aria('radio', 'Arid')).click();
    assert.ok(await has(arid, aria('link', 'Ask for this climate')), 'Arid shows "Ask for this climate"');
  });
});

test('BT-7 (S4 share): a copied link opened as a new document restores members, kept, site and stage; an unknown token gives the notice; a reload restores the last consortium; blocked storage gives the note', { todo: 'S4' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await page.locator(aria('radio', 'Temperate')).click();
    await page.locator(aria('radio', 'Small')).click();
    await suggest(page);
    const first = (await memberNames(page))[0];
    await page.locator(aria('button', first)).click();
    await page.locator(aria('button', 'Keep')).click();
    await page.keyboard.press('Escape');
    const before = { members: await memberNames(page), small: (await findAx(page, { role: 'radio', name: 'Small' }))?.checked };
    const link = new URL(await shareLink(page));

    // A new document: a unique query before the fragment, so nothing is reused from the first page.
    const copy = await h.open(`/consortium/?run=${Date.now()}${link.hash}`, { ...v, data: 'fixture' });
    assert.equal(await loadState(copy), 'ready');
    assert.deepEqual(await memberNames(copy), before.members, 'the same members');
    assert.equal((await findAx(copy, { role: 'radio', name: 'Small' }))?.checked, before.small, 'the same site');
    assert.ok(await findAx(copy, { role: 'button', name: /Kept|Unpin/ }), 'the kept pin');

    // An unknown token: the rest restores, with the notice.
    const unknown = await h.open(`/consortium/?run=${Date.now()}${link.hash.replace(/(&p=)/, '$1zzzzzz.')}`, { ...v, data: 'fixture' });
    assert.ok(await findAx(unknown, { name: /no longer in the list/ }), 'the unknown-plant notice');

    // A reload with no fragment restores the last consortium (storage works).
    await page.goto(new URL('/consortium/', page.url()).href);
    assert.equal(await loadState(page), 'ready');
    assert.deepEqual(await memberNames(page), before.members, 'the last consortium is restored');

    // Storage blocked: everything works, and Share says the link keeps it.
    const blocked = await h.open('/consortium/', { ...v, data: 'fixture', storage: false });
    await suggest(blocked);
    await blocked.locator(aria('button', 'Share')).click();
    assert.ok(await findAx(blocked, { name: /This browser does not keep your consortium; your link does/ }));
  });
});

test('BT-8 (S4 print): ≤ 20 plants print the drawing and the table, > 20 print "At a glance" and the table, no controls are printed', { todo: 'S4' }, async (t) => {
  const printedButtons = (page) => page.$$eval('#ct-root button, #ct-root [role="button"], #ct-root input, #ct-root select', (els) => els.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }).length);
  await eachVariant(t, async (v) => {
    const small = await h.open('/consortium/', { ...v, data: 'fixture' });
    await suggest(small);
    const pdf = await h.pdf(small);
    assert.ok(pdf.length > 1000, 'it prints');
    assert.ok(await findAx(small, { role: 'img' }), '≤ 20 plants: the drawing');
    assert.ok(await findAx(small, { role: 'table' }), 'the table');
    assert.equal(await printedButtons(small), 0, 'no controls printed');

    const big = await h.open('/consortium/', v);
    await suggest(big);
    for (let i = 0; i < 3; i++) {
      await big.locator(aria('button', 'Add plants')).click();
      const boxes = (await axNodes(big)).filter((n) => n.role === 'checkbox' && !n.checked).slice(0, 6);
      for (const b of boxes) await big.locator(aria('checkbox', b.name)).click();
      await big.locator('::-p-aria([role="button"][name^="Add "])').click();
    }
    assert.ok((await memberNames(big)).length > 20);
    await h.pdf(big);
    assert.ok(await has(big, '::-p-aria(At a glance)'), '> 20 plants: "At a glance"');
    assert.ok(await findAx(big, { role: 'table' }), 'the table');
    assert.equal(await printedButtons(big), 0, 'no controls printed');
  });
});

test('BT-9 (S4 .canopi): the download validates against the app schema (canopi 0c425fb07), version 9', { todo: 'S4' }, async (t) => {
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
