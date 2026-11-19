// Stream S3's browser tests (details dialog, correction form, Swap, Paste; review C1; the Add and Search sheets went in PP-C commit 0).
// Design check §7 BT-5, BT-6. Run capped: npm run test:browser (see consortium-commit0).
//
// Every step uses the page's own controls. The test hook (src/islands/consortium/test-hook.ts; a page
// whose script sets window.__ctTest = true, on the npm run build:browser-test build) is used only to read membership
// and guests, to set up a consortium no control makes in one step (a member taken out mid-sheet, deep
// shade without a re-suggestion), and to make a sheet's chunk fail to load.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, loadState, startHarness } from './harness.mjs';
import { aria, axNodes, behaviour, en, englishName, findAx, fixtureDb, has } from './helpers.mjs';
import { openCards } from './location-fixtures.mjs';
import { toPlace } from './seams-helpers.mjs';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

const CANON = ['Castanea sativa', 'Malus domestica', 'Juglans regia', 'Robinia pseudoacacia', 'Inga edulis'];
const names = await fixtureDb((db) => Object.fromEntries(CANON.map((c) => [c, englishName(db, c)])));
const chipNow = async (page, name) => (await axNodes(page)).find((n) => n.role === 'button' && (n.name ?? '').startsWith(name));
// On a phone the matrix shows one stage at a time (S2's stepper, opening on the first stage):
// step through the stages like a reader until the plant's chip shows.
async function chipOf(page, name) {
  const first = await chipNow(page, name);
  if (first) return first;
  for (let i = 0; i < 6 && (await has(page, '::-p-aria(Earlier stage)[aria-disabled="false"], ::-p-aria(Earlier stage):not([aria-disabled])', 200)); i++) {
    await page.locator(aria('button', 'Earlier stage')).click();
  }
  for (let i = 0; i <= 6; i++) {
    const chip = await chipNow(page, name);
    if (chip) return chip;
    if (!(await has(page, aria('button', 'Later stage'), 300))) return undefined;
    await page.locator(aria('button', 'Later stage')).click();
  }
  return chipNow(page, name);
}

// The page, with the test hook.
// The hook is compiled in only by npm run build:browser-test (CANOPI_BROWSER_TEST=1; never for production).
async function open(opts) {
  const page = await h.open('/palette/', { ...opts, hook: true });
  return page;
}
const hooked = async (page, fn, ...args) => {
  const ok = await page.waitForFunction(() => typeof window.__ctTest === 'object', { timeout: 20_000 }).then(() => true, () => false);
  assert.ok(ok, 'the test hook: build with npm run build:browser-test');
  return page.evaluate(fn, ...args);
};

async function start(page, climate = 'Temperate') {
  await openCards(page);
  await page.locator(aria('radio', climate)).click();
  assert.equal(await loadState(page), 'ready');
  await page.locator(aria('button', en['consortium.start.suggest'])).click();
  assert.ok(await has(page, '.ct-palette-page:not([data-palette-placeholder]) h2[data-view-heading]', 8000), 'the palette page');
}
// Opens a sheet by its button. "Paste a list" from the palette page is Find's "Paste a list of plants"
// (board Find: at the foot of its start); Place's desk button is there only before a palette exists.
async function openBy(page, button) {
  if (button === 'Paste a list' && !(await has(page, aria('button', button), 300))) {
    await hooked(page, () => window.__ctTest.openFind());
    await page.locator('dialog.ct-find[open] [data-find-paste]').click();
    assert.ok(await has(page, 'dialog[open] #ct-paste-text', 4000), 'the paste list in Find');
    return;
  }
  await page.locator(aria('button', button)).click();
  assert.ok(await findAx(page, { role: 'dialog' }), `the ${button} sheet`);
}
// Add one plant of the list in Find opened from the palette page: its name searched, its row's Add,
// then Done (Find's own cases: consortium-pp-c1). The page stays the palette page.
async function addPlant(page, canonical) {
  await hooked(page, () => window.__ctTest.openFind());
  assert.ok(await findAx(page, { role: 'dialog' }), 'the Find sheet');
  await page.locator('dialog.ct-find[open] [data-find-search]').fill(canonical);
  const add = await page.waitForFunction((n) => [...document.querySelectorAll('dialog.ct-find[open] [data-find-row]')].find((r) => r.querySelector('.ct-sci')?.textContent.trim() === n)?.querySelector('[data-find-add]'), { timeout: 8000 }, canonical);
  await add.click();
  await page.locator(`dialog.ct-find[open] ${aria('button', 'Done')}`).click();
  await closed(page);
}
// Membership by canonical name, through the store.
const isMember = (page, canonical) => hooked(page, (c) => window.__ctTest.store.memberTaxa.value.some((t) => t.canonical_name === c), canonical);
const dropMember = (page, canonical) => hooked(page, (c) => { const { store } = window.__ctTest; const id = store.memberTaxa.value.find((t) => t.canonical_name === c)?.id; store.members.value = store.members.value.filter((y) => y !== id); }, canonical);
const guestFrom = (page, canonical) => hooked(page, (c) => { const { store } = window.__ctTest; const t = store.memberTaxa.value.find((x) => x.canonical_name === c); return t ? store.guests.value[t.id] ?? null : null; }, canonical);

// "Send suggestion", centred first: at the sheet's bottom edge it sits under the toast of the suggested
// palette's Undo (PP-B3), which a grower would scroll past.
async function pressSend(page) {
  await page.$$eval('dialog[open] button[type="submit"]', (els) => els.find((b) => b.textContent.trim() === 'Send suggestion')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.locator(aria('button', 'Send suggestion')).click();
}
// Opens the correction form, picks the height, writes, consents and sends.
async function sendCorrection(page, text) {
  // Pressed from the keyboard: the names section just opened above it still moves the sheet, and a
  // mouse click measured a moment earlier landed on a Swap button at 390 px.
  const open_ = await page.waitForSelector(aria('button', 'Suggest a correction'));
  await open_.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('dialog select');
  await page.select('dialog select', 'height_m');
  await page.locator('::-p-aria([role="textbox"])').fill(text);
  // The consent pressed from the keyboard too: the opening form still moves the sheet at 390 px.
  const consent = await page.waitForSelector(aria('checkbox', 'I agree my suggestion is published under CC BY-SA 4.0'));
  await consent.focus();
  await page.keyboard.press('Space');
  await pressSend(page);
}

test('BT-5 (S3 details): a chip opens a dialog with focus inside, photo and credit, placement, warning, sources and a correction form posting the release id; Escape returns focus', async (t) => {
  await behaviour(t, async (v) => {
    const page = await open({ ...v, data: 'fixture', photos: true, correction: 'ok' });
    await start(page);
    const chip = await chipOf(page, names['Castanea sativa']);
    assert.ok(chip, 'Castanea (a photo plant) is suggested');
    await page.locator(aria('button', chip.name)).click();
    const dialog = await findAx(page, { role: 'dialog' });
    assert.ok(dialog, 'a dialog');
    assert.ok(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"], dialog')), 'focus moves into the dialog');
    assert.ok(await findAx(page, { role: 'img', name: `Photo of ${names['Castanea sativa']}` }), 'the photo, with its alt text');
    assert.ok(await findAx(page, { name: /Wikimedia Commons|iNaturalist|CC/ }), 'the photo credit');
    // v14 boards Details, DetailsMore (main h3 M20): the list the plant is placed from is named under its
    // name; the warnings sit in "With your other plants and warnings", the sources in "Names, why it is
    // here, sources", which the reader opens before "Suggest a correction".
    assert.match(await page.$eval('dialog[open] .ct-d-name', (e) => e.textContent), /Castanea sativa · Temperate list/, 'placed from the Temperate list');
    assert.ok(await findAx(page, { role: 'heading', name: /^With your other plants and warnings/ }), 'the warning section');
    await page.locator('dialog[open] details[data-more="names"] summary').click();
    assert.ok(await findAx(page, { role: 'heading', name: /^Sources and how sure we are/ }), 'the sources');
    await sendCorrection(page, 'The height looks wrong.');
    assert.ok(await findAx(page, { name: /^Thank you/ }), 'sent');
    assert.equal(page.correctionPosts.length, 1, 'one POST to /api/correction');
    assert.match(page.correctionPosts[0], new RegExp(fixture().releaseId), 'the post names the data release');
    const body = JSON.parse(page.correctionPosts[0]);
    assert.deepEqual([body.climate, body.site_climate, body.placement_estimate], ['Temperate', 'Temperate', false], 'its own placement: the site climate is the list, no estimate');
    await page.keyboard.press('Escape');
    // Wait for the app to take the sheet down, not only for the browser to close the <dialog>: the
    // dialog's open flag drops and the browser puts the focus back on the chip at once, but the
    // 'close' event the app listens to is a later task. An openSheet in that gap was closed by the
    // old dialog's close handler (ho-misc: 2 in 80 runs under load; deterministic with close() and
    // openSheet in one task).
    await page.waitForFunction(() => !document.querySelector('dialog.ct-sheet'));
    await page.waitForFunction((name) => (document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent) === name, { timeout: 2000 }, chip.name).catch(() => {});
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent), chip.name, 'focus returns to the chip');
    // (The estimate tag on derived flowering months is pf-f's PFF10, on the v14 Flowers row; main h3 M20.)
    await page.close();
  }, { phone: true });
});

test('BT-5 (S3 details, offline): a correction sent offline says "Not sent" and keeps the text with Try again', async () => {
  const page = await open({ data: 'fixture', correction: 'offline' });
  await start(page);
  const chip = await chipOf(page, names['Castanea sativa']);
  await page.locator(aria('button', chip.name)).click();
  await sendCorrection(page, 'Kept text');
  assert.ok(await findAx(page, { name: /Not sent: you seem offline/ }));
  assert.ok(await has(page, aria('button', 'Try again')));
  assert.equal(await page.$eval('textarea', (el) => el.value), 'Kept text');
  await page.close();
});

test('BT-6 (S3 adjust; PP-C c2 merge; main h3 M20): an invasive warning adds in one tap, Remove then Undo, Find adds a plant of another list, its Details naming the list', async (t) => {
  await behaviour(t, async (v) => {
    const page = await open({ ...v, data: 'fixture' });
    await start(page);
    // (v14 board Swap has no "Also fills…": that part went with the old Swap, main h3 M20.)
    // The Add sheet's conflict row and its ticks went with Add (PP-C commit 0); Find's are c1's cases.
    for (const c of ['Juglans regia', 'Robinia pseudoacacia']) if (await isMember(page, c)) await dropMember(page, c);
    if (!(await isMember(page, 'Malus domestica'))) await addPlant(page, 'Malus domestica');
    assert.ok(await isMember(page, 'Malus domestica'), 'Malus is in');
    // Robinia: an invasive warning is shown and adds in one tap too (France: recorded invasive).
    if (await sheetOpen(page)) await page.locator('dialog[open] ' + aria('button', 'Close')).click();
    await closed(page);
    // The country line is Place's (v14: the palette page has none): "Your place", the board's picker
    // ("Change", "France" typed into "Your country", Enter), then back to the palette.
    await toPlace(page);
    await page.locator('[data-ct="country"] button[aria-expanded]').click();
    await page.locator(aria('textbox', 'Your country')).fill('France');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => /France/.test(document.querySelector('[data-ct="country"]')?.textContent ?? '') && /chosen by you/.test(document.querySelector('[data-ct="country"]')?.textContent ?? ''), { timeout: 4000 });
    await page.locator(aria('button', 'Back to my palette')).click();
    assert.ok(await has(page, '.ct-palette-page:not([data-palette-placeholder]) h2[data-view-heading]', 8000), 'back on the palette page');
    await addPlant(page, 'Robinia pseudoacacia');
    assert.equal(await findAx(page, { role: 'alertdialog' }, 800), null, 'an invasive warning does not ask');
    assert.ok(await isMember(page, 'Robinia pseudoacacia'), 'Robinia is added');

    // Remove, then Undo (Keep and its pin went in PP-B commit 0a').
    const chip = await chipOf(page, names['Malus domestica']);
    await page.locator(aria('button', chip.name)).click();
    await page.locator(aria('button', 'Remove')).click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    // (A button named Apple may stay: the Next step can offer it again for the hole its removal opens.)
    assert.equal(await isMember(page, 'Malus domestica'), false, 'Remove takes the plant out');
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await isMember(page, 'Malus domestica'), 'Undo restores the plant');
    assert.ok(await chipOf(page, names['Malus domestica']), 'and its chip');

    // A Tropical-only plant from Temperate, through Find (PP-C c1): searched by name, it is offered
    // "Add from the Tropical list"; once added, a chip labelled with its list. (The Paste sheet's
    // "Add anyway" is the S3 review cases below.)
    await hooked(page, () => window.__ctTest.openFind());
    await page.locator('dialog.ct-find[open] [data-find-search]').fill('Inga edulis');
    await page.locator(`dialog.ct-find[open] ${aria('button', 'Add from the Tropical list')}`).click();
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.memberTaxa.value.some((t) => t.canonical_name === 'Inga edulis'), { timeout: 5000 }).then(() => true, () => false), 'Inga is added');
    await page.locator(`dialog.ct-find[open] ${aria('button', 'Done')}`).click();
    await closed(page);
    assert.equal(await guestFrom(page, 'Inga edulis'), 'Tropical', 'Inga is a guest from the Tropical list');
    // Its Details, opened from Your plants, says where it comes from (owner row: "From the {climate} list").
    await page.locator(`.ct-plants ${aria('button', names['Inga edulis'])}`).click();
    assert.ok(await findAx(page, { name: /From the Tropical list/ }), 'labelled "From the Tropical list"');
    await page.close();
  }, { phone: true });
});

const sheetOpen = (page) => page.evaluate(() => !!document.querySelector('dialog[open]'));
// Closed means the app took the sheet down (the element is gone), not only the <dialog> closing (BT-5's note).
const closed = (page) => page.waitForFunction(() => !document.querySelector('dialog[open], dialog.ct-sheet'));
const setStore = (page, fn, ...args) => hooked(page, fn, ...args);
// The paste list's "Add N plants" done: back to Find (board Find; the paste is a step of Find).
const pasteDone = (page) => page.waitForFunction(() => !document.querySelector('dialog[open] #ct-paste-text') && !!document.querySelector('dialog.ct-find[open] [data-find-search]'), { timeout: 4000 });

test('BT-5 (S3 review): the correction draft survives closing; a drag released on the backdrop does not close; focus moves into and out of the form', async () => {
  const page = await open({ width: 1280, data: 'fixture', correction: 'offline' });
  await start(page);
  const chip = await chipOf(page, names['Castanea sativa']);
  await page.locator(aria('button', chip.name)).click();
  await page.locator(aria('button', 'Suggest a correction')).click();
  await page.waitForFunction(() => document.activeElement?.id === 'ct-corr-field', { timeout: 2000 }).catch(() => {});
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'ct-corr-field', 'the first field takes the focus');
  await page.locator(aria('button', 'Cancel')).click();
  await page.waitForFunction(() => document.activeElement?.textContent === 'Suggest a correction', { timeout: 2000 }).catch(() => {});
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Suggest a correction', 'Cancel gives the focus back');
  await page.locator(aria('button', 'Suggest a correction')).click();
  await page.locator('::-p-aria([role="textbox"])').fill('A draft');
  // A text selection dragged out over the backdrop and released there keeps the sheet.
  const box = await (await page.$('dialog[open] textarea')).boundingBox();
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(80, 400, { steps: 4 });
  await page.mouse.up();
  assert.ok(await sheetOpen(page), 'a drag released on the backdrop keeps the sheet');
  await page.keyboard.press('Escape');
  await closed(page);
  await page.locator(aria('button', chip.name)).click();
  await page.waitForSelector('dialog[open] textarea');
  assert.equal(await page.$eval('dialog[open] textarea', (el) => el.value), 'A draft', 'the draft is back');
  await page.close();
});

test('BT-6 (S3 review): Undo goes away when the consortium changes another way; a sheet that fails to load says so with Reload', async () => {
  const page = await open({ width: 1280, data: 'fixture' });
  await start(page);
  const chip = await chipOf(page, names['Castanea sativa']);
  await page.locator(aria('button', chip.name)).click();
  await page.locator(aria('button', 'Remove')).click();
  await closed(page);
  assert.ok(await has(page, aria('button', 'Undo')), 'Undo after Remove');
  // Another plant taken out through the store (no toast of its own; the pin this pressed went with Keep
  // in PP-B commit 0a'): a change to the members made since hides Undo.
  await setStore(page, () => { const { store } = window.__ctTest; store.members.value = store.members.value.slice(1); });
  assert.equal(await has(page, aria('button', 'Undo'), 800), false, 'a change made since hides Undo');

  // The page modulepreloads every chunk, so the hook makes the Swap chunk's import fail.
  await setStore(page, () => { const { store, openSheet, failSheets } = window.__ctTest; failSheets(); openSheet('swap', store.members.value[0]); });
  assert.ok(await findAx(page, { name: /could not open/ }), 'the failure is said');
  assert.ok(await has(page, aria('button', 'Reload')), 'with Reload');
  assert.equal(await sheetOpen(page), false, 'and the sheet is closed');
  await page.close();
});

test('BT-6 (S3 review): a pasted guest that misfits joins in one tap with its warning in words, no confirm step; the toast is heard over a sheet; after "Add all" its "Show the warning for …" opens the plant', async () => {
  const page = await open({ width: 1280, data: 'fixture' });
  await start(page);
  // The Add sheet's ticks and its 8-row query went with Add (PP-C commit 0); Find's are c1's cases.
  // Deep shade: a sun plant from the Tropical list misfits. Inform, don't block (owner 2026-11-14):
  // its row says in words that it is another climate's plant (fix round 1, A8: its list, and so its
  // misfit, is read only when it is added), one tap on "Add anyway" adds it, and the toast names the
  // warning.
  await setStore(page, () => { const { store } = window.__ctTest; store.siteEdits.value = { light: 'shade' }; });
  await openBy(page, 'Paste a list');
  await page.locator('::-p-aria([role="textbox"])').fill('Inga edulis');
  assert.ok(await page.waitForFunction(() => /Tropical/.test(document.querySelector('dialog[open] [data-paste-row][data-status="other"]')?.textContent ?? ''), { timeout: 4000 }).then(() => true, () => false), 'the guest row says in words it is from the Tropical list');
  await page.locator(aria('button', 'Add anyway')).click();
  assert.equal(await guestFrom(page, 'Inga edulis'), 'Tropical', 'the guest joins at once');
  assert.equal(await page.$('dialog[role="alertdialog"]'), null, 'no confirm step');
  assert.ok(await sheetOpen(page), 'the Paste sheet stays');
  assert.ok(await findAx(page, { name: /^Show the warning for / }), 'the toast names the warning: its Show the warning for the plant (board Toasts, M45, R6)');
  assert.ok(await has(page, aria('button', 'Undo')), 'the toast is reachable over the sheet');

  // Pear (a member of the suggestion) is taken out, then pasted back in deep shade: it misfits.
  if (await isMember(page, 'Pyrus communis')) await dropMember(page, 'Pyrus communis');
  await page.locator('::-p-aria([role="textbox"])').fill('Pyrus communis');
  await page.locator(aria('button', 'Add 1 plant')).click();
  await pasteDone(page);
  assert.ok(await findAx(page, { name: /^Show the warning for / }), '"Show the warning for Pear"');
  await page.locator('.ct-toast .ct-toast-action').click();
  assert.ok(await findAx(page, { role: 'dialog' }), 'Show opens the plant');
  await page.close();
});

test('BT-5 (S3 review 2): after a send no draft is kept, even with the email filled; a restored draft leaves the focus on the heading', async () => {
  const page = await open({ width: 1280, data: 'fixture', correction: 'ok' });
  await start(page);
  const chip = await chipOf(page, names['Castanea sativa']);
  await page.locator(aria('button', chip.name)).click();
  await page.locator(aria('button', 'Suggest a correction')).click();
  await page.waitForSelector('dialog input[type="email"]');
  await page.type('dialog input[type="email"]', 'reader@example.org');
  await page.keyboard.press('Escape');
  await closed(page);
  await page.locator(aria('button', chip.name)).click();
  assert.ok(await findAx(page, { role: 'button', name: 'Suggest a correction' }), 'an email alone is no draft');
  await page.locator(aria('button', 'Suggest a correction')).click();
  await page.waitForSelector('dialog select');
  await page.select('dialog select', 'height_m');
  await page.locator('::-p-aria([role="textbox"])').fill('The height looks wrong.');
  await page.type('dialog input[type="email"]', 'reader@example.org');
  await page.locator(aria('checkbox', 'I agree my suggestion is published under CC BY-SA 4.0')).click();
  await pressSend(page);
  assert.ok(await findAx(page, { name: /^Thank you/ }), 'sent');
  await page.locator(aria('button', 'Suggest another')).click();
  await page.keyboard.press('Escape');
  await closed(page);
  await page.locator(aria('button', chip.name)).click();
  assert.ok(await findAx(page, { role: 'button', name: 'Suggest a correction' }), 'reopened after a send: the open button, no form');
  // A draft: typed, closed, reopened: the form is back, the focus is on the sheet's heading.
  await page.locator(aria('button', 'Suggest a correction')).click();
  await page.waitForSelector('dialog select');
  await page.select('dialog select', 'height_m');
  await page.locator('::-p-aria([role="textbox"])').fill('Unsent');
  await page.keyboard.press('Escape');
  await closed(page);
  await page.locator(aria('button', chip.name)).click();
  await page.waitForSelector('dialog[open] textarea');
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H2', 'the restored form does not take the focus');
  await page.close();
});

test('BT-6 (S3 review 2): a toast moving into a sheet is not announced again; "Add all" reads the text as it is when clicked', async () => {
  // A phone: Find is a modal sheet there (at 960 px and wider a panel, its toast stays in the page).
  const page = await open({ width: 390, data: 'fixture' });
  await start(page);
  const chip = await chipOf(page, names['Castanea sativa']);
  await page.locator(aria('button', chip.name)).click();
  await page.locator(aria('button', 'Remove')).click();
  await closed(page);
  await page.waitForSelector('.ct-toast');
  assert.ok(await page.$eval('.ct-toast', (el) => !!el.closest('[aria-live]')), 'the toast is announced where it is first shown');
  await openBy(page, 'Paste a list');
  await page.waitForSelector('dialog[open] .ct-toast');
  assert.ok(await page.$eval('dialog[open] .ct-toast', (el) => !el.closest('[aria-live]')), 'moved into the sheet, it is not in a live region');
  await setStore(page, () => { window.__ctTest.store.members.value = []; });
  await page.locator('::-p-aria([role="textbox"])').fill('Malus domestica');
  await page.waitForFunction(() => /Add 1/.test(document.querySelector('dialog[open] .ct-add-bar .button-primary')?.textContent ?? ''));
  await page.$eval('dialog[open] textarea', (el) => { el.value = 'Malus domestica\nCastanea sativa'; el.dispatchEvent(new Event('input', { bubbles: true })); el.closest('dialog').querySelector('.ct-add-bar .button-primary').click(); });
  await pasteDone(page);
  assert.ok(await isMember(page, 'Malus domestica') && await isMember(page, 'Castanea sativa'), 'both lines are added');
  await page.close();
});

// W4 (review paste-2, pf-2): "Add anyway" leaves the list as the plant joins, so the focus moves on, never
// to <body> and never stays on the pressed (removed) button: to the next row's "Add anyway", else the
// row before's, else the count line (fix round 1, B10: the paste in its order, no "Already in" group;
// a joined row says "In your palette", its button gone).
test('BT-6 (S3 paste focus): Enter on "Add anyway" moves the focus to the next row\'s, else the row before\'s, then to the count line, never to <body> or the pressed button', async () => {
  const page = await open({ width: 1280, data: 'fixture' });
  await start(page);
  const [A, B, C] = ['Inga edulis', 'Musa acuminata', 'Carica papaya'];
  for (const c of [A, B, C]) if (await isMember(page, c)) await dropMember(page, c);
  await openBy(page, 'Paste a list');
  await page.locator('::-p-aria([role="textbox"])').fill([A, B, C].join('\n'));
  const rows = 'dialog[open] [data-paste-row][data-status="other"]';
  assert.ok(await page.waitForFunction((sel) => document.querySelectorAll(`${sel} button`).length === 3, { timeout: 5000 }, rows).then(() => true, () => false), 'three rows from another list');
  // The "Add anyway" of a plant's row, by its scientific name.
  const buttonOf = (name) => page.evaluate((sel, n) => [...document.querySelectorAll(sel)].find((li) => li.querySelector('.ct-sci')?.textContent === n)?.querySelector('button')?.getAttribute('aria-describedby') ?? null, rows, name);
  const settle = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50)))));
  const focused = () => page.evaluate(() => {
    const a = document.activeElement;
    return { body: !a || a === document.body, inSheet: !!a?.closest('dialog[open]'), pressed: a?.dataset?.pressed === '1', tag: a?.tagName ?? null, text: a?.textContent?.trim() ?? '', describedby: a?.getAttribute('aria-describedby') ?? null };
  });
  // Presses a row's "Add anyway" by keyboard, the button tagged so the focus is never found on it again.
  const press = async (name) => {
    await page.evaluate((sel, n) => { const b = [...document.querySelectorAll(sel)].find((li) => li.querySelector('.ct-sci')?.textContent === n).querySelector('button'); b.dataset.pressed = '1'; b.focus(); }, rows, name);
    await page.keyboard.press('Enter');
    await settle();
    const at = await focused();
    assert.ok(!at.body && at.inSheet && !at.pressed, `after ${name}: the focus stays in the sheet, off the pressed button (${JSON.stringify(at)})`);
    assert.ok(await isMember(page, name), `${name} joined`);
    return at;
  };
  const b = await buttonOf(B);
  assert.equal((await press(C)).describedby, b, 'the last row: the focus goes to the row before\'s "Add anyway"');
  assert.equal((await press(A)).describedby, b, 'the first row: the focus goes to the next row\'s');
  const at = await press(B);
  assert.match(at.text, /names read/i, `no row left to add: the count line (${JSON.stringify(at)})`);
  await page.close();
});
