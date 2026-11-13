// E6 stream R2 (design check §3 chunk 2, §7.1 "Add/PlantList filter rule"): one filter rule,
// src/islands/consortium/rules/list-query.ts, for Add's rows (a cell or run of one layer, a job,
// "Show them anyway": the misfits beside the members' canopy left out unless anyway) and the plant
// list's filters (layer, stage, job). Written failing in commit 0 (expected-fail, owner R2); R2 removed
// the marker in the commit that added the module. The oracle below is the code before it, copied from
// views/Add.tsx (base) and views/tracks.ts (matchesFilters), so the rule returns those results.
//
// The contract this test fixes (R2 may rename within its chunk, keeping the cases):
//   listQuery(pool, { stratum, from, to, job, site, canopy, anyway }) -> Taxon[] in pool order
//   - stratum/from/to: a cell or run (Add) or a layer and one stage (the list); null: any;
//   - site: the site answers, or null for no fit filter (the plant list); canopy: the members' taxa.
import assert from 'node:assert/strict';
import test from 'node:test';
import { canopyOf, fits, jobsOf, misfitsBeside, phaseOrd } from '../src/lib/consortium/index.ts';
import { taxon } from './consortium-p5-fixtures.mjs';

const SITE = { light: 'sun', soil: 'unsure', water: 'unsure', room: 'unsure' };
const SHADE = { ...SITE, light: 'shade' };
let n = 0;
const plant = (stratum, start, end, over = {}) => taxon({
  id: `00000000-e6e6-4000-8000-${String(++n).padStart(12, '0')}`,
  canonical_name: `Plantus ${n}`,
  stratum: stratum ? { value: stratum, sources: [] } : null,
  phases: start ? { start, end, sources: [] } : null,
  ...over,
});
const POOL = [
  plant('emergent', 'secondary_i', 'climax', { traits: { sun: true, semi_shade: false, full_shade: false } }),
  plant('high', 'placenta_iii', 'secondary_iii', { traits: { sun: true, semi_shade: true, full_shade: false } }),
  plant('low', 'placenta_i', 'placenta_ii', { role: 'support', functions: [{ function: 'nitrogen_fixer', method: 'curated', sources: [] }], traits: { sun: false, semi_shade: false, full_shade: true } }),
  plant('low', 'placenta_i', 'secondary_ii', { traits: { sun: true, semi_shade: true, full_shade: true } }),
  plant('medium', 'secondary_ii', 'climax', { role: 'support', traits: {} }),
  plant(null, null, null),
];

// Today's rules (the oracle).
const growsIn = (t, stratum, from, to) => (!stratum || t.stratum?.value === stratum) && !!t.phases && phaseOrd(t.phases.start) <= to && phaseOrd(t.phases.end) >= from;
function addBase(pool, { cell, job, anyway, site, canopy }) {
  const c = canopyOf(canopy);
  return pool.filter((t) => {
    if (job && !jobsOf(t).includes(job)) return false;
    if (!cell) return true;
    if (!growsIn(t, cell.stratum, cell.from, cell.to)) return false;
    if (anyway) return true;
    return !misfitsBeside(t, site, c, fits(t, site)).length;
  });
}
const spans = (t, stage) => !!t.phases && phaseOrd(t.phases.start) <= stage && stage <= phaseOrd(t.phases.end);
const listBase = (pool, { layer, stage, job }) => pool.filter((t) => (layer === null || t.stratum?.value === layer) && (stage === null || spans(t, stage)) && (job === null || jobsOf(t).includes(job)));

const ADD_CASES = [
  { name: 'no cell, no job: every plant', cell: null, job: null, anyway: false, site: SITE, canopy: [] },
  { name: 'a cell on a sunny site', cell: { stratum: 'low', from: 0, to: 0 }, job: null, anyway: false, site: SITE, canopy: [] },
  { name: 'a run of one layer in shade, the misfits left out', cell: { stratum: 'low', from: 0, to: 4 }, job: null, anyway: false, site: SHADE, canopy: [] },
  { name: 'the same run, anyway: the misfits listed', cell: { stratum: 'low', from: 0, to: 4 }, job: null, anyway: true, site: SHADE, canopy: [] },
  { name: 'a shade misfit beside a members\' canopy', cell: { stratum: 'low', from: 3, to: 6 }, job: null, anyway: false, site: SITE, canopy: [POOL[0]] },
  { name: 'a job with a cell', cell: { stratum: 'low', from: 0, to: 1 }, job: 'feeds_soil', anyway: false, site: SITE, canopy: [] },
  { name: 'a job alone', cell: null, job: 'feeds_you', anyway: false, site: SITE, canopy: [] },
];
const LIST_CASES = [
  { layer: null, stage: null, job: null },
  { layer: 'low', stage: null, job: null },
  { layer: null, stage: 5, job: null },
  { layer: 'high', stage: 3, job: 'feeds_you' },
];

test('E6 list-query (R2 rules): one listQuery returns Add\'s and the plant list\'s current results on fixture cases', async () => {
  const { listQuery } = await import('../src/islands/consortium/rules/list-query.ts');
  const ids = (list) => list.map((t) => t.id);
  for (const c of ADD_CASES) {
    const got = listQuery(POOL, { stratum: c.cell?.stratum ?? null, from: c.cell?.from ?? null, to: c.cell?.to ?? null, job: c.job, site: c.cell ? c.site : null, canopy: c.canopy, anyway: c.anyway });
    assert.deepEqual(ids(got), ids(addBase(POOL, c)), `Add: ${c.name}`);
  }
  for (const f of LIST_CASES) {
    const got = listQuery(POOL, { stratum: f.layer, from: f.stage, to: f.stage, job: f.job, site: null, canopy: [], anyway: true });
    assert.deepEqual(ids(got), ids(listBase(POOL, f)), `plant list: ${JSON.stringify(f)}`);
  }
});

test('E6 list-query (R2 rules): Add\'s and the plant list\'s queries as the views build them, and Add\'s row order', async () => {
  const { addOrder, addQuery, filtersQuery, listQuery, matchesFilters } = await import('../src/islands/consortium/rules/list-query.ts');
  const ids = (list) => list.map((t) => t.id);
  for (const c of ADD_CASES) {
    assert.deepEqual(ids(listQuery(POOL, addQuery({ cell: c.cell, job: c.job, anyway: c.anyway }, c.site, c.canopy))), ids(addBase(POOL, c)), `Add: ${c.name}`);
  }
  for (const f of LIST_CASES) {
    assert.deepEqual(ids(listQuery(POOL, filtersQuery(f))), ids(listBase(POOL, f)), `plant list: ${JSON.stringify(f)}`);
    assert.deepEqual(ids(POOL.filter((t) => matchesFilters(t, f))), ids(listBase(POOL, f)), `matchesFilters: ${JSON.stringify(f)}`);
  }
  // A job's stage gap: a run of stages in any layer (stratum null); a plant with no placement is out.
  assert.deepEqual(ids(listQuery(POOL, addQuery({ cell: { stratum: null, from: 0, to: 0 }, job: null, anyway: true }, SITE, []))), ids(POOL.filter((t) => t.phases && phaseOrd(t.phases.start) === 0)));
  // Asking rows last, then named in more languages, then by scientific name.
  const named = (id, names, canonical) => ({ t: { id, names, canonical_name: canonical }, asks: false });
  const rows = [{ ...named('a', { en: 'A' }, 'Zeta'), asks: true }, named('b', {}, 'Beta'), named('c', { en: 'C', fr: 'C' }, 'Gamma'), named('d', {}, 'Alpha')];
  assert.deepEqual(addOrder(rows).map((r) => r.t.id), ['c', 'd', 'b', 'a']);
});
