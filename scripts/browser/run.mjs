// The browser test runner (E1 design check A11): runs the spec files of a static shard list
// (./shards.json, balanced by hand from measured times; no assigner), shards in parallel, the
// files of a shard one after another, each file in its own memory-capped scope (2 GB) with its own
// port base and wrangler state, and prints the time and memory peak of each file and shard.
//
//   npm run build:browser-test                         (its own capped command, first)
//   node scripts/browser/run.mjs [--list local|ci] [--shard N] [--slots K] [--no-scope] [-- <node --test args>]
//
// - --list local (default): the 3 local shards, at most K at once (default 3), fewer when memory is
//   short: min(K, floor((MemAvailable − 3 GB) / 2 GB)), at least 1, with the reason printed;
// - --list ci --shard N: one shard of the 4 CI shards (a matrix job runs one, unscoped);
// - --no-scope: no systemd-run (CI, or a machine without it); also when systemd-run is missing;
// - after --, arguments go to each node --test (e.g. --test-name-pattern="@real-data").
// Slot k's files take ports from CANOPI_BROWSER_PORT (default 4420) + 8k; serve() moves up past a
// taken pair (design check A2).
// Each file: node --test with --test-timeout=90000 (a test that needs more declares { timeout }),
// --test-force-exit and one process (--experimental-test-isolation=none), so the timeout is per
// test and a signal reaches the harness. A file is killed at FILE_CAP_S (9 min, the local shard
// budget: every command here runs under timeout 600). Logs, JUnit XML and traces go to
// test-results/browser/. Times only warn (above the ratchet in shards.json); nothing fails on time.
// SIGINT/SIGTERM stop every running file (its whole scope: node, Chrome, wrangler) and exit.
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILDS, PORTS, ROOT } from './serve.mjs';

export const SHARDS_FILE = join(ROOT, 'scripts', 'browser', 'shards.json');
export const RESULTS = join(ROOT, 'test-results', 'browser');
export const SLOT_GB = 2;
export const RESERVE_GB = 3;
export const FILE_CAP_S = 540;
const GB = 1024 ** 3;

// How many slots fit: min(wanted, floor((available − 3 GB) / 2 GB)), at least 1 (failure row F15).
export function slotsFor(availableBytes, wanted) {
  const fit = Math.floor((availableBytes - RESERVE_GB * GB) / (SLOT_GB * GB));
  const slots = Math.max(1, Math.min(wanted, fit));
  const why = slots < wanted
    ? `${slots} slot${slots === 1 ? '' : 's'}, not ${wanted}: ${(availableBytes / GB).toFixed(1)} GB available, ${RESERVE_GB} GB kept free, ${SLOT_GB} GB a slot`
    : `${slots} slots (${(availableBytes / GB).toFixed(1)} GB available)`;
  return { slots, why };
}

export function memAvailable(meminfo = readFileSync('/proc/meminfo', 'utf8')) {
  const kb = Number(meminfo.match(/^MemAvailable:\s+(\d+)\s+kB/m)?.[1]);
  if (!Number.isFinite(kb)) throw new Error('no MemAvailable in /proc/meminfo');
  return kb * 1024;
}

// The built site the browser tests serve, or the command that builds it (failure row F16).
export function builtProblem(root = ROOT) {
  return existsSync(join(root, BUILDS.test, 'client', 'index.html')) && existsSync(join(root, BUILDS.test, 'consortium-chunks.json'))
    ? null
    : `no browser-test build in ${BUILDS.test}/: run \`npm run build:browser-test\` first (capped: timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 npm run build:browser-test)`;
}

export function readShards(file = SHARDS_FILE) { return JSON.parse(readFileSync(file, 'utf8')); }

export function parseArgs(argv) {
  const opts = { list: 'local', shard: null, slots: 3, scope: true, extra: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { opts.extra = argv.slice(i + 1); break; }
    if (a === '--list') opts.list = argv[++i];
    else if (a === '--shard') opts.shard = Number(argv[++i]);
    else if (a === '--slots') opts.slots = Number(argv[++i]);
    else if (a === '--no-scope') opts.scope = false;
    else throw new Error(`unknown option ${a}`);
  }
  if (!['local', 'ci'].includes(opts.list)) throw new Error(`--list local|ci (got ${opts.list})`);
  if (!Number.isInteger(opts.slots) || opts.slots < 1) throw new Error('--slots takes a whole number ≥ 1');
  return opts;
}

const hasSystemdRun = () => spawnSync('systemd-run', ['--version'], { stdio: 'ignore' }).status === 0;
const fmtS = (ms) => `${(ms / 1000).toFixed(0)} s`;
const fmtGB = (b) => (b == null ? '? GB' : `${(b / GB).toFixed(2)} GB`);

// Runs one spec file; resolves { file, ms, code, signal, peak, pass, fail, cancelled, failed[], log }.
function runFile(file, { port, scope, extra, tag, unit }) {
  const name = file.replace(/\.browser\.test\.mjs$/, '');
  mkdirSync(join(RESULTS, 'logs'), { recursive: true });
  mkdirSync(join(RESULTS, 'junit'), { recursive: true });
  const log = join(RESULTS, 'logs', `${name}.log`);
  const peakFile = join(RESULTS, 'logs', `${name}.peak`);
  rmSync(peakFile, { force: true });
  const nodeArgs = ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--test', '--experimental-test-isolation=none',
    '--test-timeout=90000', '--test-force-exit', '--test-reporter=spec', '--test-reporter-destination=stdout',
    '--test-reporter=junit', `--test-reporter-destination=${join(RESULTS, 'junit', `${name}.xml`)}`, ...extra, join('scripts', 'browser', file)];
  // Inside the scope: the file, then its cgroup's memory.peak written beside the log.
  const inner = `"$@"; e=$?; cat "/sys/fs/cgroup$(sed -n 's/^0:://p' /proc/self/cgroup)/memory.peak" > ${JSON.stringify(peakFile)} 2>/dev/null; exit $e`;
  const cmd = scope
    ? ['systemd-run', ['--user', '--scope', '-q', `--unit=${unit}`, '-p', `MemoryMax=${SLOT_GB}G`, '-p', 'MemorySwapMax=0', 'bash', '-c', inner, 'bash', process.execPath, ...nodeArgs]]
    : ['bash', ['-c', inner, 'bash', process.execPath, ...nodeArgs]];
  const t0 = Date.now();
  const child = spawn(cmd[0], cmd[1], { cwd: ROOT, env: { ...process.env, CANOPI_BROWSER_PORT: String(port), FORCE_COLOR: '0' }, stdio: ['ignore', 'pipe', 'pipe'], detached: !scope });
  const out = createWriteStream(log);
  let text = '';
  const keep = (c) => { out.write(c); text += c; };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  let capped = false;
  const cap = setTimeout(() => { capped = true; stopChild(child, scope, unit); }, FILE_CAP_S * 1000);
  running.add({ child, scope, unit });
  return new Promise((done) => child.on('close', (code, signal) => {
    clearTimeout(cap);
    for (const r of running) if (r.child === child) running.delete(r);
    out.end();
    const num = (k) => Number(text.match(new RegExp(`^ℹ ${k} (\\d+)`, 'm'))?.[1] ?? NaN);
    const failed = [...new Set([...text.matchAll(/^\s*✖ (.+?) \(\d/gm)].map((m) => m[1]))];
    const peak = existsSync(peakFile) ? Number(readFileSync(peakFile, 'utf8').trim()) : null;
    done({ file, tag, ms: Date.now() - t0, code, signal, capped, peak, pass: num('pass'), fail: num('fail'), cancelled: num('cancelled'), failed, log });
  }));
}

const running = new Set();
function stopChild(child, scope, unit, sig = 'SIGTERM') {
  if (scope) spawnSync('systemctl', ['--user', 'kill', `--signal=${sig}`, `${unit}.scope`], { stdio: 'ignore' });
  else { try { process.kill(-child.pid, sig); } catch { /* gone */ } }
  setTimeout(() => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    if (scope) spawnSync('systemctl', ['--user', 'kill', '--signal=SIGKILL', `${unit}.scope`], { stdio: 'ignore' });
    else { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } }
  }, 10_000).unref();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const problem = builtProblem();
  if (problem) { console.error(problem); process.exit(2); }
  const config = readShards();
  let shards = config[opts.list];
  if (opts.shard !== null) {
    if (!shards[opts.shard - 1]) throw new Error(`--shard ${opts.shard}: the ${opts.list} list has ${shards.length} shards`);
    shards = [shards[opts.shard - 1]];
  }
  const scope = opts.scope && hasSystemdRun();
  if (opts.scope && !scope) console.log('systemd-run not found: files run unscoped (failure row F20)');
  let slots = Math.min(opts.slots, shards.length);
  if (scope) {
    const fit = slotsFor(memAvailable(), slots);
    slots = fit.slots;
    console.log(`browser tests: ${fit.why}`);
  }
  const base = Number(process.env.CANOPI_BROWSER_PORT ?? PORTS.min);
  const run = `${Date.now().toString(36)}${process.pid}`;
  const t0 = Date.now();
  const results = [];
  let stopping = false;
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      if (stopping) return;
      stopping = true;
      console.error(`\n${sig}: stopping ${running.size} running file(s)`);
      for (const r of running) stopChild(r.child, r.scope, r.unit);
      setTimeout(() => process.exit(130), 12_000).unref();
    });
  }
  const queue = shards.map((files, i) => ({ files, index: opts.shard ?? i + 1 }));
  const shardTimes = [];
  async function worker(slot) {
    for (let next = queue.shift(); next && !stopping; next = queue.shift()) {
      const s0 = Date.now();
      let peak = 0;
      for (const file of next.files) {
        if (stopping) break;
        const r = await runFile(file, { port: base + 8 * slot, scope, extra: opts.extra, tag: `shard ${next.index}`, unit: `canopi-browser-${run}-${slot}-${results.length}` });
        results.push(r);
        peak = Math.max(peak, r.peak ?? 0);
        const status = r.capped ? `KILLED at the ${FILE_CAP_S} s file cap`
          : r.signal === 'SIGKILL' || r.code === 137 ? `KILLED (signal 9: out of memory in its ${SLOT_GB} GB scope? journalctl --user --since "10 min ago" | grep oom-kill)`
          : `pass ${r.pass} fail ${r.fail}${r.cancelled ? ` cancelled ${r.cancelled}` : ''}`;
        console.log(`[shard ${next.index}] ${file.replace('.browser.test.mjs', '')}: ${status} · ${fmtS(r.ms)} · peak ${fmtGB(r.peak)}`);
        for (const f of r.failed) console.log(`    ✖ ${f}`);
        if (r.code !== 0) console.log(`    log: ${r.log}`);
      }
      shardTimes.push({ index: next.index, ms: Date.now() - s0, peak, files: next.files.length });
    }
  }
  await Promise.all(Array.from({ length: slots }, (_, k) => worker(k)));
  const ratchet = config.ratchet?.[opts.list] ?? {};
  console.log('\nshards:');
  for (const s of shardTimes.sort((a, b) => a.index - b.index)) {
    const limit = ratchet[String(s.index)];
    const warn = limit && s.ms / 1000 > limit ? `  WARNING: above its ratchet of ${limit} s${s.ms / 1000 > limit * 1.5 ? ' by more than 1.5×: rebalance shards.json' : ''}` : '';
    console.log(`  shard ${s.index}: ${s.files} files · ${fmtS(s.ms)} · peak ${fmtGB(s.peak)}${warn}`);
  }
  const bad = results.filter((r) => r.code !== 0);
  console.log(`\nbrowser tests: ${results.length} files, ${results.reduce((n, r) => n + (r.pass || 0), 0)} passed, ${bad.length} file(s) failed · wall ${fmtS(Date.now() - t0)} on ${slots} slot(s)`);
  const missing = shards.flat().filter((f) => !results.some((r) => r.file === f));
  if (missing.length) console.log(`not run: ${missing.join(', ')}`);
  process.exit(bad.length || missing.length || stopping ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err); process.exit(2); });
}

// Every spec file under scripts/browser/ (for the policy test: each in each list exactly once).
export const specFiles = () => readdirSync(join(ROOT, 'scripts', 'browser')).filter((f) => f.endsWith('.browser.test.mjs')).sort();
