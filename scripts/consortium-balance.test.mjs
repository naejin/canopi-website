// F1a stream 4 (Balance; plan F1a stream 4, design check A3, A19-A22): the Balance checks in core,
// src/lib/consortium/balance.ts, a registry of separate checks (no score) that the health strip and
// the Balance panel both read. Commit 0 lays the registry's signature with every check 'not-checked';
// the checks below are written failing (expected-fail, owner bal2, scripts/expect-fail.mjs failing())
// and bal2 removes each marker in the commit that makes it pass (bal3 the evergreen case after D2a).
//
// The contract (commit 0; bal2 may widen BalanceContext within its chunk, keeping the cases):
//   balanceChecks(members, { climate, location, period, factAt }) -> BalanceCheck[] in balanceCheckIds order
//   BalanceCheck { id, state: ok | gap | waiting | not-enough-data | not-checked, n, m, detail, preset, confidence? }
//   - detail: what the check's line names (the plants, families, months behind it; types.ts BalanceDetail);
//   - n of the m members are recorded for the check; a check without data never passes (A20);
//   - preset: what its "Find…" opens Add with (A22): the nearest approved filter and the check's line as hint.
import assert from 'node:assert/strict';
import test from 'node:test';
import { balanceCheckIds, balanceChecks, balanceStates, factAt, TODAY_PERIOD } from '../src/lib/consortium/index.ts';
import { failing } from './expect-fail.mjs';
import { lyon, taxon } from './consortium-p5-fixtures.mjs';

let n = 0;
const plant = (over = {}) => taxon({ id: `00000000-ba1a-4000-8000-${String(++n).padStart(12, '0')}`, canonical_name: `Plantus ${n}`, genus: `Plantus${n}`, ...over });
const ctx = (over = {}) => ({ climate: 'Temperate', location: lyon, period: TODAY_PERIOD, factAt, ...over });
const check = (members, id, over) => balanceChecks(members, ctx(over)).find((c) => c.id === id);

// A diverse set: eight families, water needs recorded for each.
const WATER = ['Low', 'Medium', 'High'];
const diverse = () => ['Fagaceae', 'Rosaceae', 'Fabaceae', 'Lamiaceae', 'Asteraceae', 'Betulaceae', 'Juglandaceae', 'Ericaceae']
  .map((family, i) => plant({ family, traits: { drought_tolerance: WATER[i % 3], moisture_use: WATER[(i + 1) % 3] } }));
// Legume-heavy (the Tropical palette of the design check's scenario): six of eight in Fabaceae.
const legumes = () => [...Array.from({ length: 6 }, () => plant({ family: 'Fabaceae', genus: `Inga${++n}` })), plant({ family: 'Musaceae' }), plant({ family: 'Rubiaceae' })];

test('F1a balance registry (commit 0, A3): one check per id in order, each state from the closed set, 0 ≤ n ≤ m = members, a preset or null', () => {
  for (const members of [[], diverse(), legumes()]) {
    for (const over of [{}, { location: null }, { climate: 'Tropical' }]) {
      const checks = balanceChecks(members, ctx(over));
      assert.deepEqual(checks.map((c) => c.id), [...balanceCheckIds]);
      for (const c of checks) {
        assert.ok(balanceStates.includes(c.state), `${c.id}: state ${c.state}`);
        assert.ok(Number.isInteger(c.n) && c.n >= 0 && c.n <= c.m, `${c.id}: ${c.n} of ${c.m}`);
        assert.equal(c.m, members.length, `${c.id}: m counts the members`);
        assert.ok(c.preset === null || typeof c.preset === 'object', `${c.id}: a preset or null`);
        const ids = new Set(members.map((t) => t.id));
        assert.ok(c.detail && typeof c.detail === 'object', `${c.id}: a detail`);
        assert.ok((c.detail.plants ?? []).every((id) => ids.has(id)), `${c.id}: the plants it names are members`);
      }
    }
  }
});

test('F1a balance: a check without data never passes, and none passes on no members (A20 "n of m recorded")', () => {
  const unrecorded = Array.from({ length: 5 }, () => plant({ family: null, traits: {}, climate: null }));
  for (const members of [[], unrecorded]) {
    for (const c of balanceChecks(members, ctx())) assert.notEqual(c.state, 'ok', `${c.id} passes with ${c.n} of ${c.m} recorded`);
  }
});

test('F1a balance: with no site location the climate-margin check says not checked (the checks say "set your location")', () => {
  assert.equal(check(diverse(), 'margin', { location: null }).state, 'not-checked');
});

failing('F1a-B1 (bal2 family spread, A20): six of eight members in one family is a gap whose "Find…" opens Add with a hint; eight families pass', { owner: 'bal2', reason: /family spread: .* is a gap \(not-checked today\)/ }, () => {
  const heavy = check(legumes(), 'family');
  assert.equal(heavy.state, 'gap', `family spread: six of eight in Fabaceae is a gap (${heavy.state} today)`);
  assert.equal(heavy.n, 8, 'every member has a family recorded');
  assert.ok(heavy.preset?.hint?.key, '"Find…" carries the check\'s line as a hint (A22)');
  assert.deepEqual(heavy.detail.families, ['Fabaceae'], 'the line names the family too many share');
  assert.equal(heavy.detail.plants?.length, 6, 'and the six members in it');
  assert.equal(check(diverse(), 'family').state, 'ok', 'eight families pass');
});

failing('F1a-B2 (bal2 water mix, A20): a Tropical palette with two of ten water needs recorded says "not enough data", 2 of 10, never a pass', { owner: 'bal2', reason: /water mix: 2 of 10 recorded is not enough data \(not-checked today\)/ }, () => {
  const members = [...Array.from({ length: 2 }, () => plant({ traits: { drought_tolerance: 'Low' } })), ...Array.from({ length: 8 }, () => plant({ traits: {} }))];
  const water = check(members, 'water', { climate: 'Tropical' });
  assert.equal(water.state, 'not-enough-data', `water mix: 2 of 10 recorded is not enough data (${water.state} today)`);
  assert.deepEqual([water.n, water.m], [2, 10]);
});

// bal3 (chunk 3, after the D2a reinstall) turns the evergreen check on: it takes 'evergreen' out of this
// list in the same commit as its persona case (owners file, bal3's duty).
failing('F1a-B3 (bal2 waiting checks, A20, A21): roots, insect-habitat months, active season, flowering (until the hemisphere stamp) and evergreen (until D2a) wait for data', { owner: 'bal2', reason: /is waiting for data \(not-checked today\)/ }, () => {
  const checks = balanceChecks(diverse(), ctx());
  for (const id of ['roots', 'insects', 'season', 'flowering', 'evergreen']) {
    const c = checks.find((x) => x.id === id);
    assert.equal(c.state, 'waiting', `${id} is waiting for data (${c.state} today)`);
  }
});

failing('F1a-B4 (bal2 borrowed climate, A20, A15): on a borrowed list every check that ran carries the estimate term', { owner: 'bal2', reason: /carries no estimate term on a borrowed list/ }, () => {
  const borrowed = legumes().map((t) => ({ ...t, origin: { list: 'Mediterranean', kind: 'borrowed' } }));
  const ran = balanceChecks(borrowed, ctx({ climate: 'Arid' })).filter((c) => c.state === 'ok' || c.state === 'gap');
  assert.ok(ran.length, 'family spread ran on a borrowed list, carries no estimate term on a borrowed list (no check ran today)');
  for (const c of ran) assert.equal(c.confidence?.term, 'estimate', `${c.id} carries no estimate term on a borrowed list`);
});
