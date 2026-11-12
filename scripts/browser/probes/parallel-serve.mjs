// Probe P-E1a (E1 design check §3): two `wrangler dev` on one dist-test/ do not disturb each other.
// Two servers (each with its own --persist-to) are fetched every 100 ms for the page, the database
// and a climate tile, while this process writes and deletes a `__canopi-serve-*.txt` marker in
// dist-test/client every 2 s (wrangler watches the assets directory and refreshes the worker on any
// add or unlink, D12). Pass: no failed or 5xx response, both state directories gone after stop, no
// process left in either server's process group, and no file of dist-test/ changed (size, mtime;
// the probe's own markers in dist-test/client aside).
// First run (2026-11-12, both servers on the shared dist-test/): FAIL, 369 of 870 requests failed
// (ECONNREFUSED and timeouts for seconds after each marker event; 0 of 1281 without the markers).
// So serve() now gives each server its own hard-linked copy (A2 fallback); this probe re-checks that.
// Run under the cap:
//   timeout 300 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 \
//     node scripts/browser/probes/parallel-serve.mjs [seconds=60] [basePort=4440]
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUILDS, ROOT, serve } from '../serve.mjs';

const seconds = Number(process.argv[2] ?? 60);
const base = Number(process.argv[3] ?? 4440);
const churnOn = process.argv[4] !== 'no-churn';
const client = join(ROOT, BUILDS.test, 'client');
const index = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'consortium-index.json'), 'utf8'));
const climate = join(client, 'data', 'climate');
const release = readdirSync(climate)[0];
const tile = `/data/climate/${release}/regions/${readdirSync(join(climate, release, 'regions')).find((f) => f.endsWith('.tif'))}`;
const paths = ['/consortium/', index.files[0].url, tile];

const snapshot = () => readdirSync(join(ROOT, BUILDS.test), { recursive: true }).filter((f) => !String(f).includes('__canopi-serve-probe-')).map((f) => { const st = statSync(join(ROOT, BUILDS.test, f)); return st.isFile() ? `${f}:${st.size}:${st.mtimeMs}` : ''; }).filter(Boolean).sort().join('\n');
const before = snapshot();
const servers = [await serve({ port: base }), await serve({ port: base + 2 })];
console.log(`serving ${servers.map((s) => s.url).join(' and ')}; paths ${paths.join(', ')}`);

let markers = 0;
const churn = setInterval(() => {
  if (!churnOn) return;
  const f = join(client, `__canopi-serve-probe-${randomBytes(6).toString('hex')}.txt`);
  writeFileSync(f, 'probe');
  markers += 1;
  setTimeout(() => { rmSync(f, { force: true }); markers += 1; }, 1000);
}, 2000);

const stats = { ok: 0, failed: [] };
const until = Date.now() + seconds * 1000;
async function hammer(site) {
  while (Date.now() < until) {
    await Promise.all(paths.map(async (p) => {
      try {
        const res = await fetch(site.url + p, { signal: AbortSignal.timeout(10_000) });
        await res.arrayBuffer();
        if (res.status >= 500 || !res.ok) stats.failed.push(`${site.url}${p} ${res.status}`); else stats.ok += 1;
      } catch (err) { stats.failed.push(`${site.url}${p} ${err.name}: ${err.message} ${err.cause?.code ?? ''} t=${((Date.now() - until) / 1000 + seconds).toFixed(1)}s`); }
    }));
    await new Promise((r) => setTimeout(r, 100));
  }
}
await Promise.all(servers.map(hammer));
clearInterval(churn);
await new Promise((r) => setTimeout(r, 1100));

const groups = servers.map((s) => s.pid);
const dirs = servers.flatMap((s) => [s.persistTo, s.served]);
for (const s of servers) await s.stop();
const alive = groups.filter((pid) => { try { process.kill(-pid, 0); return true; } catch { return false; } });
const leftDirs = dirs.filter((d) => existsSync(d));
const buildUnchanged = snapshot() === before;
const byServer = Object.fromEntries(servers.map((s) => [s.url, stats.failed.filter((f) => f.startsWith(s.url)).length]));
console.log(JSON.stringify({ seconds, churn: churnOn, byServer, ok: stats.ok, failed: stats.failed.length, firstFailures: stats.failed.filter((_, i) => i % Math.max(1, Math.floor(stats.failed.length / 12)) === 0).slice(0, 12), markerEvents: markers, aliveGroups: alive, leftStateDirs: leftDirs, buildUnchanged }, null, 2));
const pass = stats.failed.length === 0 && alive.length === 0 && leftDirs.length === 0 && buildUnchanged;
console.log(pass ? 'P-E1a PASS' : 'P-E1a FAIL');
process.exit(pass ? 0 : 1);
