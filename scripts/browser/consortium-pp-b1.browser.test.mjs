// PP-B streams b1a (your place, arriving and sharing) and b1b (the pool count into Place): their
// browser tests (plant-palette-slices, PP-B rows). Commit 0 moved F1a-P4 here unchanged from
// consortium-f1a-palette, verified still failing for its stated reason after 0a (expected-fail,
// scripts/expect-fail.mjs failing(), owner b1a in the title): b1a keeps the pots answer and the Suggest
// height limit; the card height note (its last assertion) moves to b3, rewritten on Your plants.
// Run capped: npm run test:browser (scripts/browser/run.mjs).
import assert from 'node:assert/strict';
import { has, suggestReady, useHarness } from './helpers.mjs';
import { atSite, choose, tool } from './p5-helpers.mjs';
import { failing } from '../expect-fail.mjs';

useHarness();

failing('F1a-P4 → PP-B (b1a Seville pots, A8): "Balcony or pots" suggests plants within its height, and a tall plant added still shows its height note', { owner: 'b1a', reason: /no "Balcony or pots" room answer on Start/ }, async () => {
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
