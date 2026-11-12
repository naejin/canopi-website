// Installs a canopi-data consortium export (format 4: gzipped SQLite, canopi-data
// docs/consortium-export-v2.md) into public/data/consortium/, where the consortium page fetches the
// database whole and opens it with SQLite-WASM. Run by hand; the output is committed.
//
//   node scripts/install-consortium.mjs <export-dir> [--fixture [--no-images]] [--out <dir>]
//
// A real install (no --fixture) needs canopi-data beside this repository and uv: after the checks
// below, and before any photo, it runs `uv run canopi release verify <export-dir>` from there, on the
// original directory, as the receipt stands beside it. Exit 0 may install; anything else refuses and
// shows the message. --fixture (tests only) skips it and is refused for this checkout's own
// public/data/consortium/ and anything in it (symlinks followed).
//
// Checks, in order, and refuses on the first failure (nothing is written then):
// - SHA256SUMS: every listed file exists and matches; every other file of the directory is listed.
// - manifest.json: format_version 4 and schema_version 3 (anything else refused by name), release_id
//   (`r-` and 16 hex digits), canopi_db_sha256 not all zeros unless --fixture, `split` false (the page
//   reads one file) with one file, the climates of the files those of `climates`, the TRY list and credits entries,
//   and `climate_ranges` with the grid the ranges were sampled from.
// - each database file: a safe name of the contract's form (schema, release, digest of the raw
//   database), its sha256 and bytes those of the manifest and SHA256SUMS, the gzip magic, at most
//   MAX_GZIP_BYTES gzipped and under MAX_FILE_BYTES raw; then, read with node:sqlite: application_id,
//   user_version, integrity_check, foreign_key_check, every table and column of
//   scripts/consortium-schema.mjs, meta (schema, format, release, climates, built_at), each table's
//   row count against meta and the manifest, every plant placed and every placement with a reason,
//   source and photo page urls http(s) only, invasive rows only in countries GRIIS checked; schemas 2 and 3:
//   meta.ranges_review "estimate_not_reviewed", meta.climate_grid_manifest_sha256 a sha256 equal to the
//   manifest's, a plant_climate_status row for every plant and range rows only beside a range_source.
// - try_references.tsv and source_credits.tsv: listed, their sha256 and rows those of the manifest
//   entry, and parsed as the site's build parses them.
//
// What it writes:
// - <out>/ (default public/data/consortium/): each database byte for byte under its own name (the
//   name changes with the content, so public/_headers caches it forever), images/<uuid>.<digest>.<ext>
//   and the INSTALLED_BY mark. Nothing else: no manifest, no sums (the index holds the digests).
// - The index, src/data/consortium-index.json (design check A4): release id, the database files with
//   their sha256, climates, the canonical names placed in each climate, {plant uuid: photo path}, and
//   (schemas 2 and 3) climate_grid_manifest_sha256 and ranges_review from the database's meta: the climate
//   tiles' installer (install-climate.mjs) and scripts/check-built-site.mjs compare the installed grid with it.
//   Build-time readers (guide presets, the page, scripts/check-built-site.mjs) read it; nothing at
//   build time reads SQLite. An install outside the site (--out, --fixture) writes it inside <out>.
// - On a real install, src/data/: try_references.tsv byte for byte with try_references.meta.json,
//   and source_credits.tsv byte for byte.
// Photos: each plant_images url (http or https) is downloaded once per plant, one at a time with a
// half-second pause (rate limiting waited out), Wikimedia Commons and iNaturalist originals as 500 px
// copies. A photo that fails is left out of the index (no photo) and listed; more than 10% failing
// stops the install. The database keeps its remote urls: the page uses the index's local path only.
// The output is replaced as a whole: staged (see STAGING_DIR), then renamed into place, with the
// src/data/ files. It must be absent, empty or a previous install (its INSTALLED_BY mark).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { parseTryReferences } from '../src/lib/try-references.js';
import { CREDIT_FILE, parseSourceCredits } from '../src/lib/source-credits.js';
import { DDL, DATA_TABLES } from './consortium-schema.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_OUT = join(ROOT, 'public', 'data', 'consortium');
export const DATA_DIR = join(ROOT, 'src', 'data');
// Kept for the TRY list's readers (scripts/try-references.test.mjs).
export const TRY_LIST_DIR = DATA_DIR;
export const INDEX_FILE = 'consortium-index.json';
export const INDEX_PATH = join(DATA_DIR, INDEX_FILE);
// Where an install writes src/data/: only a real one into the site.
export const dataDirFor = (out, fixture) => (!fixture && resolve(out) === DEFAULT_OUT ? DATA_DIR : null);
export const PUBLIC_BASE = '/data/consortium/';
export const IMAGE_BASE = `${PUBLIC_BASE}images/`;
// canopi-data beside this checkout; CANOPI_DATA_DIR overrides it (a git worktree sits elsewhere).
export const CANOPI_DATA_DIR = process.env.CANOPI_DATA_DIR ? resolve(process.env.CANOPI_DATA_DIR) : resolve(ROOT, '..', 'canopi-data');
// About 5 s, more when uv first has to sync the environment.
const RELEASE_VERIFY_TIMEOUT_MS = 300_000;
// Where an install is written before it is renamed into place: outside public/ and git-ignored.
export const STAGING_DIR = join(ROOT, '.cache', 'consortium-install');
export function stagingDirFor(out) {
  const rel = relative(ROOT, resolve(out));
  return rel && !rel.startsWith('..') && !isAbsolute(rel) ? STAGING_DIR : join(dirname(resolve(out)), '.consortium-install');
}
// Commons serves only its standard thumbnail widths (https://w.wiki/GHai: 250, 330, 500, 960, 1280…).
export const THUMB_WIDTH = 500;
export const USER_AGENT = 'CanopiWebsite/1.0 (https://projectcanopi.com; contact form)';
export const MAX_FAILED_SHARE = 0.1;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // a larger file (a full-size original) counts as failed
// Design check §8: a database file is at most 1 MB gzipped (the phone budget), and every file the
// site serves stays under Cloudflare's 25 MiB per static asset (the raw database included, which the
// browser holds whole).
export const MAX_GZIP_BYTES = 1_000_000;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const FORMAT_VERSION = 4;
export const SCHEMA_VERSION = 3;
// The only review state schemas 2 and 3 allow (plant_climate.review CHECK): the site words ranges as estimates.
export const RANGES_REVIEW = 'estimate_not_reviewed';
export const APPLICATION_ID = 0x43434f4e; // "CCON"
const ZERO_SHA = '0'.repeat(64);
const TRY_LIST_FILE = 'try_references.tsv';
const TRY_LIST_META = 'try_references.meta.json';
export const RELEASE_ID = /^r-[0-9a-f]{16}$/;
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const HEX64 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const CLIMATE_ZONES = ['Tropical', 'Subtropical', 'Arid', 'Mediterranean', 'Temperate', 'Continental', 'Boreal'];
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

// The contract's database name: consortium-v<schema>.<release>.<12 hex of the raw sha256>.sqlite.gz,
// with the climate (lowercase) before the digest in a split export.
export const databaseName = (release, rawSha, climate = null) => `consortium-v${SCHEMA_VERSION}.${release}.${climate ? `${climate.toLowerCase()}.` : ''}${rawSha.slice(0, 12)}.sqlite.gz`;

export const isHttpUrl = (value) => {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};

// A smaller copy of a photo, or null when the host has none: a Wikimedia Commons original becomes
// its thumbnail (SVG thumbnails are PNG and TIFF ones JPEG, so those get the extra suffix Commons
// gives them), an iNaturalist open-data original its 500 px "medium" size (same extension).
export function thumbnailUrl(url, width = THUMB_WIDTH) {
  const inat = /^https?:\/\/inaturalist-open-data\.s3\.amazonaws\.com\/photos\/(\d+)\/original\.([A-Za-z]+)$/.exec(url);
  if (inat) return `https://inaturalist-open-data.s3.amazonaws.com/photos/${inat[1]}/medium.${inat[2]}`;
  const m = /^https?:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/(\1[0-9a-f])\/([^/?#]+)$/.exec(url);
  if (!m) return null;
  const [, h, hh, file] = m;
  const ext = file.split('.').pop().toLowerCase();
  const suffix = ext === 'svg' ? '.png' : ext === 'tif' || ext === 'tiff' ? '.jpg' : '';
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h}/${hh}/${file}/${width}px-${file}${suffix}`;
}

// Written into every install, so --out replaces only a directory this script made. The text is
// the one format 3 installs wrote, so the v1 install is replaced in place.
const INSTALL_MARK = 'INSTALLED_BY';
const INSTALL_MARK_TEXT = 'scripts/install-consortium.mjs (canopi-website)\n';

// Paths compared where they lead (symlinks, case on macOS), a path as far as it exists.
const real = (p) => { let tail = ''; while (!existsSync(p)) { tail = join(basename(p), tail); p = dirname(p); } return join(realpathSync.native(p), tail).replace(/[\\/]$/, ''); };
const inside = (a, b) => a === b || a.startsWith(b + sep);

function refuse(message) {
  throw new Error(`Consortium export refused: ${message}`);
}

// An --out that is absent, empty or a previous install; anything else is refused before any work.
function checkOut(out, exportDir) {
  const ro = real(out), re = real(exportDir);
  if (inside(ro, re) || inside(re, ro)) refuse(`${out} is, holds or sits inside the export directory ${exportDir}.`);
  if (!existsSync(out)) return;
  if (!statSync(out).isDirectory()) refuse(`${out} is a file, not an install directory.`);
  if (!readdirSync(out).length) return;
  let mark = null;
  try { mark = readFileSync(join(out, INSTALL_MARK), 'utf8'); } catch { /* none or unreadable */ }
  if (mark !== INSTALL_MARK_TEXT) refuse(`${out} is not empty and holds no consortium install (no ${INSTALL_MARK} file from this script), so it is not replaced.`);
}

// What `canopi release verify` says of an export: null when it may install (exit 0), else the reason.
// `dir` must be the original directory, absolute, as the command runs from the canopi-data root.
export function releaseVerifyProblem(dir, { root = CANOPI_DATA_DIR, env = process.env, log = console.log } = {}) {
  const command = 'uv run canopi release verify';
  if (!existsSync(root)) return `canopi-data was not found at ${root}, so \`${command}\` cannot say whether this export may ship.`;
  const run = spawnSync('uv', ['run', 'canopi', 'release', 'verify', dir], { cwd: root, env, encoding: 'utf8', timeout: RELEASE_VERIFY_TIMEOUT_MS });
  const said = [run.stdout, run.stderr].map((text) => text?.trim()).filter(Boolean).join('\n');
  if (run.error && run.status === null && !run.signal) return `could not run \`${command}\` in ${root}: ${run.error.message}.`;
  if (run.status === 0) { if (said) log(said); return null; }
  const how = run.status === null ? `\`${command}\` was stopped by ${run.signal}` : `\`${command}\` exited ${run.status}`;
  return said ? `${how}:\n${said}` : `${how}, saying nothing.`;
}

// SHA256SUMS lines as a Map name -> sha256; `fail` gets the problem.
function parseSums(text, fail) {
  const sums = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
    if (!m || !SAFE_NAME.test(m[2])) fail(`SHA256SUMS has a malformed line: ${line}`);
    sums.set(m[2], m[1]);
  }
  return sums;
}

function readSums(dir) {
  const path = join(dir, 'SHA256SUMS');
  if (!existsSync(path)) refuse('SHA256SUMS is missing.');
  const sums = parseSums(readFileSync(path, 'utf8'), refuse);
  for (const [name, hash] of sums) {
    const file = join(dir, name);
    if (!existsSync(file)) refuse(`${name} is listed in SHA256SUMS but missing.`);
    if (sha256(readFileSync(file)) !== hash) refuse(`${name} does not match its SHA256SUMS checksum.`);
  }
  const unlisted = readdirSync(dir).filter((f) => f !== 'SHA256SUMS' && !sums.has(f));
  if (unlisted.length) refuse(`unlisted files: ${unlisted.join(', ')}.`);
  if (!sums.has('manifest.json')) refuse('SHA256SUMS does not list manifest.json.');
  return sums;
}

// The TRY list's bytes against { sha256, rows, dataset_ids } (a manifest entry or the meta file): the
// first problem as a sentence, or null. It parses as the site's build does, so what installs builds.
export function tryListProblem(bytes, { sha256: hash, rows, dataset_ids }) {
  if (sha256(bytes) !== hash) return `${TRY_LIST_FILE} does not match the manifest's sha256.`;
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return `${TRY_LIST_FILE} is not UTF-8.`;
  }
  try {
    parseTryReferences(text, { rows, dataset_ids }, TRY_LIST_FILE);
  } catch (err) {
    return err.message;
  }
  return null;
}

// The source credits' bytes against their manifest entry: the first problem as a sentence, or null.
export function creditsProblem(bytes, { sha256: hash, rows }) {
  if (sha256(bytes) !== hash) return `${CREDIT_FILE} does not match the manifest's sha256.`;
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return `${CREDIT_FILE} is not UTF-8.`;
  }
  let parsed;
  try {
    parsed = parseSourceCredits(text, CREDIT_FILE);
  } catch (err) {
    return err.message;
  }
  if (rows !== undefined && parsed.length !== rows) return `${CREDIT_FILE} has ${parsed.length} rows, the manifest says ${rows}.`;
  return null;
}

// The manifest's shape, by hand (no dependency): the first problem as a sentence, or null.
export function manifestProblem(m, { fixture = false } = {}) {
  if (!isObject(m)) return 'manifest.json is not an object.';
  if (m.format_version !== FORMAT_VERSION) return `manifest.json format_version is ${JSON.stringify(m.format_version)}; this installer reads format ${FORMAT_VERSION} only (format 3 was the v1 tool's).`;
  if (m.schema_version !== SCHEMA_VERSION) return `manifest.json schema_version is ${JSON.stringify(m.schema_version)}; this installer reads schema ${SCHEMA_VERSION} only.`;
  if (typeof m.release_id !== 'string' || !RELEASE_ID.test(m.release_id)) return `manifest.json release_id ${JSON.stringify(m.release_id)} is not r- and 16 lowercase hex digits.`;
  if (typeof m.canopi_db_sha256 !== 'string' || !HEX64.test(m.canopi_db_sha256)) return 'manifest.json canopi_db_sha256 is not a sha256.';
  if (m.canopi_db_sha256 === ZERO_SHA && !fixture) return 'canopi_db_sha256 is all zeros: this is the invented fixture, never installed for real (tests pass --fixture).';
  if (typeof m.generated_at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(m.generated_at)) return 'manifest.json generated_at is not YYYY-MM-DDTHH:MM:SSZ.';
  if (typeof m.split !== 'boolean') return 'manifest.json split is not a boolean.';
  if (!Array.isArray(m.files) || !m.files.length) return 'manifest.json lists no database file.';
  // The page opens files[0] and expects every climate in it: a split export would leave it on the
  // Reload screen, so it is refused until the page reads one file per climate.
  if (m.split) return 'manifest.json split is true: the page reads one database file only, so a split export is refused until it reads one per climate.';
  if (!m.split && m.files.length !== 1) return `manifest.json split is false but lists ${m.files.length} files.`;
  if (!Array.isArray(m.climates) || !m.climates.length) return 'manifest.json lists no climate.';
  const zones = [];
  for (const c of m.climates) {
    if (!isObject(c) || !CLIMATE_ZONES.includes(c.climate_zone)) return `manifest.json climates: ${JSON.stringify(c?.climate_zone)} is not a climate zone.`;
    if (zones.includes(c.climate_zone)) return `manifest.json lists ${c.climate_zone} twice.`;
    zones.push(c.climate_zone);
  }
  if (zones.join() !== [...zones].sort((a, b) => CLIMATE_ZONES.indexOf(a) - CLIMATE_ZONES.indexOf(b)).join()) return 'manifest.json climates are not in climate order.';
  const held = [];
  for (const f of m.files) {
    if (!isObject(f) || typeof f.file !== 'string' || !SAFE_NAME.test(f.file)) return `manifest.json files: ${JSON.stringify(f?.file)} is not a safe file name.`;
    for (const key of ['sha256', 'raw_sha256']) if (typeof f[key] !== 'string' || !HEX64.test(f[key])) return `${f.file}: ${key} is not a sha256.`;
    for (const key of ['bytes', 'raw_bytes']) if (!Number.isInteger(f[key]) || f[key] <= 0) return `${f.file}: ${key} is not a positive integer.`;
    if (!Array.isArray(f.climate_zones) || !f.climate_zones.length || f.climate_zones.some((z) => !zones.includes(z))) return `${f.file}: climate_zones ${JSON.stringify(f.climate_zones)} are not climates of the manifest.`;
    if (!isObject(f.counts)) return `${f.file}: counts is not an object.`;
    held.push(...f.climate_zones);
  }
  if ([...held].sort().join() !== [...zones].sort().join()) return `the files hold ${held.join(', ')}, the manifest's climates are ${zones.join(', ')}.`;
  const t = m.try_references;
  if (!isObject(t) || t.file !== TRY_LIST_FILE || typeof t.sha256 !== 'string' || !HEX64.test(t.sha256) || !Number.isInteger(t.rows) || t.rows < 1 || !Number.isInteger(t.dataset_ids) || t.dataset_ids < 1) return `manifest.json try_references is not { file: "${TRY_LIST_FILE}", sha256, rows, dataset_ids }.`;
  const s = m.source_credits;
  if (!isObject(s) || s.file !== CREDIT_FILE || typeof s.sha256 !== 'string' || !HEX64.test(s.sha256) || (s.rows !== undefined && (!Number.isInteger(s.rows) || s.rows < 1))) return `manifest.json source_credits is not { file: "${CREDIT_FILE}", sha256, rows }.`;
  const r = m.climate_ranges;
  if (!isObject(r) || typeof r.climate_grid_manifest_sha256 !== 'string' || !HEX64.test(r.climate_grid_manifest_sha256)) return 'manifest.json climate_ranges is not { climate_grid_manifest_sha256, … } (schema 2 names the grid its ranges were sampled from).';
  return null;
}

// The expected schema: each table's column names, from scripts/consortium-schema.mjs.
let expectedColumns = null;
async function schemaColumns() {
  if (expectedColumns) return expectedColumns;
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec(DDL);
  expectedColumns = columnsOf(db);
  db.close();
  return expectedColumns;
}
const columnsOf = (db) => new Map(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all()
  .map(({ name }) => [name, db.prepare(`SELECT name FROM pragma_table_info(?)`).all(name).map((c) => c.name).join(',')]));

// One database, already gunzipped and written at `path`: the first problem as a sentence, or the
// facts the index needs ({ climates, names, images, griis }).
export async function readDatabase(path, entry, manifest) {
  const { DatabaseSync } = await import('node:sqlite');
  const want = await schemaColumns();
  let db;
  try {
    db = new DatabaseSync(path, { readOnly: true });
  } catch (err) {
    return { problem: `${entry.file} does not open as SQLite (${err.message}).` };
  }
  try {
    const one = (sql, ...args) => db.prepare(sql).get(...args);
    const all = (sql, ...args) => db.prepare(sql).all(...args);
    let appId;
    try { appId = one('PRAGMA application_id').application_id; } catch (err) { return { problem: `${entry.file} is not a SQLite database (${err.message}).` }; }
    if (appId !== APPLICATION_ID) return { problem: `${entry.file}: application_id is ${appId}, not ${APPLICATION_ID} ("CCON").` };
    const uv = one('PRAGMA user_version').user_version;
    if (uv !== SCHEMA_VERSION) return { problem: `${entry.file}: user_version is ${uv}, not schema ${SCHEMA_VERSION}.` };
    const integrity = all('PRAGMA integrity_check').map((r) => r.integrity_check);
    if (integrity.join() !== 'ok') return { problem: `${entry.file}: integrity_check says ${integrity.slice(0, 3).join('; ')}.` };
    const fk = all('PRAGMA foreign_key_check');
    if (fk.length) return { problem: `${entry.file}: foreign_key_check finds ${fk.length} rows, first in ${fk[0].table}.` };
    const have = columnsOf(db);
    for (const [table, cols] of want) {
      if (!have.has(table)) return { problem: `${entry.file}: table ${table} is missing.` };
      if (have.get(table) !== cols) return { problem: `${entry.file}: table ${table} has the columns ${have.get(table)}, the schema says ${cols}.` };
    }
    const extra = [...have.keys()].filter((t) => !want.has(t));
    if (extra.length) return { problem: `${entry.file}: tables outside the schema: ${extra.join(', ')}.` };
    const meta = Object.fromEntries(all('SELECT key, value FROM meta').map((r) => [r.key, r.value]));
    if (meta.schema_version !== String(SCHEMA_VERSION)) return { problem: `${entry.file}: meta.schema_version is ${JSON.stringify(meta.schema_version)}.` };
    if (meta.format_version !== String(FORMAT_VERSION)) return { problem: `${entry.file}: meta.format_version is ${JSON.stringify(meta.format_version)}.` };
    if (meta.release_id !== manifest.release_id) return { problem: `${entry.file}: meta.release_id is ${JSON.stringify(meta.release_id)}, the manifest says ${manifest.release_id}.` };
    if (meta.built_at !== manifest.generated_at) return { problem: `${entry.file}: meta.built_at is ${JSON.stringify(meta.built_at)}, the manifest says ${manifest.generated_at}.` };
    if (meta.climates !== entry.climate_zones.join(',')) return { problem: `${entry.file}: meta.climates is ${JSON.stringify(meta.climates)}, the manifest says ${entry.climate_zones.join(',')}.` };
    // Schema 2 and 3: the ranges' review state and the grid they were sampled from (an empty value is missing).
    if (meta.ranges_review !== RANGES_REVIEW) return { problem: `${entry.file}: meta.ranges_review is ${JSON.stringify(meta.ranges_review)}; this installer reads "${RANGES_REVIEW}" ranges only.` };
    const grid = meta.climate_grid_manifest_sha256 || undefined;
    if (typeof grid !== 'string' || !HEX64.test(grid)) return { problem: `${entry.file}: meta.climate_grid_manifest_sha256 is ${JSON.stringify(grid)}, not a sha256.` };
    if (grid !== manifest.climate_ranges.climate_grid_manifest_sha256) return { problem: `${entry.file}: meta.climate_grid_manifest_sha256 is ${JSON.stringify(grid)}, the manifest says ${JSON.stringify(manifest.climate_ranges.climate_grid_manifest_sha256)}.` };
    const climates = all('SELECT id FROM climates ORDER BY ord').map((r) => r.id);
    if (climates.join() !== entry.climate_zones.join()) return { problem: `${entry.file}: holds the climates ${climates.join(', ')}, the manifest says ${entry.climate_zones.join(', ')}.` };
    for (const table of DATA_TABLES) {
      const n = one(`SELECT count(*) n FROM ${table}`).n;
      if (String(n) !== meta[`count.${table}`]) return { problem: `${entry.file}: ${table} has ${n} rows, meta says ${meta[`count.${table}`]}.` };
      if (n !== entry.counts[table]) return { problem: `${entry.file}: ${table} has ${n} rows, the manifest says ${entry.counts[table]}.` };
    }
    const unplaced = one('SELECT count(*) n FROM plants WHERE plant NOT IN (SELECT plant FROM placements)').n;
    if (unplaced) return { problem: `${entry.file}: ${unplaced} plants have no placement.` };
    const reasonless = one('SELECT count(*) n FROM placements x WHERE NOT EXISTS (SELECT 1 FROM placement_reasons r WHERE r.plant = x.plant AND r.climate_zone = x.climate_zone)').n;
    if (reasonless) return { problem: `${entry.file}: ${reasonless} placements have no reason.` };
    const statusless = one('SELECT count(*) n FROM plants WHERE plant NOT IN (SELECT plant FROM plant_climate_status)').n;
    if (statusless) return { problem: `${entry.file}: ${statusless} plants have no plant_climate_status row.` };
    const sourceless = one(`SELECT p.canonical_name name FROM plant_climate_status s JOIN plants p USING (plant) WHERE s.range_source IS NULL
      AND (EXISTS (SELECT 1 FROM plant_climate c WHERE c.plant = s.plant) OR EXISTS (SELECT 1 FROM plant_koppen k WHERE k.plant = s.plant))`);
    if (sourceless) return { problem: `${entry.file}: ${sourceless.name} has climate range rows but no range_source.` };
    const badIds = all('SELECT id FROM plants').filter((r) => !UUID.test(r.id));
    if (badIds.length) return { problem: `${entry.file}: plant id ${JSON.stringify(badIds[0].id)} is not a UUID.` };
    // prepush m1: the page links these, so only http(s) (the page's safeHref is the second wall).
    for (const r of all('SELECT id, url FROM sources WHERE url IS NOT NULL')) if (!isHttpUrl(r.url)) return { problem: `${entry.file}: source ${r.id} has the url ${JSON.stringify(r.url)}, not http(s).` };
    for (const r of all('SELECT p.canonical_name, i.source_page_url u FROM plant_images i JOIN plants p USING (plant) WHERE i.source_page_url IS NOT NULL')) if (!isHttpUrl(r.u)) return { problem: `${entry.file}: ${r.canonical_name}'s photo page ${JSON.stringify(r.u)} is not http(s).` };
    // The page's "not checked, never none" rests on it.
    const unchecked = one('SELECT p.canonical_name name, v.country FROM plant_invasive v JOIN plants p USING (plant) JOIN countries c ON c.code = v.country WHERE c.invasive_checked = 0');
    if (unchecked) return { problem: `${entry.file}: ${unchecked.name} is invasive in ${unchecked.country}, a country GRIIS did not check.` };
    const names = Object.fromEntries(climates.map((c) => [c, all('SELECT p.canonical_name n FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = ? ORDER BY p.canonical_name', c).map((r) => r.n)]));
    const images = all('SELECT p.id, p.canonical_name name, i.url FROM plant_images i JOIN plants p USING (plant) ORDER BY p.id');
    return { climates, names, images, griis: meta.griis_available === '1', grid, rangesReview: meta.ranges_review };
  } finally {
    db.close();
  }
}

// Reads and checks a whole export directory (the databases read from a scratch copy in `work`).
export async function verifyExport(dir, { fixture = false, work }) {
  const sums = readSums(dir);
  let manifest;
  try { manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')); } catch (err) { refuse(`manifest.json is not valid JSON (${err.message}).`); }
  const problem = manifestProblem(manifest, { fixture });
  if (problem) refuse(problem);
  const tryEntry = manifest.try_references;
  if (!sums.has(tryEntry.file)) refuse(`${tryEntry.file} is not listed in SHA256SUMS.`);
  const tryBytes = readFileSync(join(dir, tryEntry.file));
  const tryProblem = tryListProblem(tryBytes, tryEntry);
  if (tryProblem) refuse(tryProblem);
  const creditEntry = manifest.source_credits;
  if (!sums.has(creditEntry.file)) refuse(`${creditEntry.file} is not listed in SHA256SUMS.`);
  const creditBytes = readFileSync(join(dir, creditEntry.file));
  const creditProblem = creditsProblem(creditBytes, creditEntry);
  if (creditProblem) refuse(creditProblem);

  const databases = [];
  const facts = { names: {}, images: new Map(), griis: true, grid: null, rangesReview: null };
  for (const entry of manifest.files) {
    if (!sums.has(entry.file)) refuse(`${entry.file} is not listed in SHA256SUMS.`);
    const gz = readFileSync(join(dir, entry.file));
    if (sha256(gz) !== entry.sha256 || sums.get(entry.file) !== entry.sha256) refuse(`${entry.file} does not match the manifest's sha256.`);
    if (gz.length !== entry.bytes) refuse(`${entry.file} is ${gz.length} bytes, the manifest says ${entry.bytes}.`);
    if (gz[0] !== 0x1f || gz[1] !== 0x8b) refuse(`${entry.file} is not gzip (no 1f 8b magic).`);
    if (gz.length > MAX_GZIP_BYTES) refuse(`${entry.file} is ${gz.length} bytes gzipped, over the ${MAX_GZIP_BYTES} the page's budget allows (design check §8).`);
    let raw;
    try { raw = gunzipSync(gz, { maxOutputLength: MAX_FILE_BYTES + 1 }); } catch (err) { refuse(`${entry.file} does not gunzip (${err.code ?? err.message}).`); }
    if (raw.length > MAX_FILE_BYTES) refuse(`${entry.file} is over 25 MiB uncompressed.`);
    if (sha256(raw) !== entry.raw_sha256 || raw.length !== entry.raw_bytes) refuse(`${entry.file}: the database inside does not match the manifest's raw_sha256 and raw_bytes.`);
    const expected = databaseName(manifest.release_id, entry.raw_sha256, manifest.split ? entry.climate_zones[0] : null);
    if (entry.file !== expected) refuse(`${entry.file} is not named ${expected} (schema, release and digest of its content).`);
    const path = join(work, `check-${databases.length}.sqlite`);
    writeFileSync(path, raw);
    const read = await readDatabase(path, entry, manifest);
    rmSync(path, { force: true });
    if (read.problem) refuse(read.problem);
    Object.assign(facts.names, read.names);
    for (const img of read.images) if (!facts.images.has(img.id)) facts.images.set(img.id, img);
    facts.griis &&= read.griis;
    facts.grid = read.grid;
    facts.rangesReview = read.rangesReview;
    databases.push({ entry, gz });
  }
  for (const c of manifest.climates) {
    if ((facts.names[c.climate_zone] ?? []).length !== c.plants) refuse(`${c.climate_zone} has ${(facts.names[c.climate_zone] ?? []).length} plants, the manifest says ${c.plants}.`);
  }
  return { manifest, databases, facts, tryList: { entry: tryEntry, bytes: tryBytes }, credits: { entry: creditEntry, bytes: creditBytes } };
}

// The index the site reads at build time (design check A4). Plain data, stable key order.
export function buildIndex(manifest, facts, photos) {
  return {
    format_version: manifest.format_version,
    schema_version: manifest.schema_version,
    release_id: manifest.release_id,
    generated_at: manifest.generated_at,
    canopi_db_sha256: manifest.canopi_db_sha256,
    files: manifest.files.map((f) => ({ file: f.file, url: `${PUBLIC_BASE}${f.file}`, climate_zones: f.climate_zones, sha256: f.sha256, bytes: f.bytes, raw_sha256: f.raw_sha256, raw_bytes: f.raw_bytes })),
    climates: manifest.climates.map((c) => c.climate_zone),
    griis_available: facts.griis,
    names: Object.fromEntries(manifest.climates.map((c) => [c.climate_zone, facts.names[c.climate_zone]])),
    images: Object.fromEntries([...photos].sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, file]) => [id, `${IMAGE_BASE}${file.name}`])),
    try_references: { sha256: manifest.try_references.sha256, rows: manifest.try_references.rows, dataset_ids: manifest.try_references.dataset_ids },
    source_credits: { sha256: manifest.source_credits.sha256, ...(manifest.source_credits.rows !== undefined ? { rows: manifest.source_credits.rows } : {}) },
    climate_grid_manifest_sha256: facts.grid,
    ranges_review: facts.rangesReview,
  };
}

// The index's shape, as the build and the built-site check rely on it: the first problem, or null.
export function indexProblem(index) {
  if (!isObject(index)) return 'the index is not an object.';
  if (index.format_version !== FORMAT_VERSION || index.schema_version !== SCHEMA_VERSION) return `the index is format ${index.format_version}, schema ${index.schema_version}.`;
  if (typeof index.release_id !== 'string' || !RELEASE_ID.test(index.release_id)) return `the index release_id ${JSON.stringify(index.release_id)} is not r- and 16 hex digits.`;
  if (!Array.isArray(index.files) || !index.files.length) return 'the index lists no database file.';
  for (const f of index.files) {
    if (typeof f.file !== 'string' || !SAFE_NAME.test(f.file) || f.url !== `${PUBLIC_BASE}${f.file}`) return `the index file ${JSON.stringify(f.file)} is not a safe name under ${PUBLIC_BASE}.`;
    if (!HEX64.test(f.sha256 ?? '')) return `the index file ${f.file} has no sha256.`;
  }
  if (!Array.isArray(index.climates) || !index.climates.length || index.climates.some((c) => !CLIMATE_ZONES.includes(c))) return 'the index climates are not climate zones.';
  for (const c of index.climates) if (!Array.isArray(index.names?.[c]) || !index.names[c].length) return `the index has no names for ${c}.`;
  if (!isObject(index.images)) return 'the index images is not an object.';
  if (typeof index.climate_grid_manifest_sha256 !== 'string' || !HEX64.test(index.climate_grid_manifest_sha256)) return `the index climate_grid_manifest_sha256 ${JSON.stringify(index.climate_grid_manifest_sha256)} is not a sha256 (schema 2 names the grid of its ranges).`;
  for (const [id, path] of Object.entries(index.images)) {
    if (!UUID.test(id)) return `the index image key ${JSON.stringify(id)} is not a plant UUID.`;
    if (typeof path !== 'string' || !path.startsWith(IMAGE_BASE) || !SAFE_NAME.test(path.slice(IMAGE_BASE.length))) return `the index image ${JSON.stringify(path)} is not a local ${IMAGE_BASE} file.`;
  }
  return null;
}

// Checks an installed directory as the site serves it (scripts/check-built-site.mjs runs it on
// dist/client/data/consortium/, the tests on public/data/consortium/) against its index: the mark,
// each database byte for byte by its sha256, the gzip magic and size limits, every photo of the index
// present, and nothing else in the directory. Throws on the first problem; returns the counts.
export function verifyInstall(dir, index) {
  const broken = (message) => { throw new Error(`Consortium install broken (${dir}): ${message}`); };
  const problem = indexProblem(index);
  if (problem) broken(problem);
  if (!existsSync(join(dir, INSTALL_MARK))) broken(`${INSTALL_MARK} is missing.`);
  const allowed = new Set([INSTALL_MARK, 'images', INDEX_FILE, ...index.files.map((f) => f.file)]);
  const stray = readdirSync(dir).filter((n) => !allowed.has(n));
  if (stray.length) broken(`files the index does not name: ${stray.join(', ')}.`);
  for (const f of index.files) {
    let gz;
    try { gz = readFileSync(join(dir, f.file)); } catch { broken(`${f.file} is missing.`); }
    if (sha256(gz) !== f.sha256) broken(`${f.file} does not match the index's sha256.`);
    if (gz[0] !== 0x1f || gz[1] !== 0x8b) broken(`${f.file} is not gzip.`);
    if (gz.length > MAX_GZIP_BYTES) broken(`${f.file} is over ${MAX_GZIP_BYTES} bytes.`);
  }
  const wanted = new Set(Object.values(index.images).map((p) => p.slice(IMAGE_BASE.length)));
  const present = existsSync(join(dir, 'images')) ? readdirSync(join(dir, 'images')) : [];
  for (const name of wanted) if (!present.includes(name)) broken(`images/${name} is missing.`);
  const extra = present.filter((n) => !wanted.has(n));
  if (extra.length) broken(`images the index does not name: ${extra.slice(0, 5).join(', ')}.`);
  for (const name of present) if (statSync(join(dir, 'images', name)).size > MAX_FILE_BYTES) broken(`images/${name} is over 25 MiB.`);
  return { databases: index.files.length, images: wanted.size };
}

// Hosts a photo may be fetched from after a redirect, besides the host first asked.
const PHOTO_HOSTS = ['upload.wikimedia.org', 'inaturalist-open-data.s3.amazonaws.com'];
const MAX_REDIRECTS = 5;

// Throws away a body we will not read, so its connection is freed before the next request.
const discard = async (res) => { try { await res.body?.cancel(); } catch { /* already closed */ } };

// One request, following redirects by hand: only to the same host or a photo host, at most
// MAX_REDIRECTS times. Returns the final response.
async function get(url, fetchImpl) {
  const first = new URL(url).host;
  let current = url;
  for (let hop = 0; ; hop++) {
    const res = await fetchImpl(current, { headers: { 'User-Agent': USER_AGENT }, redirect: 'manual', signal: AbortSignal.timeout(30_000) });
    if (res.status < 300 || res.status > 399 || !res.headers.get('location')) return res;
    await discard(res);
    const next = new URL(res.headers.get('location'), current);
    if (next.protocol !== 'https:' && next.protocol !== 'http:') throw new Error(`a redirect to ${next.protocol} for ${url}`);
    if (next.host !== first && !PHOTO_HOSTS.includes(next.host)) throw new Error(`a redirect to another host (${next.host}) for ${url}`);
    if (hop === MAX_REDIRECTS) throw new Error(`more than ${MAX_REDIRECTS} redirects for ${url}`);
    current = next.href;
  }
}

// A body read with a running byte cap: past MAX_IMAGE_BYTES the stream is cancelled and null is
// returned, so a full-size original never sits in memory.
async function readCapped(res) {
  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) { await discard(res); return null; }
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader(), chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) { await reader.cancel().catch(() => {}); return null; }
    chunks.push(value);
  }
  return Buffer.concat(chunks, size);
}

// One photo: the thumbnail first, then the original only when the thumbnail does not exist (400,
// 403 or 404). Rate limiting (429, 503) is waited out, up to RETRIES times: Retry-After when the
// server gives it, else backoffMs doubling. Returns { bytes, ext } or throws.
const RETRIES = 4;
async function download(url, { fetchImpl, delayMs, backoffMs }) {
  const thumb = thumbnailUrl(url);
  const tries = thumb ? [thumb, url] : [url];
  let last = null;
  for (const [n, candidate] of tries.entries()) {
    if (n) await sleep(delayMs);
    let res;
    for (let attempt = 0; ; attempt++) {
      res = await get(candidate, fetchImpl);
      if ((res.status !== 429 && res.status !== 503) || attempt === RETRIES) break;
      await discard(res);
      const after = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(after) && after > 0 ? Math.min(after, 120) * 1000 : backoffMs * 2 ** attempt);
    }
    if (!res.ok) {
      await discard(res);
      last = `HTTP ${res.status} for ${candidate}`;
      if (res.status === 400 || res.status === 403 || res.status === 404) continue; // no such thumbnail: try the original
      break;
    }
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const ext = IMAGE_TYPES[type];
    if (!ext) { await discard(res); last = `unsupported type "${type}" for ${candidate}`; break; }
    const bytes = await readCapped(res);
    if (!bytes?.length) { last = bytes ? `an empty body for ${candidate}` : `more than ${MAX_IMAGE_BYTES} bytes for ${candidate}`; break; }
    return { bytes, ext };
  }
  throw new Error(last ?? `no URL for ${url}`);
}

// Downloads every photo once per plant. A url that is not http(s) is never fetched (no photo).
// Returns { files: Map(uuid -> { name, bytes }), failed, total }.
async function fetchImages(images, { fetchImpl, delayMs, backoffMs, log, maxFailedShare }) {
  const wanted = [...images.values()].filter((img) => isHttpUrl(img.url));
  const files = new Map(), failed = [];
  for (const [i, { id, name, url }] of wanted.entries()) {
    if (i) await sleep(delayMs);
    try {
      const { bytes, ext } = await download(url, { fetchImpl, delayMs, backoffMs });
      // The digest in the name lets public/_headers cache the photo forever: new bytes, new url.
      files.set(id, { name: `${id}.${sha256(bytes).slice(0, 12)}.${ext}`, bytes });
    } catch (err) {
      failed.push({ id, name, url, error: err.message });
      log(`  no photo for ${name}: ${err.message}`);
    }
  }
  if (wanted.length && failed.length / wanted.length > maxFailedShare)
    refuse(`${failed.length} of ${wanted.length} photos failed (more than ${maxFailedShare * 100}%): ${failed.slice(0, 5).map((f) => f.name).join(', ')}…`);
  return { files, failed, total: wanted.length, skipped: images.size - wanted.length };
}

export async function installConsortium({ exportDir, outDir = DEFAULT_OUT, fixture = false, images = true, fetchImpl = globalThis.fetch, delayMs = 500, backoffMs = 5000, maxFailedShare = MAX_FAILED_SHARE, stagingDir = null, dataDir = null, releaseCheck = releaseVerifyProblem, siteDir = DEFAULT_OUT, log = console.log } = {}) {
  if (!exportDir) refuse('no export directory given.');
  if (!images && !fixture) refuse('--no-images is allowed only with --fixture: a real install copies its photos into the site.');
  const dir = resolve(exportDir), out = resolve(outDir);
  checkOut(out, dir);
  if (fixture && inside(real(out), real(resolve(siteDir)))) refuse(`--fixture is for tests and never installs into the site (${out}).`);
  // What a killed run left: the whole staging directory.
  const staging = resolve(stagingDir ?? stagingDirFor(out));
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  try {
    const { manifest, databases, facts, tryList, credits } = await verifyExport(dir, { fixture, work: staging });
    if (!fixture) {
      const problem = releaseCheck(dir, { log });
      if (problem) refuse(problem);
    }
    // dataDir stands in for src/data/ in tests; a fixture never writes there.
    const listDir = fixture ? null : dataDir ?? dataDirFor(out, fixture);
    const photos = images ? await fetchImages(facts.images, { fetchImpl, delayMs, backoffMs, log, maxFailedShare }) : { files: new Map(), failed: [], total: 0, skipped: 0 };
    const index = buildIndex(manifest, facts, photos.files);
    const indexBytes = Buffer.from(`${JSON.stringify(index, null, 2)}\n`);

    const written = new Map();
    for (const { entry, gz } of databases) written.set(entry.file, gz);
    written.set(INSTALL_MARK, Buffer.from(INSTALL_MARK_TEXT));
    for (const { name, bytes } of photos.files.values()) written.set(`images/${name}`, bytes);
    if (!listDir) written.set(INDEX_FILE, indexBytes);
    for (const [name, bytes] of written) if (bytes.length > MAX_FILE_BYTES) refuse(`${name} is over 25 MiB.`);

    const tmp = join(staging, `new-${process.pid}`), old = join(staging, `old-${process.pid}`);
    mkdirSync(dirname(out), { recursive: true });
    // The src/data/ files go in with the install, staged with it: git-ignored, swept by the next run.
    const listFiles = !listDir ? [] : [
      [INDEX_FILE, indexBytes],
      [TRY_LIST_FILE, tryList.bytes],
      [TRY_LIST_META, Buffer.from(`${JSON.stringify({ sha256: tryList.entry.sha256, rows: tryList.entry.rows, dataset_ids: tryList.entry.dataset_ids }, null, 2)}\n`)],
      [CREDIT_FILE, credits.bytes],
    ].map(([name, bytes]) => {
      const path = join(listDir, name);
      let previous = null;
      try { previous = readFileSync(path); } catch { /* none yet */ }
      return { path, staged: join(staging, `${name}-${process.pid}`), bytes, previous };
    });
    for (const [name, bytes] of written) {
      mkdirSync(dirname(join(tmp, name)), { recursive: true });
      writeFileSync(join(tmp, name), bytes);
    }
    for (const file of listFiles) writeFileSync(file.staged, file.bytes);
    const hadOut = existsSync(out);
    if (hadOut) renameSync(out, old);
    const moved = [];
    try {
      renameSync(tmp, out);
      for (const file of listFiles) { mkdirSync(dirname(file.path), { recursive: true }); renameSync(file.staged, file.path); moved.push(file); }
    } catch (err) {
      // Put back what was there: the src/data/ files already moved and the previous install.
      for (const file of moved) { if (file.previous) writeFileSync(file.path, file.previous); else rmSync(file.path, { force: true }); }
      rmSync(out, { recursive: true, force: true });
      if (hadOut) renameSync(old, out);
      throw err;
    }

    const summary = {
      out, index: listDir ? join(listDir, INDEX_FILE) : join(out, INDEX_FILE),
      files: databases.map((d) => d.entry.file),
      climates: index.climates.map((c) => ({ climate: c, plants: index.names[c].length })),
      photos: { total: photos.total, downloaded: photos.files.size, failed: photos.failed, skipped: photos.skipped },
    };
    log(`Installed the consortium database ${summary.files.join(', ')} (${summary.climates.map((c) => `${c.climate} ${c.plants}`).join(', ')}) in ${out}`);
    if (images) log(`Photos: ${photos.files.size} of ${photos.total} downloaded${photos.failed.length ? `; no photo for ${photos.failed.map((f) => f.name).join(', ')}` : ''}${photos.skipped ? `; ${photos.skipped} not http(s), left out` : ''}.`);
    else log('Photos: skipped (--no-images).');
    log(`Index: ${summary.index}.`);
    if (listDir) log(`TRY list (${tryList.entry.rows} rows, ${tryList.entry.dataset_ids} DatasetIDs) and ${CREDIT_FILE} written to ${listDir}.`);
    log(`Data release: ${manifest.release_id}.`);
    return summary;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

export function parseArgs(argv) {
  const opts = { fixture: false, images: true, outDir: DEFAULT_OUT, exportDir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fixture') opts.fixture = true;
    else if (a === '--no-images') opts.images = false;
    else if (a === '--out') opts.outDir = argv[++i] ?? refuse('--out needs a directory.');
    else if (a.startsWith('--')) refuse(`unknown option ${a}.`);
    else if (opts.exportDir) refuse(`one export directory only (got ${basename(a)} too).`);
    else opts.exportDir = a;
  }
  if (!opts.exportDir) refuse('usage: node scripts/install-consortium.mjs <export-dir> [--fixture [--no-images]] [--out <dir>]');
  if (!opts.images && !opts.fixture) refuse('--no-images is allowed only with --fixture: a real install copies its photos into the site.');
  return opts;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await installConsortium(parseArgs(process.argv.slice(2)));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
