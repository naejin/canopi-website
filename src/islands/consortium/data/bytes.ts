// The database's bytes, checked before SQLite sees them (stream S1 owns this file with load.ts). No
// sqlite-wasm here, so node --test runs it (scripts/consortium-load.test.mjs). The whole body is in
// hand (≤ 1 MB gzipped, the installer's limit): the gzip magic is read from it, never from one
// stream chunk, and the digests the page was built with are checked, the gzipped file's when the
// magic is there, the raw database's when the server already decoded it (P3).
import type { LoadFailure } from '../../../lib/consortium/source.ts';

// What the page names (ConsortiumPage.astro, from src/data/consortium-index.json).
export interface DbRef { url: string; sha256: string; bytes: number; rawSha256: string; rawBytes: number }

export class LoadError extends Error {
  readonly failure: LoadFailure;
  constructor(failure: LoadFailure, message: string) { super(message); this.failure = failure; }
}

export const isGzip = (b: Uint8Array): boolean => b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b;

// sha256 as lowercase hex; null where SubtleCrypto is missing (a page served over plain http on a
// LAN), when only the size is checked.
async function sha256Hex(b: Uint8Array): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = new Uint8Array(await subtle.digest('SHA-256', b as Uint8Array<ArrayBuffer>));
  return Array.from(digest, (x) => x.toString(16).padStart(2, '0')).join('');
}

async function check(b: Uint8Array, sha256: string, bytes: number, what: string, url: string): Promise<void> {
  if (b.byteLength !== bytes) throw new LoadError('damaged', `${url}: the ${what} is ${b.byteLength} bytes, the page expects ${bytes}`);
  const got = await sha256Hex(b);
  if (got !== null && got !== sha256) throw new LoadError('damaged', `${url}: the ${what} has sha256 ${got}, the page expects ${sha256}`);
}

async function inflate(gz: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([gz as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// The raw database from the fetched body, or a LoadError('damaged').
export async function decodeDatabase(body: Uint8Array, ref: DbRef): Promise<Uint8Array> {
  if (!body.byteLength) throw new LoadError('damaged', `${ref.url}: empty body`);
  if (!isGzip(body)) {
    await check(body, ref.rawSha256, ref.rawBytes, 'decoded database', ref.url);
    return body;
  }
  await check(body, ref.sha256, ref.bytes, 'gzipped file', ref.url);
  let raw: Uint8Array;
  try {
    raw = await inflate(body);
  } catch (err) {
    throw new LoadError('damaged', `${ref.url} does not decompress: ${(err as Error).message}`);
  }
  await check(raw, ref.rawSha256, ref.rawBytes, 'database', ref.url);
  return raw;
}
