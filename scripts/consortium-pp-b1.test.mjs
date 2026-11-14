// PP-B streams b1a (your place, arriving and sharing) and b1b (the pool count into Place): their unit
// tests (plant-palette-slices, PP-B rows). Commit 0 moved two F1a markers here unchanged (they still
// fail for their stated reason after 0a): the suggestion's invasive tie, which b1a makes pass in
// suggest.ts (expected-fail, owner in each title, scripts/expect-fail.mjs failing(); the owner removes
// the marker in the commit that makes it pass).
import assert from 'node:assert/strict';
import { UNSURE_SITE } from '../src/lib/consortium/index.ts';
import { suggest } from '../src/lib/consortium/suggest.ts';
import { failing } from './expect-fail.mjs';
import { taxon } from './consortium-p5-fixtures.mjs';

let n = 0;
const fn = (f) => ({ function: f, method: 'curated', sources: [] });
const plant = (over = {}) => {
  const k = ++n;
  return taxon({ id: `00000000-9a1e-4000-8000-${String(k).padStart(12, '0')}`, canonical_name: over.canonical_name ?? `Plantus ${String(k).padStart(3, '0')}`, genus: `Plantus${k}`, role: 'support', ...over });
};

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

failing('F1a-P12 → PP-B (b1a invasive tie, A10): of two plants that bring the same, the suggestion picks the one not invasive in the chosen country', { owner: 'b1a', reason: /picked the plant invasive in FR on a tie/ }, () => {
  const [inv, plain] = tied();
  const picked = suggest([inv, plain], suggestCtx({ country: 'FR', countryStatus: 'checked' })).members;
  assert.ok(!picked.includes(inv.id), `picked the plant invasive in FR on a tie (${picked.length} picked)`);
  assert.ok(picked.includes(plain.id));
});

failing('F1a-P13 → PP-B (b1a invasive tie, owner Q1): with no country chosen, the tie goes to the plant invasive in no GRIIS country', { owner: 'b1a', reason: /picked the plant invasive in a GRIIS country on a tie/ }, () => {
  const [inv, plain] = tied();
  const picked = suggest([inv, plain], suggestCtx()).members;
  assert.ok(!picked.includes(inv.id), `picked the plant invasive in a GRIIS country on a tie (${picked.length} picked)`);
  assert.ok(picked.includes(plain.id));
});
