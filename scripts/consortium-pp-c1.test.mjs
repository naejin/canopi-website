// PP-C stream c1, Find (plant-palette-slices section 3.4, c1 unit rows): the lasting layer under Find.
// Written failing in PP-C commit 0, each case marked expected-fail (scripts/expect-fail.mjs failing(),
// owner c1 in its title); c1 removes a marker in the commit that makes it pass. The modules are c1's:
// rules/find-query.ts (new), data/search.ts (one search module for Find and Paste: fold, scoring,
// oneOff, the release-wide index over the names file and plants) and core fold.ts (normalization v1).
//
// The contract these cases propose (c1 may rename within its chunk, keeping the cases):
//   find-query.ts  findGroups(taxa, verdicts, warned) -> { fits, look, outside, unchecked } (Taxon[] each);
//                  applyFilters(taxa, filters, ctx) -> { rows, unknown: Record<filterId, number> };
//                  jobsMatching(query, lang) -> JobId[] (a job word of the page's locale finds its job).
//   search.ts      releaseIndex({ names, plants, lang }) -> (query) => FindHit[], where a FindHit is
//                  { id, tier: 'site' | 'scientific' | 'other', why: { kind, text, lang?, match }, shared }
//                  (match: 'exact' | 'prefix' | 'tokens' | 'alternate', the site tier's order; shared:
//                  how many other plants use that name), hits in tier order, then match order; namesFor(fileHeader, page) -> boolean
//                  (false drops the names file: release_id or core_raw_sha256 differs); listsOf(id, lists);
//                  oneOff(a, b) moved here from views/paste.ts; namesLine(fileLangs) -> Line;
//   views/paste.ts readPaste(names, { here, others, members, index }) matches through index (a
//                  releaseIndex), so a pasted synonym or names-file name is found as Find finds it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { failing } from './expect-fail.mjs';
import { taxon } from './consortium-p5-fixtures.mjs';

const { fold, jobIds } = await import('../src/lib/consortium/index.ts');
const words = Object.fromEntries(readdirSync(new URL('../src/i18n/translations/', import.meta.url)).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), JSON.parse(readFileSync(new URL(`../src/i18n/translations/${f}`, import.meta.url), 'utf8'))]));
// The module c1 adds, through a variable so knip does not count a commit-0 import as unresolved.
const FIND_QUERY = new URL('../src/islands/consortium/rules/find-query.ts', import.meta.url).href;
const findQuery = () => import(FIND_QUERY);
const NO_FIND_QUERY = /Cannot find module .*find-query\.ts/;
const search = () => import('../src/islands/consortium/data/search.ts');

const id = (n) => `00000000-c1c1-4000-8000-${String(n).padStart(12, '0')}`;
const plant = (n, over = {}) => taxon({ id: id(n), canonical_name: `Plantus ${n}`, ...over });
const V = (level) => ({ level, limiting: null, factors: [], confidence: [] });

test('PP-C c1 unit file (commit 0): the job words it reads exist in all 11 locales', () => {
  assert.equal(Object.keys(words).length, 11);
  for (const [lang, w] of Object.entries(words)) for (const job of jobIds) assert.ok(w[`consortium.job.${job}`], `${lang}: consortium.job.${job}`);
});

failing('PP-C-u1 (c1 find-query groups): Find groups fits, needs a second look (level look, or a toxic or invasive warning), outside its range and not checked', { owner: 'c1', reason: NO_FIND_QUERY }, async () => {
  const { findGroups } = await findQuery();
  const taxa = [plant(1), plant(2), plant(3), plant(4), plant(5)];
  const verdicts = new Map([[id(1), V('fits')], [id(2), V('look')], [id(3), V('outside')], [id(5), V('fits')]]);
  const g = findGroups(taxa, verdicts, new Set([id(5)]));
  assert.deepEqual(g.fits.map((t) => t.id), [id(1)]);
  assert.deepEqual(g.look.map((t) => t.id).sort(), [id(2), id(5)], 'a warned plant that fits needs a second look, never hidden');
  assert.deepEqual(g.outside.map((t) => t.id), [id(3)]);
  assert.deepEqual(g.unchecked.map((t) => t.id), [id(4)], 'no verdict: not checked, never a fit');
});

failing('PP-C-u2 (c1 find-query filters): every filter returns the count of plants it could not judge, and hides none of them silently', { owner: 'c1', reason: NO_FIND_QUERY }, async () => {
  const { applyFilters } = await findQuery();
  const taxa = [plant(1, { traits: { edibility_rating: 4 } }), plant(2, { traits: { edibility_rating: 0 } }), plant(3, { traits: {} })];
  const { rows, unknown } = applyFilters(taxa, { edible: true }, { climate: 'Temperate' });
  assert.deepEqual(rows.map((t) => t.id), [id(1)]);
  assert.equal(unknown.edible, 1, 'the plant with no edibility recorded is counted');
});

failing('PP-C-u3 (c1 find-query jobs): a job word in each of the 11 locales finds its job', { owner: 'c1', reason: NO_FIND_QUERY }, async () => {
  const { jobsMatching } = await findQuery();
  for (const [lang, w] of Object.entries(words)) for (const job of jobIds) {
    const word = w[`consortium.job.${job}`];
    assert.ok(jobsMatching(word, lang).includes(job), `${lang}: "${word}" finds ${job}`);
  }
});

// other: the names file's rows (an 'en' row on an English page is an alternate site-language name).
const NAMES = [
  { id: id(1), canonical: 'Abelmoschus esculentus', names: { en: 'Okra' }, other: [{ lang: 'fr', text: 'Gombo' }, { lang: 'en', text: "Lady's fingers" }], synonyms: [] },
  { id: id(2), canonical: 'Solanum lycopersicum', names: { en: 'Tomato' }, other: [], synonyms: ['Lycopersicon esculentum'] },
  { id: id(3), canonical: 'Dioscorea alata', names: { en: 'Yam' }, other: [], synonyms: [] },
  { id: id(4), canonical: 'Dioscorea rotundata', names: { en: 'Yam' }, other: [], synonyms: [] },
  { id: id(5), canonical: 'Ipomoea batatas', names: { en: 'Sweet potato, yam' }, other: [], synonyms: [] },
  // Made-up plants for the tier order: "gombo" is a site name's prefix (6), a scientific name's (7) and
  // okra's French name (1); "yam" is an alternate English name of 8.
  { id: id(6), canonical: 'Plantus sextus', names: { en: 'Gombo bean' }, other: [], synonyms: [] },
  { id: id(7), canonical: 'Gombosia minor', names: { en: 'Little gombosia' }, other: [], synonyms: [] },
  { id: id(8), canonical: 'Plantus octavus', names: { en: 'Winged vine' }, other: [{ lang: 'en', text: 'Yam' }], synonyms: [] },
];

test('PP-C-u4 (c1 search tiers): site-language names first (exact, prefix, all tokens, alternates), then scientific names and synonyms, then other languages labelled with their language; each hit says why it matched', async () => {
  const { releaseIndex } = await search();
  const find = releaseIndex({ names: NAMES, plants: NAMES.map((n) => n.id), lang: 'en' });
  // The tiers in order, whatever the match within each: a site name's prefix before a scientific
  // name's prefix before another language's exact name.
  const gombo = find('gombo');
  assert.deepEqual(gombo.map((h) => [h.id, h.tier]), [[id(6), 'site'], [id(7), 'scientific'], [id(1), 'other']], 'site, then scientific, then other languages');
  assert.equal(gombo[2].why.lang, 'fr', '"Gombo" labelled as a French name');
  // Within the site tier: exact, prefix, all tokens, alternates.
  const yam = find('yam');
  assert.deepEqual(yam.slice(0, 2).map((h) => h.id).sort(), [id(3), id(4)], 'the exact "Yam" first');
  assert.deepEqual(yam.slice(0, 2).map((h) => h.why.match), ['exact', 'exact']);
  assert.deepEqual(yam.slice(2).map((h) => [h.id, h.why.match]), [[id(5), 'tokens'], [id(8), 'alternate']], 'a token of "Sweet potato, yam", then the alternate name');
  assert.deepEqual(find('toma').map((h) => [h.id, h.tier, h.why.match]), [[id(2), 'site', 'prefix']]);
  assert.deepEqual(find('yam sweet').map((h) => [h.id, h.why.match]), [[id(5), 'tokens']], 'every query token, in any order');
  assert.deepEqual(find('lady').map((h) => [h.id, h.tier, h.why.match, h.why.text]), [[id(1), 'site', 'alternate', "Lady's fingers"]]);
  // Each hit says why it matched.
  const tomato = find('lycopersicon esc');
  assert.equal(tomato[0]?.id, id(2));
  assert.deepEqual([tomato[0].tier, tomato[0].why.kind, tomato[0].why.text], ['scientific', 'synonym', 'Lycopersicon esculentum']);
  assert.equal(find('tomato')[0].tier, 'site');
});

test('PP-C-u5 (c1 search shared names): a name shared by several plants says so ("also used for N other plants")', async () => {
  const { releaseIndex } = await search();
  const hits = releaseIndex({ names: NAMES, plants: NAMES.map((n) => n.id), lang: 'en' })('yam');
  const dioscorea = hits.find((h) => h.id === id(3));
  assert.equal(dioscorea?.shared, 2, '"Yam" is also used for 2 other plants');
});

// Normalization v1 as is (canopi-types; coordinator row 2026-11-17: some matches change to match the
// app). The three fold cases of consortium-source.test.mjs:223-234 are rewritten by c1 to these.
// The v1 corpus: canopi-types/species-search-normalization.json (canopi repo, normalization_version 1,
// sha256 below), copied unchanged into scripts/fixtures/canopi-types/. The fold is the browser's native
// normalize('NFKD') (design check c1 6.2), so a scalar newer than v1's pinned Unicode 15.0 may fold
// differently: that one corpus case is the documented gap, never asserted.
const V1 = readFileSync(new URL('fixtures/canopi-types/species-search-normalization.json', import.meta.url));
const V1_SHA256 = 'f90f574ae67056f8285a68486101c4408bfe2889d71eadb559b3619c7b96a3f9';
const UNICODE_15_GAP = new Set(['scalar-newer-than-pinned-unicode-data']);

test('PP-C c1 unit file (commit 0): the v1 corpus is the pinned canopi-types file', async () => {
  const { createHash } = await import('node:crypto');
  assert.equal(createHash('sha256').update(V1).digest('hex'), V1_SHA256);
  const v1 = JSON.parse(V1);
  assert.equal(v1.normalization_version, 1);
  assert.ok(v1.corpus.length > 0 && v1.corpus.some((c) => UNICODE_15_GAP.has(c.name)), 'the gap case is in the corpus');
});

test('PP-C-u6 (c1 normalization v1): native NFKD, marks off, the two case folds, the v1 corpus run (the Unicode-15 gap documented): 배 is a prefix of 백합, ばら equals はら, Cœur no longer equals coeur', () => {
  assert.ok(fold('백합').startsWith(fold('배')), 'v1: 배 is a prefix of 백합 (NFKD keeps the jamo apart)');
  assert.equal(fold('ばら'), fold('はら'), 'v1: kana voicing is a mark, folded off');
  assert.notEqual(fold('Cœur'), fold('coeur'), 'v1: œ is not written out');
  for (const c of JSON.parse(V1).corpus) {
    if (UNICODE_15_GAP.has(c.name)) continue;
    assert.equal(fold(c.input), c.normalized_text, `v1 corpus "${c.name}"`);
  }
});

test('PP-C-u7 (c1 names file 4.4): a names file whose release_id or core_raw_sha256 differs from the page\'s db is dropped, never mapped onto the wrong integers', async () => {
  const { namesFor } = await search();
  const page = { release_id: 'r-c15a216b9663d2fa', core_raw_sha256: 'a'.repeat(64) };
  assert.equal(namesFor({ ...page }, page), true);
  assert.equal(namesFor({ ...page, release_id: 'r-0000000000000000' }, page), false);
  assert.equal(namesFor({ ...page, core_raw_sha256: '0'.repeat(64) }, page), false);
});

test('PP-C-u8 (c1 hit outside the list 4.8): a hit on a plant outside the current list names the lists that hold it', async () => {
  const { listsOf } = await search();
  assert.deepEqual(listsOf(id(1), { Tropical: [id(1)], Subtropical: [id(1), id(2)], Temperate: [id(2)] }), ['Tropical', 'Subtropical'], 'in the climate order');
});

test('PP-C-u9 (c1 one search module): Paste matches through it, synonyms included; oneOff gives the close spellings; the names line counts the languages the file holds, never "11 languages"', async () => {
  const { oneOff, namesLine, releaseIndex } = await search();
  assert.equal(oneOff('tomatoe', 'tomato'), true);
  assert.equal(oneOff('okra', 'kale'), false);
  // Paste reads through the search module: a pasted synonym and a names-file name are found as Find
  // finds them, and Paste keeps no matcher of its own.
  const paste = await import('../src/islands/consortium/views/paste.ts');
  assert.equal('oneOff' in paste, false, 'oneOff lives in data/search.ts only');
  const index = releaseIndex({ names: NAMES, plants: NAMES.map((n) => n.id), lang: 'en' });
  const here = NAMES.map((n) => ({ id: n.id, canonical_name: n.canonical, names: n.names }));
  const read = paste.readPaste(paste.pasteNames('Lycopersicon esculentum\nGombo'), { here, index });
  assert.deepEqual(read.found.map((f) => f.taxon.id), [id(2), id(1)], 'a pasted synonym and a names-file name are found');
  const line = namesLine(['en', 'fr', 'de']);
  assert.equal(line.vars?.n, 3, 'the languages the file holds');
  assert.ok(!/\b11\b/.test(JSON.stringify(line)), 'never "11 languages"');
});
