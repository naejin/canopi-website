// The seams between the four P2 streams (hand-off branch: H1–H16, seam review X1–X8, walk-through
// W1–W9, and the reviews of the branch, F1–F7). Every test here drives the page through its real
// controls, as a reader would; the test hook only makes the after-the-matrix chunk fail or wait (F4,
// F5), which no control can. Run capped: npm run test:browser.
//
// This file: the P2 streams' seams: Add from a cell (X*), H16, F1–F5, the save and Undo rules (R2-*, T*, M*, D1), pre-push 1, focus after a view change (W4). Split from consortium-seams by owner (E1 design check A6); shared helpers in
// ./seams-helpers.mjs. Capped:
//   timeout 600 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 \
//     node --experimental-strip-types --disable-warning=ExperimentalWarning --test scripts/browser/consortium-seams-p2.browser.test.mjs
// (npm run test:browser runs every file in shards: scripts/browser/run.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState } from './harness.mjs';
import { h, useHarness, aria, axNodes, behaviour, en, findAx, has } from './helpers.mjs';
import { esc, done, temperate, cellIn, suggested, memberIds, addRows, fitsShade, linkOf, saved, savedFragment, tropicalOnly, param, changeSiteTo, OTHER_TAB, otherTabSaves, pasteOne, focused, hookedPage, openAdd, savedPlace } from './seams-helpers.mjs';
import { openCards } from './location-fixtures.mjs';

useHarness();

test('X8: a link opened while a sheet is up closes the sheet', async (t) => {
  await behaviour(t, async (v) => {
    const page = await suggested({ ...v, hook: true });
    const before = await page.evaluate(() => location.hash);
    await openAdd(page);
    assert.ok(await findAx(page, { role: 'dialog', name: 'Add plants' }));
    // Back to the address with one plant fewer: the page's own link, opened as a restore.
    await page.locator('.ct-add input[type="checkbox"]').click();
    await page.locator('.ct-add-bar .button-primary').click();
    await page.waitForFunction((b) => location.hash !== b, {}, before);
    await openAdd(page);
    assert.ok(await findAx(page, { role: 'dialog', name: 'Add plants' }));
    await page.evaluate((f) => { history.pushState(null, '', f); window.dispatchEvent(new HashChangeEvent('hashchange')); }, before);
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5000 });
    await done(page);
  });
});

test('X3: a list pasted on Start shows its consortium with Share, saved: a reload keeps it', async (t) => {
  const plants = await temperate();
  const names = plants.slice(0, 3).map((p) => p.name);
  await behaviour(t, async (v) => {
    const page = await h.open('/palette/', { ...v, data: 'fixture' });
    await openCards(page);
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(names.join('\n'));
    const add = await findAx(page, { role: 'button', name: /^Add 3 plants$/ });
    assert.ok(add, 'the three names are found');
    await page.locator(aria('button', add.name)).click();
    assert.ok(await has(page, aria('button', 'Share'), 5000), 'the consortium is shown, with Share');
    const link = await linkOf(page);
    assert.match(link, /^#v=5/, 'the address holds it');
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000), 'a reload restores it');
    assert.equal(await linkOf(page), link, 'the same consortium');
    assert.equal((await memberIds(page)).length, 3, 'the three pasted plants');
    await done(page);
  });
});

// Review R4-3 changed this seam: a site answer given after Change site is the draft's, and a commit
// (a paste of a plant not in the consortium here) saves it; D1 covers the draft and Back.
test('X3: a site answer made after "Change site" is saved with the commit, and a reload keeps it', async (t) => {
  const plants = await temperate();
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    const ids = new Set(await memberIds(page));
    const other = plants.find((p) => !ids.has(p.id));
    assert.ok(other, 'a Temperate plant not in the consortium');
    await page.locator(aria('button', 'Change site')).click();
    await openCards(page);
    await page.locator(aria('radio', 'Shade')).click();
    await pasteOne(page, other.name);
    const after = await savedFragment(page);
    assert.equal(param(await savedPlace(page), 'l'), 'shade', `the draft's answer is saved with the commit (place ${await savedPlace(page)})`);
    assert.equal(await linkOf(page), after, 'and in the address');
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000), 'the consortium is restored');
    assert.equal(await linkOf(page), after, 'the same palette');
    assert.equal(param(await savedPlace(page), 'l'), 'shade', 'with the answer (link v5 keeps it in the save\'s place, never the address)');
    await done(page);
  });
});

test('F1: after "Change site", choosing another climate is not saved over the consortium until the reader goes back to it', async (t) => {
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    const before = await linkOf(page);
    await page.locator(aria('button', 'Change site')).click();
    await openCards(page);
    await page.locator(aria('radio', 'Tropical')).click();
    await new Promise((r) => setTimeout(r, 400));
    assert.equal(await linkOf(page), before, 'the address keeps the Temperate consortium');
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000), 'a reload restores the consortium');
    assert.equal(await linkOf(page), before, 'with its own climate, no plant lost');
    // "Back to your consortium" after choosing another card shows it in its own climate.
    await page.locator(aria('button', 'Change site')).click();
    await openCards(page);
    await page.locator(aria('radio', 'Tropical')).click();
    await page.locator(aria('button', 'Back to your consortium')).click();
    assert.ok(await has(page, aria('button', 'Share'), 4000));
    assert.equal(await linkOf(page), before, 'back in Temperate, the same consortium');
    await done(page);
  });
});

test('F2: Undo after a list pasted from "Start over" goes back to Start and keeps nothing saved', async (t) => {
  const plants = await temperate();
  const names = plants.slice(0, 3).map((p) => p.name);
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('button', 'Start over')).click();
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(names.join('\n'));
    await page.locator(aria('button', 'Add 3 plants')).click();
    assert.ok(await has(page, aria('button', 'Share'), 5000), 'the pasted consortium');
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000), 'Undo goes back to Start');
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 3000 }).catch(() => {});
    assert.notEqual((await focused(page)).tag, 'body', 'focus is not lost');
    assert.equal(await linkOf(page), '', 'no consortium in the address');
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000), 'a reload opens Start');
    assert.ok(!(await has(page, aria('button', 'Share'), 800)), 'no empty consortium saved');
    await done(page);
  });
});

test('R2-1: a list pasted on Start under another climate starts that climate\'s consortium; Undo brings the old one back, saved', async (t) => {
  const [inga] = await tropicalOnly();
  assert.ok(inga, 'a Tropical-only plant in the fixture');
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    const before = await linkOf(page);
    await page.locator(aria('button', 'Change site')).click();
    await openCards(page);
    await page.locator(aria('radio', 'Tropical')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(inga);
    const add = await findAx(page, { role: 'button', name: /^Add 1 plant$/ });
    assert.ok(add, `${inga} is found in the Tropical list`);
    await page.locator(aria('button', add.name)).click();
    assert.ok(await has(page, aria('button', 'Share'), 5000), 'the pasted consortium is shown');
    assert.equal((await memberIds(page)).length, 1, 'only the pasted plant: no Temperate member carried over');
    assert.match(await linkOf(page), /[#&]c=tropical/, 'under Tropical');
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Back to your consortium'), 4000), 'Undo goes back to Start, the old consortium kept');
    assert.equal(await page.$eval('input[name="ct-climate"]:checked', (el) => el.value), 'tropical', 'the picked card stays picked');
    assert.equal(await savedFragment(page), before, 'the old consortium is saved again');
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000), 'a reload restores it');
    assert.equal(await linkOf(page), before, 'the Temperate consortium, whole');
    await done(page);
  });
});

test('R2-2: Undo back to an empty Start leaves alone a save another tab wrote meanwhile', async (t) => {
  const names = (await temperate()).slice(0, 2).map((p) => p.name);
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('button', 'Start over')).click();
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(names.join('\n'));
    await page.locator(aria('button', 'Add 2 plants')).click();
    assert.ok(await has(page, aria('button', 'Share'), 5000));
    const other = JSON.stringify({ fragment: 'v=4&c=tropical&l=unsure&s=unsure&w=unsure&m=unsure&a=', at: '2026-11-11T00:00:00.000Z', src: null });
    await page.evaluate((x) => localStorage.setItem('canopi-consortium', x), other);
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await saved(page), other, 'the other tab\'s save is untouched');
    await done(page);
  });
});

test('R2-3: Undo of a paste on a guide link\'s Start puts back the save of an earlier visit', async (t) => {
  const names = (await temperate()).slice(0, 1).map((p) => p.name);
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    const earlier = await saved(page);
    assert.ok(earlier, 'an earlier visit saved its consortium');
    await page.goto(page.url().split('#')[0].split('?')[0] + '?climate=temperate', { waitUntil: 'domcontentloaded' });
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000), 'the guide link opens Start');
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(names.join('\n'));
    await page.locator(aria('button', 'Add 1 plant')).click();
    assert.ok(await has(page, aria('button', 'Share'), 5000));
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await saved(page), earlier, 'the earlier save is back, as it was');
    await done(page);
  });
});

test('T2 (R3-3): Undo of a paste under another card, then Back, leaves the consortium and its save exactly as before', async (t) => {
  // A Tropical-only plant (Start's crop chips, which this picked from, went in PP-B commit 0a').
  const [name] = await tropicalOnly();
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    const before = await linkOf(page);
    await changeSiteTo(page, 'Tropical');
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(name);
    await page.locator(aria('button', 'Add 1 plant')).click();
    assert.ok(await has(page, aria('button', 'Share'), 5000));
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Back to your consortium'), 4000));
    assert.equal(await savedFragment(page), before, 'Undo: the save is the consortium as before');
    await page.locator(aria('button', 'Back to your consortium')).click();
    assert.ok(await has(page, aria('button', 'Share'), 4000));
    assert.equal(await linkOf(page), before, 'Back: the consortium as before, no Tropical crop');
    assert.equal(await savedFragment(page), before);
    await done(page);
  });
});

test('T3 (R3-1): a consortium the reader emptied stays empty, saved, through Change site', async (t) => {
  await behaviour(t, async (v) => {
    const page = await hookedPage(v);
    await openCards(page);
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(page, '.ct-palette-page:not([data-palette-placeholder]) h2[data-view-heading]', 8000));
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000), 'the save reopens');
    await page.waitForFunction(() => typeof window.__ctTest === 'object');
    await page.evaluate(() => { const s = window.__ctTest.store; for (const id of s.members.peek()) s.removeMember(id); });
    const emptied = await savedFragment(page);
    assert.equal(param(emptied, 'a'), '', 'every member removed, saved so');
    await page.locator(aria('button', 'Change site')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await savedFragment(page), emptied, 'Change site does not bring the members back');
    await done(page);
  });
});

test('T4 (R3-1): Start empty under another card is the consortium: Change site keeps it saved', async (t) => {
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    await changeSiteTo(page, 'Tropical');
    await page.locator(aria('button', 'Start empty and search')).click();
    await page.waitForSelector('dialog[open]', { timeout: 8000 });
    await page.keyboard.press('Escape');
    await page.waitForSelector('dialog[open]', { hidden: true, timeout: 4000 });
    const empty = await savedFragment(page);
    assert.deepEqual({ c: param(empty, 'c'), a: param(empty, 'a') }, { c: 'tropical', a: '' });
    await page.locator(aria('button', 'Change site')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await savedFragment(page), empty, 'not the Temperate consortium back');
    await done(page);
  });
});

test('M1 (R4-1): Undo of a paste on a fresh Start puts back the save another tab wrote before the paste', async (t) => {
  const [first] = await temperate();
  await behaviour(t, async (v) => {
    const page = await h.open('/palette/', { ...v, data: 'fixture' });
    await openCards(page);
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await otherTabSaves(page);
    await pasteOne(page, first.name);
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await saved(page), OTHER_TAB, 'the other tab\'s save is back');
    await done(page);
  });
});

test('M2 (R4-1): on a guide link\'s Start, Undo of a paste puts back the newer save another tab wrote, not the one read at open', async (t) => {
  const [first] = await temperate();
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    await page.goto(page.url().split('#')[0].split('?')[0] + '?climate=temperate', { waitUntil: 'domcontentloaded' });
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    await otherTabSaves(page);
    await pasteOne(page, first.name);
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await saved(page), OTHER_TAB);
    await done(page);
  });
});

test('M3 (R4-2): Start over leaves alone a save another tab wrote since', async (t) => {
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    await otherTabSaves(page);
    await page.locator(aria('button', 'Start over')).click();
    assert.ok(await has(page, aria('button', 'Suggest plants'), 4000));
    assert.equal(await saved(page), OTHER_TAB);
    await done(page);
  });
});

test('D1 (R4-3): site answers changed in the draft are not saved until a commit; Back keeps the old ones, Suggest takes the new', async (t) => {
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    const before = await linkOf(page);
    await changeSiteTo(page, 'Tropical');
    await page.locator('input[name="ct-site-water"]:not(:checked)').click();
    assert.equal(await savedFragment(page), before, 'the draft\'s answer is not saved');
    await page.locator(aria('button', 'Back to your consortium')).click();
    assert.ok(await has(page, aria('button', 'Share'), 4000));
    assert.equal(await linkOf(page), before, 'Back: the consortium with its own answers');
    await changeSiteTo(page, 'Temperate');
    await page.locator('input[name="ct-site-water"]:not(:checked)').click();
    const water = await page.$eval('input[name="ct-site-water"]:checked', (el) => el.value);
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(page, '.ct-palette-page:not([data-palette-placeholder]) h2[data-view-heading]', 8000));
    assert.equal(param(await savedPlace(page), 'w'), water, `Suggest commits the draft's answer (place ${await savedPlace(page)})`);
    await done(page);
  });
});

test('pre-push 1: a guest removed from the consortium gives no "no longer in the list" notice after a reload', async (t) => {
  const [guest] = await tropicalOnly();
  await behaviour(t, async (v) => {
    const page = await hookedPage(v);
    await openCards(page);
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(page, '.ct-palette-page:not([data-palette-placeholder]) h2[data-view-heading]', 8000));
    await page.evaluate(async (name) => {
      const s = window.__ctTest.store;
      const id = (await s.loadPool('Tropical')).find((x) => x.canonical_name === name).id;
      s.addMembers([id], { [id]: 'Tropical' });
      s.removeMember(id);
    }, guest);
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000));
    const notes = await page.$$eval('#ct-root .ct-notice', (els) => els.map((e) => e.textContent));
    assert.ok(!notes.some((x) => /no longer in the list/.test(x)), `no false notice (${notes.join(' | ')})`);
    await done(page);
  });
});

test('F3: Undo of a plant added in the Paste sheet keeps the focus in the sheet', async (t) => {
  await behaviour(t, async (v) => {
    const page = await h.open('/palette/', { ...v, data: 'fixture' });
    await openCards(page);
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill('Inga edulis');
    await page.locator(aria('button', 'Add anyway')).click();
    await page.locator('dialog[open] .ct-toast-undo').click();
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 3000 }).catch(() => {});
    const inSheet = await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'));
    assert.ok(inSheet, `focus stays in the open sheet (${JSON.stringify(await focused(page))})`);
    await done(page);
  });
});
