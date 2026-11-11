// The climate grid installer (scripts/install-climate.mjs; P5 design check section A): a small grid
// archive made here from the crate's synthetic tiles (scripts/fixtures/climate/) installs into a
// temporary directory (never public/), and each broken archive is refused before anything is
// written. Nothing here needs the 98 MB grid.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installClimate, verifyClimateInstall, parseArgs, readTar, climateIndexProblem, installDirName, DEFAULT_OUT, INDEX_PATH, PUBLIC_BASE } from './install-climate.mjs';
import { VARIABLES, SLOTS, SOIL_BANDS, REGION_BANDS } from '../src/lib/climate/model.js';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const quiet = () => {};
const FIXTURES = new URL('./fixtures/climate/', import.meta.url);
const TILES = {
  'tiles/n50e000.tif': readFileSync(new URL('synthetic-n50e000.tif', FIXTURES)),
  'soil/n50e000.tif': readFileSync(new URL('synthetic-soil-n50e000.tif', FIXTURES)),
  'regions/n50e000.tif': readFileSync(new URL('synthetic-regions-n50e000.tif', FIXTURES)),
};

// A ustar archive of [name, bytes | { type, link }] entries ('./' prefixed like the release's tar).
function tar(entries) {
  const blocks = [];
  const field = (buf, at, len, text) => buf.write(text, at, Math.min(len, Buffer.byteLength(text)), 'utf8');
  for (const [name, body] of entries) {
    const h = Buffer.alloc(512);
    const isFile = Buffer.isBuffer(body);
    field(h, 0, 100, name);
    field(h, 100, 8, '0000644\0');
    field(h, 108, 8, '0001750\0');
    field(h, 116, 8, '0001750\0');
    field(h, 124, 12, `${(isFile ? body.length : 0).toString(8).padStart(11, '0')}\0`);
    field(h, 136, 12, '00000000000\0');
    h[156] = (isFile ? '0' : body.type).charCodeAt(0);
    if (!isFile && body.link) field(h, 157, 100, body.link);
    field(h, 257, 6, 'ustar\0');
    field(h, 263, 2, '00');
    h.fill(0x20, 148, 156);
    let sum = 0;
    for (const b of h) sum += b;
    field(h, 148, 8, `${sum.toString(8).padStart(6, '0')}\0 `);
    blocks.push(h);
    if (isFile) {
      blocks.push(body);
      if (body.length % 512) blocks.push(Buffer.alloc(512 - (body.length % 512)));
    }
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

// The manifest of a one-tile grid, shaped like canopi-climate's (src/manifest.rs).
function manifestFor(files, edit = (m) => m) {
  const entry = (path) => ({ name: path.split('/')[1].replace('.tif', ''), path, bytes: files[path].length, sha256: sha(files[path]), complete_cells: 1 });
  const layer = (id, bands) => ({
    id, description: id, cell_deg: 0.05, tile_cells: 200, directory: id,
    encoding: { container: 'Cloud Optimized GeoTIFF', sample_format: 'int16', nodata: -32768, compression: 'deflate', interleave: 'pixel', bands: bands.length, band_order: '' },
    bands: bands.map((b) => ({ id: b, unit: '', scale: 1, offset: 0, description: b })), sources: [],
    tiles: Object.keys(files).filter((p) => p.startsWith(`${id}/`)).map(entry), notes: [],
  });
  return edit({
    format: 'canopi-climate-grid', format_version: 1, builder_version: '0.2.0', built_at: '2026-11-11T02:49:37Z',
    grid: { crs: 'EPSG:4326', cell_deg: 0.1, tile_deg: 10, tile_cells: 100, tile_naming: '', cell_edges: '' },
    encoding: { container: '', sample_format: 'int16', nodata: -32768, compression: 'deflate', interleave: 'pixel', bands: 72, band_order: '' },
    variables: VARIABLES.map((v) => ({ ...v, description: v.id })),
    slots: SLOTS.map((s) => ({ ...s, scenario_label: s.scenario })),
    sources: [{ id: 'beck2023', title: 'Köppen-Geiger maps', citation: 'Beck et al. (2023)', landing: 'https://doi.org/10.6084/m9.figshare.21789074.v2', licence: 'CC BY 4.0', notes: '', files: [] }],
    tiles: Object.keys(files).filter((p) => p.startsWith('tiles/')).map(entry),
    notes: [],
    layers: [layer('regions', REGION_BANDS), layer('soil', SOIL_BANDS)],
  });
}

// A grid archive (and its .sha256) in root; options break one thing at a time.
function writeArchive(root, { tiles = TILES, editManifest, extra = [], sums, editSums = (s) => s, name = 'canopi-climate-grid-v0.2.0.tar', shaLine } = {}) {
  const files = { ...tiles };
  const manifest = Buffer.from(`${JSON.stringify(manifestFor(tiles, editManifest), null, 2)}\n`);
  const other = { 'manifest.json': manifest, 'build-report.json': Buffer.from('{}\n'), 'ATTRIBUTION.md': Buffer.from('# Attribution\n') };
  const all = { ...other, ...files };
  const sumText = sums ?? editSums(Object.entries(all).map(([p, b]) => `${sha(b)}  ${p}\n`).join(''));
  const entries = [['./', { type: '5' }], ['./tiles/', { type: '5' }], ['./soil/', { type: '5' }], ['./regions/', { type: '5' }],
    ...Object.entries(all).map(([p, b]) => [`./${p}`, b]), ['./SHA256SUMS', Buffer.from(sumText)], ...extra];
  const bytes = tar(entries);
  const archive = join(root, name);
  writeFileSync(archive, bytes);
  writeFileSync(`${archive}.sha256`, shaLine ?? `${sha(bytes)}  ${name}\n`);
  return { archive, manifest, manifestSha: sha(manifest) };
}

function workspace(t) {
  const root = mkdtempSync(join(tmpdir(), 'climate-install-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const consortiumIndex = join(root, 'consortium-index.json');
  writeFileSync(consortiumIndex, JSON.stringify({ release_id: 'r-0000000000000001' }));
  return { root, out: join(root, 'out', 'climate'), index: join(root, 'src-data', 'climate-index.json'), consortiumIndex, staging: join(root, 'staging') };
}
const install = (w, archive, opts = {}) => installClimate({ archive, outDir: w.out, indexPath: w.index, consortiumIndexPath: w.consortiumIndex, stagingDir: w.staging, log: quiet, ...opts });

test('a grid installs: tiles byte for byte under <version>-<12 hex>/, the mark, the index, nothing else', async (t) => {
  const w = workspace(t);
  const { archive, manifestSha } = writeArchive(w.root);
  const logs = [];
  const summary = await install(w, archive, { log: (l) => logs.push(l) });
  const dir = installDirName('0.2.0', manifestSha);
  assert.equal(dir, `0.2.0-${manifestSha.slice(0, 12)}`);
  assert.deepEqual(readdirSync(w.out).sort(), [dir, 'INSTALLED_BY']);
  assert.deepEqual(readdirSync(join(w.out, dir)).sort(), ['regions', 'soil', 'tiles']);
  for (const [p, b] of Object.entries(TILES)) assert.deepEqual(readFileSync(join(w.out, dir, p)), b, p);
  const index = JSON.parse(readFileSync(w.index, 'utf8'));
  assert.equal(climateIndexProblem(index), null);
  assert.equal(index.base, `${PUBLIC_BASE}${dir}/`);
  assert.deepEqual(index.layers.climate.tiles, { n50e000: TILES['tiles/n50e000.tif'].length });
  assert.deepEqual(Object.keys(index.layers), ['climate', 'soil', 'regions']);
  assert.equal(index.layers.soil.dir, 'soil');
  assert.equal(index.release.grid_manifest_sha256, manifestSha);
  assert.equal(index.release.builder_version, '0.2.0');
  assert.equal(index.release.archive, 'canopi-climate-grid-v0.2.0.tar');
  assert.deepEqual(index.slots, SLOTS.map((s) => ({ ...s })));
  assert.deepEqual(index.variables.map((v) => [v.id, v.scale]), VARIABLES.map((v) => [v.id, v.scale]));
  assert.deepEqual(index.credits.map((c) => c.id), ['beck2023']);
  // The consortium export does not name its grid yet (S5a): a warning, recorded in the index.
  assert.deepEqual(index.consortium_grid_check, { status: 'unchecked', consortium_release: 'r-0000000000000001', reason: 'the consortium index has no climate_grid_manifest_sha256' });
  assert.ok(logs.some((l) => /warning: .*climate_grid_manifest_sha256/.test(l)), logs.join('\n'));
  assert.deepEqual(verifyClimateInstall(join(w.out), index), { climate: 1, soil: 1, regions: 1 });
  assert.equal(summary.files, 3);
  assert.ok(!existsSync(w.staging), 'staging removed');
  // A second install replaces the first (its mark).
  await install(w, archive);
  assert.deepEqual(readdirSync(w.out).sort(), [dir, 'INSTALLED_BY']);
});

test('the consortium export\'s grid digest: equal installs (matched), different refuses', async (t) => {
  const w = workspace(t);
  const { archive, manifestSha } = writeArchive(w.root);
  writeFileSync(w.consortiumIndex, JSON.stringify({ release_id: 'r-0000000000000002', climate_grid_manifest_sha256: manifestSha }));
  await install(w, archive);
  assert.deepEqual(JSON.parse(readFileSync(w.index, 'utf8')).consortium_grid_check, { status: 'matched', consortium_release: 'r-0000000000000002' });
  writeFileSync(w.consortiumIndex, JSON.stringify({ release_id: 'r-0000000000000003', climate_grid_manifest_sha256: 'a'.repeat(64) }));
  rmSync(w.out, { recursive: true });
  await assert.rejects(install(w, archive), /r-0000000000000003 was sampled from the grid aaaaaaaaaaaa…, this archive is .*: refused/);
  assert.ok(!existsSync(w.out), 'nothing written');
});

test('broken archives are refused before anything is written', async (t) => {
  const w = workspace(t);
  const cases = [
    ['archive digest', { shaLine: `${'0'.repeat(64)}  canopi-climate-grid-v0.2.0.tar\n` }, /does not match its \.sha256/],
    ['.sha256 names another file', { shaLine: `${'0'.repeat(64)}  other.tar\n` }, /names other\.tar/],
    ['format_version 2', { editManifest: (m) => ({ ...m, format_version: 2 }) }, /format_version 2/],
    ['another format', { editManifest: (m) => ({ ...m, format: 'x' }) }, /format "x"/],
    ['a scale the reader does not decode', { editManifest: (m) => ({ ...m, variables: m.variables.map((v, i) => (i === 1 ? { ...v, scale: 0.01 } : v)) }) }, /variables .*tmin_cold/],
    ['slots in another order', { editManifest: (m) => ({ ...m, slots: [...m.slots].reverse() }) }, /slots/],
    ['soil bands', { editManifest: (m) => ({ ...m, layers: m.layers.map((l) => (l.id === 'soil' ? { ...l, bands: l.bands.slice(0, 3) } : l)) }) }, /soil bands/],
    ['manifest size', { editManifest: (m) => ({ ...m, tiles: m.tiles.map((x) => ({ ...x, bytes: x.bytes + 1 })) }) }, /tiles\/n50e000\.tif is \d+ bytes, the manifest says/],
    ['manifest hash', { editManifest: (m) => ({ ...m, tiles: m.tiles.map((x) => ({ ...x, sha256: 'b'.repeat(64) })) }) }, /tiles\/n50e000\.tif does not match the manifest's sha256/],
    ['manifest path', { editManifest: (m) => ({ ...m, tiles: m.tiles.map((x) => ({ ...x, path: 'tiles/../n50e000.tif' })) }) }, /path/],
    ['a SHA256SUMS line wrong', { editSums: (s) => s.replace(/^[0-9a-f]{64}(?=  tiles\/n50e000)/m, 'c'.repeat(64)) }, /tiles\/n50e000\.tif does not match its SHA256SUMS/],
    ['a malformed SHA256SUMS line', { editSums: (s) => `${s}nonsense\n` }, /malformed line/],
    ['a SHA256SUMS path outside the grid', { editSums: (s) => `${s}${'d'.repeat(64)}  ../etc/passwd\n` }, /malformed line|unexpected path/],
    ['a file SHA256SUMS does not list', { editSums: (s) => s.split('\n').filter((l) => !l.includes('regions/')).join('\n') }, /regions\/n50e000\.tif is not listed in SHA256SUMS/],
    ['an unlisted file', { extra: [['./notes.txt', Buffer.from('hi')]] }, /notes\.txt/],
    ['a tile the manifest does not list', { extra: [['./tiles/n40e000.tif', TILES['tiles/n50e000.tif']]], editSums: (s) => `${s}${sha(TILES['tiles/n50e000.tif'])}  tiles/n40e000.tif\n` }, /tiles\/n40e000\.tif is not in the manifest/],
    ['path traversal', { extra: [['../evil.tif', Buffer.from('x')]] }, /unsafe path/],
    ['an absolute path', { extra: [['/tmp/evil.tif', Buffer.from('x')]] }, /unsafe path/],
    ['a symlink', { extra: [['./tiles/link.tif', { type: '2', link: '/etc/passwd' }]] }, /not a regular file/],
    ['a duplicate entry', { extra: [['./tiles/n50e000.tif', TILES['tiles/n50e000.tif']]] }, /twice/],
    ['a tile at the wrong place', { tiles: { ...TILES, 'tiles/n40e000.tif': TILES['tiles/n50e000.tif'] } }, /tiles\/n40e000\.tif holds the tile n50e000/],
    ['a soil file in the climate directory', { tiles: { ...TILES, 'tiles/n50e000.tif': TILES['soil/n50e000.tif'] } }, /tiles\/n50e000\.tif: not a canopi-climate tile/],
  ];
  for (const [what, opts, message] of cases) {
    const dir = join(w.root, what.replace(/\W+/g, '-'));
    mkdirSync(dir);
    const { archive } = writeArchive(dir, opts);
    await assert.rejects(install(w, archive), message, what);
    assert.ok(!existsSync(w.out) && !existsSync(w.index), `${what}: nothing written`);
  }
  // A file over the per-asset limit (25 MiB on Cloudflare; lowered here).
  const { archive } = writeArchive(w.root);
  await assert.rejects(install(w, archive, { maxFileBytes: 30_000 }), /over the 30000-byte limit/);
  // A missing .sha256.
  rmSync(`${archive}.sha256`);
  await assert.rejects(install(w, archive), /\.sha256 is missing/);
});

test('an output that is not a previous install is not replaced', async (t) => {
  const w = workspace(t);
  const { archive } = writeArchive(w.root);
  mkdirSync(w.out, { recursive: true });
  writeFileSync(join(w.out, 'keep.txt'), 'mine');
  await assert.rejects(install(w, archive), /not empty and holds no climate install/);
  assert.equal(readFileSync(join(w.out, 'keep.txt'), 'utf8'), 'mine');
});

test('verifyClimateInstall: every index tile present with its size, nothing else, one version', async (t) => {
  const w = workspace(t);
  const { archive, manifestSha } = writeArchive(w.root);
  await install(w, archive);
  const index = JSON.parse(readFileSync(w.index, 'utf8'));
  const dir = join(w.out, installDirName('0.2.0', manifestSha));
  writeFileSync(join(dir, 'soil', 'n50e000.tif'), 'short');
  assert.throws(() => verifyClimateInstall(w.out, index), /soil\/n50e000\.tif is 5 bytes, the index says/);
  rmSync(join(dir, 'soil', 'n50e000.tif'));
  assert.throws(() => verifyClimateInstall(w.out, index), /soil\/n50e000\.tif is missing/);
  writeFileSync(join(dir, 'soil', 'n50e000.tif'), TILES['soil/n50e000.tif']);
  writeFileSync(join(dir, 'tiles', 'n40e000.tif'), 'x');
  assert.throws(() => verifyClimateInstall(w.out, index), /tiles the index does not name: tiles\/n40e000\.tif/);
  rmSync(join(dir, 'tiles', 'n40e000.tif'));
  mkdirSync(join(w.out, '0.1.0-000000000000'));
  assert.throws(() => verifyClimateInstall(w.out, index), /0\.1\.0-000000000000/);
});

test('readTar refuses truncated archives and bad checksums', () => {
  const good = tar([['./a', Buffer.from('hello')]]);
  assert.deepEqual(readTar(good).map((e) => [e.name, e.type, e.data?.toString()]), [['./a', 'file', 'hello']]);
  assert.throws(() => readTar(good.subarray(0, 600)), /truncated/);
  const bad = Buffer.from(good);
  bad[0] = 0x62;
  assert.throws(() => readTar(bad), /checksum/);
});

test('the command line and the site defaults', () => {
  assert.deepEqual(parseArgs(['grid.tar']), { archive: 'grid.tar' });
  assert.throws(() => parseArgs([]), /usage/);
  assert.throws(() => parseArgs(['a.tar', 'b.tar']), /one archive/);
  assert.throws(() => parseArgs(['--out', 'x']), /unknown option/);
  assert.match(DEFAULT_OUT, /public[\\/]data[\\/]climate$/);
  assert.match(INDEX_PATH, /src[\\/]data[\\/]climate-index\.json$/);
});
