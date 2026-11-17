// PP-C stream pf, the palette-page fixes (plant-palette-slices section 3.4, pf unit rows): the lasting
// rows are the picture and hole models; the words are scenario checks of text the grower reads (the
// screens will be reworked). Written failing in PP-C commit 0, each case marked expected-fail
// (scripts/expect-fail.mjs failing(), owner pf in its title); pf removes a marker in the commit that
// makes it pass. pf starts after c1 and c2 merge (chunk 2).
//
// The contract these cases propose (pf may rename within its chunk, keeping the cases):
//   holes.ts          counts(t, verdicts) -> boolean: a member counts toward the holes unless it is
//                     outside its range (passed to picture.ts lane() as opts.counts, through
//                     yearsPicture's input `counts`, so the chart and the hole line agree: a cell with
//                     only non-counting plants is the hole, and their bands are marked, mark.marked
//                     'outside'); fillerReason(t, verdict, warned) -> Line | null: the warning
//                     that put a filler under "Needs a second look" (the same source as fillers());
//   verdict-line.ts   holeLine(h) one statement, the light level or job first (owner pf Q1, one form
//                     everywhere: "Full sun: nobody in the first 3 years"); spreadsLine(t) -> Line | null
//                     from weed_potential; roomNote body (the Balcony board's "Grows to 12 m: keep it
//                     pruned, or pick a smaller plant");
//   change-summary.ts removedSummary(before, after) -> Line[] ("Its holes are open again.");
//                     addedSummary(before, after | null) -> Line[]: the holes an added plant filled,
//                     and nothing claimed while the result is not known (after null).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { failing } from './expect-fail.mjs';
import { taxon } from './consortium-p5-fixtures.mjs';

const holesMod = await import('../src/lib/consortium/holes.ts');
const line = await import('../src/lib/consortium/verdict-line.ts');
const summary = await import('../src/islands/consortium/rules/change-summary.ts');
const { yearsPicture } = await import('../src/islands/consortium/rules/picture-years.ts');
const { tableOf } = await import('../src/islands/consortium/rules/picture.ts');
const { sameCells } = await import('./picture-table.mjs');
const en = JSON.parse(readFileSync(new URL('../src/i18n/translations/en.json', import.meta.url), 'utf8'));
// A Line in English words: {vars} filled, a plural key's "other:" form with # as the count.
const say = (l) => {
  if (!l) return null;
  let w = en[l.key] ?? `<${l.key}>`;
  if (/^\s*(one|other):/.test(w)) w = (w.split('|').map((s) => s.trim()).find((s) => s.startsWith(l.count === 1 ? 'one:' : 'other:')) ?? w).replace(/^(one|other):\s*/, '').replace(/#/g, String(l.count));
  return w.replace(/\{(\w+)\}/g, (_, k) => String(l.vars?.[k] ?? `{${k}}`));
};
const id = (n) => `00000000-afaf-4000-8000-${String(n).padStart(12, '0')}`;
const V = (pid, level) => [pid, { id: pid, judged: '1991-2020', ownYears: false, level, limiting: null, factors: [], notes: [] }];

failing('PP-C-u16 (pf-a picture 3.7): a member outside its range is drawn as a marked band, and the hole cells count members only, so the chart and the hole line agree', { owner: 'pf-a', reason: /holes\.ts exports no counts predicate/ }, () => {
  assert.equal(typeof holesMod.counts, 'function', 'holes.ts exports no counts predicate');
  const inRange = taxon({ id: id(1) }), outside = taxon({ id: id(2) });
  const verdicts = new Map([V(id(1), 'fits'), V(id(2), 'outside')]);
  assert.equal(holesMod.counts(inRange, verdicts), true);
  assert.equal(holesMod.counts(outside, verdicts), false, 'an outside member fills no hole');
  // lane() wiring: a medium shrub outside its range, alone in its lane; the light hole there is open
  // (holes.ts leaves it out), so the picture shows the hole in its cells and draws its band marked.
  const tree = taxon({ id: id(1), canonical_name: 'Plantus arbor', stratum: { value: 'emergent', sources: [] }, phases: { start: 'secondary_i', end: 'climax', sources: [] } });
  const shrub = taxon({ id: id(2), canonical_name: 'Plantus frutex', stratum: { value: 'medium', sources: [] }, phases: { start: 'secondary_i', end: 'climax', sources: [] } });
  const members = [tree, shrub];
  const hs = holesMod.holes({ members, verdicts, pending: false });
  const mediumHole = hs.find((h) => h.kind === 'light' && h.stratum === 'medium' && h.state === 'open');
  assert.ok(mediumHole, 'the hole line names the medium light level open');
  const pic = yearsPicture({ members, holes: hs, nameOf: (t) => t.canonical_name, counts: (t) => holesMod.counts(t, verdicts) });
  const medium = pic.rows.find((r) => r.key === 'medium');
  const standing = medium.cells.filter((c) => c.judged && (c.ids.includes(id(2)) || c.hidden.includes(id(2))));
  assert.ok(standing.length > 0, 'the shrub stands in judged cells');
  assert.ok(standing.every((c) => c.hole === mediumHole.id), 'its cells are the hole, as the hole line says');
  assert.deepEqual(medium.marks.map((m) => [m.id, m.marked ?? null]), [[id(2), 'outside']], 'drawn as a marked band');
  assert.equal(pic.rows.find((r) => r.key === 'emergent').marks[0].marked ?? null, null, 'an in-range band is not marked');
  // The picture-table vector: the table form has the same cells, holes included.
  sameCells(pic, tableOf(pic));
});

failing('PP-C-u17 (pf-a filler reason 3.8): a toxic but fitting filler under "Needs a second look" states the warning that put it there', { owner: 'pf-a', reason: /fillerReason is not a function/ }, () => {
  const toxic = taxon({ id: id(3), warnings: { toxicity: { level: 'Severe', sources: ['pfaf'] }, invasive_in: [], allelopathic: null, weed_potential: null } });
  const why = say(holesMod.fillerReason(toxic, V(id(3), 'fits')[1], new Set([id(3)])));
  assert.match(why ?? '', /toxic/i, `the warning in words ("${why}")`);
});

failing('PP-C-u18 (pf-a hole titles U5, owner Q1 one form): a hole title is one statement, the light level first ("Full sun: nobody in the first 3 years")', { owner: 'pf-a', reason: /U5: one statement/ }, () => {
  const h = { id: 'light:emergent:0-3', kind: 'light', rank: 2, stratum: 'emergent', fromYear: 0, toYear: 3, state: 'open' };
  assert.equal(say(line.holeLine(h)), 'Full sun: nobody in the first 3 years', 'U5: one statement');
});

failing('PP-C-u19 (pf-a spreads U2): a filler with a weed potential carries a "spreads" line', { owner: 'pf-a', reason: /spreadsLine is not a function/ }, () => {
  const weedy = taxon({ id: id(4), warnings: { toxicity: null, invasive_in: [], allelopathic: null, weed_potential: true } });
  assert.match(say(line.spreadsLine(weedy)) ?? '', /spread/i);
  assert.equal(line.spreadsLine(taxon({ id: id(5) })), null);
});

failing('PP-C-u20 (pf-a toasts #24): a removal says what it opened again through change-summary ("Its holes are open again."); an addition says the result when known', { owner: 'pf-a', reason: /removedSummary is not a function/ }, () => {
  const pic = (holes) => ({ title: 't', summary: [], columns: [], rows: [{ key: 'r', head: { key: 'h', vars: {} }, state: 'data', marks: [], cells: holes.map((hole) => ({ ids: [], hidden: [], hole, judged: true })) }], names: {}, jobs: {} });
  const lines = summary.removedSummary(pic([null]), pic(['light:emergent:0-3']));
  assert.ok(lines.some((l) => say(l) === 'Its holes are open again.'), lines.map(say).join(' | '));
  // Added: the holes it filled, counted, once the result is known; nothing claimed before.
  const added = summary.addedSummary(pic(['light:emergent:0-3', 'job:mulch:0-3']), pic([null, 'job:mulch:0-3']));
  assert.ok(added.some((l) => l.count === 1 && /fill/i.test(say(l))), `the result: one hole filled (${added.map(say).join(' | ')})`);
  assert.deepEqual(summary.addedSummary(pic(['light:emergent:0-3']), null), [], 'the result not known: nothing claimed');
});

failing('PP-C-u21 (pf-a room note #5, Balcony board): a plant taller than the room carries "Grows to 20 m: keep it pruned, or pick a smaller plant" in pots, nothing when the height is unknown', { owner: 'pf-a', reason: /roomNote\(.*\): not written yet \(PP-C pf\)/ }, () => {
  assert.equal(say(line.roomNote(20, 'pots')), 'Grows to 20 m: keep it pruned, or pick a smaller plant');
  assert.equal(line.roomNote(null, 'pots'), null);
  assert.equal(line.roomNote(2, 'field'), null);
});
