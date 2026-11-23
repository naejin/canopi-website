// Deterministic unit tests for Phase 3 / Slice 3.4:
// - Living System: 4x6 Preferred Sun x Succession Matrix, 6-Role Redundancy Ledger, Growing Year Calendar
// - 2050 Climate: 5 compound stress presets, evaluateTrajectory() 4-layer triage, Climate Twin Swap, 12-month shift
// - Planting Plan: Bounded non-overlapping pure-SVG Plot Layout (Guild / Alley / Grid + 10x10m module), overrides
// - Upgraded Field & Nursery Sheet PDF (PrintSheet.tsx) + zero native title attributes / zero CSV / clean vocabulary
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analysis = await import('../src/islands/consortium/rules/studio-analysis.ts');
const filtersMod = await import('../src/islands/consortium/rules/studio-filters.ts');
const planting = await import('../src/lib/consortium/planting-plan.ts');
const studio = await import('../src/islands/consortium/state/studio.ts');

const makeSpecies = (id, name, extra = {}) => ({
  id,
  canonical_name: extra.canonical_name ?? `${name} sp.`,
  genus: name.split(' ')[0],
  family: 'Rosaceae',
  names: { en: name },
  image: null,
  role: extra.role ?? 'food',
  stratum: { value: extra.sun ?? 'high', sources: ['s1'] },
  phases: extra.phases ?? { start: 'secondary_i', end: 'secondary_iii', sources: ['s1'] },
  functions: extra.functions ?? [{ function: 'edible_fruit', method: 'direct', sources: ['s1'], kind: 'recorded' }],
  traits: extra.traits ?? { height_m: { min: 2.5, max: 5 }, width_max_m: 3.5, soil_ph: { min: 6.0, max: 7.6 }, drought_tolerance: 'High' },
  warnings: { toxicity: null, invasive_in: null, allelopathic: false, weed_potential: false },
  climate: extra.climate ?? { tminCold: { low: -4, median: 4, high: 12 }, tmaxWarm: { low: 22, median: 30, high: 38 } },
  areasKnown: true,
  light: extra.light ?? { sunniest: 'emergent', shadiest: 'high', preferred: extra.sun ?? 'emergent' },
});

const taxon = (o = {}) => makeSpecies(o.id ?? 'p1', o.en ?? 'Common fig', o);

const LOC = {
  lat: 43.6,
  lon: 3.88,
  source: 'search',
  label: 'Montpellier',
  lookup: {
    lat: 43.6,
    lon: 3.88,
    soil: { phH2o: 7.4, texture: 'Loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
    regions: { isoA2: 'FR' },
    climate: {
      periods: [{
        period: '1991-2020',
        scenario: 'historical',
        koppen: 'Csa',
        tminColdC: -2,
        tmaxWarmC: 31,
        tmeanColdC: 6,
        tmeanWarmC: 24,
        aridityIndex: 0.72,
      }],
    },
  },
};

test('Living System builds 4x6 Sun x Succession Matrix, 6-Role Redundancy Ledger, and 12-month Growing Year', () => {
  const members = [
    taxon({ id: 'fig', canonical_name: 'Ficus carica', light: { preferred: 'emergent', sunniest: 'emergent', shadiest: 'high' }, phases: { start: 'secondary_ii', end: 'climax', sources: ['s1'] } }),
    taxon({ id: 'alder', canonical_name: 'Alnus glutinosa', role: 'soil', functions: [{ function: 'nitrogen_fixer', method: 'direct', sources: ['s1'], kind: 'recorded' }], light: { preferred: 'high', sunniest: 'emergent', shadiest: 'medium' }, phases: { start: 'secondary_i', end: 'secondary_ii', sources: ['s1'] } }),
    taxon({ id: 'clover', canonical_name: 'Trifolium repens', role: 'ground', traits: { is_annual: false, height_m: { min: 0.1, max: 0.3 } }, light: { preferred: 'low', sunniest: 'medium', shadiest: 'low' }, phases: { start: 'placenta_i', end: 'secondary_i', sources: ['s1'] } }),
  ];

  const matrix = analysis.buildSunSuccessionMatrix(members);
  assert.equal(matrix.rows.length, 4);
  assert.deepEqual(matrix.rows.map((r) => r.label), ['Full sun', 'Mostly sun', 'Part shade', 'Shade']);
  assert.equal(matrix.sunTiersFilled, 3);
  assert.ok(matrix.stagesFilled >= 4);

  const ledger = analysis.buildRoleLedger(members);
  assert.equal(ledger.length, 6);
  assert.ok(ledger.some((r) => r.id === 'nfix' && r.count >= 1));

  for (const focus of ['all', 'bloom', 'harvest', 'prune']) {
    const year = analysis.buildGrowingYear(members, focus);
    assert.equal(year.length, 12);
    assert.ok(year.every((m) => m.brief.length > 10));
  }
});

test('2050 Climate evaluates stress presets, 4-layer triage, twin swap candidates, and 12-month SVG shift', () => {
  const sensitive = taxon({
    id: 'berry',
    canonical_name: 'Ribes nigrum',
    en: 'Blackcurrant',
    climate: { tminCold: { low: -25, median: -10, high: 0 }, tmaxWarm: { low: 15, median: 22, high: 28 } },
    traits: { height_m: { min: 1, max: 1.5 }, drought_tolerance: 'Low' },
  });
  const resilient = taxon({
    id: 'olive',
    canonical_name: 'Olea europaea',
    en: 'Olive',
    climate: { tminCold: { low: -8, median: 2, high: 12 }, tmaxWarm: { low: 24, median: 34, high: 43 } },
    traits: { height_m: { min: 4, max: 8 }, drought_tolerance: 'High', deciduous_evergreen: 'Evergreen' },
  });

  assert.equal(analysis.STRESS_PRESETS.length, 5);
  const heatPreset = analysis.STRESS_PRESETS.find((p) => p.id === 'heatdome');
  assert.ok(heatPreset);

  const report = analysis.evaluateClimate2050([sensitive], [sensitive, resilient], LOC, '2041-2070', 'extreme10', heatPreset.stress);
  assert.equal(report.forces.length, 4);
  assert.equal(report.monthlyShift.length, 12);
  assert.ok(report.critical.length + report.watch.length >= 1, 'heat-sensitive berry is triaged as stressed/critical');
  const triaged = report.critical[0] ?? report.watch[0];
  assert.ok(triaged.breachedLimits.length >= 1 && triaged.breachedLimits.length <= 2, 'signal-only 1-2 breached limits');
  assert.equal(triaged.twinSwap?.id, 'olive', 'finds resilient climate twin in catalog');

  // Stage 1G rigorous grower-first climate force invariants:
  // - Winter nights & hard freezes: Typical 2050s average warms up, Extreme drops colder, 1-in-10-yr freeze shown explicitly.
  // - Longest summer dry spell: shows grower-actionable days without rain, delta matches future - today.
  const baseStress = analysis.STRESS_PRESETS[0].stress;
  const typicalRep = analysis.evaluateClimate2050([resilient], [resilient], LOC, '2041-2070', 'typical', baseStress);
  const typWinter = typicalRep.forces.find((f) => f.label === 'Winter nights & hard freezes');
  assert.ok(typWinter && /1-in-10-yr freeze/.test(typWinter.delta), `Typical 2050s shows 1-in-10-yr freeze (${typWinter?.delta})`);
  const typTodayC = Number.parseFloat(typWinter.today);
  const typFutC = Number.parseFloat(typWinter.future);
  assert.ok(typFutC > typTodayC, `Typical 2050s winter average warms up (${typTodayC} -> ${typFutC})`);
  const extRep = analysis.evaluateClimate2050([resilient], [resilient], LOC, '2041-2070', 'extreme10', baseStress);
  const extWinter = extRep.forces.find((f) => f.label === 'Winter nights & hard freezes');
  assert.ok(extWinter && Number.parseFloat(extWinter.future) < typTodayC, `1-in-10-yr Extreme winter drops colder (${extWinter?.future})`);
  const dryForce = typicalRep.forces.find((f) => f.label === 'Longest summer dry spell');
  assert.ok(dryForce && /without rain/.test(dryForce.future), `Longest summer dry spell uses days without rain (${dryForce?.future})`);
  const dryToday = Number.parseInt(dryForce.today.replace(/\D/g, ''), 10);
  const dryFuture = Number.parseInt(dryForce.future.replace(/\D/g, ''), 10);
  const dryDelta = Number.parseInt(dryForce.delta.replace(/[^\d-]/g, ''), 10);
  assert.equal(dryFuture - dryToday, dryDelta, 'Longest summer dry spell delta strictly matches displayed endpoints');

  // Slice 3.5 P2 #2 height formatting invariant.
  assert.equal(filtersMod.formatHeightRange({ min: null, max: 0.8 }), 'up to 0.8 m');
  assert.equal(filtersMod.formatHeightRange({ min: 10, max: 18.288 }), '10–18.3 m');
});

test('Planting Plan Plot Layout stays strictly bounded and non-overlapping across Guild, Alley, Grid, and 10x10m module', () => {
  const members = Array.from({ length: 12 }, (_, i) => taxon({
    id: `p${i}`,
    canonical_name: `Species${i} test`,
    en: `Species ${i}`,
    light: { preferred: ['emergent', 'high', 'medium', 'low'][i % 4], sunniest: 'emergent', shadiest: 'low' },
  }));
  const plan = planting.computePlantingPlan(members, { plotAreaM2: 150 });

  for (const pattern of ['guild', 'alley', 'grid']) {
    const bp = analysis.computePlotLayout(plan, pattern);
    assert.equal(bp.isModule, false);
    assert.equal(bp.nodes.length, 12);
    for (const n of bp.nodes) {
      assert.ok(n.x - n.r >= 0 && n.x + n.r <= bp.viewWidth, `${pattern}: node ${n.id} inside x bounds`);
      assert.ok(n.y - n.r >= 0 && n.y + n.r <= bp.viewHeight, `${pattern}: node ${n.id} inside y bounds`);
    }
    for (let i = 0; i < bp.nodes.length; i++) {
      for (let j = i + 1; j < bp.nodes.length; j++) {
        const a = bp.nodes[i], b = bp.nodes[j];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        assert.ok(dist >= a.r + b.r - 0.5, `${pattern}: nodes ${a.id} and ${b.id} do not overlap (${dist} vs ${a.r + b.r})`);
      }
    }
  }

  // Large-scale plot triggers repeatable 10x10 m module view.
  const bigPlan = planting.computePlantingPlan(members, { plotAreaM2: 5000 });
  const bigBp = analysis.computePlotLayout(bigPlan, 'alley');
  assert.equal(bigBp.isModule, true);
  assert.match(bigBp.moduleLabel, /10 m × 10 m/);

  // Quantity overrides persist cleanly in studio state.
  studio.setQuantityOverride('p0', 42);
  assert.equal(studio.plantingConfig.value.quantityOverrides.p0, 42);
  studio.setQuantityOverride('p0', null);
  assert.equal(studio.plantingConfig.value.quantityOverrides.p0, undefined);
});

test('Slice 3.4 views & PrintSheet contain zero native title attributes, zero CSV export, and clean grower vocabulary', () => {
  const files = [
    'src/islands/consortium/rules/studio-analysis.ts',
    'src/islands/consortium/views/palette/LivingSystemTab.tsx',
    'src/islands/consortium/views/palette/Climate2050Tab.tsx',
    'src/islands/consortium/views/palette/PlantingPlanTab.tsx',
    'src/islands/consortium/views/PrintSheet.tsx',
  ];
  const forbidden = /\b(canopy|understory|ground\s+cover|shrub\s+layer|herbaceous|climber|strata)\b/i;

  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');
    assert.ok(!/\btitle\s*=/.test(code), `${f}: must not use native title="..." attribute`);
    assert.ok(!/\.csv\b|text\/csv/i.test(code), `${f}: must not include CSV export`);
    assert.ok(!forbidden.test(code), `${f}: must not contain botanical-layer jargon`);
  }

  // Verify PrintSheet includes Field & Nursery Sheet sections.
  const printSrc = readFileSync('src/islands/consortium/views/PrintSheet.tsx', 'utf8');
  assert.match(printSrc, /Field &amp; Microclimate Brief/);
  assert.match(printSrc, /Nursery Order &amp; Spacing Sheet/);
  assert.match(printSrc, /Field Materials &amp; 4 Planting Waves/);
  assert.match(printSrc, /12-Month Field Action Calendar/);
});

test('Stage 1G: siteClimateProfile is the single source of truth across all 7 Studio screens (mild, cold & southern hemisphere)', async () => {
  const cw = await import('../src/islands/consortium/rules/climate-words.ts');
  const sp = taxon({
    id: 'oregano',
    canonical_name: 'Origanum vulgare',
    en: 'Oregano',
    climate: { tminCold: { low: -21, median: -5, high: 8 }, tmaxWarm: { low: 20, median: 28, high: 34 } },
    traits: { soil_ph: { min: 5.1, max: 8.5 }, height_m: { min: 0.3, max: 0.8 }, drought_tolerance: 'High' },
  });

  // 1. Mild site (Montpellier-like)
  const mildLoc = {
    ...LOC,
    lookup: {
      ...LOC.lookup,
      soil: { phH2o: 7.7, texture: 'Loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
      climate: { periods: [{ period: '1991-2020', scenario: 'historical', koppen: 'Csa', tminColdC: 4.0, tmaxWarmC: 28.5, tmeanColdC: 7.5, tmeanWarmC: 23.5, aridityIndex: 0.97 }] },
    },
  };
  const mildProfile = cw.siteClimateProfile(mildLoc, 'mediterranean');
  assert.equal(mildProfile.coldFreeze10yrC, -4.5);
  assert.equal(mildProfile.heatPeak10yrC, 36.5);
  assert.equal(mildProfile.ph, 7.7);
  assert.equal(mildProfile.phReaction, 'mildly alkaline');
  assert.equal(mildProfile.winterTier, 'mild');
  assert.equal(mildProfile.coldMonth, 'Jan');
  assert.equal(mildProfile.warmMonth, 'Jul');

  const mildDossier = filtersMod.buildDossierSpec(sp, null, mildLoc, true);
  assert.equal(mildDossier.tempTrack.siteFreezeC, mildProfile.coldFreeze10yrC, 'Dossier freeze marker matches siteClimateProfile');
  assert.equal(mildDossier.phTrack.sitePh, mildProfile.ph, 'Dossier soil pH matches siteClimateProfile');
  assert.equal(mildDossier.ledger[0].label, 'Hard-freeze limit');

  const mild2050 = analysis.evaluateClimate2050([sp], [sp], mildLoc, '2041-2070', 'typical', analysis.STRESS_PRESETS[0].stress);
  const dryForce = mild2050.forces.find((f) => f.label === 'Longest summer dry spell');
  assert.ok(dryForce && dryForce.today.includes(`${mildProfile.dryStreakDays}d`), '2050 Climate dry spell matches siteClimateProfile');

  // 2. Colder site (Lyon-like)
  const coldLoc = {
    ...LOC,
    lat: 45.76,
    lon: 4.84,
    label: 'Lyon, France',
    lookup: {
      ...LOC.lookup,
      soil: { phH2o: 5.9, texture: 'Loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
      climate: { periods: [{ period: '1991-2020', scenario: 'historical', koppen: 'Cfa', tminColdC: 0.1, tmaxWarmC: 26.6, tmeanColdC: 3.5, tmeanWarmC: 21.0, aridityIndex: 1.15 }] },
    },
  };
  const coldProfile = cw.siteClimateProfile(coldLoc, 'subtropical');
  assert.equal(coldProfile.coldFreeze10yrC, -8.4);
  assert.equal(coldProfile.phReaction, 'mildly acidic');
  assert.equal(coldProfile.winterTier, 'cool');
  assert.equal(coldProfile.winterClass, 'Hard-freeze winter');

  // 3. Southern hemisphere site (months flip to Jul night / Jan afternoon / May–Sep winter)
  const southLoc = { ...mildLoc, lat: -33.86, lon: 151.21, label: 'Sydney' };
  const southProfile = cw.siteClimateProfile(southLoc, 'subtropical');
  assert.equal(southProfile.coldMonth, 'Jul');
  assert.equal(southProfile.warmMonth, 'Jan');
  assert.equal(southProfile.winterSeason, 'May–Sep');

  // 4. Static guard: all 7 Studio screens wire through siteClimateProfile & contain zero legacy misleading labels.
  const sevenScreens = [
    'src/islands/consortium/views/place/SitePostcard.tsx',
    'src/islands/consortium/views/palette/StudioHeader.tsx',
    'src/islands/consortium/views/palette/StudioRail.tsx',
    'src/islands/consortium/views/palette/LivingSystemTab.tsx',
    'src/islands/consortium/views/palette/Climate2050Tab.tsx',
    'src/islands/consortium/views/palette/PlantingPlanTab.tsx',
    'src/islands/consortium/views/palette/FieldDossier.tsx',
  ];
  const forbiddenLegacy = /\b(coldest low|warmest high|Winter floor)\b|Aridity\s+\d/i;
  for (const f of sevenScreens) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!forbiddenLegacy.test(src), `${f}: must not contain misleading legacy climate label`);
  }
  const profileConsumers = [
    ...sevenScreens.slice(0, 6),
    'src/islands/consortium/rules/studio-filters.ts',
    'src/islands/consortium/rules/studio-analysis.ts',
  ];
  for (const f of profileConsumers) {
    const src = readFileSync(f, 'utf8');
    assert.ok(src.includes('siteClimateProfile'), `${f}: must consume siteClimateProfile`);
  }
});
