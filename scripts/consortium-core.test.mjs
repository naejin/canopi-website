// The consortium v2 core (src/lib/consortium/, stream S1 of P2): site fit, conflicts, jobs, the
// cells a plant fills, the suggestion and Swap alternatives, and the #v=5 share state, through the
// core's public index. Plants come from two places: invented records made here for one rule at a
// time, and the invented fixture database (scripts/fixtures/consortium-v2/export/) read through the
// island's SQLite adapter. (The matrix and its cases, checked against the adapter's SQL cell counts,
// went in PP-B commit 0a'.)
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
  flagsFor, flagsOf, warns,
  encodeLink, decodeLink, linkClimates, readPreset, LINK_VERSION, MAX_LINK_IDS, LONG_LINK, tokenOf, isLongLink,
  strata, phases,
} = core;
// The suggestion and the Swap list: their own chunk on the page (core loadSuggest), not in the barrel.
const { suggest, SIZE_LIMIT, gain, alternatives } = await import('../src/lib/consortium/suggest.ts');

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

test('site: room uses the wild maximum height only, advisory (owner request 2026-11-12: a taller plant fits, kind wild_height); an unknown height or a climber is said, never a silent fit', () => {
  assert.deepEqual(ROOM_LIMIT_M, { pots: 6, small: 6, large: 12, field: Infinity, unsure: Infinity });
  const oak = make({ traits: { height_m: { min: 25, max: 40 }, width_max_m: 25 } });
  const small = fits(oak, site({ room: 'small' }));
  assert.deepEqual(small.misfits, []);
  assert.deepEqual(small.reasons, [{ key: 'room', verdict: 'fit', kind: 'wild_height', meters: 40, limit: 6 }]);
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
  // The flags read the same rule.
  assert.deepEqual(flagsOf([p, make({ stratum: 'high', start: 4, end: 6 })], ctx({ site: sun })).filter((f) => f.kind === 'misfit').map((f) => f.id), [p.id]);
  assert.deepEqual(flagsOf([p, make({ stratum: 'high', start: 1, end: 6 })], ctx({ site: sun })).filter((f) => f.kind === 'misfit'), []);
  // suggest: seeded above it in a shared phase, it may join; with no shared phase it is never picked.
  const late = make({ stratum: 'high', start: 3, end: 6 }), early = make({ stratum: 'high', start: 0, end: 6 });
  assert.ok(!suggest([p, late], ctx({ site: sun, seed: [late.id] })).members.includes(p.id));
  assert.ok(suggest([p, early], ctx({ site: sun, seed: [early.id] })).members.includes(p.id));
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

// ================= suggest =================

test('suggest: the size follows the room, 9 with Room unsure (A7), and it stops when nothing is new', () => {
  assert.deepEqual(SIZE_LIMIT, { pots: 6, small: 6, large: 9, field: 12, unsure: 9 });
  const s = suggest(temperate, { ...ctx(), interactions: temperateInteractions });
  assert.equal(s.limit, 9);
  assert.ok(s.members.length > 3 && s.members.length <= 9, String(s.members.length));
  assert.equal(new Set(s.members).size, s.members.length);
  const taxa = s.members.map((id) => temperate.find((t) => t.id === id));
  assert.ok(taxa.every(Boolean));
  assert.deepEqual(conflicts(taxa, temperateInteractions).filter(isSerious), [], 'no two members with a high conflict');
  // Every member filled an open hole or brought a job when it joined (PP-B b1b: holes, not cells).
  for (let i = 1; i < taxa.length; i++) {
    const g = gain(taxa[i], taxa.slice(0, i), UNSURE_SITE);
    assert.ok(g.holes + g.jobs + g.food + g.backup > 0, taxa[i].canonical_name);
  }
  // Duplicates stop it: three copies of one plant give one member, or two when the job wants a
  // second doer (ground cover).
  const dup = [0, 1, 2].map(() => make({ stratum: 'low', start: 0, end: 6, role: 'crop', functions: ['insectary'] }));
  assert.equal(suggest(dup, ctx()).members.length, 1);
  const cover = [0, 1, 2].map(() => make({ stratum: 'low', start: 0, end: 6, functions: ['ground_cover'] }));
  assert.equal(suggest(cover, ctx()).members.length, 2);
  assert.deepEqual(suggest(temperate, { ...ctx(), interactions: temperateInteractions }), s, 'deterministic');
});

// PP-B b1b (plant-palette-architecture 3.3): the gain counts the open holes a plant fills, through
// the one predicate core holes.ts fills(), in place of the cell terms; a member outside its range for
// the page period fills nothing (inventory M2), so the holes it leaves count.
test('suggest: the gain counts the open holes a plant fills (holes.ts fills), not the cells', () => {
  const { holes, fills } = core;
  const early = make({ stratum: 'low', start: 0, end: 2, functions: ['nitrogen_fixer'] });
  const late = make({ stratum: 'low', start: 3, end: 6, functions: ['nitrogen_fixer'] });
  const tall = make({ stratum: 'high', start: 3, end: 6, functions: ['nitrogen_fixer'] });
  const open = (members, verdicts = null) => holes({ members, verdicts, pending: false }).filter((h) => h.state === 'open');
  const filled = (t, members, verdicts) => open(members, verdicts).filter((h) => fills(h, t)).length;
  const g = gain(late, [early], UNSURE_SITE);
  assert.equal('cells' in g, false, 'no cell term');
  assert.ok(filled(late, [early]) > 0, 'the later low plant fills a hole the early one leaves');
  assert.equal(g.holes, 3 * filled(late, [early]), '3 per open hole filled');
  assert.equal(gain(tall, [early], UNSURE_SITE).holes, 3 * filled(tall, [early]));
  // A member outside its range for the period fills nothing: its holes stay open for the gain.
  // A plant in the early one's own years fills nothing beside it, and fills its holes once it is outside.
  const twin = make({ stratum: 'low', start: 1, end: 2, functions: ['nitrogen_fixer'] });
  const outside = new Map([[early.id, { id: early.id, level: 'outside' }]]);
  assert.equal(gain(twin, [early], UNSURE_SITE).holes, 0);
  assert.ok(gain(twin, [early], UNSURE_SITE, outside).holes > 0, 'an outside member leaves its holes open');
  assert.equal(gain(twin, [early], UNSURE_SITE, outside).holes, 3 * filled(twin, [early], outside));
  // Fix round 1 (b1br-2): a candidate scores holes exactly as holes() counts it once added; outside
  // its range for the period it fills none, so the hole stays open and is no reason to pick it.
  const x = make({ stratum: 'high', start: 3, end: 6, functions: ['nitrogen_fixer'] });
  const xOutside = new Map([[x.id, { id: x.id, level: 'outside' }]]);
  assert.ok(gain(x, [early], UNSURE_SITE).holes > 0, 'tree X fills holes when it holds');
  assert.equal(gain(x, [early], UNSURE_SITE, xOutside).holes, 0, 'tree X outside its range: no hole gain');
  const after = (v) => open([early, x], v).length;
  assert.equal(open([early], xOutside).length - after(xOutside), 0, 'holes() agrees: adding an outside X closes no hole');
  // suggest() takes the verdicts too, and every member it picks fills an open hole or brings a job.
  const s = suggest(temperate, { ...ctx(), interactions: temperateInteractions, verdicts: new Map() });
  const taxa = s.members.map((id) => temperate.find((t) => t.id === id));
  for (let i = 1; i < taxa.length; i++) {
    const gi = gain(taxa[i], taxa.slice(0, i), UNSURE_SITE);
    assert.ok(gi.holes + gi.jobs + gi.food + gi.backup > 0, taxa[i].canonical_name);
  }
});

test('suggest: the seed (the plants already there) are members first; removed plants are never picked; a small room picks no misfit', () => {
  const onion = T('Allium cepa').id, oak = T('Quercus robur').id, walnut = T('Juglans regia').id;
  const s = suggest(temperate, { ...ctx({ site: site({ room: 'small' }) }), interactions: temperateInteractions, seed: [oak, onion], removed: [T('Corylus avellana').id, oak] });
  assert.equal(s.limit, 6);
  assert.ok(s.members.length <= 6);
  assert.deepEqual(s.members.slice(0, 2).sort(), [oak, onion].sort(), 'the seed first (over removed), a misfit kept anyway');
  assert.ok(!s.members.includes(T('Corylus avellana').id));
  const others = s.members.slice(2).map((id) => temperate.find((t) => t.id === id));
  assert.ok(others.every((t) => fits(t, site({ room: 'small' })).misfits.length === 0));
  // A high conflict with a seeded plant keeps a candidate out (Juglans harms Malus).
  const s2 = suggest(temperate, { ...ctx(), interactions: temperateInteractions, seed: [walnut] });
  assert.ok(!s2.members.includes(T('Malus domestica').id));
});

test('suggest: a seeded guest counts for coverage; a guest is never picked', () => {
  const inga = { ...byName(tropical, 'Inga edulis'), from: 'Tropical' };
  const musa = { ...byName(tropical, 'Musa acuminata'), from: 'Tropical' };
  const s = suggest(temperate, { ...ctx(), interactions: temperateInteractions, seed: [inga.id], guests: [inga, musa] });
  assert.equal(s.members[0], inga.id);
  assert.ok(!s.members.includes(musa.id));
});

test('flags: a misfit and a high conflict warn (listed last); invasive, toxicity and medium conflicts alone do not', () => {
  const c = ctx({ interactions: temperateInteractions, country: 'FR', countryStatus: 'checked', site: site({ room: 'small' }) });
  const robinia = T('Robinia pseudoacacia'); // invasive in FR, Severe, 12–25 m
  // Taller than a small garden is advisory (owner request 2026-11-12): no misfit flag, no warning.
  assert.deepEqual(flagsFor(robinia, [], c).map((f) => f.kind).sort(), ['invasive', 'toxicity']);
  const fl = flagsFor(robinia, [], { ...c, site: site({ light: 'shade' }) });
  assert.ok(fl.some((f) => f.kind === 'misfit'), 'a light misfit still flags');
  assert.equal(warns(fl), true);
  assert.equal(warns(flagsFor(robinia, [], { ...c, site: UNSURE_SITE })), false, 'invasive and toxicity alone never warn');
  const malus = T('Malus domestica'), walnut = T('Juglans regia'), hazel = T('Corylus avellana'), chestnut = T('Castanea sativa');
  const high = flagsFor(malus, [walnut], { ...c, site: UNSURE_SITE });
  // Malus is Slight: since b3 its toxicity is a flag too (with its level); the conflict is checked alone here.
  assert.ok(high.some((f) => f.kind === 'toxicity' && f.id === malus.id), 'Slight toxicity flags (b3)');
  assert.deepEqual(high.filter((f) => f.kind !== 'toxicity'), [{ id: malus.id, kind: 'conflict', other: walnut.id, severity: 'high', type: 'allelopathic_harm', agent: null,
    note: { en: 'Juglone from walnut roots stunts apples planted under its crown.', fr: 'La juglone des racines du noyer freine les pommiers plantés sous sa couronne.' } }]);
  assert.equal(warns(high), true);
  const medium = flagsFor(hazel, [chestnut], { ...c, site: UNSURE_SITE });
  assert.deepEqual(medium, [{ id: hazel.id, kind: 'conflict', other: chestnut.id, severity: 'medium', type: 'shared_pest', agent: 'Curculio nucum', note: null }]);
  // Low conflicts are flags too; views decide what to show (they leave low out of chips).
  const low = flagsFor(T('Ribes nigrum'), [T('Rubus idaeus')], { ...c, site: UNSURE_SITE });
  assert.deepEqual(low.map((f) => f.severity), ['low']);
  assert.equal(warns(medium), false);
  const all = flagsOf([malus, walnut], { ...c, site: UNSURE_SITE });
  assert.deepEqual(all.map((f) => `${f.id === malus.id ? 'malus' : 'walnut'} ${f.kind}`).sort(), ['malus conflict', 'malus toxicity', 'walnut conflict', 'walnut toxicity']); // both Slight (b3)
  // No country: no invasive flag (the soft worldwide count is the view's).
  assert.ok(!flagsFor(robinia, [], { ...c, country: null }).some((f) => f.kind === 'invasive'));
  assert.ok(!flagsFor(robinia, [], { ...c, country: 'TW', countryStatus: 'unchecked' }).some((f) => f.kind === 'invasive'));
});

test('alternatives: the closest in years first, members and removed plants left out, warned candidates last', () => {
  const member = make({ stratum: 'low', start: 0, end: 2 });
  const other = make({ stratum: 'low', start: 2, end: 3 });
  const longer = make({ stratum: 'low', start: 1, end: 5 });
  const high = make({ stratum: 'high', start: 0, end: 0 });
  const removed = make({ stratum: 'low', start: 0, end: 6 });
  const pool = [member, other, longer, high, removed];
  const alts = alternatives(member.id, [member, other], pool, { ...ctx(), removed: [removed.id] });
  assert.deepEqual(alts.map((a) => a.id), [longer.id, high.id], 'the one covering more years first; members and removed plants are not offered');
  // The hole diff itself (swapChange, internal since c2 fix round 1 B7) is pinned through alternatives
  // in consortium-pp-c2.test.mjs (u15, A1).
  assert.equal(alts[1].strataGain, true, 'high: a stratum no member stands in');
  // A candidate that warns (high conflict) comes after one that does not, with its flags.
  const walnut = T('Juglans regia'), malus = T('Malus domestica'), pear = T('Pyrus communis');
  const swap = alternatives(pear.id, [pear, walnut], temperate, ctx({ interactions: temperateInteractions }));
  const iMalus = swap.findIndex((x) => x.id === malus.id);
  assert.ok(iMalus > 0 && warns(swap[iMalus].flags));
  assert.ok(swap.slice(0, iMalus).every((x) => !warns(x.flags)));
});

// ================= share state =================

// Link v5 (PP-B commit 0a): the place keys (k, o, the spot answers, the soil) only with the place tick;
// kept, crops and stage were never written and went from the share state in PP-B commit 0a'
// (scripts/consortium-link-v5.test.mjs holds the contract).
const V5_SPOT = { light: 'sun', water: 'unsure', wind: 'unsure', ground: 'unsure', height: 'unsure' };
const shareV5 = (over = {}) => ({
  climate: 'Temperate', country: 'FR', room: 'small', plot: null, period: '1991-2020', spot: V5_SPOT, soil: null,
  members: [], removed: [], guests: [], siteEdits: null, plantsPerJob: 2, ...over,
});
const NO_NOTICE = { unknownCount: 0, cut: false, newer: false, unreadable: false, period: false };

const known = (extra = {}) => ({ Temperate: ids(temperate), Tropical: ids(tropical), ...extra });

test('state: #v=5 round-trips members, removed, guests, room, country and the spot; kept, crops and stage are neither written nor read', () => {
  const inga = byName(tropical, 'Inga edulis').id;
  const st = shareV5({
    members: [T('Castanea sativa').id, T('Allium cepa').id, inga, T('Malus domestica').id],
    removed: [T('Juglans regia').id],
    guests: [{ id: inga, from: 'Tropical' }],
  });
  const link = encodeLink(st, known(), { place: true });
  assert.equal(LINK_VERSION, 5);
  assert.match(link, /^v=5&c=temperate&m=small&a=/);
  assert.match(link, /&k=FR&l=sun&e=1$/);
  assert.deepEqual(linkClimates(link), ['Temperate', 'Tropical']);
  const back = decodeLink(link, known());
  assert.deepEqual(back.notice, NO_NOTICE);
  assert.deepEqual(back.state, st);
  assert.deepEqual(decodeLink('#' + link, known()).state, st, 'a leading # is read');
  // v4's kept, crops and stage given to encodeLink leave the link unchanged and are not read back.
  const old = { ...st, kept: [T('Castanea sativa').id, inga], crops: [T('Allium cepa').id], stage: 3 };
  assert.equal(encodeLink(old, known(), { place: true }), link);
  const back4 = decodeLink(encodeLink(old, known(), { place: true }), known()).state;
  assert.deepEqual(['kept', 'crops', 'stage'].filter((k) => k in back4), []);
  // Without the tick the link is the public form: no country and no spot.
  const pub = decodeLink(encodeLink(st, known()), known()).state;
  assert.deepEqual([pub.country, pub.spot, pub.members], [null, null, st.members]);
});

test('state: tokens are 36 bits in 6 base64url characters, whole ids ("." + 22) on a clash', () => {
  const id1 = '01234567-89ab-4def-8000-000000000001', id2 = '01234567-8fff-4def-8000-000000000002', id3 = 'fedcba98-7654-4321-8000-000000000003';
  assert.equal(tokenOf(id3, [id1, id2, id3]).length, 6);
  assert.match(tokenOf(id3, [id3]), /^[A-Za-z0-9_-]{6}$/);
  assert.match(tokenOf(id1, [id1, id2]), /^\.[A-Za-z0-9_-]{22}$/, 'id1 and id2 share their first 9 hex digits');
  const st = shareV5({ members: [id1, id2, id3] });
  const back = decodeLink(encodeLink(st, { Temperate: [id1, id2, id3] }), { Temperate: [id1, id2, id3] });
  assert.deepEqual(back.state.members, [id1, id2, id3]);
  // The fixture's ids all share their first 36 bits: every one is written whole and still restores.
  const all = ids(temperate);
  assert.deepEqual(decodeLink(encodeLink(shareV5({ members: all }), known()), known()).state.members, all);
});

test('state: an unknown plant is counted and left out; the rest is restored', () => {
  const gone = 'abcdef01-2345-4678-8000-000000000999';
  const st = shareV5({ members: [T('Castanea sativa').id, gone], removed: [gone] });
  const link = encodeLink(st, { Temperate: [...ids(temperate), gone] });
  const back = decodeLink(link, known());
  assert.deepEqual(back.state.members, [T('Castanea sativa').id]);
  assert.deepEqual(back.state.removed, []);
  assert.equal(back.notice.unknownCount, 1, 'one plant, counted once though removed and a member');
  assert.equal(back.notice.cut, false);
});

test('state: a cut link opens what parses and says so; a long link is flagged; an old version reads no plants', () => {
  const real = [0, 1, 2].map((i) => idOf(0x100 + i * 0x1000000));
  const st = shareV5({ members: real });
  const link = encodeLink(st, { Temperate: real });
  const cutAtEnd = link.replace(/&e=1$/, '');
  const a = decodeLink(cutAtEnd, { Temperate: real });
  assert.deepEqual(a.state.members, real);
  assert.equal(a.notice.cut, true);
  const midToken = link.slice(0, link.indexOf('&a=') + 3 + 6 + 3);
  const b = decodeLink(midToken, { Temperate: real });
  assert.deepEqual(b.state.members, real.slice(0, 1));
  assert.equal(b.notice.cut, true);
  assert.equal(b.state.room, 'small', 'the keys before the cut are kept');
  // Long links are checked on the whole URL at share time, never on a link being read.
  assert.equal(LONG_LINK, 2000);
  const many = Array.from({ length: 400 }, (_, i) => idOf(0x10000000 + i * 0x1000));
  const url = `https://projectcanopi.com/palette/#${encodeLink(shareV5({ members: many }), { Temperate: many })}`;
  assert.equal(isLongLink(url), true);
  assert.equal(isLongLink(`https://projectcanopi.com/palette/#${link}`), false);
  assert.ok(!('long' in decodeLink(url.split('#')[1], { Temperate: many }).notice));
  // The old beta tool's versions (below 5): unreadable like any link this decoder cannot read, nothing
  // restored, not even the climate (owner 2026-11-17, no backward compatibility work).
  for (const v of ['1', '3', '4']) {
    const old = decodeLink(`v=${v}&c=temperate&a=AAAAAA&e=1`, known());
    assert.deepEqual(old.state.members, [], `v=${v}`);
    assert.equal(old.state.climate, null, `v=${v}`);
    assert.equal(old.notice.unreadable, true, `v=${v}`);
    assert.ok(!('outdated' in old.notice), `v=${v}: no older-version notice`);
  }
  // No v key with plants (v5, 8.2): unreadable, nothing restored.
  const bare = decodeLink(link.replace(/^v=5&/, ''), { Temperate: real });
  assert.equal(bare.notice.unreadable, true);
  assert.deepEqual(bare.state.members, []);
});

test('state: at most MAX_LINK_IDS tokens per key are read; malformed values fall back to "unsure"', () => {
  assert.equal(MAX_LINK_IDS, 2000);
  const tokens = 'AAAAAB'.repeat(MAX_LINK_IDS + 5);
  const d = decodeLink(`v=5&c=temperate&a=${tokens}&e=1`, { Temperate: [] });
  assert.ok(d.notice.unknownCount >= 1);
  const e = decodeLink('v=5&c=nowhere&l=moon&m=castle&t=9&k=france&e=1', known());
  assert.equal(e.state.climate, null);
  assert.equal(e.state.room, 'unsure');
  assert.equal(e.state.spot, null, 'an unknown light word reads as unsure, so no spot');
  assert.equal('stage' in e.state, false, 't= is a key v5 does not know: ignored');
  assert.equal(e.state.country, null);
});

test('state: v5 reads no Main crops (n is a key v5 does not know, ignored): no crops, nothing counted unknown', () => {
  const five = [0, 1, 2, 3, 4].map((i) => idOf(0x300 + i * 0x1000000));
  const n = five.map((id) => tokenOf(id, five)).join('');
  const d = decodeLink(`v=5&c=temperate&a=&n=${n}&e=1`, { Temperate: five });
  assert.equal('crops' in d.state, false);
  assert.equal(d.notice.unknownCount, 0);
  assert.deepEqual(d.notice, NO_NOTICE);
});

test('state: guide presets keep ?plant=&climate=', () => {
  assert.deepEqual(readPreset('?plant=Castanea%20sativa&climate=temperate'), { climate: 'Temperate', plant: 'Castanea sativa' });
  assert.deepEqual(readPreset('?climate=arid'), { climate: 'Arid', plant: null });
  assert.deepEqual(readPreset('?climate=moon&plant='), { climate: null, plant: null });
});

// ================= §8 recompute budget =================

test('recompute: flags for 200 members, a suggestion and every Swap list, timed against a same-process baseline and reported', (t) => {
  const all = [...temperate, ...tropical, ...mediterranean];
  const fresh = () => Array.from({ length: 200 }, (_, i) => {
    const t = structuredClone(all[i % all.length]);
    return { ...t, id: idOf(0x200000 + i), canonical_name: `${t.canonical_name} ${String(i).padStart(3, '0')}` };
  });
  const interactions = [...temperateInteractions];
  const c = ctx({ interactions, country: 'FR', countryStatus: 'checked', site: site({ light: 'sun', soil: 'neutral', room: 'large' }) });
  const run = (pool) => {
    const f = flagsOf(pool, c);
    const s = suggest(pool, c);
    const members = s.members.map((id) => pool.find((t) => t.id === id));
    for (const id of s.members) alternatives(id, members, pool, c);
    return { f, s };
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
  assert.ok(out.f.length > 0 && out.s.members.length >= 3);
  const ratio = work / base;
  // Owner, 2026-11-16 (row "No hard limits"): timings are reported, never a failure.
  t.diagnostic(`cold run ${work.toFixed(1)} ms, ${ratio.toFixed(2)}x the baseline's ${base.toFixed(1)} ms (reference 2.5x and 50 ms)`);
});

// E6 R1 (design check §3 chunk 1): the nearest-list table is a leaf both placement files read (cycle
// C1 placed.ts ⇄ placement.ts gone), and the flags live beside conflicts.ts, so the store's flags
// reach no suggestion code. Imports are read as text: a static or dynamic import is an edge.
test('core leaves: nearest.ts imports only types; placed.ts never imports placement.ts; flags come from conflicts.ts', async () => {
  const src = (f) => readFileSync(new URL(`../src/lib/consortium/${f}`, import.meta.url), 'utf8');
  const edges = (f) => [...src(f).matchAll(/(?:from|import)\s*\(?\s*['"]\.\/([^'"]+)['"]/g)].map((m) => m[1]);
  assert.deepEqual(edges('nearest.ts'), ['types.ts']);
  assert.ok(!edges('placed.ts').includes('placement.ts'), 'placed.ts reads the table from nearest.ts');
  assert.ok(!edges('conflicts.ts').includes('suggest.ts'), 'conflicts.ts does not reach the suggestion');
  const conflictsMod = await import('../src/lib/consortium/conflicts.ts');
  const suggestMod = await import('../src/lib/consortium/suggest.ts');
  for (const name of ['flagsOf', 'flagsFor', 'warns']) {
    assert.equal(typeof conflictsMod[name], 'function', `conflicts.ts exports ${name}`);
    assert.equal(suggestMod[name], undefined, `suggest.ts no longer declares ${name}`);
    assert.equal(core[name], conflictsMod[name], `the index exports conflicts.ts's ${name}`);
  }
  assert.equal(core.NEAREST_LISTS, (await import('../src/lib/consortium/nearest.ts')).NEAREST_LISTS);
});

// E6 R4 (design check A11): the page reaches suggest.ts only through loadSuggest (its own chunk); the
// barrel re-exports none of it, so no first-run import can pull it back.
test('core barrel: suggest.ts is not re-exported; loadSuggest gives suggest and alternatives', async () => {
  for (const name of ['suggest', 'alternatives', 'SIZE_LIMIT', 'gain']) assert.equal(name in core, false, `index.ts does not export ${name}`);
  const rule = await core.loadSuggest();
  assert.deepEqual(Object.keys(rule).sort(), ['alternatives', 'suggest']);
  assert.equal(rule.suggest, suggest);
});

// ADR-6: the facts a view reads through factAt (source.ts), the stored value today. Since PP-C commit 0
// (b3g-5) only water_need: a fact joins FactKey with its first reader.
test('factAt: the stored value of each ADR-6 fact, null when not recorded (never a misfit)', async () => {
  const { taxon } = await import('./consortium-p5-fixtures.mjs');
  const at = null, period = core.TODAY_PERIOD;
  const t = taxon({ traits: { drought_tolerance: 'Medium', moisture_use: null } });
  assert.equal(period, '1991-2020');
  assert.deepEqual(core.factAt('water_need', t, at, period), { drought: 'Medium', moisture: null });
  assert.deepEqual(core.factAt('water_need', taxon({ traits: { drought_tolerance: null, moisture_use: 'High' } }), at, period), { drought: null, moisture: 'High' });
  assert.equal(core.factAt('water_need', taxon({ traits: { drought_tolerance: null, moisture_use: null } }), at, period), null);
  const stored = readFileSync(new URL('../src/lib/consortium/source.ts', import.meta.url), 'utf8');
  for (const gone of ['life_cycle', 'cold_limit', 'heat_limit']) assert.ok(!stored.includes(gone), `${gone}: no reader, so no stored fact (b3g-5)`);
});
