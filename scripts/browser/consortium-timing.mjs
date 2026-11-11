// Consortium v2 cold and warm timing (design check §8), run on demand, never by npm test:
//   npm run build && timeout 900 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 \
//     npm run timing:consortium
// (CANOPI_BROWSER_PORT picks the port, as for the browser tests; CANOPI_TIMING_PROFILES=desktop or
// =phone runs one profile, CANOPI_TIMING_RUNS changes the 5 runs.) Each run opens a #v=4 link of 9
// real Temperate plants (built with the core's encodeLink, so the page restores a consortium and
// draws its matrix) and reads the time of `performance.mark('ct:matrix')` (the matrix is drawn) from
// the start of navigation; a page that never sets it fails the run. Cold: a fresh browser context
// (empty cache), a first visit. Warm: the same context reloaded (HTTP cache filled). Prints the
// median of 5 of each, per profile:
// - desktop: 1280 px, 4× CPU slowdown, 9 Mbps down and up, 60 ms RTT (the §8 numbers so far);
// - phone: a slow phone, 390 px mobile, 4× CPU slowdown and "Slow 4G" (~1.6 Mbps down, ~0.75 Mbps
//   up, 400 ms RTT).
// Numbers only, no assertion: machine load moves them (compare runs made on a quiet machine).
import { startHarness } from './harness.mjs';
import { BUILDS } from './serve.mjs';
import { realDb } from './helpers.mjs';
import { encodeLink } from '../../src/lib/consortium/state.ts';

const RUNS = Number(process.env.CANOPI_TIMING_RUNS ?? 5);
// Network throughput in bytes per second (CDP Network.emulateNetworkConditions), latency in ms.
const PROFILES = {
  desktop: { width: 1280, cpu: 4, network: { download: 9e6 / 8, upload: 9e6 / 8, latency: 60 }, label: '1280 px, 4× CPU, 9 Mbps, 60 ms RTT' },
  // "Slow 4G": puppeteer's PredefinedNetworkConditions['Slow 4G'] throughput (1.6 Mbps and 750 kbps,
  // each × 0.9) with a 400 ms RTT (the preset's is 150 ms × 3.75 = 562.5 ms; P5 chose 400 ms).
  phone: { width: 390, cpu: 4, network: { download: ((1.6e6 / 8) * 0.9), upload: ((750e3 / 8) * 0.9), latency: 400 }, label: '390 px, 4× CPU, Slow 4G: ~1.6 Mbps down, 400 ms RTT' },
};
const chosen = (process.env.CANOPI_TIMING_PROFILES ?? 'desktop,phone').split(',').map((x) => x.trim()).filter(Boolean);
for (const p of chosen) if (!PROFILES[p]) throw new Error(`unknown timing profile ${p} (desktop, phone)`);
// The link: the first 9 Temperate plants of the installed export by id, site all "not sure".
const ids = await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY 1").all().map((r) => String(r.id)));
const site = { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' };
const PATH = `/consortium/#${encodeLink({ climate: 'Temperate', country: null, site, members: ids.slice(0, 9), kept: [], removed: [], guests: [], crops: [], stage: null }, { Temperate: ids })}`;

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

async function markTime(page) {
  return page.waitForFunction(() => {
    const [m] = performance.getEntriesByName('ct:matrix', 'mark');
    return m ? { mark: 'ct:matrix', ms: m.startTime } : false;
  }, { timeout: 120_000, polling: 50 }).then((h) => h.jsonValue());
}

async function throttle(page, profile) {
  await page.emulateCPUThrottling(profile.cpu);
  await page.emulateNetworkConditions(profile.network);
}

const h = await startHarness({ dir: BUILDS.production });
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
    console.log(`${name} (${profile.label}), mark: ${mark}`);
    console.log(`  first visit ms: ${fmt(cold)} -> median ${Math.round(median(cold))}`);
    console.log(`  reload ms: ${fmt(warm)} -> median ${Math.round(median(warm))}`);
  }
} finally {
  await h.close();
}
