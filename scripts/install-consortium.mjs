// Installs a canopi-data consortium export (format 3: one file per climate) into public/data/consortium/, where the
// consortium page fetches it as static JSON. Run by hand; the output is committed.
//
//   node scripts/install-consortium.mjs <export-dir> [--fixture [--no-images]] [--out <dir>]
//
// Checks, in order, and refuses on the first failure (nothing is written then):
// - SHA256SUMS: every listed file exists and matches; no .json in the directory is unlisted.
// - manifest.json: format_version 3, canopi_db_sha256 not all zeros (the invented fixture) unless
//   --fixture (tests only), one entry per climate, each climate file's sha256, regions and
//   taxa/interactions counts; `countries` keyed by ISO alpha-2 code, each with invasive_checked.
// - each climate file: the required keys and types of canopi-data's consortium-export.schema.json,
//   checked by hand (no dependency); extra keys are allowed, as the format lets the export add
//   fields; taxon ids unique; every source id it cites (reasons included) defined in `sources`;
//   every source url and photo page url http(s) (the page links them).
// - the rules the schema cannot express (canopi-data docs/consortium-export-format.md): a taxon's
//   reasons are one per region, in region order, each in the file's regions; the file's regions are
//   the union of its reasons' regions; every invasive_in country is a manifest country that GRIIS
//   checked (the page's "not checked, never none" rests on it).
// Photos: each taxon's image.url (http or https) is downloaded once per taxon id, one at a time
// with a half-second pause (rate limiting waited out, see download()), into images/<id>.<ext>, and the installed climate file points to
// /data/consortium/images/<id>.<ext>; credit, licence and source page stay as they are. Wikimedia
// Commons and iNaturalist originals are fetched as 500 px copies. A photo that fails becomes image: null (no
// photo) and is listed in the summary; more than 10% failing stops the install. Installed climate
// files that changed get their sha256 recomputed in the installed manifest and SHA256SUMS. An image
// url that is not http(s) becomes image: null. --no-images (allowed only with --fixture, for tests)
// skips downloads and keeps the other files byte for byte.
// The output directory is replaced as a whole: written in a staging directory (see STAGING_DIR),
// then renamed into place. It must be absent, empty or a previous install (its INSTALLED_BY mark):
// anything else is refused, so a mistyped --out never deletes a folder.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_OUT = join(ROOT, 'public', 'data', 'consortium');
export const IMAGE_BASE = '/data/consortium/images/';
// Where an install is written before it is renamed into place: outside public/ (so astro build
// never ships a half-written or leftover copy) and git-ignored (.cache/). An --out outside the
// repository stages beside it instead, in .consortium-install/, as a rename needs one file system.
export const STAGING_DIR = join(ROOT, '.cache', 'consortium-install');
export function stagingDirFor(out) {
  const rel = relative(ROOT, resolve(out));
  return rel && !rel.startsWith('..') && !isAbsolute(rel) ? STAGING_DIR : join(dirname(resolve(out)), '.consortium-install');
}
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
// A link the page puts in an href (a source, a photo's page): http or https only, so a javascript:,
// data: or protocol-relative value from upstream never becomes a link on the site's origin.
const httpUrl = { kind: 'string', url: true };
export const isHttpUrl = (value) => {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};
const orNull = (s) => ({ ...s, nullable: true });
const optional = (s) => ({ ...s, optional: true });
const oneOf = (...values) => ({ kind: 'enum', values });
const obj = (props) => ({ kind: 'object', props });
const arr = (items, minItems = 0) => ({ kind: 'array', items, minItems });
const map = (values, keys) => ({ kind: 'map', values, keys });
// The 11 site locales: the keys of `names`, of every text (`reasons[].text`, `note`) and of labels.json.
const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
const text = { kind: 'map', values: str, props: { en: str }, keys: LOCALES };
const range = orNull(obj({ min: orNull(num), max: orNull(num) }));
const sourceIds = arr(str, 1);
const climateZone = oneOf('Tropical', 'Subtropical', 'Arid', 'Mediterranean', 'Temperate', 'Continental', 'Boreal');
// WGSRPD level-1 continents, in the export's region order.
const REGIONS = ['europe', 'africa', 'asia_temperate', 'asia_tropical', 'australasia', 'pacific', 'northern_america', 'southern_america'];
const region = oneOf(...REGIONS);
const COUNTRY = /^[A-Z]{2}$/;
const phase = oneOf('placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax');
const taxonRef = obj({ name: str, rank: oneOf('species', 'genus', 'family') });

const traits = obj({
  height_m: range, width_max_m: orNull(num), sun: orNull(bool), semi_shade: orNull(bool), full_shade: orNull(bool),
  hardiness_zone: range, frost_tender: orNull(bool), soil_ph: range, well_drained: orNull(bool),
  moisture_use: orNull(str), drought_tolerance: orNull(str), fertility_requirement: orNull(str),
  deciduous_evergreen: orNull(str), active_growth_period: orNull(str), bloom_period: orNull(str),
  harvest_period: orNull(str), lifespan: orNull(str), growth_rate: orNull(str), age_of_maturity_years: orNull(num),
  root_depth_min_cm: orNull(num), taproot_persistent: orNull(bool), root_system_type: orNull(str),
  mycorrhizal_type: orNull(str), nitrogen_fixer: orNull(bool), edibility_rating: orNull({ ...int, min: 0, max: 5 }), self_fertile: orNull(bool),
  sexual_system: orNull(str), pollinators: orNull(arr(str)), vegetative_spread_rate: orNull(str),
  clonal_growth_form: orNull(str), is_annual: orNull(bool), is_perennial: orNull(bool), habit: orNull(str),
});

const taxon = obj({
  id: { kind: 'string', pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/ },
  canonical_name: str, genus: str, family: str,
  names: map(str, LOCALES),
  image: orNull(obj({ url: str, credit: orNull(str), licence: orNull(str), source_page_url: orNull(httpUrl) })),
  role: oneOf('crop', 'support'),
  reasons: arr(obj({ region, text, sources: sourceIds }), 1),
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
    invasive_in: orNull(arr(obj({ country: { kind: 'string', pattern: COUNTRY }, sources: sourceIds }))),
    allelopathic: orNull(bool),
    weed_potential: orNull(bool),
  }),
});

const interaction = obj({
  subject: taxonRef, object: taxonRef,
  type: oneOf('allelopathic_harm', 'allelopathy_tolerant', 'alternate_host', 'shared_pest'),
  agent: orNull(str),
  // Added within format 3 (2026-10-28): the agent's common names by site locale, each an EPPO name
  // chosen by a usage source (canopi-data docs/consortium-export-format.md); absent reads as null.
  agent_names: optional(orNull(obj({ names: map(str, LOCALES), sources: sourceIds }))),
  severity: orNull(oneOf('low', 'medium', 'high')),
  note: optional(orNull(text)),
  sources: sourceIds,
});

export const cellShape = obj({
  format_version: oneOf(3),
  climate_zone: climateZone,
  regions: arr(region, 1),
  generated_at: str,
  sources: map(obj({ label: str, url: optional(orNull(httpUrl)), licence: optional(orNull(str)), attribution: optional(orNull(str)) })),
  taxa: arr(taxon),
  interactions: arr(interaction),
});

const manifestShape = obj({
  format_version: oneOf(3),
  generated_at: str,
  canopi_db_sha256: { kind: 'string', pattern: /^[0-9a-f]{64}$/ },
  climates: arr(obj({ climate_zone: climateZone, file: { kind: 'string', pattern: SAFE_NAME }, regions: arr(region, 1), taxa: int, interactions: int, sha256: { kind: 'string', pattern: /^[0-9a-f]{64}$/ } }), 1),
  locales: arr(oneOf(...LOCALES)),
  countries: { kind: 'map', values: obj({ invasive_checked: bool }), keyPattern: COUNTRY },
});

// labels.json: trait → English value → locale → translation (canopi-data docs/consortium-export-format.md).
const labelsShape = map(map(map(str, LOCALES)));

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
      else if (shape.url && !isHttpUrl(value)) fail(`${JSON.stringify(value)} is not an http(s) URL`);
      break;
    case 'number': if (typeof value !== 'number' || !Number.isFinite(value)) fail('is not a number'); break;
    case 'integer':
      if (!Number.isInteger(value)) fail('is not an integer');
      else if ((shape.min !== undefined && value < shape.min) || (shape.max !== undefined && value > shape.max)) fail(`${value} is outside ${shape.min}–${shape.max}`);
      break;
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
      if (shape.keys) for (const key of Object.keys(value)) if (!shape.keys.includes(key)) fail(`has a key "${key}" outside ${shape.keys.join(', ')}`);
      if (shape.keyPattern) for (const key of Object.keys(value)) if (!shape.keyPattern.test(key)) fail(`has a key "${key}" that does not match ${shape.keyPattern}`);
      for (const [key, s] of Object.entries(shape.props ?? {})) {
        if (!(key in value)) { if (!s.optional) fail(`misses required key "${key}"`); continue; }
        shapeErrors(value[key], s, `${path}.${key}`, out, max);
      }
      if (shape.kind === 'map') for (const [key, v] of Object.entries(value)) if (!shape.props?.[key]) shapeErrors(v, shape.values, `${path}.${key}`, out, max);
      break;
  }
  return out;
}

// Written into every install, so --out replaces only a directory this script made (an export has a
// format 3 manifest too, and canopi-data does not keep its exports in git).
const INSTALL_MARK = 'INSTALLED_BY';
const INSTALL_MARK_TEXT = 'scripts/install-consortium.mjs (canopi-website)\n';

// An --out that is absent, empty or a previous install; anything else is refused before any work.
function checkOut(out, exportDir) {
  // Compared where the paths lead (symlinks, case on macOS), the output as far as it exists.
  const real = (p) => { let tail = ''; while (!existsSync(p)) { tail = join(basename(p), tail); p = dirname(p); } return join(realpathSync.native(p), tail).replace(/[\\/]$/, ''); };
  const inside = (a, b) => a === b || a.startsWith(b + sep);
  const ro = real(out), re = real(exportDir);
  if (inside(ro, re) || inside(re, ro)) refuse(`${out} is, holds or sits inside the export directory ${exportDir}.`);
  if (!existsSync(out)) return;
  if (!statSync(out).isDirectory()) refuse(`${out} is a file, not an install directory.`);
  if (!readdirSync(out).length) return;
  let mark = null;
  try { mark = readFileSync(join(out, INSTALL_MARK), 'utf8'); } catch { /* none or unreadable */ }
  if (mark !== INSTALL_MARK_TEXT) refuse(`${out} is not empty and holds no consortium install (no ${INSTALL_MARK} file from this script), so it is not replaced.`);
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

// Source ids a climate file cites anywhere, to check against its `sources`.
function citedSources(cell) {
  const ids = new Set();
  const add = (list) => { for (const id of list ?? []) ids.add(id); };
  for (const t of cell.taxa) {
    for (const r of t.reasons) add(r.sources);
    add(t.stratum?.sources);
    add(t.phases?.sources);
    for (const f of t.functions ?? []) add(f.sources);
    add(t.warnings.toxicity?.sources);
    for (const r of t.warnings.invasive_in ?? []) add(r.sources);
  }
  for (const i of cell.interactions) { add(i.sources); add(i.agent_names?.sources); }
  return ids;
}

// The format's rules the schema cannot express, for one climate file already shape-checked: the
// first problem as a sentence, or null. `countries` is the manifest's.
export function ruleProblem(file, cell, countries) {
  const order = (list) => [...list].sort((a, b) => REGIONS.indexOf(a) - REGIONS.indexOf(b));
  const named = new Set();
  for (const t of cell.taxa) {
    const rs = t.reasons.map((r) => r.region);
    if (new Set(rs).size !== rs.length || order(rs).join() !== rs.join()) return `${file}: ${t.canonical_name}: its reasons are not one per region in region order (${rs.join(', ')}).`;
    const outside = rs.find((r) => !cell.regions.includes(r));
    if (outside) return `${file}: ${t.canonical_name}: a reason for ${outside}, not in the file's regions (${cell.regions.join(', ')}).`;
    for (const r of rs) named.add(r);
    for (const { country } of t.warnings.invasive_in ?? []) {
      if (countries[country]?.invasive_checked !== true) return `${file}: ${t.canonical_name}: invasive in ${country}, a country GRIIS did not check (or one the manifest lacks).`;
    }
  }
  const union = order(named);
  if (union.join() !== cell.regions.join()) return `${file}: regions ${cell.regions.join(', ')} are not those of its reasons (${union.join(', ')}).`;
  return null;
}

// Reads and checks a whole export directory; returns the parsed manifest, labels bytes and climate files.
export function verifyExport(dir, { fixture = false } = {}) {
  const sums = readSums(dir);
  const manifest = parse(dir, 'manifest.json');
  if (!isObject(manifest) || manifest.format_version !== 3) refuse(`manifest.json format_version is ${JSON.stringify(manifest?.format_version)}, not 3.`);
  const manifestProblems = shapeErrors(manifest, manifestShape, 'manifest.json');
  if (manifestProblems.length) refuse(manifestProblems.join('; '));
  if (manifest.canopi_db_sha256 === ZERO_SHA && !fixture) refuse('canopi_db_sha256 is all zeros: this is the invented fixture, never installed for real (tests pass --fixture).');
  const labelProblems = shapeErrors(parse(dir, 'labels.json'), labelsShape, 'labels.json');
  if (labelProblems.length) refuse(labelProblems.join('; '));

  const seen = new Set();
  const cells = manifest.climates.map((entry) => {
    const where = entry.climate_zone;
    if (seen.has(where) || seen.has(entry.file)) refuse(`the manifest lists ${where} (${entry.file}) twice.`);
    seen.add(where).add(entry.file);
    if (!sums.has(entry.file)) refuse(`${entry.file} is not listed in SHA256SUMS.`);
    if (sums.get(entry.file) !== entry.sha256) refuse(`${entry.file} does not match the manifest's sha256.`);
    const bytes = readFileSync(join(dir, entry.file));
    const cell = parse(dir, entry.file);
    const problems = shapeErrors(cell, cellShape, entry.file);
    if (problems.length) refuse(problems.join('; '));
    if (cell.climate_zone !== entry.climate_zone) refuse(`${entry.file} is ${cell.climate_zone}, the manifest says ${where}.`);
    if (cell.regions.join() !== entry.regions.join()) refuse(`${entry.file} has the regions ${cell.regions.join(', ')}, the manifest says ${entry.regions.join(', ')}.`);
    if (cell.taxa.length !== entry.taxa) refuse(`${entry.file} has ${cell.taxa.length} taxa, the manifest says ${entry.taxa}.`);
    if (cell.interactions.length !== entry.interactions) refuse(`${entry.file} has ${cell.interactions.length} interactions, the manifest says ${entry.interactions}.`);
    const ids = new Set(cell.taxa.map((t) => t.id));
    if (ids.size !== cell.taxa.length) refuse(`${entry.file} lists a taxon id twice.`);
    const undefinedSources = [...citedSources(cell)].filter((id) => !(id in cell.sources));
    if (undefinedSources.length) refuse(`${entry.file} cites undefined sources: ${undefinedSources.join(', ')}.`);
    const rule = ruleProblem(entry.file, cell, manifest.countries);
    if (rule) refuse(rule);
    return { entry, cell, bytes };
  });
  return { manifest, manifestBytes: readFileSync(join(dir, 'manifest.json')), labelsBytes: readFileSync(join(dir, 'labels.json')), cells };
}

// Checks an installed directory as the site serves it (scripts/check-built-site.mjs runs it on
// dist/client/data/consortium/, the tests on public/data/consortium/): the manifest's format and
// shape, SHA256SUMS line by line, each climate file against its manifest sha256, regions, taxa and
// interactions counts, the export's shape and the rules the schema cannot express, and every photo a
// local images/ file that exists. Throws on the first problem; returns the counts of climate files
// and photos.
export function verifyInstall(dir, { fixture = false } = {}) {
  const broken = (message) => { throw new Error(`Consortium install broken (${dir}): ${message}`); };
  const read = (name) => { try { return readFileSync(join(dir, name)); } catch { return broken(`${name} is missing.`); } };
  const json = (name) => { try { return JSON.parse(read(name).toString('utf8')); } catch (err) { return broken(`${name} is not valid JSON (${err.message}).`); } };
  const manifest = json('manifest.json');
  if (!isObject(manifest) || manifest.format_version !== 3) broken(`manifest.json format_version is ${JSON.stringify(manifest?.format_version)}, not 3.`);
  const manifestProblems = shapeErrors(manifest, manifestShape, 'manifest.json');
  if (manifestProblems.length) broken(manifestProblems.join('; '));
  if (manifest.canopi_db_sha256 === ZERO_SHA && !fixture) broken('canopi_db_sha256 is all zeros: the invented fixture is installed.');
  const labelProblems = shapeErrors(json('labels.json'), labelsShape, 'labels.json');
  if (labelProblems.length) broken(labelProblems.join('; '));

  const sums = new Map();
  for (const line of read('SHA256SUMS').toString('utf8').split('\n')) {
    if (!line.trim()) continue;
    const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
    if (!m) broken(`SHA256SUMS has a malformed line: ${line}`);
    sums.set(m[2], m[1]);
  }
  for (const name of ['manifest.json', 'labels.json', ...manifest.climates.map((c) => c.file)]) if (!sums.has(name)) broken(`SHA256SUMS does not list ${name}.`);
  if (new Set(manifest.climates.map((c) => c.climate_zone)).size !== manifest.climates.length) broken('the manifest lists a climate twice.');

  let images = 0;
  for (const entry of manifest.climates) {
    const bytes = read(entry.file);
    if (sha256(bytes) !== entry.sha256) broken(`${entry.file} does not match the manifest's sha256.`);
    let cell;
    try { cell = JSON.parse(bytes.toString('utf8')); } catch (err) { broken(`${entry.file} is not valid JSON (${err.message}).`); }
    const problems = shapeErrors(cell, cellShape, entry.file);
    if (problems.length) broken(problems.join('; '));
    if (cell.climate_zone !== entry.climate_zone) broken(`${entry.file} is ${cell.climate_zone}, the manifest says ${entry.climate_zone}.`);
    if (cell.regions.join() !== entry.regions.join()) broken(`${entry.file} has the regions ${cell.regions.join(', ')}, the manifest says ${entry.regions.join(', ')}.`);
    if (cell.taxa.length !== entry.taxa || cell.interactions.length !== entry.interactions) broken(`${entry.file} has ${cell.taxa.length} taxa and ${cell.interactions.length} interactions, the manifest says ${entry.taxa} and ${entry.interactions}.`);
    const undefinedSources = [...citedSources(cell)].filter((id) => !(id in cell.sources));
    if (undefinedSources.length) broken(`${entry.file} cites undefined sources: ${undefinedSources.join(', ')}.`);
    const rule = ruleProblem(entry.file, cell, manifest.countries);
    if (rule) broken(rule);
    for (const t of cell.taxa) {
      if (!t.image) continue;
      const name = t.image.url.startsWith(IMAGE_BASE) ? t.image.url.slice(IMAGE_BASE.length) : null;
      if (!name || !SAFE_NAME.test(name)) broken(`${entry.file}: ${t.canonical_name}'s image.url ${JSON.stringify(t.image.url)} is not a local ${IMAGE_BASE} file.`);
      if (!existsSync(join(dir, 'images', name))) broken(`${entry.file}: images/${name} is missing (${t.canonical_name}).`);
      images++;
    }
  }
  for (const [name, hash] of sums) {
    if (!existsSync(join(dir, name))) broken(`${name} is listed in SHA256SUMS but missing.`);
    if (sha256(readFileSync(join(dir, name))) !== hash) broken(`${name} does not match SHA256SUMS.`);
  }
  return { climates: manifest.climates.length, images };
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

// One photo: the Commons thumbnail first, then the original only when the thumbnail does not exist
// (400, 403 or 404, as for a Commons file narrower than the thumbnail; S3 answers 403 for a missing key). Rate limiting (429, 503) is waited out,
// up to RETRIES times: Retry-After when the server gives it, else backoffMs doubling. Every body we
// do not keep is cancelled before the next request. Returns { bytes, ext } or throws.
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

// Downloads every photo once per taxon id (a taxon may be in several climate files) and rewrites the files in place. Returns the image files
// and the failures.
async function fetchImages(cells, { fetchImpl, delayMs, backoffMs, log, maxFailedShare }) {
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
  if (wanted.size && failed.length / wanted.size > maxFailedShare)
    refuse(`${failed.length} of ${wanted.size} photos failed (more than ${maxFailedShare * 100}%): ${failed.slice(0, 5).map((f) => f.name).join(', ')}…`);
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

export async function installConsortium({ exportDir, outDir = DEFAULT_OUT, fixture = false, images = true, fetchImpl = globalThis.fetch, delayMs = 500, backoffMs = 5000, maxFailedShare = MAX_FAILED_SHARE, stagingDir = null, log = console.log } = {}) {
  if (!exportDir) refuse('no export directory given.');
  if (!images && !fixture) refuse('--no-images is allowed only with --fixture: a real install copies its photos into the site.');
  const dir = resolve(exportDir), out = resolve(outDir);
  checkOut(out, dir);
  const { manifest, manifestBytes, labelsBytes, cells } = verifyExport(dir, { fixture });
  // A photo that is not an http(s) url (protocol-relative, data:, another scheme) is never
  // downloaded and never served from elsewhere: no photo.
  for (const c of cells) for (const t of c.cell.taxa) {
    if (t.image && !/^https?:\/\//i.test(t.image.url)) { t.image = null; c.changed = true; }
  }
  const photos = images ? await fetchImages(cells, { fetchImpl, delayMs, backoffMs, log, maxFailedShare }) : { files: new Map(), failed: [], total: 0 };

  // Installed bytes: unchanged climate files byte for byte, changed ones minified (the export's own style)
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
  written.set(INSTALL_MARK, Buffer.from(INSTALL_MARK_TEXT));
  for (const { name, bytes } of photos.files.values()) written.set(`images/${name}`, bytes);
  const sums = [...written].sort(([a], [b]) => (a < b ? -1 : 1)).map(([name, bytes]) => `${sha256(bytes)}  ${name}\n`).join('');
  written.set('SHA256SUMS', Buffer.from(sums));

  // What a killed run left: the whole staging directory, and the sibling folders older versions wrote.
  const staging = resolve(stagingDir ?? stagingDirFor(out));
  rmSync(staging, { recursive: true, force: true });
  if (existsSync(dirname(out))) {
    const leftover = new RegExp(`^${basename(out).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(tmp|old)-\\d+$`);
    for (const name of readdirSync(dirname(out))) if (leftover.test(name)) rmSync(join(dirname(out), name), { recursive: true, force: true });
  }
  const tmp = join(staging, `new-${process.pid}`), old = join(staging, `old-${process.pid}`);
  mkdirSync(dirname(out), { recursive: true });
  mkdirSync(staging, { recursive: true });
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
    rmSync(staging, { recursive: true, force: true });
  }

  const summary = {
    out,
    climates: cells.map((c) => ({ file: c.entry.file, taxa: c.entry.taxa, interactions: c.entry.interactions })),
    photos: { total: photos.total, downloaded: photos.files.size, failed: photos.failed },
  };
  log(`Installed ${cells.length} consortium climates (${cells.map((c) => c.entry.file).join(', ')}) in ${out}`);
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
