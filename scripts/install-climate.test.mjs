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
import { installClimate, manifestProblem, ensureClimate, loadTiffModule, readRelease, releaseProblem, verifyClimateInstall, parseArgs, readTar, climateIndexProblem, installDirName, DEFAULT_OUT, DEFAULT_CACHE, INDEX_PATH, RELEASE_PATH, PUBLIC_BASE } from './install-climate.mjs';
import { VARIABLES, SLOTS, SOIL_BAND_SPECS, REGION_BAND_SPECS } from '../src/lib/climate/model.js';

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
  const layer = (id, specs) => ({
    id, description: id, cell_deg: 0.05, tile_cells: 200, directory: id,
    encoding: { container: 'Cloud Optimized GeoTIFF', sample_format: 'int16', nodata: -32768, compression: 'deflate', interleave: 'pixel', bands: specs.length, band_order: '' },
    bands: specs.map((b) => ({ ...b, description: b.id })), sources: [],
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
    layers: [layer('regions', REGION_BAND_SPECS), layer('soil', SOIL_BAND_SPECS)],
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

test('a grid installs: tiles byte for byte under <version>-<12 hex>/, the index, nothing else (no mark served)', async (t) => {
  const w = workspace(t);
  const { archive, manifestSha } = writeArchive(w.root);
  const logs = [];
  const summary = await install(w, archive, { log: (l) => logs.push(l) });
  const dir = installDirName('0.2.0', manifestSha);
  assert.equal(dir, `0.2.0-${manifestSha.slice(0, 12)}`);
  assert.deepEqual(readdirSync(w.out), [dir]);
  assert.deepEqual(readdirSync(join(w.out, dir)).sort(), ['regions', 'soil', 'tiles']);
  for (const [p, b] of Object.entries(TILES)) assert.deepEqual(readFileSync(join(w.out, dir, p)), b, p);
  const index = JSON.parse(readFileSync(w.index, 'utf8'));
  assert.equal(climateIndexProblem(index), null);
  assert.equal(index.base, `${PUBLIC_BASE}${dir}/`);
  assert.deepEqual(index.layers.climate.tiles, { n50e000: TILES['tiles/n50e000.tif'].length });
  assert.deepEqual(index.layers.climate.sha256, { n50e000: sha(TILES['tiles/n50e000.tif']) });
  assert.deepEqual(index.layers.soil.sha256, { n50e000: sha(TILES['soil/n50e000.tif']) });
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
  assert.deepEqual(existsSync(w.staging) ? readdirSync(w.staging) : [], [], 'this run\'s staging and lock removed');
  // A second install replaces the first (recognised by its shape: version directories only).
  await install(w, archive);
  assert.deepEqual(readdirSync(w.out), [dir]);
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
  // An empty string is "unknown", not another grid.
  writeFileSync(w.consortiumIndex, JSON.stringify({ release_id: 'r-0000000000000004', climate_grid_manifest_sha256: '' }));
  const logs = [];
  await install(w, archive, { log: (l) => logs.push(l) });
  assert.deepEqual(JSON.parse(readFileSync(w.index, 'utf8')).consortium_grid_check, { status: 'unchecked', consortium_release: 'r-0000000000000004', reason: 'the consortium index\'s climate_grid_manifest_sha256 is empty (unknown grid)' });
  assert.ok(logs.some((l) => /warning: .*climate_grid_manifest_sha256 is empty/.test(l)), logs.join('\n'));
  // Anything else that is not a sha256 is refused as such.
  writeFileSync(w.consortiumIndex, JSON.stringify({ release_id: 'r-0000000000000005', climate_grid_manifest_sha256: 'nope' }));
  rmSync(w.out, { recursive: true });
  await assert.rejects(install(w, archive), /climate_grid_manifest_sha256 "nope" is not a sha256/);
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

// One band of one site layer changed (E2 item 1): the reader decodes soil and regions with the
// manifest's {id, unit, scale, offset}, so any other encoding is refused with the band named.
const editBand = (layer, id, edit) => (m) => ({ ...m, layers: m.layers.map((l) => (l.id === layer ? { ...l, bands: edit(l.bands, id) } : l)) });
const setBand = (layer, id, fields) => editBand(layer, id, (bands) => bands.map((b) => (b.id === id ? { ...b, ...fields } : b)));

test('site-layer bands: a manifest whose soil or regions encoding differs is refused, naming the band', async (t) => {
  const w = workspace(t);
  const cases = [
    ['sand stored as % (scale 1)', setBand('soil', 'sand', { scale: 1 }), /soil band sand/],
    ['clay in g/kg (another unit)', setBand('soil', 'clay', { unit: 'g/kg' }), /soil band clay/],
    ['pH with an offset', setBand('soil', 'ph_h2o', { offset: 1 }), /soil band ph_h2o/],
    ['a soil band missing', editBand('soil', 'fill_distance', (bands) => bands.filter((b) => b.id !== 'fill_distance')), /soil bands are not ph_h2o, sand, clay, fill_distance/],
    ['regions at another scale', setBand('regions', 'iso_a2', { scale: 0.1 }), /regions band iso_a2/],
    ['regions in another order', editBand('regions', null, (bands) => [...bands].reverse()), /regions bands are not wgsrpd_l3, iso_a2/],
  ];
  for (const [what, editManifest, message] of cases) {
    assert.match(manifestProblem(manifestFor(TILES, editManifest)) ?? '', message, what);
    const dir = join(w.root, what.replace(/\W+/g, '-'));
    mkdirSync(dir);
    const { archive } = writeArchive(dir, { editManifest });
    await assert.rejects(install(w, archive), message, what);
    assert.ok(!existsSync(w.out) && !existsSync(w.index), `${what}: nothing written`);
  }
  assert.equal(manifestProblem(manifestFor(TILES)), null, 'the crate\'s encoding passes');
  // JSON writes the crate's 1.0 and 0.0 as 1 and 0; a band's description is not compared.
  assert.equal(manifestProblem(manifestFor(TILES, setBand('soil', 'sand', { description: 'other words' }))), null);
});

// P-E2: the pinned v0.2.0 manifest (the extracted grid on the cache disk) passes the band check.
const REAL_MANIFEST = join(process.env.CANOPI_CLIMATE_GRID ?? '/media/daylon/main_hdd/canopi-cache/climate/out-v0.2', 'manifest.json');
test('the installed v0.2.0 manifest passes the site-layer band check', { skip: existsSync(REAL_MANIFEST) ? false : `no extracted grid manifest at ${REAL_MANIFEST}` }, () => {
  const bytes = readFileSync(REAL_MANIFEST);
  assert.equal(sha(bytes), readRelease().grid_manifest_sha256, 'the extracted manifest is the pinned one');
  assert.equal(manifestProblem(JSON.parse(bytes)), null);
});

test('an output that is not a previous install is not replaced', async (t) => {
  const w = workspace(t);
  const { archive } = writeArchive(w.root);
  mkdirSync(w.out, { recursive: true });
  writeFileSync(join(w.out, 'keep.txt'), 'mine');
  await assert.rejects(install(w, archive), /not empty and holds no climate install/);
  assert.equal(readFileSync(join(w.out, 'keep.txt'), 'utf8'), 'mine');
  // A previous install with the old public INSTALLED_BY mark is replaced, and the mark goes.
  rmSync(w.out, { recursive: true });
  mkdirSync(join(w.out, '0.1.0-000000000000', 'tiles'), { recursive: true });
  writeFileSync(join(w.out, 'INSTALLED_BY'), 'scripts/install-climate.mjs (canopi-website)\n');
  await install(w, archive);
  assert.equal(readdirSync(w.out).length, 1);
  assert.ok(!existsSync(join(w.out, 'INSTALLED_BY')));
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
  rmSync(join(w.out, '0.1.0-000000000000'), { recursive: true });
  // A same-size edit is caught by the tile's sha256; a served install mark is refused.
  const edited = Buffer.from(TILES['regions/n50e000.tif']);
  edited[edited.length - 1] ^= 1;
  writeFileSync(join(dir, 'regions', 'n50e000.tif'), edited);
  assert.throws(() => verifyClimateInstall(w.out, index), /regions\/n50e000\.tif does not match the index's sha256/);
  writeFileSync(join(dir, 'regions', 'n50e000.tif'), TILES['regions/n50e000.tif']);
  verifyClimateInstall(w.out, index);
  writeFileSync(join(w.out, 'INSTALLED_BY'), 'x');
  assert.throws(() => verifyClimateInstall(w.out, index), /INSTALLED_BY/);
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
  assert.deepEqual(parseArgs([]), { archive: null });
  assert.throws(() => parseArgs(['a.tar', 'b.tar']), /one archive/);
  assert.throws(() => parseArgs(['--out', 'x']), /unknown option/);
  assert.match(DEFAULT_OUT, /public[\\/]data[\\/]climate$/);
  assert.match(INDEX_PATH, /src[\\/]data[\\/]climate-index\.json$/);
  assert.match(DEFAULT_CACHE, /node_modules[\\/]\.cache[\\/]canopi-climate$/);
});

// --- The pinned release, fetched at build (owner decision 2026-11-11) ---

test('the pinned release names the v0.2.0 grid on GitHub with its size and checksums', () => {
  const r = readRelease(RELEASE_PATH);
  assert.equal(r.tag, 'v0.2.0');
  assert.equal(r.file, 'canopi-climate-grid-v0.2.0.tar');
  assert.equal(r.url, 'https://github.com/opencanopi/canopi-climate/releases/download/v0.2.0/canopi-climate-grid-v0.2.0.tar');
  assert.equal(r.bytes, 99194880);
  assert.equal(r.sha256, '56f717f1e2618bbdffe8462bc221186729dad419e58073afb58ac239ba8a26d5');
  assert.equal(r.grid_manifest_sha256, '04ec85f4603f29c5add8eada88c79599d044a61732b518a095f91b68e64b0e4c');
  assert.equal(releaseProblem({ ...r, url: 'http://example.com/x.tar' }) !== null, true);
  assert.equal(releaseProblem({ ...r, sha256: 'abc' }) !== null, true);
  assert.equal(releaseProblem({ ...r, bytes: 0 }) !== null, true);
  assert.equal(releaseProblem({ ...r, file: 'other.tar' }) !== null, true);
});

// A pin for a test archive, a fetch double that counts its calls, and ensureClimate in the workspace.
function pinFor(archive, manifestSha) {
  const bytes = readFileSync(archive);
  return { tag: 'v0.2.0', file: 'canopi-climate-grid-v0.2.0.tar', url: 'https://github.com/opencanopi/canopi-climate/releases/download/v0.2.0/canopi-climate-grid-v0.2.0.tar', bytes: bytes.length, sha256: sha(bytes), grid_manifest_sha256: manifestSha };
}
function fakeFetch(body, { status = 200, chunk = 1000 } = {}) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    if (status !== 200) return new Response('nope', { status });
    const stream = new ReadableStream({ start(c) { for (let i = 0; i < body.length; i += chunk) c.enqueue(new Uint8Array(body.subarray(i, i + chunk))); c.close(); } });
    return new Response(stream, { status: 200, headers: { 'content-length': String(body.length) } });
  };
  fn.calls = calls;
  return fn;
}
const noFetch = async () => { throw new Error('no network in tests'); };
const ensure = (w, release, opts = {}) => ensureClimate({ release, env: {}, fetch: noFetch, cacheDir: join(w.root, 'cache'), outDir: w.out, indexPath: w.index, consortiumIndexPath: w.consortiumIndex, stagingDir: w.staging, log: quiet, ...opts });

test('a build downloads the pinned archive once (plain fetch), verifies it, caches it and installs', async (t) => {
  const w = workspace(t);
  const src = join(w.root, 'src');
  mkdirSync(src);
  const { archive, manifestSha } = writeArchive(src);
  const body = readFileSync(archive);
  const release = pinFor(archive, manifestSha);
  const fetch = fakeFetch(body);
  const r = await ensure(w, release, { fetch });
  assert.equal(r.action, 'installed');
  assert.equal(fetch.calls.length, 1);
  assert.equal(fetch.calls[0].url, release.url);
  assert.equal(fetch.calls[0].init?.headers, undefined, 'no custom headers (no user agent, no email)');
  assert.deepEqual(readFileSync(join(w.root, 'cache', release.file)), body, 'the archive is cached');
  assert.deepEqual(readdirSync(join(w.root, 'cache')), [release.file], 'no partial download left');
  const index = JSON.parse(readFileSync(w.index, 'utf8'));
  assert.equal(index.release.grid_manifest_sha256, manifestSha);
  assert.equal(index.release.archive_sha256, release.sha256);
  verifyClimateInstall(w.out, index);

  // Installed and matching: nothing is read or fetched again.
  const again = await ensure(w, release, { fetch: noFetch });
  assert.equal(again.action, 'up to date');

  // The tiles gone (a clean checkout with a warm cache): installed from the cache, no fetch.
  rmSync(w.out, { recursive: true });
  rmSync(w.index);
  const cached = await ensure(w, release, { fetch: noFetch });
  assert.equal(cached.action, 'installed');
  assert.equal(cached.source, 'cache');
  verifyClimateInstall(w.out, JSON.parse(readFileSync(w.index, 'utf8')));
});

test('a download or a cached archive of the wrong size or sha256 is refused; nothing is installed', async (t) => {
  const w = workspace(t);
  const src = join(w.root, 'src');
  mkdirSync(src);
  const { archive, manifestSha } = writeArchive(src);
  const body = readFileSync(archive);
  const release = pinFor(archive, manifestSha);

  const flipped = Buffer.from(body);
  flipped[600] ^= 1;
  await assert.rejects(ensure(w, release, { fetch: fakeFetch(flipped) }), /sha256/);
  await assert.rejects(ensure(w, release, { fetch: fakeFetch(Buffer.concat([body, Buffer.alloc(512)])) }), /bytes/);
  await assert.rejects(ensure(w, release, { fetch: fakeFetch(body.subarray(0, body.length - 512)) }), /bytes/);
  await assert.rejects(ensure(w, release, { fetch: fakeFetch(body, { status: 404 }) }), /404/);
  await assert.rejects(ensure(w, release, { fetch: async () => { throw new Error('getaddrinfo ENOTFOUND'); } }), /ENOTFOUND/);
  assert.equal(existsSync(w.out), false);
  assert.equal(existsSync(w.index), false);
  assert.deepEqual(existsSync(join(w.root, 'cache')) ? readdirSync(join(w.root, 'cache')) : [], [], 'nothing bad is cached');

  // A corrupt cached archive is replaced by a fresh download.
  mkdirSync(join(w.root, 'cache'), { recursive: true });
  writeFileSync(join(w.root, 'cache', release.file), flipped);
  const fetch = fakeFetch(body);
  assert.equal((await ensure(w, release, { fetch })).source, 'download');
  assert.equal(fetch.calls.length, 1);

  // A release whose manifest is not the pinned one is refused even when the tar matches.
  rmSync(w.out, { recursive: true });
  await assert.rejects(ensure(w, { ...release, grid_manifest_sha256: 'f'.repeat(64) }, { fetch: noFetch }), /manifest/);
});

test('offline: CANOPI_CLIMATE_ARCHIVE installs a local archive without the network, and is verified too', async (t) => {
  const w = workspace(t);
  const src = join(w.root, 'src');
  mkdirSync(src);
  const { archive, manifestSha } = writeArchive(src);
  const release = pinFor(archive, manifestSha);
  const r = await ensure(w, release, { env: { CANOPI_CLIMATE_ARCHIVE: archive } });
  assert.equal(r.action, 'installed');
  assert.equal(r.source, 'CANOPI_CLIMATE_ARCHIVE');
  assert.equal(existsSync(join(w.root, 'cache')), false, 'a local archive is not copied to the cache');
  verifyClimateInstall(w.out, JSON.parse(readFileSync(w.index, 'utf8')));

  rmSync(w.out, { recursive: true });
  await assert.rejects(ensure(w, { ...release, sha256: 'e'.repeat(64) }, { env: { CANOPI_CLIMATE_ARCHIVE: archive } }), /sha256/);
  await assert.rejects(ensure(w, { ...release, bytes: release.bytes + 1 }, { env: { CANOPI_CLIMATE_ARCHIVE: archive } }), /bytes/);
  await assert.rejects(ensure(w, release, { env: { CANOPI_CLIMATE_ARCHIVE: join(w.root, 'missing.tar') } }), /CANOPI_CLIMATE_ARCHIVE/);
  assert.equal(existsSync(w.out), false);

  // CANOPI_CLIMATE_CACHE moves the cache.
  const fetch = fakeFetch(readFileSync(archive));
  const r2 = await ensure(w, release, { cacheDir: undefined, env: { CANOPI_CLIMATE_CACHE: join(w.root, 'elsewhere') }, fetch });
  assert.equal(r2.source, 'download');
  assert.equal(existsSync(join(w.root, 'elsewhere', release.file)), true);
});

test('an install of another grid is replaced by the pinned one', async (t) => {
  const w = workspace(t);
  const a = join(w.root, 'a'), b = join(w.root, 'b');
  mkdirSync(a); mkdirSync(b);
  const old = writeArchive(a, { editManifest: (m) => ({ ...m, built_at: '2026-01-01T00:00:00Z' }) });
  const cur = writeArchive(b);
  assert.notEqual(old.manifestSha, cur.manifestSha);
  await ensure(w, pinFor(old.archive, old.manifestSha), { env: { CANOPI_CLIMATE_ARCHIVE: old.archive } });
  const r = await ensure(w, pinFor(cur.archive, cur.manifestSha), { env: { CANOPI_CLIMATE_ARCHIVE: cur.archive } });
  assert.equal(r.action, 'installed');
  assert.deepEqual(readdirSync(w.out), [installDirName('0.2.0', cur.manifestSha)]);
});

test('the TIFF check loads on a Node that cannot import .ts (TypeScript fallback)', async () => {
  const { readTileHeader } = await loadTiffModule({ native: false });
  const h = readTileHeader(TILES['tiles/n50e000.tif'], { side: 100, cellDeg: 0.1, bands: 72 });
  assert.deepEqual([h.north, h.west], [50, 0]);
});

// --- Review fixes (2026-11-11) ---

test('a same-size edit of an installed tile is caught at build and the grid reinstalled', async (t) => {
  const w = workspace(t);
  const { archive, manifestSha } = writeArchive(w.root);
  const release = pinFor(archive, manifestSha);
  await ensure(w, release, { env: { CANOPI_CLIMATE_ARCHIVE: archive } });
  const tile = join(w.out, installDirName('0.2.0', manifestSha), 'tiles', 'n50e000.tif');
  const edited = Buffer.from(TILES['tiles/n50e000.tif']);
  edited[100] ^= 1;
  writeFileSync(tile, edited);
  const r = await ensure(w, release, { env: { CANOPI_CLIMATE_ARCHIVE: archive } });
  assert.equal(r.action, 'installed');
  assert.deepEqual(readFileSync(tile), TILES['tiles/n50e000.tif']);
});

test('each run stages in its own directory and leaves other runs\' staging alone; concurrent installs both succeed', async (t) => {
  const w = workspace(t);
  const { archive, manifestSha } = writeArchive(w.root);
  const release = pinFor(archive, manifestSha);
  const foreign = join(w.staging, 'run-424242-abc');
  mkdirSync(join(foreign, 'old'), { recursive: true });
  writeFileSync(join(foreign, 'old', 'backup.tif'), 'another run\'s backup');
  await ensure(w, release, { env: { CANOPI_CLIMATE_ARCHIVE: archive } });
  assert.equal(readFileSync(join(foreign, 'old', 'backup.tif'), 'utf8'), 'another run\'s backup');
  assert.deepEqual(readdirSync(w.staging), ['run-424242-abc']);

  // dev, build and build:browser-test at once: one installs, the others find it installed.
  rmSync(w.out, { recursive: true });
  const runs = await Promise.all([1, 2, 3].map(() => ensure(w, release, { env: { CANOPI_CLIMATE_ARCHIVE: archive } })));
  assert.deepEqual(runs.map((r) => r.action).sort(), ['installed', 'up to date', 'up to date']);
  verifyClimateInstall(w.out, JSON.parse(readFileSync(w.index, 'utf8')));
  assert.deepEqual(readdirSync(w.staging), ['run-424242-abc']);

  // A lock left by a dead process does not block.
  writeFileSync(join(w.staging, 'lock'), '999999999 dead');
  rmSync(w.out, { recursive: true });
  assert.equal((await ensure(w, release, { env: { CANOPI_CLIMATE_ARCHIVE: archive } })).action, 'installed');
});

test('dev never downloads: archive or cache only, else a clear refusal without a fetch', async (t) => {
  const w = workspace(t);
  const src = join(w.root, 'src');
  mkdirSync(src);
  const { archive, manifestSha } = writeArchive(src);
  const release = pinFor(archive, manifestSha);
  let fetched = 0;
  await assert.rejects(ensure(w, release, { allowDownload: false, fetch: async () => { fetched++; throw new Error('x'); } }), /not downloaded here.*CANOPI_CLIMATE_ARCHIVE/);
  assert.equal(fetched, 0);
  mkdirSync(join(w.root, 'cache'));
  writeFileSync(join(w.root, 'cache', release.file), readFileSync(archive));
  assert.equal((await ensure(w, release, { allowDownload: false })).source, 'cache');
});

// A response whose body sends `first` bytes and then one more chunk every `every` ms (or nothing).
function slowFetch(body, { first = 1000, every = null } = {}) {
  return async (_url, init) => {
    let timer = null;
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(body.subarray(0, first)));
        let at = first;
        if (every) timer = setInterval(() => { if (at < body.length) { c.enqueue(new Uint8Array(body.subarray(at, at + 10))); at += 10; } }, every);
      },
      cancel() { clearInterval(timer); },
    });
    init?.signal?.addEventListener('abort', () => clearInterval(timer));
    return new Response(stream, { status: 200 });
  };
}

test('a download that stalls or runs too long is aborted and fails clearly; nothing is cached', async (t) => {
  const w = workspace(t);
  const src = join(w.root, 'src');
  mkdirSync(src);
  const { archive, manifestSha } = writeArchive(src);
  const body = readFileSync(archive);
  const release = pinFor(archive, manifestSha);
  await assert.rejects(ensure(w, release, { fetch: slowFetch(body), stallMs: 80 }), /no data for 0\.08 s: aborted/);
  await assert.rejects(ensure(w, release, { fetch: slowFetch(body, { every: 10 }), stallMs: 80, timeoutMs: 200 }), /took over 0\.2 s: aborted/);
  // A fetch that never answers is cut by the stall timer too.
  await assert.rejects(ensure(w, release, { fetch: (_u, init) => new Promise((_ok, ko) => init.signal.addEventListener('abort', () => ko(init.signal.reason))), stallMs: 80 }), /no data for 0\.08 s/);
  assert.deepEqual(existsSync(join(w.root, 'cache')) ? readdirSync(join(w.root, 'cache')) : [], []);
  assert.equal(existsSync(w.out), false);
});

test('stale partial downloads of dead runs are removed before downloading; a live run\'s is kept', async (t) => {
  const w = workspace(t);
  const src = join(w.root, 'src');
  mkdirSync(src);
  const { archive, manifestSha } = writeArchive(src);
  const release = pinFor(archive, manifestSha);
  const cache = join(w.root, 'cache');
  mkdirSync(cache);
  writeFileSync(join(cache, `${release.file}.part-999999999`), 'stale');
  writeFileSync(join(cache, `${release.file}.part-${process.ppid}`), 'live');
  await ensure(w, release, { fetch: fakeFetch(readFileSync(archive)) });
  assert.deepEqual(readdirSync(cache).sort(), [release.file, `${release.file}.part-${process.ppid}`]);
});
