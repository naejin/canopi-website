// F1a stream 1 (Palette and Structure; plan F1a stream 1, design check §4 stream 1 and §5): one browser
// test per user scenario, written failing in commit 0. Each is marked expected-fail
// (scripts/expect-fail.mjs failing()) with its owner stream in the title (pal1 in chunk 1, pal2 in
// chunk 2; scripts/plan/f1a-owners.json) and its plan label (F1a-Pn, the amendment it serves); the
// owner removes the marker in the commit that makes it pass (the call becomes test()). No layout or
// wording is pinned: the tests read the store through the test hook, roles, and the data attributes
// below. The owner may rename an attribute or a token within its chunk, keeping the case.
//
// The page contract these specs read (F1a; the streams implement it):
// - store.view.value: 'start' | 'palette' | 'structure' (types.ts View, A6); a Structure link carries
//   its view under v4 with no version bump (VIEW_KEY below: the plan's `w` is v4's water key, so pal1
//   picks the key and the token; old links open Palette);
// - [data-view="palette" | "structure"] on each view's root; [data-view-switch="palette" | "structure"]
//   the two controls that switch them;
// - Palette: [data-group="<job>" | "none"] per role group (A4) with the cards ([data-plant-id]) in it,
//   [data-more] a folded group's "+ N more", input[data-palette-search], [data-remove] on a card;
// - the health strip [data-strip] with data-strip-state 'checking' | 'ready' | 'unavailable' (A12); the
//   gap list's rows [data-gap="<job>"], each with its "Find…" [data-find];
// - store.sheet.value.kind 'add' and store.addPreset.value (the AddPreset openAdd carried, A22);
// - [data-head-placeholder] while a saved consortium restores (A7); the room answer 'pots' (A8) as
//   input[name="ct-site-room"][value="pots"].
// Run capped: npm run test:browser (scripts/browser/run.mjs), or this file alone with node --test.
import assert from 'node:assert/strict';
import { h, has, suggestReady, useHarness } from './helpers.mjs';
import { atSite, choose, temperateLink, tool } from './p5-helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { suggestedAt } from './f1a-helpers.mjs';

useHarness();

// The link key of the view (A6). The plan names `w`, which v4 already uses for the water answer
// (state.ts encodeLink: l, s, w, m), so pal1 picks a free key and sets it here with the token.
const VIEW_KEY = 'y';
const storeView = (page) => page.evaluate(() => window.__ctTest.store.view.value);
const memberCount = (page) => page.evaluate(() => window.__ctTest.store.members.value.length);

failing('F1a-P1 (pal2 Lyon first visit, A3 A11 A12): after Suggest, Palette shows the cards, the health strip settles and a gap\'s "Find…" opens Add preset to that gap', { owner: 'pal2', reason: /Suggest opens Palette \(the view is "matrix" today\)/ }, async () => {
  const page = await suggestedAt('lyon', 'Temperate');
  const view = await storeView(page);
  assert.equal(view, 'palette', `Suggest opens Palette (the view is "${view}" today)`);
  assert.ok(await has(page, '[data-view="palette"] [data-plant-id]', 8000), 'Palette shows the members');
  assert.ok(await page.waitForFunction(() => document.querySelector('[data-strip]')?.dataset.stripState === 'ready', { timeout: 15_000 }).then(() => true, () => false), 'the strip settles');
  const job = await page.$eval('[data-gap]', (e) => e.dataset.gap);
  await page.click(`[data-gap="${job}"] [data-find]`);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind === 'add', { timeout: 10_000 }).then(() => true, () => false), '"Find…" opens Add');
  assert.equal(await page.evaluate(() => window.__ctTest.store.addPreset.value?.job), job, 'Add opens preset to the gap\'s job');
});

failing('F1a-P2 (pal1 return visit, A7): a saved consortium reopens on Palette with a Head placeholder while it restores; the Start form never shows', { owner: 'pal1', reason: /return visit: / }, async () => {
  const save = JSON.stringify({ fragment: (await temperateLink()).slice(1), at: '2026-11-13T00:00:00.000Z', src: null });
  const page = await h.open('/consortium/', { hook: true, mapTiles: 'stub', setup: (pg) => pg.evaluateOnNewDocument((s) => {
    if (!localStorage.getItem('canopi-consortium')) localStorage.setItem('canopi-consortium', s);
    window.__seen = { start: false, placeholder: false };
    new MutationObserver(() => {
      if (document.querySelector('#ct-root input[name="ct-climate"]')) window.__seen.start = true;
      if (document.querySelector('[data-head-placeholder]')) window.__seen.placeholder = true;
    }).observe(document, { subtree: true, childList: true, attributes: true });
  }, save) });
  assert.ok(await page.waitForFunction(() => window.__ctTest?.store?.members.value.length === 5, { timeout: 20_000 }).then(() => true, () => false), 'the saved members restored');
  const seen = await page.evaluate(() => window.__seen);
  assert.equal(seen.start, false, 'return visit: the Start form showed while restoring');
  assert.equal(seen.placeholder, true, 'return visit: no Head placeholder while restoring');
  assert.equal(await storeView(page), 'palette', 'return visit: opens Palette');
});

failing('F1a-P3 (pal1 Structure link at 390 px, A6 §5): the phone grid at the saved stage, kept across a resize past 960; pressed before its prefetch, Structure shows a loading line and fetches once', { owner: 'pal1', reason: /Structure link: opens Structure/ }, async () => {
  const link = (await temperateLink()).replace(/&e=1$/, `&t=3&${VIEW_KEY}=structure&e=1`);
  const page = await tool({ width: 390, hash: link });
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 5, { timeout: 20_000 }).then(() => true, () => false), 'the link\'s members');
  const view = await storeView(page);
  assert.equal(view, 'structure', `Structure link: opens Structure (view "${view}")`);
  const stage = await page.evaluate(() => window.__ctTest.store.stage.value);
  assert.equal(stage, 3, 'the saved stage');
  await page.setViewport({ width: 1280, height: 900 });
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => window.__ctTest.store.stage.value), stage, 'a resize across 960 keeps the stage');
  // Pressed before the prefetch: the chunk held, a loading line, then one request for it.
  const requests = [];
  const held = await tool({ block: { structure: 'hold' }, setup: async (pg) => { pg.on('request', (r) => requests.push(new URL(r.url()).pathname)); } });
  await choose(held, 'Temperate');
  await suggestReady(held);
  await held.click('.ct-cta .button-primary');
  await held.click('[data-view-switch="structure"]');
  assert.ok(await has(held, '[data-view="structure"] [role="status"], [role="status"]', 4000), 'a loading line while Structure loads');
  await held.releaseHeld();
  assert.ok(await has(held, '[data-view="structure"] table', 10_000), 'Structure draws once its chunk comes');
  assert.equal(requests.filter((p) => h.roles.structure.includes(p)).length, 1, 'one request for the structure chunk');
});

failing('F1a-P4 (pal1 Seville pots, A8): "Balcony or pots" suggests plants within its height, and a tall plant added still shows its height note', { owner: 'pal1', reason: /no "Balcony or pots" room answer on Start/ }, async () => {
  const page = await tool();
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  assert.ok(await has(page, 'input[name="ct-site-room"][value="pots"]', 4000), 'no "Balcony or pots" room answer on Start');
  await page.click('input[name="ct-site-room"][value="pots"]');
  await suggestReady(page);
  await page.click('.ct-cta .button-primary');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'Suggest placed plants');
  const tallest = await page.evaluate(() => Math.max(...window.__ctTest.store.memberTaxa.value.map((t) => t.traits.height_m?.max ?? 0)));
  assert.equal(await page.evaluate(() => window.__ctTest.store.site.value.room), 'pots', 'the site keeps the pots answer');
  assert.ok(tallest <= 6, `the suggested plants stay small, no taller than a small garden allows (tallest ${tallest} m)`);
  const tall = await page.evaluate(() => {
    const { store } = window.__ctTest;
    const t = store.pool.value.find((x) => (x.traits.height_m?.max ?? 0) > 10 && !store.members.value.includes(x.id));
    store.addMembers([t.id]);
    return t.id;
  });
  assert.ok(await has(page, `[data-plant-id="${tall}"] [data-mark="room"], [data-plant-id="${tall}"][data-mark="room"]`, 8000), 'the tall plant shows its height note');
});

failing('F1a-P5 (pal1 200-plant palette, A4 A11): groups fold to "+ N more", the palette search finds a plant, and Remove takes it out', { owner: 'pal1', reason: /Palette: the view is not on the page/ }, async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  const target = await page.evaluate(() => {
    const { store } = window.__ctTest;
    const ids = store.pool.value.slice(0, 200).map((t) => t.id);
    store.addMembers(ids);
    store.view.value = 'palette';
    const t = store.pool.value[150];
    return { id: t.id, name: t.canonical_name };
  });
  assert.ok(await has(page, '[data-view="palette"]', 8000), 'Palette: the view is not on the page');
  assert.ok(await has(page, '[data-view="palette"] [data-more]', 4000), 'a large group folds to "+ N more"');
  await page.type('input[data-palette-search]', target.name);
  assert.ok(await has(page, `[data-view="palette"] [data-plant-id="${target.id}"]`, 4000), 'the search finds the plant');
  const before = await memberCount(page);
  await page.click(`[data-view="palette"] [data-plant-id="${target.id}"] [data-remove]`);
  assert.ok(await page.waitForFunction((n) => window.__ctTest.store.members.value.length === n - 1, { timeout: 4000 }, before).then(() => true, () => false), 'Remove takes it out');
});

failing('F1a-P6 (pal1 Structure chunk fails, §5 Unreadable/Retried): Palette stays usable, Structure says it could not load with Reload, and the next press fetches it again as ?retry=n', { owner: 'pal1', reason: /the structure role has a chunk in this build/ }, async () => {
  assert.ok(h.roles.structure.length, 'the structure role has a chunk in this build (none until pal1 moves the matrix)');
  const urls = [];
  const page = await suggestedAt(null, 'Temperate', { block: { structure: 404 }, setup: async (pg) => { pg.on('request', (r) => urls.push(r.url())); } });
  assert.ok(await has(page, '[data-view="palette"] [data-plant-id]', 8000), 'Palette is usable');
  await page.click('[data-view-switch="structure"]');
  assert.ok(await has(page, '.ct-notice[role="alert"] button', 8000), 'the failed line with Reload');
  assert.ok(page.blocked.some((u) => h.roles.structure.includes(u)), 'the structure chunk was refused');
  await page.click('[data-view-switch="palette"]');
  await page.click('[data-view-switch="structure"]');
  for (let i = 0; i < 40 && !urls.some((u) => /\?retry=\d+$/.test(u)); i++) await new Promise((r) => setTimeout(r, 200));
  assert.ok(urls.some((u) => /\?retry=\d+$/.test(u)), 'the next press fetches the chunk again (?retry=n)');
});

failing('F1a-P7 (pal1 Suggest waits for the future chunk, owner Q2): with a location, Suggest places nothing until the future check can rank ties, then suggests', { owner: 'pal1', reason: /Suggest placed \d+ plants? before the future chunk came/ }, async () => {
  const page = await tool({ block: { future: 'hold' } });
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  await suggestReady(page);
  await page.click('.ct-cta .button-primary');
  await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 1000 }).catch(() => {});
  const early = await memberCount(page);
  assert.equal(early, 0, `Suggest placed ${early} plants before the future chunk came`);
  await page.releaseHeld();
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'then it suggests');
});

failing('F1a-P8 (pal2 keyboard journey, A25): with the keyboard only, the view switch moves between Palette and Structure, and Add opened by "Find…" returns the focus to it when closed', { owner: 'pal2', reason: /keyboard: no view switch on the page/ }, async () => {
  const page = await suggestedAt('seville', 'Mediterranean');
  assert.ok(await has(page, '[data-view-switch="structure"]', 4000), 'keyboard: no view switch on the page');
  await page.focus('[data-view-switch="structure"]');
  await page.keyboard.press('Enter');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.view.value === 'structure', { timeout: 8000 }).then(() => true, () => false), 'Enter on the switch opens Structure');
  await page.focus('[data-view-switch="palette"]');
  await page.keyboard.press('Enter');
  assert.ok(await has(page, '[data-gap] [data-find]', 8000), 'the gap list\'s "Find…"');
  await page.focus('[data-gap] [data-find]');
  await page.keyboard.press('Enter');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind === 'add', { timeout: 10_000 }).then(() => true, () => false), 'Add opens');
  await page.keyboard.press('Escape');
  assert.ok(await page.waitForFunction(() => document.activeElement?.matches('[data-find]'), { timeout: 4000 }).then(() => true, () => false), 'closing Add returns the focus to "Find…"');
  assert.equal(await page.$('dialog[open]'), null, 'no dialog left open');
});
