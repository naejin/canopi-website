// The consortium export installer, format 4 (scripts/install-consortium.mjs): the invented fixture
// (scripts/fixtures/consortium-v2/) installs into a temporary directory (never public/), and each
// broken export, built by the fixture's own writer, is refused before anything is written. Photos come
// through a stub fetch; nothing here uses the network, canopi-data or uv (`canopi release verify` is a
// stub, or a fake `uv` on PATH).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  installConsortium, verifyInstall, thumbnailUrl, databaseName, indexProblem, releaseVerifyProblem, stagingDirFor,
  DEFAULT_OUT, DATA_DIR, INDEX_PATH, STAGING_DIR, USER_AGENT, CANOPI_DATA_DIR, MAX_GZIP_BYTES,
} from './install-consortium.mjs';
import { writeFixtureExport, FIXTURE_RELEASE, FIXTURE_TRY, FIXTURE_CREDITS, FIXTURE_GRID_SHA256 } from './fixtures/consortium-v2/make-fixture.mjs';

const committed = fileURLToPath(new URL('fixtures/consortium-v2/export/', import.meta.url));
const script = fileURLToPath(new URL('install-consortium.mjs', import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const quiet = () => {};
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

// A scratch root with the committed fixture copied to export/ and an output directory beside it.
function workspace(t) {
  const root = mkdtempSync(join(tmpdir(), 'consortium-install-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const src = join(root, 'export'), out = join(root, 'out'), data = join(root, 'src-data');
  cpSync(committed, src, { recursive: true });
  return { root, src, out, data };
}
// A broken export, written fresh by the fixture's writer into root/<name>.
async function variant(w, name, opts) {
  const dir = join(w.root, name);
  await writeFixtureExport(dir, opts);
  return dir;
}
// Rewrites SHA256SUMS of `dir` after a hand edit.
function resum(dir) {
  const names = readdirSync(dir).filter((n) => n !== 'SHA256SUMS').sort();
  writeFileSync(join(dir, 'SHA256SUMS'), names.map((n) => `${sha(readFileSync(join(dir, n)))}  ${n}\n`).join(''));
}
const install = (w, opts = {}) => installConsortium({ exportDir: w.src, outDir: w.out, fixture: true, images: false, log: quiet, stagingDir: join(w.root, 'staging'), ...opts });
// A stub fetch answering every photo with a small JPEG; `calls` records urls and User-Agents.
function photoFetch(calls = [], answer = () => new Response(JPEG, { status: 200, headers: { 'content-type': 'image/jpeg' } })) {
  return async (url, init) => { calls.push({ url, ua: init?.headers?.['User-Agent'] }); return answer(url); };
}

test('the committed fixture is what make-fixture.mjs writes today (rows and bytes)', async (t) => {
  const w = workspace(t);
  const fresh = await variant(w, 'fresh');
  for (const name of readdirSync(committed)) assert.deepEqual(readFileSync(join(fresh, name)), readFileSync(join(committed, name)), name);
});

test('the fixture installs with --fixture --no-images --out: the database byte for byte, the mark and the index, nothing else', (t) => {
  const w = workspace(t);
  const stdout = execFileSync(process.execPath, [script, w.src, '--fixture', '--no-images', '--out', w.out], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  assert.match(stdout, /Installed the consortium database consortium-v3\.r-000000000000f1c7\.[0-9a-f]{12}\.sqlite\.gz \(Tropical 11, Mediterranean 10, Temperate 21\)/);
  const manifest = JSON.parse(readFileSync(join(w.src, 'manifest.json'), 'utf8'));
  const db = manifest.files[0].file;
  assert.deepEqual(readdirSync(w.out).sort(), ['INSTALLED_BY', 'consortium-index.json', db].sort());
  assert.deepEqual(readFileSync(join(w.out, db)), readFileSync(join(w.src, db)));
  const index = JSON.parse(readFileSync(join(w.out, 'consortium-index.json'), 'utf8'));
  assert.equal(indexProblem(index), null);
  assert.equal(index.release_id, FIXTURE_RELEASE);
  assert.deepEqual(index.climates, ['Tropical', 'Mediterranean', 'Temperate']);
  assert.deepEqual(index.files, [{ file: db, url: `/data/consortium/${db}`, climate_zones: ['Tropical', 'Mediterranean', 'Temperate'], sha256: manifest.files[0].sha256, bytes: manifest.files[0].bytes, raw_sha256: manifest.files[0].raw_sha256, raw_bytes: manifest.files[0].raw_bytes }]);
  assert.ok(index.names.Temperate.includes('Castanea sativa') && index.names.Mediterranean.includes('Castanea sativa'));
  assert.ok(!index.names.Temperate.includes('Inga edulis'));
  assert.deepEqual(index.names.Temperate, [...index.names.Temperate].sort(), 'names sorted');
  assert.deepEqual(index.images, {}, 'no photos with --no-images');
  assert.deepEqual(index.try_references, { sha256: sha(Buffer.from(FIXTURE_TRY)), rows: 3, dataset_ids: 2 });
  assert.equal(index.griis_available, true);
  // Schema 2: the grid the ranges were sampled from (install-climate.mjs checks its own grid against
  // it) and the ranges' review state, from the database's meta.
  assert.equal(index.climate_grid_manifest_sha256, FIXTURE_GRID_SHA256);
  assert.equal(index.ranges_review, 'estimate_not_reviewed');
  assert.ok(!readdirSync(w.root).includes('.consortium-install'), 'no staging left');
});

test('a previous install (format 3 included) is replaced whole; a foreign folder is refused untouched', async (t) => {
  const w = workspace(t);
  mkdirSync(join(w.out, 'images'), { recursive: true });
  writeFileSync(join(w.out, 'INSTALLED_BY'), 'scripts/install-consortium.mjs (canopi-website)\n');
  for (const name of ['manifest.json', 'labels.json', 'temperate.json', 'SHA256SUMS', 'images/old.jpg']) writeFileSync(join(w.out, name), '{}');
  await install(w);
  assert.ok(!existsSync(join(w.out, 'temperate.json')) && !existsSync(join(w.out, 'labels.json')) && !existsSync(join(w.out, 'SHA256SUMS')) && !existsSync(join(w.out, 'images')));
  const foreign = join(w.root, 'foreign');
  mkdirSync(foreign);
  writeFileSync(join(foreign, 'keep.txt'), 'x');
  await assert.rejects(install({ ...w, out: foreign }), /is not empty and holds no consortium install/);
  assert.deepEqual(readdirSync(foreign), ['keep.txt']);
  await assert.rejects(install({ ...w, out: join(w.src, 'inside') }), /inside the export directory/);
});

test('SHA256SUMS: a changed file, a listed file missing and an unlisted file are refused', async (t) => {
  const w = workspace(t);
  writeFileSync(join(w.src, 'try_references.tsv'), FIXTURE_TRY + '3\tX\tY\tZ\n');
  await assert.rejects(install(w), /try_references\.tsv does not match its SHA256SUMS checksum/);
  const w2 = workspace(t);
  writeFileSync(join(w2.src, 'extra.txt'), 'x');
  await assert.rejects(install(w2), /unlisted files: extra\.txt/);
  const w3 = workspace(t);
  rmSync(join(w3.src, 'source_credits.tsv'));
  await assert.rejects(install(w3), /source_credits\.tsv is listed in SHA256SUMS but missing/);
  assert.ok(!existsSync(w.out) && !existsSync(w2.out) && !existsSync(w3.out), 'nothing written');
});

test('the manifest: format 4 and schema 3 only, by name; release id, split, climates and entries', async (t) => {
  const w = workspace(t);
  const cases = [
    [(m) => { m.format_version = 3; }, /format_version is 3; this installer reads format 4 only/],
    [(m) => { m.schema_version = 2; }, /schema_version is 2; this installer reads schema 3 only/],
    // Schema 2 carries the grid its climate ranges were sampled from, in meta and the manifest alike.
    [(m) => { m.climate_ranges.climate_grid_manifest_sha256 = 'b'.repeat(64); }, /meta\.climate_grid_manifest_sha256 is "04ec85f4[0-9a-f]+", the manifest says "b{64}"/],
    [(m) => { delete m.release_id; }, /release_id undefined is not r- and 16/],
    [(m) => { m.release_id = 'r-XYZ'; }, /release_id "r-XYZ"/],
    [(m) => { m.files.push({ ...m.files[0] }); }, /split is false but lists 2 files/],
    // The page opens files[0] and expects every climate in it, so a split export would give the
    // Reload screen for good: refused until the page reads more than one file (review B1).
    [(m) => { m.split = true; }, /split is true: the page reads one database file only/],
    [(m) => { m.climates.reverse(); }, /not in climate order/],
    [(m) => { m.climates.splice(1, 0, { climate_zone: 'Arid', regions: ['africa'], plants: 0, interactions: 0 }); }, /the files hold Tropical, Mediterranean, Temperate/],
    [(m) => { m.climates[0].plants = 12; }, /Tropical has 11 plants, the manifest says 12/],
    [(m) => { delete m.try_references; }, /try_references is not/],
    [(m) => { delete m.source_credits; }, /source_credits is not/],
    [(m) => { m.files[0].counts.plants = 39; }, /plants has 38 rows, the manifest says 39/],
    [(m) => { m.generated_at = '2026-11-11'; }, /generated_at is not/],
  ];
  for (const [i, [edit, message]] of cases.entries()) {
    const src = await variant(w, `m${i}`, { manifest: edit });
    await assert.rejects(install({ ...w, src }), message, String(message));
  }
  assert.ok(!existsSync(w.out), 'nothing written');
});

test('without --fixture, the all-zeros canopi_db_sha256 of the fixture is refused before verify is asked', async (t) => {
  const w = workspace(t);
  let asked = false;
  await assert.rejects(install(w, { fixture: false, images: true, releaseCheck: () => { asked = true; return null; } }), /canopi_db_sha256 is all zeros/);
  assert.equal(asked, false);
});

test('the database file: its name, sha256, bytes, gzip magic, size budget and raw digest', async (t) => {
  const w = workspace(t);
  const rename = await variant(w, 'name', { after: (dir, m) => {
    const other = m.files[0].file.replace(/\.[0-9a-f]{12}\.sqlite\.gz$/, '.000000000000.sqlite.gz');
    cpSync(join(dir, m.files[0].file), join(dir, other)); rmSync(join(dir, m.files[0].file));
    m.files[0].file = other; writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
  } });
  await assert.rejects(install({ ...w, src: rename }), /is not named consortium-v3\.r-000000000000f1c7\.[0-9a-f]{12}\.sqlite\.gz/);
  const plain = await variant(w, 'plain', { after: (dir, m) => {
    const raw = readFileSync(join(dir, m.files[0].file));
    const notGz = Buffer.concat([Buffer.from('xx'), raw.subarray(2)]);
    writeFileSync(join(dir, m.files[0].file), notGz); m.files[0].sha256 = sha(notGz); writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
  } });
  await assert.rejects(install({ ...w, src: plain }), /is not gzip \(no 1f 8b magic\)/);
  const bytes = await variant(w, 'bytes', { manifest: (m) => { m.files[0].bytes += 1; } });
  await assert.rejects(install({ ...w, src: bytes }), /bytes, the manifest says/);
  const shaOff = await variant(w, 'sha', { manifest: (m) => { m.files[0].sha256 = 'f'.repeat(64); } });
  await assert.rejects(install({ ...w, src: shaOff }), /does not match the manifest's sha256/);
  const rawOff = await variant(w, 'raw', { manifest: (m) => { m.files[0].raw_bytes += 1; } });
  await assert.rejects(install({ ...w, src: rawOff }), /does not match the manifest's raw_sha256 and raw_bytes/);
  // Over the budget (refused before it is even gunzipped).
  const big = await variant(w, 'big', { after: (dir, m) => {
    const gz = Buffer.concat([readFileSync(join(dir, m.files[0].file)), Buffer.alloc(MAX_GZIP_BYTES)]);
    writeFileSync(join(dir, m.files[0].file), gz); m.files[0].sha256 = sha(gz); m.files[0].bytes = gz.length; writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
  } });
  await assert.rejects(install({ ...w, src: big }), /gzipped, over the 1000000 the page's budget allows/);
});

test('the database inside: application_id, user_version, schema columns, meta and contract rules', async (t) => {
  const w = workspace(t);
  const cases = [
    [{ userVersion: 2 }, /user_version is 2, not schema 3/],
    [{ applicationId: 7 }, /application_id is 7, not 1128484686/],
    [{ edit: (db) => db.exec('ALTER TABLE plants ADD COLUMN extra TEXT') }, /table plants has the columns .*extra, the schema says/],
    [{ edit: (db) => db.exec('CREATE TABLE extra (x)') }, /tables outside the schema: extra/],
    [{ edit: (db) => db.exec("UPDATE meta SET value = 'r-0000000000000000' WHERE key = 'release_id'") }, /meta\.release_id is "r-0000000000000000"/],
    [{ edit: (db) => db.exec("INSERT INTO plants (plant, id, canonical_name, genus, grown_as_annual) VALUES (99, '00000000-f1c7-4000-8000-000000000099', 'Plantus inventus', 'Plantus', 0)") }, /1 plants have no placement/],
    [{ edit: (db) => db.exec("DELETE FROM reason_texts WHERE reason IN (SELECT reason FROM placement_reasons WHERE plant = 1); DELETE FROM placement_reasons WHERE plant = 1") }, /placements have no reason/],
    [{ edit: (db) => db.exec("UPDATE sources SET url = 'javascript:alert(1)' WHERE id = 'pfaf'") }, /source pfaf has the url "javascript:alert\(1\)", not http\(s\)/],
    [{ edit: (db) => db.exec("UPDATE plant_images SET source_page_url = '//commons.wikimedia.org/x' WHERE plant = 1") }, /photo page "\/\/commons\.wikimedia\.org\/x" is not http\(s\)/],
    [{ edit: (db) => db.exec("INSERT INTO plant_invasive VALUES (1, 'TW', 'griis')") }, /Castanea sativa is invasive in TW, a country GRIIS did not check/],
    [{ edit: (db) => db.exec("UPDATE plants SET id = 'not-a-uuid' WHERE plant = 2") }, /plant id "not-a-uuid" is not a UUID/],
    // Schema 2: the climate range tables, their review state and the grid they were sampled from.
    [{ edit: (db) => db.exec('DROP TABLE plant_koppen') }, /table plant_koppen is missing/],
    [{ edit: (db) => db.exec("UPDATE meta SET value = 'reviewed' WHERE key = 'ranges_review'") }, /meta\.ranges_review is "reviewed"; this installer reads "estimate_not_reviewed" ranges only/],
    [{ edit: (db) => db.exec("DELETE FROM meta WHERE key = 'climate_grid_manifest_sha256'") }, /meta\.climate_grid_manifest_sha256 is undefined, not a sha256/],
    [{ edit: (db) => db.exec('DELETE FROM plant_climate WHERE plant = 1; DELETE FROM plant_koppen WHERE plant = 1; DELETE FROM plant_climate_status WHERE plant = 1') }, /1 plants have no plant_climate_status row/],
    [{ edit: (db) => db.exec("UPDATE plant_climate_status SET range_source = NULL, reason = 'no records' WHERE plant = 2") }, /Juglans regia has climate range rows but no range_source/],
  ];
  for (const [i, [opts, message]] of cases.entries()) {
    const src = await variant(w, `d${i}`, opts);
    await assert.rejects(install({ ...w, src }), message, String(message));
  }
  assert.ok(!existsSync(w.out), 'nothing written');
});

test('the TRY list and the source credits are checked as the site parses them', async (t) => {
  const w = workspace(t);
  const tryRows = await variant(w, 'try', { manifest: (m) => { m.try_references.rows = 4; } });
  await assert.rejects(install({ ...w, src: tryRows }), /3 rows, not the source's 4/);
  const ids = await variant(w, 'ids', { manifest: (m) => { m.try_references.dataset_ids = 3; } });
  await assert.rejects(install({ ...w, src: ids }), /2 DatasetIDs, not the source's 3/);
  const credits = await variant(w, 'credits', { after: (dir, m) => {
    const bad = FIXTURE_CREDITS.replace('\tused\n', '\tmaybe\n');
    writeFileSync(join(dir, 'source_credits.tsv'), bad); m.source_credits.sha256 = sha(Buffer.from(bad)); writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
  } });
  await assert.rejects(install({ ...w, src: credits }), /status "maybe" is not one of used, held, internal/);
  const rows = await variant(w, 'rows', { manifest: (m) => { m.source_credits.rows = 2; } });
  await assert.rejects(install({ ...w, src: rows }), /source_credits\.tsv has 3 rows, the manifest says 2/);
});

test('a real install writes src/data/: the index, the TRY list with its meta, the credits; --out and --fixture never do', async (t) => {
  const w = workspace(t);
  const src = await variant(w, 'real', { manifest: (m) => { m.canopi_db_sha256 = 'a'.repeat(64); } });
  mkdirSync(w.data);
  await install({ ...w, src }, { fixture: false, images: true, fetchImpl: photoFetch(), delayMs: 0, releaseCheck: () => null, dataDir: w.data });
  assert.deepEqual(readdirSync(w.data).sort(), ['consortium-index.json', 'source_credits.tsv', 'try_references.meta.json', 'try_references.tsv']);
  assert.equal(readFileSync(join(w.data, 'try_references.tsv'), 'utf8'), FIXTURE_TRY);
  assert.deepEqual(JSON.parse(readFileSync(join(w.data, 'try_references.meta.json'), 'utf8')), { sha256: sha(Buffer.from(FIXTURE_TRY)), rows: 3, dataset_ids: 2 });
  assert.equal(readFileSync(join(w.data, 'source_credits.tsv'), 'utf8'), FIXTURE_CREDITS);
  assert.ok(!existsSync(join(w.out, 'consortium-index.json')), 'the index is not served');
  const index = JSON.parse(readFileSync(join(w.data, 'consortium-index.json'), 'utf8'));
  assert.deepEqual(verifyInstall(w.out, index), { databases: 1, images: 6 });
  // The defaults: only the site's own folder writes src/data/.
  assert.equal(DATA_DIR, fileURLToPath(new URL('../src/data', import.meta.url)));
  assert.equal(INDEX_PATH, join(DATA_DIR, 'consortium-index.json'));
});

test('photos: thumbnails with the User-Agent, named by plant and digest, mapped in the index; the database keeps its urls', async (t) => {
  const w = workspace(t);
  const calls = [];
  await install(w, { images: true, fetchImpl: photoFetch(calls), delayMs: 0 });
  const index = JSON.parse(readFileSync(join(w.out, 'consortium-index.json'), 'utf8'));
  assert.equal(Object.keys(index.images).length, 6);
  assert.ok(calls.every((c) => c.ua === USER_AGENT));
  assert.ok(calls.some((c) => c.url.includes('/thumb/a/ab/Castanea_sativa_fixture.jpg/500px-')));
  assert.ok(calls.some((c) => c.url.endsWith('/photos/123456/medium.png')));
  const name = `00000000-f1c7-4000-8000-000000000001.${sha(JPEG).slice(0, 12)}.jpg`;
  assert.equal(index.images['00000000-f1c7-4000-8000-000000000001'], `/data/consortium/images/${name}`);
  assert.deepEqual(readFileSync(join(w.out, 'images', name)), JPEG);
  assert.deepEqual(verifyInstall(w.out, index), { databases: 1, images: 6 });
});

test('photos: a failed one is left out and listed; over 10% failing stops the install with nothing written', async (t) => {
  const w = workspace(t);
  const failing = (n) => photoFetch([], (url) => (n.some((s) => url.includes(s)) ? new Response('no', { status: 500 }) : new Response(JPEG, { headers: { 'content-type': 'image/jpeg' } })));
  const summary = await install(w, { images: true, fetchImpl: failing(['Olea']), delayMs: 0, maxFailedShare: 0.2 });
  assert.deepEqual(summary.photos.failed.map((f) => f.name), ['Olea europaea']);
  assert.equal(Object.keys(JSON.parse(readFileSync(join(w.out, 'consortium-index.json'), 'utf8')).images).length, 5);
  const w2 = workspace(t);
  await assert.rejects(install(w2, { images: true, fetchImpl: failing(['Olea', 'Malus']), delayMs: 0 }), /2 of 6 photos failed/);
  assert.ok(!existsSync(w2.out));
});

test('photos: a url that is not http(s) is never fetched, and that plant has no photo', async (t) => {
  const w = workspace(t);
  w.src = await variant(w, 'proto', { edit: (db) => db.exec("UPDATE plant_images SET url = '//upload.wikimedia.org/x.jpg' WHERE plant = 1") });
  const calls = [];
  const summary = await install(w, { images: true, fetchImpl: photoFetch(calls), delayMs: 0 });
  assert.equal(summary.photos.skipped, 1);
  assert.ok(!calls.some((c) => c.url.includes('x.jpg')));
  assert.ok(!('00000000-f1c7-4000-8000-000000000001' in JSON.parse(readFileSync(join(w.out, 'consortium-index.json'), 'utf8')).images));
});

test('thumbnailUrl: Commons and iNaturalist originals become 500 px copies; svg and tif get their suffix; others are null', () => {
  assert.equal(thumbnailUrl('https://upload.wikimedia.org/wikipedia/commons/a/ab/X_y.jpg'), 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/X_y.jpg/500px-X_y.jpg');
  assert.equal(thumbnailUrl('https://upload.wikimedia.org/wikipedia/commons/a/ab/X.svg'), 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/X.svg/500px-X.svg.png');
  assert.equal(thumbnailUrl('https://upload.wikimedia.org/wikipedia/commons/a/ab/X.tif'), 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/X.tif/500px-X.tif.jpg');
  assert.equal(thumbnailUrl('https://inaturalist-open-data.s3.amazonaws.com/photos/9/original.jpeg'), 'https://inaturalist-open-data.s3.amazonaws.com/photos/9/medium.jpeg');
  assert.equal(thumbnailUrl('https://example.org/x.jpg'), null);
});

test('databaseName: schema, release, 12 hex digits of the raw database, and the climate when split', () => {
  assert.equal(databaseName('r-0123456789abcdef', 'ab'.repeat(32)), 'consortium-v3.r-0123456789abcdef.abababababab.sqlite.gz');
  assert.equal(databaseName('r-0123456789abcdef', 'ab'.repeat(32), 'Tropical'), 'consortium-v3.r-0123456789abcdef.tropical.abababababab.sqlite.gz');
});

test('verifyInstall: a stray file, a changed database, a missing photo and a broken index fail', async (t) => {
  const w = workspace(t);
  await install(w, { images: true, fetchImpl: photoFetch(), delayMs: 0 });
  const index = JSON.parse(readFileSync(join(w.out, 'consortium-index.json'), 'utf8'));
  writeFileSync(join(w.out, 'temperate.json'), '{}');
  assert.throws(() => verifyInstall(w.out, index), /files the index does not name: temperate\.json/);
  rmSync(join(w.out, 'temperate.json'));
  const photo = Object.values(index.images)[0].split('/').pop();
  rmSync(join(w.out, 'images', photo));
  assert.throws(() => verifyInstall(w.out, index), /images\/.* is missing/);
  writeFileSync(join(w.out, 'images', photo), JPEG);
  writeFileSync(join(w.out, index.files[0].file), gzipSync('x'));
  assert.throws(() => verifyInstall(w.out, index), /does not match the index's sha256/);
  assert.throws(() => verifyInstall(w.out, { ...index, images: { x: '/data/consortium/images/a.jpg' } }), /not a plant UUID/);
  assert.throws(() => verifyInstall(w.out, { ...index, release_id: 'r-1' }), /release_id "r-1"/);
  assert.throws(() => verifyInstall(w.out, { ...index, climate_grid_manifest_sha256: undefined }), /climate_grid_manifest_sha256/);
});

test('verifyInstall: the committed public/data/consortium/ matches the committed index', () => {
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  const counts = verifyInstall(DEFAULT_OUT, index);
  assert.ok(counts.databases === 1 && counts.images > 150, JSON.stringify(counts));
  assert.notEqual(index.canopi_db_sha256, '0'.repeat(64), 'a real install, never the fixture');
});

test('--fixture never reaches the site; --no-images needs --fixture; staging lives in git-ignored .cache/', async (t) => {
  const w = workspace(t);
  await assert.rejects(install(w, { outDir: join(DEFAULT_OUT, 'x') }), /never installs into the site/);
  await assert.rejects(install(w, { fixture: false }), /--no-images is allowed only with --fixture/);
  assert.equal(stagingDirFor(DEFAULT_OUT), STAGING_DIR);
  assert.match(readFileSync(new URL('../.gitignore', import.meta.url), 'utf8'), /^\.cache\/?$/m);
});

test('release verify: a refusal stops a real install before any photo or write, showing its message', async (t) => {
  const w = workspace(t);
  const src = await variant(w, 'real', { manifest: (m) => { m.canopi_db_sha256 = 'a'.repeat(64); } });
  const calls = [];
  await assert.rejects(install({ ...w, src }, { fixture: false, images: true, fetchImpl: photoFetch(calls), releaseCheck: () => 'stale release', dataDir: w.data }), /stale release/);
  assert.equal(calls.length, 0);
  assert.ok(!existsSync(w.out) && !existsSync(w.data));
});

test('release verify: runs `uv run canopi release verify <dir>` from the canopi-data root; exit 0 may install, anything else refuses', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'fake-uv-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const fake = (code, out) => { writeFileSync(join(bin, 'uv'), `#!/bin/sh\necho "$PWD $*"\necho "${out}" >&2\nexit ${code}\n`); chmodSync(join(bin, 'uv'), 0o755); };
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  fake(0, 'fine');
  const said = [];
  assert.equal(releaseVerifyProblem('/x/export', { root, env, log: (m) => said.push(m) }), null);
  assert.match(said[0], new RegExp(`^${root} run canopi release verify /x/export`));
  fake(3, 'disagreement');
  assert.match(releaseVerifyProblem('/x/export', { root, env, log: quiet }), /exited 3:[\s\S]*disagreement/);
  assert.match(releaseVerifyProblem('/x/export', { root: join(root, 'none'), env, log: quiet }), /canopi-data was not found/);
  if (!process.env.CANOPI_DATA_DIR) assert.equal(CANOPI_DATA_DIR, fileURLToPath(new URL('../../canopi-data', import.meta.url)));
});

test('the command line: a real export is refused when verify cannot say yes, and nothing is written', (t) => {
  const w = workspace(t);
  const run = spawnSync(process.execPath, [script, w.src, '--out', w.out], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Consortium export refused: canopi_db_sha256 is all zeros/);
  assert.ok(!existsSync(w.out));
});
