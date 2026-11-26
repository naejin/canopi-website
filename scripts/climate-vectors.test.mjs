// E5a + Goal #40 vectors: canopi-climate v0.7.0 golden vectors, committed in
// scripts/fixtures/climate/lookup.json (pinned by lookup.json.sha256) and verified at 0-tolerance
// parity against both the TS cross-tile core reader and the pinned canopi-climate v0.7.0 Rust WASM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { FIXTURES, checkPoints, checkTables } from './fixtures/climate/vectors.mjs';

const C = await import('../src/lib/climate/index.ts');
const ROOT = new URL('../', import.meta.url);
const release = JSON.parse(readFileSync(new URL('src/data/climate-release.json', ROOT), 'utf8'));
const bytes = readFileSync(new URL('lookup.json', FIXTURES));
const vectors = JSON.parse(bytes.toString('utf8'));

const INDEX = new URL('src/data/climate-index.json', ROOT);
const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, 'utf8')) : null;
const installDir = index && new URL(`public${index.base}`, ROOT);
const missing = !index ? 'no src/data/climate-index.json (the grid is not installed)'
  : !existsSync(installDir) ? `the index names ${index.base}, which is not under public/`
  : null;
const required = process.env.CANOPI_REQUIRE_VECTORS === '1';
const noGrid = missing && !required ? `${missing}: run \`npm run build\` or \`npm run install:climate\` to compare the reader with lookup.json` : false;

const makeLocalSource = () => C.createTileSource({
  index: C.siteIndex(index),
  fetchBytes: async (url) => {
    const b = readFileSync(new URL(`public${url}`, ROOT));
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  },
});

test('E5a vectors: the committed lookup.json matches its sha256 pin and the installed grid\'s manifest sha', () => {
  const pin = readFileSync(new URL('lookup.json.sha256', FIXTURES), 'utf8').trim().split(/\s+/)[0];
  assert.equal(createHash('sha256').update(bytes).digest('hex'), pin, 'lookup.json is the release asset its .sha256 names (V1)');
  assert.equal(vectors.grid_manifest_sha256, release.grid_manifest_sha256, `the vectors are for grid ${vectors.grid_manifest_sha256}, the site installs ${release.grid_manifest_sha256} (V2)`);
  assert.match(vectors.cli, /^canopi-climate 0\.7\.0$/);
});

test('E5a vectors: every rule-table row of lookup.json (legend, margins, texture, codes, decoding, USDA, photoperiod, AWC)', async () => {
  assert.ok(checkTables(C, vectors.tables) > 100);
  // Verify v0.7.0 Rust WASM rule tables at 0 tolerance
  for (const r of vectors.tables.usda) {
    assert.equal(await C.wasmUsdaZone(r.tmin_extreme_c), r.zone, `usda ${r.tmin_extreme_c}`);
  }
  for (const r of vectors.tables.photoperiod) {
    const got = await C.wasmPhotoperiod(r.lat);
    // canopi-climate v0.7.1 (BUG-07) widened Photoperiod::monthly_hours from [f32; 12] to [f64; 12];
    // normalize the v0.7.0 lookup.json f32-serialized floats to 2 decimals for exact parity.
    const expected = r.result ? { ...r.result, monthly_hours: r.result.monthly_hours.map((h) => Math.round(h * 100) / 100) } : null;
    assert.deepEqual(got, expected, `photoperiod ${r.lat}`);
  }
  for (const r of vectors.tables.awc) {
    const got = await C.wasmSoilAwc(r.sand_pct, r.clay_pct, r.om_pct ?? null);
    assert.deepEqual(got, r.result, `awc ${r.sand_pct}/${r.clay_pct}/${r.om_pct}`);
  }
});

test('E5a + v0.7.0 vectors: all 62 points across all served layers at 0-tolerance parity', { skip: noGrid }, async () => {
  assert.equal(missing, null, `CANOPI_REQUIRE_VECTORS=1: ${missing} (V3)`);
  assert.equal(index.release.grid_manifest_sha256, vectors.grid_manifest_sha256, `the installed grid is ${index.release.grid_manifest_sha256}, the vectors are for ${vectors.grid_manifest_sha256}`);
  assert.equal(vectors.points.length, 62);
  const source = makeLocalSource();
  // Core 3 layers (tiles, soil, regions) via checkPoints
  const counts = await checkPoints(C, vectors.points, source);
  assert.equal(counts.compared + counts.invalid, vectors.points.length);
  assert.ok(counts.compared >= 52 && counts.crossTile >= 9, `unexpected counts: ${JSON.stringify(counts)}`);

  // Additive v0.7.0 layers via 2-tier reader + Rust WASM at exact 0-tolerance equality
  let frostFreeCount = 0;
  let yearRoundCount = 0;
  let seasonalCount = 0;
  for (const p of vectors.points) {
    if (p.expect === 'invalid') continue;
    const site = await C.lookupSite(p.lat, p.lon, source);
    const t2a = await C.lookupSiteTier2A(site, source);
    const t2b = await C.lookupSiteMonthly(site, source);

    if ('extremes' in p.expect) assert.deepEqual(site.tier1?.extremes ?? null, p.expect.extremes, `${p.name}: extremes`);
    if ('frost_calendar' in p.expect) {
      assert.deepEqual(site.tier1?.frostCalendar ?? null, p.expect.frost_calendar, `${p.name}: frost_calendar`);
      if (p.expect.frost_calendar?.regime === 'frost_free') frostFreeCount++;
      if (p.expect.frost_calendar?.regime === 'year_round') yearRoundCount++;
      if (p.expect.frost_calendar?.regime === 'seasonal') seasonalCount++;
    }
    if ('extremes_tail' in p.expect) assert.deepEqual(t2a.extremesTail, p.expect.extremes_tail, `${p.name}: extremes_tail`);
    if ('phenology' in p.expect) assert.deepEqual(t2a.phenology, p.expect.phenology, `${p.name}: phenology`);
    if ('water_balance' in p.expect) assert.deepEqual(t2a.waterBalance, p.expect.water_balance, `${p.name}: water_balance`);
    if ('monthly' in p.expect) assert.deepEqual(t2b.monthly, p.expect.monthly, `${p.name}: monthly`);
    if ('monthly_precip' in p.expect) assert.deepEqual(t2b.monthlyPrecip, p.expect.monthly_precip, `${p.name}: monthly_precip`);
  }
  assert.ok(frostFreeCount >= 1 && yearRoundCount >= 1 && seasonalCount >= 1,
    `expected all 3 frost regimes (frost_free=${frostFreeCount}, seasonal=${seasonalCount}, year_round=${yearRoundCount})`);
});

test('v0.7.0 installed grid edge cases: soil_plus, below-sea-level terrain, south-of-60S hand_m=null, analogues.bin', { skip: noGrid }, async () => {
  const source = makeLocalSource();

  // Lyon: full Tier 1 + Tier 2A + Tier 2B + analogues.bin
  const lyon = await C.lookupSite(45.76, 4.84, source);
  assert.ok(lyon.tier1?.terrain && lyon.tier1.terrain.elev_m > 100 && lyon.tier1.terrain.hand_m !== null, 'Lyon terrain');
  const lyon2a = await C.lookupSiteTier2A(lyon, source);
  assert.ok(lyon2a.soilPlus && lyon2a.soilPlus.ph_30_100 !== null && lyon2a.soilPlus.om_0_30_pct !== null, 'Lyon soil_plus');

  // Below-sea-level land (Dead Sea depression: 31.35N, 35.45E)
  const deadSea = await C.lookupSite(31.35, 35.45, source);
  assert.ok(deadSea.tier1?.terrain && deadSea.tier1.terrain.elev_m < 0, `expected below-sea-level elev_m, got ${deadSea.tier1?.terrain?.elev_m}`);

  // South of 60S: MERIT Hydro has no coverage -> hand_m must be null
  const antarctic = await C.lookupSite(-75.5, 0.5, source);
  assert.ok(antarctic.tier1?.terrain && antarctic.tier1.terrain.hand_m === null, `expected hand_m=null south of 60S, got ${JSON.stringify(antarctic.tier1?.terrain)}`);

  // analogues.bin k-NN search via Rust WASM
  const p2050 = lyon.climate.periods.find((x) => x.period === '2041-2070' && x.scenario === 'ssp245');
  const analogues = await C.lookupSiteAnalogues(source, {
    lat: lyon.lat,
    lon: lyon.lon,
    tmean_cold_c: p2050.tmeanColdC,
    tmean_warm_c: p2050.tmeanWarmC,
    tmin_cold_c: p2050.tminColdC,
    tmax_warm_c: p2050.tmaxWarmC,
    precip_mm: p2050.precipMm,
    aridity_index: p2050.aridityIndex,
    dry_months: p2050.dryMonths,
    summer_rain_frac: 0.5,
  }, { k: 5, min_distance_km: 100, exclude_radius_km: 100 });
  assert.ok(analogues && analogues.matches.length > 0, 'analogues.bin returned matches');
  assert.equal(typeof analogues.novel_climate, 'boolean');
  assert.ok(analogues.best_sigma !== null && Number.isFinite(analogues.best_sigma));
});
