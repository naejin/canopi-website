// PP-B stream b3 (plant-palette-slices section 2, row b3; plant-palette-architecture 2, inventory P39 and
// F5): the lasting layer under "Your plants" and "Things to weigh". Core weigh.ts on its vectors
// (scripts/vectors/weigh.json, the shared envelope of conventions/palette-vectors); the three F1a
// Balance markers parked by PP-B commit 0 (scripts/plan/parked-markers.json: F1a-B1, B2, B4), restored
// from 648baf2's consortium-balance.test.mjs and rewritten on weigh.ts. Written failing first
// (scripts/expect-fail.mjs failing(), owner b3 in each title).
import assert from 'node:assert/strict';
import test from 'node:test';
import { failing } from './expect-fail.mjs';
import { taxon } from './consortium-p5-fixtures.mjs';

const { weighLines } = await import('../src/lib/consortium/weigh.ts');

// ---- the parked Balance markers, rewritten on weigh.ts (F1a-B1, B2, B4 at 648baf2) ----
let n = 0;
const plant = (over = {}) => taxon({ id: `00000000-ba1a-4000-8000-${String(++n).padStart(12, '0')}`, canonical_name: `Plantus ${n}`, genus: `Plantus${n}`, ...over });
// A diverse set: eight families, water needs recorded for each.
const WATER = ['Low', 'Medium', 'High'];
const diverse = () => ['Fagaceae', 'Rosaceae', 'Fabaceae', 'Lamiaceae', 'Asteraceae', 'Betulaceae', 'Juglandaceae', 'Ericaceae']
  .map((family, i) => plant({ family, traits: { drought_tolerance: WATER[i % 3], moisture_use: WATER[(i + 1) % 3] } }));
// Legume-heavy (the Tropical palette of the design check's scenario): six of eight in Fabaceae.
const legumes = () => [...Array.from({ length: 6 }, () => plant({ family: 'Fabaceae', genus: `Inga${++n}` })), plant({ family: 'Musaceae' }), plant({ family: 'Rubiaceae' })];
const lines = (members, opts) => { const out = weighLines(members, opts); assert.ok(Array.isArray(out), 'lines, not "checking"'); return out; };
const said = (l) => l.line.key.split('.').pop();

failing('b3-B1 (b3 family spread on weigh.ts, F1a-B1 restored, A20): six of eight members in one family is a line to weigh naming the family and its six; eight families give no family line', { owner: 'b3', reason: /family spread: six of eight in Fabaceae gives no line to weigh/ }, () => {
  const members = legumes();
  const heavy = lines(members).find((l) => l.kind === 'family');
  assert.ok(heavy, 'family spread: six of eight in Fabaceae gives no line to weigh (none today)');
  assert.equal(heavy.line.vars.family, 'Fabaceae', 'the line names the family too many share');
  assert.deepEqual([heavy.line.vars.n, heavy.line.vars.m], [6, 8]);
  assert.deepEqual(heavy.members, members.slice(0, 6).map((t) => t.id), 'and the six members in it');
  assert.equal(lines(diverse()).filter((l) => l.kind === 'family').length, 0, 'eight families: no family line, and no pass claimed');
});

failing('b3-B2 (b3 water needs on weigh.ts, F1a-B2 restored, A20): two of ten water needs recorded says "not enough to judge", 2 of 10, never a pass', { owner: 'b3', reason: /water needs: 2 of 10 recorded is not "not enough to judge"/ }, () => {
  const members = [...Array.from({ length: 2 }, () => plant({ traits: { drought_tolerance: 'Low' } })), ...Array.from({ length: 8 }, () => plant({ traits: {} }))];
  const water = lines(members).find((l) => l.kind === 'water');
  assert.equal(water && said(water), 'waterFew', `water needs: 2 of 10 recorded is not "not enough to judge" (${water ? said(water) : 'no line'} today)`);
  assert.deepEqual([water.line.vars.n, water.line.vars.m], [2, 10]);
});

failing('b3-B4 (b3 borrowed list on weigh.ts, F1a-B4 restored, A20, A15): on a borrowed list every weigh line carries the estimate term', { owner: 'b3', reason: /carries no estimate term on a borrowed list/ }, () => {
  const borrowed = legumes().map((t) => ({ ...t, origin: { list: 'Mediterranean', kind: 'borrowed' } }));
  const out = lines(borrowed);
  assert.ok(out.length, 'a weigh line on a borrowed list, carries no estimate term on a borrowed list (no line today)');
  for (const l of out) assert.equal(l.line.vars.term, 'estimate', `${l.kind} carries no estimate term on a borrowed list`);
  assert.ok(lines(legumes()).every((l) => l.line.vars.term === undefined), 'an own list carries none');
});
