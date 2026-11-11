// Stream S3's browser tests (details dialog, correction form, Swap, Add, Search, Paste; review C1).
// S3 edits only this file among the browser tests and flips its todo tests as it builds them.
// Design check §7 BT-5, BT-6. Run capped: npm run test:browser (see consortium-commit0).
//
// Built before the S2 matrix and the S4 start views were merged, so each step uses their controls when
// the page has them and otherwise the store: the page is opened with window.__ctTest = true, which
// makes views/Details.tsx put { store, openSheet } there (nothing in the site sets it). Without S4's
// climate radios the test chooses the climate and suggests through the store; without S2's chips it
// draws stand-in chip buttons (`<name> · <layer>`, data-plant-id, one per member, redrawn when the
// members change) that open details as a chip does, so focus return and Remove/Undo are tested; without
// S2's "Add plants" and S4's "Paste a list" it opens those sheets with openSheet. The guest chip label
// is S2's: without it the test checks the guest in the store and the "From the Tropical list" label in
// the Paste sheet. Once S2 and S4 are in, every fallback goes unused.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, loadState, startHarness } from './harness.mjs';
import { aria, axNodes, eachVariant, englishName, findAx, fixtureDb, has } from './helpers.mjs';

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
// The hook is compiled in only when the site is built with PUBLIC_CT_TEST_HOOK=1 (never for production).
async function open(opts) {
  const page = await h.open('/consortium/', opts);
  await page.evaluateOnNewDocument(() => { window.__ctTest = true; });
  await page.reload({ waitUntil: 'domcontentloaded' });
  return page;
}
async function needHook(page) {
  const ok = await page.waitForFunction(() => typeof window.__ctTest === 'object', { timeout: 20_000 }).then(() => true, () => false);
  assert.ok(ok, 'no S4 start view and no test hook: build with PUBLIC_CT_TEST_HOOK=1 npm run build');
}
const hooked = (page, fn, ...args) => page.evaluate(fn, ...args);

// Stand-in chips while the S2 matrix is not in the build (see the head of the file).
async function standInChips(page) {
  await hooked(page, () => {
    const { store, openSheet } = window.__ctTest;
    const box = document.createElement('div');
    box.id = 'ct-test-chips';
    document.getElementById('ct-root').prepend(box);
    const draw = () => {
      box.replaceChildren(...store.memberTaxa.value.map((t) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.plantId = t.id;
        b.textContent = `${t.names.en ?? t.canonical_name} · ${t.stratum?.value ?? 'none'}`;
        b.setAttribute('aria-label', b.textContent);
        b.addEventListener('click', () => openSheet('details', t.id));
        return b;
      }));
    };
    store.memberTaxa.subscribe(draw);
  });
}

async function start(page, climate = 'Temperate') {
  if (await has(page, aria('radio', climate), 1500)) {
    await page.locator(aria('radio', climate)).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Suggest plants')).click();
  } else {
    assert.equal(await loadState(page), 'ready');
    await needHook(page);
    await page.waitForFunction(() => window.__ctTest?.store?.source.value, { timeout: 20_000 });
    assert.ok(await hooked(page, async (c) => {
      const { store } = window.__ctTest;
      store.climate.value = c;
      await store.loadPool(c);
      return store.suggestMembers();
    }, climate), 'a suggestion through the store');
  }
  if (!(await findAx(page, { role: 'table' }, 1500))) await standInChips(page);
}
// Opens a sheet by its button, else through the store (S2/S4 controls not in the build).
async function openBy(page, button, kind) {
  if (await has(page, aria('button', button), 800)) await page.locator(aria('button', button)).click();
  else await hooked(page, (k) => window.__ctTest.openSheet(k), kind);
  assert.ok(await findAx(page, { role: 'dialog' }), `the ${kind} sheet`);
}
// Add one plant: tick it and "Add 1 plant", or, on a row that asks, its "Add {name}" button.
async function addPlant(page, name) {
  await openBy(page, 'Add plants', 'add');
  await page.locator('::-p-aria([role="searchbox"])').fill(name);
  const box = (await axNodes(page)).find((n) => n.role === 'checkbox' && (n.name ?? '').startsWith(name));
  if (box) {
    await page.locator(aria('checkbox', box.name)).click();
    await page.locator(aria('button', 'Add 1 plant')).click();
  } else {
    await page.locator(aria('button', `Add ${name}`)).click();
  }
}
// Membership by canonical name, through the store.
const isMember = (page, canonical) => hooked(page, (c) => window.__ctTest.store.memberTaxa.value.some((t) => t.canonical_name === c), canonical);
const dropMember = (page, canonical) => hooked(page, (c) => { const { store } = window.__ctTest; const id = store.memberTaxa.value.find((t) => t.canonical_name === c)?.id; store.members.value = store.members.value.filter((y) => y !== id); }, canonical);
const guestFrom = (page, canonical) => hooked(page, (c) => { const { store } = window.__ctTest; const t = store.memberTaxa.value.find((x) => x.canonical_name === c); return t ? store.guests.value[t.id] ?? null : null; }, canonical);

// Opens the correction form, picks the height, writes, consents and sends.
async function sendCorrection(page, text) {
  await page.locator(aria('button', 'Suggest a correction')).click();
  await page.waitForSelector('dialog select');
  await page.select('dialog select', 'height_m');
  await page.locator('::-p-aria([role="textbox"])').fill(text);
  await page.locator(aria('checkbox', 'I agree my suggestion is published under CC BY-SA 4.0')).click();
  await page.locator(aria('button', 'Send suggestion')).click();
}

test('BT-5 (S3 details): a chip opens a dialog with focus inside, photo and credit, placement, warning, estimates, sources and a correction form posting the release id; Escape returns focus', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await open({ ...v, data: 'fixture', photos: true, correction: 'ok' });
    await start(page);
    const chip = await chipOf(page, names['Castanea sativa']);
    assert.ok(chip, 'Castanea (a photo plant) is suggested');
    await page.locator(aria('button', chip.name)).click();
    const dialog = await findAx(page, { role: 'dialog' });
    assert.ok(dialog, 'a dialog');
    assert.ok(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"], dialog')), 'focus moves into the dialog');
    assert.ok(await findAx(page, { role: 'image', name: `Photo of ${names['Castanea sativa']}` }), 'the photo, with its alt text');
    assert.ok(await findAx(page, { name: /Wikimedia Commons|iNaturalist|CC/ }), 'the photo credit');
    assert.ok(await has(page, '::-p-aria(Placed for the Temperate climate)'));
    assert.ok(await findAx(page, { role: 'heading', name: 'With a warning' }), 'the warning section');
    assert.ok(await findAx(page, { role: 'heading', name: /Sources/ }), 'the sources');
    await sendCorrection(page, 'The height looks wrong.');
    assert.ok(await findAx(page, { name: /^Thank you/ }), 'sent');
    assert.equal(page.correctionPosts.length, 1, 'one POST to /api/correction');
    assert.match(page.correctionPosts[0], new RegExp(fixture().releaseId), 'the post names the data release');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    await page.waitForFunction((name) => (document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent) === name, { timeout: 2000 }, chip.name).catch(() => {});
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent), chip.name, 'focus returns to the chip');
    // Estimates: Apple's flowering months are derived for latitude bands.
    await hooked(page, () => { const { store, openSheet } = window.__ctTest; openSheet('details', store.pool.value.find((t) => t.canonical_name === 'Malus domestica').id); });
    assert.ok(await findAx(page, { name: /^estimate$/ }), 'an estimate tag on a layer value');
    await page.keyboard.press('Escape');
    await page.close();
  });
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

test('BT-6 (S3 adjust): Swap shows "Also fills…", a high conflict asks and an invasive warning does not, Remove then Undo, Keep pins, "Add 2 plants", Paste offers Add anyway with a labelled chip', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await open({ ...v, data: 'fixture' });
    await start(page);
    // Swap: the first member whose alternatives also fill a cell (the fixture's Temperate list has one).
    // The members' names from the store; each chip is found where the reader would find it (on a phone, its stage).
    const memberNames = await hooked(page, () => window.__ctTest.store.memberTaxa.value.map((t) => t.names.en ?? t.canonical_name));
    let fills = null;
    for (const n of memberNames) {
      const c = await chipOf(page, n);
      if (!c) continue;
      await page.locator(aria('button', c.name)).click();
      if (!(await has(page, aria('button', 'Swap'), 1000))) { // a main crop
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('dialog[open]'));
        continue;
      }
      await page.locator(aria('button', 'Swap')).click();
      fills = await findAx(page, { name: /^Also fills/ }, 1500);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      if (fills) break;
    }
    assert.ok(fills, 'Swap shows "Also fills…"');

    // Juglans next to Malus: a high conflict (genus allelopathic harm) asks first.
    for (const c of ['Juglans regia', 'Robinia pseudoacacia']) if (await isMember(page, c)) await dropMember(page, c);
    if (!(await chipOf(page, names['Malus domestica']))) await addPlant(page, names['Malus domestica']);
    assert.ok(await chipOf(page, names['Malus domestica']), 'Malus is in');
    await addPlant(page, names['Juglans regia']);
    assert.ok(await findAx(page, { role: 'alertdialog' }) ?? await findAx(page, { role: 'dialog', name: /conflict|harm/i }), 'a high conflict asks');
    assert.ok(await findAx(page, { name: /hold back|serious/ }), 'the ask names the conflict');
    await page.keyboard.press('Escape');
    assert.equal(await isMember(page, 'Juglans regia'), false, 'Cancel adds nothing');
    // Robinia: an invasive warning is shown but never asks (France: recorded invasive).
    await hooked(page, () => { window.__ctTest.store.country.value = { code: 'FR', source: 'chosen' }; });
    await addPlant(page, names['Robinia pseudoacacia']);
    assert.equal(await findAx(page, { role: 'alertdialog' }, 800), null, 'an invasive warning does not ask');
    assert.ok(await isMember(page, 'Robinia pseudoacacia'), 'Robinia is added');

    // Remove, then Undo; Keep shows the pin.
    const chip = await chipOf(page, names['Malus domestica']);
    await page.locator(aria('button', chip.name)).click();
    await page.locator(aria('button', 'Remove')).click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert.equal(await chipOf(page, names['Malus domestica']), undefined);
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await chipOf(page, names['Malus domestica']), 'Undo restores the plant');
    await page.locator(aria('button', (await chipOf(page, names['Malus domestica'])).name)).click();
    const keep = await findAx(page, { role: 'button', name: 'Keep' });
    await page.locator(aria('button', 'Keep')).click();
    const after = await findAx(page, { role: 'button', name: 'Keep' });
    assert.equal(!!after?.pressed, !keep?.pressed, 'Keep toggles the pin');
    if (!after?.pressed) await page.locator(aria('button', 'Keep')).click();
    assert.ok(await findAx(page, { name: 'Kept' }), 'Keep shows the pin');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));

    // Add with two selected.
    await openBy(page, 'Add plants', 'add');
    const boxes = (await axNodes(page)).filter((n) => n.role === 'checkbox' && !n.checked).slice(0, 2);
    assert.equal(boxes.length, 2, 'two plants to tick');
    for (const b of boxes) await page.locator(aria('checkbox', b.name)).click();
    assert.ok(await has(page, aria('button', 'Add 2 plants')));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));

    // Paste a Tropical-only plant from Temperate: Add anyway, then a chip labelled with its list.
    await openBy(page, 'Paste a list', 'paste');
    await page.locator('::-p-aria([role="textbox"])').fill('Inga edulis');
    await page.locator(aria('button', 'Add anyway')).click();
    if (await findAx(page, { role: 'table' }, 500)) {
      assert.ok(await findAx(page, { role: 'button', name: new RegExp(`${names['Inga edulis']}.*From the Tropical list`) }), 'the guest chip is labelled');
    } else {
      assert.equal(await guestFrom(page, 'Inga edulis'), 'Tropical', 'Inga is a guest from the Tropical list');
      assert.ok(await findAx(page, { name: /From the Tropical list/ }), 'labelled "From the Tropical list"');
    }
    await page.close();
  });
});

const sheetOpen = (page) => page.evaluate(() => !!document.querySelector('dialog[open]'));
const closed = (page) => page.waitForFunction(() => !document.querySelector('dialog[open]'));
const setStore = (page, fn, ...args) => hooked(page, fn, ...args);

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
  await setStore(page, () => { const { store } = window.__ctTest; store.kept.value = [...store.kept.value, store.members.value[0]]; });
  assert.equal(await has(page, aria('button', 'Undo'), 800), false, 'a pin made since hides Undo');

  // The page modulepreloads every chunk, so the hook makes the Swap chunk's import fail.
  await setStore(page, () => { const { store, openSheet, failSheets } = window.__ctTest; failSheets(); openSheet('swap', store.members.value[0]); });
  assert.ok(await findAx(page, { name: /could not open/ }), 'the failure is said');
  assert.ok(await has(page, aria('button', 'Reload')), 'with Reload');
  assert.equal(await sheetOpen(page), false, 'and the sheet is closed');
  await page.close();
});

test('BT-6 (S3 review): "Add anyway" keeps the ticks; a guest that misfits asks first and shows its warning; the toast is heard over a sheet; "Add all" says "added with a warning" with Show', async () => {
  const page = await open({ width: 1280, data: 'fixture' });
  await start(page);
  for (const c of ['Juglans regia', 'Robinia pseudoacacia']) if (await isMember(page, c)) await dropMember(page, c);
  if (!(await isMember(page, 'Malus domestica'))) await addPlant(page, names['Malus domestica']);
  await closed(page);
  await openBy(page, 'Add plants', 'add');
  await page.locator('::-p-aria([role="searchbox"])').fill(names['Robinia pseudoacacia']);
  await page.locator(aria('checkbox', `${names['Robinia pseudoacacia']}, Robinia pseudoacacia`)).click();
  await page.locator('::-p-aria([role="searchbox"])').fill(names['Juglans regia']);
  await page.locator(aria('button', `Add ${names['Juglans regia']}`)).click();
  await page.locator(aria('button', 'Add anyway')).click();
  await closed(page);
  assert.ok(await isMember(page, 'Juglans regia') && await isMember(page, 'Robinia pseudoacacia'), 'the ticked plant joins with the one confirmed');

  // A query lists 8 rows at most, best match first.
  await openBy(page, 'Add plants', 'add');
  await page.locator('::-p-aria([role="searchbox"])').fill('a');
  const rows = (await axNodes(page)).filter((n) => n.role === 'checkbox' || /^Add (?!\d)/.test(n.name ?? '') && n.role === 'button');
  assert.ok(rows.length <= 8, `at most 8 rows (${rows.length})`);
  await page.locator(aria('button', 'Close')).click(); // Escape in a filled search box first clears it
  await closed(page);

  // Deep shade: a sun plant from the Tropical list misfits, so "Add anyway" asks.
  await setStore(page, () => { const { store } = window.__ctTest; store.site.value = { ...store.site.value, light: 'shade' }; });
  await openBy(page, 'Paste a list', 'paste');
  await page.locator('::-p-aria([role="textbox"])').fill('Inga edulis');
  assert.ok(await findAx(page, { name: /^Your site:/ }), 'the guest row shows its warning');
  await page.locator(aria('button', 'Add anyway')).click();
  assert.ok(await findAx(page, { role: 'alertdialog' }), 'a guest that misfits asks first');
  await page.locator('dialog[role="alertdialog"] .button-primary').click();
  assert.ok(await sheetOpen(page), 'the Paste sheet stays');
  assert.ok(await has(page, aria('button', 'Undo')), 'the toast is reachable over the sheet');
  assert.equal(await guestFrom(page, 'Inga edulis'), 'Tropical');

  // Pear (a member of the suggestion) is taken out, then pasted back in deep shade: it misfits.
  if (await isMember(page, 'Pyrus communis')) await dropMember(page, 'Pyrus communis');
  await page.locator('::-p-aria([role="textbox"])').fill('Pyrus communis');
  await page.locator(aria('button', 'Add 1 plant')).click();
  await closed(page);
  assert.ok(await findAx(page, { name: /1 added with a warning/ }), '"added with a warning"');
  await page.locator(aria('button', 'Show')).click();
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
  await page.locator(aria('button', 'Send suggestion')).click();
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
  const page = await open({ width: 1280, data: 'fixture' });
  await start(page);
  const chip = await chipOf(page, names['Castanea sativa']);
  await page.locator(aria('button', chip.name)).click();
  await page.locator(aria('button', 'Remove')).click();
  await closed(page);
  await page.waitForSelector('.ct-toast');
  assert.ok(await page.$eval('.ct-toast', (el) => !!el.closest('[aria-live]')), 'the toast is announced where it is first shown');
  await openBy(page, 'Paste a list', 'paste');
  await page.waitForSelector('dialog[open] .ct-toast');
  assert.ok(await page.$eval('dialog[open] .ct-toast', (el) => !el.closest('[aria-live]')), 'moved into the sheet, it is not in a live region');
  await setStore(page, () => { window.__ctTest.store.members.value = []; });
  await page.locator('::-p-aria([role="textbox"])').fill('Malus domestica');
  await page.waitForFunction(() => /Add 1/.test(document.querySelector('dialog[open] .ct-add-bar .button-primary')?.textContent ?? ''));
  await page.$eval('dialog[open] textarea', (el) => { el.value = 'Malus domestica\nCastanea sativa'; el.dispatchEvent(new Event('input', { bubbles: true })); el.closest('dialog').querySelector('.ct-add-bar .button-primary').click(); });
  await closed(page);
  assert.ok(await isMember(page, 'Malus domestica') && await isMember(page, 'Castanea sativa'), 'both lines are added');
  await page.close();
});
