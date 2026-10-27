// The consortium tool's data core (src/lib/consortium/), through its public functions, on the
// invented format 2 fixture (scripts/fixtures/consortium/) and on small cells built from it. The
// scoring contract is the plan's "Scoring module" (knowledge/project/consortium-tool-plan.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const core = await import('../src/lib/consortium/index.ts');
const { cellFor, regionsOf, fits, jobsOf, jobs, bandOf, bandsOf, phases, conflicts, invasiveIn, invasiveCountries } = core;
const { gain, suggest, evaluate, alternatives, SIZE_LIMIT, DEFAULT_SITE, encodeState, decodeState, resolveState, resolveIds, shortId, MAX_LINK_IDS } = core;

const read = (name) => JSON.parse(readFileSync(new URL(`fixtures/consortium/${name}`, import.meta.url), 'utf8'));
const manifest = read('manifest.json');
const tropical = read('tropical-southern-america.json');
const mediterranean = read('mediterranean-europe.json');
const temperate = read('temperate-europe.json');
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

// cellFor and regionsOf

test('cellFor maps the site climate ids (lowercase) to the export climate zones', () => {
  assert.equal(cellFor(manifest, 'tropical', 'southern_america')?.file, 'tropical-southern-america.json');
  assert.equal(cellFor(manifest, 'mediterranean', 'europe')?.file, 'mediterranean-europe.json');
  assert.equal(cellFor(manifest, 'temperate', 'europe')?.taxa, 12);
  assert.equal(cellFor(manifest, 'Temperate', 'europe')?.file, 'temperate-europe.json', 'either case is read');
});

test('cellFor answers null for a cell not covered yet or an unknown id', () => {
  assert.equal(cellFor(manifest, 'temperate', 'africa'), null);
  assert.equal(cellFor(manifest, 'boreal', 'europe'), null);
  assert.equal(cellFor(manifest, 'polar', 'europe'), null);
  assert.equal(cellFor(manifest, 'tropical', 'Southern_America'), null, 'region ids are exact');
});

test('regionsOf gives every region of a country, the default first, and [] for absent codes', () => {
  assert.deepEqual(regionsOf(manifest, 'ES'), ['europe', 'africa']);
  assert.deepEqual(regionsOf(manifest, 'es'), ['europe', 'africa']);
  assert.deepEqual(regionsOf(manifest, 'FR'), ['europe']);
  assert.deepEqual(regionsOf(manifest, 'TR'), ['asia_temperate', 'europe']);
  assert.deepEqual(regionsOf(manifest, 'BR'), ['southern_america']);
  for (const code of ['AQ', 'BV', 'FK', 'GS', 'HM', 'TF', 'ZZ']) assert.deepEqual(regionsOf(manifest, code), [], code);
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
  const leucaena = named('Leucaena leucocephala'), cassava = named('Manihot esculenta'), lemongrass = named('Cymbopogon citratus');
  assert.equal(invasiveIn(leucaena, 'BR'), true);
  assert.equal(invasiveIn(leucaena, 'br'), true);
  assert.equal(invasiveIn(leucaena, 'FR'), false);
  assert.equal(invasiveIn(lemongrass, 'BR'), false, '[] is checked, none');
  assert.equal(invasiveIn(cassava, 'BR'), null, 'null is not checked');
  assert.equal(invasiveIn(leucaena, null), null);
  assert.equal(invasiveCountries(leucaena).length, 10);
  assert.deepEqual(invasiveCountries(lemongrass), []);
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
      const once = suggest(cell, { site, country: 'BR' });
      const shuffled = { ...cell, taxa: [...cell.taxa].reverse(), interactions: [...cell.interactions].reverse() };
      assert.deepEqual(names(suggest(cell, { site, country: 'BR' }).members), names(once.members));
      assert.deepEqual(names(suggest(shuffled, { site, country: 'BR' }).members), names(once.members));
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

test('suggest leaves out plants invasive in the user country; null (not checked) is not a reason', () => {
  const invasive = make({ functions: fn('mulch'), warnings: { invasive_in: [{ country: 'BR', sources: ['griis'] }] } });
  const unchecked = make({ functions: fn('ground_cover'), warnings: { invasive_in: null } });
  const cell = cellOf([invasive, unchecked]);
  assert.deepEqual(names(suggest(cell, { site: open, country: 'BR' }).members), [unchecked.canonical_name]);
  assert.deepEqual(names(suggest(cell, { site: open, country: 'FR' }).members), [invasive.canonical_name, unchecked.canonical_name]);
  assert.equal(suggest(cell, { site: open }).members.length, 2, 'no country, no filter');
  const kept = suggest(cell, { site: open, country: 'BR', kept: [invasive.id] }).members;
  assert.equal(kept.find((m) => m.taxon.id === invasive.id).flags.invasive, true);
  assert.equal(kept.find((m) => m.taxon.id === unchecked.id).flags.invasive, null);
  // On the fixture: leucaena, recorded invasive in Brazil, is never suggested there.
  for (const room of ['small', 'large', 'field'])
    assert.ok(!names(suggest(tropical, { site: { ...open, room }, country: 'BR', kept: [named('Inga edulis').id] }).members).includes('Leucaena leucocephala'));
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
  const e = evaluate(tropical, [tithonia.id, potato.id, leucaena.id, inga.id, inga.id, 'ffffffff-0000-4000-8000-000000000000'], { site: { ...open, water: 'dry' }, country: 'BR' });
  assert.deepEqual(names(e.members), ['Tithonia diversifolia', 'Ipomoea batatas', 'Leucaena leucocephala', 'Inga edulis'], 'in the given order');
  const by = (name) => e.members.find((m) => m.taxon.canonical_name === name).flags;
  assert.equal(by('Leucaena leucocephala').invasive, true);
  assert.equal(by('Tithonia diversifolia').conflicts[0].b.canonical_name, 'Ipomoea batatas');
  assert.deepEqual(by('Inga edulis').misfits, ['water']);
  assert.ok(e.members.every((m) => m.kept === false));
});

// alternatives

test('alternatives: same stratum first, then shared jobs, then gain, then name; members and removed left out', () => {
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
  assert.deepEqual(alts.map((a) => a.taxon.canonical_name), ['Z same two', 'A same one', 'B same one less', 'C same one less', 'F flagged', 'D elsewhere']);
  assert.deepEqual(alts.map((a) => a.sameStratum), [true, true, true, true, true, false]);
  assert.deepEqual(alts[0].sharedJobs, ['mulch', 'shelter']);
  assert.ok(alts[1].gain > alts[2].gain);
  assert.deepEqual(alts[4].flags.misfits, ['light']);
  assert.equal(alts[4].flags.flagged, true);
  assert.deepEqual(alternatives('ffffffff-0000-4000-8000-000000000000', [], cell, { site: open }), []);
});

test('alternatives on the fixture: flagged plants are listed with their warnings', () => {
  const inga = named('Inga edulis'), potato = named('Ipomoea batatas');
  const alts = alternatives(inga.id, [inga.id, potato.id], tropical, { site: open, country: 'BR' });
  const leucaena = alts.find((a) => a.taxon.canonical_name === 'Leucaena leucocephala');
  assert.equal(leucaena.flags.invasive, true);
  assert.equal(leucaena.flags.flagged, true);
  const tithonia = alts.find((a) => a.taxon.canonical_name === 'Tithonia diversifolia');
  assert.equal(tithonia.flags.conflicts[0].b.canonical_name, 'Ipomoea batatas');
  assert.ok(!alts.some((a) => a.taxon.id === inga.id || a.taxon.id === potato.id));
  const firstOther = alts.findIndex((a) => !a.sameStratum);
  assert.ok(firstOther > 0 && alts.slice(firstOther).every((a) => !a.sameStratum), 'same stratum first');
});

// state

const sampleState = () => ({
  climate: 'tropical', region: 'southern_america', country: 'BR',
  site: { light: 'part', soil: 'acid', water: 'wet', room: 'small' },
  kept: [named('Inga edulis').id, named('Musa acuminata').id],
  removed: [named('Leucaena leucocephala').id],
});

test('state: encode then decode with the cell restores the exact state', () => {
  const state = sampleState();
  const q = encodeState(state, tropical);
  assert.equal(q.get('v'), '2');
  assert.equal(q.get('c'), 'tropical');
  assert.equal(q.get('p'), [named('Inga edulis').id.slice(0, 8), named('Musa acuminata').id.slice(0, 8)].sort().join('.'));
  assert.doesNotMatch(q.toString(), /%/, 'nothing escaped');
  const { state: back, dropped } = decodeState(q.toString(), tropical);
  assert.deepEqual(dropped, []);
  assert.deepEqual({ ...back, kept: [...back.kept].sort() }, { ...state, cellRegion: null, members: null, plants: [], kept: [...state.kept].sort() });
  const empty = decodeState('');
  assert.deepEqual(empty, { state: { climate: null, region: null, cellRegion: null, country: null, site: DEFAULT_SITE, kept: [], removed: [], members: null, plants: [] }, dropped: [] });
});

test('state: a link from another region keeps both regions, the user region and the region of the cell shown', () => {
  const olive = mediterranean.taxa[0].id;
  const state = { ...sampleState(), climate: 'mediterranean', region: 'southern_america', cellRegion: 'europe', country: null, kept: [olive], removed: [] };
  const q = encodeState(state, mediterranean);
  assert.equal(q.get('r'), 'southern_america');
  assert.equal(q.get('b'), 'europe');
  const { state: back, dropped } = decodeState(q.toString(), mediterranean);
  assert.deepEqual(dropped, []);
  assert.equal(back.region, 'southern_america');
  assert.equal(back.cellRegion, 'europe');
  assert.deepEqual(back.kept, [olive]);
  assert.equal(encodeState({ ...state, cellRegion: 'southern_america' }).get('b'), null, 'written only when it differs');
  assert.equal(decodeState('r=europe&b=europe').state.cellRegion, null);
  assert.equal(decodeState('r=europe').state.cellRegion, null, 'an old link has none');
  assert.deepEqual(decodeState('b=mars').dropped, [{ key: 'b', value: 'mars', reason: 'unknown' }]);
});

test('state: a link carries the members in order, so the page restores them without refilling', () => {
  const ids = [named('Musa acuminata').id, named('Inga edulis').id, named('Arachis pintoi').id];
  const state = { ...sampleState(), kept: [ids[1]], removed: [named('Leucaena leucocephala').id], members: ids };
  const q = encodeState(state, tropical);
  assert.equal(q.get('a'), ids.map((id) => id.slice(0, 8)).join('.'), 'in member order');
  const { state: back, dropped } = decodeState(q, tropical);
  assert.deepEqual(dropped, []);
  assert.deepEqual(back.members, ids);
  assert.deepEqual(evaluate(tropical, back.members, { site: back.site, kept: back.kept }).members.map((m) => m.taxon.id), ids);
  assert.equal(decodeState(encodeState(sampleState(), tropical), tropical).state.members, null, 'an old link has none: the page suggests');
});

test('state: without the cell, decode keeps the prefixes for resolveIds()', () => {
  const q = encodeState(sampleState());
  const { state } = decodeState(q);
  assert.deepEqual(state.kept.sort(), sampleState().kept.map((id) => id.slice(0, 8)).sort());
  const { ids, dropped } = resolveIds(state.kept, tropical);
  assert.deepEqual(ids.sort(), [...sampleState().kept].sort());
  assert.deepEqual(dropped, []);
  assert.equal(decodeState(`p=${sampleState().kept[0]}`, tropical).state.kept[0], sampleState().kept[0], 'a full uuid is a prefix too');
});

test('state: unknown and malformed values are dropped and reported, never thrown', () => {
  const { state, dropped } = decodeState('v=9&c=polar&r=mars&k=France&l=dim&s=clay&w=soggy&m=huge&p=xyz.deadbeef.d9242605&x=1234', tropical);
  assert.deepEqual(state, { climate: null, region: null, cellRegion: null, country: null, site: DEFAULT_SITE, kept: [named('Arachis pintoi').id], removed: [], members: null, plants: [] });
  assert.deepEqual(dropped.map((d) => `${d.key}=${d.value}:${d.reason}`).sort(), [
    'c=polar:unknown', 'k=France:unknown', 'l=dim:unknown', 'm=huge:unknown', 'p=deadbeef:unknown', 'p=xyz:malformed',
    'r=mars:unknown', 's=clay:unknown', 'v=9:unknown', 'w=soggy:unknown', 'x=1234:malformed',
  ]);
  for (const g of ['%', 'c=%ZZ', 'p=..,,', '&&&=', `p=${'a'.repeat(5000)}`, 'c=tropical&c=arid', '?']) assert.doesNotThrow(() => decodeState(g, tropical), g);
  assert.deepEqual(decodeState('c=tropical&c=arid').dropped, [{ key: 'c', value: 'arid', reason: 'duplicate' }]);
  assert.equal(decodeState('c=Tropical&k=br').state.country, 'BR');
});

test('state: ids that share a prefix get a longer one, and an ambiguous prefix is dropped', () => {
  const a = make({ id: 'abcdef01-1111-4000-8000-000000000001' }), b = make({ id: 'abcdef01-2222-4000-8000-000000000002' });
  const cell = cellOf([a, b, ...tropical.taxa]);
  assert.equal(shortId(a.id, cell), 'abcdef01-1111');
  assert.equal(shortId(named('Inga edulis').id, cell), named('Inga edulis').id.slice(0, 8));
  const q = encodeState({ ...sampleState(), kept: [a.id], removed: [b.id] }, cell);
  const back = decodeState(q, cell);
  assert.deepEqual([back.state.kept, back.state.removed], [[a.id], [b.id]]);
  assert.deepEqual(decodeState('p=abcdef01', cell).dropped, [{ key: 'p', value: 'abcdef01', reason: 'ambiguous' }]);
  const conflict = decodeState(`p=${a.id}&x=${a.id}`, cell);
  assert.deepEqual([conflict.state.kept, conflict.state.removed], [[a.id], []], 'kept wins over removed');
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

test('state: a link with thousands of ids decodes fast; ids past the cap are dropped as one notice', () => {
  const many = Array.from({ length: 30000 }, (_, n) => n.toString(16).padStart(8, '0'));
  const link = `p=${[named('Inga edulis').id.slice(0, 8), ...many].join('.')}&x=${many.join('.')}`;
  const start = performance.now();
  const { state, dropped } = decodeState(link, tropical);
  const ms = performance.now() - start;
  assert.ok(ms < 200, `${ms.toFixed(0)} ms`);
  assert.deepEqual(state.kept, [named('Inga edulis').id]);
  assert.deepEqual(dropped.filter((d) => d.reason === 'excess'), [
    { key: 'p', value: String(30001 - MAX_LINK_IDS), reason: 'excess' },
    { key: 'x', value: String(30000 - MAX_LINK_IDS), reason: 'excess' },
  ]);
  assert.ok(MAX_LINK_IDS >= 200, 'a whole cell still fits');
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

// performance

test('suggest and every alternative for a 200-taxon cell take under 50 ms', () => {
  const taxa = Array.from({ length: 200 }, (_, i) => {
    const t = structuredClone(allTaxa[i % allTaxa.length]);
    return { ...t, id: idOf(100000 + i), canonical_name: `${t.canonical_name} ${String(i).padStart(3, '0')}` };
  });
  const cell = { ...tropical, taxa, interactions: [...tropical.interactions, ...temperate.interactions] };
  const site = { light: 'sun', soil: 'neutral', water: 'average', room: 'field' };
  const run = () => {
    const s = suggest(cell, { site, country: 'BR', kept: [taxa[3].id] });
    const ids = s.members.map((m) => m.taxon.id);
    for (const id of ids) alternatives(id, ids, cell, { site, country: 'BR' });
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
