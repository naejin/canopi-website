// F1a stream 4 (Balance panel; plan F1a stream 4, design check §4 stream 4, A2 A3 A19-A22, §5): one
// browser test per user scenario, written failing in commit 0, each marked expected-fail
// (scripts/expect-fail.mjs failing()) for its owner bal2 (chunk 2; scripts/plan/f1a-owners.json) with its
// plan label (F1a-Bn). bal2 removes each marker in the commit that makes it pass. No layout or wording
// is pinned. The page contract:
// - the panel [data-balance] on Palette (views/lazy.tsx balancePanel, role `balance`; pal2 places it);
// - one [data-balance-check="<id>"] per check (types.ts balanceCheckIds) with data-state its
//   BalanceState (core balance.ts, the same checks the strip reads), and its "Find…" [data-find];
// - Add opened by "Find…": store.sheet kind 'add', store.addPreset.value.hint set (A22);
// - a hedge on a check: data-conf="<ConfidenceTerm>" (estimate on a borrowed list).
import assert from 'node:assert/strict';
import { h, has, suggestReady, useHarness } from './helpers.mjs';
import { atSite, choose, tool } from './p5-helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { siteAt, suggestOn } from './f1a-helpers.mjs';

useHarness();

const PANEL = 'Balance: no panel on Palette';
const stateOf = (page, id) => page.$eval(`[data-balance-check="${id}"]`, (e) => e.dataset.state).catch(() => null);
// Suggest through the primary action, then the Balance panel on screen.
async function palette(page, zone) {
  await suggestOn(page, zone);
  assert.ok(await has(page, '[data-balance] [data-balance-check]', 8000), PANEL);
  return page;
}
const seville = async (opts) => { const page = await tool(opts); await atSite(page, 'seville'); return palette(page, 'Mediterranean'); };

failing('F1a-B5 (bal2 Seville water and margin, A20 A22): the water-needs mix and the climate-margin spread are judged, and a check\'s "Find…" opens Add with its line as a hint', { owner: 'bal2', reason: /Balance: no panel on Palette/ }, async () => {
  const page = await seville();
  for (const id of ['water', 'margin']) assert.ok(['ok', 'gap', 'not-enough-data'].includes(await stateOf(page, id)), `${id} is judged at Seville`);
  const finder = await page.$('[data-balance-check][data-state="gap"] [data-find]');
  assert.ok(finder, 'a check with a gap offers "Find…"');
  await finder.click();
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind === 'add', { timeout: 10_000 }).then(() => true, () => false), '"Find…" opens Add');
  assert.ok(await page.evaluate(() => !!window.__ctTest.store.addPreset.value?.hint), 'Add carries the check\'s line as a hint');
});

failing('F1a-B6 (bal2 legume-heavy Tropical palette, A20): when most members share one family the family spread is a gap', { owner: 'bal2', reason: /Balance: no panel on Palette/ }, async () => {
  const page = await tool();
  await atSite(page, 'manaus');
  await choose(page, 'Tropical');
  await page.evaluate(() => {
    const { store } = window.__ctTest;
    const legumes = store.pool.value.filter((t) => t.family === 'Fabaceae').slice(0, 6).map((t) => t.id);
    const others = store.pool.value.filter((t) => t.family !== 'Fabaceae').slice(0, 2).map((t) => t.id);
    store.addMembers([...legumes, ...others]);
    store.view.value = 'palette';
  });
  assert.ok(await has(page, '[data-balance] [data-balance-check]', 8000), PANEL);
  assert.equal(await stateOf(page, 'family'), 'gap', 'six legumes of eight: the family spread is a gap');
});

failing('F1a-B7 (bal2 no location, A20): without a site location the site checks say so and none passes', { owner: 'bal2', reason: /Balance: no panel on Palette/ }, async () => {
  const page = await palette(await tool(), 'Temperate');
  assert.equal(await stateOf(page, 'margin'), 'not-checked', 'the climate margin waits for a location');
  const ids = await page.$$eval('[data-balance-check]', (els) => els.map((e) => e.dataset.balanceCheck));
  assert.deepEqual(ids, ['family', 'margin', 'water', 'flowering', 'food', 'evergreen', 'roots', 'insects', 'season'], 'every check is listed, the waiting ones too');
});

failing('F1a-B8 (bal2 borrowed climate, A15 A20): on a borrowed list the checks carry the estimate term', { owner: 'bal2', reason: /Balance: no panel on Palette/ }, async () => {
  const page = await tool();
  await siteAt(page, [24.7136, 46.6753], 'Riyadh'); // BWh: Arid, borrowed
  await palette(page, 'Arid');
  assert.ok(await has(page, '[data-balance] [data-conf="estimate"]', 4000), 'the Balance panel says its checks are estimates');
});

failing('F1a-B9 (bal2 Balance chunk fails, A3 §5 Unreadable/Retried/Unmounted): the panel says it could not load with Reload, the strip still works, the next use fetches it again as ?retry=n, and a panel left while its chunk loads writes nothing', { owner: 'bal2', reason: /the balance role has a chunk in this build/ }, async () => {
  assert.ok(h.roles.balance.length, 'the balance role has a chunk in this build (none until pal2 places the panel)');
  const urls = [];
  const page = await tool({ block: { balance: 404 }, setup: async (pg) => { pg.on('request', (r) => urls.push(r.url())); } });
  await atSite(page, 'seville');
  await choose(page, 'Mediterranean');
  await suggestReady(page);
  await page.click('.ct-cta .button-primary');
  assert.ok(await has(page, '[data-balance] .ct-notice[role="alert"] button', 10_000), 'the failed line with Reload');
  assert.ok(await page.waitForFunction(() => document.querySelector('[data-strip]')?.dataset.stripState === 'ready', { timeout: 15_000 }).then(() => true, () => false), 'the strip still works (its checks are core)');
  await page.click('[data-view-switch="structure"]');
  await page.click('[data-view-switch="palette"]');
  for (let i = 0; i < 40 && !urls.some((u) => /\?retry=\d+$/.test(u)); i++) await new Promise((r) => setTimeout(r, 200));
  assert.ok(urls.some((u) => /\?retry=\d+$/.test(u)), 'the next use fetches the chunk again (?retry=n)');
  // Held, then Palette left for Structure before it comes: no toast and no state write.
  const held = await tool({ block: { balance: 'hold' } });
  await choose(held, 'Temperate');
  await suggestReady(held);
  await held.click('.ct-cta .button-primary');
  await held.click('[data-view-switch="structure"]');
  const before = await held.evaluate(() => JSON.stringify(window.__ctTest.store.members.value));
  await held.releaseHeld();
  await held.waitForNetworkIdle({ idleTime: 300, timeout: 5000 }).catch(() => {});
  assert.equal(await held.evaluate(() => window.__ctTest.store.toast.value), null, 'no stale toast');
  assert.equal(await held.evaluate(() => JSON.stringify(window.__ctTest.store.members.value)), before, 'no state write');
});

failing('F1a-B10 (bal2 Tropical water, A20): at Manaus the water-needs mix says there is not enough data, never a pass', { owner: 'bal2', reason: /Balance: no panel on Palette/ }, async () => {
  const page = await tool();
  await atSite(page, 'manaus');
  await palette(page, 'Tropical');
  assert.equal(await stateOf(page, 'water'), 'not-enough-data', 'Tropical water needs are recorded for too few plants (52 of 200)');
});
