// Serves a built site with `wrangler dev` (the browser tests' dist-test/ from `npm run
// build:browser-test` by default; consortium-timing.mjs serves the production dist/), as Cloudflare Workers serves
// it: static assets, public/_headers, _redirects. Browser tests only (design check A10): one server
// per spec file's harness (run.mjs runs files in parallel slots, each with its own port base) on a
// port in 4420–4499 (CANOPI_BROWSER_PORT, default 4420; the dev server's 4321 is never used), its
// inspector on the next port. It runs in its own process group and is stopped by its own
// pid, never by port. It serves its own hard-linked copy of the build with its own wrangler state
// (--persist-to), both removed when it stops, so servers in parallel never disturb each other (probe
// P-E1a). Before it starts, a file with a random name and content is written into that copy; the
// server counts as up only once it serves that file and is still running, so a stray server already
// on the port (another worktree's, an orphan) is never taken for this one (review B5).
//
//   node scripts/browser/serve.mjs [port]   (serves until Ctrl-C)
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PORTS = { min: 4420, max: 4499 };
// The browser tests' own build (astro.config.mjs outDir with CANOPI_BROWSER_TEST=1) and production's.
export const BUILDS = { test: 'dist-test', production: 'dist' };
const READY_TIMEOUT_MS = 90_000;

export function portFrom(value = process.env.CANOPI_BROWSER_PORT ?? '4420') {
  const port = Number(value);
  // The inspector takes port + 1, so the last usable port is max - 1.
  if (!Number.isInteger(port) || port < PORTS.min || port > PORTS.max - 1) throw new Error(`browser tests use ports ${PORTS.min}–${PORTS.max - 1} (got ${value})`);
  return port;
}

// Whether a TCP port binds on 127.0.0.1 right now.
export const portFree = (port) => new Promise((resolve) => {
  const srv = createServer();
  srv.once('error', () => resolve(false));
  srv.listen({ port, host: '127.0.0.1', exclusive: true }, () => srv.close(() => resolve(true)));
});

// The first even port from `from` (a slot's base: run.mjs gives slot k CANOPI_BROWSER_PORT + 8k) whose port and
// port + 1 (the inspector) both bind (design check A2, failure row F1): another worktree's suite or
// an orphan on the base moves this server up, never onto that server.
export async function freePortPair(from = portFrom()) {
  for (let port = from + (from % 2); port <= PORTS.max - 1; port += 2) {
    if ((await portFree(port)) && (await portFree(port + 1))) return port;
  }
  throw new Error(`no free port pair in ${from}–${PORTS.max}`);
}

const START_ATTEMPTS = 3;

// Starts wrangler dev and resolves once the site answers; returns { url, port, pid, dir, served,
// exited(), stop }. The port is the first free pair from `port`; if wrangler exits before
// serving (a port taken between the probe and its bind), the next pair is tried, 3 times at most.
export async function serve({ port = portFrom(), log = () => {}, dir = BUILDS.test } = {}) {
  if (!existsSync(join(ROOT, dir, 'client', 'index.html'))) throw new Error(`no built site in ${dir}/: run \`npm run ${dir === BUILDS.test ? 'build:browser-test' : 'build'}\` first`);
  let from = port;
  for (let attempt = 1; ; attempt++) {
    const p = await freePortPair(from);
    try { return await serveOn(p, { log, dir }); } catch (err) {
      if (!err.beforeServing || attempt >= START_ATTEMPTS) throw err;
      log(`wrangler dev exited before serving on ${p}; trying the next port pair\n`);
      from = p + 2;
    }
  }
}

async function serveOn(port, { log, dir }) {
  // Each server serves its own hard-linked copy of the build (probe P-E1a, design check A2): wrangler
  // watches its assets directory and restarts the worker on any file added or removed, so one shared
  // dist-test/ let another server's marker (written at its start, removed at its stop) drop this
  // server's connections for seconds (ECONNREFUSED, timeouts). `cp -al` takes well under a second and
  // no extra bytes; across filesystems it falls back to a plain copy. Removed on stop.
  const scratch = mkdtempSync(join(tmpdir(), 'canopi-serve-'));
  const site = join(scratch, 'site');
  try { execFileSync('cp', ['-al', join(ROOT, dir), site], { stdio: 'ignore' }); }
  catch { rmSync(site, { recursive: true, force: true }); cpSync(join(ROOT, dir), site, { recursive: true }); }
  const token = randomBytes(12).toString('hex');
  const markerPath = `/__canopi-serve-${token}.txt`;
  // A new file in the copy only (a hard link is never written through).
  writeFileSync(join(site, 'client', markerPath), token);
  // Its own wrangler state too (the generated config's KV binding SESSION would otherwise persist
  // under <ROOT>/.wrangler/state, shared by every server: D12, A2).
  const persistTo = join(scratch, 'state');
  const dropScratch = () => rmSync(scratch, { recursive: true, force: true });
  const bin = join(ROOT, 'node_modules', '.bin', 'wrangler');
  // The build's own generated config (its assets beside it), never the .wrangler redirect, which
  // names whichever build ran last.
  const child = spawn(bin, ['dev', '--config', join(site, 'server', 'wrangler.json'), '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', String(port + 1), '--persist-to', persistTo, '--log-level', 'warn', '--show-interactive-dev-session=false'], {
    cwd: ROOT,
    detached: true, // its own process group: stop() ends wrangler and workerd together
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1', NO_COLOR: '1' },
  });
  let output = '';
  const keep = (chunk) => { output = (output + chunk).slice(-8000); log(String(chunk)); };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  let exited = null;
  const done = new Promise((r) => child.on('exit', (code, signal) => { exited = { code, signal }; r(); }));

  // Its stdio is destroyed and unreferenced once it stops, so no pipe keeps a test file's process
  // alive after its tests (failure row F10).
  const release = () => { for (const s of [child.stdout, child.stderr]) { s?.destroy(); } child.unref(); };
  const stop = async () => {
    if (!exited) {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ }
      const killed = await Promise.race([done.then(() => true), new Promise((r) => setTimeout(() => r(false), 5000))]);
      if (!killed) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } await done; }
    }
    release();
    dropScratch();
  };

  // If this process ends without stop() (a timeout's SIGTERM, Ctrl-C, an uncaught error), the
  // server's process group and the marker go with it, so no orphan keeps the port.
  const kill = () => { if (!exited) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } } dropScratch(); };
  process.once('exit', kill);
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.once(sig, () => { kill(); process.exit(128 + (sig === 'SIGINT' ? 2 : sig === 'SIGHUP' ? 1 : 15)); });

  const url = `http://127.0.0.1:${port}`;
  const start = Date.now();
  for (;;) {
    if (exited) { release(); dropScratch(); throw Object.assign(new Error(`wrangler dev exited (${exited.code ?? exited.signal}) before serving (is port ${port} taken?):\n${output}`), { beforeServing: true }); }
    try {
      const res = await fetch(`${url}${markerPath}`, { signal: AbortSignal.timeout(2000) });
      const body = await res.text();
      if (res.ok && body.trim() === token && !exited) break;
    } catch { /* not up yet */ }
    if (Date.now() - start > READY_TIMEOUT_MS) { await stop(); throw new Error(`wrangler dev did not answer on ${url} in ${READY_TIMEOUT_MS / 1000} s:\n${output}`); }
    await new Promise((r) => setTimeout(r, 300));
  }
    // exited(): null while it serves, else { code, signal } (the harness fails the next page at once).
  return { url, port, pid: child.pid, dir, served: site, exited: () => exited, stop };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const site = await serve({ port: portFrom(process.argv[2]), log: (s) => process.stderr.write(s) });
  console.log(`Serving the built site on ${site.url} (pid ${site.pid}); Ctrl-C stops it.`);
  const quit = () => site.stop().then(() => process.exit(0));
  process.on('SIGINT', quit);
  process.on('SIGTERM', quit);
}
