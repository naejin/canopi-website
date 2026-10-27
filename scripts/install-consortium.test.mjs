// The consortium export installer (scripts/install-consortium.mjs): the fixture installs with
// --fixture into a temporary directory (never public/), and each broken export is refused before
// anything is written. Photos are downloaded through a stub fetch; nothing here uses the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installConsortium, thumbnailUrl, shapeErrors, cellShape, USER_AGENT } from './install-consortium.mjs';

const fixture = fileURLToPath(new URL('fixtures/consortium/', import.meta.url));
const script = fileURLToPath(new URL('install-consortium.mjs', import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const quiet = () => {};

// A scratch copy of the fixture to break, and an output directory beside it.
function workspace(t) {
  const root = mkdtempSync(join(tmpdir(), 'consortium-install-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const src = join(root, 'export'), out = join(root, 'out');
  cpSync(fixture, src, { recursive: true });
  const json = (name) => JSON.parse(readFileSync(join(src, name), 'utf8'));
  // Rewrites a file and, unless told not to, keeps SHA256SUMS (and the manifest's sha256 of a cell) in step.
  const write = (name, value, { sums = true } = {}) => {
    const bytes = typeof value === 'string' ? value : JSON.stringify(value);
    writeFileSync(join(src, name), bytes);
    if (name !== 'manifest.json' && sums) {
      const manifest = json('manifest.json');
      const entry = manifest.cells.find((c) => c.file === name);
      if (entry) { entry.sha256 = sha(bytes); write('manifest.json', JSON.stringify(manifest, null, 2)); }
    }
    if (sums) {
      const lines = readFileSync(join(src, 'SHA256SUMS'), 'utf8').trim().split('\n').map((l) => (l.endsWith(`  ${name}`) ? `${sha(readFileSync(join(src, name)))}  ${name}` : l));
      writeFileSync(join(src, 'SHA256SUMS'), `${lines.join('\n')}\n`);
    }
  };
  return { root, src, out, json, write };
}

const install = (w, opts = {}) => installConsortium({ exportDir: w.src, outDir: w.out, fixture: true, images: false, log: quiet, ...opts });

test('the fixture installs with --fixture --no-images --out, byte for byte, with its SHA256SUMS', (t) => {
  const w = workspace(t);
  mkdirSync(w.out);
  writeFileSync(join(w.out, 'stale.json'), '{}');
  const stdout = execFileSync(process.execPath, [script, w.src, '--fixture', '--no-images', '--out', w.out], { encoding: 'utf8' });
  assert.match(stdout, /Installed 3 consortium cells/);
  assert.deepEqual(readdirSync(w.out).sort(), ['SHA256SUMS', 'labels.json', 'manifest.json', 'mediterranean-europe.json', 'temperate-europe.json', 'tropical-southern-america.json']);
  for (const name of ['manifest.json', 'labels.json', 'temperate-europe.json']) assert.deepEqual(readFileSync(join(w.out, name)), readFileSync(join(fixture, name)), name);
  for (const line of readFileSync(join(w.out, 'SHA256SUMS'), 'utf8').trim().split('\n')) {
    const [hash, name] = line.split('  ');
    assert.equal(sha(readFileSync(join(w.out, name))), hash, name);
  }
  assert.ok(!readdirSync(w.root).some((d) => /\.(tmp|old)-/.test(d)), 'no temporary directory left');
});

test('without --fixture, the all-zeros canopi_db_sha256 of the fixture is refused', (t) => {
  const w = workspace(t);
  const run = spawnSync(process.execPath, [script, w.src, '--no-images', '--out', w.out], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /canopi_db_sha256 is all zeros/);
  assert.equal(existsSync(w.out), false);
});

test('a file that does not match SHA256SUMS is refused', async (t) => {
  const w = workspace(t);
  const cell = w.json('temperate-europe.json');
  cell.taxa[0].names.en = 'Changed';
  w.write('temperate-europe.json', cell, { sums: false });
  await assert.rejects(install(w), /temperate-europe\.json does not match its SHA256SUMS checksum/);
  assert.equal(existsSync(w.out), false);
});

test('an unlisted json file, or a listed file that is missing, is refused', async (t) => {
  const w = workspace(t);
  writeFileSync(join(w.src, 'extra.json'), '{}');
  await assert.rejects(install(w), /unlisted files: extra\.json/);
  rmSync(join(w.src, 'extra.json'));
  rmSync(join(w.src, 'labels.json'));
  await assert.rejects(install(w), /labels\.json is listed in SHA256SUMS but missing/);
});

test('a manifest whose format_version is not 2 is refused', async (t) => {
  const w = workspace(t);
  const manifest = w.json('manifest.json');
  manifest.format_version = 1;
  w.write('manifest.json', manifest);
  await assert.rejects(install(w), /format_version is 1, not 2/);
});

test('a cell whose sha256 differs from the manifest is refused', async (t) => {
  const w = workspace(t);
  const manifest = w.json('manifest.json');
  manifest.cells[0].sha256 = 'f'.repeat(64);
  w.write('manifest.json', manifest);
  await assert.rejects(install(w), /does not match the manifest's sha256/);
});

test('a cell missing a required key is refused, naming the key', async (t) => {
  const w = workspace(t);
  const cell = w.json('tropical-southern-america.json');
  delete cell.taxa[2].traits.sun;
  w.write('tropical-southern-america.json', cell);
  await assert.rejects(install(w), /taxa\[2\]\.traits: misses required key "sun"/);
});

test('taxa or interactions counts that differ from the manifest are refused', async (t) => {
  const w = workspace(t);
  const manifest = w.json('manifest.json');
  manifest.cells.find((c) => c.file === 'temperate-europe.json').taxa = 13;
  w.write('manifest.json', manifest);
  await assert.rejects(install(w), /has 12 taxa, the manifest says 13/);
  manifest.cells.find((c) => c.file === 'temperate-europe.json').taxa = 12;
  manifest.cells.find((c) => c.file === 'temperate-europe.json').interactions = 0;
  w.write('manifest.json', manifest);
  await assert.rejects(install(w), /has 3 interactions, the manifest says 0/);
});

test('the shape check: types, enums, nulls where allowed, extra keys accepted', () => {
  const cell = JSON.parse(readFileSync(join(fixture, 'temperate-europe.json'), 'utf8'));
  assert.deepEqual(shapeErrors(cell, cellShape), []);
  const broken = structuredClone(cell);
  broken.taxa[0].role = 'weed';
  broken.taxa[1].traits.edibility_rating = 2.5;
  broken.taxa[2].stratum = { value: 'high', sources: [] };
  broken.taxa[3].id = 'not-a-uuid';
  broken.interactions[0].severity = 'extreme';
  broken.taxa[4].future_field = 'allowed';
  delete broken.taxa[5].reason;
  assert.deepEqual(shapeErrors(broken, cellShape).map((e) => e.split(':')[0]), [
    '$.taxa[0].role', '$.taxa[1].traits.edibility_rating', '$.taxa[2].stratum.sources', '$.taxa[3].id', '$.interactions[0].severity',
  ]);
});

test('thumbnailUrl: Commons and iNaturalist originals become 500 px thumbnails (a standard Commons width); svg and tif get their suffix; others are null', () => {
  const c = 'https://upload.wikimedia.org/wikipedia/commons';
  assert.equal(thumbnailUrl(`${c}/a/a6/2006-12-01Acanthus03.jpg`), `${c}/thumb/a/a6/2006-12-01Acanthus03.jpg/500px-2006-12-01Acanthus03.jpg`);
  assert.equal(thumbnailUrl(`${c}/2/2b/%28abelmoschus%29_leaf.JPEG`), `${c}/thumb/2/2b/%28abelmoschus%29_leaf.JPEG/500px-%28abelmoschus%29_leaf.JPEG`);
  assert.equal(thumbnailUrl(`${c}/4/41/Map.svg`), `${c}/thumb/4/41/Map.svg/500px-Map.svg.png`);
  assert.equal(thumbnailUrl(`${c}/4/41/Scan.tif`), `${c}/thumb/4/41/Scan.tif/500px-Scan.tif.jpg`);
  assert.equal(thumbnailUrl(`${c}/4/41/Scan.TIFF`), `${c}/thumb/4/41/Scan.TIFF/500px-Scan.TIFF.jpg`);
  assert.equal(thumbnailUrl(`${c}/4/41/Leaf.png`), `${c}/thumb/4/41/Leaf.png/500px-Leaf.png`);
  assert.equal(thumbnailUrl(`${c}/a/a6/X.jpg`, 960), `${c}/thumb/a/a6/X.jpg/960px-X.jpg`);
  assert.equal(thumbnailUrl(`${c}/thumb/a/a6/X.jpg/500px-X.jpg`), null, 'already a thumbnail');
  assert.equal(thumbnailUrl(`${c}/a/b6/X.jpg`), null, 'the second directory starts with the first');
  const inat = 'https://inaturalist-open-data.s3.amazonaws.com/photos';
  assert.equal(thumbnailUrl(`${inat}/4669074/original.jpeg`), `${inat}/4669074/medium.jpeg`, 'iNaturalist: the 500 px medium size');
  assert.equal(thumbnailUrl(`${inat}/37014/original.jpg`), `${inat}/37014/medium.jpg`);
  assert.equal(thumbnailUrl(`${inat}/1/medium.jpg`), null, 'already small');
  assert.equal(thumbnailUrl('https://example.org/photo.jpg'), null);
});

// Gives the fixture photos: two Commons originals and an iNaturalist one, on one taxon in two cells.
function withPhotos(w) {
  const photos = {
    'Inga edulis': 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Inga.jpg',
    'Musa acuminata': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Musa.svg',
    'Arachis pintoi': 'https://inaturalist-open-data.s3.amazonaws.com/photos/9/medium.jpeg',
    'Carica papaya': 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Papaya.jpg',
  };
  const cell = w.json('tropical-southern-america.json');
  for (const t of cell.taxa) if (photos[t.canonical_name]) t.image = { url: photos[t.canonical_name], credit: 'Someone', licence: 'CC BY 4.0', source_page_url: 'https://commons.wikimedia.org/wiki/File:X.jpg' };
  w.write('tropical-southern-america.json', cell);
  return cell;
}

const stubFetch = (calls, { fail = [] } = {}) => async (url, init) => {
  calls.push({ url, ua: init.headers['User-Agent'] });
  if (fail.some((f) => url.includes(f))) return new Response('no', { status: 404 });
  const type = url.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return new Response(new Uint8Array([1, 2, 3, url.length % 256]), { status: 200, headers: { 'content-type': type } });
};

test('photos: thumbnails downloaded with the User-Agent, urls rewritten, checksums recomputed', async (t) => {
  const w = workspace(t);
  withPhotos(w);
  const calls = [];
  const summary = await install(w, { images: true, fetchImpl: stubFetch(calls), delayMs: 0, backoffMs: 0 });
  assert.equal(summary.photos.downloaded, 4);
  assert.ok(calls.every((c) => c.ua === USER_AGENT));
  assert.ok(calls.some((c) => c.url.endsWith('/thumb/a/a6/Inga.jpg/500px-Inga.jpg')));
  assert.ok(calls.some((c) => c.url.endsWith('/thumb/b/b1/Musa.svg/500px-Musa.svg.png')));
  const cell = JSON.parse(readFileSync(join(w.out, 'tropical-southern-america.json'), 'utf8'));
  const inga = cell.taxa.find((x) => x.canonical_name === 'Inga edulis'), musa = cell.taxa.find((x) => x.canonical_name === 'Musa acuminata');
  assert.equal(inga.image.url, `/data/consortium/images/${inga.id}.jpg`);
  assert.equal(musa.image.url, `/data/consortium/images/${musa.id}.png`);
  assert.equal(inga.image.credit, 'Someone', 'credit and licence stay');
  assert.ok(existsSync(join(w.out, 'images', `${inga.id}.jpg`)));
  const manifest = JSON.parse(readFileSync(join(w.out, 'manifest.json'), 'utf8'));
  const entry = manifest.cells.find((c) => c.file === 'tropical-southern-america.json');
  assert.equal(entry.sha256, sha(readFileSync(join(w.out, entry.file))));
  const sums = readFileSync(join(w.out, 'SHA256SUMS'), 'utf8');
  assert.match(sums, new RegExp(`${entry.sha256}  tropical-southern-america\\.json`));
  assert.match(sums, new RegExp(`images/${inga.id}\\.jpg`));
});

test('photos: a failed photo becomes image: null and is listed; over 10% failing stops the install', async (t) => {
  const w = workspace(t);
  withPhotos(w);
  // One of four fails on both its thumbnail and its original: 25%, too many.
  await assert.rejects(install(w, { images: true, fetchImpl: stubFetch([], { fail: ['Papaya'] }), delayMs: 0, backoffMs: 0 }), /1 of 4 photos failed/);
  assert.equal(existsSync(w.out), false);
  // Give 11 taxa a photo so one failure is under 10%.
  const cell = w.json('tropical-southern-america.json');
  cell.taxa.forEach((x, i) => { if (i < 11) x.image = { url: `https://upload.wikimedia.org/wikipedia/commons/d/d${i % 10}/P${i}.jpg`, credit: null, licence: null, source_page_url: null }; });
  w.write('tropical-southern-america.json', cell);
  const summary = await install(w, { images: true, fetchImpl: stubFetch([], { fail: ['P3.jpg'] }), delayMs: 0, backoffMs: 0 });
  assert.deepEqual(summary.photos.failed.map((f) => f.name), [cell.taxa[3].canonical_name]);
  const installed = JSON.parse(readFileSync(join(w.out, 'tropical-southern-america.json'), 'utf8'));
  assert.equal(installed.taxa[3].image, null);
  assert.ok(installed.taxa[4].image.url.startsWith('/data/consortium/images/'));
});

test('photos: a narrow original with no thumbnail falls back to the original', async (t) => {
  const w = workspace(t);
  withPhotos(w);
  const calls = [];
  const summary = await install(w, { images: true, fetchImpl: stubFetch(calls, { fail: ['500px-Papaya'] }), delayMs: 0, backoffMs: 0 });
  assert.equal(summary.photos.failed.length, 0);
  assert.ok(calls.some((c) => c.url === 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Papaya.jpg'));
});

test('photos: rate limiting is waited out, and a limited thumbnail never falls back to the full-size original', async (t) => {
  const inga = 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Inga.jpg';
  // The Inga thumbnail answers 429 `limit` times, then the photo.
  const run = async (limit) => {
    const w = workspace(t);
    withPhotos(w);
    const urls = [];
    let left = limit;
    const fetchImpl = async (url, init) => {
      urls.push(url);
      if (url.endsWith('500px-Inga.jpg') && left-- > 0) return new Response('slow down', { status: 429 });
      return stubFetch([])(url, init);
    };
    const result = await install(w, { images: true, fetchImpl, delayMs: 0, backoffMs: 0 }).catch((err) => err);
    return { result, inga: urls.filter((u) => u.includes('Inga')) };
  };
  const twice = await run(2);
  assert.equal(twice.result.photos.failed.length, 0);
  assert.equal(twice.inga.length, 3, 'two 429s, then the thumbnail');
  const always = await run(Infinity);
  assert.match(always.result.message, /1 of 4 photos failed/);
  assert.equal(always.inga.length, 5, 'the first request and four retries');
  assert.ok(!always.inga.includes(inga), 'the original is not tried');
});
