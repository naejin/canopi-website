// Installs a canopi-climate grid release (canopi-climate-grid-v<version>.tar and its .sha256) under
// public/data/climate/<version>-<12 hex of the manifest's sha256>/{tiles,soil,regions}/, where the
// consortium page's reader (src/lib/climate/) fetches single tiles. P5 design check section A.
//
//   npm run install:climate -- /path/to/canopi-climate-grid-v0.2.0.tar
//
// Checks, in order, and refuses on the first failure (nothing is written then):
// - <archive>.sha256: one line, the archive's sha256 and its file name.
// - the tar: regular files and directories only, safe relative paths (no absolute path, `..`, link or
//   device), no entry twice, each file at most MAX_FILE_BYTES (Cloudflare's 25 MiB per asset); only
//   manifest.json, SHA256SUMS, build-report.json, ATTRIBUTION.md and tiles|soil|regions/<tile>.tif.
// - SHA256SUMS: every line `<sha256>  <path>` of that form, each listed file present and matching,
//   every file of the archive listed.
// - manifest.json: format canopi-climate-grid, format_version 1, a semver builder_version (the
//   archive's name carries the same), the grid, the variables with their scales, the slots and the
//   site layers' bands exactly as the reader decodes them (src/lib/climate/model.js); each tile entry
//   a valid name at <dir>/<name>.tif with the file's bytes and sha256; no tile file outside the
//   manifest; each tile's TIFF header the layout and position of its name.
// - the consortium export's grid (src/data/consortium-index.json `climate_grid_manifest_sha256`, the
//   grid its ranges were sampled from): refused when it differs; when the export does not name one
//   yet, a warning, recorded in the index as unchecked.
//
// What it writes:
// - <out>/ (default public/data/climate/): INSTALLED_BY and the one version directory, tiles byte for
//   byte (the directory name changes with the manifest, so public/_headers caches the tiles forever).
//   No manifest, sums or attribution are served.
// - src/data/climate-index.json: the URL base, the tile names and sizes per layer, variables and
//   scales, slots, the release (version, built_at, manifest sha256, archive and its sha256), the
//   sources to credit and the consortium check. Build-time readers and the page read it.
// The output is staged, then renamed into place with the index; it must be absent, empty or a
// previous install (its INSTALLED_BY mark).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GRID_FORMAT, GRID_FORMAT_VERSION, LAYERS, REGION_BANDS, SLOTS, SOIL_BANDS, TILE_NAME, VARIABLES } from '../src/lib/climate/model.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_OUT = join(ROOT, 'public', 'data', 'climate');
export const INDEX_PATH = join(ROOT, 'src', 'data', 'climate-index.json');
export const CONSORTIUM_INDEX_PATH = join(ROOT, 'src', 'data', 'consortium-index.json');
export const PUBLIC_BASE = '/data/climate/';
export const STAGING_DIR = join(ROOT, '.cache', 'climate-install');
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const INDEX_FORMAT = 'canopi-website-climate-index';
export const INDEX_FORMAT_VERSION = 1;
const INSTALL_MARK = 'INSTALLED_BY';
const INSTALL_MARK_TEXT = 'scripts/install-climate.mjs (canopi-website)\n';
const HEX64 = /^[0-9a-f]{64}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const ARCHIVE_NAME = /^canopi-climate-grid-v(\d+\.\d+\.\d+)\.tar$/;
const META_FILES = ['manifest.json', 'build-report.json', 'ATTRIBUTION.md'];
const TILE_PATH = /^(tiles|soil|regions)\/([ns]\d\d[ew]\d\d\d)\.tif$/;
const LAYER_IDS = Object.keys(LAYERS);

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

function refuse(message) {
  throw new Error(`Climate grid refused: ${message}`);
}

/** The version directory: <version>-<12 hex of the manifest sha256>. */
export const installDirName = (version, manifestSha) => `${version}-${manifestSha.slice(0, 12)}`;

/** A tile name of the grid (as src/lib/climate/grid.ts parseTileName). */
function validTileName(name) {
  if (!TILE_NAME.test(name)) return false;
  const north = (name[0] === 'n' ? 1 : -1) * Number(name.slice(1, 3));
  const west = (name[3] === 'e' ? 1 : -1) * Number(name.slice(4, 7));
  return north >= -80 && north <= 90 && west >= -180 && west <= 170;
}

/**
 * The entries of a ustar/GNU tar: [{ name, type: 'file' | 'dir', data }]. Throws on a bad header
 * checksum or a truncated archive. Names keep their bytes; the caller judges them.
 */
export function readTar(bytes) {
  const out = [];
  const text = (at, len) => { const s = bytes.subarray(at, at + len); const z = s.indexOf(0); return s.subarray(0, z < 0 ? len : z).toString('utf8'); };
  for (let at = 0; ; ) {
    if (at + 512 > bytes.length) throw new Error('the tar is truncated (no end-of-archive blocks)');
    const h = bytes.subarray(at, at + 512);
    if (h.every((b) => b === 0)) break;
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += i >= 148 && i < 156 ? 0x20 : h[i];
    if (sum !== parseInt(text(at + 148, 8).trim(), 8)) throw new Error(`a tar header checksum fails at byte ${at}`);
    const size = parseInt(text(at + 124, 12).trim() || '0', 8);
    const prefix = text(at + 257, 6).startsWith('ustar') ? text(at + 345, 155) : '';
    const name = prefix ? `${prefix}/${text(at, 100)}` : text(at, 100);
    const flag = String.fromCharCode(h[156] || 0x30);
    if (!Number.isSafeInteger(size) || size < 0 || at + 512 + size > bytes.length) throw new Error(`the tar is truncated in ${name}`);
    const type = flag === '0' || flag === '7' ? 'file' : flag === '5' ? 'dir' : `type ${flag}`;
    out.push({ name, type, data: type === 'file' ? bytes.subarray(at + 512, at + 512 + size) : null });
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}

// The archive's files as a Map path -> bytes, every entry judged.
function archiveFiles(entries, maxFileBytes) {
  const files = new Map();
  for (const e of entries) {
    const name = e.name.replace(/^\.\//, '');
    if (e.name.startsWith('/') || e.name.includes('\\') || name.split('/').some((p) => p === '..') || /[\0-\x1f]/.test(name)) refuse(`unsafe path ${JSON.stringify(e.name)} in the archive.`);
    if (e.type === 'dir') {
      if (!['', 'tiles/', 'soil/', 'regions/'].includes(name)) refuse(`unexpected directory ${name} in the archive.`);
      continue;
    }
    if (e.type !== 'file') refuse(`${name} is not a regular file (${e.type}).`);
    if (files.has(name)) refuse(`${name} is in the archive twice.`);
    if (!META_FILES.includes(name) && name !== 'SHA256SUMS' && !TILE_PATH.test(name)) refuse(`unexpected file ${name} in the archive.`);
    if (e.data.length > maxFileBytes) refuse(`${name} is ${e.data.length} bytes, over the ${maxFileBytes}-byte limit of a static asset.`);
    files.set(name, e.data);
  }
  return files;
}

function checkSums(files) {
  const text = files.get('SHA256SUMS')?.toString('utf8') ?? refuse('SHA256SUMS is missing.');
  const sums = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
    if (!m) refuse(`SHA256SUMS has a malformed line: ${line}`);
    if (!META_FILES.includes(m[2]) && !TILE_PATH.test(m[2])) refuse(`SHA256SUMS lists an unexpected path: ${m[2]}`);
    if (sums.has(m[2])) refuse(`SHA256SUMS lists ${m[2]} twice.`);
    sums.set(m[2], m[1]);
  }
  for (const [path, hash] of sums) {
    if (!files.has(path)) refuse(`${path} is listed in SHA256SUMS but missing.`);
    if (sha256(files.get(path)) !== hash) refuse(`${path} does not match its SHA256SUMS checksum.`);
  }
  for (const path of files.keys()) if (path !== 'SHA256SUMS' && !sums.has(path)) refuse(`${path} is not listed in SHA256SUMS.`);
  if (!sums.has('manifest.json')) refuse('SHA256SUMS does not list manifest.json.');
  return sums;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The manifest against what the reader decodes: the first problem as a sentence, or null. */
export function manifestProblem(m) {
  if (!isObject(m)) return 'manifest.json is not an object.';
  if (m.format !== GRID_FORMAT) return `manifest.json format ${JSON.stringify(m.format)}, not ${GRID_FORMAT}.`;
  if (m.format_version !== GRID_FORMAT_VERSION) return `manifest.json format_version ${JSON.stringify(m.format_version)}; the reader decodes format ${GRID_FORMAT_VERSION} only.`;
  if (typeof m.builder_version !== 'string' || !SEMVER.test(m.builder_version)) return `manifest.json builder_version ${JSON.stringify(m.builder_version)} is not x.y.z.`;
  if (typeof m.built_at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(m.built_at)) return 'manifest.json built_at is not YYYY-MM-DDTHH:MM:SSZ.';
  if (m.grid?.cell_deg !== LAYERS.climate.cellDeg || m.grid?.tile_cells !== LAYERS.climate.tileCells || m.grid?.tile_deg !== 10) return 'manifest.json grid is not 0.1-degree cells in 100-cell, 10-degree tiles.';
  const enc = (e, bands) => isObject(e) && e.sample_format === 'int16' && e.nodata === -32768 && e.compression === 'deflate' && e.interleave === 'pixel' && e.bands === bands;
  if (!enc(m.encoding, LAYERS.climate.bands)) return `manifest.json encoding is not int16, nodata -32768, deflate, pixel-interleaved, ${LAYERS.climate.bands} bands.`;
  const vars = Array.isArray(m.variables) ? m.variables.map((v) => ({ id: v?.id, unit: v?.unit, scale: v?.scale, offset: v?.offset })) : null;
  if (!same(vars, VARIABLES.map((v) => ({ ...v })))) {
    const bad = VARIABLES.find((v, i) => !same(vars?.[i], { ...v }));
    return `manifest.json variables differ from the reader's (first: ${bad?.id ?? 'count'}).`;
  }
  const slots = Array.isArray(m.slots) ? m.slots.map((s) => ({ period: s?.period, scenario: s?.scenario })) : null;
  if (!same(slots, SLOTS.map((s) => ({ ...s })))) return 'manifest.json slots differ from the reader\'s (period and scenario in band order).';
  if (!Array.isArray(m.tiles) || !m.tiles.length) return 'manifest.json lists no climate tile.';
  if (!Array.isArray(m.sources)) return 'manifest.json sources is not a list.';
  for (const s of m.sources) if (!isObject(s) || typeof s.id !== 'string' || typeof s.title !== 'string' || typeof s.licence !== 'string') return 'manifest.json sources need an id, a title and a licence.';
  for (const [layer, bands] of [['soil', SOIL_BANDS], ['regions', REGION_BANDS]]) {
    const l = Array.isArray(m.layers) ? m.layers.find((x) => x?.id === layer) : null;
    if (!l) return `manifest.json has no ${layer} layer.`;
    if (l.directory !== LAYERS[layer].dir || l.cell_deg !== LAYERS[layer].cellDeg || l.tile_cells !== LAYERS[layer].tileCells) return `manifest.json ${layer} layer is not 0.05-degree cells in 200-cell tiles under ${LAYERS[layer].dir}/.`;
    if (!enc(l.encoding, bands.length)) return `manifest.json ${layer} encoding is not int16, nodata -32768, deflate, pixel-interleaved, ${bands.length} bands.`;
    if (!same(Array.isArray(l.bands) ? l.bands.map((b) => b?.id) : null, [...bands])) return `manifest.json ${layer} bands are not ${bands.join(', ')}.`;
    if (!Array.isArray(l.tiles)) return `manifest.json ${layer} tiles is not a list.`;
  }
  return null;
}

// Every tile file against the manifest entries: Map layer -> Map name -> bytes.
function checkTiles(m, files) {
  const lists = { climate: m.tiles, soil: m.layers.find((l) => l.id === 'soil').tiles, regions: m.layers.find((l) => l.id === 'regions').tiles };
  const tiles = { climate: new Map(), soil: new Map(), regions: new Map() };
  const listed = new Set();
  for (const layer of LAYER_IDS) {
    const dir = LAYERS[layer].dir;
    for (const t of lists[layer]) {
      if (!isObject(t) || typeof t.name !== 'string' || !validTileName(t.name)) refuse(`manifest.json ${layer} tile ${JSON.stringify(t?.name)} is not a tile name.`);
      if (t.path !== `${dir}/${t.name}.tif`) refuse(`manifest.json ${layer} tile ${t.name} has the path ${JSON.stringify(t.path)}, not ${dir}/${t.name}.tif.`);
      if (!Number.isInteger(t.bytes) || t.bytes <= 0 || typeof t.sha256 !== 'string' || !HEX64.test(t.sha256)) refuse(`manifest.json ${t.path} needs bytes and a sha256.`);
      if (tiles[layer].has(t.name)) refuse(`manifest.json lists ${t.path} twice.`);
      const bytes = files.get(t.path) ?? refuse(`${t.path} is in the manifest but not in the archive.`);
      if (bytes.length !== t.bytes) refuse(`${t.path} is ${bytes.length} bytes, the manifest says ${t.bytes}.`);
      if (sha256(bytes) !== t.sha256) refuse(`${t.path} does not match the manifest's sha256.`);
      tiles[layer].set(t.name, bytes);
      listed.add(t.path);
    }
  }
  for (const path of files.keys()) if (TILE_PATH.test(path) && !listed.has(path)) refuse(`${path} is not in the manifest.`);
  return tiles;
}

// Each tile's TIFF header: the layout of its layer and the position of its name (the reader's own
// check, src/lib/climate/tiff.ts; loaded here only, so importing this module needs no TypeScript).
async function checkHeaders(tiles) {
  const { readTileHeader } = await import('../src/lib/climate/tiff.ts');
  for (const layer of LAYER_IDS) {
    const spec = LAYERS[layer];
    for (const [name, bytes] of tiles[layer]) {
      const path = `${spec.dir}/${name}.tif`;
      let h;
      try { h = readTileHeader(bytes, { side: spec.tileCells, cellDeg: spec.cellDeg, bands: spec.bands }); } catch (err) { refuse(`${path}: ${err.message}`); }
      const at = `${h.north >= 0 ? 'n' : 's'}${String(Math.abs(h.north)).padStart(2, '0')}${h.west >= 0 ? 'e' : 'w'}${String(Math.abs(h.west)).padStart(3, '0')}`;
      if (at !== name) refuse(`${path} holds the tile ${at}.`);
    }
  }
}

// The consortium export's grid: { status, consortium_release[, reason] }; refuses a different grid.
function consortiumCheck(path, manifestSha, log) {
  let index = null;
  try { index = JSON.parse(readFileSync(path, 'utf8')); } catch { /* none */ }
  if (!index) {
    log(`warning: no consortium index at ${path}; the grid is not checked against the plant ranges.`);
    return { status: 'unchecked', consortium_release: null, reason: 'no consortium index' };
  }
  const release = typeof index.release_id === 'string' ? index.release_id : null;
  const want = index.climate_grid_manifest_sha256;
  if (want === undefined || want === null) {
    log(`warning: the consortium index (${release}) has no climate_grid_manifest_sha256, so the grid its ranges were sampled from is unknown: unchecked (S5a hand-off). This grid: ${manifestSha}.`);
    return { status: 'unchecked', consortium_release: release, reason: 'the consortium index has no climate_grid_manifest_sha256' };
  }
  if (want !== manifestSha) refuse(`the consortium export ${release} was sampled from the grid ${String(want).slice(0, 12)}…, this archive is ${manifestSha.slice(0, 12)}…: refused (install the matching grid, or the matching consortium export).`);
  return { status: 'matched', consortium_release: release };
}

/** The index the site reads (plain data, stable key order). */
export function buildIndex({ manifest, manifestSha, tiles, archive, archiveSha, check }) {
  const dir = installDirName(manifest.builder_version, manifestSha);
  const layer = (id) => ({
    dir: LAYERS[id].dir, cell_deg: LAYERS[id].cellDeg, tile_cells: LAYERS[id].tileCells, bands: LAYERS[id].bands,
    tiles: Object.fromEntries([...tiles[id]].sort(([a], [b]) => (a < b ? -1 : 1)).map(([name, bytes]) => [name, bytes.length])),
  });
  const credits = new Map();
  for (const s of [...manifest.sources, ...manifest.layers.flatMap((l) => (Array.isArray(l.sources) ? l.sources : []))]) {
    if (isObject(s) && !credits.has(s.id)) credits.set(s.id, { id: s.id, title: s.title, citation: s.citation ?? null, landing: s.landing ?? null, licence: s.licence });
  }
  return {
    format: INDEX_FORMAT,
    format_version: INDEX_FORMAT_VERSION,
    release: { builder_version: manifest.builder_version, built_at: manifest.built_at, grid_manifest_sha256: manifestSha, archive, archive_sha256: archiveSha },
    base: `${PUBLIC_BASE}${dir}/`,
    layers: { climate: layer('climate'), soil: layer('soil'), regions: layer('regions') },
    variables: VARIABLES.map((v) => ({ ...v })),
    slots: SLOTS.map((s) => ({ ...s })),
    soil_bands: [...SOIL_BANDS],
    region_bands: [...REGION_BANDS],
    credits: [...credits.values()],
    consortium_grid_check: check,
  };
}

/** The index's shape, as the reader and the built-site check rely on it: the first problem, or null. */
export function climateIndexProblem(index) {
  if (!isObject(index)) return 'the climate index is not an object.';
  if (index.format !== INDEX_FORMAT || index.format_version !== INDEX_FORMAT_VERSION) return `the climate index is ${index.format} v${index.format_version}.`;
  const sha = index.release?.grid_manifest_sha256;
  if (!HEX64.test(sha ?? '') || !SEMVER.test(index.release?.builder_version ?? '')) return 'the climate index release has no version or manifest sha256.';
  if (index.base !== `${PUBLIC_BASE}${installDirName(index.release.builder_version, sha)}/`) return `the climate index base ${JSON.stringify(index.base)} is not ${PUBLIC_BASE}<version>-<12 hex>/.`;
  for (const id of LAYER_IDS) {
    const l = index.layers?.[id];
    if (!isObject(l) || l.dir !== LAYERS[id].dir || !isObject(l.tiles)) return `the climate index has no ${id} layer.`;
    for (const [name, bytes] of Object.entries(l.tiles)) if (!validTileName(name) || !Number.isInteger(bytes) || bytes <= 0 || bytes > MAX_FILE_BYTES) return `the climate index ${id} tile ${JSON.stringify(name)} is not a tile with its size.`;
  }
  if (!Object.keys(index.layers.climate.tiles).length) return 'the climate index lists no climate tile.';
  return null;
}

/**
 * Checks an installed directory as the site serves it (scripts/check-built-site.mjs runs it on
 * dist/client/data/climate/) against the index: the mark, one version directory (the index's), every
 * tile of the index with its size, nothing else. Throws on the first problem; returns the counts.
 */
export function verifyClimateInstall(dir, index) {
  const broken = (message) => { throw new Error(`Climate install broken (${dir}): ${message}`); };
  const problem = climateIndexProblem(index);
  if (problem) broken(problem);
  const version = index.base.slice(PUBLIC_BASE.length, -1);
  if (!existsSync(dir)) broken('the directory is missing: install the grid with `npm run install:climate -- <canopi-climate-grid tar>`.');
  if (!existsSync(join(dir, INSTALL_MARK))) broken(`${INSTALL_MARK} is missing.`);
  const stray = readdirSync(dir).filter((n) => n !== INSTALL_MARK && n !== version);
  if (stray.length) broken(`entries other than ${version}: ${stray.join(', ')}.`);
  const counts = {};
  const extra = [];
  for (const id of LAYER_IDS) {
    const { dir: sub, tiles } = index.layers[id];
    const at = join(dir, version, sub);
    const present = existsSync(at) ? readdirSync(at) : [];
    for (const [name, bytes] of Object.entries(tiles)) {
      const file = join(at, `${name}.tif`);
      if (!existsSync(file)) broken(`${sub}/${name}.tif is missing.`);
      const size = statSync(file).size;
      if (size !== bytes) broken(`${sub}/${name}.tif is ${size} bytes, the index says ${bytes}.`);
    }
    for (const f of present) if (!Object.hasOwn(tiles, f.replace(/\.tif$/, '')) || !f.endsWith('.tif')) extra.push(`${sub}/${f}`);
    counts[id] = Object.keys(tiles).length;
  }
  const others = readdirSync(join(dir, version)).filter((n) => !LAYER_IDS.some((id) => LAYERS[id].dir === n));
  if (extra.length || others.length) broken(`tiles the index does not name: ${[...extra, ...others].slice(0, 5).join(', ')}.`);
  return counts;
}

function checkOut(out) {
  if (!existsSync(out)) return;
  if (!statSync(out).isDirectory()) refuse(`${out} is a file, not an install directory.`);
  if (!readdirSync(out).length) return;
  let mark = null;
  try { mark = readFileSync(join(out, INSTALL_MARK), 'utf8'); } catch { /* none */ }
  if (mark !== INSTALL_MARK_TEXT) refuse(`${out} is not empty and holds no climate install (no ${INSTALL_MARK} from this script), so it is not replaced.`);
}

export function stagingDirFor(out) {
  const rel = relative(ROOT, resolve(out));
  return rel && !rel.startsWith('..') && !isAbsolute(rel) ? STAGING_DIR : join(dirname(resolve(out)), '.climate-install');
}

export async function installClimate({ archive, outDir = DEFAULT_OUT, indexPath = INDEX_PATH, consortiumIndexPath = CONSORTIUM_INDEX_PATH, stagingDir = null, maxFileBytes = MAX_FILE_BYTES, log = console.log } = {}) {
  if (!archive) refuse('no archive given.');
  const tarPath = resolve(archive), out = resolve(outDir);
  const name = basename(tarPath);
  const version = ARCHIVE_NAME.exec(name)?.[1] ?? refuse(`${name} is not named canopi-climate-grid-v<x.y.z>.tar.`);
  checkOut(out);
  const shaPath = `${tarPath}.sha256`;
  if (!existsSync(shaPath)) refuse(`${basename(shaPath)} is missing beside the archive.`);
  const shaLine = readFileSync(shaPath, 'utf8').trim().split('\n');
  const m = shaLine.length === 1 ? /^([0-9a-f]{64}) [ *](.+)$/.exec(shaLine[0]) : null;
  if (!m) refuse(`${basename(shaPath)} is not one "<sha256>  <file>" line.`);
  if (m[2] !== name) refuse(`${basename(shaPath)} names ${m[2]}, not ${name}.`);
  const bytes = readFileSync(tarPath);
  const archiveSha = sha256(bytes);
  if (archiveSha !== m[1]) refuse(`${name} does not match its .sha256.`);

  let entries;
  try { entries = readTar(bytes); } catch (err) { refuse(err.message); }
  const files = archiveFiles(entries, maxFileBytes);
  checkSums(files);
  const manifestBytes = files.get('manifest.json');
  let manifest;
  try { manifest = JSON.parse(manifestBytes.toString('utf8')); } catch (err) { refuse(`manifest.json is not valid JSON (${err.message}).`); }
  const problem = manifestProblem(manifest);
  if (problem) refuse(problem);
  if (manifest.builder_version !== version) refuse(`${name} names version ${version}, its manifest ${manifest.builder_version}.`);
  const tiles = checkTiles(manifest, files);
  await checkHeaders(tiles);
  const manifestSha = sha256(manifestBytes);
  const check = consortiumCheck(consortiumIndexPath, manifestSha, log);
  const index = buildIndex({ manifest, manifestSha, tiles, archive: name, archiveSha, check });
  const indexBytes = Buffer.from(`${JSON.stringify(index, null, 2)}\n`);
  const dir = installDirName(manifest.builder_version, manifestSha);

  const staging = resolve(stagingDir ?? stagingDirFor(out));
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  try {
    const tmp = join(staging, `new-${process.pid}`), old = join(staging, `old-${process.pid}`), stagedIndex = join(staging, `index-${process.pid}.json`);
    let count = 0;
    for (const layer of LAYER_IDS) {
      const at = join(tmp, dir, LAYERS[layer].dir);
      mkdirSync(at, { recursive: true });
      for (const [tile, b] of tiles[layer]) { writeFileSync(join(at, `${tile}.tif`), b); count++; }
    }
    writeFileSync(join(tmp, INSTALL_MARK), INSTALL_MARK_TEXT);
    writeFileSync(stagedIndex, indexBytes);
    let previousIndex = null;
    try { previousIndex = readFileSync(indexPath); } catch { /* none yet */ }
    mkdirSync(dirname(out), { recursive: true });
    const hadOut = existsSync(out);
    if (hadOut) renameSync(out, old);
    try {
      renameSync(tmp, out);
      mkdirSync(dirname(indexPath), { recursive: true });
      renameSync(stagedIndex, indexPath);
    } catch (err) {
      if (previousIndex) writeFileSync(indexPath, previousIndex);
      rmSync(out, { recursive: true, force: true });
      if (hadOut) renameSync(old, out);
      throw err;
    }
    const sizes = Object.fromEntries(LAYER_IDS.map((l) => [l, [...tiles[l].values()].reduce((n, b) => n + b.length, 0)]));
    log(`Installed canopi-climate ${manifest.builder_version} (manifest ${manifestSha.slice(0, 12)}): ${LAYER_IDS.map((l) => `${tiles[l].size} ${l} tiles (${(sizes[l] / 1e6).toFixed(1)} MB)`).join(', ')} in ${join(out, dir)}.`);
    log(`Index: ${indexPath}. Consortium grid check: ${check.status}.`);
    return { out: join(out, dir), index: indexPath, files: count, bytes: sizes, check };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

export function parseArgs(argv) {
  let archive = null;
  for (const a of argv) {
    if (a.startsWith('--')) refuse(`unknown option ${a}.`);
    else if (archive) refuse(`one archive only (got ${basename(a)} too).`);
    else archive = a;
  }
  if (!archive) refuse('usage: npm run install:climate -- <canopi-climate-grid-vX.Y.Z.tar> (its .sha256 beside it)');
  return { archive };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await installClimate(parseArgs(process.argv.slice(2)));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
