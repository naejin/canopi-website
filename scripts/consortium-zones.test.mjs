// E6 stream R1 (design check §3 chunk 1, §7.1 "Climate-zone list and order"): one climate-zone list
// and order, src/lib/consortium/zones.ts, that the correction endpoint (src/lib/correction.mjs
// CLIMATES), the site's climate ids (src/data/climates.ts) and the installer (scripts/
// install-consortium.mjs CLIMATE_ZONES, which refuses a manifest zone outside it) agree with, in the
// core's order (types.ts climateZones, canopi-data climates.ord). Written failing in commit 0
// (expected-fail, owner R1): today there is no zones.ts, and correction.mjs and climates.ts list
// Mediterranean before Arid. R1 removes the marker in the commit that makes it pass. The installer
// stays plain node (scripts/package.test.mjs), so it may keep its own copy checked here.
import assert from 'node:assert/strict';
import { failing } from './expect-fail.mjs';
import { climateZones } from '../src/lib/consortium/types.ts';
import { CLIMATES } from '../src/lib/correction.mjs';
import { climates } from '../src/data/climates.ts';
import { CLIMATE_ZONES } from './install-consortium.mjs';

failing('E6 zones (R1 core leaves): one climate-zone list and order for the core, the correction endpoint, the site ids and the installer', { owner: 'R1', reason: /Cannot find module|ERR_MODULE_NOT_FOUND|zones\.ts/ }, async () => {
  const zones = await import('../src/lib/consortium/zones.ts');
  const list = Object.values(zones).find((v) => Array.isArray(v) && v.includes('Temperate'));
  assert.ok(list, 'zones.ts exports the zone list');
  assert.deepEqual([...list], [...climateZones], 'the core order (canopi-data climates.ord)');
  assert.deepEqual([...CLIMATES], [...list], 'correction.mjs CLIMATES');
  assert.deepEqual([...climates], list.map((z) => z.toLowerCase()), 'src/data/climates.ts ids, lowercase');
  assert.deepEqual([...CLIMATE_ZONES], [...list], 'the installer\'s zones');
});
