// F1a stream 1 (Palette and Structure; plan F1a stream 1, design check A3, A4, A8, A10, §5): the
// lasting layer under the Palette view: core src/lib/consortium/palette.ts (role groups, counts, the
// health summary; pal1 in chunk 1, pal2 its strip and gap list in chunk 2) and the suggestion's tie
// rules (suggest.ts, pal1). Written failing in commit 0 (expected-fail, owner in each title,
// scripts/expect-fail.mjs failing()); the owner removes each marker in the commit that makes it pass.
//
// The contract this test proposes (the owner may rename within its chunk, keeping the cases):
//   paletteGroups(members, crops) -> { job: JobId | null, plants: { id, also: JobId[] }[] }[]
//     A4: a Main crop (crops) or a feeds_you plant in the feeds_you group, first; else the first job of
//     the plant in jobIds order, its other jobs in `also`; no job: the group with job null, last;
//     each plant once; groups in jobIds order;
//   healthSummary({ members, guestsPending, ... }) -> { gaps: 'loading' | JobGap[], ... } (pal2):
//     a guest list still loading never shows a false gap (design check §5 Busy).
import assert from 'node:assert/strict';
import test from 'node:test';
import { jobIds, jobsOf, UNSURE_SITE } from '../src/lib/consortium/index.ts';
import { suggest } from '../src/lib/consortium/suggest.ts';
import { failing } from './expect-fail.mjs';
import { taxon } from './consortium-p5-fixtures.mjs';

// The module the stream adds; through a variable so knip does not count a commit-0 import as unresolved.
const PALETTE_MODULE = new URL('../src/lib/consortium/palette.ts', import.meta.url).href;
const palette = () => import(PALETTE_MODULE);
const NO_MODULE = /Cannot find module .*palette\.ts/;
let n = 0;
const fn = (f) => ({ function: f, method: 'curated', sources: [] });
const plant = (over = {}) => {
  const k = ++n;
  return taxon({ id: `00000000-9a1e-4000-8000-${String(k).padStart(12, '0')}`, canonical_name: over.canonical_name ?? `Plantus ${String(k).padStart(3, '0')}`, genus: `Plantus${k}`, role: 'support', ...over });
};

failing('F1a-P10 (pal1 cards by role, A4): Main crops and food first, then each plant under its first job with the others as "also", each plant once', { owner: 'pal1', reason: NO_MODULE }, async () => {
  const { paletteGroups } = await palette();
  const apple = plant({ role: 'crop' });
  const beans = plant({ role: 'support', functions: [fn('nitrogen_fixer'), fn('ground_cover')] }); // a Main crop ticked on Start
  const comfrey = plant({ functions: [fn('dynamic_accumulator'), fn('insectary')] });
  const bare = plant({ functions: null });
  const groups = paletteGroups([comfrey, bare, beans, apple], [beans.id]);
  const order = groups.map((g) => g.job);
  assert.equal(order[0], 'feeds_you', 'food first');
  assert.deepEqual(order.filter((j) => j !== null), jobIds.filter((j) => order.includes(j)), 'groups in jobIds order');
  assert.equal(order.at(-1), null, 'plants with no job last');
  const where = new Map(groups.flatMap((g) => g.plants.map((p) => [p.id, { job: g.job, also: p.also }])));
  assert.equal(groups.flatMap((g) => g.plants).length, 4, 'each plant once');
  assert.equal(where.get(beans.id).job, 'feeds_you', 'a Main crop in the food group');
  assert.deepEqual(where.get(beans.id).also, jobsOf(beans), 'its own jobs as also');
  assert.equal(where.get(apple.id).job, 'feeds_you');
  assert.deepEqual(where.get(comfrey.id), { job: 'mulch', also: ['helpers'] });
  assert.equal(where.get(bare.id).job, null);
});

failing('F1a-P11 (pal2 guest list loading, design check §5 Busy): while a guest\'s list is still loading the gaps say loading, never a false gap', { owner: 'pal2', reason: NO_MODULE }, async () => {
  const { healthSummary } = await palette();
  const members = [plant({ role: 'crop' })];
  assert.equal(healthSummary({ members, guestsPending: ['Tropical'] }).gaps, 'loading');
  const ready = healthSummary({ members, guestsPending: [] }).gaps;
  assert.ok(Array.isArray(ready) && ready.some((g) => g.missing.length), 'with every list read, the job gaps');
});

// A10 + owner Q1 (decision row "F1a design-check answers"): between plants that bring the same to the
// consortium, the suggestion picks the one not invasive in the chosen country, or, with no country
// chosen, not invasive in any GRIIS country. Invasiveness still never scores beyond the tie, and an
// invasive plant stays addable with its warning. Two plants equal in every gain term, the invasive one
// first in today's tie order (canonical name).
const tied = () => {
  const twin = { stratum: { value: 'low', sources: [] }, phases: { start: 'placenta_i', end: 'climax', sources: [] }, functions: [fn('insectary')] }; // helpers: no second-doer gain, so only one is picked
  return [plant({ ...twin, canonical_name: 'Aaa invasiva', warnings: { toxicity: null, invasive_in: [{ country: 'FR', sources: ['griis'] }], allelopathic: null, weed_potential: null } }), plant({ ...twin, canonical_name: 'Bbb modesta' })];
};
const suggestCtx = (over) => ({ site: UNSURE_SITE, interactions: [], country: null, countryStatus: 'none', ...over });

failing('F1a-P12 (pal1 invasive tie, A10): of two plants that bring the same, the suggestion picks the one not invasive in the chosen country', { owner: 'pal1', reason: /picked the plant invasive in FR on a tie/ }, () => {
  const [inv, plain] = tied();
  const picked = suggest([inv, plain], suggestCtx({ country: 'FR', countryStatus: 'checked' })).members;
  assert.ok(!picked.includes(inv.id), `picked the plant invasive in FR on a tie (${picked.length} picked)`);
  assert.ok(picked.includes(plain.id));
});

failing('F1a-P13 (pal1 invasive tie, owner Q1): with no country chosen, the tie goes to the plant invasive in no GRIIS country', { owner: 'pal1', reason: /picked the plant invasive in a GRIIS country on a tie/ }, () => {
  const [inv, plain] = tied();
  const picked = suggest([inv, plain], suggestCtx()).members;
  assert.ok(!picked.includes(inv.id), `picked the plant invasive in a GRIIS country on a tie (${picked.length} picked)`);
  assert.ok(picked.includes(plain.id));
});
