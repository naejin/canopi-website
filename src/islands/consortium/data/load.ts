// Opening the consortium database in the browser (stream S1 owns this file; commit 0 holds the
// minimum the shell and probe P1 need). Design check §2: sqlite-wasm OO1 on the main thread, no OPFS,
// no worker, no COOP/COEP; the gzipped file is fetched whole, decompressed with DecompressionStream
// unless the server already decoded it (P3: no 1f 8b magic), deserialized read-only, then checked
// against the index the page was built with (§4 "open"). Each failure maps to a §5 screen.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { APPLICATION_ID, SCHEMA_VERSION } from '../../../lib/consortium/types.ts';
import type { LoadFailure } from '../../../lib/consortium/source.ts';

export interface DbRef { url: string; sha256: string; bytes: number }
export interface Expected { releaseId: string; climates: string[] } // climates as the export names them

export class LoadError extends Error {
  constructor(readonly failure: LoadFailure, message: string) { super(message); }
}

type Sqlite3 = Awaited<ReturnType<typeof sqlite3InitModule>>;
export type Database = InstanceType<Sqlite3['oo1']['DB']>;
export interface Opened { sqlite3: Sqlite3; db: Database }

const WASM_TIMEOUT_MS = 15_000;

// The browser is too old for the tool (P4: no DecompressionStream). WebAssembly missing is the
// "turned off" screen instead (P5: iOS Lockdown Mode or a policy removes it from a recent browser).
export function tooOld(): boolean {
  return typeof DecompressionStream !== 'function';
}
export function wasmMissing(): boolean {
  return typeof WebAssembly !== 'object' || typeof WebAssembly.instantiate !== 'function';
}

async function fetchBytes(ref: DbRef): Promise<Uint8Array> {
  let res: Response;
  try {
    res = await fetch(ref.url);
  } catch (err) {
    throw new LoadError('fetch', `the database did not arrive: ${(err as Error).message}`);
  }
  // A 404 after a deploy: the page is older than the file it names (a stale tab).
  if (res.status === 404) throw new LoadError('stale', `${ref.url} is gone (404)`);
  if (!res.ok || !res.body) throw new LoadError('fetch', `${ref.url}: HTTP ${res.status}`);
  const [head, body] = res.body.tee();
  const peek = head.getReader();
  const first = await peek.read();
  // Cancelled at once, so the tee does not hold a second copy of the body.
  void peek.cancel();
  const gz = !!first.value && first.value[0] === 0x1f && first.value[1] === 0x8b;
  try {
    const stream = gz ? body.pipeThrough(new DecompressionStream('gzip')) : body;
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (err) {
    throw new LoadError('damaged', `${ref.url} does not decompress: ${(err as Error).message}`);
  }
}

async function initSqlite(): Promise<Sqlite3> {
  // The typings declare no argument; the Emscripten module takes print and printErr. No locateFile:
  // the package finds its wasm with new URL('sqlite3.wasm', import.meta.url), which Vite already
  // emits hashed, so a ?url import would ship a second copy (probe P1).
  const init = sqlite3InitModule as unknown as (opts: Record<string, unknown>) => Promise<Sqlite3>;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new LoadError('wasm-blocked', 'WebAssembly did not start in 15 s')), WASM_TIMEOUT_MS);
  });
  try {
    return await Promise.race([init({ print: () => {}, printErr: () => {} }), timeout]);
  } catch (err) {
    if (err instanceof LoadError) throw err;
    throw new LoadError('wasm-blocked', `WebAssembly was refused: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

// Fetches, opens and checks the database; throws a LoadError naming its §5 screen.
export async function openDatabase(ref: DbRef, expected: Expected): Promise<Opened> {
  if (tooOld()) throw new LoadError('too-old', 'no DecompressionStream');
  if (wasmMissing()) throw new LoadError('wasm-blocked', 'no WebAssembly');
  const [bytes, sqlite3] = await Promise.all([fetchBytes(ref), initSqlite()]);
  const { capi, wasm, oo1 } = sqlite3;
  const db = new oo1.DB();
  try {
    const p = wasm.allocFromTypedArray(bytes);
    const rc = capi.sqlite3_deserialize(db.pointer!, 'main', p, bytes.byteLength, bytes.byteLength,
      capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_READONLY);
    if (rc) throw new LoadError('damaged', `sqlite3_deserialize returned ${rc}`);
    let appId: unknown, userVersion: unknown;
    try {
      appId = db.selectValue('PRAGMA application_id');
      userVersion = db.selectValue('PRAGMA user_version');
    } catch (err) {
      throw new LoadError('damaged', `not a database: ${(err as Error).message}`);
    }
    if (appId !== APPLICATION_ID || userVersion !== SCHEMA_VERSION) throw new LoadError('schema', `application_id ${String(appId)}, user_version ${String(userVersion)}`);
    const release = db.selectValue("SELECT value FROM meta WHERE key = 'release_id'");
    const climates = db.selectValues('SELECT id FROM climates ORDER BY ord');
    if (release !== expected.releaseId || climates.join() !== expected.climates.join())
      throw new LoadError('schema', `release ${String(release)} (${climates.join(', ')}), the page expects ${expected.releaseId} (${expected.climates.join(', ')})`);
    return { sqlite3, db };
  } catch (err) {
    db.close();
    throw err;
  }
}
