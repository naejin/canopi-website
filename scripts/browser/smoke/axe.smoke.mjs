// axe smoke (E4; design check E6 row R8, A17): axe-core's WCAG 2.x A and AA rules over the built
// pages (dist/, production, no test hook), in both themes at 1280 px, and the filled consortium at
// 390 px too. Violations are counted by page variant + rule id and compared with the baseline
// scripts/quality/baselines/axe.json: a new rule id or a higher count fails (CI job 4 and locally); a
// lower count or a rule gone prints "baseline stale" and passes. Only the merge agent rewrites the
// baseline: CANOPI_AXE_WRITE=1 npm run test:axe. Run after `npm run build`, capped:
//   timeout 300 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 npm run test:axe
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadState } from '../harness.mjs';
import { BUILDS } from '../serve.mjs';
import { aria, en, h, has, useHarness } from '../helpers.mjs';
import { compareCounts } from '../../quality/ratchet.mjs';

const require = createRequire(import.meta.url);
const AXE_FILE = require.resolve('axe-core/axe.min.js');
const AXE_SOURCE = readFileSync(AXE_FILE, 'utf8');
const AXE_VERSION = JSON.parse(readFileSync(require.resolve('axe-core/package.json'), 'utf8')).version;
const BASELINE = fileURLToPath(new URL('../../quality/baselines/axe.json', import.meta.url));
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BUDGET_S = 120; // warn only (time ratchets never fail)

// The page list: every page kind of the site once (localised pages share their templates; French
// stands for the other ten, and its longer strings are the ones that wrap), the consortium in its two
// first states. `matrix` presses Suggest on a temperate site so the filled matrix is checked.
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'home fr', path: '/fr/' },
  { name: 'consortium start', path: '/consortium/', ready: true },
  { name: 'consortium matrix', path: '/consortium/', ready: true, matrix: true, phone: true },
  { name: 'consortium fr start', path: '/fr/consortium/', ready: true },
  { name: 'guides', path: '/guides/' },
  { name: 'guide', path: '/guides/food-forest/' },
  { name: 'bibliography', path: '/bibliography/' },
  { name: 'data sources', path: '/data-sources/' },
  { name: 'privacy', path: '/privacy/' },
];
const variants = (p) => [{ width: 1280, theme: 'light' }, { width: 1280, theme: 'dark' }, ...(p.phone ? [{ width: 390, theme: 'light' }] : [])];

useHarness({ dir: BUILDS.production });

async function axeCounts(page) {
  // Settled first: pages fill parts after a fetch (the home page's featured design writes its links
  // from /data/featured-designs.json), and a count taken mid-fill flips between runs.
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => r()))));
  await page.evaluate(AXE_SOURCE);
  const result = await page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
  }, TAGS);
  return result;
}

test('axe (dist/, WCAG 2.x A/AA): no new rule id and no higher count than the baseline, per page variant', { timeout: 300_000 }, async () => {
  const t0 = performance.now();
  const counts = {};
  const samples = {};
  for (const p of PAGES) {
    for (const v of variants(p)) {
      const page = await h.open(p.path, v);
      if (p.ready) assert.equal(await loadState(page), 'ready', `${p.name}: the tool loads`);
      if (p.matrix) {
        await page.locator(aria('radio', 'Temperate')).click();
        await page.locator(aria('button', en['consortium.start.suggest'])).click();
        assert.ok(await has(page, '#ct-root [data-plant-id]', 15_000), `${p.name}: members in the matrix`);
      }
      for (const r of await axeCounts(page)) {
        const key = `${p.name} @ ${v.width}px ${v.theme}|${r.id}`;
        counts[key] = r.nodes;
        samples[key] = `${r.impact}: ${r.sample.join(', ')}`;
      }
      await page.close();
    }
  }
  const seconds = (performance.now() - t0) / 1000;
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : 1)));
  if (process.env.CANOPI_AXE_WRITE === '1') {
    writeFileSync(BASELINE, `${JSON.stringify({ tool: 'axe-core', version: AXE_VERSION, tags: TAGS, counts: sorted }, null, 2)}\n`);
    process.stdout.write(`# axe: baseline written, ${Object.keys(sorted).length} key(s) (merge agent only)\n`);
    return;
  }
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
  assert.equal(baseline.version, AXE_VERSION, 'axe-core upgraded: the upgrade is its own commit with a regenerated baseline');
  assert.deepEqual(baseline.tags, TAGS, 'the rule tags changed: regenerate the baseline in the same commit');
  const { rises, stale } = compareCounts(baseline.counts, sorted);
  if (stale.length) process.stdout.write(`# WARN axe: baseline stale (the merge agent regenerates it):\n${stale.map((s) => `#   - ${s}`).join('\n')}\n`);
  const time = `${seconds.toFixed(1)} s (budget ${BUDGET_S} s)`;
  if (seconds > BUDGET_S) process.stdout.write(`# WARN axe: ${time}, over budget (time warns only)\n`);
  process.stdout.write(`# axe: ${PAGES.reduce((n, p) => n + variants(p).length, 0)} page variants, ${Object.keys(sorted).length} known violation key(s), ${time}\n`);
  assert.deepEqual(rises, [], `new accessibility violations:\n${rises.map((r) => `  ${r} (${samples[r.split(':')[0]] ?? ''})`).join('\n')}`);
});
