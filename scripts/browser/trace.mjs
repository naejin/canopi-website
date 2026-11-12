// What a failed browser test leaves behind (E1 design check A10, failure rows F5, F8, F11): each
// page's console, page errors, failed requests and responses ≥ 400 in ring buffers of 200 entries,
// and, when a test fails, test-results/browser/<file>/<test-slug>/{console,network}.txt and
// screenshot.png (the last page still open, raced against 5 s). test-results/ is gitignored.
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { ROOT } from './serve.mjs';

const RING = 200;
const TRACE_ROOT = join(ROOT, 'test-results', 'browser');

const push = (ring, line) => { ring.push(line); if (ring.length > RING) ring.splice(0, ring.length - RING); };

// Starts recording a page; returns its trace { label, console, network, notes }.
export function recordTrace(page, label, t0 = Date.now()) {
  const trace = { label, console: [], network: [], notes: [], page };
  const at = () => `+${((Date.now() - t0) / 1000).toFixed(2)}s`;
  trace.note = (line) => push(trace.notes, `${at()} ${line}`);
  page.on('console', (m) => push(trace.console, `${at()} [${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => push(trace.console, `${at()} [pageerror] ${e?.message ?? e}`));
  page.on('error', (e) => { push(trace.console, `${at()} [crash] ${e?.message ?? e}`); trace.note(`page crashed: ${e?.message ?? e}`); });
  page.on('requestfailed', (r) => push(trace.network, `${at()} FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText ?? ''}`));
  page.on('response', (r) => { if (r.status() >= 400) push(trace.network, `${at()} ${r.status()} ${r.request().method()} ${r.url()}`); });
  page.on('close', () => trace.note('page closed'));
  return trace;
}

const slug = (title) => String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'test';

// Writes the traces of the pages a failed test opened. Never throws (a dump must not hide the
// failure it explains). Returns the directory written.
export async function dumpTrace({ file, title, traces, notes = [] }) {
  const dir = join(TRACE_ROOT, basename(file ?? 'unknown').replace(/\.browser\.test\.mjs$|\.mjs$/, ''), slug(title));
  try {
    mkdirSync(dir, { recursive: true });
    const section = (key) => traces.map((tr) => `== ${tr.label}\n${[...(key === 'console' ? tr.notes : []), ...tr[key]].join('\n')}`).join('\n\n');
    writeFileSync(join(dir, 'console.txt'), `${notes.map((n) => `# ${n}\n`).join('')}${section('console')}\n`);
    writeFileSync(join(dir, 'network.txt'), `${section('network')}\n`);
    const last = [...traces].reverse().find((tr) => tr.page && !tr.page.isClosed());
    let shot = null;
    if (last) {
      shot = await Promise.race([
        last.page.screenshot({ type: 'png' }).catch(() => null),
        new Promise((r) => setTimeout(() => r(null), 5000).unref()),
      ]);
    }
    writeFileSync(join(dir, 'screenshot.png'), shot ?? Buffer.alloc(0));
  } catch { /* the failure itself is reported by the runner */ }
  return dir;
}
