// The owners files of multi-stream steps (scripts/plan/*-owners.json: the E3/E4/E5a/E6 batch, F1a
// (superseded), the Plant palette redesign's pushes): one owner per path per chunk, needs pointing back,
// patterns repo-relative, shared files apart.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
  // Delete first (owner, 2026-11-14): chunk 0 (commit 0a') deletes the old screens, so it owns each
  // deleted file and every importer it trims: App.tsx imports Matrix, later.ts re-exports SideView, Jobs
  // and PlantList, SideView imports StageStepper, PrintSheet reads the matrix, Details and Start hold
  // Kept and Main crops, suggest.ts takes their options, ConsortiumPage.astro imports matrix.css.
  const deleted = ['Matrix.tsx', 'PhoneMatrix.tsx', 'matrix-parts.tsx', 'tracks.ts', 'Jobs.tsx', 'PlantList.tsx', 'StageStepper.tsx'].map((f) => v + f);
  const trimmed = ['src/islands/consortium/App.tsx', 'src/islands/consortium/store.ts', `${v}later.ts`, `${v}Actions.tsx`, `${v}SideView.tsx`, `${v}StageBar.tsx`, `${v}PrintSheet.tsx`, `${v}details/Details.tsx`, `${v}Start.tsx`,
    'src/lib/consortium/matrix.ts', 'src/lib/consortium/suggest.ts', 'src/lib/consortium/source.ts', 'src/islands/consortium/data/sqlite-source.ts', 'src/components/consortium/ConsortiumPage.astro',
    'src/styles/consortium/matrix.css', 'src/styles/consortium/shell.css', 'scripts/browser/consortium-s2.browser.test.mjs', 'scripts/built-modules.mjs', 'scripts/check-built-site.mjs'];
  for (const p of [...deleted, ...trimmed]) assert.ok(owns(0, 'main', p), `chunk 0 main owns ${p}`);
  // No stream deletes an old screen any more: b3 builds Your plants only, b2 takes print, b1b Suggest's gain.
  for (const p of deleted) for (const [c, s] of [[1, 'b1a'], [1, 'b2'], [2, 'b1b'], [2, 'b3']]) assert.ok(!owns(c, s, p), `${s} does not own ${p}`);
  assert.ok(owns(2, 'b3', `${v}palette/Palette.tsx`) && owns(1, 'b2', `${v}PrintSheet.tsx`) && owns(2, 'b1b', 'src/lib/consortium/suggest.ts'));
  // b1b ports the pool panel onto b2's verdict engine, so it runs after b2 (recheck 5).
  assert.ok(ppb.chunks[2].streams.b1b.needs.includes('b2'));
  for (const p of [`${v}pool/pool.tsx`, `${v}PoolSlot.tsx`]) assert.ok(owns(2, 'b1b', p) && !owns(1, 'b1a', p), p);
});

// Delete first (commit 0a' gate; plant-palette-slices section 2): the store exports the old screens read
// are gone, and no file of the island reads them, by a named import or through a store namespace.
test('PP-B 0a\': no src file reads a removed store export (matrix, toggleKeep, kept, crops, marksFailed)', async () => {
  const removed = ['matrix', 'toggleKeep', 'kept', 'crops', 'marksFailed'];
  const store = await import('../src/islands/consortium/store.ts');
  assert.deepEqual(removed.filter((k) => k in store || k in (store.signals ?? {})), [], 'store.ts exports none of them');
  const root = fileURLToPath(new URL('../src/', import.meta.url));
  const offenders = [];
  for (const f of readdirSync(root, { recursive: true })) {
    if (!/\.(ts|tsx|astro|mjs|js)$/.test(f)) continue;
    const text = readFileSync(root + f, 'utf8');
    for (const m of text.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'[^']*\/store\.ts'/g)) {
      for (const name of m[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean)) if (removed.includes(name)) offenders.push(`${f}: imports ${name}`);
    }
    for (const m of text.matchAll(new RegExp(`\\bstore\\.(${removed.join('|')})\\b`, 'g'))) offenders.push(`${f}: store.${m[1]}`);
  }
  assert.deepEqual(offenders, []);
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

// PP-B commit 0 (plant-palette-slices section 1): the F1a markers are parked, moved or deleted, each
// once; a parked or deleted one is no longer in the tree, a moved one is in its stream's file under
// its new owner, and every entry points at its source line. PP-C commit 0 moved the PP-C entries (C6 in
// two halves, one per stream file, so a moved id may appear twice with different owners and files).
// The list itself was checked against the F1a source commit when it was written (it never changes);
// what lasts is that no parked or deleted marker comes back and every moved one is still owned.
test('parked markers: none parked or deleted is left in the tree; each moved one is still owned', async () => {
  const { readFileSync } = await import('node:fs');
  const { markers } = await import('./expect-fail.mjs');
  const list = JSON.parse(readFileSync(new URL('./plan/parked-markers.json', import.meta.url), 'utf8'));
  const live = markers();
  for (const m of [...list.parked, ...list.deleted]) assert.ok(!live.some((x) => x.title.startsWith(`${m.id} `)), `${m.id} is not in the tree`);
  for (const m of list.parked) assert.match(`${m.push} ${m.owner}`, /^(PP-B (b1a|b1b|b2|b3)|PP-C (c1|c2))$/, m.id);
  for (const m of list.moved) {
    // Still a marker under its owner, or passing: its owner removed the marker in the commit that made
    // it pass, so it is a plain test with the same title in the same file.
    // PP-C commit 0 widened the check to the push each entry names (no push: PP-B, which moved first).
    const head = `${m.id} → ${m.push ?? 'PP-B'} (${m.owner} `;
    // pf commit 0 (2026-11-17): F1a-P2 moved on to its pf stream's spec (consortium-pf-c).
    assert.match(`${m.push ?? 'PP-B'} ${m.owner}`, /^(PP-B (b1a|b1b|b2|b3)|PP-C (c1|c2|pf-[abc]))$/, m.id);
    const now = live.find((x) => x.title.startsWith(head) && `scripts/${x.file}` === m.to);
    const passing = !now && readFileSync(new URL(`../${m.to}`, import.meta.url), 'utf8').includes(head);
    assert.ok((now && `scripts/${now.file}` === m.to && now.owner === m.owner) || passing, `${m.id} moved to ${m.to} under ${m.owner}`);
  }
});

// PP-C commit 0 (slices section 0; review c0 1.3): every parked marker is restored or deleted. `parked`
// is empty, and each restored one is in the file its owner restored it in (its phrase found there), no
// longer a marker; an id is in one list only.
test('parked markers: every parked marker is restored or deleted', async () => {
  const { readFileSync } = await import('node:fs');
  const { markers } = await import('./expect-fail.mjs');
  const list = JSON.parse(readFileSync(new URL('./plan/parked-markers.json', import.meta.url), 'utf8'));
  assert.deepEqual(list.parked.map((m) => m.id), [], 'nothing left parked');
  const live = markers();
  for (const m of list.restored) {
    assert.match(`${m.push} ${m.owner}`, /^(PP-B (b1a|b1b|b2|b3)|PP-C (c1|c2|pf))$/, m.id);
    assert.ok(readFileSync(new URL(`../${m.to}`, import.meta.url), 'utf8').includes(m.evidence), `${m.id} restored in ${m.to} ("${m.evidence}")`);
    assert.ok(!live.some((x) => x.title.startsWith(`${m.id} `)), `${m.id}: no marker left under its old title`);
    // ... nor under its new one (review c0 round 2, 4c): a restored test is a plain test.
    assert.ok(!live.some((x) => x.title.includes(m.evidence)), `${m.id}: no marker titled with "${m.evidence}"`);
  }
  // An id and its source file name one marker (F1a-P10 was two: a browser case and a unit case).
  const ids = [...list.restored, ...list.deleted].map((m) => `${m.id} ${m.file}`);
  assert.equal(new Set(ids).size, ids.length, 'a marker in one list only');
});
