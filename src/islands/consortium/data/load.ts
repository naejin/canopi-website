// Opening the consortium database in the browser (stream S1). Design check §2: sqlite-wasm OO1 on the main thread, no OPFS,
// no worker, no COOP/COEP; the gzipped file is fetched whole, its digest checked and decompressed with
// DecompressionStream unless the server already decoded it (P3: no 1f 8b magic; bytes.ts), deserialized read-only, then checked
// against the index the page was built with (§4 "open"). Each failure maps to a §5 screen.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { APPLICATION_ID, SCHEMA_VERSION } from '../../../lib/consortium/types.ts';
import { decodeDatabase, LoadError, type DbRef } from './bytes.ts';

export { LoadError, type DbRef };
// The PlantSource rides in this chunk (not the first run: beside the sqlite glue it needs);
// main.ts and the S1 browser test take it from here.
export { createSqliteSource } from './sqlite-source.ts';
export interface Expected { releaseId: string; climates: string[] } // climates as the export names them

type Sqlite3 = Awaited<ReturnType<typeof sqlite3InitModule>>;
export type Database = InstanceType<Sqlite3['oo1']['DB']>;
export interface Opened { sqlite3: Sqlite3; db: Database }

// A download fails when it stalls: no byte for STALL_MS, before the response or between chunks. A
// slow but steady connection is waited for, however long it takes (review R4-4).
const STALL_MS = 15_000;

// The browser is too old for the tool (P4: no DecompressionStream). WebAssembly missing is the
// "turned off" screen instead (P5: iOS Lockdown Mode or a policy removes it from a recent browser).
export function tooOld(): boolean {
  return typeof DecompressionStream !== 'function';
}
export function wasmMissing(): boolean {
  return typeof WebAssembly !== 'object' || typeof WebAssembly.instantiate !== 'function';
}

// The whole body of url (bytes null when the status is not ok). Throws when it did not arrive: a
// network error or a stall.
async function download(url: string): Promise<{ status: number; bytes: Uint8Array | null }> {
  const ctrl = new AbortController();
  let why = '';
  let stall: ReturnType<typeof setTimeout> | undefined;
  // The browser-test build lets a test shorten it (window.__ctTimeouts.stall, set before the page
  // loads: E1 design check A4); the typeof guard keeps node unit tests, which have no define, working,
  // and the production build folds the expression to STALL_MS (written inline so nothing is left).
  const ms = typeof __CT_TEST_HOOK__ !== 'undefined' && __CT_TEST_HOOK__ ? Number((globalThis as { __ctTimeouts?: { stall?: number } }).__ctTimeouts?.stall) || STALL_MS : STALL_MS;
  const arm = () => { clearTimeout(stall); stall = setTimeout(() => { why = `no byte for ${ms / 1000} s`; ctrl.abort(); }, ms); };
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

// wasmUrl: the page downloads the wasm itself (main.ts passes the URL), so a stall ends it and the
// failure says which: the file did not arrive (wasm-fetch: the tool did not load, Reload) or
// WebAssembly refused it (wasm-blocked: compile or instantiate refused). Without it (Node's unit
// tests, the browser tests' own opens) the Emscripten loader fetches the file itself.
async function initSqlite(wasmUrl?: string): Promise<Sqlite3> {
  // The typings declare no argument; the Emscripten module takes print, printErr and instantiateWasm.
  const init = sqlite3InitModule as unknown as (opts: Record<string, unknown>) => Promise<Sqlite3>;
  // The bootstrap installs the kvvfs (a VFS kept in localStorage/sessionStorage), whose setup reads
  // globalThis.localStorage: with site data blocked (a cookie block, some private modes) that read
  // throws SecurityError and startup fails as if WebAssembly were off (H1). The page uses neither kvvfs
  // nor OPFS, so both are switched off; the bootstrap reads and deletes this global (sqlite3ApiConfig).
  (globalThis as { sqlite3ApiConfig?: unknown }).sqlite3ApiConfig = {
    disable: { vfs: { kvvfs: true, opfs: true, 'opfs-vfs': true, 'opfs-sahpool': true, 'opfs-wl': true } },
  };
  const refused = (err: unknown) => new LoadError('wasm-blocked', `WebAssembly was refused: ${String((err as Error)?.message ?? err)}`);
  const opts: Record<string, unknown> = { print: () => {}, printErr: () => {} };
  // Emscripten never rejects through instantiateWasm, so a refused instantiate races the init.
  let failed: (err: unknown) => void = () => {};
  const failure = new Promise<never>((_, reject) => { failed = reject; });
  if (wasmUrl) {
    let got: { status: number; bytes: Uint8Array | null };
    try {
      got = await download(wasmUrl);
    } catch (err) {
      throw new LoadError('wasm-fetch', `sqlite3.wasm did not arrive: ${(err as Error).message}`);
    }
    if (!got.bytes) throw new LoadError('wasm-fetch', `sqlite3.wasm: HTTP ${got.status}`);
    let module: WebAssembly.Module;
    try {
      module = await WebAssembly.compile(got.bytes as Uint8Array<ArrayBuffer>);
    } catch (err) {
      throw refused(err);
    }
    opts.instantiateWasm = (imports: WebAssembly.Imports, ready: (i: WebAssembly.Instance, m: WebAssembly.Module) => void) => {
      WebAssembly.instantiate(module, imports).then((instance) => ready(instance, module), (err: unknown) => failed(refused(err)));
      return {};
    };
  }
  try {
    return await Promise.race([init(opts), failure]);
  } catch (err) {
    if (err instanceof LoadError) throw err;
    throw refused(err);
  }
}

// Fetches, opens and checks the database; throws a LoadError naming its §5 screen.
export async function openDatabase(ref: DbRef, expected: Expected, wasmUrl?: string): Promise<Opened> {
  if (tooOld()) throw new LoadError('too-old', 'no DecompressionStream');
  if (wasmMissing()) throw new LoadError('wasm-blocked', 'no WebAssembly');
  const [bytes, sqlite3] = await Promise.all([fetchBytes(ref), initSqlite(wasmUrl)]);
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
