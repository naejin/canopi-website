// The consortium v2 core (src/lib/consortium/, stream S1 of P2): site fit, conflicts, jobs, the
// strata × phases matrix, the suggestion and Swap alternatives, and the #v=4 share state, through the
// core's public index. Plants come from two places: invented records made here for one rule at a
// time, and the invented fixture database (scripts/fixtures/consortium-v2/export/) read through the
// island's SQLite adapter, so the matrix is checked against the adapter's SQL cell counts.
// Design check (.local/consortium/v2/p2-design-check.md) §2, §4, A7, §8; coordinator rows "v2 mockup
// choices" and "v2 build setup" (2026-11-11).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const core = await import('../src/lib/consortium/index.ts');
const {
  fits, misfitsBeside, ROOM_LIMIT_M, UNSURE_SITE,
  conflicts, isSerious, invasiveIn, pairings, countryStatus,
  jobsOf, jobGapsByPhase, jobIds,
  buildMatrix, cellsOf, phaseOrd, plantsIn, startCell,
  suggest, SIZE_LIMIT, gain, flagsFor, flagsOf, asks, alternatives,
  encodeLink, decodeLink, linkClimates, readPreset, LINK_VERSION, MAX_LINK_IDS, LONG_LINK, tokenOf, isLongLink, MAX_CROPS,
  strata, phases,
} = core;

// ---- the fixture through the adapter ----
const fixtureDir = new URL('fixtures/consortium-v2/export/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', fixtureDir), 'utf8'));
const { openBytes } = await import('../src/islands/consortium/data/load.ts');
const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
const raw = new Uint8Array(gunzipSync(readFileSync(new URL(manifest.files[0].file, fixtureDir))));
const opened = await openBytes(raw, { releaseId: manifest.release_id, climates: manifest.climates.map((c) => c.climate_zone) });
const source = createSqliteSource(opened.db, { images: {} });
const temperate = await source.pool('Temperate');
const tropical = await source.pool('Tropical');
const mediterranean = await source.pool('Mediterranean');
const temperateInteractions = await source.interactions('Temperate');
const byName = (pool, name) => { const t = pool.find((x) => x.canonical_name === name); assert.ok(t, name); return t; };
const T = (name) => byName(temperate, name);
const ids = (list) => list.map((t) => t.id);

// ---- invented records ----
const idOf = (n) => `${n.toString(16).padStart(8, '0')}-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const nullTraits = Object.fromEntries(Object.keys(T('Castanea sativa').traits).map((k) => [k, null]));
let next = 1;
function make({ name, stratum = 'medium', start = 0, end = 6, role = 'support', functions = null, traits = {}, warnings = {}, names = { en: name }, genus, family = null, id } = {}) {
  const n = next++;
  const canonical = name ?? `Plantus ${n}`;
  return {
    id: id ?? idOf(n),
    canonical_name: canonical,
    genus: genus ?? canonical.split(' ')[0],
    family,
    names,
    image: null,
    role,
    stratum: stratum ? { value: stratum, sources: ['s'] } : null,
    phases: stratum ? { start: phases[start], end: phases[end], sources: ['s'] } : null,
    functions: functions && functions.map((f) => ({ function: f, method: 'curated', sources: ['s'] })),
    traits: { ...nullTraits, ...traits },
    warnings: { toxicity: null, invasive_in: [], allelopathic: null, weed_potential: null, ...warnings },
  };
}
const site = (over = {}) => ({ ...UNSURE_SITE, ...over });
const ctx = (over = {}) => ({ site: site(), interactions: [], country: null, countryStatus: 'none', ...over });

// ================= site =================

test('site: every answer "unsure" checks nothing, so even a plant with no traits fits silently only then', () => {
  assert.deepEqual(UNSURE_SITE, { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' });
  const bare = make();
  assert.deepEqual(fits(bare, UNSURE_SITE), { verdict: 'fit', misfits: [], unknowns: [], reasons: [] });
  // An answer given makes the same plant unknown, never a fit.
  const f = fits(bare, site({ light: 'sun', room: 'small' }));
  assert.equal(f.verdict, 'unknown');
  assert.deepEqual(f.unknowns, ['light', 'room']);
});

test('site: light, soil and water are three-valued as in v1', () => {
  const p = make({ traits: { sun: true, semi_shade: false, full_shade: null } });
  assert.equal(fits(p, site({ light: 'sun' })).verdict, 'fit');
  assert.deepEqual(fits(p, site({ light: 'part' })).misfits, ['light']);
  assert.deepEqual(fits(p, site({ light: 'shade' })).unknowns, ['light']);
  const acid = make({ traits: { soil_ph: { min: 4.5, max: 6.5 } } });
  assert.equal(fits(acid, site({ soil: 'acid' })).verdict, 'fit');
  assert.deepEqual(fits(acid, site({ soil: 'chalky' })).misfits, ['soil']);
  assert.equal(fits(acid, site({ soil: 'neutral' })).verdict, 'fit');
  assert.deepEqual(fits(make({ traits: { soil_ph: { min: null, max: 5 } } }), site({ soil: 'neutral' })).misfits, ['soil']);
  assert.deepEqual(fits(make({ traits: { soil_ph: { min: 6, max: null } } }), site({ soil: 'neutral' })).unknowns, ['soil']);
  // One known bound can decide a fit: a plant whose pH tops out below 6 takes acid soil, one whose
  // pH starts above 7.5 takes chalky soil, whatever the other bound.
  assert.equal(fits(make({ traits: { soil_ph: { min: null, max: 5.5 } } }), site({ soil: 'acid' })).verdict, 'fit');
  assert.equal(fits(make({ traits: { soil_ph: { min: 8, max: null } } }), site({ soil: 'chalky' })).verdict, 'fit');
  assert.deepEqual(fits(make({ traits: { soil_ph: { min: null, max: 7 } } }), site({ soil: 'acid' })).unknowns, ['soil']);
  const thirsty = make({ traits: { drought_tolerance: 'Low', moisture_use: 'High' } });
  assert.deepEqual(fits(thirsty, site({ water: 'dry' })).misfits, ['water']);
  assert.equal(fits(thirsty, site({ water: 'wet' })).verdict, 'fit');
  const thyme = make({ traits: { well_drained: true, drought_tolerance: null, moisture_use: 'Low' } });
  assert.deepEqual(fits(thyme, site({ water: 'wet' })).misfits, ['water']);
  assert.deepEqual(fits(make(), site({ water: 'dry' })).unknowns, ['water']);
  assert.equal(fits(make(), site({ water: 'average' })).verdict, 'fit');
  const r = fits(p, site({ light: 'part' })).reasons.find((x) => x.key === 'light');
  assert.deepEqual(r, { key: 'light', verdict: 'misfit', trait: 'semi_shade' });
});

test('site: room uses the wild maximum height only ("can grow over N m in the wild"); an unknown height or a climber is said, never a silent fit', () => {
  assert.deepEqual(ROOM_LIMIT_M, { small: 6, large: 12, field: Infinity, unsure: Infinity });
  const oak = make({ traits: { height_m: { min: 25, max: 40 }, width_max_m: 25 } });
  const small = fits(oak, site({ room: 'small' }));
  assert.deepEqual(small.misfits, ['room']);
  assert.deepEqual(small.reasons, [{ key: 'room', verdict: 'misfit', kind: 'wild_height', meters: 40, limit: 6 }]);
  // Height only (the room question asks how tall; mockup app.js:213): a wide, short plant fits.
  const wide = fits(make({ traits: { height_m: { min: 1, max: 3 }, width_max_m: 8 } }), site({ room: 'small' }));
  assert.deepEqual(wide.reasons, [{ key: 'room', verdict: 'fit', kind: 'fits', meters: 3, limit: 6 }]);
  // A climber's recorded size can be a runner length (coordinator row "Side view" 2026-10-28): unknown.
  const vine = fits(make({ traits: { habit: 'Climber', height_m: { min: 5, max: 20 } } }), site({ room: 'small' }));
  assert.deepEqual(vine.reasons, [{ key: 'room', verdict: 'unknown', kind: 'climber' }]);
  assert.equal(vine.verdict, 'unknown');
  const noHeight = fits(make({ traits: { width_max_m: 1 } }), site({ room: 'large' }));
  assert.equal(noHeight.verdict, 'unknown');
  assert.deepEqual(noHeight.reasons, [{ key: 'room', verdict: 'unknown', kind: 'height_not_recorded' }]);
  const ok = fits(make({ traits: { height_m: { min: 2, max: 5 }, width_max_m: 3 } }), site({ room: 'small' }));
  assert.deepEqual(ok.reasons, [{ key: 'room', verdict: 'fit', kind: 'fits', meters: 5, limit: 6 }]);
  // A field takes any size; Room "unsure" checks nothing (heights are shown instead).
  assert.equal(fits(oak, site({ room: 'field' })).verdict, 'fit');
  assert.equal(fits(oak, site({ room: 'unsure' })).verdict, 'fit');
  // The fixture's Phacelia has no height: "height not recorded" with a room set.
  assert.deepEqual(fits(T('Phacelia tanacetifolia'), site({ room: 'small' })).unknowns, ['room']);
});

test('site: a misfit beats an unknown; a lower layer is not a light misfit under a member above it in a shared phase on a sunny site', () => {
  const p = make({ stratum: 'low', start: 0, end: 2, traits: { sun: false, height_m: { min: 0.1, max: 0.2 } } });
  assert.equal(fits(p, site({ light: 'sun', water: 'dry' })).verdict, 'misfit');
  const sun = site({ light: 'sun' });
  assert.deepEqual(misfitsBeside(p, sun, []), ['light']);
  assert.deepEqual(misfitsBeside(p, sun, [make({ stratum: 'high', start: 2, end: 6 })]), [], 'shaded in placenta III');
  assert.deepEqual(misfitsBeside(p, sun, [make({ stratum: 'high', start: 3, end: 6 })]), ['light'], 'no shared phase: nothing above it while it grows');
  assert.deepEqual(misfitsBeside(p, sun, [make({ stratum: 'low', start: 0, end: 6 })]), ['light'], 'the same layer does not shade');
  const tall = make({ stratum: 'high', traits: { sun: false } });
  assert.deepEqual(misfitsBeside(tall, sun, [make({ stratum: 'emergent' })]), ['light'], 'only medium and low are shaded');
  assert.deepEqual(misfitsBeside(p, site({ light: 'part' }), []), [], 'part shade: sun false is no part-shade misfit by itself');
  // The matrix and the flags read the same rule.
  const m = buildMatrix('Temperate', [p], [make({ stratum: 'high', start: 3, end: 6 })], sun);
  assert.equal(m.rows[3].cells[0].empty, 'misfit');
  assert.equal(buildMatrix('Temperate', [p], [make({ stratum: 'high', start: 0, end: 0 })], sun).rows[3].cells[0].empty, null);
  assert.deepEqual(flagsOf([p, make({ stratum: 'high', start: 4, end: 6 })], ctx({ site: sun })).filter((f) => f.kind === 'misfit').map((f) => f.id), [p.id]);
  assert.deepEqual(flagsOf([p, make({ stratum: 'high', start: 1, end: 6 })], ctx({ site: sun })).filter((f) => f.kind === 'misfit'), []);
  // suggest: kept above it in a shared phase, it may join; with no shared phase it is never picked.
  const late = make({ stratum: 'high', start: 3, end: 6 }), early = make({ stratum: 'high', start: 0, end: 6 });
  assert.ok(!suggest([p, late], ctx({ site: sun, kept: [late.id] })).members.includes(p.id));
  assert.ok(suggest([p, early], ctx({ site: sun, kept: [early.id] })).members.includes(p.id));
});

// ================= conflicts =================

test('conflicts: ranks match, good news is never a conflict, and serious means high only (A7)', () => {
  const members = [T('Juglans regia'), T('Malus domestica'), T('Juniperus communis'), T('Pyrus communis'), T('Corylus avellana'), T('Castanea sativa'), T('Sambucus nigra'), T('Trifolium repens')];
  const found = conflicts(members, temperateInteractions);
  const pairs = found.map((c) => `${c.a.canonical_name} > ${c.b.canonical_name} ${c.severity}`).sort();
  assert.deepEqual(pairs, [
    'Corylus avellana > Castanea sativa medium',
    'Juglans regia > Malus domestica high',
    'Juniperus communis > Malus domestica high',
    'Juniperus communis > Pyrus communis high',
  ]);
  assert.equal(isSerious({ severity: 'high' }), true);
  assert.equal(isSerious({ severity: 'medium' }), false);
  assert.equal(isSerious({ severity: null }), false);
  const pairs2 = pairings(T('Malus domestica'), members, temperateInteractions);
  assert.deepEqual(pairs2.map((p) => p.other.canonical_name), ['Trifolium repens']);
  assert.ok(!temperateInteractions.some((i) => i.type === 'intercropped_yield_gain' && i.climate_zone === 'Tropical'));
});

test('conflicts: countryStatus keeps "no country" apart from "not checked"', () => {
  const countries = new Map([['FR', { invasiveChecked: true }], ['TW', { invasiveChecked: false }]]);
  assert.equal(countryStatus(null, countries), 'none');
  assert.equal(countryStatus('fr', countries), 'checked');
  assert.equal(countryStatus('TW', countries), 'unchecked');
  assert.equal(countryStatus('XX', countries), 'unchecked');
});

test('conflicts: invasiveIn says "not checked" (null) unless the country was checked', () => {
  const robinia = T('Robinia pseudoacacia');
  assert.equal(invasiveIn(robinia, 'FR', true), true);
  assert.equal(invasiveIn(robinia, 'GB', true), false);
  assert.equal(invasiveIn(robinia, 'TW', false), null);
  assert.equal(invasiveIn(robinia, null, true), null);
});

// ================= jobs =================

test('jobs: a crop feeds you, functions map to the six jobs, and null functions (not curated) give none', () => {
  assert.deepEqual([...jobIds], ['feeds_you', 'feeds_soil', 'mulch', 'ground', 'helpers', 'shelter']);
  assert.deepEqual(jobsOf(make({ role: 'crop', functions: ['wildlife_habitat', 'nitrogen_fixer', 'insectary'] })), ['feeds_you', 'feeds_soil', 'helpers', 'shelter']);
  assert.deepEqual(jobsOf(make({ functions: null })), []);
  assert.deepEqual(jobsOf(byName(mediterranean, 'Zingiber officinale')), ['feeds_you']);
});

test('jobs: gaps name the stages where nobody does the job', () => {
  const crop = make({ role: 'crop', start: 0, end: 2 });
  const fixer = make({ functions: ['nitrogen_fixer'], start: 3, end: 6 });
  const unplaced = make({ stratum: null, functions: ['mulch'] });
  const gaps = jobGapsByPhase([crop, fixer, unplaced]);
  assert.deepEqual(gaps.map((g) => g.job), [...jobIds]);
  const of = (job) => gaps.find((g) => g.job === job);
  assert.deepEqual(of('feeds_you'), { job: 'feeds_you', members: [crop.id], missing: [3, 4, 5, 6] });
  assert.deepEqual(of('feeds_soil'), { job: 'feeds_soil', members: [fixer.id], missing: [0, 1, 2] });
  assert.deepEqual(of('mulch'), { job: 'mulch', members: [unplaced.id], missing: [0, 1, 2, 3, 4, 5, 6] }, 'a member with no stage covers none');
  assert.deepEqual(of('shelter').missing, [0, 1, 2, 3, 4, 5, 6]);
});

// ================= matrix =================

test('matrix: 4 strata × 7 phases; with no member, empty cells are data gaps exactly where the SQL counts none', async () => {
  const m = buildMatrix('Temperate', temperate, [], UNSURE_SITE);
  assert.deepEqual(m.rows.map((r) => r.stratum), [...strata]);
  assert.ok(m.rows.every((r) => r.cells.length === 7 && r.cells.every((c, i) => c.phase === i && c.stratum === r.stratum)));
  const counts = new Map((await source.cellCounts('Temperate')).map((r) => [`${r.stratum} ${r.phase}`, r.n]));
  for (const row of m.rows) for (const cell of row.cells) {
    const n = counts.get(`${cell.stratum} ${cell.phase}`) ?? 0;
    assert.equal(cell.inList, n, `${cell.stratum} ${cell.phase}`);
    assert.equal(cell.empty, n ? null : 'gap');
    assert.deepEqual(cell.members, []);
  }
  const gaps = m.rows.flatMap((r) => r.cells.filter((c) => c.empty === 'gap').map((c) => `${c.stratum} ${c.phase}`));
  assert.ok(gaps.includes('low 0'), 'Temperate low × placenta I is a data gap, as in the real export');
  assert.equal(m.filled, 0);
  assert.equal(m.cannot, gaps.length);
  assert.equal(m.total, 28 - gaps.length);
  assert.equal(m.free, m.total);
});

test('matrix: one plant fills every cell from its start to its end phase in its stratum', () => {
  const chestnut = T('Castanea sativa'); // emergent, secondary I → climax
  assert.deepEqual(cellsOf(chestnut), [['emergent', 3], ['emergent', 4], ['emergent', 5], ['emergent', 6]]);
  assert.equal(phaseOrd('climax'), 6);
  assert.deepEqual(startCell(chestnut), ['emergent', 3], 'each plant is listed once under its start cell');
  assert.equal(startCell(byName(mediterranean, 'Zingiber officinale')), null);
  const m = buildMatrix('Temperate', temperate, [chestnut], UNSURE_SITE);
  const row = m.rows.find((r) => r.stratum === 'emergent');
  assert.deepEqual(row.cells.map((c) => c.members.length), [0, 0, 0, 1, 1, 1, 1]);
  assert.equal(m.filled, 4);
  assert.equal(m.free, m.total - 4);
  assert.deepEqual(plantsIn(temperate, 'emergent', 3).map((t) => t.canonical_name).sort(), ['Castanea sativa', 'Robinia pseudoacacia']);
});

test('matrix: Room Small empties the emergent row as a site misfit, with counts per reason', () => {
  const m = buildMatrix('Temperate', temperate, [], site({ room: 'small' }));
  const row = m.rows.find((r) => r.stratum === 'emergent');
  for (const cell of row.cells.filter((c) => c.inList)) {
    assert.equal(cell.empty, 'misfit', `emergent ${cell.phase}`);
    assert.equal(cell.fitting, 0);
    assert.deepEqual(cell.reasons, { room: cell.inList });
    assert.equal(cell.bothReasons, false);
  }
  // A filled misfit cell is filled (the reader added it anyway) and counts as fillable.
  const m2 = buildMatrix('Temperate', temperate, [T('Quercus robur')], site({ room: 'small' }));
  const climax = m2.rows.find((r) => r.stratum === 'emergent').cells[6];
  assert.equal(climax.empty, null);
  assert.deepEqual(climax.members, [T('Quercus robur').id]);
});

test('matrix: counts that add up to more than the plants say "some for both reasons"', () => {
  const a = make({ stratum: 'high', start: 2, end: 2, traits: { sun: false, height_m: { min: 10, max: 20 } } });
  const b = make({ stratum: 'high', start: 2, end: 2, traits: { sun: true, height_m: { min: 10, max: 20 } } });
  const m = buildMatrix('Temperate', [a, b], [], site({ light: 'sun', room: 'small' }));
  const cell = m.rows[1].cells[2];
  assert.equal(cell.empty, 'misfit');
  assert.deepEqual(cell.reasons, { light: 1, room: 2 });
  assert.equal(cell.bothReasons, true);
  // An unknown (height not recorded) never empties a cell: it fits, and the view says so.
  const c = make({ stratum: 'high', start: 2, end: 2 });
  assert.equal(buildMatrix('Temperate', [c], [], site({ room: 'small' })).rows[1].cells[2].empty, null);
});

test('matrix: a placement with no layer yet is listed as unplaced; a guest fills cells with its home placement', () => {
  const zingiber = byName(mediterranean, 'Zingiber officinale');
  assert.equal(zingiber.stratum, null);
  const m = buildMatrix('Mediterranean', mediterranean, [], UNSURE_SITE);
  assert.deepEqual(m.unplaced, [zingiber.id]);
  const inga = { ...byName(tropical, 'Inga edulis'), from: 'Tropical' }; // high, placenta II → secondary II
  const m2 = buildMatrix('Temperate', temperate, [inga], UNSURE_SITE);
  const high = m2.rows.find((r) => r.stratum === 'high');
  assert.deepEqual(high.cells.map((c) => c.members.length), [0, 1, 1, 1, 1, 1, 0]);
  assert.equal(high.cells[1].empty, null, 'a cell with no Temperate plant is filled by the guest');
});

// ================= suggest =================

test('suggest: the size follows the room, 9 with Room unsure (A7), and it stops when nothing is new', () => {
  assert.deepEqual(SIZE_LIMIT, { small: 6, large: 9, field: 12, unsure: 9 });
  const s = suggest(temperate, { ...ctx(), interactions: temperateInteractions });
  assert.equal(s.limit, 9);
  assert.ok(s.members.length > 3 && s.members.length <= 9, String(s.members.length));
  assert.equal(new Set(s.members).size, s.members.length);
  const taxa = s.members.map((id) => temperate.find((t) => t.id === id));
  assert.ok(taxa.every(Boolean));
  assert.deepEqual(conflicts(taxa, temperateInteractions).filter(isSerious), [], 'no two members with a high conflict');
  // Every member brought a new cell or job when it joined.
  for (let i = 1; i < taxa.length; i++) {
    const g = gain(taxa[i], taxa.slice(0, i), UNSURE_SITE);
    assert.ok(g.cells + g.jobs + g.food + g.backup > 0, taxa[i].canonical_name);
  }
  // Duplicates stop it: three copies of one plant give one member, or two when the job wants a
  // second doer (ground cover).
  const dup = [0, 1, 2].map(() => make({ stratum: 'low', start: 0, end: 6, role: 'crop', functions: ['insectary'] }));
  assert.equal(suggest(dup, ctx()).members.length, 1);
  const cover = [0, 1, 2].map(() => make({ stratum: 'low', start: 0, end: 6, functions: ['ground_cover'] }));
  assert.equal(suggest(cover, ctx()).members.length, 2);
  assert.deepEqual(suggest(temperate, { ...ctx(), interactions: temperateInteractions }), s, 'deterministic');
});

test('suggest: kept and main crops are members first; removed plants are never picked; a small room picks no misfit', () => {
  const onion = T('Allium cepa').id, oak = T('Quercus robur').id, walnut = T('Juglans regia').id;
  const s = suggest(temperate, { ...ctx({ site: site({ room: 'small' }) }), interactions: temperateInteractions, kept: [oak], crops: [onion], removed: [T('Corylus avellana').id, oak] });
  assert.equal(s.limit, 6);
  assert.ok(s.members.length <= 6);
  assert.deepEqual(s.members.slice(0, 2).sort(), [oak, onion].sort(), 'kept (over removed) and crops first, a misfit kept anyway');
  assert.ok(!s.members.includes(T('Corylus avellana').id));
  const others = s.members.slice(2).map((id) => temperate.find((t) => t.id === id));
  assert.ok(others.every((t) => fits(t, site({ room: 'small' })).misfits.length === 0));
  // A high conflict with a kept plant keeps a candidate out (Juglans harms Malus).
  const s2 = suggest(temperate, { ...ctx(), interactions: temperateInteractions, kept: [walnut] });
  assert.ok(!s2.members.includes(T('Malus domestica').id));
});

test('suggest: a kept guest counts for coverage; a guest is never picked', () => {
  const inga = { ...byName(tropical, 'Inga edulis'), from: 'Tropical' };
  const musa = { ...byName(tropical, 'Musa acuminata'), from: 'Tropical' };
  const s = suggest(temperate, { ...ctx(), interactions: temperateInteractions, kept: [inga.id], guests: [inga, musa] });
  assert.equal(s.members[0], inga.id);
  assert.ok(!s.members.includes(musa.id));
});

test('flags: a misfit and a high conflict ask before Add or Swap; invasive, toxicity and medium conflicts only warn', () => {
  const c = ctx({ interactions: temperateInteractions, country: 'FR', countryStatus: 'checked', site: site({ room: 'small' }) });
  const robinia = T('Robinia pseudoacacia'); // invasive in FR, Severe, 12–25 m
  const fl = flagsFor(robinia, [], c);
  assert.deepEqual(fl.map((f) => f.kind).sort(), ['invasive', 'misfit', 'toxicity']);
  assert.equal(asks(fl), true);
  assert.equal(asks(flagsFor(robinia, [], { ...c, site: UNSURE_SITE })), false, 'invasive and toxicity never ask');
  const malus = T('Malus domestica'), walnut = T('Juglans regia'), hazel = T('Corylus avellana'), chestnut = T('Castanea sativa');
  const high = flagsFor(malus, [walnut], { ...c, site: UNSURE_SITE });
  assert.deepEqual(high, [{ id: malus.id, kind: 'conflict', other: walnut.id, severity: 'high', type: 'allelopathic_harm', agent: null,
    note: { en: 'Juglone from walnut roots stunts apples planted under its crown.', fr: 'La juglone des racines du noyer freine les pommiers plantés sous sa couronne.' } }]);
  assert.equal(asks(high), true);
  const medium = flagsFor(hazel, [chestnut], { ...c, site: UNSURE_SITE });
  assert.deepEqual(medium, [{ id: hazel.id, kind: 'conflict', other: chestnut.id, severity: 'medium', type: 'shared_pest', agent: 'Curculio nucum', note: null }]);
  // Low conflicts are flags too; views decide what to show (they leave low out of chips).
  const low = flagsFor(T('Ribes nigrum'), [T('Rubus idaeus')], { ...c, site: UNSURE_SITE });
  assert.deepEqual(low.map((f) => f.severity), ['low']);
  assert.equal(asks(medium), false);
  const all = flagsOf([malus, walnut], { ...c, site: UNSURE_SITE });
  assert.deepEqual(all.map((f) => `${f.id === malus.id ? 'malus' : 'walnut'} ${f.kind}`).sort(), ['malus conflict', 'walnut conflict']);
  // No country: no invasive flag (the soft worldwide count is the view's).
  assert.ok(!flagsFor(robinia, [], { ...c, country: null }).some((f) => f.kind === 'invasive'));
  assert.ok(!flagsFor(robinia, [], { ...c, country: 'TW', countryStatus: 'unchecked' }).some((f) => f.kind === 'invasive'));
});

test('alternatives: "Also fills" and "Leaves empty" are the cells a swap changes', () => {
  const member = make({ stratum: 'low', start: 0, end: 2 });
  const other = make({ stratum: 'low', start: 2, end: 3 });
  const longer = make({ stratum: 'low', start: 1, end: 5 });
  const high = make({ stratum: 'high', start: 0, end: 0 });
  const removed = make({ stratum: 'low', start: 0, end: 6 });
  const pool = [member, other, longer, high, removed];
  const alts = alternatives(member.id, [member, other], pool, { ...ctx(), removed: [removed.id] });
  assert.deepEqual(alts.map((a) => a.id), [longer.id, high.id], 'same stratum first; members and removed plants are not offered');
  const a = alts[0];
  assert.equal(a.sameStratum, true);
  assert.deepEqual(a.alsoFills, [['low', 4], ['low', 5]]);
  assert.deepEqual(a.leavesEmpty, [['low', 0]]);
  assert.deepEqual(alts[1].alsoFills, [['high', 0]]);
  assert.deepEqual(alts[1].leavesEmpty, [['low', 0], ['low', 1]]);
  // A candidate that asks (high conflict) comes after one that does not, with its flags.
  const walnut = T('Juglans regia'), malus = T('Malus domestica'), pear = T('Pyrus communis');
  const swap = alternatives(pear.id, [pear, walnut], temperate, ctx({ interactions: temperateInteractions }));
  const iMalus = swap.findIndex((x) => x.id === malus.id);
  assert.ok(iMalus > 0 && asks(swap[iMalus].flags));
  assert.ok(swap.slice(0, iMalus).every((x) => !asks(x.flags)));
});

// ================= share state =================

const shareState = (over = {}) => ({
  climate: 'Temperate', country: 'FR', site: site({ light: 'sun', room: 'small' }), members: [], kept: [], removed: [], crops: [], guests: [], stage: null, ...over,
});
const known = (extra = {}) => ({ Temperate: ids(temperate), Tropical: ids(tropical), ...extra });

test('state: #v=4 round-trips members, kept, removed, crops, guests, site, country and stage', () => {
  const inga = byName(tropical, 'Inga edulis').id;
  const st = shareState({
    members: [T('Castanea sativa').id, T('Allium cepa').id, inga, T('Malus domestica').id],
    kept: [T('Castanea sativa').id, T('Allium cepa').id, inga],
    crops: [T('Allium cepa').id],
    removed: [T('Juglans regia').id],
    guests: [{ id: inga, from: 'Tropical' }],
    stage: 3,
  });
  const link = encodeLink(st, known());
  assert.equal(LINK_VERSION, 4);
  assert.match(link, /^v=4&c=temperate&k=FR&l=sun&s=unsure&w=unsure&m=small&/);
  assert.match(link, /&e=1$/);
  assert.deepEqual(linkClimates(link), ['Temperate', 'Tropical']);
  const back = decodeLink(link, known());
  assert.deepEqual(back.notice, { unknownCount: 0, cut: false, outdated: false });
  assert.deepEqual(back.state, st);
  assert.deepEqual(decodeLink('#' + link, known()).state, st, 'a leading # is read');
});

test('state: tokens are 36 bits in 6 base64url characters, whole ids ("." + 22) on a clash', () => {
  const id1 = '01234567-89ab-4def-8000-000000000001', id2 = '01234567-8fff-4def-8000-000000000002', id3 = 'fedcba98-7654-4321-8000-000000000003';
  assert.equal(tokenOf(id3, [id1, id2, id3]).length, 6);
  assert.match(tokenOf(id3, [id3]), /^[A-Za-z0-9_-]{6}$/);
  assert.match(tokenOf(id1, [id1, id2]), /^\.[A-Za-z0-9_-]{22}$/, 'id1 and id2 share their first 9 hex digits');
  const st = shareState({ members: [id1, id2, id3] });
  const back = decodeLink(encodeLink(st, { Temperate: [id1, id2, id3] }), { Temperate: [id1, id2, id3] });
  assert.deepEqual(back.state.members, [id1, id2, id3]);
  // The fixture's ids all share their first 36 bits: every one is written whole and still restores.
  const all = ids(temperate);
  assert.deepEqual(decodeLink(encodeLink(shareState({ members: all }), known()), known()).state.members, all);
});

test('state: an unknown plant is counted and left out; the rest is restored', () => {
  const gone = 'abcdef01-2345-4678-8000-000000000999';
  const st = shareState({ members: [T('Castanea sativa').id, gone], kept: [gone] });
  const link = encodeLink(st, { Temperate: [...ids(temperate), gone] });
  const back = decodeLink(link, known());
  assert.deepEqual(back.state.members, [T('Castanea sativa').id]);
  assert.deepEqual(back.state.kept, []);
  assert.equal(back.notice.unknownCount, 1, 'one plant, counted once though kept and a member');
  assert.equal(back.notice.cut, false);
});

test('state: a cut link opens what parses and says so; a long link is flagged; an old version reads no plants', () => {
  const real = [0, 1, 2].map((i) => idOf(0x100 + i * 0x1000000));
  const st = shareState({ members: real });
  const link = encodeLink(st, { Temperate: real });
  const cutAtEnd = link.replace(/&e=1$/, '');
  const a = decodeLink(cutAtEnd, { Temperate: real });
  assert.deepEqual(a.state.members, real);
  assert.equal(a.notice.cut, true);
  const midToken = link.slice(0, link.indexOf('&a=') + 3 + 6 + 3);
  const b = decodeLink(midToken, { Temperate: real });
  assert.deepEqual(b.state.members, real.slice(0, 1));
  assert.equal(b.notice.cut, true);
  assert.equal(b.state.site.room, 'small', 'the site keys before the cut are kept');
  // Long links are checked on the whole URL at share time, never on a link being read.
  assert.equal(LONG_LINK, 2000);
  const many = Array.from({ length: 400 }, (_, i) => idOf(0x10000000 + i * 0x1000));
  const url = `https://projectcanopi.com/consortium/#${encodeLink(shareState({ members: many }), { Temperate: many })}`;
  assert.equal(isLongLink(url), true);
  assert.equal(isLongLink(`https://projectcanopi.com/consortium/#${link}`), false);
  assert.ok(!('long' in decodeLink(url.split('#')[1], { Temperate: many }).notice));
  const old = decodeLink('v=3&c=temperate&a=AAAAAA&e=1', known());
  assert.deepEqual(old.state.members, []);
  assert.equal(old.state.climate, 'Temperate');
  assert.equal(old.notice.outdated, true);
  // No v key: read as this version, never "outdated".
  const bare = decodeLink(link.replace(/^v=4&/, ''), { Temperate: real });
  assert.equal(bare.notice.outdated, false);
  assert.deepEqual(bare.state.members, real);
});

test('state: at most MAX_LINK_IDS tokens per key are read; malformed values fall back to "unsure"', () => {
  assert.equal(MAX_LINK_IDS, 2000);
  const tokens = 'AAAAAB'.repeat(MAX_LINK_IDS + 5);
  const d = decodeLink(`v=4&c=temperate&a=${tokens}&e=1`, { Temperate: [] });
  assert.ok(d.notice.unknownCount >= 1);
  const e = decodeLink('v=4&c=nowhere&l=moon&m=castle&t=9&k=france&e=1', known());
  assert.equal(e.state.climate, null);
  assert.deepEqual(e.state.site, UNSURE_SITE);
  assert.equal(e.state.stage, null);
  assert.equal(e.state.country, null);
});

test('state: Main crops past MAX_CROPS are ignored, not counted unknown', () => {
  const five = [0, 1, 2, 3, 4].map((i) => idOf(0x300 + i * 0x1000000));
  const n = five.map((id) => tokenOf(id, five)).join('');
  const d = decodeLink(`v=4&c=temperate&a=&n=${n}&e=1`, { Temperate: five });
  assert.equal(MAX_CROPS, 3);
  assert.deepEqual(d.state.crops, five.slice(0, 3));
  assert.equal(d.notice.unknownCount, 0);
});

test('state: guide presets keep ?plant=&climate=', () => {
  assert.deepEqual(readPreset('?plant=Castanea%20sativa&climate=temperate'), { climate: 'Temperate', plant: 'Castanea sativa' });
  assert.deepEqual(readPreset('?climate=arid'), { climate: 'Arid', plant: null });
  assert.deepEqual(readPreset('?climate=moon&plant='), { climate: null, plant: null });
});

// ================= §8 recompute budget =================

test('recompute: matrix and flags for 200 members, a suggestion and every Swap list stay fast (≤ 2.5× a same-process baseline; CONSORTIUM_PERF=1 holds 50 ms)', () => {
  const all = [...temperate, ...tropical, ...mediterranean];
  const fresh = () => Array.from({ length: 200 }, (_, i) => {
    const t = structuredClone(all[i % all.length]);
    return { ...t, id: idOf(0x200000 + i), canonical_name: `${t.canonical_name} ${String(i).padStart(3, '0')}` };
  });
  const interactions = [...temperateInteractions];
  const c = ctx({ interactions, country: 'FR', countryStatus: 'checked', site: site({ light: 'sun', soil: 'neutral', room: 'large' }) });
  const run = (pool) => {
    const m = buildMatrix('Temperate', pool, pool, c.site);
    const f = flagsOf(pool, c);
    const s = suggest(pool, c);
    const members = s.members.map((id) => pool.find((t) => t.id === id));
    for (const id of s.members) alternatives(id, members, pool, c);
    return { m, f, s };
  };
  const baseline = () => {
    const m = new Map(); let x = 0;
    for (let i = 0; i < 40000; i++) { const k = 'k' + (i % 997); m.set(k, (m.get(k) ?? 0) + i); x += k.length; }
    const arr = Array.from({ length: 20000 }, (_, i) => ({ v: (i * 7919) % 20011 })).sort((p, q) => p.v - q.v);
    return x + arr[0].v + m.size;
  };
  const time = (f) => { const start = performance.now(); const out = f(); return [performance.now() - start, out]; };
  for (let k = 0; k < 5; k++) { run(fresh()); baseline(); }
  let work = Infinity, base = Infinity, out;
  for (let k = 0; k < 10; k++) {
    const pool = fresh();
    const [w, o] = time(() => run(pool));
    work = Math.min(work, w); out = o;
    base = Math.min(base, time(baseline)[0]);
  }
  assert.ok(out.m.filled > 0 && out.s.members.length >= 3);
  const ratio = work / base;
  assert.ok(ratio < 2.5, `cold run ${work.toFixed(1)} ms is ${ratio.toFixed(2)}x the baseline's ${base.toFixed(1)} ms (ceiling 2.5x)`);
  if (process.env.CONSORTIUM_PERF === '1') assert.ok(work < 50, `${work.toFixed(1)} ms (budget 50 ms)`);
});
