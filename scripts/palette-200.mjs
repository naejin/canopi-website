// The shared 200-plant palette (owner directive 2026-11-14: the tool scales smoothly to 200 plants),
// built from the real export's ids, for the unit budgets (consortium-pp-b2.test.mjs), the browser scale
// scenario (browser/consortium-pp-b2.browser.test.mjs PP-B29) and b3's Your plants. Deterministic: the
// same export gives the same palette.
//
// - 194 members from the Temperate list (200 plants), taken round-robin over light level (stratum) and
//   role in id order, so every light level and role is there; at Kiambu (KIAMBU below) their verdicts
//   mix fits, a second look, outside and unknown;
// - 6 guests: 3 from the Tropical and 3 from the Mediterranean list that the Temperate list lacks.
//
// palette200() opens the export with Node's sqlite (as the page does with sqlite-wasm) and returns the
// taxa; savedRecord200() gives the canopi-consortium save record (link v5) a browser test writes.
// { own: 4 } gives the same palette's first 4 own plants and the same 6 guests (the same three lists
// read): the 10-plant palette that parts the fixed cost of a load or an Add from the per-plant cost
// (review r1 perf-11).
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

export const KIAMBU = { lat: -1.1714, lon: 36.8356, source: 'search', label: 'Kiambu', lookup: {
  lat: -1.1714, lon: 36.8356, soil: null, regions: { wgsrpdL3: 'KEN', isoA2: 'KE' },
  climate: { cellLat: -1.25, cellLon: 36.75, distanceCells: 0, periods: [{ period: '1991-2020', scenario: 'historical', koppen: 'Cfb', koppenTemperatureMarginC: 0, tminColdC: 12, tmaxWarmC: 26.1, tmeanColdC: 17.2, tmeanWarmC: 20.8, aridityIndex: 1.15 }] },
} };
export const PALETTE_CLIMATE = 'Temperate'; // a curated list (Subtropical is the borrowed union of the three)
const GUEST_LISTS = ['Tropical', 'Mediterranean'];
const MEMBERS = 194, GUESTS_PER_LIST = 3;

const index = JSON.parse(readFileSync(new URL('../src/data/palette-index.json', import.meta.url), 'utf8'));
let opened = null;
async function source() {
  if (opened) return opened;
  const { openBytes } = await import('../src/islands/palette/data/load.ts');
  const { createSqliteSource } = await import('../src/islands/palette/data/sqlite-source.ts');
  const db = await openBytes(new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url)))), { releaseId: index.release_id, climates: index.climates });
  opened = createSqliteSource(db.db, { images: {} });
  return opened;
}

// Round-robin over (stratum, role) groups in id order: every group gives one plant in turn.
function mixed(pool, n) {
  const groups = new Map();
  for (const t of [...pool].sort((a, b) => a.id.localeCompare(b.id))) {
    const k = `${t.stratum?.value ?? 'none'}:${t.role}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t);
  }
  const lanes = [...groups.keys()].sort().map((k) => groups.get(k));
  const out = [];
  for (let i = 0; out.length < n && lanes.some((l) => i < l.length); i++) for (const l of lanes) if (i < l.length && out.length < n) out.push(l[i]);
  return out;
}

// { climate, members (200 taxa, guests last), ids, guests ({ id: list }), pools ({ list: taxa }) }.
export async function palette200({ own: count = MEMBERS } = {}) {
  const src = await source();
  const pools = Object.fromEntries(await Promise.all([PALETTE_CLIMATE, ...GUEST_LISTS].map(async (c) => [c, await src.pool(c)])));
  const own = mixed(pools[PALETTE_CLIMATE], MEMBERS).slice(0, count);
  if (own.length < count) throw new Error(`the ${PALETTE_CLIMATE} list has ${own.length} plants, fewer than ${count}`);
  const inOwn = new Set(pools[PALETTE_CLIMATE].map((t) => t.id));
  const guests = {}, guestTaxa = [];
  for (const c of GUEST_LISTS) {
    for (const t of [...pools[c]].sort((a, b) => a.id.localeCompare(b.id)).filter((t) => !inOwn.has(t.id) && !guests[t.id]).slice(0, GUESTS_PER_LIST)) {
      guests[t.id] = c;
      guestTaxa.push(t);
    }
  }
  const members = [...own, ...guestTaxa];
  return { climate: PALETTE_CLIMATE, members, ids: members.map((t) => t.id), guests, pools };
}

// The save record (state/persist.ts saveRecord) of the 200-plant palette, link v5, no place answers.
export async function savedRecord200({ own = MEMBERS } = {}) {
  const core = await import('../src/lib/palette/index.ts');
  const p = await palette200({ own });
  const known = Object.fromEntries(Object.entries(p.pools).map(([c, list]) => [c, list.map((t) => t.id)]));
  const fragment = core.encodeLink({
    climate: p.climate, country: null, room: 'unsure', plot: null, period: '1991-2020', spot: null, soil: null,
    members: p.ids, removed: [], guests: Object.entries(p.guests).map(([id, from]) => ({ id, from })),
  }, known);
  return JSON.stringify({ fragment, place: '', at: '2026-11-14T00:00:00.000Z', src: null });
}
