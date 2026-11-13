// The owners files of multi-stream steps (scripts/plan/*-owners.json: the E3/E4/E5a/E6 batch, F1a):
// one owner per path per chunk, needs pointing back, patterns repo-relative, shared files apart.
import test from 'node:test';
import assert from 'node:assert/strict';
import { matches, outside, overlaps, ownersFiles, ownersProblems, readOwners } from './plan/owners.mjs';

test('every owners file: no path owned by two streams in one chunk; each need is an earlier stream', () => {
  const files = ownersFiles();
  assert.ok(files.some((f) => f.endsWith('/e6-owners.json')) && files.some((f) => f.endsWith('/f1a-owners.json')), files.join('\n'));
  for (const f of files) assert.deepEqual(ownersProblems(readOwners(f)), [], f);
});

test('shared files: only the listed streams may change them, and no stream owns them outright', () => {
  const owners = { shared: [{ files: ['src/i18n/translations/*.json'], streams: ['A'] }], chunks: [
    { chunk: 0, streams: { main: { needs: [], files: ['package.json'] } } },
    { chunk: 1, streams: { A: { needs: ['main'], files: ['src/a.ts'] }, B: { needs: ['main'], files: ['src/b.ts'] } } },
  ] };
  assert.deepEqual(ownersProblems(owners), []);
  assert.deepEqual(outside(owners, 1, 'A', ['src/a.ts', 'src/i18n/translations/fr.json']), []);
  assert.deepEqual(outside(owners, 1, 'B', ['src/i18n/translations/fr.json']), ['src/i18n/translations/fr.json']);
  owners.chunks[1].streams.B.files.push('src/i18n/translations/en.json');
  owners.shared[0].streams.push('Z');
  const problems = ownersProblems(owners);
  assert.ok(problems.some((p) => /en\.json \(B\) is also the shared/.test(p)), problems.join('\n'));
  assert.ok(problems.some((p) => /no stream Z/.test(p)), problems.join('\n'));
});

test('the owners check fails a path two streams own in one chunk, and a need on a later stream', () => {
  const owners = { chunks: [
    { chunk: 0, streams: { main: { needs: [], files: ['package.json'] } } },
    { chunk: 1, streams: {
      A: { needs: ['main'], files: ['src/islands/consortium/views/**'] },
      B: { needs: ['main', 'C'], files: ['src/islands/consortium/views/Add.tsx'] },
    } },
  ] };
  const problems = ownersProblems(owners);
  assert.ok(problems.some((p) => /views\/\*\* \(A\) and src\/islands\/consortium\/views\/Add\.tsx \(B\)/.test(p)), problems.join('\n'));
  assert.ok(problems.some((p) => /B needs C/.test(p)), problems.join('\n'));
});

test('patterns: * within a folder, ** across folders; overlap is conservative between globs', () => {
  assert.ok(matches('scripts/consortium-p5-seams*.test.mjs', 'scripts/consortium-p5-seams-s5b.test.mjs'));
  assert.ok(!matches('scripts/consortium-p5-seams*.test.mjs', 'scripts/consortium-memory.test.mjs'));
  assert.ok(matches('scripts/quality/**', 'scripts/quality/baselines/knip.json'));
  assert.ok(!matches('src/islands/consortium/views/*.tsx', 'src/islands/consortium/views/kit/sheet.tsx'));
  assert.ok(overlaps('scripts/quality/**', 'scripts/quality/baselines/**'));
  assert.ok(!overlaps('scripts/quality/ast-grep/**', 'scripts/quality/baselines/**'));
  assert.ok(!overlaps('src/islands/consortium/state/**', 'src/islands/consortium/views/details/**'));
});

test('a stream diff outside its rows is named', () => {
  const owners = readOwners();
  assert.deepEqual(outside(owners, 1, 'V', ['scripts/fixtures/climate/lookup.json', 'scripts/climate-vectors.test.mjs']), []);
  assert.deepEqual(outside(owners, 1, 'V', ['package.json']), ['package.json'], 'no stream edits package.json');
  assert.throws(() => outside(owners, 1, 'R4', []), /no stream R4 in chunk 1/);
});
