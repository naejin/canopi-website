// The consortium export installer (scripts/install-consortium.mjs): the fixture installs with
// --fixture into a temporary directory (never public/), and each broken export is refused before
// anything is written. Photos are downloaded through a stub fetch; nothing here uses the network,
// canopi-data or uv: `canopi release verify` is a stub, or a fake `uv` on PATH.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installConsortium, verifyInstall, thumbnailUrl, shapeErrors, cellShape, USER_AGENT, DEFAULT_OUT, STAGING_DIR, stagingDirFor, TRY_LIST_DIR, tryListDirFor, CANOPI_DATA_DIR, releaseVerifyProblem } from './install-consortium.mjs';

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
    const bytes = typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value);
    writeFileSync(join(src, name), bytes);
    if (name !== 'manifest.json' && sums) {
      const manifest = json('manifest.json');
      const entry = manifest.climates.find((c) => c.file === name);
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
  writeFileSync(join(w.out, 'manifest.json'), '{"format_version":3}'); // a previous install, by its mark
  writeFileSync(join(w.out, 'INSTALLED_BY'), 'scripts/install-consortium.mjs (canopi-website)\n');
  writeFileSync(join(w.out, 'stale.json'), '{}');
  const stdout = execFileSync(process.execPath, [script, w.src, '--fixture', '--no-images', '--out', w.out], { encoding: 'utf8' });
  assert.match(stdout, /Installed 3 consortium climates/);
  assert.deepEqual(readdirSync(w.out).sort(), ['INSTALLED_BY', 'SHA256SUMS', 'labels.json', 'manifest.json', 'mediterranean.json', 'temperate.json', 'tropical.json']);
  for (const name of ['manifest.json', 'labels.json', 'temperate.json']) assert.deepEqual(readFileSync(join(w.out, name)), readFileSync(join(fixture, name)), name);
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
  const cell = w.json('temperate.json');
  cell.taxa[0].names.en = 'Changed';
  w.write('temperate.json', cell, { sums: false });
  await assert.rejects(install(w), /temperate\.json does not match its SHA256SUMS checksum/);
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

test('a manifest whose format_version is not 3 is refused', async (t) => {
  const w = workspace(t);
  const manifest = w.json('manifest.json');
  manifest.format_version = 2;
  w.write('manifest.json', manifest);
  await assert.rejects(install(w), /format_version is 2, not 3/);
});

test('a cell whose sha256 differs from the manifest is refused', async (t) => {
  const w = workspace(t);
  const manifest = w.json('manifest.json');
  manifest.climates[0].sha256 = 'f'.repeat(64);
  w.write('manifest.json', manifest);
  await assert.rejects(install(w), /does not match the manifest's sha256/);
});

test('a cell missing a required key is refused, naming the key', async (t) => {
  const w = workspace(t);
  const cell = w.json('tropical.json');
  delete cell.taxa[2].traits.sun;
  w.write('tropical.json', cell);
  await assert.rejects(install(w), /taxa\[2\]\.traits: misses required key "sun"/);
});

test('taxa or interactions counts that differ from the manifest are refused', async (t) => {
  const w = workspace(t);
  const manifest = w.json('manifest.json');
  manifest.climates.find((c) => c.file === 'temperate.json').taxa = 14;
  w.write('manifest.json', manifest);
  await assert.rejects(install(w), /has 13 taxa, the manifest says 14/);
  manifest.climates.find((c) => c.file === 'temperate.json').taxa = 13;
  manifest.climates.find((c) => c.file === 'temperate.json').interactions = 0;
  w.write('manifest.json', manifest);
  await assert.rejects(install(w), /has 4 interactions, the manifest says 0/);
});

test('format 3: one file per climate, its regions those of the manifest entry', async (t) => {
  const w = workspace(t);
  const manifest = w.json('manifest.json');
  manifest.climates[1] = { ...manifest.climates[1], climate_zone: 'Tropical' };
  w.write('manifest.json', manifest);
  await assert.rejects(install(w), /the manifest lists Tropical \(mediterranean\.json\) twice/);
  const w2 = workspace(t);
  const m2 = w2.json('manifest.json');
  m2.climates.find((c) => c.file === 'temperate.json').regions = ['europe'];
  w2.write('manifest.json', m2);
  await assert.rejects(install(w2), /temperate\.json has the regions europe, asia_temperate, the manifest says europe/);
  assert.equal(existsSync(w2.out), false);
});

test('format 3: the manifest lists countries with invasive_checked, keyed by ISO alpha-2 codes', async (t) => {
  for (const [breakIt, problem] of [
    [(m) => { m.countries.fr = { invasive_checked: true }; }, /countries: has a key "fr"/],
    [(m) => { m.countries.FR = { invasive_checked: 'yes' }; }, /countries\.FR\.invasive_checked: is not a boolean/],
    [(m) => { m.countries.FR = {}; }, /countries\.FR: misses required key "invasive_checked"/],
    [(m) => { delete m.countries; m.country_regions = {}; }, /misses required key "countries"/],
    [(m) => { m.cells = m.climates; delete m.climates; }, /misses required key "climates"/],
  ]) {
    const w = workspace(t);
    const manifest = w.json('manifest.json');
    breakIt(manifest);
    w.write('manifest.json', manifest);
    await assert.rejects(install(w), problem, String(problem));
    assert.equal(existsSync(w.out), false);
  }
});

test('format 3: every reason cites a defined source', async (t) => {
  const w = workspace(t);
  const cell = w.json('temperate.json');
  cell.taxa[1].reasons[0].sources = ['nobody-2099'];
  w.write('temperate.json', cell);
  await assert.rejects(install(w), /temperate\.json cites undefined sources: nobody-2099/);
});

test('format 3: the rules the schema cannot express (reasons per region, regions as their union, invasive only where GRIIS checked)', async (t) => {
  const cases = [
    ['a region twice in one taxon', (c) => { const x = c.taxa.find((y) => y.reasons.length === 2); x.reasons[1].region = x.reasons[0].region; }, /Allium schoenoprasum: its reasons are not one per region in region order/],
    ['reasons out of region order', (c) => { const x = c.taxa.find((y) => y.reasons.length === 2); x.reasons.reverse(); }, /Allium schoenoprasum: its reasons are not one per region in region order/],
    ['a reason outside the file\'s regions', (c) => { c.taxa[1].reasons[0].region = 'africa'; }, /Alnus cordata: a reason for africa, not in the file's regions/],
    ['a file region no reason names', (c) => { c.regions = ['europe', 'asia_temperate', 'pacific']; }, /temperate\.json: regions europe, asia_temperate, pacific are not those of its reasons \(europe, asia_temperate\)/],
    ['file regions out of order', (c) => { c.regions = ['asia_temperate', 'europe']; }, /temperate\.json: regions asia_temperate, europe are not those of its reasons/],
  ];
  for (const [name, breakIt, problem] of cases) {
    const w = workspace(t);
    const cell = w.json('temperate.json');
    breakIt(cell);
    const manifest = w.json('manifest.json');
    manifest.climates.find((c) => c.file === 'temperate.json').regions = cell.regions;
    w.write('manifest.json', manifest);
    w.write('temperate.json', cell);
    await assert.rejects(install(w), problem, name);
    assert.equal(existsSync(w.out), false, name);
  }
  const w = workspace(t);
  const manifest = w.json('manifest.json');
  const cell = w.json('tropical.json');
  const x = cell.taxa.find((y) => y.warnings.invasive_in?.length);
  const unchecked = Object.keys(manifest.countries).find((k) => !manifest.countries[k].invasive_checked);
  x.warnings.invasive_in.push({ country: unchecked, sources: ['griis'] });
  w.write('tropical.json', cell);
  await assert.rejects(install(w), new RegExp(`${x.canonical_name}: invasive in ${unchecked}, a country GRIIS did not check`));
  x.warnings.invasive_in[x.warnings.invasive_in.length - 1].country = 'ZZ';
  w.write('tropical.json', cell);
  await assert.rejects(install(w), new RegExp(`${x.canonical_name}: invasive in ZZ, a country GRIIS did not check`));
});

test('the shape check: types, enums, nulls where allowed, extra keys accepted', () => {
  const cell = JSON.parse(readFileSync(join(fixture, 'temperate.json'), 'utf8'));
  assert.deepEqual(shapeErrors(cell, cellShape), []);
  const broken = structuredClone(cell);
  broken.taxa[0].role = 'weed';
  broken.taxa[1].traits.edibility_rating = 2.5;
  broken.taxa[2].stratum = { value: 'high', sources: [] };
  broken.taxa[3].id = 'not-a-uuid';
  broken.interactions[0].severity = 'extreme';
  broken.taxa[4].future_field = 'allowed';
  delete broken.taxa[5].reasons;
  broken.taxa[6].reasons = [];
  broken.taxa[7].reasons[0].region = 'atlantis';
  delete broken.taxa[8].reasons[0].sources;
  broken.regions = [];
  assert.deepEqual(shapeErrors(broken, cellShape).map((e) => e.split(':')[0]), [
    '$.regions', '$.taxa[0].role', '$.taxa[1].traits.edibility_rating', '$.taxa[2].stratum.sources', '$.taxa[3].id',
    '$.taxa[5]', '$.taxa[6].reasons', '$.taxa[7].reasons[0].region', '$.taxa[8].reasons[0]', '$.interactions[0].severity',
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

// Gives the fixture photos: two Commons originals and an iNaturalist one, all in the Tropical file.
function withPhotos(w) {
  const photos = {
    'Inga edulis': 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Inga.jpg',
    'Musa acuminata': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Musa.svg',
    'Arachis pintoi': 'https://inaturalist-open-data.s3.amazonaws.com/photos/9/medium.jpeg',
    'Carica papaya': 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Papaya.jpg',
  };
  const cell = w.json('tropical.json');
  for (const t of cell.taxa) if (photos[t.canonical_name]) t.image = { url: photos[t.canonical_name], credit: 'Someone', licence: 'CC BY 4.0', source_page_url: 'https://commons.wikimedia.org/wiki/File:X.jpg' };
  w.write('tropical.json', cell);
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
  const cell = JSON.parse(readFileSync(join(w.out, 'tropical.json'), 'utf8'));
  const inga = cell.taxa.find((x) => x.canonical_name === 'Inga edulis'), musa = cell.taxa.find((x) => x.canonical_name === 'Musa acuminata');
  assert.equal(inga.image.url, `/data/consortium/images/${inga.id}.jpg`);
  assert.equal(musa.image.url, `/data/consortium/images/${musa.id}.png`);
  assert.equal(inga.image.credit, 'Someone', 'credit and licence stay');
  assert.ok(existsSync(join(w.out, 'images', `${inga.id}.jpg`)));
  const manifest = JSON.parse(readFileSync(join(w.out, 'manifest.json'), 'utf8'));
  const entry = manifest.climates.find((c) => c.file === 'tropical.json');
  assert.equal(entry.sha256, sha(readFileSync(join(w.out, entry.file))));
  const sums = readFileSync(join(w.out, 'SHA256SUMS'), 'utf8');
  assert.match(sums, new RegExp(`${entry.sha256}  tropical\\.json`));
  assert.match(sums, new RegExp(`images/${inga.id}\\.jpg`));
});

test('photos: a failed photo becomes image: null and is listed; over 10% failing stops the install', async (t) => {
  const w = workspace(t);
  withPhotos(w);
  // One of four fails on both its thumbnail and its original: 25%, too many.
  await assert.rejects(install(w, { images: true, fetchImpl: stubFetch([], { fail: ['Papaya'] }), delayMs: 0, backoffMs: 0 }), /1 of 4 photos failed/);
  assert.equal(existsSync(w.out), false);
  // Give 11 taxa a photo so one failure is under 10%.
  const cell = w.json('tropical.json');
  cell.taxa.forEach((x, i) => { if (i < 11) x.image = { url: `https://upload.wikimedia.org/wikipedia/commons/d/d${i % 10}/P${i}.jpg`, credit: null, licence: null, source_page_url: null }; });
  w.write('tropical.json', cell);
  const summary = await install(w, { images: true, fetchImpl: stubFetch([], { fail: ['P3.jpg'] }), delayMs: 0, backoffMs: 0 });
  assert.deepEqual(summary.photos.failed.map((f) => f.name), [cell.taxa[3].canonical_name]);
  const installed = JSON.parse(readFileSync(join(w.out, 'tropical.json'), 'utf8'));
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
    w.write('tropical.json', cell);
    const seen = [];
    await install(w, { images, fetchImpl: stubFetch(seen), delayMs: 0, backoffMs: 0 });
    const installed = JSON.parse(readFileSync(join(w.out, 'tropical.json'), 'utf8'));
    for (const name of Object.keys(odd)) assert.equal(installed.taxa.find((x) => x.canonical_name === name).image, null, `${name}, images ${images}`);
    assert.ok(!seen.some((c) => !/^https:/.test(c.url)));
    const left = installed.taxa.filter((x) => x.image).map((x) => x.image.url);
    assert.ok(left.every((u) => u.startsWith('/data/consortium/images/') || !images), 'downloads rewrite every remaining url');
    const manifest = JSON.parse(readFileSync(join(w.out, 'manifest.json'), 'utf8'));
    assert.equal(manifest.climates.find((c) => c.file === 'tropical.json').sha256, sha(readFileSync(join(w.out, 'tropical.json'))));
  }
});

test('--out refuses a canopi-data export, and the export directory itself, so neither is ever replaced', async (t) => {
  const w = workspace(t);
  const other = join(w.out, '..', 'another-export');
  cpSync(w.src, other, { recursive: true });
  await assert.rejects(install({ ...w, out: other }), /holds no consortium install/, 'an export has a format 3 manifest too');
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
  const cell = JSON.parse(readFileSync(join(fixture, 'temperate.json'), 'utf8'));
  const broken = structuredClone(cell);
  broken.taxa[0].traits.edibility_rating = 50;
  broken.taxa[1].traits.edibility_rating = -1;
  broken.taxa[2].names.la = 'Malus';
  broken.taxa[3].reasons[0].text = { en: 'Fine.', xx: 'No.' };
  broken.interactions[0].note = { en: 'Fine.', klingon: 'No.' };
  assert.deepEqual(shapeErrors(broken, cellShape).map((e) => e.split(':')[0]), [
    '$.taxa[0].traits.edibility_rating', '$.taxa[1].traits.edibility_rating', '$.taxa[2].names', '$.taxa[3].reasons[0].text', '$.interactions[0].note',
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
    const cell = w.json('temperate.json');
    const id = Object.keys(cell.sources).find((k) => cell.sources[k].url);
    cell.sources[id].url = url;
    w.write('temperate.json', cell);
    await assert.rejects(install(w), new RegExp(`sources\\.${id}\\.url: .*is not an http\\(s\\) URL`), url);
    assert.equal(existsSync(w.out), false);
  }
  for (const url of bad) {
    const w = workspace(t);
    const cell = withPhotos(w);
    cell.taxa.find((x) => x.image).image.source_page_url = url;
    w.write('tropical.json', cell);
    await assert.rejects(install(w), /image\.source_page_url: .*is not an http\(s\) URL/, url);
  }
  // http, https and null pass.
  const cell = JSON.parse(readFileSync(join(fixture, 'temperate.json'), 'utf8'));
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
  assert.deepEqual(verifyInstall(w.out, { fixture: true }), { climates: 3, images: 4 });
  const real = verifyInstall(DEFAULT_OUT);
  assert.ok(real.climates >= 3 && real.images > 100, JSON.stringify(real));
  assert.throws(() => verifyInstall(w.out), /canopi_db_sha256 is all zeros/, 'the fixture is never a real install');
});

test('verifyInstall: the reviewer\'s broken installs fail (prepush m2)', async (t) => {
  const cases = [
    ['no photos', (w) => rmSync(join(w.out, 'images'), { recursive: true }), /images\/[0-9a-f-]+\.(jpg|png) is missing/],
    ['format_version 2', (w) => { const c = w.json('temperate.json'); c.format_version = 2; w.put('temperate.json', c); }, /temperate\.json does not match the manifest's sha256|format_version/],
    ['format_version 2, checksums redone', (w) => { const c = w.json('temperate.json'); c.format_version = 2; w.put('temperate.json', c); resum(w, 'temperate.json'); }, /format_version: 2 is not one of 3/],
    ['no interactions', (w) => { const c = w.json('temperate.json'); delete c.interactions; w.put('temperate.json', c); resum(w, 'temperate.json'); }, /misses required key "interactions"/],
    ['null traits and warnings', (w) => { const c = w.json('temperate.json'); for (const x of c.taxa) { x.traits = null; x.warnings = null; } w.put('temperate.json', c); resum(w, 'temperate.json'); }, /traits: is null/],
    ['a cell that is not its manifest sha256', (w) => { const c = w.json('temperate.json'); c.taxa[0].names.en = 'Changed'; w.put('temperate.json', c); }, /temperate\.json does not match the manifest's sha256/],
    ['a stale SHA256SUMS', (w) => writeFileSync(join(w.out, 'labels.json'), '{}'), /labels\.json does not match SHA256SUMS/],
    ['a remote photo url', (w) => { const c = w.json('tropical.json'); c.taxa.find((x) => x.image).image.url = 'https://upload.wikimedia.org/x.jpg'; w.put('tropical.json', c); resum(w, 'tropical.json'); }, /image\.url .* is not a local \/data\/consortium\/images\/ file/],
    ['manifest format_version 2', (w) => { const m = w.json('manifest.json'); m.format_version = 2; w.put('manifest.json', m); resum(w, 'manifest.json'); }, /manifest\.json format_version is 2, not 3/],
    ['a reason outside the file\'s regions', (w) => { const c = w.json('temperate.json'); c.regions = ['europe']; w.put('temperate.json', c); const m = w.json('manifest.json'); m.climates.find((x) => x.file === 'temperate.json').regions = ['europe']; w.put('manifest.json', m); resum(w, 'temperate.json'); }, /temperate\.json: .*asia_temperate.* not in the file's regions/],
    ['an invasive country not checked', (w) => { const m = w.json('manifest.json'); const c = w.json('tropical.json'); const code = c.taxa.find((x) => x.warnings.invasive_in?.length).warnings.invasive_in[0].country; m.countries[code].invasive_checked = false; w.put('manifest.json', m); resum(w, 'manifest.json'); }, /invasive in [A-Z]{2}, a country GRIIS did not check/],
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
    m.climates.find((c) => c.file === name).sha256 = sha(bytes);
    w.put('manifest.json', m);
  }
  const lines = readFileSync(join(w.out, 'SHA256SUMS'), 'utf8').trim().split('\n').map((l) => {
    const file = l.split('  ')[1];
    return file === name || file === 'manifest.json' ? `${sha(readFileSync(join(w.out, file)))}  ${file}` : l;
  });
  writeFileSync(join(w.out, 'SHA256SUMS'), `${lines.join('\n')}\n`);
}

test('agent_names (format 3, added 2026-10-28): optional or null, names keyed by the 11 site locales, sources cited and defined', async (t) => {
  const cell = JSON.parse(readFileSync(join(fixture, 'tropical.json'), 'utf8'));
  const i = cell.interactions.findIndex((x) => x.agent_names);
  assert.ok(i >= 0, 'the fixture carries one agent_names');
  assert.deepEqual(shapeErrors(cell, cellShape), []);
  const fine = structuredClone(cell);
  fine.interactions[i].agent_names = null;
  delete fine.interactions[(i + 1) % fine.interactions.length].agent_names;
  assert.deepEqual(shapeErrors(fine, cellShape), []);
  const broken = structuredClone(cell);
  broken.interactions[i].agent_names = { names: { en: 'x', xx: 'y' }, sources: cell.interactions[i].agent_names.sources };
  assert.match(shapeErrors(broken, cellShape).join('\n'), /agent_names\.names: has a key "xx"/);
  broken.interactions[i].agent_names = { names: { en: 'x' }, sources: [] };
  assert.match(shapeErrors(broken, cellShape).join('\n'), /agent_names\.sources/);
  broken.interactions[i].agent_names = { names: { en: 42 }, sources: ['s'] };
  assert.match(shapeErrors(broken, cellShape).join('\n'), /agent_names\.names\.en/);
  // canopi-data's schema: at least one name, and no empty name.
  broken.interactions[i].agent_names = { names: { fr: '' }, sources: ['s'] };
  assert.match(shapeErrors(broken, cellShape).join('\n'), /agent_names\.names\.fr: is empty/);
  broken.interactions[i].agent_names = { names: {}, sources: ['s'] };
  assert.match(shapeErrors(broken, cellShape).join('\n'), /agent_names\.names: has no key/);
  // Its sources must be defined, as every other source the file cites.
  const w = workspace(t);
  const c = w.json('tropical.json');
  c.interactions[i].agent_names.sources = ['nobody-agent-2099'];
  w.write('tropical.json', c);
  await assert.rejects(install(w), /tropical\.json cites undefined sources: nobody-agent-2099/);
});

// The TRY dataset list: an export a real install accepts (no photos, so no fetch), with a list of its
// own, and an empty folder standing in for src/data/.
const TRY_LIST = 'dataset_id\tdataset\tcustodian\treference\n1\tA\tB\tC\n2\tD\tE\tF\n2\tG\tH\tI\n';
const RELEASE_ID = 'r-559dd6ac9aef21e1';
function realExport(t, list = TRY_LIST) {
  const w = workspace(t);
  for (const name of ['tropical.json', 'mediterranean.json', 'temperate.json']) {
    const cell = w.json(name);
    for (const taxon of cell.taxa) taxon.image = null;
    w.write(name, cell);
  }
  const manifest = w.json('manifest.json');
  manifest.canopi_db_sha256 = 'a'.repeat(64);
  manifest.release_id = RELEASE_ID;
  manifest.try_references = { file: 'try_references.tsv', sha256: sha(list), rows: 3, dataset_ids: 2 };
  w.write('manifest.json', manifest);
  writeFileSync(join(w.src, 'try_references.tsv'), list);
  appendFileSync(join(w.src, 'SHA256SUMS'), `${sha(list)}  try_references.tsv\n`);
  w.listDir = join(w.root, 'list');
  mkdirSync(w.listDir);
  // A list changed on purpose: its hash follows, so what is left to refuse is the content.
  w.rewriteList = (bytes) => {
    w.write('try_references.tsv', bytes);
    const m = w.json('manifest.json');
    m.try_references.sha256 = sha(bytes);
    w.write('manifest.json', m);
  };
  return w;
}
const mayShip = () => null;
const realInstall = (w, opts = {}) => installConsortium({ exportDir: w.src, outDir: w.out, tryListDir: w.listDir, releaseCheck: mayShip, log: quiet, ...opts });
const shippedList = () => ['try_references.tsv', 'try_references.meta.json'].map((name) => sha(readFileSync(join(TRY_LIST_DIR, name))));

test('try list: a real install writes the file byte for byte and its meta from the manifest entry', async (t) => {
  const w = realExport(t);
  await realInstall(w);
  assert.equal(readFileSync(join(w.listDir, 'try_references.tsv'), 'utf8'), TRY_LIST);
  assert.deepEqual(JSON.parse(readFileSync(join(w.listDir, 'try_references.meta.json'), 'utf8')), { sha256: sha(TRY_LIST), rows: 3, dataset_ids: 2 });
  assert.deepEqual(readdirSync(w.listDir).sort(), ['try_references.meta.json', 'try_references.tsv'], 'no temporary file left');
  // The page reads src/data/; the installed folder keeps the manifest whole, and no copy of the file.
  assert.ok(!existsSync(join(w.out, 'try_references.tsv')));
  assert.ok(!readFileSync(join(w.out, 'SHA256SUMS'), 'utf8').includes('try_references'));
  assert.deepEqual(JSON.parse(readFileSync(join(w.out, 'manifest.json'), 'utf8')).try_references, w.json('manifest.json').try_references);
  assert.deepEqual(verifyInstall(w.out), { climates: 3, images: 0 });
});

test('try list: only a real install writes it, never --out or --fixture', async (t) => {
  assert.equal(tryListDirFor(DEFAULT_OUT, false), TRY_LIST_DIR);
  assert.equal(tryListDirFor(DEFAULT_OUT, true), null);
  assert.equal(tryListDirFor('/tmp/elsewhere', false), null);
  assert.equal(tryListDirFor('/tmp/elsewhere', true), null);
  const before = shippedList();
  const w = realExport(t);
  await installConsortium({ exportDir: w.src, outDir: w.out, releaseCheck: mayShip, log: quiet });
  assert.deepEqual(shippedList(), before, '--out left src/data/ alone');
  // --out still checks the list.
  const broken = realExport(t);
  const m = broken.json('manifest.json');
  m.try_references.rows = 4;
  broken.write('manifest.json', m);
  const refused = spawnSync(process.execPath, [script, broken.src, '--out', broken.out], { encoding: 'utf8' });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /3 rows, not the source's 4/);
  const f = realExport(t);
  await realInstall(f, { fixture: true, images: false });
  assert.deepEqual(readdirSync(f.listDir), [], '--fixture writes no list, even when given a folder');
  assert.deepEqual(shippedList(), before);
});

test('try list: a missing or mismatched list refuses the install with nothing written', async (t) => {
  const manifestEdit = (edit) => (w) => { const m = w.json('manifest.json'); edit(m); w.write('manifest.json', m); };
  for (const [name, breakIt, problem] of [
    ['an older export', manifestEdit((m) => { delete m.try_references; }), /no try_references entry/],
    ['a null entry', manifestEdit((m) => { m.try_references = null; }), /try_references: is null/],
    ['another file name', manifestEdit((m) => { m.try_references.file = 'labels.json'; }), /try_references\.file/],
    ['no rows', manifestEdit((m) => { m.try_references.rows = 0; }), /try_references\.rows/],
    ['a sha256 of something else', manifestEdit((m) => { m.try_references.sha256 = 'f'.repeat(64); }), /try_references\.tsv does not match the manifest's sha256/],
    ['another row count', manifestEdit((m) => { m.try_references.rows = 4; }), /3 rows, not the source's 4/],
    ['another DatasetID count', manifestEdit((m) => { m.try_references.dataset_ids = 3; }), /2 DatasetIDs, not the source's 3/],
    ['a file SHA256SUMS does not list', (w) => writeFileSync(join(w.src, 'SHA256SUMS'), readFileSync(join(w.src, 'SHA256SUMS'), 'utf8').replace(/.*try_references\.tsv\n/, '')), /try_references\.tsv is not listed in SHA256SUMS/],
    ['a file missing', (w) => rmSync(join(w.src, 'try_references.tsv')), /try_references\.tsv is listed in SHA256SUMS but missing/],
    ['a changed file', (w) => writeFileSync(join(w.src, 'try_references.tsv'), TRY_LIST.replace('A', 'Z')), /try_references\.tsv does not match its SHA256SUMS checksum/],
    ['a row that does not parse', (w) => w.rewriteList(TRY_LIST.replace('A\tB', 'A')), /try_references\.tsv:2: 3 fields/],
    ['a byte order mark', (w) => w.rewriteList(`﻿${TRY_LIST}`), /byte order mark/],
    ['bytes that are not UTF-8', (w) => w.rewriteList(Buffer.concat([Buffer.from(TRY_LIST), Buffer.from([0xff, 0x0a])])), /try_references\.tsv is not UTF-8/],
  ]) {
    const w = realExport(t);
    breakIt(w);
    await assert.rejects(realInstall(w), problem, name);
    assert.equal(existsSync(w.out), false, `${name}: no install`);
    assert.deepEqual(readdirSync(w.listDir), [], `${name}: no list`);
  }
});

test('try list: the fixture alone may have no entry; an entry it does have is still checked', async (t) => {
  const w = realExport(t);
  const m = w.json('manifest.json');
  m.try_references.rows = 4;
  w.write('manifest.json', m);
  await assert.rejects(realInstall(w, { fixture: true, images: false }), /3 rows, not the source's 4/);
  const bare = workspace(t);
  await install(bare);
  assert.deepEqual(verifyInstall(bare.out, { fixture: true }), { climates: 3, images: 0 });
});

test('try list: a failure while it is moved into place puts back the install and the list', async (t) => {
  const w = realExport(t);
  await realInstall(w);
  const before = readFileSync(join(w.out, 'manifest.json'));
  const next = realExport(t, TRY_LIST.replace('A', 'Z'));
  next.out = w.out;
  next.listDir = w.listDir;
  rmSync(join(w.listDir, 'try_references.meta.json'));
  mkdirSync(join(w.listDir, 'try_references.meta.json')); // a rename onto a directory fails
  await assert.rejects(realInstall(next));
  assert.deepEqual(readFileSync(join(w.out, 'manifest.json')), before);
  assert.equal(readFileSync(join(w.listDir, 'try_references.tsv'), 'utf8'), TRY_LIST);
  assert.deepEqual(readdirSync(w.listDir).sort(), ['try_references.meta.json', 'try_references.tsv'], 'no temporary file left');
});

test('try list: a run killed while it moves the list leaves nothing new in the list folder', async (t) => {
  const w = realExport(t);
  // A child that dies by SIGKILL on its first rename into the list folder, with both files staged.
  const child = `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      if (to.startsWith(${JSON.stringify(w.listDir)})) process.kill(process.pid, 'SIGKILL');
      return rename(from, to);
    };
    syncBuiltinESMExports();
    const { installConsortium } = await import(${JSON.stringify(pathToFileURL(script).href)});
    await installConsortium({ ...${JSON.stringify({ exportDir: w.src, outDir: w.out, tryListDir: w.listDir })}, releaseCheck: () => null });
  `;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', child], { encoding: 'utf8' });
  assert.equal(run.signal, 'SIGKILL', run.stderr);
  assert.deepEqual(readdirSync(w.listDir), [], 'nothing a commit could pick up');
  const staging = stagingDirFor(w.out);
  assert.equal(readdirSync(staging).filter((name) => name.includes('try_references')).length, 2, 'staged with the install');
  // The next run sweeps the staging folder and installs.
  await realInstall(w);
  assert.equal(existsSync(staging), false);
  assert.deepEqual(readdirSync(w.listDir).sort(), ['try_references.meta.json', 'try_references.tsv']);
  assert.equal(readFileSync(join(w.listDir, 'try_references.tsv'), 'utf8'), TRY_LIST);
});

test('verifyInstall: a real install holds the try_references entry', async (t) => {
  const w = realExport(t);
  await realInstall(w);
  const manifest = JSON.parse(readFileSync(join(w.out, 'manifest.json'), 'utf8'));
  delete manifest.try_references;
  const bytes = JSON.stringify(manifest);
  writeFileSync(join(w.out, 'manifest.json'), bytes);
  writeFileSync(join(w.out, 'SHA256SUMS'), readFileSync(join(w.out, 'SHA256SUMS'), 'utf8').replace(/^.*  manifest\.json$/m, `${sha(bytes)}  manifest.json`));
  assert.throws(() => verifyInstall(w.out), /no try_references entry/);
});

// `canopi release verify`: what canopi-data says about an export decides whether a real install runs.
test('release verify: a refusal stops a real install before any photo or write, showing its message', async (t) => {
  const w = realExport(t);
  withPhotos(w);
  const asked = [], fetched = [];
  const refusal = 'the export: no receipt beside it, so nothing says it was checked. Build it again';
  const releaseCheck = (dir) => { asked.push(dir); return refusal; };
  await assert.rejects(realInstall(w, { releaseCheck, fetchImpl: stubFetch(fetched), delayMs: 0 }), (err) => err.message === `Consortium export refused: ${refusal}`);
  assert.deepEqual(asked, [resolve(w.src)], 'asked once, of the original directory');
  assert.deepEqual(fetched, [], 'no photo downloaded');
  assert.equal(existsSync(w.out), false, 'nothing installed');
  assert.deepEqual(readdirSync(w.listDir), [], 'no TRY list written');
});

test('release verify: a refusal leaves a previous install and TRY list as they were', async (t) => {
  const w = realExport(t);
  await realInstall(w);
  const before = () => [readFileSync(join(w.out, 'manifest.json')), readFileSync(join(w.listDir, 'try_references.tsv'))];
  const was = before();
  const next = realExport(t, `${TRY_LIST}3\tJ\tK\tL\n`);
  const m = next.json('manifest.json');
  m.try_references.rows = 4;
  m.try_references.dataset_ids = 3;
  next.write('manifest.json', m);
  await assert.rejects(realInstall({ ...next, out: w.out, listDir: w.listDir }, { releaseCheck: () => 'stale' }), /refused: stale/);
  assert.deepEqual(before(), was);
});

test('release verify: an export the installer itself refuses never gets as far as asking', async (t) => {
  const w = realExport(t);
  const m = w.json('manifest.json');
  m.try_references.rows = 4;
  w.write('manifest.json', m);
  let asked = false;
  await assert.rejects(realInstall(w, { releaseCheck: () => { asked = true; return null; } }), /3 rows, not the source's 4/);
  assert.equal(asked, false);
});

test('release verify: a real install that passes it installs, whatever the --out', async (t) => {
  const w = realExport(t);
  const asked = [];
  await realInstall(w, { releaseCheck: (dir) => { asked.push(dir); return null; } });
  assert.deepEqual(asked, [resolve(w.src)]);
  assert.deepEqual(verifyInstall(w.out), { climates: 3, images: 0 });
});

// A fake uv: records where it ran and with what, then says and exits as the test asks.
function fakeUv(t, body) {
  const root = mkdtempSync(join(tmpdir(), 'consortium-uv-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = join(root, 'bin'), data = join(root, 'canopi-data'), logged = join(root, 'asked');
  mkdirSync(bin);
  mkdirSync(data);
  writeFileSync(join(bin, 'uv'), `#!/bin/sh\n{ pwd; printf '%s\\n' "$@"; } > "${logged}"\n${body}\n`);
  chmodSync(join(bin, 'uv'), 0o755);
  // Keeps sh and its tools findable, with the fake first.
  return { root: data, env: { ...process.env, PATH: `${bin}:/usr/bin:/bin` }, asked: () => readFileSync(logged, 'utf8').trim().split('\n'), data };
}

test('release verify: runs `uv run canopi release verify <dir>` from the canopi-data root; exit 0 may install', (t) => {
  const uv = fakeUv(t, 'echo "OK: it is from release r-1"; echo "shared values compared"; exit 0');
  const lines = [];
  assert.equal(releaseVerifyProblem('/some/where/2026-11-06', { root: uv.root, env: uv.env, log: (l) => lines.push(l) }), null);
  assert.deepEqual(uv.asked(), [realpathSync(uv.data), 'run', 'canopi', 'release', 'verify', '/some/where/2026-11-06']);
  assert.match(lines.join('\n'), /OK: it is from release r-1/);
  assert.match(lines.join('\n'), /shared values compared/);
});

test('release verify: any other exit refuses and shows what it printed, on stdout and on stderr', (t) => {
  for (const [code, name] of [[1, 'its refusal'], [2, 'a usage error'], [3, 'an exit it does not document'], [127, 'a command not found']]) {
    const uv = fakeUv(t, `echo "plant field: differs from the release"; echo "and on stderr" >&2; exit ${code}`);
    const problem = releaseVerifyProblem('/x', { root: uv.root, env: uv.env, log: quiet });
    assert.match(problem, /plant field: differs from the release/, name);
    assert.match(problem, /and on stderr/, name);
  }
});

test('release verify: a run that cannot answer refuses (killed, no uv, no canopi-data)', (t) => {
  const killed = fakeUv(t, 'kill -9 $$');
  assert.match(releaseVerifyProblem('/x', { root: killed.root, env: killed.env, log: quiet }), /canopi release verify.*SIGKILL/);
  const uv = fakeUv(t, 'exit 0');
  assert.match(releaseVerifyProblem('/x', { root: uv.root, env: { ...process.env, PATH: join(uv.data, 'nothing-here') }, log: quiet }), /could not run `uv run canopi release verify`/);
  assert.match(releaseVerifyProblem('/x', { root: join(uv.data, 'absent'), env: uv.env, log: quiet }), /canopi-data was not found at .*absent/);
});

test('release verify: canopi-data is looked for beside the website', () => {
  assert.equal(CANOPI_DATA_DIR, resolve(dirname(script), '..', '..', 'canopi-data'));
});

test('the command line: a real export is refused when verify cannot say yes, and nothing is written', (t) => {
  // With no uv on PATH the result is the same here and on CI, where canopi-data is absent too.
  const w = realExport(t);
  const run = spawnSync(process.execPath, [script, w.src, '--out', w.out], { encoding: 'utf8', env: { ...process.env, PATH: join(w.root, 'no-such-bin') } });
  assert.equal(run.status, 1, run.stdout);
  assert.match(run.stderr, /^Consortium export refused: .*canopi(-data| release verify)/);
  assert.equal(existsSync(w.out), false);
});

test('--fixture alone skips verify, and needs neither canopi-data nor uv', (t) => {
  const w = workspace(t);
  const run = spawnSync(process.execPath, [script, w.src, '--fixture', '--no-images', '--out', w.out], { encoding: 'utf8', env: { ...process.env, PATH: join(w.root, 'no-such-bin') } });
  assert.equal(run.status, 0, run.stderr);
  const v = workspace(t);
  return install(v, { releaseCheck: () => { throw new Error('asked on a fixture'); } });
});

test('--fixture never reaches the site, so it is no way around verify', async (t) => {
  // siteDir stands in for public/data/consortium/, as a failing test must not overwrite the real one.
  const w = workspace(t);
  await assert.rejects(install(w, { siteDir: w.out }), /--fixture.*never.*site/);
  assert.equal(existsSync(w.out), false, 'the site itself');
  await assert.rejects(install({ ...w, out: join(w.out, 'inside') }, { siteDir: w.out }), /--fixture.*never.*site/);
  assert.equal(existsSync(w.out), false, 'a folder inside the site');
  mkdirSync(w.out);
  const alias = join(w.root, 'alias');
  symlinkSync(w.out, alias);
  await assert.rejects(install({ ...w, out: alias }, { siteDir: w.out }), /--fixture.*never.*site/);
  assert.deepEqual(readdirSync(w.out), [], 'through a symlink');
});

// The data release (Step 8): canopi-data's manifest names the release it was built from, and the
// site shows it under the tool and sends it with a correction.
test('release id: a real install requires release_id, r- and 16 hex digits, and keeps it in the installed manifest', async (t) => {
  const w = realExport(t);
  await realInstall(w);
  assert.equal(JSON.parse(readFileSync(join(w.out, 'manifest.json'), 'utf8')).release_id, RELEASE_ID);
  const manifestEdit = (edit) => (x) => { const m = x.json('manifest.json'); edit(m); x.write('manifest.json', m); };
  for (const [name, breakIt, problem] of [
    ['an export from before the releases', manifestEdit((m) => { delete m.release_id; }), /manifest\.json has no release_id/],
    ['a null id', manifestEdit((m) => { m.release_id = null; }), /release_id: is null/],
    ['a short id', manifestEdit((m) => { m.release_id = 'r-559dd6ac'; }), /release_id: "r-559dd6ac" does not match/],
    ['upper-case hex', manifestEdit((m) => { m.release_id = 'r-559DD6AC9AEF21E1'; }), /release_id: .* does not match/],
    ['another prefix', manifestEdit((m) => { m.release_id = 'x-559dd6ac9aef21e1'; }), /release_id: .* does not match/],
  ]) {
    const x = realExport(t);
    breakIt(x);
    await assert.rejects(realInstall(x), problem, name);
    assert.equal(existsSync(x.out), false, `${name}: no install`);
    assert.deepEqual(readdirSync(x.listDir), [], `${name}: no list`);
  }
});

test('release id: the fixture alone may lack it; an id it does have is still checked', async (t) => {
  const bare = workspace(t);
  assert.equal(bare.json('manifest.json').release_id, undefined, 'the fixture has none');
  await install(bare);
  assert.deepEqual(verifyInstall(bare.out, { fixture: true }), { climates: 3, images: 0 });
  const w = workspace(t);
  const m = w.json('manifest.json');
  m.release_id = 'r-1';
  w.write('manifest.json', m);
  await assert.rejects(install(w), /release_id: "r-1" does not match/);
});

test('verifyInstall: a real install holds its release_id, and so does the committed one', async (t) => {
  assert.match(JSON.parse(readFileSync(join(DEFAULT_OUT, 'manifest.json'), 'utf8')).release_id, /^r-[0-9a-f]{16}$/);
  const w = realExport(t);
  await realInstall(w);
  const manifest = JSON.parse(readFileSync(join(w.out, 'manifest.json'), 'utf8'));
  delete manifest.release_id;
  const bytes = JSON.stringify(manifest);
  writeFileSync(join(w.out, 'manifest.json'), bytes);
  writeFileSync(join(w.out, 'SHA256SUMS'), readFileSync(join(w.out, 'SHA256SUMS'), 'utf8').replace(/^.*  manifest\.json$/m, `${sha(bytes)}  manifest.json`));
  assert.throws(() => verifyInstall(w.out), /no release_id/);
  assert.deepEqual(verifyInstall(w.out, { fixture: true }), { climates: 3, images: 0 }, 'a fixture install may lack it');
});

// The source credits (Step 8): canopi-data's source_credits.tsv, shipped as the TRY list is. Until
// canopi-data ships it an export may lack it; once the manifest lists it, it is verified and copied.
const CREDITS = 'source\ttags\tname\tcredit\tlicence\tlicence_status\turl\tstatus\ntry\ttry\tTRY Plant Trait Database\t\t\tterms\thttps://www.try-db.org/\tused\nrules\trule\tCanopi rules\t\t\tnone\t\tinternal\n';
function withCredits(w, text = CREDITS) {
  writeFileSync(join(w.src, 'source_credits.tsv'), text);
  appendFileSync(join(w.src, 'SHA256SUMS'), `${sha(text)}  source_credits.tsv\n`);
  const m = w.json('manifest.json');
  m.source_credits = { file: 'source_credits.tsv', sha256: sha(text) };
  w.write('manifest.json', m);
  return w;
}

test('source credits: a real install copies the listed file byte for byte beside the TRY list', async (t) => {
  const w = withCredits(realExport(t));
  await realInstall(w);
  assert.equal(readFileSync(join(w.listDir, 'source_credits.tsv'), 'utf8'), CREDITS);
  assert.deepEqual(readdirSync(w.listDir).sort(), ['source_credits.tsv', 'try_references.meta.json', 'try_references.tsv'], 'no temporary file left');
  assert.ok(!existsSync(join(w.out, 'source_credits.tsv')), 'the page reads src/data/, the install keeps no copy');
  assert.deepEqual(JSON.parse(readFileSync(join(w.out, 'manifest.json'), 'utf8')).source_credits, w.json('manifest.json').source_credits);
  assert.deepEqual(verifyInstall(w.out), { climates: 3, images: 0 });
});

test('source credits: an export without them installs, and a copy from an earlier export is removed', async (t) => {
  const first = withCredits(realExport(t));
  await realInstall(first);
  const next = realExport(t);
  next.out = first.out;
  next.listDir = first.listDir;
  await realInstall(next);
  assert.deepEqual(readdirSync(first.listDir).sort(), ['try_references.meta.json', 'try_references.tsv'], 'no stale credits');
});

test('source credits: only a real install writes them, never --out alone or --fixture', async (t) => {
  const w = withCredits(realExport(t));
  await installConsortium({ exportDir: w.src, outDir: w.out, releaseCheck: mayShip, log: quiet });
  assert.ok(!existsSync(join(TRY_LIST_DIR, 'source_credits.tsv')) || readFileSync(join(TRY_LIST_DIR, 'source_credits.tsv'), 'utf8') !== CREDITS, '--out left src/data/ alone');
  const f = withCredits(realExport(t));
  await realInstall(f, { fixture: true, images: false });
  assert.deepEqual(readdirSync(f.listDir), [], '--fixture writes nothing there');
});

test('source credits: a listed file that is missing, changed or malformed refuses the install with nothing written', async (t) => {
  const manifestEdit = (edit) => (w) => { const m = w.json('manifest.json'); edit(m); w.write('manifest.json', m); };
  const rewrite = (text) => (w) => { w.write('source_credits.tsv', text); manifestEdit((m) => { m.source_credits.sha256 = sha(text); })(w); };
  for (const [name, breakIt, problem] of [
    ['a null entry', manifestEdit((m) => { m.source_credits = null; }), /source_credits: is null/],
    ['another file name', manifestEdit((m) => { m.source_credits.file = 'credits.tsv'; }), /source_credits\.file/],
    ['a sha256 of something else', manifestEdit((m) => { m.source_credits.sha256 = 'f'.repeat(64); }), /source_credits\.tsv does not match the manifest's sha256/],
    ['a file SHA256SUMS does not list', (w) => writeFileSync(join(w.src, 'SHA256SUMS'), readFileSync(join(w.src, 'SHA256SUMS'), 'utf8').replace(/.*source_credits\.tsv\n/, '')), /source_credits\.tsv is not listed in SHA256SUMS/],
    ['a file missing', (w) => rmSync(join(w.src, 'source_credits.tsv')), /source_credits\.tsv is listed in SHA256SUMS but missing/],
    ['a changed file', (w) => writeFileSync(join(w.src, 'source_credits.tsv'), CREDITS.replace('TRY', 'XYZ')), /source_credits\.tsv does not match its SHA256SUMS checksum/],
    ['an unknown status', rewrite(CREDITS.replace('\tused\n', '\tshipped\n')), /source_credits\.tsv:2: try: status "shipped"/],
    ['other columns', rewrite(CREDITS.replace('licence_status', 'licence_state')), /source_credits\.tsv:1: the columns are not/],
    ['bytes that are not UTF-8', rewrite(Buffer.concat([Buffer.from(CREDITS), Buffer.from([0xff, 0x0a])])), /source_credits\.tsv is not UTF-8/],
    ['a rows count that is not the file\'s', manifestEdit((m) => { m.source_credits.rows = 5; }), /source_credits\.tsv has 2 rows, the manifest says 5/],
  ]) {
    const w = withCredits(realExport(t));
    breakIt(w);
    await assert.rejects(realInstall(w), problem, name);
    assert.equal(existsSync(w.out), false, `${name}: no install`);
    assert.deepEqual(readdirSync(w.listDir), [], `${name}: nothing in the list folder`);
  }
});

test('source credits: a failure while moving into place puts back the previous credits', async (t) => {
  const w = withCredits(realExport(t));
  await realInstall(w);
  const next = withCredits(realExport(t), CREDITS.replace('Canopi rules', 'Canopi own rules'));
  next.out = w.out;
  next.listDir = w.listDir;
  rmSync(join(w.listDir, 'try_references.meta.json'));
  mkdirSync(join(w.listDir, 'try_references.meta.json')); // a rename onto a directory fails
  await assert.rejects(realInstall(next));
  assert.equal(readFileSync(join(w.listDir, 'source_credits.tsv'), 'utf8'), CREDITS);
});

test('source credits: the manifest entry may give rows (the export does), and it is the file\'s data rows', async (t) => {
  const w = withCredits(realExport(t));
  const m = w.json('manifest.json');
  m.source_credits.rows = 2;
  w.write('manifest.json', m);
  await realInstall(w);
  assert.equal(readFileSync(join(w.listDir, 'source_credits.tsv'), 'utf8'), CREDITS);
});

// Added within format 3 on 2026-11-10 (canopi-data docs/consortium-export-format.md): layer values on a
// taxon, climate_zone on every interaction, and the intercropped_yield_gain type.
const temperateCell = () => JSON.parse(readFileSync(join(fixture, 'temperate.json'), 'utf8'));
const errorsOf = (cell) => shapeErrors(cell, cellShape).join('\n');

test('layer values: the fixture carries them; field, kind and scope are held to the format', () => {
  const cell = temperateCell();
  const i = cell.taxa.findIndex((t) => t.layer_values);
  assert.ok(i >= 0, 'the fixture carries layer values');
  assert.deepEqual(shapeErrors(cell, cellShape), []);
  const row = cell.taxa[i].layer_values[0];
  for (const [change, problem] of [
    [{ field: 'seed_months' }, /layer_values\[0\]\.field: "seed_months" is not one of bloom_months, ripening_or_fruit_seen_months, sowing_months, tolerates_wind/],
    [{ kind: 'guessed' }, /layer_values\[0\]\.kind: "guessed" is not one of recorded, extracted, derived, llm/],
    [{ scope: 'GB' }, /layer_values\[0\]\.scope: is not an object/],
    [{ scope: { planet: 'Mars' } }, /layer_values\[0\]\.scope: has a key "planet"/],
    [{ scope: { country: 'gb' } }, /layer_values\[0\]\.scope\.country/],
    [{ scope: { hemisphere: 'E' } }, /layer_values\[0\]\.scope\.hemisphere/],
    [{ scope: { latitude: 'north' } }, /layer_values\[0\]\.scope\.latitude/],
    [{ source: '' }, /layer_values\[0\]\.source: is empty/],
  ]) {
    const broken = structuredClone(cell);
    Object.assign(broken.taxa[i].layer_values[0], change);
    assert.match(errorsOf(broken), problem, JSON.stringify(change));
  }
  const fine = structuredClone(cell);
  fine.taxa[i].layer_values[0] = { ...row, scope: null };
  assert.deepEqual(shapeErrors(fine, cellShape), [], 'a value that holds everywhere has scope null');
  const missing = structuredClone(cell);
  delete missing.taxa[i].layer_values[0].kind;
  assert.match(errorsOf(missing), /misses required key "kind"/);
});

test('layer values: months for the month fields, a boolean for wind, a defined source; refused with nothing written', async (t) => {
  const cell = temperateCell();
  const i = cell.taxa.findIndex((x) => x.canonical_name === 'Malus domestica');
  const name = cell.taxa[i].canonical_name;
  const months = cell.taxa[i].layer_values.findIndex((v) => v.field === 'bloom_months');
  const wind = cell.taxa[i].layer_values.findIndex((v) => v.field === 'tolerates_wind');
  for (const [at, change, problem] of [
    [months, { value: ['April'] }, new RegExp(`temperate\\.json: ${name}: bloom_months is not a list of months Jan … Dec`)],
    [months, { value: [] }, new RegExp(`${name}: bloom_months is not a list of months`)],
    [months, { value: ['Apr', 'Apr'] }, new RegExp(`${name}: bloom_months is not a list of months`)],
    [months, { value: true }, new RegExp(`${name}: bloom_months is not a list of months`)],
    [wind, { value: ['Apr'] }, new RegExp(`${name}: tolerates_wind is not a boolean`)],
    [months, { source: 'nobody-2099' }, /temperate\.json cites undefined sources: nobody-2099/],
  ]) {
    const w = workspace(t);
    const c = w.json('temperate.json');
    Object.assign(c.taxa[i].layer_values[at], change);
    w.write('temperate.json', c);
    await assert.rejects(install(w), problem, JSON.stringify(change));
    assert.equal(existsSync(w.out), false);
  }
});

test('interactions: climate_zone is null or absent on the four curated types, and never another value', async (t) => {
  const cell = temperateCell();
  assert.ok(cell.interactions.some((x) => x.type !== 'intercropped_yield_gain' && x.climate_zone === null), 'the fixture has a null climate_zone');
  const tropical = JSON.parse(readFileSync(join(fixture, 'tropical.json'), 'utf8'));
  assert.ok(tropical.interactions.every((x) => !('climate_zone' in x)), 'and an earlier export leaves it out');
  assert.deepEqual(shapeErrors(tropical, cellShape), []);
  const w = workspace(t);
  const c = w.json('temperate.json');
  const k = c.interactions.findIndex((x) => x.type === 'alternate_host');
  c.interactions[k].climate_zone = 'Temperate';
  w.write('temperate.json', c);
  await assert.rejects(install(w), /temperate\.json: an alternate_host interaction \(Juniperus → Malus\) has climate_zone Temperate; only intercropped_yield_gain rows name a climate/);
});

test('intercropped_yield_gain: accepted, its climate_zone the file\'s own, both plants species of the file', async (t) => {
  const cell = temperateCell();
  const k = cell.interactions.findIndex((x) => x.type === 'intercropped_yield_gain');
  assert.ok(k >= 0, 'the fixture carries a pair');
  const w0 = workspace(t);
  await install(w0);
  assert.deepEqual(JSON.parse(readFileSync(join(w0.out, 'temperate.json'), 'utf8')).interactions[k], cell.interactions[k]);
  const other = cell.taxa.find((x) => x.canonical_name !== cell.interactions[k].subject.name && x.canonical_name !== cell.interactions[k].object.name).canonical_name;
  for (const [change, problem] of [
    [(i) => { i.climate_zone = null; }, /temperate\.json: an intercropped_yield_gain pair \(Malus domestica \+ Trifolium repens\) has climate_zone null, not the file's Temperate/],
    [(i) => { delete i.climate_zone; }, /has climate_zone null, not the file's Temperate/],
    [(i) => { i.climate_zone = 'Tropical'; }, /has climate_zone Tropical, not the file's Temperate/],
    [(i) => { i.object = { name: 'Zea mays', rank: 'species' }; }, /temperate\.json: an intercropped_yield_gain pair \(Malus domestica \+ Zea mays\) names a plant that is not a taxon of the file/],
    [(i) => { i.object = { name: 'Malus', rank: 'genus' }; }, /names a plant that is not a taxon of the file/],
    [(i) => { i.subject = { name: other, rank: 'family' }; }, /names a plant that is not a taxon of the file/],
  ]) {
    const w = workspace(t);
    const c = w.json('temperate.json');
    change(c.interactions[k]);
    w.write('temperate.json', c);
    await assert.rejects(install(w), problem, String(change));
    assert.equal(existsSync(w.out), false);
  }
  const typo = structuredClone(cell);
  typo.interactions[k].type = 'intercropped';
  assert.match(errorsOf(typo), /type: "intercropped" is not one of allelopathic_harm, allelopathy_tolerant, alternate_host, shared_pest, intercropped_yield_gain/);
});
