// The scenario file's runner and recorder (site-inputs layer, owner 2026-11-18): every case of
// scripts/fixtures/consortium-scenarios.json run through the engine (src/lib/consortium: siteInputsOf,
// verdicts, holes, nextStep, fillers, jobGapsByPhase) on the installed consortium release. The file is
// a golden file recorded from the engine and the contract a later Rust port must meet.
//
//   node --experimental-strip-types scripts/consortium-scenarios.mjs --record
//
// re-reads each place's climate slots from the installed climate tiles (src/data/climate-index.json)
// and rewrites every case's output from the engine at HEAD; run it when a release or a rule changes on
// purpose, and read the diff. scripts/consortium-scenarios.test.mjs runs the cases without the tiles.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
export const FILE = new URL('scripts/fixtures/consortium-scenarios.json', ROOT);
export const consortiumIndex = JSON.parse(readFileSync(new URL('src/data/consortium-index.json', ROOT), 'utf8'));
export const releaseFile = new URL(`public${consortiumIndex.files[0].url}`, ROOT);
const core = await import('../src/lib/consortium/index.ts');
const { verdicts, holdsBy } = await import('../src/lib/consortium/verdict.ts');

let opened = null;
const pools = new Map();
// A list of the installed release, as the page reads it (sqlite-source.ts).
export async function pool(list) {
  if (!opened) {
    const { openBytes } = await import('../src/islands/consortium/data/load.ts');
    const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
    const db = await openBytes(new Uint8Array(gunzipSync(readFileSync(releaseFile))), { releaseId: consortiumIndex.release_id, climates: consortiumIndex.climates });
    opened = createSqliteSource(db.db, { images: {} });
  }
  if (!pools.has(list)) pools.set(list, await opened.pool(list));
  return pools.get(list);
}

const ids = (taxa) => taxa.map((t) => t.id);

// One case's output from its inputs: plain JSON, keys and codes only (never a locale string).
// `places`: the file's places table (name -> { lat, lon, periods }); input.place names one, or is null.
export async function run(input, places) {
  const list = await pool(input.list);
  const byId = new Map(list.map((t) => [t.id, t]));
  const members = input.members.map((id) => {
    const t = byId.get(id);
    if (!t) throw new Error(`${id} is not in the ${input.list} list of the installed release`);
    return t;
  });
  const place = input.place === null ? null : places[input.place];
  if (input.place !== null && !place) throw new Error(`no place ${input.place} in the file`);
  const lookup = place ? { lat: place.lat, lon: place.lon, climate: place.periods.length ? { cellLat: place.lat, cellLon: place.lon, distanceCells: 0, periods: place.periods } : null, soil: null, regions: { wgsrpdL3: null, isoA2: null } } : null;
  const inputs = core.siteInputsOf({ lookup, room: input.room ?? 'unsure', edits: input.edits ?? core.NO_EDITS });
  const ctx = { inputs, period: input.period, scenario: input.scenario ?? core.DEFAULT_SCENARIO, canopy: core.canopyOf(members) };
  const mv = verdicts(members, ctx);
  const fit = { fits: [], look: [], outside: [], unknown: [] };
  const why = {};
  for (const t of members) {
    const v = mv.get(t.id);
    fit[v.level].push(t.id);
    if (v.level !== 'fits' && v.limiting) why[t.id] = v.limiting.factor;
  }
  const hs = core.holes({ members, verdicts: mv, pending: false });
  const next = core.nextStep(hs);
  let fillers = null;
  if (next) {
    const inPalette = new Set(input.members);
    const cands = list.filter((t) => !inPalette.has(t.id) && core.fills(next, t));
    const pv = verdicts(cands, ctx);
    const last = core.periodIds[core.periodIds.length - 1];
    const holds = new Map(cands.map((t) => [t.id, holdsBy(t, ctx, last)]));
    const f = core.fillers(next, cands, pv, holds, new Set(), members, hs.filter((h) => h.state === 'open'));
    fillers = Object.fromEntries(Object.entries(f).map(([g, ts]) => [g, { n: ts.length, first: ids(ts.slice(0, 5)) }]));
  }
  return {
    fit, why,
    holes: hs.map((h) => ({ id: h.id, rank: h.rank, state: h.state, ...(h.unchecked ? { unchecked: h.unchecked } : {}) })),
    lanes: core.laneCounts({ members, verdicts: mv, pending: false }, core.paletteGoalsOf(input.goals)).map((l) => ({ lane: `${l.kind}:${l.job ?? l.stratum}`, counts: l.counts, ...(l.thin.length ? { thin: l.thin.map((t) => `${t.fromYear}-${t.toYear}`) } : {}), ...(l.unchecked ? { unchecked: l.unchecked.length } : {}) })),
    jobs: core.jobGapsByPhase(members).map((g) => ({ job: g.job, members: g.members, missing: g.missing })),
    next: next ? { hole: next.id, fillers } : null,
  };
}

// --- Recording ---------------------------------------------------------------------------------------

// The places, read from the installed climate tiles (the page's reader, soil not read as on the page).
const PLACES = {
  seville: [37.389, -5.984], kiambu: [-1.1714, 36.8356], mendoza: [-32.889, -68.845], oulu: [65.012, 25.465],
  recife: [-8.054, -34.881], kumasi: [6.688, -1.624], osaka: [34.694, 135.502], lyon: [45.76, 4.84],
};
// A palette per list: round-robin over light level (stratum) in id order, `n` plants, deterministic.
// (Ids are UUID strings: until PP-C 0b `a.id - b.id` was NaN and left the pool's own order.)
function palette(list, n = 10) {
  const groups = new Map();
  for (const t of [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const k = t.stratum?.value ?? 'none';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t);
  }
  const out = [];
  for (let i = 0; out.length < n; i++) {
    let took = false;
    for (const g of groups.values()) if (g[i] && out.length < n) { out.push(g[i]); took = true; }
    if (!took) break;
  }
  return out;
}
// [id, place, list, period, extra]: extra holds scenario, room, edits, goals, members ('none': empty
// palette; a number: that many plants of the list, round-robin as palette()) and also (canonical names
// added after the palette, so a case keeps the plant that shows its rule whatever a release changes).
// Lyon: Alnus cordata sits near its cold limit there, so "2 °C colder" changes its verdict (PP-C 0b:
// the round-robin palette alone stopped holding such a plant when placements moved).
const LYON = ['Alnus cordata'];
const CASES = [
  ['seville-today', 'seville', 'Mediterranean', '1991-2020'],
  ['seville-2041-2070', 'seville', 'Mediterranean', '2041-2070'],
  ['seville-2071-2099', 'seville', 'Mediterranean', '2071-2099'],
  ['seville-2071-2099-ssp585', 'seville', 'Mediterranean', '2071-2099', { scenario: 'ssp585' }],
  ['seville-drier-200mm', 'seville', 'Mediterranean', '1991-2020', { edits: { rainShiftMm: -200, dryMonthsShift: 1 } }],
  ['kiambu-today-temperate', 'kiambu', 'Temperate', '1991-2020'],
  ['kiambu-today-tropical', 'kiambu', 'Tropical', '1991-2020'],
  ['kiambu-2071-2099', 'kiambu', 'Temperate', '2071-2099'],
  ['kiambu-empty-palette', 'kiambu', 'Temperate', '1991-2020', { members: 'none' }],
  ['mendoza-rain-only', 'mendoza', 'Arid', '1991-2020', { edits: { watering: 'rain' } }],
  ['mendoza-watered-all-year', 'mendoza', 'Arid', '1991-2020', { edits: { watering: 'all-year' } }],
  ['mendoza-2071-2099-rain-only', 'mendoza', 'Arid', '2071-2099', { edits: { watering: 'rain' } }],
  ['oulu-today', 'oulu', 'Temperate', '1991-2020'],
  ['oulu-2071-2099', 'oulu', 'Temperate', '2071-2099'],
  ['oulu-2071-2099-ssp585', 'oulu', 'Temperate', '2071-2099', { scenario: 'ssp585' }],
  ['oulu-today-boreal', 'oulu', 'Boreal', '1991-2020'],
  ['recife-today', 'recife', 'Tropical', '1991-2020'],
  ['recife-2071-2099', 'recife', 'Tropical', '2071-2099'],
  ['kumasi-today', 'kumasi', 'Tropical', '1991-2020'],
  ['kumasi-2041-2070', 'kumasi', 'Tropical', '2041-2070'],
  ['osaka-balcony', 'osaka', 'Subtropical', '1991-2020', { room: 'pots' }],
  ['osaka-balcony-temperate', 'osaka', 'Temperate', '1991-2020', { room: 'pots' }],
  ['lyon-today', 'lyon', 'Temperate', '1991-2020', { also: LYON }],
  ['lyon-2c-colder', 'lyon', 'Temperate', '1991-2020', { edits: { nightsShiftC: -2, daysShiftC: -2 }, also: LYON }],
  ['lyon-2c-colder-2071-2099', 'lyon', 'Temperate', '2071-2099', { edits: { nightsShiftC: -2, daysShiftC: -2 }, also: LYON }],
  ['lyon-soil-test-acid', 'lyon', 'Temperate', '1991-2020', { edits: { soilPh: 5.2 }, also: LYON }],
  ['lyon-soil-test-chalky', 'lyon', 'Temperate', '1991-2020', { edits: { soilPh: 8.1 }, also: LYON }],
  ['lyon-wet-ground', 'lyon', 'Temperate', '1991-2020', { edits: { drainage: 'wet' }, also: LYON }],
  ['lyon-frost-hollow', 'lyon', 'Temperate', '1991-2020', { edits: { coldAir: 'hollow' }, also: LYON }],
  ['lyon-3-per-job', 'lyon', 'Temperate', '1991-2020', { goals: { plantsPerJob: 3 }, also: LYON }],
  ['seville-200-plants', 'seville', 'Mediterranean', '1991-2020', { members: 200 }],
  ['no-location', null, 'Temperate', '1991-2020'],
];

const fail = (message) => { throw new Error(message); };
async function record() {
  const C = await import('../src/lib/climate/index.ts');
  const climateIndex = JSON.parse(readFileSync(new URL('src/data/climate-index.json', ROOT), 'utf8'));
  const source = C.createTileSource({
    index: C.siteIndex(climateIndex),
    fetchBytes: async (url) => Uint8Array.from(readFileSync(new URL(`public${url}`, ROOT))).buffer, // a copy: its own ArrayBuffer
  });
  const places = {};
  for (const [name, [lat, lon]] of Object.entries(PLACES)) {
    const l = await C.lookupSite(lat, lon, source, C.DEFAULT_RADIUS, { soil: false });
    places[name] = { lat, lon, periods: l.climate?.periods ?? [] };
  }
  const cases = [], plants = {};
  for (const [id, place, list, period, extra = {}] of CASES) {
    for (const t of await pool(list)) plants[t.id] ??= t.canonical_name;
    const picked = extra.members === 'none' ? [] : palette(await pool(list), typeof extra.members === 'number' ? extra.members : 10);
    const listed = await pool(list);
    const also = (extra.also ?? []).map((name) => listed.find((t) => t.canonical_name === name) ?? fail(`${id}: ${name} is not on the ${list} list`));
    const members = [...new Set([...picked, ...also].map((t) => t.id))];
    const input = { list, place, period, ...(extra.scenario ? { scenario: extra.scenario } : {}), ...(extra.room ? { room: extra.room } : {}), ...(extra.edits ? { edits: extra.edits } : {}), ...(extra.goals ? { goals: extra.goals } : {}), members };
    cases.push({ id, input, output: await run(input, places) });
  }
  const named = new Set(JSON.stringify(cases).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g));
  const file = {
    format: 'canopi-consortium-scenarios',
    format_version: 1,
    note: [
      'Golden file recorded from the engine at HEAD (src/lib/consortium) by scripts/consortium-scenarios.mjs --record; scripts/consortium-scenarios.test.mjs runs every case.',
      'The contract for a later Rust port of the engine: the same inputs must give the same outputs.',
      'places: each place\'s climate slots (today and the 8 future slots) as the climate grid reader answers them at its coordinates (soil not read, as on the page).',
      'Inputs: the list, the place (a name in places, or null: no location), the period, the scenario (default ssp245), the room (default unsure), the palette goals (default plantsPerJob 2), the grower edits (SiteEdits: climate shifts applied to every slot, soil test pH, answers) and the member plant ids of the release.',
      'Outputs, keys and codes only: fit (member ids by level), why (the limiting factor of each member that does not fit), holes (id, rank, state, unchecked members), lanes (each job and light level: plant counts per time step of years.ts PHASE_YEARS, thin year spans below the goal plantsPerJob, default 2, and the count of members not checked), jobs (jobGapsByPhase), next (the lead hole and its fillers: count and first five ids per group, with no country warning).',
      'Watering is held but read by no rule until F4, so rain-only and watered cases match.',
    ],
    release_id: consortiumIndex.release_id,
    climate_grid: climateIndex.release.grid_manifest_sha256,
    places,
    cases,
    // Readers' aid: the canonical name of every plant id the cases name (not an input).
    plants: Object.fromEntries(Object.entries(plants).filter(([pid]) => named.has(pid)).sort(([, a], [, b]) => (a < b ? -1 : a > b ? 1 : 0))),
  };
  // Two-space JSON with every array of numbers or strings on one line (readable diffs, a small file).
  const text = JSON.stringify(file, null, 2).replace(/\[\n\s*((?:-?[\d.]+|"[^"\n]*")(?:,\n\s*(?:-?[\d.]+|"[^"\n]*"))*)\n\s*\]/g, (_, items) => `[${items.split(/,\n\s*/).join(', ')}]`);
  writeFileSync(FILE, text + '\n');
  console.log(`Recorded ${cases.length} cases for ${consortiumIndex.release_id}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--record')) await record();
