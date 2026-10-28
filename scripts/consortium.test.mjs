// The consortium tool's data core (src/lib/consortium/), through its public functions, on the
// invented format 3 fixture (scripts/fixtures/consortium/) and on small climate files built from it. The
// scoring contract is the plan's "Scoring module" (knowledge/project/consortium-tool-plan.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const core = await import('../src/lib/consortium/index.ts');
const { fileFor, isCountry, invasiveChecked, fits, jobsOf, jobs, bandOf, bandsOf, phases, conflicts, invasiveIn, invasiveCountries } = core;
const { gain, suggest, evaluate, alternatives, flagsFor, SIZE_LIMIT, DEFAULT_SITE, LINK_VERSION, FORMAT_VERSION, encodeState, decodeState, resolveState, resolveIds, MAX_LINK_IDS, MAX_CROPS, taxonByName } = core;

const read = (name) => JSON.parse(readFileSync(new URL(`fixtures/consortium/${name}`, import.meta.url), 'utf8'));
const manifest = read('manifest.json');
const tropical = read('tropical.json');
const mediterranean = read('mediterranean.json');
const temperate = read('temperate.json');
const allTaxa = [...tropical.taxa, ...mediterranean.taxa, ...temperate.taxa];
const named = (name) => {
  const t = allTaxa.find((x) => x.canonical_name === name);
  assert.ok(t, `fixture has ${name}`);
  return t;
};

// A site where only the light can be unknown: soil and water not known, a field.
const open = { light: 'sun', soil: 'unsure', water: 'unsure', room: 'field' };

// A taxon that brings nothing: a support plant with no functions, stratum or phases, every trait
// unknown except full sun, edibility 0, checked for invasiveness and found nowhere.
let serial = 0;
const idOf = (n) => `${n.toString(16).padStart(8, '0')}-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
function make(over = {}) {
  serial += 1;
  const base = structuredClone(tropical.taxa[0]);
  const traits = Object.fromEntries(Object.keys(base.traits).map((k) => [k, null]));
  return {
    ...base,
    id: idOf(serial),
    canonical_name: `Testus n${String(serial).padStart(4, '0')}`,
    genus: 'Testus',
    family: 'Testaceae',
    role: 'support',
    stratum: null,
    phases: null,
    functions: null,
    image: null,
    ...over,
    traits: { ...traits, sun: true, edibility_rating: 0, ...over.traits },
    warnings: { toxicity: null, invasive_in: [], allelopathic: null, weed_potential: null, ...over.warnings },
  };
}
const fn = (...names) => names.map((f) => ({ function: f, method: 'curated', sources: ['pfaf'] }));
const layer = (value, start = 'placenta_i', end = 'climax') => ({
  stratum: { value, sources: ['pfaf'] },
  phases: { start, end, sources: ['pfaf'] },
});
const cellOf = (taxa, interactions = []) => ({ ...structuredClone(tropical), taxa, interactions });
const names = (list) => list.map((m) => m.taxon.canonical_name);

// fileFor, isCountry and invasiveChecked

test('fileFor maps the site climate ids (lowercase) to the climate files of the export', () => {
  assert.equal(fileFor(manifest, 'tropical')?.file, 'tropical.json');
  assert.equal(fileFor(manifest, 'mediterranean')?.file, 'mediterranean.json');
  assert.equal(fileFor(manifest, 'temperate')?.taxa, 13);
  assert.deepEqual(fileFor(manifest, 'temperate')?.regions, ['europe', 'asia_temperate']);
  assert.equal(fileFor(manifest, 'Temperate')?.file, 'temperate.json', 'either case is read');
});

test('fileFor answers null for a climate not covered yet or an unknown id', () => {
  assert.equal(fileFor(manifest, 'boreal'), null);
  assert.equal(fileFor(manifest, 'arid'), null);
  assert.equal(fileFor(manifest, 'polar'), null);
  assert.equal(fileFor(manifest, 'mars'), null);
});

test('isCountry knows every manifest country; invasiveChecked only those GRIIS checked', () => {
  for (const code of ['FR', 'fr', 'BR', 'TW', 'AQ']) assert.ok(isCountry(manifest, code), code);
  for (const code of ['ZZ', '', null, undefined]) assert.ok(!isCountry(manifest, code), String(code));
  assert.equal(invasiveChecked(manifest, 'BR'), true);
  assert.equal(invasiveChecked(manifest, 'tw'), false);
  assert.equal(invasiveChecked(manifest, 'ZZ'), false);
  assert.equal(invasiveChecked(manifest, null), false);
});

test('the link version is 3 (the compact encoding) while the export format is 3', () => {
  assert.equal(LINK_VERSION, 3);
  assert.equal(FORMAT_VERSION, 3);
  assert.equal(manifest.format_version, FORMAT_VERSION);
});

// fits

test('fits: light against sun, semi_shade and full_shade; null is unknown', () => {
  const cacao = named('Theobroma cacao'), peanut = named('Arachis pintoi'), papaya = named('Carica papaya'), leucaena = named('Leucaena leucocephala');
  const at = (light) => ({ ...open, light });
  assert.deepEqual(fits(cacao, at('sun')).misfits, ['light']);
  assert.equal(fits(peanut, at('sun')).ok, true);
  assert.deepEqual(fits(leucaena, at('part')).misfits, ['light']);
  assert.deepEqual(fits(papaya, at('part')), { ok: true, misfits: [], unknowns: ['light'] });
  assert.equal(fits(cacao, at('shade')).ok, true);
  assert.deepEqual(fits(peanut, at('shade')).misfits, ['light']);
});

test('fits: soil bands acid < 6, neutral 6–7.5, chalky > 7.5 against the pH range', () => {
  const at = (soil) => ({ ...open, soil });
  const peanut = named('Arachis pintoi'); // 4.5–7.0
  assert.equal(fits(peanut, at('acid')).ok, true);
  assert.equal(fits(peanut, at('neutral')).ok, true);
  assert.deepEqual(fits(peanut, at('chalky')).misfits, ['soil']);
  assert.deepEqual(fits(named('Lavandula angustifolia'), at('acid')).misfits, ['soil'], '6.5–8.5');
  assert.equal(fits(named('Leucaena leucocephala'), at('chalky')).ok, true, '5.5–8.5');
  assert.deepEqual(fits(make({ traits: { soil_ph: { min: 6, max: 7.5 } } }), at('acid')).misfits, ['soil'], 'min 6 is not acid');
  assert.deepEqual(fits(make({ traits: { soil_ph: { min: 6, max: 7.5 } } }), at('chalky')).misfits, ['soil'], 'max 7.5 is not chalky');
  assert.deepEqual(fits(make({ traits: { soil_ph: { min: 4, max: 5.5 } } }), at('neutral')).misfits, ['soil']);
  assert.deepEqual(fits(make({ traits: { soil_ph: { min: 8, max: 9 } } }), at('neutral')).misfits, ['soil']);
  assert.deepEqual(fits(make({ traits: { soil_ph: { min: 8, max: null } } }), at('neutral')).misfits, ['soil'], 'one known bound can prove a misfit');
  assert.deepEqual(fits(make({ traits: { soil_ph: { min: 5, max: null } } }), at('neutral')).unknowns, ['soil']);
  assert.deepEqual(fits(make({ traits: { soil_ph: { min: null, max: 7 } } }), at('acid')).unknowns, ['soil']);
  assert.deepEqual(fits(named('Tithonia diversifolia'), at('acid')).unknowns, ['soil'], 'soil_ph null');
  assert.deepEqual(fits(named('Tithonia diversifolia'), at('unsure')), { ok: true, misfits: [], unknowns: [] });
});

test('fits: dry and wet water against drought tolerance, moisture use and drainage', () => {
  const at = (water) => ({ ...open, water });
  assert.deepEqual(fits(named('Inga edulis'), at('dry')).misfits, ['water'], 'drought Low');
  assert.deepEqual(fits(make({ traits: { drought_tolerance: 'None' } }), at('dry')).misfits, ['water']);
  assert.equal(fits(named('Cajanus cajan'), at('dry')).ok, true, 'drought High');
  assert.deepEqual(fits(named('Arachis pintoi'), at('dry')).unknowns, ['water'], 'drought unknown, moisture Medium');
  assert.deepEqual(fits(make({ traits: { moisture_use: 'High' } }), at('dry')).misfits, ['water'], 'drought unknown, thirsty');
  assert.deepEqual(fits(named('Cajanus cajan'), at('wet')).misfits, ['water'], 'well drained and drought High');
  assert.equal(fits(named('Inga edulis'), at('wet')).ok, true, 'drought Low');
  assert.equal(fits(named('Artocarpus altilis'), at('wet')).unknowns.length, 0, 'moisture High');
  assert.equal(fits(make({ traits: { well_drained: false, drought_tolerance: 'High' } }), at('wet')).ok, true);
  assert.deepEqual(fits(named('Malus domestica'), at('wet')).unknowns, ['water'], 'well drained, drought unknown');
  for (const water of ['average', 'unsure']) assert.deepEqual(fits(named('Inga edulis'), at(water)), { ok: true, misfits: [], unknowns: [] }, water);
});

test('fits: a wet site is a misfit for a good-drainage plant of low moisture use when its drought tolerance is unknown', () => {
  // The real export: thyme, sage and Asparagus acutifolius are well_drained true, drought_tolerance null, moisture_use Low.
  const wet = { ...open, water: 'wet' };
  const thyme = make({ role: 'crop', ...layer('medium'), traits: { well_drained: true, drought_tolerance: null, moisture_use: 'Low', edibility_rating: 5 } });
  assert.deepEqual(fits(thyme, wet).misfits, ['water']);
  assert.deepEqual(fits(make({ traits: { well_drained: null, drought_tolerance: null, moisture_use: 'Low' } }), wet).unknowns, ['water'], 'drainage unknown');
  assert.deepEqual(fits(make({ traits: { well_drained: true, drought_tolerance: null, moisture_use: null } }), wet).unknowns, ['water'], 'moisture unknown');
  assert.equal(fits(make({ traits: { well_drained: true, drought_tolerance: 'Medium', moisture_use: 'Low' } }), wet).ok, true, 'known drought tolerance decides');
  assert.deepEqual(fits(thyme, { ...open, water: 'dry' }).unknowns, ['water'], 'dry unchanged');
  const pool = [thyme, ...Array.from({ length: 3 }, (_, n) => make({ canonical_name: `Wet ${n}`, role: 'crop', ...layer('low'), traits: { well_drained: false } }))];
  assert.ok(!suggest(cellOf(pool), { site: wet }).members.some((m) => m.taxon.id === thyme.id), 'never suggested for a wet site');
});

test('fits: room limits height and width at 6 m (small) and 12 m (large); a field takes anything', () => {
  const at = (room) => ({ ...open, room });
  assert.deepEqual(fits(named('Artocarpus altilis'), at('small')).misfits, ['room']);
  assert.equal(fits(named('Musa acuminata'), at('small')).ok, true, '6 m is allowed');
  assert.equal(fits(named('Gliricidia sepium'), at('large')).ok, true, '12 m is allowed');
  assert.deepEqual(fits(named('Alnus cordata'), at('large')).misfits, ['room']);
  assert.deepEqual(fits(make({ traits: { height_m: { min: 1, max: 2 }, width_max_m: 7 } }), at('small')).misfits, ['room'], 'too wide');
  assert.deepEqual(fits(make({ traits: { height_m: null, width_max_m: 13 } }), at('large')).misfits, ['room'], 'width alone proves it');
  assert.deepEqual(fits(make({ traits: { height_m: { min: 1, max: null }, width_max_m: 2 } }), at('small')).unknowns, ['room']);
  assert.equal(fits(named('Juglans nigra'), at('field')).ok, true);
});

test('fits: an unknown trait is never a misfit, on any site', () => {
  const blank = make({ traits: { sun: null } });
  for (const light of ['sun', 'part', 'shade']) for (const soil of ['acid', 'neutral', 'chalky', 'unsure'])
    for (const water of ['dry', 'average', 'wet', 'unsure']) for (const room of ['small', 'large', 'field']) {
      const f = fits(blank, { light, soil, water, room });
      assert.equal(f.ok, true);
      assert.deepEqual(f.misfits, []);
    }
  assert.deepEqual(fits(blank, { light: 'sun', soil: 'acid', water: 'dry', room: 'small' }).unknowns, ['light', 'soil', 'water', 'room']);
});

// jobs and phase bands

test('jobsOf: a crop feeds you, functions map to the five other jobs, null functions give none', () => {
  assert.deepEqual(jobsOf(named('Arachis pintoi')), ['feeds_soil', 'ground', 'helpers']);
  assert.deepEqual(jobsOf(named('Musa acuminata')), ['feeds_you', 'mulch', 'shelter']);
  assert.deepEqual(jobsOf(named('Manihot esculenta')), ['feeds_you'], 'functions: null');
  assert.deepEqual(jobsOf(named('Tithonia diversifolia')), ['mulch', 'helpers'], 'dynamic accumulator and mulch are one job');
  const each = { nitrogen_fixer: 'feeds_soil', mulch: 'mulch', dynamic_accumulator: 'mulch', ground_cover: 'ground', insectary: 'helpers',
    pollinator_forage: 'helpers', windbreak: 'shelter', pest_repellent: 'shelter', trap_crop: 'shelter', wildlife_habitat: 'shelter' };
  for (const [f, job] of Object.entries(each)) assert.deepEqual(jobsOf(make({ functions: fn(f) })), [job], f);
  assert.deepEqual(jobsOf(make({ role: 'crop', functions: fn(...Object.keys(each)) })), [...jobs]);
  assert.deepEqual(jobs, ['feeds_you', 'feeds_soil', 'mulch', 'ground', 'helpers', 'shelter']);
});

test('phase bands: placenta is early, secondary I–II middle, secondary III and climax mature', () => {
  assert.deepEqual(phases.map(bandOf), ['early', 'early', 'early', 'middle', 'middle', 'mature', 'mature']);
  assert.deepEqual(bandsOf(named('Arachis pintoi')), ['early', 'middle', 'mature'], 'placenta II to secondary III');
  assert.deepEqual(bandsOf(named('Vicia faba')), ['early']);
  assert.deepEqual(bandsOf(named('Artocarpus altilis')), ['middle', 'mature']);
  assert.deepEqual(bandsOf(named('Zingiber officinale')), [], 'phases not known yet');
});

// conflicts and invasive

test('conflicts: species against genus, in either member order', () => {
  const walnut = named('Juglans nigra'), apple = named('Malus domestica');
  for (const members of [[walnut, apple], [apple, walnut]]) {
    const found = conflicts(members, temperate.interactions);
    assert.equal(found.length, 1);
    assert.equal(found[0].a.canonical_name, 'Juglans nigra', 'a is the subject side');
    assert.equal(found[0].b.canonical_name, 'Malus domestica');
    assert.equal(found[0].type, 'allelopathic_harm');
    assert.equal(found[0].severity, 'high');
    assert.equal(found[0].agent, 'juglone');
    assert.ok(found[0].note.en);
    assert.ok(found[0].sources.length);
  }
});

test('conflicts: genus against genus, and the walnut-tolerant comfrey is not a conflict', () => {
  const found = conflicts([named('Malus domestica'), named('Juniperus virginiana')], temperate.interactions);
  assert.deepEqual(found.map((c) => [c.a.genus, c.b.genus, c.type]), [['Juniperus', 'Malus', 'alternate_host']]);
  assert.deepEqual(conflicts([named('Juglans nigra'), named('Symphytum × uplandicum')], temperate.interactions), []);
});

test('conflicts: family rank, both directions, and a same-genus row pairs two members once', () => {
  const rows = [{ subject: { name: 'Rosaceae', rank: 'family' }, object: { name: 'Fabaceae', rank: 'family' }, type: 'shared_pest', agent: null, severity: 'low', note: null, sources: ['pfaf'] }];
  const apple = named('Malus domestica'), clover = named('Trifolium repens');
  for (const members of [[apple, clover], [clover, apple]]) {
    const found = conflicts(members, rows);
    assert.deepEqual(found.map((c) => [c.a.family, c.b.family, c.severity]), [['Rosaceae', 'Fabaceae', 'low']]);
  }
  assert.deepEqual(conflicts([apple], rows), []);
  const banana = named('Musa acuminata'), plantain = make({ canonical_name: 'Musa balbisiana', genus: 'Musa', family: 'Musaceae' });
  assert.equal(conflicts([banana], tropical.interactions).length, 0, 'a taxon does not conflict with itself');
  assert.equal(conflicts([banana, plantain], tropical.interactions).length, 1);
  assert.equal(conflicts([named('Tithonia diversifolia'), named('Ipomoea batatas')], tropical.interactions)[0].severity, 'medium');
});

test('invasiveIn: true where recorded, false where checked and absent, null when not checked or no country', () => {
  const leucaena = named('Leucaena leucocephala'), lemongrass = named('Cymbopogon citratus'), cassava = make({ warnings: { invasive_in: null } });
  assert.equal(invasiveIn(leucaena, 'BR', true), true);
  assert.equal(invasiveIn(leucaena, 'br', true), true);
  assert.equal(invasiveIn(leucaena, 'FR', true), false);
  assert.equal(invasiveIn(lemongrass, 'BR', true), false, 'checked, not recorded in Brazil');
  assert.equal(invasiveIn(cassava, 'BR', true), null, 'null is not checked');
  assert.equal(invasiveIn(leucaena, null), null);
  assert.equal(invasiveIn(leucaena, 'TW', false), null, 'a country GRIIS did not check is not checked, never none');
  assert.equal(invasiveIn(lemongrass, 'TW', false), null);
  assert.equal(invasiveCountries(leucaena).length, leucaena.warnings.invasive_in.length);
  assert.deepEqual(invasiveCountries(named('Musa acuminata')), []);
  assert.equal(invasiveCountries(cassava), null);
});

// gain

test('gain: 10 per new job, 3 per empty stratum × band cell, 1 per cell with one member, 6 per new stratum, 8 per band with no food, 4 per second soil/ground/mulch doer, 1 per edibility point, −3 for a weed, −0.5 per unknown', () => {
  // Food per band: a crop over the early band only, then one over every band.
  const earlyCrop = make({ role: 'crop', phases: { start: 'placenta_i', end: 'placenta_iii', sources: ['pfaf'] } });
  const lateCrop = make({ role: 'crop', phases: { start: 'placenta_i', end: 'climax', sources: ['pfaf'] } });
  assert.equal(gain(earlyCrop, [], open).food, 8);
  assert.equal(gain(lateCrop, [earlyCrop], open).food, 16, 'middle and mature still have no food');
  assert.equal(gain(make({ phases: lateCrop.phases }), [], open).food, 0, 'a support plant is not food');
  // A second soil feeder counts 4, a third nothing; a second helper nothing.
  const fixer = () => make({ functions: fn('nitrogen_fixer') });
  assert.equal(gain(fixer(), [fixer()], open).backup, 4);
  assert.equal(gain(fixer(), [fixer(), fixer()], open).backup, 0);
  assert.equal(gain(make({ functions: fn('insectary') }), [make({ functions: fn('insectary') })], open).backup, 0);

  const twoJobs = make({ role: 'crop', functions: fn('mulch') });
  assert.deepEqual(gain(twoJobs, [], open), { total: 20, jobs: 20, cells: 0, strata: 0, food: 0, backup: 0, edibility: 0, weedy: 0, unknowns: 0 });
  assert.equal(gain(twoJobs, [make({ role: 'crop' })], open).jobs, 10, 'feeds_you already covered');

  const lowAllBands = make(layer('low'));
  assert.deepEqual(gain(lowAllBands, [], open), { total: 15, jobs: 0, cells: 9, strata: 6, food: 0, backup: 0, edibility: 0, weedy: 0, unknowns: 0 });
  const lowEarly = make(layer('low', 'placenta_i', 'placenta_iii'));
  assert.deepEqual(gain(lowAllBands, [lowEarly], open), { total: 7, jobs: 0, cells: 7, strata: 0, food: 0, backup: 0, edibility: 0, weedy: 0, unknowns: 0 },
    'two empty cells, and one with a single member');
  assert.equal(gain(lowAllBands, [lowEarly, make(layer('low', 'placenta_i', 'placenta_iii'))], open).cells, 6, 'a cell with two members is worth nothing');

  assert.equal(gain(make({ traits: { edibility_rating: 4 } }), [], open).edibility, 4);
  assert.equal(gain(make({ traits: { edibility_rating: 4 } }), [], open).total, 4);
  assert.equal(gain(make({ warnings: { weed_potential: true } }), [], open).weedy, -3);

  const vague = make({ traits: { sun: null } });
  assert.equal(gain(vague, [], { light: 'sun', soil: 'acid', water: 'dry', room: 'small' }).unknowns, -2);
  assert.equal(gain(named('Arachis pintoi'), [], open).total, 46);
  assert.equal(gain(named('Arachis pintoi'), [], { ...open, water: 'dry' }).total, 45.5);
});

// suggest

test('suggest adds a plant only while it fills a gap: a new job or a thin stratum × band cell', () => {
  const site = open;
  // Edible but nothing new: no stratum, no job; never added, whatever its gain.
  const snack = make({ traits: { edibility_rating: 5 } });
  assert.equal(gain(snack, [], site).total, 5);
  assert.deepEqual(suggest(cellOf([snack]), { site }).members, []);
  // A low plant over every band, then its twin (each cell now has one member, worth 1), then a
  // third (nothing left to fill): two plants, not three.
  const [a, b, c] = [0, 1, 2].map(() => make(layer('low')));
  assert.deepEqual(names(suggest(cellOf([a, b, c]), { site }).members), [a, b].map((t) => t.canonical_name));
  // A weed comes after an equal plant that is not, but still fills a gap when nothing else does.
  const weed = make({ ...layer('high'), warnings: { weed_potential: true } });
  const tidy = make(layer('high'));
  assert.deepEqual(names(suggest(cellOf([weed, tidy]), { site }).members), [tidy, weed].map((t) => t.canonical_name));
});

test('suggest breaks a tie in favour of the better-known plant (named in more languages)', () => {
  const plain = make({ ...layer('high'), canonical_name: 'Aaa first', names: { en: 'Plain' } });
  const famous = make({ ...layer('high'), canonical_name: 'Zzz last' });
  assert.ok(Object.keys(famous.names).length > 1);
  const s = suggest(cellOf([plain, famous]), { site: { ...open, room: 'small' } });
  assert.equal(s.members[0].taxon.canonical_name, 'Zzz last');
});

// Ten plants that each pass the threshold in turn: four that open a stratum (12 each), then six
// that each do one new job (10 each); and two kept plants that bring nothing.
function tenGood() {
  const strata = ['emergent', 'high', 'medium', 'low'].map((s) => make({ ...layer(s, 'placenta_i', 'secondary_ii') }));
  const workers = ['nitrogen_fixer', 'mulch', 'ground_cover', 'insectary', 'windbreak'].map((f) => make({ functions: fn(f) }));
  const grower = make({ role: 'crop' });
  return { strata, workers: [...workers, grower], idle: [make(), make()] };
}

test('suggest stops at 6 plants in a small garden, 9 in a large one, 12 in a field (or when nothing fills a gap), kept plants included', () => {
  assert.deepEqual(SIZE_LIMIT, { small: 6, large: 9, field: 12 });
  const { strata, workers, idle } = tenGood();
  const cell = cellOf([...strata, ...workers, ...idle]);
  assert.equal(suggest(cell, { site: { ...open, room: 'small' } }).members.length, 6);
  assert.equal(suggest(cell, { site: { ...open, room: 'large' } }).members.length, 9);
  assert.equal(suggest(cell, { site: { ...open, room: 'field' } }).members.length, 10, 'the two idle plants fill no gap');
  const withKept = suggest(cell, { site: { ...open, room: 'large' }, kept: idle.map((t) => t.id) });
  assert.equal(withKept.members.length, 9);
  assert.deepEqual(withKept.members.slice(0, 2).map((m) => [m.taxon.id, m.kept, m.gain]), idle.map((t) => [t.id, true, null]));
  assert.equal(withKept.members.filter((m) => !m.kept).length, 7, 'the two kept plants take two places');
});

test('suggest picks the highest gain first and breaks ties by canonical name', () => {
  const { strata, workers } = tenGood();
  const s = suggest(cellOf([...workers, ...strata].reverse()), { site: open });
  assert.deepEqual(names(s.members), [...strata, ...workers].map((t) => t.canonical_name));
  assert.deepEqual(s.members.map((m) => m.gain), [12, 12, 12, 12, 10, 10, 10, 10, 10, 10]);
  assert.deepEqual(s.gaps, []);
  const few = suggest(cellOf(strata), { site: open });
  assert.deepEqual(few.gaps, [...jobs], 'jobs nobody does are named');
});

test('suggest is deterministic: the same answer whatever the order of the cell', () => {
  for (const cell of [tropical, mediterranean, temperate]) {
    for (const room of ['small', 'large', 'field']) {
      const site = { ...DEFAULT_SITE, room };
      const once = suggest(cell, { site, country: 'BR', countryChecked: true });
      const shuffled = { ...cell, taxa: [...cell.taxa].reverse(), interactions: [...cell.interactions].reverse() };
      assert.deepEqual(names(suggest(cell, { site, country: 'BR', countryChecked: true }).members), names(once.members));
      assert.deepEqual(names(suggest(shuffled, { site, country: 'BR', countryChecked: true }).members), names(once.members));
      assert.ok(once.members.length > 0, `${cell.climate_zone} ${room}`);
    }
  }
});

test('suggest never picks a misfit, but a kept misfit stays with its flag', () => {
  const shady = make({ functions: fn('nitrogen_fixer'), traits: { sun: false } });
  const cell = cellOf([shady]);
  assert.deepEqual(suggest(cell, { site: open }).members, []);
  const kept = suggest(cell, { site: open, kept: [shady.id] }).members;
  assert.equal(kept.length, 1);
  assert.deepEqual(kept[0].flags.misfits, ['light']);
  assert.equal(kept[0].flags.flagged, true);
});

// Owner, 2026-10-28: invasiveness is a warning, never a filter or a score.
test('suggest picks the same plants with or without a country; invasive here is a warning, not a flag', () => {
  const invasive = make({ functions: fn('mulch'), warnings: { invasive_in: [{ country: 'BR', sources: ['griis'] }] } });
  const unchecked = make({ functions: fn('ground_cover'), warnings: { invasive_in: null } });
  const cell = cellOf([invasive, unchecked]);
  const both = [invasive.canonical_name, unchecked.canonical_name];
  for (const country of ['BR', 'FR', 'TW', null]) assert.deepEqual(names(suggest(cell, { site: open, country }).members), both, String(country));
  const br = suggest(cell, { site: open, country: 'BR', countryChecked: true }).members;
  assert.equal(br.find((m) => m.taxon.id === invasive.id).flags.invasive, true);
  assert.equal(br.find((m) => m.taxon.id === invasive.id).flags.flagged, false, 'not held back');
  assert.equal(br.find((m) => m.taxon.id === unchecked.id).flags.invasive, null);
  assert.equal(suggest(cell, { site: open, country: 'FR', countryChecked: true }).members.find((m) => m.taxon.id === invasive.id).flags.invasive, false);
  assert.equal(suggest(cell, { site: open, country: 'BR', countryChecked: false }).members.find((m) => m.taxon.id === invasive.id).flags.invasive, null, 'unchecked country');
  // On the fixture: the members never depend on the country.
  for (const room of ['small', 'large', 'field']) {
    const site = { ...open, room };
    const ids = (country) => suggest(tropical, { site, country, kept: [named('Inga edulis').id] }).members.map((m) => m.taxon.id);
    assert.deepEqual(ids('BR'), ids(null), room);
    assert.deepEqual(ids('FR'), ids(null), room);
  }
});

test('suggest leaves out a plant with a medium or high conflict with a member; a low one only warns', () => {
  const host = make({ canonical_name: 'Aaa host', role: 'crop' });
  const high = make({ canonical_name: 'Bbb high', functions: fn('mulch') });
  const low = make({ canonical_name: 'Ccc low', functions: fn('ground_cover') });
  const row = (object, severity) => ({ subject: { name: 'Aaa host', rank: 'species' }, object: { name: object, rank: 'species' }, type: 'shared_pest', agent: null, severity, note: null, sources: ['pfaf'] });
  const cell = cellOf([host, high, low], [row('Bbb high', 'high'), row('Ccc low', 'low')]);
  const s = suggest(cell, { site: open, kept: [host.id] });
  assert.deepEqual(names(s.members), ['Aaa host', 'Ccc low']);
  assert.equal(s.members[1].flags.conflicts[0].severity, 'low');
  assert.equal(s.members[1].flags.flagged, false);
  const both = suggest(cell, { site: open, kept: [host.id, high.id] });
  assert.equal(both.members.find((m) => m.taxon.id === high.id).flags.flagged, true, 'kept anyway, flagged');
  // Medium too, from the object side: the tropical tithonia and sweet potato.
  const tithonia = named('Tithonia diversifolia'), potato = named('Ipomoea batatas');
  assert.ok(!names(suggest(tropical, { site: open, kept: [potato.id] }).members).includes(tithonia.canonical_name));
  assert.ok(!names(suggest(tropical, { site: open, kept: [tithonia.id] }).members).includes(potato.canonical_name));
});

test('suggest never picks a removed plant; kept wins over removed; unknown ids are ignored', () => {
  const { strata, workers } = tenGood();
  const cell = cellOf([...strata, ...workers]);
  const s = suggest(cell, { site: open, removed: [strata[0].id, workers[0].id] });
  assert.ok(!s.members.some((m) => m.taxon.id === strata[0].id || m.taxon.id === workers[0].id));
  const both = suggest(cell, { site: open, kept: [strata[0].id], removed: [strata[0].id] });
  assert.equal(both.members[0].taxon.id, strata[0].id);
  assert.equal(suggest(cell, { site: open, kept: ['ffffffff-0000-4000-8000-000000000000'] }).members.length, 10);
});

// evaluate: a fixed list, never refilled

test('evaluate scores a fixed list without refilling: a removed member leaves its gap', () => {
  const { strata, workers, idle } = tenGood();
  const cell = cellOf([...strata, ...workers, ...idle]);
  const site = { ...open, room: 'large' };
  const s = suggest(cell, { site, kept: [strata[1].id] });
  const ids = s.members.map((m) => m.taxon.id);
  assert.deepEqual(evaluate(cell, ids, { site, kept: [strata[1].id] }), s, 'the same members, flags, gains and gaps as the suggestion');
  const gone = s.members.find((m) => m.taxon.id === workers[0].id);
  assert.ok(gone, 'the worker was suggested');
  const left = evaluate(cell, ids.filter((id) => id !== gone.taxon.id), { site, kept: [strata[1].id] });
  assert.equal(left.members.length, s.members.length - 1, 'the gap stays');
  assert.ok(!left.members.some((m) => m.taxon.id === gone.taxon.id));
  assert.ok(!s.gaps.includes('feeds_soil') && left.gaps.includes('feeds_soil'), 'the gap is named');
  assert.equal(suggest(cell, { site, kept: ids.filter((id) => id !== gone.taxon.id), removed: [gone.taxon.id] }).members.length, s.members.length, 'suggest would refill it');
  assert.equal(left.limit, 9);
});

test('evaluate flags misfits, invasives and conflicts in a fixed list, and ignores unknown and repeated ids', () => {
  const inga = named('Inga edulis'), potato = named('Ipomoea batatas'), tithonia = named('Tithonia diversifolia'), leucaena = named('Leucaena leucocephala');
  const e = evaluate(tropical, [tithonia.id, potato.id, leucaena.id, inga.id, inga.id, 'ffffffff-0000-4000-8000-000000000000'], { site: { ...open, water: 'dry' }, country: 'BR', countryChecked: true });
  assert.deepEqual(names(e.members), ['Tithonia diversifolia', 'Ipomoea batatas', 'Leucaena leucocephala', 'Inga edulis'], 'in the given order');
  const by = (name) => e.members.find((m) => m.taxon.canonical_name === name).flags;
  assert.equal(by('Leucaena leucocephala').invasive, true);
  assert.equal(by('Tithonia diversifolia').conflicts[0].b.canonical_name, 'Ipomoea batatas');
  assert.deepEqual(by('Inga edulis').misfits, ['water']);
  assert.ok(e.members.every((m) => m.kept === false));
});

// alternatives

test('alternatives: unflagged first, then same stratum, shared jobs, gain, name; members and removed left out', () => {
  const member = make({ canonical_name: 'M member', ...layer('high'), functions: fn('mulch', 'windbreak') });
  const other = make({ canonical_name: 'O other', role: 'crop', ...layer('low') });
  const sameTwoJobs = make({ canonical_name: 'Z same two', ...layer('high'), functions: fn('mulch', 'windbreak') });
  const sameOneJob = make({ canonical_name: 'A same one', ...layer('high'), functions: fn('mulch'), traits: { edibility_rating: 5 } });
  const sameOneJobLess = make({ canonical_name: 'B same one less', ...layer('high'), functions: fn('mulch') });
  const sameOneJobTie = make({ canonical_name: 'C same one less', ...layer('high'), functions: fn('mulch') });
  const elsewhere = make({ canonical_name: 'D elsewhere', ...layer('low'), functions: fn('mulch', 'windbreak', 'ground_cover') });
  const removed = make({ canonical_name: 'E removed', ...layer('high'), functions: fn('mulch', 'windbreak') });
  const flagged = make({ canonical_name: 'F flagged', ...layer('high'), traits: { sun: false } });
  const cell = cellOf([member, other, sameTwoJobs, sameOneJob, sameOneJobLess, sameOneJobTie, elsewhere, removed, flagged]);
  const alts = alternatives(member.id, [member.id, other.id], cell, { site: open, removed: [removed.id] });
  assert.deepEqual(alts.map((a) => a.taxon.canonical_name), ['Z same two', 'A same one', 'B same one less', 'C same one less', 'D elsewhere', 'F flagged']);
  assert.deepEqual(alts.map((a) => a.sameStratum), [true, true, true, true, false, true]);
  assert.deepEqual(alts[0].sharedJobs, ['mulch', 'shelter']);
  assert.ok(alts[1].gain > alts[2].gain);
  assert.deepEqual(alts[5].flags.misfits, ['light']);
  assert.equal(alts[5].flags.flagged, true);
  assert.deepEqual(alternatives('ffffffff-0000-4000-8000-000000000000', [], cell, { site: open }), []);
});

test('alternatives on the fixture: flagged plants are listed with their warnings', () => {
  const inga = named('Inga edulis'), potato = named('Ipomoea batatas');
  const alts = alternatives(inga.id, [inga.id, potato.id], tropical, { site: open, country: 'BR', countryChecked: true });
  const leucaena = alts.find((a) => a.taxon.canonical_name === 'Leucaena leucocephala');
  assert.equal(leucaena.flags.invasive, true);
  assert.equal(leucaena.flags.flagged, false, 'invasive here is told, not held back');
  const tithonia = alts.find((a) => a.taxon.canonical_name === 'Tithonia diversifolia');
  assert.equal(tithonia.flags.conflicts[0].b.canonical_name, 'Ipomoea batatas');
  assert.ok(!alts.some((a) => a.taxon.id === inga.id || a.taxon.id === potato.id));
  const firstFlagged = alts.findIndex((a) => a.flags.flagged);
  assert.ok(firstFlagged > 0 && alts.slice(firstFlagged).every((a) => a.flags.flagged), 'flagged plants come last, after every plant without a warning');
  for (const group of [alts.slice(0, firstFlagged), alts.slice(firstFlagged)]) {
    const firstOther = group.findIndex((a) => !a.sameStratum);
    if (firstOther >= 0) assert.ok(group.slice(firstOther).every((a) => !a.sameStratum), 'same stratum first, within each group');
  }
});

test('flagsFor: a plant beside the members carries the flags it would have as a member', () => {
  const inga = named('Inga edulis'), potato = named('Ipomoea batatas'), tithonia = named('Tithonia diversifolia'), leucaena = named('Leucaena leucocephala');
  const opts = { site: open, country: 'BR', countryChecked: true };
  const t = flagsFor(tropical, tithonia.id, [inga.id, potato.id], opts);
  assert.equal(t.conflicts[0].b.canonical_name, 'Ipomoea batatas');
  const asMember = evaluate(tropical, [inga.id, potato.id, tithonia.id], opts).members.at(-1).flags;
  assert.deepEqual({ ...t, conflicts: t.conflicts.length }, { ...asMember, conflicts: asMember.conflicts.length });
  assert.equal(flagsFor(tropical, leucaena.id, [], opts).invasive, true);
  assert.equal(flagsFor(tropical, leucaena.id, [], { ...opts, countryChecked: false }).invasive, null);
  assert.equal(flagsFor(tropical, leucaena.id, [leucaena.id], opts).invasive, true, 'a member is left out of its own list');
  assert.equal(flagsFor(tropical, 'ffffffff-0000-4000-8000-000000000000', [], opts), null);
});

// state

const sampleState = () => ({
  climate: 'tropical', country: 'BR',
  site: { light: 'part', soil: 'acid', water: 'wet', room: 'small' },
  kept: [named('Inga edulis').id, named('Musa acuminata').id],
  removed: [named('Leucaena leucocephala').id],
});
// A v3 token: the first 36 bits of the id (9 hex digits) as 6 base64url characters.
const hex = (id) => id.replace(/-/g, '');
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const token = (id, long = false) => {
  const bits = [...hex(id).slice(0, long ? 32 : 9)].map((c) => parseInt(c, 16).toString(2).padStart(4, '0')).join('');
  const padded = bits.padEnd(Math.ceil(bits.length / 6) * 6, '0');
  return (long ? '.' : '') + padded.match(/.{6}/g).map((b) => B64[parseInt(b, 2)]).join('');
};

test('state: encode then decode with the cell restores the exact state (v3)', () => {
  const state = sampleState();
  const q = encodeState(state, tropical);
  assert.equal(q.get('v'), '3');
  assert.equal(q.get('c'), 'tropical');
  assert.equal(q.get('p'), state.kept.map((id) => token(id)).sort().join(''), 'kept plants with no member list: 6 characters each');
  assert.equal(q.get('x'), token(state.removed[0]));
  assert.doesNotMatch(q.toString(), /%/, 'nothing escaped');
  const { state: back, dropped } = decodeState(q.toString(), tropical);
  assert.deepEqual(dropped, []);
  assert.deepEqual({ ...back, kept: [...back.kept].sort() }, { ...state, noCountry: false, members: null, plants: [], crops: [], guests: [], kept: [...state.kept].sort() });
  const empty = decodeState('');
  assert.deepEqual(empty.state, { climate: null, country: null, noCountry: false, site: DEFAULT_SITE, kept: [], removed: [], members: null, plants: [], crops: [], guests: [] });
});

test('state: v3 members keep their order, kept members carry a star, and no list repeats them', () => {
  const ids = [named('Musa acuminata').id, named('Inga edulis').id, named('Arachis pintoi').id];
  const state = { ...sampleState(), kept: [ids[1]], removed: [named('Leucaena leucocephala').id], members: ids };
  const q = encodeState(state, tropical);
  assert.equal(q.get('a'), token(ids[0]) + '*' + token(ids[1]) + token(ids[2]));
  assert.equal(q.get('p'), null, 'every kept plant is a member: no separate kept list');
  const { state: back, dropped } = decodeState(q, tropical);
  assert.deepEqual(dropped, []);
  assert.deepEqual(back.members, ids);
  assert.deepEqual(back.kept, [ids[1]]);
  assert.deepEqual(evaluate(tropical, back.members, { site: back.site, kept: back.kept }).members.map((m) => m.taxon.id), ids);
  assert.equal(decodeState(encodeState(sampleState(), tropical), tropical).state.members, null, 'a state with no member list has none: the page suggests');
});

test('state: a link with 200 plants, 190 of them kept, and 2 main crops stays near 1.5 KB and comes back exactly', () => {
  const taxa = Array.from({ length: 200 }, (_, i) => ({ ...structuredClone(tropical.taxa[i % tropical.taxa.length]), id: crypto.randomUUID(), canonical_name: `Plant ${i}` }));
  const cell = { ...tropical, taxa };
  const ids = taxa.map((t) => t.id);
  const state = { climate: 'temperate', country: 'FR', site: { light: 'sun', soil: 'unsure', water: 'unsure', room: 'field' }, kept: ids.slice(0, 190), removed: [], members: ids, crops: taxa.filter((t) => t.role === 'crop').slice(0, 2).map((t) => t.id) };
  const q = encodeState(state, cell);
  const link = `https://projectcanopi.com/fr/consortium/?${q}`;
  assert.ok(link.length <= 1520, `${link.length} characters`);
  const back = decodeState(q.toString(), cell);
  assert.deepEqual(back.dropped, []);
  assert.deepEqual(back.state.members, ids);
  assert.deepEqual([...back.state.kept].sort(), [...state.kept].sort());
  assert.deepEqual(back.state.crops, state.crops);
});

test('state: a v3 link survives a data update: new plants, a new order and a plant gone; the lost one is reported', () => {
  const ids = tropical.taxa.slice(0, 6).map((t) => t.id);
  const q = encodeState({ ...sampleState(), kept: [ids[0]], removed: [], members: ids }, tropical);
  const later = { ...tropical, taxa: [...tropical.taxa.filter((t) => t.id !== ids[3]).reverse(), make({ id: 'aaaaaaaa-0000-4000-8000-000000000000' }), make({ id: 'bbbbbbbb-0000-4000-8000-000000000000' })] };
  const { state, dropped } = decodeState(q, later);
  assert.deepEqual(state.members, ids.filter((id) => id !== ids[3]));
  assert.deepEqual(state.kept, [ids[0]]);
  assert.deepEqual(dropped, [{ key: 'a', value: hex(ids[3]).slice(0, 9), reason: 'unknown' }], 'reported as the 9 hex digits it stands for');
});

test('state: two ids that share 36 bits are written whole, and a short token that matches both is dropped as ambiguous', () => {
  const a = make({ id: 'abcdef01-2111-4000-8000-000000000001' }), b = make({ id: 'abcdef01-2222-4000-8000-000000000002' });
  assert.equal(hex(a.id).slice(0, 9), hex(b.id).slice(0, 9), 'the two share 36 bits');
  const cell = cellOf([a, b, ...tropical.taxa]);
  const q = encodeState({ ...sampleState(), kept: [a.id], removed: [b.id] }, cell);
  assert.equal(q.get('p'), token(a.id, true));
  assert.equal(q.get('x'), token(b.id, true));
  const back = decodeState(q, cell);
  assert.deepEqual([back.state.kept, back.state.removed], [[a.id], [b.id]]);
  assert.deepEqual(decodeState(`v=3&p=${token(a.id)}`, cell).dropped, [{ key: 'p', value: 'abcdef012', reason: 'ambiguous' }]);
});

test('state: v2 links still open: dotted 8-hex prefixes, longer prefixes, members and kept lists', () => {
  const inga = named('Inga edulis').id, musa = named('Musa acuminata').id, arachis = named('Arachis pintoi').id;
  const link = `v=2&c=tropical&k=BR&l=part&s=acid&w=wet&m=small&p=${inga.slice(0, 8)}.${musa.slice(0, 13)}&x=${named('Leucaena leucocephala').id.slice(0, 8)}&a=${musa.slice(0, 8)}.${inga}.${arachis.slice(0, 8)}`;
  const { state, dropped } = decodeState(link, tropical);
  assert.deepEqual(dropped, []);
  assert.deepEqual(state.members, [musa, inga, arachis]);
  assert.deepEqual([...state.kept].sort(), [inga, musa].sort());
  assert.deepEqual(state.removed, [named('Leucaena leucocephala').id]);
  assert.deepEqual([state.crops, state.guests], [[], []]);
  assert.equal(decodeState(link).version, 2, 'the page writes a pending v2 link back as it came');
  assert.equal(decodeState(encodeState(state, tropical)).version, 3);
});

test('state: an old link with a region (r) and a borrowed cell (b) still opens; both are ignored without a notice', () => {
  const olive = mediterranean.taxa[0].id;
  const { state, dropped } = decodeState(`v=2&c=mediterranean&r=southern_america&b=europe&l=sun&s=acid&w=dry&m=large&p=${olive.slice(0, 8)}`, mediterranean);
  assert.deepEqual(dropped, []);
  assert.equal(state.climate, 'mediterranean');
  assert.deepEqual(state.kept, [olive]);
  assert.ok(!('region' in state) && !('cellRegion' in state));
  assert.deepEqual(decodeState('r=mars&b=venus&r=x').dropped, [], 'not even a bad one');
  const q = encodeState(state, mediterranean);
  assert.equal(q.get('r'), null);
  assert.equal(q.get('b'), null);
});

test('state: a country is written only when the state has one; k=- is "No country", chosen', () => {
  const state = { ...sampleState(), country: null };
  assert.equal(encodeState(state).get('k'), null, 'no country, no k');
  assert.equal(encodeState({ ...state, noCountry: true }).get('k'), '-');
  assert.equal(encodeState({ ...state, country: 'br', noCountry: true }).get('k'), 'BR', 'a country wins');
  const none = decodeState('c=tropical&k=-');
  assert.equal(none.state.country, null);
  assert.equal(none.state.noCountry, true);
  assert.deepEqual(none.dropped, []);
  assert.equal(decodeState('k=BR').state.noCountry, false);
  // A code of the right shape passes here; the page checks it against the manifest (countryUnknown).
  assert.equal(decodeState('k=ZZ').state.country, 'ZZ');
});

test('state: a consortium with every member removed stays empty after a reload, it is not refilled', () => {
  const state = { ...sampleState(), kept: [], removed: [named('Musa acuminata').id], members: [] };
  const q = encodeState(state, tropical);
  assert.equal(q.get('a'), '');
  assert.deepEqual(decodeState(q, tropical).state.members, []);
});

test('state: a guide preset plant not yet resolved survives an encode, so a reload or a copied link keeps it', () => {
  const { state } = decodeState('plant=Musa%20acuminata&climate=tropical');
  assert.deepEqual(state.plants, ['Musa acuminata']);
  const again = decodeState(encodeState(state));
  assert.deepEqual(again.state.plants, ['Musa acuminata']);
  assert.equal(again.state.climate, 'tropical');
});

test('state: without the cell, decode keeps 9-hex prefixes for resolveIds(), and writes them back unchanged', () => {
  const q = encodeState(sampleState());
  const decoded = decodeState(q);
  assert.deepEqual([...decoded.state.kept].sort(), sampleState().kept.map((id) => hex(id).slice(0, 9)).sort());
  const { ids, dropped } = resolveIds(decoded.state.kept, tropical);
  assert.deepEqual(ids.sort(), [...sampleState().kept].sort());
  assert.deepEqual(dropped, []);
  assert.equal(encodeState(decoded.state).toString(), q.toString(), 'a pending link is written back as it came');
  const whole = `v=3&c=tropical&l=sun&s=unsure&w=unsure&m=large&a=${token(sampleState().kept[0], true)}*${token(sampleState().kept[1])}`;
  assert.equal(encodeState(decodeState(whole).state).toString(), whole, 'a whole token too');
  assert.equal(decodeState(`p=${sampleState().kept[0]}`, tropical).state.kept[0], sampleState().kept[0], 'a full uuid is a v2 prefix too');
});

test('state: unknown and malformed values are dropped and reported, never thrown', () => {
  const { state, dropped } = decodeState('v=9&c=polar&r=mars&k=France&l=dim&s=clay&w=soggy&m=huge&p=xyz.deadbeef.d9242605&x=1234', tropical);
  assert.deepEqual(state, { climate: null, country: null, noCountry: false, site: DEFAULT_SITE, kept: [named('Arachis pintoi').id], removed: [], members: null, plants: [], crops: [], guests: [] });
  assert.deepEqual(dropped.map((d) => `${d.key}=${d.value}:${d.reason}`).sort(), [
    'c=polar:unknown', 'k=France:unknown', 'l=dim:unknown', 'm=huge:unknown', 'p=deadbeef:unknown', 'p=xyz:malformed',
    's=clay:unknown', 'v=9:unknown', 'w=soggy:unknown', 'x=1234:malformed',
  ]);
  for (const g of ['%', 'c=%ZZ', 'p=..,,', '&&&=', `p=${'a'.repeat(5000)}`, 'c=tropical&c=arid', '?', 'v=3&a=***', 'v=3&a=.ab', 'v=3&a=AB$cd!', 'v=3&g=zz', 'v=3&g=meABC', `v=3&a=${'A'.repeat(50000)}`]) assert.doesNotThrow(() => decodeState(g, tropical), g);
  assert.deepEqual(decodeState('v=3&a=ABCDEF$$').dropped.map((d) => [d.key, d.reason]), [['a', 'malformed']]);
  assert.deepEqual(decodeState('v=3&g=zzABCDEF').dropped, [{ key: 'g', value: 'zzABCDEF', reason: 'unknown' }]);
  assert.deepEqual(decodeState('c=tropical&c=arid').dropped, [{ key: 'c', value: 'arid', reason: 'duplicate' }]);
  assert.equal(decodeState('c=Tropical&k=br').state.country, 'BR');
});

test('state: kept wins over removed once prefixes of different lengths are resolved, with or without the cell at decode', () => {
  const inga = named('Inga edulis').id;
  const link = `p=${inga.slice(0, 8)}&x=${inga}`;
  const later = resolveState(decodeState(link), tropical);
  assert.deepEqual([later.state.kept, later.state.removed], [[inga], []]);
  assert.deepEqual(later.dropped, [{ key: 'x', value: inga, reason: 'duplicate' }]);
  assert.deepEqual(resolveState(decodeState(link), tropical), decodeState(link, tropical), 'the same as decoding with the cell');
  const withMembers = resolveState(decodeState(`p=${inga}&x=${named('Musa acuminata').id}&a=${named('Musa acuminata').id.slice(0, 8)}`), tropical);
  assert.deepEqual(withMembers.state.members, [named('Musa acuminata').id, inga], 'a kept plant is a member; a member is not removed');
  assert.deepEqual(withMembers.state.removed, []);
});

test('state: the cap on ids is a stated limit, far above any list, and ids past it are reported with their count', () => {
  assert.ok(MAX_LINK_IDS >= 1000, 'lists will grow past 200 plants');
  const many = Array.from({ length: 30000 }, (_, n) => n.toString(16).padStart(8, '0'));
  const link = `p=${[named('Inga edulis').id.slice(0, 8), ...many].join('.')}&x=${many.join('.')}`;
  const start = performance.now();
  const { state, dropped } = decodeState(link, tropical);
  const ms = performance.now() - start;
  assert.ok(ms < 1000, `${ms.toFixed(0)} ms (quadratic dedupe took about 12 s)`);
  assert.deepEqual(state.kept, [named('Inga edulis').id]);
  assert.deepEqual(dropped.filter((d) => d.reason === 'excess'), [
    { key: 'p', value: String(30001 - MAX_LINK_IDS), reason: 'excess' },
    { key: 'x', value: String(30000 - MAX_LINK_IDS), reason: 'excess' },
  ]);
  const v3 = decodeState(`v=3&a=${'*AAAAAA'.repeat(MAX_LINK_IDS + 5)}`);
  assert.deepEqual(v3.dropped.filter((d) => d.reason === 'excess'), [{ key: 'a', value: '5', reason: 'excess' }]);
});

test('state: a guide preset (?plant=<canonical_name>&climate=<id>) keeps its plant; one not in the cell is dropped', () => {
  const inga = named('Inga edulis').id;
  const preset = decodeState('plant=Inga+edulis&climate=tropical', tropical);
  assert.equal(preset.state.climate, 'tropical');
  assert.deepEqual(preset.state.kept, [inga]);
  assert.deepEqual(preset.dropped, []);
  const early = decodeState('plant=inga%20%20EDULIS&climate=Tropical');
  assert.deepEqual(early.state.plants, ['inga  EDULIS'], 'kept by name until the cell is loaded');
  assert.deepEqual(resolveState(early, tropical).state.kept, [inga], 'case and spacing do not matter');
  assert.deepEqual(resolveState(early, tropical).state.plants, []);
  assert.deepEqual(decodeState('plant=Olea+europaea&climate=tropical', tropical).dropped, [{ key: 'plant', value: 'Olea europaea', reason: 'unknown' }]);
  assert.deepEqual(decodeState('c=temperate&climate=tropical').state.climate, 'temperate');
  assert.deepEqual(decodeState('c=temperate&climate=tropical').dropped, [{ key: 'climate', value: 'tropical', reason: 'duplicate' }]);
  assert.deepEqual(decodeState(`plant=${'a'.repeat(300)}`).dropped[0].reason, 'malformed');
});

test('state: taxonByName is the one rule a guide preset is matched by, so the page names the same plant', () => {
  const inga = named('Inga edulis');
  assert.equal(taxonByName(tropical, 'Inga edulis'), inga);
  assert.equal(taxonByName(tropical, ' inga  EDULIS '), inga, 'case and spacing do not matter');
  assert.equal(taxonByName(tropical, 'Olea europaea'), null);
  for (const name of ['Inga edulis', 'inga  EDULIS', 'Olea europaea']) {
    const r = resolveState(decodeState(`plant=${encodeURIComponent(name)}&climate=tropical`), tropical);
    const hit = taxonByName(tropical, name);
    assert.equal(r.state.kept.includes(hit?.id), !!hit, name);
    assert.equal(r.dropped.some((d) => d.key === 'plant'), !hit, name);
  }
});

// main crops and plants from another climate's list

test('state: main crops are kept members, at most three, and only food plants of the climate', () => {
  const apple = named('Malus domestica').id, hazel = named('Corylus avellana').id, chives = named('Allium schoenoprasum').id, currant = named('Ribes nigrum').id, clover = named('Trifolium repens').id;
  const q = encodeState({ climate: 'temperate', country: null, site: DEFAULT_SITE, kept: [], removed: [], members: [apple, clover], crops: [apple, hazel] }, temperate);
  assert.equal(q.get('n'), token(apple) + token(hazel));
  const back = decodeState(q, temperate);
  assert.deepEqual(back.state.crops, [apple, hazel]);
  assert.deepEqual(back.state.members, [apple, clover, hazel], 'a main crop is a member');
  assert.ok(back.state.kept.includes(apple) && back.state.kept.includes(hazel), 'and kept');
  const four = decodeState(`v=3&c=temperate&n=${[apple, hazel, chives, currant].map((id) => token(id)).join('')}`, temperate);
  assert.deepEqual(four.state.crops, [apple, hazel, chives]);
  assert.deepEqual(four.dropped, [{ key: 'n', value: '1', reason: 'excess' }]);
  const support = decodeState(`v=3&c=temperate&n=${token(clover)}`, temperate);
  assert.deepEqual(support.state.crops, [], 'a support plant is never a main crop');
  assert.deepEqual(support.state.kept, [clover], 'but stays kept');
  assert.equal(MAX_CROPS, 3);
});

test('state: a plant added from another climate\'s list carries that list in the link and comes back as a guest', () => {
  const apple = named('Malus domestica').id, fig = named('Ficus carica'), olive = named('Olea europaea');
  const state = { climate: 'temperate', country: null, site: DEFAULT_SITE, kept: [fig.id, olive.id], removed: [], members: [apple, fig.id, olive.id], guests: [{ id: fig.id, climate: 'mediterranean' }, { id: olive.id, climate: 'mediterranean' }] };
  const q = encodeState(state, temperate, { mediterranean });
  assert.equal(q.get('g'), 'me' + [fig.id, olive.id].map((id) => token(id)).sort().join(''));
  const early = decodeState(q.toString());
  assert.deepEqual(early.state.guests.map((g) => g.climate), ['mediterranean', 'mediterranean'], 'the page knows which files to fetch first');
  const back = resolveState(early, temperate, { mediterranean });
  assert.deepEqual(back.dropped, []);
  assert.deepEqual(back.state.members, [apple, fig.id, olive.id]);
  assert.deepEqual([...back.state.guests].sort((x, y) => (x.id < y.id ? -1 : 1)), [{ id: fig.id, climate: 'mediterranean' }, { id: olive.id, climate: 'mediterranean' }].sort((x, y) => (x.id < y.id ? -1 : 1)));
  const without = resolveState(decodeState(q.toString()), temperate);
  assert.deepEqual(without.state.members, [apple], 'a guest whose list is not at hand is left out');
  assert.equal(without.dropped.filter((d) => d.key === 'g').length, 2);
  const moved = { ...temperate, taxa: [...temperate.taxa, fig] };
  const now = resolveState(decodeState(q.toString()), moved, { mediterranean });
  assert.deepEqual(now.state.guests, [{ id: olive.id, climate: 'mediterranean' }], 'a guest that joined this climate\'s list is an ordinary member');
  assert.deepEqual(now.state.members, [apple, fig.id, olive.id]);
});

test('guests: kept guests stay members and count for coverage; suggest, fill and Swap never offer a guest', () => {
  const fig = named('Ficus carica'), olive = named('Olea europaea');
  const site = { ...open, room: 'field' };
  const s = suggest(temperate, { site, kept: [fig.id], guests: [fig, olive] });
  assert.equal(s.members[0].taxon.id, fig.id, 'the kept guest is a member');
  assert.ok(!s.members.some((m) => m.taxon.id === olive.id), 'a guest is never picked');
  const ids = s.members.map((m) => m.taxon.id);
  assert.deepEqual(evaluate(temperate, ids, { site, kept: [fig.id], guests: [fig] }).members.map((m) => m.taxon.id), ids);
  assert.ok(flagsFor(temperate, fig.id, ids, { site, guests: [fig] }));
  for (const id of ids) assert.ok(!alternatives(id, ids, temperate, { site, guests: [fig, olive] }).some((a) => a.taxon.id === fig.id || a.taxon.id === olive.id), id);
  assert.ok(alternatives(fig.id, ids, temperate, { site, guests: [fig] }).length > 0, 'a guest can be swapped for a plant of this climate');
});

// performance

test('suggest and every alternative for a 200-taxon cell take under 50 ms', () => {
  const taxa = Array.from({ length: 200 }, (_, i) => {
    const t = structuredClone(allTaxa[i % allTaxa.length]);
    return { ...t, id: idOf(100000 + i), canonical_name: `${t.canonical_name} ${String(i).padStart(3, '0')}` };
  });
  const cell = { ...tropical, taxa, interactions: [...tropical.interactions, ...temperate.interactions] };
  const site = { light: 'sun', soil: 'neutral', water: 'average', room: 'field' };
  const run = () => {
    const s = suggest(cell, { site, country: 'BR', countryChecked: true, kept: [taxa[3].id] });
    const ids = s.members.map((m) => m.taxon.id);
    for (const id of ids) alternatives(id, ids, cell, { site, country: 'BR', countryChecked: true });
    return s;
  };
  // The page recomputes on every change: time a warm run, the best of three so a busy machine does not fail it.
  run();
  let ms = Infinity, s;
  for (let k = 0; k < 3; k++) {
    const start = performance.now();
    s = run();
    ms = Math.min(ms, performance.now() - start);
  }
  assert.ok(s.members.length >= 3);
  assert.ok(ms < 50, `${ms.toFixed(1)} ms`);
});
