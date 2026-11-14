// What print draws (stream b2 owns this file in PP-B chunk 1; plant-palette-slices section 1b): the
// side drawing's scale and silhouettes (views/side.ts and draw.ts, ported from v1 side.js / draw.js
// with v2's dashed first stage and dashed unknown height) and the warnings a plant's marks count
// (views/kit/phase.ts warningCounts, drawn in the drawing's key). Moved from consortium-tracks.test.mjs
// when PP-B commit 0a' deleted views/tracks.ts and the matrix it served. No DOM, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { phases } from '../src/lib/consortium/index.ts';
import { warningCounts } from '../src/islands/consortium/views/kit/phase.ts';
import { nameOrder } from '../src/islands/consortium/views/kit/names.ts';
import { FALLBACK_HEIGHT, LOG_MAX, MAX_SILHOUETTES, SCALE_LINES, heightFrac, lineTop, quantile, shapeOf, sidePlants, usualHeight } from '../src/islands/consortium/views/side.ts';
import { PLOT_H, blob, hash, plantStrokes, reachOf, topOf } from '../src/islands/consortium/views/draw.ts';

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

test('warningCounts leaves low conflicts out', () => {
  const counts = warningCounts([{ id: 'a', kind: 'conflict', severity: 'low' }, { id: 'a', kind: 'misfit' }, { id: 'b', kind: 'conflict', severity: 'medium' }, { id: 'b', kind: 'toxicity' }, { id: 'c', kind: 'conflict', severity: 'low' }]);
  assert.deepEqual([...counts], [['a', 1], ['b', 2]]);
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
