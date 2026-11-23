// Slice 3.1 unit tests: W1 light-filtering fixes (find-query.ts & site.ts), W2 Q10 default placement
// step order (placed.ts), .canopi v9 round-trip with plantingPlan/designEnvelope/climateStress/customPlants,
// and pure planting-plan.ts agronomic engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { taxon } from './consortium-p5-fixtures.mjs';
import { CANOPI_FILE_SCHEMA } from './vendor/canopi-design-format/canopi-design-format.ts';
import { validate } from './vendor/canopi-design-format/validate.mjs';

const core = await import('../src/lib/consortium/index.ts');
const { applyFilters } = await import('../src/islands/consortium/rules/find-query.ts');

const {
  canopiFile,
  parseCanopiFile,
  computePlantingPlan,
  computeFieldMaterials,
  computePlantingWaves,
  convertArea,
  toSquareMeters,
  DEFAULT_PLANTING_PLAN_CONFIG,
  DENSITY_MULTIPLIER,
  SUCCESSION_STAGES_6,
  phaseToStageIndex,
  defaultPlacementOf,
  placeFor,
  fits,
  UNSURE_SITE,
} = core;

test('W1 fix (find-query.ts): light filter uses t.light span & preferred over t.stratum', () => {
  // Plant placed in 'high' stratum, but its Schema 4.5 light span covers 'emergent'..'medium'
  const wide = taxon({
    id: '00000000-0000-4000-8000-000000000001',
    stratum: { value: 'high', sources: [] },
    light: { sunniest: 'emergent', shadiest: 'medium', preferred: 'high' },
  });
  // Plant with no stratum yet, but t.light.preferred = 'low'
  const prefOnly = taxon({
    id: '00000000-0000-4000-8000-000000000002',
    stratum: null,
    light: { sunniest: null, shadiest: null, preferred: 'low' },
  });
  const unknown = taxon({
    id: '00000000-0000-4000-8000-000000000003',
    stratum: null,
    light: { sunniest: null, shadiest: null, preferred: null },
  });

  const mediumRes = applyFilters([wide, prefOnly, unknown], { light: ['medium'] }, {});
  assert.deepEqual(mediumRes.rows.map((t) => t.id), [wide.id], 't.light span matches medium even though stratum is high');
  assert.equal(mediumRes.unknown.light, 1, 'only unknown light plant is counted as unjudged');

  const shadeRes = applyFilters([wide, prefOnly, unknown], { light: ['low'], hideNoLight: true }, {});
  assert.deepEqual(shadeRes.rows.map((t) => t.id), [prefOnly.id], 't.light.preferred matches low even with null stratum');
});

test('W1 fix (site.ts): fits() checks t.light before legacy tolerates_* traits', () => {
  const p = taxon({
    traits: { sun: false, semi_shade: false, full_shade: false },
    light: { sunniest: 'emergent', shadiest: 'medium', preferred: 'high' },
  });
  assert.equal(fits(p, { ...UNSURE_SITE, light: 'sun' }).verdict, 'fit');
  assert.equal(fits(p, { ...UNSURE_SITE, light: 'part' }).verdict, 'fit');
  assert.deepEqual(fits(p, { ...UNSURE_SITE, light: 'shade' }).misfits, ['light']);
});

test('W2 fix (placed.ts): placeFor applies own -> nearest-list -> Q10 plant default in strict order', () => {
  const t = taxon({
    role: 'crop',
    light: { sunniest: 'emergent', shadiest: 'high', preferred: 'high' },
    traits: { is_annual: false },
  });
  const q10 = defaultPlacementOf(t);
  assert.ok(q10 && q10.stratum === 'high' && q10.source === 'q10_default');

  const curated = { role: 'crop', stratum: 'medium', start: 'secondary_i', end: 'secondary_ii', source: 'curated' };
  // Step 1: own curated climate wins over Q10
  const hitOwn = placeFor({ Temperate: curated }, 'Temperate', ['Mediterranean'], q10);
  assert.equal(hitOwn.placement.stratum, 'medium');
  assert.equal(hitOwn.fromDefault, undefined);

  // Step 2: nearest curated list wins over Q10
  const hitNear = placeFor({ Mediterranean: curated }, 'Temperate', ['Mediterranean'], q10);
  assert.equal(hitNear.zone, 'Mediterranean');
  assert.equal(hitNear.fromDefault, undefined);

  // Step 3: Q10 default used ONLY when neither own nor nearest list places the plant
  const hitDefault = placeFor({}, 'Temperate', ['Mediterranean'], q10);
  assert.equal(hitDefault.zone, 'Temperate');
  assert.equal(hitDefault.placement.stratum, 'high');
  assert.equal(hitDefault.fromDefault, true);
});

test('.canopi v9 round-trip preserves plantingPlan, designEnvelope, climateStress, and customPlants while passing CANOPI_FILE_SCHEMA', () => {
  const members = [
    taxon({ id: 'p-1', canonical_name: 'Pistacia vera', stratum: { value: 'high', sources: [] }, phases: { start: 'secondary_i', end: 'secondary_iii', sources: [] } }),
    taxon({ id: 'p-2', canonical_name: 'Helianthus annuus', stratum: { value: 'emergent', sources: [] }, phases: { start: 'placenta_i', end: 'placenta_i', sources: [] } }),
  ];
  const plantingPlan = {
    ...DEFAULT_PLANTING_PLAN_CONFIG,
    plotAreaM2: 240,
    areaUnit: 'm2',
    densityMode: 'dense',
    pathwaysPct: 10,
    layoutPattern: 'alley',
    bufferPct: 10,
    quantityOverrides: { 'p-1': 5 },
  };
  const climateStress = {
    preset: 'heat-drought',
    custom: true,
    extremes: { coldSnapC: -4.4, heatDomeC: 44, heatDays35: 28, dryStreakDays: 80, falseSpringPct: 14, saturation: 'Free-draining' },
  };
  const customPlants = [
    { canonical_name: 'Acca sellowiana', common_name: 'Feijoa', notes: 'South wall microclimate', stratum: 'high', start_phase: 3, end_phase: 5 },
  ];

  const text = canopiFile(members, {
    name: 'Montpellier Plot',
    description: 'v9 round-trip test',
    at: '2026-11-23T12:00:00.000Z',
    plantingPlan,
    designEnvelope: 'extreme10',
    climateStress,
    customPlants,
  });

  const rawDoc = JSON.parse(text);
  assert.deepEqual(validate(CANOPI_FILE_SCHEMA, rawDoc), [], 'extended v9 file stays 100% valid against Canopi Desktop schema');

  const parsed = parseCanopiFile(text);
  assert.equal(parsed.version, 9);
  assert.equal(parsed.name, 'Montpellier Plot');
  assert.equal(parsed.consortiums.length, 3, 'includes 2 catalog species + 1 custom plant');
  assert.deepEqual(parsed.plantingPlan, plantingPlan);
  assert.equal(parsed.designEnvelope, 'extreme10');
  assert.deepEqual(parsed.climateStress, climateStress);
  assert.equal(parsed.customPlants.length, 1);
  assert.equal(parsed.customPlants[0].canonical_name, 'Acca sellowiana');
});

test('planting-plan.ts computes realistic quantities, seed weights, notes, materials, and frost-anchored waves', () => {
  assert.equal(SUCCESSION_STAGES_6.length, 6);
  assert.equal(phaseToStageIndex(0), 0);
  assert.equal(phaseToStageIndex(2), 1);
  assert.equal(phaseToStageIndex(6), 5);
  assert.equal(DENSITY_MULTIPLIER.spacious, 0.7);
  assert.equal(convertArea(5000, 'ha'), 0.5);
  assert.equal(toSquareMeters(0.5, 'ha'), 5000);

  const members = [
    taxon({
      id: 'pistachio',
      canonical_name: 'Pistacia vera',
      light: { sunniest: 'emergent', shadiest: 'high', preferred: 'high' },
      traits: { height_m: { min: 4, max: 5 }, width_max_m: 4, habit: 'Tree', sexual_system: 'Dioecious', is_annual: false },
    }),
    taxon({
      id: 'sunflower',
      canonical_name: 'Helianthus annuus',
      light: { sunniest: 'emergent', shadiest: 'emergent', preferred: 'emergent' },
      traits: { height_m: { min: 1.5, max: 2.7 }, width_max_m: 0.4, is_annual: true },
    }),
    taxon({
      id: 'ramsons',
      canonical_name: 'Allium ursinum',
      light: { sunniest: 'medium', shadiest: 'low', preferred: 'low' },
      traits: { height_m: { min: 0.2, max: 0.5 }, width_max_m: 0.3, clonal_growth_form: 'Bulb', is_annual: false },
    }),
  ];

  const base = computePlantingPlan(members, { plotAreaM2: 150, pathwaysPct: 20, bufferPct: 0, quantityOverrides: { pistachio: 3 } }, { coldC: 3.5 });
  assert.equal(base.netAreaM2, 120);
  assert.equal(base.items.find((i) => i.taxon.id === 'pistachio').qty, 3);
  assert.equal(base.items.find((i) => i.taxon.id === 'pistachio').isCustom, true);
  assert.ok(base.totalSeedGrams > 0, 'direct-sow annual computes seed weight in grams');
  assert.ok(base.notes.some((n) => n.kind === 'pollination'), 'dioecious pistachio emits pollination note');
  assert.ok(base.notes.some((n) => n.kind === 'shade-timing'), 'shade plant + tall tree emits shade-timing note');

  const buffered = computePlantingPlan(members, { plotAreaM2: 150, pathwaysPct: 20, bufferPct: 10 }, { coldC: 3.5 });
  assert.ok(buffered.totalUnits >= base.totalUnits);

  const mats = computeFieldMaterials(base, { soilAwcDays: 11, soilAwcMmPerM: 138, rainMm: 630, cddDays: 38 });
  assert.equal(mats.mulchM3, 12);
  assert.equal(mats.stakes, 3);
  assert.equal(mats.tags, 3);

  const waves = computePlantingWaves(base, { coldC: 3.5, lastSpringFrost: '~Feb 18', firstAutumnFrost: '~Dec 10', frostFreeDays: 298, falseSpringPct: 14 });
  assert.equal(waves.length, 4);
  assert.match(waves[2].kicker, /~Feb 18/);
});

test('planting-plan.ts guards NaN, Infinity, and negative numeric inputs without cascading NaN', () => {
  const members = [
    taxon({
      id: 'fig',
      canonical_name: 'Ficus carica',
      light: { sunniest: 'emergent', shadiest: 'high', preferred: 'high' },
      traits: { height_m: { min: 3, max: 5 }, width_max_m: 4, habit: 'Tree', is_annual: false },
    }),
  ];
  const nanPlan = computePlantingPlan(members, { plotAreaM2: Number.NaN, pathwaysPct: Number.POSITIVE_INFINITY, bufferPct: Number.NaN });
  assert.equal(nanPlan.grossAreaM2, 150);
  assert.equal(nanPlan.pathwaysPct, 20);
  assert.equal(nanPlan.netAreaM2, 120);
  assert.ok(Number.isFinite(nanPlan.totalUnits) && nanPlan.totalUnits >= 1);

  const negPlan = computePlantingPlan(members, { plotAreaM2: -25, pathwaysPct: -10 });
  assert.equal(negPlan.grossAreaM2, 1);
  assert.equal(negPlan.pathwaysPct, 0);
  assert.equal(negPlan.netAreaM2, 1);
  assert.ok(Number.isFinite(negPlan.items[0].qty) && negPlan.items[0].qty >= 1);
});
