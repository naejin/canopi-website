// Wave 5 unit tests: climber crown cap, per-site starter scoring (inform don't block, N2 moisture,
// N7 structural climbers), and PhotoLightbox attribution URL helpers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crownAreaM2,
  isStructuralVine,
  resolveEffectiveSite,
  selectStarterPalette,
  vineSupportTree,
} from '../src/lib/palette/report.ts';

function makeTaxon(overrides = {}) {
  return {
    id: overrides.id ?? 't-1',
    canonical_name: overrides.canonical_name ?? 'Malus domestica',
    genus: overrides.genus ?? 'Malus',
    family: overrides.family ?? 'Rosaceae',
    names: { en: overrides.en ?? 'Apple' },
    image: { url: '/data/consortium/images/test.jpg', credit: 'Photog', licence: 'CC BY-SA 4.0', source_page_url: 'https://commons.wikimedia.org/wiki/File:Test.jpg' },
    role: overrides.role ?? 'crop',
    stratum: { value: overrides.stratum ?? 'high', sources: [] },
    phases: { start: 'secondary_i', end: 'climax', sources: [] },
    functions: overrides.functions ?? [{ function: 'pollinator_forage', method: 'curated', sources: [], kind: null }],
    traits: {
      height_m: { min: 4, max: overrides.maxH ?? 8 },
      width_max_m: overrides.widthM ?? 6,
      sun: true, semi_shade: true, full_shade: false,
      hardiness_zone: null, frost_tender: false,
      soil_ph: { min: 5.5, max: 7.5 },
      well_drained: true, moisture_use: 'Medium', drought_tolerance: overrides.drought ?? 'Medium',
      fertility_requirement: 'Medium', deciduous_evergreen: 'Deciduous',
      active_growth_period: null, bloom_period: null, harvest_period: null,
      lifespan: 'Long', growth_rate: 'Moderate', age_of_maturity_years: 4,
      root_depth_min_cm: 60, taproot_persistent: null, root_system_type: overrides.rootType ?? null,
      mycorrhizal_type: null, nitrogen_fixer: overrides.nFix ?? false,
      edibility_rating: overrides.edibility ?? 5,
      self_fertile: true, sexual_system: null, pollinators: null,
      vegetative_spread_rate: null, clonal_growth_form: null,
      is_annual: overrides.annual ?? false, grown_as_annual: false, is_perennial: !(overrides.annual ?? false),
      habit: overrides.habit ?? 'Tree',
    },
    warnings: {
      toxicity: overrides.tox ? { level: overrides.tox, sources: [] } : null,
      invasive_in: overrides.invasiveIn ?? [],
      allelopathic: false,
      weed_potential: false,
    },
    climate: {
      source: 'gbif',
      precip: overrides.precip ?? { low: 400, median: 750, high: 1400, count: 500, basis: 'thinned_cells', blocks: 50, lowSource: null, highSource: null, weak: false },
      tminCold: { low: -20, median: -5, high: 10, count: 500, basis: 'thinned_cells', blocks: 50, lowSource: null, highSource: null, weak: false },
      tmaxWarm: { low: 18, median: 28, high: 38, count: 500, basis: 'thinned_cells', blocks: 50, lowSource: null, highSource: null, weak: false },
      tmeanYear: { low: 4, median: 12, high: 22, count: 500, basis: 'thinned_cells', blocks: 50, lowSource: null, highSource: null, weak: false },
      tmeanWarm: { low: 14, median: 22, high: 30, count: 500, basis: 'thinned_cells', blocks: 50, lowSource: null, highSource: null, weak: false },
      aridity: overrides.aridity ?? { low: 0.3, median: 0.8, high: 2.0, count: 500, basis: 'thinned_cells', blocks: 50, lowSource: null, highSource: null, weak: false },
      cells: 500,
      nativeShare: 0.6,
    },
    koppen: overrides.koppen ?? [{ code: 'Cfb', share: 0.4, cells: 200 }],
    areasKnown: true,
    light: { sunniest: 'high', shadiest: 'medium', preferred: 'high' },
  };
}

test('crownAreaM2 caps climber basal/trellis footprint at 2.5 m2 while keeping tree crowns exact', () => {
  const grape = makeTaxon({ id: 'vitis', canonical_name: 'Vitis vinifera', genus: 'Vitis', habit: 'Climber', widthM: 10, maxH: 35 });
  const apple = makeTaxon({ id: 'malus', habit: 'Tree', widthM: 8, maxH: 10 });
  assert.equal(crownAreaM2(grape), 2.5);
  assert.ok(Math.abs(crownAreaM2(apple) - Math.PI * 16) < 0.01);
});

test('isStructuralVine includes grapevine and excludes sweet potato trailing groundcover', () => {
  const grape = makeTaxon({ id: 'vitis', canonical_name: 'Vitis vinifera', genus: 'Vitis', habit: 'Climber', maxH: 15 });
  const sweetPotato = makeTaxon({ id: 'ipomoea', canonical_name: 'Ipomoea batatas', genus: 'Ipomoea', habit: 'Climber', maxH: 3 });
  const apple = makeTaxon({ id: 'malus', habit: 'Tree', maxH: 10 });
  assert.equal(isStructuralVine(grape), true);
  assert.equal(isStructuralVine(sweetPotato), false);
  assert.equal(vineSupportTree(grape, [apple, grape])?.id, 'malus');
  assert.equal(vineSupportTree(grape, [grape]), null);
});

test('selectStarterPalette keeps toxic and invasive species eligible (inform, do not block)', () => {
  const base = resolveEffectiveSite(null, 'today', { soilPh: 6.5, plotM2: 150 });
  const eff = { ...base, hasClimate: true, tminColdC: -2, tmaxWarmC: 26, tmeanYearC: 12, tmeanWarmC: 20, country: 'FR' };
  const onlyPool = [
    makeTaxon({ id: 'tox-apple', tox: 'Moderate', invasiveIn: [{ country: 'FR', sources: ['griis'] }] }),
  ];
  const chosen = selectStarterPalette(onlyPool, eff, { maxPlants: 8 });
  assert.equal(chosen.length, 1);
  assert.equal(chosen[0].id, 'tox-apple');
});
