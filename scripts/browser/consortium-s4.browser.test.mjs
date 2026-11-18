// Stream S4's browser tests (start, share, memory, print, .canopi download; review C1). Every test
// runs and must pass (scripts/browser-tests.test.mjs). Design check §7 BT-1
// (start), BT-7, BT-8, BT-9 (.canopi) and the exit walk-through. Run capped: npm run test:browser.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, startHarness } from './harness.mjs';
import { aria, axNodes, layoutVariants, behaviour, en, findAx, fixtureDb, has } from './helpers.mjs';
import { openCards } from './location-fixtures.mjs';
import { encodeLink } from '../../src/lib/consortium/state.ts';
import { CANOPI_FILE_SCHEMA, CURRENT_CANOPI_FILE_VERSION } from '../vendor/canopi-design-format/canopi-design-format.ts';
import { validate } from '../vendor/canopi-design-format/validate.mjs';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

// Choose a climate and press "Start from a small suggested palette" (Place, PP-B b1a): the palette
// shows with its action row (Share, Print, Download for Canopi).
const SUGGEST = en['consortium.start.suggest'];
async function suggest(page, climate = 'Temperate') {
  await openCards(page);
  await page.locator(aria('radio', climate)).click();
  assert.equal(await loadState(page), 'ready');
  await page.locator(aria('button', SUGGEST)).click();
  assert.ok(await has(page, aria('button', 'Share'), 8000), 'the result and its actions');
}
// The share link; with `place`, "Include my place" ticked first (PP-B b1a: off by default).
const shareLink = async (page, { place = false } = {}) => {
  // Open the Share panel (closed first if open, so the field is read fresh).
  if (await page.$('#ct-share-field')) await page.locator(aria('button', 'Share')).click();
  await page.locator(aria('button', 'Share')).click();
  if (place) {
    await page.waitForSelector('input[data-share-location]', { timeout: 4000 });
    if (!(await page.$eval('input[data-share-location]', (el) => el.checked))) await page.click('input[data-share-location]');
  }
  const field = await findAx(page, { role: 'textbox', name: /link/i });
  assert.ok(field?.value?.includes('#v=5'), 'the share field holds a #v=5 link');
  return field.value;
};
const hashOf = (url) => new URL(url).hash;
// Each page is a browser context with its own copy of the database: close it once used, so a test
// with many pages keeps the browser small.
const done = async (...pages) => { for (const p of pages) await p.browserContext().close().catch(() => {}); };
const countryText = (page) => page.$eval('[data-ct="country"]', (el) => el.textContent);
const fixtureTemperate = () => fixtureDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY 1").all().map((r) => String(r.id)));
const UNSURE_SPOT = { light: 'unsure', water: 'unsure', wind: 'unsure', ground: 'unsure', height: 'unsure' };
// A #v=5 link of the first five fixture Temperate plants that brings a place: a country and a cell in
// Lyon (spot answers are dormant until PP-F; the stage and Keep went in PP-B commit 0a').
const stageLink = async () => {
  const ids = await fixtureTemperate();
  return encodeLink({ climate: 'Temperate', country: 'FR', room: 'small', plot: null, period: '1991-2020', spot: UNSURE_SPOT, soil: null, members: ids.slice(0, 5), removed: [], guests: [] }, { Temperate: ids }, { origin: { lat: 45.75, lon: 4.85 } });
};

test('BT-7 (S4 share): a copied link opened as a new document restores the same palette; an unknown token and an old beta link (read as unreadable) give their notices; a reload restores the last palette', async (t) => {
  await behaviour(t, async (v) => {
    const page = await h.open('/palette/', { ...v, data: 'fixture' });
    await openCards(page);
    await page.locator(aria('radio', 'Temperate')).click();
    await page.click('input[name="ct-site-room"][value="small"]');
    await suggest(page);
    const link = await shareLink(page);
    assert.equal(await page.$eval('.ct-share [role="status"]', (el) => el.textContent), '', 'nothing copied before Copy is pressed (review 6)');
    await page.locator(aria('button', 'Copy')).click();
    assert.ok(await findAx(page, { name: /^(Link copied\.|Copy the link above by hand\.)$/ }), 'Copy copies, or says to copy by hand');
    assert.match(link, /&m=small&/, 'the room is in the link');

    // A new document: a unique query before the fragment, so nothing is reused from the first page.
    // The restored palette writes back the very same link (climate, room, members).
    const copy = await h.open(`/palette/?run=${Date.now()}${hashOf(link)}`, { ...v, data: 'fixture' });
    assert.equal(await loadState(copy), 'ready');
    assert.equal(hashOf(await shareLink(copy)), hashOf(link), 'the same palette');
    await done(copy);

    // An unknown token: the rest restores, with the notice.
    const unknown = await h.open(`/palette/?run=${Date.now()}${hashOf(link).replace('&a=', '&a=zzzzzz')}`, { ...v, data: 'fixture' });
    assert.ok(await findAx(unknown, { name: /no longer in the list; the rest is restored/ }), 'the unknown-plant notice');
    await done(unknown);
    // An old beta link (v3): read as any unreadable link, nothing restored (owner 2026-11-17).
    const old = await h.open(`/palette/?run=${Date.now()}${hashOf(link).replace('v=5', 'v=3')}`, { ...v, data: 'fixture' });
    assert.ok(await findAx(old, { name: /This link could not be read/ }), 'the unreadable notice');
    await done(old);

    // A reload with no fragment restores the last palette (storage works).
    await page.goto(new URL('/palette/', page.url()).href);
    assert.equal(await loadState(page), 'ready');
    assert.equal(hashOf(await shareLink(page)), hashOf(link), 'the last palette is restored');
    await done(page);

    // A link that brings a place (a country and a cell) round-trips with "Include my place"
    // ticked; a reload of it keeps the country "from the shared link". "Use it" makes the country the
    // reader's; the save takes it with the first plant change (owner 2026-11-15, decision 2: only a
    // plant change replaces the reader's save on a link's page).
    const staged = await stageLink();
    const shared = await h.open(`/palette/?run=${Date.now()}#${staged}`, { ...v, data: 'fixture' });
    assert.equal(await loadState(shared), 'ready');
    // The cell travels as the page's cell centre, so it is compared apart.
    const noCell = (h) => h.replace(/&o=[^&]+/, '');
    const back = hashOf(await shareLink(shared, { place: true }));
    assert.equal(noCell(back), noCell(`#${staged}`), 'room, members and country round-trip');
    assert.match(back, /[#&]o=-?[\d.]+,-?[\d.]+/, 'with the cell');
    assert.match(await countryText(shared), /from the shared link/);
    await shared.reload();
    assert.equal(await loadState(shared), 'ready');
    assert.ok(await has(shared, aria('button', 'Share'), 8000));
    assert.match(await countryText(shared), /from the shared link/, 'a reload keeps the link label');
    await shared.locator(aria('button', en['consortium.place.useIt'])).click();
    await shared.waitForFunction(() => !document.querySelector('[data-place-notice="linkPlace"]'), { timeout: 4000 });
    assert.match(await countryText(shared), /chosen by you/, '"Use it" makes the link\'s country the reader\'s');
    // A plant removed (its details, Remove): the page's palette is saved, with the country taken.
    await shared.evaluate(() => [...document.querySelectorAll('#ct-root .ct-palette-pictures button')].find((b) => b.closest('[data-plant-id]')).click());
    assert.ok(await has(shared, 'dialog[open].ct-sheet', 8000), 'a plant\'s details');
    await shared.locator(aria('button', en['consortium.details.remove'])).click();
    assert.ok(await has(shared, aria('button', 'Undo'), 4000), 'the Remove is made');
    await shared.goto(new URL('/palette/', shared.url()).href);
    assert.ok(await has(shared, aria('button', 'Share'), 8000));
    assert.match(await countryText(shared), /chosen by you/, 'the save keeps the country the reader took');
    await done(shared);

    // A country the reader chose, then a reload of the page's own address: still "chosen by you".
    const mine = await h.open('/palette/', { ...v, data: 'fixture' });
    await openCards(mine);
    await mine.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(mine), 'ready');
    // The country's "Use {country}", not the location step's "Use my location" (now above it, owner drop 10).
    const use = (await axNodes(mine)).find((n) => n.role === 'button' && /^Use /.test(n.name ?? '') && n.name !== en['consortium.location.geo'] && n.name !== en['consortium.location.useCentre']);
    if (use) await mine.locator(aria('button', use.name)).click();
    else {
      await mine.locator(aria('button', 'Add your country')).click();
      await mine.select('#ct-country-select', 'FR');
    }
    await suggest(mine);
    assert.match(await countryText(mine), /chosen by you/);
    await mine.reload();
    assert.ok(await has(mine, aria('button', 'Share'), 8000));
    assert.match(await countryText(mine), /chosen by you/, 'a reload never relabels the reader\'s country (review 1)');

    const own = await mine.evaluate(() => location.hash);
    // A link pasted into the open tab is opened (review 3).
    await mine.evaluate((f) => { location.hash = f; }, staged);
    for (let i = 0; i < 40 && (await mine.evaluate(() => location.hash)) !== `#${staged}`; i++) await new Promise((r) => setTimeout(r, 100));
    await new Promise((r) => setTimeout(r, 800));
    assert.equal(hashOf(await shareLink(mine, { place: true })), `#${staged}`, 'the pasted link is the palette shown');
    assert.match(await countryText(mine), /from the shared link/);

    // Back: the reader's own palette again, its country still "chosen by you" (round 2, 1).
    await mine.goBack();
    await new Promise((r) => setTimeout(r, 1000));
    assert.equal(hashOf(await shareLink(mine)), own, 'Back reopens the reader\'s own palette');
    assert.match(await countryText(mine), /chosen by you/, 'Back never relabels the reader\'s country');

    // With a palette shown, an old beta (unreadable) or cut pasted link changes nothing, says so there,
    // and the address goes back to the palette shown (round 2, 2 and 4).
    for (const [bad, words] of [[staged.replace('v=5', 'v=3'), /pasted link could not be read/], [staged.replace(/c=temperate&/, ''), /pasted link could not be read/], [staged.replace(/&e=1$/, ''), /pasted link could not be read/]]) {
      await mine.evaluate((f) => { location.hash = f; }, bad);
      assert.ok(await findAx(mine, { name: words }), `the notice for the pasted link (${words})`);
      for (let i = 0; i < 40 && (await mine.evaluate(() => location.hash)) !== own; i++) await new Promise((r) => setTimeout(r, 100));
      assert.equal(await mine.evaluate(() => location.hash), own, 'the address is the palette shown again');
      assert.equal(hashOf(await shareLink(mine)), own, 'nothing changed');
    }
    await done(mine);

    // A #v=5 link without a climate: unreadable (v14 0W-2 R4: a cut link restores nothing), and Place (review 7).
    const noClimate = await h.open(`/palette/?run=${Date.now()}#${staged.replace(/c=temperate&/, '')}`, { ...v, data: 'fixture' });
    assert.ok(await findAx(noClimate, { name: /could not be read/ }), 'the unreadable notice');
    await openCards(noClimate);
    assert.ok(await has(noClimate, aria('radio', 'Temperate')), 'Place stays');
    assert.equal(await has(noClimate, aria('button', 'Share'), 500), false, 'no result without a climate');
    await done(noClimate);
    // The beta tool's query link and save are not read (owner 2026-11-17): Place, no notice.
    const v1 = await h.open(`/palette/?v=3&c=temperate&a=AbCdEf`, { ...v, data: 'fixture' });
    await openCards(v1);
    assert.ok(await has(v1, aria('radio', 'Temperate'), 8000), 'Place for the ?v=3 query link');
    assert.equal(await v1.$('[data-place-notice]'), null, 'no notice for the beta tool\'s query link');
    await v1.evaluate(() => localStorage.setItem('canopi-consortium', JSON.stringify({ q: 'c=temperate&a=AbCdEf', at: '2026-10-01', src: 'chosen' })));
    await v1.goto(new URL('/palette/', v1.url()).href);
    await openCards(v1);
    assert.ok(await has(v1, aria('radio', 'Temperate'), 8000), 'Place');
    assert.equal(await v1.$('[data-place-notice]'), null, 'no notice for the beta tool\'s save');
    await done(v1);
  }, { phone: true });
});

test('BT-7 (S4 share, blocked storage): everything works and Share says the link keeps it', async (t) => {
  await behaviour(t, async (v) => {
    const blocked = await h.open('/palette/', { ...v, data: 'fixture', storage: false });
    await suggest(blocked);
    await blocked.locator(aria('button', 'Share')).click();
    assert.ok(await findAx(blocked, { name: /This browser does not keep your palette; your link does/ }));
    await done(blocked);
  });
  // Chrome's own cookie block (site data refused for every site), not a stub (H1/W1): sqlite-wasm
  // starts, the plant list loads and the note shows.
  await t.test('Chrome blocking site data', async () => {
    const page = await h.open('/palette/', { data: 'fixture', storage: 'cookies-blocked' });
    try {
      assert.equal(await page.evaluate(() => { try { void localStorage.length; return 'works'; } catch (e) { return e.name; } }), 'SecurityError', 'the profile blocks site data');
      await suggest(page);
      await page.locator(aria('button', 'Share')).click();
      assert.ok(await findAx(page, { name: /This browser does not keep your palette; your link does/ }));
    } finally { await page.close(); }
  });
});

test('BT-9 (S4 .canopi): the download validates against the app schema (canopi 0c425fb07), version 9', async (t) => {
  await behaviour(t, async (v) => {
    const page = await h.open('/palette/', { ...v, data: 'fixture' });
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
    await done(page);
  });
});

test('Exit walk-through (S4, every stream): on the real install, keyboard only: start → adjust → share (reopened) → print → download', async (t) => {
  await layoutVariants(t, async (v) => {
    // The print dialog is the browser's: counted, not opened.
    const page = await h.open('/palette/', { ...v, setup: (pg) => pg.evaluateOnNewDocument(() => { window.__printed = 0; window.print = () => { window.__printed++; }; }) });
    const active = () => page.evaluate(() => {
      const el = document.activeElement;
      const by = el?.getAttribute('aria-labelledby');
      const text = el?.getAttribute('aria-label') || (by && document.getElementById(by)?.textContent) || el?.labels?.[0]?.textContent || el?.textContent || '';
      return { tag: el?.tagName.toLowerCase(), type: el?.type, text: text.trim(), role: el?.getAttribute('role'), cls: typeof el?.className === 'string' ? el.className : '', plant: el?.closest('[data-plant-id]')?.dataset.plantId ?? null, inPictures: !!el?.closest('.ct-palette-pictures'), inSheet: !!el?.closest('dialog[open]') };
    });
    // Tab (forward) until the focused control matches; every stop is a real focus, never <body>.
    const tabTo = async (match, what, max = 120) => {
      for (let i = 0; i < max; i++) {
        await page.keyboard.press('Tab');
        const a = await active();
        if (match(a)) return a;
      }
      assert.fail(`${what} is reachable by Tab`);
    };
    // Place: Tab to "No location? Choose a climate", Enter (the focus moves into the cards, owner drop
    // 10), arrows to Temperate (an arrow checks it); "Start from a small suggested palette", Enter.
    await tabTo((a) => a.text === en['consortium.place.climate.open'], 'the link to the climate choices');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement?.type === 'radio', { timeout: 4000 }).catch(() => {});
    assert.equal((await active()).type, 'radio', 'Enter moves the focus into the climate choices');
    for (let i = 0; i < 12 && !(await active()).text.startsWith('Temperate'); i++) await page.keyboard.press('ArrowDown');
    assert.ok((await active()).text.startsWith('Temperate'), 'Temperate by arrow keys');
    if (!(await page.evaluate(() => document.activeElement.checked))) await page.keyboard.press('Space');
    assert.equal(await loadState(page), 'ready');
    await tabTo((a) => a.text === SUGGEST, SUGGEST);
    await page.keyboard.press('Enter');
    assert.ok(await has(page, '.ct-palette-page:not([data-palette-placeholder]) h2[data-view-heading]', 8000), 'the palette page, reached by keyboard');
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 4000 }).catch(() => {});
    assert.notEqual((await active()).tag, 'body', 'focus moves to the palette page');

    // Adjust: a plant of the palette opens its details; Remove there, then Undo.
    // The palette's own plants: the Next step's fillers carry data-plant-id too, and removing a plant reopens holes (b1b).
    const MEMBERS = '#ct-root [data-plant-id]:not(.ct-fillers [data-plant-id])';
    const plants = () => page.$$eval(MEMBERS, (els) => new Set(els.map((e) => e.dataset.plantId)).size);
    const plant = await tabTo((a) => !!a.plant && a.inPictures && !a.inSheet && a.tag === 'button', 'a plant of the palette');
    const before = await plants();
    await page.keyboard.press('Enter');
    assert.ok(await has(page, 'dialog[open].ct-sheet', 8000), `${plant.text}: its details open`);
    await tabTo((a) => a.inSheet && a.text === en['consortium.details.remove'], 'Remove in the details');
    await page.keyboard.press('Enter');
    assert.ok(await has(page, aria('button', 'Undo')), `${plant.text}: the toast offers Undo`);
    await page.waitForFunction(([n, sel]) => new Set([...document.querySelectorAll(sel)].map((e) => e.dataset.plantId)).size === n - 1, { timeout: 3000 }, [before, MEMBERS]);
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 2000 }).catch(() => {});
    assert.notEqual((await active()).tag, 'body', 'focus stays in the page after Remove');
    await tabTo((a) => a.text === 'Undo', 'Undo');
    await page.keyboard.press('Enter');
    await page.waitForFunction(([n, sel]) => new Set([...document.querySelectorAll(sel)].map((e) => e.dataset.plantId)).size === n, { timeout: 3000 }, [before, MEMBERS]);
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 2000 }).catch(() => {});
    assert.equal((await active()).plant, plant.plant, 'focus is on the restored plant');

    // Share: the link field holds the palette.
    await tabTo((a) => a.text === 'Share', 'Share');
    await page.keyboard.press('Enter');
    const field = await findAx(page, { role: 'textbox', name: /link/i });
    assert.match(field?.value ?? '', /#v=5/, 'the share field holds the link');
    // The copied link, opened as a new document: the same palette (it writes back the same link).
    const copy = await h.open(`/palette/?run=${Date.now()}${hashOf(field.value)}`, v);
    assert.equal(await loadState(copy), 'ready');
    assert.ok(await has(copy, aria('button', 'Share'), 8000), 'the link reopens the palette');
    assert.equal(hashOf(await shareLink(copy)), hashOf(field.value), 'the same palette');
    await done(copy);
    // Print.
    await tabTo((a) => a.text === 'Print', 'Print');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__printed === 1, { timeout: 3000 });
    // Download for Canopi: a valid .canopi file.
    await tabTo((a) => a.text === 'Download for Canopi', 'Download for Canopi');
    await page.keyboard.press('Enter');
    let files = [];
    for (let i = 0; i < 40 && !files.length; i++) { await new Promise((r) => setTimeout(r, 150)); files = page.capturedDownloads(); }
    assert.equal(files.length, 1, 'one file downloaded');
    const doc = JSON.parse(files[0].bytes.toString('utf8'));
    assert.deepEqual(validate(CANOPI_FILE_SCHEMA, doc), [], 'valid against the app schema');
    await done(page);
  });
});
