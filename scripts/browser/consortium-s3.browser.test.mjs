// Stream S3's browser tests (details dialog, correction form, Swap, Add, Search, Paste; review C1).
// S3 edits only this file among the browser tests and flips its todo tests as it builds them.
// Design check §7 BT-5, BT-6. Run capped: npm run test:browser (see consortium-commit0).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, loadState, startHarness } from './harness.mjs';
import { aria, axNodes, eachVariant, englishName, findAx, fixtureDb, has } from './helpers.mjs';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

const names = await fixtureDb((db) => Object.fromEntries(['Castanea sativa', 'Malus domestica', 'Juglans regia', 'Robinia pseudoacacia', 'Inga edulis'].map((c) => [c, englishName(db, c)])));
const chipOf = async (page, name) => (await axNodes(page)).find((n) => n.role === 'button' && (n.name ?? '').startsWith(name));
async function start(page, climate = 'Temperate') {
  await page.locator(aria('radio', climate)).click();
  assert.equal(await loadState(page), 'ready');
  await page.locator(aria('button', 'Suggest plants')).click();
  assert.ok(await findAx(page, { role: 'table' }), 'the matrix');
}
async function addPlant(page, name) {
  await page.locator(aria('button', 'Add plants')).click();
  await page.locator('::-p-aria([role="searchbox"]), ::-p-aria([role="combobox"])').fill(name);
  await page.locator(`::-p-aria([role="checkbox"][name^="${name}"]), ::-p-aria([role="option"][name^="${name}"])`).click();
}

test('BT-5 (S3 details): a chip opens a dialog with focus inside, photo and credit, placement, warning, estimates, sources and a correction form posting the release id; Escape returns focus', { todo: 'S3' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture', photos: true, correction: 'ok' });
    await start(page);
    const chip = await chipOf(page, names['Castanea sativa']);
    assert.ok(chip, 'Castanea (a photo plant) is suggested');
    await page.locator(aria('button', chip.name)).click();
    const dialog = await findAx(page, { role: 'dialog' });
    assert.ok(dialog, 'a dialog');
    assert.ok(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"], dialog')), 'focus moves into the dialog');
    assert.ok(await findAx(page, { role: 'img', name: /./ }), 'the photo, with its alt text');
    assert.ok(await findAx(page, { name: /Wikimedia Commons|iNaturalist|CC/ }), 'the photo credit');
    assert.ok(await has(page, '::-p-aria(Placed for the Temperate climate)'));
    assert.ok(await findAx(page, { name: /With a warning|estimate/ }), 'warning or estimate words');
    assert.ok(await findAx(page, { role: 'heading', name: /Sources/ }), 'the sources');
    await page.locator('::-p-aria([role="textbox"])').fill('The height looks wrong.');
    await page.locator(aria('button', 'Send')).click();
    await findAx(page, { name: /Thank you|Sent/ });
    assert.equal(page.correctionPosts.length, 1, 'one POST to /api/correction');
    assert.match(page.correctionPosts[0], new RegExp(fixture().releaseId), 'the post names the data release');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent), chip.name, 'focus returns to the chip');
  });
});

test('BT-5 (S3 details, offline): a correction sent offline says "Not sent" and keeps the text with Try again', { todo: 'S3' }, async () => {
  const page = await h.open('/consortium/', { data: 'fixture', correction: 'offline' });
  await start(page);
  const chip = await chipOf(page, names['Castanea sativa']);
  await page.locator(aria('button', chip.name)).click();
  await page.locator('::-p-aria([role="textbox"])').fill('Kept text');
  await page.locator(aria('button', 'Send')).click();
  assert.ok(await findAx(page, { name: /Not sent: you seem offline/ }));
  assert.ok(await has(page, aria('button', 'Try again')));
  assert.equal(await page.$eval('textarea', (el) => el.value), 'Kept text');
});

test('BT-6 (S3 adjust): Swap shows "Also fills…", a high conflict asks and an invasive warning does not, Remove then Undo, Keep pins, "Add 2 plants", Paste offers Add anyway with a labelled chip', { todo: 'S3' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await h.open('/consortium/', { ...v, data: 'fixture' });
    await start(page);
    const first = (await axNodes(page)).find((n) => n.role === 'button' && / · /.test(n.name ?? ''));
    await page.locator(aria('button', first.name)).click();
    await page.locator(aria('button', 'Swap')).click();
    assert.ok(await findAx(page, { name: /^Also fills/ }), 'Swap shows "Also fills…"');
    await page.keyboard.press('Escape');

    // Juglans next to Malus: a high conflict (genus allelopathic harm) asks first.
    if (!(await chipOf(page, names['Malus domestica']))) await addPlant(page, names['Malus domestica']);
    await addPlant(page, names['Juglans regia']);
    assert.ok(await findAx(page, { role: 'alertdialog' }) ?? await findAx(page, { role: 'dialog', name: /conflict|harm/i }), 'a high conflict asks');
    await page.keyboard.press('Escape');
    // Robinia: an invasive warning is shown but never asks.
    await addPlant(page, names['Robinia pseudoacacia']);
    assert.equal(await findAx(page, { role: 'alertdialog' }, 800), null, 'an invasive warning does not ask');

    // Remove, then Undo; Keep shows the pin.
    const chip = await chipOf(page, names['Malus domestica']);
    await page.locator(aria('button', chip.name)).click();
    await page.locator(aria('button', 'Remove')).click();
    assert.equal(await chipOf(page, names['Malus domestica']), undefined);
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await chipOf(page, names['Malus domestica']), 'Undo restores the plant');
    await page.locator(aria('button', (await chipOf(page, names['Malus domestica'])).name)).click();
    await page.locator(aria('button', 'Keep')).click();
    assert.ok(await findAx(page, { role: 'button', name: /Kept|Unpin/ }), 'Keep shows the pin');
    await page.keyboard.press('Escape');

    // Add with two selected.
    await page.locator(aria('button', 'Add plants')).click();
    const boxes = (await axNodes(page)).filter((n) => n.role === 'checkbox' && !n.checked).slice(0, 2);
    for (const b of boxes) await page.locator(aria('checkbox', b.name)).click();
    assert.ok(await has(page, aria('button', 'Add 2 plants')));
    await page.keyboard.press('Escape');

    // Paste a Tropical-only plant from Temperate: Add anyway, then a chip labelled with its list.
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('::-p-aria([role="textbox"])').fill('Inga edulis');
    await page.locator(aria('button', 'Add anyway')).click();
    assert.ok(await findAx(page, { role: 'button', name: new RegExp(`${names['Inga edulis']}.*From the Tropical list`) }), 'the guest chip is labelled');
  });
});
