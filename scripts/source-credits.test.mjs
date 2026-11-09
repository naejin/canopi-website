// The source credits behind /data-sources/ (src/lib/source-credits.js): canopi-data's
// data/curated/source_credits.tsv, shipped in the consortium export and copied by the installer to
// src/data/source_credits.tsv. The parser reads it as canopi-data's read_table does and refuses what
// canopi-data's own check would refuse; the page lists used and held sources, never internal ones.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { parseSourceCredits, shownCredits, CREDIT_COLUMNS } from '../src/lib/source-credits.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const HEADER = `${CREDIT_COLUMNS.join('\t')}\n`;
// Invented rows, one per kind the file has.
export const SAMPLE = [
  HEADER.trimEnd(),
  'try\ttry\tTRY Plant Trait Database\t\t\tterms\thttps://www.try-db.org/\tused',
  'atlas\tatlas;atlas_names\tAn Open Atlas\tAn Open Atlas (atlas.example)\tCC BY 4.0\tconfirmed\thttps://atlas.example/\tused',
  'garden\tgarden\tA Garden Notebook\tA Garden Notebook\t\tpermission\thttps://garden.example/\tused',
  'photos\twikimedia_commons\tWikimedia Commons\t\t\tper_item\thttps://commons.wikimedia.org/\tused',
  'flora\tflora\tA Regional Flora\t\t\tunconfirmed\t\tused',
  'later\t\tA Source Held Back\t\t\tunconfirmed\thttps://later.example/\theld',
  'rules\trule\tCanopi rules\t\t\tnone\t\tinternal',
].join('\n') + '\n';

test('the columns are canopi-data\'s, in its order', () => {
  assert.deepEqual(CREDIT_COLUMNS, ['source', 'tags', 'name', 'credit', 'licence', 'licence_status', 'url', 'status']);
  // canopi-data's own file, when this checkout sits beside it (CI has none).
  const theirs = new URL('../../canopi-data/data/curated/source_credits.tsv', import.meta.url);
  if (existsSync(theirs)) {
    const header = readFileSync(theirs, 'utf8').split('\n').find((line) => line.trim() && !line.trimStart().startsWith('#'));
    assert.deepEqual(header.split('\t').map((c) => c.trim()), CREDIT_COLUMNS);
  }
});

test('every row is read whole, in file order; tags split on ;', () => {
  const rows = parseSourceCredits(SAMPLE);
  assert.equal(rows.length, 7);
  assert.deepEqual(rows[1], { source: 'atlas', tags: ['atlas', 'atlas_names'], name: 'An Open Atlas', credit: 'An Open Atlas (atlas.example)', licence: 'CC BY 4.0', licenceStatus: 'confirmed', url: 'https://atlas.example/', status: 'used' });
  assert.deepEqual(rows.map((r) => r.status), ['used', 'used', 'used', 'used', 'used', 'held', 'internal']);
});

test('the page shows used then held sources, never internal ones', () => {
  const shown = shownCredits(parseSourceCredits(SAMPLE));
  assert.deepEqual(shown.used.map((r) => r.source), ['try', 'atlas', 'garden', 'photos', 'flora']);
  assert.deepEqual(shown.held.map((r) => r.source), ['later']);
  assert.ok(![...shown.used, ...shown.held].some((r) => r.status === 'internal'));
});

test('the page names a sentence for every licence status a shown row can have', () => {
  const page = read('src/components/DataSourcesPage.astro');
  for (const status of ['confirmed', 'unconfirmed', 'permission', 'per_item', 'terms']) assert.ok(page.includes(`${status}: 'dataSources.credits.licence.${status}'`), status);
});

test('read as canopi-data reads it: comments and blank lines skipped, cells trimmed, a short row padded', () => {
  const text = `# a comment\n\n${HEADER} a \t\t A \t\t\t unconfirmed \t\t used \n  # indented comment\n`;
  assert.deepEqual(parseSourceCredits(text), [{ source: 'a', tags: [], name: 'A', credit: '', licence: '', licenceStatus: 'unconfirmed', url: '', status: 'used' }]);
  // A short row reads its missing cells as empty, so its status is empty, which is refused.
  assert.throws(() => parseSourceCredits(`${HEADER}a\t\tA\t\t\tunconfirmed\n`), /:2: a: status ""/);
});

test('a malformed file throws, naming the file and line', () => {
  const ok = (row) => `${HEADER}${row}\n`;
  const cases = [
    ['﻿' + SAMPLE, /byte order mark/],
    [SAMPLE.replaceAll('\n', '\r\n'), /carriage return/],
    ['', /no header/],
    ['source\tname\n', /:1: the columns are not/],
    [ok('a\t\tA\t\t\tunconfirmed\t\tused\textra'), /:2: 9 fields for 8 columns/],
    [ok('A\t\tA\t\t\tunconfirmed\t\tused'), /:2: source id "A"/],
    [ok('a\t\t\t\t\tunconfirmed\t\tused'), /:2: a: empty name/],
    [ok('a\t\tA\t\t\tunconfirmed\t\tshipped'), /:2: a: status "shipped"/],
    [ok('a\t\tA\t\t\tlicensed\t\tused'), /:2: a: licence_status "licensed"/],
    [ok('a\t\tA\t\t\tconfirmed\t\tused'), /:2: a: a confirmed licence needs a licence/],
    [ok('a\t\tA\t\t\tunconfirmed\tjavascript:alert(1)\tused'), /:2: a: url .* is not http\(s\)/],
    [`${HEADER}a\t\tA\t\t\tunconfirmed\t\tused\na\t\tB\t\t\tunconfirmed\t\tused\n`, /:3: a: source repeated/],
  ];
  for (const [text, message] of cases) assert.throws(() => parseSourceCredits(text, 'x.tsv'), (err) => message.test(err.message) && err.message.startsWith('x.tsv:'), JSON.stringify(text.slice(0, 80)));
});

test('the page reads the copy only when the installer wrote one, and never writes it as markup', () => {
  const page = read('src/components/DataSourcesPage.astro');
  assert.ok(!/set:html/.test(page));
  const data = read('src/data/source-credits.ts');
  assert.match(data, /import\.meta\.glob\('\.\/source_credits\.tsv'/, 'a missing file builds the page without the list');
  if (existsSync(new URL('../src/data/source_credits.tsv', import.meta.url))) {
    const { sha256 } = JSON.parse(read('public/data/consortium/manifest.json')).source_credits ?? {};
    assert.ok(sha256, 'a copy comes from an installed export that lists it');
  }
});
