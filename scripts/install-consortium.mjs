// Installs a canopi-data consortium export (format 2) into public/data/consortium/, where the
// consortium page fetches it as static JSON. Run by hand; the output is committed.
//
//   node scripts/install-consortium.mjs <export-dir> [--fixture] [--no-images] [--out <dir>]
//
// Checks, in order, and refuses on the first failure (nothing is written then):
// - SHA256SUMS: every listed file exists and matches; no .json in the directory is unlisted.
// - manifest.json: format_version 2, canopi_db_sha256 not all zeros (the invented fixture) unless
//   --fixture (tests only), each cell's file, sha256 and taxa/interactions counts.
// - each cell file: the required keys and types of canopi-data's consortium-export.schema.json,
//   checked by hand (no dependency); extra keys are allowed, as the format lets the export add
//   fields; taxon ids unique; every source id it cites defined in `sources`.
// Photos: each taxon's image.url (http or https) is downloaded once per taxon id, one at a time
// with a half-second pause (rate limiting waited out, see download()), into images/<id>.<ext>, and the installed cell points to
// /data/consortium/images/<id>.<ext>; credit, licence and source page stay as they are. Wikimedia
// Commons and iNaturalist originals are fetched as 500 px copies. A photo that fails becomes image: null (no
// photo) and is listed in the summary; more than 10% failing stops the install. Installed cells
// that changed get their sha256 recomputed in the installed manifest and SHA256SUMS. --no-images
// skips downloads and keeps the cells byte for byte (tests, offline runs).
// The output directory is replaced as a whole: written next to it, then renamed into place.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_OUT = join(ROOT, 'public', 'data', 'consortium');
export const IMAGE_BASE = '/data/consortium/images/';
// Commons serves only its standard thumbnail widths (https://w.wiki/GHai: 250, 330, 500, 960, 1280…);
// 640 answers HTTP 400, so the photos use 500, the nearest standard width below it.
export const THUMB_WIDTH = 500;
export const USER_AGENT = 'CanopiWebsite/1.0 (https://projectcanopi.com; contact form)';
export const MAX_FAILED_SHARE = 0.1;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // a larger file (a full-size original) counts as failed
const ZERO_SHA = '0'.repeat(64);
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A smaller copy of a photo, or null when the host has none: a Wikimedia Commons original becomes
// its thumbnail (500 px wide by default; SVG thumbnails are PNG and TIFF ones JPEG, so those get the
// extra suffix Commons gives them), an iNaturalist open-data original its 500 px "medium" size
// (same extension).
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

// Shapes from the schema's required lists. A key marked optional may be absent (the schema does
// not require it); null passes only where the schema allows it.
const t = (kind) => ({ kind });
const str = t('string'), num = t('number'), int = t('integer'), bool = t('boolean');
const orNull = (s) => ({ ...s, nullable: true });
const optional = (s) => ({ ...s, optional: true });
const oneOf = (...values) => ({ kind: 'enum', values });
const obj = (props) => ({ kind: 'object', props });
const arr = (items, minItems = 0) => ({ kind: 'array', items, minItems });
const map = (values) => ({ kind: 'map', values });
const text = { kind: 'map', values: str, props: { en: str } };
const range = orNull(obj({ min: orNull(num), max: orNull(num) }));
const sourceIds = arr(str, 1);
const climateZone = oneOf('Tropical', 'Subtropical', 'Arid', 'Mediterranean', 'Temperate', 'Continental', 'Boreal');
const region = oneOf('europe', 'africa', 'asia_temperate', 'asia_tropical', 'australasia', 'pacific', 'northern_america', 'southern_america');
const phase = oneOf('placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax');
const taxonRef = obj({ name: str, rank: oneOf('species', 'genus', 'family') });

const traits = obj({
  height_m: range, width_max_m: orNull(num), sun: orNull(bool), semi_shade: orNull(bool), full_shade: orNull(bool),
  hardiness_zone: range, frost_tender: orNull(bool), soil_ph: range, well_drained: orNull(bool),
  moisture_use: orNull(str), drought_tolerance: orNull(str), fertility_requirement: orNull(str),
  deciduous_evergreen: orNull(str), active_growth_period: orNull(str), bloom_period: orNull(str),
  harvest_period: orNull(str), lifespan: orNull(str), growth_rate: orNull(str), age_of_maturity_years: orNull(num),
  root_depth_min_cm: orNull(num), taproot_persistent: orNull(bool), root_system_type: orNull(str),
  mycorrhizal_type: orNull(str), nitrogen_fixer: orNull(bool), edibility_rating: orNull(int), self_fertile: orNull(bool),
  sexual_system: orNull(str), pollinators: orNull(arr(str)), vegetative_spread_rate: orNull(str),
  clonal_growth_form: orNull(str), is_annual: orNull(bool), is_perennial: orNull(bool), habit: orNull(str),
});

const taxon = obj({
  id: { kind: 'string', pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/ },
  canonical_name: str, genus: str, family: str,
  names: map(str),
  image: orNull(obj({ url: str, credit: orNull(str), licence: orNull(str), source_page_url: orNull(str) })),
  role: oneOf('crop', 'support'),
  reason: optional(orNull(text)),
  stratum: orNull(obj({ value: oneOf('emergent', 'high', 'medium', 'low'), sources: sourceIds })),
  phases: orNull(obj({ start: phase, end: phase, sources: sourceIds })),
  functions: orNull(arr(obj({
    function: oneOf('nitrogen_fixer', 'dynamic_accumulator', 'mulch', 'ground_cover', 'insectary', 'pest_repellent', 'trap_crop', 'pollinator_forage', 'windbreak', 'wildlife_habitat'),
    method: oneOf('import', 'rule', 'extraction', 'curated'),
    sources: sourceIds,
  }))),
  traits,
  warnings: obj({
    toxicity: orNull(obj({ level: oneOf('None', 'Slight', 'Moderate', 'Severe'), note: optional(orNull(text)), sources: sourceIds })),
    invasive_in: orNull(arr(obj({ country: { kind: 'string', pattern: /^[A-Z]{2}$/ }, sources: sourceIds }))),
    allelopathic: orNull(bool),
    weed_potential: orNull(bool),
  }),
});

const interaction = obj({
  subject: taxonRef, object: taxonRef,
  type: oneOf('allelopathic_harm', 'allelopathy_tolerant', 'alternate_host', 'shared_pest'),
  agent: orNull(str),
  severity: orNull(oneOf('low', 'medium', 'high')),
  note: optional(orNull(text)),
  sources: sourceIds,
});

export const cellShape = obj({
  format_version: oneOf(2),
  climate_zone: climateZone,
  region,
  generated_at: str,
  sources: map(obj({ label: str, url: optional(orNull(str)), licence: optional(orNull(str)), attribution: optional(orNull(str)) })),
  taxa: arr(taxon),
  interactions: arr(interaction),
});

const manifestShape = obj({
  format_version: oneOf(2),
  generated_at: str,
  canopi_db_sha256: { kind: 'string', pattern: /^[0-9a-f]{64}$/ },
  cells: arr(obj({ climate_zone: climateZone, region, file: { kind: 'string', pattern: SAFE_NAME }, taxa: int, interactions: int, sha256: { kind: 'string', pattern: /^[0-9a-f]{64}$/ } }), 1),
  locales: arr(str),
  country_regions: map(arr(region)),
});

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

// The first problems of a value against a shape, as "path: problem" lines (at most `max`).
export function shapeErrors(value, shape, path = '$', out = [], max = 20) {
  const fail = (msg) => { if (out.length < max) out.push(`${path}: ${msg}`); };
  if (out.length >= max) return out;
  if (value === null) {
    if (!shape.nullable) fail('is null');
    return out;
  }
  switch (shape.kind) {
    case 'string':
      if (typeof value !== 'string') fail('is not a string');
      else if (shape.pattern && !shape.pattern.test(value)) fail(`"${value}" does not match ${shape.pattern}`);
      break;
    case 'number': if (typeof value !== 'number' || !Number.isFinite(value)) fail('is not a number'); break;
    case 'integer': if (!Number.isInteger(value)) fail('is not an integer'); break;
    case 'boolean': if (typeof value !== 'boolean') fail('is not a boolean'); break;
    case 'enum': if (!shape.values.includes(value)) fail(`${JSON.stringify(value)} is not one of ${shape.values.join(', ')}`); break;
    case 'array':
      if (!Array.isArray(value)) fail('is not an array');
      else {
        if (value.length < shape.minItems) fail(`has fewer than ${shape.minItems} items`);
        value.forEach((v, i) => shapeErrors(v, shape.items, `${path}[${i}]`, out, max));
      }
      break;
    case 'map':
    case 'object':
      if (!isObject(value)) { fail('is not an object'); break; }
      for (const [key, s] of Object.entries(shape.props ?? {})) {
        if (!(key in value)) { if (!s.optional) fail(`misses required key "${key}"`); continue; }
        shapeErrors(value[key], s, `${path}.${key}`, out, max);
      }
      if (shape.kind === 'map') for (const [key, v] of Object.entries(value)) if (!shape.props?.[key]) shapeErrors(v, shape.values, `${path}.${key}`, out, max);
      break;
  }
  return out;
}

function refuse(message) {
  throw new Error(`Consortium export refused: ${message}`);
}

function readSums(dir) {
  const path = join(dir, 'SHA256SUMS');
  if (!existsSync(path)) refuse('SHA256SUMS is missing.');
  const sums = new Map();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
    if (!m || !SAFE_NAME.test(m[2])) refuse(`SHA256SUMS has a malformed line: ${line}`);
    sums.set(m[2], m[1]);
  }
  for (const [name, hash] of sums) {
    const file = join(dir, name);
    if (!existsSync(file)) refuse(`${name} is listed in SHA256SUMS but missing.`);
    if (sha256(readFileSync(file)) !== hash) refuse(`${name} does not match its SHA256SUMS checksum.`);
  }
  const unlisted = readdirSync(dir).filter((f) => f.endsWith('.json') && !sums.has(f));
  if (unlisted.length) refuse(`unlisted files: ${unlisted.join(', ')}.`);
  for (const name of ['manifest.json', 'labels.json']) if (!sums.has(name)) refuse(`SHA256SUMS does not list ${name}.`);
  return sums;
}

function parse(dir, name) {
  try {
    return JSON.parse(readFileSync(join(dir, name), 'utf8'));
  } catch (err) {
    refuse(`${name} is not valid JSON (${err.message}).`);
  }
}

// Source ids a cell cites anywhere, to check against its `sources`.
function citedSources(cell) {
  const ids = new Set();
  const add = (list) => { for (const id of list ?? []) ids.add(id); };
  for (const t of cell.taxa) {
    add(t.stratum?.sources);
    add(t.phases?.sources);
    for (const f of t.functions ?? []) add(f.sources);
    add(t.warnings.toxicity?.sources);
    for (const r of t.warnings.invasive_in ?? []) add(r.sources);
  }
  for (const i of cell.interactions) add(i.sources);
  return ids;
}

// Reads and checks a whole export directory; returns the parsed manifest, labels bytes and cells.
export function verifyExport(dir, { fixture = false } = {}) {
  const sums = readSums(dir);
  const manifest = parse(dir, 'manifest.json');
  if (!isObject(manifest) || manifest.format_version !== 2) refuse(`manifest.json format_version is ${JSON.stringify(manifest?.format_version)}, not 2.`);
  const manifestProblems = shapeErrors(manifest, manifestShape, 'manifest.json');
  if (manifestProblems.length) refuse(manifestProblems.join('; '));
  if (manifest.canopi_db_sha256 === ZERO_SHA && !fixture) refuse('canopi_db_sha256 is all zeros: this is the invented fixture, never installed for real (tests pass --fixture).');
  parse(dir, 'labels.json');

  const seen = new Set();
  const cells = manifest.cells.map((entry) => {
    const where = `${entry.climate_zone} × ${entry.region}`;
    if (seen.has(where) || seen.has(entry.file)) refuse(`the manifest lists ${where} (${entry.file}) twice.`);
    seen.add(where).add(entry.file);
    if (!sums.has(entry.file)) refuse(`${entry.file} is not listed in SHA256SUMS.`);
    if (sums.get(entry.file) !== entry.sha256) refuse(`${entry.file} does not match the manifest's sha256.`);
    const bytes = readFileSync(join(dir, entry.file));
    const cell = parse(dir, entry.file);
    const problems = shapeErrors(cell, cellShape, entry.file);
    if (problems.length) refuse(problems.join('; '));
    if (cell.climate_zone !== entry.climate_zone || cell.region !== entry.region) refuse(`${entry.file} is ${cell.climate_zone} × ${cell.region}, the manifest says ${where}.`);
    if (cell.taxa.length !== entry.taxa) refuse(`${entry.file} has ${cell.taxa.length} taxa, the manifest says ${entry.taxa}.`);
    if (cell.interactions.length !== entry.interactions) refuse(`${entry.file} has ${cell.interactions.length} interactions, the manifest says ${entry.interactions}.`);
    const ids = new Set(cell.taxa.map((t) => t.id));
    if (ids.size !== cell.taxa.length) refuse(`${entry.file} lists a taxon id twice.`);
    const undefinedSources = [...citedSources(cell)].filter((id) => !(id in cell.sources));
    if (undefinedSources.length) refuse(`${entry.file} cites undefined sources: ${undefinedSources.join(', ')}.`);
    return { entry, cell, bytes };
  });
  return { manifest, manifestBytes: readFileSync(join(dir, 'manifest.json')), labelsBytes: readFileSync(join(dir, 'labels.json')), cells };
}

// One photo: the Commons thumbnail first, then the original only when the thumbnail does not exist
// (400, 403 or 404, as for a Commons file narrower than the thumbnail; S3 answers 403 for a missing key). Rate limiting (429, 503) is waited out,
// up to RETRIES times: Retry-After when the server gives it, else backoffMs doubling. Returns
// { bytes, ext } or throws.
const RETRIES = 4;
async function download(url, { fetchImpl, delayMs, backoffMs }) {
  const thumb = thumbnailUrl(url);
  const tries = thumb ? [thumb, url] : [url];
  let last = null;
  for (const [n, candidate] of tries.entries()) {
    if (n) await sleep(delayMs);
    let res;
    for (let attempt = 0; ; attempt++) {
      res = await fetchImpl(candidate, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow', signal: AbortSignal.timeout(30_000) });
      if ((res.status !== 429 && res.status !== 503) || attempt === RETRIES) break;
      const after = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(after) && after > 0 ? Math.min(after, 120) * 1000 : backoffMs * 2 ** attempt);
    }
    if (!res.ok) {
      last = `HTTP ${res.status} for ${candidate}`;
      if (res.status === 400 || res.status === 403 || res.status === 404) continue; // no such thumbnail: try the original
      break;
    }
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const ext = IMAGE_TYPES[type];
    if (!ext) { last = `unsupported type "${type}" for ${candidate}`; break; }
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) { last = `${bytes.length} bytes for ${candidate}`; break; }
    return { bytes, ext };
  }
  throw new Error(last ?? `no URL for ${url}`);
}

// Downloads every photo once per taxon id and rewrites the cells in place. Returns the image files
// and the failures.
async function fetchImages(cells, { fetchImpl, delayMs, backoffMs, log }) {
  const wanted = new Map(); // id -> { url, name }
  for (const { cell } of cells) for (const t of cell.taxa) {
    if (t.image && /^https?:\/\//i.test(t.image.url) && !wanted.has(t.id)) wanted.set(t.id, { url: t.image.url, name: t.canonical_name });
  }
  const files = new Map(), failed = [];
  let first = true;
  for (const [id, { url, name }] of wanted) {
    if (!first) await sleep(delayMs);
    first = false;
    try {
      const { bytes, ext } = await download(url, { fetchImpl, delayMs, backoffMs });
      files.set(id, { name: `${id}.${ext}`, bytes });
    } catch (err) {
      failed.push({ id, name, url, error: err.message });
      log(`  no photo for ${name}: ${err.message}`);
    }
  }
  if (wanted.size && failed.length / wanted.size > MAX_FAILED_SHARE)
    refuse(`${failed.length} of ${wanted.size} photos failed (more than ${MAX_FAILED_SHARE * 100}%): ${failed.slice(0, 5).map((f) => f.name).join(', ')}…`);
  for (const c of cells) {
    for (const t of c.cell.taxa) {
      if (!t.image || !wanted.has(t.id)) continue;
      const file = files.get(t.id);
      t.image = file ? { ...t.image, url: `${IMAGE_BASE}${file.name}` } : null;
      c.changed = true;
    }
  }
  return { files, failed, total: wanted.size };
}

export async function installConsortium({ exportDir, outDir = DEFAULT_OUT, fixture = false, images = true, fetchImpl = globalThis.fetch, delayMs = 500, backoffMs = 5000, log = console.log } = {}) {
  if (!exportDir) refuse('no export directory given.');
  const dir = resolve(exportDir), out = resolve(outDir);
  const { manifest, manifestBytes, labelsBytes, cells } = verifyExport(dir, { fixture });
  const photos = images ? await fetchImages(cells, { fetchImpl, delayMs, backoffMs, log }) : { files: new Map(), failed: [], total: 0 };

  // Installed bytes: unchanged cells byte for byte, changed ones minified (the export's own style)
  // with their checksum recomputed in the installed manifest.
  const written = new Map();
  for (const c of cells) {
    const bytes = c.changed ? Buffer.from(JSON.stringify(c.cell)) : c.bytes;
    c.entry.sha256 = sha256(bytes);
    written.set(c.entry.file, bytes);
  }
  const anyChanged = cells.some((c) => c.changed);
  written.set('manifest.json', anyChanged ? Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) : manifestBytes);
  written.set('labels.json', labelsBytes);
  for (const { name, bytes } of photos.files.values()) written.set(`images/${name}`, bytes);
  const sums = [...written].sort(([a], [b]) => (a < b ? -1 : 1)).map(([name, bytes]) => `${sha256(bytes)}  ${name}\n`).join('');
  written.set('SHA256SUMS', Buffer.from(sums));

  const tmp = `${out}.tmp-${process.pid}`, old = `${out}.old-${process.pid}`;
  mkdirSync(dirname(out), { recursive: true });
  rmSync(tmp, { recursive: true, force: true });
  try {
    for (const [name, bytes] of written) {
      mkdirSync(dirname(join(tmp, name)), { recursive: true });
      writeFileSync(join(tmp, name), bytes);
    }
    const hadOut = existsSync(out);
    if (hadOut) renameSync(out, old);
    try {
      renameSync(tmp, out);
    } catch (err) {
      if (hadOut) renameSync(old, out); // put the previous install back
      throw err;
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(old, { recursive: true, force: true });
  }

  const summary = {
    out,
    cells: cells.map((c) => ({ file: c.entry.file, taxa: c.entry.taxa, interactions: c.entry.interactions })),
    photos: { total: photos.total, downloaded: photos.files.size, failed: photos.failed },
  };
  log(`Installed ${cells.length} consortium cells (${cells.map((c) => c.entry.file).join(', ')}) in ${out}`);
  if (images) log(`Photos: ${photos.files.size} of ${photos.total} downloaded${photos.failed.length ? `; no photo for ${photos.failed.map((f) => f.name).join(', ')}` : ''}.`);
  else log('Photos: skipped (--no-images).');
  return summary;
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
  if (!opts.exportDir) refuse('usage: node scripts/install-consortium.mjs <export-dir> [--fixture] [--no-images] [--out <dir>]');
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
