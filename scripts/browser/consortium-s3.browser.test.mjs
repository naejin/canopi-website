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
const chipOf = async (page, name) => (await axNodes(page)).find((n) => n.role === 'button' && (n.name ?? '').startsWith(name));

// The page, with the test hook.
async function open(opts) {
  const page = await h.open('/consortium/', opts);
  await page.evaluateOnNewDocument(() => { window.__ctTest = true; });
  await page.reload({ waitUntil: 'domcontentloaded' });
  return page;
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
    assert.ok(await findAx(page, { name: /With a warning|estimate/ }), 'warning or estimate words');
    assert.ok(await findAx(page, { role: 'heading', name: /Sources/ }), 'the sources');
    await sendCorrection(page, 'The height looks wrong.');
    assert.ok(await findAx(page, { name: /Thank you|Sent/ }), 'sent');
    assert.equal(page.correctionPosts.length, 1, 'one POST to /api/correction');
    assert.match(page.correctionPosts[0], new RegExp(fixture().releaseId), 'the post names the data release');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    await page.waitForFunction((name) => (document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent) === name, { timeout: 2000 }, chip.name).catch(() => {});
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent), chip.name, 'focus returns to the chip');
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
    const chips = (await axNodes(page)).filter((n) => n.role === 'button' && / · /.test(n.name ?? ''));
    let fills = null;
    for (const c of chips) {
      await page.locator(aria('button', c.name)).click();
      if (!(await has(page, aria('button', 'Swap'), 1000))) { await page.keyboard.press('Escape'); continue; } // a main crop
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
