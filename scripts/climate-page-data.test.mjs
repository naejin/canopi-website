// P5 commit 0: the climate tile names the consortium page hands the island (#ct-climate), so S5b's
// location reader knows which tiles exist without fetching the index and without editing the page.
// Only the base path and the tile names per layer: no sizes, no hashes. Small: under 2 KB gzip.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const { climatePageData, CLIMATE_PAGE_DATA_GZIP_BUDGET } = await import('../src/data/climate-page-data.ts');
const { siteIndex } = await import('../src/lib/climate/index.ts');

const index = {
  base: '/data/climate/0.2.0-x/', release: { grid_manifest_sha256: 'f'.repeat(64) },
  layers: {
    climate: { dir: 'climate', tiles: { n50e000: 10, n40e000: 9 }, sha256: { n50e000: 'a' } },
    soil: { dir: 'soil', tiles: { n40e000: 4 }, sha256: {} },
    regions: { dir: 'regions', tiles: {}, sha256: {} },
  },
};

test('climatePageData: the base and each layer\'s sorted tile names, nothing else; siteIndex reads it as is', () => {
  const d = climatePageData(index);
  assert.deepEqual(d, { base: '/data/climate/0.2.0-x/', layers: { climate: { tiles: ['n40e000', 'n50e000'] }, soil: { tiles: ['n40e000'] }, regions: { tiles: [] } } });
  assert.doesNotMatch(JSON.stringify(d), /sha|f{64}/, 'no hashes');
  assert.deepEqual([...siteIndex(d).tiles.climate].sort(), ['n40e000', 'n50e000']);
  assert.equal(climatePageData(null), null, 'no climate index (a dev build without tiles): null, the location step says so');
  assert.equal(climatePageData({ base: '/x/', layers: {} }), null, 'an index without its layers: null');
});

test('climatePageData on the installed index stays under its gzip budget', { skip: !existsSync('src/data/climate-index.json') && 'no climate index installed' }, () => {
  const d = climatePageData(JSON.parse(readFileSync('src/data/climate-index.json', 'utf8')));
  const gz = gzipSync(JSON.stringify(d)).length;
  assert.ok(gz <= CLIMATE_PAGE_DATA_GZIP_BUDGET, `${gz} B gzip > ${CLIMATE_PAGE_DATA_GZIP_BUDGET}`);
});
