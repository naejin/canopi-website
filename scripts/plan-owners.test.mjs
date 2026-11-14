// The owners files of multi-stream steps (scripts/plan/*-owners.json: the E3/E4/E5a/E6 batch, F1a
// (superseded), the Plant palette redesign's pushes): one owner per path per chunk, needs pointing back,
// patterns repo-relative, shared files apart.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { keyProblems, matches, outside, overlaps, ownersFiles, ownersProblems, readOwners } from './plan/owners.mjs';

test('every owners file: no path owned by two streams in one chunk; each need is an earlier stream', () => {
  const files = ownersFiles();
  assert.ok(files.some((f) => f.endsWith('/e6-owners.json')) && files.some((f) => f.endsWith('/pp-b-owners.json')), files.join('\n'));
  for (const f of files) assert.deepEqual(ownersProblems(readOwners(f)), [], f);
});

test('a superseded owners file names the owners file that replaced it, and that file is live', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const f1a = readOwners(ownersFiles().find((f) => f.endsWith('/f1a-owners.json')));
  assert.equal(f1a.superseded_by, 'scripts/plan/pp-b-owners.json', 'F1a is superseded by the Plant palette redesign (2026-11-14)');
  for (const f of ownersFiles()) {
    const o = readOwners(f);
    if (o.superseded_by === undefined) continue;
    assert.match(o.superseded_by, /^scripts\/plan\/[a-z0-9-]+-owners\.json$/, f);
    assert.ok(existsSync(root + o.superseded_by), `${f}: ${o.superseded_by} does not exist`);
    assert.equal(readOwners(root + o.superseded_by).superseded_by, undefined, `${f}: ${o.superseded_by} is itself superseded`);
  }
});

// Plan recheck 2026-11-14, blockers 1 and 2: a module a chunk deletes or repoints has every importer
// owned in that chunk, or the stream cannot pass npm run check without touching a file it does not own.
test('PP-B: the importers of what a chunk deletes are owned in that chunk; b1b waits for b2', () => {
  const ppb = readOwners(ownersFiles().find((f) => f.endsWith('/pp-b-owners.json')));
  const owns = (chunk, stream, path) => (ppb.chunks[chunk].streams[stream]?.files ?? []).some((f) => matches(f, path));
  const v = 'src/islands/consortium/views/';
  // Chunk 0 deletes views/kit/span.ts; kit/sheet.tsx imports spanOf from it.
  for (const p of [`${v}kit/span.ts`, `${v}kit/sheet.tsx`]) assert.ok(owns(0, 'main', p), `chunk 0 main owns ${p}`);
  // b3 deletes the matrix, Jobs and PlantList: App.tsx imports Matrix, later.ts re-exports Jobs and
  // PlantList, and Palette.tsx mounts their replacements.
  for (const p of ['src/islands/consortium/App.tsx', `${v}later.ts`, `${v}later-chunk.ts`, `${v}palette/Palette.tsx`, `${v}Matrix.tsx`, `${v}Jobs.tsx`, `${v}PlantList.tsx`])
    assert.ok(owns(2, 'b3', p), `chunk 2 b3 owns ${p}`);
  // b1b ports the pool panel onto b2's verdict engine, so it runs after b2 (recheck 5).
  assert.ok(ppb.chunks[2].streams.b1b.needs.includes('b2'));
  for (const p of [`${v}pool/pool.tsx`, `${v}PoolSlot.tsx`]) assert.ok(owns(2, 'b1b', p) && !owns(1, 'b1a', p), p);
});

test('shared files: only the listed streams may change them, and no stream owns them outright', () => {
  const owners = { shared: [{ files: ['src/i18n/translations/*.json'], streams: { A: { prefix: 'consortium.a.', edits: ['consortium.old.*'] } } }], chunks: [
    { chunk: 0, streams: { main: { needs: [], files: ['package.json'] } } },
    { chunk: 1, streams: { A: { needs: ['main'], files: ['src/a.ts'] }, B: { needs: ['main'], files: ['src/b.ts'] } } },
  ] };
  assert.deepEqual(ownersProblems(owners), []);
  assert.deepEqual(outside(owners, 1, 'A', ['src/a.ts', 'src/i18n/translations/fr.json']), []);
  assert.deepEqual(outside(owners, 1, 'B', ['src/i18n/translations/fr.json']), ['src/i18n/translations/fr.json']);
  owners.chunks[1].streams.B.files.push('src/i18n/translations/en.json');
  owners.shared[0].streams.Z = { prefix: 'consortium.z.', edits: [] };
  owners.shared[0].streams.B = { prefix: 'consortium.', edits: [] };
  const problems = ownersProblems(owners);
  assert.ok(problems.some((p) => /en\.json \(B\) is also the shared/.test(p)), problems.join('\n'));
  assert.ok(problems.some((p) => /no stream Z/.test(p)), problems.join('\n'));
  assert.ok(problems.some((p) => /shared keys consortium\.a\.\* \(A\) and consortium\.\* \(B\) overlap/.test(p)), problems.join('\n'));
});

test('shared keys: a stream adds only under its prefix and changes or deletes only its edits', () => {
  const spec = { prefix: 'consortium.palette.', edits: ['consortium.matrix.tab.*'] };
  const base = { 'consortium.matrix.tab.jobs': 'Jobs', 'consortium.list.title': 'All plants', 'consortium.est.word': 'estimate' };
  const head = { 'consortium.palette.title': 'Palette', 'consortium.balance.x': 'x', 'consortium.list.title': 'Plants', 'consortium.est.word': 'estimate' };
  assert.deepEqual(keyProblems(spec, base, head), [
    'added consortium.balance.x outside consortium.palette.',
    'changed consortium.list.title, not in its edits',
  ]);
  assert.deepEqual(keyProblems(spec, base, { ...base, 'consortium.palette.a': 'a' }), []);
  const { 'consortium.est.word': _gone, ...without } = base;
  assert.deepEqual(keyProblems(spec, base, without), ['deleted consortium.est.word, not in its edits']);
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
