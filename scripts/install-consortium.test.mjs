// The consortium export installer (scripts/install-consortium.mjs): the fixture installs with
// --fixture into a temporary directory (never public/), and each broken export is refused before
// anything is written. Photos are downloaded through a stub fetch; nothing here uses the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installConsortium, verifyInstall, thumbnailUrl, shapeErrors, cellShape, USER_AGENT, DEFAULT_OUT, STAGING_DIR, stagingDirFor } from './install-consortium.mjs';

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
  writeFileSync(join(w.out, 'manifest.json'), '{"format_version":2}'); // a previous install, by its mark
  writeFileSync(join(w.out, 'INSTALLED_BY'), 'scripts/install-consortium.mjs (canopi-website)\n');
  writeFileSync(join(w.out, 'stale.json'), '{}');
  const stdout = execFileSync(process.execPath, [script, w.src, '--fixture', '--no-images', '--out', w.out], { encoding: 'utf8' });
  assert.match(stdout, /Installed 3 consortium cells/);
  assert.deepEqual(readdirSync(w.out).sort(), ['INSTALLED_BY', 'SHA256SUMS', 'labels.json', 'manifest.json', 'mediterranean-europe.json', 'temperate-europe.json', 'tropical-southern-america.json']);
  for (const name of ['manifest.json', 'labels.json', 'temperate-europe.json']) assert.deepEqual(readFileSync(join(w.out, name)), readFileSync(join(fixture, name)), name);
  for (const line of readFileSync(join(w.out, 'SHA256SUMS'), 'utf8').trim().split('\n')) {
    const [hash, name] = line.split('  ');
    assert.equal(sha(readFileSync(join(w.out, name))), hash, name);
  }
  assert.ok(!readdirSync(w.root).some((d) => /\.(tmp|old)-/.test(d)), 'no temporary directory left');
});

test('without --fixture, the all-zeros canopi_db_sha256 of the fixture is refused', (t) => {
  const w = workspace(t);
  const run = spawnSync(process.execPath, [script, w.src, '--out', w.out], { encoding: 'utf8' });
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

// A stub that behaves like fetch about redirects: with redirect 'follow' it follows them itself,
// with 'manual' it answers the 3xx. Every response is recorded, to check its body was read or cancelled.
const redirecting = (routes, seen) => async function fetchImpl(url, init) {
  seen.urls.push(url);
  const route = routes(url);
  const res = route.location
    ? new Response(null, { status: 302, headers: { location: route.location } })
    : route.response();
  seen.responses.push(res);
  if (route.location && init.redirect === 'follow') return fetchImpl(new URL(route.location, url).href, init);
  return res;
};

test('photos: a body over 3 MB is cut off while it streams, and a large content-length is refused unread', async (t) => {
  const w = workspace(t);
  withPhotos(w);
  let pulled = 0;
  const huge = () => new Response(new ReadableStream({
    pull(c) { if (pulled >= 50 * 2 ** 20) return c.close(); pulled += 2 ** 16; c.enqueue(new Uint8Array(2 ** 16)); },
  }), { status: 200, headers: { 'content-type': 'image/jpeg' } });
  const seen = { urls: [], responses: [] };
  const fetchImpl = redirecting((url) => ({ response: url.includes('Inga') ? huge : url.includes('Musa') ? () => new Response('x', { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(4 * 2 ** 20) } }) : () => new Response(new Uint8Array([1, 2]), { status: 200, headers: { 'content-type': 'image/jpeg' } }) }), seen);
  const result = await install(w, { images: true, fetchImpl, delayMs: 0, backoffMs: 0 }).catch((err) => err);
  assert.match(result.message, /2 of 4 photos failed/);
  assert.ok(pulled <= 3 * 2 ** 20 + 2 * 2 ** 16, `${pulled} bytes read`);
  assert.ok(seen.responses.every((r) => r.bodyUsed || r.body === null), 'every body read or cancelled');
});

test('photos: redirects are followed only to the same host or the photo hosts; other bodies are cancelled before a retry', async (t) => {
  const w = workspace(t);
  withPhotos(w);
  const ok = () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/jpeg' } });
  let limited = 1;
  const seen = { urls: [], responses: [] };
  const fetchImpl = redirecting((url) => {
    if (url.includes('500px-Inga')) return { location: 'https://evil.example/big.jpg' };
    if (url.endsWith('500px-Musa.svg.png')) return { location: '/wikipedia/commons/thumb/b/b1/Musa.svg/500px-moved.png' };
    if (url.endsWith('/photos/9/medium.jpeg')) return { location: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Arachis.jpg' };
    if (url.includes('Papaya') && limited-- > 0) return { response: () => new Response('slow down', { status: 429 }) };
    return { response: ok };
  }, seen);
  const summary = await install(w, { images: true, fetchImpl, delayMs: 0, backoffMs: 0, maxFailedShare: 1 });
  assert.ok(!seen.urls.some((u) => u.includes('evil.example')), 'another host is never requested');
  assert.deepEqual(summary.photos.failed.map((f) => f.name), ['Inga edulis']);
  assert.ok(seen.urls.includes('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Musa.svg/500px-moved.png'), 'same host');
  assert.ok(seen.urls.includes('https://upload.wikimedia.org/wikipedia/commons/9/99/Arachis.jpg'), 'a photo host');
  assert.ok(seen.responses.every((r) => r.bodyUsed || r.body === null), 'every body read or cancelled');
});

test('photos: an image url that is not http(s) is installed as image: null, with or without downloads', async (t) => {
  for (const images of [true, false]) {
    const w = workspace(t);
    const cell = withPhotos(w);
    const odd = { 'Inga edulis': '//cdn.example/x.jpg', 'Musa acuminata': 'data:image/png;base64,AAAA', 'Carica papaya': 'ftp://example.org/p.jpg' };
    for (const x of cell.taxa) if (odd[x.canonical_name]) x.image.url = odd[x.canonical_name];
    w.write('tropical-southern-america.json', cell);
    const seen = [];
    await install(w, { images, fetchImpl: stubFetch(seen), delayMs: 0, backoffMs: 0 });
    const installed = JSON.parse(readFileSync(join(w.out, 'tropical-southern-america.json'), 'utf8'));
    for (const name of Object.keys(odd)) assert.equal(installed.taxa.find((x) => x.canonical_name === name).image, null, `${name}, images ${images}`);
    assert.ok(!seen.some((c) => !/^https:/.test(c.url)));
    const left = installed.taxa.filter((x) => x.image).map((x) => x.image.url);
    assert.ok(left.every((u) => u.startsWith('/data/consortium/images/') || !images), 'downloads rewrite every remaining url');
    const manifest = JSON.parse(readFileSync(join(w.out, 'manifest.json'), 'utf8'));
    assert.equal(manifest.cells.find((c) => c.file === 'tropical-southern-america.json').sha256, sha(readFileSync(join(w.out, 'tropical-southern-america.json'))));
  }
});

test('--out refuses a canopi-data export, and the export directory itself, so neither is ever replaced', async (t) => {
  const w = workspace(t);
  const other = join(w.out, '..', 'another-export');
  cpSync(w.src, other, { recursive: true });
  await assert.rejects(install({ ...w, out: other }), /holds no consortium install/, 'an export has a format 2 manifest too');
  assert.ok(existsSync(join(other, 'SHA256SUMS')));
  await assert.rejects(install({ ...w, out: w.src }), /export directory/);
  await assert.rejects(install({ ...w, out: join(w.src, 'inside') }), /export directory/);
  await install(w);
  symlinkSync(w.out, join(w.root, 'alias'));
  await assert.rejects(install({ ...w, src: join(w.root, 'alias') }), /export directory/, 'a symlink to the output is the output');
  assert.ok(existsSync(join(w.src, 'manifest.json')));
});

test('--no-images is allowed only with --fixture, so a real install never keeps remote photo urls', async (t) => {
  const w = workspace(t);
  const run = spawnSync(process.execPath, [script, w.src, '--no-images', '--out', w.out], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /--no-images.*--fixture/);
  await assert.rejects(installConsortium({ exportDir: w.src, outDir: w.out, images: false, log: quiet }), /--no-images.*--fixture/);
  assert.equal(existsSync(w.out), false);
});

test('--out refuses a non-empty directory that holds no consortium install, and leaves it untouched', async (t) => {
  const w = workspace(t);
  mkdirSync(join(w.out, 'keepme'), { recursive: true });
  writeFileSync(join(w.out, 'keepme', 'precious'), 'mine');
  await assert.rejects(install(w), /is not empty and holds no consortium install/);
  assert.equal(readFileSync(join(w.out, 'keepme', 'precious'), 'utf8'), 'mine');
  writeFileSync(join(w.out, 'manifest.json'), '{"format_version":1}');
  await assert.rejects(install(w), /holds no consortium install/, 'another format is not ours either');
  rmSync(w.out, { recursive: true });
  mkdirSync(w.out);
  await install(w);
  assert.ok(existsSync(join(w.out, 'manifest.json')), 'an empty directory is fine');
});

test('staging lives outside public/ (git-ignored .cache/), and what a killed run leaves is cleaned on the next run', async (t) => {
  assert.equal(stagingDirFor(DEFAULT_OUT), STAGING_DIR);
  assert.ok(!STAGING_DIR.includes(`${join('public', '')}`), STAGING_DIR);
  const root = fileURLToPath(new URL('..', import.meta.url));
  assert.equal(spawnSync('git', ['check-ignore', '-q', join(STAGING_DIR, 'x')], { cwd: root }).status, 0, 'git-ignored');
  const w = workspace(t);
  const staging = join(w.root, 'staging');
  mkdirSync(join(staging, 'new-999'), { recursive: true });
  mkdirSync(join(w.root, 'out.tmp-999'));
  mkdirSync(join(w.root, 'out.old-998'));
  await install(w, { stagingDir: staging });
  assert.deepEqual(existsSync(staging) ? readdirSync(staging) : [], [], 'stale staging removed');
  assert.ok(!readdirSync(w.root).some((d) => /\.(tmp|old)-/.test(d)), 'old sibling folders removed');
  assert.ok(existsSync(join(w.out, 'manifest.json')));
});

test('the shape check holds edibility to 0–5 and names, reasons and notes to the 11 site locales', () => {
  const cell = JSON.parse(readFileSync(join(fixture, 'temperate-europe.json'), 'utf8'));
  const broken = structuredClone(cell);
  broken.taxa[0].traits.edibility_rating = 50;
  broken.taxa[1].traits.edibility_rating = -1;
  broken.taxa[2].names.la = 'Malus';
  broken.taxa[3].reason = { en: 'Fine.', xx: 'No.' };
  broken.interactions[0].note = { en: 'Fine.', klingon: 'No.' };
  assert.deepEqual(shapeErrors(broken, cellShape).map((e) => e.split(':')[0]), [
    '$.taxa[0].traits.edibility_rating', '$.taxa[1].traits.edibility_rating', '$.taxa[2].names', '$.taxa[3].reason', '$.interactions[0].note',
  ]);
  const fine = structuredClone(cell);
  fine.taxa[0].traits.edibility_rating = 5;
  fine.taxa[1].traits.edibility_rating = 0;
  fine.taxa[2].names = { ru: 'Яблоня', zh: '苹果' };
  assert.deepEqual(shapeErrors(fine, cellShape), []);
});

test('labels.json must be trait → English value → locale → text, as the format describes', async (t) => {
  for (const [labels, problem] of [
    ['[]', /labels\.json: is not an object/],
    ['null', /labels\.json: is null/],
    ['{"bloom_period":{"Late Spring":"Fin du printemps"}}', /labels\.json\.bloom_period\.Late Spring: is not an object/],
    ['{"bloom_period":{"Late Spring":{"la":"Ver"}}}', /labels\.json\.bloom_period\.Late Spring: has a key "la"/],
    ['{"bloom_period":{"Late Spring":{"fr":3}}}', /labels\.json\.bloom_period\.Late Spring\.fr: is not a string/],
  ]) {
    const w = workspace(t);
    w.write('labels.json', labels);
    await assert.rejects(install(w), problem, labels);
    assert.equal(existsSync(w.out), false);
  }
});

test('a source url or a photo page url that is not http(s) is refused, so no data link can run script (prepush m1)', async (t) => {
  const bad = ['javascript:alert(document.domain)', 'javascript://commons.wikimedia.org/%0aalert(1)', 'data:text/html,x', '//example.org/x', 'vbscript:x', ' javascript:x', 'example.org/page'];
  for (const url of bad) {
    const w = workspace(t);
    const cell = w.json('temperate-europe.json');
    const id = Object.keys(cell.sources).find((k) => cell.sources[k].url);
    cell.sources[id].url = url;
    w.write('temperate-europe.json', cell);
    await assert.rejects(install(w), new RegExp(`sources\\.${id}\\.url: .*is not an http\\(s\\) URL`), url);
    assert.equal(existsSync(w.out), false);
  }
  for (const url of bad) {
    const w = workspace(t);
    const cell = withPhotos(w);
    cell.taxa.find((x) => x.image).image.source_page_url = url;
    w.write('tropical-southern-america.json', cell);
    await assert.rejects(install(w), /image\.source_page_url: .*is not an http\(s\) URL/, url);
  }
  // http, https and null pass.
  const cell = JSON.parse(readFileSync(join(fixture, 'temperate-europe.json'), 'utf8'));
  const id = Object.keys(cell.sources)[0];
  for (const url of ['https://example.org/a', 'http://example.org/b', 'HTTPS://EXAMPLE.ORG/C', null]) {
    cell.sources[id].url = url;
    assert.deepEqual(shapeErrors(cell, cellShape), [], String(url));
  }
});

// An installed directory as the site serves it, with its photos (prepush m2): what the built-site
// check verifies under dist/client/data/consortium/.
async function installed(t) {
  const w = workspace(t);
  withPhotos(w);
  await install(w, { images: true, fetchImpl: stubFetch([]), delayMs: 0, backoffMs: 0 });
  const json = (name) => JSON.parse(readFileSync(join(w.out, name), 'utf8'));
  const put = (name, value) => writeFileSync(join(w.out, name), JSON.stringify(value));
  return { ...w, json, put };
}

test('verifyInstall: a whole install passes, and so does the committed public/data/consortium/', async (t) => {
  const w = await installed(t);
  assert.deepEqual(verifyInstall(w.out, { fixture: true }), { cells: 3, images: 4 });
  const real = verifyInstall(DEFAULT_OUT);
  assert.ok(real.cells >= 3 && real.images > 100, JSON.stringify(real));
  assert.throws(() => verifyInstall(w.out), /canopi_db_sha256 is all zeros/, 'the fixture is never a real install');
});

test('verifyInstall: the reviewer\'s broken installs fail (prepush m2)', async (t) => {
  const cases = [
    ['no photos', (w) => rmSync(join(w.out, 'images'), { recursive: true }), /images\/[0-9a-f-]+\.(jpg|png) is missing/],
    ['format_version 3', (w) => { const c = w.json('temperate-europe.json'); c.format_version = 3; w.put('temperate-europe.json', c); }, /temperate-europe\.json does not match the manifest's sha256|format_version/],
    ['format_version 3, checksums redone', (w) => { const c = w.json('temperate-europe.json'); c.format_version = 3; w.put('temperate-europe.json', c); resum(w, 'temperate-europe.json'); }, /format_version: 3 is not one of 2/],
    ['no interactions', (w) => { const c = w.json('temperate-europe.json'); delete c.interactions; w.put('temperate-europe.json', c); resum(w, 'temperate-europe.json'); }, /misses required key "interactions"/],
    ['null traits and warnings', (w) => { const c = w.json('temperate-europe.json'); for (const x of c.taxa) { x.traits = null; x.warnings = null; } w.put('temperate-europe.json', c); resum(w, 'temperate-europe.json'); }, /traits: is null/],
    ['a cell that is not its manifest sha256', (w) => { const c = w.json('temperate-europe.json'); c.taxa[0].names.en = 'Changed'; w.put('temperate-europe.json', c); }, /temperate-europe\.json does not match the manifest's sha256/],
    ['a stale SHA256SUMS', (w) => writeFileSync(join(w.out, 'labels.json'), '{}'), /labels\.json does not match SHA256SUMS/],
    ['a remote photo url', (w) => { const c = w.json('tropical-southern-america.json'); c.taxa.find((x) => x.image).image.url = 'https://upload.wikimedia.org/x.jpg'; w.put('tropical-southern-america.json', c); resum(w, 'tropical-southern-america.json'); }, /image\.url .* is not a local \/data\/consortium\/images\/ file/],
    ['manifest format_version 3', (w) => { const m = w.json('manifest.json'); m.format_version = 3; w.put('manifest.json', m); resum(w, 'manifest.json'); }, /manifest\.json format_version is 3, not 2/],
  ];
  for (const [name, breakIt, error] of cases) {
    const w = await installed(t);
    breakIt(w);
    assert.throws(() => verifyInstall(w.out, { fixture: true }), error, name);
  }
});

// Brings the installed manifest and SHA256SUMS in step with a file changed on purpose, so the check
// past the checksums is the one tested.
function resum(w, name) {
  const bytes = readFileSync(join(w.out, name));
  if (name !== 'manifest.json') {
    const m = w.json('manifest.json');
    m.cells.find((c) => c.file === name).sha256 = sha(bytes);
    w.put('manifest.json', m);
  }
  const lines = readFileSync(join(w.out, 'SHA256SUMS'), 'utf8').trim().split('\n').map((l) => {
    const file = l.split('  ')[1];
    return file === name || file === 'manifest.json' ? `${sha(readFileSync(join(w.out, file)))}  ${file}` : l;
  });
  writeFileSync(join(w.out, 'SHA256SUMS'), `${lines.join('\n')}\n`);
}
