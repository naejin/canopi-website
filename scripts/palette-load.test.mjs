// The consortium island's byte checks before SQLite sees the database (src/islands/palette/data/
// bytes.ts, review B3 and C11): the whole body is read, an empty body is damage, the gzip magic is
// read from the whole buffer, and the digests the page was built with are checked (gzipped bytes when
// the magic is there, the raw database when the server already decoded it, P3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { decodeChecked, decodeDatabase, isGzip, LoadError } from '../src/islands/palette/data/bytes.ts';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const raw = Buffer.from('SQLite format 3\0' + 'x'.repeat(400));
const gz = gzipSync(raw);
const ref = { url: '/db.gz', sha256: sha(gz), bytes: gz.length, rawSha256: sha(raw), rawBytes: raw.length };
const failure = async (p) => { try { await p; } catch (err) { assert.ok(err instanceof LoadError, String(err)); return err.failure; } return null; };

test('isGzip reads the magic from the whole buffer, never from one chunk', () => {
  assert.equal(isGzip(new Uint8Array([0x1f, 0x8b, 8])), true);
  assert.equal(isGzip(new Uint8Array([0x1f])), false);
  assert.equal(isGzip(new Uint8Array([])), false);
  assert.equal(isGzip(new Uint8Array([0x53, 0x51])), false);
});

test('decodeDatabase inflates the gzipped file after checking its digest and size', async () => {
  const out = await decodeDatabase(new Uint8Array(gz), ref);
  assert.deepEqual(Buffer.from(out), raw);
});

test('a body the server already decoded is checked against the raw digest', async () => {
  const out = await decodeDatabase(new Uint8Array(raw), ref);
  assert.deepEqual(Buffer.from(out), raw);
  assert.equal(await failure(decodeDatabase(new Uint8Array(raw), { ...ref, rawSha256: sha(Buffer.from('other')) })), 'damaged');
});

test('an empty body, a wrong digest or size, and bytes that do not inflate are damage', async () => {
  assert.equal(await failure(decodeDatabase(new Uint8Array(0), ref)), 'damaged');
  assert.equal(await failure(decodeDatabase(new Uint8Array(gz), { ...ref, sha256: sha(raw) })), 'damaged');
  assert.equal(await failure(decodeDatabase(new Uint8Array(gz), { ...ref, bytes: gz.length + 1 })), 'damaged');
  const broken = Buffer.concat([gz.subarray(0, 12), Buffer.alloc(40, 0x5a), gz.subarray(52)]);
  assert.equal(await failure(decodeDatabase(new Uint8Array(broken), { ...ref, sha256: sha(broken), bytes: broken.length })), 'damaged');
  const inflatedWrong = gzipSync(Buffer.from('not the database'));
  assert.equal(await failure(decodeDatabase(new Uint8Array(inflatedWrong), { ...ref, sha256: sha(inflatedWrong), bytes: inflatedWrong.length })), 'damaged');
});

// PP-C commit 0: schema 4's names file goes through the same checks (one checker, decodeChecked).
test('decodeChecked: the names file is checked as the database is, its name in the message', async () => {
  const { readFileSync } = await import('node:fs');
  const m = JSON.parse(readFileSync(new URL('fixtures/consortium-v2/export/manifest.json', import.meta.url), 'utf8'));
  const body = readFileSync(new URL(`fixtures/consortium-v2/export/${m.names.file}`, import.meta.url));
  const nref = { url: `/data/consortium/${m.names.file}`, sha256: m.names.sha256, bytes: m.names.bytes, rawSha256: m.names.raw_sha256, rawBytes: m.names.raw_bytes };
  const text = new TextDecoder().decode(await decodeChecked(new Uint8Array(body), nref, 'names file'));
  assert.match(text, /^#canopi-names\/1 release_id=r-000000000000f1c7 core_raw_sha256=[0-9a-f]{64}\n/);
  await assert.rejects(decodeChecked(new Uint8Array(body), { ...nref, rawSha256: 'f'.repeat(64) }, 'names file'), /the names file has sha256/);
  assert.equal(await failure(decodeChecked(new Uint8Array(body), { ...nref, bytes: 1 }, 'names file')), 'damaged');
});
