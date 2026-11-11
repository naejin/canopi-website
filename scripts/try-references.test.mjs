// The TRY dataset list behind /data-sources/ (src/lib/try-references.js): the shipped file, the
// parser's refusals, which urls link, and that the page never writes the text as markup.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { tryListProblem } from './install-consortium.mjs';
import { parseTryReferences, referenceParts, TRY_CITATION, TRY_DOI } from '../src/lib/try-references.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const bytes = readFileSync(new URL('../src/data/try_references.tsv', import.meta.url));
const source = bytes.toString('utf8');
const meta = JSON.parse(read('src/data/try_references.meta.json'));
const HEADER = 'dataset_id\tdataset\tcustodian\treference\n';
const one = { rows: 1, dataset_ids: 1 };

test('the shipped list is what its meta says: hash, rows and DatasetIDs read from the file', () => {
  assert.equal(tryListProblem(bytes, meta), null);
  const lines = source.slice(0, -1).split('\n').slice(1).map((line) => line.split('\t'));
  assert.equal(lines.length, meta.rows);
  assert.equal(new Set(lines.map(([id]) => id)).size, meta.dataset_ids);
  const rows = parseTryReferences(source, meta);
  assert.deepEqual(rows.map((row) => [row.datasetId, row.dataset, row.custodian, row.reference]), lines, 'each row whole, in order');
});

test('the list has one owner: the meta is the installed index entry, so a hand copy shows', () => {
  const { sha256, rows, dataset_ids } = JSON.parse(read('src/data/consortium-index.json')).try_references;
  assert.deepEqual(meta, { sha256, rows, dataset_ids });
});

test('a list that differs from its meta fails', () => {
  assert.match(tryListProblem(bytes, { ...meta, sha256: 'f'.repeat(64) }), /does not match the manifest's sha256/);
  assert.match(tryListProblem(bytes, { ...meta, rows: meta.rows + 1 }), /rows, not the source's/);
  assert.match(tryListProblem(bytes, { ...meta, dataset_ids: meta.dataset_ids + 1 }), /DatasetIDs, not the source's/);
});

test('a malformed file or another count fails the build', () => {
  const good = `${HEADER}1\tA\tB\tC\n`;
  assert.equal(parseTryReferences(good, one).length, 1);
  const cases = [
    [`﻿${good}`, /byte order mark/],
    [good.replaceAll('\n', '\r\n'), /carriage return/],
    [good.slice(0, -1), /line feed/],
    [`x\ty\n1\tA\tB\tC\n`, /header/],
    [`${HEADER}1\tA\tB\n`, /:2: 3 fields/],
    [`${HEADER}1\tA\tB\tC\tD\n`, /:2: 5 fields/],
    [`${HEADER}\n`, /:2: 1 fields/],
    [`${HEADER}x\tA\tB\tC\n`, /:2: dataset_id/],
    [`${HEADER}1\t\tB\tC\n`, /:2: an empty field/],
    [`${HEADER}1\tA\tB\t \n`, /:2: an empty field/],
  ];
  for (const [text, message] of cases) assert.throws(() => parseTryReferences(text, one), message, JSON.stringify(text));
  assert.throws(() => parseTryReferences(good, { rows: 2, dataset_ids: 1 }), /1 rows, not the source's 2/);
  assert.throws(() => parseTryReferences(good, { rows: 1, dataset_ids: 2 }), /1 DatasetIDs, not the source's 2/);
});

test('every reference keeps its text whole; a url links without the punctuation around it', () => {
  for (const row of parseTryReferences(source, meta)) {
    const parts = referenceParts(row.reference);
    assert.equal(parts.map((part) => part.text).join(''), row.reference);
    for (const part of parts) if (part.href) assert.equal(part.href, part.text);
  }
  const hrefs = (text) => referenceParts(text).flatMap((part) => (part.href ? [part.href] : []));
  assert.deepEqual(hrefs('See http://a.org/x.'), ['http://a.org/x']);
  assert.deepEqual(hrefs('(http://a.org/x), [https://b.org/y]'), ['http://a.org/x', 'https://b.org/y']);
  assert.deepEqual(hrefs('http://a.org/x_(y)'), ['http://a.org/x_(y)']);
  assert.deepEqual(hrefs('doi:10.1/x www.a.org ftp://a.org javascript:alert(1)'), []);
  assert.deepEqual(hrefs('http://a.org/K�hn'), [], 'a lost character leads nowhere');
  assert.deepEqual(hrefs('http://'), []);
});

test('the page shows the citation verbatim, no CC BY claim, and never writes the text as markup', async (t) => {
  assert.equal(`${TRY_CITATION} ${TRY_DOI}`, 'Kattge, J, Bönisch, G, Díaz, S, et al. TRY plant trait database – enhanced coverage and open access. Glob Change Biol. 2020; 26: 119– 188. https://doi.org/10.1111/gcb.14904');
  const page = read('src/components/DataSourcesPage.astro');
  assert.ok(!/set:html/.test(page));
  assert.ok(!/CC BY/.test(page));
  // The citation canopi-data puts in sources.try is this one.
  const installed = await installedSource(t, 'try');
  assert.equal(installed.licence, null);
  assert.ok(installed.attribution.startsWith(`${TRY_CITATION} ${TRY_DOI}`));
});

// A sources row of the installed database (src/data/consortium-index.json names it), read with node:sqlite.
async function installedSource(t, id) {
  const { DatabaseSync } = await import('node:sqlite');
  const index = JSON.parse(read('src/data/consortium-index.json'));
  const dir = mkdtempSync(join(tmpdir(), 'consortium-db-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'db.sqlite');
  writeFileSync(path, gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url))));
  const db = new DatabaseSync(path, { readOnly: true });
  try { return { ...db.prepare('SELECT licence, attribution FROM sources WHERE id = ?').get(id) }; } finally { db.close(); }
}
