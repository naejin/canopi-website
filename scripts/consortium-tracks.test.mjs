// Stream S2's pure view helpers (design check §6): matrix tracks and runs, the misfit reasons of a
// merged run, the plant list's groups, warning counts, search folding, the stage stepper's bounds,
// and the side view's scale and silhouettes (side.ts and draw.ts, ported from v1 side.js / draw.js
// with v2's dashed first stage and dashed unknown height). No DOM, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMatrix, phases } from '../src/lib/consortium/index.ts';
import { COLLAPSED_CHIPS, MAX_TRACKS, SHARE_AIM, cellOrder, collatorFor, fillPercent, fold, listGroups, matchesFilters, matchesQuery, nameOrder, reasonParts, rowPieces, runReasons, spanOf, startCounts, stepStage, tracksOf, warningCounts } from '../src/islands/consortium/views/tracks.ts';
import { FALLBACK_HEIGHT, LOG_MAX, MAX_SILHOUETTES, SCALE_LINES, heightFrac, lineTop, quantile, shapeOf, sidePlants, usualHeight } from '../src/islands/consortium/views/side.ts';
import { PLOT_H, blob, hash, plantStrokes, reachOf, topOf } from '../src/islands/consortium/views/draw.ts';

const UNSURE = { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' };
const traits = (over = {}) => ({
  height_m: null, width_max_m: null, sun: true, semi_shade: true, full_shade: false, hardiness_zone: null, frost_tender: null, soil_ph: null,
  well_drained: null, moisture_use: null, drought_tolerance: null, fertility_requirement: null, deciduous_evergreen: null, active_growth_period: null,
  bloom_period: null, harvest_period: null, lifespan: null, growth_rate: null, age_of_maturity_years: null, root_depth_min_cm: null,
  taproot_persistent: null, root_system_type: null, mycorrhizal_type: null, nitrogen_fixer: null, edibility_rating: null, self_fertile: null,
  sexual_system: null, pollinators: null, vegetative_spread_rate: null, clonal_growth_form: null, is_annual: null, is_perennial: null, habit: null, ...over,
});
let n = 0;
// A plant in `stratum` from phase `a` to `b` (numbers), height h (m) or null.
function plant(name, stratum, a, b, { h = null, habit = null, role = 'support', ...over } = {}) {
  n++;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, canonical_name: name, genus: name.split(' ')[0], family: null, names: { en: name }, image: null, role,
    stratum: stratum ? { value: stratum, sources: [] } : null,
    phases: a === null ? null : { start: phases[a], end: phases[b], sources: [] },
    functions: null, traits: traits({ height_m: h === null ? null : { min: null, max: h }, habit, ...over }),
    warnings: { toxicity: null, invasive_in: [], allelopathic: null, weed_potential: null },
  };
}
const nameOf = (t) => t.canonical_name;
const byName = nameOrder(nameOf, 'en');

test('tracksOf packs one stratum on fixed tracks: a plant joins the first track that ends before it starts', () => {
  const a = plant('A', 'high', 0, 1), b = plant('B', 'high', 2, 6), c = plant('C', 'high', 1, 3), d = plant('D', 'low', 0, 6), e = plant('E', 'high', null, null);
  const tracks = tracksOf([b, c, a, d, e], 'high', byName);
  assert.deepEqual(tracks.map((t) => t.map(nameOf)), [['A', 'B'], ['C']]);
  // Longer first at the same start, then by name.
  const x = plant('X', 'medium', 0, 2), y = plant('Y', 'medium', 0, 5), z = plant('Z', 'medium', 0, 2);
  assert.deepEqual(tracksOf([x, y, z], 'medium', byName).map((t) => t.map(nameOf)), [['Y'], ['X'], ['Z']]);
  assert.ok(MAX_TRACKS >= 3 && COLLAPSED_CHIPS <= MAX_TRACKS);
});

test('rowPieces merges neighbouring empty cells of one kind only', () => {
  const cell = (phase, empty, members = []) => ({ stratum: 'emergent', phase, members, empty, inList: 0, fitting: 0, reasons: {}, bothReasons: false });
  const pieces = rowPieces([cell(0, 'gap'), cell(1, 'gap'), cell(2, 'misfit'), cell(3, 'misfit'), cell(4, null, ['x']), cell(5, 'misfit'), cell(6, null)]);
  assert.deepEqual(pieces.map((p) => (p.kind === 'run' ? `${p.empty}:${p.from}-${p.to}` : `cell:${p.cell.phase}`)), ['gap:0-1', 'misfit:2-3', 'cell:4', 'misfit:5-5', 'cell:6']);
  assert.ok(pieces.every((p) => !('cells' in p)), 'a run carries its bounds only');
});

test('cellOrder: a collapsed cell lists the plants starting in it first, so each keeps its one Tab stop', () => {
  const early = plant('Aa early', 'high', 0, 4), here1 = plant('Zz here', 'high', 2, 3), here2 = plant('Bb here', 'high', 2, 6), mid = plant('Ab mid', 'high', 1, 2);
  assert.deepEqual(cellOrder([early, here1, mid, here2], 2, byName).map(nameOf), ['Bb here', 'Zz here', 'Aa early', 'Ab mid']);
});

test('nameOrder sorts with one Intl.Collator per page language', () => {
  assert.equal(collatorFor('de'), collatorFor('de'), 'one collator per language');
  const names = ['Zitrone', 'Äpfel', 'Birne'].map((x) => plant(x, 'low', 0, 1));
  assert.deepEqual(names.slice().sort(nameOrder(nameOf, 'de')).map(nameOf), ['Äpfel', 'Birne', 'Zitrone']);
  const sv = ['Zitron', 'Äpple'].map((x) => plant(x, 'low', 0, 1));
  assert.deepEqual(sv.slice().sort(nameOrder(nameOf, 'sv')).map(nameOf), ['Zitron', 'Äpple'], 'the language decides');
});

test('matchesFilters: layer, a stage the plant grows in, and a job; null filters nothing', () => {
  const fixer = plant('Alder', 'high', 2, 5, { nitrogen_fixer: true });
  fixer.functions = [{ function: 'nitrogen_fixer', sources: [] }];
  const none = { layer: null, stage: null, job: null };
  assert.ok(matchesFilters(fixer, none));
  assert.ok(matchesFilters(fixer, { ...none, layer: 'high' }) && !matchesFilters(fixer, { ...none, layer: 'low' }));
  assert.ok(matchesFilters(fixer, { ...none, stage: 4 }) && !matchesFilters(fixer, { ...none, stage: 1 }));
  assert.ok(matchesFilters(fixer, { ...none, job: 'feeds_soil' }) && !matchesFilters(fixer, { ...none, job: 'mulch' }));
  assert.ok(!matchesFilters(plant('N', null, null, null), { ...none, stage: 1 }), 'no placement: in no stage');
});

test('runReasons counts each plant of a merged run once, beside the members; reasonParts words light and water from the site', () => {
  const tall = plant('Tall', 'emergent', 2, 6, { h: 20 }), tall2 = plant('Tall2', 'emergent', 3, 4, { h: 14, sun: true, semi_shade: false }), low = plant('Low', 'low', 0, 3, { h: 0.2 });
  const small = { ...UNSURE, room: 'small', light: 'part' };
  const r = runReasons([tall, tall2, low], [], small, 'emergent', 2, 6);
  assert.equal(r.n, 2);
  // Room is advisory (owner request 2026-11-12): never a reason.
  assert.deepEqual(r.reasons, { light: 1 });
  assert.equal(r.both, false);
  assert.deepEqual(reasonParts(r.reasons, small), [{ word: 'light', n: 1 }]);
  assert.deepEqual(reasonParts({ room: 2, light: 1 }, small), [{ word: 'light', n: 1 }], 'a room count, if any, has no word');
  assert.deepEqual(reasonParts({ light: 1 }, { ...UNSURE, light: 'sun' }), [{ word: 'shade', n: 1 }]);
  assert.deepEqual(reasonParts({ water: 3, soil: 1 }, { ...UNSURE, water: 'wet' }), [{ word: 'wet', n: 3 }, { word: 'soil', n: 1 }]);
  assert.deepEqual(reasonParts({ water: 2 }, { ...UNSURE, water: 'dry' }), [{ word: 'dry', n: 2 }]);
  // The core's matrix agrees: the 20 m plant fits a small garden (advisory), so the cell is free.
  const m = buildMatrix('Temperate', [tall, tall2, low], [], small);
  assert.deepEqual([m.rows[0].cells[3].empty, m.rows[0].cells[3].fitting], [null, 1]);
});

test('listGroups lists each plant once under its start cell, in matrix order; no placement last', () => {
  const a = plant('Apple', 'high', 3, 5), b = plant('Bean', 'emergent', 0, 1), c = plant('Clover', 'low', 1, 3), d = plant('Alder', 'high', 3, 6), e = plant('Ginger', null, null, null);
  const groups = listGroups([a, b, c, d, e, a], byName);
  assert.deepEqual(groups.map((g) => [g.stratum, g.phase, g.plants.map(nameOf)]), [['emergent', 0, ['Bean']], ['high', 3, ['Alder', 'Apple']], ['low', 1, ['Clover']], [null, null, ['Ginger']]]);
  assert.equal(groups.flatMap((g) => g.plants).length, 5, 'each once');
  assert.deepEqual([...startCounts(groups)], [[0, 1], [10, 2], [22, 1]]);
});

test('warningCounts leaves low conflicts out', () => {
  const counts = warningCounts([{ id: 'a', kind: 'conflict', severity: 'low' }, { id: 'a', kind: 'misfit' }, { id: 'b', kind: 'conflict', severity: 'medium' }, { id: 'b', kind: 'toxicity' }, { id: 'c', kind: 'conflict', severity: 'low' }]);
  assert.deepEqual([...counts], [['a', 1], ['b', 2]]);
});

test('fold and matchesQuery: accents and case folded, every query word starts a name word', () => {
  assert.equal(fold('Châtaignier'), 'chataignier');
  assert.equal(fold('Trèfle BLANC'), 'trefle blanc');
  assert.equal(fold('Straße Œillet'), 'strasse oeillet');
  assert.equal(fold('欧洲栗'), '欧洲栗');
  assert.ok(matchesQuery(['European chestnut', 'Castanea sativa'], 'chest'));
  assert.ok(matchesQuery(['Trèfle blanc'], 'tref bl'));
  assert.ok(!matchesQuery(['European chestnut'], 'nut'), 'a word prefix, not a substring');
  assert.ok(matchesQuery(['Anything'], '  '));
});

test('stepStage stays within the seven stages; fillPercent; share aims', () => {
  assert.equal(stepStage(0, -1), 0);
  assert.equal(stepStage(6, 1), 6);
  assert.equal(stepStage(2, 1), 3);
  assert.equal(fillPercent(24, 27), 89);
  assert.equal(fillPercent(0, 0), 0);
  assert.deepEqual(Object.values(SHARE_AIM), [20, 40, 60, 80]);
  assert.deepEqual(spanOf(plant('S', 'low', 1, 4)), { from: 1, to: 4 });
  assert.equal(spanOf(plant('N', null, null, null)), null);
});

test('side scale: logarithmic, clamped, lines at 1, 5 and 20 m from the top', () => {
  assert.equal(heightFrac(null), 0);
  assert.equal(heightFrac(0), 0);
  assert.equal(heightFrac(LOG_MAX * 2), 1);
  assert.ok(heightFrac(1) < heightFrac(5) && heightFrac(5) < heightFrac(20));
  assert.deepEqual([...SCALE_LINES], [1, 5, 20]);
  assert.ok(lineTop(20) < lineTop(5) && lineTop(5) < lineTop(1) && lineTop(1) < 100);
  assert.equal(quantile([1, 2, 3], 0.5), 2);
  assert.equal(quantile([], 0.5), null);
});

test('sidePlants: the stage\'s members by layer then height; dashed in the first stage and when the height is not recorded', () => {
  const oak = plant('Oak', 'emergent', 3, 6, { h: 30, habit: 'Tree' });
  const hazel = plant('Hazel', 'medium', 2, 5, { h: 6, habit: 'Shrub' });
  const phacelia = plant('Phacelia', 'low', 1, 3, { h: null });
  const bean = plant('Bean', 'emergent', 0, 1, { h: 3, habit: 'Climber' });
  const once = plant('Once', 'low', 3, 3, { h: 0.4 });
  const drawn = sidePlants([phacelia, hazel, oak, bean, once], 3, [], byName);
  assert.deepEqual(drawn.map((p) => p.taxon.canonical_name), ['Oak', 'Hazel', 'Once', 'Phacelia']);
  const by = Object.fromEntries(drawn.map((p) => [p.taxon.canonical_name, p]));
  assert.equal(by.Oak.first, true, 'Oak starts here and spans more: first stage');
  assert.equal(by.Oak.dashed, true);
  assert.equal(by.Once.first, false, 'a one-stage plant is not marked first');
  assert.equal(by.Once.dashed, false);
  assert.equal(by.Hazel.dashed, false);
  assert.equal(by.Phacelia.height, null);
  assert.equal(by.Phacelia.dashed, true, 'height not recorded: dashed');
  assert.equal(by.Phacelia.frac, heightFrac(0.4), 'drawn at the usual height of its layer among the plants drawn');
  assert.equal(usualHeight('low', [phacelia], []), FALLBACK_HEIGHT.low);
  assert.equal(shapeOf(bean), 'climber');
  assert.equal(shapeOf(phacelia), 'herb');
  assert.ok(MAX_SILHOUETTES === 20);
});

test('plantStrokes: deterministic, tops out near the drawn height, dashed outlines when dashed', () => {
  for (const shape of ['tree', 'shrub', 'herb', 'climber']) {
    const solid = plantStrokes({ id: 'x', shape, frac: 0.5, dashed: false });
    const dashed = plantStrokes({ id: 'x', shape, frac: 0.5, dashed: true });
    assert.deepEqual(plantStrokes({ id: 'x', shape, frac: 0.5, dashed: false }), solid, `${shape}: same id, same shape`);
    assert.ok(solid.every((s) => !s.dashed) && dashed.every((s) => s.dashed), `${shape}: dashed follows the flag`);
    const top = topOf(solid), want = PLOT_H - 0.5 * PLOT_H;
    assert.ok(Math.abs(top - want) <= 0.2 * PLOT_H, `${shape}: tops out at ${top}, near ${want}`);
    assert.ok(solid.some((s) => s.fillOpacity !== null) || shape === 'herb', `${shape}: something is filled`);
  }
  assert.ok(plantStrokes({ id: 'y', shape: 'tree', frac: 0.5, dashed: true }).every((s) => s.fillOpacity === null || s.fillOpacity <= 0.1), 'a dashed plant has a light fill');
  assert.match(blob(0, 0, 2, 2, 0.3, 5), /^M[-\d.]+,[-\d.]+(C[^Z]+)+Z$/);
  assert.ok(hash('a') >= 0 && hash('a') < 1 && hash('a') !== hash('b'));
});

test('plants and scale lines share one coordinate system: a tree or a shrub of 5 m tops out on the 5 m line', () => {
  for (const m of SCALE_LINES) for (const shape of ['tree', 'shrub']) for (const id of ['a', 'line', 'zz']) {
    const top = topOf(plantStrokes({ id, shape, frac: heightFrac(m), dashed: false }));
    assert.ok(Math.abs(top / PLOT_H * 100 - lineTop(m)) < 1, `${shape} ${id} : ` + `${m} m: tree top ${(top / PLOT_H * 100).toFixed(1)} %, line ${lineTop(m).toFixed(1)} %`);
  }
});

test('reachOf: how far a plant reaches sideways, strokes included', () => {
  const tree = plantStrokes({ id: 'r', shape: 'tree', frac: 0.9, dashed: false });
  const r = reachOf(tree);
  assert.ok(r > 3.5 && r <= 13 * 1.11 + 1, `a tall tree's crown: ${r}`);
  assert.ok(reachOf(plantStrokes({ id: 'r', shape: 'herb', frac: 0.1, dashed: false })) < r, 'a low herb reaches less');
});
