// PP-C stream pf-a, the palette-page unit rows still standing after pf-a commit 0 (v14): the hole
// title in one form and the room note (Balcony board). Each case still failing is marked expected-fail
// (scripts/expect-fail.mjs failing(), owner pf-a); pf-a removes a marker in the commit that makes it pass.
// Dropped in pf-a commit 0 (old code never binds): u16 (a holes.ts `counts` predicate wired into the
// picture: pf-b's picture, and holes() already leaves an outside member out), u17 (fillerReason: the
// warning words are kit/flags.ts flagLines on the row), u19 (a "spreads" line: on no v14 board), u20
// (change-summary removedSummary/addedSummary: replaced by 0W holeChange and its toast words).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const line = await import('../src/lib/palette/verdict-line.ts');
const en = JSON.parse(readFileSync(new URL('../src/i18n/translations/en.json', import.meta.url), 'utf8'));
// A Line in English words: {vars} filled, a plural key's "other:" form with # as the count.
const say = (l) => {
  if (!l) return null;
  let w = en[l.key] ?? `<${l.key}>`;
  if (/^\s*(one|other):/.test(w)) w = (w.split('|').map((s) => s.trim()).find((s) => s.startsWith(l.count === 1 ? 'one:' : 'other:')) ?? w).replace(/^(one|other):\s*/, '').replace(/#/g, String(l.count));
  // {len} in metres, as format.ts writes it in English ("20 m").
  return w.replace(/\{(\w+)\}/g, (_, k) => (k === 'len' && l.vars?.[k] !== undefined ? `${l.vars[k]} m` : String(l.vars?.[k] ?? `{${k}}`)));
};

test('PP-C-u18 (pf-a hole titles U5, owner Q1 one form): a hole title is one statement, the light level first ("Full sun: nobody in the first 3 years")', () => {
  const h = { id: 'light:emergent:0-3', kind: 'light', rank: 2, stratum: 'emergent', fromYear: 0, toYear: 3, state: 'open' };
  const t = line.holeTitleLine(h);
  assert.equal(say({ ...t, vars: { lane: say(t.parts.lane), span: say(t.parts.span) } }), 'Full sun: nobody in the first 3 years', 'U5: one statement');
});

test('PP-C-u21 (pf-a room note #5, Balcony board): a plant taller than the room carries "Grows to 20 m: keep it pruned, or pick a smaller plant" in pots, nothing when the height is unknown', () => {
  assert.equal(say(line.roomNote(20, 'pots')), 'Grows to 20 m: keep it pruned, or pick a smaller plant');
  assert.equal(line.roomNote(null, 'pots'), null);
  assert.equal(line.roomNote(2, 'field'), null);
});
