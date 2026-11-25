// Deterministic unit tests for Phase 3 / Slice 3.3:
// - Shared Filter Studio predicates (Sun W1 t.light, 6-stage succession, role, lowChill, clayWet, extremeHardy)
// - Plant Field Dossier spec builder (pH/temp tracks, 6-row ledger, breaking points, lifeline, photoperiod)
// - Dossier drawer navigation state (openFieldDossier, stepFieldDossier, closeFieldDossier)
// - Zero native title attributes, zero CSV export, and clean grower vocabulary across all Slice 3.3 views
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const filters = await import('../src/islands/palette/rules/studio-filters.ts');
const studio = await import('../src/islands/palette/state/studio.ts');

function taxon(over = {}) {
  return {
    id: over.id ?? 'p1',
    canonical_name: over.canonical_name ?? 'Ficus carica',
    genus: 'Ficus',
    family: 'Moraceae',
    names: { en: over.en ?? 'Common fig' },
    image: null,
    role: over.role ?? 'food',
    stratum: over.stratum ?? { value: 'high', sources: ['s1'] },
    phases: over.phases ?? { start: 'secondary_i', end: 'secondary_iii', sources: ['s1'] },
    functions: over.functions ?? [{ function: 'edible_fruit', method: 'direct', sources: ['s1'], kind: 'recorded' }],
    traits: over.traits ?? { height_m: { min: 3, max: 6 }, width_max_m: 4, soil_ph: { min: 6.0, max: 7.8 }, drought_tolerance: 'High' },
    warnings: { toxicity: null, invasive_in: null, allelopathic: false, weed_potential: false },
    climate: over.climate ?? { tminCold: { low: -2, median: 4, high: 12 }, tmaxWarm: { low: 22, median: 30, high: 38 } },
    areasKnown: true,
    light: over.light ?? { sunniest: 'emergent', shadiest: 'high', preferred: 'emergent' },
  };
}

test('studio-filters.ts filters by W1 sun span, 6-stage succession, and 3 agronomy predicates', () => {
  const fig = taxon({ id: 'fig', light: { sunniest: 'emergent', shadiest: 'high', preferred: 'emergent' } });
  const willow = taxon({
    id: 'willow',
    canonical_name: 'Salix alba',
    en: 'White willow',
    role: 'biomass',
    light: { sunniest: 'emergent', shadiest: 'medium', preferred: 'high' },
    traits: { well_drained: false, moisture_use: 'High' },
    climate: { tminCold: { low: -18, median: -4, high: 6 }, tmaxWarm: { low: 18, median: 25, high: 31 } },
  });
  const citrus = taxon({
    id: 'citrus',
    canonical_name: 'Citrus sinensis',
    en: 'Sweet orange',
    traits: { deciduous_evergreen: 'Evergreen', height_m: { min: 3, max: 5 } },
    climate: { tminCold: { low: 2, median: 8, high: 15 }, tmaxWarm: { low: 24, median: 32, high: 39 } },
  });

  assert.equal(filters.activeFilterCount(filters.EMPTY_STUDIO_FILTERS), 0);
  assert.equal(filters.activeFilterCount({ ...filters.EMPTY_STUDIO_FILTERS, lowChill: true, clayWet: true }), 2);

  assert.equal(filters.matchesStudioFilters(fig, { ...filters.EMPTY_STUDIO_FILTERS, suns: ['emergent'] }), true);
  assert.equal(filters.matchesStudioFilters(fig, { ...filters.EMPTY_STUDIO_FILTERS, suns: ['low'] }), false);

  assert.equal(filters.matchesStudioFilters(citrus, { ...filters.EMPTY_STUDIO_FILTERS, lowChill: true }), true);
  assert.equal(filters.matchesStudioFilters(willow, { ...filters.EMPTY_STUDIO_FILTERS, clayWet: true }), true);
  assert.equal(filters.matchesStudioFilters(fig, { ...filters.EMPTY_STUDIO_FILTERS, clayWet: true }), false);
  assert.equal(filters.matchesStudioFilters(willow, { ...filters.EMPTY_STUDIO_FILTERS, extremeHardy: true }), true);

  assert.equal(filters.sunTierLabel(fig), 'Full sun');
  assert.equal(filters.stageSpanOf(fig).label, 'Secondary 1 → Secondary 3');
  assert.equal(filters.activityMonthsOf(citrus).length, 12);
});

test('buildDossierSpec computes tracks, 6-row ledger, breaking points, lifeline, and photoperiod', () => {
  const citrus = taxon({
    id: 'citrus',
    canonical_name: 'Citrus sinensis',
    traits: { height_m: { min: 3, max: 5 }, width_max_m: 3.5, soil_ph: { min: 6.0, max: 7.5 }, moisture_use: 'Medium' },
    climate: { tminCold: { low: 1, median: 7, high: 14 }, tmaxWarm: { low: 24, median: 32, high: 38 } },
  });
  const loc = {
    lat: 43.6,
    lon: 3.88,
    source: 'search',
    label: 'Montpellier',
    lookup: {
      lat: 43.6,
      lon: 3.88,
      soil: { phH2o: 8.2, texture: 'Loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
      regions: { isoA2: 'FR' },
      climate: {
        periods: [{
          period: '1991-2020',
          scenario: 'historical',
          koppen: 'Csa',
          tminColdC: -4,
          tmaxWarmC: 37.5,
          tmeanColdC: 6,
          tmeanWarmC: 24,
          aridityIndex: 0.72,
        }],
      },
    },
  };

  const spec = filters.buildDossierSpec(citrus, null, loc);
  assert.equal(spec.ledger.length, 6);
  assert.ok(spec.breakingPoints.some((b) => b.severity === 'danger'), 'cold floor exceeded triggers danger breaking point');
  assert.ok(spec.breakingPoints.some((b) => /pH/i.test(b.title)), 'alkaline site pH triggers pH breaking point');
  assert.ok(spec.photoperiodInfo && spec.photoperiodInfo.summerH > 15 && spec.photoperiodInfo.winterH < 9.5);
});

test('Field Dossier state steps cleanly through plant list and closes', () => {
  studio.openFieldDossier('a', ['a', 'b', 'c']);
  assert.equal(studio.dossierId.value, 'a');
  studio.stepFieldDossier(1);
  assert.equal(studio.dossierId.value, 'b');
  studio.stepFieldDossier(-1);
  assert.equal(studio.dossierId.value, 'a');
  studio.stepFieldDossier(-1);
  assert.equal(studio.dossierId.value, 'c');
  studio.closeFieldDossier();
  assert.equal(studio.dossierId.value, null);
});

test('Slice 3.3 views contain zero CSV export and clean grower vocabulary', () => {
  const paths = [
    '../src/islands/palette/rules/studio-filters.ts',
    '../src/islands/palette/views/north-star/DesignBoard.tsx',
    '../src/islands/palette/views/north-star/LandPanel.tsx',
    '../src/islands/palette/views/north-star/Drawers.tsx',
  ];
  for (const p of paths) {
    const clean = readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/\bcsv\b/i.test(clean), `${p}: no CSV`);
    assert.ok(!/\b(shrub layer|herbaceous|climber)\b/i.test(clean), `${p}: clean vocabulary`);
  }
});

test('Full-DB allCatalog deduplicates across climates, addMembers auto-registers cross-climate guests and never blocks invasives', async () => {
  const store = await import('../src/islands/palette/store.ts');
  const tempPlant = taxon({ id: 'apple', canonical_name: 'Malus domestica', en: 'Apple' });
  const sharedPlant = taxon({ id: 'fig', canonical_name: 'Ficus carica', en: 'Fig' });
  const tropPlant = {
    ...taxon({ id: 'mango', canonical_name: 'Mangifera indica', en: 'Mango' }),
    warnings: { toxicity: null, invasive_in: [{ country: 'FR', status: 'invasive', source: 'griis' }], allelopathic: false, weed_potential: false },
  };
  store.climate.value = 'Temperate';
  store.pools.value = {
    Temperate: [tempPlant, sharedPlant],
    Tropical: [sharedPlant, tropPlant],
  };
  store.members.value = ['apple'];
  store.guests.value = {};

  const ids = store.allCatalog.value.map((t) => t.id);
  assert.deepEqual(ids, ['apple', 'fig', 'mango'], 'allCatalog deduplicates across climates preferring current climate');
  const mangoInCat = store.allCatalog.value.find((t) => t.id === 'mango');
  assert.equal(mangoInCat?.origin?.guest ?? mangoInCat?.origin?.list, 'Tropical', 'cross-climate plant tagged with home climate');

  // Adding a cross-climate invasive plant is never blocked and auto-registers its home guest climate
  store.addMembers(['mango']);
  assert.ok(store.members.value.includes('mango'), 'cross-climate invasive plant can always be added');
  assert.equal(store.guests.value['mango'], 'Tropical', 'addMembers auto-registers cross-climate guest origin');
  assert.ok(store.memberTaxa.value.some((t) => t.id === 'mango'), 'memberTaxa resolves cross-climate plant immediately');
});
