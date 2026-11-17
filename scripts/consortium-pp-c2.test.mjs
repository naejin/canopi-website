// PP-C stream c2, One plant (plant-palette-slices section 3.4, c2 unit rows): the words of one plant's
// verdict, its disputes and sources, and Swap's gains, under Details, Swap and print. Written failing in
// PP-C commit 0, each case marked expected-fail (scripts/expect-fail.mjs failing(), owner c2 in its
// title); c2 removes a marker in the commit that makes it pass. Three F1a markers parked by PP-B
// (scripts/plan/parked-markers.json, F1a-C1..C3, from 648baf2:scripts/consortium-confidence.test.mjs)
// are restored here, retitled "F1a-Cn → PP-C (c2 …)" and rewritten against commit 0's seam: core
// verdict-line.ts confidenceLine, reasonLine, disputeLine (signatures from commit 0, bodies c2's),
// which throw "not written yet (PP-C c2)" until c2 writes them. The confidence.ts of F1a folds into
// confidenceLine: one function for every surface (fit line, Details, Find, print), so Find's use needs
// no c2 test of c1's screen.
//
// The contract beyond commit 0's signatures (c2 may rename within its chunk, keeping the cases):
//   verdict-line.ts  datasetLines({ rangesReview }) -> Line[] (the one "not reviewed" line);
//                    reasonLine(f) reads f.source (the bound's source, e.g. 'treegoer') when given;
//                    noteLine(note, { period, scenario }) -> Line | null for VerdictNote;
//                    limitOf(rangeDispute) -> { valueC, dashed, source } (the band's dashed limit);
//                    frostLine(facts: FrostFact[] | null, releaseHasFrost) -> Line | null (format note
//                    Q7 precedence; a ktmpr never in it), restLine(facts) -> Line | null (the ktmpr,
//                    apart, with its own label);
//                    factLines' source lines ("Canopi curator knowledge",
//                    "Canopi correction", PFAF's frost_tender "in Britain (PFAF)");
//                    factLines(details) -> Line[]: the dispute and corrected-value lines one plant shows,
//                    the one list Details and print both write (ledger "Schema 4" Q3);
//   holes.ts         swapChange(ctx, out, inn) -> { fills: Hole[], leaves: Hole[], strataGain: boolean }:
//                    Swap's gains and losses as holes(members) against holes(members - out + inn);
//   verdict-line.ts  invasiveLines({ invasiveIn, invasiveAreas, sources }, { country, checked }) -> Line[]:
//                    the reader's country's invasive lines (schema 4.3, canopi-data
//                    docs/website-handoff/2026-11-17-invasive-scope.md): one line per source with its
//                    areas in words through the closed keys consortium.details.invArea.<code>, a source
//                    covering every area reading as the whole country; an atlas row never worded as a
//                    legal listing; checked (countries.invasive_checked, since 4.3 "a source assessed
//                    invasiveness there") false gives "not checked", true with no row "not recorded".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const core = await import('../src/lib/consortium/index.ts');
const line = await import('../src/lib/consortium/verdict-line.ts');
const { verdict } = await import('../src/lib/consortium/verdict.ts');
const { confidenceTerms } = core;
const dir = new URL('../src/i18n/translations/', import.meta.url);
const words = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), JSON.parse(readFileSync(new URL(f, dir), 'utf8'))]));
const en = words.en;
// A Line in English words, its {vars} filled (enough for these cases: no plural forms), its parts (a
// Line, or Lines said as a list) in words, then the sentences it carries (`also`), as kit/fit.tsx says it.
const words1 = (l) => {
  const parts = Object.fromEntries(Object.entries(l.parts ?? {}).map(([k, p]) => [k, Array.isArray(p) ? p.map(words1).join(' and ') : words1(p)]));
  return (en[l.key] ?? `<${l.key}>`).replace(/\{(\w+)\}/g, (_, k) => String(parts[k] ?? l.vars?.[k] ?? `{${k}}`));
};
const say = (l) => [words1(l), ...(l.also ?? []).map(say)].join(' ');
const NOT_YET = /verdict-line \w+\(.*\): not written yet \(PP-C c2\)/;

test('PP-C c2 unit file (commit 0): the eight confidence terms are the closed union confidenceLine reads', () => {
  assert.deepEqual([...confidenceTerms].sort(), ['disputed', 'edge', 'estimate', 'not-checked', 'not-recorded', 'not-reviewed', 'spread', 'worked-out']);
  for (const f of ['confidenceLine', 'reasonLine', 'disputeLine']) assert.equal(typeof line[f], 'function', `verdict-line.ts exports ${f}`);
});

test('F1a-C1 → PP-C (c2 confidence words, A15, A18): every term has its words in all 11 locales, one function for the fit line, Details, Find and print', () => {
  assert.equal(Object.keys(words).length, 11);
  for (const term of confidenceTerms) {
    const l = line.confidenceLine(term === 'spread' ? { term, agree: 3, of: 5 } : { term });
    assert.match(l.key, /^consortium\.line\./, `${term}: a consortium.line. key`);
    for (const [lang, w] of Object.entries(words)) assert.ok(w[l.key], `${lang}: ${l.key} (${term})`);
  }
});

test('F1a-C2 → PP-C (c2 verdict factors to terms, A15, A18): each factor\'s confidence maps to its term\'s words; a factor with none says nothing of confidence', () => {
  const f = { factor: 'cold', level: 'look', basis: 'range', place: -8, low: -6, high: 4 };
  const edge = say(line.reasonLine({ ...f, confidence: { term: 'edge' } }));
  // Fix round 1 C6: in a reason the edge is a full sentence of its own (confEdgeLine), the same term.
  const edgeAlso = line.reasonLine({ ...f, confidence: { term: 'edge' } }).also ?? [];
  assert.ok(edgeAlso.some((a) => line.lineTerm(a) === 'edge') && /edge of its observed range/i.test(edge), `the edge term in the reason ("${edge}")`);
  const est = say(line.reasonLine({ ...f, confidence: { term: 'estimate' } }));
  assert.ok(est.includes(say(line.confidenceLine({ term: 'estimate' }))), `the estimate term in the reason ("${est}")`);
  const plain = say(line.reasonLine(f));
  for (const term of confidenceTerms) assert.ok(!plain.includes(say(line.confidenceLine({ term }))), `no ${term} words without a confidence`);
});

test('F1a-C3 → PP-C (c2 not reviewed, A17): "not reviewed" is one dataset-level line driven by SourceInfo.rangesReview, never a literal', () => {
  // meta.ranges_review is 'estimate_not_reviewed' in today's export (install-consortium.mjs RANGES_REVIEW).
  const lines = line.datasetLines({ rangesReview: 'estimate_not_reviewed' });
  assert.equal(lines.length, 1);
  assert.equal(lines[0].key, line.confidenceLine({ term: 'not-reviewed' }).key);
  assert.deepEqual(line.datasetLines({ rangesReview: 'reviewed' }), []);
});

test('PP-C-u10 (c2 reasons per factor): the kinds the mark providers give today have words: bound source, wetter and aridity "not checked", "not recorded" apart from "not checked", borrowed "estimate" and "no site", warm-enough-later, drier later', () => {
  const base = { factor: 'cold', level: 'fits', basis: 'range', place: 2, low: -10, high: 8 };
  const unknown = say(line.reasonLine({ ...base, level: 'unknown', low: null, high: null }));
  const unrecorded = say(line.reasonLine({ ...base, level: 'unknown', low: null, high: null, confidence: { term: 'not-recorded' } }));
  assert.notEqual(unknown, unrecorded, '"not recorded" is apart from "not checked"');
  assert.match(say(line.reasonLine({ ...base, factor: 'water', level: 'unknown', basis: 'spot', place: null, low: null, high: null })), /not checked/i, 'wetter: not checked');
  assert.match(say(line.reasonLine({ ...base, factor: 'dry', level: 'unknown', place: null, low: null, high: null })), /not checked/i, 'aridity: not checked');
  // The bound's source: a limit from TreeGOER says so.
  const bound = say(line.reasonLine({ ...base, level: 'look', place: -12, source: 'treegoer' }));
  assert.match(bound, /TreeGOER/, `the bound's source named ("${bound}")`);
  assert.doesNotMatch(say(line.reasonLine({ ...base, level: 'look', place: -12 })), /TreeGOER/, 'no source named when the bound has none');
  // Borrowed: the estimate term's words in the reason; with no site, the location is asked for.
  const est = say(line.reasonLine({ ...base, confidence: { term: 'estimate' } }));
  assert.ok(est.includes(say(line.confidenceLine({ term: 'estimate' }))), `borrowed: estimate ("${est}")`);
  const noSite = say(line.reasonLine({ ...base, level: 'unknown', place: null, confidence: { term: 'estimate' } }));
  assert.match(noSite, /location/i, `borrowed with no site: the location is needed to check ("${noSite}")`);
  // The later notes: warm enough by a later period, drier later.
  const vars = { period: '2041-2070', scenario: 'SSP2-4.5' };
  assert.match(say(line.noteLine('warm-enough-later', vars)), /Warm enough here by 2041-2070/);
  assert.match(say(line.noteLine('drier', vars)), /drier/i);
  assert.equal(line.noteLine('drier', vars).key.startsWith('consortium.line.'), true, 'a consortium.line. key');
});

// The audience and source lines through factLines, their one reader (fix round 1 B7: no test-only exports).
const aud = (a) => line.factLines({ disputes: null, audiences: [a], traitSources: null, shipped: {} })[0];
const src1 = (t) => line.factLines({ disputes: null, traitSources: [t], shipped: {} })[0] ?? null;
const SHIPPED = { field: 'toxicity', kind: 'queue', value: 'Moderate', unit: null, derived: false, scope: null, source: 'NC State' };
// (None of these changes a verdict, a filter or NextStep's grouping: disputes, audiences, trait sources
// and frost reach Details only, never the pool's Taxon those read: consortium-source.test.mjs.)
test('PP-C-u11 (c2 disputes): the shipped value plus "Sources disagree: <source>[: <stricter value>]", derived rows labelled, toxicity NULL or None with a PFAF flag in words, audience rows, range disputes as a dashed limit with both values, the invasive, weed and allelopathy disputes', () => {
  // Hedera helix: shipped Slight, NC State Moderate: the chip keeps Slight, the line names the stricter one.
  const ivy = say(line.disputeLine(SHIPPED, 'Slight'));
  assert.match(ivy, /Sources disagree/);
  assert.match(ivy, /NC State/);
  assert.match(ivy, /Moderate/);
  assert.match(say(line.disputeLine({ ...SHIPPED, value: null, source: 'PFAF' }, null)), /Toxicity not recorded; PFAF names a hazard/);
  assert.match(say(line.disputeLine({ ...SHIPPED, value: null, source: 'PFAF' }, 'None')), /Sources disagree: PFAF names a hazard, no level given/);
  const derived = { field: 'tmin_cold.low', kind: 'range', value: '-12', unit: 'C', derived: true, scope: null, source: 'TreeGOER' };
  assert.notEqual(say(line.disputeLine(derived, '-15')), say(line.disputeLine({ ...derived, derived: false }, '-15')), 'a derived row is labelled');
  // A range dispute: both values in words, and drawn as a dashed limit (never the shipped band's own).
  const range = { field: 'tmin_cold.low', kind: 'range', value: '-10.0', unit: 'C', derived: false, scope: null, source: 'TreeGOER' };
  const both = say(line.disputeLine(range, '-15'));
  assert.ok(/-15|−15/.test(both) && /-10|−10/.test(both), `both values ("${both}")`);
  assert.deepEqual(line.limitOf(range), { valueC: -10, dashed: true, source: 'TreeGOER' });
  // The audience rows (Malus domestica, Taxus baccata in the fixture).
  assert.equal(say(aud({ who: 'pets', level: null, source: 'ASPCA' })), 'toxic to pets (ASPCA), no level given');
  assert.match(say(aud({ who: 'livestock', level: 'Severe', source: 'Merck Veterinary Manual' })), /livestock.*Merck Veterinary Manual/);
  // The one invasive dispute, a weed and an allelopathy case, each beside the shipped value.
  for (const [field, shipped] of [['plant_invasive', 'false'], ['weed_potential', 'false'], ['allelopathic', 'false']]) {
    const w = say(line.disputeLine({ field, kind: 'queue', value: 'true', unit: null, derived: false, scope: null, source: 'GRIIS' }, shipped));
    assert.match(w, /Sources disagree: GRIIS/, `${field} ("${w}")`);
  }
});

// FrostFact rows (types.ts; schema-4 format note, plant_frost), one plant's.
const frost = (kind, valueC, over = {}) => ({ kind, valueC, frostClass: null, variety: null, coarse: kind === 'ktmp' && valueC === 0, source: 'ecocrop', scopeCountry: null, ...over });
const ts = (field, source, scope = null) => ({ field, source, scope, kind: 'recorded' });
test('PP-C-u12 (c2 corrected values and frost): a corrected value names "Canopi curator knowledge" or "Canopi correction"; the frost fact in words with its source (Q7 precedence, KTMPR apart); no frost line in a release without plant_frost rows; PFAF frost_tender is Britain information, never a verdict', () => {
  assert.equal(say(src1(ts('toxicity', 'canopi-knowledge'))), 'Canopi curator knowledge');
  assert.equal(say(src1(ts('toxicity', 'canopi-correction'))), 'Canopi correction');
  // frostLine: none in a release without rows; "not recorded" when the release has rows but not this plant.
  assert.equal(line.frostLine(null, false), null, 'no plant_frost row in the release: no frost line at all');
  assert.match(say(line.frostLine([], true)), /frost tolerance not recorded/i);
  // Q7: the species KTMP (not coarse) first; else the varieties' range with their names; else the class;
  // else a coarse 0 worded as the estimate it is. A class overrides a coarse 0.
  const species = say(line.frostLine([frost('ktmp', -5), frost('ktmp', -1, { variety: 'Early' }), frost('class', null, { frostClass: 'hard', source: 'veg' })], true));
  assert.ok(/-5|−5/.test(species) && /EcoCrop/i.test(species), `the species KTMP with its source ("${species}")`);
  const varieties = say(line.frostLine([frost('ktmp', -1, { variety: 'Early' }), frost('ktmp', -5, { variety: 'Late' })], true));
  assert.ok(/-1|−1/.test(varieties) && /-5|−5/.test(varieties) && /variet/i.test(varieties), `the varieties' range ("${varieties}")`);
  const cls = say(line.frostLine([frost('ktmp', 0), frost('class', null, { frostClass: 'light', source: 'veg' })], true));
  assert.doesNotMatch(cls, /rough|estimate/i, `a class overrides a coarse 0 ("${cls}")`);
  assert.match(say(line.frostLine([frost('ktmp', 0)], true)), /rough|estimate/i, 'a coarse 0 alone, worded as an estimate');
  // KTMPR (killing temperature at rest, dormant) is never part of the order: shown apart.
  const rest = [frost('ktmpr', -20)];
  assert.equal(say(line.frostLine([frost('ktmp', -5), ...rest], true)), say(line.frostLine([frost('ktmp', -5)], true)), 'a KTMPR changes no frost line');
  assert.match(say(line.restLine(rest)), /-20|−20/, 'the KTMPR in its own line');
  assert.equal(line.restLine([frost('ktmp', -5)]), null);
  // PFAF's frost_tender (a trait_sources row, scope GB): Britain information only, never a verdict.
  assert.match(say(src1(ts('frost_tender', 'pfaf', 'GB'))), /Britain \(PFAF\)/);
  const ctx = { place: core.emptyPlace, lookup: null, period: '1991-2020', scenario: 'ssp245' };
  const plant = { id: '00000000-c2c2-4000-8000-000000000001', canonical_name: 'Plantus', genus: 'Plantus', family: null, names: {}, image: null, role: 'crop', stratum: { value: 'low', sources: [] }, phases: { start: 'placenta_i', end: 'placenta_ii', sources: [] }, functions: null, warnings: { toxicity: null, invasive_in: [], allelopathic: null, weed_potential: null }, climate: null, areasKnown: true };
  assert.deepEqual(verdict({ ...plant, traits: { frost_tender: true } }, ctx), verdict({ ...plant, traits: { frost_tender: false } }, ctx), 'frost_tender never changes a verdict');
});

// The lines Details and print both write come from one list (print renders factLines too: PP-C17
// checks the paper in the browser).
test('PP-C-u13 (c2 print): the dispute and corrected-value lines are on paper as in Details (ledger "Schema 4" Q3)', () => {
  const details = {
    disputes: [SHIPPED],
    traitSources: [ts('toxicity', 'canopi-correction'), ts('frost_tender', 'pfaf', 'GB')],
    shipped: { toxicity: 'Slight' },
  };
  const lines = line.factLines(details).map(say);
  assert.ok(lines.includes(say(line.disputeLine(SHIPPED, 'Slight'))), `the dispute line (${lines.join(' | ')})`);
  assert.ok(lines.includes(say(src1(details.traitSources[0]))), 'the corrected value\'s source');
  assert.deepEqual(line.factLines({ disputes: [], traitSources: [], shipped: {} }), [], 'nothing to say: no line');
});

// Misfit parity (slices c2 row): the conflict misfit (conflicts.ts flags, misfitsBeside over the other
// members) and the verdict's hint factors at level 'look' (verdict.ts, canopy of the members) name the
// same site answers. This holds at commit 0 (one stratum per plant, so a plant never shades itself), so
// it is a plain test: c2's move of the misfit into the verdict keeps it green.
test('PP-C-u14 (c2 misfit parity): the conflict misfit equals the verdict\'s hint factors at level look', () => {
  const plant = (n, stratum, start, end, traits) => ({ id: `00000000-c2c2-4000-8000-00000000001${n}`, canonical_name: `Plantus ${n}`, genus: 'Plantus', family: null, names: {}, image: null, role: 'crop', stratum: { value: stratum, sources: [] }, phases: { start, end, sources: [] }, functions: null, traits, warnings: { toxicity: null, invasive_in: [], allelopathic: null, weed_potential: null }, climate: null, areasKnown: true });
  const members = [
    plant(1, 'emergent', 'secondary_i', 'climax', { sun: true, drought_tolerance: 'High' }), // the canopy
    plant(2, 'medium', 'secondary_i', 'climax', { sun: false, drought_tolerance: 'High' }), // shaded by 1: no light misfit
    plant(3, 'low', 'placenta_i', 'placenta_ii', { sun: false, drought_tolerance: 'High' }), // before the canopy: a light misfit
    plant(4, 'high', 'secondary_i', 'climax', { sun: true, drought_tolerance: 'Low' }), // a water misfit
  ];
  const place = { ...core.emptyPlace, spot: { ...core.emptyPlace.spot, light: 'sun', water: 'dry' } };
  const site = core.siteFor(place, null);
  const ctx = { place, lookup: null, period: '1991-2020', scenario: 'ssp245', canopy: core.canopyOf(members) };
  const KEY = { 'soil-ph': 'soil' };
  const seen = [];
  for (const t of members) {
    const others = members.filter((o) => o.id !== t.id);
    const misfit = core.misfitsBeside(t, site, others).sort();
    const look = verdict(t, ctx).factors.filter((f) => f.level === 'look' && f.basis !== 'range').map((f) => KEY[f.factor] ?? f.factor).sort();
    assert.deepEqual(look, misfit, `${t.canonical_name}: the verdict's look factors and the misfit`);
    assert.equal(core.flagsFor(t, members, { site, interactions: [] }).some((f) => f.kind === 'misfit'), misfit.length > 0, `${t.canonical_name}: the misfit flag`);
    seen.push(misfit.join('+') || '-');
  }
  assert.deepEqual(seen, ['-', '-', 'light', 'water'], 'the cases the palette names');
});

// Swap's gains and losses through the holes (slices c2 row): what the candidate fills and leaves empty
// is holes(members) against holes(members - out + inn), never the deleted cells; the strata gain kept.
test('PP-C-u15 (c2 Swap gains): Swap\'s gains and losses are holes(members) against holes(members - m + c), with the candidates\' verdicts; the strata gain kept', async () => {
  // swapChange lives with alternatives in suggest.ts (the Swap list's chunk; sheets never import
  // holes.ts), read against holes.ts holes() itself.
  const holesMod = { ...(await import('../src/lib/consortium/holes.ts')), ...(await import('../src/lib/consortium/suggest.ts')) };
  const { taxon, placement } = await import('./consortium-p5-fixtures.mjs');
  void placement;
  const t = (n, stratum, start, end, fn) => taxon({ id: `00000000-c2c2-4000-8000-00000000002${n}`, canonical_name: `Plantus ${n}`, stratum: { value: stratum, sources: [] }, phases: { start, end, sources: [] }, functions: fn });
  const members = [t(1, 'emergent', 'secondary_i', 'climax', ['nitrogen_fixer']), t(2, 'low', 'placenta_i', 'secondary_ii', ['edible_fruit'])];
  const out = members[1], inn = t(3, 'medium', 'placenta_i', 'climax', ['pollinator_forage']);
  const verdicts = new Map([...members, inn].map((x) => [x.id, { id: x.id, judged: '1991-2020', ownYears: false, level: 'fits', limiting: null, factors: [], notes: [] }]));
  const ctx = { members, verdicts, pending: false };
  // Compared by lane (job or light level) and years (fix round 1 A1): filled = open before, no open
  // years of its lane left over it; left = open after over years its lane did not have open before.
  const open = (ms) => holesMod.holes({ ...ctx, members: ms }).filter((h) => h.state === 'open');
  const before = open(members), after = open([members[0], inn]);
  const lane = (h) => `${h.kind}:${h.job ?? h.stratum}`;
  // Through alternatives, Swap's one reader (swapChange is internal since fix round 1 B7).
  const site = core.siteFor(core.emptyPlace, null);
  const swapChange = (c, o, i) => holesMod.alternatives(o.id, c.members, [i], { site, interactions: [], verdicts: c.verdicts }).find((x) => x.id === i.id);
  const change = swapChange(ctx, out, inn);
  const filled = before.filter((h) => !after.some((x) => lane(x) === lane(h) && x.fromYear < h.toYear && h.fromYear < x.toYear));
  const left = after.filter((h) => !before.some((x) => lane(x) === lane(h) && h.fromYear >= x.fromYear && h.toYear <= x.toYear));
  assert.deepEqual(change.fills.map((h) => h.id).sort(), filled.map((h) => h.id).sort(), 'what it fills: open before, closed after');
  assert.deepEqual(change.leaves.map((h) => h.id).sort(), left.map((h) => h.id).sort(), 'what it leaves empty: open after, not before');
  assert.ok(change.fills.length + change.leaves.length > 0, 'the case changes some hole');
  assert.equal(change.strataGain, true, 'a stratum no member stands in (medium): the strata gain kept');
  assert.equal(swapChange(ctx, out, t(4, 'low', 'placenta_i', 'secondary_ii', ['edible_fruit'])).strataGain, false, 'the same stratum: no strata gain');
});

// Schema 4.3 invasive scope (canopi-data docs/website-handoff/2026-11-17-invasive-scope.md; coordinator
// 2026-11-17: the display is c2's). The Arundo donax pattern of the note: in Spain the atlas names the
// Balearics and mainland Spain, the catálogo the Canary Islands.
const SRC = {
  griis: { label: 'Global Register of Introduced and Invasive Species (GRIIS)' },
  es_catalogo: { label: 'Catálogo Español de Especies Exóticas Invasoras (RD 630/2013)' },
  atlas_aloctonas_es: { label: 'Atlas de las Plantas Alóctonas Invasoras en España (MITECO 2004; expert atlas, not a legal list)' },
};
const ARUNDO = {
  invasiveIn: [{ country: 'ES', sources: ['atlas_aloctonas_es'] }, { country: 'US', sources: ['griis'] }],
  invasiveAreas: [{ country: 'ES', source: 'atlas_aloctonas_es', areas: ['BAL', 'SPA'] }, { country: 'ES', source: 'es_catalogo', areas: ['CNY'] }],
  sources: SRC,
};
test('PP-C-u21 (c2 invasive scope, schema 4.3): one line per source with its areas in words ("regulated invasive in the Canary Islands (Spanish catálogo)"; "named invasive in the Balearic Islands and mainland Spain (MITECO Atlas 2004)"), a whole-country source as the country, and "not checked" / "not recorded" under the new invasive_checked meaning', () => {
  const es = line.invasiveLines(ARUNDO, { country: 'ES', checked: true }).map(say);
  assert.equal(es.length, 2, `one line per source (${es.join(' | ')})`);
  const catalogo = es.find((w) => /catálogo/i.test(w)), atlas = es.find((w) => /MITECO/.test(w));
  assert.ok(catalogo && /regulated|listed/i.test(catalogo) && /Canar/i.test(catalogo) && !/Balear|mainland/i.test(catalogo), `the catálogo's line, Canarias only ("${catalogo}")`);
  assert.ok(atlas && /Balear/i.test(atlas) && /mainland Spain/i.test(atlas) && !/Canar/i.test(atlas), `the atlas's line, its two areas ("${atlas}")`);
  assert.doesNotMatch(atlas, /regulated|legal|listed/i, 'an atlas row is never a legal listing');
  // A source covering every area of the country reads as the whole country.
  const whole = line.invasiveLines({ ...ARUNDO, invasiveAreas: [{ country: 'ES', source: 'atlas_aloctonas_es', areas: ['BAL', 'CNY', 'SPA'] }, { country: 'ES', source: 'es_catalogo', areas: ['CNY'] }] }, { country: 'ES', checked: true }).map(say);
  assert.ok(whole.some((w) => /MITECO/.test(w) && /Spain/.test(w) && !/Balear|mainland/i.test(w)), `the atlas over all three areas: Spain (${whole.join(' | ')})`);
  // No scope rows: the country line, as before 4.3.
  assert.match(say(line.invasiveLines(ARUNDO, { country: 'US', checked: true })[0]), /United States|US/);
  // Checked and no row: "not recorded", never naming GRIIS as the only check (ES is checked by three sources).
  const none = line.invasiveLines({ invasiveIn: [], invasiveAreas: [], sources: SRC }, { country: 'ES', checked: true }).map(say).join(' ');
  assert.match(none, /not recorded/i);
  assert.doesNotMatch(none, /GRIIS checklist/i);
  // Not checked (since 4.3: no source assessed invasiveness there, e.g. BE): "not checked", with no claim
  // about a GRIIS checklist (BE has one that marks no plant invasive).
  const unchecked = line.invasiveLines({ invasiveIn: [], invasiveAreas: [], sources: SRC }, { country: 'BE', checked: false }).map(say).join(' ');
  assert.match(unchecked, /not checked/i);
  assert.doesNotMatch(unchecked, /no GRIIS checklist/i);
  // The area words are closed keys in all 11 locales.
  for (const code of core.invasiveAreaCodes) for (const [lang, w] of Object.entries(words)) assert.ok(w[`consortium.details.invArea.${code}`], `${lang}: consortium.details.invArea.${code}`);
});

// The mapping probe of c2 commit 1 (784ec759: 673 plants, 20,997 verdicts, 15,546 old Details marks,
// unmapped set empty) went with the mark providers it compared against (c2 commit 4).

// Coordinator 2026-11-17: schema 4.4 adds the dispute kind `source`; a kind the reader does not know is
// skipped in Details' lines, never worded as another kind.
test('PP-C-u22 (c2 unknown dispute kind): factLines skips a plant_disputes kind it does not know', async () => {
  const { factLines } = await import('../src/lib/consortium/verdict-line.ts');
  const known = { field: 'toxicity', kind: 'queue', value: 'Moderate', unit: null, derived: false, scope: null, source: 'ncsu_plant_toolbox' };
  const lines = factLines({ disputes: [{ ...known, kind: 'source', source: 'les_alveoles' }, known], traitSources: null, shipped: { toxicity: 'Slight' } });
  assert.equal(lines.length, 1, 'the unknown kind is skipped');
  assert.equal(lines[0].vars.source, 'NC State');
});

test('PP-C-u23 (c2 cool season): an annual past its heat range reads the cool-season line, not the annual one', async () => {
  const { againstLines } = await import('../src/lib/consortium/verdict-line.ts');
  const v = (notes) => ({ id: 1, judged: '1991-2020', ownYears: false, level: 'fits', limiting: null, factors: [], notes, range: 'judged' });
  const words = { period: (p) => p, scenario: 'SSP2-4.5', heightM: null };
  const notesOf = (n) => againstLines(v(n), null, words).map((e) => e.note).filter(Boolean);
  assert.deepEqual(notesOf(['cool-season', 'annual']), ['cool-season']);
  assert.deepEqual(notesOf(['annual']), ['annual']);
});

// Fix round 1 A1 (c2-02): Swap compares holes by lane (a job or a light level) and the years it
// covers, never by hole id (an id carries its years): a hole that only shrinks is in neither list, one
// that grows is left more empty, and the sort ranks a candidate that narrows a hole above one that
// changes nothing. C13: swapping out a member outside its range, the gaps count from what that member
// would do, so a candidate that starts late leaves its early years empty (never "leaves no gap").
test('c2 fix A1 + C13 (Swap by lane and years): a shrunk hole is in neither list; a grown one is left; narrowing ranks higher; an outside member\'s gaps count from its years', async () => {
  const { alternatives } = await import('../src/lib/consortium/suggest.ts');
  const site0 = core.siteFor(core.emptyPlace, null);
  const swapChange = (c, o, i) => alternatives(o.id, c.members, [i], { site: site0, interactions: [], verdicts: c.verdicts }).find((x) => x.id === i.id);
  const { taxon } = await import('./consortium-p5-fixtures.mjs');
  const crop = (n, start, end) => taxon({ id: `00000000-c2c2-4000-8000-00000000003${n}`, canonical_name: `Cropus ${n}`, role: 'crop', stratum: { value: 'low', sources: [] }, phases: { start, end, sources: [] }, functions: null, climate: null });
  const a = crop(1, 'placenta_i', 'placenta_iii'); // years 0-3: feeds you and the low layer open 3-60
  const longer = crop(2, 'placenta_i', 'secondary_i'); // years 0-15: the same holes, open 15-60 only
  const shorter = crop(3, 'placenta_i', 'placenta_ii'); // years 0-1: open 1-60
  const late = crop(4, 'secondary_i', 'climax'); // years 3 on
  const fit = (xs) => new Map(xs.map((x) => [x.id, { id: x.id, judged: '1991-2020', ownYears: false, level: 'fits', limiting: null, factors: [], notes: [], range: 'judged' }]));
  const ctx = { members: [a], verdicts: fit([a, longer, shorter, late]), pending: false };
  const lanes = (hs) => hs.map((h) => `${h.kind}:${h.job ?? h.stratum}`).sort();
  const grow = swapChange(ctx, a, longer);
  assert.deepEqual(lanes(grow.fills), [], `a hole that only shrinks is not "also fills" (${grow.fills.map((h) => h.id)})`);
  assert.deepEqual(lanes(grow.leaves), [], `nor "leaves empty" (${grow.leaves.map((h) => h.id)})`);
  const shrink = swapChange(ctx, a, shorter);
  assert.deepEqual(lanes(shrink.leaves), ['job:feeds_you', 'light:low'], 'a hole that grows is left more empty');
  assert.deepEqual(lanes(shrink.fills), []);
  const site = core.siteFor(core.emptyPlace, null);
  const order = alternatives(a.id, [a], [shorter, longer, a], { site, interactions: [], verdicts: ctx.verdicts }).map((x) => x.id);
  assert.deepEqual(order, [longer.id, shorter.id], 'the candidate that narrows the holes first');
  // An outside member fills nothing today, but its replacement is judged against what it would do.
  const verdicts = fit([a, late]);
  verdicts.set(a.id, { ...verdicts.get(a.id), level: 'outside' });
  const away = swapChange({ members: [a], verdicts, pending: false }, a, late);
  assert.ok(away.leaves.some((h) => h.kind === 'job' && h.job === 'feeds_you' && h.fromYear === 0 && h.toYear === 3), `a late starter leaves the member's first years empty (${away.leaves.map((h) => h.id)})`);
});

// ---- fix round 1: the verdict's words (A2, A3, A7, B5, C1-C4, C6) ----
const vOf = (over = {}) => ({ id: 'p', judged: '1991-2020', ownYears: false, level: 'fits', limiting: null, factors: [], notes: [], range: 'judged', ...over });
const W = { period: (p) => p.replace('-', '–'), scenario: 'SSP2-4.5', heightM: null };
const keysOf = (es) => es.map((e) => e.line.key.slice('consortium.line.'.length));

test('c2 fix A2 (scenario agreement): a verdict judged at its own later period says how many scenarios agree; a split carries the spread term on every surface; verdictTerms is gone', () => {
  const later = vOf({ judged: '2071-2099', ownYears: true, agree: 4, of: 4 });
  const all = line.againstLines(later, null, W);
  const spread = all.find((e) => e.line.key === 'consortium.line.confSpread');
  assert.ok(spread, `the agreement said (${keysOf(all)})`);
  assert.equal(spread.conf, undefined, 'all agree: no hedge term');
  const split = line.againstLines({ ...later, agree: 2 }, null, W).find((e) => e.line.key === 'consortium.line.confSpread');
  assert.equal(split?.conf, 'spread');
  assert.ok(line.rowLines({ ...later, agree: 2 }, null, W).some((e) => e.conf === 'spread'), 'rows and print carry the split');
  assert.equal(line.verdictTerms, undefined);
  assert.equal(core.verdictTerms, undefined);
});

test('c2 fix A3 + A7 (row form): rowLines gives the later loss, watering, season, room and few-records notes in short words, then the terms; no "Not checked" twice', () => {
  const later = vOf({ judged: '2041-2070', level: 'outside', limiting: { factor: 'hot', level: 'outside', basis: 'range', place: 41, low: null, high: 36 } });
  const rows = line.rowLines(vOf({ notes: ['dry-months'] }), later, W);
  assert.deepEqual(keysOf(rows), ['rowLossHot', 'rowDryMonths']);
  assert.deepEqual(rows[0].line.vars, { period: '2041–2070' });
  assert.match(en['consortium.line.rowLossHot'], /^too hot by \{period\}$/);
  assert.deepEqual(keysOf(line.rowLines(vOf({ notes: ['cool-season', 'annual'] }), null, W)), ['rowCoolSeason'], 'the cool season replaces annual');
  assert.deepEqual(keysOf(line.rowLines(vOf({ notes: ['annual'] }), null, W)), ['rowAnnual']);
  assert.deepEqual(keysOf(line.rowLines(vOf({ notes: ['drier-later'] }), vOf({ judged: '2071-2099', notes: ['drier'] }), W)), ['rowDrierBy']);
  assert.deepEqual(keysOf(line.rowLines(vOf({ notes: ['room-tall'] }), null, { ...W, heightM: 12 })), ['rowRoomTall']);
  // A7: the fit line already says "Not checked".
  const none = line.rowLines(vOf({ level: 'unknown', range: 'no-climate' }), null, W);
  assert.ok(!none.some((e) => e.conf === 'not-checked'), `no second "Not checked" (${keysOf(none)})`);
  assert.ok(line.rowLines(vOf({ level: 'unknown', range: 'not-recorded' }), null, W).some((e) => e.conf === 'not-recorded'), 'not recorded is still said');
});

// The row, print and side-view marks of pp/c (d40b5640 range-, future- and site-marks.ts, the 'row'
// surface the three shared): each kind, from the verdict that gave it, has its short row words now.
test('c2 fix A3 (mapping probe, row surfaces): every old row mark kind maps to a rowLines entry or the fit line; the unmapped set is empty', () => {
  const hot = { factor: 'hot', level: 'outside', basis: 'range', place: 41, low: null, high: 36 };
  const OLD = {
    'range.outside': [vOf({ level: 'outside', limiting: hot, factors: [hot] }), null, (fit) => fit === 'outside'],
    'range.edge': [vOf({ level: 'look', factors: [{ ...hot, level: 'look', confidence: { term: 'edge' } }] }), null, (fit, r) => fit === 'look' && r.some((e) => e.conf === 'edge')],
    'range.unknown': [vOf({ level: 'unknown', range: 'no-climate' }), null, (fit) => fit === 'unknown'],
    'range.drier': [vOf({ notes: ['drier'] }), null, (_, r) => r.some((e) => e.note === 'drier')],
    'range.wetter': [vOf({ notes: ['wetter'] }), null, (_, r) => r.some((e) => e.note === 'wetter')],
    'range.coolSeasonShort': [vOf({ notes: ['cool-season', 'annual'] }), null, (_, r) => r.some((e) => e.note === 'cool-season')],
    'range.annualShort': [vOf({ notes: ['annual'] }), null, (_, r) => r.some((e) => e.note === 'annual')],
    'estimate.fromZone': [vOf({ borrowed: 'Tropical' }), null, (_, r) => r.some((e) => e.conf === 'estimate')],
    'estimate.noSite': [vOf({ level: 'unknown', range: 'no-climate', borrowed: 'Tropical' }), null, (_, r) => r.some((e) => e.conf === 'estimate')],
    'future.warmEnoughShort': [vOf({ notes: ['warm-enough-later'] }), vOf({ judged: '2071-2099' }), (_, r) => r.some((e) => e.note === 'warm-enough-later')],
    'future.mark.heat': [vOf(), vOf({ judged: '2071-2099', level: 'outside', limiting: hot }), (_, r) => r.some((e) => e.later)],
    'future.drierShort': [vOf({ notes: ['drier-later'] }), vOf({ judged: '2071-2099', notes: ['drier'] }), (_, r) => r.some((e) => e.note === 'drier-later')],
    'water.dryMonthsShort': [vOf({ notes: ['dry-months'] }), null, (_, r) => r.some((e) => e.note === 'dry-months')],
    'room.tallShort': [vOf({ notes: ['room-tall'] }), null, (_, r) => r.some((e) => e.note === 'room-tall'), 9],
  };
  const unmapped = Object.entries(OLD).filter(([, [v, later, mapped, h]]) => !mapped(v.level, line.rowLines(v, later, { ...W, heightM: h ?? null }))).map(([k]) => k);
  assert.deepEqual(unmapped, []);
  for (const k of Object.keys(en).filter((x) => x.startsWith('consortium.line.row'))) for (const [lang, w] of Object.entries(words)) assert.ok(w[k], `${lang}: ${k}`);
});

test('c2 fix C1 + C3 (fit line): a later fit names the period, never a grouped year or a stray "to"; the dry edge as the limiting note is in the headline, watering advice included', () => {
  assert.deepEqual(line.fitLine(vOf({ judged: '2071-2099' })), { key: 'consortium.line.fitsTo', vars: { period: '2071–2099' } });
  assert.doesNotMatch(en['consortium.line.fitsTo'], /\bto \{/);
  const dry = { factor: 'dry', level: 'look', basis: 'range', place: 0.2, low: 0.5, high: 2 };
  const v = vOf({ limiting: dry, factors: [dry] });
  assert.equal(line.fitLine(v).key, 'consortium.line.fitsDry');
  assert.equal(v.level, 'fits', 'the level unchanged (PP-C5)');
  assert.match(en['consortium.line.fitsDry'], /drier here than where it is recorded: may need watering/);
  assert.match(en['consortium.line.noteDrier'], /may need watering/, 'the note says what to do today too');
  assert.match(en['consortium.line.pastDrier'], /aridity index/, 'aridity explained in words (C6)');
});

// Fix round 2 R1 (c2r2-01): only a drier edge names the dry limit. Osaka (aridity index 1.53) is wetter
// than Glycyrrhiza glabra's recorded 0.14 to 1.34: the headline is a plain fit, never "drier… may need
// watering", and the line under it says wetter.
test('c2 fix R1 (wetter edge): Osaka, Glycyrrhiza glabra: the headline never says drier or watering; the wetter line says why', async () => {
  const { taxon } = await import('./consortium-p5-fixtures.mjs');
  const r = (low, high) => ({ low, median: null, high, count: 900, basis: 'thinned_cells', weak: false });
  const slot = (period, scenario) => ({ period, scenario, koppen: 'Cfa', koppenTemperatureMarginC: 0, tminColdC: 2.1, tmaxWarmC: 32.5, tmeanColdC: 6, tmeanWarmC: 28, aridityIndex: 1.53 });
  const lookup = { lat: 34.69, lon: 135.5, climate: { cellLat: 0, cellLon: 0, distanceCells: 0, periods: [slot('1991-2020', 'historical'), ...core.scenarios.flatMap((s) => [slot('2041-2070', s), slot('2071-2099', s)])] }, soil: null, regions: { wgsrpdL3: null, isoA2: null } };
  const licorice = taxon({ id: 'licorice', canonical_name: 'Glycyrrhiza glabra', phases: null, climate: { source: 'gbif_occurrences', cells: 900, nativeShare: null, tminCold: r(-12, 10), tmaxWarm: r(22, 40), tmeanYear: r(6, 22), tmeanWarm: null, aridity: r(0.14, 1.34) } });
  const v = verdict(licorice, { place: core.emptyPlace, lookup, period: '1991-2020', scenario: 'ssp245', canopy: null });
  const all = line.againstLines(v, null, W).map((e) => say(e.line));
  assert.equal(all[0], 'Fits your place today', `the headline (${all[0]})`);
  assert.doesNotMatch(all.join(' '), /drier|may need watering/i, 'no drier words for a wetter place');
  assert.ok(all.some((w) => /^Wetter here than where it is recorded/.test(w) && w.includes('1.53') && w.includes('0.14') && w.includes('1.34')), all.join(' | '));
  // The drier case keeps its headline (C3), worded the same way.
  const dry = verdict({ ...licorice, climate: { ...licorice.climate, aridity: r(1.8, 3) } }, { place: core.emptyPlace, lookup, period: '1991-2020', scenario: 'ssp245', canopy: null });
  assert.equal(say(line.againstLines(dry, null, W)[0].line), 'Fits your place today · drier here than where it is recorded: may need watering');
});

test('c2 fix C2 (few records): a range on fewer than 300 recorded places notes it with the count; the fit never reads plain', async () => {
  const { taxon } = await import('./consortium-p5-fixtures.mjs');
  const r = (low, high) => ({ low, median: null, high, count: 26, basis: 'thinned_cells', weak: true });
  const slot = (period, scenario, over = {}) => ({ period, scenario, koppen: 'BWh', koppenTemperatureMarginC: 0, tminColdC: 4, tmaxWarmC: 34, tmeanColdC: 12, tmeanWarmC: 28, aridityIndex: 0.3, ...over });
  const lookup = { lat: 0, lon: 0, climate: { cellLat: 0, cellLon: 0, distanceCells: 0, periods: [slot('1991-2020', 'historical')] }, soil: null, regions: { wgsrpdL3: null, isoA2: null } };
  const agave = taxon({ id: 'agave', canonical_name: 'Agave murpheyi', phases: null, climate: { source: 'gbif_occurrences', cells: 22, nativeShare: null, tminCold: r(-2, 10), tmaxWarm: r(20, 42), tmeanYear: null, tmeanWarm: null, aridity: r(0.1, 0.6) } });
  const ctx = { place: core.emptyPlace, lookup, period: '1991-2020', scenario: 'ssp245', canopy: null };
  const v = verdict(agave, ctx);
  assert.ok(v.notes.includes('few-records'), `notes ${v.notes}`);
  assert.equal(v.records, 22);
  assert.equal(line.fitLine(v).key, 'consortium.line.fitsFew');
  assert.ok(line.againstLines(v, null, W).some((e) => e.line.key === 'consortium.line.noteFewRecords' && e.line.vars.n === 22));
  const many = verdict({ ...agave, climate: { ...agave.climate, cells: 900 } }, ctx);
  assert.ok(!many.notes.includes('few-records'));
  assert.equal(line.fitLine(many).key, 'consortium.line.fits');
});

test('c2 fix C4 + B5 (later notes): warm enough later is worded from the later verdict, only when it fits then; drier later once; an annual\'s cool season said once; the engine gives both later notes', async () => {
  const today = vOf({ level: 'look', notes: ['warm-enough-later', 'drier-later'] });
  const lookLater = vOf({ judged: '2041-2070', level: 'look' });
  const k1 = keysOf(line.againstLines(today, lookLater, W));
  assert.ok(!k1.includes('noteWarmEnoughLater'), `no "warm enough" beside a later "second look" (${k1})`);
  const k2 = keysOf(line.againstLines(today, vOf({ judged: '2041-2070', notes: ['drier'] }), W));
  assert.ok(k2.includes('noteWarmEnoughLater'));
  assert.equal(k2.filter((k) => k === 'noteDrierBy').length, 1, `drier later said once (${k2})`);
  const cool = line.againstLines(vOf({ notes: ['cool-season', 'annual'] }), vOf({ judged: '2041-2070', notes: ['cool-season'] }), W);
  assert.equal(cool.filter((e) => e.note === 'cool-season').length, 1, 'the cool season said once');
  // The engine: too cool today and inside later; drier later and not today.
  const { taxon } = await import('./consortium-p5-fixtures.mjs');
  const r = (low, high) => ({ low, median: null, high, count: 900, basis: 'thinned_cells', weak: false });
  const slot = (period, scenario, over = {}) => ({ period, scenario, koppen: 'Cfb', koppenTemperatureMarginC: 0, tminColdC: 2, tmaxWarmC: 26, tmeanColdC: 6, tmeanWarmC: 17, aridityIndex: 1.2, ...over });
  const periods = [slot('1991-2020', 'historical'), ...core.scenarios.flatMap((s) => [slot('2041-2070', s, { tmeanWarmC: 21, aridityIndex: 0.4 }), slot('2071-2099', s, { tmeanWarmC: 23, aridityIndex: 0.3 })])];
  const lookup = { lat: 0, lon: 0, climate: { cellLat: 0, cellLon: 0, distanceCells: 0, periods }, soil: null, regions: { wgsrpdL3: null, isoA2: null } };
  const tree = taxon({ id: 'tree', canonical_name: 'Arbor', phases: { start: 'secondary_i', end: 'climax', sources: [] }, climate: { source: 'gbif_occurrences', cells: 900, nativeShare: null, tminCold: r(-5, 12), tmaxWarm: r(22, 40), tmeanYear: r(14, 25), tmeanWarm: null, aridity: r(0.6, 3) } });
  const v = verdict(tree, { place: core.emptyPlace, lookup, period: '1991-2020', scenario: 'ssp245', canopy: null });
  assert.ok(v.notes.includes('warm-enough-later'), `notes ${v.notes}`);
  assert.ok(v.notes.includes('drier-later'), `notes ${v.notes}`);
});

test('c2 fix B5 (limits keep their decimals): a cold limit of 7.84 against a place at 5.8 stays 7.84 in the line, never a rounded 7.8 that reads as within the 2 °C margin', () => {
  const l = line.reasonLine({ factor: 'cold', level: 'outside', basis: 'range', place: 5.8, low: 7.84, high: 20 });
  assert.equal(l.vars.tempBound, 7.84);
  assert.equal(l.vars.tempPlace, 5.8);
  const fit = readFileSync(new URL('../src/islands/consortium/views/kit/fit.tsx', import.meta.url), 'utf8');
  assert.match(fit, /k === 'tempBound' \? 2 : 1/, 'the page writes the limit with its two decimals');
});

test('c2 fix A4 (print invasive): print words each source through invasiveLines; its fallback names no source, in all 11 locales', () => {
  const print = readFileSync(new URL('../src/islands/consortium/views/PrintSheet.tsx', import.meta.url), 'utf8');
  assert.match(print, /invasiveLines\(/);
  for (const [lang, w] of Object.entries(words)) assert.doesNotMatch(w['consortium.print.flag.invasive'], /GRIIS/, lang);
});

test('c2 fix A5 + A8 (verdict failure): rangeFailed is sticky until a load succeeds; a retry that fails online needs a reload; wantVerdict never asks once only a reload works; no Resource Timing', () => {
  const store = readFileSync(new URL('../src/islands/consortium/store.ts', import.meta.url), 'utf8');
  assert.match(store, /rangeFailed = computed\(\(\) => verdictEverFailed\.value && !verdictRule\.value && siteClimate\.value\)/);
  assert.match(store, /if \(verdictLoad \|\| verdictNeedsReload\.peek\(\)\) return;/);
  assert.match(store, /if \(retry && globalThis\.navigator\?\.onLine !== false\) verdictNeedsReload\.value = true;/);
  assert.doesNotMatch(store, /getEntriesByType|importBroke/);
  // Only the reader's Try again (or back online) is a retry: the automatic asks stop after a failure.
  assert.match(store, /export function wantVerdict\(\): void \{\n  loadVerdict\(false\);/);
  assert.match(store, /export const retryVerdict = \(\): void => loadVerdict\(true\);/);
  const against = readFileSync(new URL('../src/islands/consortium/views/details/Against.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(against, /verdictNeedsReload\.peek\(\) \? location\.reload\(\)/, 'one button per action (A6)');
});

test('c2 fix B2 + B3 (one vocabulary, named exports): the site answers\' words come from verdict-line.ts siteLines; index.ts names the pure helpers of site, range and future, never export *', () => {
  const index = readFileSync(new URL('../src/lib/consortium/index.ts', import.meta.url), 'utf8');
  for (const f of ['site', 'range', 'future']) assert.doesNotMatch(index, new RegExp(`export \\* from './${f}\\.ts'`), f);
  assert.equal(typeof core.siteLines, 'function');
  assert.equal(core.siteFitMessages, undefined);
  assert.equal(core.rangeCheck, undefined, 'a rule\'s inner check stays in its file');
  const fit = readFileSync(new URL('../src/islands/consortium/rules/site-fit.ts', import.meta.url), 'utf8');
  assert.match(fit, /siteLines\(/);
});

test('c2 fix B6 (pt is Brazilian): the c2 words carry no European Portuguese forms', () => {
  const EU = /\bregist(o|os|ad[ao]s?)\b|nessa altura|para a verificar|\becrã|\butilizador|\bcontacto|\bficheiro|está a \w+r\b/;
  const mine = Object.entries(words.pt).filter(([k]) => /^consortium\.(line|details|d|swap|print|marks|misfit|scope)\./.test(k));
  assert.ok(mine.length > 100);
  assert.deepEqual(mine.filter(([, v]) => EU.test(v)).map(([k, v]) => `${k}: ${v}`), []);
});

// ---- fix round 1, the boards (C5, C7-C15, B1, B8) ----

const srcOf = (rel) => readFileSync(new URL(`../src/islands/consortium/${rel}`, import.meta.url), 'utf8');

test('c2 fix C12: a candidate with a caution (toxic, invasive here) ranks after the clean ones and before a warned one, and keeps its flags', async () => {
  const { alternatives } = await import('../src/lib/consortium/suggest.ts');
  const { taxon } = await import('./consortium-p5-fixtures.mjs');
  const t = (n, warnings = {}) => taxon({ id: `00000000-c2c2-4000-8000-0000000003${n}`, canonical_name: `Plantus ${n}`, stratum: { value: 'low', sources: [] }, phases: { start: 'placenta_i', end: 'secondary_ii', sources: [] }, functions: ['edible_fruit'], ...(Object.keys(warnings).length && { warnings: { ...taxon({}).warnings, ...warnings } }) });
  const member = t(10), toxic = t(11, { toxicity: { level: 'Severe', sources: [] } }), clean = t(12);
  const site = core.siteFor(core.emptyPlace, null);
  const alts = alternatives(member.id, [member], [toxic, clean], { site, interactions: [] });
  assert.deepEqual(alts.map((a) => a.id), [clean.id, toxic.id], 'the clean candidate first');
  assert.ok(alts[1].flags.some((f) => f.kind === 'toxicity'), 'the toxic one says why');
});

test('c2 fix C5: Sources names every range source (GBIF, TreeGOER) once; How sure says the list, the records, a disputed limit and the release', () => {
  const range = (o = {}) => ({ low: 1, median: 5, high: 10, count: 9, basis: 'gbif', blocks: null, lowSource: null, highSource: null, weak: false, ...o });
  const t = { climate: { source: 'gbif_occurrences', tminCold: range({ lowSource: 'treegoer_ranges', weak: true }), tmaxWarm: range(), tmeanYear: null, tmeanWarm: null, aridity: null, cells: 872, nativeShare: null } };
  assert.deepEqual(line.rangeSourceNames(t), ['GBIF', 'TreeGOER']);
  const keys = (ls) => ls.map((l) => l.key.slice('consortium.details.'.length));
  const lines = line.sureLines(t, { list: 'Tropical', estimate: true, disputeShown: false, release: 'r-1' });
  assert.deepEqual(keys(lines), ['sureListEstimate', 'sureRange', 'sureDisputed', 'sureRelease']);
  assert.equal(say(lines[1]), 'Climate range: records in 872 map squares (GBIF, TreeGOER), an estimate.');
  assert.deepEqual(keys(line.sureLines(t, { list: 'Tropical', estimate: false, disputeShown: true, release: '' })), ['sureList', 'sureRange'], 'a dispute row already said: no second line');
  assert.deepEqual(keys(line.sureLines({ climate: null }, { list: 'Tropical', estimate: false, disputeShown: false, release: 'r' })), ['sureList', 'sureRangeNone', 'sureRelease']);
  const details = srcOf('views/details/Details.tsx');
  assert.match(details, /rangeSourceNames\(t\)/, 'Details lists the range sources under Sources');
  assert.match(details, /sureLines\(t, \{/, 'How sure reads sureLines');
});

test('c2 fix C7-C10, B1, B8: Details as the boards: list said once, summary card before Against, closed sections, the add foot, What you can do, bands', () => {
  const d = srcOf('views/details/Details.tsx'), a = srcOf('views/details/Against.tsx');
  const at = (re) => d.search(re);
  assert.ok(at(/data-summary/) > 0 && at(/data-summary/) < at(/<Against /), 'C7: the summary card before Against');
  assert.ok(!/ct-tag-guest/.test(d), 'C8: no guest tag beside the list line');
  assert.equal((d.match(/borrowedLine\(/g) ?? []).length, 1, 'C8: the borrowed list said once');
  assert.match(d, /l\.kind !== 'invasive' \|\| !scoped\.length/, 'C9: the invasive flag line gives way to the per-source lines');
  for (const k of ['jobs', 'light', 'pairs', 'warn', 'why', 'sure']) assert.match(d, new RegExp(`<More k="${k}"`), `B8: section ${k} collapsible`);
  assert.match(d, /<details class="ct-more"/, 'B8: a native details element, closed by default');
  assert.match(d, /foot=\{member \? undefined : /, 'phone foot: Add to my palette for a plant not in the palette');
  assert.match(d, /alternativesFor\(id\)\?\.fit\.slice\(0, 2\)/, 'C10: the first two candidates inline');
  assert.ok(!/keepIt|asTable/.test(d), 'C10: no Keep it, no Show as a table');
  assert.match(a, /limitOf\(d\)/, 'B1: the disputed limit dashed through limitOf');
  assert.match(a, /<Band f=/, 'B1: a band per factor');
  const css = readFileSync(new URL('../src/styles/consortium/details.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(min-width: 960px\)[\s\S]*\.ct-d-body \{ display: grid; grid-template-columns/, 'C10: two columns from 960px');
  assert.match(css, /\.ct-photo img \{[^}]*aspect-ratio: 3 \/ 1/, 'the board\'s short photo so Against starts on the first screen');
});

test('c2 fix C11, C13, C15: Swap header, jobs per candidate, its foot; Correction sends the full context, Cancel before Send', () => {
  const s = srcOf('views/Swap.tsx'), c = srcOf('views/Correction.tsx'), bar = srcOf('views/StageBar.tsx');
  assert.match(s, /data-swap-head/, 'C11: the header with the reason and the jobs');
  assert.match(s, /doesWords\(memberJobs, a\.sharedJobs\)/, 'C11: Does N of its M jobs per candidate');
  assert.match(s, /sizeWords\(x\)/, 'C12: the size per candidate');
  assert.match(s, /swap\.keep[\s\S]*swap\.remove/, 'C11: the foot keeps or removes it');
  assert.ok(!/swap\.shares/.test(s), 'C11: no "Shares:"');
  assert.match(s, /swap\.ledeBorrowed/, 'C13: borrowed intro');
  assert.match(bar, /swap\.doesSome', \{ n: shared\.length, m: memberJobs\.length, missing:/);
  assert.equal(en['consortium.swap.doesSome'], 'Does {n} of its {m} jobs (no {missing})');
  assert.ok(c.indexOf("T('correction.cancel')") < c.indexOf("T('correction.send')"), 'C15: Cancel, then Send (owner 2026-11-17: the board\'s order)');
  assert.ok(c.indexOf('ct-corr-status') < c.indexOf('<div class="ct-actions">'), 'C15: what needs a look above the buttons');
  assert.match(c, /T\('details\.notLocation'\)/, 'C15: Not your location.');
  assert.match(srcOf('views/details/Details.tsx'), /climateLabel=\{climateLabel\}/, 'C15: Sent with names the list it is placed as');
  assert.equal(en['consortium.details.climatePlaced'], '{climate}, placed as on the {list} list');
});
