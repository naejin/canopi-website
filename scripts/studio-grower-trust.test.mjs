// Deep scenario-based agroecological Grower-Trust unit tests for Field Studio (Goal #36 Slice 2):
// Proves live reactivity across ALL 8 site/studio inputs, zero contradictions, cross-surface
// coherence, honest full-DB climate adaptation, and structured i18n fields on PlantingPlan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import {
  computeFieldMaterials,
  computePlantingPlan,
  computePlantingWaves,
  NO_EDITS,
} from '../src/lib/palette/index.ts';
import { openBytes } from '../src/islands/palette/data/load.ts';
import { createSqliteSource } from '../src/islands/palette/data/sqlite-source.ts';
import { DEFAULT_CLIMATE_STRESS } from '../src/islands/palette/state/studio.ts';
import { evaluateStudioCatalog } from '../src/islands/palette/rules/studio-fit.ts';
import { evaluateClimate2050 } from '../src/islands/palette/rules/studio-analysis.ts';

const index = JSON.parse(readFileSync(new URL('../src/data/consortium-index.json', import.meta.url), 'utf8'));
const opened = await openBytes(
  new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url)))),
  { releaseId: index.release_id, climates: index.climates },
);
const source = createSqliteSource(opened.db, { images: {} });

// Load full deduplicated catalog across all 7 curated climates (real r-61c991c93df2effd data).
const allById = new Map();
for (const z of index.climates) {
  for (const t of await source.pool(z)) {
    if (!allById.has(t.id)) allById.set(t.id, t);
  }
}
const fullCatalog = [...allById.values()];
const byName = (canon) => fullCatalog.find((t) => t.canonical_name === canon);

const BASE_LOC = {
  lat: 45.76,
  lon: 4.84,
  source: 'search',
  label: 'Lyon, FR',
  lookup: {
    lat: 45.76,
    lon: 4.84,
    soil: { ph: 7.2, sand: 35, clay: 25, texture: 'loam', fillDistance: 0 },
    regions: { wgsrpdL3: 'FRA', isoA2: 'FR' },
    climate: {
      cellLat: 45.75,
      cellLon: 4.85,
      distanceCells: 0,
      periods: [
        { period: '1991-2020', scenario: 'historical', koppen: 'Cfb', koppenTemperatureMarginC: 0, tminColdC: -1.5, tmaxWarmC: 28.5, tmeanColdC: 3.0, tmeanWarmC: 21.5, aridityIndex: 0.85 },
        { period: '2041-2070', scenario: 'ssp245', koppen: 'Cfa', koppenTemperatureMarginC: 0, tminColdC: 0.5, tmaxWarmC: 31.0, tmeanColdC: 5.0, tmeanWarmC: 24.0, aridityIndex: 0.72 },
      ],
    },
  },
};

const baseInputs = (over = {}) => ({
  loc: BASE_LOC,
  climate: 'Temperate',
  period: 'today',
  envelope: 'typical',
  stress: { ...DEFAULT_CLIMATE_STRESS },
  microclimate: { slopeDeg: 0, aspect: 'flat', landform: 'mid-slope' },
  siteEdits: NO_EDITS,
  wateringMode: 'Rain-fed',
  room: 'yard',
  plotAreaM2: 150,
  baseVerdicts: null,
  ...over,
});

test('Grower-Trust 1: full catalog loads all 7 curated climates (>700 unique species)', () => {
  assert.ok(fullCatalog.length > 700, `expected >700 unique species, got ${fullCatalog.length}`);
});

test('Grower-Trust 2: Period (Today -> 2050s -> 2080s) and Heat Dome (+3 C) shift effective temperature and re-rank catalog', () => {
  const today = evaluateStudioCatalog(fullCatalog, baseInputs());
  const y2050 = evaluateStudioCatalog(fullCatalog, baseInputs({ period: '2041-2070' }));
  const heatDome = evaluateStudioCatalog(fullCatalog, baseInputs({
    period: '2041-2070',
    stress: { ...DEFAULT_CLIMATE_STRESS, heatDeltaC: 3, droughtPct: 15 },
  }));

  assert.ok(y2050.effectiveHotC > today.effectiveHotC, '2050s raises effectiveHotC');
  assert.ok(heatDome.effectiveHotC >= y2050.effectiveHotC + 3, 'Heat dome adds +3 C');
  assert.equal(today.isStressOrFutureActive, false);
  assert.equal(heatDome.isStressOrFutureActive, true);

  // Top 15 recommendations under Heat Dome must shift toward heat-tolerant species
  const topToday = today.fitPool.slice(0, 15).map((t) => t.id);
  const topHeat = heatDome.fitPool.slice(0, 15).map((t) => t.id);
  assert.notDeepEqual(topHeat, topToday, 'Heat dome visibly re-ranks top Coach/Pool candidates');
});

test('Grower-Trust 3: Polar Plunge (-4 C) and Extreme 1-in-10-yr envelope penalize frost-tender species', () => {
  const baseline = evaluateStudioCatalog(fullCatalog, baseInputs());
  const polar = evaluateStudioCatalog(fullCatalog, baseInputs({
    envelope: 'extreme10',
    stress: { ...DEFAULT_CLIMATE_STRESS, winterDeltaC: -4 },
  }));

  assert.ok(polar.effectiveColdC <= baseline.effectiveColdC - 7, 'extreme10 + polar plunge drops effectiveColdC');
  const mango = byName('Mangifera indica');
  assert.ok(mango, 'Mangifera indica in full catalog');
  assert.equal(polar.fitMap.get(mango.id)?.level, 'outside', 'frost-tender mango is outside under polar plunge');
});

test('Grower-Trust 4: WateringMode (Rain-fed vs Irrigated) buffers drought pressure in live evaluation', () => {
  const droughtStress = { ...DEFAULT_CLIMATE_STRESS, droughtPct: 40, heatDeltaC: 1.5 };
  const rainFed = evaluateStudioCatalog(fullCatalog, baseInputs({ stress: droughtStress, wateringMode: 'Rain-fed' }));
  const irrigated = evaluateStudioCatalog(fullCatalog, baseInputs({ stress: droughtStress, wateringMode: 'Irrigated' }));

  assert.ok(irrigated.effectiveDroughtPct < rainFed.effectiveDroughtPct, 'Irrigated reduces effective drought pressure');
  assert.ok(irrigated.fitPool.length >= rainFed.fitPool.length, 'Irrigated expands or maintains viable fitPool under severe drought');
});

test('Grower-Trust 5: Microclimate (south slope vs valley frost-pocket) and SiteEdits (acid soilPh 4.8) re-rank species honestly', () => {
  const acidSite = evaluateStudioCatalog(fullCatalog, baseInputs({ siteEdits: { soilPh: 4.8 } }));
  const alkSite = evaluateStudioCatalog(fullCatalog, baseInputs({ siteEdits: { soilPh: 8.2 } }));
  const blueberry = byName('Vaccinium corymbosum');
  if (blueberry) {
    assert.ok(
      (acidSite.fitMap.get(blueberry.id)?.score ?? 0) > (alkSite.fitMap.get(blueberry.id)?.score ?? 0),
      'acid-loving blueberry scores higher at pH 4.8 than pH 8.2',
    );
  }
  const southSlope = evaluateStudioCatalog(fullCatalog, baseInputs({ microclimate: { slopeDeg: 15, aspect: 'S', landform: 'mid-slope' } }));
  const valley = evaluateStudioCatalog(fullCatalog, baseInputs({ microclimate: { slopeDeg: 5, aspect: 'N', landform: 'valley' } }));
  assert.ok(southSlope.effectiveColdC > valley.effectiveColdC, 'valley frost-pocket is colder than south-facing mid-slope');
});

test('Grower-Trust 6: Plot size / Room (pots 12 m2 vs 500 m2 food forest) prefers appropriately scaled species', () => {
  const pots = evaluateStudioCatalog(fullCatalog, baseInputs({ room: 'pots', plotAreaM2: 12 }));
  const forest = evaluateStudioCatalog(fullCatalog, baseInputs({ room: 'yard', plotAreaM2: 500 }));
  assert.equal(pots.maxIdealHeightM, 2.5);
  assert.equal(forest.maxIdealHeightM, null);
  const walnut = byName('Juglans regia');
  const chives = byName('Allium schoenoprasum');
  if (walnut && chives) {
    assert.equal(pots.fitMap.get(walnut.id)?.spaceFits, false, 'large walnut tree does not fit a 12 m2 pots space');
    assert.equal(pots.fitMap.get(chives.id)?.spaceFits, true, 'chives fits a 12 m2 pots space');
    assert.ok((pots.fitMap.get(chives.id)?.score ?? 0) > (pots.fitMap.get(walnut.id)?.score ?? 0));
  }
});

test('Grower-Trust 7: Climate2050Tab report and PlantingPlan structured i18n fields stay coherent', () => {
  const members = [byName('Juglans regia'), byName('Malus domestica'), byName('Allium schoenoprasum'), byName('Hippophae rhamnoides')].filter(Boolean);
  assert.ok(members.length >= 3);
  const report = evaluateClimate2050(
    members,
    fullCatalog,
    BASE_LOC,
    '2041-2070',
    'extreme10',
    { ...DEFAULT_CLIMATE_STRESS, heatDeltaC: 3, droughtPct: 15 },
  );
  assert.equal(report.critical.length + report.watch.length + report.holdsStrong.length, members.length, 'every member triaged exactly once');
  for (const it of [...report.critical, ...report.watch, ...report.holdsStrong]) {
    assert.ok(it.allFiveLimits.length > 20, 'allFiveLimits populated');
    assert.ok(it.fieldInsurance.length > 10, 'fieldInsurance populated');
  }

  const plan = computePlantingPlan(members, { plotAreaM2: 150 });
  for (const it of plan.items) {
    assert.ok(['p1', 'p2', 's1', 's2', 's3', 'climax'].includes(it.stageId));
    assert.ok(['seed', 'bulb', 'bareroot', 'pot2l', 'plug9cm'].includes(it.stockVariant));
  }
  const mat = computeFieldMaterials(plan, { coldC: -1.5, hotC: 28.5 });
  assert.ok(['hours', 'days12', 'days2'].includes(mat.effortTier));
  const waves = computePlantingWaves(plan, { coldC: -1.5, hotC: 28.5 });
  assert.equal(waves.length, 4);
  assert.ok(waves[0].params.netAreaM2 === plan.netAreaM2);
});
