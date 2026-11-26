// Wave 7.5 regression tests:
// - C1: buildTier2AV07 calls native v0.7.1 wasmSoilAwcWithRock once (no double rock discount; dryDaysReserve=null when vpd is null).
// - C2: App.tsx keeps page <Toast /> mounted without legacy <Sheets /> router.
// - C3: Share link with o= and saved location both settle via state/location.ts without views/location/*.
// - A10: Retired verdict.ts / verdict-load.ts / legacy views are gone; report.ts is the sole verdict engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildTier2AV07 } from '../src/islands/palette/state/climate-v07.ts';
import { wasmSoilAwcWithRock } from '../src/lib/climate/index.ts';

test('C1: buildTier2AV07 uses native v0.7.1 wasmSoilAwcWithRock with zero double rock discount', async () => {
  const loc = {
    lat: 45.76,
    lon: 4.84,
    source: 'search',
    lookup: {
      lat: 45.76,
      lon: 4.84,
      climate: { cellLat: 45.75, cellLon: 4.85, distanceCells: 0, periods: [] },
      soil: { phH2o: 6.5, sandPct: 40, clayPct: 25, texture: 'loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
      regions: { wgsrpdL3: 'FRA', isoA2: 'FR' },
    },
  };
  const tier2A = {
    extremesTail: null,
    phenology: null,
    waterBalance: { cell_lat: 45.75, cell_lon: 4.85, tile: 'n50e000', cwd_mm: 180, cwd_p90_mm: 240, cdd_max_days: 22, vpd_summer_kpa: 1.5 },
    soilPlus: {
      lat: 45.76, lon: 4.84, cell_lat: 45.75, cell_lon: 4.85, distance_cells: 0, tile: 'n50e000',
      soc_0_30_g_kg: 18, om_0_30_pct: 3.0, bdod_0_30_g_cm3: 1.3,
      cfvo_0_30_pct: 30, cfvo_30_100_pct: 50, ph_30_100: 6.8, clay_30_100_pct: 28,
    },
  };
  const expected = await wasmSoilAwcWithRock(40, 25, 3.0, 30, 50);
  assert.ok(expected);
  const res = await buildTier2AV07(loc, tier2A, null);
  assert.equal(res.soilPlus?.awcMmPerM, Math.round(expected.awc_mm_per_m), 'matches native Rust WASM once (no double discount)');
  const etMmDay = Math.max(3.0, Math.min(7.5, 3.2 + 1.5 * 1.4));
  assert.equal(res.soilPlus?.dryDaysReserve, Math.max(1, Math.round(expected.awc_100cm_mm / etMmDay)));

  // L11 invariant preserved: missing VPD leaves dryDaysReserve = null
  const noVpd = await buildTier2AV07(loc, { ...tier2A, waterBalance: null }, null);
  assert.equal(noVpd.soilPlus?.awcMmPerM, Math.round(expected.awc_mm_per_m));
  assert.equal(noVpd.soilPlus?.dryDaysReserve, null);
});

test('C2 & A10: App.tsx mounts <Toast /> directly; retired verdict.ts and legacy views are deleted', () => {
  const app = readFileSync(new URL('../src/islands/palette/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /<Toast\s*\/>/, 'App.tsx keeps page <Toast /> mounted');
  assert.doesNotMatch(app, /<Sheets|views\/Sheets/, 'App.tsx no longer imports or renders legacy Sheets');
  for (const gone of [
    'src/lib/palette/verdict.ts',
    'src/lib/palette/verdict-load.ts',
    'src/lib/palette/site-change-line.ts',
    'src/islands/palette/views/Sheets.tsx',
    'src/islands/palette/views/location/location.tsx',
    'src/islands/palette/views/details/Details.tsx',
    'src/islands/palette/views/find/Find.tsx',
  ]) {
    assert.equal(existsSync(new URL(`../${gone}`, import.meta.url)), false, `${gone} deleted`);
  }
});

test('C3: main.ts wires location restore to state/location.ts; o= share link and saved location both settle', async () => {
  const mainSrc = readFileSync(new URL('../src/islands/palette/main.ts', import.meta.url), 'utf8');
  assert.match(mainSrc, /from '\.\/state\/location\.ts'/, 'main.ts imports settle/adoptLinkLocation from state/location.ts');
  assert.doesNotMatch(mainSrc, /views\/location/, 'main.ts does not reference deleted views/location/*');

  const restoreM = await import('../src/islands/palette/state/restore.ts');
  const store = await import('../src/islands/palette/store.ts');
  const calls = [];
  const prev = restoreM.provideLocationStep(() => Promise.resolve({
    settle: async (how, saved) => { calls.push({ how, saved }); },
    adopt: () => true,
  }));
  const prevLoc = store.location.peek();
  const prevSrc = store.source.peek();
  try {
    store.location.value = null;
    restoreM.ownLocation(JSON.stringify({ lat: 45.76, lon: 4.84, source: 'search', label: 'Lyon, France' }));
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].how, 'saved');
    assert.match(calls[0].saved ?? '', /Lyon, France/);

    // Share link with o= invokes settle('link')
    store.source.value = {
      info: () => ({ releaseId: 'test', climates: ['Temperate'] }),
      pool: async () => [{ id: 'p1', canonical_name: 'Malus domestica', common_name: 'Apple', names: {} }],
      interactions: async () => [],
      countries: () => new Map(),
    };
    const ok = await restoreM.restore('v=5&c=temperate&o=45.76,4.84&n=Lyon&e=1', { from: 'link' });
    assert.equal(ok, true, 'share link with o= restores cleanly');
    assert.equal(store.location.peek()?.source, 'link');
    assert.equal(store.location.peek()?.label, 'Lyon');
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(calls.some((c) => c.how === 'link'), 'o= share link triggers settle("link")');
  } finally {
    restoreM.provideLocationStep(prev);
    store.location.value = prevLoc;
    store.source.value = prevSrc;
  }
});
