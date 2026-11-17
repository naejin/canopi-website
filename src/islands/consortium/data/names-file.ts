// Schema 4's names file, fetched and checked (PP-C c1, fix round 1 A7; design check c1 section 4),
// beside load.ts in the data layer: the bytes the page names in #ct-data `names` (views/kit/page.ts
// PageData), their digests checked by bytes.ts decodeChecked (the database's one checker, loaded on
// demand: it lives in the loader's chunk), and the header matched to the page's database (4.4). The
// views keep only the state (views/find/names.ts): this returns the file's text or a NamesFileError
// saying whether a later try may work.
//
// A download fails when it stalls (no byte for STALL_MS, before the response or between chunks), as
// load.ts's database download does: a stalled request is aborted, so the next focus can try again
// (4.2). Hand-off (fix round 1): load.ts keeps its own `download` unexported (not this stream's file);
// once it is exported this file calls it and drops `fetchBody`.
import type { DbRef } from './bytes.ts';
import { namesFor, namesHeader, type NamesHeader } from './search.ts';

const STALL_MS = 15_000;

// retry: true for a file that did not arrive (not found, offline, stalled: the next focus tries again,
// 4.2); false for one that arrived wrong (digest mismatch 4.3, another database 4.4: dropped until the
// page reloads).
export class NamesFileError extends Error {
  readonly retry: boolean;
  constructor(retry: boolean, message: string) { super(message); this.retry = retry; }
}

async function fetchBody(url: string): Promise<Uint8Array> {
  const ctrl = new AbortController();
  let why = '';
  let stall: ReturnType<typeof setTimeout> | undefined;
  // The browser-test build lets a test shorten the stall (window.__ctTimeouts.stall), as load.ts does.
  const ms = typeof __CT_TEST_HOOK__ !== 'undefined' && __CT_TEST_HOOK__ ? Number((globalThis as { __ctTimeouts?: { stall?: number } }).__ctTimeouts?.stall) || STALL_MS : STALL_MS;
  const arm = () => { clearTimeout(stall); stall = setTimeout(() => { why = `no byte for ${ms / 1000} s`; ctrl.abort(); }, ms); };
  arm();
  try {
    const res = await fetch(url, { signal: ctrl.signal, credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) return new Uint8Array(await res.arrayBuffer());
    const reader = res.body.getReader(), parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      arm();
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      size += value.length;
    }
    const out = new Uint8Array(size);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  } catch (err) {
    throw new NamesFileError(true, `${url} did not arrive: ${why || (err as Error).message}`);
  } finally {
    clearTimeout(stall);
  }
}

// The names file's text, checked to belong to the page's database (`page`: its release id and core
// raw sha256), or a NamesFileError.
export async function loadNamesFile(ref: DbRef, page: NamesHeader): Promise<string> {
  const body = await fetchBody(ref.url);
  let text: string;
  try {
    const { decodeChecked } = await import('./bytes.ts');
    text = new TextDecoder().decode(await decodeChecked(body, ref, 'names file'));
  } catch (err) {
    throw new NamesFileError(false, (err as Error).message);
  }
  if (!namesFor(namesHeader(text), page)) throw new NamesFileError(false, `${ref.url} belongs to another database`);
  return text;
}
