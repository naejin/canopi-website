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

// A download fails when it stalls (no byte for STALL_MS: before the response or between chunks), or
// past BACKSTOP_MS in all; a slow but steady connection is waited for (review R4-4).
const STALL_MS = 15_000;
const BACKSTOP_MS = 90_000;

// The browser is too old for the tool (P4: no DecompressionStream). WebAssembly missing is the
// "turned off" screen instead (P5: iOS Lockdown Mode or a policy removes it from a recent browser).
export function tooOld(): boolean {
  return typeof DecompressionStream !== 'function';
}
export function wasmMissing(): boolean {
  return typeof WebAssembly !== 'object' || typeof WebAssembly.instantiate !== 'function';
}

// The whole body of url (bytes null when the status is not ok). Throws when it did not arrive: a
// network error, a stall, or the backstop.
async function download(url: string): Promise<{ status: number; bytes: Uint8Array | null }> {
  const ctrl = new AbortController();
  let why = '';
  let stall: ReturnType<typeof setTimeout> | undefined;
  const arm = () => { clearTimeout(stall); stall = setTimeout(() => { why = `no byte for ${STALL_MS / 1000} s`; ctrl.abort(); }, STALL_MS); };
  const backstop = setTimeout(() => { why = `not done in ${BACKSTOP_MS / 1000} s`; ctrl.abort(); }, BACKSTOP_MS);
  arm();
  try {
    const res = await fetch(url, { signal: ctrl.signal, credentials: 'same-origin' });
    if (!res.ok) return { status: res.status, bytes: null };
    if (!res.body) return { status: res.status, bytes: new Uint8Array(await res.arrayBuffer()) };
    const reader = res.body.getReader(), parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      arm();
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      size += value.length;
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const p of parts) { bytes.set(p, at); at += p.length; }
    return { status: res.status, bytes };
  } catch (err) {
    throw new Error(why || (err as Error).message);
  } finally {
    clearTimeout(stall);
    clearTimeout(backstop);
  }
}

async function fetchBytes(ref: DbRef): Promise<Uint8Array> {
  let got: { status: number; bytes: Uint8Array | null };
  try {
    got = await download(ref.url);
  } catch (err) {
    throw new LoadError('fetch', `the database did not arrive: ${(err as Error).message}`);
  }
  // A 404 after a deploy: the page is older than the file it names (a stale tab).
  if (got.status === 404) throw new LoadError('stale', `${ref.url} is gone (404)`);
  if (!got.bytes) throw new LoadError('fetch', `${ref.url}: HTTP ${got.status}`);
  return decodeDatabase(got.bytes, ref);
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
  // The wasm is downloaded here, not by the Emscripten loader, so a stall (not a fixed cap) ends it
  // and the failure says which: the file did not arrive (wasm-fetch: the tool did not load, Reload)
  // or WebAssembly refused it (wasm-blocked: compile or instantiate refused). Emscripten never
  // rejects through this hook, so its failures race the init. The URL is the third argument
  // (astro.config.mjs canopi:sqlite-main-thread-only).
  let failed: (err: unknown) => void = () => {};
  const failure = new Promise<never>((_, reject) => { failed = reject; });
  const instantiateWasm = (imports: WebAssembly.Imports, ready: (i: WebAssembly.Instance, m: WebAssembly.Module) => void, url?: string) => {
    void (async () => {
      if (!url) throw new LoadError('wasm-fetch', 'no sqlite3.wasm URL from the loader');
      let got: { status: number; bytes: Uint8Array | null };
      try {
        got = await download(url);
      } catch (err) {
        throw new LoadError('wasm-fetch', `sqlite3.wasm did not arrive: ${(err as Error).message}`);
      }
      if (!got.bytes) throw new LoadError('wasm-fetch', `sqlite3.wasm: HTTP ${got.status}`);
      let module: WebAssembly.Module, instance: WebAssembly.Instance;
      try {
        module = await WebAssembly.compile(got.bytes as Uint8Array<ArrayBuffer>);
        instance = await WebAssembly.instantiate(module, imports);
      } catch (err) {
        throw new LoadError('wasm-blocked', `WebAssembly was refused: ${(err as Error).message}`);
      }
      ready(instance, module);
    })().catch(failed);
    return {};
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const backstop = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new LoadError('wasm-fetch', `sqlite3.wasm did not start in ${BACKSTOP_MS / 1000} s`)), BACKSTOP_MS);
  });
  try {
    // Node (the unit tests) loads the package unpatched: Emscripten reads the wasm file itself there.
    const browser = typeof document !== 'undefined';
    return await Promise.race([init({ print: () => {}, printErr: () => {}, ...(browser ? { instantiateWasm } : {}) }), failure, backstop]);
  } catch (err) {
    if (err instanceof LoadError) throw err;
    throw new LoadError('wasm-blocked', `WebAssembly was refused: ${String((err as Error)?.message ?? err)}`);
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
