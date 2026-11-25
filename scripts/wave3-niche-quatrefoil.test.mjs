import assert from 'node:assert/strict';
import test from 'node:test';
import { GLYPH_PRIMITIVES } from '../src/lib/glyphs.ts';
import { resolveEffectiveSite, selectStarterPalette } from '../src/lib/palette/report.ts';

function makeTaxon(id, stratum, lightPref, job, heightM = 2) {
  return {
    id,
    canonical_name: `Species ${id}`,
    family: `Fam_${id}`,
    genus: `Gen_${id}`,
    common_names: { en: `Plant ${id}` },
    stratum: stratum ? { value: stratum, source: 'placements' } : null,
    light: { preferred: lightPref, sunniest: lightPref, shadiest: lightPref },
    phases: { start: 'placenta_i', end: 'secondary_iii' },
    traits: {
      habit: heightM >= 6 ? 'tree' : heightM >= 2 ? 'shrub' : 'herb',
      height_m: { min: heightM * 0.6, max: heightM },
      width_max_m: Math.min(3, heightM * 0.6),
      edibility_rating: job === 'feeds_you' ? 4 : 0,
      nitrogen_fixer: job === 'feeds_soil',
      is_annual: false,
      soil_ph: { min: 5.5, max: 8.0 },
    },
    role: job === 'feeds_you' ? 'crop' : 'support',
    functions: job === 'feeds_soil'
      ? [{ function: 'nitrogen_fixer' }]
      : job === 'helpers'
        ? [{ function: 'pollinator_forage' }]
        : job === 'mulch'
          ? [{ function: 'mulch' }]
          : job === 'ground'
            ? [{ function: 'ground_cover' }]
            : job === 'shelter'
              ? [{ function: 'windbreak' }]
              : [],
    warnings: { toxicity: { level: 'None' }, weed_potential: false, allelopathic: false },
    climate: {
      tminCold: { low: -15, high: 15 },
      tmaxWarm: { low: 15, high: 40 },
      tmeanYear: { low: 5, high: 25 },
      tmeanWarm: { low: 12, high: 35 },
      cells: 1000,
    },
    extremes: { tminExtreme: { low: -20, high: 10 }, tmaxExtreme: { low: 20, high: 45 } },
    image: null,
  };
}

test('Wave 3 phase habit glyphs exist on the shared 16x16 grid', () => {
  for (const name of ['phase-seedling', 'phase-shrub', 'phase-young-tree', 'phase-canopy']) {
    assert.ok(Array.isArray(GLYPH_PRIMITIVES[name]) && GLYPH_PRIMITIVES[name].length >= 2, `missing glyph ${name}`);
  }
});

test('selectStarterPalette spreads across multiple ecological light strata', () => {
  const eff = resolveEffectiveSite(
    {
      lat: 43.6,
      lon: 3.88,
      climate: {
        periods: [
          { period: '1991-2020', scenario: 'historical', koppen: 'Csa', tminColdC: 3, tmaxWarmC: 29, tmeanColdC: 7, tmeanWarmC: 24, precipMm: 650, aridityIndex: 0.7, dryMonths: 2 },
        ],
      },
      soil: { phH2o: 6.8, clayPct: 22, texture: 'loam' },
      regions: { isoA2: 'FR', wgsrpdL3: 'FRA' },
    },
    'today',
    { plotM2: 200 },
  );

  // Pool has emergent, high, medium, and low candidates for the same jobs
  const pool = [
    makeTaxon('t1', 'emergent', 'emergent', 'feeds_you', 8),
    makeTaxon('t2', 'emergent', 'emergent', 'feeds_soil', 4),
    makeTaxon('s1', 'high', 'emergent', 'helpers', 2.5),
    makeTaxon('s2', 'medium', 'emergent', 'mulch', 1.2),
    makeTaxon('g1', 'low', 'medium', 'ground', 0.4),
    makeTaxon('sh1', 'emergent', 'emergent', 'shelter', 6),
    makeTaxon('f2', 'medium', 'high', 'feeds_you', 1.5),
    makeTaxon('h2', 'low', 'low', 'helpers', 0.5),
  ];

  const chosen = selectStarterPalette(pool, eff, { maxPlants: 8 });
  const strata = new Set(chosen.map((t) => t.stratum?.value).filter(Boolean));
  assert.ok(strata.size >= 3, `expected >= 3 ecological strata in starter guild, got ${[...strata].join(', ')}`);
});

test('quatrefoilPetalScale is area-proportional (sqrt) with zero floor', async () => {
  const { quatrefoilPetalScale } = await import('../src/islands/palette/views/north-star/ns-helpers.ts');
  assert.equal(quatrefoilPetalScale(0), 0);
  assert.equal(quatrefoilPetalScale(-0.2), 0);
  assert.equal(quatrefoilPetalScale(0.25), 0.5);
  assert.equal(quatrefoilPetalScale(1), 1);
  assert.equal(quatrefoilPetalScale(1.4), 1);
});
