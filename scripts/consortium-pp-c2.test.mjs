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
//                    audienceLine(audience) -> Line; limitOf(rangeDispute) -> { valueC, dashed, source };
//                    frostLine(facts: FrostFact[] | null, releaseHasFrost) -> Line | null (format note
//                    Q7 precedence; a ktmpr never in it), restLine(facts) -> Line | null (the ktmpr,
//                    apart, with its own label);
//                    sourceLine(traitSource: TraitSource) -> Line ("Canopi curator knowledge",
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
import { failing } from './expect-fail.mjs';

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
  assert.ok(edge.includes(say(line.confidenceLine({ term: 'edge' }))), `the edge term in the reason ("${edge}")`);
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
  // The bound's source: a limit from TreeGOER says so (range-marks' source.treegoer today).
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
  assert.equal(say(line.audienceLine({ who: 'pets', level: null, source: 'ASPCA' })), 'toxic to pets (ASPCA), no level given');
  assert.match(say(line.audienceLine({ who: 'livestock', level: 'Severe', source: 'Merck Veterinary Manual' })), /livestock.*Merck Veterinary Manual/);
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
  assert.equal(say(line.sourceLine(ts('toxicity', 'canopi-knowledge'))), 'Canopi curator knowledge');
  assert.equal(say(line.sourceLine(ts('toxicity', 'canopi-correction'))), 'Canopi correction');
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
  assert.match(say(line.sourceLine(ts('frost_tender', 'pfaf', 'GB'))), /Britain \(PFAF\)/);
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
  assert.ok(lines.includes(say(line.sourceLine(details.traitSources[0]))), 'the corrected value\'s source');
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
failing('PP-C-u15 (c2 Swap gains): Swap\'s gains and losses are holes(members) against holes(members - m + c), with the candidates\' verdicts; the strata gain kept', { owner: 'c2', reason: /swapChange is not a function/ }, async () => {
  const holesMod = await import('../src/lib/consortium/holes.ts');
  const { taxon, placement } = await import('./consortium-p5-fixtures.mjs');
  void placement;
  const t = (n, stratum, start, end, fn) => taxon({ id: `00000000-c2c2-4000-8000-00000000002${n}`, canonical_name: `Plantus ${n}`, stratum: { value: stratum, sources: [] }, phases: { start, end, sources: [] }, functions: fn });
  const members = [t(1, 'emergent', 'secondary_i', 'climax', ['nitrogen_fixer']), t(2, 'low', 'placenta_i', 'secondary_ii', ['edible_fruit'])];
  const out = members[1], inn = t(3, 'medium', 'placenta_i', 'climax', ['pollinator_forage']);
  const verdicts = new Map([...members, inn].map((x) => [x.id, { id: x.id, judged: '1991-2020', ownYears: false, level: 'fits', limiting: null, factors: [], notes: [] }]));
  const ctx = { members, verdicts, pending: false };
  const before = new Set(holesMod.holes(ctx).map((h) => h.id));
  const after = new Set(holesMod.holes({ ...ctx, members: [members[0], inn] }).map((h) => h.id));
  const change = holesMod.swapChange(ctx, out, inn);
  assert.deepEqual(change.fills.map((h) => h.id).sort(), [...before].filter((id) => !after.has(id)).sort(), 'what it fills: open before, closed after');
  assert.deepEqual(change.leaves.map((h) => h.id).sort(), [...after].filter((id) => !before.has(id)).sort(), 'what it leaves empty: closed before, open after');
  assert.equal(change.strataGain, true, 'a stratum no member stands in (medium): the strata gain kept');
  assert.equal(holesMod.swapChange(ctx, out, t(4, 'low', 'placenta_i', 'secondary_ii', ['edible_fruit'])).strataGain, false, 'the same stratum: no strata gain');
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

// ---- PP-C c2 commit 1, the mapping probe (removed with the mark providers) ----
// Every mark the old providers give in Details (range-marks, future-marks, site-marks for surface
// 'details') must have a line in the new words (verdict-line.ts againstLines over the verdict engine),
// over every plant of the installed export, 9 places on the v0.2.0 tiles (historical and 8 scenario
// slots each, inlined below: [period, scenario, koppen, margin, tminCold, tmaxWarm, tmeanCold,
// tmeanWarm, aridity, precip, dryMonths]), the 3 page periods, and no location on two borrowed
// climates. A place's own climate list is its pool, the other plants come in as guests. Each mark
// kind/state maps to a predicate over the lines; the set no line says is printed and must be empty.
const PROBE_PLACES = {
  lyon: { lat: 45.7578, lon: 4.832, iso: "FR", slots: [["1991-2020", "historical", "Cfa", 0, 0.1, 26.6, 4.3, 22.4, 1.1, 809, 0], ["2041-2070", "ssp126", "Cfa", 0, 0.9, 28.4, 5.1, 24.2, 1.02, 800, 0], ["2041-2070", "ssp245", "Cfa", 0, 1.3, 28.8, 5.5, 24.6, 0.99, 791, 0], ["2041-2070", "ssp370", "Cfa", 0, 1.7, 29.1, 5.9, 24.9, 0.97, 785, 0], ["2041-2070", "ssp585", "Cfa", 0, 1.9, 29.7, 6.1, 25.5, 0.94, 780, 0], ["2071-2099", "ssp126", "Cfa", 0, 1.1, 28.3, 5.3, 24.1, 1.03, 811, 0], ["2071-2099", "ssp245", "Cfa", 0, 1.8, 29.6, 6, 25.4, 0.95, 785, 0], ["2071-2099", "ssp370", "Cfa", 0, 2.7, 31.1, 6.9, 26.9, 0.85, 758, 2], ["2071-2099", "ssp585", "Cfa", 0, 3.3, 32.3, 7.4, 28.1, 0.8, 746, 2]] },
  seville: { lat: 37.3891, lon: -5.9845, iso: "ES", slots: [["1991-2020", "historical", "Csa", 0, 5.8, 34.8, 11, 27.8, 0.58, 566, 5], ["2041-2070", "ssp126", "Csa", 0, 6.6, 36.2, 11.8, 29.2, 0.51, 544, 5], ["2041-2070", "ssp245", "Csa", 0, 6.9, 36.6, 12.1, 29.6, 0.47, 517, 5], ["2041-2070", "ssp370", "Csa", 0, 7.1, 36.9, 12.3, 29.8, 0.46, 513, 5], ["2041-2070", "ssp585", "Csa", 0, 7.3, 37.4, 12.5, 30.3, 0.44, 497, 5], ["2071-2099", "ssp126", "Csa", 0, 6.7, 36.2, 11.9, 29.2, 0.51, 539, 5], ["2071-2099", "ssp245", "Csa", 0, 7.3, 37.2, 12.5, 30.2, 0.45, 507, 5], ["2071-2099", "ssp370", "Csa", 0, 8.1, 38.3, 13.3, 31.3, 0.39, 469, 5], ["2071-2099", "ssp585", "BSh", 0, 8.6, 39.2, 13.8, 32.1, 0.36, 449, 5]] },
  kiambu: { lat: -1.1714, lon: 36.8356, iso: "KE", slots: [["1991-2020", "historical", "Cfb", 0, 12, 26.1, 17.2, 20.8, 1.15, 986, 3], ["2041-2070", "ssp126", "Aw", 0, 13, 27, 18.2, 21.6, 1.16, 1051, 3], ["2041-2070", "ssp245", "Aw", 0, 13.3, 27.3, 18.6, 22, 1.13, 1044, 3], ["2041-2070", "ssp370", "Aw", 0, 13.6, 27.6, 18.8, 22.3, 1.1, 1041, 4], ["2041-2070", "ssp585", "Aw", 0, 13.8, 27.8, 19.1, 22.4, 1.12, 1065, 4], ["2071-2099", "ssp126", "Aw", 0, 13, 27, 18.2, 21.6, 1.17, 1063, 3], ["2071-2099", "ssp245", "Aw", 0, 14, 27.8, 19.2, 22.5, 1.12, 1080, 3], ["2071-2099", "ssp370", "Aw", 0, 14.9, 28.6, 20.1, 23.3, 1.08, 1110, 4], ["2071-2099", "ssp585", "Aw", 0, 15.5, 29.1, 20.7, 23.8, 1.06, 1134, 4]] },
  recife: { lat: -8.0476, lon: -34.877, iso: "BR", slots: [["1991-2020", "historical", "Am", 0, 22.7, 29.4, 24.6, 27.3, 1.14, 1770, 3], ["2041-2070", "ssp126", "Aw", 0, 23.5, 30.4, 25.4, 28.2, 1.02, 1704, 3], ["2041-2070", "ssp245", "Aw", 0, 23.8, 30.7, 25.7, 28.5, 0.97, 1666, 3], ["2041-2070", "ssp370", "Aw", 0, 24, 30.9, 25.9, 28.7, 0.95, 1671, 3], ["2041-2070", "ssp585", "Aw", 0, 24.2, 31.1, 26.1, 28.9, 0.92, 1635, 3], ["2071-2099", "ssp126", "Aw", 0, 23.6, 30.4, 25.5, 28.2, 1.01, 1694, 3], ["2071-2099", "ssp245", "Aw", 0, 24.2, 31.1, 26.1, 28.9, 0.92, 1642, 3], ["2071-2099", "ssp370", "Aw", 0, 25, 32, 26.9, 29.8, 0.87, 1626, 3], ["2071-2099", "ssp585", "Aw", 0, 25.4, 32.5, 27.3, 30.3, 0.83, 1595, 3]] },
  oulu: { lat: 65.0121, lon: 25.4651, iso: "FI", slots: [["1991-2020", "historical", "Dfc", 0, -11.2, 19.5, -8.5, 16.6, 0.97, 549, 0], ["2041-2070", "ssp126", "Dfb", 0, -9.3, 20.9, -6.6, 18, 0.95, 577, 0], ["2041-2070", "ssp245", "Dfb", 0, -8.5, 21.3, -5.9, 18.4, 0.93, 579, 0], ["2041-2070", "ssp370", "Dfb", 0, -8, 21.6, -5.4, 18.8, 0.93, 585, 0], ["2041-2070", "ssp585", "Dfb", 0, -7.4, 22, -4.7, 19.1, 0.92, 589, 0], ["2071-2099", "ssp126", "Dfb", 0, -9.2, 21, -6.6, 18.2, 0.94, 574, 0], ["2071-2099", "ssp245", "Dfb", 0, -7.4, 22, -4.8, 19.2, 0.91, 588, 0], ["2071-2099", "ssp370", "Dfb", 0, -5.7, 23.1, -3.1, 20.3, 0.9, 611, 0], ["2071-2099", "ssp585", "Dfb", 0, -4.7, 23.8, -2.1, 20.9, 0.88, 619, 0]] },
  mendoza: { lat: -32.8895, lon: -68.8458, iso: "AR", slots: [["1991-2020", "historical", "BWk", 0, 3.1, 29.3, 7.6, 24.3, 0.28, 233, 12], ["2041-2070", "ssp126", "BWk", 0, 4, 30.5, 8.4, 25.5, 0.27, 234, 12], ["2041-2070", "ssp245", "BWk", 0, 4.3, 30.9, 8.8, 25.9, 0.26, 233, 12], ["2041-2070", "ssp370", "BWh", 0, 4.6, 31.1, 9, 26.1, 0.25, 229, 12], ["2041-2070", "ssp585", "BWh", 0, 4.8, 31.5, 9.3, 26.4, 0.25, 234, 12], ["2071-2099", "ssp126", "BWk", 0, 4, 30.5, 8.4, 25.5, 0.27, 237, 12], ["2071-2099", "ssp245", "BWh", 0, 4.8, 31.5, 9.3, 26.4, 0.25, 232, 12], ["2071-2099", "ssp370", "BWh", 0, 5.6, 32.5, 10, 27.5, 0.23, 231, 12], ["2071-2099", "ssp585", "BWh", 0, 6.1, 33.3, 10.6, 28.3, 0.23, 237, 12]] },
  kumasi: { lat: 6.6885, lon: -1.6244, iso: "GH", slots: [["1991-2020", "historical", "Aw", 0, 21.8, 33.7, 24.7, 28.1, 0.86, 1362, 2], ["2041-2070", "ssp126", "Aw", 0, 22.7, 34.7, 25.6, 29.1, 0.8, 1368, 3], ["2041-2070", "ssp245", "Aw", 0, 23, 35, 25.9, 29.4, 0.78, 1366, 3], ["2041-2070", "ssp370", "Aw", 0, 23.2, 35.2, 26.1, 29.6, 0.76, 1358, 3], ["2041-2070", "ssp585", "Aw", 0, 23.5, 35.3, 26.3, 29.7, 0.75, 1358, 3], ["2071-2099", "ssp126", "Aw", 0, 22.8, 34.7, 25.6, 29.1, 0.8, 1369, 3], ["2071-2099", "ssp245", "Aw", 0, 23.5, 35.7, 26.4, 30.1, 0.75, 1363, 3], ["2071-2099", "ssp370", "Aw", 0, 24.3, 36.4, 27.1, 30.8, 0.71, 1348, 3], ["2071-2099", "ssp585", "Aw", 0, 24.8, 36.9, 27.7, 31.3, 0.69, 1348, 3]] },
  manaus: { lat: -3.119, lon: -60.0217, iso: "BR", slots: [["1991-2020", "historical", "Af", 0, 24, 31.2, 26.7, 28.3, 1.3, 2270, 0], ["2041-2070", "ssp126", "Af", 0, 25, 32.5, 27.8, 29.7, 1.2, 2235, 0], ["2041-2070", "ssp245", "Am", 0, 25.3, 33, 28.1, 30.2, 1.16, 2206, 1], ["2041-2070", "ssp370", "Am", 0, 25.6, 33.4, 28.3, 30.6, 1.12, 2169, 1], ["2041-2070", "ssp585", "Am", 0, 25.9, 34, 28.6, 31.1, 1.09, 2144, 1], ["2071-2099", "ssp126", "Af", 0, 25.1, 32.6, 27.8, 29.8, 1.18, 2216, 0], ["2071-2099", "ssp245", "Am", 0, 25.8, 33.9, 28.6, 31.1, 1.12, 2187, 1], ["2071-2099", "ssp370", "Am", 0, 26.8, 35.3, 29.6, 32.4, 1.03, 2104, 1], ["2071-2099", "ssp585", "Am", 0, 27.5, 36.6, 30.3, 33.8, 0.99, 2081, 2]] },
  osaka: { lat: 34.6937, lon: 135.5023, iso: "JP", slots: [["1991-2020", "historical", "Cfa", 0, 0.9, 32.3, 5.9, 29.1, 1.53, 1414, 0], ["2041-2070", "ssp126", "Cfa", 0, 2.1, 33.5, 7.1, 30.4, 1.47, 1463, 0], ["2041-2070", "ssp245", "Cfa", 0, 2.4, 33.7, 7.4, 30.6, 1.44, 1449, 0], ["2041-2070", "ssp370", "Cfa", 0, 2.7, 34, 7.8, 30.8, 1.43, 1460, 0], ["2041-2070", "ssp585", "Cfa", 0, 3, 34.4, 8.1, 31.2, 1.41, 1474, 0], ["2071-2099", "ssp126", "Cfa", 0, 2.2, 33.5, 7.3, 30.4, 1.48, 1473, 0], ["2071-2099", "ssp245", "Cfa", 0, 3, 34.4, 8.1, 31.2, 1.42, 1478, 0], ["2071-2099", "ssp370", "Cfa", 0, 4, 35.2, 9, 32.1, 1.36, 1486, 0], ["2071-2099", "ssp585", "Cfa", 0, 4.7, 36, 9.7, 32.8, 1.32, 1505, 0]] },
};
const PROBE_ANSWERS = { mendoza: { water: 'dry' }, seville: { water: 'dry' }, lyon: { room: 'small' }, osaka: { room: 'pots' }, oulu: { room: 'large' } };
test('PP-C c2 probe: every old Details mark (range, future, site) has a line in againstLines over the verdict engine (673 plants, 9 places, 3 periods, plus no location)', async () => {
  const { gunzipSync } = await import('node:zlib');
  const { rangeMarks } = await import('../src/lib/consortium/range-marks.ts');
  const { futureMarks } = await import('../src/lib/consortium/future-marks.ts');
  const { siteMarks } = await import('../src/lib/consortium/site-marks.ts');
  const { koppenZone } = await import('../src/lib/consortium/site-climate.ts');
  const { futurePeriod } = await import('../src/lib/consortium/future.ts');
  const { periodName, scenarioName } = line;
  const { openBytes } = await import('../src/islands/consortium/data/load.ts');
  const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
  const index = JSON.parse(readFileSync(new URL('../src/data/consortium-index.json', import.meta.url), 'utf8'));
  const opened = await openBytes(new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url)))), { releaseId: index.release_id, climates: index.climates });
  const src = createSqliteSource(opened.db, { images: {} });
  const byId = new Map();
  for (const c of src.info().climates) for (const t of await src.pool(c)) if (!byId.has(t.id)) byId.set(t.id, t);
  const all = [...byId.values()];
  const scenario = 'ssp245', scenarioWords = scenarioName(scenario);
  const words = { period: (p) => periodName(p), scenario: scenarioWords, heightM: null };
  const unmapped = new Map(); // "kind/state" -> example
  let marks = 0, runs = 0;
  const seen = new Map(); // "kind/key" -> marks of it
  const has = (lines, p) => lines.some(p);
  const k = (e) => e.line.key.replace(/^consortium\.(line|details)\./, '');
  const also = (e, key) => (e.line.also ?? []).some((a) => a.key.endsWith(`.${key}`));
  const SIDE_KEY = { cold: 'Cold', mild: 'Mild', cool: 'Cool', summer: 'Summer', hot: 'Hot' };
  // One old mark against the lines of today's verdict (with the later one) at the page period today.
  function mapped(m, lines, v, later) {
    const now = lines.filter((e) => !e.later), then = lines.filter((e) => e.later);
    const side = (e) => e.factor === m.state && !e.later;
    switch (`${m.kind}:${m.key}`) {
      case 'outside:range.outsideDetails': return v.level === 'outside' && m.state.split(' ').every((s) => has(now, (e) => e.factor === s && (e.level === 'outside' || e.level === 'look')));
      case 'edge:range.edgeDetails': return v.level === 'look' && m.state.split(' ').every((s) => has(now, (e) => e.factor === s && e.level === 'look' && also(e, 'confEdge')));
      case 'unknown:range.unknown': return has(now, (e) => k(e) === 'rangeNotRecorded');
      case 'aridity:range.drier': return has(now, (e) => k(e) === 'pastDrier');
      case 'aridity:range.wetter': return has(now, (e) => k(e) === 'pastWetter');
      case 'season:range.coolSeason': return has(now, (e) => e.note === 'cool-season');
      case 'unknown:range.annual': return has(now, (e) => e.note === 'annual');
      // With no range recorded nothing is compared: "Range not recorded" says it, dryness included.
      case 'unknown:range.aridityNotChecked': return has(now, (e) => k(e) === 'dryNotChecked' || k(e) === 'rangeNotRecorded');
      case 'estimate:estimate.noSite': return has(now, (e) => k(e) === 'reasonNoSite');
      case 'future:future.long.heat': return !!later && later.level === 'outside' && has(then, (e) => e.factor === 'hot' && e.level === 'outside');
      case 'future:future.long.edge': return !!later && has(then, (e) => e.factor === 'hot' && e.level === 'look');
      case 'future:future.warmEnough': return has(now, (e) => e.note === 'warm-enough-later');
      case 'future:future.drier': return has(now, (e) => e.note === 'drier-later') || has(then, (e) => e.note === 'drier');
      case 'season:future.coolSeason': return has(then, (e) => e.note === 'cool-season');
      case 'water:water.dryMonths': return has(now, (e) => e.note === 'dry-months');
      case 'room:room.tall': return has(now, (e) => e.note === 'room-tall');
    }
    if (m.key.startsWith('range.side.')) return has(now, (e) => side(e) && k(e) === `past${SIDE_KEY[m.state]}` && e.level === (m.kind === 'outside' ? 'outside' : 'look'));
    if (m.key === 'range.source.treegoer') return has(now, (e) => e.level !== 'fits' && also(e, 'sourceTreegoer'));
    if (m.key === 'range.disputed') return has(now, (e) => e.level !== 'fits' && also(e, 'confDisputedLimit'));
    if (m.key.startsWith('estimate.from')) return has(now, (e) => k(e) === `borrowed${m.key.slice('estimate.from'.length)}` && e.conf === 'estimate');
    return false;
  }
  function run(taxa, location, place, label) {
    const lookup = location?.lookup ?? null;
    const site = core.siteFor(place, lookup);
    const mctx = { climate: null, location, site, scenario };
    for (const period of ['1991-2020', '2041-2070', '2071-2099']) {
      const ctx = { place, lookup, period, scenario };
      for (const t of taxa) {
        runs++;
        const v = verdict(t, ctx);
        const own = futurePeriod(t);
        const later = own && own !== v.judged ? verdict(t, { ...ctx, period: own }) : null;
        const lines = line.againstLines(v, later, { ...words, heightM: t.traits.height_m?.max ?? null });
        if (period !== '1991-2020') continue; // the old marks speak of today and the plant's own later period
        for (const m of [...rangeMarks(t, mctx, 'details'), ...futureMarks(t, mctx, 'details'), ...siteMarks(t, mctx, 'details')]) {
          marks++;
          const kk = `${m.kind}/${m.key}`; seen.set(kk, (seen.get(kk) ?? 0) + 1);
          if (!mapped(m, lines, v, later)) {
            const id = `${m.kind}/${m.key}/${m.state ?? ''}`.replace(/\/(cold|mild|cool|summer|hot)( (cold|mild|cool|summer|hot))*$/, '/<sides>');
            const n = unmapped.get(id) ?? { n: 0, example: `${label}: ${t.canonical_name}` };
            n.n++; unmapped.set(id, n);
          }
        }
      }
    }
  }
  for (const [name, p] of Object.entries(PROBE_PLACES)) {
    const periods = p.slots.map(([period, sc, koppen, margin, tminColdC, tmaxWarmC, tmeanColdC, tmeanWarmC, aridityIndex, precipMm, dryMonths]) => ({ period, scenario: sc, koppen, koppenTemperatureMarginC: margin, tminColdC, tmaxWarmC, tmeanColdC, tmeanWarmC, aridityIndex, precipMm, dryMonths }));
    const lookup = { lat: p.lat, lon: p.lon, climate: { cellLat: p.lat, cellLon: p.lon, distanceCells: 0, periods }, soil: null, regions: { wgsrpdL3: null, isoA2: p.iso } };
    const zone = koppenZone(periods[0].koppen);
    const pool = await src.pool(zone);
    const own = new Set(pool.map((t) => t.id));
    const answers = PROBE_ANSWERS[name] ?? {};
    const place = { ...core.emptyPlace, room: answers.room ?? 'unsure', spot: { ...core.emptyPlace.spot, water: answers.water ?? 'unsure' } };
    run([...pool, ...all.filter((t) => !own.has(t.id))], { lat: p.lat, lon: p.lon, source: 'search', lookup }, place, `${name} (${zone})`);
  }
  for (const zone of ['Subtropical', 'Boreal']) run(await src.pool(zone), null, core.emptyPlace, `no location (${zone})`);
  // Two cases the real places do not give: ice (no aridity index) and plants with no range recorded.
  const ice = PROBE_PLACES.oulu, iceSlots = ice.slots.map(([period, sc, koppen, margin, a, b, c, d, , precipMm, dryMonths]) => ({ period, scenario: sc, koppen, koppenTemperatureMarginC: margin, tminColdC: a, tmaxWarmC: b, tmeanColdC: c, tmeanWarmC: d, aridityIndex: null, precipMm, dryMonths }));
  const iceLookup = { lat: ice.lat, lon: ice.lon, climate: { cellLat: ice.lat, cellLon: ice.lon, distanceCells: 0, periods: iceSlots }, soil: null, regions: { wgsrpdL3: null, isoA2: null } };
  run([...all.slice(0, 50), ...all.slice(0, 50).map((t) => ({ ...t, id: `${t.id.slice(0, -4)}ffff`, climate: null }))], { lat: ice.lat, lon: ice.lon, source: 'search', lookup: iceLookup }, core.emptyPlace, 'ice, and no range');
  const table = [...unmapped].map(([id, { n, example }]) => `${id}: ${n} (e.g. ${example})`);
  console.log(`PP-C c2 probe: ${all.length} plants, ${runs} verdicts, ${marks} old Details marks (${[...seen].map(([kk, n]) => `${kk} ${n}`).join(', ')}); unmapped kinds: ${table.length ? '\n  ' + table.join('\n  ') : 'none'}`);
  assert.ok(all.length >= 673, `${all.length} plants`);
  assert.deepEqual(table, [], 'every old mark has a line');
});
