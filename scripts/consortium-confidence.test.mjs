// F1a stream 3 (one confidence model, ADR-7; plan F1a stream 3, design check A15-A18): core
// src/lib/consortium/confidence.ts maps each term of the closed ConfidenceTerm union (types.ts, commit
// 0) to its string key per surface and its methods-page anchor; no strings and no computation there
// (they stay in range.ts, future.ts, placement.ts, layers.ts). Written failing in commit 0
// (expected-fail, owner conf1, scripts/expect-fail.mjs failing()): there is no confidence.ts yet.
// conf1 removes each marker in the commit that makes it pass.
//
// The contract this test proposes (conf1 may rename within its chunk, keeping the cases):
//   confidenceKeys: Record<ConfidenceTerm, Record<'chip' | 'row' | 'add' | 'details' | 'print', string>>
//     a consortium.* key without its prefix per surface (a short surface may share the row's key);
//   confidenceAnchors: Record<ConfidenceTerm, string>: the methods-page anchor (F1b writes the page);
//   termOfMark(mark): ConfidenceTerm | null: the term a mark hedges with, null for a mark that is a
//     site note and no hedge (water, season, room, aridity, native); no verdict changes (probe first).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { confidenceTerms, markKinds, markSurfaces } from '../src/lib/consortium/index.ts';
import { failing } from './expect-fail.mjs';

const dir = new URL('../src/i18n/translations/', import.meta.url);
const words = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), JSON.parse(readFileSync(new URL(f, dir), 'utf8'))]));
// The module the stream adds; through a variable so knip does not count a commit-0 import as unresolved.
const CONFIDENCE_MODULE = new URL('../src/lib/consortium/confidence.ts', import.meta.url).href;
const confidence = () => import(CONFIDENCE_MODULE);
const NO_MODULE = /Cannot find module .*confidence\.ts/;

test('F1a confidence terms (commit 0, A15): the closed union names the plan\'s eight terms once each', () => {
  assert.deepEqual([...confidenceTerms].sort(), ['disputed', 'edge', 'estimate', 'not-checked', 'not-recorded', 'not-reviewed', 'spread', 'worked-out']);
  assert.equal(new Set(confidenceTerms).size, confidenceTerms.length);
});

failing('F1a-C1 (conf1 key table, A15, A18): every term has a key on every surface and in all 11 locales, and a methods-page anchor', { owner: 'conf1', reason: NO_MODULE }, async () => {
  const { confidenceKeys, confidenceAnchors } = await confidence();
  assert.equal(Object.keys(words).length, 11);
  for (const term of confidenceTerms) {
    for (const surface of [...markSurfaces, 'print']) {
      const key = confidenceKeys[term]?.[surface];
      assert.ok(key, `${term}: a key on ${surface}`);
      for (const [lang, w] of Object.entries(words)) assert.ok(w[`consortium.${key}`], `${lang}: consortium.${key} (${term}, ${surface})`);
    }
    assert.match(confidenceAnchors[term] ?? '', /^[a-z][\w-]*$/, `${term}: a methods-page anchor`);
  }
});

failing('F1a-C2 (conf1 marks to terms, A15, A18): every mark kind maps to one term or is a site note; the range and placement hedges keep their meaning', { owner: 'conf1', reason: NO_MODULE }, async () => {
  const { termOfMark } = await confidence();
  for (const kind of markKinds) {
    const term = termOfMark({ kind, key: 'x', severity: 'note' });
    assert.ok(term === null || confidenceTerms.includes(term), `${kind}: ${term}`);
  }
  assert.equal(termOfMark({ kind: 'edge', key: 'range.edge', severity: 'note' }), 'edge');
  assert.equal(termOfMark({ kind: 'estimate', key: 'estimate.noSite', severity: 'note' }), 'estimate');
  assert.equal(termOfMark({ kind: 'unknown', key: 'range.unknown', severity: 'note' }), 'not-recorded');
  for (const kind of ['water', 'season', 'room']) assert.equal(termOfMark({ kind, key: 'x', severity: 'note' }), null, `${kind} is a site note, no hedge`);
});

failing('F1a-C3 (conf1 not reviewed, A17): "not reviewed" is one dataset-level line driven by SourceInfo.rangesReview, never a literal', { owner: 'conf1', reason: NO_MODULE }, async () => {
  const { datasetConfidence } = await confidence();
  // meta.ranges_review is 'estimate_not_reviewed' in today's export (install-consortium.mjs RANGES_REVIEW).
  assert.deepEqual(datasetConfidence({ rangesReview: 'estimate_not_reviewed' }), [{ term: 'not-reviewed' }]);
  assert.deepEqual(datasetConfidence({ rangesReview: 'reviewed' }), []);
});
