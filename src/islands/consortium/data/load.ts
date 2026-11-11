// Opening the consortium database in the browser (stream S1). Design check §2: sqlite-wasm OO1 on the main thread, no OPFS,
// no worker, no COOP/COEP; the gzipped file is fetched whole, its digest checked and decompressed with
// DecompressionStream unless the server already decoded it (P3: no 1f 8b magic; bytes.ts), deserialized read-only, then checked
// against the index the page was built with (§4 "open"). Each failure maps to a §5 screen.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { APPLICATION_ID, SCHEMA_VERSION } from '../../../lib/consortium/types.ts';
import { decodeDatabase, LoadError, type DbRef } from './bytes.ts';

export { LoadError, type DbRef };
// The PlantSource rides in this chunk (out of the island's 60 KB budget, beside the glue it needs);
// main.ts and the S1 browser test take it from here.
export { createSqliteSource } from './sqlite-source.ts';
export interface Expected { releaseId: string; climates: string[] } // climates as the export names them

type Sqlite3 = Awaited<ReturnType<typeof sqlite3InitModule>>;
export type Database = InstanceType<Sqlite3['oo1']['DB']>;
export interface Opened { sqlite3: Sqlite3; db: Database }

const WASM_TIMEOUT_MS = 15_000;
const WASM_FETCH_FAILED = /both async and sync fetching of the wasm failed/;

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
  if (!res.ok) throw new LoadError('fetch', `${ref.url}: HTTP ${res.status}`);
  let body: Uint8Array;
  try {
    body = new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    throw new LoadError('fetch', `the database stopped arriving: ${(err as Error).message}`);
  }
  return decodeDatabase(body, ref);
}

async function initSqlite(): Promise<Sqlite3> {
  // The typings declare no argument; the Emscripten module takes print and printErr. No locateFile:
  // the package finds its wasm with new URL('sqlite3.wasm', import.meta.url), which Vite already
  // emits hashed, so a ?url import would ship a second copy (probe P1).
  const init = sqlite3InitModule as unknown as (opts: Record<string, unknown>) => Promise<Sqlite3>;
  // The bootstrap installs the kvvfs (a VFS kept in localStorage/sessionStorage), whose setup reads
  // globalThis.localStorage: with site data blocked (a cookie block, some private modes) that read
  // throws SecurityError and startup fails as if WebAssembly were off (H1). The page uses neither kvvfs
  // nor OPFS, so both are switched off; the bootstrap reads and deletes this global (sqlite3ApiConfig).
  (globalThis as { sqlite3ApiConfig?: unknown }).sqlite3ApiConfig = {
    disable: { vfs: { kvvfs: true, opfs: true, 'opfs-vfs': true, 'opfs-sahpool': true, 'opfs-wl': true } },
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new LoadError('wasm-blocked', 'WebAssembly did not start in 15 s')), WASM_TIMEOUT_MS);
  });
  try {
    return await Promise.race([init({ print: () => {}, printErr: () => {} }), timeout]);
  } catch (err) {
    if (err instanceof LoadError) throw err;
    const message = String((err as Error)?.message ?? err);
    // The wasm file did not arrive (a 403 from a proxy, offline): the Emscripten loader aborts with
    // this line once both its fetches failed. That is not WebAssembly turned off (review L1).
    if (WASM_FETCH_FAILED.test(message)) throw new LoadError('wasm-fetch', `sqlite3.wasm did not arrive: ${message}`);
    throw new LoadError('wasm-blocked', `WebAssembly was refused: ${message}`);
  } finally {
    clearTimeout(timer);
  }
}

// Fetches, opens and checks the database; throws a LoadError naming its §5 screen.
export async function openDatabase(ref: DbRef, expected: Expected): Promise<Opened> {
  if (tooOld()) throw new LoadError('too-old', 'no DecompressionStream');
  if (wasmMissing()) throw new LoadError('wasm-blocked', 'no WebAssembly');
  const [bytes, sqlite3] = await Promise.all([fetchBytes(ref), initSqlite()]);
  return openWith(sqlite3, bytes, expected);
}

// Opens raw database bytes already in hand (the tests run it with the package's Node build).
export async function openBytes(bytes: Uint8Array, expected: Expected): Promise<Opened> {
  return openWith(await initSqlite(), bytes, expected);
}

// Deserializes read-only, then checks application_id, user_version, the release id and the climates
// against the index the page was built with (§4 "open"); never a partial render on a mismatch.
function openWith(sqlite3: Sqlite3, bytes: Uint8Array, expected: Expected): Opened {
  const { capi, wasm, oo1 } = sqlite3;
  const db = new oo1.DB();
  try {
    // A Node Buffer is a Uint8Array subclass the wasm helper refuses: copy it into a plain view.
    const p = wasm.allocFromTypedArray(bytes.constructor === Uint8Array ? bytes : new Uint8Array(bytes));
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
    let release: unknown, climates: unknown[];
    try {
      release = db.selectValue("SELECT value FROM meta WHERE key = 'release_id'");
      climates = db.selectValues('SELECT id FROM climates ORDER BY ord');
    } catch (err) {
      throw new LoadError('schema', `no meta or climates table: ${(err as Error).message}`);
    }
    if (release !== expected.releaseId || climates.join() !== expected.climates.join())
      throw new LoadError('schema', `release ${String(release)} (${climates.join(', ')}), the page expects ${expected.releaseId} (${expected.climates.join(', ')})`);
    return { sqlite3, db };
  } catch (err) {
    db.close();
    throw err;
  }
}
