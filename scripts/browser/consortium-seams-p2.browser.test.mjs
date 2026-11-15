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
import { esc, done, temperate, cellIn, suggested, memberIds, addRows, fitsShade, linkOf, saved, savedFragment, tropicalOnly, param, placeTo, toPlace, showPalette, OTHER_TAB, otherTabSaves, pasteOne, focused, hookedPage, openAdd, savedPlace } from './seams-helpers.mjs';
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

test('X3: a list pasted on Start and shown is the consortium with Share, saved: a reload keeps it', async (t) => {
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
    // The list stays on Place (b1a conformance-2) until "Show my palette".
    await showPalette(page);
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

// Review R4-3 changed this seam: a site answer given back on Place (the palette's step 1; "Change
// site" until b1a conformance-4) is the draft's, and a commit (a paste of a plant not in the
// consortium here, then "Show my palette") saves it; D1 covers the draft.
test('X3: a site answer made back on Place is saved with the commit, and a reload keeps it', async (t) => {
  const plants = await temperate();
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    const ids = new Set(await memberIds(page));
    const other = plants.find((p) => !ids.has(p.id));
    assert.ok(other, 'a Temperate plant not in the consortium');
    await toPlace(page);
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

test('F2: Undo after a list pasted from "Start over" and shown goes back to Start and keeps nothing saved', async (t) => {
  const plants = await temperate();
  const names = plants.slice(0, 3).map((p) => p.name);
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('button', 'Start over')).click();
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(names.join('\n'));
    await page.locator(aria('button', 'Add 3 plants')).click();
    await showPalette(page);
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', en['consortium.start.suggest']), 4000), 'Undo goes back to Start');
    await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, { timeout: 3000 }).catch(() => {});
    assert.notEqual((await focused(page)).tag, 'body', 'focus is not lost');
    assert.equal(await linkOf(page), '', 'no consortium in the address');
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', en['consortium.start.suggest']), 4000), 'a reload opens Start');
    assert.ok(!(await has(page, aria('button', 'Share'), 800)), 'no empty consortium saved');
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
    await showPalette(page);
    const other = JSON.stringify({ fragment: 'v=4&c=tropical&l=unsure&s=unsure&w=unsure&m=unsure&a=', at: '2026-11-11T00:00:00.000Z', src: null });
    await page.evaluate((x) => localStorage.setItem('canopi-consortium', x), other);
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', en['consortium.start.suggest']), 4000));
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
    assert.ok(await has(page, aria('button', en['consortium.start.suggest']), 4000), 'the guide link opens Start');
    await page.locator(aria('button', 'Paste a list')).click();
    await page.locator('#ct-paste-text').fill(names.join('\n'));
    await page.locator(aria('button', 'Add 1 plant')).click();
    await showPalette(page);
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', en['consortium.start.suggest']), 4000));
    assert.equal(await saved(page), earlier, 'the earlier save is back, as it was');
    await done(page);
  });
});

test('T3 (R3-1): a consortium the reader emptied stays empty, saved, back on Place', async (t) => {
  await behaviour(t, async (v) => {
    const page = await hookedPage(v);
    await openCards(page);
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', en['consortium.start.suggest'])).click();
    assert.ok(await has(page, '.ct-palette-page:not([data-palette-placeholder]) h2[data-view-heading]', 8000));
    await page.reload();
    assert.equal(await loadState(page), 'ready');
    assert.ok(await has(page, aria('button', 'Share'), 8000), 'the save reopens');
    await page.waitForFunction(() => typeof window.__ctTest === 'object');
    await page.evaluate(() => { const s = window.__ctTest.store; for (const id of s.members.peek()) s.removeMember(id); });
    const emptied = await savedFragment(page);
    assert.equal(param(emptied, 'a'), '', 'every member removed, saved so');
    await toPlace(page);
    assert.ok(await has(page, aria('button', en['consortium.start.suggest']), 4000));
    assert.equal(await savedFragment(page), emptied, 'Place does not bring the members back');
    await done(page);
  });
});

// "Start empty and search" went with b1a's Place (PP-B). Another card no longer empties the palette (b1a
// conformance-4: a climate changed keeps every plant), so the palette shown under it keeps its plants.
test('T4 (R3-1): a palette shown under another card is the consortium, every plant kept: back on Place keeps it saved', async (t) => {
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    const before = await linkOf(page);
    await placeTo(page, 'Tropical');
    await page.locator('[data-place-show]').click();
    assert.ok(await has(page, '.ct-palette-page:not([data-palette-placeholder]) h2[data-view-heading]', 8000), 'the palette page');
    const shown = await savedFragment(page);
    assert.deepEqual({ c: param(shown, 'c'), a: param(shown, 'a') }, { c: 'tropical', a: param(before, 'a') });
    await toPlace(page);
    assert.ok(await has(page, aria('button', en['consortium.start.suggest']), 4000));
    assert.equal(await savedFragment(page), shown, 'the palette as shown, under Tropical');
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
    assert.ok(await has(page, aria('button', en['consortium.start.suggest']), 4000));
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
    assert.ok(await has(page, aria('button', en['consortium.start.suggest']), 4000));
    await otherTabSaves(page);
    await pasteOne(page, first.name);
    await page.locator(aria('button', 'Undo')).click();
    assert.ok(await has(page, aria('button', en['consortium.start.suggest']), 4000));
    assert.equal(await saved(page), OTHER_TAB);
    await done(page);
  });
});

test('M3 (R4-2): Start over leaves alone a save another tab wrote since', async (t) => {
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    await otherTabSaves(page);
    await page.locator(aria('button', 'Start over')).click();
    assert.ok(await has(page, aria('button', en['consortium.start.suggest']), 4000));
    assert.equal(await saved(page), OTHER_TAB);
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
    await page.locator(aria('button', en['consortium.start.suggest'])).click();
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
