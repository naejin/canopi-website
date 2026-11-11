// Consortium v2 cold and warm timing (design check §8), run on demand, never by npm test:
//   npm run build && timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 \
//     node scripts/browser/consortium-timing.mjs
// (CANOPI_BROWSER_PORT picks the port, as for the browser tests.) Each run opens a #v=4 link of 9
// real Temperate plants (built with the core's encodeLink, so the page restores a consortium and
// draws its matrix) with 4× CPU slowdown, 9 Mbps down and 60 ms RTT, and reads the time of
// `performance.mark('ct:matrix')` (the matrix is drawn) from the start of navigation; a page that
// never sets it fails the run. Cold: a fresh browser context (empty cache). Warm: the same
// context reloaded (HTTP cache filled). Prints the median of 5 of each.
import { startHarness } from './harness.mjs';
import { realDb } from './helpers.mjs';
import { encodeLink } from '../../src/lib/consortium/state.ts';

const RUNS = 5;
const NETWORK = { download: (9e6 / 8), upload: (9e6 / 8), latency: 60 };
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

async function throttle(page) {
  await page.emulateCPUThrottling(4);
  await page.emulateNetworkConditions(NETWORK);
}

const h = await startHarness();
try {
  const cold = [], warm = [];
  let mark = null;
  for (let i = 0; i < RUNS; i++) {
    // h.open navigates unthrottled, so throttle on a blank page first and navigate here.
    const page = await h.open('/robots.txt');
    page.setDefaultNavigationTimeout(120_000);
    await throttle(page);
    await page.goto(new URL(PATH, h.url).href, { waitUntil: 'load' });
    const c = await markTime(page);
    cold.push(c.ms);
    await page.reload({ waitUntil: 'load' });
    const w = await markTime(page);
    warm.push(w.ms);
    mark = c.mark;
    await page.browserContext().close();
  }
  const fmt = (xs) => xs.map((x) => Math.round(x)).join(', ');
  console.log(`mark: ${mark}`);
  console.log(`cold ms: ${fmt(cold)} -> median ${Math.round(median(cold))}`);
  console.log(`warm ms: ${fmt(warm)} -> median ${Math.round(median(warm))}`);
} finally {
  await h.close();
}
