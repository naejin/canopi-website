// Consortium v2 cold and warm time to first view (design check §8, E6 A7, A8), run on demand and
// nightly (.github/workflows/nightly.yml), never by npm test:
//   npm run build && timeout 900 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 \
//     npm run timing:consortium -- [--ratchet scripts/browser/timing.json] [--dir <build dir>]
// (CANOPI_BROWSER_PORT picks the port, as for the browser tests; CANOPI_TIMING_PROFILES=desktop or
// =phone runs one profile, CANOPI_TIMING_RUNS changes the 5 runs; --dir times another production
// build, e.g. a copy of dist/ kept from before a change, for a local before/after comparison.) Each
// run opens a #v=4 link of 9 real Temperate plants (built with the core's encodeLink, so the page
// restores a consortium and draws its matrix) and reads the time of `performance.mark('ct:first-view')`
// (the consortium is first on screen; `ct:matrix`, its name until E6 stream R4's rename merges, is
// read when the new name is absent) from the start of navigation; a page that never sets it fails the
// run. Cold: a fresh browser context (empty cache), a first visit. Warm: the same context reloaded
// (HTTP cache filled). Prints the median of 5 of each, per profile:
// - desktop: 1280 px, 4× CPU slowdown, 9 Mbps down and up, 60 ms RTT (the §8 numbers so far);
// - phone: a slow phone, 390 px mobile, 4× CPU slowdown and "Slow 4G" (~1.6 Mbps down, ~0.75 Mbps
//   up, 400 ms RTT). The plan's slow-phone goal is ≤ 6 s cold by F1a's exit.
// --ratchet <file> (A8, R10): compares each median with the file's value for its profile and visit
// (milliseconds): above it, a warning; above 1.5× it, exit 1. A null value (not measured on a CI
// runner yet) is printed and not compared. The values come from the nightly runner's output only
// (the `timing-json:` line), never from a local run (a different CPU under the same 4× slowdown).
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MARKS = ['ct:first-view', 'ct:matrix'];
// Above the ratchet: a warning; above this many times it: a failure (plan choice 11, R10).
export const FAIL_FACTOR = 1.5;
// Network throughput in bytes per second (CDP Network.emulateNetworkConditions), latency in ms.
export const PROFILES = {
  desktop: { width: 1280, cpu: 4, network: { download: 9e6 / 8, upload: 9e6 / 8, latency: 60 }, label: '1280 px, 4× CPU, 9 Mbps, 60 ms RTT' },
  // "Slow 4G": puppeteer's PredefinedNetworkConditions['Slow 4G'] throughput (1.6 Mbps and 750 kbps,
  // each × 0.9) with a 400 ms RTT (the preset's is 150 ms × 3.75 = 562.5 ms; P5 chose 400 ms).
  phone: { width: 390, cpu: 4, network: { download: ((1.6e6 / 8) * 0.9), upload: ((750e3 / 8) * 0.9), latency: 400 }, label: '390 px, 4× CPU, Slow 4G: ~1.6 Mbps down, 400 ms RTT' },
};

// --ratchet <file>, --dir <build dir>; nothing else.
export function parseArgs(args) {
  const out = { ratchet: null, dir: null };
  for (let i = 0; i < args.length; i++) {
    const key = { '--ratchet': 'ratchet', '--dir': 'dir' }[args[i]];
    if (!key) throw new Error(`unknown argument ${args[i]} (--ratchet <file>, --dir <build dir>)`);
    const v = args[++i];
    if (!v || v.startsWith('--')) throw new Error(`${args[i - 1]} needs a value`);
    out[key] = v;
  }
  return out;
}

// The ratchet file: { <profile>: { cold: ms | null, warm: ms | null } } (and a _comment).
export function checkRatchet(r, file = 'the ratchet') {
  for (const name of Object.keys(PROFILES)) {
    for (const visit of ['cold', 'warm']) {
      const v = r?.[name]?.[visit];
      if (!(v === null || (Number.isFinite(v) && v > 0))) throw new Error(`${file}: ${name}.${visit} is ${JSON.stringify(v)}, not a positive number of milliseconds or null`);
    }
  }
  return r;
}

// One median against its ratchet value: within, above (warning) or above 1.5× (failure), or not
// compared (null: no runner value yet).
export function compare(value, limit) {
  if (limit === null || limit === undefined) return { level: 'none', text: 'no runner value yet: not compared' };
  if (value > limit * FAIL_FACTOR) return { level: 'fail', text: `above ${FAIL_FACTOR}× the ratchet of ${limit} ms: FAIL` };
  if (value > limit) return { level: 'warn', text: `above the ratchet of ${limit} ms: WARNING` };
  return { level: 'ok', text: `within the ratchet of ${limit} ms` };
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

async function markTime(page) {
  return page.waitForFunction((marks) => {
    for (const name of marks) {
      const [m] = performance.getEntriesByName(name, 'mark');
      if (m) return { mark: name, ms: m.startTime };
    }
    return false;
  }, { timeout: 120_000, polling: 50 }, MARKS).then((h) => h.jsonValue());
}

async function throttle(page, profile) {
  await page.emulateCPUThrottling(profile.cpu);
  await page.emulateNetworkConditions(profile.network);
}

async function main() {
  const { startHarness } = await import('./harness.mjs');
  const { BUILDS, ROOT } = await import('./serve.mjs');
  const { realDb } = await import('./helpers.mjs');
  const { encodeLink } = await import('../../src/lib/consortium/state.ts');
  const opts = parseArgs(process.argv.slice(2));
  const ratchet = opts.ratchet ? checkRatchet(JSON.parse(readFileSync(opts.ratchet, 'utf8')), opts.ratchet) : null;
  const dir = opts.dir ? relative(ROOT, resolve(opts.dir)) : BUILDS.production;
  const RUNS = Number(process.env.CANOPI_TIMING_RUNS ?? 5);
  const chosen = (process.env.CANOPI_TIMING_PROFILES ?? 'desktop,phone').split(',').map((x) => x.trim()).filter(Boolean);
  for (const p of chosen) if (!PROFILES[p]) throw new Error(`unknown timing profile ${p} (desktop, phone)`);
  // The link: the first 9 Temperate plants of the installed export by id, site all "not sure".
  const ids = await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY 1").all().map((r) => String(r.id)));
  const site = { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' };
  const PATH = `/consortium/#${encodeLink({ climate: 'Temperate', country: null, site, members: ids.slice(0, 9), kept: [], removed: [], guests: [], crops: [], stage: null }, { Temperate: ids })}`;

  const h = await startHarness({ dir });
  const results = {};
  let failed = false;
  try {
    const fmt = (xs) => xs.map((x) => Math.round(x)).join(', ');
    for (const name of chosen) {
      const profile = PROFILES[name];
      const cold = [], warm = [];
      let mark = null;
      for (let i = 0; i < RUNS; i++) {
        // h.open navigates unthrottled, so throttle on a blank page first and navigate here.
        const page = await h.open('/robots.txt', { width: profile.width });
        page.setDefaultNavigationTimeout(120_000);
        await throttle(page, profile);
        await page.goto(new URL(PATH, h.url).href, { waitUntil: 'load' });
        const c = await markTime(page);
        cold.push(c.ms);
        await page.reload({ waitUntil: 'load' });
        const w = await markTime(page);
        warm.push(w.ms);
        mark = c.mark;
        await page.browserContext().close();
      }
      results[name] = { cold: Math.round(median(cold)), warm: Math.round(median(warm)) };
      console.log(`${name} (${profile.label}), mark: ${mark}, build: ${dir}`);
      for (const [visit, label, xs] of [['cold', 'first visit', cold], ['warm', 'reload', warm]]) {
        const line = `  ${label} ms: ${fmt(xs)} -> median ${results[name][visit]}`;
        if (!ratchet) { console.log(line); continue; }
        const c = compare(results[name][visit], ratchet[name][visit]);
        if (c.level === 'fail') failed = true;
        console.log(`${line} (${c.text})`);
      }
    }
    // For the ratchet: the medians, to copy into scripts/browser/timing.json from a nightly runner run.
    console.log(`timing-json: ${JSON.stringify(results)}`);
  } finally {
    await h.close();
  }
  if (failed) {
    console.error(`Time to first view: a median is above ${FAIL_FACTOR}× its ratchet (${opts.ratchet}).`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
